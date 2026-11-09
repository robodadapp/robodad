// Checks Tile Talk: the word list filter, scoring, play rules, the move finder and whole games.
// Run: node scripts/test_tiles.js
"use strict";
const fs = require("fs");
const path = require("path");
const T = require("../static/tiles-engine.js");

let failed = 0;
function check(name, ok, detail = "") {
  if (!ok) failed++;
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail ? "  " + detail : ""}`);
}

const words = fs.readFileSync(path.join(__dirname, "../static/tiles-words.txt"), "utf8");
const commonText = fs.readFileSync(path.join(__dirname, "../static/tiles-common.txt"), "utf8");
let t0 = Date.now();
const dict = T.buildDict(words);
check("dictionary builds quickly", Date.now() - t0 < 3000, `${Date.now() - t0} ms, ${dict.size} words`);
const common = new Set(commonText.split("\n").filter(Boolean));

// Word list
for (const w of ["cat", "eloquent", "resilient", "xu", "jo", "quiz", "swank", "therapist", "analogy", "retardant", "cockpit", "assess"]) check(`playable: ${w}`, dict.has(w));
for (const w of ["fuck", "shit", "bitch", "slut", "whore", "rapist", "faggot", "nigger", "retard", "penis", "sexy", "porn", "cunt", "dick", "piss"]) check(`blocked: ${w}`, !dict.has(w));
check("not a word: qzx", !dict.has("qzx"));
check("prefix is not a word: eloqu", !dict.has("eloqu"));
check("common list only holds playable words", [...common].every((w) => dict.has(w)));

// Layout is symmetric and the star is a double word
check("centre is a double word", T.PREMIUM[T.CENTER * 15 + T.CENTER] === "dw");
let sym = true;
for (let r = 0; r < 15; r++) for (let c = 0; c < 15; c++) if (T.PREMIUM[r * 15 + c] !== T.PREMIUM[c * 15 + r] || T.PREMIUM[r * 15 + c] !== T.PREMIUM[(14 - r) * 15 + c]) sym = false;
check("bonus squares are symmetric", sym);
check("100 tiles in the bag", Object.values(T.COUNTS).reduce((a, b) => a + b, 0) === 100);

// Scoring and rules on an empty board
const empty = new Array(225).fill(null);
const row = (r, c, word, blanks = []) => [...word].map((ch, i) => ({ r, c: c + i, ch, blank: blanks.includes(i) }));
let ev = T.evaluatePlay(empty, row(7, 6, "cat"), dict);
check("CAT through the star scores (3+1+1)x2 = 10", ev.ok && ev.score === 10, JSON.stringify(ev));
ev = T.evaluatePlay(empty, row(7, 6, "cat", [0]), dict);
check("a blank C scores 0: (0+1+1)x2 = 4", ev.ok && ev.score === 4, JSON.stringify(ev));
check("first word must cover the star", !T.evaluatePlay(empty, row(0, 0, "cat"), dict).ok);
check("first word needs two letters", !T.evaluatePlay(empty, [{ r: 7, c: 7, ch: "a" }], dict).ok);
check("non-word is refused", T.evaluatePlay(empty, row(7, 6, "qzx"), dict).error === "notword");
check("diagonal is refused", !T.evaluatePlay(empty, [{ r: 7, c: 7, ch: "a" }, { r: 8, c: 8, ch: "t" }], dict).ok);
check("gap is refused", !T.evaluatePlay(empty, [{ r: 7, c: 6, ch: "a" }, { r: 7, c: 8, ch: "t" }], dict).ok);

// Plays that join existing tiles
const b = empty.slice();
for (const t of row(7, 6, "cat")) b[t.r * 15 + t.c] = { ch: t.ch, blank: false };
ev = T.evaluatePlay(b, [{ r: 7, c: 9, ch: "s" }], dict);
check("hooking S onto CAT makes CATS", ev.ok && ev.words[0].word === "cats" && ev.score === 6, JSON.stringify(ev));
ev = T.evaluatePlay(b, [{ r: 6, c: 8, ch: "a" }, { r: 8, c: 8, ch: "e" }], dict);
check("ATE down through the T", ev.ok && ev.words.some((w) => w.word === "ate"), JSON.stringify(ev));
check("a floating word is refused", !T.evaluatePlay(b, row(0, 0, "dog"), dict).ok);
ev = T.evaluatePlay(b, [{ r: 6, c: 7, ch: "t" }, { r: 6, c: 8, ch: "a" }], dict);
check("parallel play scores every cross word (TA, TA, AT)", ev.ok && ev.words.length === 3, JSON.stringify(ev));

// Seven tiles at once earns the Full House bonus
ev = T.evaluatePlay(empty, row(7, 1, "eloquent".slice(0, 7)), dict);
check("non-word seven is refused", !ev.ok);
ev = T.evaluatePlay(empty, row(7, 4, "rations"), dict);
check("Full House: seven tiles adds 50", ev.ok && ev.fullHouse && ev.score >= 50, JSON.stringify(ev));

// Move finder agrees with the rule checker
t0 = Date.now();
let moves = T.generateMoves(empty, ["c", "a", "t", "s", "e", "r", "?"], dict);
check("finds opening moves", moves.length > 100, `${moves.length} moves in ${Date.now() - t0} ms`);
check("every opening move covers the star", moves.every((m) => m.tiles.some((t) => t.r === 7 && t.c === 7)));
check("finds a seven-tile opener with this rack", moves.some((m) => m.fullHouse));
moves = T.generateMoves(b, ["s"], dict);
check("finds the CATS hook", moves.some((m) => m.words.some((w) => w.word === "cats")));
const all = T.generateMoves(b, ["e", "a", "r", "t", "h", "s", "o"], dict);
check("every generated move passes the rule checker", all.every((m) => T.evaluatePlay(b, m.tiles, dict).ok), `${all.length} moves`);

// Whole games between dads, start to finish
const rnd = T.mulberry(42);
const results = [];
let slowest = 0;
for (let g = 0; g < 6; g++) {
  const s = T.newGame(rnd);
  const tiers = [["gamer", "bookworm"], ["skater", "professor"], ["coach", "labdad"]][g % 3];
  let turns = 0, overlap = false;
  while (!s.over && turns < 200) {
    const t1 = Date.now();
    const mv = T.chooseMove(s, tiers[s.turn], dict, common, rnd);
    slowest = Math.max(slowest, Date.now() - t1);
    if (mv.type === "play") {
      const ev2 = T.evaluatePlay(s.board, mv.move.tiles, dict);
      if (!ev2.ok) { overlap = true; break; }
      T.applyPlay(s, mv.move.tiles, ev2);
    } else if (mv.type === "swap") T.applySwap(s, mv.letters, rnd);
    else T.applyPass(s);
    turns++;
  }
  const tiles = s.board.filter(Boolean).length + s.bag.length + s.racks[0].length + s.racks[1].length;
  check(`game ${g + 1} (${tiers.join(" v ")}) ends cleanly`, !!s.over && !overlap && tiles === 100,
    `${turns} turns, ${s.scores.join("-")}, tiles accounted ${tiles}`);
  results.push({ tiers, scores: s.scores });
}
check("a dad turn stays quick", slowest < 4000, `slowest ${slowest} ms`);
const lowWords = [];
{
  const s = T.newGame(T.mulberry(7));
  for (let i = 0; i < 12 && !s.over; i++) {
    const mv = T.chooseMove(s, "gamer", dict, common, Math.random);
    if (mv.type !== "play") { T.applyPass(s); continue; }
    lowWords.push(mv.move.main);
    T.applyPlay(s, mv.move.tiles, T.evaluatePlay(s.board, mv.move.tiles, dict));
  }
}
check("Gamer Dad only plays short everyday words", lowWords.every((w) => common.has(w) && w.length <= 5), lowWords.join(" "));
check("Bookworm Dad is the boss", Object.values(T.TIERS).every((t) => t.tier <= T.TIERS.bookworm.tier) && T.TIERS.bookworm.boss);
check("four Simile Squares", T.PREMIUM.filter((p) => p === "sim").length === 4);
{
  const b2 = empty.slice();
  for (const t of row(7, 5, "cat")) b2[t.r * 15 + t.c] = { ch: t.ch, blank: false };
  ev = T.evaluatePlay(b2, [{ r: 7, c: 4, ch: "s" }], dict);
  check("a Simile Square has no multiplier: S+CAT = SCAT scores 1+3+1+1 = 6", ev.ok && ev.score === 6, JSON.stringify(ev));
}

console.log(failed ? `\n${failed} failed` : "\nall passed");
process.exit(failed ? 1 : 0);
