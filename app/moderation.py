"""
Moderation of finished AI replies.

Every reply the AI writes is checked by a safety classifier (Llama Guard, through
any OpenAI-compatible API; Groq hosts it) after it has streamed. If the reply is
flagged, the server tells the page to swap it for a fixed RoboDad message before
it is saved, read aloud or rated. The page shows the swap straight away.

Settings (environment variables):
  MODERATION          on (default when a Groq key is set) | off
  MODERATION_MODEL    default meta-llama/llama-guard-4-12b
  MODERATION_API_KEY  default GROQ_API_KEY
  MODERATION_BASE_URL default https://api.groq.com/openai/v1

If the classifier can't be reached, the reply stays (the keyword, boundary and
persona rules still apply) and the failure is logged, so an outage never takes
RoboDad down.
"""

from __future__ import annotations

import logging
import os
import re
from dataclasses import dataclass

import httpx

log = logging.getLogger("robodad")

# Llama Guard categories (MLCommons hazard taxonomy) that are never OK in a reply to a teen.
# S6 (specialised advice), S8 (IP) and S13 (elections) are left to the persona: blocking them
# would catch ordinary "talk to a doctor" or homework answers.
BLOCK = {
    "S1": "violence", "S2": "crime", "S3": "sexual", "S4": "sexual", "S5": "defamation",
    "S7": "privacy", "S9": "weapons", "S10": "hate", "S11": "self_harm", "S12": "sexual",
}


@dataclass
class Moderator:
    model: str
    api_key: str
    base_url: str


def _clean(value: str | None) -> str:
    return re.sub(r"\s+", "", value or "")


def detect_moderator() -> Moderator | None:
    if os.getenv("MODERATION", "on").strip().lower() in ("off", "0", "false", "no"):
        return None
    key = _clean(os.getenv("MODERATION_API_KEY") or os.getenv("GROQ_API_KEY"))
    if not key:
        return None
    return Moderator(
        model=os.getenv("MODERATION_MODEL", "meta-llama/llama-guard-4-12b").strip(),
        api_key=key,
        base_url=os.getenv("MODERATION_BASE_URL", "https://api.groq.com/openai/v1").rstrip("/"),
    )


def parse_verdict(text: str) -> list[str]:
    """Llama Guard answers "safe", or "unsafe" and then a line like "S1,S10"."""
    t = (text or "").strip().lower()
    if not t.startswith("unsafe"):
        return []
    return sorted(set(re.findall(r"s\d{1,2}", t)), key=lambda c: int(c[1:]))


async def check_reply(mod: Moderator, client: httpx.AsyncClient, user_text: str, reply: str) -> str | None:
    """Return a category name ("sexual", "self_harm", …) if the reply must not be shown, else None."""
    if not reply.strip():
        return None
    try:
        r = await client.post(
            f"{mod.base_url}/chat/completions",
            headers={"Authorization": f"Bearer {mod.api_key}", "content-type": "application/json"},
            json={"model": mod.model, "temperature": 0, "max_tokens": 20,
                  "messages": [{"role": "user", "content": user_text[:2000]},
                               {"role": "assistant", "content": reply[:6000]}]},
            timeout=8.0,
        )
        if r.status_code != 200:
            log.warning("MODERATION unavailable (%s): %s", r.status_code, r.text[:200])
            return None
        verdict = (r.json().get("choices") or [{}])[0].get("message", {}).get("content", "")
    except (httpx.HTTPError, ValueError) as exc:
        log.warning("MODERATION unavailable: %s", type(exc).__name__)
        return None
    for code in parse_verdict(verdict):
        name = BLOCK.get(code.upper())
        if name:
            return name
    return None
