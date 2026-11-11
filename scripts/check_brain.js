// Checks the brain teaser content: run with `node scripts/check_brain.js`.
// - every multiple-choice puzzle has exactly 4 different options, one right
// - every type-in puzzle accepts its own answer
// - every code lock has exactly one code that fits all its clues
// - every escape-room step points at a real puzzle
global.window = {};
require("../static/brainteasers.js");
const { puzzles: base, notebook = [], locks, hands, escape } = window.BRAINTEASERS;
const puzzles = [...base, ...notebook];
let bad = 0; const fail = (m) => { bad++; console.log("FAIL", m); };
const ids = new Set();
for (const p of puzzles) {
  if (ids.has(p.id)) fail(`${p.id} is used twice`); ids.add(p.id);
  if (!p.q || !p.why || !(p.hints || []).length) fail(`${p.id} is missing a question, hints or why`);
  if (p.kind === "type") {
    const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!(p.accept || []).some(a => norm(a) === norm(p.answer))) fail(`${p.id} doesn't accept its own answer`);
  } else {
    const opts = [p.ok, ...(p.no || [])];
    if (opts.length !== 4) fail(`${p.id} has ${opts.length} options, not 4`);
    if (new Set(opts).size !== opts.length) fail(`${p.id} repeats an option`);
  }
}
const all = [];
for (let a = 0; a < 10; a++) for (let b = 0; b < 10; b++) for (let c = 0; c < 10; c++) if (a !== b && b !== c && a !== c) all.push(`${a}${b}${c}`);
const score = (s, g) => { let A = 0, B = 0; [...g].forEach((d, i) => { if (s[i] === d) A++; else if (s.includes(d)) B++; }); return [A, B]; };
for (const L of locks) {
  const fits = all.filter(s => L.clues.every(([g, A, B]) => { const [x, y] = score(s, g); return x === A && y === B; }));
  if (fits.length !== 1 || fits[0] !== L.code) fail(`lock ${L.code} fits ${fits.join(", ") || "nothing"}`);
}
escape.rooms.forEach((r, i) => r.steps.forEach(x => {
  if (x.p && !ids.has(x.p)) fail(`room ${i + 1} uses missing puzzle ${x.p}`);
  if (x.hands && !hands[x.hands]) fail(`room ${i + 1} uses missing hands-on puzzle ${x.hands}`);
}));
if (escape.rooms.map(r => r.digit).join("") !== escape.code) fail("the escape code doesn't match the room digits");
console.log(bad ? `${bad} problem(s)` : `All good: ${puzzles.length} puzzles, ${locks.length} locks, ${escape.rooms.length} rooms.`);
process.exit(bad ? 1 : 0);
