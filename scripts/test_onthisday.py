"""Checks On this day with Dad: the dad-and-kid filter, the dark-story filter, and the endpoint.

    python scripts/test_onthisday.py

Runs offline: the Wikipedia feed is a hand-made sample.
"""
import asyncio
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import httpx  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app import onthisday  # noqa: E402
from app.main import app, state  # noqa: E402

failed = 0


def check(name, ok, detail=""):
    global failed
    if not ok:
        failed += 1
    print(f"{'ok  ' if ok else 'FAIL'} {name}{'  ' + detail if detail else ''}")


def page(title, extract=""):
    return {"titles": {"normalized": title}, "extract": extract,
            "content_urls": {"desktop": {"page": "https://en.wikipedia.org/wiki/" + title.replace(" ", "_")}}}


FEED = {
    "selected": [
        {"year": 1953, "text": "A father and son team reach the top of the mountain together.", "pages": [page("Climb A")]},
        {"year": 1914, "text": "A battle begins in which a father and son fight side by side.", "pages": [page("Battle B")]},
    ],
    "events": [
        {"year": 1990, "text": "A new bridge opens to traffic.", "pages": [page("Bridge C")]},
        {"year": 2001, "text": "An inventor demonstrates a new radio.",
         "pages": [page("Inventor D", "The inventor was a radio pioneer. His daughter later ran the company with him.")]},
        {"year": 1970, "text": "A ship sank with his son aboard.", "pages": [page("Ship E")]},
    ],
    "births": [
        {"year": 1980, "text": "Sam Example, Canadian hockey player", "pages": [page("Sam Example", "Sam Example is a hockey player. He is the son of coach Pat Example.")]},
        {"year": 1975, "text": "Lee Plain, American singer", "pages": [page("Lee Plain", "Lee Plain is a singer.")]},
    ],
    "deaths": [
        {"year": 2000, "text": "Old Example, father of Sam Example", "pages": [page("Old Example")]},
    ],
}

picked = onthisday.pick(FEED)
titles = [p["title"] for p in picked]
check("father-and-son event is kept first", titles[:1] == ["Climb A"], str(titles))
check("battle story is dropped", "Battle B" not in titles)
check("sinking story is dropped", "Ship E" not in titles)
check("unrelated event is dropped", "Bridge C" not in titles and "Lee Plain" not in titles)
check("deaths section is never used", "Old Example" not in titles)
check("page-summary match keeps the dad line", any(p["title"] == "Inventor D" and "daughter" in p["dad_line"] for p in picked))
check("at most three items", len(picked) <= 3, str(len(picked)))
check("every item has a Wikipedia link", all(p["link"].startswith("https://en.wikipedia.org/") for p in picked))
check("empty feed gives no items", onthisday.pick({}) == [])

# Endpoint, with Wikipedia replaced by a stub.
calls = {"n": 0}


def handler(request):
    calls["n"] += 1
    if "/02/30" in str(request.url):
        return httpx.Response(404)
    if "/01/01" in str(request.url):
        return httpx.Response(503)
    return httpx.Response(200, json=FEED)


with TestClient(app) as client:
    state["client"] = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    onthisday._cache.clear()
    r = client.get("/api/onthisday?m=11&d=9")
    check("endpoint returns items", r.status_code == 200 and r.json()["items"][0]["title"] == "Climb A", str(r.status_code))
    client.get("/api/onthisday?m=11&d=9")
    check("second call is served from cache", calls["n"] == 1, str(calls["n"]))
    check("bad date is rejected", client.get("/api/onthisday?m=2&d=30").status_code == 400)
    check("29 February is allowed", client.get("/api/onthisday?m=2&d=29").status_code == 200)
    check("non-number is rejected", client.get("/api/onthisday?m=x&d=1").status_code == 422)
    check("Wikipedia failure gives 503", client.get("/api/onthisday?m=1&d=1").status_code == 503)
    asyncio.run(state["client"].aclose())

print("\nall on-this-day checks passed" if not failed else f"\n{failed} failed")
sys.exit(1 if failed else 0)
