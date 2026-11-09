/* RoboDad Tile Talk: a crossword tile game against the dads.
   Works in the browser (window.RoboTiles) and in Node (module.exports).

   Word lists (built by scripts/build_tiles_words.py, teen-safe filtered):
     tiles-words.txt   every playable word (from the public-domain ENABLE list)
     tiles-common.txt  everyday words; the lower dads only play these

   Board squares are numbered r * 15 + c. A tile is { r, c, ch, blank },
   ch a lowercase letter; a blank tile scores 0 whatever letter it stands for. */
(function () {
  "use strict";
  const N = 15, CENTER = 7;
  const A = 97; // "a"
  const ALL = (1 << 26) - 1;

  const VALUES = { a: 1, b: 3, c: 3, d: 2, e: 1, f: 4, g: 2, h: 4, i: 1, j: 8, k: 5, l: 1, m: 3,
    n: 1, o: 1, p: 3, q: 10, r: 1, s: 1, t: 1, u: 1, v: 4, w: 4, x: 8, y: 4, z: 10, "?": 0 };
  const COUNTS = { a: 9, b: 2, c: 2, d: 4, e: 12, f: 2, g: 3, h: 2, i: 9, j: 1, k: 1, l: 4, m: 2,
    n: 6, o: 8, p: 2, q: 1, r: 6, s: 4, t: 6, u: 4, v: 2, w: 2, x: 1, y: 2, z: 1, "?": 2 };
  const RACK = 7, FULL_HOUSE = 50;

  // RoboDad's own bonus-square layout, mirrored into all four corners.
  // dl/tl: double/triple the letter; dw/tw: double/triple the whole word.
  const PREMIUM = new Array(N * N).fill("");
  (function layout() {
    const q = {
      tw: [[0, 3], [3, 0]],
      dw: [[1, 1], [2, 6], [6, 2], [4, 4], [7, 7]],
      tl: [[1, 5], [5, 1], [5, 5], [3, 3]],
      dl: [[0, 0], [2, 3], [3, 2], [6, 6], [0, 7], [7, 0], [4, 7], [7, 4]],
    };
    for (const kind in q) for (const [r, c] of q[kind]) {
      for (const [rr, cc] of [[r, c], [r, N - 1 - c], [N - 1 - r, c], [N - 1 - r, N - 1 - c]]) PREMIUM[rr * N + cc] = kind;
    }
  })();
  const LETTER_MULT = { dl: 2, tl: 3 }, WORD_MULT = { dw: 2, tw: 3 };

  // ---------------------------------------------------------------- dictionary
  // A trie in flat typed arrays (about 4 MB for 168k words), built straight
  // from the sorted word list without making an object per node.
  function buildDict(text) {
    const words = text.split("\n").map((w) => w.trim()).filter(Boolean).sort();
    let nodes = 1, prev = "";
    for (const w of words) {
      let p = 0; while (p < w.length && p < prev.length && w[p] === prev[p]) p++;
      nodes += w.length - p; prev = w;
    }
    const letter = new Uint8Array(nodes), term = new Uint8Array(nodes);
    const first = new Int32Array(nodes).fill(-1), next = new Int32Array(nodes).fill(-1), last = new Int32Array(nodes).fill(-1);
    let count = 1; prev = "";
    const stack = [0];
    for (const w of words) {
      let p = 0; while (p < w.length && p < prev.length && w[p] === prev[p]) p++;
      if (p === w.length && p === prev.length) continue;          // duplicate
      stack.length = p + 1;
      for (let i = p; i < w.length; i++) {
        const parent = stack[i], n = count++;
        letter[n] = w.charCodeAt(i) - A;
        if (last[parent] < 0) first[parent] = n; else next[last[parent]] = n;
        last[parent] = n;
        stack.push(n);
      }
      term[stack[w.length]] = 1;
      prev = w;
    }
    function child(node, L) {
      for (let c = first[node]; c >= 0; c = next[c]) { if (letter[c] === L) return c; if (letter[c] > L) return -1; }
      return -1;
    }
    function walk(word, node = 0) {
      for (let i = 0; i < word.length && node >= 0; i++) node = child(node, word.charCodeAt(i) - A);
      return node;
    }
    return { letter, term, first, next, child, walk, size: words.length,
      has: (w) => { const n = walk(w); return n >= 0 && term[n] === 1; } };
  }

  // ---------------------------------------------------------------- game state
  function mulberry(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  function newGame(rnd = Math.random) {
    const bag = [];
    for (const ch in COUNTS) for (let i = 0; i < COUNTS[ch]; i++) bag.push(ch);
    for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]]; }
    const s = { board: new Array(N * N).fill(null), bag, racks: [[], []], scores: [0, 0], turn: 0, scoreless: 0, log: [], over: null };
    draw(s, 0); draw(s, 1);
    return s;
  }

  function draw(s, p) { while (s.racks[p].length < RACK && s.bag.length) s.racks[p].push(s.bag.pop()); }
  const at = (board, r, c) => (r < 0 || c < 0 || r >= N || c >= N) ? null : board[r * N + c];
  const isEmptyBoard = (board) => board.every((x) => !x);

  // ---------------------------------------------------------------- checking and scoring a play
  // Returns { ok, error, score, words: [{ word, score }], fullHouse }.
  function evaluatePlay(board, tiles, dict) {
    if (!tiles.length) return { ok: false, error: "Put some tiles on the board first." };
    const seen = new Set();
    for (const t of tiles) {
      if (t.r < 0 || t.c < 0 || t.r >= N || t.c >= N || board[t.r * N + t.c]) return { ok: false, error: "That square is taken." };
      const k = t.r * N + t.c; if (seen.has(k)) return { ok: false, error: "Two tiles on one square." }; seen.add(k);
    }
    const sameRow = tiles.every((t) => t.r === tiles[0].r), sameCol = tiles.every((t) => t.c === tiles[0].c);
    if (!sameRow && !sameCol) return { ok: false, error: "All your tiles need to be in one line, across or down." };
    const empty = isEmptyBoard(board);
    if (empty && !seen.has(CENTER * N + CENTER)) return { ok: false, error: "The first word has to cover the star in the middle." };
    if (empty && tiles.length < 2) return { ok: false, error: "The first word needs at least two letters." };

    const placed = new Map(tiles.map((t) => [t.r * N + t.c, t]));
    const get = (r, c) => { if (r < 0 || c < 0 || r >= N || c >= N) return null; return placed.get(r * N + c) || board[r * N + c]; };
    // Direction: across if every tile shares a row and (more than one tile, or it has an across neighbour).
    let across = sameRow && (tiles.length > 1 || !!get(tiles[0].r, tiles[0].c - 1) || !!get(tiles[0].r, tiles[0].c + 1));
    if (tiles.length === 1 && !across && !get(tiles[0].r - 1, tiles[0].c) && !get(tiles[0].r + 1, tiles[0].c)) {
      return { ok: false, error: "Your word has to join up with the tiles already on the board." };
    }
    const [dr, dc] = across ? [0, 1] : [1, 0];
    const line = tiles.map((t) => across ? t.c : t.r);
    const fixed = across ? tiles[0].r : tiles[0].c;
    const lo = Math.min(...line), hi = Math.max(...line);
    for (let x = lo; x <= hi; x++) {
      if (!(across ? get(fixed, x) : get(x, fixed))) return { ok: false, error: "No gaps: your letters have to make one unbroken word." };
    }

    function wordAt(r, c, dr, dc) {
      while (get(r - dr, c - dc)) { r -= dr; c -= dc; }
      let word = "", sum = 0, mult = 1, hasNew = false;
      while (get(r, c)) {
        const t = get(r, c), k = r * N + c, isNew = placed.has(k);
        let v = t.blank ? 0 : VALUES[t.ch];
        if (isNew) { hasNew = true; v *= LETTER_MULT[PREMIUM[k]] || 1; mult *= WORD_MULT[PREMIUM[k]] || 1; }
        word += t.ch; sum += v; r += dr; c += dc;
      }
      return { word, score: sum * mult, hasNew };
    }

    const words = [];
    const main = wordAt(tiles[0].r, tiles[0].c, dr, dc);
    if (main.word.length >= 2) words.push(main);
    for (const t of tiles) {
      const cross = wordAt(t.r, t.c, dc, dr);
      if (cross.word.length >= 2) words.push(cross);
    }
    if (!words.length) return { ok: false, error: "Make a word of at least two letters." };
    if (!empty) {
      const touches = words.some((w) => w.word.length > tiles.length) || tiles.some((t) =>
        [[-1, 0], [1, 0], [0, -1], [0, 1]].some(([a, b]) => at(board, t.r + a, t.c + b)));
      if (!touches) return { ok: false, error: "Your word has to join up with the tiles already on the board." };
    }
    const bad = words.filter((w) => !dict.has(w.word)).map((w) => w.word);
    const fullHouse = tiles.length === RACK;
    const score = words.reduce((a, w) => a + w.score, 0) + (fullHouse ? FULL_HOUSE : 0);
    if (bad.length) return { ok: false, error: "notword", bad, words: words.map(({ word, score }) => ({ word, score })), score };
    return { ok: true, score, words: words.map(({ word, score }) => ({ word, score })), fullHouse, main: main.word.length >= 2 ? main.word : words[0].word };
  }

  // ---------------------------------------------------------------- move generator
  // The classic anchor-and-cross-check search (Appel and Jacobson, 1988).
  // Returns every legal play for the rack as { tiles, score, words, main, fullHouse }.
  function generateMoves(board, rack, dict) {
    const counts = new Array(27).fill(0);
    for (const ch of rack) counts[ch === "?" ? 26 : ch.charCodeAt(0) - A]++;
    const { term, first, next, letter, child } = dict;
    const out = [], keys = new Set();
    const empty = isEmptyBoard(board);

    for (const across of [true, false]) {
      // sq(i, j): square at position j of line i, in this direction.
      const rc = across ? (i, j) => [i, j] : (i, j) => [j, i];
      const get = (i, j) => { if (i < 0 || j < 0 || i >= N || j >= N) return null; const [r, c] = rc(i, j); return board[r * N + c]; };
      for (let i = 0; i < N; i++) {
        // Cross-checks: which letters can go on each empty square, given the tiles above and below it.
        const cross = new Array(N).fill(ALL), anchor = new Array(N).fill(false);
        for (let j = 0; j < N; j++) {
          if (get(i, j)) continue;
          let before = "", after = "";
          for (let k = i - 1; get(k, j); k--) before = get(k, j).ch + before;
          for (let k = i + 1; get(k, j); k++) after += get(k, j).ch;
          if (before || after) {
            let mask = 0;
            const node = dict.walk(before);
            if (node >= 0) for (let c = first[node]; c >= 0; c = next[c]) {
              const n2 = after ? dict.walk(after, c) : c;
              if (n2 >= 0 && term[n2]) mask |= 1 << letter[c];
            }
            cross[j] = mask;
          }
          anchor[j] = empty ? (i === CENTER && j === CENTER) : !!(before || after || get(i, j - 1) || get(i, j + 1));
        }
        if (!anchor.some(Boolean)) continue;

        const record = (placed) => {
          const tiles = placed.map(([j, L, blank]) => { const [r, c] = rc(i, j); return { r, c, ch: String.fromCharCode(A + L), blank }; });
          const key = tiles.map((t) => `${t.r},${t.c},${t.ch}${t.blank ? "?" : ""}`).sort().join(";");
          if (keys.has(key)) return; keys.add(key);
          const ev = evaluatePlay(board, tiles, dict);
          if (ev.ok) out.push({ tiles, score: ev.score, words: ev.words, main: ev.main, fullHouse: ev.fullHouse });
        };

        const placed = [];
        const extendRight = (node, j, anchorJ) => {
          const t = get(i, j);
          if (t) { const c = child(node, t.ch.charCodeAt(0) - A); if (c >= 0) extendRight(c, j + 1, anchorJ); return; }
          if (term[node] && placed.length && j > anchorJ) record(placed);
          if (j >= N) return;
          const mask = cross[j];
          for (let c = first[node]; c >= 0; c = next[c]) {
            const L = letter[c];
            if (!(mask & (1 << L))) continue;
            if (counts[L] > 0) { counts[L]--; placed.push([j, L, false]); extendRight(c, j + 1, anchorJ); placed.pop(); counts[L]++; }
            if (counts[26] > 0) { counts[26]--; placed.push([j, L, true]); extendRight(c, j + 1, anchorJ); placed.pop(); counts[26]++; }
          }
        };

        for (let a = 0; a < N; a++) {
          if (!anchor[a]) continue;
          if (get(i, a - 1)) {
            // Tiles already sit to the left: they are the start of the word.
            let s = a - 1; while (get(i, s - 1)) s--;
            let node = 0;
            for (let j = s; j < a && node >= 0; j++) node = child(node, get(i, j).ch.charCodeAt(0) - A);
            if (node >= 0) extendRight(node, a, a);
            continue;
          }
          let limit = 0;
          for (let j = a - 1; j >= 0 && !get(i, j) && !anchor[j]; j--) limit++;
          const prefix = [];
          const leftPart = (node, room) => {
            // Lay the prefix on the squares just left of the anchor, then extend right.
            placed.length = 0;
            prefix.forEach(([L, blank], idx) => placed.push([a - prefix.length + idx, L, blank]));
            extendRight(node, a, a);
            if (room <= 0) return;
            for (let c = first[node]; c >= 0; c = next[c]) {
              const L = letter[c];
              if (counts[L] > 0) { counts[L]--; prefix.push([L, false]); leftPart(c, room - 1); prefix.pop(); counts[L]++; }
              if (counts[26] > 0) { counts[26]--; prefix.push([L, true]); leftPart(c, room - 1); prefix.pop(); counts[26]++; }
            }
          };
          leftPart(0, Math.min(limit, rack.length - 1));
          placed.length = 0;
        }
      }
    }
    return out;
  }

  // ---------------------------------------------------------------- the dads
  // How good the letters left on the rack are. Higher is better.
  function leaveValue(letters) {
    if (!letters.length) return 0;
    const cnt = {}; for (const ch of letters) cnt[ch] = (cnt[ch] || 0) + 1;
    let v = 0;
    v += (cnt["?"] || 0) * 9 + (cnt.s ? 3 : 0);
    for (const ch in cnt) if (ch !== "?" && cnt[ch] > 1) v -= 2.5 * (cnt[ch] - 1);
    if (cnt.q && !cnt.u) v -= 7;
    for (const ch of "jxzkvw") if (cnt[ch]) v -= 1;
    const vowels = letters.filter((ch) => "aeiou".includes(ch)).length;
    const real = letters.filter((ch) => ch !== "?").length;
    v -= 1.8 * Math.abs(vowels - Math.round(real * 0.4));
    return v;
  }

  // Each pair in a tier is the same strength, different style.
  // pool: which words he plays. pick: how often he settles for less than his best.
  const TIERS = {
    modern:    { name: "Modern Dad",    tier: 1, pool: "common", maxLen: 6,  topFrac: 0.6, leave: 0,   style: {} },
    skater:    { name: "Skater Dad",    tier: 2, pool: "common", maxLen: 8,  topFrac: 0.3, leave: 0,   style: { long: 2 } },
    eighties:  { name: "Arcade Dad",    tier: 2, pool: "common", maxLen: 8,  topFrac: 0.3, leave: 0,   style: { bonus: 4 } },
    gamer:     { name: "Gamer Dad",     tier: 3, pool: "all",    maxLen: 15, topN: 5,      leave: 0.3, style: { heavy: 1.5 } },
    coach:     { name: "Coach Dad",     tier: 3, pool: "all",    maxLen: 15, topN: 5,      leave: 0.8, style: {} },
    bookworm:  { name: "Bookworm Dad",  tier: 4, pool: "all",    maxLen: 15, topN: 2,      leave: 0.8, style: { long: 1.5 } },
    labdad:    { name: "Lab Dad",       tier: 4, pool: "all",    maxLen: 15, topN: 2,      leave: 0.8, style: { heavy: 1 } },
    professor: { name: "Professor Dad", tier: 5, pool: "all",    maxLen: 15, topN: 1,      leave: 1,   style: {} },
    grandpa:   { name: "Robo-Grandpa",  tier: 6, pool: "all",    maxLen: 15, topN: 1,      leave: 1.4, style: {}, smartSwap: true, secret: true },
  };

  function styleBonus(m, style) {
    let b = 0;
    if (style.long) b += style.long * Math.max(0, m.main.length - 4);
    if (style.bonus) b += style.bonus * m.tiles.filter((t) => PREMIUM[t.r * N + t.c]).length;
    if (style.heavy) b += style.heavy * m.tiles.filter((t) => !t.blank && VALUES[t.ch] >= 4).length;
    return b;
  }

  function leaveAfter(rack, tiles) {
    const left = rack.slice();
    for (const t of tiles) left.splice(left.indexOf(t.blank ? "?" : t.ch), 1);
    return left;
  }

  // What the dad does on his turn: { type: "play", move } | { type: "swap", letters } | { type: "pass" }.
  function chooseMove(state, tierKey, dict, common, rnd = Math.random) {
    const cfg = TIERS[tierKey] || TIERS.modern;
    const rack = state.racks[state.turn];
    let moves = generateMoves(state.board, rack, dict);
    if (cfg.pool === "common" && common) moves = moves.filter((m) => common.has(m.main) && m.main.length <= cfg.maxLen);
    const late = state.bag.length === 0;
    for (const m of moves) {
      m.value = m.score + styleBonus(m, cfg.style) + (late ? 0 : cfg.leave * leaveValue(leaveAfter(rack, m.tiles)));
    }
    moves.sort((a, b) => b.value - a.value);
    const canSwap = state.bag.length >= RACK;
    if (!moves.length) return canSwap ? { type: "swap", letters: swapPick(rack) } : { type: "pass" };
    if (cfg.smartSwap && canSwap && moves[0].score < 10 && leaveValue(rack) < -6) return { type: "swap", letters: swapPick(rack) };
    let pick;
    if (cfg.topFrac) {
      const pool = moves.slice(0, Math.max(1, Math.ceil(moves.length * cfg.topFrac)));
      pick = pool[Math.floor(rnd() * pool.length)];
    } else {
      const pool = moves.slice(0, cfg.topN || 1);
      pick = pool[Math.floor(rnd() * pool.length)];
    }
    return { type: "play", move: pick };
  }

  // Which tiles to throw back: duplicates, awkward letters, and too many vowels.
  function swapPick(rack) {
    const keep = [], out = [];
    const seen = {};
    for (const ch of rack) {
      seen[ch] = (seen[ch] || 0) + 1;
      const good = ch === "?" || (ch === "s" && seen[ch] === 1) || ("eaoirtnl".includes(ch) && seen[ch] === 1);
      (good ? keep : out).push(ch);
    }
    return out.length ? out : rack.slice();
  }

  // The best play for a rack, for the hint button. With the everyday list it
  // prefers a word a teen would know, and only falls back to rarer ones.
  function bestMove(board, rack, dict, common) {
    const moves = generateMoves(board, rack, dict);
    moves.sort((a, b) => b.score - a.score || a.tiles.length - b.tiles.length);
    if (common) { const known = moves.find((m) => m.words.every((w) => common.has(w.word))); if (known) return known; }
    return moves[0] || null;
  }

  // ---------------------------------------------------------------- applying turns
  function applyPlay(s, tiles, ev) {
    const p = s.turn, rack = s.racks[p];
    for (const t of tiles) {
      rack.splice(rack.indexOf(t.blank ? "?" : t.ch), 1);
      s.board[t.r * N + t.c] = { ch: t.ch, blank: !!t.blank, by: p };
    }
    s.scores[p] += ev.score;
    s.log.push({ p, type: "play", words: ev.words, main: ev.main, score: ev.score, fullHouse: !!ev.fullHouse, tiles: tiles.map((t) => t.r * N + t.c) });
    s.scoreless = 0;
    draw(s, p);
    if (!rack.length && !s.bag.length) return finish(s, p);
    s.turn = 1 - p;
    return null;
  }

  function applySwap(s, letters, rnd = Math.random) {
    const p = s.turn, rack = s.racks[p];
    if (s.bag.length < RACK || !letters.length) return false;
    for (const ch of letters) rack.splice(rack.indexOf(ch), 1);
    draw(s, p);
    s.bag.push(...letters);
    for (let i = s.bag.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [s.bag[i], s.bag[j]] = [s.bag[j], s.bag[i]]; }
    s.log.push({ p, type: "swap", count: letters.length, score: 0 });
    return endTurnScoreless(s);
  }

  function applyPass(s) {
    s.log.push({ p: s.turn, type: "pass", score: 0 });
    return endTurnScoreless(s);
  }

  function endTurnScoreless(s) {
    s.scoreless++;
    if (s.scoreless >= 6) return finish(s, -1);
    s.turn = 1 - s.turn;
    return null;
  }

  // Game over. Whoever went out gets the other player's leftover tiles; everyone loses their own.
  function finish(s, wentOut) {
    const left = s.racks.map((r) => r.reduce((a, ch) => a + VALUES[ch], 0));
    for (const p of [0, 1]) s.scores[p] -= left[p];
    if (wentOut >= 0) s.scores[wentOut] += left[1 - wentOut] + left[wentOut];
    const winner = s.scores[0] === s.scores[1] ? -1 : (s.scores[0] > s.scores[1] ? 0 : 1);
    s.over = { winner, wentOut, left };
    return s.over;
  }

  const api = { N, CENTER, VALUES, COUNTS, PREMIUM, TIERS, RACK, FULL_HOUSE,
    buildDict, newGame, evaluatePlay, generateMoves, chooseMove, bestMove, leaveValue,
    applyPlay, applySwap, applyPass, mulberry };
  if (typeof module === "object" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.RoboTiles = api;
})();
