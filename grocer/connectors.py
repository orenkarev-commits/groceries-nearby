"""One connector per price portal, adapted from the Baby Essentials monitor.

Each connector lists a chain's stores (`stores()`) and fetches one store's latest PriceFull / PromoFull
(`fetch(store, kind)`), returning unpacked XML bytes. Sources are the portals on the Consumer Protection
Authority's official list (gov.il, cpfta_prices_regulations). Only public, published access is used:
open portals, and the Cerberus portal's published user names that have an empty password.
"""
import datetime as dt
import html
import json
import re
import urllib.parse

from . import feeds
from .net import Client, unpack


class Store(dict):
    """chain, chain_id, store_id, name, address, city, subchain"""


def _store(conn, s, chain=None, chain_id=None):
    return Store(chain=chain or conn.chain, chain_id=chain_id or conn.chain_id, **s)


# ---------------------------------------------------------------- Shufersal (Sheli, Express, Deal, Yesh, Be)
class Shufersal:
    chain, chain_id = "Shufersal", "shufersal"
    BASE = "https://prices.shufersal.co.il/FileObject/UpdateCategory"
    CAT = {"Stores": 5, "PriceFull": 2, "PromoFull": 4}
    ONLINE_STORE = "413"

    def __init__(self):
        self.c = Client()

    def _latest(self, kind, store_id):
        page = self.c.text("%s?catID=%d&storeId=%s" % (self.BASE, self.CAT[kind], store_id), timeout=120, tries=4)
        m = re.search(r'https://pricesprodpublic[^"]+', page)
        if not m:
            raise RuntimeError("no %s file for store %s" % (kind, store_id))
        return unpack(self.c.request(html.unescape(m.group(0)), timeout=180, tries=4))

    def stores(self):
        return [_store(self, s) for s in feeds.stores(self._latest("Stores", 0))]

    def fetch(self, store, kind):
        return self._latest(kind, store["store_id"])


# ---------------------------------------------------------------- Cerberus portal (url.publishedprices.co.il)
class Cerberus:
    """Public logins published by the chains and the regulator: a user name with an empty password."""
    BASE = "https://url.publishedprices.co.il"

    def __init__(self, user, chain, chain_id, name_filter=None):
        self.user, self.chain, self.chain_id = user, chain, chain_id
        self.name_filter = re.compile(name_filter, re.I) if name_filter else None
        self.c = Client(cookies=True)
        self.files = None

    def _login(self):
        page = self.c.text(self.BASE + "/login")
        tok = re.search(r'name="csrftoken" content="([^"]+)"', page).group(1)
        self.c.request(self.BASE + "/login/user", data={"r": "", "username": self.user, "password": "",
                                                         "Submit": "Sign in", "csrftoken": tok})
        page = self.c.text(self.BASE + "/file")
        tok = re.search(r'name="csrftoken" content="([^"]+)"', page).group(1)
        raw = self.c.request(self.BASE + "/file/json/dir", data={
            "sEcho": 1, "iDisplayStart": 0, "iDisplayLength": 100000, "sSearch": "", "cd": "/", "csrftoken": tok})
        self.files = [r["name"] for r in json.loads(raw)["aaData"]]

    @staticmethod
    def _stamp(name):
        """Timestamp digits at the end of the file name, for picking the newest."""
        return re.sub(r"\D", "", name.rsplit(".", 2)[0].split("-", 2)[-1] if name.count("-") >= 2 else name)[-12:]

    def _latest(self, prefix, store_id=None):
        if self.files is None:
            self._login()
        if store_id:
            pat = re.compile(r"^%s\d+-(\d+-)?0*%s-\d{8,}" % (prefix, store_id), re.I)
        else:
            pat = re.compile(r"^%s\d" % prefix, re.I)
        names = [n for n in self.files if pat.search(n)]
        if not names:
            raise RuntimeError("no %s file for store %s" % (prefix, store_id))
        names.sort(key=lambda n: re.findall(r"\d{8,}", n)[-1])
        return unpack(self.c.request(self.BASE + "/file/d/" + names[-1], timeout=180))

    def stores(self):
        out = []
        for s in feeds.stores(self._latest("Stores")):
            if self.name_filter is None or self.name_filter.search(s["name"]):
                out.append(_store(self, s))
        return out

    def fetch(self, store, kind):
        return self._latest(kind, store["store_id"])


