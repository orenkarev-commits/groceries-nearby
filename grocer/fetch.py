"""Download PriceFull + PromoFull for every branch near home and build data/catalog.json.

Run: python3 -m grocer.fetch            (about 10-15 minutes)
"""
import datetime as dt
import json
import os
import re
import sys
import time
import traceback

from . import feeds
from .connectors import all_connectors

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, "data")
HOME = {"label": "Home", "lat": 32.065582, "lon": 34.778163}
DETOUR = 1.2          # street distance / straight-line distance
WALK_M_PER_MIN = 80   # about 4.8 km/h
MAX_MIN = 14.0        # fetch up to here; the app's default filter is 10 min
CONDITIONAL = re.compile(r"אשראי|כרטיס|אפליקציה|באפליקציה|מועדון|חברי|לחברים|דיגיטלי", re.I)
SECOND = re.compile(r"השני ב|השניה ב|השנייה ב|שני ב-?\s*\d|2nd", re.I)
EXCLUDE = re.compile(r"קופון|מתנה|פיצוי|coupon|gift|ארנק|שובר", re.I)


def walk_min(dist_m):
    return round(dist_m * DETOUR / WALK_M_PER_MIN, 1)


def _num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def _when(v):
    v = (v or "").replace(" ", "T")[:19]
    for fmt, n in (("%Y-%m-%dT%H:%M:%S", 19), ("%Y-%m-%dT%H:%M", 16), ("%Y-%m-%d", 10)):
        try:
            return dt.datetime.strptime(v[:n], fmt)
        except ValueError:
            pass
    return None


def promo_terms(p, now):
    """Return (kind, terms) for an active promotion: kind is 'open' (anyone), 'club' or 'skip'."""
    h = p["head"]
    start = _when(h.get("promotionstartdatetime") or (h.get("promotionstartdate", "") + "T" + (h.get("promotionstarthour") or "00:00:00")))
    end = _when(h.get("promotionenddatetime") or (h.get("promotionenddate", "") + "T" + (h.get("promotionendhour") or "23:59:59")))
    if (start and start > now) or (end and end < now):
        return "skip", None
    desc = h.get("promotiondescription", "")
    club = (h.get("clubid") or "0").strip()
    coupon = (h.get("additioniscoupon") or h.get("additionaliscoupon") or "0").strip()
    if coupon == "1" or EXCLUDE.search(desc):
        return "skip", None
    end_txt = None
    if end:
        e = end - dt.timedelta(days=1) if end.hour < 6 else end
        end_txt = e.date().isoformat()
    kind = "open" if (club.startswith("0") or club == "") and not CONDITIONAL.search(desc) else "club"
    return kind, {"desc": desc, "end": end_txt, "club": kind == "club"}


def best_promo(item_price, p, terms, code):
    """Effective price per unit under this promotion, with the quantity you must buy."""
    it = p["items"][code]
    dp = _num(it.get("discountedprice")) or _num(p["head"].get("discountedprice"))
    q = _num(it.get("minqty")) or _num(p["head"].get("minqty")) or 1.0
    rate = _num(it.get("discountrate")) or _num(p["head"].get("discountrate"))
    q = max(1, int(round(q)))
    unit = None
    if dp and dp > 0 and SECOND.search(terms["desc"]) and dp < item_price:
        unit, q = (item_price + dp) / 2.0, 2
    elif dp and dp > 0:
        unit = dp / q if (q > 1 and dp > item_price * 1.01) else dp
    elif rate and 0 < rate < 100 and (p["head"].get("discounttype") or "").strip() in ("2", ""):
        # Some chains give a percentage (DiscountRate in hundredths or whole percent).
        r = rate / 100.0 if rate <= 100 else rate / 10000.0
        unit = item_price * (1 - r)
    if not unit or unit <= 0 or unit >= item_price * 0.995 or unit < item_price * 0.3:
        return None  # under 30% of shelf price is almost always a pack/weight mismatch, not a real deal
    return dict(terms, unit=round(unit, 2), q=q)


def item_key(chain_id, code):
    """Real EAN barcodes match across chains; short internal codes (produce, bakery) are per chain."""
    code = code.lstrip("0") if len(code) > 13 else code
    return code if len(code) >= 8 and not code.startswith("2") else chain_id + ":" + code


def load_previous():
    """Last published catalogue: from PREV_CATALOG_URL (the cloud job), else the copy on disk."""
    url = os.environ.get("PREV_CATALOG_URL")
    try:
        if url:
            from .net import Client
            return json.loads(Client().request(url, timeout=120))
        with open(os.path.join(DATA, "catalog.json")) as f:
            return json.load(f)
    except Exception as e:  # noqa: BLE001 - no previous copy is fine
        print("no previous catalogue:", repr(e)[:120])
        return None


def load_patch():
    """Prices the Mac fetched from Israel for shops the cloud can't reach (a GitHub release asset; see grocer/assist.py)."""
    url = os.environ.get("PATCH_URL")
    if not url:
        return None
    try:
        from .net import Client, unpack
        return json.loads(unpack(Client().request(url, timeout=120, tries=2)))
    except Exception as e:  # noqa: BLE001 - no patch is normal
        print("no Mac patch:", repr(e)[:120])
        return None


def carry_over(out_stores, items, now, max_age_days=7):
    """A branch that failed this run (e.g. a portal that blocks servers outside Israel) is filled from, in order:
    the Mac's patch (fresh prices fetched from Israel), then the last published copy (kept up to a week).
    Either way it's marked with the date its prices are from."""
    for source, label in ((load_patch(), "mac"), (None, "previous")):
        failed = [r for r in out_stores if r["status"] == "error"]
        if not failed:
            return
        prev = source if label == "mac" else load_previous()
        if prev:
            merge_from(prev, failed, items, now, max_age_days, label)


