"""
RoboDad web server.

  GET  /             the chat page
  GET  /api/status   which mode is running (LLM or classic)
  POST /api/chat     streams a reply as Server-Sent Events

Run locally:  uvicorn app.main:app --reload --port 7860
"""

from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import logging
import os
import re
import time
from urllib.parse import quote
from collections import defaultdict, deque
from contextlib import asynccontextmanager
from datetime import date

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _load_dotenv(path: str) -> None:
    """Read KEY=value lines from .env for local runs (hosting sets real env vars)."""
    if not os.path.exists(path):
        return
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, v = line.split("=", 1)
                if v.strip() and k.strip() not in os.environ:
                    os.environ[k.strip()] = v.strip().strip('"').strip("'")


_load_dotenv(os.path.join(BASE_DIR, ".env"))

import httpx  # noqa: E402
from fastapi import FastAPI, HTTPException, Request  # noqa: E402
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, RedirectResponse, Response, StreamingResponse  # noqa: E402
from fastapi.staticfiles import StaticFiles  # noqa: E402
from pydantic import BaseModel, Field  # noqa: E402

from .llm import (  # noqa: E402
    PRACTICE_LANGS,
    FALLBACK_LINE, REWRITE_NOTE, build_system_prompt, clean_secret, detect_provider, is_bare_refusal,
    stream_with_failover, strip_stock_opener,
)
from . import chess_daily, onthisday  # noqa: E402
from .chess_engine import EngineUnavailable, best_move as chess_best_move  # noqa: E402
from .nlp import RoboDadNLP  # noqa: E402
from .safety import CRISIS_TOKEN, check_crisis, clean_nickname, clean_user_text, crisis_message  # noqa: E402

log = logging.getLogger("robodad")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

_SECRET_PATTERNS = re.compile(r"(sb_secret_|sb_publishable_|gsk_|sk-ant-|sk-)[A-Za-z0-9_\-\\n]+")


class _RedactSecrets(logging.Filter):
    """Never let an API key reach the logs, even inside an error message."""

    def filter(self, record: logging.LogRecord) -> bool:
        msg = record.getMessage()
        for name in ("SUPABASE_KEY", "GROQ_API_KEY", "ANTHROPIC_API_KEY", "OPENAI_API_KEY"):
            raw = os.getenv(name)
            if raw:
                for v in {raw, raw.strip(), clean_secret(raw)} | set(raw.split()):
                    if len(v) >= 8:
                        msg = msg.replace(v, "[redacted]")
        record.msg, record.args = _SECRET_PATTERNS.sub(r"\1[redacted]", msg), ()
        return True


log.addFilter(_RedactSecrets())

STATIC_DIR = os.path.join(BASE_DIR, "static")

HISTORY_TURNS = 16  # messages of context sent to the LLM
RATE_LIMIT = os.getenv("RATE_LIMIT", "30/600")  # messages / seconds, per visitor
DAILY_LLM_LIMIT = int(os.getenv("DAILY_LLM_LIMIT", "1500"))  # protects your API bill

# Optional feedback storage (free Supabase project). Without these, thumbs
# up/down are still written to the server log.
SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
SUPABASE_KEY = clean_secret(os.getenv("SUPABASE_KEY"))

state: dict = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    t = time.perf_counter()
    state["nlp"] = RoboDadNLP()
    state["provider"] = detect_provider()
    state["client"] = httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=10.0))
    p = state["provider"]
    log.info(
        "RoboDad ready in %.2fs: %d examples, %d intents, mode=%s",
        time.perf_counter() - t, len(state["nlp"].rows), len(state["nlp"].intents),
        p.label if p else "classic (no LLM key set)",
    )
    yield
    await state["client"].aclose()


# No auto-generated API docs on the public site (/docs, /redoc, /openapi.json)
app = FastAPI(title="RoboDad", lifespan=lifespan, docs_url=None, redoc_url=None, openapi_url=None)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Compress pages and scripts (the main page drops from ~340 KB to ~90 KB on the wire).
# Starlette leaves text/event-stream alone, so chat replies still stream token by token.
from fastapi.middleware.gzip import GZipMiddleware  # noqa: E402
app.add_middleware(GZipMiddleware, minimum_size=1024)


# ---------------------------------------------------------------- security headers
MAX_BODY_BYTES = 64 * 1024  # a chat request is a few KB; anything bigger is junk


def _inline_script_hashes() -> str:
    """CSP hashes for the inline <script> blocks, so no other inline script can run."""
    import base64
    import hashlib

    found = set()
    for name in os.listdir(STATIC_DIR):
        if name.endswith(".html"):
            with open(os.path.join(STATIC_DIR, name), encoding="utf-8") as f:
                for body in re.findall(r"<script>(.*?)</script>", f.read(), re.S):
                    digest = base64.b64encode(hashlib.sha256(body.encode("utf-8")).digest()).decode()
                    found.add(f"'sha256-{digest}'")
    return " ".join(sorted(found))


CSP = "; ".join([
    "default-src 'self'",
    f"script-src 'self' {_inline_script_hashes()}",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "media-src 'self' data: blob:",
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
])
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "microphone=(self), camera=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Cross-Origin-Opener-Policy": "same-origin",
}


# ---------------------------------------------------------------- domains
# One service, three addresses:
#   robodad.app    the app for teens (the main address)
#   robodad.ca     the page for parents; anything else there goes to robodad.app
#   robodad.online the learning hub (Porkbun forwards it to robodad.app/learn)
APP_ORIGIN = os.getenv("APP_ORIGIN", "https://robodad.app").rstrip("/")
PARENT_HOSTS = {"robodad.ca", "www.robodad.ca"}
LEARN_HOSTS = {"robodad.online", "www.robodad.online"}
# Set CANONICAL_HOST=robodad.app once that domain is live to send onrender.com visitors there.
CANONICAL_HOST = os.getenv("CANONICAL_HOST", "").strip().lower()
_KEEP_ON_ANY_HOST = ("/static/", "/health", "/api/", "/sw.js", "/manifest.webmanifest", "/.well-known/")


def _host(request: Request) -> str:
    return (request.headers.get("host") or "").split(":")[0].strip().lower()