# ---------------------------------------------------------------- BinaProjects portals
class Bina:
    TYPE = {"Stores": 1, "PriceFull": 4, "PromoFull": 5}

    def __init__(self, sub, chain, chain_id):
        self.base = "https://%s.binaprojects.com" % sub
        self.chain, self.chain_id = chain, chain_id
        self.c = Client()

    def _latest(self, kind, store_id):
        today = dt.date.today()
        for day in (today, today - dt.timedelta(days=1)):
            raw = self.c.request(self.base + "/MainIO_Hok.aspx", data={
                "WStore": store_id, "WDate": day.strftime("%d/%m/%Y"), "WFileType": self.TYPE[kind]})
            listing = json.loads(raw or b"[]")
            if listing:
                name = sorted(f["FileNm"] for f in listing)[-1]
                meta = json.loads(self.c.request(self.base + "/Download.aspx?FileNm=" + urllib.parse.quote(name),
                                                 data=b"", headers={"Content-Length": "0"}))
                return unpack(self.c.request(meta[0]["SPath"].replace("\\", "/"), timeout=120))
        raise RuntimeError("no %s file for store %s" % (kind, store_id))

    def stores(self):
        return [_store(self, s) for s in feeds.stores(self._latest("Stores", 0))]

    def fetch(self, store, kind):
        return self._latest(kind, int(store["store_id"]))


# ---------------------------------------------------------------- Wolt Market
class Wolt:
    chain, chain_id = "Wolt Market", "wolt"
    BASE = "https://wm-gateway.wolt.com/isr-prices/public/v1/"

    def __init__(self):
        self.c = Client()
        self.links = None

    def _index(self):
        if self.links is None:
            page = self.c.text(self.BASE + "index.html")
            day = re.search(r'href="(\d{4}-\d\d-\d\d\.html)"', page).group(1)
            page = self.c.text(self.BASE + day)
            self.links = [html.unescape(h) for h in re.findall(r'href="([^"]+)"', page)]
        return self.links

    def _latest(self, prefix, store_id=None):
        pat = re.compile(r"/%s\d+-(\d+-)?0*%s-\d{8,}" % (prefix, store_id) if store_id else r"/%s\d" % prefix, re.I)
        names = sorted((n for n in self._index() if pat.search("/" + n.rsplit("/", 1)[-1])),
                       key=lambda n: re.findall(r"\d{8,}", n)[-1])
        if not names:
            raise RuntimeError("no %s file for store %s" % (prefix, store_id))
        return unpack(self.c.request(urllib.parse.urljoin(self.BASE, names[-1]), timeout=180))

    def stores(self):
        return [_store(self, s) for s in feeds.stores(self._latest("Stores"))]

    def fetch(self, store, kind):
        return self._latest(kind, store["store_id"])


# ---------------------------------------------------------------- Carrefour (prices.carrefour.co.il)
class Carrefour:
    """The page embeds `const path = 'YYYYMMDD'` and `const files = [...]`; a file is at /<path>/<name>."""
    chain, chain_id = "Carrefour", "carrefour"
    BASE = "https://prices.carrefour.co.il/"

    def __init__(self):
        self.c = Client()
        self.days = {}   # date (YYYYMMDD) -> file names listed for that day

    def _index(self, day):
        """`?date=YYYYMMDD` lists that day's folder. Early in the morning today's folder is still nearly empty."""
        if day not in self.days:
            t = self.c.text(self.BASE + "?date=" + day, timeout=60)
            path = re.search(r"const path = '(\d+)'", t).group(1)
            names = [f["name"] for f in json.loads(re.search(r"const files = (\[.*?\]);", t, re.S).group(1))]
            self.days[day] = names if path == day else []
        return self.days[day]

    def _latest(self, prefix, store_id=None):
        pat = re.compile(r"^%s\d{13}-\d+-0*%s-\d{8}" % (prefix, store_id) if store_id else r"^%s\d" % prefix, re.I)
        today = dt.date.today()
        for day in (today, today - dt.timedelta(days=1)):   # today's file if it's out yet, else yesterday's
            d = day.strftime("%Y%m%d")
            names = sorted((n for n in self._index(d) if pat.search(n)), key=lambda n: re.findall(r"\d{8}-\d{6}", n)[-1])
            if names:
                return unpack(self.c.request("%s%s/%s" % (self.BASE, d, names[-1]), timeout=180))
        raise RuntimeError("no %s file for store %s" % (prefix, store_id))

    def stores(self):
        return [_store(self, s) for s in feeds.stores(self._latest("Stores"))]

    def fetch(self, store, kind):
        return self._latest(kind, store["store_id"])


