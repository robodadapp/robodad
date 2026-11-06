/* RoboDad Sleep Sounds
 *
 * Every sound is generated on the phone (no audio files), rendered once into a
 * seamless 30-second loop, then played through a normal <audio loop> element.
 * Playing it as media (not live Web Audio) is what keeps it going after the
 * screen turns off on Android.
 *
 *   RoboSleep.sounds                 // { id: { name, icon } }
 *   RoboSleep.toggle(id)             // on/off for one sound
 *   RoboSleep.setVol(id, 0..1)
 *   RoboSleep.start(mix?)            // start the saved mix (or a given one)
 *   RoboSleep.stopAll()
 *   RoboSleep.setTimer(minutes|0)    // fades out over the last minute; 0 = no timer
 *   RoboSleep.onchange = fn          // called whenever anything changes
 */
(function () {
  "use strict";
  const SR = 22050, LOOP = 30, XF = 3;            // sample rate, loop seconds, crossfade seconds
  const KEY = "robodad.sleep";

  const sounds = {
    rain:   { name: "Rain",        icon: "🌧️" },
    storm:  { name: "Heavy rain",  icon: "⛈️" },
    brown:  { name: "Brown noise", icon: "🟤" },
    pink:   { name: "Pink noise",  icon: "🌸" },
    white:  { name: "White noise", icon: "⚪" },
    stream: { name: "Stream",      icon: "🏞️" },
    ocean:  { name: "Ocean waves", icon: "🌊" },
    wind:   { name: "Wind",        icon: "🍃" },
    fan:    { name: "Fan",         icon: "🌀" },
  };

  // ---------------------------------------------------------------- tiny DSP kit
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }
  function pinkGen(r) {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    return () => {
      const w = r() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
      const o = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362; b6 = w * 0.115926; return o * 0.11;
    };
  }
  function brownGen(r) { let b = 0; return () => { b = (b + 0.02 * (r() * 2 - 1)) / 1.02; return b * 3.5; }; }
  const onePoleLP = (fc) => { const a = Math.exp(-2 * Math.PI * fc / SR); let y = 0; return (x) => (y = (1 - a) * x + a * y); };
  const onePoleHP = (fc) => { const lp = onePoleLP(fc); return (x) => x - lp(x); };
  function svf() {                                  // Chamberlin state-variable filter, band-pass out
    let low = 0, band = 0;
    return (x, fc, q) => {
      const f = 2 * Math.sin(Math.PI * Math.min(fc, SR / 6) / SR);
      low += f * band; const high = x - low - q * band; band += f * high; return band;
    };
  }
  function smoothRandom(r, rate) {                  // slow wander between 0 and 1
    let cur = r(), tgt = r(), t = 0; const step = rate / SR;
    return () => { t += step; if (t >= 1) { t = 0; cur = tgt; tgt = r(); } const k = t * t * (3 - 2 * t); return cur + (tgt - cur) * k; };
  }
  // adds a short decaying burst (a raindrop or a splash) into buf
  function addDrop(buf, r, at, amp, fc, decayMs) {
    const n = Math.floor(SR * decayMs / 1000 * 4.5), q = 0.25 + r() * 0.35;
    const f = 2 * Math.sin(Math.PI * Math.min(fc, SR / 6) / SR), k = Math.exp(-1 / (SR * decayMs / 1000));
    let low = 0, band = 0, env = amp;
    for (let i = 0; i < n && at + i < buf.length; i++) {
      low += f * band; const high = (r() * 2 - 1) - low - q * band; band += f * high;
      buf[at + i] += band * env; env *= k;
    }
  }
  function addBubble(buf, r, at, amp) {             // a little rising "blip" of moving water
    const dur = 0.02 + r() * 0.05, n = Math.floor(SR * dur), f0 = 300 + r() * 500, f1 = f0 * (1.6 + r() * 1.2);
    let ph = 0;
    for (let i = 0; i < n && at + i < buf.length; i++) {
      const t = i / n, fq = f0 + (f1 - f0) * t; ph += 2 * Math.PI * fq / SR;
      buf[at + i] += Math.sin(ph) * Math.sin(Math.PI * t) * Math.exp(-3 * t) * amp;
    }
  }

  // ---------------------------------------------------------------- the sounds
  const render = {
    white(r, N, out) { const lp = onePoleLP(9000); for (let i = 0; i < N; i++) out[i] = lp(r() * 2 - 1); },
    pink(r, N, out) { const p = pinkGen(r); for (let i = 0; i < N; i++) out[i] = p(); },
    brown(r, N, out) { const b = brownGen(r), hp = onePoleHP(25); for (let i = 0; i < N; i++) out[i] = hp(b()); },
    rain(r, N, out) { rainy(r, N, out, 30, 0.45, 0.12); },
    storm(r, N, out) { rainy(r, N, out, 140, 0.9, 0.45); },
    stream(r, N, out) {
      const b = brownGen(r), p = pinkGen(r), f = svf(), wob = smoothRandom(r, 0.6), lp = onePoleLP(2500);
      for (let i = 0; i < N; i++) out[i] = lp(b() * 0.5 + f(p(), 900 + wob() * 900, 0.7) * (0.5 + wob() * 0.6));
      const rate = 18; for (let k = 0, n = Math.floor(N / SR * rate); k < n; k++) addBubble(out, r, Math.floor(r() * N), 0.05 + r() * 0.1);
    },
    ocean(r, N, out) {
      const b = brownGen(r), p = pinkGen(r); let y = 0, t = 0, period = 8 + r() * 3;
      for (let i = 0; i < N; i++) {
        t += 1 / SR; if (t > period) { t -= period; period = 8 + r() * 3.5; }
        const ph = t / period;                       // swell, crash, wash back out
        const env = ph < 0.35 ? Math.pow(ph / 0.35, 2) : Math.exp(-(ph - 0.35) * 4.2);
        const fc = 250 + env * 2200, a = Math.exp(-2 * Math.PI * fc / SR);
        y = (1 - a) * (p() * 0.8 + b() * 0.4) + a * y;
        out[i] = y * (0.25 + env * 1.1) + b() * 0.12;
      }
    },
    wind(r, N, out) {
      const b = brownGen(r), w = pinkGen(r), f = svf(), f2 = svf(), sweep = smoothRandom(r, 0.18), gust = smoothRandom(r, 0.12);
      for (let i = 0; i < N; i++) {
        const s = sweep(), g = gust();
        out[i] = f(w(), 180 + s * 650, 0.32) * (0.35 + g * 1.2) + f2(b(), 90 + s * 120, 0.5) * 0.5 + b() * 0.15;
      }
    },
    fan(r, N, out) {
      const b = brownGen(r), p = pinkGen(r), lp = onePoleLP(900), lp2 = onePoleLP(3500);
      for (let i = 0; i < N; i++) {
        const t = i / SR;
        out[i] = lp(b()) * 0.9 + lp2(p()) * 0.25 + Math.sin(2 * Math.PI * 60 * t) * 0.03 + Math.sin(2 * Math.PI * 120 * t) * 0.015;
      }
    },
  };
  function rainy(r, N, out, perSec, bed, rumble) {
    const p = pinkGen(r), b = brownGen(r), hp = onePoleHP(700), lp = onePoleLP(7000), sw = smoothRandom(r, 0.25);
    for (let i = 0; i < N; i++) out[i] = lp(hp(p())) * bed * (0.8 + sw() * 0.4) + b() * rumble;
    const n = Math.floor(N / SR * perSec);
    for (let k = 0; k < n; k++) addDrop(out, r, Math.floor(r() * N), 0.06 + r() * r() * 0.22, 1200 + r() * 4500, 3 + r() * 7);
  }

  // ---------------------------------------------------------------- loop building
  const cache = {};
  function buildLoop(id) {
    if (cache[id]) return cache[id];
    const L = LOOP * SR, X = XF * SR, P = 2 * SR, full = new Float32Array(P + L + X);
    render[id](rng(0x5EED + id.length * 7919 + id.charCodeAt(0)), full.length, full);
    const raw = full.subarray(P);                   // drop 2 s of warm-up while the filters settle
    const out = new Float32Array(L);                // equal-power crossfade of the tail into the head
    for (let i = 0; i < L; i++) {
      if (i < X) { const k = i / X; out[i] = raw[i] * Math.sin(k * Math.PI / 2) + raw[L + i] * Math.cos(k * Math.PI / 2); }
      else out[i] = raw[i];
    }
    let sum = 0;                                    // same loudness for every sound
    for (let i = 0; i < L; i++) sum += out[i] * out[i];
    const gain = 0.16 / (Math.sqrt(sum / L) || 1);
    const soft = (y) => { const a = Math.abs(y); return a <= 0.6 ? y : Math.sign(y) * (0.6 + 0.35 * Math.tanh((a - 0.6) / 0.35)); };
    const buf = new ArrayBuffer(44 + L * 2), v = new DataView(buf);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, "RIFF"); v.setUint32(4, 36 + L * 2, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true);
    v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, SR, true); v.setUint32(28, SR * 2, true);
    v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, L * 2, true);
    for (let i = 0; i < L; i++) v.setInt16(44 + i * 2, soft(out[i] * gain) * 32767, true);
    return (cache[id] = URL.createObjectURL(new Blob([buf], { type: "audio/wav" })));
  }

  // ---------------------------------------------------------------- player
  const MASTER = 0.85;
  const state = (() => {
    let s = {}; try { s = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) {}
    return { vols: s.vols || { rain: 0.7, brown: 0.5 }, mix: s.mix || ["rain", "brown"], timer: s.timer ?? 30 };
  })();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ vols: state.vols, mix: state.mix, timer: state.timer })); } catch (e) {} };
  const els = {};                                   // id -> <audio>
  let fade = 1, endsAt = 0, tick = null;

  const api = {
    sounds, onchange: null,
    loopUrl: (id) => buildLoop(id),            // the rendered loop (handy for testing)
    get timer() { return state.timer; },
    get endsAt() { return endsAt; },
    get mix() { return state.mix.slice(); },
    isOn: (id) => !!(els[id] && !els[id].paused),
    get playing() { return Object.keys(els).some((id) => !els[id].paused); },
    vol: (id) => state.vols[id] ?? 0.6,
    setVol(id, x) { state.vols[id] = Math.max(0, Math.min(1, x)); save(); apply(); },
    toggle(id) { if (api.isOn(id)) off(id); else on(id); changed(); },
    start(mix) {
      if (mix) state.mix = mix.slice();
      if (!state.mix.length) state.mix = ["rain"];
      state.mix.forEach(on); changed();
    },
    stopAll() { Object.keys(els).forEach((id) => els[id].pause()); endsAt = 0; stopTick(); fade = 1; media(false); changed(); },
    setTimer(min) { state.timer = min; save(); if (api.playing) armTimer(); changed(); },
  };

  function on(id) {
    if (!sounds[id]) return;
    let a = els[id];
    if (!a) {
      a = els[id] = new Audio(buildLoop(id));
      a.loop = true; a.preload = "auto"; a.setAttribute("playsinline", "");
    }
    if (!api.playing) { fade = 1; armTimer(); }
    if (!state.mix.includes(id)) state.mix.push(id);
    save(); apply(); a.play().catch(() => {}); media(true);
  }
  function off(id) {
    if (els[id]) els[id].pause();
    state.mix = state.mix.filter((x) => x !== id); save();
    if (!api.playing) { endsAt = 0; stopTick(); media(false); }
  }
  function apply() { Object.keys(els).forEach((id) => { els[id].volume = Math.max(0, Math.min(1, api.vol(id) * MASTER * fade)); }); }
  function armTimer() {
    endsAt = state.timer ? Date.now() + state.timer * 60000 : 0; fade = 1; apply();
    stopTick(); if (endsAt) tick = setInterval(onTick, 1000);
  }
  function stopTick() { if (tick) clearInterval(tick); tick = null; }
  function onTick() {
    const left = endsAt - Date.now();
    if (left <= 0) { const keep = state.mix.slice(); api.stopAll(); state.mix = keep; save(); return; }
    fade = Math.min(1, left / 60000); apply();       // fade over the last minute
    if (api.onchange) api.onchange("tick");
  }
  function media(playing) {                          // lock-screen card with a pause button
    const ms = navigator.mediaSession; if (!ms) return;
    try {
      if (playing) {
        ms.metadata = new MediaMetadata({ title: "Sleep Sounds", artist: "RoboDad",
          artwork: [{ src: "/static/icon-192.png", sizes: "192x192", type: "image/png" }, { src: "/static/icon-512.png", sizes: "512x512", type: "image/png" }] });
        ms.setActionHandler("pause", () => api.stopAll());
        ms.setActionHandler("stop", () => api.stopAll());
        ms.setActionHandler("play", () => api.start());
      }
      ms.playbackState = playing ? "playing" : "none";
    } catch (e) {}
  }
  function changed() { if (api.onchange) api.onchange("change"); }

  window.RoboSleep = api;
})();