def _parents_page() -> HTMLResponse:
    with open(os.path.join(STATIC_DIR, "parents.html"), encoding="utf-8") as f:
        html = f.read()
    # on robodad.ca the site root is this page, so app links point at robodad.app
    html = html.replace('href="/"', f'href="{APP_ORIGIN}/"').replace('href="/learn"', f'href="{APP_ORIGIN}/learn"')
    html = html.replace('href="/privacy"', f'href="{APP_ORIGIN}/privacy"').replace('href="/terms"', f'href="{APP_ORIGIN}/terms"')
    html = html.replace("← Back to RoboDad", "Open the RoboDad app →")
    return HTMLResponse(html, headers={"Cache-Control": "no-cache"})


@app.middleware("http")
async def route_domains(request: Request, call_next):
    host, path = _host(request), request.url.path
    redirecting_host = host in PARENT_HOSTS or host in LEARN_HOSTS or bool(CANONICAL_HOST and host.endswith(".onrender.com"))
    if request.method in ("GET", "HEAD") and redirecting_host:
        # redirects only ever point at our own site: collapse "//" and re-encode the path
        path = "/" + quote(path.lstrip("/"), safe="/-_.~@:")
        query = f"?{request.url.query}" if request.url.query else ""
        if host in PARENT_HOSTS and not path.startswith("/static/"):
            if path in ("/", "/parents"):
                return _parents_page()
            return RedirectResponse(f"{APP_ORIGIN}{path}{query}", status_code=301)
        if host in LEARN_HOSTS and not path.startswith("/static/"):
            dest = "/learn" if path in ("/", "") else "/learn" + path
            return RedirectResponse(f"{APP_ORIGIN}{dest}{query}", status_code=302)
        if CANONICAL_HOST and host.endswith(".onrender.com") and not path.startswith(_KEEP_ON_ANY_HOST):
            return RedirectResponse(f"https://{CANONICAL_HOST}{path}{query}", status_code=301)
    return await call_next(request)


@app.middleware("http")
async def harden(request: Request, call_next):
    if request.method in ("POST", "PUT", "PATCH"):
        size = request.headers.get("content-length")
        if size is None or not size.isdigit() or int(size) > MAX_BODY_BYTES:
            return JSONResponse({"error": "Request too large."}, status_code=413)
    response = await call_next(request)
    for k, v in SECURITY_HEADERS.items():
        response.headers.setdefault(k, v)
    if response.headers.get("content-type", "").startswith("text/html"):
        response.headers["Content-Security-Policy"] = CSP
    return response


# ---------------------------------------------------------------- rate limits
_max_hits, _window = (int(x) for x in RATE_LIMIT.split("/"))
_hits: dict[str, deque] = defaultdict(deque)
_daily = {"day": date.today(), "count": 0}


def _client_ip(request: Request) -> str:
    """The visitor's real address, for rate limits.

    Render sits behind Cloudflare, which overwrites CF-Connecting-IP with the
    address that actually connected, so a visitor can't fake it to dodge the
    limits. X-Forwarded-For is only a fallback for local runs.
    """
    for h in ("cf-connecting-ip", "true-client-ip"):
        v = (request.headers.get(h) or "").strip()
        if v:
            return v[:64]
    fwd = request.headers.get("x-forwarded-for")
    return fwd.split(",")[0].strip()[:64] if fwd else (request.client.host if request.client else "?")


def _prune(store: dict[str, deque], window: float, now: float) -> None:
    """Forget visitors whose hits have all expired, so the table can't grow forever."""
    if len(store) > 5000:
        for k in [k for k, q in store.items() if not q or now - q[-1] > window]:
            del store[k]


def _rate_limited(ip: str) -> bool:
    now = time.monotonic()
    _prune(_hits, _window, now)
    q = _hits[ip]
    while q and now - q[0] > _window:
        q.popleft()
    if len(q) >= _max_hits:
        return True
    q.append(now)
    return False


def _llm_budget_left() -> bool:
    if _daily["day"] != date.today():
        _daily.update(day=date.today(), count=0)
    return _daily["count"] < DAILY_LLM_LIMIT


# ---------------------------------------------------------------- models
class ChatMessage(BaseModel):
    role: str = Field(max_length=16)
    content: str = Field(max_length=4000)


class FeedbackRequest(BaseModel):
    rating: int = Field(ge=-1, le=1)
    intent: str = Field(default="", max_length=64)
    confidence: float = 0.0
    mode: str = Field(default="", max_length=16)
    model: str = Field(default="", max_length=120)
    reply: str = Field(default="", max_length=4000)
    kind: str = Field(default="rating", pattern="^(rating|report)$")
    reason: str = Field(default="", max_length=40)


class PracticeSpec(BaseModel):
    lang: str = Field(max_length=8)   # 2-letter language codes, "math", "brain"
    scenario: str = Field(default="free", max_length=24)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=200)
    nickname: str = Field(default="", max_length=40)
    practice: PracticeSpec | None = None
    family: str = Field(default="", max_length=64)          # family-mode token from /api/code
    eggs: list[str] = Field(default_factory=list, max_length=8)
    voice: str = Field(default="", max_length=80)            # the voice that read the last reply aloud


class CodeRequest(BaseModel):
    code: str = Field(min_length=1, max_length=60)
    family: str = Field(default="", max_length=64)          # lets the family preview the hunt early
    hunt: int = Field(default=0, ge=0, le=6)                # the chapter this device has reached


# ---------------------------------------------------------------- secret codes
# Easter-egg codes are stored only as SHA-256 hashes (they're meant to be found
# and shared, but not read straight out of the source). The family code lives
# only in the FAMILY_CODE environment variable, never in this repository.
# Nothing a code unlocks changes RoboDad's safety rules.
def _norm_code(c: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (c or "").lower())


EGG_HASHES = {hashlib.sha256(b"upupdowndown").hexdigest(): "cheat"}
EGGS = {"cheat"}

