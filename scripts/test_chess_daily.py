"""Checks the Daily Board: puzzle answers, the day cycle, the endpoints, and the RETRO early-unlock code.

    python scripts/test_chess_daily.py
"""
import os
import sys
from datetime import date

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import chess  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app import chess_daily, main  # noqa: E402

failed = 0


def check(name, ok, detail=""):
    global failed
    if not ok:
        failed += 1
    print(f"{'ok  ' if ok else 'FAIL'} {name}{'  ' + detail if detail else ''}")


FENS = [
    "6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1",
    "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
    "rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2",
    "6rk/6pp/8/6N1/8/8/8/7K w - - 0 1",
    "7k/8/6K1/8/8/8/8/R7 w - - 0 1",
]

# Each puzzle has exactly one mating move, and the stored hash accepts it and nothing else.
for i, fen in enumerate(FENS):
    b = chess.Board(fen)
    mates = []
    for m in b.legal_moves:
        b.push(m)
        if b.is_checkmate():
            mates.append(m.uci())
        b.pop()
    check(f"puzzle {i} has one mating move", len(mates) == 1, str(mates))
    if len(mates) == 1:
        check(f"puzzle {i} answer gives letter {chess_daily.LETTERS[i]}", chess_daily.check(i, mates[0]) == chess_daily.LETTERS[i])
        wrong = [m.uci() for m in chess.Board(fen).legal_moves if m.uci() != mates[0]][0]
        check(f"puzzle {i} rejects a wrong move", chess_daily.check(i, wrong) is None)
check("letters spell RETRO", chess_daily.LETTERS == "RETRO")
check("bad index rejected", chess_daily.check(9, "a1a8") is None)

# Day cycle
d0, i0 = chess_daily.today_index(date(2026, 11, 9), "2026-11-09")
d3, i3 = chess_daily.today_index(date(2026, 11, 12), "2026-11-09")
d5, i5 = chess_daily.today_index(date(2026, 11, 14), "2026-11-09")
check("day 0 is puzzle 0, day 3 is puzzle 3, day 5 wraps to 0", (i0, i3, i5) == (0, 3, 0), f"{i0},{i3},{i5}")
check("before the start date stays on puzzle 0", chess_daily.today_index(date(2026, 1, 1), "2026-11-09")[1] == 0)
check("a bad start date falls back", chess_daily.today_index(date(2026, 11, 9), "")[1] == 0)

# Endpoints, with the date pinned to puzzle 0 and then puzzle 1
client = TestClient(main.app)
main._toronto_today = lambda: date(2026, 11, 9)
main.ARG_START = "2026-11-09"
r = client.get("/api/chess/daily")
check("GET today gives puzzle 0", r.status_code == 200 and r.json() == {"day": 0, "index": 0}, r.text)
r = client.post("/api/chess/daily", json={"index": 0, "move": "a1a8"})
check("correct move returns letter R", r.status_code == 200 and r.json() == {"ok": True, "letter": "R"}, r.text)
r = client.post("/api/chess/daily", json={"index": 0, "move": "a1a7"})
check("wrong move returns ok false with no letter", r.json() == {"ok": False}, r.text)
r = client.post("/api/chess/daily", json={"index": 1, "move": "h5f7"})
check("another day's puzzle is refused", r.status_code == 400, str(r.status_code))
r = client.post("/api/chess/daily", json={"index": 0, "move": "zz"})
check("short move fails validation", r.status_code == 422)

# RETRO opens the next chapter early, never the finale, and never from nothing
def code(word, hunt):
    return client.post("/api/code", json={"code": word, "hunt": hunt})


for have, want in [(1, 2), (2, 3), (3, 4), (4, 5)]:
    r = code("RETRO", have)
    check(f"retro with chapter {have} opens {want} early", r.status_code == 200 and r.json() == {"kind": "hunt", "chapter": want}, r.text)
check("retro with no progress opens nothing", code("retro", 0).status_code == 404)
check("retro at chapter 5 does not skip to the finale", code("retro", 5).status_code == 404)
check("existing hunt code still waits on the calendar", code("joypad", 0).json().get("kind") == "hunt_wait")

print("\nall Daily Board checks passed" if not failed else f"\n{failed} failed")
sys.exit(1 if failed else 0)
