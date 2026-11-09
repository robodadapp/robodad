"""Checks the link-preview tags, robots.txt and the sitemap.

    python scripts/test_seo.py

Runs offline.
"""
import os
import re
import sys
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient  # noqa: E402

from app.main import STATIC_DIR, app  # noqa: E402

failed = 0


def check(name, ok, detail=""):
    global failed
    if not ok:
        failed += 1
    print(f"{'ok  ' if ok else 'FAIL'} {name}{'  ' + detail if detail else ''}")


client = TestClient(app)

for path, canonical in (("/", "https://robodad.app/"), ("/learn", "https://robodad.app/learn"), ("/parents", "https://robodad.ca/")):
    html = client.get(path).text
    head = html.split("</head>")[0]
    for tag in ("og:title", "og:description", "og:image", "og:url", "twitter:card", "twitter:image"):
        check(f"{path} has {tag}", len(re.findall(rf'(?:property|name)="{tag}"', head)) == 1)
    check(f"{path} canonical", f'<link rel="canonical" href="{canonical}">' in head)
    image = re.search(r'property="og:image" content="([^"]+)"', head).group(1)
    check(f"{path} share image is an absolute link", image.startswith("https://robodad.app/static/"), image)
    check(f"{path} share image exists", os.path.exists(os.path.join(STATIC_DIR, image.rsplit("/", 1)[1])))
    desc = re.search(r'<meta name="description" content="([^"]+)"', head).group(1)
    check(f"{path} description fits a search result", 50 <= len(desc) <= 200, str(len(desc)))

title = re.search(r"<title>([^<]+)</title>", client.get("/").text).group(1)
check("home title names the audience", "Teens" in title and len(title) <= 60, title)

r = client.get("/static/share-card.png")
check("share image is served as a PNG", r.status_code == 200 and r.headers["content-type"] == "image/png")

r = client.get("/robots.txt")
check("robots.txt is plain text", r.status_code == 200 and r.headers["content-type"].startswith("text/plain"))
check("robots.txt points at the sitemap", "Sitemap: https://robodad.app/sitemap.xml" in r.text)
check("robots.txt keeps the API out", "Disallow: /api/" in r.text)

r = client.get("/sitemap.xml")
locs = [el.text for el in ET.fromstring(r.text).iter("{http://www.sitemaps.org/schemas/sitemap/0.9}loc")]
check("sitemap lists the home page and the learning hub", "https://robodad.app/" in locs and "https://robodad.app/learn" in locs, str(locs))
for loc in locs:
    page = client.get(loc.replace("https://robodad.app", "") or "/")
    check(f"sitemap page loads and is indexable: {loc}", page.status_code == 200 and "noindex" not in page.text.split("</head>")[0])

print("\nall good" if not failed else f"\n{failed} failed")
sys.exit(1 if failed else 0)