# The Lost Cartridge (an in-app puzzle hunt). Each answer opens the next chapter;
# chapter 6 is the finale. Chapters open every 3 days from ARG_START (YYYY-MM-DD,
# Toronto time). Answers are kept here only as hashes.
HUNT_HASHES = {hashlib.sha256(w.encode()).hexdigest(): n for w, n in (
    ("pressstart", 1), ("joypad", 2), ("attic", 3), ("badge", 4), ("392", 5), ("39200", 5), ("dadquest", 6))}
ARG_START = os.getenv("ARG_START", "").strip()
# RETRO (the five Daily Board letters) opens the next chapter early. Stored as a hash like the rest.
HUNT_EARLY_HASH = hashlib.sha256(b"retro").hexdigest()


def _hunt_opens(chapter: int):
    """The date a chapter opens, or None if the hunt has no start date yet."""
    from datetime import timedelta
    try:
        start = date.fromisoformat(ARG_START)
    except ValueError:
        return None
    return start + timedelta(days=3 * (min(chapter, 5) - 1))


def _toronto_today() -> date:
    from datetime import datetime
    from zoneinfo import ZoneInfo
    return datetime.now(ZoneInfo("America/Toronto")).date()


async def _clicks_total(kind: str, name: str, since: str = "") -> int | None:
    if not (SUPABASE_URL and SUPABASE_KEY):
        return None
    try:
        r = await state["client"].get(
            f"{SUPABASE_URL}/rest/v1/clicks?select=id&kind=eq.{kind}&name=eq.{name}"
            + (f"&created_at=gte.{since}" if since else ""),
            headers=_supabase_headers({"Prefer": "count=exact", "Range": "0-0"}),
        )
        total = r.headers.get("content-range", "").split("/")[-1]
        return int(total) if total.isdigit() else None
    except httpx.HTTPError:
        return None
FAMILY_CODE = _norm_code(os.getenv("FAMILY_CODE", ""))
FAMILY_PROFILE = os.getenv("FAMILY_PROFILE", "").strip()[:3000]
_code_hits: dict[str, deque] = defaultdict(deque)

FAMILY_BLOCK = (
    "\n## Family mode\n"
    "You're chatting with one of the kids of the real dad who built you (a dad in Toronto). Be a little more "
    "personal and warm, as if you know the family, and say now and then that their dad would be proud of them. "
    "Use the family details below naturally, at most one per reply, and never invent family facts that aren't "
    "listed. Every safety rule and boundary above stays exactly the same in family mode."
)
CHEAT_BLOCK = (
    "\n## Cheat Code mode\n"
    "This user found the secret cheat code. Now and then, sprinkle in 80s arcade and video-game puns (extra "
    "lives, 1UP, high score, level up). When they ask for a joke, make it an extra-cringe dad pun. Keep advice "
    "just as helpful and short."
)


def _family_token() -> str:
    if not FAMILY_CODE:
        return ""
    return hmac.new(FAMILY_CODE.encode(), b"robodad-family-v1", hashlib.sha256).hexdigest()[:32]


def _is_family(token: str) -> bool:
    t = _family_token()
    return bool(t and token) and hmac.compare_digest(t, token)


def _voice_note(req: "ChatRequest") -> str:
    """Tell the AI which voice actually read its last reply, so it never has to guess."""
    v = re.sub(r"[^\w\s().:#\-]", "", req.voice or "").strip()[:80]
    if not v:
        return ""
    return ("\n\nThe voice that read your last reply aloud on this device: " + v +
            ". Use this only if they ask about your voice.")


def _prompt_extras(req: "ChatRequest") -> str:
    parts = []
    if _is_family(req.family):
        parts.append(FAMILY_BLOCK + ("\n" + FAMILY_PROFILE if FAMILY_PROFILE else ""))
    if "cheat" in req.eggs:
        parts.append(CHEAT_BLOCK)
    return "\n".join(parts)


def _prepare_history(msgs: list[ChatMessage], practice: bool = False) -> list[dict]:
    """Keep the last few turns, start on a user turn, merge same-role neighbours.

    In Practice mode RoboDad speaks first (he opens the role-play), so that
    opening line is kept behind a short stand-in user turn.
    """
    cleaned = [
        {"role": m.role, "content": clean_user_text(m.content)}
        for m in msgs
        if m.role in ("user", "assistant") and m.content.strip()
    ][-HISTORY_TURNS:]
    if practice and cleaned and cleaned[0]["role"] == "assistant":
        cleaned.insert(0, {"role": "user", "content": "(Start the role-play.)"})
    while cleaned and cleaned[0]["role"] != "user":
        cleaned.pop(0)
    merged: list[dict] = []
    for m in cleaned:
        if merged and merged[-1]["role"] == m["role"]:
            merged[-1]["content"] += "\n\n" + m["content"]
        else:
            merged.append(m)
    return merged


def _sse(event: str, data) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


# ---------------------------------------------------------------- routes
@app.get("/")
async def index():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"), headers={"Cache-Control": "no-cache"})


# For search engines: what to index, and where the public pages are.
# (/parents is left out of the sitemap because its home address is robodad.ca.)
SITEMAP_PATHS = ("/", "/learn", "/changelog", "/privacy", "/terms")


@app.get("/robots.txt")
async def robots():
    body = f"User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /go/\n\nSitemap: {APP_ORIGIN}/sitemap.xml\n"
    return Response(body, media_type="text/plain", headers={"Cache-Control": "public, max-age=3600"})


@app.get("/sitemap.xml")
async def sitemap():
    urls = "".join(f"<url><loc>{APP_ORIGIN}{path}</loc></url>" for path in SITEMAP_PATHS)
    body = f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>'
    return Response(body, media_type="application/xml", headers={"Cache-Control": "public, max-age=3600"})


# The phone-app files must be served from the site root to control the whole site.
@app.get("/manifest.webmanifest")
async def manifest():
    return FileResponse(os.path.join(STATIC_DIR, "manifest.webmanifest"), media_type="application/manifest+json")


@app.get("/sw.js")
async def service_worker():
    return FileResponse(
        os.path.join(STATIC_DIR, "sw.js"),
        media_type="application/javascript",
        headers={"Cache-Control": "no-cache", "Service-Worker-Allowed": "/"},
    )


