// Measures the offline chess dads against Stockfish at fixed Elo levels.
// Each dad plays a few games as White and as Black against Stockfish set to UCI_Elo.
//
//   STOCKFISH_PATH=/usr/games/stockfish node scripts/calibrate_chess.js [games-per-color] [elo ...]
//
// Results are a rough guide: few games give a wide error bar. Rerun with more games before
// trusting a tier's target.
"use strict";
const { spawn } = require("child_process");
const C = require("../static/chess-engine.js");

const SF = process.env.STOCKFISH_PATH || "/usr/games/stockfish";
const perColor = +(process.argv[2] || 3);
const elos = process.argv.length > 3 ? process.argv.slice(3).map(Number) : [1320];
const MOVETIME = 60;     // ms per Stockfish move
const MAX_PLIES = 200;   // longer games are called drawn

function makeEngine(elo) {
  const sf = spawn(SF, [], { stdio: ["pipe", "pipe", "ignore"] });
  let buf = "";
  const waiters = [];
  sf.stdout.on("data", (d) => {
    buf += d.toString();
    let idx;
    while ((idx = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, idx).trim();
      buf = buf.slice(idx + 1);
      for (const w of waiters.slice()) if (w.test(line)) { waiters.splice(waiters.indexOf(w), 1); w.done(line); }
    }
  });
  const expect = (test) => new Promise((done) => waiters.push({ test, done }));
  const send = (cmd) => sf.stdin.write(cmd + "\n");
  return {
    async init() {
      send("uci"); await expect((l) => l === "uciok");
      send("setoption name Threads value 1");
      send("setoption name Hash value 16");
      send("setoption name UCI_LimitStrength value true");
      send(`setoption name UCI_Elo value ${elo}`);
      send("isready"); await expect((l) => l === "readyok");
    },
    async bestMove(fen) {
      send(`position fen ${fen}`);
      send(`go movetime ${MOVETIME}`);
      const line = await expect((l) => l.startsWith("bestmove"));
      return line.split(" ")[1];
    },
    quit() { send("quit"); },
  };
}

// The dad plays `who` ("w" or "b") against Stockfish. Returns 1, 0.5 or 0 for the dad.
async function playGame(dadKey, sf, dadIsWhite) {
  const dadColor = dadIsWhite ? "w" : "b";
  let s = C.fromFEN(C.START);
  const history = [C.toFEN(s)];
  for (let ply = 0; ply < MAX_PLIES; ply++) {
    const st = C.status(s, history.slice(0, -1));
    if (st.over) {
      if (st.result === "1/2-1/2") return 0.5;
      return st.result === (dadColor === "w" ? "1-0" : "0-1") ? 1 : 0;
    }
    let m;
    if (s.turn === dadColor) {
      m = C.chooseMove(s, dadKey);
    } else {
      const uci = await sf.bestMove(C.toFEN(s));
      m = C.legalMoves(s).find((x) => C.uci(x) === uci);
      if (!m) return 0.5;   // engine error: call it a draw rather than guess
    }
    s = C.applyMove(s, m);
    history.push(C.toFEN(s));
  }
  return 0.5;
}

(async () => {
  const dads = Object.keys(C.TIERS).filter((k) => !C.TIERS[k].server);
  // Design targets from the tier ladder (rough Elo for each dad).
  const TARGET = { modern: 600, skater: 900, eighties: 900, gamer: 1200, coach: 1200, bookworm: 1500, labdad: 1500 };
  console.log(`Stockfish: ${SF} · ${perColor} games per colour · ${MOVETIME} ms per Stockfish move`);
  for (const elo of elos) {
    const sf = makeEngine(elo);
    await sf.init();
    console.log(`\nvs Stockfish at ${elo} Elo`);
    for (const dad of dads) {
      let points = 0, games = 0;
      for (const white of [true, false]) {
        for (let g = 0; g < perColor; g++) {
          points += await playGame(dad, sf, white);
          games++;
        }
      }
      const score = points / games;
      const diff = score <= 0 ? -Infinity : score >= 1 ? Infinity : -400 * Math.log10(1 / score - 1);
      const shown = Number.isFinite(diff) ? Math.round(elo + diff) : (diff > 0 ? "above" : "below") + " " + elo;
      console.log(`  ${C.TIERS[dad].name.padEnd(16)} score ${points}/${games}  ≈ ${shown} Elo  (target ~${TARGET[dad]})`);
    }
    sf.quit();
  }
})().catch((e) => { console.error(e); process.exit(1); });
