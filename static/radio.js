/*
 * RoboDad Radio: relaxing background music generated live in the browser.
 *
 * Nothing is downloaded or streamed. Every note is synthesised with the Web
 * Audio API, so there are no recordings and no licences to worry about. The
 * "Canon in D" station plays Pachelbel's chord progression and opening violin
 * line, a composition written around 1700 and long in the public domain.
 * "Jukebox '55" is an original doo-wop tune on the classic I-vi-IV-V changes.
 * "Half-Pipe '99", "Respawn Lounge" and "Block Party '03" are original loops in
 * the style of late-90s pop-punk, mid-2000s game-lobby electronica and
 * early-2000s boom-bap; "Haunted Hayride" is an original spooky tune for
 * Halloween; "Filmi Nights '75" is an original 1970s Bollywood-style groove and
 * "Diya Glow" a gentle festive tune for Diwali; "Snow Day", "Lantern Festival"
 * and "Crescent Night" are original holiday tunes, and "Study Hall" is an
 * original lo-fi loop for focus sessions. None of them borrow melodies
 * from real songs or films.
 *
 *   RoboRadio.play("lounge" | "canon" | "drive")
 *   RoboRadio.stop()
 *   RoboRadio.setVolume(0..1)
 *   RoboRadio.duck(true|false)     // quieter while RoboDad reads a reply aloud
 *   RoboRadio.onchange = (state) => { ... }
 */