@app.get("/api/status")
async def status():
    p = state.get("provider")
    return {
        "mode": "llm" if p else "classic",
        "model": "RoboDad" if p else "TF-IDF + Logistic Regression",  # never expose the vendor model
        "intents": len(state["nlp"].intents),
        "examples": len(state["nlp"].rows),
    }


@app.get("/quest")
async def quest_page():
    return FileResponse(os.path.join(STATIC_DIR, "quest.html"), headers={"Cache-Control": "no-cache"})


@app.get("/chess")
async def chess_page():
    return FileResponse(os.path.join(STATIC_DIR, "chess.html"), headers={"Cache-Control": "no-cache"})


@app.get("/attic")
async def attic_page():
    return FileResponse(os.path.join(STATIC_DIR, "attic.html"), headers={"Cache-Control": "no-cache"})


@app.get("/testers")
async def testers_page():
    return FileResponse(os.path.join(STATIC_DIR, "testers.html"), headers={"Cache-Control": "no-cache"})


TESTER_GOAL = int(os.getenv("TESTER_GOAL", "12"))
_EMAIL_RE = re.compile(r"^[^@\s]{1,64}@[^@\s]{1,190}\.[A-Za-z]{2,24}$")


class TesterSignup(BaseModel):
    email: str = Field(max_length=254)
    first_name: str = Field(default="", max_length=40)
    adult: bool = False
    android: bool = False
    website: str = Field(default="", max_length=200)  # honeypot: real people leave this empty


def _supabase_headers(extra: dict | None = None) -> dict:
    h = {"apikey": SUPABASE_KEY, "Content-Type": "application/json"}
    if not SUPABASE_KEY.startswith("sb_"):
        h["Authorization"] = f"Bearer {SUPABASE_KEY}"
    return h | (extra or {})


_count_cache = {"at": 0.0, "value": None}


async def _tester_count(fresh: bool = False) -> int | None:
    if not (SUPABASE_URL and SUPABASE_KEY):
        return None
    if not fresh and time.monotonic() - _count_cache["at"] < 60:
        return _count_cache["value"]
    try:
        r = await state["client"].get(
            f"{SUPABASE_URL}/rest/v1/testers?select=id",
            headers=_supabase_headers({"Prefer": "count=exact", "Range": "0-0"}),
        )
        total = r.headers.get("content-range", "").split("/")[-1]
        value = int(total) if total.isdigit() else None
        _count_cache.update(at=time.monotonic(), value=value)
        return value
    except (httpx.HTTPError, ValueError):
        return None


@app.get("/api/testers/count")
async def tester_count():
    return {"count": await _tester_count(), "goal": TESTER_GOAL}


@app.post("/api/testers")
async def tester_signup(t: TesterSignup, request: Request):
    """Google Play closed-test sign-up. Stores only the email and an optional first name."""
    if _rate_limited(_client_ip(request)):
        return JSONResponse({"error": "Too many tries. Wait a minute, then try again."}, status_code=429)
    if t.website:  # a bot filled in the hidden field
        return {"ok": True, "count": await _tester_count(), "goal": TESTER_GOAL}
    email = t.email.strip().lower()
    if not _EMAIL_RE.match(email):
        return JSONResponse({"error": "That email address doesn't look right. Check it and try again."}, status_code=400)
    if not (t.adult and t.android):
        return JSONResponse({"error": "Please confirm you're 18 or older and have an Android phone."}, status_code=400)
    name = clean_nickname(t.first_name)
    log.info("TESTER signup: %s", email.split("@")[0][:2] + "***@" + email.split("@")[-1])
    if not (SUPABASE_URL and SUPABASE_KEY):
        log.warning("Tester sign-up not stored (no database configured)")
        return JSONResponse({"error": "Sign-ups aren't open yet. Please try again later."}, status_code=503)
    try:
        r = await state["client"].post(
            f"{SUPABASE_URL}/rest/v1/testers?on_conflict=email",
            headers=_supabase_headers({"Prefer": "return=minimal,resolution=ignore-duplicates"}),
            json={"email": email, "first_name": name},
        )
        if r.status_code >= 300:
            log.warning("Tester insert failed %s: %s", r.status_code, r.text[:300])
            return JSONResponse({"error": "Something went wrong saving your sign-up. Please try again."}, status_code=502)
    except httpx.HTTPError as exc:
        log.warning("Supabase unreachable for tester sign-up: %s", exc)
        return JSONResponse({"error": "Something went wrong saving your sign-up. Please try again."}, status_code=502)
    return {"ok": True, "count": await _tester_count(fresh=True), "goal": TESTER_GOAL}


# ---------------------------------------------------------------- learning hub + link tracking
@app.get("/learn")
async def learn_page():
    return FileResponse(os.path.join(STATIC_DIR, "learn.html"), headers={"Cache-Control": "no-cache"})


# Short links for bios and posts, e.g. robodad.app/go/tiktok or robodad.online/ig.
# Each visit adds one anonymous row (just the source name) so we can see which
# platform brings people in. No cookies, no IP addresses, nothing about the visitor.
TRACK_SOURCES = {
    "ig": "instagram", "instagram": "instagram", "tiktok": "tiktok", "tt": "tiktok", "yt": "youtube",
    "youtube": "youtube", "threads": "threads", "x": "x", "twitter": "x", "reddit": "reddit",
    "fb": "facebook", "facebook": "facebook", "linkedin": "linkedin", "li": "linkedin", "qr": "qr", "email": "email",
}
INTEREST_TOPICS = {
    "math", "science", "coding", "lang:pa", "lang:tl", "lang:zh", "lang:ta", "lang:ur", "lang:ar", "lang:mr",
    "lang:gu", "lang:bn", "lang:te", "lang:tcy", "lang:ko", "lang:ja", "lang:pt", "lang:it", "lang:de", "lang:other",
}
_counted: dict[str, deque] = defaultdict(deque)


