"""On this day with Dad: Wikipedia's "On this day" list, kept to dad-and-kid stories.

The server fetches the list for a date from Wikipedia, keeps the items about a father and
a son or daughter, drops anything dark (wars, killings, disasters), and caches the result
for the day. Text comes from Wikipedia under CC BY-SA, so every item carries its link.
"""

from __future__ import annotations

import re
import time

import httpx

FEED = "https://en.wikipedia.org/api/rest_v1/feed/onthisday/all/{m:02d}/{d:02d}"
HEADERS = {"User-Agent": "RoboDad/1.0 (https://robodad.app; dad@robodad.app)", "Accept": "application/json"}
CACHE_SECONDS = 12 * 3600
MAX_ITEMS = 3

# A dad and a kid in the same story.
DAD = re.compile(r"\b(father|fathers|father's|dad|daddy)\b", re.I)
KID = re.compile(r"\b(son|sons|son's|daughter|daughters|daughter's)\b", re.I)
PAIR = re.compile(
    r"\b(father and (son|daughter)|(son|daughter) of\b|(his|her) father\b|(his|their) (son|daughter|sons|daughters)\b"
    r"|father-(son|daughter)|(son|daughter)s? and father|father's day)", re.I)

# Kept out for a 13+ audience, and because "his son was killed" isn't a dad story.
DARK = re.compile(
    r"(kill|murder|assassin|massacre|execut|behead|hang(ed|ing)\b|bomb|war\b|wars\b|battle|invasion|invad|"
    r"shoot|shot\b|terror|genocide|attack|suicide|rape|abuse|kidnap|hostage|torture|lynch|riot|"
    r"crash|disaster|earthquake|famine|plague|epidemic|drown|died|dies\b|death|dead\b|slave|nazi|"
    r"holocaust|coup|rebel|prison|jail|arrest|convict|trial\b|scandal|affair|divorce|mistress|"
    r"incest|poison|explosion|sank|sinking|fire\b|burned|wounded|injur)", re.I)

_cache: dict[tuple[int, int], tuple[float, list[dict]]] = {}


def _page_info(item: dict) -> tuple[str, str, str]:
    """Title, link and extract of the item's first linked page."""
    for p in item.get("pages") or []:
        title = (p.get("titles") or {}).get("normalized") or p.get("normalizedtitle") or p.get("title", "")
        link = ((p.get("content_urls") or {}).get("desktop") or {}).get("page", "")
        if title and link.startswith("https://en.wikipedia.org/"):
            return title.replace("_", " "), link, p.get("extract") or ""
    return "", "", ""


def _dad_sentence(extract: str) -> str:
    """The first sentence of a page summary that names a dad-and-kid link, if any."""
    for s in re.split(r"(?<=[.!?])\s+", extract):
        if PAIR.search(s) and not DARK.search(s) and 20 <= len(s) <= 300:
            return s.strip()
    return ""


def pick(feed: dict) -> list[dict]:
    """Choose the dad-and-kid items from a Wikipedia "On this day" feed, best first."""
    found: list[tuple[int, dict]] = []
    seen: set[str] = set()
    sections = [("selected", 0), ("events", 0), ("births", 1), ("holidays", 0)]
    for name, penalty in sections:
        for item in feed.get(name) or []:
            text = (item.get("text") or "").strip()
            if not text or DARK.search(text):
                continue
            title, link, extract = _page_info(item)
            if not link or link in seen:
                continue
            in_text = bool(PAIR.search(text) or (DAD.search(text) and KID.search(text)))
            dad_line = "" if in_text else _dad_sentence(extract)
            if not (in_text or dad_line):
                continue
            seen.add(link)
            year = item.get("year")
            rank = (0 if in_text else 2) + penalty
            found.append((rank, {
                "kind": "birth" if name == "births" else ("holiday" if name == "holidays" else "event"),
                "year": year if isinstance(year, int) else None,
                "text": text[:400],
                "dad_line": dad_line[:300],
                "title": title[:120],
                "link": link,
            }))
    found.sort(key=lambda x: x[0])
    return [f for _, f in found[:MAX_ITEMS]]


async def for_date(client: httpx.AsyncClient, month: int, day: int) -> list[dict]:
    """Dad-and-kid items for a date, from cache when fresh. Raises httpx.HTTPError if Wikipedia fails."""
    key = (month, day)
    hit = _cache.get(key)
    if hit and time.monotonic() - hit[0] < CACHE_SECONDS:
        return hit[1]
    r = await client.get(FEED.format(m=month, d=day), headers=HEADERS, timeout=10.0)
    r.raise_for_status()
    items = pick(r.json())
    if len(_cache) > 400:
        _cache.clear()
    _cache[key] = (time.monotonic(), items)
    return items
