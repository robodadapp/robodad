// Checks RoboDad's chess rules against published perft counts, plus game-end and engine sanity.
// Run: node scripts/test_chess_rules.js
"use strict";
const C = require("../static/chess-engine.js");

let failed = 0;
function check(name, ok, detail = "") {
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail ? "  " + detail : ""}`);
}

function perft(s, depth) {
  if (depth === 0) return 1;
  let n = 0;
  for (const m of C.legalMoves(s)) n += perft(C.applyMove(s, m), depth - 1);
  return n;
}

// Perft results from the Chess Programming Wiki (standard positions).
const POSITIONS = [
  { name: "start", fen: C.START, counts: [20, 400, 8902] },
  { name: "kiwipete", fen: "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1", counts: [48, 2039, 97862] },
  { name: "endgame (en passant, pins)", fen: "8/2p5/3p4/KP5r/1R3p1k/8/4P1P1/8 w - - 0 1", counts: [14, 191, 2812] },
  { name: "promotions", fen: "r3k2r/Pppp1ppp/1b3nbN/nP6/BBP1P3/q4N2/Pp1P2PP/R2Q1RK1 w kq - 0 1", counts: [6, 264, 9467] },
  { name: "castling and promotion mix", fen: "rnbq1k1r/pp1Pbppp/2p5/8/2B5/8/PPP1NnPP/RNBQK2R w KQ - 1 8", counts: [44, 1486, 62379] },
];

for (const p of POSITIONS) {
  const s = C.fromFEN(p.fen);
  p.counts.forEach((want, i) => {
    const got = perft(s, i + 1);
    check(`perft ${p.name} depth ${i + 1}`, got === want, `got ${got}, want ${want}`);
  });
}

// FEN round trip
for (const p of POSITIONS) {
  check(`FEN round trip: ${p.name}`, C.toFEN(C.fromFEN(p.fen)) === p.fen.split(" ").join(" ").replace(/ $/, ""));
}

// Game ends
const foolsMate = C.fromFEN("rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3");
const mate = C.status(foolsMate, []);
check("checkmate detected", mate.over && mate.reason === "checkmate" && mate.result === "0-1", JSON.stringify(mate));

const stalemate = C.fromFEN("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1");
const stale = C.status(stalemate, []);
check("stalemate detected", stale.over && stale.reason === "stalemate", JSON.stringify(stale));

const kings = C.fromFEN("8/8/8/4k3/8/8/8/4K3 w - - 0 1");
check("insufficient material (K v K)", C.status(kings, []).reason === "insufficient material");

const fifty = C.fromFEN("4k3/8/8/8/8/8/8/R3K3 w - - 100 80");
check("fifty-move rule", C.status(fifty, []).reason === "fifty-move rule");

// Threefold repetition: the same position three times.
const shuffle = C.fromFEN("4k3/8/8/8/8/8/8/4K2R w - - 0 1");
const key = C.toFEN(shuffle);
check("threefold repetition", C.status(shuffle, [key, key]).reason === "threefold repetition");

// Engine: find mate in one (Ra8#).
const mateIn1 = C.fromFEN("6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1");
const ranked = C.rankMoves(mateIn1, 2, {});
check("engine finds mate in one", C.uci(ranked[0].move) === "a1a8", `best ${C.uci(ranked[0].move)}`);

// Engine: never returns an illegal move, even at the weakest tier.
let illegal = 0;
for (let i = 0; i < 50; i++) {
  const s = C.fromFEN(C.START);
  const m = C.chooseMove(s, "modern");
  if (!C.legalMoves(s).some((x) => C.uci(x) === C.uci(m))) illegal++;
}
check("tier 1 never plays an illegal move", illegal === 0, `illegal ${illegal}`);

// Opening book: after 1.e4 the Skater Dad replies with a book move.
const afterE4 = C.applyMove(C.fromFEN(C.START), C.legalMoves(C.fromFEN(C.START)).find((m) => C.uci(m) === "e2e4"));
const reply = C.chooseMove(afterE4, "skater", { random: () => 0.99 });
check("skater book reply after 1.e4 is e7e5 or c7c6", ["e7e5", "c7c6"].includes(C.uci(reply)), C.uci(reply));

console.log(failed ? `\n${failed} failed` : "\nall chess rule checks passed");
process.exit(failed ? 1 : 0);