async def _count(kind: str, name: str, request: Request) -> None:
    """Add one anonymous count. Each visitor counts once per name per 10 minutes."""
    now = time.monotonic()
    _prune(_counted, 600, now)
    key = f"{_client_ip(request)}|{kind}|{name}"
    q = _counted[key]
    if q and now - q[-1] < 600:
        return
    q.append(now)
    log.info("COUNT %s %s", kind, name)
    if not (SUPABASE_URL and SUPABASE_KEY):
        return
    try:
        r = await state["client"].post(
            f"{SUPABASE_URL}/rest/v1/clicks",
            headers=_supabase_headers({"Prefer": "return=minimal"}),
            json={"kind": kind, "name": name},
        )
        if r.status_code >= 300:
            log.warning("Count not stored %s: %s", r.status_code, r.text[:200])
    except httpx.HTTPError as exc:
        log.warning("Count not stored: %s", exc)


@app.get("/go/{src}")
async def go(src: str, request: Request):
    name = TRACK_SOURCES.get(src.lower())
    if name:
        await _count("visit", name, request)
    return RedirectResponse("/", status_code=302)


@app.get("/learn/{src}")
async def learn_go(src: str, request: Request):
    name = TRACK_SOURCES.get(src.lower())
    if name:
        await _count("learn", name, request)
    return RedirectResponse("/learn", status_code=302)


class Interest(BaseModel):
    topic: str = Field(max_length=24)


@app.post("/api/interest")
async def interest(i: Interest, request: Request):
    """'I want this' votes on the learning hub (a subject or a family language). Anonymous."""
    if i.topic not in INTEREST_TOPICS:
        raise HTTPException(400, "Unknown topic.")
    if _rate_limited(_client_ip(request)):
        return JSONResponse({"error": "Too many tries. Wait a minute."}, status_code=429)
    await _count("interest", i.topic, request)
    return {"ok": True}


@app.get("/parents")
async def parents():
    return FileResponse(os.path.join(STATIC_DIR, "parents.html"), headers={"Cache-Control": "no-cache"})


@app.get("/terms")
async def terms():
    return FileResponse(os.path.join(STATIC_DIR, "terms.html"), headers={"Cache-Control": "no-cache"})


@app.get("/changelog")
async def changelog():
    return FileResponse(os.path.join(STATIC_DIR, "changelog.html"), headers={"Cache-Control": "no-cache"})


@app.get("/privacy")
async def privacy():
    return FileResponse(os.path.join(STATIC_DIR, "privacy.html"), headers={"Cache-Control": "no-cache"})


@app.get("/.well-known/assetlinks.json")
async def assetlinks():
    """Proves to Android that the Play Store app and this website belong together.

    Set ANDROID_PACKAGE (e.g. com.robodad.app) and ANDROID_SHA256 (the signing
    key fingerprint from PWABuilder / Play Console; several can be comma-separated).
    """
    package = os.getenv("ANDROID_PACKAGE", "").strip()
    prints = [p.strip() for p in os.getenv("ANDROID_SHA256", "").split(",") if p.strip()]
    if not (package and prints):
        raise HTTPException(404, "Not configured")
    return JSONResponse([{
        "relation": ["delegate_permission/common.handle_all_urls"],
        "target": {"namespace": "android_app", "package_name": package, "sha256_cert_fingerprints": prints},
    }])


_TIP_INTENTS = {
    "life_skill_jobs", "life_skill_money", "life_skill_study", "life_skill_cooking", "life_skill_food",
    "life_skill_sleep", "life_skill_focus", "life_skill_time", "life_skill_laundry", "life_skill_home",
    "life_skill_transport", "life_skill_online", "life_skill_friendship", "life_skill_peer_pressure",
    "life_skill_future", "life_skill_organization", "life_skill_growth", "life_skill_planning", "life_skill_cleaning",
}


@app.get("/api/daily")
async def daily(random_pick: bool = False):
    """Dad joke and life tip of the day, from RoboDad's own dataset."""
    import hashlib
    import random as _random

    nlp: RoboDadNLP = state["nlp"]
    jokes = sorted(set(nlp.responses.get("dad_joke", [])))
    tips = sorted({(r["intent"], r["user_utterance"], r["bot_response"]) for r in nlp.rows
                   if r["intent"] in _TIP_INTENTS and len(r["bot_response"]) > 45})
    if random_pick:
        rng = _random.Random()
    else:
        rng = _random.Random(int(hashlib.sha256(date.today().isoformat().encode()).hexdigest(), 16))
    joke = rng.choice(jokes) if jokes else ""
    topic, question, tip = rng.choice(tips) if tips else ("", "", "")
    question = question.strip().rstrip("?")
    for pat, fix in ((r"\bi\b", "I"), (r"\bim\b", "I'm"), (r"\bive\b", "I've"), (r"\bdont\b", "don't"),
                     (r"\bcant\b", "can't"), (r"\bdidnt\b", "didn't"), (r"\bwont\b", "won't")):
        question = re.sub(pat, fix, question)
    question = (question[:1].upper() + question[1:] + "?") if question else ""
    return {"joke": joke, "tip": tip, "question": question,
            "topic": topic.replace("life_skill_", "").replace("_", " ")}


# ---------------------------------------------------------------- read aloud
# RoboDad's voice: Groq's text-to-speech (Orpheus) with a male voice, so the
# voice is the same on every phone. The page falls back to the device's own
# voice whenever this is unavailable (no key, limits reached, an error).
TTS_MODEL = os.getenv("TTS_MODEL", "canopylabs/orpheus-v1-english")
TTS_URL = os.getenv("TTS_URL", "https://api.groq.com/openai/v1/audio/speech")
TTS_VOICES = ("troy", "austin")
TTS_VOICE = os.getenv("TTS_VOICE", "troy")
TTS_DAILY_LIMIT = int(os.getenv("TTS_DAILY_LIMIT", "400"))  # clips per day
_tts = {"day": date.today(), "count": 0, "off_until": 0.0}
_tts_hits: dict[str, deque] = defaultdict(deque)


class TTSRequest(BaseModel):
    text: str = Field(min_length=1, max_length=200)
    voice: str = Field(default="", max_length=20)
    lang: str = Field(default="", max_length=4)             # "fr", "es", "hi", "mr" or "bn" for language practice


