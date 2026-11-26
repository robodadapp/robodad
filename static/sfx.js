/*
 * RoboDad sound effects: short game sounds made live in the browser, so there are no audio files and no licences.
 * One shared audio channel with a limiter, so nothing here can clip or jump out at you, and one switch to mute it all.
 *
 *   RoboSfx.play("tap")                         // any name from RoboSfx.names
 *   RoboSfx.play("correct", { streak: 4 })      // pickups and answers climb a scale as the streak grows
 *   RoboSfx.play("win", { stars: 3 })
 *   RoboSfx.theme("gamer")                      // a dad's timbre: gamer, skater, arcade, coach, modern, lab, professor, grandpa, bookworm
 *   RoboSfx.muted = true                        // remembered between visits
 *
 * Every busy sound has several variants and a small random pitch shift, and the same variant never plays twice in a row,
 * so a sound heard a hundred times in one game doesn't turn into a machine gun. Musical sounds keep their pitch exactly.
 */
(function () {
  const KEY = "robodad.sfx";
  let muted = false;
  try { muted = localStorage.getItem(KEY) === "0"; } catch (e) {}
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const THEMES = {
    default: { wave: null, semi: 0 }, gamer: { wave: "square", semi: 0 }, skater: { wave: "sawtooth", semi: 2 },
    arcade: { wave: "square", semi: 3 }, coach: { wave: "triangle", semi: -2 }, modern: { wave: null, semi: 0 },
    lab: { wave: "sine", semi: 5 }, professor: { wave: "triangle", semi: -3 }, grandpa: { wave: "square", semi: -5 },
    bookworm: { wave: "triangle", semi: -1 },
  };
  const TYPE_GAIN = { sine: 1, triangle: 0.9, square: 0.4, sawtooth: 0.45 };
  const PENTA = [72, 74, 76, 79, 81, 84, 86, 88, 91, 93, 96];            // C major pentatonic: anything climbing it sounds happy
  let ctx = null, bus = null, themeKey = "default";
  const noiseBufs = new WeakMap();

  function mkBus(c) {
    const master = c.createGain(); master.gain.value = 1.5;
    const lim = c.createDynamicsCompressor();                                // a brick-wall-ish limiter
    lim.threshold.value = -10; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.003; lim.release.value = 0.12;
    master.connect(lim).connect(c.destination);
    return master;
  }
  function ensure() {
    if (ctx) return ctx;
    const A = window.AudioContext || window.webkitAudioContext; if (!A) return null;
    try { ctx = new A(); bus = mkBus(ctx); } catch (e) { ctx = null; }
    return ctx;
  }

  // the little toolkit every sound is built from; o = { rate, theme }
  function kit(c, dest, o) {
    const th = THEMES[o.theme || themeKey] || THEMES.default;
    const r = (o.rate || 1) * Math.pow(2, th.semi / 12), jv = () => 1 + (Math.random() - 0.5) * 0.18;
    const noiseBuf = () => {
      let b = noiseBufs.get(c);
      if (!b) { b = c.createBuffer(1, c.sampleRate, c.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; noiseBufs.set(c, b); }
      return b;
    };
    return {
      r, th,
      // one pitched note. f in Hz, themed unless type is given
      tone(f, t, dur, { type, vol = 0.12, to = 0, att = 0.004, lp = 0, vib = 0, keep = false } = {}) {
        const ty = type || th.wave || "sine", rr = keep ? 1 : r;
        const osc = c.createOscillator(), g = c.createGain(); osc.type = ty;
        osc.frequency.setValueAtTime(f * rr, t); if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to * rr), t + dur);
        const v = vol * (TYPE_GAIN[ty] || 1) * jv();
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(v, 0.0002), t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        let n = osc;
        if (lp) { const f2 = c.createBiquadFilter(); f2.type = "lowpass"; f2.frequency.value = lp; n.connect(f2); n = f2; }
        if (vib) { const l = c.createOscillator(), lg = c.createGain(); l.frequency.value = vib; lg.gain.value = f * 0.025; l.connect(lg).connect(osc.frequency); l.start(t); l.stop(t + dur + 0.05); }
        n.connect(g).connect(dest); osc.start(t); osc.stop(t + dur + 0.05);
      },
      // a burst of filtered noise: clicks, scrapes, splashes
      noise(t, dur, { freq = 1800, q = 1, vol = 0.12, to = 0, type = "bandpass", att = 0.002 } = {}) {
        const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
        s.buffer = noiseBuf(); f.type = type; f.Q.value = q;
        const fr = Math.sqrt(r);
        f.frequency.setValueAtTime(freq * fr, t); if (to) f.frequency.exponentialRampToValueAtTime(Math.max(40, to * fr), t + dur);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(vol * jv(), 0.0002), t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        s.connect(f).connect(g).connect(dest); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.03);
      },
      // a soft bell: a sine with an inharmonic partner
      bell(f, t, vol = 0.1, dur = 0.9) {
        this.tone(f, t, dur, { type: "sine", vol, att: 0.003, keep: true });
        this.tone(f * 2.76, t, dur * 0.4, { type: "sine", vol: vol * 0.25, att: 0.003, keep: true });
      },
    };
  }

  const scale = (streak) => PENTA[Math.max(0, Math.min(PENTA.length - 3, streak))];
  // each sound: n variants, jit = random pitch shift (0 for musical sounds), gap = minimum ms between plays
  const SOUNDS = {
    // ---- everyday interface
    tap:    { n: 3, jit: 0.07, fn: (k, t, o) => k.tone([480, 520, 560][o.v], t, 0.05, { vol: 0.1, to: [430, 470, 500][o.v] }) },
    back:   { n: 2, jit: 0.05, fn: (k, t, o) => k.tone([380, 340][o.v], t, 0.07, { vol: 0.1, to: 260 }) },
    select: { n: 3, jit: 0.06, fn: (k, t, o) => k.tone([700, 760, 820][o.v], t, 0.035, { type: "triangle", vol: 0.09 }) },
    toggle: { n: 2, jit: 0, fn: (k, t, o) => { const up = o.on !== false; k.tone(up ? 523 : 659, t, 0.05, { vol: 0.09 }); k.tone(up ? 784 : 440, t + 0.055, 0.07, { vol: 0.09 }); } },
    open:   { n: 1, jit: 0.04, fn: (k, t) => { k.noise(t, 0.12, { freq: 500, to: 2200, q: 0.8, vol: 0.06 }); k.tone(440, t + 0.04, 0.09, { vol: 0.07, to: 660 }); } },
    close:  { n: 1, jit: 0.04, fn: (k, t) => { k.noise(t, 0.1, { freq: 2200, to: 500, q: 0.8, vol: 0.05 }); k.tone(520, t, 0.08, { vol: 0.06, to: 330 }); } },
    hint:   { n: 1, jit: 0, fn: (k, t) => { k.bell(mtof(88), t, 0.08, 0.8); k.bell(mtof(93), t + 0.09, 0.07, 0.8); } },
    badge:  { n: 1, jit: 0, gap: 200, fn: (k, t) => { [84, 88, 91, 96].forEach((m, i) => k.tone(mtof(m), t + i * 0.08, 0.35, { type: "triangle", vol: 0.1, keep: true })); k.bell(mtof(103), t + 0.34, 0.07, 1); } },
    xp:     { n: 2, jit: 0.05, fn: (k, t, o) => k.tone([1320, 1480][o.v], t, 0.05, { type: "triangle", vol: 0.07, keep: true }) },
    flame:  { n: 1, jit: 0, fn: (k, t) => { k.noise(t, 0.35, { freq: 400, to: 3000, q: 0.7, vol: 0.07 }); [79, 84, 88].forEach((m, i) => k.tone(mtof(m), t + 0.18 + i * 0.07, 0.3, { type: "triangle", vol: 0.09, keep: true })); } },

    // ---- answers and results
    correct: { n: 1, jit: 0, fn: (k, t, o) => {            // climbs the scale with the streak, so a run of right answers sounds like a run
      const m = scale(o.streak || 0);
      k.tone(mtof(m), t, 0.16, { type: "triangle", vol: 0.12, keep: true }); k.tone(mtof(m + 7), t + 0.075, 0.26, { type: "triangle", vol: 0.12, keep: true });
      if ((o.streak || 0) >= 3) k.noise(t + 0.1, 0.18, { freq: 7000, q: 0.5, type: "highpass", vol: 0.04 });
    } },
    wrong:   { n: 2, jit: 0.05, fn: (k, t, o) => { k.tone([233, 208][o.v], t, 0.16, { type: "triangle", vol: 0.12, to: [175, 156][o.v], lp: 900 }); k.tone([175, 156][o.v], t + 0.09, 0.2, { type: "triangle", vol: 0.08, to: [131, 117][o.v], lp: 700 }); } },
    streak:  { n: 1, jit: 0, gap: 150, fn: (k, t, o) => { const m = scale(Math.min(7, (o.streak || 3) - 1)); [0, 4, 7, 12].forEach((s, i) => k.tone(mtof(m + s), t + i * 0.06, 0.22, { type: "triangle", vol: 0.1, keep: true })); } },
    roundDone: { n: 1, jit: 0, gap: 300, fn: (k, t) => { [72, 76, 79, 84].forEach((m, i) => k.tone(mtof(m), t + i * 0.1, 0.3, { type: "triangle", vol: 0.11, keep: true })); k.bell(mtof(96), t + 0.45, 0.07, 1); } },
    win:     { n: 1, jit: 0, gap: 400, fn: (k, t, o) => {
      const seq = [[72, 76, 79], [72, 76, 79, 84], [72, 76, 79, 84, 88, 91]][Math.max(0, Math.min(2, (o.stars || 3) - 1))];
      seq.forEach((m, i) => { k.tone(mtof(m), t + i * 0.09, 0.3, { type: "triangle", vol: 0.11, keep: true }); k.tone(mtof(m - 12), t + i * 0.09, 0.3, { type: "sine", vol: 0.05, keep: true }); });
      k.bell(mtof(seq[seq.length - 1] + 12), t + seq.length * 0.09, 0.07, 1.1);
    } },
    lose:    { n: 1, jit: 0, gap: 400, fn: (k, t) => [67, 64, 60].forEach((m, i) => k.tone(mtof(m), t + i * 0.14, 0.3, { type: "triangle", vol: 0.1, keep: true, lp: 1500 })) },
    tie:     { n: 1, jit: 0, gap: 400, fn: (k, t) => { k.tone(mtof(67), t, 0.25, { type: "triangle", vol: 0.1, keep: true }); k.tone(mtof(67), t + 0.2, 0.3, { type: "triangle", vol: 0.1, keep: true }); } },

    // ---- Tile Talk: wooden tiles on a board
    tilePick:   { n: 3, jit: 0.08, fn: (k, t, o) => { k.noise(t, 0.03, { freq: [2200, 2500, 2000][o.v], q: 3, vol: 0.16 }); k.tone([320, 350, 300][o.v], t, 0.04, { type: "sine", vol: 0.08 }); } },
    tilePlace:  { n: 4, jit: 0.08, fn: (k, t, o) => { k.noise(t, 0.045, { freq: [1300, 1100, 1500, 1200][o.v], q: 4, vol: 0.24 }); k.tone([210, 190, 230, 200][o.v], t, 0.09, { type: "triangle", vol: 0.14, to: 150 }); } },
    tileReturn: { n: 3, jit: 0.08, fn: (k, t, o) => { k.noise(t, 0.04, { freq: [1800, 2100, 1600][o.v], q: 3, vol: 0.12 }); k.tone([430, 470, 400][o.v], t, 0.05, { type: "sine", vol: 0.06 }); } },
    rackShuffle: { n: 2, jit: 0.05, fn: (k, t, o) => { for (let i = 0; i < 7; i++) k.noise(t + i * 0.05 + Math.random() * 0.02, 0.035, { freq: 1200 + Math.random() * 1400, q: 3, vol: 0.12 }); } },
    wordOk:     { n: 1, jit: 0, gap: 120, fn: (k, t, o) => {                   // a tick per few points, climbing, then a settle
      const n = Math.max(3, Math.min(9, Math.round((o.points || 12) / 5)));
      for (let i = 0; i < n; i++) k.tone(mtof(84 + Math.round(i * 12 / n)), t + i * 0.055, 0.05, { type: "triangle", vol: 0.08, keep: true });
      k.tone(mtof(91), t + n * 0.055 + 0.02, 0.3, { type: "triangle", vol: 0.1, keep: true });
    } },
    invalid:    { n: 2, jit: 0.04, fn: (k, t, o) => { k.tone([150, 135][o.v], t, 0.16, { type: "square", vol: 0.12, lp: 420, keep: true }); k.tone([156, 141][o.v], t, 0.16, { type: "square", vol: 0.1, lp: 420, keep: true }); } },
    premium:    { n: 1, jit: 0, fn: (k, t) => { k.noise(t, 0.25, { freq: 500, to: 4500, q: 0.8, vol: 0.09 }); k.tone(mtof(91), t + 0.18, 0.3, { type: "triangle", vol: 0.1, keep: true }); } },
    bingo:      { n: 1, jit: 0, gap: 800, fn: (k, t) => {
      [72, 76, 79, 84, 88, 91, 96].forEach((m, i) => k.tone(mtof(m), t + i * 0.07, 0.4, { type: "triangle", vol: 0.1, keep: true }));
      [60, 67].forEach((m) => k.tone(mtof(m), t + 0.5, 0.9, { type: "sine", vol: 0.1, keep: true }));
      k.noise(t + 0.5, 0.6, { freq: 6000, q: 0.5, type: "highpass", vol: 0.06 }); k.bell(mtof(103), t + 0.55, 0.08, 1.4);
    } },
    turn:       { n: 1, jit: 0.03, fn: (k, t) => { k.tone(523, t, 0.07, { vol: 0.09 }); k.tone(659, t + 0.08, 0.1, { vol: 0.09 }); } },
    lowTime:    { n: 1, jit: 0, gap: 300, fn: (k, t) => { k.tone(1100, t, 0.05, { type: "triangle", vol: 0.1, keep: true }); k.tone(1100, t + 0.12, 0.05, { type: "triangle", vol: 0.1, keep: true }); } },
    pass:       { n: 1, jit: 0.04, fn: (k, t) => k.tone(300, t, 0.14, { vol: 0.08, to: 240 }) },

    // ---- Hands-on puzzles
    lightOn:  { n: 3, jit: 0.06, fn: (k, t, o) => { k.noise(t, 0.02, { freq: 3200, q: 2, vol: 0.14 }); k.tone([190, 205, 175][o.v], t, 0.06, { type: "triangle", vol: 0.1 }); k.tone(mtof(96), t + 0.01, 0.1, { type: "sine", vol: 0.03, keep: true }); } },
    lightOff: { n: 3, jit: 0.06, fn: (k, t, o) => { k.noise(t, 0.02, { freq: 2300, q: 2, vol: 0.14 }); k.tone([150, 160, 140][o.v], t, 0.07, { type: "triangle", vol: 0.1 }); } },
    dialTick: { n: 3, jit: 0.05, fn: (k, t, o) => { k.noise(t, 0.015, { freq: 3400, q: 3, vol: 0.14 }); k.tone(1200 + (o.digit || 0) * 40, t, 0.02, { type: "triangle", vol: 0.07, keep: true }); } },
    safeNo:   { n: 2, jit: 0.04, fn: (k, t, o) => { k.tone([95, 88][o.v], t, 0.25, { type: "sine", vol: 0.2, to: 60 }); k.noise(t, 0.08, { freq: 700, q: 1, vol: 0.12 }); } },
    safeOpen: { n: 1, jit: 0, gap: 500, fn: (k, t) => { k.noise(t, 0.06, { freq: 2600, q: 2, vol: 0.14 }); k.tone(80, t + 0.05, 0.2, { type: "sine", vol: 0.2, to: 55 }); k.noise(t + 0.3, 0.5, { freq: 450, to: 220, q: 6, vol: 0.07 }); [79, 84, 88].forEach((m, i) => k.tone(mtof(m), t + 0.55 + i * 0.09, 0.4, { type: "triangle", vol: 0.1, keep: true })); } },
    plank:    { n: 2, jit: 0.06, fn: (k, t, o) => { k.tone([110, 98][o.v], t, 0.28, { type: "sawtooth", vol: 0.08, to: [88, 80][o.v], lp: 500, vib: 9, keep: true }); k.noise(t, 0.12, { freq: 300, q: 1, vol: 0.05 }); } },
    splash:   { n: 2, jit: 0.07, fn: (k, t, o) => { k.noise(t, 0.35, { type: "lowpass", freq: [3000, 2400][o.v], to: 400, q: 0.7, vol: 0.2 }); k.noise(t + 0.06, 0.22, { freq: 1500, q: 1, vol: 0.07 }); } },
    boatGo:   { n: 1, jit: 0.04, fn: (k, t) => { [0, 0.26].forEach((d) => { k.noise(t + d, 0.2, { type: "lowpass", freq: 1800, to: 500, q: 0.7, vol: 0.12 }); k.tone(130, t + d, 0.12, { type: "sine", vol: 0.1, to: 90 }); }); } },
    lantern:  { n: 2, jit: 0, fn: (k, t, o) => k.bell(mtof([96, 98][o.v]), t, 0.07, 0.5) },
    zombie:   { n: 1, jit: 0.03, gap: 400, fn: (k, t) => k.tone(105, t, 0.55, { type: "sawtooth", vol: 0.09, to: 68, lp: 330, vib: 6, att: 0.06, keep: true }) },
    slide:    { n: 3, jit: 0.07, fn: (k, t, o) => { k.noise(t, 0.09, { freq: [800, 950, 700][o.v], to: [1400, 1200, 1100][o.v], q: 1.2, vol: 0.11 }); k.tone(160, t + 0.07, 0.05, { type: "triangle", vol: 0.08, to: 120 }); } },

    // ---- arcade and prize counter
    ticket:      { n: 2, jit: 0.04, fn: (k, t, o) => { for (let i = 0; i < 6; i++) k.noise(t + i * 0.045, 0.02, { freq: [2800, 3100][o.v] + i * 60, q: 4, vol: 0.1 }); } },
    coin:        { n: 2, jit: 0, fn: (k, t, o) => { k.tone(mtof(83), t, 0.07, { type: "square", vol: 0.1, keep: true }); k.tone(mtof([88, 90][o.v]), t + 0.07, 0.3, { type: "square", vol: 0.1, keep: true }); } },
    counterBell: { n: 1, jit: 0, fn: (k, t) => { k.bell(mtof(96), t, 0.12, 1.4); k.bell(mtof(103), t + 0.02, 0.05, 1); } },
    prize:       { n: 1, jit: 0, gap: 500, fn: (k, t) => { k.bell(mtof(96), t, 0.1, 1.2); [84, 88, 91, 96, 100].forEach((m, i) => k.tone(mtof(m), t + 0.1 + i * 0.07, 0.3, { type: "triangle", vol: 0.09, keep: true })); } },

    // ---- The Lost Cartridge: a hunt told through a glitchy old console
    huntOpen:  { n: 2, jit: 0.04, gap: 600, fn: (k, t, o) => { k.noise(t, 0.3, { freq: 600, to: 5000, q: 1.2, vol: 0.06 }); [[76, 83, 88], [79, 74, 86]][o.v].forEach((m, i) => k.tone(mtof(m), t + 0.12 + i * 0.07, 0.07, { type: "square", vol: 0.07, keep: true })); } },
    huntWrong: { n: 2, jit: 0, fn: (k, t, o) => { [0, 0.09, 0.18].forEach((d, i) => k.tone(mtof([52, 50][o.v] - i * 2), t + d, 0.08, { type: "square", vol: 0.1, keep: true, lp: 900 })); k.noise(t, 0.2, { freq: 3000, to: 300, q: 0.7, vol: 0.06 }); } },
    huntSolve: { n: 1, jit: 0, gap: 600, fn: (k, t, o) => {            // chapter n lights n+2 notes; the last one rings like a console booting
      const ch = Math.max(1, Math.min(5, o.ch || 1)), base = 67 + ch * 2, steps = [0, 4, 7, 12, 16, 19, 24].slice(0, ch + 2);
      steps.forEach((s, i) => k.tone(mtof(base + s), t + i * 0.075, 0.14, { type: "square", vol: 0.09, keep: true }));
      const e = t + steps.length * 0.075; k.bell(mtof(base + 24), e, 0.09, 1.2); k.noise(e, 0.4, { freq: 7000, q: 0.5, type: "highpass", vol: 0.04 });
    } },
    huntFinale: { n: 1, jit: 0, gap: 2000, fn: (k, t) => {
      k.noise(t, 0.4, { freq: 1200, q: 0.6, vol: 0.12 });                                           // blowing on the cartridge
      k.tone(mtof(48), t + 0.45, 0.12, { type: "square", vol: 0.1, to: mtof(72), keep: true });       // the console wakes
      [72, 76, 79, 84, 79, 84, 88, 91, 96].forEach((m, i) => { k.tone(mtof(m), t + 0.7 + i * 0.1, 0.22, { type: "square", vol: 0.09, keep: true }); k.tone(mtof(m - 12), t + 0.7 + i * 0.1, 0.22, { type: "triangle", vol: 0.1, keep: true }); });
      [60, 67, 76].forEach((m) => k.tone(mtof(m), t + 1.7, 1.4, { type: "triangle", vol: 0.1, keep: true }));
      k.bell(mtof(103), t + 1.75, 0.1, 2); k.noise(t + 1.7, 1.2, { freq: 6000, q: 0.5, type: "highpass", vol: 0.05 });
    } },

    // ---- Remote Hunt
    rummage: { n: 3, jit: 0.08, fn: (k, t, o) => { for (let i = 0; i < 3; i++) k.noise(t + i * 0.07 + Math.random() * 0.03, 0.08, { freq: [900, 1100, 750][o.v] + i * 150, q: 0.9, vol: 0.09 }); } },
    warm:    { n: 1, jit: 0, fn: (k, t) => { k.tone(mtof(79), t, 0.08, { type: "triangle", vol: 0.09, keep: true }); k.tone(mtof(84), t + 0.09, 0.14, { type: "triangle", vol: 0.1, keep: true }); } },
    cold:    { n: 1, jit: 0, fn: (k, t) => { k.tone(mtof(72), t, 0.1, { type: "triangle", vol: 0.09, keep: true, lp: 1200 }); k.tone(mtof(67), t + 0.1, 0.18, { type: "triangle", vol: 0.08, keep: true, lp: 1000 }); } },
    // ---- Chef Dad's moves: times are seconds into the animation (the CSS keyframes at his tempo, 1.05)
    chefFlip:  { n: 1, jit: 0, gap: 1500, fn: (k, t) => {
      const sizzle = (from, len) => {                                         // overlapping hiss, with fat spitting on top
        for (let d = 0; d < len; d += 0.16) k.noise(t + from + d, 0.34, { type: "highpass", freq: 4200, q: 0.6, vol: 0.075, att: 0.07 });
        for (let i = 0; i < len * 26; i++) k.noise(t + from + Math.random() * len, 0.012, { freq: 2500 + Math.random() * 4500, q: 5, vol: 0.05 + Math.random() * 0.09 });
      };
      sizzle(0, 0.45);
      k.noise(t + 0.53, 0.45, { freq: 350, to: 2600, q: 1.6, vol: 0.13, att: 0.18 });                  // up
      k.tone(330, t + 0.55, 0.5, { type: "sine", vol: 0.07, to: 880, att: 0.05, keep: true });
      k.noise(t + 1.35, 0.45, { freq: 2200, to: 450, q: 1.6, vol: 0.09, att: 0.25 });                  // down
      k.tone(190, t + 1.87, 0.14, { type: "sine", vol: 0.24, to: 80, keep: true });                    // plop in the pan
      k.noise(t + 1.87, 0.07, { type: "lowpass", freq: 1400, q: 0.7, vol: 0.2 });
      sizzle(1.9, 0.75);
    } },
    chefTaste: { n: 1, jit: 0, gap: 1500, fn: (k, t) => {
      k.noise(t + 0.9, 0.34, { freq: 900, to: 3400, q: 5, vol: 0.2, att: 0.2 });                       // slurp
      k.noise(t + 1.2, 0.05, { freq: 2600, q: 3, vol: 0.12 });
      k.tone(165, t + 1.42, 0.38, { type: "triangle", vol: 0.14, to: 220, att: 0.06, lp: 800, vib: 5, keep: true });   // "hmm?"
      for (let i = 0; i < 6; i++) k.noise(t + 2.0 + i * 0.085, 0.04, { type: "highpass", freq: 6500, q: 0.8, vol: i % 2 ? 0.07 : 0.12 });   // salt
    } },
    chefKiss:  { n: 1, jit: 0, gap: 1500, fn: (k, t) => {
      k.noise(t + 0.2, 0.13, { freq: 900, to: 2800, q: 6, vol: 0.14, att: 0.09 });                     // "mm-"
      k.noise(t + 0.34, 0.035, { freq: 2200, q: 2, vol: 0.28 });                                       // "-wah"
      k.tone(520, t + 0.345, 0.12, { type: "sine", vol: 0.12, to: 240, keep: true });
      [91, 96, 100].forEach((m, i) => k.bell(mtof(m), t + 0.48 + i * 0.11, 0.06, 0.8));                // sparkle
    } },
  };

  const lastPlay = {}, lastVariant = {};
  let streakRun = 0, runAt = 0;
  function variant(name, n) {
    if (n < 2) return 0;
    let v; do { v = Math.floor(Math.random() * n); } while (v === lastVariant[name]);
    lastVariant[name] = v; return v;
  }
  function run(name, c, dest, o, t0) {
    const S = SOUNDS[name]; if (!S) return false;
    const v = o.v != null ? o.v : variant(name, S.n);
    const rate = (o.rate || 1) * (S.jit ? 1 + (Math.random() - 0.5) * 2 * S.jit : 1);
    S.fn(kit(c, dest, { ...o, rate }), t0, { ...o, v });
    return true;
  }

  const api = {
    names: Object.keys(SOUNDS),
    onchange: null,
    get muted() { return muted; },
    set muted(v) {
      muted = !!v; try { localStorage.setItem(KEY, muted ? "0" : "1"); } catch (e) {}
      api.onchange && api.onchange(muted);
    },
    // quiz answers: keeps a run of right answers so the pitch climbs; 3, 5 and 10 in a row get a flourish
    answer(ok) {
      const now = Date.now(); if (now - runAt > 90000) streakRun = 0; runAt = now;
      if (!ok) { streakRun = 0; return api.play("wrong"); }
      streakRun++; api.play("correct", { streak: streakRun - 1 });
      if (streakRun === 3 || streakRun === 5 || streakRun === 10) setTimeout(() => api.play("streak", { streak: streakRun }), 260);
    },
    resetRun() { streakRun = 0; },
    theme(key) { themeKey = THEMES[key] ? key : "default"; },
    play(name, o = {}) {
      if (muted || (typeof document !== "undefined" && document.hidden) || !SOUNDS[name]) return;
      const now = performance.now(), gap = SOUNDS[name].gap || 25;
      if (lastPlay[name] && now - lastPlay[name] < gap) return;
      lastPlay[name] = now;
      const c = ensure(); if (!c) return;
      if (c.state === "suspended") c.resume().catch(() => {});
      try { run(name, c, bus, o, c.currentTime + 0.01); } catch (e) {}
    },
    // renders one sound offline (used for testing and for previews)
    async render(name, o = {}, seconds = 3, sampleRate = 44100) {
      const off = new OfflineAudioContext(2, Math.ceil(sampleRate * seconds), sampleRate);
      run(name, off, mkBus(off), o, 0.02);
      return off.startRendering();
    },
  };
  window.RoboSfx = api;
})();
