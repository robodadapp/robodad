"""Checks the server chess endpoint: bad input, finished games, a missing engine, and a real move.

    python scripts/test_chess_api.py

The real-move check needs Stockfish (set STOCKFISH_PATH or put `stockfish` on PATH) and is skipped without it.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import chess  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app import chess_engine  # noqa: E402
from app.main import app  # noqa: E402

START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
FOOLS_MATE = "rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3"

failed = 0


def check(name, ok, detail=""):
    global failed
    if not ok:
        failed += 1
    print(f"{'ok  ' if ok else 'FAIL'} {name}{'  ' + detail if detail else ''}")


client = TestClient(app)


def move(fen, level):
    return client.post("/api/chess/move", json={"fen": fen, "level": level})


check("bad FEN is rejected", move("not a fen at all", "professor").status_code == 400)
check("finished game is rejected", move(FOOLS_MATE, "grandpa").status_code == 400)
check("unknown level is rejected", move(START, "wizard").status_code == 400)
check("oversized FEN is rejected by validation", move("x" * 500, "grandpa").status_code == 422)

# Missing engine: point at nothing and make sure no engine is cached from earlier tests.
saved = chess_engine.STOCKFISH_PATH
chess_engine.STOCKFISH_PATH = ""
chess_engine._stop()
r = move(START, "professor")
check("missing engine returns 503", r.status_code == 503, str(r.status_code))
chess_engine.STOCKFISH_PATH = saved

# Real engine move, if Stockfish is installed.
if chess_engine.STOCKFISH_PATH and os.path.exists(chess_engine.STOCKFISH_PATH):
    for level in ("professor", "grandpa"):
        r = move(START, level)
        ok = r.status_code == 200
        uci = r.json().get("move", "") if ok else ""
        legal = ok and chess.Move.from_uci(uci) in chess.Board(START).legal_moves
        check(f"{level} returns a legal move from the start", bool(legal), uci or str(r.status_code))
    chess_engine._stop()
else:
    print("skip real engine move (no Stockfish found)")

print("\nall chess API checks passed" if not failed else f"\n{failed} failed")
sys.exit(1 if failed else 0)