# French, Spanish, Hindi, Marathi and Bengali: Groq's voices only speak English, so practice lines use
# Microsoft Azure's neural voices (male, one per language, same on every phone).
# Without AZURE_SPEECH_KEY the page uses the phone's own voice, as before.
LANG_VOICES = {
    "fr": ("fr-CA", os.getenv("TTS_VOICE_FR", "fr-CA-AntoineNeural")),
    "es": ("es-MX", os.getenv("TTS_VOICE_ES", "es-MX-JorgeNeural")),
    "hi": ("hi-IN", os.getenv("TTS_VOICE_HI", "hi-IN-MadhurNeural")),
    "mr": ("mr-IN", os.getenv("TTS_VOICE_MR", "mr-IN-ManoharNeural")),
    "bn": ("bn-IN", os.getenv("TTS_VOICE_BN", "bn-IN-BashkarNeural")),
}
LANG_TTS_DAILY_CHARS = int(os.getenv("LANG_TTS_DAILY_CHARS", "15000"))  # Azure free tier: 500k a month
_lang_usage = {"day": date.today(), "chars": 0, "off_until": 0.0}


async def _lang_tts(req: TTSRequest, request: Request) -> Response:
    key = clean_secret(os.getenv("AZURE_SPEECH_KEY"))
    region = re.sub(r"[^a-z0-9]", "", (os.getenv("AZURE_SPEECH_REGION") or "canadacentral").lower())
    now = time.monotonic()
    if not key or now < _lang_usage["off_until"]:
        return JSONResponse({"error": "Voice is resting. Using this device's voice."}, status_code=503)
    _prune(_tts_hits, 600, now)
    q = _tts_hits[_client_ip(request)]
    while q and now - q[0] > 600:
        q.popleft()
    if len(q) >= 60:
        return JSONResponse({"error": "Too many voice clips. Try again soon."}, status_code=429)
    if _lang_usage["day"] != date.today():
        _lang_usage.update(day=date.today(), chars=0)
    text = re.sub(r"\s+", " ", req.text).strip()
    if _lang_usage["chars"] + len(text) > LANG_TTS_DAILY_CHARS:
        return JSONResponse({"error": "Daily voice limit reached."}, status_code=503)
    q.append(now)
    _lang_usage["chars"] += len(text)
    locale, voice = LANG_VOICES[req.lang]
    safe = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    ssml = (f"<speak version='1.0' xml:lang='{locale}'><voice name='{voice}'>"
            f"<prosody rate='-12%'>{safe}</prosody></voice></speak>")       # a little slower for learners
    try:
        r = await state["client"].post(
            f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1",
            headers={"Ocp-Apim-Subscription-Key": key, "Content-Type": "application/ssml+xml",
                     "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3", "User-Agent": "RoboDad"},
            content=ssml.encode("utf-8"),
        )
    except httpx.HTTPError as exc:
        log.warning("Language TTS request failed: %s", type(exc).__name__)
        return JSONResponse({"error": "Voice unavailable."}, status_code=503)
    if r.status_code != 200:
        log.warning("Language TTS error %s: %s", r.status_code, r.text[:300])
        _lang_usage["off_until"] = now + (3600.0 if r.status_code in (401, 403) else 120.0)
        return JSONResponse({"error": "Voice unavailable."}, status_code=503)
    return Response(r.content, media_type="audio/mpeg", headers={"Cache-Control": "no-store"})


@app.post("/api/tts")
async def tts(req: TTSRequest, request: Request):
    if req.lang:
        if req.lang not in LANG_VOICES:
            return JSONResponse({"error": "Voice unavailable."}, status_code=400)
        return await _lang_tts(req, request)
    key = clean_secret(os.getenv("GROQ_API_KEY"))
    now = time.monotonic()
    if not key or now < _tts["off_until"]:
        return JSONResponse({"error": "Voice is resting. Using this device's voice."}, status_code=503)
    _prune(_tts_hits, 600, now)
    q = _tts_hits[_client_ip(request)]
    while q and now - q[0] > 600:
        q.popleft()
    if len(q) >= 60:
        return JSONResponse({"error": "Too many voice clips. Try again soon."}, status_code=429)
    if _tts["day"] != date.today():
        _tts.update(day=date.today(), count=0)
    if _tts["count"] >= TTS_DAILY_LIMIT:
        return JSONResponse({"error": "Daily voice limit reached."}, status_code=503)
    q.append(now)
    _tts["count"] += 1
    voice = req.voice if req.voice in TTS_VOICES else TTS_VOICE
    text = re.sub(r"\s+", " ", req.text).strip()
    try:
        r = await state["client"].post(
            TTS_URL,
            headers={"Authorization": f"Bearer {key}"},
            json={"model": TTS_MODEL, "voice": voice, "input": text, "response_format": "wav"},
        )
    except httpx.HTTPError as exc:
        log.warning("TTS request failed: %s", type(exc).__name__)
        return JSONResponse({"error": "Voice unavailable."}, status_code=503)
    if r.status_code != 200:
        log.warning("TTS error %s: %s", r.status_code, r.text[:300])
        wait = 60.0 if r.status_code == 429 else 120.0
        try:
            wait = float(r.headers.get("retry-after", wait))
        except ValueError:
            pass
        m = re.search(r"try again in (?:(\d+)h)?(?:(\d+)m)?(?:([\d.]+)s)?", r.text)
        if m and any(m.groups()):   # daily allowance used up: rest until Groq says it's back
            h, mi, se = (float(x) if x else 0.0 for x in m.groups())
            wait = max(wait, h * 3600 + mi * 60 + se)
        _tts["off_until"] = now + min(wait, 6 * 3600)
        return JSONResponse({"error": "Voice unavailable."}, status_code=503)
    return Response(r.content, media_type="audio/wav", headers={"Cache-Control": "no-store"})


# ---------------------------------------------------------------- chess (top two tiers)
# Professor Dad and Robo-Grandpa play on the server with Stockfish. Lower tiers run in the browser.
_chess_hits: dict[str, deque] = defaultdict(deque)


class ChessMoveRequest(BaseModel):
    fen: str = Field(min_length=10, max_length=100)
    level: str = Field(max_length=16)                     # "professor" or "grandpa"


