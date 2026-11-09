// Head-to-head matches between chess players, to place a player that is below Stockfish's floor
// or to check a Stockfish-limited opponent against a measured dad.
//
// Players are written as:
//   tier:<key>        an offline dad from the tier table (e.g. tier:skater)
//   sf:<elo>          Stockfish with UCI_LimitStrength at that Elo (e.g. sf:1800)
//   sfms:<elo>:<ms>   same, with a fixed time per move (e.g. sfms:1800:1000)
//
//   STOCKFISH_PATH=/usr/games/stockfish node scripts/h2h_chess.js <A> <B> [games-per-colour]
//
// Prints A's score and the Elo gap B - A implied by that score. Use an anchor that's already
// measured (see calibrate_chess.js) to turn the gap into an absolute rating.
"use strict";
const { spawn } = require("child_process");
const C = require("../static/chess-engine.js");

const SF = process.env.STOCKFISH_PATH || "/usr/games/stockfish";
const MAX_PLIES = 200;
const DEFAULT_MS = 60;

function makeEngine(elo, ms) {
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
      if (elo) {
        send("setoption name UCI_LimitStrength value true");
        send(`setoption name UCI_Elo value ${elo}`);
      }
      send("isready"); await expect((l) => l === "readyok");
    },
    async bestMove(fen) {
      send(`position fen ${fen}`);
      send(`go movetime ${ms || DEFAULT_MS}`);
      const line = await expect((l) => l.startsWith("bestmove"));
      return line.split(" ")[1];
    },
    quit() { send("quit"); },
  };
}

// Build a player: { choose(state) -> move, close() }
async function makePlayer(spec) {
  const [kind, a, b] = spec.split(":");
  if (kind === "tier") {
    if (!C.TIERS[a] || C.TIERS[a].server) throw new Error(`${a} is not an offline dad`);
    return { choose: (s) => C.chooseMove(s, a), close() {} };
  }
  if (kind === "sf" || kind === "sfms") {
    const elo = a === "full" ? null : +a;
    const ms = kind === "sfms" ? +b : null;
    const eng = makeEngine(elo, ms);
    await eng.init();
    return {
      choose: async (s) => {
        const uci = await eng.bestMove(C.toFEN(s));
        return C.legalMoves(s).find((m) => C.uci(m) === uci) || null;
      },
      close() { eng.quit(); },
    };
  }
  throw new Error(`unknown player spec: ${spec}`);
}

// Returns A's points (1, 0.5, 0) for one game.
async function playGame(white, black, aIsWhite) {
  let s = C.fromFEN(C.START);
  const history = [C.toFEN(s)];
  for (let ply = 0; ply < MAX_PLIES; ply++) {
    const st = C.status(s, history.slice(0, -1));
    if (st.over) {
      if (st.result === "1/2-1/2") return 0.5;
      const whiteWon = st.result === "1-0";
      return whiteWon === aIsWhite ? 1 : 0;
    }
    const player = s.turn === "w" ? white : black;
    const m = await player.choose(s);
    if (!m) return 0.5;   // engine error: call it a draw rather than guess
    s = C.applyMove(s, m);
    history.push(C.toFEN(s));
  }
  return 0.5;
}

(async () => {
  const [specA, specB, perColorArg] = process.argv.slice(2);
  if (!specA || !specB) {
    console.error("usage: node scripts/h2h_chess.js <A> <B> [games-per-colour]");
    process.exit(2);
  }
  const perColor = +(perColorArg || 10);
  const A = await makePlayer(specA);
  const B = await makePlayer(specB);
  let points = 0, games = 0;
  for (const aWhite of [true, false]) {
    for (let g = 0; g < perColor; g++) {
      points += aWhite ? await playGame(A, B, true) : await playGame(B, A, false);
      games++;
    }
  }
  const score = points / games;
  // Elo gap B - A implied by A's score (standard logistic model):
  // A's expected score = 1 / (1 + 10^((B - A) / 400)), so B - A = 400 * log10(1/score - 1).
  const gap = score <= 0 ? Infinity : score >= 1 ? -Infinity : 400 * Math.log10(1 / score - 1);
  console.log(`${specA} vs ${specB}: ${specA} scored ${points}/${games}`);
  console.log(`implied Elo gap ${specB} - ${specA}: ${Number.isFinite(gap) ? Math.round(gap) : (gap > 0 ? "unbounded (A never scored)" : "unbounded (A always scored)")}`);
  console.log(`so ${specA} sits at (${specB} rating) - (gap) when ${specB} is anchored`);
  A.close(); B.close();
})().catch((e) => { console.error(e); process.exit(1); });
