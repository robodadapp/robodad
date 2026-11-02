/* DAD QUEST: RoboDad's 8-bit game. Original art and music, drawn and played in code.
   No ads, no purchases, no streaks. High score stays on this device. */
(() => {
  "use strict";
  const W = 320, H = 180, GY = 150;            // logical size, ground line
  const cv = document.getElementById("game"), x = cv.getContext("2d");
  x.imageSmoothingEnabled = false;
  const live = document.getElementById("live");
  const say = (t) => { live.textContent = t; };
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  };
  const unlocked = !!(store.get("robodad.egg.dadquest") || store.get("robodad.family"));

  // ---------- sound (off until the player turns it on) ----------
  let ac = null, muted = true, musicTimer = null, step = 0;
  const muteBtn = document.getElementById("muteBtn");
  function tone(f, t0, dur, type = "square", vol = 0.05){
    if (!ac || muted) return;
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t0);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(ac.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  }
  const N = (n) => 440 * Math.pow(2, (n - 69) / 12);
  // an original little loop in C major
  const MEL = [72,76,79,76, 74,77,81,77, 72,76,79,84, 83,79,76,74];
  const BAS = [48,48,55,55, 50,50,53,53, 48,48,55,55, 55,55,50,50];
  function startMusic(){
    stopMusic(); if (!ac || muted) return;
    musicTimer = setInterval(() => {
      const t = ac.currentTime + 0.02;
      if (state === "play") { tone(N(MEL[step % 16]), t, 0.16, "square", 0.025); tone(N(BAS[step % 16]), t, 0.2, "triangle", 0.04); }
      step++;
    }, 210);
  }
  function stopMusic(){ if (musicTimer) clearInterval(musicTimer); musicTimer = null; }
  const sfx = {
    jump(){ if (!ac) return; const t = ac.currentTime; tone(N(72), t, .08); tone(N(79), t + .05, .1); },
    item(){ if (!ac) return; const t = ac.currentTime; tone(N(84), t, .07); tone(N(91), t + .06, .12); },
    hit(){ if (!ac) return; const t = ac.currentTime; tone(110, t, .25, "sawtooth", .06); tone(82, t + .1, .3, "sawtooth", .05); },
    win(){ if (!ac) return; const t = ac.currentTime; [72,76,79,84,88].forEach((n, i) => tone(N(n), t + i * .09, .18)); },
  };
  muteBtn.addEventListener("click", () => {
    muted = !muted;
    if (!muted && !ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch { ac = null; } }
    if (ac && ac.state === "suspended") ac.resume();
    muteBtn.textContent = muted ? "Sound: off" : "Sound: on"; muteBtn.setAttribute("aria-pressed", String(muted));
    if (muted) stopMusic(); else startMusic();
  });

  // ---------- drawing helpers ----------
  const R = (px, py, w, h, c) => { x.fillStyle = c; x.fillRect(Math.round(px), Math.round(py), w, h); };
  function text(t, px, py, size = 8, c = "#FFF6D6", align = "center"){
    x.font = `bold ${size}px ui-monospace, "Courier New", monospace`; x.textAlign = align; x.textBaseline = "top";
    x.fillStyle = "#000"; x.fillText(t, px + 1, py + 1); x.fillStyle = c; x.fillText(t, px, py);
  }
  function wrapText(t, px, py, maxW, size = 8, c = "#FFF6D6", lh = 11){
    x.font = `bold ${size}px ui-monospace, "Courier New", monospace`;
    const words = t.split(" "); let line = "", y = py;
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (x.measureText(test).width > maxW && line) { text(line, px, y, size, c); line = w; y += lh; } else line = test;
    }
    if (line) text(line, px, y, size, c);
  }

  // RoboDad, drawn from rectangles (14 wide; 22 tall standing, 14 ducking)
  function drawDad(px, py, frame, duck, air, blink){
    if (blink) return;
    const o = "#1B2A3A";
    R(px + 2, py, 10, 3, o); R(px + 1, py + 2, 12, 2, o);              // hair
    R(px + 3, py + 1, 3, 1, "#3B4F66"); R(px + 7, py + 1, 2, 1, "#3B4F66");
    R(px, py + 6, 1, 3, o); R(px + 13, py + 6, 1, 3, o);              // ears
    R(px + 1, py + 4, 12, 8, "#C9D3DC");                               // face
    R(px + 2, py + 6, 4, 2, "#0B0B14"); R(px + 8, py + 6, 4, 2, "#0B0B14"); R(px + 6, py + 6, 2, 1, "#0B0B14");
    R(px + 3, py + 6, 1, 1, "#7F95AD"); R(px + 9, py + 6, 1, 1, "#7F95AD");
    R(px + 5, py + 10, 4, 1, o); R(px + 4, py + 9, 1, 1, o); R(px + 9, py + 9, 1, 1, o);   // smile
    if (duck) { R(px + 1, py + 12, 12, 2, "#3D2F27"); R(px + 6, py + 12, 2, 2, "#FFFFFF"); return; }
    R(px + 6, py + 12, 2, 1, "#B9C7D4");                               // neck
    R(px + 1, py + 13, 12, 6, "#3D2F27"); R(px + 4, py + 13, 2, 4, "#2B211C"); R(px + 8, py + 13, 2, 4, "#2B211C");
    R(px + 6, py + 13, 2, 4, "#FFFFFF");                               // shirt
    if (air) { R(px + 3, py + 19, 8, 2, o); return; }
    if (frame) { R(px + 2, py + 19, 3, 3, o); R(px + 9, py + 19, 3, 2, o); }
    else { R(px + 3, py + 19, 3, 2, o); R(px + 8, py + 19, 3, 3, o); }
  }
  const BRICK = ["#E3342F", "#2F80ED", "#F5C518", "#27AE60"];
  function drawBrick(o){ R(o.x, o.y + 2, o.w, o.h - 2, o.c); R(o.x, o.y + o.h - 1, o.w, 1, "rgba(0,0,0,.35)");
    for (let i = 0; i < 3; i++) R(o.x + 1 + i * 4, o.y, 3, 2, o.c); R(o.x + 1, o.y + 3, o.w - 2, 1, "rgba(255,255,255,.25)"); }
  function drawShirt(o){
    R(o.x - 8, o.y - 2, o.w + 16, 1, "#9A93B8");                       // washing line
    R(o.x + 2, o.y - 3, 2, 3, "#C79A5A"); R(o.x + o.w - 4, o.y - 3, 2, 3, "#C79A5A");   // pegs
    R(o.x, o.y, o.w, 4, o.c); R(o.x + 3, o.y + 4, o.w - 6, o.h - 4, o.c); R(o.x + 5, o.y + 1, o.w - 10, 2, "rgba(0,0,0,.2)");
  }
  function drawCat(o){
    const c = "#6B6F80"; R(o.x + 2, o.y + 3, 10, 6, c); R(o.x + 9, o.y, 5, 5, c);
    R(o.x + 9, o.y - 2, 1, 2, c); R(o.x + 13, o.y - 2, 1, 2, c); R(o.x, o.y + 4, 3, 2, c);
    R(o.x + 10, o.y + 2, 1, 1, "#F5C518"); R(o.x + 12, o.y + 2, 1, 1, "#F5C518");
    text("z", o.x + 16, o.y - 8, 7, "#9A93B8", "left");
  }
  const ITEMS = {
    key:    { name: "keys",    draw: (a, b) => { R(a, b + 2, 4, 4, "#F5C518"); R(a + 1, b + 3, 2, 2, "#0B0B14"); R(a + 4, b + 3, 4, 2, "#F5C518"); R(a + 6, b + 5, 1, 2, "#F5C518"); } },
    remote: { name: "remotes", draw: (a, b) => { R(a + 2, b, 4, 8, "#22222E"); R(a + 3, b + 1, 2, 1, "#E3342F"); R(a + 3, b + 3, 1, 1, "#9A93B8"); R(a + 4, b + 5, 1, 1, "#9A93B8"); } },
    sock:   { name: "socks",   draw: (a, b) => { R(a + 2, b, 3, 6, "#FFFFFF"); R(a + 2, b + 5, 6, 3, "#FFFFFF"); R(a + 2, b + 1, 3, 1, "#FF4D6D"); } },
    specs:  { name: "glasses", draw: (a, b) => { R(a, b + 3, 3, 3, "#0B0B14"); R(a + 5, b + 3, 3, 3, "#0B0B14"); R(a + 3, b + 3, 2, 1, "#0B0B14"); R(a + 1, b + 4, 1, 1, "#7FD1FF"); R(a + 6, b + 4, 1, 1, "#7FD1FF"); } },
  };

  // ---------- rooms ----------
  const ROOMS = [
    { name: "Kitchen", speed: 2.0, length: 3000, cat: false,
      sky: "#1D2742", floorA: "#D9D2C3", floorB: "#BFB6A3",
      deco(off){ for (let i = 0; i < 4; i++) { const bx = ((i * 110 - off * 0.3) % 440 + 440) % 440 - 60;
        R(bx, 70, 50, 80, "#2A3554"); R(bx + 4, 76, 42, 30, "#33406A"); R(bx + 4, 110, 42, 36, "#33406A"); R(bx + 40, 92, 3, 8, "#9A93B8"); }
        R(250, 20, 40, 30, "#2A3554"); R(254, 24, 32, 22, "#0E1530"); R(274, 28, 6, 6, "#FFF6D6"); } },
    { name: "Garage", speed: 2.6, length: 3600, cat: true,
      sky: "#2A2D33", floorA: "#6E727A", floorB: "#62666E",
      deco(off){ R(0, 40, W, 50, "#3A3E46"); for (let i = 0; i < 40; i++) R((i * 9 - off * 0.2 % 9 + 360) % 360 - 20, 44 + (i % 5) * 9, 1, 1, "#52565F");
        for (let i = 0; i < 3; i++) { const bx = ((i * 150 - off * 0.35) % 450 + 450) % 450 - 80; R(bx, 52, 3, 18, "#8A8F99"); R(bx - 4, 50, 11, 3, "#8A8F99"); R(bx + 20, 56, 16, 4, "#B07A3C"); R(bx + 34, 52, 3, 12, "#8A8F99"); }
        for (let i = 0; i < 2; i++) { const bx = ((i * 220 - off * 0.5) % 440 + 440) % 440 - 100; R(bx, 112, 90, 26, "#4A2F2F"); R(bx + 14, 100, 56, 14, "#4A2F2F"); R(bx + 10, 134, 14, 10, "#111"); R(bx + 64, 134, 14, 10, "#111"); } } },
    { name: "Attic", speed: 3.2, length: 4200, cat: true,
      sky: "#2B1D16", floorA: "#7A5234", floorB: "#6B472C",
      deco(off){ for (let i = 0; i < 6; i++) { const bx = ((i * 70 - off * 0.25) % 420 + 420) % 420 - 50; R(bx, 0, 6, 150, "#3E2A1E"); }
        R(140, 22, 40, 40, "#3E2A1E"); R(144, 26, 32, 32, "#101828"); R(162, 32, 6, 6, "#FFF6D6");
        for (let i = 0; i < 3; i++) { const bx = ((i * 140 - off * 0.45) % 420 + 420) % 420 - 60; R(bx, 118, 36, 30, "#A0743F"); R(bx, 118, 36, 4, "#B9884C"); R(bx + 14, 118, 8, 30, "#8C6334"); }
        x.fillStyle = "rgba(255,200,120,.06)"; x.beginPath(); x.arc(60, 40, 70, 0, 7); x.fill(); } },
  ];
  const JOKES = [
    "You fell for it. Like I fall for every sale.",
    "I'd tell you a LEGO joke, but it's still under my foot.",
    "Game over? More like game... let's go again.",
    "That brick? Placed there by your sibling. Probably.",
    "Don't worry. I lose my keys every day too.",
    "Fun fact: dads don't fall. We test gravity.",
    "Laundry: 1. Dad: 0. Rematch?",
  ];

  // ---------- game state ----------
  let state = unlocked ? "title" : "locked";
  let level = 0, endless = false, lives = 3, score = 0, dist = 0, speed = 2, inv = 0;
  let found = { key: 0, remote: 0, sock: 0, specs: 0 }, obs = [], items = [], nextSpawn = 0, joke = "";
  const P = { x: 40, y: GY - 22, vy: 0, duck: false, duckT: 0, frame: 0, ft: 0 };
  let best = parseInt(store.get("robodad.dadquest.best") || "0", 10) || 0;

  function room(){ return ROOMS[endless ? Math.floor(dist / 2500) % 3 : level]; }
  function resetRun(keepScore){
    obs = []; items = []; dist = 0; nextSpawn = 60; inv = 0;
    P.y = GY - 22; P.vy = 0; P.duck = false; P.duckT = 0;
    if (!keepScore) { score = 0; lives = 3; found = { key: 0, remote: 0, sock: 0, specs: 0 }; }
    speed = endless ? 2.6 : ROOMS[level].speed;
  }
  function start(lv, isEndless){ level = lv; endless = !!isEndless; resetRun(lv > 0 && !isEndless); state = "play"; say((endless ? "Endless mode" : ROOMS[lv].name) + ". Go!"); }

  function spawn(){
    const r = room(), gap = 70 + Math.random() * 90;
    nextSpawn = dist + gap * (speed / 2);
    const roll = Math.random();
    if (roll < 0.42) obs.push({ t: "brick", x: W + 10, y: GY - 7, w: 12, h: 7, c: BRICK[Math.floor(Math.random() * 4)] });
    else if (roll < 0.7) obs.push({ t: "shirt", x: W + 10, y: GY - 34, w: 14, h: 18, c: ["#4FC3F7", "#FF8A65", "#AED581", "#FFFFFF"][Math.floor(Math.random() * 4)] });
    else if (roll < 0.82 && r.cat) obs.push({ t: "cat", x: W + 10, y: GY - 9, w: 14, h: 9 });
    else {
      const kinds = Object.keys(ITEMS), k = kinds[Math.floor(Math.random() * kinds.length)];
      items.push({ k, x: W + 10, y: Math.random() < 0.5 ? GY - 12 : GY - 40, w: 8, h: 8 });
    }
    if (Math.random() < 0.35) { const kinds = Object.keys(ITEMS); items.push({ k: kinds[Math.floor(Math.random() * 4)], x: W + 60, y: GY - 44, w: 8, h: 8 }); }
  }
  const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  // ---------- input ----------
  const onGround = () => P.y >= GY - (P.duck ? 14 : 22) - 0.01;
  function jump(){
    if (state !== "play") return advance();
    if (onGround() && !P.duck) { P.vy = -5.6; sfx.jump(); }
  }
  function duck(on, ms){
    if (state !== "play") return;
    P.duck = on; P.duckT = on && ms ? ms / (1000 / 60) : 0;
    if (on && onGround()) P.y = GY - 14; else if (!on) P.y = Math.min(P.y, GY - 22);
  }
  function advance(){
    if (state === "locked") return;
    if (state === "title") start(0);
    else if (state === "level") start(level + 1);
    else if (state === "over") start(endless ? 0 : level, endless);
    else if (state === "win") start(0, true);
    else if (state === "paused") state = "play";
  }
  addEventListener("keydown", (e) => {
    if (["Space", "ArrowUp", "KeyW"].includes(e.code)) { e.preventDefault(); jump(); }
    else if (["ArrowDown", "KeyS"].includes(e.code)) { e.preventDefault(); duck(true); }
    else if (e.code === "KeyP" || e.code === "Escape") { if (state === "play") state = "paused"; else if (state === "paused") state = "play"; }
    else if (e.code === "Enter") advance();
  });
  addEventListener("keyup", (e) => { if (["ArrowDown", "KeyS"].includes(e.code)) duck(false); });
  const wrap = document.getElementById("wrap");
  let ty = 0, tt = 0;
  wrap.addEventListener("pointerdown", (e) => { ty = e.clientY; tt = performance.now(); });
  wrap.addEventListener("pointerup", (e) => {
    const dy = e.clientY - ty;
    if (dy > 30 && performance.now() - tt < 600) duck(true, 650); else jump();
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden && state === "play") state = "paused"; });

  // ---------- update ----------
  function update(){
    if (state !== "play") return;
    const r = room();
    if (endless) speed = Math.min(5, 2.6 + dist / 6000);
    dist += speed; score += speed * 0.05;
    P.ft++; if (P.ft > 7) { P.ft = 0; P.frame ^= 1; }
    if (P.duckT > 0 && --P.duckT <= 0) duck(false);
    if (!P.duck || !onGround()) { P.vy += 0.35; P.y += P.vy; }
    const floor = GY - (P.duck ? 14 : 22);
    if (P.y > floor) { P.y = floor; P.vy = 0; }
    if (dist >= nextSpawn && (endless || dist < r.length - 200)) spawn();
    for (const o of obs) o.x -= speed;
    for (const it of items) it.x -= speed;
    obs = obs.filter(o => o.x > -30); items = items.filter(i => i.x > -20 && !i.got);
    const box = { x: P.x + 2, y: P.y + 1, w: 10, h: (P.duck ? 13 : 21) };
    if (inv > 0) inv--;
    else for (const o of obs) if (hit(box, o)) {
      lives--; inv = 90; sfx.hit();
      if (lives <= 0) {
        state = "over"; joke = JOKES[Math.floor(Math.random() * JOKES.length)];
        if (Math.floor(score) > best) { best = Math.floor(score); store.set("robodad.dadquest.best", String(best)); }
        say("Game over. " + joke); return;
      }
      break;
    }
    for (const it of items) if (!it.got && hit(box, it)) { it.got = true; found[it.k]++; score += 100; sfx.item(); }
    if (!endless && dist >= r.length) {
      sfx.win();
      if (level >= ROOMS.length - 1) {
        state = "win"; if (Math.floor(score) > best) { best = Math.floor(score); store.set("robodad.dadquest.best", String(best)); }
        store.set("robodad.dadquest.cleared", "1"); say("You found everything. You win!");
      } else { state = "level"; say(ROOMS[level].name + " cleared."); }
    }
  }

  // ---------- draw ----------
  function drawRoom(r, off){
    R(0, 0, W, H, r.sky); r.deco(off);
    for (let i = -1; i < W / 12 + 2; i++) { const fx = i * 12 - (off % 24); R(fx, GY, 12, H - GY, ((i + Math.floor(off / 12)) % 2) ? r.floorA : r.floorB); }
    R(0, GY, W, 1, "rgba(0,0,0,.4)");
  }
  function hud(){
    for (let i = 0; i < 3; i++) { const c = i < lives ? "#FF4D6D" : "#3A3560"; R(8 + i * 11, 8, 3, 3, c); R(12 + i * 11, 8, 3, 3, c); R(8 + i * 11, 10, 7, 3, c); R(9 + i * 11, 13, 5, 1, c); R(10 + i * 11, 14, 3, 1, c); }
    let ix = 50; for (const k of Object.keys(ITEMS)) { ITEMS[k].draw(ix, 7); text(String(found[k]), ix + 12, 8, 8, "#FFF6D6", "left"); ix += 26; }
    text(String(Math.floor(score)).padStart(5, "0"), W - 8, 8, 8, "#F5C518", "right");
    if (!endless) { const r = room(); R(W / 2 - 40, 22, 80, 3, "#3A3560"); R(W / 2 - 40, 22, Math.min(80, 80 * dist / r.length), 3, "#F5C518"); text(r.name, W / 2, 27, 7, "#9A93B8"); }
    else text("ENDLESS", W / 2, 22, 7, "#F5C518");
  }
  function panel(h){ R(30, (H - h) / 2, W - 60, h, "rgba(11,11,20,.88)"); R(30, (H - h) / 2, W - 60, 2, "#F5C518"); R(30, (H + h) / 2 - 2, W - 60, 2, "#F5C518"); }
  let t = 0;
  function draw(){
    t++;
    const r = state === "title" || state === "locked" ? ROOMS[0] : room();
    drawRoom(r, state === "title" || state === "locked" ? t * 0.6 : dist);
    for (const it of items) ITEMS[it.k].draw(it.x, it.y + Math.sin((t + it.x) / 8));
    for (const o of obs) (o.t === "brick" ? drawBrick : o.t === "shirt" ? drawShirt : drawCat)(o);
    if (state !== "locked") drawDad(P.x, P.y, P.frame, P.duck, !onGround(), inv > 0 && Math.floor(inv / 5) % 2 === 0);
    if (state === "play" || state === "paused") hud();
    if (state === "locked") {
      panel(96);
      text("DAD QUEST", W / 2, 50, 18, "#F5C518");
      wrapText("This cartridge is still lost. Find it in RoboDad's secret hunt, The Lost Cartridge, to play.", W / 2, 78, 230, 8, "#FFF6D6");
      text("Hint: try the secret code box in the menu.", W / 2, 114, 7, "#9A93B8");
    } else if (state === "title") {
      panel(110);
      text("DAD QUEST", W / 2, 42, 22, "#F5C518");
      text("Find everything dads always lose", W / 2, 70, 8);
      [["key", 104], ["remote", 130], ["sock", 156], ["specs", 182]].forEach(([k, px]) => ITEMS[k].draw(px + 10, 84));
      if (Math.floor(t / 30) % 2) text("TAP OR PRESS SPACE TO START", W / 2, 100, 8, "#FF4D6D");
      text("Best: " + best, W / 2, 114, 7, "#9A93B8");
      text("P.S. Did you text your parent back?", W / 2, 126, 7, "#9A93B8");
    } else if (state === "level") {
      panel(80);
      text(ROOMS[level].name.toUpperCase() + " CLEARED!", W / 2, 60, 12, "#F5C518");
      text("Next: the " + ROOMS[level + 1].name.toLowerCase(), W / 2, 82, 8);
      if (Math.floor(t / 30) % 2) text("TAP TO KEEP GOING", W / 2, 100, 8, "#FF4D6D");
    } else if (state === "over") {
      panel(96);
      text("GAME OVER", W / 2, 48, 16, "#FF4D6D");
      wrapText("“" + joke + "”", W / 2, 72, 230, 8);
      text("Score " + Math.floor(score) + "  ·  Best " + best, W / 2, 100, 8, "#F5C518");
      if (Math.floor(t / 30) % 2) text("TAP TO TRY AGAIN", W / 2, 114, 8);
    } else if (state === "win") {
      panel(110);
      text("YOU FOUND EVERYTHING!", W / 2, 40, 12, "#F5C518");
      text(`${found.key} keys · ${found.remote} remotes · ${found.sock} socks · ${found.specs} glasses`, W / 2, 62, 7);
      wrapText("Dad can finally sit down. Then he'll lose the remote again.", W / 2, 76, 230, 8);
      text("Score " + Math.floor(score), W / 2, 102, 8, "#F5C518");
      if (Math.floor(t / 30) % 2) text("TAP FOR ENDLESS MODE", W / 2, 118, 8, "#FF4D6D");
    } else if (state === "paused") {
      panel(40); text("PAUSED", W / 2, 76, 12, "#F5C518"); text("Tap or press P", W / 2, 92, 7, "#9A93B8");
    }
  }
  // fixed 60 updates per second, whatever the screen's refresh rate
  let last = performance.now(), acc = 0;
  function loop(now){
    acc += Math.min(100, now - last); last = now;
    while (acc >= 1000 / 60) { update(); acc -= 1000 / 60; }
    draw(); requestAnimationFrame(loop);
  }
  say(unlocked ? "DAD QUEST. Press Space or tap to start." : "DAD QUEST is locked. Find the cartridge in the secret hunt.");
  requestAnimationFrame(loop);
})();
