"""Parse the government-format price files (Stores, PriceFull, PromoFull).

Chains differ in tag case and nesting, so everything is matched case-insensitively,
and only monitored barcodes are kept.
"""
import io
import xml.etree.ElementTree as ET


def _local(tag):
    return tag.rsplit("}", 1)[-1].lower()


def _fields(el):
    """Direct and nested leaf values of an element, first occurrence wins, keys lowercased."""
    out = {}
    for sub in el.iter():
        if len(sub) == 0:
            k = _local(sub.tag)
            if k not in out:
                out[k] = (sub.text or "").strip()
    return out


def _clean(data):
    # Some files carry a BOM or junk before the XML declaration.
    i = data.find(b"<")
    return data[i:] if i > 0 else data


def stores(data):
    """Yield dicts: store_id, name, address, city, store_type, subchain."""
    subchain = ""
    for ev, el in ET.iterparse(io.BytesIO(_clean(data)), events=("start", "end")):
        t = _local(el.tag)
        if ev == "start" and t == "subchain":
            subchain = ""
        if ev == "end" and t == "subchainid" and el.text:
            subchain = el.text.strip()
        if ev == "end" and t in ("store", "branch"):
            f = _fields(el)
            sid = f.get("storeid") or f.get("storeid") or ""
            if sid:
                yield {
                    "store_id": str(int(sid)) if sid.isdigit() else sid,
                    "name": f.get("storename", ""),
                    "address": f.get("address", ""),
                    "city": f.get("city", ""),
                    "store_type": f.get("storetype", ""),
                    "subchain": f.get("subchainid", subchain).lstrip("0") or "0",
                }
            el.clear()


def items(data, barcodes=None):
    """Return {barcode: item dict} from a PriceFull file: monitored barcodes only, or every item if barcodes is None."""
    out = {}
    for _, el in ET.iterparse(io.BytesIO(_clean(data)), events=("end",)):
        if _local(el.tag) == "item":
            f = _fields(el)
            code = f.get("itemcode", "")
            if code and (barcodes is None or code in barcodes):
                try:
                    price = float(f.get("itemprice") or 0)
                except ValueError:
                    price = 0.0
                # ItemStatus means different things per chain (Good Pharm uses 0 for live items), so it is ignored.
                if price > 0:
                    try:
                        qty = float(f.get("quantity") or 0)
                    except ValueError:
                        qty = 0.0
                    out[code] = {
                        "barcode": code, "name": f.get("itemname", "") or f.get("manufactureitemdescription", ""),
                        "desc": f.get("manufactureitemdescription", ""), "brand": f.get("manufacturename", ""),
                        "price": price, "qty": qty, "unit": f.get("unitqty", ""),
                        "last_sale": f.get("lastsaledatetime", "")[:10],
                        "price_updated": f.get("priceupdatedate") or f.get("priceupdatetime", ""),
                    }
            el.clear()
    return out


def promotions(data, barcodes=None, max_items=None):
    """Return promotions touching monitored barcodes (or any item if barcodes is None), with per-item terms.
    max_items: skip promotions covering more items than this (store-wide offers), to save memory."""
    out = []
    for _, el in ET.iterparse(io.BytesIO(_clean(data)), events=("end",)):
        if _local(el.tag) != "promotion":
            continue
        head = {}
        item_terms = {}
        n_items = 0
        for sub in el.iter():
            t = _local(sub.tag)
            if t == "promotionitem" or t == "item":
                f = _fields(sub)
                n_items += 1
                code = f.get("itemcode", "")
                if code and (barcodes is None or code in barcodes):
                    item_terms[code] = f
            elif len(sub) == 0 and t not in head:
                head[t] = (sub.text or "").strip()
        if item_terms and not (max_items and n_items > max_items):
            out.append({"head": head, "items": item_terms, "n_items": n_items})
        el.clear()
    return out