(function () {
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // small seeded random so melodies vary but stay pleasant
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const pickOne = (a) => a[Math.floor(rand() * a.length)];

  let ctx, master, comp, wet, dry, delay, delayFb, delayOut;
  let timer = null, current = null, bar = 0, nextBarTime = 0;
  let volume = 0.35, ducked = false;

  function impulse(seconds, decay) {
    const len = ctx.sampleRate * seconds, buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
    }
    return buf;
  }

  function setup(useCtx) {
    if (ctx && !useCtx) return;
    ctx = useCtx || new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0;
    comp = ctx.createDynamicsCompressor(); comp.threshold.value = -20; comp.ratio.value = 3;
    master.connect(comp).connect(ctx.destination);

    dry = ctx.createGain(); dry.gain.value = 0.8; dry.connect(master);
    const rev = ctx.createConvolver(); rev.buffer = impulse(2.8, 2.5);
    wet = ctx.createGain(); wet.gain.value = 0.35; wet.connect(rev).connect(master);

    // tempo-synced echo for the synthwave arpeggio
    delay = ctx.createDelay(1.5); delayFb = ctx.createGain(); delayFb.gain.value = 0.35;
    delayOut = ctx.createGain(); delayOut.gain.value = 0.3;
    delay.connect(delayFb).connect(delay); delay.connect(delayOut).connect(wet);
  }

  // iPhones mute Web Audio when the ring/silent switch is on, unless the page
  // tells Safari this is media playback. Newer Safari has navigator.audioSession;
  // older versions switch modes once an <audio> element is playing.
  let unlockEl = null;
  function unlockMediaPlayback() {
    try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) {}
    if (unlockEl) { unlockEl.play().catch(() => {}); return; }
    const sr = 8000, n = sr / 2, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true);
    v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, n * 2, true);
    unlockEl = new Audio(URL.createObjectURL(new Blob([buf], { type: "audio/wav" })));
    unlockEl.loop = true; unlockEl.volume = 0.01; unlockEl.setAttribute("playsinline", "");
    unlockEl.play().catch(() => {});
  }

  function out(node, sendDelay) {
    node.connect(dry); node.connect(wet);
    if (sendDelay) node.connect(delay);
  }

  function env(g, t, a, peak, d, sustain, rel, end) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(sustain, 0.0001), t + a + d);
    g.gain.setValueAtTime(Math.max(sustain, 0.0001), end);
    g.gain.exponentialRampToValueAtTime(0.0001, end + rel);
  }

  // ---------- instruments ----------
  function pad(notes, t, dur, { type = "sawtooth", cutoff = 900, level = 0.05 } = {}) {
    notes.forEach((n) => {
      [-7, 7].forEach((cents) => {
        const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        o.type = type; o.frequency.value = mtof(n); o.detune.value = cents;
        f.type = "lowpass"; f.frequency.value = cutoff; f.Q.value = 0.4;
        env(g, t, 0.9, level, 0.5, level * 0.8, 1.4, t + dur);
        o.connect(f).connect(g); out(g);
        o.start(t); o.stop(t + dur + 1.6);
      });
    });
  }

  function epiano(n, t, dur, vel = 1) {
    // two-operator FM: a warm electric-piano tone
    const c = ctx.createOscillator(), m = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain();
    const f = mtof(n);
    c.frequency.value = f; m.frequency.value = f;
    mg.gain.setValueAtTime(f * 1.2, t); mg.gain.exponentialRampToValueAtTime(f * 0.05, t + 1.2);
    m.connect(mg).connect(c.frequency);
    env(g, t, 0.018, 0.09 * vel, 1.4, 0.02 * vel, 0.5, t + dur);
    c.connect(g); out(g);
    c.start(t); m.start(t); c.stop(t + dur + 0.6); m.stop(t + dur + 0.6);
  }

  function pluck(n, t, { type = "triangle", level = 0.08, decay = 1.6, cutoff = 2400, echo = false } = {}) {
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = type; o.frequency.value = mtof(n);
    f.type = "lowpass"; f.frequency.setValueAtTime(cutoff, t); f.frequency.exponentialRampToValueAtTime(cutoff * 0.3, t + decay);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(level, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(f).connect(g); out(g, echo);
    o.start(t); o.stop(t + decay + 0.05);
  }

  function bass(n, t, dur, { type = "triangle", level = 0.12, cutoff = 500 } = {}) {
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = type; o.frequency.value = mtof(n);
    f.type = "lowpass"; f.frequency.value = cutoff;
    env(g, t, 0.02, level, 0.3, level * 0.7, 0.15, t + dur);
    o.connect(f).connect(g); g.connect(dry);
    o.start(t); o.stop(t + dur + 0.2);
  }

  let noiseBuf = null;
  function noise() {
    if (!noiseBuf || noiseBuf.sampleRate !== ctx.sampleRate) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }
  function brush(t, level = 0.05) {
    noise();
    const n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    n.buffer = noiseBuf; f.type = "bandpass"; f.frequency.value = 3200; f.Q.value = 0.7;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(level, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    n.connect(f).connect(g); out(g); n.start(t); n.stop(t + 0.2);
  }

  function sax(n, t, dur, level = 0.05) {
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    o.type = "sawtooth"; o.frequency.value = mtof(n);
    lfo.frequency.value = 5.2; lg.gain.value = 6; lfo.connect(lg).connect(o.detune);
    f.type = "lowpass"; f.frequency.value = 1400; f.Q.value = 1.2;
    env(g, t, 0.06, level, 0.2, level * 0.75, 0.25, t + dur);
    o.connect(f).connect(g); out(g);
    o.start(t); lfo.start(t); o.stop(t + dur + 0.3); lfo.stop(t + dur + 0.3);
  }

  function softKick(t, level = 0.16) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.22);
    g.gain.setValueAtTime(level, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g).connect(dry); o.start(t); o.stop(t + 0.32);
  }

  // drums and a crunchy guitar for the newer stations
  function hit(t, { type = "highpass", freq = 7000, q = 0.7, level = 0.03, decay = 0.05 } = {}) {
    const n = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    n.buffer = noise(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(level, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    n.connect(f).connect(g); out(g); n.start(t); n.stop(t + Math.min(0.29, decay + 0.02));
  }
  const hat = (t, level = 0.025, open = false) => hit(t, { level, decay: open ? 0.2 : 0.045 });
  function snare(t, level = 0.08, tone = 190) {
    hit(t, { type: "bandpass", freq: 2200, q: 0.6, level, decay: 0.17 });
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "triangle"; o.frequency.setValueAtTime(tone, t); o.frequency.exponentialRampToValueAtTime(tone * 0.7, t + 0.08);
    g.gain.setValueAtTime(level * 0.9, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    o.connect(g); out(g); o.start(t); o.stop(t + 0.12);
  }
  function kick(t, level = 0.22) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(level, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g).connect(dry); o.start(t); o.stop(t + 0.37);
  }
  let shaper = null;
  function crunch() {
    if (!shaper) { shaper = new Float32Array(1025); for (let i = 0; i < 1025; i++) shaper[i] = Math.tanh((i / 512 - 1) * 4); }   // odd length, so silence stays silent
    const w = ctx.createWaveShaper(); w.curve = shaper; w.oversample = "2x"; return w;
  }
  // power chord (root, fifth, octave) through a little distortion; muted = palm-muted chug
  function power(root, t, dur, { level = 0.03, muted = true } = {}) {
    const pre = ctx.createGain(), ws = crunch(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    pre.gain.value = 0.9; g.gain.value = 0; f.type = "lowpass"; f.frequency.value = muted ? 1400 : 2600;
    [0, 7, 12].forEach((iv) => [-6, 6].forEach((c) => {
      const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = mtof(root + iv); o.detune.value = c;
      o.connect(pre); o.start(t); o.stop(t + dur + 0.1);
    }));
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(level, t + 0.005);
    g.gain.exponentialRampToValueAtTime(level * (muted ? 0.12 : 0.55), t + dur);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.08);
    pre.connect(ws).connect(f).connect(g); out(g);
  }

  // a wobbly, gliding sine: the "theremin" for the Halloween station
  function theremin(notes, t, step, level = 0.05) {
    const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    o.type = "sine"; lfo.frequency.value = 6; lg.gain.value = 14; lfo.connect(lg).connect(o.detune);
    o.frequency.setValueAtTime(mtof(notes[0]), t);
    notes.forEach((n, k) => { if (k) o.frequency.setTargetAtTime(mtof(n), t + k * step - 0.05, 0.07); });
    const end = t + notes.length * step;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(level, t + 0.25);
    g.gain.setValueAtTime(level, end - 0.3); g.gain.exponentialRampToValueAtTime(0.0001, end + 0.4);
    o.connect(g); out(g, true); o.start(t); lfo.start(t); o.stop(end + 0.5); lfo.stop(end + 0.5);
  }

  // Indian-style instruments, approximated with simple synthesis
  function drum(t, freq, level, decay, bend = 0.6) {          // dholak/tabla-style tuned hit
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * bend, t + decay);
    g.gain.setValueAtTime(level, t); g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    o.connect(g); out(g); o.start(t); o.stop(t + decay + 0.02);
  }
  const dha = (t, l = 0.16) => { drum(t, 110, l, 0.32, 0.55); hit(t, { type: "bandpass", freq: 900, level: l * 0.18, decay: 0.05 }); };
  const na = (t, l = 0.07) => { drum(t, 420, l, 0.12, 0.9); hit(t, { type: "highpass", freq: 3000, level: l * 0.25, decay: 0.03 }); };
  function harmonium(notes, t, dur, level = 0.022) {             // reedy, slightly wavering drone
    notes.forEach((n) => {
      const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain();
      o.type = "square"; o.frequency.value = mtof(n); l.frequency.value = 4.5; lg.gain.value = 4; l.connect(lg).connect(o.detune);
      f.type = "lowpass"; f.frequency.value = 1500; env(g, t, 0.15, level, 0.3, level * 0.85, 0.4, t + dur);
      o.connect(f).connect(g); out(g); o.start(t); l.start(t); o.stop(t + dur + 0.5); l.stop(t + dur + 0.5);
    });
  }
  function sitar(n, t, level = 0.05, slide = 0) {                // bright pluck with a little slide into the note
    const o = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = "sawtooth"; o2.type = "sawtooth"; o2.detune.value = 9;
    [o, o2].forEach((x) => { x.frequency.setValueAtTime(mtof(n - slide), t); x.frequency.exponentialRampToValueAtTime(mtof(n), t + (slide ? 0.12 : 0.001)); });
    f.type = "bandpass"; f.frequency.value = 1800; f.Q.value = 1.4;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(level, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
    o.connect(f); o2.connect(f); f.connect(g); out(g, true); o.start(t); o2.start(t); o.stop(t + 1.5); o2.stop(t + 1.5);
  }
  function bell(n, t, level = 0.04) {
    [1, 2.76, 5.4].forEach((r, k) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.value = mtof(n) * r;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(level / (k + 1), t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.2 / (k + 1));
      o.connect(g); out(g, true); o.start(t); o.stop(t + 2.3);
    });
  }

  function gong(n, t, level = 0.06) {                                 // soft gong for Lunar New Year
    [1, 1.48, 2.1, 2.9].forEach((r, k) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = "sine"; o.frequency.setValueAtTime(mtof(n) * r, t);
      o.frequency.exponentialRampToValueAtTime(mtof(n) * r * 0.985, t + 3);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(level / (k + 1), t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
      o.connect(g); out(g); o.start(t); o.stop(t + 3.6);
    });
  }
  function zither(n, t, level = 0.07, bend = 0) {                     // guzheng/oud-style pluck with an optional bend
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = "sawtooth"; o.frequency.setValueAtTime(mtof(n), t);
    if (bend) { o.frequency.setValueAtTime(mtof(n), t + 0.12); o.frequency.linearRampToValueAtTime(mtof(n + bend), t + 0.32); }
    f.type = "lowpass"; f.frequency.setValueAtTime(2600, t); f.frequency.exponentialRampToValueAtTime(700, t + 0.9);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(level, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3);
    o.connect(f).connect(g); out(g, true); o.start(t); o.stop(t + 1.4);
  }

  // ---------- stations ----------
  const STATIONS = {
    // Lobby Lounge: smooth "elevator" jazz in F
    lounge: {
      name: "Lobby Lounge", bpm: 84,
      bars: [
        { root: 43, chord: [58, 62, 65, 69] }, // Gm9
        { root: 36, chord: [58, 62, 64, 69] }, // C13
        { root: 41, chord: [57, 60, 64, 67] }, // Fmaj9
        { root: 38, chord: [53, 57, 60, 64] }, // Dm9
        { root: 46, chord: [58, 62, 65, 69] }, // Bbmaj7
        { root: 45, chord: [55, 60, 64, 67] }, // Am7
        { root: 43, chord: [53, 58, 62, 65] }, // Gm7
        { root: 36, chord: [58, 65, 67, 70] }, // C7sus
      ],
      play(i, t, b) {
        const { root, chord } = this.bars[i % this.bars.length];
        chord.forEach((n) => epiano(n, t, b * 1.5, 0.8));
        chord.forEach((n) => epiano(n, t + b * 2.5, b * 1, 0.45));
        bass(root, t, b * 1.5); bass(root + 7, t + b * 2, b * 0.9); bass(root + 12, t + b * 3, b * 0.9, { level: 0.08 });
        const scale = [77, 79, 81, 84, 86, 89];
        [0.5, 1.5, 3].forEach((beat) => { if (rand() < 0.55) epiano(pickOne(scale), t + b * beat, b * 0.9, 0.5); });
      },
    },
    // Canon in D: Pachelbel's progression with harp arpeggios and the violin line
    canon: {
      name: "Canon in D", bpm: 58,
      chords: [
        { bass: 50, arp: [62, 66, 69, 74], top: 78 }, // D
        { bass: 45, arp: [61, 64, 69, 73], top: 76 }, // A
        { bass: 47, arp: [59, 62, 66, 71], top: 74 }, // Bm
        { bass: 42, arp: [57, 61, 66, 69], top: 73 }, // F#m
        { bass: 43, arp: [55, 59, 62, 67], top: 71 }, // G
        { bass: 38, arp: [62, 66, 69, 74], top: 69 }, // D
        { bass: 43, arp: [55, 59, 62, 67], top: 71 }, // G
        { bass: 45, arp: [57, 61, 64, 69], top: 73 }, // A
      ],
      play(i, t, b) {
        // two chords per bar (each lasts two beats)
        for (let k = 0; k < 2; k++) {
          const idx = (i * 2 + k) % 8, c = this.chords[idx], cycle = Math.floor((i * 2 + k) / 8);
          const ct = t + k * 2 * b;
          bass(c.bass, ct, 2 * b, { level: 0.13, cutoff: 400 });
          pad(c.arp.slice(0, 3), ct, 2 * b, { type: "triangle", cutoff: 1400, level: 0.035 });
          const order = cycle % 2 === 0 ? [0, 1, 2, 3] : [3, 2, 1, 2];
          order.forEach((o, j) => pluck(c.arp[o] + (cycle % 3 === 2 ? 12 : 0), ct + j * b / 2, { level: 0.1, decay: 1.8 }));
          if (cycle >= 1) pad([c.top], ct, 2 * b, { type: "triangle", cutoff: 2600, level: 0.05 });
        }
      },
    },
    // Jukebox '55: original doo-wop on I-vi-IV-V, swung 12/8 feel
    jukebox: {
      name: "Jukebox '55", bpm: 66,
      bars: [
        { walk: [36, 40, 43, 45], chord: [60, 64, 67], tones: [72, 76, 79] }, // C
        { walk: [33, 36, 40, 45], chord: [60, 64, 69], tones: [72, 76, 81] }, // Am
        { walk: [29, 33, 36, 38], chord: [60, 65, 69], tones: [72, 77, 81] }, // F
        { walk: [31, 35, 38, 40], chord: [59, 62, 67], tones: [71, 74, 79] }, // G
      ],
      play(i, t, b) {
        const { walk, chord, tones } = this.bars[i % 4];
        for (let beat = 0; beat < 4; beat++) {
          for (let tr = 0; tr < 3; tr++) {
            const tt = t + beat * b + tr * b / 3, acc = tr === 0 ? 1 : 0.6;
            chord.forEach((n) => pluck(n, tt, { type: "triangle", level: 0.035 * acc, decay: 0.45, cutoff: 2600 }));
          }
          bass(walk[beat], t + beat * b, b * 0.85, { level: 0.15, cutoff: 600 });
          if (beat % 2 === 1) brush(t + beat * b, 0.06);
        }
        pad(chord.map((n) => n - 12), t, 4 * b, { type: "triangle", cutoff: 1600, level: 0.022 });
        if (i % 8 >= 4) {
          const motif = i % 2 ? [tones[2], tones[1], tones[0]] : [tones[0], tones[1], tones[2]];
          sax(motif[0], t, b * 1.4); sax(motif[1], t + b * 1.67, b * 0.6); sax(motif[2], t + b * 2.33, b * 1.4);
        }
      },
    },
    // Midnight Drive: mellow synthwave in A minor
    drive: {
      name: "Midnight Drive", bpm: 92,
      bars: [
        { root: 33, chord: [57, 60, 64] }, // Am
        { root: 29, chord: [53, 57, 60] }, // F
        { root: 36, chord: [55, 60, 64] }, // C
        { root: 31, chord: [55, 59, 62] }, // G
      ],
      play(i, t, b) {
        const { root, chord } = this.bars[i % 4];
        pad(chord.map((n) => n - 12), t, 4 * b, { type: "sawtooth", cutoff: 700, level: 0.05 });
        for (let s = 0; s < 8; s++) bass(root + (s % 4 === 3 ? 12 : 0), t + s * b / 2, b * 0.4, { type: "sawtooth", level: 0.08, cutoff: 380 });
        const arp = [...chord, chord[0] + 12];
        for (let s = 0; s < 16; s++) pluck(arp[s % 4] + 12, t + s * b / 4, { type: "sawtooth", level: 0.04, decay: 0.35, cutoff: 1300, echo: true });
        softKick(t); softKick(t + 2 * b);
      },
    },
  };

  // Half-Pipe '99: original late-90s skate pop-punk in D (I-V-vi-IV), fast and bright
  STATIONS.skate = {
    name: "Half-Pipe '99", bpm: 152,
    roots: [50, 45, 47, 43], // D A Bm G power chords
    lead: [[74, 76, 78, 76], [73, 76, 73, 69], [71, 74, 78, 76], [74, 71, 67, 69]],
    play(i, t, b) {
      const r = this.roots[i % 4], chorus = i % 16 >= 8;
      for (let e = 0; e < 8; e++) {
        power(r, t + e * b / 2, b / 2 * 0.9, { muted: !chorus || e % 4 === 3, level: chorus ? 0.085 : 0.09 });
        bass(r - 12, t + e * b / 2, b * 0.42, { type: "sawtooth", level: 0.08, cutoff: 450 });
        hat(t + e * b / 2, e % 2 ? 0.018 : 0.026, chorus && e === 0);
      }
      kick(t, 0.16); kick(t + 2.5 * b, 0.13); kick(t + 2 * b, 0.16);
      snare(t + b, 0.055); snare(t + 3 * b, 0.055);
      if (chorus) this.lead[i % 4].forEach((n, k) => pluck(n, t + k * b, { type: "square", level: 0.022, decay: 0.5, cutoff: 2200 }));
    },
  };
  // Respawn Lounge: original mid-2000s game-lobby electronica in E minor, pumping and spacey
  STATIONS.lobby = {
    name: "Respawn Lounge", bpm: 124,
    bars: [
      { root: 40, chord: [64, 67, 71] }, // Em
      { root: 36, chord: [60, 64, 67] }, // C
      { root: 43, chord: [62, 67, 71] }, // G
      { root: 38, chord: [62, 66, 69] }, // D
    ],
    play(i, t, b) {
      const { root, chord } = this.bars[i % 4];
      pad(chord.map((n) => n - 12), t, 4 * b, { type: "sawtooth", cutoff: 600, level: 0.032 });
      for (let k = 0; k < 4; k++) {
        softKick(t + k * b, 0.21);
        chord.forEach((n) => pluck(n, t + k * b + 0.06, { type: "sawtooth", level: 0.03, decay: b * 0.8, cutoff: 1100 }));
        hat(t + (k + 0.5) * b, 0.03);
        bass(root, t + (k + 0.5) * b, b * 0.4, { type: "square", level: 0.1, cutoff: 320 });
      }
      snare(t + b, 0.05, 230); snare(t + 3 * b, 0.05, 230);
      const arp = [chord[0], chord[1], chord[2], chord[1] + 12];
      if (i % 8 >= 2) for (let s = 0; s < 16; s++) pluck(arp[(s * 3) % 4] + 12, t + s * b / 4, { type: "square", level: 0.024, decay: 0.22, cutoff: 2400, echo: true });
    },
  };
  // Block Party '03: original laid-back early-2000s boom-bap with warm keys, swung
  STATIONS.block = {
    name: "Block Party '03", bpm: 88,
    bars: [
      { root: 38, chord: [53, 57, 60, 64] }, // Dm9
      { root: 43, chord: [53, 59, 64] },     // G13
      { root: 36, chord: [52, 55, 59, 62] }, // Cmaj9
      { root: 33, chord: [55, 59, 60, 64] }, // Am9
    ],
    play(i, t, b) {
      const { root, chord } = this.bars[i % 4], sw = b * 0.08;   // swing
      chord.forEach((n) => epiano(n, t, b * 1.6, 0.75));
      chord.forEach((n) => epiano(n, t + 1.5 * b + sw, b * 0.9, 0.45));
      [0, 1.5, 2.5].forEach((p) => { kick(t + p * b + (p % 1 ? sw : 0), 0.2); bass(root, t + p * b + (p % 1 ? sw : 0), b * 0.7, { level: 0.12, cutoff: 260 }); });
      snare(t + b, 0.07, 170); snare(t + 3 * b, 0.07, 170);
      for (let e = 0; e < 8; e++) hat(t + e * b / 2 + (e % 2 ? sw : 0), e % 2 ? 0.013 : 0.02);
      if (rand() < 0.6) hit(t + rand() * 4 * b, { level: 0.006, decay: 0.01, freq: 3000 });   // vinyl crackle
      if (i % 8 >= 4) [0.5, 2, 3].forEach((p) => { if (rand() < 0.7) pluck(pickOne([69, 72, 74, 76, 79]), t + p * b + sw, { type: "sine", level: 0.05, decay: 1.2, cutoff: 3000 }); });
    },
  };

  // Haunted Hayride: original spooky organ, music box and theremin in D minor (i-VI-iv-V)
  STATIONS.haunt = {
    name: "Haunted Hayride", bpm: 96,
    bars: [
      { root: 38, chord: [62, 65, 69], box: [74, 77, 81, 77] }, // Dm
      { root: 34, chord: [62, 65, 70], box: [74, 77, 82, 77] }, // Bb
      { root: 43, chord: [62, 67, 70], box: [74, 79, 82, 79] }, // Gm
      { root: 45, chord: [61, 64, 69], box: [73, 76, 81, 76] }, // A
    ],
    tunes: [[74, 73, 74, 77], [70, 69, 67, 69], [74, 77, 76, 74], [73, 76, 73, 69]],
    play(i, t, b) {
      const { root, chord, box } = this.bars[i % 4];
      pad(chord.map((n) => n - 12), t, 4 * b, { type: "square", cutoff: 900, level: 0.03 });
      bass(root, t, b * 1.8, { level: 0.11, cutoff: 300 }); bass(root + 7, t + 2 * b, b * 1.8, { level: 0.08, cutoff: 300 });
      for (let k = 0; k < 8; k++) pluck(box[k % 4] + 12, t + k * b / 2, { type: "triangle", level: 0.035, decay: 0.9, cutoff: 4000, echo: k % 4 === 3 });
      if (i % 8 >= 4) theremin(this.tunes[i % 4], t, b, 0.05);
      softKick(t, 0.12); brush(t + 2 * b, 0.04);
    },
  };

  // Filmi Nights '75: original 1970s Bollywood-style groove in D minor, dholak, harmonium, sitar and strings
  STATIONS.filmi = {
    name: "Filmi Nights '75", bpm: 104,
    bars: [
      { root: 38, chord: [62, 65, 69] }, // Dm
      { root: 36, chord: [60, 64, 67] }, // C
      { root: 34, chord: [58, 62, 65] }, // Bb
      { root: 33, chord: [57, 61, 64] }, // A
    ],
    riffs: [[74, 75, 77, 74, 72, 74], [72, 74, 76, 72, 70, 72], [70, 72, 74, 70, 69, 70], [69, 70, 73, 76, 75, 73]],
    play(i, t, b) {
      const { root, chord } = this.bars[i % 4];
      harmonium(chord.map((n) => n - 12), t, 4 * b, 0.03);
      bass(root, t, b * 0.9, { level: 0.15, cutoff: 280 }); bass(root + 7, t + 2 * b, b * 0.9, { level: 0.12, cutoff: 280 });
      [0, 1.5, 2, 3.5].forEach((p) => dha(t + p * b, p ? 0.2 : 0.26));       // keherwa-style feel
      [0.5, 1, 2.5, 3, 3.75].forEach((p) => na(t + p * b, 0.1));
      const r = this.riffs[i % 4];
      if (i % 8 >= 2) r.forEach((n, k) => sitar(n, t + k * b * 0.66, 0.085, k === 0 ? 2 : 0));
      if (i % 8 >= 4) pad(chord.map((n) => n + 12), t, 4 * b, { type: "sawtooth", cutoff: 2200, level: 0.026 });   // string swell
    },
  };
  // Diya Glow: original gentle festive tune for Diwali, drone, santoor-like shimmer, bells and soft hand drum
  STATIONS.diya = {
    name: "Diya Glow", bpm: 80,
    scale: [62, 64, 66, 69, 71, 74, 76, 78],   // D major pentatonic-ish, warm and bright
    play(i, t, b) {
      harmonium([50, 57], t, 4 * b, 0.03);                                     // Sa-Pa drone
      bass(38, t, b * 3, { level: 0.13, cutoff: 220 });
      for (let k = 0; k < 8; k++) {                                              // santoor shimmer: quick repeated plucks
        const n = this.scale[(i * 3 + k * 2) % this.scale.length];
        pluck(n, t + k * b / 2, { type: "triangle", level: 0.085, decay: 0.9, cutoff: 5000 });
        if (k % 2) pluck(n, t + k * b / 2 + b / 8, { type: "triangle", level: 0.045, decay: 0.6, cutoff: 5000 });
      }
      if (i % 2 === 0) bell(86, t, 0.06); else bell(81, t + 2 * b, 0.05);
      drum(t, 120, 0.16, 0.35, 0.6); drum(t + 2.5 * b, 120, 0.11, 0.3, 0.6); na(t + 1.5 * b, 0.06); na(t + 3 * b, 0.06);
    },
  };

  // Snow Day: original cozy winter tune in F, celesta bells, sleigh-bell shaker, warm pad
  STATIONS.snow = {
    name: "Snow Day", bpm: 92,
    bars: [
      { root: 41, chord: [65, 69, 72], arp: [77, 81, 84, 81] }, // F
      { root: 38, chord: [62, 65, 69], arp: [74, 77, 81, 77] }, // Dm
      { root: 46, chord: [62, 65, 70], arp: [74, 77, 82, 77] }, // Bb
      { root: 36, chord: [64, 67, 72], arp: [76, 79, 84, 79] }, // C
    ],
    play(i, t, b) {
      const { root, chord, arp } = this.bars[i % 4];
      pad(chord.map((n) => n - 12), t, 4 * b, { type: "triangle", cutoff: 1400, level: 0.04 });
      bass(root, t, b * 1.8, { level: 0.12, cutoff: 260 }); bass(root + 7, t + 2 * b, b * 1.8, { level: 0.09, cutoff: 260 });
      for (let k = 0; k < 8; k++) pluck(arp[k % 4], t + k * b / 2, { type: "sine", level: 0.07, decay: 1.4, cutoff: 6000, echo: k === 7 });
      if (i % 4 === 0) bell(89, t, 0.04);
      for (let k = 0; k < 8; k++) hit(t + k * b / 2, { type: "highpass", freq: 8000, level: k % 2 ? 0.012 : 0.02, decay: 0.08 });
      softKick(t, 0.1); brush(t + 2 * b, 0.04);
    },
  };
  // Lantern Festival: original Lunar New Year tune on a major pentatonic scale, zither plucks, drum and gong
  STATIONS.lantern = {
    name: "Lantern Festival", bpm: 100,
    lines: [[72, 74, 76, 79, 76, 74], [79, 81, 79, 76, 74, 76], [72, 76, 74, 72, 69, 72], [74, 76, 79, 81, 79, 76]],
    play(i, t, b) {
      const roots = [48, 45, 41, 43], r = roots[i % 4];
      harmonium([r + 12, r + 19], t, 4 * b, 0.018);
      bass(r - 12, t, b * 1.8, { level: 0.12, cutoff: 260 }); bass(r - 5, t + 2 * b, b * 1.8, { level: 0.09, cutoff: 260 });
      this.lines[i % 4].forEach((n, k) => zither(n, t + k * b * 0.66, 0.12, k === 5 && i % 2 ? 2 : 0));
      drum(t, 95, 0.2, 0.4, 0.6); drum(t + 2 * b, 95, 0.15, 0.35, 0.6); na(t + b, 0.07); na(t + 3 * b, 0.07); na(t + 3.5 * b, 0.05);
      if (i % 8 === 0) gong(43, t, 0.07);
    },
  };
  // Crescent Night: original gentle tune for Eid, oud-like plucks on a hijaz-flavoured scale, frame drum and drone
  STATIONS.crescent = {
    name: "Crescent Night", bpm: 84,
    lines: [[62, 63, 66, 67, 69, 67], [69, 70, 69, 67, 66, 63], [62, 66, 67, 69, 70, 69], [67, 66, 63, 62, 63, 62]],
    play(i, t, b) {
      harmonium([50, 57], t, 4 * b, 0.03);
      bass(38, t, b * 2, { level: 0.12, cutoff: 240 });
      this.lines[i % 4].forEach((n, k) => zither(n - 12, t + k * b * 0.66, 0.13, k === 2 ? -1 : 0));
      if (i % 4 >= 2) this.lines[(i + 1) % 4].slice(0, 3).forEach((n, k) => pluck(n + 12, t + (k + 4) * b * 0.5, { type: "sine", level: 0.04, decay: 1.2, cutoff: 5000, echo: true }));
      drum(t, 85, 0.2, 0.45, 0.6); na(t + 1.5 * b, 0.06); drum(t + 2 * b, 85, 0.13, 0.4, 0.6); na(t + 3 * b, 0.06); na(t + 3.5 * b, 0.05);
    },
  };
  // Study Hall: original lo-fi loop for focus sessions. Jazzy ii-V-I-vi with rootless 9th voicings on
  // electric piano, a lazy swung boom-bap beat kept very quiet, and a little vinyl crackle.
  STATIONS.study = {
    name: "Study Hall", bpm: 74,
    bars: [
      { root: 38, chord: [65, 69, 72, 76] },   // Dm9
      { root: 43, chord: [65, 69, 71, 76] },   // G13
      { root: 36, chord: [64, 67, 71, 74] },   // Cmaj9
      { root: 45, chord: [60, 64, 67, 71] },   // Am9
    ],
    lines: [[76, 74, 72], [79, 76], [74, 76, 79, 81], [72, 69]],
    play(i, t, b) {
      const { root, chord } = this.bars[i % 4];
      chord.forEach((n, k) => epiano(n, t + k * 0.025, 2.2 * b, 0.68));
      chord.slice(1).forEach((n, k) => epiano(n, t + 2.5 * b + k * 0.02, 1.2 * b, 0.35));
      bass(root, t, b * 2.2, { level: 0.11, cutoff: 300 }); bass(root + 7, t + 2.5 * b, b * 1.2, { level: 0.08, cutoff: 300 });
      if (i % 2 === 1) this.lines[i % 4].forEach((n, k) => pluck(n, t + (1 + k * 0.75) * b, { type: "sine", level: 0.035, decay: 1.6, cutoff: 3500, echo: k === this.lines[i % 4].length - 1 }));
      softKick(t, 0.12); softKick(t + 1.75 * b, 0.08); softKick(t + 2.5 * b, 0.1);
      brush(t + b, 0.05); brush(t + 3 * b, 0.05);
      for (let k = 0; k < 8; k++) hit(t + (Math.floor(k / 2) + (k % 2 ? 0.58 : 0)) * b, { type: "highpass", freq: 7500, level: k % 2 ? 0.006 : 0.011, decay: 0.05 });
      for (let k = 0; k < 6; k++) hit(t + rand() * 4 * b, { type: "highpass", freq: 3000, level: 0.004, decay: 0.012 });   // vinyl crackle
    },
  };

  // Final Chapter: an original, tense-but-not-scary boss theme for Bookworm Dad in D minor.
  // Harpsichord-ish echoing arpeggios over a pulsing bass, like turning pages fast.
  STATIONS.boss = {
    name: "Final Chapter", bpm: 112,
    bars: [
      { root: 38, chord: [62, 65, 69] },   // Dm
      { root: 34, chord: [58, 62, 65] },   // Bb
      { root: 36, chord: [60, 64, 67] },   // C
      { root: 33, chord: [57, 61, 64] },   // A (harmonic minor lift)
    ],
    play(i, t, b) {
      const { root, chord } = this.bars[i % 4];
      pad(chord.map((n) => n - 12), t, 4 * b, { type: "triangle", cutoff: 900, level: 0.04 });
      for (let s = 0; s < 8; s++) bass(root + (s % 2 ? 12 : 0), t + s * b / 2, b * 0.35, { type: "sawtooth", level: 0.07, cutoff: 420 });
      const arp = [chord[0], chord[1], chord[2], chord[1] + 12, chord[2] + 12, chord[1] + 12, chord[2], chord[1]];
      for (let s = 0; s < 16; s++) pluck(arp[s % 8] + 12, t + s * b / 4, { type: "square", level: 0.022, decay: 0.28, cutoff: 1800, echo: s % 4 === 0 });
      kick(t, 0.16); kick(t + 2 * b, 0.14); kick(t + 2.75 * b, 0.08);
      snare(t + b, 0.05); snare(t + 3 * b, 0.05);
      for (let k = 0; k < 8; k++) hit(t + k * b / 2, { type: "highpass", freq: 8000, level: k % 2 ? 0.006 : 0.01, decay: 0.04 });
    },
  };

  function tick() {
    const st = STATIONS[current]; if (!st) return;
    const beat = 60 / st.bpm;
    while (nextBarTime < ctx.currentTime + 0.6) {
      st.play(bar, nextBarTime, beat);
      nextBarTime += 4 * beat; bar++;
    }
  }

  function targetGain() { return volume * 1.4 * (ducked ? 0.25 : 1); }

  const api = {
    stations: Object.fromEntries(Object.entries(STATIONS).map(([k, v]) => [k, v.name])),
    get station() { return current; },
    get playing() { return !!timer; },
    onchange: null,
    async play(name) {
      unlockMediaPlayback();
      setup();
      if (ctx.state === "suspended") await ctx.resume();
      if (timer && name === current) return;
      if (timer) { clearInterval(timer); timer = null; }
      current = STATIONS[name] ? name : "lounge";
      delay.delayTime.value = (60 / STATIONS[current].bpm) * 0.75;
      bar = 0; seed = 7; nextBarTime = ctx.currentTime + 0.15;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(targetGain(), ctx.currentTime + 1.5);
      tick(); timer = setInterval(tick, 50);
      api.onchange && api.onchange(api);
    },
    stop() {
      if (!ctx || !timer) return;
      clearInterval(timer); timer = null;
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
      setTimeout(() => { if (!timer && ctx.state === "running") ctx.suspend(); if (!timer && unlockEl) unlockEl.pause(); }, 4000);
      api.onchange && api.onchange(api);
    },
    setVolume(v) {
      volume = Math.min(1, Math.max(0, v));
      if (ctx && timer) master.gain.setTargetAtTime(targetGain(), ctx.currentTime, 0.1);
    },
    duck(on) {
      ducked = !!on;
      if (ctx && timer) master.gain.setTargetAtTime(targetGain(), ctx.currentTime, 0.25);
    },
    // Renders a station to an AudioBuffer without playing it (used for testing).
    async renderPreview(name, seconds = 20, sampleRate = 44100) {
      const saved = { ctx, master, comp, wet, dry, delay, delayFb, delayOut, current, bar, nextBarTime };
      const off = new OfflineAudioContext(2, Math.ceil(sampleRate * seconds), sampleRate);
      setup(off);
      const st = STATIONS[name]; const beat = 60 / st.bpm;
      master.gain.setValueAtTime(0, 0); master.gain.linearRampToValueAtTime(volume * 1.4, 1.5);
      delay.delayTime.value = beat * 0.75; seed = 7;
      for (let i = 0, t = 0.1; t < seconds; i++, t += 4 * beat) st.play(i, t, beat);
      const buf = await off.startRendering();
      ({ ctx, master, comp, wet, dry, delay, delayFb, delayOut, current, bar, nextBarTime } = saved);
      return buf;
    },
    chime() {
      setup(); if (ctx.state === "suspended") ctx.resume();
      const t = ctx.currentTime + 0.05;
      [76, 79, 84].forEach((n, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = mtof(n); g.gain.setValueAtTime(0.0001, t + i * 0.18);
        g.gain.exponentialRampToValueAtTime(0.18, t + i * 0.18 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.18 + 1.2);
        o.connect(g).connect(ctx.destination); o.start(t + i * 0.18); o.stop(t + i * 0.18 + 1.3);
      });
    },
  };
  window.RoboRadio = api;
})();