# ---------------------------------------------------------------- on this day with Dad
_otd_hits: dict[str, deque] = defaultdict(deque)


@app.get("/api/onthisday")
async def on_this_day(m: int, d: int, request: Request):
    """Dad-and-kid stories from Wikipedia's "On this day" list for a month and day."""
    try:
        date(2024, m, d)                                   # 2024 is a leap year, so 29 Feb is allowed
    except ValueError:
        return JSONResponse({"error": "That date doesn't look right."}, status_code=400)
    now = time.monotonic()
    _prune(_otd_hits, 60, now)
    q = _otd_hits[_client_ip(request)]
    while q and now - q[0] > 60:
        q.popleft()
    if len(q) >= 20:
        return JSONResponse({"error": "Slow down. Give it a moment."}, status_code=429)
    q.append(now)
    try:
        items = await onthisday.for_date(state["client"], m, d)
    except (httpx.HTTPError, ValueError):
        return JSONResponse({"error": "Couldn't reach Wikipedia right now. Try again in a bit."}, status_code=503)
    return {"month": m, "day": d, "items": items, "source": "Wikipedia, CC BY-SA"}


@app.post("/api/chess/move")
async def chess_move(req: ChessMoveRequest, request: Request):
    now = time.monotonic()
    _prune(_chess_hits, 60, now)
    q = _chess_hits[_client_ip(request)]
    while q and now - q[0] > 60:
        q.popleft()
    if len(q) >= 40:                                      # 40 engine moves a minute per visitor
        return JSONResponse({"error": "Slow down. Give it a moment."}, status_code=429)
    q.append(now)
    try:
        move = await asyncio.to_thread(chess_best_move, req.fen.strip(), req.level)
    except ValueError:
        return JSONResponse({"error": "That position doesn't look right."}, status_code=400)
    except EngineUnavailable:
        return JSONResponse({"error": "The big engine is napping. Try a lower dad for now."}, status_code=503)
    return {"move": move}


# ---------------------------------------------------------------- the Daily Board
_daily_hits: dict[str, deque] = defaultdict(deque)


class DailyAnswer(BaseModel):
    index: int = Field(ge=0, le=99)
    move: str = Field(min_length=4, max_length=5)          # long algebra, e.g. "a1a8"


@app.get("/api/chess/daily")
async def chess_daily_today():
    day, index = chess_daily.today_index(_toronto_today(), ARG_START)
    return {"day": day, "index": index}


@app.post("/api/chess/daily")
async def chess_daily_answer(a: DailyAnswer, request: Request):
    now = time.monotonic()
    _prune(_daily_hits, 600, now)
    q = _daily_hits[_client_ip(request)]
    while q and now - q[0] > 600:
        q.popleft()
    if len(q) >= 30:
        return JSONResponse({"error": "Lots of guesses. Take a short break."}, status_code=429)
    q.append(now)
    _, index = chess_daily.today_index(_toronto_today(), ARG_START)
    if a.index != index:                                    # only today's puzzle can be answered
        return JSONResponse({"error": "That's not today's board. Refresh and try again."}, status_code=400)
    letter = chess_daily.check(a.index, a.move)
    return {"ok": True, "letter": letter} if letter else {"ok": False}


@app.get("/health")
async def health():
    return {"ok": True}


@app.post("/api/code")
async def secret_code(c: CodeRequest, request: Request):
    """Check a secret code. Codes are never logged or stored."""
    now = time.monotonic()
    _prune(_code_hits, 600, now)
    q = _code_hits[_client_ip(request)]
    while q and now - q[0] > 600:
        q.popleft()
    if len(q) >= 20:
        return JSONResponse({"error": "Too many guesses. Take a 10-minute break, then try again."}, status_code=429)
    q.append(now)
    code = _norm_code(c.code)
    if FAMILY_CODE and hmac.compare_digest(code, FAMILY_CODE):
        log.info("SECRET CODE: family mode unlocked")
        return {"kind": "family", "token": _family_token()}
    digest = hashlib.sha256(code.encode()).hexdigest()
    egg = EGG_HASHES.get(digest)
    if egg:
        log.info("SECRET CODE: egg %s unlocked", egg)
        return {"kind": "egg", "egg": egg}
    if digest == HUNT_EARLY_HASH:
        if 1 <= c.hunt <= 4:                       # chapter 5 leads to the finale, which stays on the calendar
            log.info("HUNT: chapter %s opened early with the Daily Board code", c.hunt + 1)
            return {"kind": "hunt", "chapter": c.hunt + 1}
        return JSONResponse({"error": "Nice work on the Daily Board. That code has nothing to open yet."}, status_code=404)
    chapter = HUNT_HASHES.get(digest)
    if chapter:
        opens = _hunt_opens(chapter)
        if not _is_family(c.family) and (opens is None or _toronto_today() < opens):
            when = opens.strftime("%A, %B %-d") if opens else None
            return {"kind": "hunt_wait", "opens": when}
        log.info("HUNT: chapter %s opened", chapter)
        out = {"kind": "hunt", "chapter": chapter}
        if chapter == 6 and not _is_family(c.family):   # family previews aren't counted
            await _count("hunt", "solved", request)
            out["solver"] = await _clicks_total("hunt", "solved", ARG_START)
        return out
    return JSONResponse({"error": "Nope, that's not a code I know. Nice try, though."}, status_code=404)


