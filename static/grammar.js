/* RoboDad Grammar with Dad: two games, content and logic together.
   Comparison Machine: spin silly things into similes and metaphors, then learn what makes an analogy.
   Tense Trouble: one tiny tense change, a totally different meaning, plus the Silly Sentence Time Machine.
   Every question and answer is hand-written and checked, so nothing is made up on the fly.
   index.html opens it with window.GrammarGame.open(container, bridge). */
(function(){
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const esc = (s) => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  // ======================= Comparison Machine =======================
  const COMPARE_LESSON = [
    ["Simile", "Compares two things using <b>like</b> or <b>as</b>.", "My little brother is as loud as a jet engine."],
    ["Metaphor", "Says one thing <b>is</b> another. No like, no as.", "My little brother is a jet engine."],
    ["Analogy", "<b>Explains</b> how something works by matching it to something familiar, part by part. It can use \"like\", but it goes further than describing.", "A firewall is like a bouncer at a club: it checks everyone and only lets the right ones in."],
  ];
  const SUBJECTS = ["my little brother", "the cafeteria at lunch", "Dad's old car", "Monday morning", "my phone at 2% battery", "the group chat",
    "Grandpa's snoring", "the math test", "my sock drawer", "our dog after a bath", "the school bus", "my brain during exams"];
  const QUALITIES = {
    loud: ["a jet engine", "a rock concert", "a marching band"],
    slow: ["a snail", "a sloth", "dial-up internet"],
    messy: ["a tornado", "a food fight", "a junk drawer"],
    fast: ["a cheetah", "a rocket", "lightning"],
    cold: ["an igloo", "a freezer", "a snowstorm"],
    bright: ["the sun", "a disco ball", "a lighthouse"],
    grumpy: ["a cat in a bathtub", "a bear woken up in January", "a storm cloud"],
    chaotic: ["a zoo", "a circus", "a pinball machine"],
    sleepy: ["a koala", "a hibernating bear", "a cat in a sunbeam"],
    tough: ["a brick wall", "a tank", "a rhino"],
  };
  // kind: s = simile, m = metaphor, a = analogy
  const SPOT = [
    ["My little brother eats like a vacuum cleaner.", "s", "It compares with \"like\"."],
    ["Her voice was as smooth as butter.", "s", "It compares with \"as… as\"."],
    ["The hallway was as quiet as a library on a Sunday.", "s", "\"As quiet as\" is the giveaway."],
    ["My dog snores like a chainsaw.", "s", "It compares with \"like\" and describes one thing: the noise."],
    ["The pizza was as big as a car tire.", "s", "\"As big as\" makes it a simile."],
    ["The ice was as slippery as a waterslide.", "s", "\"As slippery as\" makes it a simile."],
    ["The classroom was a zoo.", "m", "It says the classroom IS a zoo. No like, no as."],
    ["My bedroom is a disaster zone.", "m", "It says the room IS a disaster zone."],
    ["Dad's car is a dinosaur.", "m", "The car isn't really a dinosaur. Saying it IS one makes it a metaphor."],
    ["That test was a monster.", "m", "A test can't be a monster, so it's a metaphor."],
    ["The group chat is a volcano tonight.", "m", "It says the chat IS a volcano, about to erupt."],
    ["My alarm clock is my worst enemy.", "m", "It says the clock IS an enemy. No like or as."],
    ["Time is money.", "m", "It says time IS money. A classic metaphor."],
    ["A firewall is like a bouncer at a club: it checks everyone and only lets the right ones in.", "a", "It uses \"like\", but it explains how a firewall works by matching parts: bouncer = firewall, club = computer."],
    ["Your brain needs sleep the way a phone needs charging: skip it and everything slows down and shuts off early.", "a", "It explains why sleep matters by matching brain to phone and sleep to charging."],
    ["Practising a skill is like saving money: small amounts every day add up to something big.", "a", "It explains how practice works by matching it to saving, step by step."],
    ["The heart works like a pump: it pushes blood through pipes, which are your blood vessels.", "a", "It explains how the heart works: heart = pump, blood vessels = pipes."],
    ["A coach is to a team what a conductor is to an orchestra.", "a", "It matches a relationship: coach leads team the way a conductor leads an orchestra."],
    ["Learning to code is like learning a language: you learn words first, then the rules, then you write your own sentences.", "a", "It explains how coding is learned by matching each stage to learning a language."],
  ];
  const KIND_NAME = { s: "Simile", m: "Metaphor", a: "Analogy" };
  // finish the analogy: A is to B as C is to ?
  const FINISH = [
    ["Hot is to cold as up is to ___.", "down", ["over", "high", "top"], "They're opposites."],
    ["Puppy is to dog as kitten is to ___.", "cat", ["mouse", "pup", "litter"], "Young animal to grown-up animal."],
    ["Glove is to hand as sock is to ___.", "foot", ["shoe", "leg", "toe"], "What it covers."],
    ["Pilot is to plane as captain is to ___.", "ship", ["team", "car", "army"], "Who steers it."],
    ["Chapter is to book as episode is to ___.", "series", ["movie", "remote", "actor"], "A part of the whole."],
    ["Bird is to nest as bee is to ___.", "hive", ["honey", "flower", "sting"], "Where it lives."],
    ["Painter is to paint as potter is to ___.", "clay", ["paper", "brush", "glass"], "What they make things from."],
    ["Thermometer is to temperature as ruler is to ___.", "length", ["school", "pencil", "weight"], "What it measures."],
    ["Caterpillar is to butterfly as tadpole is to ___.", "frog", ["fish", "pond", "toad egg"], "What it grows into."],
    ["Hungry is to eat as tired is to ___.", "sleep", ["yawn", "bed", "run"], "The feeling, and what fixes it."],
    ["Library is to books as garage is to ___.", "cars", ["houses", "roads", "drivers"], "What's kept there."],
    ["Teacher is to student as coach is to ___.", "athlete", ["referee", "stadium", "whistle"], "Who they help get better."],
  ];

  // ======================= Tense Trouble =======================
  const TENSE_LESSON = [
    ["Past", "ate", "It already happened.", "The robot ate seventeen tacos."],
    ["Present", "eats", "It happens regularly, or it's true now.", "The robot eats tacos every Tuesday."],
    ["Future", "will eat", "It hasn't happened yet.", "The robot will eat seventeen tacos."],
    ["Present continuous", "is eating", "It's happening right now.", "The robot is eating seventeen tacos."],
    ["Present perfect", "has eaten", "It happened before now and still matters now.", "The robot has eaten all the tacos."],
    ["Past perfect", "had eaten", "It happened before another past moment.", "The robot had eaten the tacos before Dad got home."],
  ];
  // one tiny tense change, a different meaning. ok is the index (0 or 1) of the sentence that answers q.
  const PAIRS = [
    { sit: "Mom: \"Who ate the last slice of cake?\"", q: "Which one is a confession?", s: ["I ate it.", "I will eat it."], ok: 0, why: "\"Ate\" is past: it already happened. \"Will eat\" is future: the cake is still alive, but not for long." },
    { sit: "Coach: \"Did you finish your laps?\"", q: "Which one means you're done?", s: ["I have finished my laps.", "I am finishing my laps."], ok: 0, why: "\"Have finished\" (present perfect) means it's done. \"Am finishing\" (present continuous) means you're still running." },
    { sit: "Dad: \"Where's my homework folder? Where's the dog?\"", q: "Which one means Dad can still save the homework?", s: ["The dog is eating your homework.", "The dog ate your homework."], ok: 0, why: "\"Is eating\" means it's happening right now, so there's still time. \"Ate\" means it's already gone." },
    { sit: "Friend: \"Can I get a ride to the party with you?\"", q: "Which one means you can still say yes?", s: ["I went to the party.", "I'm going to the party."], ok: 1, why: "\"I'm going\" is a plan for the future. \"I went\" means the party is already over." },
    { sit: "Grandma: \"Do you play the piano?\"", q: "Which one means you still play?", s: ["I play the piano.", "I played the piano."], ok: 0, why: "Simple present (\"play\") is for habits and things true now. \"Played\" sounds like you stopped." },
    { sit: "Teacher: \"What happened to your essay?\"", q: "Which one means the essay is safe?", s: ["I was finishing the essay when the power went out.", "I had finished the essay when the power went out."], ok: 1, why: "\"Had finished\" (past perfect) means it was done before the power cut. \"Was finishing\" means you were in the middle of it. Uh-oh." },
    { sit: "You're looking under the couch cushions.", q: "Which one means your phone is STILL lost?", s: ["I lost my phone.", "I have lost my phone."], ok: 1, why: "Present perfect (\"have lost\") connects the past to right now: still lost. \"I lost my phone\" is just a past event. Maybe you found it." },
    { sit: "You text Dad about your room.", q: "Which one means Dad can go and check it now?", s: ["I will clean my room.", "I cleaned my room."], ok: 1, why: "\"Cleaned\" is past: done. \"Will clean\" is a promise Dad has heard before." },
    { sit: "You're running to the bus stop.", q: "Which one means you can still catch it?", s: ["The bus is leaving.", "The bus left."], ok: 0, why: "\"Is leaving\" is happening right now, so run! \"Left\" means it's already gone." },
    { sit: "Your friend: \"Why didn't you answer my call?\"", q: "Which one means the call came in the middle of your nap?", s: ["I slept when you called.", "I was sleeping when you called."], ok: 1, why: "Past continuous (\"was sleeping\") means it was already in progress when the call came. \"Slept when you called\" sounds like the call made you fall asleep." },
    { sit: "Family dinner. You're running late.", q: "Which one means there'll be no food left for you?", s: ["We will be eating when you arrive.", "We will have eaten by the time you arrive."], ok: 1, why: "Future perfect (\"will have eaten\") means it'll be finished before you get there. \"Will be eating\" means you can still grab a plate." },
    { sit: "Your friend is about to sit on your bed.", q: "Which one should make them check the blanket first?", s: ["I used to have a pet snake.", "I have a pet snake."], ok: 1, why: "\"I have\" is present: the snake lives here now. \"Used to have\" means it's in the past." },
    { sit: "You're heading out the door.", q: "Which one means you need an umbrella right now?", s: ["It rained.", "It's raining."], ok: 1, why: "\"It's raining\" (present continuous) is happening now. \"It rained\" is over." },
    { sit: "Your friend is late. Again.", q: "Which one means you're still standing there, annoyed?", s: ["I've been waiting for an hour.", "I waited for an hour."], ok: 0, why: "Present perfect continuous (\"have been waiting\") started in the past and is still going. \"Waited\" means you already gave up." },
    { sit: "Your little brother wants a cookie.", q: "Which one means they're ready to eat?", s: ["The cookies are baking.", "The cookies have baked."], ok: 1, why: "\"Have baked\" means they're done. \"Are baking\" means they're still in the oven. Patience." },
    { sit: "Mom, about your brother and the TV remote:", q: "Which one is a warning about a habit?", s: ["My brother breaks things.", "My brother broke something."], ok: 0, why: "Simple present (\"breaks\") describes a habit, something that keeps happening. \"Broke\" is one past event." },
    { sit: "Your friend needs to talk tonight.", q: "Which one is a promise?", s: ["I called you when I got home.", "I'll call you when I get home."], ok: 1, why: "\"I'll call\" is future: a promise. \"I called\" already happened." },
    { sit: "Movie night at the theatre.", q: "Which one means you missed the beginning?", s: ["The movie had started when we arrived.", "The movie started when we arrived."], ok: 0, why: "Past perfect (\"had started\") means it began before you got there. \"Started when we arrived\" means it began the moment you sat down." },
  ];
  // Silly Sentence Time Machine: random nonsense sentences, sent through time.
  const TM_SUBJECTS = ["the robot", "Grandma", "my little brother", "a confused pigeon", "Dad", "the principal", "a tiny dragon", "my math teacher", "the cat next door", "Coach"];
  // [base, he/she form, past, past participle, -ing]
  const TM_VERBS = [
    ["eat", "eats", "ate", "eaten", "eating"], ["throw", "throws", "threw", "thrown", "throwing"], ["sing to", "sings to", "sang to", "sung to", "singing to"],
    ["bring", "brings", "brought", "brought", "bringing"], ["catch", "catches", "caught", "caught", "catching"], ["hide", "hides", "hid", "hidden", "hiding"],
    ["build", "builds", "built", "built", "building"], ["draw", "draws", "drew", "drawn", "drawing"], ["buy", "buys", "bought", "bought", "buying"],
    ["teach", "teaches", "taught", "taught", "teaching"], ["juggle", "juggles", "juggled", "juggled", "juggling"], ["write about", "writes about", "wrote about", "written about", "writing about"],
    ["feed", "feeds", "fed", "fed", "feeding"], ["find", "finds", "found", "found", "finding"], ["ride", "rides", "rode", "ridden", "riding"],
  ];
  const TM_OBJECTS = ["seventeen tacos", "a rubber chicken", "the school bus", "a very angry pineapple", "a karaoke machine", "forty-two pancakes",
    "the Wi-Fi password", "a sleepy hamster", "a trophy made of cheese", "a skateboarding llama"];
  // the "-ed" mistake for irregular verbs, e.g. eated, throwed (only used when the real past is different)
  const edForm = (base) => { const [v, ...rest] = base.split(" "); return [(v.endsWith("e") ? v + "d" : v + "ed"), ...rest].join(" "); };
  const TARGETS = [
    { id: "past", label: "Send it to the PAST", cue: "Yesterday,", make: (V) => ({ ok: V[2], no: [V[2] === edForm(V[0]) ? V[0] : edForm(V[0]), V[1], "will " + V[2]] }),
      why: (V) => `Simple past: "${V[2]}". ${V[2] !== edForm(V[0]) ? `"${V[0].split(" ")[0]}" is irregular, so it's not "${edForm(V[0]).split(" ")[0]}".` : "It's a regular verb, so add -ed."}` },
    { id: "future", label: "Send it to the FUTURE", cue: "Tomorrow,", make: (V) => ({ ok: "will " + V[0], no: ["will " + V[2], V[2], "is " + V[0]] }),
      why: (V) => `Future: "will" + the base verb, so "will ${V[0]}". Never "will ${V[2]}".` },
    { id: "now", label: "Make it happen RIGHT NOW", cue: "Right now,", make: (V) => ({ ok: "is " + V[4], no: [V[4], "is " + V[0], V[2]] }),
      why: (V) => `Present continuous: "is" + the -ing verb, so "is ${V[4]}". Leave out "is" and the sentence breaks.` },
    { id: "perfect", label: "Make it happen BEFORE NOW", cue: "Since lunch,", make: (V) => ({ ok: "has " + V[3], no: [V[2] !== V[3] ? "has " + V[2] : "has " + V[0], "have " + V[3], "is " + V[3]] }),
      why: (V) => `Present perfect: "has" + the past participle, so "has ${V[3]}". With "since", you need has or have.` },
    { id: "neg", label: "Make it NEGATIVE (past)", cue: "Yesterday,", make: (V) => ({ ok: "didn't " + V[0], no: ["didn't " + V[2], "not " + V[2], "doesn't " + V[2]] }),
      why: (V) => `After "didn't", use the base verb: "didn't ${V[0]}". "Didn't" already shows it's past.` },
    { id: "question", label: "Make it a QUESTION (past)", full: true },
  ];

  // ======================= the game =======================
  const KEY = "robodad.grammar";
  const load = () => { try { const d = JSON.parse(localStorage.getItem(KEY) || "{}"); return { xp: d.xp || 0, bestStreak: d.bestStreak || 0, best: d.best || {} }; } catch { return { xp: 0, bestStreak: 0, best: {} }; } };
  const save = (d) => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch {} };
  const SAY = {
    right: ["Nailed it!", "That's my kid.", "Grammar genius.", "Correct! Your English teacher just felt a disturbance in the Force.", "Boom."],
    wrong: ["Not quite.", "Close, but no taco.", "Plot twist: that's not it.", "Nope. Here's the trick."],
  };
  let box = null, bridge = null, tab = "compare", spin = null, round = null;

  function stats(){ const d = load(); return `<div class="v-stats"><span>⭐ ${d.xp} XP</span><span>🔥 Best streak ${d.bestStreak}</span></div>${bridge?.badges ? bridge.badges() : ""}`; }

  function render(){
    box.parentElement.querySelectorAll("[data-gtab]").forEach(b => b.setAttribute("aria-selected", String(b.dataset.gtab === tab)));
    round = null;
    if (tab === "compare") renderCompare(); else renderTense();
  }
  function renderCompare(){
    if (!spin) newSpin();
    const { subj, q, img } = spin;
    box.innerHTML = `${stats()}
      <div class="v-card"><span class="v-k">🎰 The Comparison Machine</span>
        <div class="g-reels"><span>${esc(cap(subj))}</span><span>${esc(q)}</span><span>${esc(img)}</span></div>
        <p><b>Simile:</b> ${esc(cap(subj))} is <mark>as</mark> ${esc(q)} <mark>as</mark> ${esc(img)}.</p>
        <p><b>Metaphor:</b> ${esc(cap(subj))} <mark>is</mark> ${esc(img)}.</p>
        <p class="small">See it? The simile needs "as… as". The metaphor drops it and just says it <i>is</i>. Neither one explains anything, so neither is an analogy.</p>
        <div class="row"><button class="primary" type="button" data-gact="spin">🎰 Spin again</button>
          <button class="ghost" type="button" data-gact="mine">Write my own, Dad checks it</button></div></div>
      <div class="row"><button class="primary" type="button" data-gact="play-spot">Play: Simile, metaphor or analogy?</button>
        <button class="ghost" type="button" data-gact="play-finish">Play: Finish the analogy</button></div>
      <details class="v-card g-guide"><summary class="v-k">Dad's quick guide: simile vs metaphor vs analogy</summary>${COMPARE_LESSON.map(([n, d, ex]) => `<p><b>${n}:</b> ${d}<br><i>${esc(ex)}</i></p>`).join("")}</details>`;
  }
  function newSpin(){ const q = pick(Object.keys(QUALITIES)); spin = { subj: pick(SUBJECTS), q, img: pick(QUALITIES[q]) }; }
  function renderTense(){
    box.innerHTML = `${stats()}
      <div class="row"><button class="primary" type="button" data-gact="play-pairs">Play: Tense Trouble</button>
        <button class="primary" type="button" data-gact="play-tm">Play: Silly Sentence Time Machine</button></div>
      <p class="small">Tense Trouble: one tiny tense change, a totally different meaning. Time Machine: Dad spins a silly sentence, and you send it through time.</p>
      <details class="v-card g-guide" open><summary class="v-k">Dad's time map: six tenses</summary>
        <div class="g-tenses">${TENSE_LESSON.map(([n, f, use, ex]) => `<div><b>${n}</b> · <mark>${esc(f)}</mark><br><small>${esc(use)}</small><br><i>${esc(ex)}</i></div>`).join("")}</div></details>`;
  }

  // ---------- rounds: 8 multiple-choice questions ----------
  function questions(kind){
    if (kind === "spot") return shuffle(SPOT).slice(0, 8).map(([t, k, why]) => ({ head: "Simile, metaphor or analogy?", prompt: t, opts: ["Simile", "Metaphor", "Analogy"], ok: KIND_NAME[k], why, keep: true }));
    if (kind === "finish") return shuffle(FINISH).slice(0, 8).map(([t, ok, no, why]) => ({ head: "Finish the analogy", prompt: t, opts: shuffle([ok, ...no]), ok, why: `${ok[0].toUpperCase() + ok.slice(1)}. The link: ${why.charAt(0).toLowerCase() + why.slice(1)}` }));
    if (kind === "pairs") return shuffle(PAIRS).slice(0, 8).map(p => ({ head: p.sit, prompt: p.q, opts: p.s, ok: p.s[p.ok], why: p.why, keep: true, sentences: true }));
    // time machine
    return Array.from({ length: 8 }, (_, i) => {
      const subj = pick(TM_SUBJECTS), V = pick(TM_VERBS), obj = pick(TM_OBJECTS), T = TARGETS[i % TARGETS.length];
      const base = `${cap(subj)} ${V[1]} ${obj}.`;
      if (T.full) {
        const ok = `Did ${subj} ${V[0]} ${obj}?`;
        return { head: `${T.label}: "${base}"`, prompt: "Pick the right question:", ok, sentences: true,
          opts: shuffle([ok, `Did ${subj} ${V[2]} ${obj}?`, `${cap(V[2].split(" ")[0])} ${subj}${V[2].includes(" ") ? " " + V[2].split(" ").slice(1).join(" ") : ""} ${obj}?`, `Does ${subj} ${V[2]} ${obj}?`]),
          why: `Past questions start with "Did", then the base verb: "Did ${subj} ${V[0]}…?" "Did" already carries the past.` };
      }
      const m = T.make(V);
      return { head: `${T.label}: "${base}"`, prompt: `${T.cue} ${subj} ___ ${obj}.`, ok: m.ok, opts: shuffle([m.ok, ...m.no]), why: T.why(V) };
    });
  }
  function startRound(kind){ round = { kind, qs: questions(kind), n: 0, score: 0, streak: 0, top: 0, xp: 0, done: false }; ask(); }
  function ask(){
    const R = round, q = R.qs[R.n]; R.done = false;
    box.innerHTML = `<div class="v-stats"><span>Question ${R.n + 1} of ${R.qs.length}</span><span>✅ ${R.score}</span><span>🔥 ${R.streak}</span><span>⭐ +${R.xp}</span></div>
      <p class="g-head">${esc(q.head)}</p><p class="brain-q">${esc(q.prompt)}</p>
      <div class="v-opts${q.sentences ? " g-wide" : ""}">${q.opts.map((o, k) => `<button type="button" data-gpick="${k}">${esc(o)}</button>`).join("")}</div>
      <p id="gMsg" class="brain-msg" role="status" aria-live="polite"></p>
      <div class="row" id="gNext"><button class="ghost" type="button" data-gact="quit">Back</button></div>`;
    box.querySelector("[data-gpick]")?.focus();
  }
  function answer(k){
    const R = round; if (!R || R.done) return; R.done = true;
    const q = R.qs[R.n], right = q.opts[k] === q.ok;
    box.querySelectorAll("[data-gpick]").forEach((b, i) => { b.disabled = true; if (q.opts[i] === q.ok) b.classList.add("ok"); else if (i === k) b.classList.add("bad"); });
    if (right) { R.score++; R.streak++; R.top = Math.max(R.top, R.streak); R.xp += 10 + Math.min(R.streak - 1, 5) * 2; } else R.streak = 0;
    box.querySelector("#gMsg").textContent = `${pick(right ? SAY.right : SAY.wrong)} ${q.why}`;
    const last = R.n + 1 >= R.qs.length;
    box.querySelector("#gNext").innerHTML = `<button class="primary" type="button" data-gact="next">${last ? "See results" : "Next"}</button>
      <button class="ghost" type="button" data-gact="ask">Ask Dad why</button>`;
    box.querySelector("[data-gact=next]").focus();
  }
  function finish(){
    const R = round, d = load();
    d.xp += R.xp; d.bestStreak = Math.max(d.bestStreak, R.top); d.best[R.kind] = Math.max(d.best[R.kind] || 0, R.score); save(d);
    bridge.record?.("round", R.kind, R.score);
    const verdict = R.score === 8 ? "Perfect round! Your English teacher would frame this." : R.score >= 6 ? "Strong round. Dad's impressed." : R.score >= 4 ? "Not bad. One more round and it'll click." : "Tricky one. Read the time map, then try again.";
    box.innerHTML = `${stats()}<div class="v-card"><p class="brain-q">${R.score}/8 · +${R.xp} XP</p><p>${verdict}</p><p>Best streak this round: ${R.top} · your best here: ${d.best[R.kind]}/8</p></div>
      <div class="row"><button class="primary" type="button" data-gact="again">Play again</button><button class="ghost" type="button" data-gact="quit">Back</button></div>`;
    round = { kind: R.kind, over: true };
  }

  function onClick(e){
    const t = e.target.closest("button"); if (!t || !box.contains(t)) return;
    if (t.dataset.gpick !== undefined) return answer(+t.dataset.gpick);
    const a = t.dataset.gact;
    if (a === "spin") { bridge.record?.("spin"); newSpin(); renderCompare(); box.querySelector(".g-reels")?.classList.add("spinning"); }
    else if (a === "mine") bridge.ask("Is this a simile, a metaphor or an analogy? Check mine and tell me how to make it better: ");
    else if (a?.startsWith("play-")) startRound(a.slice(5));
    else if (a === "next") { round.n++; round.n >= round.qs.length ? finish() : ask(); }
    else if (a === "again") startRound(round.kind);
    else if (a === "quit") render();
    else if (a === "ask") { const q = round.qs[round.n]; bridge.ask(`Grammar question: "${q.prompt}" The answer is "${q.ok}". Can you explain why, with another example?`); }
  }

  window.GRAMMAR = { COMPARE_LESSON, SUBJECTS, QUALITIES, SPOT, FINISH, TENSE_LESSON, PAIRS, TM_SUBJECTS, TM_VERBS, TM_OBJECTS, TARGETS, questions };
  window.GrammarGame = {
    open(container, br){
      if (box !== container) { container.addEventListener("click", onClick); }
      box = container; bridge = br; render();
    },
    tab(name){ tab = name; render(); },
  };
})();
