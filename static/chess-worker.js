/* RoboDad chess: runs the offline engine off the main thread.
   Searching a few moves ahead can take a second or more on a phone. Done on the page itself that
   freezes everything (the thinking dots, the clocks, the music); done here the page stays smooth.
   Message in:  { id, fen, level, op }   op is "hint" to ask for the best move for the side to move
   (the Hint button), otherwise the dad `level` picks his reply.
   Message out: { id, move } where move is "e7e5" style or null, or { id, error }. */
"use strict";
importScripts("/static/chess-engine.js");

self.onmessage = (e) => {
  const { id, fen, level, op } = e.data || {};
  try {
    const C = self.RoboChess, s = C.fromFEN(fen);
    let m;
    if (op === "hint") { const best = C.rankMoves(s, 3, {})[0]; m = best && best.move; }
    else m = C.chooseMove(s, level);
    self.postMessage({ id, move: m ? C.uci(m) : null });
  } catch (err) {
    self.postMessage({ id, error: String((err && err.message) || err) });
  }
};
