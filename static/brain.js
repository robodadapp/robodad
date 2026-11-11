/* Brain Teasers with Dad: the game.
   Puzzle content lives in brainteasers.js. This file draws the menus, runs the
   hands-on puzzles (Lights Out, Code Lock, River Run, Slide Tiles), keeps score
   (points, levels, streaks, today's puzzle) and runs Escape Dad's Garage.
   Progress is saved through the bridge index.html passes in (window.RD_BRAIN),
   so the learning badges unlock by themselves. */
(function(){
  const D = window.BRAINTEASERS || { puzzles:[], locks:[], hands:{}, escape:{ rooms:[] } };
  const P = D.puzzles, NB = D.notebook || [], BYID = Object.fromEntries([...P, ...NB].map(p => [p.id, p]));
  // Dev's Notebook opens with the LEVEL code from Otto's Log (the second rung of Otto mode)
  const notebookOpen = () => { try { return (parseInt(localStorage.getItem("robodad.otto") || "0", 10) || 0) >= 2; } catch { return false; } };
  const HKINDS = ["lights", "lock", "river", "tiles"];

  const LEVELS = [[0, "Curious Kid"], [100, "Clue Hunter"], [250, "Riddle Wrangler"], [500, "Logic Ninja"],
    [850, "Puzzle Boss"], [1300, "Big Brain"], [2000, "Professor Dad's Equal"]];
  const SAY = {
    hello: ["Ready to make your brain sweat?", "Puzzle time. I've been saving these.", "Let's see what that brain can do.", "Pick a game. I promise most of them are fair."],
    right: ["Nailed it!", "Big brain move.", "You got it! Up top. I'm a robot, so imagine the high five.", "Correct! Are you sure you're not part robot?", "Boom. Too easy for you.", "Yes! I'm telling everyone at work.", "That's my kid."],
    slow: ["Got there in the end. That counts!", "Yes! Stubborn brains win puzzles.", "There it is. Never give up, kiddo."],
    wrong: ["Ooh, close. Not quite.", "Nope. But that's how puzzles work. Try again.", "Not that one. Want a hint?", "Plot twist: that's not it.", "Hmm. Try looking at it another way."],
    hint: ["Here's a nudge.", "Okay, one hint. Maybe two.", "Dad hint incoming."],
    reveal: ["No worries. Here's how it works.", "Even Professor Dad gets stuck. Here's the trick."],
    hands: ["Look at you go!", "Solved it with your own two hands.", "Cleaner than my workbench. Nice."],
  };
  const STREAK_SAY = { 3: "Three in a row! You're on fire.", 5: "FIVE in a row! Somebody stop this kid.", 10: "TEN in a row?! I need harder puzzles.", 20: "Twenty. In. A. Row. I'm calling the newspapers." };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const today = () => new Date().toLocaleDateString("en-CA");
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");

  // ---------- tiny DOM helper ----------
  function h(tag, attrs, ...kids){
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "on") Object.entries(v).forEach(([ev, fn]) => el.addEventListener(ev, fn));
      else if (k === "html") el.innerHTML = v;
      else el.setAttribute(k, v === true ? "" : v);
    }
    kids.flat().forEach(c => c != null && c !== false && el.append(c.nodeType ? c : String(c)));
    return el;
  }
  const btn = (text, cls, fn, attrs) => h("button", { type:"button", class:cls, on:{ click:fn }, ...(attrs || {}) }, text);
  const dadSVG = (av) => h("span", { class:"bz-av", html:`<svg viewBox="0 0 64 64" aria-hidden="true"><use href="#av-${av || "labdad"}"/></svg>` });

  // ---------- state ----------
  let bridge = null, root = null, view = null, ctx = null, sayText = "", lastRun = null, runCount = 0, lastLock = null;
  const S = () => {
    const s = bridge ? bridge.state() : (S.mem ||= {});
    s.done ||= []; s.xp ||= 0; s.streak ||= 0; s.best ||= 0; s.handsDone ||= []; s.rooms ||= {}; s.dailies ||= 0;
    return s;
  };
  const save = () => { if (bridge) bridge.save(); };
  const level = (xp) => { let i = 0; LEVELS.forEach(([n], k) => { if (xp >= n) i = k; }); return i; };

  function award(points, opts = {}){
    const s = S(), before = level(s.xp);
    s.xp += points;
    if (opts.keepStreak) { s.streak++; s.best = Math.max(s.best, s.streak); } else s.streak = 0;
    if (opts.id && !s.done.includes(opts.id)) s.done.push(opts.id);
    syncNbGoal(s);
    if (opts.hands && !s.handsDone.includes(opts.hands)) s.handsDone.push(opts.hands);
    const lines = [];
    if (opts.keepStreak && STREAK_SAY[s.streak]) lines.push(STREAK_SAY[s.streak]);
    const after = level(s.xp);
    if (after > before) lines.push(`LEVEL UP! You're now a ${LEVELS[after][1]}.`);
    save(); pop(points);
    return lines.join(" ");
  }
  function pop(points){
    if (!points || !root) return;
    const el = h("div", { class:"bz-pop", "aria-hidden":"true" }, "+" + points);
    root.append(el); setTimeout(() => el.remove(), 1200);
  }

  // ---------- shared chrome ----------
  function topBar(label, back){
    const s = S(), lv = level(s.xp), next = LEVELS[lv + 1];
    const pct = next ? Math.round(100 * (s.xp - LEVELS[lv][0]) / (next[0] - LEVELS[lv][0])) : 100;
    return h("div", { class:"bz-top" },
      back ? btn("← " + (back.label || "Menu"), "ghost bz-back", back.fn) : h("span"),
      h("span", { class:"bz-label" }, label || ""),
      h("span", { class:"bz-stats" },
        h("span", { title:"Puzzle streak", "aria-label":`Streak ${s.streak}` }, "🔥 " + s.streak),
        h("span", { title:"Points", "aria-label":`${s.xp} points` }, "⭐ " + s.xp)),
      h("div", { class:"bz-level" },
        h("span", {}, LEVELS[lv][1]),
        h("span", { class:"bz-bar", role:"progressbar", "aria-valuemin":"0", "aria-valuemax":"100", "aria-valuenow":String(pct), "aria-label":"Progress to next level" },
          h("i", { style:`width:${pct}%` })),
        h("small", {}, next ? `${next[0] - s.xp} to ${next[1]}` : "Top level!")));
  }
  const bubble = (text, av) => h("div", { class:"bz-dad" }, dadSVG(av), h("p", { class:"bz-say", role:"status" }, text));
  function paint(...nodes){ root.replaceChildren(...nodes); }
  function focusFirst(sel){ (root.querySelector(sel || ".bz-focus") || root.querySelector("button"))?.focus(); }

  // ---------- hub ----------
  function dailyPuzzle(){
    const d = today(); let x = 0; for (const c of d) x = (x * 31 + c.charCodeAt(0)) >>> 0;
    return P[x % P.length];
  }
  function hub(say){
    view = "hub"; ctx = null;
    const s = S(), dailyDone = s.daily === today(), E = D.escape;
    const roomsDone = E.rooms.filter((_, i) => (s.rooms[i] || 0) >= 3).length;
    const mk = (icon, title, sub, fn, cls) => { const b = btn("", "bz-tile" + (cls ? " " + cls : ""), fn);
      b.append(h("span", { class:"bz-ic", "aria-hidden":"true" }, icon), h("b", {}, title), h("small", {}, sub)); return b; };
    paint(
      topBar("Brain Teasers"),
      bubble(say || sayText || pick(SAY.hello)),
      h("div", { class:"bz-tiles" },
        mk("⚡", "Puzzle Run", "Riddles, logic and hands-on puzzles. Keep your streak alive.", () => startRun(), "bz-focus"),
        mk(dailyDone ? "✅" : "📅", "Today's puzzle", dailyDone ? "Done! A new one tomorrow." : "Double points, once a day.", () => dailyDone ? hub("You already cracked today's puzzle. Come back tomorrow for a new one!") : startPuzzle(dailyPuzzle(), { mode:"daily" })),
        mk("🧩", "Hands-on", "Lights Out, Code Lock, River Run and Slide Tiles.", handsMenu),
        notebookOpen() ? mk("📓", "Dev's Notebook", `${NB.filter(p => s.done.includes(p.id)).length} of ${NB.length} puzzles solved.`, notebookMenu) : null,
        mk("🚪", E.title, s.escaped ? "Escaped! Play it again any time." : `${roomsDone} of ${E.rooms.length} rooms cracked.`, escapeMenu)),
      h("p", { class:"bz-foot" }, `Solved ${P.filter(p => s.done.includes(p.id)).length} of ${P.length} puzzles · Best streak ${s.best}`));
    sayText = ""; focusFirst();
  }

  // the READY door's second play goal: ten Dev's Notebook pages solved
  function syncNbGoal(s){ try { if (NB.filter(p => (s || S()).done.includes(p.id)).length >= 10) localStorage.setItem("robodad.otto.goal.nb", "1"); } catch {} }

  // ---------- Dev's Notebook ----------
  function notebookMenu(say){
    view = "notebook"; ctx = null;
    const s = S(), n = NB.filter(p => s.done.includes(p.id)).length;
    paint(topBar("Dev's Notebook", { fn: () => hub() }),
      bubble((typeof say === "string" && say) || (n >= NB.length ? "Every page solved. Dev would be so proud." : "Dev's notebook, page by page. Palindromes and word flips. Pick a page.")),
      h("div", { class:"bz-tiles" }, NB.map((p, i) => {
        const done = s.done.includes(p.id);
        const b = btn("", "bz-tile" + (i ? "" : " bz-focus"), () => startPuzzle(p, { mode:"notebook" }));
        b.append(h("span", { class:"bz-ic", "aria-hidden":"true" }, done ? "✅" : "📄"), h("b", {}, `Page ${i + 1}`), h("small", {}, done ? "Solved" : p.type === "number" ? "Number page" : "Word page"));
        return b; })),
      h("p", { class:"bz-foot" }, `${n} of ${NB.length} pages solved`));
    focusFirst();
  }

  // ---------- Puzzle Run ----------
  function startRun(){
    runCount++;
    if (runCount % 4 === 0) { const k = pick(HKINDS); return startHands(k, { mode:"run" }); }
    const s = S(), fresh = P.filter(p => !s.done.includes(p.id) && p !== lastRun);
    const p = pick(fresh.length ? fresh : P.filter(p => p !== lastRun));
    lastRun = p; startPuzzle(p, { mode:"run" });
  }

  // ---------- multiple choice and type-in puzzles ----------
  function startPuzzle(p, c){
    view = "puzzle";
    ctx = { ...c, p, hints:0, wrong:0, done:false, msg:"", say:"", t0:Date.now(), options: p.kind === "type" ? null : shuffle([p.ok, ...p.no]) };
    ctx.say = c.mode === "notebook" ? "A page from Dev's notebook." : c.mode === "daily" ? "Today's puzzle! Double points if you crack it." : c.mode === "escape" ? "This one's guarding the next clue." : pick(["Here's one for you.", "Try this one.", "Ooh, I like this one."]);
    renderPuzzle(); focusFirst(".bz-opt, .bz-input");
  }
  const backFor = () => ctx && ctx.mode === "escape" ? { label:"Room", fn: () => roomView(ctx.room) } : ctx && ctx.mode === "notebook" ? { label:"Notebook", fn: () => notebookMenu() } : { fn: () => hub() };
  // Sends the question (never the answer) to a friend as a picture. Not offered in the escape room, where puzzles guard clues.
  const challengeBtn = (p) => bridge?.share && ctx.mode !== "escape" ? btn("Challenge a friend", "ghost", () => bridge.share(p.q)) : null;
  function renderPuzzle(){
    const c = ctx, p = c.p;
    const nodes = [topBar(c.mode === "daily" ? "Today's puzzle" : c.mode === "escape" ? D.escape.rooms[c.room].name : c.mode === "notebook" ? "Dev's Notebook" : "Puzzle Run", backFor()), bubble(c.say)];
    nodes.push(h("p", { class:"bz-q" }, p.q));
    p.hints.slice(0, c.hints).forEach((t, i) => nodes.push(h("p", { class:"bz-hint" }, `Hint ${i + 1}: ${t}`)));
    if (c.msg) nodes.push(h("p", { class:"bz-msg" + (c.done ? " ok" : "") }, c.msg));
    if (!c.done) {
      if (p.kind === "type") {
        const inp = h("input", { class:"bz-input", type:"text", autocomplete:"off", autocapitalize:"off", spellcheck:"false", "aria-label":"Your answer", placeholder:"Type your answer" });
        const go = () => { if (inp.value.trim()) answer(inp.value); };
        inp.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
        nodes.push(h("div", { class:"bz-row" }, inp, btn("Check", "primary", go)));
      } else {
        nodes.push(h("div", { class:"bz-opts" }, c.options.map(o => btn(o, "bz-opt" + (c.tried?.includes(o) ? " no" : ""), () => answer(o), { disabled: c.tried?.includes(o) }))));
      }
      const left = p.hints.length - c.hints;
      nodes.push(h("div", { class:"bz-row" },
        left > 0 ? btn(`💡 Hint (${left} left)`, "ghost", () => { c.hints++; c.say = pick(SAY.hint); c.msg = ""; renderPuzzle(); }) : null,
        btn("Ask Dad", "ghost", () => bridge?.coach(p.id)),
        challengeBtn(p),
        btn("Show the answer", "ghost", () => {
          c.done = true; const s = S(); s.streak = 0; if (c.mode === "daily") s.daily = today(); save();
          c.say = pick(SAY.reveal); c.msg = `The answer is ${p.kind === "type" ? p.answer : p.ok}. ${p.why}`;
          if (c.mode === "escape") c.say += " That still counts for the room.";
          renderPuzzle();
        })));
    } else {
      nodes.push(h("div", { class:"bz-row" }, c.mode === "escape" ? btn("Back to the room →", "primary bz-focus", () => escapeStepDone())
        : c.mode === "daily" ? btn("Back to the menu", "primary bz-focus", () => hub())
        : c.mode === "notebook" ? btn("Back to the notebook →", "primary bz-focus", () => notebookMenu())
        : btn("Next puzzle →", "primary bz-focus", startRun)));
      if (c.mode === "run") nodes[nodes.length - 1].append(btn("Menu", "ghost", () => hub()));
      const ch = challengeBtn(p); if (ch) nodes[nodes.length - 1].append(ch);
    }
    paint(...nodes);
  }
  function answer(val){
    const c = ctx, p = c.p;
    const right = p.kind === "type" ? (p.accept || [p.answer]).some(a => norm(a) === norm(val)) : val === p.ok;
    if (!right) {
      c.wrong++; S().streak = 0; save();
      if (p.kind !== "type") (c.tried ||= []).push(val);
      c.say = pick(SAY.wrong); c.msg = p.kind === "type" ? `"${val}" isn't it. Try again, or take a hint.` : "";
      renderPuzzle(); focusFirst(".bz-opt:not([disabled]), .bz-input"); return;
    }
    let pts = Math.max(10, 30 - 10 * c.hints);
    if (c.wrong) pts = Math.max(5, Math.round(pts / 2));
    const fast = !c.wrong && !c.hints && Date.now() - c.t0 < 30000;
    if (fast) pts += 10;
    if (c.mode === "daily") { pts *= 2; const s = S(); if (s.daily !== today()) { s.daily = today(); s.dailies++; } }
    const extra = award(pts, { id:p.id, keepStreak: !c.wrong });
    c.done = true;
    c.say = [pick(c.wrong || c.hints > 1 ? SAY.slow : SAY.right), fast ? "Speed bonus!" : "", extra].filter(Boolean).join(" ");
    c.msg = p.why;
    renderPuzzle(); focusFirst(".bz-focus");
  }

  // ---------- hands-on ----------
  function handsMenu(){
    view = "handsMenu"; ctx = null;
    const s = S();
    paint(topBar("Hands-on", { fn: () => hub() }),
      bubble("No multiple choice here. Just you, your fingers and your brain."),
      h("div", { class:"bz-tiles" }, HKINDS.map((k, i) => { const H = D.hands[k];
        const b = btn("", "bz-tile" + (i ? "" : " bz-focus"), () => startHands(k, { mode:"hands" }));
        b.append(h("span", { class:"bz-ic", "aria-hidden":"true" }, { lights:"💡", lock:"🔐", river:"🛶", tiles:"🔢" }[k]), h("b", {}, H.name + (s.handsDone.includes(k) ? " ✓" : "")), h("small", {}, H.blurb));
        return b; })));
    focusFirst();
  }
  function startHands(kind, c){
    view = "hands";
    ctx = { ...c, kind, won:false, say: D.hands[kind].blurb, moves:0 };
    ({ lights:initLights, lock:initLock, river:initRiver, tiles:initTiles })[kind]();
    renderHands(); focusFirst(".bz-cell, .bz-dial button, .bz-item");
  }
  function handsWon(base, line){
    const c = ctx; c.won = true;
    const extra = award(base, { hands:c.kind, keepStreak:true });
    c.say = [line || pick(SAY.hands), extra].filter(Boolean).join(" ");
    renderHands(); focusFirst(".bz-focus");
  }
  function renderHands(){
    const c = ctx, H = D.hands[c.kind];
    const label = c.mode === "escape" ? D.escape.rooms[c.room].name : H.name;
    const nodes = [topBar(label, c.mode === "hands" ? { label:"Hands-on", fn: handsMenu } : backFor()), bubble(c.say, "gamer")];
    nodes.push(({ lights:drawLights, lock:drawLock, river:drawRiver, tiles:drawTiles })[c.kind]());
    const row = h("div", { class:"bz-row" });
    if (c.won) {
      row.append(c.mode === "escape" ? btn("Back to the room →", "primary bz-focus", () => escapeStepDone())
        : c.mode === "run" ? btn("Next puzzle →", "primary bz-focus", startRun)
        : btn("Play another", "primary bz-focus", () => startHands(c.kind, { mode:"hands" })));
      if (c.mode !== "escape") row.append(btn("Menu", "ghost", () => hub()));
    } else {
      row.append(btn(c.kind === "river" ? "Start over" : "New puzzle", "ghost", () => startHands(c.kind, { mode:c.mode, room:c.room, step:c.step })),
        btn("Ask Dad", "ghost", () => bridge?.coach("hands-" + c.kind)));
    }
    nodes.push(row); paint(...nodes);
  }

  // Lights Out: built by pressing random lights from all-off, so it can always be solved
  function initLights(){
    const s = S(), n = ctx.mode === "escape" || !s.handsDone.includes("lights") ? 3 : 4;
    const press = (g, i) => { const r = Math.floor(i / n), q = i % n;
      [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dq]) => { const rr = r + dr, qq = q + dq; if (rr >= 0 && rr < n && qq >= 0 && qq < n) g[rr * n + qq] = !g[rr * n + qq]; }); };
    let g, k = n === 3 ? 4 : 6;
    do { g = Array(n * n).fill(false); shuffle([...Array(n * n).keys()]).slice(0, k).forEach(i => press(g, i)); } while (!g.some(Boolean));
    Object.assign(ctx, { n, grid:g, par:k, press });
  }
  function drawLights(){
    const c = ctx, lit = c.grid.filter(Boolean).length;
    return h("div", { class:"bz-board" },
      h("div", { class:"bz-grid", style:`grid-template-columns:repeat(${c.n}, 1fr)` }, c.grid.map((on, i) =>
        btn("", "bz-cell" + (on ? " on" : ""), () => { if (c.won) return; c.press(c.grid, i); c.moves++;
          if (!c.grid.some(Boolean)) handsWon(c.moves <= c.par ? 50 : 40, c.moves <= c.par ? `Lights out in ${c.moves} taps. That's par or better!` : `All off in ${c.moves} taps!`); else renderHands(); },
          { "aria-label":`Light ${Math.floor(i / c.n) + 1}-${i % c.n + 1}, ${on ? "on" : "off"}`, "aria-pressed":String(on), disabled:c.won }))),
      h("p", { class:"bz-meta" }, `${lit} on · ${c.moves} taps · par ${c.par}`));
  }

  // Code Lock: hand-checked clue sets (brainteasers.js); wrong guesses become new clues
  function initLock(){
    const L = D.locks;
    const lock = pick(L.length > 1 ? L.filter(x => x.code !== lastLock) : L);
    lastLock = lock.code;
    Object.assign(ctx, { lock, dial:[0, 0, 0], tries:[] });
  }
  const clueText = (A, B) => A + B === 0 ? "Nothing is right" :
    [A ? `${A === 1 ? "One digit is" : A === 2 ? "Two digits are" : "All three are"} right and in the right place` : "",
     B ? `${B === 1 ? "one digit is" : B === 2 ? "two digits are" : "all three are"} right but in the wrong place` : ""].filter(Boolean).join(", and ").replace(/^./, m => m.toUpperCase());
  function score(code, guess){ let A = 0, B = 0; [...guess].forEach((d, i) => { if (code[i] === d) A++; else if (code.includes(d)) B++; }); return [A, B]; }
  function drawLock(){
    const c = ctx;
    const clue = ([g, A, B], mine) => h("li", { class: mine ? "mine" : "" }, h("b", { class:"bz-code" }, g), h("span", {}, clueText(A, B) + "."));
    const dial = (i) => h("div", { class:"bz-dial" },
      btn("▲", "ghost", () => { c.dial[i] = (c.dial[i] + 1) % 10; renderHands(); root.querySelectorAll(".bz-dial")[i].querySelector("button").focus(); }, { "aria-label":`Dial ${i + 1} up`, disabled:c.won }),
      h("span", { class:"bz-digit", "aria-live":"polite", "aria-label":`Dial ${i + 1}: ${c.dial[i]}` }, String(c.dial[i])),
      btn("▼", "ghost", () => { c.dial[i] = (c.dial[i] + 9) % 10; renderHands(); root.querySelectorAll(".bz-dial")[i].querySelectorAll("button")[1].focus(); }, { "aria-label":`Dial ${i + 1} down`, disabled:c.won }));
    const tryIt = () => {
      const g = c.dial.join("");
      if (new Set(g).size < 3) { c.say = "Remember: all three digits are different."; return renderHands(); }
      if (g === c.lock.code) return handsWon(Math.max(20, 50 - 5 * c.tries.length), c.tries.length ? `Cracked it in ${c.tries.length + 1} tries!` : "First try?! Are you a safecracker?");
      const [A, B] = score(c.lock.code, g); c.tries.push([g, A, B]);
      c.say = "Not it, but now you've got a new clue."; renderHands();
    };
    return h("div", { class:"bz-board" },
      h("ul", { class:"bz-clues" }, c.lock.clues.map(x => clue(x)), c.tries.map(x => clue(x, true))),
      h("div", { class:"bz-lock" }, dial(0), dial(1), dial(2), c.won ? h("span", { class:"bz-open" }, "🔓") : btn("Try code", "primary", tryIt)));
  }

  // River Run: puppy, cat, goldfish. Boat holds Dad plus one.
  const RIVER = { pup:["🐶", "Puppy"], cat:["🐱", "Cat"], fish:["🐟", "Goldfish"] };
  function initRiver(){ Object.assign(ctx, { banks:{ L:["pup", "cat", "fish"], R:[] }, side:"L", boat:null, trips:0 }); }
  function drawRiver(){
    const c = ctx;
    const item = (k, where) => btn(`${RIVER[k][0]} ${RIVER[k][1]}`, "bz-item", () => {
      if (c.won) return;
      if (where === "boat") { c.banks[c.side].push(k); c.boat = null; }
      else if (where === c.side) { if (c.boat) c.banks[c.side].push(c.boat); c.banks[c.side] = c.banks[c.side].filter(x => x !== k); c.boat = k; }
      else { c.say = "Dad's on the other side. He has to row over first."; }
      renderHands();
    }, { "aria-label": where === "boat" ? `${RIVER[k][1]}, in the boat. Tap to get out` : `${RIVER[k][1]}, on the ${where === "L" ? "left" : "right"} bank` + (where === c.side ? ". Tap to put in the boat" : "") });
    const bank = (sd) => h("div", { class:"bz-bank" + (c.side === sd ? " here" : "") }, h("small", {}, sd === "L" ? "Left bank" : "Right bank"), c.banks[sd].map(k => item(k, sd)));
    const row = () => {
      const from = c.side, to = from === "L" ? "R" : "L";
      c.side = to; c.trips++;
      if (c.boat) { c.banks[to].push(c.boat); c.boat = null; }
      const left = c.banks[from];
      const has = (k) => left.includes(k);
      if (has("pup") && has("cat")) { c.say = "Uh oh. The puppy chased the cat all over the riverbank! Start over and try another order."; c.failed = true; return renderHands(); }
      if (has("cat") && has("fish")) { c.say = "The cat stared at the goldfish a little too hungrily. Better start over!"; c.failed = true; return renderHands(); }
      if (c.banks.R.length === 3) return handsWon(c.trips <= 7 ? 50 : 40, c.trips <= 7 ? `Everyone across in ${c.trips} trips. That's the fewest possible!` : `Everyone's across safely in ${c.trips} trips!`);
      c.say = pick(["Rowing, rowing…", "Splish splash.", "My arms are getting tired. Robot arms, but still.", "Made it across. Who's next?"]);
      renderHands();
    };
    return h("div", { class:"bz-board" },
      h("div", { class:"bz-river" }, bank("L"),
        h("div", { class:"bz-water" }, h("div", { class:"bz-boat " + c.side }, "🤖", c.boat ? item(c.boat, "boat") : h("small", {}, "Empty seat"))), bank("R")),
      h("div", { class:"bz-row" }, c.failed ? null : btn(`Row ${c.side === "L" ? "right →" : "← left"}`, "primary", row, { disabled:c.won })),
      h("p", { class:"bz-meta" }, `${c.trips} trips · the puppy can't be left with the cat, and the cat can't be left with the goldfish`));
  }

  // Slide Tiles: shuffled with random legal moves, so it can always be solved
  function initTiles(){
    let t = [1, 2, 3, 4, 5, 6, 7, 8, 0], last = -1;
    const nb = (i) => [i - 3, i + 3, i % 3 ? i - 1 : -1, i % 3 < 2 ? i + 1 : -1].filter(j => j >= 0 && j < 9);
    do { for (let k = 0; k < 60; k++) { const z = t.indexOf(0), opts = nb(z).filter(j => j !== last); const j = pick(opts); [t[z], t[j]] = [t[j], t[z]]; last = z; } }
    while (t.join() === "1,2,3,4,5,6,7,8,0");
    Object.assign(ctx, { tiles:t, nb });
  }
  function drawTiles(){
    const c = ctx, z = c.tiles.indexOf(0);
    return h("div", { class:"bz-board" },
      h("div", { class:"bz-grid tiles", style:"grid-template-columns:repeat(3, 1fr)" }, c.tiles.map((v, i) => v === 0 ? h("span", { class:"bz-gap", "aria-hidden":"true" }) :
        btn(String(v), "bz-cell tile" + (v === i + 1 ? " home" : ""), () => {
          if (c.won || !c.nb(z).includes(i)) return; [c.tiles[z], c.tiles[i]] = [c.tiles[i], c.tiles[z]]; c.moves++;
          if (c.tiles.join() === "1,2,3,4,5,6,7,8,0") handsWon(c.moves <= 40 ? 50 : 40, `Sorted in ${c.moves} moves!`); else renderHands();
        }, { "aria-label":`Tile ${v}` + (c.nb(z).includes(i) ? ", next to the gap" : ""), disabled:c.won }))),
      h("p", { class:"bz-meta" }, `${c.moves} moves · tap a tile next to the gap to slide it`));
  }

  // ---------- Escape Dad's Garage ----------
  function escapeMenu(){
    view = "escape"; ctx = null;
    const s = S(), E = D.escape, n = E.rooms.length;
    const done = (i) => (s.rooms[i] || 0) >= 3, all = E.rooms.every((_, i) => done(i));
    paint(topBar(E.title, { fn: () => hub() }),
      bubble(all ? (s.escaped ? "We did it once. Fancy doing it again?" : "That's every digit! Get to the keypad!") : E.intro, "modern"),
      h("div", { class:"bz-rooms" }, E.rooms.map((r, i) => {
        const open = i === 0 || done(i - 1), st = s.rooms[i] || 0;
        const b = btn("", "bz-room" + (done(i) ? " done" : "") + (open && !done(i) ? " bz-focus" : ""), () => roomView(i), { disabled:!open });
        b.append(h("span", { class:"bz-ic", "aria-hidden":"true" }, open ? r.icon : "🔒"), h("b", {}, r.name),
          h("small", {}, done(i) ? `Digit found: ${r.digit}` : open ? `${st} of 3 puzzles` : "Locked"));
        return b; }),
        (() => { const b = btn("", "bz-room keypad" + (all ? " bz-focus" : ""), keypad, { disabled:!all });
          b.append(h("span", { class:"bz-ic", "aria-hidden":"true" }, "⌨️"), h("b", {}, "Garage door keypad"), h("small", {}, all ? "Enter the code!" : `${E.rooms.filter((_, i) => done(i)).length} of ${n} digits`)); return b; })()),
      s.escaped ? h("div", { class:"bz-row" }, btn("Reset the rooms and play again", "ghost", () => { s.rooms = {}; save(); escapeMenu(); })) : null);
    focusFirst();
  }
  function roomView(i, say){
    view = "room"; ctx = null;
    const s = S(), r = D.escape.rooms[i], st = s.rooms[i] || 0;
    const stepName = (x) => x.hands ? D.hands[x.hands].name : ({ logic:"Logic puzzle", number:"Number trick", pattern:"Pattern", riddle:"Riddle" })[BYID[x.p]?.type] || "Puzzle";
    paint(topBar(r.name, { label:"Garage", fn: escapeMenu }),
      bubble(say || (st >= 3 ? r.done : r.story), "modern"),
      h("ol", { class:"bz-steps" }, r.steps.map((x, k) => h("li", { class: k < st ? "done" : k === st ? "now" : "" }, (k < st ? "✅ " : k === st ? "👉 " : "⬜ ") + stepName(x)))),
      st >= 3 ? h("p", { class:"bz-digitbig", "aria-label":`Code digit ${r.digit}` }, r.digit) : null,
      h("div", { class:"bz-row" }, st >= 3 ? btn("Back to the garage →", "primary bz-focus", escapeMenu)
        : btn(st ? "Next puzzle →" : "Start →", "primary bz-focus", () => {
          const x = r.steps[st], c = { mode:"escape", room:i, step:st };
          x.hands ? startHands(x.hands, c) : startPuzzle(BYID[x.p], c);
        })));
    focusFirst();
  }
  function escapeStepDone(){
    const s = S(), i = ctx.room, st = ctx.step;
    s.rooms[i] = Math.max(s.rooms[i] || 0, st + 1); save();
    roomView(i, s.rooms[i] >= 3 ? D.escape.rooms[i].done : "One down! Next puzzle.");
  }
  function keypad(){
    view = "keypad";
    const E = D.escape, s = S(); let typed = "", say = "The keypad blinks. Four digits. Room order, I think.";
    const draw = () => {
      paint(topBar("Garage door", { label:"Garage", fn: escapeMenu }), bubble(say, "modern"),
        h("p", { class:"bz-found" }, "Digits you found: " + E.rooms.map(r => r.digit).join("  ")),
        h("div", { class:"bz-screen", "aria-live":"polite", "aria-label":`Typed ${typed.length} digits` }, (typed + "____").slice(0, 4).split("").join(" ")),
        h("div", { class:"bz-keys" }, [1, 2, 3, 4, 5, 6, 7, 8, 9, "⌫", 0, "✓"].map(k => btn(String(k), "bz-key" + (k === "✓" ? " go" : ""), () => {
          if (k === "⌫") typed = typed.slice(0, -1);
          else if (k === "✓") {
            if (typed === E.code) return escapeWin();
            say = typed.length < 4 ? "It needs all four digits." : "BZZT. Wrong code. Try the digits in room order: Workbench, Toolbox, Car, Shelf.";
            typed = "";
          } else if (typed.length < 4) typed += k;
          draw(); root.querySelector(`.bz-key[data-k="${k}"]`)?.focus();
        }, { "data-k":String(k), "aria-label": k === "⌫" ? "Delete" : k === "✓" ? "Enter" : String(k) }))));
    };
    draw(); focusFirst(".bz-key");
  }
  function escapeWin(){
    const s = S(), first = !s.escaped;
    s.escaped = true; save();
    const extra = award(first ? 200 : 50, { keepStreak:true });
    paint(topBar("Escaped!", { fn: () => hub() }), bubble([D.escape.win, extra].filter(Boolean).join(" "), "modern"),
      h("div", { class:"bz-door", "aria-hidden":"true" }, "🚪✨"),
      h("p", { class:"bz-q" }, D.escape.after),
      h("p", {}, first ? "+200 points for escaping the garage!" : "+50 points. Still got it."),
      h("div", { class:"bz-row" }, btn("Back to the menu", "primary bz-focus", () => hub())));
    focusFirst();
  }

  // ---------- styles (kept here so the main page stays lean) ----------
  const css = `
  #brainBody{position:relative}
  .bz-top{display:grid; grid-template-columns:auto 1fr auto; align-items:center; gap:8px; margin-bottom:10px}
  .bz-back{padding:6px 12px}
  .bz-label{font-weight:900; text-align:center; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}
  .bz-stats{display:flex; gap:10px; font-weight:900; white-space:nowrap}
  .bz-level{grid-column:1 / -1; display:flex; align-items:center; gap:8px; font-weight:800; font-size:.85rem}
  .bz-level small{color:var(--muted); white-space:nowrap}
  .bz-bar{flex:1; height:8px; border-radius:999px; background:color-mix(in srgb, var(--ink) 12%, transparent); overflow:hidden}
  .bz-bar i{display:block; height:100%; background:var(--mustard); border-radius:999px; transition:width .5s}
  .bz-dad{display:flex; gap:10px; align-items:flex-start; margin:8px 0 12px}
  .bz-av svg{width:52px; height:52px; flex:none}
  .bz-say{margin:0; flex:1; background:var(--sky); border:1px solid var(--line); border-radius:14px 14px 14px 4px; padding:10px 12px; font-weight:700}
  .bz-tiles{display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:10px}
  .bz-tile,.bz-room{display:flex; flex-direction:column; align-items:flex-start; gap:4px; text-align:left; padding:14px; border-radius:16px; border:1px solid var(--line); background:var(--surface); color:var(--ink); cursor:pointer; font:inherit; transition:transform .15s}
  .bz-tile:hover:not(:disabled),.bz-room:hover:not(:disabled){transform:translateY(-2px); border-color:var(--denim)}
  .bz-tile small,.bz-room small{color:var(--muted)}
  .bz-ic{font-size:1.6rem; line-height:1}
  .bz-room:disabled{opacity:.55; cursor:not-allowed}
  .bz-room.done{border-color:var(--denim)}
  .bz-rooms{display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:10px}
  .bz-foot,.bz-meta{color:var(--muted); font-size:.85rem; text-align:center}
  .bz-q{font-weight:800; font-size:1.08rem}
  .bz-hint{color:var(--muted); margin:4px 0}
  .bz-msg{font-weight:700}
  .bz-msg.ok{background:color-mix(in srgb, var(--denim) 14%, transparent); padding:10px 12px; border-radius:12px}
  .bz-opts{display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:8px; margin:10px 0}
  .bz-opt{padding:12px; border-radius:14px; border:2px solid var(--line); background:var(--surface); color:var(--ink); font:inherit; font-weight:800; cursor:pointer}
  .bz-opt:hover:not(:disabled){border-color:var(--denim)}
  .bz-opt.no{opacity:.45; text-decoration:line-through; animation:bzshake .3s}
  .bz-row{display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin:10px 0}
  .bz-input{flex:1; min-width:140px; padding:11px 14px; border-radius:999px; border:2px solid var(--line); background:var(--surface); color:var(--ink); font:inherit; font-weight:700}
  .bz-board{display:flex; flex-direction:column; align-items:center; gap:8px}
  .bz-grid{display:grid; gap:8px; width:min(300px, 100%)}
  .bz-cell{aspect-ratio:1; border-radius:14px; border:2px solid var(--line); background:color-mix(in srgb, var(--ink) 10%, var(--surface)); cursor:pointer; font:inherit; transition:background .15s, box-shadow .15s}
  .bz-cell.on{background:#FFD84D; border-color:#E8B400; box-shadow:0 0 18px #FFD84D}
  .bz-cell.tile{background:var(--surface); color:var(--ink); font-size:1.5rem; font-weight:900}
  .bz-cell.tile.home{border-color:var(--denim)}
  .bz-gap{aspect-ratio:1}
  .bz-clues{list-style:none; margin:0; padding:0; width:100%; display:flex; flex-direction:column; gap:6px}
  .bz-clues li{display:flex; gap:10px; align-items:center; background:var(--sky); border-radius:12px; padding:8px 10px}
  .bz-clues li.mine{border:1px dashed var(--denim)}
  .bz-code{font-family:ui-monospace, monospace; font-size:1.15rem; letter-spacing:.2em}
  .bz-lock{display:flex; gap:10px; align-items:center; margin-top:6px}
  .bz-dial{display:flex; flex-direction:column; align-items:center; gap:4px}
  .bz-dial .ghost{padding:4px 12px}
  .bz-digit{font:900 1.8rem/1 ui-monospace, monospace; width:44px; text-align:center; padding:8px 0; border-radius:10px; background:var(--ink); color:var(--surface)}
  .bz-open{font-size:2rem}
  .bz-river{display:grid; grid-template-columns:1fr auto 1fr; gap:8px; width:100%; align-items:stretch}
  .bz-bank{display:flex; flex-direction:column; gap:6px; padding:10px; border-radius:14px; background:color-mix(in srgb, #4CAF50 18%, var(--surface)); min-height:150px}
  .bz-bank.here{outline:2px solid var(--denim)}
  .bz-bank small{color:var(--muted); font-weight:800}
  .bz-water{width:110px; border-radius:14px; background:color-mix(in srgb, #2E9BD6 30%, var(--surface)); display:flex; align-items:center; padding:6px}
  .bz-boat{display:flex; flex-direction:column; align-items:center; gap:4px; font-size:1.6rem; width:100%; transition:transform .3s}
  .bz-boat small{font-size:.7rem; color:var(--muted)}
  .bz-item{padding:8px; border-radius:12px; border:1px solid var(--line); background:var(--surface); color:var(--ink); font:inherit; font-weight:800; cursor:pointer; font-size:.9rem}
  .bz-steps{list-style:none; padding:0; display:flex; flex-direction:column; gap:6px}
  .bz-steps li{padding:8px 12px; border-radius:12px; background:var(--sky)}
  .bz-steps li.now{font-weight:900; outline:2px solid var(--denim)}
  .bz-digitbig{font:900 3rem/1 ui-monospace, monospace; text-align:center; margin:8px 0}
  .bz-found{text-align:center; font-weight:800}
  .bz-screen{font:900 2rem/1 ui-monospace, monospace; text-align:center; letter-spacing:.2em; background:#0B1A10; color:#6CFF8E; border-radius:12px; padding:14px; margin:8px auto; width:min(240px, 100%)}
  .bz-keys{display:grid; grid-template-columns:repeat(3, 1fr); gap:8px; width:min(240px, 100%); margin:0 auto}
  .bz-key{padding:14px 0; border-radius:12px; border:1px solid var(--line); background:var(--surface); color:var(--ink); font:900 1.2rem/1 inherit; cursor:pointer}
  .bz-key.go{background:var(--mustard); color:var(--mustard-ink); border:0}
  .bz-door{font-size:3rem; text-align:center; animation:bzpop .6s}
  .bz-pop{position:absolute; top:40px; right:12px; font:900 1.6rem/1 inherit; color:var(--mustard); text-shadow:0 1px 0 var(--ink); animation:bzfloat 1.2s ease-out forwards; pointer-events:none}
  @keyframes bzfloat{from{opacity:1; transform:translateY(0)} to{opacity:0; transform:translateY(-40px)}}
  @keyframes bzshake{0%,100%{transform:translateX(0)} 25%{transform:translateX(-4px)} 75%{transform:translateX(4px)}}
  @keyframes bzpop{from{transform:scale(.4); opacity:0} to{transform:scale(1); opacity:1}}
  @media (prefers-reduced-motion:reduce){.bz-pop,.bz-opt.no,.bz-door{animation:none}.bz-tile,.bz-room,.bz-bar i{transition:none}}
  @media (max-width:420px){.bz-river{grid-template-columns:1fr; } .bz-water{width:auto; justify-content:center} .bz-bank{min-height:0}}`;
  function addCSS(){ if (document.getElementById("bz-css")) return; const st = document.createElement("style"); st.id = "bz-css"; st.textContent = css; document.head.append(st); }

  window.BrainGame = {
    open(el, br){ bridge = br || null; root = el; addCSS(); hub(); },
    // exposed for the checker script
    _score: score, _clueText: clueText,
  };
})();
