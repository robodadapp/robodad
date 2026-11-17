/* Brain Teasers with Dad: the game.
   Puzzle content lives in brainteasers.js. This file draws the menus, runs the
   hands-on puzzles (Blackout, Crack Dad's Safe, Crossings, Scramble), keeps score
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
    right: ["Nailed it!", "Big brain move.", "You got it! Up top. I'm a robot, so imagine the high five.", "Correct! Are you sure you're not part robot?", "Boom. Too easy for you.", "Yes! I'm telling everyone at work.", "Correct. I'd say I taught you that, but we both know I didn't."],
    slow: ["Got there in the end. That counts!", "Yes! Stubborn brains win puzzles.", "There it is. Took the long way, still arrived."],
    wrong: ["Ooh, close. Not quite.", "Nope. But that's how puzzles work. Try again.", "Not that one. Want a hint?", "Plot twist: that's not it.", "Hmm. Try looking at it another way."],
    hint: ["Here's a nudge.", "Okay, one hint. Maybe two.", "Dad hint incoming."],
    reveal: ["No worries. Here's how it works.", "Even Professor Dad gets stuck. Here's the trick."],
    hands: ["Look at you go!", "Solved it with your own two hands.", "Cleaner than my workbench. Nice."],
  };
  const STREAK_SAY = { 3: "Three in a row! You're on fire.", 5: "FIVE in a row! Somebody stop this kid.", 10: "TEN in a row?! I need harder puzzles.", 20: "Twenty. In. A. Row. I'm calling the newspapers." };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const today = () => new Date().toLocaleDateString("en-CA");
  // a repeatable random sequence from a number (mulberry32), so everyone gets the same daily safe
  const seeded = (seed) => () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  // Dad's Safe number: #1 was 16 November 2026, counted in the player's own calendar days
  const safeNo = () => { const n = new Date(); return Math.floor((Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()) - Date.UTC(2026, 10, 16)) / 86400000) + 1; };
  // anonymous counters (a fixed list of names, checked by the server); does nothing without the app around it
  const ping = (name) => { try { bridge?.ping?.(name); } catch {} };
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
  const shuffleR = (a, rand) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // ---------- sound: little synth blips made on the spot, no files. The switch lives on every Hands-on screen. ----------
  let ac = null;
  const sfxOn = () => !S().sfxOff && !window.RoboSfx?.muted;   // the app-wide "Game sound effects" switch mutes these too
  function audio(){
    if (!sfxOn()) return null;
    try { ac ||= new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === "suspended") ac.resume(); return ac; } catch { return null; }
  }
  function tone(f, dur, type = "square", vol = 0.05, slide = 0, delay = 0){
    const a = audio(); if (!a) return;
    try {
      const t = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur + 0.03);
    } catch {}
  }
  function noise(dur, vol = 0.05, delay = 0, freq = 1000){
    const a = audio(); if (!a) return;
    try {
      const len = Math.max(1, Math.floor(a.sampleRate * dur)), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime + delay;
      src.buffer = buf; f.type = "bandpass"; f.frequency.value = freq; g.gain.value = vol;
      src.connect(f).connect(g).connect(a.destination); src.start(t);
    } catch {}
  }
  const SFX = {
    flip: () => tone(700, 0.05, "square", 0.035),
    dim: () => tone(470, 0.06, "square", 0.03),
    click: () => tone(1500, 0.022, "square", 0.028),
    tap: () => tone(540, 0.05, "triangle", 0.06),
    slide: () => noise(0.06, 0.06, 0, 1600),
    row: () => { noise(0.3, 0.05, 0, 520); tone(190, 0.22, "sine", 0.035, -70); },
    clunk: () => { tone(95, 0.2, "square", 0.07, -45); noise(0.14, 0.07, 0.03, 340); tone(1250, 0.06, "triangle", 0.04, 0, 0.22); },
    nope: () => tone(170, 0.2, "sawtooth", 0.045, -60),
    coin: () => { tone(988, 0.07, "square", 0.045); tone(1319, 0.16, "square", 0.045, 0, 0.07); },
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.15, "square", 0.045, 0, i * 0.09)),
    lose: () => [392, 330, 262].forEach((f, i) => tone(f, 0.2, "triangle", 0.05, 0, i * 0.14)),
    tick: () => tone(1900, 0.02, "square", 0.022),
  };
  const sfx = (k) => { try { SFX[k]?.(); } catch {} };

  // ---------- Beat Dad: every Hands-on game has a dad to beat, climbing the same ladder as chess ----------
  // Beat the dad you're on and the next one steps up. Robo-Grandpa is last; beat him and you've finished that ladder.
  const DADS = [
    { id:"modern", name:"Modern Dad",
      start:["I did this one in {n}. On my phone. While answering emails.", "{n}. That's my number. It's a very reasonable number."],
      beat:["Okay, okay. You beat my {n}. I'm muting the family group chat.", "That was better than my {n}. I'm going to need a coffee."],
      lose:["My {n} stands. Phone's on 4%, still winning.", "Close. But {n} is {n}. I'll screenshot this."] },
    { id:"eighties", name:"Arcade Dad",
      start:["{n}. I put my initials next to it in 1986.", "Beat {n} and you get the top spot on my high-score table."],
      beat:["NEW HIGH SCORE. My initials just got bumped. Brutal.", "You beat {n}. Insert another coin? For me, not you."],
      lose:["{n} still holds. Game over, man. Insert coin.", "Player two loses. {n} stays at the top of the table."] },
    { id:"skater", name:"Skater Dad",
      start:["{n}. First try. Didn't even stretch.", "My line was {n}. Clean, no bails."],
      beat:["Sick. You beat my {n}. That's going in the video part.", "Okay, that line was cleaner than my {n}. Respect."],
      lose:["Bail! {n} is still the line to beat.", "Not bad, but {n} is {n}. Shake it off, drop back in."] },
    { id:"gamer", name:"Gamer Dad",
      start:["{n}. Speedrun category: any percent, dad edition.", "My PB is {n}. Don't make me grind it down."],
      beat:["GG. You beat my {n}. Reporting myself for skill issue.", "That beats {n}. I'm uninstalling. Kidding. Rematch."],
      lose:["{n} holds. Skill check failed. Respawn and try again.", "Nope, {n} is still the run to beat. GG though."] },
    { id:"coach", name:"Coach Dad",
      start:["{n}. That's the time to beat. Hustle.", "Team record is {n}. Let's see some effort."],
      beat:["THAT'S what I'm talking about! You beat {n}. Water break!", "New team record. {n} is history. Take a lap. A victory lap."],
      lose:["{n} still stands. Good hustle. Run it back.", "Not today. {n} is the record. Again, from the top."] },
    { id:"bookworm", name:"Bookworm Dad",
      start:["{n}. I did it between chapters.", "My bookmark says {n}. A modest number, quietly earned."],
      beat:["Remarkable. You surpassed {n}. I shall note it in the margins.", "Well read. Well played. {n} has been bested."],
      lose:["{n} endures, like a good classic. Try another chapter.", "Alas, {n} remains unbeaten. The plot thickens."] },
    { id:"labdad", name:"Lab Dad",
      start:["Hypothesis: you can't beat {n}. Let's run the experiment.", "My measured result: {n}. Repeatable, peer-reviewed by me."],
      beat:["Fascinating. You beat {n}. Hypothesis rejected. Science wins.", "Data says you beat {n}. I'm recalibrating everything."],
      lose:["Result: {n} still holds. The experiment continues.", "Not significant. {n} remains the control. Try again."] },
    { id:"professor", name:"Professor Dad",
      start:["{n}. I proved it on the chalkboard. Twice.", "The answer is {n}. Show your work and beat it."],
      beat:["Q.E.D. You beat {n}. I'm adding you to the syllabus.", "Excellent. Better than {n}. Full marks, gold star."],
      lose:["{n} stands. Partial credit. Revise and resubmit.", "Close, but {n} is still the answer to beat. See me after class."] },
    { id:"grandpa", name:"Robo-Grandpa",
      start:["{n}. In my day we did this uphill, both ways, with a rotary phone.", "Grandpa's number is {n}. Been holding it since before your dad had a moustache."],
      beat:["Well, I'll be. You beat {n}. I'm telling everyone at the bingo hall.", "Back in my day nobody beat {n}. Today's a new day, apparently."],
      lose:["{n} still stands, sonny. Grandpa's still got it.", "Ha! {n}. Pull up a chair and try again. I'll put the kettle on."] },
  ];
  const LOWER = ["lights", "river", "lock", "tiles"];   // lower beats Dad; in Blitz, higher does
  const rivalIdx = (k) => { const s = S(); return Math.min(DADS.length - 1, (s.rivals || {})[k] || 0); };
  const talkOn = () => !S().talkOff;
  const dadLine = (d, kind, n) => talkOn() ? pick(d[kind]).replaceAll("{n}", n)
    : ({ start:`${d.name}'s score: ${n}. Beat it.`, beat:`You beat ${d.name}'s ${n}.`, lose:`${d.name}'s ${n} still stands.` })[kind];

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
  let run = null;              // the Puzzle Run in progress: five stops, three hearts, a boss at the end
  const RUN_LEN = 5;
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
  // replaceChildren and append turn a null into the text "null", so drop empty slots first
  let paintedView = null;
  function paint(...nodes){
    root.replaceChildren(...nodes.filter(n => n != null && n !== false));
    // a new screen starts at the top (so its Back button is in view); redrawing the same screen keeps the scroll
    if (view !== paintedView) { paintedView = view; root.closest(".card")?.scrollTo?.(0, 0); }
  }
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
        mk("⚡", "Puzzle Run", s.runs ? `Five stops, three hearts, one boss. Best: ${s.runBest || 0} of ${RUN_LEN} stops.` : "Five stops, three hearts, one boss puzzle at the end.", () => startRun(true), "bz-focus"),
        (() => { const no = safeNo(), d = s.safeDay && s.safeDay.no === no ? s.safeDay : null, done = d && (d.won || d.lost);
          return mk(done ? (d.won ? "🔓" : "🔒") : "🔐", `Dad's Safe #${no}`,
            done ? (d.won ? `Cracked in ${d.tries.length + 1}. A new safe at midnight.` : "Stayed shut today. A new safe at midnight.")
              : d && d.tries.length ? `${d.tries.length} of 6 tries used. Pick up where you left off.` : "Today's safe. Same code for everyone, six tries.",
            () => startHands("lock", { mode:"daily" })); })(),
        mk(dailyDone ? "✅" : "📅", "Today's puzzle", dailyDone ? "Done! A new one tomorrow." : "Double points, once a day.", () => dailyDone ? hub("You already cracked today's puzzle. Come back tomorrow for a new one!") : startPuzzle(dailyPuzzle(), { mode:"daily" })),
        mk("🧩", "Hands-on", `Four games, a dad to beat in each. Today's four: ${dailiesDone()} of 4 done.`, handsMenu),
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
  function newRun(){
    const s = S(), fresh = shuffle(P.filter(p => !s.done.includes(p.id))), pool = fresh.length >= 5 ? fresh : shuffle(P);
    const boss = pool.find(p => p.type === "logic") || pool[0], rest = pool.filter(p => p !== boss).slice(0, 3);
    run = { stop:0, hearts:3, solved:0, xp0:s.xp,
      steps:[{ p:rest[0] }, { p:rest[1] }, { hands:pick(HKINDS) }, { p:rest[2] }, { p:boss, boss:true }] };
  }
  function startRun(fresh){
    if (fresh || !run || run.hearts <= 0 || run.stop >= RUN_LEN) newRun();
    const st = run.steps[run.stop];
    if (st.hands) return startHands(st.hands, { mode:"run" });
    startPuzzle(st.p, { mode:"run", boss:!!st.boss });
  }
  const runNextLabel = () => !run ? "Next puzzle →" : run.hearts <= 0 ? "See results →" : run.stop + 1 >= RUN_LEN ? "Finish the run →" : "Next stop →";
  function runAdvance(){
    if (!run) return startRun(true);
    if (run.hearts <= 0) return runResult();
    run.stop++;
    if (run.stop >= RUN_LEN) return runResult();
    startRun();
  }
  // the road along the top: five stops (the hand is the hands-on one, the star is the boss) and your hearts
  const runBar = () => !run ? null : h("div", { class:"bz-runbar", role:"img", "aria-label":`Stop ${Math.min(run.stop + 1, RUN_LEN)} of ${RUN_LEN}, ${run.hearts} of 3 hearts left` },
    h("div", { class:"bz-road", "aria-hidden":"true" }, run.steps.map((st, i) => h("span", { class:"bz-stop" + (i < run.stop ? " done" : i === run.stop ? " now" : "") + (st.boss ? " boss" : "") }, i < run.stop ? "✓" : st.boss ? "★" : st.hands ? "✋" : String(i + 1)))),
    h("div", { class:"bz-hearts", "aria-hidden":"true" }, [0, 1, 2].map(i => h("span", { class:"bz-heart" + (i < run.hearts ? "" : " lost") }, "♥"))));
  function runResult(){
    view = "runresult"; ctx = null;
    const s = S(), r = run, won = r.hearts > 0 && r.stop >= RUN_LEN;
    const extra = won ? award(50, { keepStreak:true }) : "";
    s.runs = (s.runs || 0) + 1; s.runBest = Math.max(s.runBest || 0, r.solved); if (won) s.runWins = (s.runWins || 0) + 1; save();
    const pts = s.xp - r.xp0, tix = r.solved * 2 + (won ? 6 : 0) + (won && r.hearts === 3 ? 4 : 0);
    bridge?.arcade?.(tix);
    paint(topBar("Puzzle Run", { fn: () => hub() }),
      bubble(won ? (r.hearts === 3 ? "FLAWLESS. Not a single heart lost. I'm framing this." : "Boss down! You made it to the end of the road.") + (extra ? " " + extra : "") : r.solved >= 3 ? "Out of hearts, but what a run. So close." : "Out of hearts. The road's long. Go again?"),
      h("div", { class:"bz-runres" + (won ? " win" : "") },
        h("b", {}, won ? "RUN COMPLETE" : "RUN OVER"),
        h("div", { class:"bz-runstats" },
          h("div", {}, h("b", {}, `${r.solved}/${RUN_LEN}`), h("small", {}, "stops cleared")),
          h("div", {}, h("b", {}, [0, 1, 2].map(i => i < r.hearts ? "♥" : "♡").join("")), h("small", {}, "hearts left")),
          h("div", {}, h("b", {}, "+" + (pts)), h("small", {}, "points")))),
      h("p", { class:"bz-foot" }, `Best run: ${s.runBest} of ${RUN_LEN} stops · ${s.runWins || 0} complete`),
      h("div", { class:"bz-row" }, btn("New run", "primary bz-focus", () => startRun(true)), btn("Menu", "ghost", () => hub())));
    focusFirst();
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

  // ---------- puzzle scenes: each kind of puzzle gets its own prop, drawn once and used for every puzzle of that kind ----------
  const SCENE = {
    riddle:{ label:"Voicemail from Dad", art:`<svg viewBox="0 0 96 56" aria-hidden="true"><rect x="6" y="14" width="64" height="36" rx="6" fill="#4B4F6B" stroke="#1B1D2B" stroke-width="2"/><circle cx="26" cy="30" r="9" fill="#1B1D2B"/><circle cx="26" cy="30" r="3.5" fill="#C9D1D9"/><circle cx="50" cy="30" r="9" fill="#1B1D2B"/><circle cx="50" cy="30" r="3.5" fill="#C9D1D9"/><rect x="18" y="42" width="40" height="4" rx="2" fill="#2B2E44"/><circle class="bz-blink" cx="62" cy="21" r="3" fill="#FF5C5C"/><path d="M78 20q6 8 0 16M84 15q10 13 0 26" fill="none" stroke="#FFD866" stroke-width="2.5" stroke-linecap="round"/></svg>`, bg:"#2A2D45" },
    logic:{ label:"Dad's case board", art:`<svg viewBox="0 0 96 56" aria-hidden="true"><rect x="4" y="6" width="88" height="46" rx="5" fill="#B98B55" stroke="#6B4A25" stroke-width="3"/><rect x="12" y="14" width="22" height="18" fill="#FFF7DC" transform="rotate(-4 23 23)"/><rect x="58" y="12" width="24" height="18" fill="#FFF7DC" transform="rotate(5 70 21)"/><rect x="34" y="34" width="24" height="14" fill="#FFF7DC" transform="rotate(-2 46 41)"/><path d="M23 16 L70 14 L46 36 Z" fill="none" stroke="#D7263D" stroke-width="2"/><circle cx="23" cy="16" r="3" fill="#D7263D"/><circle cx="70" cy="14" r="3" fill="#D7263D"/><circle cx="46" cy="36" r="3" fill="#D7263D"/></svg>`, bg:"#6B4A25" },
    number:{ label:"Dad's calculator", art:`<svg viewBox="0 0 96 56" aria-hidden="true"><rect x="26" y="4" width="44" height="50" rx="6" fill="#C9D1D9" stroke="#2C333B" stroke-width="2"/><rect x="31" y="9" width="34" height="12" rx="2" fill="#9BE08A"/><text x="62" y="19" text-anchor="end" font-family="ui-monospace,monospace" font-weight="800" font-size="10" fill="#1E3A1E">= ?</text>${[0,1,2].map(r => [0,1,2,3].map(c => `<rect x="${31 + c * 9}" y="${26 + r * 8}" width="7" height="6" rx="1.5" fill="${c === 3 ? "#F5A623" : "#5A6470"}"/>`).join("")).join("")}</svg>`, bg:"#2C333B" },
    pattern:{ label:"Spot the pattern", art:`<svg viewBox="0 0 96 56" aria-hidden="true">${["#FFD866","#6BE08C","#FFD866","#6BE08C"].map((c, i) => `<rect x="${6 + i * 18}" y="18" width="15" height="20" rx="3" fill="${c}" stroke="#1B1D2B" stroke-width="2"/>`).join("")}<rect x="78" y="18" width="15" height="20" rx="3" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-dasharray="3 3"/><text x="85.5" y="33" text-anchor="middle" font-weight="900" font-size="14" fill="#fff">?</text></svg>`, bg:"#2B2A55" },
  };
  function puzzleCard(p, c){
    const k = SCENE[p.type] ? p.type : "logic", sc = SCENE[k];
    const tag = c.boss ? "BOSS PUZZLE · double points" : c.mode === "daily" ? `Today's case #${safeNo()} · double points` : c.mode === "notebook" ? "A page from Dev's notebook" : sc.label;
    return h("div", { class:"bz-pcard bz-pk-" + k + (c.boss ? " boss" : "") + (c.mode === "daily" ? " daily" : ""), style:`--pbg:${sc.bg}` },
      h("div", { class:"bz-phead" }, h("span", { class:"bz-part", "aria-hidden":"true", html:sc.art }), h("b", {}, tag)),
      h("p", { class:"bz-q bz-paper" }, p.q),
      c.done && c.mode === "daily" ? h("span", { class:"bz-stamp", "aria-hidden":"true" }, "CASE CLOSED") : null);
  }

  // ---------- the thinking board: drag (or tap) names into slots to work an ordering puzzle out. It never scores; it just glows when the order is right. ----------
  function puzzleBoard(c){
    const B = c.p.board; if (!B) return null;
    c.bd ||= { slots: B.slots.map(() => null), sel: null, order: shuffle(B.items.map((_, i) => i)) };
    const bd = c.bd, placed = new Set(bd.slots.filter(v => v != null));
    const ok = bd.slots.every((v, i) => v != null && B.items[v] === B.solution[i]);
    const place = (idx, slot) => { bd.slots = bd.slots.map(v => v === idx ? null : v); bd.slots[slot] = idx; bd.sel = null; renderPuzzle(); };
    const slotBtn = (i) => { const v = bd.slots[i];
      return h("button", { type:"button", class:"bz-tkslot" + (v != null ? " full" : "") + (bd.sel != null ? " ready" : ""), "data-slot":String(i),
        "aria-label": `${B.slots[i]}: ${v != null ? B.items[v] + ", tap to take back" : "empty"}`,
        on:{ click: () => { if (bd.sel != null) place(bd.sel, i); else if (v != null) { bd.slots[i] = null; renderPuzzle(); } } } },
        h("small", {}, B.slots[i]), h("b", {}, v != null ? B.items[v] : "·")); };
    const chip = (idx) => { const el = h("button", { type:"button", class:"bz-chip" + (bd.sel === idx ? " sel" : ""), "aria-pressed":String(bd.sel === idx) }, B.items[idx]);
      let sx = 0, sy = 0, down = false, moved = false;
      const slotAt = (x, y) => { el.style.pointerEvents = "none"; const t = document.elementFromPoint(x, y); el.style.pointerEvents = ""; return t && t.closest ? t.closest(".bz-tkslot") : null; };
      el.addEventListener("pointerdown", (e) => { down = true; moved = false; sx = e.clientX; sy = e.clientY; el.setPointerCapture(e.pointerId); });
      el.addEventListener("pointermove", (e) => { if (!down) return; const dx = e.clientX - sx, dy = e.clientY - sy;
        if (Math.abs(dx) + Math.abs(dy) > 8) { moved = true; el.classList.add("drag"); } if (moved) el.style.transform = `translate(${dx}px, ${dy}px)`; });
      el.addEventListener("pointerup", (e) => { if (!down) return; down = false; el.classList.remove("drag"); el.style.transform = "";
        if (moved) { const sl = slotAt(e.clientX, e.clientY); if (sl) place(idx, +sl.dataset.slot); } else { bd.sel = bd.sel === idx ? null : idx; renderPuzzle(); } });
      el.addEventListener("pointercancel", () => { down = false; el.classList.remove("drag"); el.style.transform = ""; });
      el.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); bd.sel = bd.sel === idx ? null : idx; renderPuzzle(); } });
      return el; };
    return h("div", { class:"bz-tkb" + (ok ? " ok" : "") },
      h("p", { class:"bz-tkt" }, `${B.title} · drag a name into a slot, or tap one then tap a slot`),
      h("div", { class:"bz-tkslots" }, B.slots.map((_, i) => slotBtn(i))),
      h("div", { class:"bz-tray2" }, bd.order.filter(i => !placed.has(i)).map(chip)),
      ok ? h("p", { class:"bz-tkok", role:"status" }, "✓ That's the order. Now pick your answer.") : null,
      bd.slots.some(v => v != null) ? btn("Clear the board", "ghost bz-tkclr", () => { c.bd = null; renderPuzzle(); }) : null);
  }
  function renderPuzzle(){
    const c = ctx, p = c.p;
    const nodes = [topBar(c.mode === "daily" ? "Today's puzzle" : c.mode === "escape" ? D.escape.rooms[c.room].name : c.mode === "notebook" ? "Dev's Notebook" : "Puzzle Run", backFor()), c.mode === "run" ? runBar() : null, bubble(c.say)];
    nodes.push(puzzleCard(p, c), puzzleBoard(c));
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
          c.done = true; const s = S(); s.streak = 0; if (c.mode === "daily") s.daily = today(); if (c.mode === "run" && run) run.hearts--; save();
          c.say = pick(SAY.reveal); c.msg = `The answer is ${p.kind === "type" ? p.answer : p.ok}. ${p.why}`;
          if (c.mode === "escape") c.say += " That still counts for the room.";
          renderPuzzle();
        })));
    } else {
      nodes.push(h("div", { class:"bz-row" }, c.mode === "escape" ? btn("Back to the room →", "primary bz-focus", () => escapeStepDone())
        : c.mode === "daily" ? btn("Back to the menu", "primary bz-focus", () => hub())
        : c.mode === "notebook" ? btn("Back to the notebook →", "primary bz-focus", () => notebookMenu())
        : btn(runNextLabel(), "primary bz-focus", runAdvance)));
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
      if (c.mode === "run" && run) { run.hearts--; c.say += " That's a heart."; if (run.hearts <= 0) { c.done = true; c.say = "Out of hearts. That's the run."; c.msg = `The answer is ${p.kind === "type" ? p.answer : p.ok}. ${p.why}`; } }
      renderPuzzle(); focusFirst(".bz-opt:not([disabled]), .bz-input"); window.RDWin?.(root, false); return;
    }
    let pts = Math.max(10, 30 - 10 * c.hints);
    if (c.wrong) pts = Math.max(5, Math.round(pts / 2));
    const fast = !c.wrong && !c.hints && Date.now() - c.t0 < 30000;
    if (fast) pts += 10;
    if (c.mode === "run" && c.boss) pts *= 2;
    if (c.mode === "run" && run) run.solved++;
    if (c.mode === "daily") { pts *= 2; const s = S(); if (s.daily !== today()) { s.daily = today(); s.dailies++; bridge?.arcade?.(8); } }
    const extra = award(pts, { id:p.id, keepStreak: !c.wrong });
    c.done = true;
    c.say = [pick(c.wrong || c.hints > 1 ? SAY.slow : SAY.right), fast ? "Speed bonus!" : "", extra].filter(Boolean).join(" ");
    c.msg = p.why;
    renderPuzzle(); focusFirst(".bz-focus"); window.RDWin?.(root, true);
  }

  // ---------- hands-on ----------
  // Little scene thumbnails for the Hands-on menu, so the drawn games look drawn before you open them.
  const THUMBS = {
    lights:`<svg viewBox="0 0 96 64"><rect width="96" height="64" rx="10" fill="#1B2547"/><circle cx="78" cy="14" r="7" fill="#FFF3C4"/><circle cx="20" cy="10" r="1.2" fill="#fff"/><circle cx="44" cy="7" r="1" fill="#fff"/><path d="M20 30 L48 14 L76 30Z" fill="#3A4A7A"/><rect x="24" y="30" width="48" height="30" fill="#2B3866"/><g fill="#FFD866"><rect x="29" y="35" width="10" height="9" rx="1"/><rect x="57" y="35" width="10" height="9" rx="1"/><rect x="43" y="48" width="10" height="9" rx="1"/></g><g fill="#151C36"><rect x="43" y="35" width="10" height="9" rx="1"/><rect x="29" y="48" width="10" height="9" rx="1"/><rect x="57" y="48" width="10" height="9" rx="1"/></g></svg>`,
    lock:`<svg viewBox="0 0 96 64"><rect width="96" height="64" rx="10" fill="#5A6470"/><rect x="18" y="8" width="60" height="48" rx="6" fill="#8C97A3" stroke="#2C333B" stroke-width="2"/><circle cx="48" cy="32" r="14" fill="#C9D1D9" stroke="#2C333B" stroke-width="2"/><circle cx="48" cy="32" r="4" fill="#2C333B"/><path d="M48 19v5M48 40v5M35 32h5M56 32h5" stroke="#2C333B" stroke-width="2" stroke-linecap="round"/><rect x="68" y="26" width="5" height="12" rx="2" fill="#2C333B"/></svg>`,
    river:`<svg viewBox="0 0 96 64"><rect width="96" height="64" rx="10" fill="#8ED081"/><path d="M0 24 Q24 18 48 24 T96 24 V44 Q72 50 48 44 T0 44Z" fill="#3E8ED0"/><path d="M10 34 q6 -3 12 0 M58 30 q6 -3 12 0" stroke="#BFE3FF" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M34 32 h26 l-4 7 h-18z" fill="#8A5A2B" stroke="#3B2512" stroke-width="1.5"/><circle cx="44" cy="27" r="4" fill="#F2C29B"/><circle cx="54" cy="29" r="3" fill="#F2F2F2"/></svg>`,
    tiles:`<svg viewBox="0 0 96 64"><rect width="96" height="64" rx="10" fill="#2E2A4F"/><g font-family="system-ui,sans-serif" font-weight="900" font-size="12" text-anchor="middle"><rect x="26" y="7" width="14" height="14" rx="3" fill="#FFD866"/><text x="33" y="18" fill="#2E2A4F">1</text><rect x="41" y="7" width="14" height="14" rx="3" fill="#FFD866"/><text x="48" y="18" fill="#2E2A4F">2</text><rect x="56" y="7" width="14" height="14" rx="3" fill="#FFD866"/><text x="63" y="18" fill="#2E2A4F">3</text><rect x="26" y="22" width="14" height="14" rx="3" fill="#FFD866"/><text x="33" y="33" fill="#2E2A4F">4</text><rect x="41" y="22" width="14" height="14" rx="3" fill="#FFD866"/><text x="48" y="33" fill="#2E2A4F">5</text><rect x="26" y="37" width="14" height="14" rx="3" fill="#FFD866"/><text x="33" y="48" fill="#2E2A4F">7</text><rect x="56" y="37" width="14" height="14" rx="3" fill="#FFD866"/><text x="63" y="48" fill="#2E2A4F">6</text><rect x="41" y="37" width="14" height="14" rx="3" fill="#FFD866"/><text x="48" y="48" fill="#2E2A4F">8</text></g></svg>`,
  };
  const DAILY_NAME = { lock:"Dad's Safe", lights:"Blackout", river:"Night Bridge", tiles:"Scramble" };
  const DAILY_ICON = { lock:"🔐", lights:"💡", river:"🔦", tiles:"🧩" };
  // today's result for one of the four dailies (the safe keeps its own record), or null
  function dailyDone(k){
    const s = S(), no = safeNo();
    if (k === "lock") { const d = s.safeDay && s.safeDay.no === no ? s.safeDay : null; return d && (d.won || d.lost) ? { stars:d.won ? d.stars || 0 : 0, lost:!!d.lost } : null; }
    return s.dHands && s.dHands.no === no ? s.dHands[k] || null : null;
  }
  const dailiesDone = () => HKINDS.filter(dailyDone).length;
  function dailyChips(){
    const n = dailiesDone(), no = safeNo();
    return h("div", { class:"bz-dailies" },
      h("p", { class:"bz-dhead" }, h("b", {}, "Today's four"), h("small", {}, n === 4 ? "All four done. New ones at midnight." : `${n} of 4 done · the same boards for everyone`)),
      h("div", { class:"bz-dchips" }, HKINDS.map(k => { const d = dailyDone(k);
        const sub = !d ? `#${no}` : d.lost ? "shut" : "★".repeat(d.stars) + "☆".repeat(3 - d.stars);
        return btn("", "bz-dchip" + (d ? " done" : ""), () => startHands(k, { mode:"daily", from:"menu" }),
          { "aria-label":`${DAILY_NAME[k]} number ${no}` + (!d ? ", not played yet" : d.lost ? ", the safe stayed shut" : `, done with ${d.stars} of 3 stars`),
            html:`<span class="bz-dic" aria-hidden="true">${d ? "✅" : DAILY_ICON[k]}</span><b>${DAILY_NAME[k]}</b><small aria-hidden="true">${sub}</small>` }); })));
  }
  const toggles = (redraw) => h("div", { class:"bz-row bz-toggles" },
    btn(sfxOn() ? "🔊 Sound on" : "🔇 Sound off", "ghost", () => { const s = S(); s.sfxOff = !s.sfxOff; save(); if (!s.sfxOff) sfx("tap"); redraw(); }, { "aria-pressed":String(sfxOn()), "data-fk":"snd" }),
    btn(talkOn() ? "💬 Trash talk on" : "💬 Trash talk off", "ghost", () => { const s = S(); s.talkOff = !s.talkOff; save(); redraw(); }, { "aria-pressed":String(talkOn()), "data-fk":"talk" }));
  function handsMenu(){
    view = "handsMenu"; ctx = null;
    const s = S();
    paint(topBar("Hands-on", { fn: () => hub() }),
      bubble("Four games, a dad to beat in each one, and four dailies that reset at midnight."),
      dailyChips(),
      h("div", { class:"bz-tiles" }, HKINDS.map((k, i) => { const H = D.hands[k], r = DADS[rivalIdx(k)];
        const b = btn("", "bz-tile" + (i ? "" : " bz-focus"), () => startHands(k, { mode:"hands" }));
        b.append(...[h("span", { class:"bz-thumb", "aria-hidden":"true", html: THUMBS[k] }), h("b", {}, H.name + (s.handsDone.includes(k) ? " ✓" : "")), h("small", {}, H.blurb),
          h("small", { class:"bz-vs" }, (s.rivalsDone || {})[k] ? "Every dad beaten. Robo-Grandpa wants a rematch." : `Next to beat: ${r.name}`),
          (s.handsStars || {})[k] ? h("small", { class:"bz-best", "aria-label":`Best: ${s.handsStars[k]} of 3 stars` }, "★".repeat(s.handsStars[k]) + "☆".repeat(3 - s.handsStars[k])) : null].filter(Boolean));
        return b; })),
      toggles(handsMenu));
    focusFirst();
  }
  function startHands(kind, c){
    view = "hands";
    ctx = { ...c, kind, won:false, say: D.hands[kind].blurb, moves:0 };
    ({ lights:initLights, lock:initLock, river:initRiver, tiles:initTiles })[kind]();
    if (!ctx.won) ctx.rival = rivalFor(ctx);
    renderHands(); focusFirst(".bz-win, .bz-tum button, .bz-tok, .bz-pt");
  }

  // the score each dad sets, by rung of the ladder (0 = Modern Dad … 8 = Robo-Grandpa)
  const SLACK = { lights:[6, 5, 4, 3, 3, 2, 1, 1, 0], river:[4, 3, 3, 2, 2, 1, 1, 0, 0] };
  const SPM = [2600, 2300, 2000, 1800, 1600, 1400, 1250, 1100, 950];   // Scramble: dad's milliseconds per move
  const BLITZ = [3, 4, 5, 6, 7, 8, 9, 10, 12];
  const LOCKRIVAL = { deduce3:[5, 5, 4, 4, 4, 3, 3, 3, 2], deduce4:[6, 6, 5, 5, 5, 4, 4, 4, 3], crack3:[8, 7, 7, 6, 6, 6, 5, 5, 5], crack4:[10, 9, 9, 8, 8, 7, 7, 7, 6] };
  function rivalFor(c){
    if (c.mode !== "hands" && c.mode !== "blitz") return null;
    const key = c.mode === "blitz" ? "blitz" : c.kind, t = rivalIdx(key), d = c.kind === "lock" ? c.owner : DADS[t];
    let target, fmt;
    if (key === "blitz") { target = BLITZ[t]; fmt = (v) => `${v} board${v === 1 ? "" : "s"}`; }
    else if (key === "lights") { target = c.par + SLACK.lights[t]; fmt = (v) => `${v} taps`; }
    else if (key === "river") { target = c.L.limit || c.L.par + SLACK.river[t]; fmt = (v) => c.L.limit ? `${v} minutes` : `${v} trips`; }
    else if (key === "lock") { target = Math.min(c.max, LOCKRIVAL[c.lockMode + c.len][t]); fmt = (v) => `${v} ${v === 1 ? "try" : "tries"}`; }
    else { target = Math.round((4000 + c.par * SPM[t]) / 100) * 100; fmt = fmtTime; }
    const txt = fmt(target);
    return { key, t, d, target, fmt, txt, say:dadLine(d, "start", txt) };
  }
  // after a finish: did you beat the dad? Beating him brings on the next one.
  function settleRival(c){
    const r = c.rival; if (!r) return false;
    const v = r.key === "lights" ? c.moves : r.key === "river" ? c.used : r.key === "lock" ? c.tries.length + 1 : r.key === "tiles" ? c.ms : c.blitz.boards;
    const beat = r.key === "blitz" ? v >= r.target : v <= r.target;
    const s = S(); s.rivals ||= {}; s.rivalsDone ||= {};
    r.done = true; r.beat = beat; r.say = dadLine(r.d, beat ? "beat" : "lose", r.txt);
    if (beat) { if (r.t >= DADS.length - 1) s.rivalsDone[r.key] = true; else { s.rivals[r.key] = r.t + 1; r.next = DADS[r.t + 1]; } ping("rival_beat"); }
    else ping("rival_lose");
    save(); return beat;
  }
  function rivalBar(c){
    const r = c.rival; if (!r) return null;
    const head = r.done ? (r.beat ? `You beat ${r.d.name}!` : `${r.d.name} wins this one`) : `vs ${r.d.name}`;
    const sub = r.done ? (r.beat ? (r.next ? `Next up: ${r.next.name}` : "That was the top of the ladder.") : `Score to beat: ${r.txt}`) : `Score to beat: ${r.txt} · dad ${r.t + 1} of ${DADS.length}`;
    return h("div", { class:"bz-rival" + (r.done ? (r.beat ? " beat" : " lost") : "") },
      dadSVG(r.d.id),
      h("span", {}, h("b", {}, head), h("small", {}, sub), h("i", {}, "“" + r.say + "”")));
  }
  function handsWon(stars, line){
    const c = ctx, s = S(); c.won = true; c.stars = stars;
    s.handsStars ||= {}; s.handsStars[c.kind] = Math.max(s.handsStars[c.kind] || 0, stars);
    if (c.kind === "lock") s.safesCracked = (s.safesCracked || 0) + 1;
    if (c.mode === "daily") { if (c.kind === "lock") finishSafe(c, true); else finishDaily(c); }
    else if (c.mode === "hands") ping("hands_win"); else if (c.mode === "run" && run) run.solved++;
    const beat = settleRival(c);
    const extra = award([30, 30, 40, 50][stars] + (beat ? 15 : 0), { hands:c.kind, keepStreak:true });
    c.say = [line || pick(SAY.hands), beat ? "+15 for beating Dad." : "", extra].filter(Boolean).join(" "); buzz([30, 40, 30]);
    if (c.kind === "lock") { sfx("clunk"); setTimeout(() => sfx("win"), 380); } else sfx("win");
    renderHands(); focusFirst(".bz-focus");
  }
  function renderHands(){
    const c = ctx, H = D.hands[c.kind];
    // redrawing replaces every button, so remember which one had the keyboard focus and give it back
    const fk = root.contains(document.activeElement) ? document.activeElement.getAttribute("data-fk") : null;
    const label = c.mode === "escape" ? D.escape.rooms[c.room].name : c.mode === "daily" ? `${DAILY_NAME[c.kind]} #${c.no}` : c.mode === "blitz" ? "Blackout Blitz" : H.name;
    const home = c.from === "menu" ? handsMenu : () => hub();
    const back = c.mode === "hands" || c.mode === "blitz" ? { label:"Hands-on", fn: handsMenu } : c.mode === "daily" ? { label: c.from === "menu" ? "Hands-on" : "Menu", fn: home } : backFor();
    const nodes = [topBar(label, back), c.mode === "run" ? runBar() : null, bubble(c.say, "gamer")];
    nodes.push(h("div", { class:"bz-scene bz-s-" + c.kind }, rivalBar(c), ({ lights:drawLights, lock:drawLock, river:drawRiver, tiles:drawTiles })[c.kind]()));
    const row = h("div", { class:"bz-row" }), over = c.won || c.lost;
    if (c.mode === "daily") {
      // one board a day: no "new puzzle" here, just share it or go back
      if (over) row.append(btn("Share result", "primary bz-focus", () => c.kind === "lock" ? shareSafe(c) : shareDaily(c)), btn("Menu", "ghost", home));
      else row.append(btn("Ask Dad", "ghost", () => bridge?.coach("hands-" + c.kind)));
    } else if (c.mode === "blitz") {
      if (c.won) row.append(btn("Go again", "primary bz-focus", () => startHands("lights", { mode:"blitz" })), btn("Share", "ghost", () => shareBlitz(c)), btn("Menu", "ghost", handsMenu));
      else row.append(btn("Ask Dad", "ghost", () => bridge?.coach("hands-lights")));
    } else if (c.won) {
      row.append(c.mode === "escape" ? btn("Back to the room →", "primary bz-focus", () => escapeStepDone())
        : c.mode === "run" ? btn(runNextLabel(), "primary bz-focus", runAdvance)
        : c.kind === "river" ? (c.level + 1 < CROSSINGS.length
            ? btn("Next crossing →", "primary bz-focus", () => startHands("river", { mode:"hands", level:c.level + 1 }))
            : btn("Play again", "primary bz-focus", () => startHands("river", { mode:"hands", level:c.level })))
        : c.kind === "lights" ? btn(c.level + 1 < RULES.length && c.level + 1 <= lightsOpen(S()) ? "Next wiring →" : "Play another", "primary bz-focus",
            () => startHands("lights", { mode:"hands", level: c.level + 1 < RULES.length && c.level + 1 <= lightsOpen(S()) ? c.level + 1 : c.level }))
        : c.kind === "tiles" ? btn("Play another", "primary bz-focus", () => startHands("tiles", { mode:"hands", pic:c.pic }))
        : btn("Play another", "primary bz-focus", () => startHands(c.kind, { mode:"hands" })));
      if (c.mode !== "escape") row.append(btn("Menu", "ghost", () => hub()));
    } else {
      row.append(btn(c.kind === "river" ? "Start over" : "New puzzle", c.lost ? "primary bz-focus" : "ghost", () => startHands(c.kind, { mode:c.mode, room:c.room, step:c.step, level:c.level, pic:c.pic })),
        btn("Ask Dad", "ghost", () => bridge?.coach("hands-" + c.kind)));
    }
    // count what people do after a hands-on win: replay after 3 stars, retry after fewer, or go to the next crossing
    if (c.won && c.mode === "hands") row.firstChild.addEventListener("click", () => ping(c.kind === "river" && c.level + 1 < CROSSINGS.length ? "hands_next" : c.stars < 3 ? "hands_retry" : "hands_again"));
    nodes.push(row, c.mode === "daily" && over ? (c.kind === "lock" ? safeFoot() : dailyFoot()) : null, toggles(renderHands)); paint(...nodes);
    if (fk) { const el = root.querySelector(`[data-fk="${fk}"]`); if (el && !el.disabled) el.focus(); else focusFirst(".bz-sbtn:not(:disabled)"); }
  }

  // ---------- the other three dailies (the safe has its own, further down) ----------
  function finishDaily(c){
    const s = S(), no = c.no;
    if (!s.dHands || s.dHands.no !== no) s.dHands = { no };
    if (s.dHands[c.kind]) return;
    s.dHands[c.kind] = { moves:c.moves, used:c.used, ms:c.ms, stars:c.stars, hinted:!!c.hinted, par:c.par, trips:(c.past || []).length };
    countAllFour(s); ping("hands_daily"); bridge?.arcade?.(4); save();
  }
  // the "all four in one day" counter, checked whenever a daily finishes
  function countAllFour(s){ const no = safeNo(); if (s.allFourDay !== no && dailiesDone() === 4) { s.allFourDay = no; s.dAllDays = (s.dAllDays || 0) + 1; } }
  function dailyFoot(){
    const n = new Date(), mid = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1), mins = Math.max(1, Math.ceil((mid - n) / 60000));
    return h("p", { class:"bz-foot" }, `${dailiesDone()} of 4 dailies done today · New boards in ${Math.floor(mins / 60)}h ${mins % 60}m`);
  }
  function sendShare(text, title){
    ping("hands_share");
    if (bridge?.shareText) bridge.shareText(text, title);
    else navigator.clipboard?.writeText(text).catch(() => {});
  }
  // spoiler-free, like the safe: how you did, never how to do it
  function shareDaily(c){
    const d = dailyDone(c.kind) || {}, st = d.stars || 0, stars = "★".repeat(st) + "☆".repeat(3 - st) + (d.hinted ? " 💡" : "");
    let text;
    if (c.kind === "lights") text = `💡 Blackout #${c.no} · ${RULES[c.level].name}\n${d.moves} taps · par ${d.par} ${stars}\n` + "🌑".repeat(Math.min(d.par, d.moves)) + "💡".repeat(Math.max(0, d.moves - d.par));
    else if (c.kind === "river") text = `🔦 Night Bridge #${c.no}\n${d.used} of ${c.L.limit} minutes ${stars}\n` + Array.from({ length:d.trips || 0 }, (_, i) => i % 2 ? "⬅️" : "➡️").join("");
    else text = `🧩 Scramble #${c.no} · ${c.picName}\n⏱ ${fmtTime(d.ms || 0)} · ${d.moves} moves (par ${d.par}) ${stars}`;
    sendShare(text, DAILY_NAME[c.kind]);
  }
  function shareBlitz(c){
    const b = c.blitz.boards;
    sendShare(`⚡ Blackout Blitz\n${b} board${b === 1 ? "" : "s"} in 60 seconds` + (c.rival ? ` · ${c.rival.beat ? "beat" : "lost to"} ${c.rival.d.name}` : "") + "\n" + "🏠".repeat(Math.min(b, 15)), "Blackout Blitz");
  }

  // ---------- hands-on scenes: shared bits ----------
  // Each puzzle draws inside a dark "night" panel (.bz-scene) that takes its colours from the current look.
  const STAR_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 16.8 6.6 19.7l1.1-6.1L3.2 9.4l6.1-.8z"/></svg>`;
  const starsEl = (n, pop) => h("div", { class:"bz-stat bz-stars" + (pop ? " pop" : ""), role:"img", "aria-label":`${n} of 3 stars` },
    [0, 1, 2].map(i => h("span", { class:"bz-star" + (i < n ? " on" : ""), html:STAR_SVG })));
  const stat = (big, small, attrs) => h("div", { class:"bz-stat", ...(attrs || {}) }, h("b", {}, big), h("small", {}, small));
  const sbtn = (text, cls, fn, attrs) => btn(text, "bz-sbtn" + (cls ? " " + cls : ""), fn, attrs);
  const capStars = (c, n) => c.hinted ? Math.min(n, 2) : n;   // using a hint caps the level at 2 stars
  const buzz = (ms) => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch {} };

  // ---------- Blackout (Lights Out): built by pressing random windows from all-off, so it can always be solved ----------
  // Four wirings. Each one changes what a tap does; the house and the goal stay the same.
  const PLUS = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
  const RULES = [
    { id:"plus", name:"Plus wiring", short:"Plus", m:2, off:PLUS,
      intro:"It's 11 pm and this house is visible from space. Tap a window to flip it and the ones above, below and beside it. Get them all off." },
    { id:"cross", name:"Cross wiring", short:"Cross", m:2, off:[[0, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]],
      intro:"Lab Dad rewired this house. A tap flips the window and its four diagonal neighbours. Not the ones beside it. Diagonals." },
    { id:"wrap", name:"Wraparound", short:"Wrap", m:2, wrap:true, off:PLUS,
      intro:"Wraparound wiring. A neighbour past the edge comes back on the far side, like walking off an old arcade screen." },
    { id:"dim", name:"Dimmers", short:"Dimmer", m:3, off:PLUS,
      intro:"Dimmer switches. Each tap steps a light from bright to dim to off, then back to bright. Its neighbours step too." },
  ];
  // the highest wiring you may play: each one opens when you finish the one before it
  const lightsOpen = (s) => Math.min(RULES.length - 1, RULES.filter(R => (s.lightRules || {})[R.id]).length);
  function lightsBoard(R, n, k, rand){
    const press = (g, i) => { const r = Math.floor(i / n), q = i % n;
      R.off.forEach(([dr, dq]) => { let rr = r + dr, qq = q + dq;
        if (R.wrap) { rr = (rr + n) % n; qq = (qq + n) % n; }
        if (rr >= 0 && rr < n && qq >= 0 && qq < n) { const j = rr * n + qq; g[j] = (g[j] + R.m - 1) % R.m; } }); };
    let g, picks;
    do { g = Array(n * n).fill(0); picks = shuffleR([...Array(n * n).keys()], rand).slice(0, k); picks.forEach(i => press(g, i)); } while (!g.some(Boolean));
    // need[i] = taps window i still needs; it doubles as the hint list (pressing any window m times changes nothing)
    const need = Array(n * n).fill(0); picks.forEach(i => { need[i] = R.m - 1; });
    return { grid:g, need, par:picks.length * (R.m - 1), press, first:{ grid:g.slice(), need:need.slice() } };
  }
  function initLights(){
    const s = S(), mode = ctx.mode;
    let rand = Math.random, level = 0;
    if (mode === "hands") level = Math.min(ctx.level ?? lightsOpen(s), lightsOpen(s));
    if (mode === "daily") { ctx.no = safeNo(); rand = seeded(ctx.no * 4241 + 7); level = ctx.no % RULES.length; }
    const R = RULES[level];
    const n = mode === "blitz" || mode === "escape" || (mode !== "daily" && !s.handsDone.includes("lights")) ? 3 : 4;
    const k = mode === "blitz" ? 3 : R.m === 3 ? (n === 3 ? 3 : 4) : n === 3 ? 4 : 6;
    Object.assign(ctx, { level, R, n, k, rand, past:[], hint:-1, say:R.intro }, lightsBoard(R, n, k, rand));
    if (mode === "blitz") { ctx.blitz = { boards:0, end:0 }; ctx.say = "Blitz. Sixty seconds, as many houses as you can black out. The clock starts on your first tap."; }
    if (mode === "daily") {
      const d = dailyDone("lights");
      ctx.say = `Tonight's house: ${R.name.toLowerCase()}. Same house for everyone. ` + R.intro;
      if (d) Object.assign(ctx, { won:true, stars:d.stars, moves:d.moves, hinted:d.hinted, grid:ctx.grid.map(() => 0), say:`Tonight's house is dark. ${d.moves} taps, par ${d.par}. A new one at midnight.` });
    }
  }
  const lightStars = (c) => capStars(c, c.moves <= c.par ? 3 : c.moves <= c.par + 2 ? 2 : 1);
  function blitzEnd(c){
    if (c.won) return;
    clearInterval(c.iv); c.won = true;
    const s = S(), b = c.blitz.boards, pb = b > (s.blitzBest || 0);
    if (pb) s.blitzBest = b;
    c.stars = b >= 10 ? 3 : b >= 6 ? 2 : b >= 1 ? 1 : 0;
    const beat = settleRival(c);
    ping("blitz_done");
    const extra = b ? award(Math.min(150, b * 10) + (beat ? 15 : 0), { hands:"lights", keepStreak:true }) : "";
    c.say = [b ? `Time! ${b} house${b === 1 ? "" : "s"} blacked out.` : "Time! Not one house dark. The hydro company sends its thanks.", pb && b ? "New best." : `Your best is ${s.blitzBest || 0}.`, beat ? "+15 for beating Dad." : "", extra].filter(Boolean).join(" ");
    sfx(b ? "win" : "lose"); buzz([40, 40, 40]); save();
    renderHands(); focusFirst(".bz-focus");
  }
  function drawLights(){
    const c = ctx, n = c.n, R = c.R, s = S(), total = n * n, blitz = c.mode === "blitz";
    const lit = c.grid.reduce((a, v) => a + (v ? v / (R.m - 1) : 0), 0);
    const flip = (i) => { c.press(c.grid, i); c.need[i] = (c.need[i] + R.m - 1) % R.m; c.hint = -1; };
    const unflip = (i) => { for (let k = 1; k < R.m; k++) c.press(c.grid, i); c.need[i] = (c.need[i] + 1) % R.m; c.hint = -1; };
    const tap = (i) => {
      if (c.won) return;
      if (blitz && !c.blitz.end) startBlitzClock(c);
      flip(i); c.past.push(i); c.moves = c.past.length; sfx(R.m === 3 && c.grid[i] === 1 ? "dim" : "flip");
      if (!c.grid.some(Boolean)) {
        if (blitz) { c.blitz.boards++; sfx("coin"); buzz(25);
          Object.assign(c, lightsBoard(R, n, c.k, c.rand), { past:[], moves:0, hint:-1 });
          c.say = pick(["Dark! Next house.", "Another one bites the dust. Next.", "Lights out. Keep going.", "Boom. Next house, go go go."]); return renderHands(); }
        const st = lightStars(c);
        if (c.mode === "hands") { s.lightRules ||= {}; s.lightRules[R.id] = Math.max(s.lightRules[R.id] || 0, st); }
        return handsWon(st, c.moves <= c.par ? `Blackout in ${c.moves} taps. The meter and I both thank you.` : `Dark at last. ${c.moves} taps, but who's counting. Me. I am.`); }
      if (!blitz) c.say = c.moves > c.par ? `Par was ${c.par}. I'm not mad, I'm just counting.` : "I've seen the hydro bill. Keep going.";
      renderHands(); };
    const cat = n + (n - 2), gamer = total - n - 1;
    const win = (v, i) => { const on = v > 0, dim = R.m === 3 && v === 1;
      return btn("", "bz-win" + (on ? " on" : "") + (dim ? " dim" : "") + (c.hint === i ? " hint" : ""), () => tap(i),
      { "aria-label":`Window ${Math.floor(i / n) + 1}-${i % n + 1}, light ${dim ? "dim" : on ? "on" : "off"}`, "aria-pressed":String(on), disabled:c.won, "data-fk":"w" + i,
        html: on && i === cat ? `<svg viewBox="0 0 57 57" aria-hidden="true"><path d="M15 57V42q0-9 7-12l-2-11 8 6h4l8-6-2 11q7 3 7 12v15z"/></svg>`
          : on && i === gamer ? `<svg viewBox="0 0 57 57" aria-hidden="true"><circle cx="28" cy="30" r="9"/><path d="M17 31a11 11 0 0122 0" style="fill:none;stroke:var(--n-sil);stroke-width:3"/><path d="M8 57q0-14 20-14t20 14z"/></svg>` : "" }); };
    const deg = Math.round(-60 + (lit / total) * 120);
    const left = blitz ? (c.won ? 0 : c.blitz.end ? Math.max(0, c.blitz.end - Date.now()) : 60000) : 0;
    const clock = h("b", { class:"bz-clock" }, (left / 1000).toFixed(1));
    if (blitz) c.clockEl = clock;
    // the wiring picker, plus the Blitz door, in the normal game only
    const top = lightsOpen(s);
    const levels = c.mode !== "hands" && !blitz ? null : h("div", { class:"bz-levels five", role:"group", "aria-label":"Choose a wiring" },
      RULES.map((X, i) => { const got = (s.lightRules || {})[X.id] || 0, on = !blitz && i === c.level;
        return btn("", "bz-lvl" + (on ? " on" : ""), () => startHands("lights", { mode:"hands", level:i }),
          { disabled:i > top, ...(on ? { "aria-current":"true" } : {}), "data-fk":"lvl" + i,
            "aria-label":`${X.name}` + (i > top ? ", locked. Finish the one before it first" : got ? `, best ${got} of 3 stars` : ""),
            html:`<b>${X.short}</b><small aria-hidden="true">${i > top ? "locked" : got ? "★".repeat(got) + "☆".repeat(3 - got) : "new"}</small>` }); }),
      btn("", "bz-lvl blitz" + (blitz ? " on" : ""), () => startHands("lights", { mode:"blitz" }),
        { ...(blitz ? { "aria-current":"true" } : {}), "data-fk":"lvlb", "aria-label":`Blitz: 60 seconds, as many houses as you can. Best ${s.blitzBest || 0}`,
          html:`<b>Blitz</b><small aria-hidden="true">best ${s.blitzBest || 0}</small>` }));
    return [
      levels,
      blitz ? h("div", { class:"bz-hud" }, h("div", { class:"bz-stat" + (left && left < 10000 ? " hot" : "") }, clock, h("small", {}, "Seconds left")),
          stat(String(c.blitz.boards), "Houses dark"), stat(String(Math.max(s.blitzBest || 0, c.won ? c.blitz.boards : 0)), "Your best"))
        : h("div", { class:"bz-hud" },
          h("div", { class:"bz-stat bz-meter" },
            h("span", { html:`<svg viewBox="0 0 44 44" role="img" aria-label="Hydro meter"><circle cx="22" cy="24" r="17" style="fill:var(--n-sky);stroke:var(--n-dim);stroke-width:2"/><path d="M9 24a13 13 0 0126 0" style="fill:none;stroke:var(--n-accent);stroke-width:3;stroke-linecap:round"/><path d="M22 24V12" style="stroke:var(--n-ink);stroke-width:2.4;stroke-linecap:round;transform-origin:22px 24px;transform:rotate(${deg}deg)"/><circle cx="22" cy="24" r="2.6" style="fill:var(--n-ink)"/></svg>` }),
            h("span", {}, h("b", {}, (lit * 0.3).toFixed(1) + " kW"), h("small", {}, "Hydro"))),
          stat(String(c.moves), `Taps · par ${c.par}`), starsEl(c.won ? c.stars : lightStars(c), c.won)),
      h("div", { class:"bz-house" },
        h("div", { class:"bz-sky", "aria-hidden":"true" }, h("i", { class:"bz-twinkle", style:`opacity:${(0.12 + 0.88 * ((total - lit) / total)).toFixed(2)}` }), h("i", { class:"bz-moon" })),
        h("div", { class:"bz-roof", "aria-hidden":"true", html:`<svg viewBox="0 0 350 84"><rect x="250" y="14" width="30" height="50" style="fill:var(--n-chimney)"/><rect x="245" y="8" width="40" height="10" style="fill:var(--n-roof)"/><path d="M175 4L346 84H4z" style="fill:var(--n-roof);stroke:var(--n-roof-edge);stroke-width:3;stroke-linejoin:round"/></svg>` }),
        h("div", { class:"bz-wall", style:`grid-template-columns:repeat(${n}, 1fr)` }, c.grid.map(win)),
        h("div", { class:"bz-ground", "aria-hidden":"true" })),
      R.id !== "plus" && !c.won ? h("p", { class:"bz-rule" }, R.id === "cross" ? "Cross wiring: a tap flips the window and its 4 diagonal neighbours." : R.id === "wrap" ? "Wraparound: neighbours past an edge wrap to the far side." : "Dimmers: bright → dim → off → bright. Neighbours step too.") : null,
      c.won ? null : h("div", { class:"bz-ctl" },
        sbtn("Undo", "", () => { if (!c.past.length) return; unflip(c.past.pop()); c.moves = c.past.length; c.say = "Undone. I saw nothing."; sfx("tap"); renderHands(); }, { disabled:!c.past.length, "data-fk":"undo" }),
        sbtn("Hint", "hintb", () => { const next = c.need.findIndex(x => x > 0); if (next < 0) return; if (!blitz) c.hinted = true; c.hint = next;
          c.say = blitz ? "Tap the glowing window." : "Hint: tap the glowing window. A hint caps this one at 2 stars."; renderHands(); }, { "data-fk":"hint" }),
        blitz ? sbtn("Skip house", "", () => { Object.assign(c, lightsBoard(R, n, c.k, c.rand), { past:[], moves:0, hint:-1 }); c.say = "New house. That one didn't count."; renderHands(); }, { "data-fk":"skip" })
          : sbtn("Restart", "", () => { c.grid = c.first.grid.slice(); c.need = c.first.need.slice(); c.past = []; c.moves = 0; c.hint = -1; c.say = "Back to how you found it. Every light on, as usual."; renderHands(); }, { disabled:!c.past.length, "data-fk":"restart" })),
    ];
  }
  function startBlitzClock(c){
    c.blitz.end = Date.now() + 60000; let lastSec = 60;
    clearInterval(c.iv);
    c.iv = setInterval(() => {
      if (ctx !== c || c.won) return clearInterval(c.iv);
      const left = c.blitz.end - Date.now();
      if (left <= 0) return blitzEnd(c);
      const sec = Math.ceil(left / 1000);
      if (sec !== lastSec) { lastSec = sec; if (sec <= 5) sfx("tick"); }
      if (c.clockEl && c.clockEl.isConnected) { c.clockEl.textContent = (left / 1000).toFixed(1); c.clockEl.parentElement.classList.toggle("hot", left < 10000); }
    }, 100);
  }

  // ---------- Crack Dad's Safe (Code Lock): a fresh code and clue set every time, checked so only one code fits ----------
  // Two ways to play: Deduce (notes on the door, then guesses) and Safecracker (no notes, just the safe's feedback).
  // 3 digits to start; 4 digits once you've cracked three safes. Every dad's safe holds his own piece of loot.
  const CODES = {};
  const codesOf = (len) => CODES[len] ||= (function grow(pre){ if (pre.length === len) return [pre];
    const out = []; for (let d = 0; d < 10; d++) if (!pre.includes(String(d))) out.push(...grow(pre + d)); return out; })("");
  const ALL_CODES = codesOf(3);
  const NUM = ["", "One digit is", "Two digits are", "Three digits are", "All four are"];
  const clueText = (A, B, len = 3) => A + B === 0 ? "Nothing is right" :
    [A ? `${A === len ? (len === 3 ? "All three are" : "All four are") : NUM[A]} right and in the right place` : "",
     B ? `${(B === len ? (len === 3 ? "All three are" : "All four are") : NUM[B]).toLowerCase()} right but in the wrong place` : ""].filter(Boolean).join(", and ").replace(/^./, m => m.toUpperCase());
  function score(code, guess){ let A = 0, B = 0; [...guess].forEach((d, i) => { if (code[i] === d) A++; else if (code.includes(d)) B++; }); return [A, B]; }
  const fitsClue = (s, [g, A, B]) => { const [x, y] = score(s, g); return x === A && y === B; };
  function makeLock(rand = Math.random, len = 3){
    const any = (a) => a[Math.floor(rand() * a.length)], ALL = codesOf(len), most = len === 3 ? 5 : 7;
    for (let attempt = 0; attempt < 200; attempt++) {
      const code = any(ALL), clues = []; let fits = ALL;
      while (fits.length > 1 && clues.length < most) {
        let best = null;
        for (let k = 0; k < 10; k++) {
          const g = any(ALL), [A, B] = score(code, g);
          if (g === code || A + B === len || clues.some(x => x[0] === g)) continue;   // never hand over all the digits
          const left = fits.filter(s => fitsClue(s, [g, A, B])).length;
          if (left < fits.length && (!best || left < best.left)) best = { clue:[g, A, B], left };
        }
        if (!best) break;
        clues.push(best.clue); fits = fits.filter(s => fitsClue(s, best.clue));
      }
      if (fits.length === 1 && clues.length >= 3) return { code, clues };
    }
    return len === 3 ? { code:"316", clues:[["210", 1, 0], ["902", 0, 0], ["362", 1, 1], ["493", 0, 1]] }   // hand-checked fallbacks
      : { code:"3175", clues:[["3029", 1, 0], ["4610", 0, 1], ["5813", 0, 2], ["7135", 2, 2], ["2468", 0, 0]] };
  }

  // the loot in each dad's safe
  const LOOT = {
    modern:{ name:"Dad's first flip phone", svg:`<rect x="32" y="6" width="56" height="56" rx="10" style="fill:var(--n-accent)"/><rect x="40" y="14" width="40" height="34" rx="4" style="fill:var(--n-accent-ink)"/><path d="M46 26h18M46 34h26" style="stroke:var(--n-accent);stroke-width:3;stroke-linecap:round"/><rect x="28" y="60" width="64" height="9" rx="4" style="fill:var(--n-dim)"/><rect x="32" y="67" width="56" height="58" rx="10" style="fill:var(--n-accent)"/>${[0, 1, 2, 3].map(r => [0, 1, 2].map(q => `<rect x="${42 + q * 13}" y="${76 + r * 11}" width="10" height="7" rx="2" style="fill:var(--n-accent-ink)"/>`).join("")).join("")}` },
    eighties:{ name:"Golden cartridge", svg:`<path d="M14 6h92a8 8 0 018 8v88h-14v24H20v-24H6V14a8 8 0 018-8z" style="fill:var(--n-accent)"/><rect x="24" y="20" width="72" height="50" rx="5" style="fill:var(--n-accent-ink)"/><path d="M36 36h48M36 46h32M36 56h40" style="stroke:var(--n-accent);stroke-width:4;stroke-linecap:round"/><path d="M34 84h52M34 94h52" style="stroke:var(--n-accent-ink);stroke-width:4;stroke-linecap:round;opacity:.55"/><path d="M30 112v10M42 112v10M54 112v10M66 112v10M78 112v10M90 112v10" style="stroke:var(--n-accent-ink);stroke-width:4;stroke-linecap:round"/>` },
    skater:{ name:"Signed skate deck", svg:`<rect x="42" y="4" width="36" height="124" rx="18" style="fill:var(--n-accent)"/><rect x="48" y="12" width="24" height="108" rx="12" style="fill:none;stroke:var(--n-accent-ink);stroke-width:2;opacity:.45"/><circle cx="36" cy="28" r="7" style="fill:var(--n-lit)"/><circle cx="84" cy="28" r="7" style="fill:var(--n-lit)"/><circle cx="36" cy="104" r="7" style="fill:var(--n-lit)"/><circle cx="84" cy="104" r="7" style="fill:var(--n-lit)"/><path d="M50 78q6-14 10-2t8-6 4 8" style="fill:none;stroke:var(--n-accent-ink);stroke-width:3.5;stroke-linecap:round;stroke-linejoin:round"/>` },
    gamer:{ name:"Platinum headset", svg:`<path d="M20 74V58a40 40 0 0180 0v16" style="fill:none;stroke:var(--n-accent);stroke-width:10;stroke-linecap:round"/><rect x="10" y="64" width="30" height="46" rx="12" style="fill:var(--n-accent)"/><rect x="80" y="64" width="30" height="46" rx="12" style="fill:var(--n-accent)"/><rect x="16" y="72" width="18" height="30" rx="8" style="fill:var(--n-accent-ink)"/><rect x="86" y="72" width="18" height="30" rx="8" style="fill:var(--n-accent-ink)"/><path d="M25 108q6 18 30 18" style="fill:none;stroke:var(--n-accent);stroke-width:5;stroke-linecap:round"/><circle cx="58" cy="126" r="5" style="fill:var(--n-lit)"/>` },
    coach:{ name:"Championship whistle", svg:`<path d="M60 8q36 0 36 30" style="fill:none;stroke:var(--n-lit);stroke-width:5;stroke-linecap:round"/><path d="M60 8q-30 0-30 40" style="fill:none;stroke:var(--n-lit);stroke-width:5;stroke-linecap:round"/><circle cx="54" cy="86" r="34" style="fill:var(--n-accent)"/><rect x="62" y="52" width="50" height="24" rx="6" style="fill:var(--n-accent)"/><rect x="100" y="56" width="12" height="16" rx="3" style="fill:var(--n-accent-ink)"/><circle cx="54" cy="86" r="14" style="fill:var(--n-accent-ink)"/><circle cx="54" cy="86" r="6" style="fill:var(--n-accent)"/>` },
    bookworm:{ name:"First-edition book", svg:`<rect x="18" y="10" width="84" height="112" rx="6" style="fill:var(--n-accent)"/><rect x="18" y="10" width="16" height="112" rx="4" style="fill:var(--n-accent-ink);opacity:.35"/><rect x="44" y="30" width="48" height="30" rx="3" style="fill:none;stroke:var(--n-accent-ink);stroke-width:3"/><path d="M52 42h32M56 50h24" style="stroke:var(--n-accent-ink);stroke-width:3;stroke-linecap:round"/><path d="M50 84h36M50 94h28" style="stroke:var(--n-accent-ink);stroke-width:3;stroke-linecap:round;opacity:.5"/><path d="M84 10v36l8-7 8 7V10" style="fill:var(--n-lit)"/>` },
    labdad:{ name:"Glowing flask", svg:`<path d="M48 8h24M52 8v38L18 112a8 8 0 007 12h70a8 8 0 007-12L68 46V8" style="fill:var(--n-card);stroke:var(--n-accent);stroke-width:5;stroke-linejoin:round"/><path d="M33 86h54l15 26a8 8 0 01-7 12H25a8 8 0 01-7-12z" style="fill:var(--n-lit)"/><circle cx="50" cy="100" r="5" style="fill:var(--n-off);opacity:.35"/><circle cx="68" cy="108" r="3.5" style="fill:var(--n-off);opacity:.35"/><circle cx="60" cy="68" r="4" style="fill:var(--n-lit)"/><circle cx="66" cy="54" r="2.5" style="fill:var(--n-lit)"/>` },
    professor:{ name:"Golden calculator", svg:`<rect x="20" y="6" width="80" height="120" rx="10" style="fill:var(--n-accent)"/><rect x="30" y="16" width="60" height="26" rx="4" style="fill:var(--n-accent-ink)"/><text x="84" y="35" text-anchor="end" font-family="ui-monospace,monospace" font-weight="900" font-size="16" style="fill:var(--n-lit)">3.14</text>${[0, 1, 2, 3].map(r => [0, 1, 2].map(q => `<rect x="${30 + q * 22}" y="${52 + r * 18}" width="16" height="12" rx="3" style="fill:var(--n-accent-ink)"/>`).join("")).join("")}` },
    grandpa:{ name:"Grandpa's pocket watch", svg:`<path d="M60 22q-46-6-50 30" style="fill:none;stroke:var(--n-lit);stroke-width:4;stroke-dasharray:6 4;stroke-linecap:round"/><rect x="53" y="10" width="14" height="14" rx="3" style="fill:var(--n-accent)"/><circle cx="60" cy="74" r="48" style="fill:var(--n-accent)"/><circle cx="60" cy="74" r="38" style="fill:var(--n-off)"/>${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => `<circle cx="${(60 + 31 * Math.sin(i * Math.PI / 6)).toFixed(1)}" cy="${(74 - 31 * Math.cos(i * Math.PI / 6)).toFixed(1)}" r="${i % 3 ? 2 : 3.5}" style="fill:var(--n-accent)"/>`).join("")}<path d="M60 74V50M60 74l16 10" style="stroke:var(--n-ink);stroke-width:4;stroke-linecap:round"/><circle cx="60" cy="74" r="4" style="fill:var(--n-accent)"/>` },
  };
  const lootSVG = (id, label) => `<svg viewBox="0 0 120 132" ${label ? `role="img" aria-label="${label}"` : 'aria-hidden="true"'}>${LOOT[id].svg}</svg>`;
  // what you're playing: kept between visits; 4 digits open after three cracked safes
  const lockPref = (s) => { const p = s.safePref || {}; const four = (s.safesCracked || 0) >= 3; return { mode:p.mode === "crack" ? "crack" : "deduce", len:four && p.len === 4 ? 4 : 3, four }; };
  const LOCK_MAX = { deduce3:6, deduce4:7, crack3:8, crack4:10 };
  function initLock(){
    const s = S(), pref = ctx.mode === "hands" ? lockPref(s) : { mode:"deduce", len:3 };
    const lockMode = pref.mode, len = pref.len, max = LOCK_MAX[lockMode + len];
    const owner = ctx.mode === "hands" ? DADS[rivalIdx("lock")] : ctx.mode === "daily" ? DADS[safeNo() % DADS.length] : DADS[1];
    const words = len === 3 ? "Three" : "Four";
    Object.assign(ctx, { lockMode, len, max, owner, dial:Array(len).fill(0), tries:[], crossed:new Set(), lost:false,
      say: lockMode === "crack"
        ? `${owner.name}'s safe. No notes this time: try a code and the safe tells you how close you got. ${words} digits, all different, ${max} tries.`
        : `${owner.name}'s safe. ${words} digits, all different. The notes on the door are all you get.` });
    if (ctx.mode !== "daily") { ctx.lock = lockMode === "crack" ? { code:pick(codesOf(len)), clues:[] } : makeLock(Math.random, len); return; }
    // Dad's Safe: the same code and clues for everyone today. Progress is kept, so closing it can't reroll the safe.
    const no = safeNo(), d = s.safeDay && s.safeDay.no === no ? s.safeDay : null;
    Object.assign(ctx, { no, lock:makeLock(seeded(no * 7919 + 13)) });
    if (!d) { ctx.say = `Today's safe belongs to ${owner.name}. Everyone gets the same code, and you get six tries. Three digits, all different.`; saveSafe(ctx); ping("safe_open"); return; }
    Object.assign(ctx, { tries:d.tries.map(t => t.slice()), crossed:new Set(d.crossed || []), hinted:!!d.hinted, lost:!!d.lost, won:!!d.won, stars:d.stars || 0 });
    ctx.say = d.won ? `You cracked today's safe in ${d.tries.length + 1}. A new one opens at midnight.`
      : d.lost ? `Today's safe beat you. The code was ${ctx.lock.code}. A new one opens at midnight.`
      : d.tries.length ? "Picking up where you left off. Same safe, same clues." : ctx.say;
  }
  function saveSafe(c){
    if (c.mode !== "daily") return;
    S().safeDay = { no:c.no, tries:c.tries, crossed:[...c.crossed], hinted:!!c.hinted, won:!!c.won, lost:!!c.lost, stars:c.stars || 0 }; save();
  }
  // days in a row counts days you finished the safe, won or lost. A missed day just starts it again, without a word.
  function finishSafe(c, won){
    const s = S(), st = (s.safeStats ||= { played:0, won:0, run:0, bestRun:0, last:0 });
    if (st.last === c.no) return;
    st.played++; if (won) st.won++;
    st.run = st.last === c.no - 1 ? st.run + 1 : 1; st.last = c.no; st.bestRun = Math.max(st.bestRun, st.run);
    saveSafe(c); ping(won ? "safe_win" : "safe_fail");
    countAllFour(s); save();
    if (won) bridge?.arcade?.(6);
  }
  function safeFoot(){
    const st = S().safeStats || {}, n = new Date(), mid = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1);
    const mins = Math.max(1, Math.ceil((mid - n) / 60000));
    return h("p", { class:"bz-foot" }, `Safes cracked: ${st.won || 0} of ${st.played || 0}` + (st.run > 1 ? ` · ${st.run} days in a row` : "")
      + ` · ${dailiesDone()} of 4 dailies done · Next safe in ${Math.floor(mins / 60)}h ${mins % 60}m`);
  }
  // a spoiler-free result for the group chat: one row per try, never the digits
  function shareSafe(c){
    const rows = c.tries.map(([, A, B]) => "🟢".repeat(A) + "🟡".repeat(B) + "⚫".repeat(c.len - A - B));
    if (c.won) rows.push("🟢".repeat(c.len));
    const head = `🔐 Dad's Safe #${c.no} · ${c.won ? c.tries.length + 1 : "X"}/${c.max}`
      + (c.won ? " " + "★".repeat(c.stars) + "☆".repeat(3 - c.stars) : "") + (c.hinted ? " 💡" : "");
    ping("safe_share");
    const text = [head, ...rows].join("\n");
    if (bridge?.shareText) bridge.shareText(text, "Dad's Safe");
    else navigator.clipboard?.writeText(text).catch(() => {});
  }
  const LOCK_STARS = { deduce3:[2, 4], deduce4:[3, 5], crack3:[5, 6], crack4:[6, 8] };
  const lockStars = (c, used) => { const [a, b] = LOCK_STARS[c.lockMode + c.len]; return capStars(c, used <= a ? 3 : used <= b ? 2 : 1); };
  const pegs = (A, B, len = 3) => h("span", { class:"bz-pegs", "aria-hidden":"true" }, Array.from({ length:len }, (_, i) => h("i", { class:"bz-peg" + (i < A ? "" : i < A + B ? " ring" : " dash") })));
  const shortClue = (A, B) => A + B === 0 ? "Nothing is right" : [A ? `${A} in place` : "", B ? `${B} misplaced` : ""].filter(Boolean).join(", ");
  function lockPicker(c){
    if (c.mode !== "hands") return null;
    const s = S(), p = lockPref(s);
    const set = (k, v) => { s.safePref = { ...(s.safePref || {}), [k]:v }; save(); startHands("lock", { mode:"hands" }); };
    const seg = (label, on, fn, attrs) => btn("", "bz-lvl" + (on ? " on" : ""), fn, { ...(on ? { "aria-pressed":"true" } : { "aria-pressed":"false" }), ...attrs, html:label });
    const got = new Set(s.loot || []);
    return [h("div", { class:"bz-levels", role:"group", "aria-label":"How to play the safe" },
        seg(`<b>Deduce</b><small aria-hidden="true">notes</small>`, p.mode === "deduce", () => set("mode", "deduce"), { "data-fk":"m-d", "aria-label":"Deduce: notes on the door, then guesses" }),
        seg(`<b>Crack</b><small aria-hidden="true">no notes</small>`, p.mode === "crack", () => set("mode", "crack"), { "data-fk":"m-c", "aria-label":"Safecracker: no notes, just the safe's feedback" }),
        seg(`<b>3</b><small aria-hidden="true">digits</small>`, p.len === 3, () => set("len", 3), { "data-fk":"l-3", "aria-label":"Three digits" }),
        seg(`<b>4</b><small aria-hidden="true">${p.four ? "digits" : "locked"}</small>`, p.len === 4, () => set("len", 4),
          { "data-fk":"l-4", disabled:!p.four, "aria-label": p.four ? "Four digits" : `Four digits, locked. Crack ${3 - (s.safesCracked || 0)} more safe${3 - (s.safesCracked || 0) === 1 ? "" : "s"} first` })),
      h("div", { class:"bz-shelf", role:"img", "aria-label":`Loot shelf: ${got.size} of ${DADS.length} collected` },
        DADS.map(d => h("span", { class:"bz-shelfi" + (got.has(d.id) ? " got" : "") + (d === c.owner ? " now" : ""), title: got.has(d.id) ? LOOT[d.id].name : "Not cracked yet", html: lootSVG(d.id) })))];
  }
  function drawLock(){
    const c = ctx, len = c.len, used = c.tries.length + (c.won ? 1 : 0), over = c.won || c.lost, words = len === 3 ? "three" : "four";
    const hudRow = h("div", { class:"bz-hud" }, stat(`${used} / ${c.max}`, "Tries used"), starsEl(c.won ? c.stars : lockStars(c, used + 1), c.won), stat(c.won ? "Yours" : "Locked", "Loot"));
    const L = LOOT[c.owner.id];
    if (c.won) return [lockPicker(c), hudRow,
      h("div", { class:"bz-vault" },
        h("div", { class:"bz-loot", html:lootSVG(c.owner.id, L.name) }),
        h("b", {}, L.name), h("p", {}, `${c.owner.name}'s safe swings open. The code was ${c.lock.code}.` + (c.newLoot ? " New on your loot shelf!" : ""))), ].flat();
    const turn = (i, by) => () => { c.dial[i] = (c.dial[i] + by + 10) % 10; sfx("click"); renderHands(); };
    const dial = (i) => h("div", { class:"bz-tum" },
      btn("▲", "", turn(i, 1), { "aria-label":`Dial ${i + 1} up`, disabled:over, "data-fk":"u" + i }),
      h("span", { class:"bz-digit2", "aria-live":"polite", "aria-label":`Dial ${i + 1}: ${c.dial[i]}` }, String(c.dial[i])),
      btn("▼", "", turn(i, -1), { "aria-label":`Dial ${i + 1} down`, disabled:over, "data-fk":"d" + i }));
    const tryIt = () => {
      const g = c.dial.join("");
      if (new Set(g).size < len) { c.say = `All ${words} digits are different. Change one and try again.`; sfx("nope"); return renderHands(); }
      if (c.tries.some(t => t[0] === g)) { c.say = `You already tried ${g}. The safe hasn't changed its mind.`; sfx("nope"); return renderHands(); }
      if (g === c.lock.code) { const n = c.tries.length + 1, s = S();
        s.loot ||= []; c.newLoot = !s.loot.includes(c.owner.id); if (c.newLoot) s.loot.push(c.owner.id);
        return handsWon(lockStars(c, n), n <= 2 ? `Cracked in ${n}. Should I be worried about my wallet?` : `Open in ${n} tries. ${L.name} is now yours. Don't sell it.`); }
      const [A, B] = score(c.lock.code, g); c.tries.push([g, A, B]); sfx("nope");
      if (c.tries.length >= c.max) { c.lost = true; buzz(120); sfx("lose"); c.say = `${c.max} tries and it's still shut. The code was ${c.lock.code}. The safe and I are both disappointed.`;
        if (c.rival) { c.rival.done = true; c.rival.beat = false; c.rival.say = dadLine(c.rival.d, "lose", c.rival.txt); ping("rival_lose"); }
        if (c.mode === "daily") { c.say += " Same time tomorrow?"; finishSafe(c, false); } }
      else { c.say = c.tries.length === c.max - 1 ? "One try left. No pressure. Some pressure." : "Not it. But the safe just told you something. Read the row."; saveSafe(c); }
      renderHands();
    };
    const cols = c.max > 7 ? Math.ceil(c.max / 2) : c.max;
    return [lockPicker(c), hudRow,
      h("div", { class:"bz-safe" + (len === 4 ? " four" : "") },
        c.lock.clues.length ? h("ul", { class:"bz-notes", "aria-label":"Clues" }, c.lock.clues.map(([g, A, B]) =>
          h("li", { class:"bz-note", "aria-label":`${g.split("").join(" ")}: ${clueText(A, B, len)}` }, h("b", { "aria-hidden":"true" }, g), h("span", { "aria-hidden":"true" }, pegs(A, B, len), h("small", {}, shortClue(A, B)))))) 
          : h("p", { class:"bz-nonotes" }, "No notes on this door. Every try below is a clue: ● right digit, right place · ○ right digit, wrong place."),
        h("div", { class:"bz-dials" }, h("div", { class:"bz-tumblers" }, Array.from({ length:len }, (_, i) => dial(i))),
          h("span", { class:"bz-handle", "aria-hidden":"true", html:`<svg viewBox="0 0 84 84"><circle cx="42" cy="42" r="34" style="fill:none;stroke:var(--n-dim);stroke-width:6"/><path d="M42 8v68M8 42h68M18 18l48 48M66 18L18 66" style="stroke:var(--n-dim);stroke-width:5;stroke-linecap:round"/><circle cx="42" cy="42" r="12" style="fill:var(--n-accent)"/><circle cx="42" cy="42" r="4" style="fill:var(--n-accent-ink)"/></svg>` })),
        h("div", { class:"bz-pad", role:"group", "aria-label":"Scratchpad: cross out digits you have ruled out" }, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d =>
          btn(String(d), c.crossed.has(d) ? "x" : "", () => { if (c.crossed.has(d)) c.crossed.delete(d); else c.crossed.add(d); sfx("click"); saveSafe(c); renderHands(); },
            { "aria-pressed":String(c.crossed.has(d)), "aria-label":`${d}${c.crossed.has(d) ? ", crossed out" : ""}`, "data-fk":"p" + d }))),
        h("ol", { class:"bz-tries", style:`grid-template-columns:repeat(${cols}, 1fr)`, "aria-label":"Your tries" }, Array.from({ length:c.max }, (_, i) => { const t = c.tries[i];
          return h("li", { class:"bz-try" + (t ? " used" : ""), "aria-label": t ? `Try ${i + 1}: ${t[0]}, ${clueText(t[1], t[2], len)}` : `Try ${i + 1}: not used` }, t ? [h("span", { "aria-hidden":"true" }, t[0]), pegs(t[1], t[2], len)] : null); }))),
      c.lost ? null : h("div", { class:"bz-ctl" },
        sbtn("Hint", "hintb", () => { const free = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(d => !c.lock.code.includes(String(d)) && !c.crossed.has(d));
          if (!free.length) { c.say = "Every wrong digit is crossed out. The rest is on you."; return renderHands(); }
          c.hinted = true; c.crossed.add(free[0]); c.say = `Fine. ${free[0]} isn't in the code, so I crossed it out. A hint caps this one at 2 stars.`; saveSafe(c); renderHands(); }, { "data-fk":"hint" }),
        sbtn("Clear", "", () => { c.crossed.clear(); saveSafe(c); renderHands(); }, { disabled:!c.crossed.size, "data-fk":"clear" }),
        sbtn("Try code", "go", tryIt, { "data-fk":"try" })),
    ].flat();
  }

  // ---------- Crossings (River Run): a pack of four crossing puzzles that share one engine ----------
  // A level is: who has to cross (tokens), what a load may be (fits), what a trip costs, and what goes wrong (trouble).
  const CICON = {
    dog:`<svg viewBox="0 0 36 36" aria-hidden="true"><path d="M9 7C5 7 3 11 3 16c0 3 2 5 4 4l2-3v7a9 9 0 0018 0v-7l2 3c2 1 4-1 4-4 0-5-2-9-6-9z" style="fill:var(--n-lit)"/><circle cx="14" cy="17" r="1.9" style="fill:var(--n-off)"/><circle cx="22" cy="17" r="1.9" style="fill:var(--n-off)"/><ellipse cx="18" cy="23.5" rx="3.2" ry="2.3" style="fill:var(--n-off)"/></svg>`,
    cat:`<svg viewBox="0 0 36 36" aria-hidden="true"><path d="M6 4l6 7h12l6-7v16a12 12 0 01-24 0z" style="fill:var(--n-lit)"/><circle cx="13" cy="19" r="1.9" style="fill:var(--n-off)"/><circle cx="23" cy="19" r="1.9" style="fill:var(--n-off)"/><path d="M16.3 23h3.4l-1.7 2.2z" style="fill:var(--n-off)"/><path d="M3 22l6 1M3 26l6-1M33 22l-6 1M33 26l-6-1" style="stroke:var(--n-off);stroke-width:1.3;stroke-linecap:round"/></svg>`,
    pizza:`<svg viewBox="0 0 36 36" aria-hidden="true"><path d="M18 33L4 8a30 30 0 0128 0z" style="fill:var(--n-lit)"/><path d="M4 8a30 30 0 0128 0" style="fill:none;stroke:var(--n-sil);stroke-width:4;stroke-linecap:round"/><circle cx="14.5" cy="15" r="2.6" style="fill:var(--n-sil)"/><circle cx="21.5" cy="18" r="2.6" style="fill:var(--n-sil)"/><circle cx="17.5" cy="24" r="2.1" style="fill:var(--n-sil)"/></svg>`,
    dad:`<svg viewBox="0 0 36 36" aria-hidden="true"><path d="M18 3v5" style="stroke:var(--n-lit);stroke-width:2.4;stroke-linecap:round"/><circle cx="18" cy="3.5" r="2.4" style="fill:var(--n-lit)"/><rect x="6" y="8" width="24" height="24" rx="7" style="fill:var(--n-lit)"/><rect x="10" y="14" width="6" height="5" rx="2" style="fill:var(--n-off)"/><rect x="20" y="14" width="6" height="5" rx="2" style="fill:var(--n-off)"/><path d="M10.5 26q3.7-3.6 7.5 0 3.8-3.6 7.5 0-3.7 2.6-7.5.5-3.8 2.1-7.5-.500z" style="fill:var(--n-off)"/></svg>`,
    zombie:`<svg viewBox="0 0 36 36" aria-hidden="true"><path d="M6 13l4-6 3 4 5-6 5 6 3-4 4 6v12a7 7 0 01-7 7H13a7 7 0 01-7-7z" style="fill:var(--n-ink)"/><path d="M10.5 15l5 5M15.5 15l-5 5M20.5 15l5 5M25.5 15l-5 5" style="stroke:var(--n-off);stroke-width:2.2;stroke-linecap:round"/><path d="M11 27l2.3-2.5 2.4 2.5 2.3-2.5 2.3 2.5 2.4-2.5 2.3 2.5" style="fill:none;stroke:var(--n-off);stroke-width:2;stroke-linecap:round;stroke-linejoin:round"/></svg>`,
    kid:`<svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="21" r="10" style="fill:var(--n-lit)"/><path d="M8 17a10 10 0 0120 0h5v3H8z" style="fill:var(--n-sil)"/><circle cx="14.5" cy="22" r="1.7" style="fill:var(--n-off)"/><circle cx="21.5" cy="22" r="1.7" style="fill:var(--n-off)"/><path d="M14.5 26.500q3.5 2.5 7 0" style="fill:none;stroke:var(--n-off);stroke-width:1.8;stroke-linecap:round"/></svg>`,
  };
  const sideCount = (L, pos, side, type) => L.tokens.filter(t => t.type === type && pos[t.id] === side).length;
  const CROSSINGS = [
    { id:"classic", name:"Dog, cat, pizza", seats:1, rower:true, par:7, unit:"Trips", far:"Far bank · the party", near:"Near bank · home",
      tokens:[{ id:"dog", type:"dog", label:"Dog" }, { id:"cat", type:"cat", label:"Cat" }, { id:"pizza", type:"pizza", label:"Pizza" }],
      intro:"Dog, cat, pizza. The boat fits me plus one. Never leave the dog alone with the cat or the pizza.",
      fits:(load) => load.length <= 1 ? "" : "The boat fits me plus one. Put one back.",
      cost:() => 1,
      // I'm wherever the boat is, so only the other bank can go wrong
      trouble:(pos, boat) => { const there = (k) => pos[k] === 1 - boat;
        return there("dog") && there("cat") ? { bad:["dog", "cat"], say:"You left the dog alone with the cat. The cat is now on the roof. Undo that." }
          : there("dog") && there("pizza") ? { bad:["dog", "pizza"], gone:"pizza", say:"You left the dog alone with the pizza. There is no more pizza. Undo that." } : null; },
      win:(n) => n <= 7 ? `Everyone across in ${n} trips, pizza intact. Textbook.` : `Everyone made it in ${n} trips. It can be done in 7, just saying.` },
    { id:"bridge", name:"The bridge at night", seats:2, par:17, limit:17, unit:"Minutes", bridge:true, far:"Far side · safe", near:"Near side · in the dark",
      tokens:[{ id:"m1", type:"mins", mins:1, label:"The sprinter, 1 minute" }, { id:"m2", type:"mins", mins:2, label:"Dad, 2 minutes" }, { id:"m5", type:"mins", mins:5, label:"Uncle, 5 minutes" }, { id:"m10", type:"mins", mins:10, label:"Grandpa, 10 minutes" }],
      intro:"Four of us, one rickety bridge, one flashlight with 17 minutes of battery. Two at most cross together, at the slower one's pace, and the flashlight has to come back each time.",
      fits:(load) => load.length <= 2 ? "" : "The bridge holds two at a time. Send one back.",
      empty:"Someone has to carry the flashlight. Pick who's walking.",
      cost:(load) => Math.max(...load.map(t => t.mins)),
      trouble:() => null,
      late:(n, done) => done ? `Everyone's across, but that took ${n} minutes and the flashlight died at 17. There is a faster way. Undo and find it.`
        : `That's ${n} minutes gone. The flashlight died at 17 and someone is standing in the dark. Undo that.`,
      win:() => "Seventeen minutes on the dot. Most people swear it takes nineteen. You're not most people." },
    { id:"zombies", name:"Dads and zombies", seats:2, par:11, unit:"Trips", far:"Far bank · safe", near:"Near bank · not safe",
      tokens:[{ id:"d1", type:"dad", label:"Dad 1" }, { id:"d2", type:"dad", label:"Dad 2" }, { id:"d3", type:"dad", label:"Dad 3" }, { id:"z1", type:"zombie", label:"Zombie 1" }, { id:"z2", type:"zombie", label:"Zombie 2" }, { id:"z3", type:"zombie", label:"Zombie 3" }],
      intro:"Three dads, three zombies, one boat for two. Zombies can row, oddly. If zombies ever outnumber the dads on a bank, those dads are lunch.",
      fits:(load) => load.length <= 2 ? "" : "The boat holds two. Put one back.",
      empty:"The boat won't row itself. Put someone in it.",
      cost:() => 1,
      trouble(pos){ for (const side of [0, 1]) { const d = sideCount(this, pos, side, "dad"), z = sideCount(this, pos, side, "zombie");
        if (d && z > d) return { bad:this.tokens.filter(t => pos[t.id] === side).map(t => t.id), say:`${z} zombies, ${d === 1 ? "one dad" : d + " dads"} on the ${side ? "far" : "near"} bank. That's lunch. Undo that.` }; }
        return null; },
      win:(n) => n <= 11 ? `All six across in ${n} trips and nobody got eaten. I'm impressed, and slightly worried.` : `Everyone survived in ${n} trips. Eleven is possible, but alive is alive.` },
    { id:"gig", name:"Load-in at the gig", seats:2, par:9, unit:"Trips", far:"Far bank · the gig", near:"Near bank · the van",
      tokens:[{ id:"g1", type:"dad", wt:2, label:"Dad, heavy" }, { id:"g2", type:"dad", wt:2, label:"The drummer, heavy" }, { id:"k1", type:"kid", wt:1, label:"Roadie kid 1, light" }, { id:"k2", type:"kid", wt:1, label:"Roadie kid 2, light" }],
      intro:"My band has a gig across the river. The boat holds one grown-up or two kids, never more. Everyone can row.",
      fits:(load) => load.reduce((n, t) => n + t.wt, 0) <= 2 ? "" : "Too heavy. One grown-up or two kids, that's the boat's limit.",
      empty:"The boat won't row itself. Put someone in it.",
      cost:() => 1,
      trouble:() => null,
      win:(n) => n <= 9 ? `Whole band across in ${n} trips. The kids did most of the rowing. As it should be.` : `We made the gig in ${n} trips. Nine would have left time for a soundcheck.` },
  ];
  // cheapest way home from any position (Dijkstra; at most 128 positions). Returns { load:[ids], total } or null if there's no way.
  function crossNext(L, pos, boat){
    const ids = L.tokens.map(t => t.id), key = (p, b) => ids.map(i => p[i]).join("") + b;
    const best = new Map([[key(pos, boat), 0]]), open = [{ p:pos, b:boat, cost:0, first:null }];
    while (open.length) {
      open.sort((x, y) => x.cost - y.cost); const n = open.shift();
      if (n.cost > best.get(key(n.p, n.b))) continue;
      if (ids.every(i => n.p[i] === 1)) return { load:n.first || [], total:n.cost };
      const here = L.tokens.filter(t => n.p[t.id] === n.b), loads = L.rower ? [[]] : [];
      here.forEach((a, i) => { loads.push([a]); if (L.seats > 1) here.slice(i + 1).forEach(b2 => loads.push([a, b2])); });
      for (const load of loads) {
        if (L.fits(load)) continue;
        const p = { ...n.p }, b = 1 - n.b; load.forEach(t => { p[t.id] = b; });
        if (L.trouble(p, b)) continue;
        const cost = n.cost + (load.length ? L.cost(load) : 1), k = key(p, b);
        if (best.has(k) && best.get(k) <= cost) continue;
        best.set(k, cost); open.push({ p, b, cost, first: n.first || load.map(t => t.id) });
      }
    }
    return null;
  }
  const crossOpen = (s) => Math.min(CROSSINGS.length - 1, CROSSINGS.filter(L => (s.crossStars || {})[L.id]).length);   // highest level you may play
  // Night Bridge: the daily crossing. Four walkers with new times every day; the battery lasts exactly as long as the fastest way over.
  function dailyBridge(no){
    const r = seeded(no * 3571 + 11), pool = [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15];
    const mins = shuffleR(pool, r).slice(0, 4).sort((a, b) => a - b), who = ["The sprinter", "Dad", "Uncle", "Grandpa"];
    const L = { ...CROSSINGS[1], id:"night", name:"Night Bridge", limit:99,
      tokens:mins.map((m, i) => ({ id:"m" + i, type:"mins", mins:m, label:`${who[i]}, ${m} minute${m === 1 ? "" : "s"}` })) };
    const best = crossNext(L, Object.fromEntries(L.tokens.map(t => [t.id, 0])), 0).total;
    return Object.assign(L, { par:best, limit:best,
      intro:`Tonight's bridge. Four of us take ${mins.join(", ")} minutes. Two at most cross together, at the slower one's pace, and the flashlight has to come back each time. The battery lasts ${best} minutes, exactly enough if you find the fastest way.`,
      late:(n, done) => done ? `Everyone's across, but that took ${n} minutes and the flashlight died at ${best}. There is a faster way. Undo and find it.`
        : `That's ${n} minutes gone. The flashlight died at ${best} and someone is standing in the dark. Undo that.`,
      win:() => `${best} minutes on the dot. Nobody left in the dark. Same bridge for everyone tonight, so go brag.` });
  }
  function initRiver(){
    const s = S(), top = crossOpen(s);
    const level = ctx.mode !== "hands" ? 0 : Math.min(ctx.level ?? top, top);
    let L = CROSSINGS[level];
    if (ctx.mode === "daily") { ctx.no = safeNo(); L = dailyBridge(ctx.no); }
    Object.assign(ctx, { level, L, par:L.par, pos:Object.fromEntries(L.tokens.map(t => [t.id, 0])), boat:0, load:[], used:0, fail:null, past:[], hint:null, slide:null, say:L.intro });
    const d = ctx.mode === "daily" ? dailyDone("river") : null;
    if (d) Object.assign(ctx, { won:true, stars:d.stars, used:d.used, hinted:d.hinted, pos:Object.fromEntries(L.tokens.map(t => [t.id, 1])), boat:1, say:`Everyone made it over tonight in ${d.used} minutes. A new bridge at midnight.` });
  }
  const riverStars = (c, L) => capStars(c, c.used <= L.par ? 3 : c.used <= L.par + 2 ? 2 : 1);
  function drawRiver(){
    const c = ctx, s = S(), L = c.L, live = !c.won && !c.fail, small = L.tokens.length > 3, sz = small ? " sm" : "";
    const loaded = (t) => c.load.includes(t.id);
    const face = (t) => t.type === "mins" ? `<span class="bz-mins" aria-hidden="true"><b>${t.mins}</b><small>min</small></span>` : CICON[t.type] + (t.wt ? `<i class="bz-wt" aria-hidden="true">${t.wt === 2 ? "heavy" : "light"}</i>` : "");
    const token = (t, onBoat) => btn("", "bz-tok" + sz + (c.fail && c.fail.bad.includes(t.id) ? " flag" : "") + (live && c.hint && c.hint.includes(t.id) && !onBoat ? " hint" : "") + (c.fail && c.fail.gone === t.id ? " gone" : ""), () => {
      if (!live) return; c.hint = null;
      if (onBoat) c.load = c.load.filter(id => id !== t.id);
      else if (c.pos[t.id] !== c.boat) c.say = L.bridge ? "The flashlight is on the other side. Nobody walks that bridge in the dark." : "The boat is on the other bank. Nobody's swimming.";
      else { const why = L.fits(L.tokens.filter(x => loaded(x) || x === t)); if (why) { c.say = why; sfx("nope"); } else c.load.push(t.id); }
      sfx("tap"); renderHands();
    }, { html:face(t), "data-fk":"t-" + t.id, "aria-label": onBoat ? `${t.label}, ${L.bridge ? "about to cross" : "in the boat"}. Tap to take back` : `${t.label}, on the ${c.pos[t.id] ? "far" : "near"} side` + (c.pos[t.id] === c.boat ? `. Tap to ${L.bridge ? "send across" : "load into the boat"}` : "") });
    const slotCls = "bz-slot" + sz;
    const bank = (side) => h("div", { class:"bz-bank2" }, h("small", {}, side ? L.far : L.near),
      h("div", { class:"bz-slots" + (L.tokens.length > 4 ? " six" : small ? " many" : "") }, L.tokens.map(t => c.pos[t.id] === side && !loaded(t) ? h("span", { class:slotCls }, token(t, false)) : h("span", { class:slotCls + " empty", "aria-hidden":"true" }))));
    const cross = () => {
      if (!live) return;
      const load = L.tokens.filter(loaded);
      if (!load.length && !L.rower) { c.say = L.empty; return renderHands(); }
      c.past.push({ pos:{ ...c.pos }, boat:c.boat, used:c.used });
      const from = c.boat; load.forEach(t => { c.pos[t.id] = 1 - from; });
      c.boat = 1 - from; c.used += load.length ? L.cost(load) : 1; c.load = []; c.hint = null; c.slide = from;
      const done = L.tokens.every(t => c.pos[t.id] === 1);
      const bad = L.trouble(c.pos, c.boat) || (L.limit && c.used > L.limit ? { bad:[], say:L.late(c.used, done) } : null);
      if (bad) { c.fail = bad; c.say = bad.say; buzz(120); sfx("nope"); return renderHands(); }
      sfx("row");
      if (done) { const st = riverStars(c, L);
        if (c.mode === "hands") { s.crossStars ||= {}; s.crossStars[L.id] = Math.max(s.crossStars[L.id] || 0, st); }
        return handsWon(st, L.win(c.used)); }
      c.say = L.limit ? `${c.used} of ${L.limit} minutes used. The battery is not getting any younger.`
        : pick(["Made it across. Think about who gets left behind.", "Rowing, rowing. Robot arms, but still.", "Across. Who's next?"]);
      renderHands();
    };
    const undo = () => { const p = c.past.pop(); if (!p) return; Object.assign(c, { pos:p.pos, boat:p.boat, used:p.used, load:[], fail:null, hint:null, slide:null }); c.say = "Trip undone. We never speak of it."; sfx("tap"); renderHands(); };
    const hint = () => {
      const next = crossNext(L, c.pos, c.boat);
      if (!next || (L.limit && c.used + next.total > L.limit)) { c.say = L.limit ? "From here the battery can't last. Undo a trip or two, then ask me again." : "No way home from here. Undo a trip, then ask me again."; return renderHands(); }
      c.hinted = true; c.hint = next.load; c.load = c.load.filter(id => next.load.includes(id));
      const names = next.load.map(id => L.tokens.find(t => t.id === id).label.split(",")[0].toLowerCase());
      c.say = (names.length ? `Hint: send ${names.join(" and ")} across.` : "Hint: row back with an empty boat.") + " A hint caps this one at 2 stars."; renderHands();
    };
    // draw the boat where it was, then let it glide to where it is now
    const startAt = c.slide == null ? c.boat : c.slide; c.slide = null;
    const seats = Array.from({ length:L.seats }, (_, i) => { const t = L.tokens.filter(loaded)[i]; return t ? h("span", { class:slotCls }, token(t, true)) : h("span", { class:slotCls + " empty", "aria-hidden":"true" }); });
    const boat = h("div", { class:"bz-boat2" + (startAt ? "" : " near") },
      h("span", { class:"bz-hull", "aria-hidden":"true", html: L.bridge
        ? `<svg viewBox="0 0 184 84"><ellipse cx="92" cy="42" rx="88" ry="40" style="fill:var(--n-lit);opacity:.16"/><ellipse cx="92" cy="42" rx="60" ry="30" style="fill:var(--n-lit);opacity:.14"/></svg>`
        : `<svg viewBox="0 0 184 84"><path d="M6 20h172q0 44-30 58H36Q6 64 6 20z" style="fill:var(--n-roof);stroke:var(--n-roof-edge);stroke-width:3;stroke-linejoin:round"/><path d="M20 34h144" style="stroke:var(--n-roof-edge);stroke-width:3;stroke-linecap:round"/></svg>` }),
      h("div", { class:"bz-crew" }, L.rower ? dadSVG("gamer") : null,
        L.bridge ? h("span", { class:"bz-torch", "aria-hidden":"true", html:`<svg viewBox="0 0 24 24"><path d="M8 3h8l-1.5 6v10a2.5 2.5 0 01-5 0V9z" style="fill:var(--n-ink)"/><path d="M8 3h8" style="stroke:var(--n-lit);stroke-width:3;stroke-linecap:round"/></svg>` }) : null, seats));
    if (startAt !== c.boat) requestAnimationFrame(() => requestAnimationFrame(() => boat.classList.toggle("near", !c.boat)));
    const top = crossOpen(s);
    return [
      c.mode !== "hands" ? null : h("div", { class:"bz-levels", role:"group", "aria-label":"Choose a crossing" }, CROSSINGS.map((X, i) => {
        const got = (s.crossStars || {})[X.id] || 0;
        return btn("", "bz-lvl" + (i === c.level ? " on" : ""), () => startHands("river", { mode:"hands", level:i }),
          { disabled:i > top, ...(i === c.level ? { "aria-current":"true" } : {}), "data-fk":"lvl" + i,
            "aria-label":`Crossing ${i + 1}: ${X.name}` + (i > top ? ", locked. Finish the one before it first" : got ? `, best ${got} of 3 stars` : ""),
            html:`<b>${i + 1}</b><small aria-hidden="true">${i > top ? "locked" : got ? "★".repeat(got) + "☆".repeat(3 - got) : "new"}</small>` }); })),
      h("div", { class:"bz-hud" }, stat(L.limit ? `${c.used} / ${L.limit}` : String(c.used), L.limit ? "Minutes of battery" : `Trips · par ${L.par}`), starsEl(c.won ? c.stars : riverStars(c, L), c.won),
        stat(L.name, c.mode === "hands" ? `Crossing ${c.level + 1} of ${CROSSINGS.length}` : "Crossing", { class:"bz-stat bz-lname" })),
      h("div", { class:"bz-cross" + (L.bridge ? " bridge" : "") }, bank(1),
        h("div", { class:"bz-river2" }, h("span", { "aria-hidden":"true", html: L.bridge
          ? `<svg class="bz-waves" viewBox="0 0 318 186" preserveAspectRatio="none"><path d="M96 0v186M222 0v186" style="stroke:var(--n-roof-edge);stroke-width:4"/><path d="M96 14h126M96 40h126M96 66h126M96 92h126M96 118h126M96 144h126M96 170h126" style="stroke:var(--n-roof);stroke-width:12"/></svg>`
          : `<svg class="bz-waves" viewBox="0 0 318 186" preserveAspectRatio="none"><path d="M10 34q12-8 24 0t24 0M200 52q12-8 24 0t24 0M60 96q12-8 24 0t24 0M236 118q12-8 24 0t24 0M24 152q12-8 24 0t24 0M150 160q12-8 24 0t24 0" style="fill:none;stroke:var(--n-wave);stroke-width:2.5;stroke-linecap:round"/></svg>` }), boat),
        bank(0)),
      c.won ? null : c.fail ? h("div", { class:"bz-ctl two" }, sbtn("Undo that trip", "go", undo, { "data-fk":"undo" }))
        : h("div", { class:"bz-ctl" },
          sbtn("Undo", "", undo, { disabled:!c.past.length, "data-fk":"undo" }),
          sbtn("Hint", "hintb", hint, { "data-fk":"hint" }),
          sbtn("Cross", "go", cross, { "data-fk":"cross" })),
    ];
  }

  // ---------- Scramble (Slide Tiles): a picture cut into 8 tiles, shuffled with legal moves so it can always be solved ----------
  const PIC = `<rect x="0" y="0" width="300" height="300" style="fill:var(--n-off)"/><rect x="0" y="274" width="300" height="26" style="fill:var(--n-line)"/><rect x="46" y="10" width="208" height="278" rx="12" stroke-width="4" style="fill:var(--n-card);stroke:var(--n-frame)"/><rect x="60" y="22" width="180" height="50" rx="8" style="fill:var(--n-accent)"/><path d="M82 34l3.8 7.8 8.6 1.2-6.2 6 1.5 8.500L82 53.400l-7.7 4.1 1.5-8.5-6.2-6 8.6-1.200z" style="fill:var(--n-accent-ink)"/><path d="M112 34v26h8a13 13 0 000-26zM146 60l9-26h4l9 26M150 52h14M184 34v26h8a13 13 0 000-26z" fill="none" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" style="stroke:var(--n-accent-ink)"/><circle cx="226" cy="47" r="7" style="fill:var(--n-accent-ink)"/><rect x="66" y="86" width="168" height="100" rx="8" stroke-width="4" style="fill:var(--n-off);stroke:var(--n-frame)"/><rect x="80" y="104" width="7" height="34" rx="3" style="fill:var(--n-lit)"/><rect x="213" y="134" width="7" height="34" rx="3" style="fill:var(--n-lit)"/><path d="M150 96v80" stroke-width="3" stroke-dasharray="6 8" style="stroke:var(--n-dim)"/><circle cx="128" cy="150" r="7" style="fill:var(--n-lit)"/><path d="M168 104h10v10h-10v10h10" fill="none" stroke-width="3" style="stroke:var(--n-lit)"/><rect x="46" y="198" width="208" height="40" style="fill:var(--n-line)"/><path d="M86 222v-18" stroke-width="5" stroke-linecap="round" style="stroke:var(--n-ink)"/><circle cx="86" cy="204" r="9" style="fill:var(--n-accent)"/><ellipse cx="86" cy="226" rx="14" ry="5" style="fill:var(--n-off)"/><circle cx="136" cy="220" r="9" style="fill:var(--n-lit)"/><circle cx="164" cy="212" r="9" style="fill:var(--n-hint)"/><rect x="212" y="206" width="24" height="26" rx="4" stroke-width="3" style="fill:var(--n-off);stroke:var(--n-accent)"/><path d="M224 212v14" stroke-width="3" stroke-linecap="round" style="stroke:var(--n-accent)"/><path d="M62 250h26M62 258h26M62 266h26" stroke-width="3" stroke-linecap="round" style="stroke:var(--n-frame)"/><rect x="112" y="248" width="76" height="28" rx="5" stroke-width="3" style="fill:var(--n-off);stroke:var(--n-frame)"/><circle cx="150" cy="262" r="4" style="fill:var(--n-dim)"/><path d="M212 250l26 16M212 258l26 16M212 266l14 8" stroke-width="3" stroke-linecap="round" style="stroke:var(--n-frame)"/>`;
  // more pictures, unlocked by solving Scrambles (at = wins needed). All drawn with the look's own colours.
  const PICS = [
    { id:"arcade", name:"Dad's arcade", short:"Arcade", at:0, svg:PIC },
    { id:"tape", name:"Dad's mixtape", short:"Mixtape", at:2, svg:`<rect width="300" height="300" style="fill:var(--n-off)"/><text x="150" y="38" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="900" font-size="20" letter-spacing="3" style="fill:var(--n-hint)">MIXTAPE '89</text><path d="M18 18l10 10M28 18l-10 10M272 264l10 10M282 264l-10 10" stroke-width="3" stroke-linecap="round" style="stroke:var(--n-lit)"/><rect x="22" y="56" width="256" height="190" rx="16" stroke-width="4" style="fill:var(--n-card);stroke:var(--n-frame)"/><g style="fill:var(--n-frame)"><circle cx="40" cy="74" r="5"/><circle cx="260" cy="74" r="5"/><circle cx="40" cy="228" r="5"/><circle cx="260" cy="228" r="5"/></g><rect x="50" y="72" width="200" height="74" rx="8" style="fill:var(--n-accent)"/><text x="64" y="104" font-family="system-ui,sans-serif" font-weight="900" font-size="24" style="fill:var(--n-accent-ink)">A</text><path d="M94 94h138M94 110h104M94 126h124" stroke-width="5" stroke-linecap="round" style="stroke:var(--n-accent-ink)"/><rect x="78" y="156" width="144" height="52" rx="26" stroke-width="4" style="fill:var(--n-off);stroke:var(--n-frame)"/><circle cx="108" cy="182" r="18" style="fill:var(--n-lit)"/><circle cx="192" cy="182" r="18" style="fill:var(--n-lit)"/><path d="M98 172l20 20M118 172l-20 20M182 172l20 20M202 172l-20 20" stroke-width="3" style="stroke:var(--n-sil)"/><circle cx="108" cy="182" r="6" style="fill:var(--n-off)"/><circle cx="192" cy="182" r="6" style="fill:var(--n-off)"/><path d="M126 196h48" stroke-width="4" style="stroke:var(--n-sil)"/><path d="M70 246l16-26h128l16 26z" style="fill:var(--n-line)"/><circle cx="112" cy="234" r="5" style="fill:var(--n-off)"/><circle cx="188" cy="234" r="5" style="fill:var(--n-off)"/><path d="M60 278h180" stroke-width="4" stroke-dasharray="2 12" stroke-linecap="round" style="stroke:var(--n-dim)"/>` },
    { id:"boombox", name:"Dad's boombox", short:"Boombox", at:4, svg:`<rect width="300" height="300" style="fill:var(--n-off)"/><text x="18" y="48" font-family="system-ui,sans-serif" font-size="34" style="fill:var(--n-lit)">♪</text><path d="M72 66V44a14 14 0 0114-14h128a14 14 0 0114 14v22" fill="none" stroke-width="10" stroke-linecap="round" style="stroke:var(--n-frame)"/><path d="M246 64L284 12" stroke-width="5" stroke-linecap="round" style="stroke:var(--n-dim)"/><circle cx="284" cy="12" r="6" style="fill:var(--n-dim)"/><rect x="12" y="64" width="276" height="180" rx="18" stroke-width="4" style="fill:var(--n-card);stroke:var(--n-frame)"/><rect x="26" y="76" width="248" height="22" rx="6" style="fill:var(--n-line)"/><rect x="114" y="80" width="14" height="14" rx="3" style="fill:var(--n-accent)"/><rect x="134" y="80" width="14" height="14" rx="3" style="fill:var(--n-lit)"/><rect x="154" y="80" width="14" height="14" rx="3" style="fill:var(--n-hint)"/><rect x="174" y="80" width="14" height="14" rx="3" style="fill:var(--n-dim)"/>${[78, 222].map(x => `<circle cx="${x}" cy="172" r="56" stroke-width="5" style="fill:var(--n-off);stroke:var(--n-frame)"/><circle cx="${x}" cy="172" r="40" fill="none" stroke-width="3" stroke-dasharray="4 6" style="stroke:var(--n-dim)"/><circle cx="${x}" cy="172" r="22" style="fill:var(--n-dim)"/><circle cx="${x}" cy="172" r="8" style="fill:var(--n-accent)"/>`).join("")}<rect x="122" y="118" width="56" height="40" rx="5" stroke-width="3" style="fill:var(--n-off);stroke:var(--n-frame)"/><circle cx="138" cy="138" r="7" style="fill:var(--n-lit)"/><circle cx="162" cy="138" r="7" style="fill:var(--n-lit)"/><rect x="122" y="172" width="56" height="10" rx="3" style="fill:var(--n-hint)"/><rect x="122" y="190" width="56" height="10" rx="3" style="fill:var(--n-accent)"/><path d="M128 220h44" stroke-dasharray="6 7" stroke-width="7" style="stroke:var(--n-lit)"/><rect x="0" y="256" width="300" height="44" style="fill:var(--n-line)"/><rect x="40" y="244" width="44" height="14" rx="4" style="fill:var(--n-frame)"/><rect x="216" y="244" width="44" height="14" rx="4" style="fill:var(--n-frame)"/><text x="248" y="294" font-family="system-ui,sans-serif" font-size="30" style="fill:var(--n-lit)">♫</text>` },
    { id:"car", name:"Dad's first car", short:"Car", at:7, svg:`<rect width="300" height="300" style="fill:var(--n-off)"/><g style="fill:var(--n-ink)"><circle cx="30" cy="30" r="2"/><circle cx="90" cy="18" r="1.6"/><circle cx="150" cy="44" r="2"/><circle cx="196" cy="22" r="1.6"/><circle cx="60" cy="80" r="1.6"/></g><circle cx="246" cy="56" r="28" style="fill:var(--n-lit)"/><circle cx="260" cy="46" r="24" style="fill:var(--n-off)"/><path d="M0 200q60-44 120-12t110-22 70 12V240H0z" style="fill:var(--n-line)"/><rect x="0" y="236" width="300" height="64" style="fill:var(--n-card)"/><path d="M12 276h40M92 276h40M172 276h40M252 276h40" stroke-width="6" stroke-linecap="round" style="stroke:var(--n-dim)"/><path d="M24 226v-36q0-10 10-12l40-8 34-40q8-10 22-10h70q14 0 22 12l26 38 26 6q12 3 12 16v34z" style="fill:var(--n-accent)"/><path d="M112 166l26-30h34v30z" style="fill:var(--n-sky)"/><path d="M184 136h22q8 0 12 6l18 24h-52z" style="fill:var(--n-sky)"/><path d="M34 204h244" stroke-width="6" style="stroke:var(--n-accent-ink)"/><path d="M178 172v48" stroke-width="3" style="stroke:var(--n-accent-ink);opacity:.5"/><rect x="266" y="184" width="14" height="10" rx="3" style="fill:var(--n-lit)"/><path d="M286 184l14-8v26z" style="fill:var(--n-lit);opacity:.4"/><rect x="24" y="186" width="10" height="12" rx="2" style="fill:var(--n-hint)"/>${[84, 222].map(x => `<circle cx="${x}" cy="228" r="28" style="fill:var(--n-off)"/><circle cx="${x}" cy="228" r="24" fill="none" stroke-width="8" style="stroke:var(--n-frame)"/><circle cx="${x}" cy="228" r="9" style="fill:var(--n-dim)"/>`).join("")}` },
    { id:"pad", name:"Dad's game pad", short:"Game pad", at:10, svg:`<rect width="300" height="300" style="fill:var(--n-off)"/><g style="fill:var(--n-line)"><rect x="18" y="18" width="18" height="18"/><rect x="40" y="40" width="18" height="18"/><rect x="18" y="62" width="18" height="18"/><rect x="246" y="262" width="18" height="18"/><rect x="266" y="240" width="18" height="18"/></g><path d="M150 96q0-30 30-40t24-44" fill="none" stroke-width="6" stroke-linecap="round" style="stroke:var(--n-frame)"/><path d="M70 96h160q50 0 56 60l6 62q4 40-30 40-20 0-38-36l-10-20H86l-10 20q-18 36-38 36-34 0-30-40l6-62q6-60 56-60z" stroke-width="4" style="fill:var(--n-card);stroke:var(--n-frame)"/><path d="M66 150h20v-20h20v20h20v20h-20v20h-20v-20h-20z" style="fill:var(--n-lit)"/><circle cx="228" cy="136" r="13" style="fill:var(--n-accent)"/><circle cx="252" cy="160" r="13" style="fill:var(--n-hint)"/><circle cx="204" cy="160" r="13" style="fill:var(--n-lit)"/><circle cx="228" cy="184" r="13" style="fill:var(--n-dim)"/><rect x="126" y="152" width="20" height="9" rx="4.5" style="fill:var(--n-dim)"/><rect x="154" y="152" width="20" height="9" rx="4.5" style="fill:var(--n-dim)"/><circle cx="150" cy="124" r="7" style="fill:var(--n-accent)"/>` },
  ];
  const picsOpen = (s) => PICS.reduce((top, P, i) => (s.tileWins || 0) >= P.at ? i : top, 0);
  const nbT = (i) => [i - 3, i + 3, i % 3 ? i - 1 : -1, i % 3 < 2 ? i + 1 : -1].filter(j => j >= 0 && j < 9);
  const HOME = "1,2,3,4,5,6,7,8,0";
  // shortest solution (IDA* with the taxicab distance): a list of board positions to tap, in order
  function solveTiles(start){
    const t = start.slice(), path = [];
    const man = () => { let d = 0; for (let i = 0; i < 9; i++) { const v = t[i]; if (v) { const g = v - 1; d += Math.abs(Math.floor(i / 3) - Math.floor(g / 3)) + Math.abs(i % 3 - g % 3); } } return d; };
    const dfs = (g, bound, z, prev) => { const m = man(), f = g + m; if (f > bound) return f; if (m === 0) return -1;
      let min = Infinity;
      for (const j of nbT(z)) { if (j === prev) continue;
        t[z] = t[j]; t[j] = 0; path.push(j);
        const r = dfs(g + 1, bound, j, z); if (r === -1) return -1; if (r < min) min = r;
        path.pop(); t[j] = t[z]; t[z] = 0; }
      return min; };
    for (let bound = man(); ;) { const r = dfs(0, bound, t.indexOf(0), -1); if (r === -1) return path.slice(); if (r === Infinity) return []; bound = r; }
  }
  const fmtTime = (ms) => { const t = Math.floor(ms / 100), m = Math.floor(t / 600), s = Math.floor((t % 600) / 10); return `${m}:${s < 10 ? "0" : ""}${s}.${t % 10}`; };
  function initTiles(){
    const s = S();
    let rand = Math.random, pic = 0;
    if (ctx.mode === "daily") { ctx.no = safeNo(); rand = seeded(ctx.no * 6007 + 3); pic = ctx.no % PICS.length; }
    else if (ctx.mode === "hands") pic = Math.min(ctx.pic ?? s.tilePic ?? 0, picsOpen(s));
    const P = PICS[pic];
    let t, last = -1;
    do { t = [1, 2, 3, 4, 5, 6, 7, 8, 0]; for (let k = 0; k < 60; k++) { const z = t.indexOf(0), opts = nbT(z).filter(j => j !== last); const j = opts[Math.floor(rand() * opts.length)]; [t[z], t[j]] = [t[j], t[z]]; last = z; } }
    while (t.join() === HOME);
    Object.assign(ctx, { pic, picName:P.name, tiles:t, first:t.slice(), par:solveTiles(t).length, past:[], t0:0, ms:0, hint:-1, pb:false, nums:!!s.tileNums,
      say: ctx.mode === "daily" ? `Tonight's Scramble: ${P.name}. Same shuffle for everyone. The clock starts on your first move.` : `Rebuild ${P.name}. Tap or swipe a tile into the gap. The clock starts on your first move.` });
    const d = ctx.mode === "daily" ? dailyDone("tiles") : null;
    if (d) Object.assign(ctx, { won:true, stars:d.stars, moves:d.moves, ms:d.ms, hinted:d.hinted, tiles:HOME.split(",").map(Number), say:`Tonight's Scramble is solved: ${fmtTime(d.ms)} in ${d.moves} moves. A new one at midnight.` });
  }
  const tileStars = (c) => capStars(c, c.moves <= c.par + 2 ? 3 : c.moves <= c.par + 10 ? 2 : 1);
  function drawTiles(){
    const c = ctx, z = c.tiles.indexOf(0), s = S(), P = PICS[c.pic];
    const pic = (v) => `<svg viewBox="0 0 300 300" aria-hidden="true" style="left:${-((v - 1) % 3) * 100}%;top:${-Math.floor((v - 1) / 3) * 100}%">${P.svg}</svg>`;
    const tap = (i, swiped) => {
      if (c.won || i === z) return;
      if (!swiped && Date.now() - (c.swipeAt || 0) < 400) return;   // the click that follows a swipe
      const zr = Math.floor(z / 3), zc = z % 3, r = Math.floor(i / 3), q = i % 3;
      if (r !== zr && q !== zc) { sfx("nope"); return; }
      const step = r === zr ? (q < zc ? -1 : 1) : (r < zr ? -3 : 3);
      c.past.push({ tiles:c.tiles.slice(), moves:c.moves });
      for (let g = z; g !== i; g += step) { c.tiles[g] = c.tiles[g + step]; c.tiles[g + step] = 0; c.moves++; }   // tapping further along slides the whole row
      c.hint = -1; if (!c.t0) c.t0 = Date.now(); sfx("slide");
      if (c.tiles.join() === HOME) { c.ms = Date.now() - c.t0; c.pb = !s.tileBest || c.ms < s.tileBest; if (c.pb) s.tileBest = c.ms;
        const before = picsOpen(s); s.tileWins = (s.tileWins || 0) + 1; const opened = picsOpen(s) > before ? PICS[picsOpen(s)] : null; save();
        return handsWon(tileStars(c), `Solved in ${fmtTime(c.ms)} and ${c.moves} moves.` + (c.pb ? " New personal best. Frame it." : c.moves > c.par + 10 ? " That was the scenic route, but it counts." : " Not bad at all.")
          + (opened ? ` New picture unlocked: ${opened.name}.` : "")); }
      c.say = "Clock is running. So is my patience. Mostly."; renderHands();
    };
    const timeEl = h("b", { class:"bz-clock" }, fmtTime(c.won ? c.ms : c.t0 ? Date.now() - c.t0 : 0));
    if (c.t0 && !c.won) { clearInterval(c.iv); c.iv = setInterval(() => { if (ctx !== c || c.won || !timeEl.isConnected) return clearInterval(c.iv); timeEl.textContent = fmtTime(Date.now() - c.t0); }, 100); }
    const puz = h("div", { class:"bz-puz" }, c.tiles.map((v, i) => { const show = v || (c.won ? 9 : 0);
      return !show ? h("span", { class:"bz-gap2", "aria-hidden":"true" })
        : h("button", { type:"button", class:"bz-pt" + (c.hint === i ? " hint" : ""), on:{ click:() => tap(i) }, disabled:c.won, "data-fk":"pt" + v, "data-i":String(i),
            "aria-label":`Tile ${show}, row ${Math.floor(i / 3) + 1}, column ${i % 3 + 1}` + (nbT(z).includes(i) ? ", next to the gap" : ""),
            html:pic(show) + (c.nums ? `<i class="n" aria-hidden="true">${show}</i>` : "") }); }));
    // swipe: start on a tile and flick it toward the gap, or flick anywhere and the tile beside the gap moves that way
    let sx = 0, sy = 0, si = -1, down = false;
    puz.addEventListener("pointerdown", (e) => { if (c.won) return; down = true; sx = e.clientX; sy = e.clientY; const b = e.target.closest(".bz-pt"); si = b ? +b.dataset.i : -1; });
    puz.addEventListener("pointercancel", () => { down = false; });
    puz.addEventListener("pointerup", (e) => {
      if (!down) return; down = false;
      const dx = e.clientX - sx, dy = e.clientY - sy, horiz = Math.abs(dx) > Math.abs(dy);
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      c.swipeAt = Date.now();
      const zr = Math.floor(z / 3), zc = z % 3; let i = -1;
      if (si >= 0) { const r = Math.floor(si / 3), q = si % 3;
        if (horiz && r === zr && Math.sign(zc - q) === Math.sign(dx)) i = si;
        else if (!horiz && q === zc && Math.sign(zr - r) === Math.sign(dy)) i = si; }
      if (i < 0) i = horiz ? (dx < 0 ? (zc < 2 ? z + 1 : -1) : (zc > 0 ? z - 1 : -1)) : (dy < 0 ? (zr < 2 ? z + 3 : -1) : (zr > 0 ? z - 3 : -1));
      if (i >= 0) tap(i, true); else sfx("nope");
    });
    const top = picsOpen(s);
    return [
      c.mode !== "hands" ? null : h("div", { class:"bz-levels five", role:"group", "aria-label":"Choose a picture" }, PICS.map((X, i) =>
        btn("", "bz-lvl bz-plvl" + (i === c.pic ? " on" : ""), () => { s.tilePic = i; save(); startHands("tiles", { mode:"hands", pic:i }); },
          { disabled:i > top, ...(i === c.pic ? { "aria-current":"true" } : {}), "data-fk":"pic" + i,
            "aria-label":X.name + (i > top ? `, locked. Solve ${X.at - (s.tileWins || 0)} more Scramble${X.at - (s.tileWins || 0) === 1 ? "" : "s"} to unlock it` : ""),
            html:`<span class="bz-lthumb${i > top ? " locked" : ""}" aria-hidden="true"><svg viewBox="0 0 300 300">${X.svg}</svg></span><small aria-hidden="true">${i > top ? `${X.at} wins` : X.short}</small>` }))),
      h("div", { class:"bz-hud" },
        h("div", { class:"bz-stat" }, timeEl, h("small", {}, c.won && c.pb ? "Time · PB!" : s.tileBest ? `Best ${fmtTime(s.tileBest)}` : "Time")),
        stat(String(c.moves), `Moves · par ${c.par}`), starsEl(c.won ? c.stars : tileStars(c), c.won)),
      puz,
      h("div", { class:"bz-goal" },
        h("span", { class:"bz-goalpic", html:`<svg viewBox="0 0 300 300" role="img" aria-label="The finished picture: ${P.name}">${P.svg}</svg>` }),
        h("span", {}, h("small", {}, "Goal"), h("b", {}, P.name)),
        sbtn(c.nums ? "Hide numbers" : "Show numbers", "", () => { c.nums = !c.nums; s.tileNums = c.nums; save(); renderHands(); }, { "aria-pressed":String(c.nums), "data-fk":"nums" })),
      c.won ? null : h("div", { class:"bz-ctl" },
        sbtn("Undo", "", () => { const p = c.past.pop(); if (!p) return; c.tiles = p.tiles; c.moves = p.moves; c.hint = -1; sfx("slide"); renderHands(); }, { disabled:!c.past.length, "data-fk":"undo" }),
        sbtn("Hint", "hintb", () => { const path = solveTiles(c.tiles); if (!path.length) return; c.hinted = true; c.hint = path[0]; c.say = "Hint: slide the glowing tile. A hint caps this one at 2 stars."; renderHands(); }, { "data-fk":"hint" }),
        sbtn("Restart", "", () => { c.tiles = c.first.slice(); c.moves = 0; c.past = []; c.t0 = 0; c.hint = -1; clearInterval(c.iv); c.say = "Scrambled again, exactly as before. The clock is back to zero."; renderHands(); }, { disabled:!c.past.length, "data-fk":"restart" })),
    ];
  }

  // ---------- Escape Dad's Garage ----------
  function escapeMenu(){
    view = "escape"; ctx = null;
    const s = S(), E = D.escape, n = E.rooms.length;
    const done = (i) => (s.rooms[i] || 0) >= 3, all = E.rooms.every((_, i) => done(i));
    paint(topBar(E.title, { fn: () => hub() }),
      bubble(all ? (s.escaped ? "We did it once. Fancy doing it again?" : "That's every digit! Get to the keypad!") : E.intro, "modern"),
      garageScene(E, s, done, all),
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
  // The garage, drawn: each corner is tappable, locked corners are dim, solved ones show their digit,
  // the next one glows, and the keypad by the door fills in as you go. The buttons below stay for keyboards and screen readers.
  function garageScene(E, s, done, all){
    const open = (i) => i === 0 || done(i - 1), now = E.rooms.findIndex((_, i) => open(i) && !done(i));
    const digits = E.rooms.map((r, i) => done(i) ? r.digit : "_").join(" ");
    const spot = (i, x, y, w, hh, art) => {
      const st = done(i) ? "done" : open(i) ? (i === now ? "now" : "open") : "locked";
      const badge = st === "done" ? `<g class="gz-badge"><circle cx="${x + w - 6}" cy="${y + 6}" r="11" fill="#FFD866" stroke="#1E1E24" stroke-width="2"/><text x="${x + w - 6}" y="${y + 10.5}" text-anchor="middle" font-size="13" font-weight="900" fill="#1E1E24">${E.rooms[i].digit}</text></g>`
        : st === "locked" ? `<text x="${x + w / 2}" y="${y + hh / 2 + 6}" text-anchor="middle" font-size="18">🔒</text>` : "";
      const ring = st === "now" ? `<rect class="gz-ring" x="${x - 4}" y="${y - 4}" width="${w + 8}" height="${hh + 8}" rx="10" fill="none" stroke="#FFD866" stroke-width="2.5" stroke-dasharray="6 4"/>` : "";
      return `<g class="gz-spot gz-${st}" data-room="${i}">${ring}<g class="gz-art">${art}</g>${badge}<rect x="${x}" y="${y}" width="${w}" height="${hh}" fill="transparent"/></g>`;
    };
    const svg = `<svg viewBox="0 0 320 200" role="img" aria-label="Dad's garage. Code so far: ${digits.replace(/_/g, "blank")}">
      <rect width="320" height="200" fill="#3B4150"/><path d="M0 150 L320 150 L320 200 L0 200Z" fill="#2A2D36"/>
      <path d="M0 150 L320 150" stroke="#1E1E24" stroke-width="2"/>
      <g><rect x="112" y="40" width="96" height="110" fill="#8C97A3" stroke="#1E1E24" stroke-width="2"/>
        ${[0,1,2,3,4,5,6].map(k => `<path d="M112 ${54 + k * 14} H208" stroke="#6B7580" stroke-width="2"/>`).join("")}
        <rect x="150" y="128" width="20" height="5" rx="2" fill="#5A6470"/></g>
      <g class="gz-keypad${all ? " gz-ready" : ""}" data-keypad="1"><rect x="214" y="78" width="24" height="34" rx="3" fill="#1E1E24" stroke="${all ? "#FFD866" : "#5A6470"}" stroke-width="2"/>
        <rect x="217" y="81" width="18" height="7" rx="1" fill="${all ? "#9BE08A" : "#3D5A3A"}"/>
        ${[0,1,2].map(r => [0,1,2].map(c => `<rect x="${218 + c * 6}" y="${92 + r * 6}" width="4" height="4" fill="#C9D1D9"/>`).join("")).join("")}<rect x="210" y="74" width="32" height="42" fill="transparent"/></g>
      <rect x="112" y="16" width="96" height="18" rx="4" fill="#1E1E24"/><text x="160" y="29.5" text-anchor="middle" font-family="ui-monospace,monospace" font-size="12" font-weight="800" fill="#9BE08A" letter-spacing="2">CODE ${digits}</text>
      ${spot(0, 10, 112, 92, 38, `<rect x="12" y="122" width="88" height="8" fill="#A0703A" stroke="#1E1E24" stroke-width="2"/><path d="M18 130 v20 M94 130 v20" stroke="#1E1E24" stroke-width="3"/><rect x="24" y="112" width="26" height="6" rx="2" fill="#C9D1D9" stroke="#1E1E24" stroke-width="1.5"/><path d="M62 120 l16 -10 l4 4 l-16 10z" fill="#D7263D" stroke="#1E1E24" stroke-width="1.5"/>`)}
      ${spot(1, 14, 34, 80, 40, `<path d="M8 74 H96" stroke="#7A5530" stroke-width="5"/><rect x="26" y="50" width="48" height="24" rx="3" fill="#D7263D" stroke="#1E1E24" stroke-width="2"/><path d="M40 50 v-6 h20 v6" fill="none" stroke="#1E1E24" stroke-width="2.5"/><path d="M26 60 H74" stroke="#1E1E24" stroke-width="1.5"/>`)}
      ${spot(2, 222, 128, 92, 54, `<path d="M226 168 Q228 150 248 148 L262 136 Q270 132 286 132 L296 134 Q306 140 308 154 Q312 158 310 168Z" fill="#3D7CB8" stroke="#1E1E24" stroke-width="2"/><path d="M266 138 L292 138 L300 150 L258 150Z" fill="#BFE8DC" stroke="#1E1E24" stroke-width="1.5"/><circle cx="246" cy="170" r="9" fill="#1E1E24"/><circle cx="246" cy="170" r="3.5" fill="#8C97A3"/><circle cx="294" cy="170" r="9" fill="#1E1E24"/><circle cx="294" cy="170" r="3.5" fill="#8C97A3"/>`)}
      ${spot(3, 236, 18, 78, 52, `<path d="M234 70 H316" stroke="#7A5530" stroke-width="5"/><rect x="242" y="44" width="28" height="26" fill="#C8A26B" stroke="#1E1E24" stroke-width="2"/><rect x="274" y="34" width="32" height="36" fill="#B5894F" stroke="#1E1E24" stroke-width="2"/><text x="256" y="62" text-anchor="middle" font-size="14" font-weight="900" fill="#1E1E24">?</text><text x="290" y="58" text-anchor="middle" font-size="16" font-weight="900" fill="#1E1E24">?</text>`)}
    </svg>`;
    const wrap = h("div", { class:"bz-garage", html: svg });
    wrap.addEventListener("click", (e) => {
      if (e.target.closest("[data-keypad]")) { if (all) keypad(); return; }
      const g = e.target.closest("[data-room]"); if (!g) return;
      const i = +g.dataset.room; if (open(i)) roomView(i);
    });
    return wrap;
  }

  // ---------- Escape Dad's Garage: each room is drawn, with one object per puzzle. Tap the glowing one to start it. ----------
  const OBJ = {
    lamp:`<circle cx="32" cy="14" r="11" fill="#FFE98A" stroke="#1E1E24" stroke-width="2"/><rect x="26" y="25" width="12" height="6" fill="#8C97A3" stroke="#1E1E24" stroke-width="2"/><rect x="20" y="33" width="24" height="16" rx="3" fill="#E8E4D8" stroke="#1E1E24" stroke-width="2"/><rect x="29" y="37" width="6" height="8" rx="1.5" fill="#FFD866"/>`,
    blueprint:`<rect x="6" y="6" width="52" height="40" fill="#2F6DB5" stroke="#1E1E24" stroke-width="2"/><path d="M14 38 L26 20 L38 32 L50 14" stroke="#BFE3FF" stroke-width="2.5" fill="none"/><circle cx="50" cy="14" r="3" fill="#BFE3FF"/>`,
    pegboard:`<rect x="4" y="4" width="56" height="44" fill="#C8A26B" stroke="#1E1E24" stroke-width="2"/><path d="M14 12 v24 M14 12 h8 M34 14 l14 22" stroke="#4A4F5A" stroke-width="4" stroke-linecap="round" fill="none"/><circle cx="46" cy="14" r="5" fill="#D7263D" stroke="#1E1E24" stroke-width="2"/>`,
    note:`<rect x="10" y="4" width="44" height="44" fill="#FFF3A8" stroke="#1E1E24" stroke-width="2" transform="rotate(-4 32 26)"/><path d="M18 18 h28 M18 26 h28 M18 34 h18" stroke="#8C7A2A" stroke-width="2.5" transform="rotate(-4 32 26)"/>`,
    padlock:`<path d="M20 24 V16 a12 12 0 0 1 24 0 V24" fill="none" stroke="#C9D1D9" stroke-width="5"/><rect x="14" y="24" width="36" height="26" rx="5" fill="#F5C518" stroke="#1E1E24" stroke-width="2"/><circle cx="32" cy="35" r="4" fill="#1E1E24"/><rect x="30" y="37" width="4" height="8" fill="#1E1E24"/>`,
    wrench:`<path d="M12 44 L40 16 a10 10 0 1 1 8 8 L20 52 Z" fill="#9AA5B1" stroke="#1E1E24" stroke-width="2.5" stroke-linejoin="round"/>`,
    radio:`<rect x="6" y="14" width="52" height="34" rx="5" fill="#8A5A2B" stroke="#1E1E24" stroke-width="2"/><circle cx="22" cy="31" r="10" fill="#E8D9B0" stroke="#1E1E24" stroke-width="2"/><circle cx="22" cy="31" r="3" fill="#1E1E24"/><path d="M38 24 h14 M38 31 h14 M38 38 h14" stroke="#E8D9B0" stroke-width="2.5"/><path d="M48 14 L58 4" stroke="#1E1E24" stroke-width="2.5"/>`,
    map:`<path d="M6 10 L22 6 L38 12 L58 6 V42 L38 48 L22 42 L6 46Z" fill="#F1E6BE" stroke="#1E1E24" stroke-width="2"/><path d="M22 6 V42 M38 12 V48" stroke="#B9A26A" stroke-width="1.5"/><path d="M10 34 q8 -14 20 -6 t24 -14" stroke="#3E8ED0" stroke-width="3" fill="none"/>`,
    cassette:`<rect x="6" y="12" width="52" height="34" rx="4" fill="#2C333B" stroke="#1E1E24" stroke-width="2"/><rect x="12" y="16" width="40" height="14" fill="#F1E6BE"/><circle cx="22" cy="38" r="5" fill="#C9D1D9"/><circle cx="42" cy="38" r="5" fill="#C9D1D9"/>`,
    lava:`<path d="M24 6 h16 l6 42 h-28 Z" fill="#7A3FB8" stroke="#1E1E24" stroke-width="2"/><circle cx="30" cy="34" r="6" fill="#FF8FB1"/><circle cx="36" cy="20" r="4" fill="#FF8FB1"/><rect x="18" y="46" width="28" height="5" rx="2" fill="#4A4F5A"/>`,
    skate:`<path d="M6 30 q26 -14 52 0 q-26 8 -52 0Z" fill="#E8742A" stroke="#1E1E24" stroke-width="2"/><circle cx="18" cy="38" r="5" fill="#C9D1D9" stroke="#1E1E24" stroke-width="2"/><circle cx="46" cy="38" r="5" fill="#C9D1D9" stroke="#1E1E24" stroke-width="2"/>`,
    box:`<rect x="6" y="14" width="52" height="34" fill="#C8A26B" stroke="#1E1E24" stroke-width="2"/><rect x="6" y="14" width="52" height="9" fill="#B58850" stroke="#1E1E24" stroke-width="2"/><rect x="14" y="30" width="36" height="10" fill="#D7263D"/><path d="M18 35 h28" stroke="#fff" stroke-width="2" stroke-dasharray="3 2"/>`,
  };
  const ROOM_ART = [
    { objs:["lamp", "blueprint", "pegboard"], bg:`<rect width="320" height="170" fill="#3B4150"/><rect y="128" width="320" height="42" fill="#2A2D36"/><rect x="12" y="100" width="296" height="14" fill="#A0703A" stroke="#1E1E24" stroke-width="2"/><path d="M26 114 v46 M294 114 v46" stroke="#1E1E24" stroke-width="4"/>` },
    { objs:["note", "padlock", "wrench"], bg:`<rect width="320" height="170" fill="#3B4150"/><rect y="128" width="320" height="42" fill="#2A2D36"/><rect x="40" y="96" width="240" height="56" rx="6" fill="#D7263D" stroke="#1E1E24" stroke-width="2.5"/><rect x="40" y="96" width="240" height="12" rx="4" fill="#B01E32"/><rect x="146" y="112" width="28" height="10" rx="3" fill="#C9D1D9" stroke="#1E1E24" stroke-width="2"/>` },
    { objs:["radio", "map", "cassette"], bg:`<rect width="320" height="170" fill="#3B4150"/><rect y="132" width="320" height="38" fill="#2A2D36"/><path d="M10 150 Q14 112 52 106 L86 80 Q104 70 160 70 L234 74 Q274 84 292 112 Q312 118 310 150Z" fill="#3D7CB8" stroke="#1E1E24" stroke-width="2.5" opacity=".9"/><circle cx="70" cy="152" r="16" fill="#1E1E24"/><circle cx="250" cy="152" r="16" fill="#1E1E24"/>` },
    { objs:["lava", "skate", "box"], bg:`<rect width="320" height="170" fill="#3B4150"/><rect y="132" width="320" height="38" fill="#2A2D36"/><rect x="10" y="62" width="300" height="8" fill="#7A5530" stroke="#1E1E24" stroke-width="2"/><rect x="10" y="118" width="300" height="8" fill="#7A5530" stroke="#1E1E24" stroke-width="2"/><path d="M20 70 v48 M300 70 v48" stroke="#5A3F22" stroke-width="5"/>` },
  ];
  const SLOTS = [[30, 24], [128, 24], [226, 24]];
  function roomScene(i, st, r){
    const A = ROOM_ART[i % ROOM_ART.length];
    const objs = A.objs.map((name, k) => {
      const [x, y] = SLOTS[k], state = k < st ? "done" : k === st ? "now" : "locked", yy = (i === 2 && k === 1) ? y + 34 : (i === 3 ? y + (k === 2 ? 66 : 4) : (i === 1 ? y + 22 : y + 36));
      const ring = state === "now" ? `<rect class="gz-ring" x="${x - 4}" y="${yy - 4}" width="72" height="60" rx="10" fill="none" stroke="#FFD866" stroke-width="2.5" stroke-dasharray="6 4"/>` : "";
      const badge = state === "done" ? `<g class="gz-badge"><circle cx="${x + 62}" cy="${yy + 4}" r="10" fill="#9BE08A" stroke="#1E1E24" stroke-width="2"/><path d="M${x + 57} ${yy + 4} l4 4 l7 -8" fill="none" stroke="#1E1E24" stroke-width="2.5" stroke-linecap="round"/></g>` : state === "locked" ? `<text x="${x + 32}" y="${yy + 34}" text-anchor="middle" font-size="18">🔒</text>` : "";
      return `<g class="gz-spot gz-${state}" ${state === "now" ? 'data-go="1" tabindex="-1"' : ""}>${ring}<g transform="translate(${x} ${yy})" class="gz-art">${OBJ[name]}</g>${badge}<rect x="${x - 4}" y="${yy - 4}" width="72" height="60" fill="transparent"/></g>`;
    }).join("");
    const note = st >= 3 ? `<g class="gz-note"><rect x="132" y="6" width="56" height="40" fill="#FFF3A8" stroke="#1E1E24" stroke-width="2" transform="rotate(-5 160 26)"/><text x="160" y="38" text-anchor="middle" font-family="ui-monospace,monospace" font-weight="900" font-size="30" fill="#1E1E24" transform="rotate(-5 160 26)">${r.digit}</text></g>` : "";
    return `<svg viewBox="0 0 320 170" role="img" aria-label="${r.name}. ${st} of 3 puzzles solved.">${A.bg}${objs}${note}</svg>`;
  }
  function doorScene(){
    return `<svg viewBox="0 0 320 150" aria-hidden="true"><defs><linearGradient id="gzsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BFE9FF"/><stop offset="1" stop-color="#FFF1B8"/></linearGradient></defs>
      <rect width="320" height="150" fill="#2A2D36"/><rect x="60" y="14" width="200" height="126" fill="url(#gzsky)"/><circle cx="214" cy="48" r="16" fill="#FFD866"/><rect x="60" y="112" width="200" height="28" fill="#8C97A3"/>
      <g class="bz-doorup"><rect x="60" y="14" width="200" height="126" fill="#8C97A3" stroke="#1E1E24" stroke-width="2"/>${[0,1,2,3,4,5,6,7].map(k => `<path d="M60 ${30 + k * 15} H260" stroke="#6B7580" stroke-width="2"/>`).join("")}</g>
      <rect x="54" y="8" width="212" height="8" fill="#1E1E24"/></svg>`;
  }
  function roomView(i, say){
    view = "room"; ctx = null;
    const s = S(), r = D.escape.rooms[i], st = s.rooms[i] || 0;
    const stepName = (x) => x.hands ? D.hands[x.hands].name : ({ logic:"Logic puzzle", number:"Number trick", pattern:"Pattern", riddle:"Riddle" })[BYID[x.p]?.type] || "Puzzle";
    const go = () => { const x = r.steps[st], c = { mode:"escape", room:i, step:st }; x.hands ? startHands(x.hands, c) : startPuzzle(BYID[x.p], c); };
    paint(topBar(r.name, { label:"Garage", fn: escapeMenu }),
      bubble(say || (st >= 3 ? r.done : r.story), "modern"),
      (() => { const wrap = h("div", { class:"bz-garage bz-roomscene", html: roomScene(i, st, r) });
        wrap.addEventListener("click", (e) => { if (st < 3 && e.target.closest("[data-go]")) go(); });
        return wrap; })(),
      h("ol", { class:"bz-steps" }, r.steps.map((x, k) => h("li", { class: k < st ? "done" : k === st ? "now" : "" }, (k < st ? "✅ " : k === st ? "👉 " : "⬜ ") + stepName(x)))),
      st >= 3 ? h("p", { class:"bz-digitbig", "aria-label":`Code digit ${r.digit}` }, r.digit) : null,
      h("div", { class:"bz-row" }, st >= 3 ? btn("Back to the garage →", "primary bz-focus", escapeMenu)
        : btn(st ? "Next puzzle →" : "Start →", "primary bz-focus", go)));
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
    bridge?.arcade?.(first ? 15 : 5);
    paint(topBar("Escaped!", { fn: () => hub() }), bubble([D.escape.win, extra].filter(Boolean).join(" "), "modern"),
      h("div", { class:"bz-garage bz-door", "aria-hidden":"true", html: doorScene() }),
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
  .bz-label{font-weight:900; text-align:center; line-height:1.15; min-width:0; overflow-wrap:anywhere}
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
  .bz-garage{border-radius:16px; overflow:hidden; border:1px solid var(--line); box-shadow:0 6px 18px rgba(0,0,0,.18)} .bz-garage svg{display:block; width:100%; height:auto}
  .gz-spot{cursor:pointer} .gz-locked{cursor:not-allowed} .gz-locked .gz-art{opacity:.35; filter:grayscale(1)}
  .gz-spot:not(.gz-locked):hover .gz-art{filter:brightness(1.15)}
  .gz-ring{animation:gzring 1.6s linear infinite} @keyframes gzring{to{stroke-dashoffset:-20}}
  .gz-badge{animation:gzpop .5s cubic-bezier(.34,1.56,.64,1)} @keyframes gzpop{from{transform:scale(0); transform-box:fill-box; transform-origin:center}}
  .gz-keypad{cursor:pointer} .gz-ready rect:first-child{animation:gzglow 1.2s ease-in-out infinite} @keyframes gzglow{50%{filter:drop-shadow(0 0 6px #FFD866)}}
  @media (prefers-reduced-motion:reduce){.gz-ring,.gz-badge,.gz-ready rect:first-child{animation:none}}
  .bz-rooms{display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:10px}
  .bz-foot,.bz-meta{color:var(--muted); font-size:.85rem; text-align:center}
  .bz-q{font-weight:800; font-size:1.08rem}
  .bz-tkb{margin:0 0 10px; padding:10px; border-radius:14px; background:#E9EEF7; border:2px dashed #AFC0DD; color:#1C2438} .bz-tkb.ok{border-color:#2E8B57; background:#E4F4EA}
  .bz-tkt{margin:0 0 8px; font-size:.8rem; font-weight:800; color:#4A5774}
  .bz-tkslots{display:grid; grid-template-columns:repeat(4, 1fr); gap:6px}
  .bz-tkslot{display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; min-height:56px; padding:4px; border-radius:10px; border:2px solid #AFC0DD; background:#fff; color:#1C2438; font:inherit; cursor:pointer}
  .bz-tkslot small{font-size:.66rem; font-weight:800; color:#6A7894; text-transform:uppercase; letter-spacing:.04em} .bz-tkslot b{font-size:.92rem; line-height:1.1; overflow-wrap:anywhere}
  .bz-tkslot.full{background:#FFF7DC; border-color:#E9B949} .bz-tkslot.ready{border-style:dashed; border-color:#3E8ED0; box-shadow:0 0 0 2px rgba(62,142,208,.25)}
  .bz-tray2{display:flex; flex-wrap:wrap; gap:8px; min-height:44px; margin-top:8px}
  .bz-chip{padding:9px 14px; border-radius:999px; border:2px solid #1C2438; background:#FFD866; color:#1C2438; font:inherit; font-weight:900; cursor:grab; touch-action:none; user-select:none; box-shadow:0 3px 0 rgba(0,0,0,.25)}
  .bz-chip.sel{background:#6BC3FF; transform:translateY(-2px)} .bz-chip.drag{cursor:grabbing; position:relative; z-index:6; box-shadow:0 10px 16px rgba(0,0,0,.35)}
  .bz-tkok{margin:8px 0 0; font-weight:900; color:#1F7A47} .bz-tkclr{margin-top:8px}
  .bz-roomscene svg{display:block; width:100%; height:auto; margin:0} .bz-roomscene{margin:8px 0 10px}
  .bz-roomscene .gz-now{cursor:pointer} .bz-roomscene .gz-now .gz-art{animation:gz-bob 1.6s ease-in-out infinite} .bz-roomscene .gz-locked .gz-art{opacity:.4} .bz-roomscene .gz-done .gz-art{opacity:.85}
  @keyframes gz-bob{50%{transform:translateY(-3px)}} .bz-roomscene .gz-note{animation:bz-stamp .4s cubic-bezier(.3,1.6,.5,1)}
  .bz-doorup{animation:bz-rise 1.8s cubic-bezier(.5,0,.3,1) .3s forwards} @keyframes bz-rise{to{transform:translateY(-118px)}}
  .bz-door{margin:6px 0} .bz-door svg{display:block; width:100%; height:auto}
  @media (prefers-reduced-motion: reduce){ .bz-roomscene .gz-now .gz-art,.bz-roomscene .gz-note{animation:none} .bz-doorup{animation:none; transform:translateY(-118px)} }
  .bz-pcard{position:relative; margin:8px 0 12px; border-radius:16px; overflow:hidden; background:var(--pbg,#2A2D45); border:2px solid rgba(0,0,0,.35); box-shadow:0 5px 0 rgba(0,0,0,.25)}
  .bz-phead{display:flex; align-items:center; gap:10px; padding:8px 12px; color:#F6F1FF}
  .bz-phead b{font-size:.78rem; letter-spacing:.08em; text-transform:uppercase; font-weight:900; line-height:1.2}
  .bz-part{width:64px; flex:none} .bz-part svg{display:block; width:100%; height:auto}
  .bz-paper{margin:0 10px 10px; padding:12px 14px; border-radius:10px; background:#FFF7DC; color:#2A1B14; box-shadow:inset 0 -3px 0 rgba(0,0,0,.08)}
  .bz-pk-number .bz-paper{font-family:ui-monospace,"Courier New",monospace; background:#F1F5E8}
  .bz-pk-riddle .bz-paper{font-style:italic}
  .bz-pcard.daily{border-color:#E9B949} .bz-pcard.daily .bz-phead{background:linear-gradient(90deg, rgba(233,185,73,.35), transparent)}
  .bz-pcard.boss{border-color:#D7263D; box-shadow:0 0 0 2px rgba(215,38,61,.35), 0 5px 0 rgba(0,0,0,.25)} .bz-pcard.boss .bz-phead{background:linear-gradient(90deg, rgba(215,38,61,.5), transparent)}
  .bz-stamp{position:absolute; right:14px; top:42px; padding:2px 10px; border:3px solid #2E8B57; border-radius:6px; color:#2E8B57; font-weight:900; letter-spacing:.1em; font-size:.95rem; background:rgba(255,255,255,.9); transform:rotate(-10deg); animation:bz-stamp .35s cubic-bezier(.3,1.6,.5,1)}
  @keyframes bz-stamp{from{transform:rotate(-10deg) scale(2); opacity:0} to{transform:rotate(-10deg) scale(1); opacity:1}}
  .bz-blink{animation:bz-blink 1.2s steps(2) infinite} @keyframes bz-blink{50%{opacity:.15}}
  .bz-runbar{display:flex; align-items:center; justify-content:space-between; gap:10px; padding:8px 12px; margin:4px 0 6px; border-radius:14px; background:#241F4A; color:#F6F1FF}
  .bz-road{display:flex; align-items:center; gap:6px}
  .bz-stop{display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:50%; border:2px solid #5B4FB3; font-size:.78rem; font-weight:900; color:#B9B1F0}
  .bz-stop.done{background:#2FA85A; border-color:#2FA85A; color:#fff} .bz-stop.now{background:#FFD866; border-color:#FFD866; color:#2A1B14; transform:scale(1.15)}
  .bz-stop.boss{border-color:#FF5C7A; color:#FF8FA3} .bz-stop.boss.now{background:#FF5C7A; border-color:#FF5C7A; color:#fff}
  .bz-hearts{display:flex; gap:3px; font-size:1.25rem; line-height:1} .bz-heart{color:#FF5C7A} .bz-heart.lost{color:#4B4670}
  .bz-runres{margin:10px 0; padding:16px; border-radius:16px; background:#241F4A; color:#F6F1FF; text-align:center; border:2px solid #5B4FB3} .bz-runres.win{border-color:#FFD866}
  .bz-runres>b{display:block; font-size:1.2rem; letter-spacing:.12em; color:#FFD866; margin-bottom:10px}
  .bz-runstats{display:flex; justify-content:space-around; gap:8px} .bz-runstats b{display:block; font-size:1.5rem} .bz-runstats small{color:#B9B1F0}
  @media (prefers-reduced-motion: reduce){ .bz-blink,.bz-stamp{animation:none} }
  .bz-hint{color:var(--muted); margin:4px 0}
  .bz-msg{font-weight:700}
  .bz-msg.ok{background:color-mix(in srgb, var(--denim) 14%, transparent); padding:10px 12px; border-radius:12px}
  .bz-opts{display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:8px; margin:10px 0}
  .bz-thumb{display:block; width:100%; max-width:132px; margin-bottom:6px} .bz-thumb svg{display:block; width:100%; height:auto; border-radius:10px}
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
  @media (max-width:420px){.bz-river{grid-template-columns:1fr; } .bz-water{width:auto; justify-content:center} .bz-bank{min-height:0}}
  /* hands-on scenes: a night panel per puzzle. Colours come from --n-* (one set per look, below). */
  .bz-scene{--n-sky:#101821; --n-card:#1A2632; --n-ink:#E5EDF5; --n-muted:#9AAABB; --n-line:#2B3A49; --n-dim:#55687A; --n-accent:#F2B533; --n-accent-ink:#2A1E00; --n-frame:#3A4C5E; --n-off:#0B1118; --n-roof:#3D2F27; --n-roof-edge:#5A463A; --n-chimney:#2B211C; --n-lit:#FFD84D; --n-sil:#7A5310; --n-hint:#8DB8E6; --n-hint-text:#8DB8E6; --n-paper-ink:#000000; --n-water:#234B6E; --n-wave:#718CA4}
  :root[data-look="arcade"] .bz-scene{--n-sky:#0D0A26; --n-card:#18123F; --n-ink:#EEEAFF; --n-muted:#A99FDD; --n-line:#2F2770; --n-dim:#726BA2; --n-accent:#2DE2E6; --n-accent-ink:#000000; --n-frame:#554E8D; --n-off:#080617; --n-roof:#2F2770; --n-roof-edge:#5F5894; --n-chimney:#1E184B; --n-lit:#FF3EA5; --n-sil:#661942; --n-hint:#2DE2E6; --n-hint-text:#2DE2E6; --n-paper-ink:#000000; --n-water:#224075; --n-wave:#7484AC}
  :root[data-look="vhs"] .bz-scene{--n-sky:#1C0E22; --n-card:#2B1634; --n-ink:#FFEBDD; --n-muted:#D3B0C3; --n-line:#4A2A56; --n-dim:#896E85; --n-accent:#FFB547; --n-accent-ink:#000000; --n-frame:#6E5171; --n-off:#110814; --n-roof:#4A2A56; --n-roof-edge:#775A78; --n-chimney:#331C3C; --n-lit:#FF7A59; --n-sil:#663124; --n-hint:#FFEBDD; --n-hint-text:#FFEBDD; --n-paper-ink:#000000; --n-water:#2D426F; --n-wave:#81869B}
  :root[data-look="y2k"] .bz-scene{--n-sky:#0A1F3D; --n-card:#12305A; --n-ink:#EAF6FF; --n-muted:#A9C8E6; --n-line:#24507F; --n-dim:#698AAC; --n-accent:#6CCB3F; --n-accent-ink:#000000; --n-frame:#4C7199; --n-off:#061325; --n-roof:#24507F; --n-roof-edge:#567A9F; --n-chimney:#17385E; --n-lit:#9BE3FF; --n-sil:#3E5B66; --n-hint:#6CCB3F; --n-hint-text:#6CCB3F; --n-paper-ink:#000000; --n-water:#1E5185; --n-wave:#7093B6}
  :root[data-look="diner"] .bz-scene{--n-sky:#10292A; --n-card:#183B3B; --n-ink:#FFF8EE; --n-muted:#A9CFC6; --n-line:#2A5A55; --n-dim:#75918B; --n-accent:#2BB3A3; --n-accent-ink:#000000; --n-frame:#557A74; --n-off:#0A1919; --n-roof:#2A5A55; --n-roof-edge:#5F827B; --n-chimney:#1D4240; --n-lit:#FF5A6E; --n-sil:#66242C; --n-hint:#2BB3A3; --n-hint-text:#2BB3A3; --n-paper-ink:#000000; --n-water:#225873; --n-wave:#7A98A4}
  :root[data-look="skate"] .bz-scene{--n-sky:#1C1C1C; --n-card:#2A2927; --n-ink:#F4F1EA; --n-muted:#B8B1A4; --n-line:#403D38; --n-dim:#7F7C76; --n-accent:#13A3AE; --n-accent-ink:#000000; --n-frame:#64615C; --n-off:#111111; --n-roof:#403D38; --n-roof-edge:#6D6A64; --n-chimney:#2E2C2A; --n-lit:#E8572A; --n-sil:#5D2311; --n-hint:#13A3AE; --n-hint-text:#13A3AE; --n-paper-ink:#000000; --n-water:#2C4D67; --n-wave:#7C8F9B}
  :root[data-look="gamer"] .bz-scene{--n-sky:#0A0E14; --n-card:#121A24; --n-ink:#E4F0FF; --n-muted:#8CA0B6; --n-line:#22324A; --n-dim:#667489; --n-accent:#A06BFF; --n-accent-ink:#000000; --n-frame:#49586E; --n-off:#06080C; --n-roof:#22324A; --n-roof-edge:#526277; --n-chimney:#16202F; --n-lit:#39FF88; --n-sil:#176636; --n-hint:#A06BFF; --n-hint-text:#A06BFF; --n-paper-ink:#000000; --n-water:#1E4466; --n-wave:#6D89A3}
  :root[data-look="summer"] .bz-scene{--n-sky:#14213A; --n-card:#1F3050; --n-ink:#FFF3DC; --n-muted:#C9B79A; --n-line:#34486B; --n-dim:#7B8493; --n-accent:#1FA2D8; --n-accent-ink:#000000; --n-frame:#5D6A82; --n-off:#0C1423; --n-roof:#34486B; --n-roof-edge:#677387; --n-chimney:#243452; --n-lit:#FFC766; --n-sil:#665029; --n-hint:#1FA2D8; --n-hint-text:#1FA2D8; --n-paper-ink:#000000; --n-water:#26517F; --n-wave:#7D92A4}
  :root[data-look="halloween"] .bz-scene{--n-sky:#160D26; --n-card:#231638; --n-ink:#F6EEFF; --n-muted:#BBA6D6; --n-line:#3B2758; --n-dim:#7C6D92; --n-accent:#8BE04E; --n-accent-ink:#000000; --n-frame:#604F79; --n-off:#0D0817; --n-roof:#3B2758; --n-roof-edge:#6A5982; --n-chimney:#281A3F; --n-lit:#FF7A1A; --n-sil:#66310A; --n-hint:#8BE04E; --n-hint-text:#8BE04E; --n-paper-ink:#000000; --n-water:#284271; --n-wave:#7A87AA}
  :root[data-look="bolly"] .bz-scene{--n-sky:#2B0A1E; --n-card:#3F1230; --n-ink:#FFF1D9; --n-muted:#E0B9A8; --n-line:#5E2247; --n-dim:#966A7A; --n-accent:#FF9A1F; --n-accent-ink:#000000; --n-frame:#7E4B64; --n-off:#1A0612; --n-roof:#5E2247; --n-roof-edge:#86566C; --n-chimney:#441632; --n-lit:#FFD166; --n-sil:#665429; --n-hint:#FFF1D9; --n-hint-text:#FFF1D9; --n-paper-ink:#000000; --n-water:#38406C; --n-wave:#888798}
  :root[data-look="diwali"] .bz-scene{--n-sky:#120B2E; --n-card:#1E1446; --n-ink:#FFF4DE; --n-muted:#D9C3A0; --n-line:#3A2A6A; --n-dim:#7F7193; --n-accent:#C82F6B; --n-accent-ink:#FFFFFF; --n-frame:#615281; --n-off:#0B071C; --n-roof:#3A2A6A; --n-roof-edge:#6B5C87; --n-chimney:#261A4C; --n-lit:#FFB000; --n-sil:#664600; --n-hint:#C82F6B; --n-hint-text:#FFF4DE; --n-paper-ink:#000000; --n-water:#254179; --n-wave:#7C89A1}
  :root[data-look="winter"] .bz-scene{--n-sky:#0E1F3A; --n-card:#16294A; --n-ink:#F1F7FF; --n-muted:#A9BDD6; --n-line:#2A436B; --n-dim:#70829F; --n-accent:#2BB673; --n-accent-ink:#000000; --n-frame:#526789; --n-off:#081323; --n-roof:#2A436B; --n-roof-edge:#5C7090; --n-chimney:#1C3152; --n-lit:#FFD98A; --n-sil:#665737; --n-hint:#2BB673; --n-hint-text:#2BB673; --n-paper-ink:#000000; --n-water:#204D7C; --n-wave:#7491B0}
  :root[data-look="lunar"] .bz-scene{--n-sky:#3D0709; --n-card:#5C0D12; --n-ink:#FFF4E0; --n-muted:#F3C9A8; --n-line:#8A2229; --n-dim:#B36C69; --n-accent:#F5C04A; --n-accent-ink:#000000; --n-frame:#A14C4E; --n-off:#250405; --n-roof:#8A2229; --n-roof-edge:#A75657; --n-chimney:#641419; --n-lit:#FFD98A; --n-sil:#665737; --n-hint:#FFF4E0; --n-hint-text:#FFF4E0; --n-paper-ink:#000000; --n-water:#493D5B; --n-wave:#928690}
  :root[data-look="chalk"] .bz-scene{--n-sky:#22382E; --n-card:#2B4638; --n-ink:#F3F1E7; --n-muted:#B9C7B8; --n-line:#41604F; --n-dim:#7F9384; --n-accent:#F28CB1; --n-accent-ink:#000000; --n-frame:#657D6D; --n-off:#14221C; --n-roof:#41604F; --n-roof-edge:#6E8475; --n-chimney:#324C3E; --n-lit:#F7D54A; --n-sil:#63551E; --n-hint:#F28CB1; --n-hint-text:#F28CB1; --n-paper-ink:#000000; --n-water:#2D5E71; --n-wave:#7C99A0}
  :root[data-look="lab"] .bz-scene{--n-sky:#0C2A2E; --n-card:#123C40; --n-ink:#E8F6F3; --n-muted:#A3CBC5; --n-line:#1F5A5C; --n-dim:#659191; --n-accent:#12B5A0; --n-accent-ink:#000000; --n-frame:#47797A; --n-off:#07191C; --n-roof:#1F5A5C; --n-roof-edge:#518182; --n-chimney:#164245; --n-lit:#B58CFF; --n-sil:#483866; --n-hint:#12B5A0; --n-hint-text:#12B5A0; --n-paper-ink:#000000; --n-water:#1E5876; --n-wave:#6F97A8}
  :root[data-look="library"] .bz-scene{--n-sky:#1F1410; --n-card:#2E1F18; --n-ink:#F4ECDD; --n-muted:#CBB8A0; --n-line:#4A372B; --n-dim:#867669; --n-accent:#447C6B; --n-accent-ink:#FFFFFF; --n-frame:#6C5B4F; --n-off:#130C0A; --n-roof:#4A372B; --n-roof-edge:#746458; --n-chimney:#34261E; --n-lit:#F2C078; --n-sil:#614D30; --n-hint:#447C6B; --n-hint-text:#F4ECDD; --n-paper-ink:#000000; --n-water:#2E475F; --n-wave:#7D8991}
  :root[data-look="gym"] .bz-scene{--n-sky:#14213D; --n-card:#1D2D50; --n-ink:#F1DDB5; --n-muted:#B9B49F; --n-line:#32456E; --n-dim:#757A87; --n-accent:#D64C62; --n-accent-ink:#000000; --n-frame:#58637C; --n-off:#0C1425; --n-roof:#32456E; --n-roof-edge:#626B80; --n-chimney:#233356; --n-lit:#FFD166; --n-sil:#665429; --n-hint:#D64C62; --n-hint-text:#F1DDB5; --n-paper-ink:#000000; --n-water:#254F7F; --n-wave:#778895}
  :root[data-look="cheat"] .bz-scene{--n-sky:#0B0B0F; --n-card:#17171F; --n-ink:#FFF6D6; --n-muted:#C9B98A; --n-line:#3A3420; --n-dim:#7F7860; --n-accent:#FF4D6D; --n-accent-ink:#000000; --n-frame:#615B44; --n-off:#070709; --n-roof:#3A3420; --n-roof-edge:#6B644E; --n-chimney:#222018; --n-lit:#F5C518; --n-sil:#624F0A; --n-hint:#FF4D6D; --n-hint-text:#FF4D6D; --n-paper-ink:#000000; --n-water:#214363; --n-wave:#7A8B91}
  :root[data-look="eid"] .bz-scene{--n-sky:#0B2A33; --n-card:#11404C; --n-ink:#F4FBF8; --n-muted:#A8CFC6; --n-line:#1E5B68; --n-dim:#69939A; --n-accent:#2EC4B6; --n-accent-ink:#000000; --n-frame:#497B85; --n-off:#07191F; --n-roof:#1E5B68; --n-roof-edge:#54838C; --n-chimney:#14424E; --n-lit:#F2C14E; --n-sil:#614D1F; --n-hint:#2EC4B6; --n-hint-text:#2EC4B6; --n-paper-ink:#000000; --n-water:#1E5A7D; --n-wave:#749AAE}
  .bz-scene{background:var(--n-sky); color:var(--n-ink); border-radius:18px; padding:12px; display:flex; flex-direction:column; align-items:center; gap:10px; color-scheme:dark}
  .bz-scene > *{width:100%; max-width:350px; box-sizing:border-box}
  .bz-scene button{font:inherit; color:inherit}
  .bz-scene button:focus-visible{outline:3px solid var(--n-accent); outline-offset:2px}
  .bz-hud{display:grid; grid-template-columns:repeat(3, 1fr); gap:8px}
  .bz-stat{background:var(--n-card); border:1px solid var(--n-line); border-radius:14px; min-height:58px; padding:4px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; text-align:center}
  .bz-stat b{font-size:1.2rem; font-weight:900; line-height:1.1}
  .bz-stat small{font-size:.68rem; line-height:1.15; color:var(--n-muted)}
  .bz-clock{font-variant-numeric:tabular-nums}
  .bz-stars{flex-direction:row; gap:3px}
  .bz-star{display:flex}
  .bz-star svg{width:24px; height:24px; fill:none; stroke:var(--n-dim); stroke-width:1.6; stroke-linejoin:round}
  .bz-star.on svg{fill:var(--n-accent); stroke:var(--n-accent)}
  .bz-stars.pop .bz-star.on{animation:bzpop .45s backwards} .bz-stars.pop .bz-star.on:nth-child(2){animation-delay:.15s} .bz-stars.pop .bz-star.on:nth-child(3){animation-delay:.3s}
  .bz-meter{flex-direction:row; gap:6px} .bz-meter > span{display:flex; flex-direction:column; align-items:flex-start; gap:2px} .bz-meter svg{width:40px; height:40px; display:block}
  .bz-meter b{font-size:.95rem}
  .bz-ctl{display:grid; grid-template-columns:repeat(3, 1fr); gap:8px} .bz-ctl.two{grid-template-columns:1fr}
  .bz-sbtn{min-height:48px; padding:0 6px; white-space:nowrap; border:1px solid var(--n-line); border-radius:999px; background:transparent; color:var(--n-ink); font-weight:700; font-size:.92rem; cursor:pointer}
  .bz-scene .bz-sbtn.hintb{color:var(--n-hint-text)}
  .bz-scene .bz-sbtn.go{background:var(--n-accent); color:var(--n-accent-ink); border-color:transparent; font-weight:900}
  .bz-sbtn:disabled{opacity:.45; cursor:default}
  .bz-best{letter-spacing:.1em; color:var(--denim) !important; font-weight:900}
  .bz-house{display:flex; flex-direction:column; align-items:center; position:relative}
  .bz-sky{position:relative; width:100%; height:40px}
  .bz-twinkle{position:absolute; left:0; top:0; width:2px; height:2px; border-radius:2px; color:var(--n-ink); background:currentColor; transition:opacity .6s;
    box-shadow:18px 12px 0, 52px 30px 0, 88px 6px 0, 120px 24px 0, 150px 34px 0, 176px 10px 0, 206px 28px 0, 236px 4px 0, 30px 36px 0, 250px 34px 0, 12px 26px 0, 100px 36px 0, 200px 38px 0, 266px 20px 0}
  .bz-moon{position:absolute; right:14px; top:0; width:36px; height:36px; border-radius:50%; background:#F4E9C1; box-shadow:0 0 24px rgba(244,233,193,.35)}
  .bz-roof{width:100%} .bz-roof svg{display:block; width:100%; height:auto}
  .bz-wall{width:88%; box-sizing:border-box; padding:12px; background:var(--n-card); display:grid; gap:8px}
  .bz-win{position:relative; aspect-ratio:1; min-width:0; padding:0; border:3px solid var(--n-frame); border-radius:6px; background:var(--n-off); overflow:hidden; cursor:pointer; transition:background .2s}
  .bz-win.on{background:var(--n-lit)}
  .bz-win::before,.bz-win::after{content:""; position:absolute; background:var(--n-frame); z-index:1}
  .bz-win::before{left:50%; top:0; bottom:0; width:3px; margin-left:-1.5px} .bz-win::after{top:50%; left:0; right:0; height:3px; margin-top:-1.5px}
  .bz-win svg{position:absolute; inset:0; width:100%; height:100%; fill:var(--n-sil)}
  .bz-win.hint{box-shadow:0 0 0 3px var(--n-sky), 0 0 0 6px var(--n-hint), 0 0 14px 6px var(--n-hint); z-index:2}
  .bz-ground{width:100%; height:10px; border-radius:3px; background:var(--n-off)}
  .bz-safe{position:relative; padding:12px 12px 12px 18px; background:var(--n-card); border:3px solid var(--n-line); border-radius:20px; display:flex; flex-direction:column; gap:10px}
  .bz-safe::before,.bz-safe::after{content:""; position:absolute; left:-3px; width:11px; height:42px; border-radius:4px; background:var(--n-dim)}
  .bz-safe::before{top:64px} .bz-safe::after{bottom:64px}
  .bz-notes{list-style:none; margin:0; padding:0; display:grid; grid-template-columns:repeat(2, minmax(0, 1fr)); gap:8px}
  .bz-note{min-height:52px; box-sizing:border-box; padding:7px 9px; background:var(--n-lit); color:var(--n-paper-ink); border-radius:3px 3px 10px 3px; box-shadow:0 3px 0 var(--n-off); display:flex; align-items:center; gap:9px; transform:rotate(-1deg)}
  .bz-note:nth-child(even){transform:rotate(1deg)}
  .bz-note b{font-size:1.1rem; font-weight:900; letter-spacing:.08em}
  .bz-note > span{display:flex; flex-direction:column; gap:3px; min-width:0}
  .bz-note small{font-size:.7rem; font-weight:700; line-height:1.2}
  .bz-pegs{display:flex; align-items:center; gap:4px; height:12px}
  .bz-peg{flex:none; width:11px; height:11px; box-sizing:border-box; border-radius:50%; background:currentColor}
  .bz-peg.ring{background:none; border:2.5px solid currentColor}
  .bz-peg.dash{width:9px; height:3px; border-radius:2px; opacity:.55}
  .bz-dials{display:flex; align-items:center; justify-content:center; gap:12px}
  .bz-tumblers{display:grid; grid-template-columns:repeat(3, minmax(44px, 58px)); gap:8px; min-width:0}
  .bz-tum{display:flex; flex-direction:column; gap:4px}
  .bz-tum button{height:44px; padding:0; border:1px solid var(--n-line); border-radius:999px; background:transparent; cursor:pointer}
  .bz-tum button:disabled{opacity:.45}
  .bz-digit2{height:54px; box-sizing:border-box; border:3px solid var(--n-frame); border-radius:10px; background:var(--n-off); color:var(--n-lit); font-weight:900; font-size:2rem; display:grid; place-items:center}
  .bz-handle{flex:none} .bz-handle svg{display:block; width:68px; height:68px}
  .bz-pad{display:grid; grid-template-columns:repeat(5, 1fr); gap:6px}
  .bz-pad button{position:relative; height:44px; padding:0; border:1px solid var(--n-line); border-radius:12px; background:transparent; font-weight:800; cursor:pointer}
  .bz-pad button.x{opacity:.45}
  .bz-pad button.x::after{content:""; position:absolute; left:8px; right:8px; top:50%; height:3px; margin-top:-1.5px; border-radius:2px; background:currentColor; transform:rotate(-24deg)}
  .bz-tries{list-style:none; margin:0; padding:0; display:grid; grid-template-columns:repeat(6, 1fr); gap:5px}
  .bz-try{height:46px; box-sizing:border-box; border:1.5px dashed var(--n-line); border-radius:10px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px; font-weight:900; font-size:.82rem; letter-spacing:.05em}
  .bz-try.used{border-style:solid}
  .bz-try .bz-pegs{height:9px; gap:3px} .bz-try .bz-peg{width:8px; height:8px} .bz-try .bz-peg.ring{border-width:2px} .bz-try .bz-peg.dash{height:2px; width:7px}
  .bz-vault{padding:22px 16px; background:var(--n-off); border:3px solid var(--n-line); border-radius:20px; display:flex; flex-direction:column; align-items:center; gap:8px; text-align:center; animation:bzpop .5s}
  .bz-vault b{font-size:1.2rem; font-weight:900} .bz-vault p{margin:0; font-size:.9rem; color:var(--n-ink)}
  .bz-loot svg{display:block; width:110px; height:auto; filter:drop-shadow(0 0 20px color-mix(in srgb, var(--n-lit) 55%, transparent))}
  .bz-cross{display:flex; flex-direction:column; align-items:center}
  .bz-bank2{position:relative; z-index:1; width:100%; box-sizing:border-box; padding:10px 12px 12px; background:var(--n-card); border:1px solid var(--n-line); border-radius:16px; display:flex; flex-direction:column; align-items:center; gap:8px}
  .bz-bank2 small{font-size:.75rem; font-weight:700; color:var(--n-muted)}
  .bz-slots{display:flex; justify-content:space-evenly; width:100%; max-width:260px}
  .bz-slot{position:relative; display:block; width:60px; height:60px; box-sizing:border-box; flex:none}
  .bz-slot.empty{border:2px dashed var(--n-dim); border-radius:50%}
  .bz-tok{width:60px; height:60px; padding:0; box-sizing:border-box; border:3px solid var(--n-frame); border-radius:50%; background:var(--n-off); cursor:pointer; display:grid; place-items:center}
  .bz-tok svg{width:38px; height:38px; display:block}
  .bz-tok{position:relative} .bz-tok.sm,.bz-slot.sm{width:48px; height:48px} .bz-tok.sm svg{width:30px; height:30px}
  .bz-slots.many{max-width:none; flex-wrap:wrap; gap:8px 4px}
  .bz-slots.six{display:grid; grid-template-columns:repeat(3, 48px); gap:8px 22px; justify-content:center; max-width:none}
  .bz-scene .bz-river2{height:150px} .bz-scene .bz-boat2.near{transform:translateY(54px)}
  .bz-wt{position:absolute; left:50%; bottom:-8px; transform:translateX(-50%); padding:0 5px; border:1px solid var(--n-line); border-radius:999px; background:var(--n-sky); color:var(--n-ink); font-style:normal; font-size:.58rem; font-weight:800; line-height:13px}
  .bz-mins{display:flex; flex-direction:column; align-items:center; line-height:1; color:var(--n-lit)} .bz-mins b{font-size:1.15rem; font-weight:900} .bz-mins small{font-size:.58rem; font-weight:800}
  .bz-cross.bridge .bz-river2{background:var(--n-off)}
  .bz-torch svg{display:block; width:30px; height:30px}
  .bz-levels{display:grid; grid-template-columns:repeat(4, 1fr); gap:6px}
  .bz-lvl{min-height:44px; padding:3px; border:1px solid var(--n-line); border-radius:12px; background:transparent; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; cursor:pointer}
  .bz-lvl b{font-size:.95rem; font-weight:900; line-height:1} .bz-lvl small{font-size:.62rem; line-height:1; color:var(--n-muted); letter-spacing:.04em}
  .bz-lvl.on{border-color:var(--n-accent); box-shadow:inset 0 0 0 1px var(--n-accent)} .bz-lvl:disabled{opacity:.45; cursor:default}
  .bz-scene .bz-lname b{font-size:.78rem; line-height:1.15}
  .bz-tok.flag{outline:3px dashed var(--n-ink); outline-offset:4px}
  .bz-tok.hint{outline:3px solid var(--n-hint); outline-offset:4px}
  .bz-tok.gone svg{opacity:.3}
  .bz-river2{position:relative; width:90%; height:180px; margin:-8px 0; background:var(--n-water); overflow:hidden}
  .bz-waves{position:absolute; inset:0; width:100%; height:100%}
  .bz-boat2{position:absolute; left:50%; top:6px; width:184px; height:84px; margin-left:-92px; transition:transform .7s ease-in-out}
  .bz-boat2.near{transform:translateY(84px)}
  .bz-hull svg{position:absolute; inset:0; width:100%; height:100%}
  .bz-crew{position:relative; display:flex; align-items:center; justify-content:center; gap:12px; padding-top:6px}
  .bz-crew .bz-av svg{width:46px; height:46px; display:block}
  .bz-puz{padding:8px; background:var(--n-card); border:3px solid var(--n-line); border-radius:20px; display:grid; grid-template-columns:repeat(3, 1fr); gap:6px}
  .bz-pt{position:relative; aspect-ratio:1; min-width:0; padding:0; border:0; border-radius:10px; background:var(--n-off); overflow:hidden; cursor:pointer}
  .bz-pt svg{position:absolute; width:300%; height:300%; max-width:none}
  .bz-pt .n{position:absolute; left:5px; top:5px; min-width:22px; height:22px; box-sizing:border-box; padding:0 5px; border-radius:999px; background:var(--n-sky); color:var(--n-ink); font-style:normal; font-weight:900; font-size:.8rem; line-height:22px; text-align:center}
  .bz-pt.hint::after{content:""; position:absolute; inset:0; border:4px solid var(--n-hint); border-radius:10px; box-shadow:inset 0 0 0 2px var(--n-off)}
  .bz-gap2{aspect-ratio:1}
  .bz-goal{display:flex; align-items:center; gap:10px}
  .bz-goal > span:nth-child(2){display:flex; flex-direction:column; gap:2px; flex:1; min-width:0; overflow:hidden}
  .bz-goal .bz-sbtn{flex:none}
  .bz-goal small{font-size:.75rem; color:var(--n-muted)} .bz-goal b{font-size:.9rem; font-weight:800}
  .bz-goalpic svg{display:block; width:58px; height:58px; border-radius:10px; border:2px solid var(--n-line)}
  .bz-goal .bz-sbtn{min-height:44px; padding:0 14px; font-size:.85rem}
  @media (max-width:380px){.bz-notes{grid-template-columns:1fr} .bz-scene{padding:10px 8px} .bz-safe{padding:10px 8px 10px 14px} .bz-handle{display:none} .bz-goal > span:nth-child(2){display:none} .bz-goal{justify-content:space-between} .bz-stat b{font-size:1.05rem} .bz-sbtn{font-size:.85rem}}
  @media (prefers-reduced-motion:reduce){.bz-boat2,.bz-twinkle,.bz-win{transition:none} .bz-vault,.bz-stars.pop .bz-star.on{animation:none}}
  .bz-levels.five{grid-template-columns:repeat(5, 1fr)}
  .bz-lvl.blitz b{color:var(--n-accent)}
  .bz-plvl{gap:3px; padding:4px 2px}
  .bz-lthumb svg{display:block; width:30px; height:30px; border-radius:6px; border:1px solid var(--n-line)} .bz-lthumb.locked svg{filter:grayscale(1) brightness(.5)}
  .bz-win.dim{background:color-mix(in srgb, var(--n-lit) 42%, var(--n-off))}
  .bz-win.dim svg{opacity:.55}
  .bz-rule{margin:0; font-size:.78rem; font-weight:700; color:var(--n-muted); text-align:center}
  .bz-stat.hot b{color:var(--n-lit); animation:bzpulse .5s infinite alternate}
  @keyframes bzpulse{from{transform:scale(1)} to{transform:scale(1.12)}}
  .bz-rival{display:flex; align-items:center; gap:10px; padding:6px 10px 6px 6px; background:var(--n-card); border:1px solid var(--n-line); border-radius:16px}
  .bz-rival .bz-av svg{width:44px; height:44px; display:block}
  .bz-rival > span{display:flex; flex-direction:column; gap:1px; min-width:0}
  .bz-rival b{font-size:.9rem; font-weight:900} .bz-rival small{font-size:.72rem; color:var(--n-muted); font-weight:700}
  .bz-rival i{font-size:.75rem; line-height:1.25; color:var(--n-ink); opacity:.85}
  .bz-rival.beat{border-color:var(--n-accent); box-shadow:inset 0 0 0 1px var(--n-accent)} .bz-rival.beat b{color:var(--n-accent)}
  .bz-rival.lost .bz-av{animation:bzshake .35s 2}
  .bz-shelf{display:grid; grid-template-columns:repeat(9, 1fr); gap:4px}
  .bz-shelfi{display:block; padding:3px; border-radius:8px; border:1px solid var(--n-line); background:var(--n-off)}
  .bz-shelfi svg{display:block; width:100%; height:auto; filter:grayscale(1) brightness(.45)}
  .bz-shelfi.got svg{filter:none} .bz-shelfi.now{border-color:var(--n-accent)}
  .bz-nonotes{margin:0; padding:8px 10px; border-radius:10px; background:var(--n-off); font-size:.8rem; font-weight:700; line-height:1.35}
  .bz-safe.four .bz-tumblers{grid-template-columns:repeat(4, minmax(40px, 52px)); gap:6px} .bz-safe.four .bz-digit2{font-size:1.6rem} .bz-safe.four .bz-handle svg{width:52px; height:52px}
  @media (max-width:400px){.bz-safe.four .bz-handle{display:none}}
  .bz-puz{touch-action:none}
  .bz-dailies{margin:0 0 12px; padding:10px 12px; border:1px solid var(--line); border-radius:16px; background:var(--surface)}
  .bz-dhead{margin:0 0 8px; display:flex; flex-wrap:wrap; align-items:baseline; gap:4px 10px} .bz-dhead small{color:var(--muted); font-weight:700}
  .bz-dchips{display:grid; grid-template-columns:repeat(4, 1fr); gap:6px}
  .bz-dchip{display:flex; flex-direction:column; align-items:center; gap:2px; padding:8px 2px; border-radius:12px; border:1px solid var(--line); background:var(--surface); color:var(--ink); font:inherit; cursor:pointer; min-width:0}
  .bz-dchip:hover{border-color:var(--denim)} .bz-dchip.done{border-color:var(--denim); background:color-mix(in srgb, var(--denim) 10%, var(--surface))}
  .bz-dchip b{font-size:.74rem; font-weight:900; text-align:center; line-height:1.1} .bz-dchip small{font-size:.7rem; color:var(--muted); font-weight:700}
  .bz-dic{font-size:1.3rem; line-height:1}
  .bz-vs{font-weight:800}
  .bz-toggles{justify-content:center} .bz-toggles .ghost{font-size:.85rem; padding:6px 12px}
  @media (max-width:380px){.bz-dchip b{font-size:.66rem} .bz-rival i{display:none}}
  @media (prefers-reduced-motion:reduce){.bz-stat.hot b,.bz-rival.lost .bz-av{animation:none}}`;
  function addCSS(){ if (document.getElementById("bz-css")) return; const st = document.createElement("style"); st.id = "bz-css"; st.textContent = css; document.head.append(st); }

  window.BrainGame = {
    open(el, br){ bridge = br || null; root = el; addCSS(); hub(); },
    // exposed for the checker script
    _score: score, _clueText: clueText, _makeLock: makeLock, _codesOf: codesOf, _ctx: () => ctx, _pics: PICS, _loot: LOOT,
  };
})();
