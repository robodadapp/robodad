/* Garage Stack: a one-tap stacking game for the RoboDad Mall Arcade.
   A shelf slides back and forth. Drop it on the stack: whatever hangs over is cut
   off, a perfect drop keeps its full width, and three perfect drops in a row grow it back.
   Tickets are paid through RoboArcade (see arcade.js) when a run ends. */
(function(){
  "use strict";
  const W = 300, H = 400, BH = 16, START_W = 130, MAX_W = 170, PERFECT = 4, GROUND = H - 36;
  const cv = document.getElementById("game"), cx = cv.getContext("2d");
  const live = document.getElementById("live"), dropBtn = document.getElementById("dropBtn"), muteBtn = document.getElementById("muteBtn");
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  };
  const calm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const COLORS = ["#F2B533", "#4C80B8", "#E07A66", "#5FBF93", "#A06BFF"];
  const LINES = { 3: "Dad: Level so far.", 8: "Dad: That shelf could hold the paint cans.", 15: "Dad: Do not tell your mother how high this is.", 25: "Dad: I am calling the neighbours to look.", 40: "Dad: This is no longer a shelf. This is architecture." };

  let state = "ready", blocks, cur, dir, layers, combo, best, falling, cam, banner, bannerT, overAt, earned, flash, shake;
  best = parseInt(store.get("robodad.stack.best") || "0", 10) || 0;
  let muted = store.get("robodad.stack.mute") === "1";

  // ---------- sound: tiny beeps, off with the button ----------
  let ac = null;
  function beep(freq, ms, type, vol) {
    if (muted) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type || "square"; o.frequency.value = freq; g.gain.value = vol || 0.05;
      o.connect(g); g.connect(ac.destination);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + ms / 1000);
      o.start(); o.stop(ac.currentTime + ms / 1000);
    } catch {}
  }
  const showMute = () => { muteBtn.textContent = "Sound: " + (muted ? "off" : "on"); muteBtn.setAttribute("aria-pressed", muted ? "true" : "false"); };
  muteBtn.addEventListener("click", () => { muted = !muted; store.set("robodad.stack.mute", muted ? "1" : "0"); showMute(); });
  showMute();

  // ---------- game ----------
  function reset() {
    blocks = [{ x: (W - START_W) / 2, w: START_W }];
    layers = 0; combo = 0; falling = []; cam = 0; banner = ""; bannerT = 0; flash = 0; shake = 0; earned = 0;
    spawn();
    state = "play";
  }
  function spawn() {
    const top = blocks[blocks.length - 1];
    dir = layers % 2 ? -1 : 1;
    cur = { w: top.w, x: dir > 0 ? 0 : W - top.w };
  }
  const speed = () => Math.min(0.095 + layers * 0.0026, 0.3);   // pixels per millisecond

  function drop() {
    if (state === "ready") { reset(); return; }
    if (state === "over") { if (performance.now() - overAt > 700) reset(); return; }
    const top = blocks[blocks.length - 1];
    const left = Math.max(cur.x, top.x), right = Math.min(cur.x + cur.w, top.x + top.w), ow = right - left;
    if (ow <= 0) { falling.push({ x: cur.x, w: cur.w, y: GROUND - (layers + 2) * BH, vy: 0, c: COLORS[(layers + 1) % COLORS.length] }); return finish(); }
    let nb;
    if (Math.abs(cur.x - top.x) <= PERFECT) {
      combo++;
      nb = { x: top.x, w: top.w };
      if (combo >= 3 && nb.w < MAX_W) { const g = Math.min(8, MAX_W - nb.w); nb.x -= g / 2; nb.w += g; }
      flash = 1; beep(660 + combo * 60, 120, "triangle", 0.07);
    } else {
      combo = 0;
      nb = { x: left, w: ow };
      const cutX = cur.x < top.x ? cur.x : right, cutW = cur.w - ow;
      falling.push({ x: cutX, w: cutW, y: GROUND - (layers + 2) * BH, vy: 0, c: COLORS[(layers + 1) % COLORS.length] });
      beep(300 + Math.min(layers, 30) * 6, 70, "square", 0.05);
      if (!calm) shake = 4;
    }
    blocks.push(nb); layers++;
    live.textContent = "Layer " + layers + (combo >= 1 ? ", perfect drop" : "");
    if (LINES[layers]) { banner = LINES[layers]; bannerT = 2200; live.textContent += ". " + banner; }
    spawn();
  }
  function finish() {
    state = "over"; overAt = performance.now();
    const newBest = layers > best;
    if (newBest) { best = layers; store.set("robodad.stack.best", String(best)); }
    earned = window.RoboArcade ? RoboArcade.award("stack", { points: layers }) : 0;
    beep(150, 400, "sawtooth", 0.06);
    live.textContent = "Game over. " + layers + " layers." + (newBest ? " New best!" : "") + (earned ? " " + earned + " tickets earned." : "");
    dropBtn.textContent = "Tap to try again";
  }

  // ---------- drawing ----------
  function brick(x, y, w, c) {
    cx.fillStyle = c; cx.fillRect(x, y, w, BH - 1);
    cx.fillStyle = "rgba(255,255,255,.28)"; cx.fillRect(x, y, w, 3);
    cx.fillStyle = "rgba(0,0,0,.25)"; cx.fillRect(x, y + BH - 5, w, 4);
  }
  function text(s, x, y, size, color, align) {
    cx.font = "900 " + size + "px Nunito, system-ui, sans-serif"; cx.fillStyle = color; cx.textAlign = align || "center"; cx.fillText(s, x, y);
  }
  function draw() {
    cx.save();
    if (shake > 0 && !calm) cx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
    // garage wall with a pegboard
    cx.fillStyle = "#16212C"; cx.fillRect(0, 0, W, H);
    cx.fillStyle = "rgba(255,255,255,.05)";
    for (let y = 12; y < H; y += 20) for (let x = 12; x < W; x += 20) cx.fillRect(x, y + (cam % 20), 2, 2);
    const base = GROUND + cam;
    cx.fillStyle = "#2B3A49"; cx.fillRect(0, base, W, H - base + 40);
    cx.fillStyle = "#3B4D5E"; cx.fillRect(0, base, W, 4);
    blocks.forEach((b, i) => { if (i === 0) brick(b.x, base - BH, b.w, "#8C97A3"); else brick(b.x, base - (i + 1) * BH, b.w, COLORS[i % COLORS.length]); });
    if (state === "play") brick(cur.x, base - (layers + 2) * BH, cur.w, COLORS[(layers + 1) % COLORS.length]);
    falling.forEach((f) => brick(f.x, f.y + cam, f.w, f.c));
    if (flash > 0 && state === "play") { cx.fillStyle = "rgba(255,255,255," + (flash * 0.35).toFixed(2) + ")"; cx.fillRect(0, 0, W, H); }
    cx.restore();
    text(String(layers), W / 2, 56, 44, "#E5EDF5");
    if (best) text("Best " + best, W - 10, 22, 14, "#9AAABB", "right");
    if (combo >= 2 && state === "play") text("Perfect x" + combo, W / 2, 80, 15, "#F2B533");
    if (bannerT > 0) { cx.fillStyle = "rgba(242,181,51,.95)"; cx.fillRect(10, H - 30, W - 20, 24); text(banner, W / 2, H - 13, 13, "#2A1E00"); }
    if (state === "ready") {
      cx.fillStyle = "rgba(16,24,33,.78)"; cx.fillRect(0, 0, W, H);
      text("GARAGE STACK", W / 2, 150, 28, "#F2B533");
      text("Stack the shelves.", W / 2, 188, 16, "#E5EDF5");
      text("One tap per shelf.", W / 2, 210, 16, "#E5EDF5");
      text("Tap to start", W / 2, 262, 18, "#9AAABB");
    }
    if (state === "over") {
      cx.fillStyle = "rgba(16,24,33,.86)"; cx.fillRect(0, 0, W, H);
      text("SHELF DOWN", W / 2, 130, 28, "#E07A66");
      text(layers + (layers === 1 ? " layer" : " layers"), W / 2, 176, 30, "#E5EDF5");
      text(layers >= best && layers > 0 ? "New best!" : "Best: " + best, W / 2, 204, 16, "#F2B533");
      text(earned ? "+" + earned + " arcade tickets" : "No tickets this time", W / 2, 236, 16, "#9AAABB");
      text("Tap to try again", W / 2, 290, 16, "#E5EDF5");
    }
  }

  let last = performance.now();
  function frame(t) {
    const dt = Math.min(50, t - last); last = t;
    if (state === "play") {
      cur.x += dir * speed() * dt;
      if (cur.x <= 0) { cur.x = 0; dir = 1; } else if (cur.x + cur.w >= W) { cur.x = W - cur.w; dir = -1; }
    }
    const target = Math.max(0, (layers - 9) * BH);
    cam += (target - cam) * Math.min(1, dt * 0.01);
    falling.forEach((f) => { f.vy += 0.0009 * dt; f.y += f.vy * dt; });
    falling = falling.filter((f) => f.y + cam < H + 40);
    if (bannerT > 0) bannerT -= dt;
    if (flash > 0) flash = Math.max(0, flash - dt / 200);
    if (shake > 0) shake = Math.max(0, shake - dt * 0.02);
    draw();
    requestAnimationFrame(frame);
  }

  // ---------- input ----------
  document.getElementById("wrap").addEventListener("pointerdown", (e) => { e.preventDefault(); drop(); });
  dropBtn.addEventListener("click", () => drop());
  document.addEventListener("keydown", (e) => {
    if ((e.key === " " || e.key === "Enter") && e.target !== dropBtn && e.target !== muteBtn && !(e.target.closest && e.target.closest("a"))) { e.preventDefault(); drop(); }
  });

  reset(); state = "ready"; blocks = [{ x: (W - START_W) / 2, w: START_W }]; layers = 0; spawn();
  requestAnimationFrame(frame);
  window.__garageStack = { get: () => ({ state, layers, best, cur: cur && { x: cur.x, w: cur.w }, top: blocks[blocks.length - 1] }) };   // read-only peek, used by the tests
})();
