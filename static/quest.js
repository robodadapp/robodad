/* DAD QUEST: RoboDad's 8-bit game. Original art and music, drawn and played in code.
   No ads, no purchases, no streaks. Scores, skins, polaroids and tapes stay on this device. */
(() => {
  "use strict";
  const W = 320, H = 180, GY = 150, BEAT = 12;   // logical size, ground line, frames per music step
  const cv = document.getElementById("game"), main = cv.getContext("2d");
  main.imageSmoothingEnabled = false;
  let x = main;                                  // current drawing context (swapped for the share card)
  const live = document.getElementById("live");
  const say = (s) => { live.textContent = s; };
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  };
  const jget = (k, d) => { try { const v = JSON.parse(store.get(k)); return v == null ? d : v; } catch { return d; } };
  const unlocked = !!(store.get("robodad.egg.dadquest") || store.get("robodad.family"));
  // Level 1: Home opens with the SELECT code from Otto's Log (Otto mode rung 6), even before the cartridge is found
  const homeOpen = () => (parseInt(store.get("robodad.otto") || "0", 10) || 0) >= 6;
  const homeOnly = !unlocked && homeOpen();
  const calm = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const buzz = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch {} };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // seeded random numbers: the same seed always builds the same room, so rooms can be learned
  function rng(seed){ let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let v = Math.imul(a ^ a >>> 15, 1 | a); v = v + Math.imul(v ^ v >>> 7, 61 | v) ^ v; return ((v ^ v >>> 14) >>> 0) / 4294967296; }; }
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const today = () => { const d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); };

  // ---------- sound (comes on with the first tap; the button turns it off for good) ----------
  let t = 0, mt = 0;                             // draw frames, music/game ticks
  let ac = null, noiseBuf = null, muted = store.get("robodad.dadquest.mute") === "1";
  const muteBtn = document.getElementById("muteBtn");
  function audioOn(){
    if (muted) return;
    if (!ac) {
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
        const n = Math.floor(ac.sampleRate * 0.2); noiseBuf = ac.createBuffer(1, n, ac.sampleRate);
        const d = noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      } catch { ac = null; }
    }
    if (ac && ac.state === "suspended") ac.resume();
  }
  function tone(f, t0, dur, type = "square", vol = 0.05){
    if (!ac || muted) return;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(ac.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  function noise(t0, dur, vol, hp){
    if (!ac || muted || !noiseBuf) return;
    const s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
    s.buffer = noiseBuf; f.type = "highpass"; f.frequency.value = hp;
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f).connect(g).connect(ac.destination); s.start(t0); s.stop(t0 + dur + 0.02);
  }
  function kick(t0){
    if (!ac || muted) return;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = "sine"; o.frequency.setValueAtTime(150, t0); o.frequency.exponentialRampToValueAtTime(42, t0 + 0.11);
    g.gain.setValueAtTime(0.11, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.13);
    o.connect(g).connect(ac.destination); o.start(t0); o.stop(t0 + 0.15);
  }
  const N = (n) => 440 * Math.pow(2, (n - 69) / 12);
  // five original little loops (the mixtapes), and a tenser one for bosses. 0 is a rest.
  const TAPES = [
    { name: "Kitchen Hop",   wave: "square",   mel: [72,76,79,76, 74,77,81,77, 72,76,79,84, 83,79,76,74], bas: [48,48,55,55, 50,50,53,53, 48,48,55,55, 55,55,50,50] },
    { name: "Driveway Rock", wave: "sawtooth", mel: [64,0,67,69, 71,0,69,67, 64,0,67,69, 74,71,69,67],    bas: [40,40,40,40, 43,43,43,43, 45,45,45,45, 47,47,43,43] },
    { name: "Sunday Drive",  wave: "triangle", mel: [77,0,81,0, 84,81,77,0, 79,0,82,0, 86,82,79,0],       bas: [41,41,48,48, 41,41,48,48, 43,43,50,50, 43,43,50,50] },
    { name: "Arcade Nights", wave: "square",   mel: [81,84,88,84, 81,84,88,93, 79,83,86,83, 79,83,86,91], bas: [45,45,45,45, 45,45,45,45, 43,43,43,43, 43,43,43,43] },
    { name: "Attic Lullaby", wave: "triangle", mel: [74,0,78,0, 81,0,78,0, 76,0,79,0, 83,81,79,78],       bas: [50,50,57,57, 50,50,57,57, 52,52,59,59, 55,55,57,57] },
  ];
  const BOSS_TAPE = { wave: "square", mel: [69,72,76,72, 69,72,77,76, 68,71,76,71, 68,71,74,71], bas: [45,45,45,45, 41,41,41,41, 40,40,40,40, 40,40,44,44] };
  let tapesOwned = clamp(parseInt(store.get("robodad.dadquest.tapes") || "1", 10) || 1, 1, TAPES.length);
  let tape = clamp(parseInt(store.get("robodad.dadquest.tape") || "0", 10) || 0, 0, tapesOwned - 1);
  // the music is driven by the game clock, so obstacles reach Dad exactly on the beat
  function musicStep(){
    if (!ac || muted || ["locked", "boot", "paused"].includes(state)) return;
    const playing = state === "play" || state === "bonus";
    const tk = boss && boss.phase !== "dead" ? BOSS_TAPE : TAPES[tape], i = (mt / BEAT) % 16, t0 = ac.currentTime + 0.02, q = playing ? 1 : 0.55;
    const m = tk.mel[i];
    if (m) { tone(N(m), t0, 0.16, tk.wave, (tk.wave === "sawtooth" ? 0.016 : 0.024) * q); if (strength > 0) tone(N(m + 12), t0 + 0.1, 0.08, "square", 0.014); }
    tone(N(tk.bas[i]), t0, 0.2, "triangle", 0.045 * q);
    if (playing) { if (i % 2 === 0) kick(t0); else noise(t0, 0.04, 0.02, 6000); if (i % 8 === 4) noise(t0, 0.1, 0.035, 1800); }
  }
  const T = () => ac ? ac.currentTime : 0;
  const sfx = {
    jump(){ const s = T(); tone(N(72), s, .08); tone(N(79), s + .05, .1); },
    dbl(){ const s = T(); tone(N(84), s, .06); tone(N(88), s + .04, .08); },
    item(){ const s = T(); tone(N(84), s, .07); tone(N(91), s + .06, .12); },
    power(){ const s = T(); [72,79,84,91].forEach((n, i) => tone(N(n), s + i * .05, .1)); },
    treasure(){ const s = T(); [79,83,86,91,95].forEach((n, i) => tone(N(n), s + i * .07, .16, "triangle", .07)); },
    hit(){ const s = T(); tone(110, s, .25, "sawtooth", .06); tone(82, s + .1, .3, "sawtooth", .05); },
    stomp(){ const s = T(); tone(N(60), s, .06, "square", .06); tone(N(72), s + .05, .1, "square", .05); noise(s, .08, .05, 900); },
    smash(){ noise(T(), .12, .06, 500); },
    warn(){ const s = T(); tone(N(81), s, .06); tone(N(81), s + .1, .06); },
    wrong(){ const s = T(); tone(N(60), s, .12, "square", .04); tone(N(55), s + .1, .18, "square", .04); },
    win(){ const s = T(); [72,76,79,84,88].forEach((n, i) => tone(N(n), s + i * .09, .18)); },
    strength(){ const s = T(); [60,64,67,72,76,79,84].forEach((n, i) => tone(N(n), s + i * .04, .12, "sawtooth", .04)); },
    click(){ tone(N(88), T(), .04, "square", .03); },
    blow(){ noise(T(), .35, .08, 1200); },
    stat(){ noise(T(), .18, .03, 3000); },
  };
  function showMute(){ muteBtn.textContent = muted ? "Sound: off" : "Sound: on"; muteBtn.setAttribute("aria-pressed", String(!muted)); }
  muteBtn.addEventListener("click", () => { muted = !muted; store.set("robodad.dadquest.mute", muted ? "1" : "0"); if (!muted) audioOn(); showMute(); });
  showMute();

  // ---------- drawing helpers and a tiny pixel font ----------
  const R = (px, py, w, h, c) => { x.fillStyle = c; x.fillRect(Math.round(px), Math.round(py), w, h); };
  const GL = {
    A: ".#./#.#/###/#.#/#.#", B: "##./#.#/##./#.#/##.", C: ".##/#../#../#../.##", D: "##./#.#/#.#/#.#/##.", E: "###/#../##./#../###",
    F: "###/#../##./#../#..", G: ".##/#../#.#/#.#/.##", H: "#.#/#.#/###/#.#/#.#", I: "###/.#./.#./.#./###", J: "..#/..#/..#/#.#/.#.",
    K: "#.#/#.#/##./#.#/#.#", L: "#../#../#../#../###", M: "#...#/##.##/#.#.#/#...#/#...#", N: "#..#/##.#/#.##/#..#/#..#", O: "###/#.#/#.#/#.#/###",
    P: "##./#.#/##./#../#..", Q: ".##./#..#/#..#/#.#./.#.#", R: "##./#.#/##./#.#/#.#", S: ".##/#../.#./..#/##.", T: "###/.#./.#./.#./.#.",
    U: "#.#/#.#/#.#/#.#/###", V: "#.#/#.#/#.#/#.#/.#.", W: "#...#/#...#/#.#.#/##.##/#...#", X: "#.#/#.#/.#./#.#/#.#", Y: "#.#/#.#/.#./.#./.#.", Z: "###/..#/.#./#../###",
    0: ".#./#.#/#.#/#.#/.#.", 1: ".#./##./.#./.#./###", 2: "##./..#/.#./#../###", 3: "##./..#/.#./..#/##.", 4: "#.#/#.#/###/..#/..#",
    5: "###/#../##./..#/##.", 6: ".##/#../###/#.#/###", 7: "###/..#/.#./.#./.#.", 8: "###/#.#/###/#.#/###", 9: "###/#.#/###/..#/##.",
    ".": "./././././#", ",": "../../../.#/#.", "!": "#/#/#/./#", "?": "##./..#/.#./.../.#.", ":": "./#/./#/.", ";": "../.#/../.#/#.",
    "'": "#/#/././.", '"': "#.#/#.#/.../.../...", "-": ".../.../###/.../...", "+": ".../.#./###/.#./...", "=": ".../###/.../###/...",
    "×": ".../#.#/.#./#.#/...", "%": "#.#/..#/.#./#../#.#", "²": "##/.#/#./##/..", "(": ".#/#./#./#./.#", ")": "#./.#/.#/.#/#.",
    "/": "..#/..#/.#./#../#..", "·": "././#/./.", "&": ".#../#.#./.#.#/#.#./.#.#", "✓": "...../....#/...#./#.#../.#...", "←": "..#../.#.../#####/.#.../..#..",
    "↓": ".#./.#./.#./###/.#.", "↑": ".#./###/.#./.#./.#.", "🔒": ".#./#.#/###/###/###", ">": "#../.#./..#/.#./#..", "<": "..#/.#./#../.#./..#", "_": ".../.../.../.../###",
    "♥": "#.#/###/###/.#./...", "#": "#.#/###/#.#/###/#.#",
  };
  const FONT = {};
  for (const k in GL) {
    const rows = GL[k].split("/"), runs = [];
    rows.forEach((r, gy) => { let s = -1; for (let i = 0; i <= r.length; i++) { if (r[i] === "#") { if (s < 0) s = i; } else if (s >= 0) { runs.push([s, gy, i - s]); s = -1; } } });
    FONT[k] = { w: rows[0].length, runs };
  }
  FONT[" "] = { w: 2, runs: [] };
  const MAPC = { "“": '"', "”": '"', "’": "'", "‘": "'", "É": "E", "È": "E", "À": "A", "—": "-", "–": "-" };
  const gcache = new Map();
  function glyphs(s){
    s = String(s); let g = gcache.get(s); if (g) return g;
    g = []; for (let ch of s.toUpperCase()) { if (ch === "…") { g.push(FONT["."], FONT["."], FONT["."]); continue; } ch = MAPC[ch] || ch; if (FONT[ch]) g.push(FONT[ch]); }
    if (gcache.size > 600) gcache.clear(); gcache.set(s, g); return g;
  }
  const sc = (size) => size < 9 ? 1 : size < 14 ? 2 : size < 24 ? 3 : Math.round(size / 5);
  function tw(s, size = 8){ const k = sc(size); let w = 0; for (const g of glyphs(s)) w += (g.w + 1) * k; return Math.max(0, w - k); }
  function text(s, px, py, size = 8, c = "#FFF6D6", align = "center", flat = false){
    const k = sc(size), gs = glyphs(s), w = tw(s, size);
    const ox = Math.round(align === "center" ? px - w / 2 : align === "right" ? px - w : px), oy = Math.round(py);
    for (let pass = flat ? 0 : 1; pass >= 0; pass--) {
      x.fillStyle = pass ? "rgba(0,0,0,.6)" : c; let cx = ox;
      for (const g of gs) { for (const [gx, gy, len] of g.runs) x.fillRect(cx + gx * k, oy + gy * k + pass * k, len * k, k); cx += (g.w + 1) * k; }
    }
  }
  function wrapText(s, px, py, maxW, size = 8, c = "#FFF6D6", lh = 8){
    const words = String(s).split(" "); let line = "", y = py;
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (tw(test, size) > maxW && line) { text(line, px, y, size, c); line = w; y += lh; } else line = test;
    }
    if (line) text(line, px, y, size, c);
    return y + lh;
  }

  // ---------- dads (skins) ----------
  const SKINS = {
    classic: { name: "Classic Dad",   how: "Always yours" },
    mullet:  { name: "Mullet Dad",    how: "Beat the Rogue Roomba" },
    grill:   { name: "Grill Master",  how: "Grab 30 things in one run" },
    track:   { name: "80s Tracksuit", how: "Clear every room" },
    socks:   { name: "Socks & Sandals", how: "Finish 3 missions" },
    arcade:  { name: "Arcade Dad",    how: "Finish 7 missions" },
  };
  const SKIN_IDS = Object.keys(SKINS);
  const skinOwned = (id) => id === "classic" || store.get("robodad.dadquest.skin." + id) === "1";
  let skin = store.get("robodad.dadquest.skin") || "classic";
  if (!SKINS[skin] || !skinOwned(skin)) skin = "classic";

  function dadHead(px, py, sk){
    const o = "#1B2A3A", hair = sk === "mullet" ? "#6B4423" : o, hl = sk === "mullet" ? "#8A5A30" : "#3B4F66";
    if (sk === "mullet") R(px - 1, py + 2, 3, 10, hair);                               // business in front, party in back
    R(px + 2, py, 10, 3, hair); R(px + 1, py + 2, 12, 2, hair);
    R(px + 3, py + 1, 3, 1, hl); R(px + 7, py + 1, 2, 1, hl);
    if (sk === "grill") { R(px + 2, py - 5, 10, 5, "#FFFFFF"); R(px + 1, py - 7, 12, 3, "#FFFFFF"); R(px + 2, py - 1, 10, 1, "#D7D7E0"); }
    if (sk === "socks") { R(px + 1, py - 1, 12, 3, "#E8DFC4"); R(px - 1, py + 2, 16, 1, "#E8DFC4"); }   // bucket hat
    R(px, py + 6, 1, 3, o); R(px + 13, py + 6, 1, 3, o);                              // ears
    R(px + 1, py + 4, 12, 8, "#C9D3DC");                                               // face
    if (sk === "track") R(px + 1, py + 4, 12, 1, "#FF4D6D");                           // sweatband
    const lens = sk === "arcade" ? "#FF4D9D" : "#0B0B14";
    R(px + 2, py + 6, 4, 2, lens); R(px + 8, py + 6, 4, 2, lens); R(px + 6, py + 6, 2, 1, "#0B0B14");
    R(px + 3, py + 6, 1, 1, sk === "arcade" ? "#FFD1E8" : "#7F95AD"); R(px + 9, py + 6, 1, 1, sk === "arcade" ? "#FFD1E8" : "#7F95AD");
    if (sk === "mullet") R(px + 4, py + 9, 6, 1, hair);                                // the moustache comes free
    else { R(px + 5, py + 10, 4, 1, o); R(px + 4, py + 9, 1, 1, o); R(px + 9, py + 9, 1, 1, o); }
  }
  const LEG_A = [1, 3, 6, 8, 6, 3], LEG_B = [8, 6, 3, 1, 3, 6], ARM = [9, 8, 6, 4, 6, 8];
  // RoboDad, drawn from rectangles (14 wide; 22 tall standing, 12 tall in a sock-slide)
  function drawDad(px, py, frame, slide, air, sk = skin){
    const o = "#1B2A3A";
    const shirt = sk === "track" ? "#14B8A6" : sk === "socks" ? "#1FA39A" : sk === "arcade" ? "#6D28D9" : "#3D2F27";
    const shirtD = sk === "track" ? "#7C3AED" : sk === "socks" ? "#F5C518" : sk === "arcade" ? "#22D3EE" : "#2B211C";
    const leg = sk === "track" ? "#7C3AED" : sk === "socks" ? "#C9B58A" : o;
    const shoe = sk === "socks" ? "#8A5A30" : sk === "arcade" ? "#22D3EE" : "#FFFFFF";
    if (slide) {                                   // leaning back, socks out front
      R(px + 9, py + 6, 8, 6, shirt); R(px + 11, py + 6, 2, 4, "#FFFFFF");
      R(px + 15, py + 9, 6, 3, leg); R(px + 20, py + 8, 3, 4, "#FFFFFF"); R(px + 20, py + 8, 3, 1, "#FF4D6D");
      R(px + 7, py + 8, 4, 2, shirtD); R(px + 5, py + 10, 3, 2, "#C9D3DC");            // arm back for balance
      dadHead(px, py, sk);
      return;
    }
    const bob = !air && (frame === 1 || frame === 4) ? 1 : 0;
    dadHead(px, py + bob, sk);
    R(px + 6, py + 12, 2, 1, "#B9C7D4");                                               // neck
    R(px + 1, py + 13, 12, 6, shirt); R(px + 4, py + 13, 2, 4, shirtD); R(px + 8, py + 13, 2, 4, shirtD);
    R(px + 6, py + 13, 2, 4, "#FFFFFF");
    if (sk === "track") { R(px + 1, py + 13, 1, 6, "#FFFFFF"); R(px + 12, py + 13, 1, 6, "#FFFFFF"); }
    if (sk === "socks") { R(px + 3, py + 15, 1, 1, "#F5C518"); R(px + 10, py + 17, 1, 1, "#FF4D6D"); R(px + 9, py + 14, 1, 1, "#FFFFFF"); }
    if (sk === "grill") { R(px + 3, py + 13, 8, 6, "#E3342F"); R(px + 5, py + 15, 4, 2, "#FFFFFF"); }
    if (air) {
      R(px + 11, py + 9, 3, 5, shirtD); R(px + 11, py + 8, 3, 2, "#C9D3DC");            // arm up
      R(px + 2, py + 19, 4, 2, leg); R(px + 8, py + 18, 4, 2, leg); R(px + 2, py + 21, 5, 1, shoe); R(px + 8, py + 20, 5, 1, shoe);
      return;
    }
    const ax = ARM[frame]; R(px + ax, py + 14, 3, 3, shirtD); R(px + ax, py + 17, 3, 2, "#C9D3DC");
    if (sk === "grill") { R(px + ax + 3, py + 12, 1, 6, "#9A93B8"); R(px + ax + 2, py + 10, 3, 3, "#9A93B8"); }   // spatula
    const la = LEG_A[frame], lb = LEG_B[frame], ua = frame === 1 || frame === 2 ? 1 : 0, ub = frame === 4 || frame === 5 ? 1 : 0;
    R(px + lb, py + 19 - ub, 3, 2, leg); R(px + lb, py + 21 - ub, 4, 1, shoe);
    R(px + la, py + 19 - ua, 3, 2, leg); R(px + la, py + 21 - ua, 4, 1, shoe);
    if (sk === "socks") { R(px + la, py + 20 - ua, 3, 1, "#FFFFFF"); R(px + lb, py + 20 - ub, 3, 1, "#FFFFFF"); }
  }

  // ---------- obstacles, pickups, bosses ----------
  const BRICK = ["#E3342F", "#2F80ED", "#F5C518", "#27AE60"];
  const LOWS = { brick: [12, 7], skate: [14, 8], toolbox: [14, 9], gnome: [9, 11], suitcase: [14, 10], wetsign: [10, 11], crate: [12, 9], cat: [14, 9] };
  const HIGHS = { shirt: 14, plant: 14, bike: 22, branch: 18, neon: 22, web: 14 };
  const HTOP = GY - 46, HBOT = GY - 15;           // every hanging thing ends just above a sliding dad
  const DRAW_OBS = {
    brick(o){ R(o.x, o.y + 2, o.w, o.h - 2, o.c); R(o.x, o.y + o.h - 1, o.w, 1, "rgba(0,0,0,.35)");
      for (let i = 0; i < 3; i++) R(o.x + 1 + i * 4, o.y, 3, 2, o.c); R(o.x + 1, o.y + 3, o.w - 2, 1, "rgba(255,255,255,.25)"); },
    skate(o){ R(o.x + 2, o.y, 6, 5, "#FFFFFF"); R(o.x + 2, o.y + 3, 11, 3, "#FFFFFF"); R(o.x + 3, o.y + 1, 4, 1, "#FF4D6D"); R(o.x + 8, o.y + 4, 4, 1, "#7FD1FF");
      R(o.x + 2, o.y + 6, 3, 2, "#F5C518"); R(o.x + 9, o.y + 6, 3, 2, "#F5C518"); },
    toolbox(o){ R(o.x, o.y + 3, o.w, o.h - 3, "#E3342F"); R(o.x, o.y + 5, o.w, 1, "#9C1F1B"); R(o.x + 4, o.y, 6, 1, "#9A93B8"); R(o.x + 4, o.y, 1, 3, "#9A93B8"); R(o.x + 9, o.y, 1, 3, "#9A93B8"); R(o.x + 6, o.y + 5, 2, 2, "#F5C518"); },
    gnome(o){ R(o.x + 3, o.y, 3, 2, "#E3342F"); R(o.x + 2, o.y + 2, 5, 2, "#E3342F"); R(o.x + 2, o.y + 4, 5, 2, "#F2C1A0"); R(o.x + 2, o.y + 5, 5, 3, "#FFFFFF"); R(o.x + 1, o.y + 7, 7, 4, "#2F80ED"); R(o.x + 3, o.y + 4, 1, 1, "#0B0B14"); R(o.x + 5, o.y + 4, 1, 1, "#0B0B14"); },
    suitcase(o){ R(o.x, o.y + 2, o.w, o.h - 2, "#8A5A30"); R(o.x, o.y + 2, o.w, 1, "#A0743F"); R(o.x + 5, o.y, 4, 2, "#3E2A1E"); R(o.x + 2, o.y + 2, 1, o.h - 2, "#3E2A1E"); R(o.x + o.w - 3, o.y + 2, 1, o.h - 2, "#3E2A1E"); R(o.x + 6, o.y + 5, 3, 2, "#F5C518"); },
    wetsign(o){ R(o.x + 1, o.y, 8, 9, "#F5C518"); R(o.x, o.y + 9, 3, 2, "#C99A0C"); R(o.x + 7, o.y + 9, 3, 2, "#C99A0C"); R(o.x + 4, o.y + 2, 2, 4, "#0B0B14"); R(o.x + 4, o.y + 7, 2, 1, "#0B0B14"); },
    crate(o){ R(o.x, o.y, o.w, o.h, "#A0743F"); R(o.x, o.y, o.w, 2, "#B9884C"); R(o.x + 5, o.y, 2, o.h, "#8C6334"); R(o.x, o.y + o.h - 1, o.w, 1, "rgba(0,0,0,.3)"); },
    cat(o){ const c = "#6B6F80"; R(o.x + 2, o.y + 3, 10, 6, c); R(o.x + 9, o.y, 5, 5, c);
      R(o.x + 9, o.y - 2, 1, 2, c); R(o.x + 13, o.y - 2, 1, 2, c); R(o.x, o.y + 4, 3, 2, c);
      R(o.x + 10, o.y + 2, 1, 1, "#F5C518"); R(o.x + 12, o.y + 2, 1, 1, "#F5C518"); text("Z", o.x + 16, o.y - 7 - (t >> 4) % 2, 7, "#9A93B8", "left"); },
    shirt(o){ R(o.x - 10, HTOP + 12, o.w + 20, 1, "#9A93B8");
      R(o.x + 2, HTOP + 11, 2, 3, "#C79A5A"); R(o.x + o.w - 4, HTOP + 11, 2, 3, "#C79A5A");
      R(o.x, HTOP + 14, o.w, 5, o.c); R(o.x + 3, HTOP + 19, o.w - 6, HBOT - HTOP - 18, o.c); R(o.x + 5, HTOP + 15, o.w - 10, 2, "rgba(0,0,0,.2)"); },
    plant(o){ R(o.x + 6, 0, 1, HTOP + 16, "#C9B58A"); R(o.x + 3, HTOP + 12, 1, 6, "#C9B58A"); R(o.x + 10, HTOP + 12, 1, 6, "#C9B58A");
      R(o.x + 2, HTOP + 17, 10, 7, "#B5651D"); R(o.x + 2, HTOP + 17, 10, 1, "#D98B45");
      R(o.x, HTOP + 13, 14, 5, "#27AE60"); R(o.x + 1, HTOP + 22, 2, HBOT - HTOP - 21, "#27AE60"); R(o.x + 11, HTOP + 20, 2, HBOT - HTOP - 22, "#1E8449"); R(o.x + 6, HTOP + 24, 2, HBOT - HTOP - 24, "#27AE60"); },
    bike(o){ R(o.x + 5, 0, 1, HTOP + 6, "#8A8F99"); R(o.x + 16, 0, 1, HTOP + 6, "#8A8F99");
      const y = HTOP + 6; R(o.x + 3, y, 16, 2, "#E3342F"); R(o.x + 9, y, 2, 10, "#E3342F"); R(o.x + 3, y + 2, 2, 8, "#E3342F");
      for (const wx of [0, 13]) { R(o.x + wx + 1, y + 11, 7, 2, "#22222E"); R(o.x + wx + 1, HBOT - 2, 7, 2, "#22222E"); R(o.x + wx, y + 13, 2, HBOT - y - 15, "#22222E"); R(o.x + wx + 7, y + 13, 2, HBOT - y - 15, "#22222E"); R(o.x + wx + 4, y + 18, 1, 1, "#9A93B8"); } },
    branch(o){ R(o.x + 7, 0, 5, HTOP + 12, "#5A3A22"); R(o.x, HTOP + 10, o.w, 4, "#5A3A22");
      R(o.x - 2, HTOP + 12, o.w + 4, 10, "#2E7D32"); R(o.x + 1, HTOP + 20, o.w - 2, HBOT - HTOP - 20, "#388E3C"); R(o.x + 3, HTOP + 15, 3, 2, "#66BB6A"); R(o.x + 11, HTOP + 22, 3, 2, "#66BB6A"); },
    neon(o){ R(o.x + 3, 0, 1, HTOP + 10, "#6E6890"); R(o.x + o.w - 4, 0, 1, HTOP + 10, "#6E6890");
      const on = (t >> 4) % 6 !== 0; R(o.x, HTOP + 10, o.w, HBOT - HTOP - 10, "#1A1235"); R(o.x, HTOP + 10, o.w, 1, on ? "#FF4D9D" : "#7A2550"); R(o.x, HBOT - 1, o.w, 1, on ? "#FF4D9D" : "#7A2550");
      R(o.x, HTOP + 10, 1, HBOT - HTOP - 10, on ? "#FF4D9D" : "#7A2550"); R(o.x + o.w - 1, HTOP + 10, 1, HBOT - HTOP - 10, on ? "#FF4D9D" : "#7A2550");
      text("OPEN", o.x + o.w / 2, HTOP + 18, 7, on ? "#22D3EE" : "#1B6B78"); },
    web(o){ R(o.x + 6, 0, 2, HTOP + 12, "#3E2A1E"); R(o.x - 3, HTOP + 10, o.w + 6, 3, "#3E2A1E");
      for (let i = 0; i < 4; i++) { R(o.x + i * 4, HTOP + 13 + i * 2, o.w - i * 8 > 0 ? o.w - i * 8 : 2, 1, "rgba(230,230,240,.7)"); }
      R(o.x + 6, HTOP + 13, 1, HBOT - HTOP - 20, "rgba(230,230,240,.7)"); const sy = HBOT - 8 + Math.round(Math.sin(t / 14) * 1.5);
      R(o.x + 4, sy, 6, 5, "#22222E"); R(o.x + 2, sy + 1, 2, 1, "#22222E"); R(o.x + 10, sy + 1, 2, 1, "#22222E"); R(o.x + 2, sy + 4, 2, 1, "#22222E"); R(o.x + 10, sy + 4, 2, 1, "#22222E"); R(o.x + 5, sy + 2, 1, 1, "#E3342F"); R(o.x + 8, sy + 2, 1, 1, "#E3342F"); },
    roomba(o){ R(o.x + 1, o.y, o.w - 2, o.h, "#2E2E3A"); R(o.x, o.y + 2, o.w, o.h - 3, "#2E2E3A");
      R(o.x + 3, o.y + 1, o.w - 6, 2, "#4A4A5C"); R(o.x + o.w / 2 - 1, o.y + 1, 2, 1, (t >> 3) % 2 ? "#27AE60" : "#E3342F");
      R(o.x + 2, o.y + o.h - 1, 3, 1, "#9A93B8"); R(o.x + o.w - 5, o.y + o.h - 1, 3, 1, "#9A93B8");
      for (let i = 0; i < 3; i++) R(o.x + o.w + 2 + i * 4 + (t % 4), o.y + o.h - 2, 2, 1, "rgba(200,200,220,.5)"); },
    plank(o){ const c = "#C79A5A"; R(o.x, o.y, o.w, 2, c); R(o.x, o.y + o.h - 2, o.w, 2, c); for (let i = 2; i < o.w; i += 6) R(o.x + i, o.y, 2, o.h, "#A0743F"); },
    bat(o){ const flap = (t >> 3) % 2, c = "#3A2F55", y = o.y + (o.wob ? Math.round(Math.sin((t + o.x) / 7) * 1.5) : 0);
      R(o.x + 5, y + 3, 6, 6, c); R(o.x + 6, y + 1, 1, 2, c); R(o.x + 9, y + 1, 1, 2, c);
      R(o.x + 6, y + 4, 1, 1, "#FF4D6D"); R(o.x + 9, y + 4, 1, 1, "#FF4D6D");
      if (flap) { R(o.x, y + 1, 5, 3, c); R(o.x + 11, y + 1, 5, 3, c); } else { R(o.x, y + 5, 5, 3, c); R(o.x + 11, y + 5, 5, 3, c); } },
    boss(o){ drawBoss(o.kind, o.x, true, 0); },
  };
  // the three bosses: big on the right while they throw things, low and stompable when they charge
  const BOSSES = {
    roomba: { name: "ROGUE ROOMBA", dash: [30, 13], shots: [["low", 1.5], ["low", 1.9], ["low", 2.2, 2], ["low", 2.4]] },
    ladder: { name: "LOOSE LADDER", dash: [36, 8],  shots: [["low", 1.7], ["high", 1.7], ["high", 2.1], ["low", 2.3]] },
    bat:    { name: "ATTIC BAT",    dash: [28, 12], shots: [["high", 2.0], ["low", 2.2], ["high", 2.4], ["high", 2.6], ["low", 2.6]] },
  };
  function drawBoss(kind, bx, dash, hurtT){
    if (hurtT > 0 && (t >> 1) % 2) return;
    bx = Math.round(bx);
    if (kind === "roomba") {
      const y = GY - 13, c = "#2E2E3A";
      R(bx + 2, y, 26, 13, c); R(bx, y + 3, 30, 9, c); R(bx, y + 8, 30, 3, "#4A4A5C");
      R(bx + 4, y + 4, 5, 2, "#E3342F"); R(bx + 12, y + 4, 5, 2, "#E3342F"); R(bx + 3, y + 3, 3, 1, "#0B0B14"); R(bx + 15, y + 3, 3, 1, "#0B0B14");
      R(bx + 20, y - 2, 7, 3, (t >> 3) % 2 ? "#27AE60" : "#1E8449"); R(bx + 22, y - 1, 3, 1, "#FFFFFF");       // the OFF button
      R(bx + 3, y + 12, 4, 1, "#9A93B8"); R(bx + 23, y + 12, 4, 1, "#9A93B8");
      for (let i = 0; i < 4; i++) R(bx + 32 + i * 5 + (t % 5), y + 10, 2, 1, "rgba(200,200,220,.5)");
    } else if (kind === "ladder") {
      const c = "#C79A5A", d = "#A0743F";
      if (dash) { const y = GY - 8; R(bx, y, 36, 3, c); R(bx, y + 5, 36, 3, c); for (let i = 4; i < 36; i += 6) R(bx + i, y, 2, 8, d);
        R(bx + 1, y + 1, 3, 3, "#FFFFFF"); R(bx + 1, y + 2, 2, 2, "#0B0B14"); R(bx + 1, y + 5, 3, 2, "#E3342F"); }
      else { const wob = Math.round(Math.sin(t / 9) * 2), y = GY - 46;
        R(bx + 2 + wob, y, 3, 46, c); R(bx + 17 + wob, y, 3, 46, d); for (let i = 6; i < 44; i += 8) R(bx + 2 + wob, y + i, 18, 2, c);
        R(bx + 5 + wob, y + 1, 4, 4, "#FFFFFF"); R(bx + 12 + wob, y + 1, 4, 4, "#FFFFFF"); R(bx + 5 + wob, y + 2, 2, 2, "#0B0B14"); R(bx + 12 + wob, y + 2, 2, 2, "#0B0B14");
        R(bx + 4 + wob, y - 1, 5, 1, "#0B0B14"); R(bx + 12 + wob, y - 1, 5, 1, "#0B0B14"); R(bx + 7 + wob, y + 9, 8, 2, "#E3342F"); }
    } else {
      const c = "#3A2F55", flap = (t >> 3) % 2, y = dash ? GY - 13 : GY - 84 + Math.round(Math.sin(t / 11) * 5);
      R(bx + 8, y + 2, 12, 10, c); R(bx + 9, y, 2, 3, c); R(bx + 17, y, 2, 3, c);
      R(bx + 10, y + 4, 3, 2, "#FF4D6D"); R(bx + 15, y + 4, 3, 2, "#FF4D6D"); R(bx + 12, y + 8, 1, 2, "#FFFFFF"); R(bx + 15, y + 8, 1, 2, "#FFFFFF");
      if (flap) { R(bx - 2, y, 10, 4, c); R(bx + 20, y, 10, 4, c); R(bx - 4, y + 2, 4, 2, c); R(bx + 28, y + 2, 4, 2, c); }
      else { R(bx - 2, y + 6, 10, 4, c); R(bx + 20, y + 6, 10, 4, c); R(bx - 4, y + 9, 4, 2, c); R(bx + 28, y + 9, 4, 2, c); }
    }
  }
  function bossShot(kind, hgt, sp){
    if (kind === "roomba") return { t: "roomba", k: "low", x: W + 6, y: GY - 8, w: 18, h: 8, sp, stomp: true };
    if (kind === "ladder") return hgt === "low" ? { t: "plank", k: "low", x: W + 6, y: GY - 9, w: 30, h: 9, sp } : { t: "plank", k: "high", x: W + 6, y: GY - 28, w: 34, h: 9, sp };
    return hgt === "low" ? { t: "bat", k: "low", x: W + 6, y: GY - 11, w: 16, h: 9, sp, stomp: true } : { t: "bat", k: "high", x: W + 6, y: GY - 29, w: 16, h: 12, sp, wob: 1, stomp: true };
  }

  const ITEMS = {
    key:    { name: "keys",    draw: (a, b) => { R(a, b + 2, 4, 4, "#F5C518"); R(a + 1, b + 3, 2, 2, "#0B0B14"); R(a + 4, b + 3, 4, 2, "#F5C518"); R(a + 6, b + 5, 1, 2, "#F5C518"); } },
    remote: { name: "remotes", draw: (a, b) => { R(a + 2, b, 4, 8, "#22222E"); R(a + 3, b + 1, 2, 1, "#E3342F"); R(a + 3, b + 3, 1, 1, "#9A93B8"); R(a + 4, b + 5, 1, 1, "#9A93B8"); } },
    sock:   { name: "socks",   draw: (a, b) => { R(a + 2, b, 3, 6, "#FFFFFF"); R(a + 2, b + 5, 6, 3, "#FFFFFF"); R(a + 2, b + 1, 3, 1, "#FF4D6D"); } },
    specs:  { name: "glasses", draw: (a, b) => { R(a, b + 3, 3, 3, "#0B0B14"); R(a + 5, b + 3, 3, 3, "#0B0B14"); R(a + 3, b + 3, 2, 1, "#0B0B14"); R(a + 1, b + 4, 1, 1, "#7FD1FF"); R(a + 6, b + 4, 1, 1, "#7FD1FF"); } },
  };
  const ITEM_IDS = Object.keys(ITEMS);
  const drawMug = (a, b) => { R(a, b + 2, 6, 6, "#FFF6D6"); R(a + 6, b + 3, 2, 3, "#FFF6D6"); R(a + 1, b + 3, 4, 1, "#6B4423");
    R(a + 1, b - 1 - (t >> 4) % 2, 1, 2, "rgba(255,255,255,.5)"); R(a + 4, b - (t >> 4) % 2, 1, 2, "rgba(255,255,255,.5)"); };
  const drawTape = (a, b) => { R(a - 1, b + 1, 10, 7, "#22222E"); R(a, b + 2, 8, 3, "#FFF6D6"); R(a + 1, b + 3, 2, 1, "#FF4D6D"); R(a + 5, b + 3, 2, 1, "#2F80ED"); R(a + 1, b + 6, 6, 1, "#4A4A5C"); };
  const drawHeart = (px, py, c) => { R(px, py, 3, 3, c); R(px + 4, py, 3, 3, c); R(px, py + 2, 7, 3, c); R(px + 1, py + 5, 5, 1, c); R(px + 2, py + 6, 3, 1, c); };
  // one polaroid per room, floating high over something you have to jump
  const TREASURES = [
    { id: "ring",   name: "wedding ring",    cap: "The day everything started.", draw: (a, b) => { R(a + 1, b + 2, 6, 1, "#F5C518"); R(a + 1, b + 7, 6, 1, "#F5C518"); R(a, b + 3, 1, 4, "#F5C518"); R(a + 7, b + 3, 1, 4, "#F5C518"); R(a + 3, b, 2, 2, "#7FD1FF"); } },
    { id: "vhs",    name: "home movie",      cap: "Christmas, 1989. Nobody ever rewound it.", draw: (a, b) => { R(a, b + 1, 8, 6, "#22222E"); R(a + 1, b + 2, 6, 2, "#FFF6D6"); R(a + 1, b + 5, 2, 1, "#9A93B8"); R(a + 5, b + 5, 2, 1, "#9A93B8"); } },
    { id: "watch",  name: "Grandpa's watch", cap: "Still five minutes fast. So was he.", draw: (a, b) => { R(a + 2, b, 4, 8, "#6B4423"); R(a + 1, b + 2, 6, 4, "#C0C0C8"); R(a + 2, b + 3, 4, 2, "#FFF6D6"); R(a + 4, b + 3, 1, 1, "#0B0B14"); } },
    { id: "apron",  name: "#1 DAD apron",    cap: "World's okayest griller. Best dad.", draw: (a, b) => { R(a + 2, b, 4, 2, "#E3342F"); R(a + 1, b + 2, 6, 6, "#E3342F"); R(a + 2, b + 4, 4, 2, "#FFFFFF"); R(a, b + 3, 1, 1, "#FFFFFF"); R(a + 7, b + 3, 1, 1, "#FFFFFF"); } },
    { id: "map",    name: "road map",        cap: "We were never lost. We were exploring.", draw: (a, b) => { R(a, b + 1, 8, 6, "#E8DFC4"); R(a + 2, b + 1, 1, 6, "#C9B58A"); R(a + 5, b + 1, 1, 6, "#C9B58A"); R(a + 1, b + 3, 3, 1, "#E3342F"); R(a + 4, b + 4, 3, 1, "#E3342F"); } },
    { id: "ticket", name: "high-score ticket", cap: "High score, 1987. Initials: D-A-D.", draw: (a, b) => { R(a, b + 2, 8, 4, "#F5C518"); R(a + 2, b + 2, 1, 4, "#C99A0C"); R(a + 4, b + 3, 3, 2, "#0B0B14"); R(a, b + 3, 1, 1, "#0B0B14"); R(a + 7, b + 4, 1, 1, "#0B0B14"); } },
    { id: "photo",  name: "baby photo",      cap: "The day you showed up. Best day.", draw: (a, b) => { R(a, b, 8, 8, "#FFF6D6"); R(a + 1, b + 1, 6, 5, "#7FD1FF"); R(a + 3, b + 2, 2, 2, "#F2C1A0"); R(a + 2, b + 4, 4, 2, "#FF8A65"); } },
  ];
  const treasureFound = (i) => store.get("robodad.dadquest.treasure." + TREASURES[i].id) === "1";
  const treasureCount = () => TREASURES.filter((_, i) => treasureFound(i)).length;

  // ---------- rooms: each one is a memory, drawn in three scrolling layers ----------
  const rep = (off, f, period, fn) => { const o = ((off * f) % period + period) % period; for (let bx = -o - period; bx < W + period; bx += period) fn(Math.round(bx)); };
  const bands = (cols, y0, h) => cols.forEach((c, i) => R(0, y0 + i * h, W, h, c));
  const ROOMS = [
    { name: "Kitchen", speed: 2.0, beats: 128, boss: "roomba", lows: ["brick"], high: "shirt", floor: "tile", floorA: "#D9D2C3", floorB: "#BFB6A3",
      deco(off){ R(0, 0, W, H, "#1D2742"); R(0, 96, W, 54, "#243055");
        for (let i = 0; i < 27; i++) R(i * 12 - Math.round(off * 0.1) % 12, 96, 1, 54, "#1D2742");
        rep(off, 0.1, 300, (bx) => { R(bx + 190, 18, 44, 34, "#33406A"); R(bx + 193, 21, 38, 28, "#0E1530"); R(bx + 211, 21, 1, 28, "#33406A"); R(bx + 218, 26, 7, 7, "#FFF6D6"); R(bx + 220, 26, 5, 2, "#0E1530"); });
        rep(off, 0.3, 110, (bx) => { R(bx, 62, 52, 88, "#2A3554"); R(bx + 4, 68, 44, 30, "#33406A"); R(bx + 4, 104, 44, 42, "#33406A"); R(bx + 42, 84, 3, 8, "#9A93B8"); R(bx + 42, 120, 3, 8, "#9A93B8"); });
        rep(off, 0.6, 330, (bx) => { R(bx + 40, 78, 32, 72, "#C9D3DC"); R(bx + 40, 100, 32, 1, "#8FA0AE"); R(bx + 67, 84, 2, 10, "#8FA0AE"); R(bx + 67, 106, 2, 14, "#8FA0AE");
          R(bx + 45, 108, 12, 10, "#FFF6D6"); R(bx + 47, 110, 3, 3, "#E3342F"); R(bx + 52, 112, 3, 4, "#2F80ED"); R(bx + 60, 86, 3, 3, "#F5C518");      // a kid's drawing, held by a magnet
          R(bx + 200, 112, 60, 38, "#3A4670"); R(bx + 200, 108, 60, 4, "#8FA0AE"); R(bx + 212, 96, 12, 12, "#C0C0C8"); R(bx + 224, 100, 5, 2, "#C0C0C8"); R(bx + 240, 102, 10, 6, "#B5651D"); }); } },
    { name: "Living Room", speed: 2.2, beats: 144, lows: ["brick", "skate"], high: "plant", floor: "carpet", floorA: "#7A4B3A", floorB: "#6E4334",
      deco(off){ R(0, 0, W, H, "#3B2A4A");
        for (let i = 0; i < 22; i++) R(i * 16 - Math.round(off * 0.1) % 16, 0, 5, 150, "#443056");
        R(0, 118, W, 32, "#5A3A22"); R(0, 118, W, 2, "#7A5234");
        rep(off, 0.12, 210, (bx) => { R(bx + 20, 30, 26, 22, "#C79A5A"); R(bx + 23, 33, 20, 16, "#F2E6C8"); R(bx + 28, 38, 4, 4, "#F2C1A0"); R(bx + 35, 40, 4, 4, "#F2C1A0"); R(bx + 26, 44, 14, 5, "#2F80ED");
          R(bx + 120, 22, 18, 26, "#C79A5A"); R(bx + 123, 25, 12, 20, "#F2E6C8"); R(bx + 126, 30, 6, 6, "#F2C1A0"); R(bx + 125, 37, 8, 8, "#E3342F"); });
        rep(off, 0.3, 260, (bx) => { R(bx, 60, 70, 58, "#5A3A22"); for (let s = 0; s < 3; s++) { R(bx + 3, 64 + s * 18, 64, 2, "#3E2A1E"); for (let b = 0; b < 9; b++) R(bx + 4 + b * 7, 67 + s * 18, 6, 14, ["#22222E", "#E3342F", "#22222E", "#2F80ED", "#F5C518"][(b + s) % 5]); }   // the VHS shelf
          R(bx + 120, 104, 54, 14, "#3E2A1E"); R(bx + 124, 66, 46, 38, "#6B4423"); R(bx + 128, 70, 32, 28, "#101828");                                   // the tube TV
          const py = 72 + ((t >> 2) % 22), bxp = 130 + ((t >> 1) % 26); R(bx + 129, py, 2, 5, "#FFF6D6"); R(bx + 157, 92 - ((t >> 2) % 20), 2, 5, "#FFF6D6"); R(bx + bxp, 78 + ((t >> 2) % 14), 2, 2, "#FFF6D6");
          R(bx + 163, 72, 4, 4, "#9A93B8"); R(bx + 163, 80, 4, 4, "#9A93B8"); R(bx + 138, 58, 1, 8, "#9A93B8"); R(bx + 150, 56, 1, 10, "#9A93B8"); });
        rep(off, 0.6, 380, (bx) => { R(bx + 60, 112, 90, 38, "#8E3B46"); R(bx + 54, 104, 12, 46, "#7A323C"); R(bx + 144, 104, 12, 46, "#7A323C"); R(bx + 66, 98, 78, 18, "#A04452");
          for (let i = 0; i < 6; i++) R(bx + 70 + i * 13, 100, 2, 14, "#C96A76"); R(bx + 66, 106, 78, 1, "#C96A76");
          R(bx + 250, 70, 2, 80, "#C0C0C8"); R(bx + 240, 58, 22, 14, "#F5C518"); x.fillStyle = "rgba(255,220,130,.05)"; x.beginPath(); x.arc(bx + 251, 80, 34, 0, 7); x.fill(); }); } },
    { name: "Garage", speed: 2.4, beats: 152, boss: "ladder", lows: ["toolbox", "brick", "cat"], high: "bike", floor: "tile", floorA: "#6E727A", floorB: "#62666E",
      deco(off){ R(0, 0, W, H, "#2A2D33"); R(0, 36, W, 56, "#3A3E46");
        for (let i = 0; i < 40; i++) for (let j = 0; j < 6; j++) R(i * 9 - Math.round(off * 0.15) % 9, 40 + j * 9, 1, 1, "#52565F");
        rep(off, 0.15, 180, (bx) => { R(bx + 10, 48, 3, 18, "#8A8F99"); R(bx + 6, 46, 11, 3, "#8A8F99"); R(bx + 34, 52, 16, 4, "#B07A3C"); R(bx + 48, 48, 3, 12, "#8A8F99"); R(bx + 70, 46, 2, 22, "#E3342F"); R(bx + 66, 66, 10, 4, "#E3342F"); R(bx + 100, 50, 14, 14, "#22222E"); R(bx + 104, 54, 6, 6, "#3A3E46"); });
        rep(off, 0.35, 260, (bx) => { R(bx, 104, 96, 6, "#B07A3C"); R(bx + 4, 110, 4, 40, "#8C6334"); R(bx + 88, 110, 4, 40, "#8C6334"); R(bx + 14, 92, 18, 12, "#E3342F"); R(bx + 40, 96, 10, 8, "#2F80ED"); R(bx + 60, 88, 6, 16, "#27AE60"); R(bx + 72, 98, 14, 6, "#F5C518"); });
        rep(off, 0.6, 420, (bx) => { R(bx + 80, 112, 110, 28, "#7A3B2E"); R(bx + 98, 96, 70, 18, "#7A3B2E"); R(bx + 104, 100, 26, 12, "#9FC4E0"); R(bx + 136, 100, 26, 12, "#9FC4E0");
          R(bx + 80, 122, 110, 6, "#B07A3C"); R(bx + 92, 134, 18, 16, "#111"); R(bx + 160, 134, 18, 16, "#111"); R(bx + 97, 139, 8, 6, "#9A93B8"); R(bx + 165, 139, 8, 6, "#9A93B8"); R(bx + 186, 116, 4, 4, "#F5C518"); }); } },
    { name: "Backyard", speed: 2.5, beats: 160, lows: ["gnome", "skate", "cat"], high: "shirt", floor: "grass", floorA: "#3E8E41", floorB: "#37803A",
      deco(off){ bands(["#3A2A5A", "#6B3A6E", "#A8486A", "#D9634F", "#F08A4B", "#F7B267", "#F9D08B"], 0, 16); R(0, 112, W, 38, "#F9D08B");
        R(236, 60, 26, 26, "#FFF6D6"); R(232, 64, 34, 18, "#FFF6D6");
        rep(off, 0.08, 240, (bx) => { R(bx + 20, 78, 54, 34, "#3A2A5A"); R(bx + 30, 66, 34, 14, "#3A2A5A"); R(bx + 36, 88, 8, 8, "#F7B267"); R(bx + 140, 84, 44, 28, "#3A2A5A"); R(bx + 148, 74, 28, 12, "#3A2A5A"); R(bx + 160, 92, 6, 6, "#F7B267"); });
        rep(off, 0.3, 14, (bx) => { R(bx, 92, 11, 58, "#8C6334"); R(bx, 92, 11, 2, "#A0743F"); R(bx + 3, 88, 5, 4, "#8C6334"); });
        R(0, 104, W, 3, "#6B472C"); R(0, 132, W, 3, "#6B472C");
        rep(off, 0.35, 340, (bx) => { R(bx + 60, 40, 8, 110, "#5A3A22"); R(bx + 36, 22, 56, 34, "#2E7D32"); R(bx + 28, 34, 72, 22, "#2E7D32"); R(bx + 44, 28, 10, 6, "#388E3C"); R(bx + 66, 50, 34, 3, "#5A3A22");
          R(bx + 90, 53, 1, 50, "#C9B58A"); R(bx + 84, 102, 13, 13, "#22222E"); R(bx + 88, 106, 5, 5, "#F9D08B"); });      // tire swing
        rep(off, 0.6, 400, (bx) => { R(bx + 110, 112, 26, 12, "#22222E"); R(bx + 108, 108, 30, 5, "#3A3A46"); R(bx + 114, 124, 2, 26, "#22222E"); R(bx + 130, 124, 2, 26, "#22222E"); R(bx + 118, 105, 6, 3, "#B5651D"); R(bx + 127, 105, 6, 3, "#B5651D");
          for (let i = 0; i < 3; i++) R(bx + 116 + i * 6 + Math.round(Math.sin((t + i * 20) / 12) * 2), 96 - ((t >> 2) + i * 9) % 22, 3, 3, "rgba(255,255,255,.25)");
          R(bx + 250, 130, 46, 12, "#2F80ED"); R(bx + 250, 128, 46, 3, "#7FD1FF"); R(bx + 262, 124, 8, 5, "#F5C518"); R(bx + 268, 122, 3, 3, "#F5C518"); }); } },
    { name: "Road Trip", speed: 2.7, beats: 168, lows: ["suitcase", "brick"], high: "branch", floor: "road", floorA: "#4A4A55", floorB: "#4A4A55",
      deco(off){ bands(["#2B2350", "#4B2F6B", "#8A3F78", "#C9566B", "#F0855A", "#FFB26B", "#FFD08A"], 0, 18); R(0, 126, W, 24, "#C98A4B");
        R(60, 84, 34, 34, "#FFE9B0"); R(56, 90, 42, 22, "#FFE9B0");
        rep(off, 0.05, 360, (bx) => { R(bx, 96, 120, 30, "#5B3A7A"); R(bx + 20, 80, 60, 18, "#5B3A7A"); R(bx + 36, 70, 26, 12, "#5B3A7A"); R(bx + 200, 100, 110, 26, "#6E4688"); R(bx + 230, 88, 50, 14, "#6E4688"); });
        rep(off, 0.3, 150, (bx) => { R(bx + 40, 50, 3, 100, "#3E2A1E"); R(bx + 30, 56, 23, 2, "#3E2A1E"); R(bx + 43, 58, 150, 1, "rgba(30,20,20,.6)"); });
        rep(off, 0.3, 450, (bx) => { R(bx + 110, 58, 80, 38, "#FFF6D6"); R(bx + 112, 60, 76, 34, "#2F80ED"); R(bx + 146, 96, 4, 54, "#3E2A1E"); text("WORLD'S BIGGEST", bx + 150, 66, 7, "#FFF6D6", "center", true); text("BALL OF TWINE", bx + 150, 75, 7, "#FFF6D6", "center", true); text("5 MILES", bx + 150, 84, 7, "#F5C518", "center", true); });
        rep(off, 0.6, 520, (bx) => { R(bx + 120, 118, 96, 20, "#8A5A30"); R(bx + 120, 116, 96, 4, "#3F6FA8"); R(bx + 120, 134, 96, 6, "#3F6FA8"); R(bx + 138, 100, 62, 18, "#3F6FA8");      // the station wagon
          R(bx + 142, 103, 24, 12, "#9FC4E0"); R(bx + 170, 103, 26, 12, "#9FC4E0"); R(bx + 132, 136, 16, 14, "#111"); R(bx + 190, 136, 16, 14, "#111"); R(bx + 137, 141, 6, 5, "#C0C0C8"); R(bx + 195, 141, 6, 5, "#C0C0C8");
          R(bx + 146, 92, 44, 8, "#B5651D"); R(bx + 150, 86, 16, 6, "#E3342F"); R(bx + 170, 88, 14, 4, "#27AE60"); R(bx + 144, 99, 48, 1, "#22222E"); R(bx + 213, 122, 4, 4, "#F5C518");
          R(bx + 380, 110, 8, 40, "#2E7D32"); R(bx + 372, 120, 6, 4, "#2E7D32"); R(bx + 372, 112, 4, 10, "#2E7D32"); R(bx + 388, 126, 8, 4, "#2E7D32"); R(bx + 392, 116, 4, 12, "#2E7D32"); }); } },
    { name: "Mall Arcade", speed: 2.9, beats: 176, lows: ["wetsign", "skate"], high: "neon", floor: "carpet", floorA: "#241A4A", floorB: "#2B1F57",
      deco(off){ R(0, 0, W, H, "#140F2E"); R(0, 0, W, 10, "#0B0820");
        rep(off, 0.1, 260, (bx) => { const on = (t >> 5) % 4; text("ARCADE", bx + 60, 40, 14, on ? "#FF4D9D" : "#7A2550", "center", true); R(bx + 14, 58, 94, 2, on ? "#22D3EE" : "#1B6B78");
          R(bx + 170, 36, 34, 26, "#1A1235"); text("PIZZA", bx + 187, 40, 7, "#F5C518", "center", true); R(bx + 180, 50, 14, 8, "#F5C518"); R(bx + 183, 52, 2, 2, "#E3342F"); R(bx + 189, 54, 2, 2, "#E3342F"); });
        rep(off, 0.3, 44, (bx) => { const i = Math.abs(Math.round((bx + off * 0.3) / 44)) % 4, c = ["#E3342F", "#2F80ED", "#27AE60", "#F5C518"][i];
          R(bx + 4, 70, 30, 80, "#221A44"); R(bx + 4, 70, 30, 6, c); R(bx + 8, 80, 22, 18, "#0B0B14"); R(bx + 4, 102, 30, 6, c); R(bx + 12, 104, 3, 3, "#FFF6D6"); R(bx + 22, 104, 2, 2, "#E3342F");
          const f = (t >> 3) + i * 5; R(bx + 10 + f % 16, 84 + (f >> 2) % 10, 3, 3, c); R(bx + 26 - f % 14, 92 - (f >> 1) % 8, 2, 2, "#FFF6D6"); });
        rep(off, 0.6, 360, (bx) => { R(bx + 90, 86, 40, 64, "#2F80ED"); R(bx + 94, 90, 32, 34, "#9FC4E0"); R(bx + 108, 90, 2, 12, "#C0C0C8"); R(bx + 104, 102, 10, 3, "#C0C0C8");
          R(bx + 98, 114, 6, 8, "#FF4D9D"); R(bx + 106, 116, 6, 6, "#F5C518"); R(bx + 116, 113, 6, 9, "#27AE60"); R(bx + 100, 132, 20, 8, "#0B0B14"); }); } },
    { name: "Attic", speed: 3.1, beats: 184, boss: "bat", bats: true, lows: ["crate", "brick", "cat"], high: "web", floor: "wood", floorA: "#7A5234", floorB: "#6B472C",
      deco(off){ R(0, 0, W, H, "#2B1D16");
        rep(off, 0.12, 240, (bx) => { R(bx + 100, 20, 44, 44, "#3E2A1E"); R(bx + 104, 24, 36, 36, "#101828"); R(bx + 121, 24, 2, 36, "#3E2A1E"); R(bx + 104, 41, 36, 2, "#3E2A1E"); R(bx + 126, 30, 8, 8, "#FFF6D6");
          x.fillStyle = "rgba(200,220,255,.05)"; x.beginPath(); x.moveTo(bx + 104, 60); x.lineTo(bx + 140, 60); x.lineTo(bx + 190, 150); x.lineTo(bx + 90, 150); x.fill(); });
        rep(off, 0.25, 70, (bx) => { R(bx, 0, 6, 150, "#3E2A1E"); R(bx - 12, 0, 30, 5, "#3E2A1E"); });
        rep(off, 0.45, 300, (bx) => { R(bx + 20, 112, 40, 38, "#A0743F"); R(bx + 20, 112, 40, 4, "#B9884C"); R(bx + 36, 112, 8, 38, "#8C6334"); text("XMAS", bx + 40, 126, 7, "#3E2A1E", "center", true);
          R(bx + 150, 120, 46, 30, "#6B4423"); R(bx + 150, 120, 46, 6, "#8A5A30"); R(bx + 170, 126, 6, 5, "#F5C518"); R(bx + 66, 128, 30, 22, "#A0743F"); text("PHOTOS", bx + 81, 136, 7, "#3E2A1E", "center", true); });
        for (let i = 0; i < 12; i++) R((i * 53 + t * 0.2 + off * 0.05) % W, (i * 37 + Math.sin((t + i * 30) / 40) * 6 + 30) % 140, 1, 1, "rgba(255,240,200,.35)"); } },
  ];
  const STUDY_ROOM = { name: "Study", floor: "wood", floorA: "#3A4A6A", floorB: "#33415E",
    deco(off){ R(0, 0, W, H, "#16233A");
      rep(off, 0.3, 150, (bx) => { R(bx, 64, 70, 86, "#24324F"); for (let s = 0; s < 4; s++) { R(bx + 4, 70 + s * 19, 62, 2, "#5A4632");
        for (let b = 0; b < 8; b++) R(bx + 6 + b * 7, 72 + s * 19 - (b % 3), 5, 15 + (b % 3), ["#E3342F", "#2F80ED", "#F5C518", "#27AE60", "#9A93B8"][(b + s) % 5]); } });
      R(262, 16, 50, 18, "#E8E2D0"); R(264, 18, 46, 14, "#1F3B2C"); text("A²+B²=C²", 287, 22, 7, "#E8E2D0"); } };
  // Level 1: Home. A short, gentle apartment run that ends at a door marked NOT YET.
  const HOME = { name: "Level 1: Home", speed: 1.9, beats: 84, lows: ["cat", "crate"], high: "plant", floor: "wood", floorA: "#6B4A33", floorB: "#5A3D2A",
    deco(off){ R(0, 0, W, H, "#2A2440"); R(0, 100, W, 50, "#332B4D");
      rep(off, 0.1, 260, (bx) => { R(bx + 30, 22, 50, 40, "#3E2A1E"); R(bx + 33, 25, 44, 34, "#10172B"); R(bx + 55, 25, 2, 34, "#3E2A1E"); R(bx + 33, 41, 44, 2, "#3E2A1E");
        R(bx + 62, 32, 6, 6, "#FFF6D6"); R(bx + 160, 28, 22, 28, "#3E2A1E"); R(bx + 162, 30, 18, 24, "#F2D6A8"); R(bx + 168, 36, 6, 6, "#8E3B46"); R(bx + 200, 30, 16, 20, "#3E2A1E"); R(bx + 202, 32, 12, 16, "#9FC4E0"); });
      rep(off, 0.3, 190, (bx) => { R(bx, 112, 64, 38, "#6C3F52"); R(bx - 4, 100, 12, 50, "#5A3445"); R(bx + 56, 100, 12, 50, "#5A3445"); R(bx + 8, 104, 48, 12, "#7D4A60");
        R(bx + 90, 82, 3, 68, "#C0C0C8"); R(bx + 82, 74, 19, 10, "#F5C518"); R(bx + 120, 124, 30, 26, "#3E2A1E"); R(bx + 124, 116, 22, 8, "#27AE60"); }); } };
  function drawFloor(r, off){
    const o = Math.round(off);
    if (r.floor === "grass") { R(0, GY, W, H - GY, r.floorA); for (let i = -1; i < 28; i++) { const fx = i * 12 - (o % 12); R(fx, GY, 2, 3, r.floorB); R(fx + 5, GY + 8, 3, 2, r.floorB); R(fx + 9, GY + 17, 2, 3, r.floorB); R(fx + 3, GY - 2, 1, 2, r.floorA); R(fx + 8, GY - 3, 1, 3, r.floorA); } }
    else if (r.floor === "road") { R(0, GY, W, H - GY, r.floorA); R(0, GY, W, 2, "#FFF6D6"); for (let i = -1; i < 9; i++) R(i * 44 - (o % 44), GY + 14, 24, 3, "#F5C518"); }
    else if (r.floor === "carpet") { R(0, GY, W, H - GY, r.floorA); for (let i = -1; i < 28; i++) { const fx = i * 12 - (o % 12), k = (i + Math.floor(o / 12)) % 4; R(fx + 2, GY + 5, 2, 2, r.floorB); R(fx + 8, GY + 14, 2, 2, r.floorB);
      if (r.name === "Mall Arcade") { R(fx + 4, GY + 20, 2, 2, ["#FF4D9D", "#22D3EE", "#F5C518", "#27AE60"][(k + 4) % 4]); R(fx + 9, GY + 7, 1, 1, "#FF4D9D"); } } }
    else if (r.floor === "wood") { R(0, GY, W, H - GY, r.floorA); for (let j = 0; j < 3; j++) { R(0, GY + j * 10, W, 1, r.floorB); for (let i = -1; i < 9; i++) R(i * 48 - ((o + j * 17) % 48), GY + j * 10, 1, 10, r.floorB); } }
    else for (let i = -1; i < W / 12 + 2; i++) { const fx = i * 12 - (o % 24); R(fx, GY, 12, H - GY, ((i + Math.floor(o / 12)) % 2) ? r.floorA : r.floorB); }
    R(0, GY, W, 1, "rgba(0,0,0,.4)");
  }

  const JOKES = [
    "You fell for it. Like I fall for every sale.",
    "I'd tell you a LEGO joke, but it's still under my foot.",
    "Game over? More like game... let's go again.",
    "That brick? Placed there by your sibling. Probably.",
    "Don't worry. I lose my keys every day too.",
    "Fun fact: dads don't fall. We test gravity.",
    "Laundry: 1. Dad: 0. Rematch?",
    "I'm not mad. I'm just disappointed in that brick.",
    "Back in my day, we lost to bricks AND walked to school uphill.",
    "I wasn't sliding. I was inspecting the floor.",
    "That Roomba and I have history.",
  ];
  // real, useful things, each with a question RoboDad can coach
  const FACTS = [
    { f: "Changing a flat tire takes about 20 minutes once you've done it once.", ask: "How do I change a flat tire, step by step?" },
    { f: "Sewing a button back on takes about 5 minutes and one needle.", ask: "How do I sew a button back on?" },
    { f: "A simple budget splits money into needs, wants and savings.", ask: "How do I make my first simple budget?" },
    { f: "Your first pay stub shows deductions like tax, CPP and EI.", ask: "How do I read my first pay stub?" },
    { f: "Boiling an egg for about 9 minutes gives a firm, hard-boiled yolk.", ask: "What are some easy meals I can cook for myself?" },
    { f: "A short thank-you note after a job interview really gets noticed.", ask: "How do I write a thank-you note after an interview?" },
    { f: "Checking tire pressure once a month keeps a car safer.", ask: "What basic car checks should every new driver know?" },
    { f: "Most stains come out easier if you rinse them in cold water fast.", ask: "How do I get a stain out of my clothes?" },
  ];

  // ---------- bonus rooms (learning) ----------
  const WORDS = {
    fr: { name: "French", link: "fr", pairs: [["water","eau"],["cat","chat"],["dog","chien"],["house","maison"],["bread","pain"],["thank you","merci"],["school","école"],["book","livre"],["friend","ami"],["red","rouge"],["apple","pomme"],["sun","soleil"],["cheese","fromage"],["hello","bonjour"]] },
    hi: { name: "Hindi", link: "hi", pairs: [["water","paani"],["house","ghar"],["bread","roti"],["thank you","dhanyavaad"],["dog","kutta"],["book","kitaab"],["friend","dost"],["red","laal"],["apple","seb"],["food","khaana"],["sun","suraj"],["hello","namaste"],["milk","doodh"],["mother","maa"]] },
  };
  function mathQ(){
    const k = Math.floor(Math.random() * 5);
    let q, a;
    if (k === 0) { const m = 3 + Math.floor(Math.random() * 7), n = 3 + Math.floor(Math.random() * 7); q = `${m} × ${n} = ?`; a = m * n; }
    else if (k === 1) { const s = 4 + Math.floor(Math.random() * 9), v = 5 + Math.floor(Math.random() * 15); q = `x + ${s} = ${s + v}`; a = v; }
    else if (k === 2) { const m = 2 + Math.floor(Math.random() * 4), v = 3 + Math.floor(Math.random() * 8); q = `${m}x = ${m * v}`; a = v; }
    else if (k === 3) { const p = pick([10, 25, 50]), n = pick([20, 40, 60, 80]); q = `${p}% of ${n} = ?`; a = p * n / 100; }
    else { const n = pick([4, 5, 6, 7, 8, 9, 11, 12]); q = `${n}² = ?`; a = n * n; }
    const wrong = new Set();
    while (wrong.size < 2) { const d = a + pick([-3, -2, -1, 1, 2, 3, 10, -10]); if (d !== a && d >= 0) wrong.add(d); }
    return { q, a: String(a), opts: shuffle([String(a), ...[...wrong].map(String)]) };
  }
  function wordQ(lang){
    const L = WORDS[lang], [en, tr] = pick(L.pairs);
    const others = shuffle(L.pairs.filter(p => p[1] !== tr)).slice(0, 2).map(p => p[1]);
    return { q: `"${en}" in ${L.name}?`, a: tr, opts: shuffle([tr, ...others]) };
  }

  // ---------- missions: three at a time, each one finished moves you toward a new dad ----------
  const MISSIONS = [
    { id: "slide10", label: "Slide under 10 hanging things", n: 10, key: "slides", total: true },
    { id: "stomp5",  label: "Stomp 5 robots or bats", n: 5, key: "stomps", total: true },
    { id: "grab20",  label: "Grab 20 things in one run", n: 20, key: "items" },
    { id: "socks5",  label: "Find 5 socks in one run", n: 5, key: "socks" },
    { id: "nohit",   label: "Clear a room without a scratch", n: 1, key: "nohit", total: true },
    { id: "str3",    label: "Go full DAD STRENGTH 3 times", n: 3, key: "strength", total: true },
    { id: "hop15",   label: "Hop 15 things on the floor in one run", n: 15, key: "hops" },
    { id: "daily",   label: "Finish today's Daily Run", n: 1, key: "daily", total: true },
    { id: "tapes2",  label: "Find 2 mixtapes", n: 2, key: "tapes", total: true },
    { id: "score5k", label: "Score 5000 in one run", n: 5000, key: "score" },
    { id: "stomp15", label: "Stomp 15 robots or bats", n: 15, key: "stomps", total: true },
    { id: "pol4",    label: "Find 4 polaroids", n: 4, key: "polaroids", total: true },
  ];
  let mdone = jget("robodad.dadquest.mdone", []), mprog = jget("robodad.dadquest.mprog", {});
  if (!Array.isArray(mdone)) mdone = []; if (!mprog || typeof mprog !== "object") mprog = {};
  let runc = { items: 0, socks: 0, hops: 0, score: 0 };
  const mval = (m) => m.key === "polaroids" ? treasureCount() : m.total ? (mprog[m.key] || 0) : (runc[m.key] || 0);
  const activeMissions = () => MISSIONS.filter(m => !mdone.includes(m.id)).slice(0, 3);
  const saveMissions = () => { store.set("robodad.dadquest.mprog", JSON.stringify(mprog)); store.set("robodad.dadquest.mdone", JSON.stringify(mdone)); };
  function bump(key, total, n = 1){ if (total) mprog[key] = (mprog[key] || 0) + n; else runc[key] = (runc[key] || 0) + n; checkMissions(); }
  function checkMissions(){
    for (const m of activeMissions()) if (mval(m) >= m.n) {
      mdone.push(m.id); saveMissions(); showToast("MISSION DONE: " + m.label.toUpperCase(), "#7FD1FF"); sfx.win(); say("Mission done: " + m.label + ".");
      if (mdone.length >= 3) unlockSkin("socks");
      if (mdone.length >= 7) unlockSkin("arcade");
    }
  }

  // ---------- game state ----------
  let state = unlocked || homeOnly ? "boot" : "locked";
  let mode = "story", level = 0, lives = 5, maxLives = 5, score = 0, dist = 0, speed = 2, inv = 0, runItems = 0, roomHits = 0;
  let found = { key: 0, remote: 0, sock: 0, specs: 0 }, obs = [], items = [], scen = [], joke = "", fact = null;
  let boss = null, power = 0, strength = 0, meter = 0, cp = null;
  let parts = [], shake = 0, toasts = [], flash = 0, freeze = 0, trans = 0, bootT = 0;
  let evs = [], gen = null, roomBeats = 0, roomStart = 0, rt = 0;
  let ghost = null, rec = [], passedGhost = false;
  let hard = store.get("robodad.dadquest.hard") === "1";
  let crt = store.get("robodad.dadquest.crt") !== "0";
  let reached = clamp(parseInt(store.get("robodad.dadquest.reached") || "0", 10) || 0, 0, ROOMS.length - 1);
  if (store.get("robodad.dadquest.cleared") === "1") reached = ROOMS.length - 1;
  let tutDone = store.get("robodad.dadquest.tut") === "1", touchSeen = false;
  let twoP = null;                                // { turn: 1|2, scores: [a, b], seed }
  let bonus = null;                               // { kind, lang, qs, i, right, phase, timer, blocks, after }
  let shareBlob = null, sel = 0, btns = [], albumSel = 0;
  // which slide keys / fingers are physically down right now, tracked in EVERY state, so a run, retry or resume
  // that starts while you are already holding slide picks it straight up instead of waiting for a fresh press
  const slideKeys = new Set();
  const slideWanted = () => slideKeys.size > 0 || [...ptrs.values()].some(q => q.side === "slide");
  const P = { x: 40, y: GY - 22, vy: 0, slide: false, slideHeld: false, held: false, buf: 0, airT: 0, dbl: false, ff: false, frame: 0, ft: 0, air: false, sx: 1, sy: 1 };
  let best = parseInt(store.get("robodad.dadquest.best") || "0", 10) || 0;
  let daily = jget("robodad.dadquest.daily", null);
  const JV = -5.8, G = 0.36;

  let shownAt = 0;
  function setState(s, wipe){ state = s; sel = 0; shownAt = t; if (s === "play" || s === "bonus") P.slideHeld = slideWanted(); if (wipe && !calm) { trans = 16; sfx.stat(); } }
  const roomIdxAt = (b) => ((gen && gen.base || 0) + Math.floor(Math.max(0, b) / 100)) % ROOMS.length;
  function room(){ return mode === "home" ? HOME : mode === "story" ? ROOMS[level] : ROOMS[roomIdxAt(rt / BEAT)]; }
  function curSpeed(){
    if (mode === "home") return HOME.speed * (hard ? 1 : 0.9);
    if (mode === "story") { const r = ROOMS[level]; return r.speed * (hard ? 1 : 0.85) * (0.86 + 0.14 * clamp(rt / (roomBeats * BEAT * 0.4), 0, 1)); }
    if (mode === "daily") return 2.2 + 0.7 * clamp(rt / (roomBeats * BEAT), 0, 1);
    return Math.min(4.2, 2.2 + Math.max(0, rt) / 3600 * 0.55) * (hard ? 1 : 0.88);
  }
  function resetDad(){ P.y = GY - 22; P.vy = 0; P.slide = false; P.held = false; P.buf = 0; P.air = false; P.ff = false; P.dbl = false; P.sx = P.sy = 1;
    for (const [id, q] of ptrs) if (q.side !== "slide") ptrs.delete(id);              // a thumb still resting on the slide zone stays counted
    P.slideHeld = slideWanted(); }
  function snapStart(at){ roomStart = Math.ceil((mt + 1) / BEAT) * BEAT - at; rt = mt - roomStart; }
  function start(lv, m = "story", keep = false){
    mode = m; level = lv;
    obs = []; items = []; scen = []; parts = []; boss = null; power = 0; strength = 0; inv = 0; cp = null; roomHits = 0; dist = 0; passedGhost = false;
    resetDad();
    maxLives = mode === "daily" ? 4 : hard ? 3 : 5;
    if (!keep) { score = 0; lives = maxLives; runItems = 0; meter = 0; found = { key: 0, remote: 0, sock: 0, specs: 0 }; runc = { items: 0, socks: 0, hops: 0, score: 0 }; }
    lives = Math.min(keep && m === "story" ? lives + 1 : lives, maxLives);
    buildCourse(); snapStart(0); rec = []; loadGhost(); shareBlob = null; speed = curSpeed(); setState("play", true);
    say((twoP ? `Player ${twoP.turn}. ` : "") + (mode === "daily" ? "Daily Run" : mode === "endless" ? "Endless mode" : mode === "home" ? HOME.name : ROOMS[lv].name) + ". Go!");
  }
  // back to Dad's armchair (or the start of the room) with full hearts
  function retry(){
    if ((mode !== "story" && mode !== "home") || !cp) return start(mode === "story" ? level : 0, mode, false);
    obs = []; items = []; parts = []; boss = null; power = 0; strength = 0; inv = 60; dist = 0;
    scen = cp.bossCp ? [] : [{ t: "chair", x: P.x - 6, passed: true }];
    resetDad(); lives = maxLives; score = cp.score; found = { ...cp.found }; runItems = cp.runItems; meter = cp.meter;
    for (const e of evs) e.done = e.f <= cp.f + 72;
    snapStart(cp.f); rec.length = Math.max(0, Math.min(rec.length, rt >> 1)); shareBlob = null; speed = curSpeed(); setState("play", true);
    say("Back at Dad's chair. Go!");
  }
  function unlockSkin(id){
    if (skinOwned(id)) return;
    store.set("robodad.dadquest.skin." + id, "1");
    showToast("NEW DAD UNLOCKED: " + SKINS[id].name.toUpperCase() + "!");
    say("New dad unlocked: " + SKINS[id].name + ". Pick him on the title screen.");
  }
  function showToast(msg, c = "#F5C518"){ toasts.push({ msg, c, t: 150 }); if (toasts.length > 3) toasts.shift(); }
  function saveBest(){ if (Math.floor(score) > best) { best = Math.floor(score); store.set("robodad.dadquest.best", String(best)); return true; } return false; }

  // ---------- the course: patterns of obstacles, each one landing on a beat ----------
  const addEv = (b, o) => { o.f = Math.round(b * BEAT); evs.push(o); };
  const lowEv = (b, R0, rm, force) => addEv(b, { k: "low", t: force || rm.lows[Math.floor(R0() * rm.lows.length)], c: BRICK[Math.floor(R0() * 4)] });
  const highEv = (b, R0, rm) => addEv(b, { k: "high", t: rm.high, c: ["#4FC3F7", "#FF8A65", "#AED581", "#FFFFFF"][Math.floor(R0() * 4)] });
  const itemEv = (b, dy, R0) => addEv(b, { k: "item", it: ITEM_IDS[Math.floor(R0() * 4)], dy });
  const miniEv = (b) => addEv(b, { k: "mini", sp: 1.35 });
  const batEv = (b) => addEv(b, { k: "bat", sp: 1.2 });
  const PATS = {
    hop:      (b, R0, rm) => { lowEv(b, R0, rm); itemEv(b, 40, R0); return 1; },
    slide:    (b, R0, rm) => { highEv(b, R0, rm); itemEv(b, 3, R0); return 1; },
    arc:      (b, R0, rm) => { lowEv(b + 1, R0, rm); itemEv(b, 22, R0); itemEv(b + 1, 44, R0); itemEv(b + 2, 22, R0); return 3; },
    twin:     (b, R0, rm) => { lowEv(b, R0, rm, "brick"); lowEv(b + 1, R0, rm, "brick"); itemEv(b + 0.5, 44, R0); return 2; },
    hopslide: (b, R0, rm, g) => { lowEv(b, R0, rm); highEv(b + g, R0, rm); itemEv(b + g, 3, R0); return g + 1; },
    slidehop: (b, R0, rm, g) => { highEv(b, R0, rm); lowEv(b + g, R0, rm); itemEv(b + g, 40, R0); return g + 1; },
    stomp:    (b, R0) => { miniEv(b); itemEv(b, 44, R0); return 1; },
    bat:      (b, R0, rm) => { if (rm.bats) batEv(b); else miniEv(b); itemEv(b, rm.bats ? 3 : 44, R0); return 1; },
    triple:   (b, R0, rm, g) => { for (let i = 0; i < 3; i++) { lowEv(b + i * g, R0, rm); itemEv(b + i * g, 40, R0); } return 2 * g + 1; },
    limbo:    (b, R0, rm) => { highEv(b, R0, rm); highEv(b + 2, R0, rm); for (let i = 0; i < 3; i++) itemEv(b + i, 3, R0); return 3; },
    stairs:   (b, R0, rm, g) => { lowEv(b, R0, rm); miniEv(b + g); itemEv(b + g, 44, R0); return g + 1; },
    rest:     (b, R0) => { for (let i = 0; i < 4; i++) itemEv(b + i, 3, R0); if (R0() < 0.35) addEv(b + 4, { k: "mug", dy: 22 }); return 5; },
  };
  const POOL0 = ["hop", "hop", "slide", "slide", "arc", "arc", "rest", "hopslide"];
  const POOL1 = ["hop", "slide", "arc", "twin", "slidehop", "hopslide", "stomp", "stomp", "rest"];
  const POOLS = [POOL0, POOL1, [...POOL1, "triple"], [...POOL1, "triple", "limbo"], [...POOL1, "triple", "limbo", "stairs"],
    [...POOL1, "triple", "limbo", "stairs", "stairs", "twin"], [...POOL1, "triple", "limbo", "stairs", "bat", "bat", "bat"]];
  function buildCourse(){
    evs = [];
    if (mode === "home") {
      roomBeats = HOME.beats; gen = { R: rng(hash("dq-home-" + (hard ? "h" : "c"))), beat: 10, tape: 1, tre: 1 };
      genMore(roomBeats); addEv(roomBeats + 6, { k: "nydoor" });
    } else if (mode === "story") {
      roomBeats = ROOMS[level].beats; gen = { R: rng(hash("dq-room-" + level + (hard ? "-h" : "-c"))), beat: 10 };
      genMore(roomBeats); if (!ROOMS[level].boss) addEv(roomBeats + 6, { k: "door" });
    } else if (mode === "daily") {
      const seed = hash("dq-daily-" + today()); roomBeats = 300; gen = { R: rng(seed), beat: 10, base: seed % ROOMS.length };
      genMore(roomBeats); addEv(roomBeats + 6, { k: "flag" });
    } else {
      roomBeats = Infinity; const seed = twoP ? twoP.seed : (Math.random() * 4294967296) >>> 0;
      gen = { R: rng(seed), beat: 10, base: seed % ROOMS.length }; genMore(140);
    }
  }
  function genMore(until){
    const g = gen, R0 = g.R, story = mode === "story" || mode === "home";
    while (g.beat < until) {
      const b = g.beat, rm = mode === "home" ? HOME : story ? ROOMS[level] : ROOMS[roomIdxAt(b)], prog = story ? b / roomBeats : 0;
      const tier = story ? level : Math.min(6, Math.floor(b / 56));
      const tough = mode === "daily" ? b > 200 : story ? hard : hard || b > 300;
      const inner = tough ? 3 : 4;
      let gap = tough ? 3 + Math.floor(R0() * 2) : 4 + Math.floor(R0() * 3);
      if (story && prog < 0.2) gap++;
      if (story) {
        if (!g.tape && prog >= 0.3) { g.tape = 1; lowEv(b, R0, rm); addEv(b, { k: "tape", dy: 42 }); g.beat = b + gap; continue; }
        if (!g.chair && prog >= 0.5) { g.chair = 1; addEv(b, { k: "chair" }); itemEv(b + 1, 3, R0); itemEv(b + 2, 3, R0); g.beat = b + 4; continue; }
        if (!g.tre && prog >= 0.68) { g.tre = 1; lowEv(b + 1, R0, rm); itemEv(b, 22, R0); addEv(b + 1, { k: "treasure", ti: level, dy: 54 }); itemEv(b + 2, 22, R0); g.beat = b + 2 + gap; continue; }
        if (!g.heart && prog >= 0.84) { g.heart = 1; addEv(b, { k: "heart", dy: 3 }); itemEv(b + 1, 3, R0); g.beat = b + 4; continue; }
      } else {
        if (b - (g.lastHeart || 0) > 110) { g.lastHeart = b; addEv(b, { k: "heart", dy: 3 }); g.beat = b + 3; continue; }
        if (b - (g.lastTape || 40) > 150) { g.lastTape = b; lowEv(b, R0, rm); addEv(b, { k: "tape", dy: 42 }); g.beat = b + gap; continue; }
      }
      const pool = story && level === 0 && prog < 0.25 ? ["hop", "slide", "arc"] : POOLS[tier];
      let name = pool[Math.floor(R0() * pool.length)];
      if (name === g.last) name = pool[Math.floor(R0() * pool.length)];
      g.last = name;
      g.beat = b + PATS[name](b, R0, rm, inner) - 1 + gap;
    }
  }
  function spawnEv(e, cx){
    if (e.k === "low") { const [w, h] = LOWS[e.t]; obs.push({ t: e.t, k: "low", x: cx - w / 2, y: GY - h, w, h, c: e.c }); }
    else if (e.k === "high") { const w = HIGHS[e.t]; obs.push({ t: e.t, k: "high", x: cx - w / 2, y: HTOP, w, h: HBOT - HTOP, c: e.c }); }
    else if (e.k === "mini") obs.push({ t: "roomba", k: "low", x: cx - 8, y: GY - 7, w: 16, h: 7, sp: e.sp, stomp: true });
    else if (e.k === "bat") obs.push({ t: "bat", k: "high", x: cx - 8, y: GY - 29, w: 16, h: 12, sp: e.sp, wob: 1, stomp: true });
    else if (e.k === "item") items.push({ k: e.it, x: cx - 4, y: GY - 10 - e.dy, w: 8, h: 8 });
    else if (e.k === "mug") { if (power <= 0) items.push({ k: "mug", x: cx - 4, y: GY - 10 - e.dy, w: 8, h: 8 }); }
    else if (e.k === "heart") { if (lives < maxLives) items.push({ k: "heart", x: cx - 4, y: GY - 10 - e.dy, w: 8, h: 8 }); }
    else if (e.k === "tape") items.push({ k: "tape", x: cx - 4, y: GY - 10 - e.dy, w: 8, h: 8 });
    else if (e.k === "treasure") items.push({ k: "treasure", ti: e.ti, x: cx - 4, y: GY - 10 - e.dy, w: 8, h: 8 });
    else scen.push({ t: e.k, x: cx, f: e.f });
  }

  // ---------- ghost: your best run through this room, to chase ----------
  const gkey = () => mode === "story" ? "robodad.dadquest.ghost.r" + level + (hard ? "h" : "c") : mode === "daily" ? "robodad.dadquest.ghost.daily" : null;
  function loadGhost(){
    ghost = null; const k = gkey(); if (!k) return;
    const g = jget(k, null);
    if (g && typeof g.d === "string" && (mode !== "daily" || g.day === today())) ghost = g;
  }
  function saveGhost(done){
    const k = gkey(); if (!k || rec.length < 40) return;
    const reach = done ? 1e9 : rt;
    if (ghost && (ghost.reach > reach || (ghost.reach === reach && (ghost.hits || 0) <= roomHits))) return;
    let d = ""; for (let i = 0; i < rec.length; i++) d += String.fromCharCode(rec[i] || 40);
    store.set(k, JSON.stringify({ reach, rt, hits: roomHits, day: today(), d }));
  }

  // ---------- juice ----------
  function burst(px, py, n, colors, spread = 1.6, up = 1.4, life = 26){
    for (let i = 0; i < n; i++) parts.push({ x: px, y: py, vx: (Math.random() - 0.5) * spread * 2, vy: -Math.random() * up * 2, life, max: life, c: pick(colors), g: 0.08 });
  }
  const dust = (n = 6) => { for (let i = 0; i < n; i++) parts.push({ x: P.x + 4 + Math.random() * 6, y: GY - 1, vx: -0.6 - Math.random() * 1.2, vy: -Math.random() * 0.8, life: 18, max: 18, c: "rgba(230,225,210,.8)", g: 0.02 }); };
  const sparkle = (px, py, big) => burst(px, py, big ? 22 : 10, ["#F5C518", "#FFF6D6", "#FF4D6D", "#7FD1FF"], big ? 2.2 : 1.4, big ? 1.8 : 1.2, big ? 40 : 24);
  const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const pbox = () => P.slide ? { x: P.x + 3, y: GY - 10, w: 10, h: 10 } : { x: P.x + 3, y: P.y + 3, w: 8, h: 19 };

  // ---------- input: tap right to jump (hold for higher), hold left to sock-slide ----------
  const playing = () => state === "play" || state === "bonus";
  function pressJump(){ if (!playing()) return; P.buf = 8; P.held = true; }
  function releaseJump(){ P.held = false; }
  function slideOn(){ if (!playing()) return; P.slideHeld = true; if (P.air) P.ff = true; }
  function slideOff(){ P.slideHeld = false; }
  let pausedFrom = "play";
  function pause(){ if (playing()) { pausedFrom = state; saveMissions(); setState("paused"); } }
  function activate(i){ const b = btns[i]; if (b && t - shownAt > 12) { sfx.click(); b.act(); } }
  function menuKey(dir){ if (btns.length) { sel = (sel + dir + btns.length) % btns.length; sfx.click(); } }
  const inMenu = () => !["play", "bonus", "locked", "boot"].includes(state);
  function blow(){ if (state === "boot" && !bootT) { bootT = 1; sfx.blow(); burst(W / 2, 98, 26, ["#FFF6D6", "#9A93B8", "#C0C0C8"], 2.6, 0.6, 30); } }
  addEventListener("keydown", (e) => {
    audioOn();
    if (e.code === "ArrowDown" || e.code === "KeyS") slideKeys.add(e.code);
    if (state === "boot") { if (["Space", "Enter"].includes(e.code)) { e.preventDefault(); blow(); } return; }
    if (inMenu()) {
      if (["ArrowDown", "ArrowRight", "KeyS", "KeyD"].includes(e.code)) { e.preventDefault(); menuKey(1); }
      else if (["ArrowUp", "ArrowLeft", "KeyW", "KeyA"].includes(e.code)) { e.preventDefault(); menuKey(-1); }
      else if (["Space", "Enter"].includes(e.code)) { e.preventDefault(); if (!e.repeat) activate(sel); }
      else if ((e.code === "KeyP" || e.code === "Escape") && state === "paused") setState(pausedFrom);
      return;
    }
    if (["Space", "ArrowUp", "KeyW"].includes(e.code)) { e.preventDefault(); if (!e.repeat) pressJump(); }
    else if (["ArrowDown", "KeyS"].includes(e.code)) { e.preventDefault(); if (!e.repeat) slideOn(); }
    else if (e.code === "KeyP" || e.code === "Escape") pause();
  });
  addEventListener("blur", () => { slideKeys.clear(); slideOff(); releaseJump(); });      // keyup never arrives if the window loses focus
  addEventListener("keyup", (e) => {
    if (["ArrowDown", "KeyS"].includes(e.code)) { slideKeys.delete(e.code); if (!slideWanted()) slideOff(); }
    else if (["Space", "ArrowUp", "KeyW"].includes(e.code)) releaseJump();
  });
  const wrap = document.getElementById("wrap");
  const ptrs = new Map();
  // held upright on a phone, the page turns the game on its side (see quest.html), so taps are turned back here
  const rotQ = window.matchMedia ? matchMedia("(orientation:portrait) and (max-width:700px)") : { matches: false };
  const toCanvas = (e) => { const r = cv.getBoundingClientRect();
    return rotQ.matches ? { x: (e.clientY - r.top) / r.height * W, y: (1 - (e.clientX - r.left) / r.width) * H } : { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; };
  const downAt = (e) => rotQ.matches ? -e.clientX : e.clientY;
  wrap.addEventListener("pointerdown", (e) => {
    audioOn(); touchSeen = touchSeen || e.pointerType !== "mouse";
    if (state === "boot") return blow();
    if (state === "locked") return;
    if (inMenu()) { ptrs.set(e.pointerId, { menu: true }); return; }
    const p = toCanvas(e);
    if (p.x > W - 26 && p.y > 15 && p.y < 34) return pause();   // pause button
    const side = p.x < W * 0.38 ? "slide" : "jump";
    ptrs.set(e.pointerId, { side, y0: downAt(e) });
    try { wrap.setPointerCapture(e.pointerId); } catch {}
    if (side === "slide") slideOn(); else pressJump();
  });
  wrap.addEventListener("pointermove", (e) => {
    const pr = ptrs.get(e.pointerId);
    if (pr && pr.side === "jump" && downAt(e) - pr.y0 > 28) { pr.side = "slide"; releaseJump(); P.buf = 0; slideOn(); }   // a swipe down still slides
  });
  function pointerEnd(e){
    const pr = ptrs.get(e.pointerId); ptrs.delete(e.pointerId); if (!pr) return;
    if (pr.menu) {
      if (e.type !== "pointerup" || !inMenu()) return;
      const p = toCanvas(e), i = btns.findIndex(b => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y - 2 && p.y <= b.y + b.h + 2);
      if (i >= 0) { sel = i; activate(i); } else if (state === "over") activate(0);       // tap anywhere to go again
    } else if (pr.side === "slide") { if (![...ptrs.values()].some(q => q.side === "slide")) slideOff(); }
    else releaseJump();
  }
  wrap.addEventListener("pointerup", pointerEnd); wrap.addEventListener("pointercancel", pointerEnd);
  wrap.addEventListener("contextmenu", (e) => e.preventDefault());
  document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });

  // ---------- update ----------
  function endRun(){ runc.score = Math.floor(score); checkMissions(); saveMissions(); saveBest(); }
  function hurt(){
    lives--; roomHits++; inv = 90; sfx.hit(); shake = 14; flash = 6; freeze = 5; buzz(lives <= 0 ? [60, 40, 120] : 70);
    burst(P.x + 7, P.y + 10, 12, ["#FF4D6D", "#FFF6D6"], 1.8, 1.4, 22);
    if (lives > 0) return false;
    joke = pick(JOKES); fact = Math.random() < 0.4 ? pick(FACTS) : null;
    saveGhost(false); endRun();
    if (twoP) {
      twoP.scores[twoP.turn - 1] = Math.floor(score);
      setState(twoP.turn === 1 ? "pass" : "versus");
      say(twoP.turn === 1 ? `Player 1 scored ${Math.floor(score)}. Pass to Player 2.` : "Both players done.");
      return true;
    }
    setState("over"); makeShare();
    say("Game over. " + joke + (fact ? " Dad fact: " + fact.f : "") + " Press Space to go again.");
    return true;
  }
  function physics(){
    const cyc = clamp(Math.round(9 - speed * 1.7), 3, 7);
    if (++P.ft >= cyc) { P.ft = 0; P.frame = (P.frame + 1) % 6; }
    const ground = P.y >= GY - 22 - 0.01;
    if (P.buf > 0) {
      if (ground) { P.vy = JV; P.airT = 0; P.dbl = false; P.ff = false; P.buf = 0; P.sx = 0.8; P.sy = 1.22; sfx.jump(); dust(3); }
      else if (power > 0 && !P.dbl) { P.vy = -5.2; P.dbl = true; P.airT = 0; P.ff = false; P.buf = 0; P.sx = 0.82; P.sy = 1.2; sfx.dbl(); burst(P.x + 7, P.y + 20, 8, ["#FFF6D6", "#C79A5A"], 1.2, 0.5, 18); }
      else P.buf--;
    }
    if (!ground || P.vy < 0) {
      P.airT++;
      const minT = hard ? 4 : 6, cut = hard ? -2.2 : -2.6;         // let go early for a short hop (Chill keeps even a quick tap high enough)
      if (!P.held && P.airT >= minT && P.vy < cut) P.vy = cut;
      P.vy += P.ff ? G * 2.8 : G; P.y += P.vy;
    }
    if (P.y >= GY - 22) { if (P.air && P.vy > 2) { dust(); P.sx = 1.25; P.sy = 0.76; } P.y = GY - 22; P.vy = 0; P.ff = false; }
    P.air = P.y < GY - 22 - 0.01;
    P.slide = P.slideHeld && !P.air;
    P.sx += (1 - P.sx) * 0.22; P.sy += (1 - P.sy) * 0.22;
    if (P.slide && mt % 3 === 0) parts.push({ x: P.x + 20, y: GY - 1, vx: -1 - Math.random(), vy: -Math.random() * 0.5, life: 12, max: 12, c: "rgba(255,255,255,.7)", g: 0.02 });
  }
  function stompOn(o){
    P.vy = P.held ? JV : -4.4; P.airT = 0; P.dbl = false; P.ff = false; P.sx = 1.2; P.sy = 0.8;
    sfx.stomp(); freeze = 4; shake = 6; buzz(30); sparkle(o.x + o.w / 2, o.y, false);
    if (o.boss) { bossHit(); return; }
    o.gone = true; score += 150; addMeter(0.15); bump("stomps", true); floatText("+150", o.x + o.w / 2, o.y - 8);
  }
  function smash(o){
    if (o.boss) { o.gone = true; bossHit(); return; }
    o.gone = true; score += 50; sfx.smash(); shake = 4; burst(o.x + o.w / 2, o.y + o.h / 2, 12, [o.c || "#C79A5A", "#FFF6D6", "#F5C518"], 2.4, 1.6, 26); floatText("+50", o.x + o.w / 2, Math.max(40, o.y - 6));
  }
  function floatText(s, px, py){ parts.push({ txt: s, x: px, y: py, vx: 0, vy: -0.5, life: 34, max: 34, c: "#F5C518", g: 0 }); }
  function addMeter(v){
    if (strength > 0) return;
    meter = Math.min(1, meter + v);
    if (meter >= 1) { meter = 0; strength = 300; sfx.strength(); shake = 8; flash = 4; showToast("DAD STRENGTH! SMASH THROUGH EVERYTHING", "#FF4D6D"); say("Dad Strength! Nothing can hurt you for a few seconds."); bump("strength", true); buzz([30, 30, 60]); }
  }
  function update(){
    if (state === "paused" || state === "locked") return;
    if (mt % BEAT === 0) musicStep();
    mt++;
    if (shake > 0) shake--; if (flash > 0) flash--; if (trans > 0) trans--;
    for (const q of toasts) q.t--; toasts = toasts.filter(q => q.t > 0);
    for (const p of parts) { p.x += p.vx; p.y += p.vy; p.vy += p.g; p.life--; }
    parts = parts.filter(p => p.life > 0);
    if (state === "boot") { if (bootT && ++bootT > 70) setState("title", true); return; }
    if (state === "bonus") return updateBonus();
    if (state !== "play") return;
    rt = mt - roomStart;
    const r = room(); speed = curSpeed();
    dist += speed; score += speed * 0.05;
    if (power > 0) power--;
    if (strength > 0 && --strength === 0) { inv = Math.max(inv, 50); say("Dad Strength over."); }
    physics();
    if (rt >= 0) rec[rt >> 1] = 40 + clamp(Math.round(GY - 22 - P.y), 0, 90) + (P.slide ? 100 : 0);
    if (mode === "endless") genMore(rt / BEAT + 70);
    // bring in whatever is due: each thing appears so that it reaches Dad exactly on its beat
    if (!boss) for (const e of evs) {
      if (e.done) continue; const left = e.f - rt; if (left > 420) break;
      const dx = left * speed * (e.sp || 1);
      if (dx <= W + 34 - P.x) { e.done = true; if (dx > -20) spawnEv(e, P.x + 7 + dx); }
    }
    if (mode === "story" && r.boss && !boss && rt >= (roomBeats + 4) * BEAT && obs.length === 0) startBoss(r.boss);
    if (boss) updateBoss();
    for (const o of obs) o.x -= o.vx || speed * (o.sp || 1);
    for (const it of items) it.x -= speed;
    for (const s of scen) {
      s.x -= speed;
      if (!s.passed && s.x <= P.x + 7) {
        s.passed = true;
        if (s.t === "chair") { cp = { f: s.f, score, found: { ...found }, runItems, meter }; if (lives < maxLives) lives++; sfx.power(); sparkle(P.x + 7, GY - 26); showToast("CHECKPOINT: DAD'S CHAIR", "#AED581"); say("Checkpoint. Dad's chair."); saveMissions(); }
        else if (s.t === "door") return roomCleared();
        else if (s.t === "nydoor") return homeDone();
        else if (s.t === "flag") return dailyDone();
      }
    }
    for (const o of obs) if (!o.pass && o.x + o.w < P.x) {
      o.pass = true;
      if (o.k === "low" && P.air) bump("hops", false); else if (o.k === "high" && P.slide) bump("slides", true);
    }
    obs = obs.filter(o => o.x > -70 && !o.gone); items = items.filter(i => i.x > -20 && !i.got); scen = scen.filter(s => s.x > -60);
    const box = pbox();
    if (inv > 0) inv--;
    for (const o of obs) {
      if (o.gone || !hit(box, { x: o.x + 1, y: o.y + 1, w: o.w - 2, h: o.h - 1 })) continue;
      if (o.stomp && P.vy > 0.3 && box.y + box.h <= o.y + o.h * 0.7 + 4) { stompOn(o); continue; }
      if (strength > 0) { smash(o); continue; }
      if (inv > 0) continue;
      hitLog.push(o.t + (o.boss ? ":boss" : "") + "@" + rt);
      if (hurt()) return; break;
    }
    const grab = { x: box.x - 3, y: box.y - 3, w: box.w + 6, h: box.h + 6 };
    for (const it of items) if (!it.got && hit(grab, it)) {
      it.got = true;
      if (it.k === "mug") { power = 420; sfx.power(); sparkle(it.x + 4, it.y + 4); showToast("COFFEE! DOUBLE JUMP", "#FFF6D6"); say("Coffee! Double jump for a few seconds."); }
      else if (it.k === "heart") { lives = Math.min(maxLives, lives + 1); sfx.power(); sparkle(it.x + 4, it.y + 4); floatText("+1 ♥", it.x + 4, it.y - 8); }
      else if (it.k === "tape") {
        sfx.treasure(); sparkle(it.x + 4, it.y + 4, true); score += 300; bump("tapes", true);
        if (tapesOwned < TAPES.length) { tapesOwned++; store.set("robodad.dadquest.tapes", String(tapesOwned)); showToast("MIXTAPE: " + TAPES[tapesOwned - 1].name.toUpperCase() + " UNLOCKED!", "#7FD1FF"); say("Mixtape found: " + TAPES[tapesOwned - 1].name + ". Play it from the title screen."); }
        else floatText("+300", it.x + 4, it.y - 8);
      }
      else if (it.k === "treasure") {
        const T0 = TREASURES[it.ti]; score += 1000; sfx.treasure(); sparkle(it.x + 4, it.y + 4, true); buzz(40); freeze = 4;
        if (!treasureFound(it.ti)) { store.set("robodad.dadquest.treasure." + T0.id, "1"); showToast("POLAROID: " + T0.name.toUpperCase() + "!"); checkMissions(); }
        else showToast("+1000 " + T0.name.toUpperCase());
        say("Polaroid found: " + T0.name + ".");
      }
      else { found[it.k]++; runItems++; score += 100; sfx.item(); sparkle(it.x + 4, it.y + 4); addMeter(0.07); bump("items", false); if (it.k === "sock") bump("socks", false); if (runItems >= 30) unlockSkin("grill"); }
    }
    if (ghost && !passedGhost && ghost.reach < 1e9 && rt > ghost.rt) { passedGhost = true; showToast("PAST YOUR BEST!", "#7FD1FF"); }
    if (mt % 30 === 0) { runc.score = Math.floor(score); checkMissions(); }
  }
  function roomCleared(){
    saveGhost(true); if (roomHits === 0) { score += 300; bump("nohit", true); }
    if (level === 0 && !tutDone) { tutDone = true; store.set("robodad.dadquest.tut", "1"); }
    endRun();
    if (level >= ROOMS.length - 1) {
      store.set("robodad.dadquest.cleared", "1"); reached = ROOMS.length - 1; unlockSkin("track"); setState("win", true); makeShare();
      say("You found everything. You win!"); return;
    }
    if (level + 1 > reached) { reached = level + 1; store.set("robodad.dadquest.reached", String(reached)); }
    setState("level", true); say(ROOMS[level].name + " cleared. Next room, or try a bonus room.");
  }
  function homeDone(){
    endRun(); store.set("robodad.dadquest.home", "1"); sfx.power();
    setState("homeEnd", true); say("The door says NOT YET. Something still isn't ready.");
  }
  function dailyDone(){
    score += lives * 250; saveGhost(true); bump("daily", true); endRun();
    const s = Math.floor(score), d = today();
    if (!daily || daily.day !== d || s > daily.best) { daily = { day: d, best: s }; store.set("robodad.dadquest.daily", JSON.stringify(daily)); }
    sfx.win(); setState("dailyEnd", true); makeShare(); say("Daily Run finished. Score " + s + ".");
  }

  // ---------- bosses ----------
  function startBoss(kind){
    const B = BOSSES[kind];
    boss = { kind, name: B.name, hp: 3, x: W + 40, phase: "intro", tm: 100, i: 0, shots: 0, body: null, hurtT: 0 };
    cp = { f: (roomBeats + 4) * BEAT, score, found: { ...found }, runItems, meter, bossCp: true };
    sfx.warn(); say(`Boss! ${B.name}. Jump the low ones, slide under the high ones, then stomp it when it charges.`);
  }
  function bossHit(){
    const b = boss; if (!b || b.phase !== "dash") return;
    b.hp--; b.hurtT = 50; b.phase = "hurt"; b.tm = 50; if (b.body) { b.x = b.body.x; b.body.gone = true; b.body = null; }
    score += 250; shake = 12; freeze = 7; flash = 3; buzz([40, 30, 40]); sparkle(b.x + 14, GY - 16, true); floatText(b.hp > 0 ? "BONK! " + b.hp + " TO GO" : "BONK!", b.x + 14, GY - 40);
    bump("stomps", true); say(b.hp > 0 ? "Hit! " + b.hp + " to go." : b.name + " beaten!");
  }
  function updateBoss(){
    const b = boss, B = BOSSES[b.kind], home = W - 52, warnT = hard ? 60 : 78;
    if (b.hurtT > 0) b.hurtT--;
    if (b.phase === "intro") { b.x += (home - b.x) * 0.07; if (--b.tm <= 0) { b.phase = "warn"; b.tm = warnT; b.shots = 0; } return; }
    if (b.phase === "warn") { b.tm--; if (b.tm === 40 || b.tm === 20) sfx.warn(); if (b.tm <= 0) {
      const [hgt, sp, n] = B.shots[b.i % B.shots.length], m = hard ? 1 : 0.85;
      obs.push(bossShot(b.kind, hgt, sp * m)); if (n === 2) { const s2 = bossShot(b.kind, hgt, sp * m); s2.x += 80; obs.push(s2); }
      b.phase = "shot"; } return; }
    if (b.phase === "shot") { if (obs.every(o => o.x + o.w < P.x - 8)) { b.i++; if (++b.shots >= 2) { b.phase = "rev"; b.tm = 70; sfx.warn(); say("It's charging. Jump on it!"); } else { b.phase = "warn"; b.tm = warnT; } } return; }
    if (b.phase === "rev") { b.tm--; if (b.tm === 30) sfx.warn(); if (b.tm <= 0) { const [w, h] = B.dash; b.phase = "dash"; b.body = { t: "boss", k: "low", kind: b.kind, boss: true, stomp: true, x: b.x, y: GY - h, w, h, vx: hard ? 3.6 : 3.0 }; obs.push(b.body); } return; }
    if (b.phase === "dash") { if (b.body && b.body.x < -44) { b.body.gone = true; b.body = null; b.x = W + 40; b.phase = "back"; } return; }
    if (b.phase === "hurt") { b.x += (home - b.x) * 0.06; if (--b.tm <= 0) { if (b.hp <= 0) { b.phase = "dead"; b.tm = 90; sfx.win(); score += 500; sparkle(b.x + 14, GY - 30, true); shake = 10;
      if (b.kind === "roomba") { unlockSkin("mullet"); store.set("robodad.dadquest.bonus", "1"); } } else b.phase = "back"; } return; }
    if (b.phase === "back") { b.x += (home - b.x) * 0.1; if (Math.abs(home - b.x) < 1.5) { b.phase = "warn"; b.tm = warnT; b.shots = 0; } return; }
    if (b.phase === "dead") { if (b.tm % 12 === 0) sparkle(b.x + Math.random() * 28, GY - 10 - Math.random() * 30, false); if (--b.tm <= 0) { boss = null; roomCleared(); } }
  }

  // ---------- bonus room ----------
  function startBonus(kind, lang, after){
    obs = []; items = []; scen = []; parts = []; boss = null; power = 0; strength = 0; dist = 0; resetDad();
    if (after !== "next") { score = 0; maxLives = hard ? 3 : 5; lives = maxLives; }
    const qs = []; while (qs.length < 5) { const q = kind === "math" ? mathQ() : wordQ(lang); if (!qs.some(o => o.q === q.q)) qs.push(q); }
    bonus = { kind, lang, qs, i: 0, right: 0, phase: "ask", timer: 50, blocks: [], msg: "", after };
    speed = 1.8; setState("bonus", true);
    say((kind === "math" ? "Maths Room" : WORDS[lang].name + " Room") + ". Jump into the block with the right answer. " + qs[0].q);
  }
  function updateBonus(){
    const b = bonus; dist += speed; physics();
    for (const bl of b.blocks) bl.x -= speed;
    if (b.phase === "ask") {
      if (--b.timer <= 0) {
        b.blocks = b.qs[b.i].opts.map((o, j) => ({ label: o, x: W + 10 + j * 86, y: GY - 62, w: 46, h: 12, state: 0 }));
        b.phase = "run";
      }
    } else if (b.phase === "run") {
      const box = { x: P.x + 2, y: P.y + 1, w: 10, h: 21 };
      for (const bl of b.blocks) if (bl.state === 0 && hit(box, bl)) {
        const q = b.qs[b.i], ok = bl.label === q.a;
        P.vy = Math.max(P.vy, 1);                       // bonk
        for (const o of b.blocks) o.state = o.label === q.a ? 1 : (o === bl ? 2 : 3);
        if (ok) { b.right++; score += 200; sfx.item(); sparkle(bl.x + bl.w / 2, bl.y + 6, true); b.msg = "CORRECT! +200"; say("Correct!"); }
        else { sfx.wrong(); shake = 5; b.msg = "IT WAS " + q.a.toUpperCase(); say("Not quite. It was " + q.a + "."); }
        b.phase = "done"; b.timer = 90; break;
      }
      if (b.phase === "run" && b.blocks.every(bl => bl.x + bl.w < P.x)) { b.msg = "MISSED! IT WAS " + b.qs[b.i].a.toUpperCase(); b.phase = "done"; b.timer = 80; sfx.wrong(); say("Missed. It was " + b.qs[b.i].a + "."); }
    } else if (b.phase === "done") {
      if (--b.timer <= 0) {
        b.blocks = []; b.msg = ""; b.i++;
        if (b.i >= b.qs.length) { setState("bonusEnd"); if (b.right === 5) score += 500; sfx.win(); say(`Bonus done. ${b.right} out of 5.`); }
        else { b.phase = "ask"; b.timer = 50; say(b.qs[b.i].q); }
      }
    }
  }

  // ---------- share card (a 1080×1920 story image) ----------
  function makeShare(){
    shareBlob = null;
    try {
      const c = document.createElement("canvas"); c.width = 270; c.height = 480;
      const keep = x; x = c.getContext("2d"); x.imageSmoothingEnabled = false;
      const r = mode === "story" ? ROOMS[level] : room();
      R(0, 0, 270, 480, "#0B0B14"); R(0, 300, 270, 120, "#1D2742");
      for (let i = 0; i < 23; i++) R(i * 12, 420, 12, 60, i % 2 ? r.floorA : r.floorB);
      R(10, 10, 250, 2, "#F5C518"); R(10, 468, 250, 2, "#F5C518");
      text("DAD QUEST", 135, 36, 30, "#F5C518");
      text(mode === "daily" ? "DAILY RUN " + today() : "I scored", 135, 92, 12, "#9A93B8");
      text(String(Math.floor(twoP ? Math.max(...twoP.scores) : score)), 135, 112, 36, "#FFF6D6");
      text(`${found.key} keys · ${found.remote} remotes`, 135, 166, 10); text(`${found.sock} socks · ${found.specs} glasses`, 135, 182, 10);
      text("Polaroids " + treasureCount() + "/" + TREASURES.length, 135, 202, 10, "#7FD1FF");
      text("Can you beat me?", 135, 236, 14, "#FF4D6D");
      x.save(); x.translate(105, 300); x.scale(4, 4); drawDad(0, 7, 0, false, false); x.restore();
      [["key", 22, 380], ["remote", 56, 366], ["sock", 190, 380], ["specs", 222, 366]].forEach(([k, px, py]) => { x.save(); x.translate(px, py); x.scale(3, 3); ITEMS[k].draw(0, 0); x.restore(); });
      text("robodad.app", 135, 440, 14, "#0B0B14");
      x = keep;
      const big = document.createElement("canvas"); big.width = 1080; big.height = 1920;
      const bx = big.getContext("2d"); bx.imageSmoothingEnabled = false; bx.drawImage(c, 0, 0, 1080, 1920);
      big.toBlob((bl) => { shareBlob = bl; }, "image/png");
    } catch { x = main; }
  }
  async function share(){
    if (!shareBlob) { showToast("ONE SEC, DRAWING YOUR CARD…", "#FFF6D6"); return; }
    const file = new File([shareBlob], "dad-quest-score.png", { type: "image/png" });
    const msg = `I scored ${Math.floor(score)} in DAD QUEST on RoboDad${mode === "daily" ? " (today's Daily Run)" : ""}. Can you beat me? https://robodad.app`;
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text: msg }); return; }
    } catch (e) { if (e && e.name === "AbortError") return; }
    const a = document.createElement("a"); a.href = URL.createObjectURL(shareBlob); a.download = "dad-quest-score.png";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    showToast("SAVED! POST IT TO YOUR STORY", "#FFF6D6");
  }

  // ---------- draw ----------
  let crtCv = null;
  function crtOverlay(){
    if (!crtCv) {
      crtCv = document.createElement("canvas"); crtCv.width = W; crtCv.height = H; const c = crtCv.getContext("2d");
      c.fillStyle = "rgba(0,0,0,.13)"; for (let y = 0; y < H; y += 2) c.fillRect(0, y, W, 1);
      const g = c.createRadialGradient(W / 2, H / 2, H * 0.55, W / 2, H / 2, W * 0.72); g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, "rgba(0,0,0,.5)");
      c.fillStyle = g; c.fillRect(0, 0, W, H);
    }
    x.drawImage(crtCv, 0, 0);
  }
  function vhsStatic(k){                             // a worn-tape wipe between screens
    for (let i = 0; i < 3; i++) { const y = Math.floor(Math.random() * (H - 14)), h = 4 + Math.floor(Math.random() * 10), dx = Math.round((Math.random() - 0.5) * 30 * k); try { x.drawImage(cv, 0, y, W, h, dx, y, W, h); } catch {} }
    for (let i = 0; i < 26 * k; i++) R(Math.random() * W, Math.random() * H, 2 + Math.random() * 30, 1, `rgba(255,255,255,${0.1 + Math.random() * 0.35})`);
    R(0, (t * 7) % H, W, 5, "rgba(255,255,255,.12)");
  }
  function drawScen(s){
    const sx = Math.round(s.x);
    if (s.t === "chair") { R(sx - 12, GY - 20, 24, 20, "#8E3B46"); R(sx - 14, GY - 30, 8, 30, "#7A323C"); R(sx - 12, GY - 34, 22, 16, "#A04452"); R(sx + 8, GY - 22, 6, 22, "#7A323C"); R(sx - 9, GY - 30, 16, 1, "#C96A76"); R(sx - 10, GY - 2, 3, 2, "#3E2A1E"); R(sx + 8, GY - 2, 3, 2, "#3E2A1E");
      if (!s.passed) { text("DAD'S CHAIR", sx, GY - 46, 7, "#AED581"); R(sx - 1, GY - 39, 2, 3, "#AED581"); } }
    else if (s.t === "door") { R(sx - 12, GY - 50, 26, 50, "#3E2A1E"); R(sx - 9, GY - 47, 20, 47, "#FFF6D6"); x.fillStyle = "rgba(255,246,214,.12)"; x.beginPath(); x.arc(sx + 1, GY - 22, 40, 0, 7); x.fill(); text("NEXT ROOM", sx, GY - 60, 7, "#F5C518"); }
    else if (s.t === "nydoor") { R(sx - 12, GY - 50, 26, 50, "#3E2A1E"); R(sx - 9, GY - 47, 20, 47, "#8E8AA8"); R(sx - 9, GY - 47, 20, 3, "#6E6890"); R(sx + 6, GY - 24, 3, 3, "#F5C518");
      R(sx - 6, GY - 40, 14, 9, "#C0C0C8"); text("NOT YET", sx + 1, GY - 38, 5, "#2A2440", "center", true); text("THE DOOR", sx, GY - 60, 7, "#F5C518"); }
    else if (s.t === "flag") { R(sx, GY - 54, 2, 54, "#C0C0C8"); for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) R(sx + 2 + i * 5, GY - 54 + j * 5, 5, 5, (i + j) % 2 ? "#0B0B14" : "#FFFFFF"); text("FINISH", sx + 10, GY - 64, 7, "#F5C518"); }
  }
  function hud(){
    R(0, 0, W, 18, "rgba(11,11,20,.45)"); R(0, 18, W, 9, "rgba(11,11,20,.3)"); R(0, 27, W, 8, "rgba(11,11,20,.15)");
    for (let i = 0; i < maxLives; i++) drawHeart(8 + i * 10, 8, i < lives ? "#FF4D6D" : "#3A3560");
    let ix = 14 + maxLives * 10;
    const inB = state === "bonus" || (state === "paused" && pausedFrom === "bonus");
    if (inB) text("SCORE " + Math.floor(score), ix, 9, 7, "#F5C518", "left");
    else for (const k of ITEM_IDS) { ITEMS[k].draw(ix, 7); text(String(found[k]), ix + 11, 9, 7, "#FFF6D6", "left"); ix += 22; }
    text(String(Math.floor(score)).padStart(5, "0"), W - 8, 8, 10, "#F5C518", "right");
    R(W - 20, 22, 12, 11, "rgba(11,11,20,.6)"); R(W - 17, 24, 2, 7, "#FFF6D6"); R(W - 13, 24, 2, 7, "#FFF6D6");      // pause button
    if (inB) return;
    // Dad Strength meter
    const on = strength > 0, mw = 44;
    text(on ? "DAD STRENGTH!" : "DAD STRENGTH", 8, 20, 7, on ? ((t >> 2) % 2 ? "#FF4D6D" : "#F5C518") : "#9A93B8", "left");
    R(8, 27, mw, 4, "#3A3560"); R(8, 27, Math.round(mw * (on ? strength / 300 : meter)), 4, on ? "#FF4D6D" : "#F5C518"); R(8, 27, mw, 1, "rgba(255,255,255,.15)");
    if (power > 0) { drawMug(58, 23); R(69, 27, 30, 3, "#3A3560"); R(69, 27, Math.round(30 * power / 420), 3, "#FFF6D6"); }
    if (boss) {
      text(boss.name, W / 2, 20, 8, "#FF4D6D");
      for (let i = 0; i < 3; i++) R(W / 2 - 17 + i * 12, 28, 10, 4, i < boss.hp ? "#FF4D6D" : "#3A3560");
    } else if (mode !== "endless") {
      const r = room(), p = clamp(rt / ((roomBeats + 6) * BEAT), 0, 1);
      R(W / 2 - 40, 22, 80, 3, "#3A3560"); R(W / 2 - 40, 22, Math.round(80 * p), 3, "#F5C518");
      if (mode === "story" || mode === "home") R(W / 2, 21, 2, 5, cp ? "#AED581" : "#9A93B8");
      text(mode === "daily" ? "DAILY RUN" : r.name, W / 2, 28, 7, "#9A93B8");
    } else text(twoP ? "PLAYER " + twoP.turn + " · " + room().name : "ENDLESS · " + room().name, W / 2, 22, 7, "#F5C518");
  }
  function bossWarning(){
    const b = boss; if (!b) return;
    if (b.phase === "intro") { panelAt(70, 46, 180, 40); text("BOSS!", W / 2, 51, 12, "#FF4D6D"); text(b.name, W / 2, 68, 8, "#F5C518"); text("DODGE, THEN STOMP IT WHEN IT CHARGES", W / 2, 77, 7, "#9A93B8"); return; }
    if (b.phase === "warn") {
      const hgt = BOSSES[b.kind].shots[b.i % BOSSES[b.kind].shots.length][0], wy = hgt === "low" ? GY - 14 : GY - 34;
      if ((t >> 3) % 2) { R(W - 14, wy - 2, 10, 14, "#FF4D6D"); text("!", W - 9, wy + 1, 10, "#FFF6D6"); }
      text(hgt === "low" ? "JUMP!" : "SLIDE!", W - 18, wy + 3, 7, "#FF4D6D", "right");
    } else if (b.phase === "rev" || b.phase === "dash") {
      const bx = b.body ? b.body.x + b.body.w / 2 : b.x + 15;
      if ((t >> 2) % 2) { text("STOMP IT!", clamp(bx, 30, W - 30), GY - 46 - (b.kind === "ladder" && !b.body ? 14 : 0), 8, "#F5C518"); text("↓", clamp(bx, 30, W - 30), GY - 36 - (b.kind === "ladder" && !b.body ? 14 : 0), 8, "#F5C518"); }
    }
  }
  function panelAt(px, py, w, h){ R(px, py, w, h, "rgba(11,11,20,.92)"); R(px, py, w, 2, "#F5C518"); R(px, py + h - 2, w, 2, "#F5C518"); }
  function panel(h){ panelAt(24, (H - h) / 2, W - 48, h); }
  // buttons: rows of labelled boxes, built fresh every frame for the current screen
  function menu(list, y, cols = 1, w = 120, h = 12, gap = 3){
    const rows = Math.ceil(list.length / cols), base = btns.length;
    list.forEach((b, i) => {
      const r = Math.floor(i / cols), c = i % cols, inRow = Math.min(cols, list.length - r * cols);
      const bx = Math.round(W / 2 - (inRow * w + (inRow - 1) * gap) / 2 + c * (w + gap)), by = y + r * (h + gap);
      const on = base + i === sel;
      R(bx, by, w, h, on ? "#F5C518" : "rgba(58,53,96,.95)"); R(bx, by + h - 1, w, 1, "rgba(0,0,0,.35)");
      if (b.lock) R(bx, by, w, h, "rgba(11,11,20,.4)");
      text(b.label, bx + w / 2, by + Math.floor((h - 5) / 2), 7, on ? "#0B0B14" : (b.lock ? "#6E6890" : "#FFF6D6"), "center", on);
      btns.push({ x: bx, y: by, w, h, act: b.act });
    });
    return y + rows * (h + gap);
  }
  function drawDadAt(px, py, alpha){
    const sx = calm ? 1 : P.sx, sy = calm ? 1 : P.sy;
    x.save(); if (alpha < 1) x.globalAlpha = alpha;
    if (P.slide) drawDad(px, GY - 12, P.frame, true, false);
    else { x.translate(px + 7, py + 22); x.scale(sx, sy); drawDad(-7, -22, P.frame, false, P.air); }
    x.restore();
  }
  function draw(){
    t++;
    x.save();
    if (shake > 0 && !calm) x.translate(Math.round((Math.random() - 0.5) * shake * 0.4), Math.round((Math.random() - 0.5) * shake * 0.4));
    const idle = ["title", "locked", "boot", "skins", "bonusPick", "missions", "album", "rooms", "homeEnd"].includes(state);
    const inBonus = state === "bonus" || state === "bonusEnd" || (state === "paused" && pausedFrom === "bonus");
    const r = idle ? ROOMS[Math.floor(t / 900) % ROOMS.length] : inBonus ? STUDY_ROOM : room();
    const off = idle ? t * 0.6 : dist;
    r.deco(off); drawFloor(r, off);
    if (state === "boot") { x.restore(); bootScreen(); if (crt) crtOverlay(); return; }
    for (const s of scen) drawScen(s);
    if (ghost && ghost.reach < 1e9 && state === "play") { const fx = P.x + (ghost.rt - rt) * speed; if (fx > P.x - 20 && fx < W + 20) { R(fx, GY - 30, 1, 30, "#7FD1FF"); R(fx + 1, GY - 30, 12, 7, "rgba(127,209,255,.85)"); text("BEST", fx + 7, GY - 29, 7, "#0B0B14"); } }
    for (const it of items) {
      const by = it.y + Math.round(Math.sin((t + it.x) / 8));
      if (it.k === "mug") drawMug(it.x, by);
      else if (it.k === "heart") drawHeart(it.x, by, "#FF4D6D");
      else if (it.k === "tape") { if ((t >> 2) % 3) R(it.x - 3, by - 1, 14, 11, "rgba(127,209,255,.25)"); drawTape(it.x, by); }
      else if (it.k === "treasure") { if ((t >> 2) % 3) R(it.x - 3, by - 3, 14, 15, "rgba(245,197,24,.3)"); R(it.x - 2, by - 2, 12, 13, "#FFF6D6"); TREASURES[it.ti].draw(it.x, by); }
      else ITEMS[it.k].draw(it.x, by);
    }
    for (const o of obs) { if (o.k === "low" || o.boss) R(o.x + 1, GY, o.w - 2, 2, "rgba(0,0,0,.25)"); DRAW_OBS[o.t](o); }
    if (boss && !boss.body && !(boss.phase === "dead" && boss.tm < 50)) {
      const jit = boss.phase === "rev" ? Math.round(Math.sin(t * 1.6) * 2) : 0;
      drawBoss(boss.kind, boss.x + jit, boss.phase === "hurt" || boss.phase === "dead", boss.hurtT);
    }
    if (inBonus && bonus) for (const bl of bonus.blocks) {
      const c = bl.state === 1 ? "#27AE60" : bl.state === 2 ? "#E3342F" : bl.state === 3 ? "#3A3560" : "#F5C518";
      R(bl.x, bl.y, bl.w, bl.h, c); R(bl.x, bl.y + bl.h - 2, bl.w, 2, "rgba(0,0,0,.3)"); R(bl.x + 1, bl.y + 1, bl.w - 2, 1, "rgba(255,255,255,.35)");
      text(bl.label, bl.x + bl.w / 2, bl.y + 3, 7, bl.state === 0 ? "#0B0B14" : "#FFF6D6", "center", bl.state === 0);
    }
    const showDad = !["locked", "title", "skins", "missions", "album", "rooms", "bonusPick"].includes(state);
    if (showDad) {
      if (ghost && state === "play" && rt >= 0 && (rt >> 1) < ghost.d.length) {            // your best run, see-through
        const c = ghost.d.charCodeAt(rt >> 1) - 40, gs = c >= 100, gy = GY - 22 - (c % 100);
        const gx = P.x - 26;                                  // trails behind you, so it can never be mistaken for your hitbox
        x.globalAlpha = 0.22; if (gs) drawDad(gx, GY - 12, P.frame, true, false); else drawDad(gx, gy, P.frame, false, gy < GY - 22); x.globalAlpha = 1;
      }
      R(P.x + 2, GY, 10, 2, "rgba(0,0,0,.28)");
      if (strength > 0 && !calm) for (let i = 1; i <= 3; i++) drawDadAt(P.x - i * 7, P.y, 0.25 - i * 0.06);
      if (!(inv > 0 && strength <= 0 && Math.floor(inv / 5) % 2 === 0)) drawDadAt(P.x, P.y, 1);
      if (strength > 0 && (t >> 1) % 2) { R(P.x - 2, P.y - 4, 18, 1, "#F5C518"); R(P.x - 3, P.y + 8, 1, 8, "#FF4D6D"); R(P.x + 16, P.y + 4, 1, 8, "#FF4D6D"); }
      if (power > 0 && (t >> 2) % 2) R(P.x + 1, P.y - 3, 12, 1, "rgba(255,246,214,.6)");
    }
    if (state === "play" && !calm && (speed > 2.7 || strength > 0)) for (let i = 0; i < 6; i++) { const ly = 30 + ((i * 47 + t * 3) % 110); R(W - ((t * 9 + i * 71) % (W + 60)), ly, 18 + i * 3, 1, "rgba(255,255,255,.14)"); }
    for (const p of parts) { x.globalAlpha = Math.max(0, p.life / p.max); if (p.txt) text(p.txt, p.x, p.y, 7, p.c); else R(p.x, p.y, p.life > p.max / 2 ? 2 : 1, p.life > p.max / 2 ? 2 : 1, p.c); }
    x.globalAlpha = 1;
    if (state === "play") coach();
    if (state === "play" || state === "bonus" || state === "paused") hud();
    if (state === "play") bossWarning();
    if (boss && boss.phase === "dead") { panelAt(70, 50, 180, 36); text(boss.name, W / 2, 56, 8, "#9A93B8"); text("BEATEN! +500", W / 2, 68, 10, "#F5C518"); }
    if (inBonus && bonus && (state === "bonus" || state === "paused")) {
      const q = bonus.qs[Math.min(bonus.i, 4)];
      panelAt(60, 36, 200, 46);
      text(`${bonus.kind === "math" ? "MATHS" : WORDS[bonus.lang].name.toUpperCase()} ROOM · ${Math.min(bonus.i + 1, 5)}/5`, W / 2, 41, 7, "#9A93B8");
      text(q.q, W / 2, 51, 9, "#FFF6D6");
      if (bonus.msg) text(bonus.msg, W / 2, 68, 8, bonus.msg.startsWith("CORRECT") ? "#27AE60" : "#FF8A65");
      else text("JUMP INTO THE RIGHT ANSWER", W / 2, 68, 7, "#9A93B8");
    }
    if (flash > 0) R(0, 0, W, H, strength > 0 ? "rgba(245,197,24,.14)" : "rgba(255,77,109,.14)");
    x.restore();
    btns = [];
    screens();
    if (sel >= btns.length) sel = 0;
    if (toasts.length) { const q = toasts[0], a = Math.min(1, q.t / 20, (150 - q.t) / 8 + 0.2); x.globalAlpha = clamp(a, 0, 1); panelAt(30, H - 26, W - 60, 16); text(q.msg, W / 2, H - 21, 7, q.c); x.globalAlpha = 1; }
    if (trans > 0) vhsStatic(trans / 16);
    if (crt) crtOverlay();
  }
  // first-time coaching: what to press, shown over the thing you need to dodge
  function coach(){
    if (rt < 150 && !boss) {
      const a = clamp((150 - rt) / 40, 0, 1); x.globalAlpha = a;
      R(0, GY + 12, Math.round(W * 0.38), 18, "rgba(127,209,255,.12)"); R(Math.round(W * 0.38) + 1, GY + 12, W, 18, "rgba(245,197,24,.12)");
      text(touchSeen ? "HOLD HERE: SLIDE" : "↓ : SLIDE", W * 0.19, GY + 18, 7, "#7FD1FF"); text(touchSeen ? "TAP HERE: JUMP · HOLD: HIGHER" : "SPACE: JUMP · HOLD: HIGHER", W * 0.69, GY + 18, 7, "#F5C518");
      x.globalAlpha = 1;
    }
    if (tutDone || mode !== "story" || level !== 0) return;
    const o = obs.find(q => q.x + q.w > P.x && q.x < P.x + 150);
    if (!o) return;
    const hi = o.k === "high", cx = clamp(o.x + o.w / 2, 30, W - 30);
    if ((t >> 3) % 2) text(hi ? "SLIDE ↓" : o.stomp ? "STOMP IT ↓" : "JUMP ↑", cx, hi ? HBOT + 3 : o.y - 22, 7, hi ? "#7FD1FF" : "#F5C518");
  }
  function bootScreen(){
    R(0, 0, W, H, "#0B0B14");
    const k = bootT, cy = 58 + (k ? Math.round(Math.sin(k * 1.3) * Math.max(0, 6 - k / 4)) : Math.round(Math.sin(t / 20) * 2));
    R(W / 2 - 46, cy, 92, 50, "#8A8F99"); R(W / 2 - 46, cy, 92, 3, "#C0C0C8"); R(W / 2 - 46, cy + 47, 92, 3, "#62666E"); R(W / 2 - 46, cy, 3, 50, "#A5AAB3");
    R(W / 2 - 40, cy + 6, 80, 28, "#0B0B14"); R(W / 2 - 38, cy + 8, 76, 24, "#1D2742"); text("DAD QUEST", W / 2, cy + 11, 10, "#F5C518"); text("ROBODAD GAMES 1986", W / 2, cy + 25, 6, "#9A93B8");
    for (let i = 0; i < 12; i++) R(W / 2 - 35 + i * 6, cy + 39, 4, 11, i % 2 ? "#F5C518" : "#C99A0C");
    for (const p of parts) { x.globalAlpha = Math.max(0, p.life / p.max); R(p.x, p.y, 2, 2, p.c); } x.globalAlpha = 1;
    if (!k) { text("BLOW ON THE CARTRIDGE", W / 2, 26, 10, "#FFF6D6"); if ((t >> 4) % 2) text(touchSeen ? "TAP TO BLOW" : "TAP OR PRESS SPACE", W / 2, 124, 7, "#F5C518"); text("WORKS EVERY TIME. NOBODY KNOWS WHY.", W / 2, 140, 7, "#9A93B8"); }
    else if (k < 40) { text("PFFFFFT!", W / 2, 26, 10, "#FFF6D6"); if (!calm && k > 16) vhsStatic((k - 16) / 24); }
    else { if (!calm) vhsStatic(1 - (k - 40) / 30); text("ROBODAD GAMES PRESENTS", W / 2, 26, 10, "#F5C518"); }
  }
  function polaroid(px, py, i, on){
    const f = treasureFound(i);
    R(px, py, 30, 34, on ? "#FFFFFF" : "#D9D2C3"); R(px + 3, py + 3, 24, 20, f ? "#1D2742" : "#3A3560");
    if (f) { x.save(); x.translate(px + 7, py + 5); x.scale(2, 2); TREASURES[i].draw(0, 0); x.restore(); } else text("?", px + 15, py + 8, 10, "#6E6890");
    text(["KITCHEN", "LIVING", "GARAGE", "YARD", "ROAD", "ARCADE", "ATTIC"][i], px + 15, py + 26, 6, "#3E2A1E", "center", true);
    if (on) { R(px - 1, py - 1, 32, 1, "#F5C518"); R(px - 1, py + 34, 32, 1, "#F5C518"); R(px - 1, py, 1, 34, "#F5C518"); R(px + 30, py, 1, 34, "#F5C518"); }
  }
  function screens(){
    if (state === "locked") {
      panel(96);
      text("DAD QUEST", W / 2, 50, 18, "#F5C518");
      wrapText("This cartridge is still lost. Find it in RoboDad's secret hunt, The Lost Cartridge, to play.", W / 2, 76, 230, 8, "#FFF6D6", 9);
      text("HINT: TRY THE SECRET CODE BOX IN THE MENU.", W / 2, 112, 7, "#9A93B8");
    } else if (state === "title" && homeOnly) {
      panel(110);
      text("DAD QUEST", W / 2, 38, 18, "#F5C518");
      text("LEVEL 1 IS OPEN. THE REST OF THE CARTRIDGE IS STILL LOST.", W / 2, 58, 6, "#9A93B8");
      menu([{ label: store.get("robodad.dadquest.home") === "1" ? "LEVEL 1: HOME ✓" : "LEVEL 1: HOME", act: () => { twoP = null; start(0, "home"); } }], 72, 1, 150, 12, 3);
      text(touchSeen ? "TAP RIGHT: JUMP · HOLD LEFT: SLIDE" : "SPACE: JUMP · ↓: SLIDE · P: PAUSE", W / 2, 120, 7, "#9A93B8");
    } else if (state === "homeEnd") {
      panel(110);
      text("LEVEL 1: HOME", W / 2, 38, 14, "#F5C518");
      text("YOU MADE IT TO THE DOOR.", W / 2, 58, 8, "#FFF6D6");
      text("IT SAYS NOT YET.", W / 2, 72, 8, "#FF4D6D");
      menu([{ label: "RUN IT AGAIN", act: () => start(0, "home") }, { label: "MENU", act: () => setState("title") }], 88, 2, 76, 12, 3);
    } else if (state === "title") {
      panel(172);
      text("DAD QUEST", W / 2, 10, 20, "#F5C518");
      text("FIND EVERYTHING DAD LOST", W / 2, 29, 7, "#9A93B8");
      const bonusOpen = store.get("robodad.dadquest.skin.mullet") === "1" || store.get("robodad.dadquest.bonus") === "1";
      const dDone = daily && daily.day === today();
      menu([
        { label: reached > 0 ? "START · PICK A ROOM" : "START", act: () => { twoP = null; if (reached > 0) setState("rooms"); else start(0); } },
        { label: dDone ? "DAILY RUN · BEST " + daily.best : "DAILY RUN · NEW TODAY", act: () => { twoP = null; start(0, "daily"); } },
        ...(homeOpen() ? [{ label: store.get("robodad.dadquest.home") === "1" ? "LEVEL 1: HOME ✓" : "LEVEL 1: HOME", act: () => { twoP = null; start(0, "home"); } }] : []),
        { label: "2 PLAYERS", act: () => { twoP = { turn: 1, scores: [0, 0], seed: (Math.random() * 4294967296) >>> 0 }; start(0, "endless"); } },
        { label: "DAD: " + SKINS[skin].name.toUpperCase(), act: () => setState("skins") },
        { label: `MISSIONS ${mdone.length}/${MISSIONS.length}`, act: () => setState("missions") },
        { label: `PHOTO ALBUM ${treasureCount()}/${TREASURES.length}`, act: () => { albumSel = 0; setState("album"); } },
        { label: "TAPE: " + TAPES[tape].name.toUpperCase(), act: () => { if (tapesOwned < 2) showToast("FIND MIXTAPES IN THE ROOMS TO GET MORE MUSIC", "#FFF6D6"); else { tape = (tape + 1) % tapesOwned; store.set("robodad.dadquest.tape", String(tape)); } } },
        { label: bonusOpen ? "BONUS ROOMS" : "BONUS ROOMS 🔒", lock: !bonusOpen, act: () => bonusOpen ? setState("bonusPick") : showToast("BEAT THE ROGUE ROOMBA TO OPEN BONUS ROOMS", "#FFF6D6") },
        { label: hard ? "DAD MODE: HARD" : "DAD MODE: CHILL", act: () => { hard = !hard; store.set("robodad.dadquest.hard", hard ? "1" : "0"); showToast(hard ? "HARD: 3 HEARTS, FASTER, TIGHTER" : "CHILL: 5 HEARTS, MORE ROOM TO BREATHE", "#FFF6D6"); } },
        { label: "CRT SCREEN: " + (crt ? "ON" : "OFF"), act: () => { crt = !crt; store.set("robodad.dadquest.crt", crt ? "1" : "0"); } },
      ], 39, 2, 124, 12, 3);
      text(`BEST ${best}  ·  TAPES ${tapesOwned}/${TAPES.length}`, W / 2, 118, 7, "#9A93B8");
      const m = activeMissions()[0];
      text(m ? `NEXT MISSION: ${m.label} (${Math.min(mval(m), m.n)}/${m.n})` : "EVERY MISSION DONE. LEGEND.", W / 2, 129, 7, "#7FD1FF");
      text(touchSeen ? "TAP RIGHT: JUMP · HOLD LEFT: SLIDE" : "SPACE: JUMP · ↓: SLIDE · P: PAUSE", W / 2, 140, 7, "#9A93B8");
      text("P.S. DID YOU TEXT YOUR PARENT BACK?", W / 2, 152, 7, "#9A93B8");
      text("NO ADS · NO PURCHASES · NO STREAKS", W / 2, 163, 6, "#6E6890");
    } else if (state === "rooms") {
      panel(150);
      text("PICK A ROOM", W / 2, 22, 12, "#F5C518");
      text("EACH ROOM IS ALWAYS THE SAME, SO YOU CAN LEARN IT", W / 2, 38, 7, "#9A93B8");
      const list = ROOMS.map((r, i) => ({ label: i <= reached ? `${i + 1}. ${r.name.toUpperCase()}${treasureFound(i) ? " ✓" : ""}` : `${i + 1}. 🔒`, lock: i > reached, act: () => i <= reached ? start(i) : showToast("CLEAR THE ROOM BEFORE IT FIRST", "#FFF6D6") }));
      list.push({ label: "BACK", act: () => setState("title") });
      menu(list, 50, 2, 124, 12, 3);
      text("✓ = POLAROID FOUND · THE BLUE GHOST IS YOUR BEST RUN", W / 2, 116, 7, "#9A93B8");
    } else if (state === "skins") {
      panel(150);
      text("PICK YOUR DAD", W / 2, 22, 12, "#F5C518");
      SKIN_IDS.forEach((id, i) => {
        const px = 40 + i * 45, own = skinOwned(id);
        R(px - 8, 42, 30, 40, id === skin ? "rgba(245,197,24,.25)" : "rgba(58,53,96,.6)");
        if (own) drawDad(px, 54, (t >> 3) % 6, false, false, id);
        else { R(px + 2, 56, 10, 12, "#3A3560"); text("?", px + 7, 59, 8, "#9A93B8"); }
      });
      menu(SKIN_IDS.map(id => ({ label: skinOwned(id) ? (id === skin ? "✓ " : "") + SKINS[id].name.split(" ")[0].toUpperCase() : "🔒", lock: !skinOwned(id),
        act: () => { if (skinOwned(id)) { skin = id; store.set("robodad.dadquest.skin", id); } else showToast(SKINS[id].how.toUpperCase(), "#FFF6D6"); } })), 88, 6, 42, 12, 3);
      const hov = SKIN_IDS[sel] ? SKINS[SKIN_IDS[sel]] : null;
      if (hov) text(skinOwned(SKIN_IDS[sel]) ? hov.name : "TO UNLOCK: " + hov.how, W / 2, 108, 7, "#9A93B8");
      menu([{ label: "BACK", act: () => setState("title") }], 122, 1, 80);
    } else if (state === "missions") {
      panel(156);
      text("MISSIONS", W / 2, 19, 12, "#F5C518");
      text(`${mdone.length} OF ${MISSIONS.length} DONE · 3 UNLOCKS SOCKS & SANDALS · 7 UNLOCKS ARCADE DAD`, W / 2, 34, 6, "#9A93B8");
      const act = activeMissions();
      act.forEach((m, i) => { const y = 46 + i * 24, v = Math.min(mval(m), m.n);
        R(40, y, 240, 20, "rgba(58,53,96,.7)"); text(m.label, 46, y + 3, 7, "#FFF6D6", "left"); text(`${v}/${m.n}`, 274, y + 3, 7, "#F5C518", "right");
        R(46, y + 12, 228, 4, "#1D1A33"); R(46, y + 12, Math.round(228 * v / m.n), 4, "#7FD1FF"); });
      if (!act.length) text("ALL DONE. GO TOUCH GRASS, CHAMP.", W / 2, 72, 8, "#AED581");
      menu([{ label: "BACK", act: () => setState("title") }], 126, 1, 80);
      text("\"IN ONE RUN\" MISSIONS START OVER EACH RUN", W / 2, 146, 6, "#6E6890");
    } else if (state === "album") {
      panel(164);
      text("PHOTO ALBUM", W / 2, 14, 12, "#F5C518");
      TREASURES.forEach((_, i) => polaroid(41 + i * 35, 32, i, i === albumSel));
      const T0 = TREASURES[albumSel], f = treasureFound(albumSel);
      text(f ? T0.name.toUpperCase() : "NOT FOUND YET", W / 2, 76, 8, f ? "#FFF6D6" : "#9A93B8");
      wrapText(f ? "“" + T0.cap + "”" : "It's floating high up in the " + ROOMS[albumSel].name + ", past Dad's chair. Hold the jump.", W / 2, 88, 236, 7, f ? "#F5C518" : "#9A93B8", 9);
      menu([{ label: "←", act: () => { albumSel = (albumSel + TREASURES.length - 1) % TREASURES.length; } }, { label: "NEXT PHOTO", act: () => { albumSel = (albumSel + 1) % TREASURES.length; } }, { label: "BACK", act: () => setState("title") }], 116, 3, 76);
      text("ONE PHOTO IN EVERY ROOM. EVERY ONE IS A MEMORY.", W / 2, 138, 7, "#9A93B8");
    } else if (state === "bonusPick") {
      panel(120);
      text("BONUS ROOMS", W / 2, 38, 12, "#F5C518");
      text("JUMP INTO THE BLOCK WITH THE RIGHT ANSWER", W / 2, 54, 7, "#9A93B8");
      menu([
        { label: "MATHS ROOM", act: () => startBonus("math", null, "title") },
        { label: "FRENCH ROOM", act: () => startBonus("word", "fr", "title") },
        { label: "HINDI ROOM", act: () => startBonus("word", "hi", "title") },
        { label: "BACK", act: () => setState("title") },
      ], 66, 1, 120, 12, 3);
    } else if (state === "level") {
      panel(118);
      text(ROOMS[level].name.toUpperCase() + " CLEARED!", W / 2, 38, 12, "#F5C518");
      text(roomHits === 0 ? "NOT A SCRATCH! +300" : "NEXT: THE " + ROOMS[level + 1].name.toUpperCase(), W / 2, 56, 8, roomHits === 0 ? "#AED581" : "#FFF6D6");
      text(treasureFound(level) ? "POLAROID FOUND ✓" : "THIS ROOM'S POLAROID IS STILL HIDING", W / 2, 68, 7, "#7FD1FF");
      const offer = level === 0 ? { label: "MATHS BONUS ROOM", act: () => startBonus("math", null, "next") }
        : { label: (lastLang === "fr" ? "HINDI" : "FRENCH") + " BONUS ROOM", act: () => { lastLang = lastLang === "fr" ? "hi" : "fr"; startBonus("word", lastLang, "next"); } };
      const list = [{ label: "NEXT ROOM: " + ROOMS[level + 1].name.toUpperCase(), act: () => start(level + 1, "story", true) }];
      if (store.get("robodad.dadquest.bonus") === "1") list.push(offer);
      list.push({ label: "MENU", act: () => setState("title") });
      menu(list, 80, 1, 150, 12, 3);
      text("SCORE " + Math.floor(score), W / 2, 130, 7, "#9A93B8");
    } else if (state === "bonusEnd") {
      panel(124);
      const b = bonus, L = b.kind === "math" ? "math" : WORDS[b.lang].link;
      text("BONUS ROOM DONE", W / 2, 34, 12, "#F5C518");
      text(`${b.right} / 5 RIGHT${b.right === 5 ? "  ·  PERFECT +500" : ""}`, W / 2, 52, 9, b.right >= 4 ? "#27AE60" : "#FFF6D6");
      text(b.right >= 4 ? "LOOK AT YOU. SMARTER THAN YOUR OLD MAN." : "PRACTICE MAKES BETTER. NOT PERFECT. BETTER.", W / 2, 68, 7, "#9A93B8");
      menu([
        { label: b.after === "next" ? "NEXT ROOM" : "MENU", act: () => { if (b.after === "next") start(level + 1, "story", true); else setState("title"); } },
        { label: b.kind === "math" ? "PRACTISE MATHS WITH DAD" : "LEARN MORE " + WORDS[b.lang].name.toUpperCase(), act: () => { location.href = "/?learn=" + L; } },
      ], 82, 1, 160, 12, 4);
    } else if (state === "over") {
      panel(fact ? 152 : 126);
      const top = fact ? 19 : 32;
      text("GAME OVER", W / 2, top, 14, "#FF4D6D");
      let y = wrapText("“" + joke + "”", W / 2, top + 21, 240, 7, "#FFF6D6", 8);
      if (fact) { R(50, y + 1, W - 100, 1, "#3A3560"); text("DAD FACT", W / 2, y + 5, 7, "#F5C518"); y = wrapText(fact.f, W / 2, y + 14, 236, 7, "#FFF6D6", 8); }
      text("SCORE " + Math.floor(score) + "  ·  BEST " + best, W / 2, y + 3, 8, "#F5C518");
      const list = [{ label: (mode === "story" || mode === "home") && cp ? (cp.bossCp ? "AGAIN: BOSS" : "AGAIN: CHAIR") : "AGAIN", act: retry }, { label: "SHARE", act: share }];
      if (fact) list.push({ label: "ASK DAD", act: () => { location.href = "/?ask=" + encodeURIComponent(fact.ask); } });
      list.push({ label: "MENU", act: () => setState("title") });
      menu(list, y + 14, list.length, 62, 12, 3);
      const m = activeMissions()[0];
      text(touchSeen ? "TAP ANYWHERE TO GO AGAIN" : "SPACE TO GO AGAIN", W / 2, y + 31, 7, (t >> 4) % 2 ? "#FFF6D6" : "#9A93B8");
      if (m && !fact) text(`MISSION: ${m.label} (${Math.min(mval(m), m.n)}/${m.n})`, W / 2, y + 41, 6, "#7FD1FF");
    } else if (state === "dailyEnd") {
      panel(124);
      text("DAILY RUN DONE!", W / 2, 34, 12, "#F5C518");
      text(today() + "  ·  " + lives + " HEARTS LEFT (+" + lives * 250 + ")", W / 2, 52, 7, "#9A93B8");
      text("SCORE " + Math.floor(score), W / 2, 64, 10, "#FFF6D6");
      text("TODAY'S BEST " + (daily ? daily.best : 0) + " · EVERYONE GETS THIS SAME RUN TODAY", W / 2, 82, 6, "#7FD1FF");
      menu([{ label: "RUN IT AGAIN", act: () => start(0, "daily") }, { label: "SHARE", act: share }, { label: "MENU", act: () => setState("title") }], 96, 3, 76);
      text("NEW RUN TOMORROW. NO STREAKS, NO PRESSURE.", W / 2, 118, 7, "#9A93B8");
    } else if (state === "win") {
      panel(134);
      text("YOU FOUND EVERYTHING!", W / 2, 30, 12, "#F5C518");
      text(`${found.key} KEYS · ${found.remote} REMOTES · ${found.sock} SOCKS · ${found.specs} GLASSES`, W / 2, 50, 7);
      text("POLAROIDS: " + treasureCount() + "/" + TREASURES.length, W / 2, 61, 7, "#7FD1FF");
      wrapText("Dad can finally sit down. Then he'll lose the remote again.", W / 2, 74, 230, 7, "#FFF6D6", 8);
      text("SCORE " + Math.floor(score), W / 2, 96, 8, "#F5C518");
      menu([{ label: "ENDLESS", act: () => start(0, "endless") }, { label: "SHARE", act: share }, { label: "MENU", act: () => setState("title") }], 112, 3, 76);
    } else if (state === "paused") {
      panel(128); text("PAUSED", W / 2, 32, 12, "#F5C518");
      menu([
        { label: "RESUME", act: () => setState(pausedFrom) },
        { label: "RESTART", act: () => { if (pausedFrom === "bonus") startBonus(bonus.kind, bonus.lang, bonus.after); else start(mode === "story" ? level : 0, mode, false); } },
        { label: "QUIT TO MENU", act: () => { twoP = null; boss = null; setState("title"); } },
      ], 50, 1, 110, 12, 3);
      activeMissions().forEach((m, i) => text(`${m.label} (${Math.min(mval(m), m.n)}/${m.n})`, W / 2, 100 + i * 9, 6, "#7FD1FF"));
    } else if (state === "pass") {
      panel(100);
      text("PLAYER 1: " + twoP.scores[0], W / 2, 50, 12, "#F5C518");
      text("PASS THE PHONE TO PLAYER 2", W / 2, 72, 8);
      text("SAME RUN FOR BOTH OF YOU. NO EXCUSES.", W / 2, 86, 7, "#9A93B8");
      menu([{ label: "PLAYER 2, GO!", act: () => { twoP.turn = 2; start(0, "endless"); } }], 100, 1, 120);
    } else if (state === "versus") {
      panel(124);
      const [a, b] = twoP.scores, win = a === b ? 0 : a > b ? 1 : 2;
      text(win ? `PLAYER ${win} WINS!` : "IT'S A TIE!", W / 2, 36, 14, "#F5C518");
      text(`PLAYER 1: ${a}`, W / 2 - 50, 60, 8, win === 1 ? "#27AE60" : "#FFF6D6"); text(`PLAYER 2: ${b}`, W / 2 + 50, 60, 8, win === 2 ? "#27AE60" : "#FFF6D6");
      wrapText(win ? "Winner picks what's for dinner. Loser does the dishes. Those are the rules." : "A tie! Settle it the dad way: rock, paper, scissors.", W / 2, 74, 236, 7, "#9A93B8", 8);
      menu([{ label: "REMATCH", act: () => { twoP = { turn: 1, scores: [0, 0], seed: (Math.random() * 4294967296) >>> 0 }; start(0, "endless"); } }, { label: "MENU", act: () => { twoP = null; setState("title"); } }], 102, 2, 80);
    }
  }
  let lastLang = Math.random() < 0.5 ? "fr" : "hi";
  let hitLog = [];

  // test hook, only when a tester switches it on in this browser
  let held = false;
  if (store.get("robodad.dadquest.debug") === "1") window.__DQ = {
    s: () => ({ state, mode, level, rt, lives, maxLives, score: Math.floor(score), boss: boss && boss.phase, hp: boss && boss.hp, bonus: bonus && bonus.i, right: bonus && bonus.right, sel, nbtn: btns.length, power, strength, meter, skin, hits: roomHits, speed, y: P.y, vy: P.vy, air: P.air, slide: P.slide, cp: !!cp, mdone: mdone.length, tapes: tapesOwned }),
    obs: () => obs.map(o => ({ t: o.t, k: o.k, x: o.x, y: o.y, w: o.w, h: o.h, v: o.vx || speed * (o.sp || 1), stomp: !!o.stomp, boss: !!o.boss })),
    btns: () => btns.map((b, i) => i), act: (i) => { shownAt = -99; activate(i); }, start, retry,
    press: pressJump, release: releaseJump, slide: (on) => on ? slideOn() : slideOff(), blow,
    hold: (on) => { held = on; }, step: (n, bot) => { for (let i = 0; i < n; i++) { if (bot) bot(); if (freeze > 0) freeze--; else update(); } },
    go: (f) => { for (const e of evs) e.done = e.f <= f + 72; obs = []; items = []; snapStart(f); }, god: () => { lives = 99; }, mug: () => { power = 420; }, full: () => addMeter(1),
    hitLog: () => hitLog.splice(0),
    evs: () => evs.map(e => ({ k: e.k, t: e.t, f: e.f })), draw: () => draw(),
    blocks: () => bonus ? bonus.blocks.map(b => ({ l: b.label, x: Math.round(b.x) })) : [], answer: () => bonus && bonus.qs[bonus.i] && bonus.qs[bonus.i].a, dad: () => ({ x: P.x, y: P.y }),
  };

  // fixed 60 updates per second, whatever the screen's refresh rate; a hit freezes everything for a beat
  let last = performance.now(), acc = 0;
  function loop(now){
    acc += Math.min(100, now - last); last = now;
    while (acc >= 1000 / 60) { if (!held) { if (freeze > 0) freeze--; else update(); } acc -= 1000 / 60; }
    draw(); requestAnimationFrame(loop);
  }
  say(unlocked ? "DAD QUEST. Press Space or tap to blow on the cartridge and start." : "DAD QUEST is locked. Find the cartridge in the secret hunt.");
  requestAnimationFrame(loop);
})();