def merge_from(prev, failed, items, now, max_age_days, label):
    prev_by = {(s["chain_id"], s["store_id"]): s for s in prev["stores"] if s.get("status") == "ok"}
    for rec in failed:
        old = prev_by.get((rec["chain_id"], rec["store_id"]))
        if not old:
            continue
        since = old.get("stale_from") or prev["generated"][:10]
        age = (now.date() - dt.date.fromisoformat(since)).days
        if age > max_age_days or (label == "mac" and age > 1):
            continue
        osid, nsid, n = str(old["id"]), str(rec["id"]), 0
        for it in prev["items"]:
            pr = it["p"].get(osid)
            if pr is None:
                continue
            e = items.get(it["k"])
            if e is None:
                e = items[it["k"]] = {"k": it["k"], "n": it["n"], "b": it.get("b", ""), "q": it.get("q"), "u": it.get("u", ""), "p": {}}
            e["p"][nsid] = pr
            n += 1
        fresh = label == "mac" and since == now.date().isoformat()
        rec.update(status="ok", via=label, n_items=n, n_promos=old.get("n_promos", 0), updated=old.get("updated"),
                   note=("Fetched from Israel by the Mac (the cloud can't reach this chain)" if label == "mac"
                         else "Prices from %s: this shop's file couldn't be fetched today (%s)" % (since, rec.get("error", "")[:80])))
        if not fresh:
            rec["stale_from"] = since
        print("filled %s %s from %s: %d items, prices %s" % (rec["chain"], rec["name"][:24], label, n, since), flush=True)


def main():
    now = dt.datetime.now()
    stores = json.load(open(os.path.join(DATA, "stores_geo.json")))
    near = [s for s in stores if s.get("dist") is not None and walk_min(s["dist"]) <= MAX_MIN]
    near.sort(key=lambda s: s["dist"])
    conns = {c.chain_id: c for c in all_connectors()}
    out_stores, items, log = [], {}, []
    for s in near:
        rec = {"id": len(out_stores), "chain": s["chain"], "chain_id": s["chain_id"], "store_id": s["store_id"],
               "name": s["name"].strip(), "address": s["address"].strip(), "lat": s["lat"], "lon": s["lon"],
               "dist": s["dist"], "walk": walk_min(s["dist"]), "status": "ok", "n_items": 0, "updated": None}
        if s["chain_id"] == "freshmarket" and int(s["store_id"]) >= 300:
            s["no_feed"], s["note"] = True, "Super Yuda branches have no price files on Fresh Market's portal (checked 13 Nov 2026)."
        if s["chain_id"] == "cofix":
            s["no_feed"], s["note"] = True, "Super Cofix publishes only its branch list, no price files (checked 13 Nov 2026)."
        if s.get("no_feed"):
            rec.update(status="no_feed", note=s.get("note"))
            out_stores.append(rec)
            continue
        t0 = time.time()
        try:
            conn = conns[s["chain_id"]]
            price_xml = conn.fetch(s, "PriceFull")
            its = feeds.items(price_xml)
            del price_xml
            try:
                promos = feeds.promotions(conn.fetch(s, "PromoFull"), barcodes=None, max_items=1500)
            except Exception as e:  # noqa: BLE001 - prices still useful without promotions
                promos, rec["promo_error"] = [], repr(e)[:160]
            best = {}
            for p in promos:
                kind, terms = promo_terms(p, now)
                if kind == "skip":
                    continue
                for code in p["items"]:
                    it = its.get(code)
                    if not it:
                        continue  # a promotion counts only where the branch prices the item
                    bp = best_promo(it["price"], p, terms, code)
                    if bp and (code not in best or bp["unit"] < best[code]["unit"]):
                        best[code] = bp
            sid = rec["id"]
            latest = ""
            for code, it in its.items():
                k = item_key(s["chain_id"], code)
                e = items.get(k)
                if e is None:
                    e = items[k] = {"k": k, "n": it["name"].strip(), "b": it["brand"].strip(), "q": it["qty"],
                                    "u": it["unit"].strip(), "p": {}}
                pr = [it["price"]]
                if code in best:
                    b = best[code]
                    pr += [b["unit"], b["q"], b["desc"][:60], b["end"], 1 if b["club"] else 0]
                e["p"][str(sid)] = pr
                latest = max(latest, (it.get("price_updated") or "")[:10])
            rec.update(n_items=len(its), n_promos=len(best), updated=latest or None, secs=round(time.time() - t0))
        except Exception as e:  # noqa: BLE001 - one failing branch must not stop the run
            rec.update(status="error", error=repr(e)[:200])
            traceback.print_exc()
        out_stores.append(rec)
        print("%5.1f min  %-12s %-28s %-6s %6d items  %4d promos  %ss" % (
            rec["walk"], rec["chain"], rec["name"][:28], rec["status"], rec["n_items"], rec.get("n_promos", 0),
            rec.get("secs", "-")), flush=True)
    carry_over(out_stores, items, now)
    catalog = {"generated": now.isoformat(timespec="minutes"), "home": HOME,
               "walk": {"detour": DETOUR, "m_per_min": WALK_M_PER_MIN},
               "stores": out_stores, "items": list(items.values())}
    tmp = os.path.join(DATA, "catalog.json.tmp")
    with open(tmp, "w") as f:
        json.dump(catalog, f, ensure_ascii=False, separators=(",", ":"))
    os.replace(tmp, os.path.join(DATA, "catalog.json"))
    print("items:", len(items), "stores:", len(out_stores))


if __name__ == "__main__":
    sys.exit(main())