# ---------------------------------------------------------------- Hazi Hinam (shop.hazi-hinam.co.il/Prices)
class HaziHinam:
    """Open listing: /Prices?t=<1 prices, 2 promos, 3 stores>&p=<page>; files are public Azure blobs."""
    chain, chain_id = "Hazi Hinam", "hazihinam"
    BASE = "https://shop.hazi-hinam.co.il/Prices"

    def __init__(self):
        self.c = Client()
        self.cache = {}

    def _links(self, t):
        if t not in self.cache:
            out = []
            for page in range(1, 40):
                html_ = self.c.text("%s?t=%s&p=%d" % (self.BASE, t, page), timeout=60)
                links = re.findall(r'href="(https://hazihinamprod[^"]+)"', html_)
                new = [l for l in links if l not in out]
                if not new:
                    break
                out += new
            self.cache[t] = out
        return self.cache[t]

    def _latest(self, prefix, store_id=None):
        t = {"Stores": 3, "PriceFull": 1, "PromoFull": 2}[prefix]
        prefix = "StoresFull" if prefix == "Stores" else prefix
        pat = re.compile(r"/%s\d{13}-\d+-0*%s-\d{8}" % (prefix, store_id) if store_id else r"/%s\d" % prefix, re.I)
        names = sorted((n for n in self._links(t) if pat.search(n)), key=lambda n: re.findall(r"\d{8}-\d{6}", n)[-1])
        if not names:
            raise RuntimeError("no %s file for store %s" % (prefix, store_id))
        return unpack(self.c.request(names[-1], timeout=180))

    def stores(self):
        return [_store(self, s) for s in feeds.stores(self._latest("Stores"))]

    def fetch(self, store, kind):
        return self._latest(kind, store["store_id"])


# ---------------------------------------------------------------- Super-Pharm (prices.super-pharm.co.il)
class SuperPharm:
    chain, chain_id = "Super-Pharm", "superpharm"
    BASE = "https://prices.super-pharm.co.il/"

    def __init__(self):
        self.c = Client()

    def _latest(self, category, branch=None):
        q = {"Category-equals": category}
        if branch:
            q["BranchName-equals"] = branch
        page = self.c.text(self.BASE + "?" + urllib.parse.urlencode(q))
        m = re.search(r'href="(/Download/' + category + r'7[^"]+)"', page)
        if not m:
            raise RuntimeError("no %s file listed%s" % (category, " for " + branch if branch else ""))
        return unpack(self.c.request(urllib.parse.urljoin(self.BASE, html.unescape(m.group(1)))))

    def stores(self):
        return [_store(self, s) for s in feeds.stores(self._latest("Stores")) if s["store_type"] != "2"]

    def fetch(self, store, kind):
        return self._latest(kind, store["name"])


def all_connectors():
    return [
        Shufersal(),
        Carrefour(),
        HaziHinam(),
        SuperPharm(),
        Cerberus("RamiLevi", "Rami Levy", "ramilevy"),
        Cerberus("osherad", "Osher Ad", "osherad"),
        Cerberus("TivTaam", "Tiv Taam", "tivtaam"),
        Cerberus("yohananof", "Yohananof", "yohananof"),
        Cerberus("doralon", "AM:PM", "ampm", name_filter=r"am\s*-?\s*pm"),
        Cerberus("freshmarket", "Fresh Market", "freshmarket"),
        Cerberus("Stop_Market", "Stop Market", "stopmarket"),
        Cerberus("politzer", "Politzer", "politzer"),
        Cerberus("SuperCofixApp", "Super Cofix", "cofix"),
        Wolt(),
        Bina("goodpharm", "Good Pharm", "goodpharm"),
        Bina("zolvebegadol", "Zol VeBegadol", "zolvebegadol"),
        Bina("kingstore", "King Store", "kingstore"),
        Bina("maayan2000", "Maayan 2000", "maayan2000"),
        Bina("shuk-hayir", "Shuk HaIr", "shukhayir"),
        Bina("superbareket", "Super Bareket", "superbareket"),
        Bina("ktshivuk", "KT Shivuk", "ktshivuk"),
        Bina("shefabirkathashem", "Shefa Birkat Hashem", "shefa"),
        Bina("supersapir", "Super Sapir", "supersapir"),
    ]
