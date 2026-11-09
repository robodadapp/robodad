"""Stockfish on the server, for the two top chess tiers (Professor Dad and Robo-Grandpa).

Stockfish is GPL-licensed. It only runs here on the server and is never sent to a phone or
browser, so the app itself stays MIT. Set STOCKFISH_PATH, or install `stockfish` on the PATH.
"""

from __future__ import annotations

import logging
import os
import shutil
import threading

import chess
import chess.engine

log = logging.getLogger("robodad.chess")

STOCKFISH_PATH = (os.getenv("STOCKFISH_PATH", "").strip() or shutil.which("stockfish") or "")

# Professor Dad is held near 1800 Elo; Robo-Grandpa plays at full strength.
LEVELS = {
    "professor": {"limit": True, "elo": 1800, "seconds": 1.0},
    "grandpa": {"limit": False, "elo": None, "seconds": 2.0},
}

_lock = threading.Lock()          # one engine process, one search at a time
_engine: chess.engine.SimpleEngine | None = None


class EngineUnavailable(Exception):
    """Stockfish is not installed or has crashed."""


def _start() -> chess.engine.SimpleEngine:
    global _engine
    if _engine is None:
        if not STOCKFISH_PATH:
            raise EngineUnavailable("no stockfish binary")
        _engine = chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)
        _engine.configure({"Threads": 1, "Hash": 32})
    return _engine


def _stop() -> None:
    global _engine
    if _engine is not None:
        try:
            _engine.quit()
        except Exception:  # the process may already be gone
            pass
    _engine = None


def best_move(fen: str, level: str) -> str:
    """Return the engine's move in UCI form (e.g. "e2e4") for a position.

    Raises ValueError for a bad or finished position, and EngineUnavailable if Stockfish can't run.
    """
    cfg = LEVELS.get(level)
    if cfg is None:
        raise ValueError("unknown level")
    board = chess.Board(fen)                       # ValueError on a bad FEN
    if board.is_game_over(claim_draw=True):
        raise ValueError("game is over")
    with _lock:
        try:
            engine = _start()
            if cfg["limit"]:
                engine.configure({"UCI_LimitStrength": True, "UCI_Elo": cfg["elo"]})
            else:
                engine.configure({"UCI_LimitStrength": False})
            result = engine.play(board, chess.engine.Limit(time=cfg["seconds"]))
        except (chess.engine.EngineError, OSError) as exc:
            log.warning("stockfish failed: %s", exc)
            _stop()
            raise EngineUnavailable(str(exc)) from exc
    if result.move is None:
        raise EngineUnavailable("no move returned")
    return result.move.uci()
