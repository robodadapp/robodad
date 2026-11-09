/* RoboDad chess: rules and an offline engine. Pure JavaScript, no dependencies, MIT-licensed.
   The board is an array of 64 squares, a1 = 0, h8 = 63. Pieces are FEN letters ("" = empty).
   Works in the browser (window.RoboChess) and in Node (module.exports). */
(function (root) {
  "use strict";

  const FILES = "abcdefgh";
  const MATE = 100000;
  const KN = [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]];
  const KG = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  const ORTH = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

  const inb = (f, r) => f >= 0 && f < 8 && r >= 0 && r < 8;
  const colorOf = (p) => (p === "" ? null : p === p.toUpperCase() ? "w" : "b");
  const typeOf = (p) => p.toLowerCase();
  const sqName = (i) => FILES[i & 7] + ((i >> 3) + 1);
  const sqFromName = (s) => (s.charCodeAt(0) - 97) + (s.charCodeAt(1) - 49) * 8;

  // ---------- FEN ----------
  function fromFEN(fen) {
    const parts = String(fen).trim().split(/\s+/);
    const rows = parts[0].split("/");
    if (rows.length !== 8) throw new Error("bad FEN: board");
    const board = new Array(64).fill("");
    for (let r = 0; r < 8; r++) {
      let f = 0;
      for (const c of rows[r]) {
        if (/[1-8]/.test(c)) f += +c;
        else if (/[prnbqkPRNBQK]/.test(c)) { if (f > 7) throw new Error("bad FEN: row"); board[(7 - r) * 8 + f] = c; f++; }
        else throw new Error("bad FEN: char");
      }
      if (f !== 8) throw new Error("bad FEN: row length");
    }
    const c = parts[2] || "-";
    return {
      board,
      turn: parts[1] === "b" ? "b" : "w",
      castling: { K: c.includes("K"), Q: c.includes("Q"), k: c.includes("k"), q: c.includes("q") },
      ep: parts[3] && parts[3] !== "-" ? sqFromName(parts[3]) : -1,
      half: +(parts[4] || 0),
      full: +(parts[5] || 1),
    };
  }

  function toFEN(s) {
    const rows = [];
    for (let r = 7; r >= 0; r--) {
      let row = "", empty = 0;
      for (let f = 0; f < 8; f++) {
        const p = s.board[r * 8 + f];
        if (!p) empty++;
        else { if (empty) row += empty; empty = 0; row += p; }
      }
      if (empty) row += empty;
      rows.push(row);
    }
    const c = (s.castling.K ? "K" : "") + (s.castling.Q ? "Q" : "") + (s.castling.k ? "k" : "") + (s.castling.q ? "q" : "");
    return [rows.join("/"), s.turn, c || "-", s.ep >= 0 ? sqName(s.ep) : "-", s.half, s.full].join(" ");
  }

  const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

  // ---------- attacks ----------
  function attackedBy(board, idx, by) {
    const f = idx & 7, r = idx >> 3;
    const pr = by === "w" ? r - 1 : r + 1;           // a pawn attacks diagonally forward
    for (const df of [-1, 1]) {
      const pf = f + df;
      if (inb(pf, pr) && board[pr * 8 + pf] === (by === "w" ? "P" : "p")) return true;
    }
    const pick = (u) => (by === "w" ? u : u.toLowerCase());
    const N = pick("N"), K = pick("K"), B = pick("B"), R = pick("R"), Q = pick("Q");
    for (const [df, dr] of KN) { const nf = f + df, nr = r + dr; if (inb(nf, nr) && board[nr * 8 + nf] === N) return true; }
    for (const [df, dr] of KG) { const nf = f + df, nr = r + dr; if (inb(nf, nr) && board[nr * 8 + nf] === K) return true; }
    for (const [dirs, a, b] of [[DIAG, B, Q], [ORTH, R, Q]]) {
      for (const [df, dr] of dirs) {
        let nf = f + df, nr = r + dr;
        while (inb(nf, nr)) {
          const p = board[nr * 8 + nf];
          if (p) { if (p === a || p === b) return true; break; }
          nf += df; nr += dr;
        }
      }
    }
    return false;
  }

  function kingSquare(board, color) {
    return board.indexOf(color === "w" ? "K" : "k");
  }

  function inCheck(s, color) {
    const k = kingSquare(s.board, color);
    return k >= 0 && attackedBy(s.board, k, color === "w" ? "b" : "w");
  }

  // ---------- moves ----------
  // A move: {from, to, promo ("" or "q","r","b","n"), ep, castle}. Captures are read from the board.
  function pseudoMoves(s) {
    const out = [];
    const us = s.turn, them = us === "w" ? "b" : "w", B = s.board;
    const push = (from, to, extra) => out.push(Object.assign({ from, to, promo: "", ep: false, castle: false }, extra));
    for (let i = 0; i < 64; i++) {
      const p = B[i];
      if (!p || colorOf(p) !== us) continue;
      const t = typeOf(p), f = i & 7, r = i >> 3;
      if (t === "p") {
        const dir = us === "w" ? 1 : -1, startRank = us === "w" ? 1 : 6, lastRank = us === "w" ? 7 : 0;
        const nr = r + dir;
        if (!inb(f, nr)) continue;
        const one = nr * 8 + f;
        const addTo = (to, ep) => {
          if (nr === lastRank) for (const pr of ["q", "r", "b", "n"]) push(i, to, { promo: pr, ep });
          else push(i, to, { ep });
        };
        if (!B[one]) {
          addTo(one, false);
          if (r === startRank && !B[one + 8 * dir]) push(i, one + 8 * dir, {});
        }
        for (const df of [-1, 1]) {
          const cf = f + df;
          if (!inb(cf, nr)) continue;
          const to = nr * 8 + cf;
          if (B[to] && colorOf(B[to]) === them) addTo(to, false);
          else if (to === s.ep) push(i, to, { ep: true });
        }
      } else if (t === "n") {
        for (const [df, dr] of KN) {
          const nf = f + df, nr = r + dr;
          if (inb(nf, nr) && colorOf(B[nr * 8 + nf]) !== us) push(i, nr * 8 + nf, {});
        }
      } else if (t === "k") {
        for (const [df, dr] of KG) {
          const nf = f + df, nr = r + dr;
          if (inb(nf, nr) && colorOf(B[nr * 8 + nf]) !== us) push(i, nr * 8 + nf, {});
        }
        // castling: king on its home square, rook home, empty path, no square crossed while in check
        const home = us === "w" ? 4 : 60;
        if (i === home && !attackedBy(B, i, them)) {
          const rights = us === "w" ? [s.castling.K, s.castling.Q] : [s.castling.k, s.castling.q];
          const rook = us === "w" ? "R" : "r";
          if (rights[0] && B[home + 3] === rook && !B[home + 1] && !B[home + 2] &&
              !attackedBy(B, home + 1, them) && !attackedBy(B, home + 2, them)) push(i, home + 2, { castle: true });
          if (rights[1] && B[home - 4] === rook && !B[home - 1] && !B[home - 2] && !B[home - 3] &&
              !attackedBy(B, home - 1, them) && !attackedBy(B, home - 2, them)) push(i, home - 2, { castle: true });
        }
      } else {
        const dirs = t === "b" ? DIAG : t === "r" ? ORTH : DIAG.concat(ORTH);
        for (const [df, dr] of dirs) {
          let nf = f + df, nr = r + dr;
          while (inb(nf, nr)) {
            const to = nr * 8 + nf;
            if (!B[to]) push(i, to, {});
            else { if (colorOf(B[to]) !== us) push(i, to, {}); break; }
            nf += df; nr += dr;
          }
        }
      }
    }
    return out;
  }

  function applyMove(s, m) {
    const B = s.board.slice();
    const p = B[m.from], us = s.turn, t = typeOf(p);
    const captured = B[m.to] !== "" || m.ep;
    B[m.from] = "";
    if (m.ep) B[m.to + (us === "w" ? -8 : 8)] = "";
    B[m.to] = m.promo ? (us === "w" ? m.promo.toUpperCase() : m.promo) : p;
    if (m.castle) {
      if (m.to === 6) { B[7] = ""; B[5] = "R"; }
      else if (m.to === 2) { B[0] = ""; B[3] = "R"; }
      else if (m.to === 62) { B[63] = ""; B[61] = "r"; }
      else if (m.to === 58) { B[56] = ""; B[59] = "r"; }
    }
    const c = Object.assign({}, s.castling);
    if (t === "k") { if (us === "w") { c.K = c.Q = false; } else { c.k = c.q = false; } }
    if (m.from === 0 || m.to === 0) c.Q = false;
    if (m.from === 7 || m.to === 7) c.K = false;
    if (m.from === 56 || m.to === 56) c.q = false;
    if (m.from === 63 || m.to === 63) c.k = false;
    const ep = t === "p" && Math.abs(m.to - m.from) === 16 ? (m.from + m.to) / 2 : -1;
    return {
      board: B,
      turn: us === "w" ? "b" : "w",
      castling: c,
      ep,
      half: t === "p" || captured ? 0 : s.half + 1,
      full: us === "b" ? s.full + 1 : s.full,
    };
  }

  function legalMoves(s) {
    return pseudoMoves(s).filter((m) => !inCheck(applyMove(s, m), s.turn));
  }

  function insufficientMaterial(board) {
    const minors = [];
    for (const p of board) {
      if (!p || typeOf(p) === "k") continue;
      if (typeOf(p) === "n" || typeOf(p) === "b") minors.push(p);
      else return false;
    }
    return minors.length === 0 || (minors.length === 1);
  }

  // history: array of full FEN strings for earlier positions (used for threefold repetition)
  function status(s, history) {
    const check = inCheck(s, s.turn);
    if (legalMoves(s).length === 0) {
      return check
        ? { over: true, result: s.turn === "w" ? "0-1" : "1-0", reason: "checkmate", check }
        : { over: true, result: "1/2-1/2", reason: "stalemate", check };
    }
    if (s.half >= 100) return { over: true, result: "1/2-1/2", reason: "fifty-move rule", check };
    if (insufficientMaterial(s.board)) return { over: true, result: "1/2-1/2", reason: "insufficient material", check };
    const key = toFEN(s).split(" ").slice(0, 4).join(" ");
    if (history && history.filter((h) => h.split(" ").slice(0, 4).join(" ") === key).length >= 2) {
      return { over: true, result: "1/2-1/2", reason: "threefold repetition", check };
    }
    return { over: false, check };
  }

  function moveToSAN(s, m) {
    // Short algebraic notation for the move log (no disambiguation beyond what is needed).
    const p = s.board[m.from], t = typeOf(p);
    if (m.castle) return m.to === 6 || m.to === 62 ? "O-O" : "O-O-O";
    const capture = s.board[m.to] !== "" || m.ep;
    let text;
    if (t === "p") {
      text = (capture ? FILES[m.from & 7] + "x" : "") + sqName(m.to) + (m.promo ? "=" + m.promo.toUpperCase() : "");
    } else {
      const same = legalMoves(s).filter((o) => o.to === m.to && o.from !== m.from && s.board[o.from] === p);
      let dis = "";
      if (same.length) {
        dis = (same.some((o) => (o.from & 7) === (m.from & 7)) ? "" : FILES[m.from & 7]) +
              (same.some((o) => (o.from >> 3) === (m.from >> 3)) ? "" : String((m.from >> 3) + 1));
      }
      text = t.toUpperCase().replace("P", "") + dis + (capture ? "x" : "") + sqName(m.to);
    }
    const next = applyMove(s, m);
    if (inCheck(next, next.turn)) text += legalMoves(next).length ? "+" : "#";
    return text;
  }

  // ---------- evaluation ----------
  // Piece-square tables, written from White's side (index 0 = a8).
  const PST_P = [0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5,
    0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0];
  const PST_N = [-50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30,
    -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50];
  const PST_K = [-30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30, -30,-40,-40,-50,-50,-40,-40,-30,
    -30,-40,-40,-50,-50,-40,-40,-30, -20,-30,-30,-40,-40,-30,-30,-20, -10,-20,-20,-20,-20,-20,-20,-10, 20,20,0,0,0,0,20,20, 20,30,10,0,0,10,30,20];
  const PST = { p: PST_P, n: PST_N, k: PST_K };

  // Score from the side to move's point of view. Each style knob tilts the evaluation a little.
  function evaluate(s, style) {
    let score = 0;
    const files = { w: new Array(8).fill(0), b: new Array(8).fill(0) };
    for (let i = 0; i < 64; i++) {
      const p = s.board[i];
      if (!p) continue;
      const c = colorOf(p), t = typeOf(p), f = i & 7, r = i >> 3;
      const sign = c === "w" ? 1 : -1;
      const table = PST[t];
      let v = VAL[t];
      if (table) {
        const idx = c === "w" ? (7 - r) * 8 + f : r * 8 + f;
        v += table[idx] * (t === "k" && style.kingSafety ? 1 + style.kingSafety : 1);
      }
      if (t === "p") files[c][f]++;
      score += sign * v;
    }
    if (style.pawnStructure) {
      for (const c of ["w", "b"]) {
        let penalty = 0;
        const fl = files[c];
        for (let f = 0; f < 8; f++) {
          if (fl[f] > 1) penalty += 15 * (fl[f] - 1);
          if (fl[f] && !(fl[f - 1] || fl[f + 1])) penalty += 12;
        }
        score += (c === "w" ? -1 : 1) * penalty * style.pawnStructure;
      }
    }
    return s.turn === "w" ? score : -score;
  }

  // Bonuses that only depend on the move itself (checked once at the root).
  function rootBonus(s, m, style) {
    let bonus = 0;
    const child = applyMove(s, m);
    const captured = s.board[m.to] !== "" || m.ep;
    if (captured && style.captureBonus) bonus += style.captureBonus;
    if (style.checkBonus && inCheck(child, child.turn)) bonus += style.checkBonus;
    if (style.developBonus) {
      const t = typeOf(s.board[m.from]);
      const homeRank = s.turn === "w" ? 0 : 7;
      if ((t === "n" || t === "b") && (m.from >> 3) === homeRank) bonus += style.developBonus;
      if (t === "p" && (m.to & 7) >= 2 && (m.to & 7) <= 5 && (m.to >> 3) >= 2 && (m.to >> 3) <= 5) bonus += style.developBonus;
    }
    return bonus;
  }

  // ---------- search ----------
  function quiesce(s, alpha, beta, depth, style) {
    const stand = evaluate(s, style);
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    if (depth <= 0) return alpha;
    const caps = pseudoMoves(s).filter((m) => s.board[m.to] || m.ep);
    caps.sort((a, b) => (VAL[typeOf(s.board[b.to] || "p")] - VAL[typeOf(s.board[a.from])]));
    for (const m of caps) {
      const child = applyMove(s, m);
      if (inCheck(child, s.turn)) continue;
      const score = -quiesce(child, -beta, -alpha, depth - 1, style);
      if (score >= beta) return score;
      if (score > alpha) alpha = score;
    }
    return alpha;
  }

  function negamax(s, depth, alpha, beta, ply, style) {
    if (depth <= 0) return quiesce(s, alpha, beta, 3, style);
    const moves = legalMoves(s);
    if (moves.length === 0) return inCheck(s, s.turn) ? -MATE + ply : 0;
    if (s.half >= 100) return 0;
    moves.sort((a, b) => (s.board[b.to] ? VAL[typeOf(s.board[b.to])] : 0) - (s.board[a.to] ? VAL[typeOf(s.board[a.to])] : 0));
    let best = -Infinity;
    for (const m of moves) {
      const score = -negamax(applyMove(s, m), depth - 1, -beta, -alpha, ply + 1, style);
      if (score > best) best = score;
      if (best > alpha) alpha = best;
      if (alpha >= beta) break;
    }
    return best;
  }

  // Rank every legal move at the root. Returns [{move, score}] best first, ties shuffled.
  function rankMoves(s, depth, style) {
    const moves = legalMoves(s).sort(() => Math.random() - 0.5);
    const scored = moves.map((m) => {
      const child = applyMove(s, m);
      const score = -negamax(child, depth - 1, -MATE, MATE, 1, style) + rootBonus(s, m, style);
      return { move: m, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored;
  }

  // ---------- tiers (the avatars) ----------
  // depth: search depth. blunder: chance of a random legal move. topN: pick among the best N moves.
  // style: tilts for rootBonus/evaluate. book: opening replies to 1.e4 (UCI), picked at random.
  const TIERS = {
    modern:    { name: "Modern Dad",       tier: 1, depth: 1, blunder: 0.35, topN: 0, style: {}, book: [] },
    skater:    { name: "Skater Dad",       tier: 2, depth: 2, blunder: 0.15, topN: 0, style: { checkBonus: 40, captureBonus: 10 }, book: ["e7e5", "c7c6"] },
    eighties:  { name: "Arcade Dad",       tier: 2, depth: 2, blunder: 0.15, topN: 0, style: { developBonus: 12 }, book: ["c7c5"] },
    gamer:     { name: "Gamer Dad",        tier: 3, depth: 3, blunder: 0.05, topN: 0, style: { captureBonus: 25 }, book: ["e7e5"] },
    coach:     { name: "Coach Dad",        tier: 3, depth: 3, blunder: 0.05, topN: 0, style: { pawnStructure: 1, kingSafety: 0.5 }, book: ["e7e6", "c7c6"] },
    bookworm:  { name: "Bookworm Dad",     tier: 4, depth: 3, blunder: 0.03, topN: 0, style: { pawnStructure: 1.5 }, book: ["d7d5", "c7c5"] },
    labdad:    { name: "Lab Dad",          tier: 4, depth: 3, blunder: 0, topN: 3, style: {}, book: ["b7b6", "g8f6"] },
    professor: { name: "Professor Dad",    tier: 5, depth: 3, blunder: 0, topN: 0, style: { pawnStructure: 1 }, book: [], server: { elo: 1800 } },
    grandpa:   { name: "Robo-Grandpa",     tier: 6, depth: 3, blunder: 0, topN: 0, style: { pawnStructure: 1 }, book: [], server: { elo: null }, secret: true },
  };

  // Choose a reply for the given tier. Returns a move object or null (no legal moves).
  function chooseMove(s, tierKey, opts) {
    const cfg = TIERS[tierKey] || TIERS.modern;
    const moves = legalMoves(s);
    if (!moves.length) return null;
    const rnd = (opts && opts.random) || Math.random;
    // Opening book: only for the bot's reply to 1.e4 from the start.
    if (cfg.book.length && s.turn === "b" && toFEN(s).startsWith("rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b")) {
      const uci = cfg.book[Math.floor(rnd() * cfg.book.length)];
      const found = moves.find((m) => sqName(m.from) + sqName(m.to) + m.promo === uci);
      if (found) return found;
    }
    if (cfg.blunder && rnd() < cfg.blunder) return moves[Math.floor(rnd() * moves.length)];
    const ranked = rankMoves(s, cfg.depth, cfg.style);
    if (cfg.topN > 1) {
      const pool = ranked.slice(0, cfg.topN);
      const weights = pool.map((_, i) => 1 / (i + 1));
      let roll = rnd() * weights.reduce((a, b) => a + b, 0);
      for (let i = 0; i < pool.length; i++) { roll -= weights[i]; if (roll <= 0) return pool[i].move; }
      return pool[0].move;
    }
    return ranked[0].move;
  }

  // Moves in long algebra (e2e4) for the server and the UI.
  const uci = (m) => sqName(m.from) + sqName(m.to) + m.promo;

  const api = {
    START, FILES, MATE, VAL, TIERS,
    fromFEN, toFEN, sqName, sqFromName,
    attackedBy, inCheck, pseudoMoves, legalMoves, applyMove,
    status, moveToSAN, evaluate, rankMoves, chooseMove, uci,
  };
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.RoboChess = api;
})(typeof self !== "undefined" ? self : globalThis);
