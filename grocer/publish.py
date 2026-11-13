"""Build the phone version of the site into site/.

  python3 -m grocer.publish

Copies the app (web/) and today's catalogue into site/, with the home address replaced by "Home".
Publishing itself happens in the cloud: the GitHub Actions workflow (.github/workflows/daily.yml in the
groceries-nearby repository) runs grocer.fetch, then this, then deploys site/ to GitHub Pages every morning,
so nothing depends on this Mac.
"""
import json
import os
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
FILES = ("index.html", "core.js", "app.js", "glossary.js", "sw.js", "manifest.webmanifest",
         "icon-192.png", "icon-512.png", "apple-touch-icon.png")


def build():
    if os.path.isdir(SITE):
        shutil.rmtree(SITE)
    os.makedirs(SITE)
    for name in FILES:
        shutil.copy(os.path.join(ROOT, "web", name), SITE)
    with open(os.path.join(ROOT, "data", "catalog.json")) as f:
        cat = json.load(f)
    cat["home"]["label"] = "Home"       # never publish the street address
    with open(os.path.join(SITE, "catalog.json"), "w") as f:
        json.dump(cat, f, ensure_ascii=False, separators=(",", ":"))
    open(os.path.join(SITE, ".nojekyll"), "w").close()
    return cat


def main():
    cat = build()
    stale = [s["name"] for s in cat["stores"] if s.get("stale_from")]
    print("built site/ (%d products, prices %s%s)" % (len(cat["items"]), cat["generated"],
                                                     ", carried over: " + ", ".join(stale) if stale else ""))


if __name__ == "__main__":
    sys.exit(main())
