"""HTTP with retries and proper TLS verification (certifi bundle: this Mac's system store lacks the SSL.com 2022 root)."""
import gzip
import http.cookiejar
import io
import ssl
import time
import urllib.parse
import urllib.request
import zipfile

import certifi

UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) TLVGroceries/1.0"
_CTX = ssl.create_default_context(cafile=certifi.where())


class Client:
    def __init__(self, cookies=False):
        handlers = [urllib.request.HTTPSHandler(context=_CTX)]
        if cookies:
            handlers.append(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()))
        self.opener = urllib.request.build_opener(*handlers)

    def request(self, url, data=None, headers=None, timeout=90, tries=3):
        if isinstance(data, dict):
            data = urllib.parse.urlencode(data).encode()
        hdrs = {"User-Agent": UA}
        if data is not None:
            hdrs["Content-Type"] = "application/x-www-form-urlencoded"
        hdrs.update(headers or {})
        last = None
        for attempt in range(tries):
            try:
                req = urllib.request.Request(url, data=data, headers=hdrs)
                with self.opener.open(req, timeout=timeout) as r:
                    return r.read()
            except Exception as e:  # noqa: BLE001 - retried, then re-raised
                last = e
                time.sleep(2 * (attempt + 1))
        raise last

    def text(self, url, **kw):
        return self.request(url, **kw).decode("utf-8", "replace")


def unpack(raw):
    """Price files arrive gzipped, zipped or plain."""
    if raw[:2] == b"\x1f\x8b":
        return gzip.decompress(raw)
    if raw[:2] == b"PK":
        z = zipfile.ZipFile(io.BytesIO(raw))
        return z.read(z.namelist()[0])
    return raw
