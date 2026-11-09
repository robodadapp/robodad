"""The Daily Board: one chess puzzle a day, tied to The Lost Cartridge hunt.

Five mate-in-one puzzles cycle by day. Solving one gives a letter; the five letters spell RETRO,
which opens the next hunt chapter early (see /api/code). Solutions are stored only as hashes of
"<index>:<move>", and a letter is only ever sent after a correct answer.
"""

from __future__ import annotations

import hashlib
from datetime import date

LETTERS = "RETRO"
SOLUTION_HASHES = [
    "cf8a403a4b3a1abe66b74b407a7fbe57aa31215324da4967a8f93312ca02e5ce",
    "9c13f004fa053aa3303d89243483ce995dd05671677231392462608030ab68ff",
    "a16d8bd018cfe4a34dd93d53f191d1ace9ca5d21bd2b83dce46ae83349b1ed6f",
    "930738af896ce9c5d25541a866ed963ecd418f713aa919fa423e3324323db9de",
    "4c4b237678372069ac8b6a69b660208040e6173b4249e560e770627920eb8f66",
]
FALLBACK_START = date(2026, 11, 9)


def today_index(today: date, arg_start: str) -> tuple[int, int]:
    """Return (day number, puzzle index) for a date. Day 0 is the hunt start, or a fixed date."""
    try:
        start = date.fromisoformat(arg_start)
    except ValueError:
        start = FALLBACK_START
    day = max(0, (today - start).days)
    return day, day % len(SOLUTION_HASHES)


def check(index: int, move: str) -> str | None:
    """The letter for a correct move on this puzzle, or None."""
    if not 0 <= index < len(SOLUTION_HASHES):
        return None
    digest = hashlib.sha256(f"{index}:{move.strip().lower()}".encode()).hexdigest()
    return LETTERS[index] if digest == SOLUTION_HASHES[index] else None