@app.post("/api/chat")
async def chat(req: ChatRequest, request: Request):
    practice = req.practice if req.practice and (req.practice.lang in PRACTICE_LANGS or req.practice.lang in ("math", "brain")) else None
    history = _prepare_history(req.messages, practice is not None)
    if not history or history[-1]["role"] != "user":
        raise HTTPException(400, "The last message must come from the user.")
    if _rate_limited(_client_ip(request)):
        return JSONResponse(
            {"error": "You're sending messages quickly. Wait a minute, then try again."}, status_code=429
        )

    user_text = history[-1]["content"]
    nickname = clean_nickname(req.nickname)
    nlp: RoboDadNLP = state["nlp"]
    provider = state["provider"]

    async def events():
        t0 = time.perf_counter()
        analysis = await asyncio.to_thread(nlp.analyse, user_text)
        nlp_ms = (time.perf_counter() - t0) * 1000

        crisis = check_crisis(user_text)
        if crisis:
            mode = "safety"
        elif provider and _llm_budget_left():
            mode = "llm"
        else:
            mode = "classic"

        meta = analysis.to_dict() | {"mode": mode, "nlp_ms": round(nlp_ms, 1)}
        if crisis:
            meta["safety"] = crisis[0]
        yield _sse("meta", meta)

        if mode == "safety":
            log.info("SAFETY message shown: %s", crisis[0])
            yield _sse("token", crisis[1])
        elif mode == "classic":
            yield _sse("token", nlp.classic_reply(analysis))
        else:
            _daily["count"] += 1
            sent_any = False
            try:
                system = build_system_prompt(analysis, nickname, practice, extra=_prompt_extras(req)) + _voice_note(req)
                async for chunk in dad_mode_stream(provider, system, history):
                    if isinstance(chunk, CrisisFlag):
                        # The AI spotted a crisis the keyword rules missed (any language)
                        name, msg = crisis_message(chunk.category)
                        log.info("SAFETY message shown (AI flag): %s", name)
                        mode = "safety"
                        yield _sse("mode", {"mode": "safety", "safety": name})
                        yield _sse("token", ("\n\n" if sent_any else "") + msg)
                        sent_any = True
                        break
                    sent_any = True
                    yield _sse("token", chunk)
                if not sent_any:
                    raise RuntimeError("model returned an empty reply")
            except Exception as exc:  # network, quota, bad key …
                log.warning("LLM failed, falling back to classic: %s", exc)
                if not sent_any:
                    yield _sse("mode", {"mode": "classic", "reason": "The AI model didn't respond, so RoboDad answered from his playbook."})
                    yield _sse("token", nlp.classic_reply(analysis))
                else:
                    yield _sse("token", " …sorry, I lost my train of thought there. Try asking again?")

        done = {"total_ms": round((time.perf_counter() - t0) * 1000, 1)}
        if mode == "llm":
            log.info("REPLY model=%s", provider.label)  # kept in server logs only, never sent to the page
        yield _sse("done", done)

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


HOLD_BACK_CHARS = 150  # long enough to spot a one-line stock refusal before anyone sees it


class CrisisFlag:
    """Yielded instead of text when the AI replies with the crisis token."""

    def __init__(self, category: str):
        self.category = category


async def dad_mode_stream(provider, system: str, history: list[dict]):
    """Stream the reply, but never let a bare "Sorry, I can't help with that" through.

    The first ~150 characters are held back. If the complete reply turns out to
    be a stock refusal, RoboDad is asked to rewrite it in Dad Mode; if that
    fails too, an in-character line is sent instead.
    """
    buf, flushed, tail = "", False, ""
    async for chunk in stream_with_failover(provider, system, history, state["client"]):
        if flushed:
            tail = (tail + chunk)[-60:]
            if m := CRISIS_TOKEN.search(tail):
                yield CrisisFlag(m.group(1))
                return
            yield chunk
            continue
        buf += chunk
        if m := CRISIS_TOKEN.search(buf):
            yield CrisisFlag(m.group(1))
            return
        if len(buf) > HOLD_BACK_CHARS:
            flushed = True
            tail = buf[-60:]
            yield strip_stock_opener(buf)
    if flushed:
        return
    if not is_bare_refusal(buf):
        if buf:
            yield strip_stock_opener(buf)
        return
    log.info("Bare refusal caught; asking for a Dad Mode rewrite")
    _daily["count"] += 1
    retry = ""
    try:
        async for chunk in stream_with_failover(provider, system + REWRITE_NOTE, history, state["client"]):
            retry += chunk
    except Exception as exc:
        log.warning("Dad Mode rewrite failed: %s", exc)
    yield strip_stock_opener(retry) if retry.strip() and not is_bare_refusal(retry) else FALLBACK_LINE


@app.post("/api/feedback")
async def feedback(fb: FeedbackRequest, request: Request):
    """Thumbs up/down or a report on a reply. What the user typed is never stored."""
    if fb.kind == "report":
        fb.rating = -1
    if fb.rating == 0:
        raise HTTPException(400, "Rating must be 1 or -1.")
    if _rate_limited(_client_ip(request)):
        return JSONResponse({"error": "Too many ratings. Wait a minute, then try again."}, status_code=429)

    p = state.get("provider")
    fb.model = p.label if (p and fb.mode == "llm") else ""  # recorded server-side; the page never sees it
    row = fb.model_dump()
    log.info("FEEDBACK %s%s intent=%s mode=%s model=%s reply=%r",
             "REPORT " if fb.kind == "report" else "", "up" if fb.rating > 0 else "down",
             fb.intent, fb.mode, fb.model, fb.reply[:120])
    if fb.kind == "report":
        log.warning("REPORTED REPLY (%s): %r", fb.reason or "no reason", fb.reply[:500])
    if not (SUPABASE_URL and SUPABASE_KEY):
        return {"stored": "log"}

    headers = {"apikey": SUPABASE_KEY, "Content-Type": "application/json", "Prefer": "return=minimal"}
    if not SUPABASE_KEY.startswith("sb_"):  # legacy JWT-style service_role key
        headers["Authorization"] = f"Bearer {SUPABASE_KEY}"
    try:
        r = await state["client"].post(f"{SUPABASE_URL}/rest/v1/feedback", headers=headers, json=row)
        if r.status_code == 400 and ("kind" in r.text or "reason" in r.text):
            # table created before reports existed: save without the new columns
            row = {k: v for k, v in row.items() if k not in ("kind", "reason")}
            r = await state["client"].post(f"{SUPABASE_URL}/rest/v1/feedback", headers=headers, json=row)
        if r.status_code >= 300:
            log.warning("Supabase insert failed %s: %s", r.status_code, r.text[:300])
            return {"stored": "log"}
    except httpx.HTTPError as exc:
        log.warning("Supabase unreachable: %s", exc)
        return {"stored": "log"}
    return {"stored": "database"}
