/* DAD QUEST: RoboDad's 8-bit game. Original art and music, drawn and played in code.
   No ads, no purchases, no streaks. Scores, skins and treasures stay on this device. */
(() => {
  "use strict";
  const W = 320, H = 180, GY = 150;            // logical size, ground line
  const cv = document.getElementById("game"), main = cv.getContext("2d");
  main.imageSmoothingEnabled = false;
  let x = main;                                  // current drawing context (swapped for the share card)
  const live = document.getElementById("live");
  const say = (t) => { live.textContent = t; };
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  };
  const unlocked = !!(store.get("robodad.egg.dadquest") || store.get("robodad.family"));
  const buzz = (ms) => { try { navigator.vibrate && navigator.vibrate(ms); } catch {} };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  // ---------- sound (off until the player turns it on) ----------
  let t = 0;
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
  // an original little loop in C major, and a tenser one in A minor for bosses
  const MEL = [72,76,79,76, 74,77,81,77, 72,76,79,84, 83,79,76,74];
  const BAS = [48,48,55,55, 50,50,53,53, 48,48,55,55, 55,55,50,50];
  const BMEL = [69,72,76,72, 69,72,77,76, 68,71,76,71, 68,71,74,71];
  const BBAS = [45,45,45,45, 41,41,41,41, 40,40,40,40, 40,40,44,44];
  function startMusic(){
    stopMusic(); if (!ac || muted) return;
    musicTimer = setInterval(() => {
      const t = ac.currentTime + 0.02, b = !!boss;
      if (state === "play" || state === "bonus") {
        tone(N((b ? BMEL : MEL)[step % 16]), t, 0.16, "square", 0.025);
        tone(N((b ? BBAS : BAS)[step % 16]), t, 0.2, "triangle", 0.04);
      }
      step++;
    }, 210);
  }
  function stopMusic(){ if (musicTimer) clearInterval(musicTimer); musicTimer = null; }
  const T = () => ac ? ac.currentTime : 0;
  const sfx = {
    jump(){ const t = T(); tone(N(72), t, .08); tone(N(79), t + .05, .1); },
    dbl(){ const t = T(); tone(N(84), t, .06); tone(N(88), t + .04, .08); },
    item(){ const t = T(); tone(N(84), t, .07); tone(N(91), t + .06, .12); },
    power(){ const t = T(); [72,79,84,91].forEach((n, i) => tone(N(n), t + i * .05, .1)); },
    treasure(){ const t = T(); [79,83,86,91,95].forEach((n, i) => tone(N(n), t + i * .07, .16, "triangle", .07)); },
    hit(){ const t = T(); tone(110, t, .25, "sawtooth", .06); tone(82, t + .1, .3, "sawtooth", .05); },
    warn(){ const t = T(); tone(N(81), t, .06); tone(N(81), t + .1, .06); },
    wrong(){ const t = T(); tone(N(60), t, .12, "square", .04); tone(N(55), t + .1, .18, "square", .04); },
    win(){ const t = T(); [72,76,79,84,88].forEach((n, i) => tone(N(n), t + i * .09, .18)); },
    click(){ tone(N(88), T(), .04, "square", .03); },
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
    return y + lh;
  }

  // ---------- dads (skins) ----------
  const SKINS = {
    classic:  { name: "Classic Dad",  how: "Always yours" },
    mullet:   { name: "Mullet Dad",   how: "Beat the Rogue Roomba" },
    grill:    { name: "Grill Master", how: "Grab 30 things in one run" },
    track:    { name: "80s Tracksuit", how: "Clear all three rooms" },
  };
  const SKIN_IDS = Object.keys(SKINS);
  const skinOwned = (id) => id === "classic" || store.get("robodad.dadquest.skin." + id) === "1";
  let skin = store.get("robodad.dadquest.skin") || "classic";
  if (!SKINS[skin] || !skinOwned(skin)) skin = "classic";

  // RoboDad, drawn from rectangles (14 wide; 22 tall standing, 14 ducking)
  function drawDad(px, py, frame, duck, air, blink, sk = skin){
    if (blink) return;
    const o = "#1B2A3A";
    const hair = sk === "mullet" ? "#6B4423" : o;
    const shirt = sk === "track" ? "#14B8A6" : "#3D2F27", shirtD = sk === "track" ? "#7C3AED" : "#2B211C";
    if (sk === "mullet") R(px - 1, py + 2, 3, duck ? 9 : 12, hair);                 // business in front, party in back
    R(px + 2, py, 10, 3, hair); R(px + 1, py + 2, 12, 2, hair);                     // hair
    R(px + 3, py + 1, 3, 1, sk === "mullet" ? "#8A5A30" : "#3B4F66"); R(px + 7, py + 1, 2, 1, sk === "mullet" ? "#8A5A30" : "#3B4F66");
    if (sk === "grill") { R(px + 2, py - 5, 10, 5, "#FFFFFF"); R(px + 1, py - 7, 12, 3, "#FFFFFF"); R(px + 2, py - 1, 10, 1, "#D7D7E0"); }
    R(px, py + 6, 1, 3, o); R(px + 13, py + 6, 1, 3, o);                            // ears
    R(px + 1, py + 4, 12, 8, "#C9D3DC");                                             // face
    if (sk === "track") R(px + 1, py + 4, 12, 1, "#FF4D6D");                         // sweatband
    R(px + 2, py + 6, 4, 2, "#0B0B14"); R(px + 8, py + 6, 4, 2, "#0B0B14"); R(px + 6, py + 6, 2, 1, "#0B0B14");
    R(px + 3, py + 6, 1, 1, "#7F95AD"); R(px + 9, py + 6, 1, 1, "#7F95AD");
    if (sk === "mullet") R(px + 4, py + 9, 6, 1, hair);                              // the moustache comes free
    else { R(px + 5, py + 10, 4, 1, o); R(px + 4, py + 9, 1, 1, o); R(px + 9, py + 9, 1, 1, o); }   // smile
    if (duck) { R(px + 1, py + 12, 12, 2, shirt); R(px + 6, py + 12, 2, 2, sk === "grill" ? "#E3342F" : "#FFFFFF"); return; }
    R(px + 6, py + 12, 2, 1, "#B9C7D4");                                             // neck
    R(px + 1, py + 13, 12, 6, shirt); R(px + 4, py + 13, 2, 4, shirtD); R(px + 8, py + 13, 2, 4, shirtD);
    R(px + 6, py + 13, 2, 4, "#FFFFFF");                                             // shirt
    if (sk === "track") { R(px + 1, py + 13, 1, 6, "#FFFFFF"); R(px + 12, py + 13, 1, 6, "#FFFFFF"); }
    if (sk === "grill") { R(px + 3, py + 13, 8, 6, "#E3342F"); R(px + 5, py + 15, 4, 2, "#FFFFFF"); R(px + 12, py + 11, 1, 6, "#9A93B8"); R(px + 11, py + 9, 3, 3, "#9A93B8"); }
    const leg = sk === "track" ? "#7C3AED" : o;
    if (air) { R(px + 3, py + 19, 8, 2, leg); return; }
    if (frame) { R(px + 2, py + 19, 3, 3, leg); R(px + 9, py + 19, 3, 2, leg); }
    else { R(px + 3, py + 19, 3, 2, leg); R(px + 8, py + 19, 3, 3, leg); }
  }

  // ---------- obstacles, pickups, bosses ----------
  const BRICK = ["#E3342F", "#2F80ED", "#F5C518", "#27AE60"];
  function drawBrick(o){ R(o.x, o.y + 2, o.w, o.h - 2, o.c); R(o.x, o.y + o.h - 1, o.w, 1, "rgba(0,0,0,.35)");
    for (let i = 0; i < 3; i++) R(o.x + 1 + i * 4, o.y, 3, 2, o.c); R(o.x + 1, o.y + 3, o.w - 2, 1, "rgba(255,255,255,.25)"); }
  function drawShirt(o){
    R(o.x - 8, o.y - 2, o.w + 16, 1, "#9A93B8");
    R(o.x + 2, o.y - 3, 2, 3, "#C79A5A"); R(o.x + o.w - 4, o.y - 3, 2, 3, "#C79A5A");
    R(o.x, o.y, o.w, 4, o.c); R(o.x + 3, o.y + 4, o.w - 6, o.h - 4, o.c); R(o.x + 5, o.y + 1, o.w - 10, 2, "rgba(0,0,0,.2)");
  }
  function drawCat(o){
    const c = "#6B6F80"; R(o.x + 2, o.y + 3, 10, 6, c); R(o.x + 9, o.y, 5, 5, c);
    R(o.x + 9, o.y - 2, 1, 2, c); R(o.x + 13, o.y - 2, 1, 2, c); R(o.x, o.y + 4, 3, 2, c);
    R(o.x + 10, o.y + 2, 1, 1, "#F5C518"); R(o.x + 12, o.y + 2, 1, 1, "#F5C518");
    text("z", o.x + 16, o.y - 8, 7, "#9A93B8", "left");
  }
  function drawRoomba(o){
    R(o.x + 1, o.y, o.w - 2, o.h, "#2E2E3A"); R(o.x, o.y + 2, o.w, o.h - 3, "#2E2E3A");
    R(o.x + 3, o.y + 1, o.w - 6, 2, "#4A4A5C"); R(o.x + o.w / 2 - 1, o.y + 1, 2, 1, (t >> 3) % 2 ? "#27AE60" : "#E3342F");
    R(o.x + 2, o.y + o.h - 1, 3, 1, "#9A93B8"); R(o.x + o.w - 5, o.y + o.h - 1, 3, 1, "#9A93B8");
    for (let i = 0; i < 3; i++) R(o.x - 3 - i * 4 - (t % 4), o.y + o.h - 2, 2, 1, "rgba(200,200,220,.5)");    // dust trail
  }
  function drawLadder(o){
    const c = "#C79A5A";
    R(o.x, o.y, o.w, 2, c); R(o.x, o.y + o.h - 2, o.w, 2, c);
    for (let i = 2; i < o.w; i += 6) R(o.x + i, o.y, 2, o.h, "#A0743F");
  }
  function drawBat(o){
    const flap = (t >> 3) % 2, c = "#3A2F55";
    R(o.x + 5, o.y + 2, 6, 5, c); R(o.x + 6, o.y, 1, 2, c); R(o.x + 9, o.y, 1, 2, c);
    R(o.x + 6, o.y + 3, 1, 1, "#FF4D6D"); R(o.x + 9, o.y + 3, 1, 1, "#FF4D6D");
    if (flap) { R(o.x, o.y, 5, 3, c); R(o.x + 11, o.y, 5, 3, c); } else { R(o.x, o.y + 4, 5, 3, c); R(o.x + 11, o.y + 4, 5, 3, c); }
  }
  const DRAW_OBS = { brick: drawBrick, shirt: drawShirt, cat: drawCat, roomba: drawRoomba, ladder: drawLadder, bat: drawBat };

  const ITEMS = {
    key:    { name: "keys",    draw: (a, b) => { R(a, b + 2, 4, 4, "#F5C518"); R(a + 1, b + 3, 2, 2, "#0B0B14"); R(a + 4, b + 3, 4, 2, "#F5C518"); R(a + 6, b + 5, 1, 2, "#F5C518"); } },
    remote: { name: "remotes", draw: (a, b) => { R(a + 2, b, 4, 8, "#22222E"); R(a + 3, b + 1, 2, 1, "#E3342F"); R(a + 3, b + 3, 1, 1, "#9A93B8"); R(a + 4, b + 5, 1, 1, "#9A93B8"); } },
    sock:   { name: "socks",   draw: (a, b) => { R(a + 2, b, 3, 6, "#FFFFFF"); R(a + 2, b + 5, 6, 3, "#FFFFFF"); R(a + 2, b + 1, 3, 1, "#FF4D6D"); } },
    specs:  { name: "glasses", draw: (a, b) => { R(a, b + 3, 3, 3, "#0B0B14"); R(a + 5, b + 3, 3, 3, "#0B0B14"); R(a + 3, b + 3, 2, 1, "#0B0B14"); R(a + 1, b + 4, 1, 1, "#7FD1FF"); R(a + 6, b + 4, 1, 1, "#7FD1FF"); } },
  };
  const ITEM_IDS = Object.keys(ITEMS);
  const drawMug = (a, b) => { R(a, b + 2, 6, 6, "#FFF6D6"); R(a + 6, b + 3, 2, 3, "#FFF6D6"); R(a + 1, b + 3, 4, 1, "#6B4423");
    R(a + 1, b - 1 - (t >> 4) % 2, 1, 2, "rgba(255,255,255,.5)"); R(a + 4, b - (t >> 4) % 2, 1, 2, "rgba(255,255,255,.5)"); };
  // one hidden treasure per room, placed high above a washing line: you have to jump it just right
  const TREASURES = [
    { id: "ring",  name: "wedding ring",  draw: (a, b) => { R(a + 1, b + 2, 6, 1, "#F5C518"); R(a + 1, b + 7, 6, 1, "#F5C518"); R(a, b + 3, 1, 4, "#F5C518"); R(a + 7, b + 3, 1, 4, "#F5C518"); R(a + 3, b, 2, 2, "#7FD1FF"); } },
    { id: "watch", name: "Grandpa's watch", draw: (a, b) => { R(a + 2, b, 4, 8, "#6B4423"); R(a + 1, b + 2, 6, 4, "#C0C0C8"); R(a + 2, b + 3, 4, 2, "#FFF6D6"); R(a + 4, b + 3, 1, 1, "#0B0B14"); } },
    { id: "photo", name: "baby photo",    draw: (a, b) => { R(a, b, 8, 8, "#FFF6D6"); R(a + 1, b + 1, 6, 5, "#7FD1FF"); R(a + 3, b + 2, 2, 2, "#F2C1A0"); R(a + 2, b + 4, 4, 2, "#FF8A65"); } },
  ];
  const treasureFound = (i) => store.get("robodad.dadquest.treasure." + TREASURES[i].id) === "1";
  const treasureCount = () => TREASURES.filter((_, i) => treasureFound(i)).length;

  // ---------- rooms ----------
  const ROOMS = [
    { name: "Kitchen", speed: 2.0, length: 3000, cat: false, boss: "roomba",
      sky: "#1D2742", floorA: "#D9D2C3", floorB: "#BFB6A3",
      deco(off){ for (let i = 0; i < 4; i++) { const bx = ((i * 110 - off * 0.3) % 440 + 440) % 440 - 60;
        R(bx, 70, 50, 80, "#2A3554"); R(bx + 4, 76, 42, 30, "#33406A"); R(bx + 4, 110, 42, 36, "#33406A"); R(bx + 40, 92, 3, 8, "#9A93B8"); }
        R(250, 20, 40, 30, "#2A3554"); R(254, 24, 32, 22, "#0E1530"); R(274, 28, 6, 6, "#FFF6D6"); } },
    { name: "Garage", speed: 2.6, length: 3600, cat: true, boss: "ladder",
      sky: "#2A2D33", floorA: "#6E727A", floorB: "#62666E",
      deco(off){ R(0, 40, W, 50, "#3A3E46"); for (let i = 0; i < 40; i++) R((i * 9 - off * 0.2 % 9 + 360) % 360 - 20, 44 + (i % 5) * 9, 1, 1, "#52565F");
        for (let i = 0; i < 3; i++) { const bx = ((i * 150 - off * 0.35) % 450 + 450) % 450 - 80; R(bx, 52, 3, 18, "#8A8F99"); R(bx - 4, 50, 11, 3, "#8A8F99"); R(bx + 20, 56, 16, 4, "#B07A3C"); R(bx + 34, 52, 3, 12, "#8A8F99"); }
        for (let i = 0; i < 2; i++) { const bx = ((i * 220 - off * 0.5) % 440 + 440) % 440 - 100; R(bx, 112, 90, 26, "#4A2F2F"); R(bx + 14, 100, 56, 14, "#4A2F2F"); R(bx + 10, 134, 14, 10, "#111"); R(bx + 64, 134, 14, 10, "#111"); } } },
    { name: "Attic", speed: 3.2, length: 4200, cat: true, boss: "bat",
      sky: "#2B1D16", floorA: "#7A5234", floorB: "#6B472C",
      deco(off){ for (let i = 0; i < 6; i++) { const bx = ((i * 70 - off * 0.25) % 420 + 420) % 420 - 50; R(bx, 0, 6, 150, "#3E2A1E"); }
        R(140, 22, 40, 40, "#3E2A1E"); R(144, 26, 32, 32, "#101828"); R(162, 32, 6, 6, "#FFF6D6");
        for (let i = 0; i < 3; i++) { const bx = ((i * 140 - off * 0.45) % 420 + 420) % 420 - 60; R(bx, 118, 36, 30, "#A0743F"); R(bx, 118, 36, 4, "#B9884C"); R(bx + 14, 118, 8, 30, "#8C6334"); }
        x.fillStyle = "rgba(255,200,120,.06)"; x.beginPath(); x.arc(60, 40, 70, 0, 7); x.fill(); } },
  ];
  const STUDY_ROOM = { name: "Study", sky: "#16233A", floorA: "#3A4A6A", floorB: "#33415E",
    deco(off){ for (let i = 0; i < 3; i++) { const bx = ((i * 150 - off * 0.3) % 450 + 450) % 450 - 80;
      R(bx, 64, 70, 82, "#24324F"); for (let s = 0; s < 4; s++) { R(bx + 4, 70 + s * 19, 62, 2, "#5A4632");
        for (let b = 0; b < 8; b++) R(bx + 6 + b * 7, 72 + s * 19 - (b % 3), 5, 15 + (b % 3), ["#E3342F", "#2F80ED", "#F5C518", "#27AE60", "#9A93B8"][(b + s + i) % 5]); } }
      R(266, 40, 46, 26, "#E8E2D0"); R(268, 42, 42, 22, "#1F3B2C"); text("a²+b²", 289, 46, 7, "#E8E2D0"); text("=c²", 289, 54, 6, "#E8E2D0"); } };

  // A boss is a short list of hand-written attacks, each telegraphed with a warning first.
  //   low = jump it, high = duck it
  const BOSSES = {
    roomba: { name: "ROGUE ROOMBA", attacks: [["low", 1.6], ["low", 2.2], ["low", 2.8, 2], ["low", 3.2]] },
    ladder: { name: "LOOSE LADDER", attacks: [["low", 1.8], ["high", 1.8], ["low", 2.4], ["high", 2.6], ["low", 3]] },
    bat:    { name: "ATTIC BAT",    attacks: [["high", 2.2], ["low", 2.4], ["high", 2.8], ["high", 3], ["low", 3.2]] },
  };
  function bossShot(kind, hgt, sp){
    if (kind === "roomba") return { t: "roomba", x: W + 6, y: GY - 8, w: 18, h: 8, sp };
    if (kind === "ladder") return hgt === "low" ? { t: "ladder", x: W + 6, y: GY - 9, w: 30, h: 9, sp } : { t: "ladder", x: W + 6, y: GY - 27, w: 34, h: 9, sp };
    return hgt === "low" ? { t: "bat", x: W + 6, y: GY - 11, w: 16, h: 7, sp, wob: 0 } : { t: "bat", x: W + 6, y: GY - 26, w: 16, h: 8, sp, wob: 1 };
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

  // ---------- game state ----------
  let state = unlocked ? "title" : "locked";
  let level = 0, endless = false, lives = 3, maxLives = 3, score = 0, dist = 0, speed = 2, inv = 0, runItems = 0;
  let found = { key: 0, remote: 0, sock: 0, specs: 0 }, obs = [], items = [], nextSpawn = 0, joke = "", fact = null;
  let boss = null, power = 0, dblUsed = false, treasureSpawned = false;
  let parts = [], shake = 0, toast = null, flash = 0;
  let easy = store.get("robodad.dadquest.easy") === "1";
  let twoP = null;                                // { turn: 1|2, scores: [a, b] }
  let bonus = null;                               // { kind, lang, qs, i, right, phase, timer, blocks, after }
  let shareBlob = null, sel = 0, btns = [];
  const P = { x: 40, y: GY - 22, vy: 0, duck: false, duckT: 0, frame: 0, ft: 0, air: false };
  let best = parseInt(store.get("robodad.dadquest.best") || "0", 10) || 0;
  const mult = () => easy ? 0.75 : 1;

  let shownAt = 0;
  function setState(s){ state = s; sel = 0; shownAt = t; }
  function room(){ return ROOMS[endless ? Math.floor(dist / 2500) % 3 : level]; }
  function resetRun(keepScore){
    obs = []; items = []; parts = []; dist = 0; nextSpawn = 60; inv = 0; boss = null; power = 0; treasureSpawned = false;
    P.y = GY - 22; P.vy = 0; P.duck = false; P.duckT = 0; P.air = false;
    maxLives = easy ? 5 : 3;
    if (!keepScore) { score = 0; lives = maxLives; runItems = 0; found = { key: 0, remote: 0, sock: 0, specs: 0 }; }
    speed = (endless ? 2.6 : ROOMS[level].speed) * mult();
  }
  function start(lv, isEndless, keep){
    level = lv; endless = !!isEndless; resetRun(keep ?? (lv > 0 && !isEndless)); shareBlob = null; setState("play");
    say((twoP ? `Player ${twoP.turn}. ` : "") + (endless ? "Endless mode" : ROOMS[lv].name) + ". Go!");
  }
  function unlockSkin(id){
    if (skinOwned(id)) return;
    store.set("robodad.dadquest.skin." + id, "1");
    showToast("NEW DAD UNLOCKED: " + SKINS[id].name.toUpperCase() + "!");
    say("New dad unlocked: " + SKINS[id].name + ". Pick him on the title screen.");
  }
  function showToast(msg, c = "#F5C518"){ toast = { msg, c, t: 170 }; }
  function saveBest(){ if (Math.floor(score) > best) { best = Math.floor(score); store.set("robodad.dadquest.best", String(best)); return true; } return false; }

  // ---------- juice ----------
  function burst(px, py, n, colors, spread = 1.6, up = 1.4, life = 26){
    for (let i = 0; i < n; i++) parts.push({ x: px, y: py, vx: (Math.random() - 0.5) * spread * 2, vy: -Math.random() * up * 2, life, max: life, c: pick(colors), g: 0.08 });
  }
  const dust = () => { for (let i = 0; i < 6; i++) parts.push({ x: P.x + 4 + Math.random() * 6, y: GY - 1, vx: -0.6 - Math.random() * 1.2, vy: -Math.random() * 0.8, life: 18, max: 18, c: "rgba(230,225,210,.8)", g: 0.02 }); };
  const sparkle = (px, py, big) => burst(px, py, big ? 22 : 10, ["#F5C518", "#FFF6D6", "#FF4D6D", "#7FD1FF"], big ? 2.2 : 1.4, big ? 1.8 : 1.2, big ? 40 : 24);

  function spawn(){
    const r = room(), gap = 70 + Math.random() * 90;
    nextSpawn = dist + gap * (speed / 2);
    // the room's treasure: once per visit, past halfway, above a washing line
    if (!endless && !treasureSpawned && dist > r.length * 0.55) {
      treasureSpawned = true;
      obs.push({ t: "shirt", x: W + 10, y: GY - 34, w: 14, h: 18, c: "#FFFFFF" });
      items.push({ k: "treasure", ti: level, x: W + 13, y: GY - 60, w: 8, h: 8 });
      nextSpawn = dist + 150;
      return;
    }
    const roll = Math.random();
    if (roll < 0.42) obs.push({ t: "brick", x: W + 10, y: GY - 7, w: 12, h: 7, c: pick(BRICK) });
    else if (roll < 0.7) obs.push({ t: "shirt", x: W + 10, y: GY - 34, w: 14, h: 18, c: pick(["#4FC3F7", "#FF8A65", "#AED581", "#FFFFFF"]) });
    else if (roll < 0.82 && r.cat) obs.push({ t: "cat", x: W + 10, y: GY - 9, w: 14, h: 9 });
    else if (roll < 0.86 && power <= 0) items.push({ k: "mug", x: W + 10, y: GY - 30, w: 8, h: 8 });
    else items.push({ k: pick(ITEM_IDS), x: W + 10, y: Math.random() < 0.5 ? GY - 12 : GY - 40, w: 8, h: 8 });
    if (Math.random() < 0.35) items.push({ k: pick(ITEM_IDS), x: W + 60, y: GY - 44, w: 8, h: 8 });
  }
  const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  // ---------- input ----------
  const onGround = () => P.y >= GY - (P.duck ? 14 : 22) - 0.01;
  function jump(){
    if (state !== "play" && state !== "bonus") return;
    if (onGround() && !P.duck) { P.vy = -5.6; dblUsed = false; sfx.jump(); }
    else if (!onGround() && power > 0 && !dblUsed) { P.vy = -5; dblUsed = true; sfx.dbl(); burst(P.x + 7, P.y + 20, 8, ["#FFF6D6", "#C79A5A"], 1.2, 0.5, 18); }
  }
  function duck(on, ms){
    if (state !== "play" && state !== "bonus") return;
    P.duck = on; P.duckT = on && ms ? ms / (1000 / 60) : 0;
    if (on && onGround()) P.y = GY - 14; else if (!on) P.y = Math.min(P.y, GY - 22);
  }
  function pause(){ if (state === "play" || state === "bonus") { pausedFrom = state; setState("paused"); } }
  let pausedFrom = "play";
  function activate(i){ const b = btns[i]; if (b && t - shownAt > 25) { sfx.click(); b.act(); } }
  function menuKey(dir){ if (btns.length) { sel = (sel + dir + btns.length) % btns.length; sfx.click(); } }
  const inMenu = () => !["play", "bonus", "locked"].includes(state);
  addEventListener("keydown", (e) => {
    if (inMenu()) {
      if (["ArrowDown", "ArrowRight", "KeyS", "KeyD"].includes(e.code)) { e.preventDefault(); menuKey(1); }
      else if (["ArrowUp", "ArrowLeft", "KeyW", "KeyA"].includes(e.code)) { e.preventDefault(); menuKey(-1); }
      else if (["Space", "Enter"].includes(e.code)) { e.preventDefault(); if (!e.repeat) activate(sel); }
      else if ((e.code === "KeyP" || e.code === "Escape") && state === "paused") setState(pausedFrom);
      return;
    }
    if (["Space", "ArrowUp", "KeyW"].includes(e.code)) { e.preventDefault(); if (!e.repeat) jump(); }
    else if (["ArrowDown", "KeyS"].includes(e.code)) { e.preventDefault(); duck(true); }
    else if (e.code === "KeyP" || e.code === "Escape") pause();
  });
  addEventListener("keyup", (e) => { if (["ArrowDown", "KeyS"].includes(e.code)) duck(false); });
  const wrap = document.getElementById("wrap");
  let ty = 0, tt = 0;
  const toCanvas = (e) => { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; };
  wrap.addEventListener("pointerdown", (e) => { ty = e.clientY; tt = performance.now(); if (ac && ac.state === "suspended") ac.resume(); });
  wrap.addEventListener("pointerup", (e) => {
    const p = toCanvas(e);
    if (inMenu()) { const i = btns.findIndex(b => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y - 2 && p.y <= b.y + b.h + 2); if (i >= 0) { sel = i; activate(i); } return; }
    if ((state === "play" || state === "bonus") && p.x > W - 26 && p.y > 15 && p.y < 34) return pause();   // pause button
    const dy = e.clientY - ty;
    if (dy > 30 && performance.now() - tt < 600) duck(true, 650); else jump();
  });
  document.addEventListener("visibilitychange", () => { if (document.hidden) pause(); });

  // ---------- update ----------
  function hurt(){
    lives--; inv = 90; sfx.hit(); shake = 14; flash = 6; buzz(lives <= 0 ? [60, 40, 120] : 70);
    burst(P.x + 7, P.y + 10, 12, ["#FF4D6D", "#FFF6D6"], 1.8, 1.4, 22);
    if (lives > 0) return false;
    joke = pick(JOKES); fact = Math.random() < 0.4 ? pick(FACTS) : null;
    if (twoP) {
      twoP.scores[twoP.turn - 1] = Math.floor(score); saveBest();
      setState(twoP.turn === 1 ? "pass" : "versus");
      say(twoP.turn === 1 ? `Player 1 scored ${Math.floor(score)}. Pass to Player 2.` : "Both players done.");
      return true;
    }
    saveBest(); setState("over"); makeShare();
    say("Game over. " + joke + (fact ? " Dad fact: " + fact.f : ""));
    return true;
  }
  function physics(){
    P.ft++; if (P.ft > 7) { P.ft = 0; P.frame ^= 1; }
    if (P.duckT > 0 && --P.duckT <= 0) duck(false);
    const wasAir = P.air, fallV = P.vy;
    if (!P.duck || !onGround()) { P.vy += 0.35; P.y += P.vy; }
    const floor = GY - (P.duck ? 14 : 22);
    if (P.y > floor) { P.y = floor; P.vy = 0; }
    P.air = !onGround();
    if (wasAir && !P.air && fallV > 2) dust();
  }
  function update(){
    if (shake > 0) shake--; if (flash > 0) flash--;
    if (toast && --toast.t <= 0) toast = null;
    for (const p of parts) { p.x += p.vx; p.y += p.vy; p.vy += p.g; p.life--; }
    parts = parts.filter(p => p.life > 0);
    if (state === "bonus") return updateBonus();
    if (state !== "play") return;
    const r = room();
    if (endless) speed = Math.min(5, 2.6 + dist / 6000) * mult();
    dist += speed; score += speed * 0.05;
    if (power > 0) power--;
    physics();
    if (!boss && dist >= nextSpawn && (endless || dist < r.length - 200)) spawn();
    // reaching the end of a room wakes its boss
    if (!endless && !boss && dist >= r.length && obs.length === 0) {
      const B = BOSSES[r.boss]; boss = { kind: r.boss, name: B.name, attacks: B.attacks, i: 0, warn: 70, intro: 90 };
      sfx.warn(); say(`Boss! ${B.name}. Jump the low ones, duck the high ones.`);
    }
    if (boss) updateBoss();
    for (const o of obs) { o.x -= o.sp ? speed * o.sp : speed; if (o.wob !== undefined) o.y += Math.sin((t + o.x) / 6) * 0.25; }
    for (const it of items) it.x -= speed;
    obs = obs.filter(o => o.x > -40); items = items.filter(i => i.x > -20 && !i.got);
    const box = { x: P.x + 2, y: P.y + 1, w: 10, h: (P.duck ? 13 : 21) };
    if (inv > 0) inv--;
    else for (const o of obs) if (hit(box, o)) { if (hurt()) return; break; }
    for (const it of items) if (!it.got && hit(box, it)) {
      it.got = true;
      if (it.k === "mug") { power = 360; sfx.power(); sparkle(it.x + 4, it.y + 4); showToast("COFFEE! DOUBLE JUMP", "#FFF6D6"); say("Coffee! Double jump for a few seconds."); }
      else if (it.k === "treasure") {
        const T0 = TREASURES[it.ti]; score += 1000; sfx.treasure(); sparkle(it.x + 4, it.y + 4, true); buzz(40);
        if (!treasureFound(it.ti)) { store.set("robodad.dadquest.treasure." + T0.id, "1"); showToast("TREASURE: " + T0.name.toUpperCase() + "!"); }
        else showToast("+1000 " + T0.name.toUpperCase());
        say("Treasure found: " + T0.name + ".");
      }
      else { found[it.k]++; runItems++; score += 100; sfx.item(); sparkle(it.x + 4, it.y + 4); if (runItems >= 30) unlockSkin("grill"); }
    }
  }
  function updateBoss(){
    const b = boss;
    if (b.intro > 0) { b.intro--; return; }
    if (b.i < b.attacks.length) {
      // the next attack waits until the last one has passed Dad
      if (b.waiting) { if (obs.every(o => o.x < P.x - 20)) { b.waiting = false; b.warn = 70; } else return; }
      if (b.warn > 0) { if (--b.warn === 40 || b.warn === 20) sfx.warn(); return; }
      const [hgt, sp, n] = b.attacks[b.i];
      obs.push(bossShot(b.kind, hgt, sp * mult()));
      if (n === 2) { const s2 = bossShot(b.kind, hgt, sp * mult()); s2.x += 70; obs.push(s2); }
      b.i++; b.waiting = true;
      return;
    }
    if (obs.length) return;
    if (!b.done) {                                     // all attacks dodged
      b.done = true; sfx.win(); shake = 8; buzz([30, 30, 30]); sparkle(W - 40, GY - 30, true); score += 500;
      say(b.name + " beaten!");
      if (b.kind === "roomba") { unlockSkin("mullet"); store.set("robodad.dadquest.bonus", "1"); }
      b.outro = 80; return;
    }
    if (--b.outro > 0) return;
    boss = null;
    if (level >= ROOMS.length - 1) {
      saveBest(); store.set("robodad.dadquest.cleared", "1"); unlockSkin("track"); setState("win"); makeShare();
      say("You found everything. You win!");
    } else { setState("level"); say(ROOMS[level].name + " cleared. Next room, or try a bonus room."); }
  }

  // ---------- bonus room ----------
  function startBonus(kind, lang, after){
    resetRun(after === "next");
    const qs = []; while (qs.length < 5) { const q = kind === "math" ? mathQ() : wordQ(lang); if (!qs.some(o => o.q === q.q)) qs.push(q); }
    bonus = { kind, lang, qs, i: 0, right: 0, phase: "ask", timer: 50, blocks: [], msg: "", after };
    speed = 1.8 * mult(); setState("bonus");
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
      const box = { x: P.x + 2, y: P.y + 1, w: 10, h: P.duck ? 13 : 21 };
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
      const r = ROOMS[Math.min(level, 2)];
      R(0, 0, 270, 480, "#0B0B14"); R(0, 300, 270, 180, r.sky);
      for (let i = 0; i < 23; i++) R(i * 12, 420, 12, 60, i % 2 ? r.floorA : r.floorB);
      R(10, 10, 250, 2, "#F5C518"); R(10, 468, 250, 2, "#F5C518");
      text("DAD QUEST", 135, 36, 30, "#F5C518");
      text("I scored", 135, 92, 12, "#9A93B8");
      text(String(Math.floor(twoP ? Math.max(...twoP.scores) : score)), 135, 110, 36, "#FFF6D6");
      text(`${found.key} keys · ${found.remote} remotes`, 135, 160, 10); text(`${found.sock} socks · ${found.specs} glasses`, 135, 176, 10);
      text("Treasures " + treasureCount() + "/3", 135, 196, 10, "#7FD1FF");
      text("Can you beat me?", 135, 230, 14, "#FF4D6D");
      x.save(); x.translate(105, 300); x.scale(4, 4); drawDad(0, 7, 0, false, false, false); x.restore();
      [["key", 22, 380], ["remote", 56, 366], ["sock", 190, 380], ["specs", 222, 366]].forEach(([k, px, py]) => { x.save(); x.translate(px, py); x.scale(3, 3); ITEMS[k].draw(0, 0); x.restore(); });
      text("robodad.app", 135, 444, 14, "#0B0B14");
      x = keep;
      const big = document.createElement("canvas"); big.width = 1080; big.height = 1920;
      const bx = big.getContext("2d"); bx.imageSmoothingEnabled = false; bx.drawImage(c, 0, 0, 1080, 1920);
      big.toBlob((bl) => { shareBlob = bl; }, "image/png");
    } catch { x = main; }
  }
  async function share(){
    if (!shareBlob) { showToast("ONE SEC, DRAWING YOUR CARD…", "#FFF6D6"); return; }
    const file = new File([shareBlob], "dad-quest-score.png", { type: "image/png" });
    const msg = `I scored ${Math.floor(score)} in DAD QUEST on RoboDad. Can you beat me? https://robodad.app`;
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text: msg }); return; }
    } catch (e) { if (e && e.name === "AbortError") return; }
    const a = document.createElement("a"); a.href = URL.createObjectURL(shareBlob); a.download = "dad-quest-score.png";
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    showToast("SAVED! POST IT TO YOUR STORY", "#FFF6D6");
  }

  // ---------- draw ----------
  function drawRoom(r, off){
    R(0, 0, W, H, r.sky); r.deco(off);
    for (let i = -1; i < W / 12 + 2; i++) { const fx = i * 12 - (off % 24); R(fx, GY, 12, H - GY, ((i + Math.floor(off / 12)) % 2) ? r.floorA : r.floorB); }
    R(0, GY, W, 1, "rgba(0,0,0,.4)");
  }
  function heart(px, py, c){ R(px, py, 3, 3, c); R(px + 4, py, 3, 3, c); R(px, py + 2, 7, 3, c); R(px + 1, py + 5, 5, 1, c); R(px + 2, py + 6, 3, 1, c); }
  function hud(){
    for (let i = 0; i < maxLives; i++) heart(8 + i * 10, 8, i < lives ? "#FF4D6D" : "#3A3560");
    let ix = 14 + maxLives * 10;
    if (state === "bonus" || (state === "paused" && pausedFrom === "bonus")) { text("Score " + Math.floor(score), ix, 8, 7, "#F5C518", "left"); }
    else for (const k of ITEM_IDS) { ITEMS[k].draw(ix, 7); text(String(found[k]), ix + 11, 8, 7, "#FFF6D6", "left"); ix += 22; }
    text(String(Math.floor(score)).padStart(5, "0"), W - 8, 8, 8, "#F5C518", "right");
    // pause button
    R(W - 20, 20, 12, 11, "rgba(11,11,20,.6)"); R(W - 17, 22, 2, 7, "#FFF6D6"); R(W - 13, 22, 2, 7, "#FFF6D6");
    if (power > 0) { drawMug(8, 19); R(20, 23, 40, 3, "#3A3560"); R(20, 23, 40 * power / 360, 3, "#FFF6D6"); }
    if (state === "bonus" || (state === "paused" && pausedFrom === "bonus")) return;
    if (boss) {
      text(boss.name, W / 2, 20, 8, "#FF4D6D");
      for (let i = 0; i < boss.attacks.length; i++) R(W / 2 - boss.attacks.length * 5 + i * 10, 31, 8, 3, i < boss.attacks.length - boss.i ? "#FF4D6D" : "#3A3560");
    } else if (!endless) { const r = room(); R(W / 2 - 40, 22, 80, 3, "#3A3560"); R(W / 2 - 40, 22, Math.min(80, 80 * dist / r.length), 3, "#F5C518"); text(r.name, W / 2, 27, 7, "#9A93B8"); }
    else text(twoP ? "PLAYER " + twoP.turn : "ENDLESS", W / 2, 22, 7, "#F5C518");
  }
  function bossWarning(){
    const b = boss; if (!b || b.done || b.i >= b.attacks.length || b.waiting) return;
    if (b.intro > 0) {
      panelAt(70, 46, 180, 40); text("BOSS!", W / 2, 52, 12, "#FF4D6D"); text(b.name, W / 2, 68, 8, "#F5C518"); return;
    }
    const hgt = b.attacks[b.i][0], wy = hgt === "low" ? GY - 14 : GY - 32;
    if ((t >> 3) % 2) { R(W - 14, wy - 2, 10, 14, "#FF4D6D"); text("!", W - 9, wy, 10, "#FFF6D6"); }
    text(hgt === "low" ? "JUMP!" : "DUCK!", W - 30, wy + 1, 7, "#FF4D6D", "right");
    // the boss peeks in
    const peek = bossShot(b.kind, hgt, 0); peek.x = W - 2 - Math.min(16, (70 - b.warn) / 2); DRAW_OBS[peek.t](peek);
  }
  function panelAt(px, py, w, h){ R(px, py, w, h, "rgba(11,11,20,.9)"); R(px, py, w, 2, "#F5C518"); R(px, py + h - 2, w, 2, "#F5C518"); }
  function panel(h){ panelAt(24, (H - h) / 2, W - 48, h); }
  // buttons: rows of labelled boxes, built fresh every frame for the current screen
  function menu(list, y, cols = 1, w = 120, h = 12, gap = 4){
    const rows = Math.ceil(list.length / cols), base = btns.length;
    list.forEach((b, i) => {
      const r = Math.floor(i / cols), c = i % cols, inRow = Math.min(cols, list.length - r * cols);
      const bx = W / 2 - (inRow * w + (inRow - 1) * gap) / 2 + c * (w + gap), by = y + r * (h + gap);
      const on = base + i === sel;
      R(bx, by, w, h, on ? "#F5C518" : "rgba(58,53,96,.9)");
      if (b.lock) R(bx, by, w, h, "rgba(11,11,20,.4)");
      text(b.label, bx + w / 2, by + (h - 8) / 2 + 1, 7, on ? "#0B0B14" : (b.lock ? "#6E6890" : "#FFF6D6"));
      btns.push({ x: bx, y: by, w, h, act: b.act });
    });
    return y + rows * (h + gap);
  }
  function draw(){
    t++;
    x.save();
    if (shake > 0) x.translate(Math.round((Math.random() - 0.5) * shake * 0.4), Math.round((Math.random() - 0.5) * shake * 0.4));
    const idle = ["title", "locked", "skins", "bonusPick"].includes(state);
    const inBonus = state === "bonus" || state === "bonusEnd" || (state === "paused" && pausedFrom === "bonus");
    const r = idle ? ROOMS[0] : inBonus ? STUDY_ROOM : room();
    drawRoom(r, idle ? t * 0.6 : dist);
    for (const it of items) {
      const by = it.y + Math.sin((t + it.x) / 8);
      if (it.k === "mug") drawMug(it.x, by);
      else if (it.k === "treasure") { if ((t >> 2) % 3) R(it.x - 2, by - 2, 12, 12, "rgba(245,197,24,.25)"); TREASURES[it.ti].draw(it.x, by); }
      else ITEMS[it.k].draw(it.x, by);
    }
    for (const o of obs) DRAW_OBS[o.t](o);
    if (inBonus && bonus) for (const bl of bonus.blocks) {
      const c = bl.state === 1 ? "#27AE60" : bl.state === 2 ? "#E3342F" : bl.state === 3 ? "#3A3560" : "#F5C518";
      R(bl.x, bl.y, bl.w, bl.h, c); R(bl.x, bl.y + bl.h - 2, bl.w, 2, "rgba(0,0,0,.3)"); R(bl.x + 1, bl.y + 1, bl.w - 2, 1, "rgba(255,255,255,.35)");
      text(bl.label, bl.x + bl.w / 2, bl.y + 2, bl.label.length > 9 ? 6 : 7, bl.state === 0 ? "#0B0B14" : "#FFF6D6");
    }
    if (state !== "locked") drawDad(P.x, P.y, P.frame, P.duck, P.air, inv > 0 && Math.floor(inv / 5) % 2 === 0);
    if (power > 0 && (t >> 2) % 2) R(P.x + 1, P.y - 3, 12, 1, "rgba(255,246,214,.6)");
    for (const p of parts) { x.globalAlpha = Math.max(0, p.life / p.max); R(p.x, p.y, p.life > p.max / 2 ? 2 : 1, p.life > p.max / 2 ? 2 : 1, p.c); }
    x.globalAlpha = 1;
    if (state === "play" || state === "bonus" || state === "paused") hud();
    if (state === "play") bossWarning();
    if (boss && boss.done && boss.outro > 0) { panelAt(70, 50, 180, 36); text(boss.name, W / 2, 56, 8, "#9A93B8"); text("BEATEN! +500", W / 2, 70, 10, "#F5C518"); }
    if (inBonus && bonus && (state === "bonus" || state === "paused")) {
      const q = bonus.qs[Math.min(bonus.i, 4)];
      panelAt(60, 36, 200, 46);
      text(`${bonus.kind === "math" ? "MATHS" : WORDS[bonus.lang].name.toUpperCase()} ROOM · ${Math.min(bonus.i + 1, 5)}/5`, W / 2, 42, 7, "#9A93B8");
      text(q.q, W / 2, 52, 9, "#FFF6D6");
      if (bonus.msg) text(bonus.msg, W / 2, 68, 8, bonus.msg.startsWith("CORRECT") ? "#27AE60" : "#FF8A65");
      else text("Jump into the right answer", W / 2, 68, 7, "#9A93B8");
    }
    if (flash > 0) R(0, 0, W, H, "rgba(255,77,109,.12)");
    x.restore();
    btns = [];
    screens();
    if (sel >= btns.length) sel = 0;
    if (toast) { const a = Math.min(1, toast.t / 20); x.globalAlpha = a; panelAt(40, H - 26, W - 80, 16); text(toast.msg, W / 2, H - 21, 7, toast.c); x.globalAlpha = 1; }
  }
  function screens(){
    if (state === "locked") {
      panel(96);
      text("DAD QUEST", W / 2, 50, 18, "#F5C518");
      wrapText("This cartridge is still lost. Find it in RoboDad's secret hunt, The Lost Cartridge, to play.", W / 2, 78, 230, 8, "#FFF6D6");
      text("Hint: try the secret code box in the menu.", W / 2, 114, 7, "#9A93B8");
    } else if (state === "title") {
      panel(164);
      text("DAD QUEST", W / 2, 14, 20, "#F5C518");
      [["key", 104], ["remote", 130], ["sock", 156], ["specs", 182]].forEach(([k, px]) => ITEMS[k].draw(px + 10, 38));
      const bonusOpen = store.get("robodad.dadquest.skin.mullet") === "1" || store.get("robodad.dadquest.bonus") === "1";
      menu([
        { label: "START", act: () => { twoP = null; start(0); } },
        { label: "2 PLAYERS", act: () => { twoP = { turn: 1, scores: [0, 0] }; start(0, true, false); } },
        { label: "DAD: " + SKINS[skin].name.toUpperCase(), act: () => setState("skins") },
        { label: bonusOpen ? "BONUS ROOMS" : "BONUS ROOMS 🔒", lock: !bonusOpen, act: () => bonusOpen ? setState("bonusPick") : showToast("CLEAR THE KITCHEN TO OPEN BONUS ROOMS", "#FFF6D6") },
        { label: "EASY MODE: " + (easy ? "ON" : "OFF"), act: () => { easy = !easy; store.set("robodad.dadquest.easy", easy ? "1" : "0"); } },
      ], 52, 1, 130, 12, 3);
      text(`Best ${best}  ·  Treasures ${treasureCount()}/3`, W / 2, 132, 7, "#9A93B8");
      text("P.S. Did you text your parent back?", W / 2, 144, 7, "#9A93B8");
    } else if (state === "skins") {
      panel(150);
      text("PICK YOUR DAD", W / 2, 22, 12, "#F5C518");
      SKIN_IDS.forEach((id, i) => {
        const px = 52 + i * 60, own = skinOwned(id);
        R(px - 6, 44, 34, 40, id === skin ? "rgba(245,197,24,.25)" : "rgba(58,53,96,.6)");
        if (own) { x.save(); x.translate(px, 52); drawDad(0, 7, (t >> 4) % 2, false, false, false, id); x.restore(); }
        else { R(px + 2, 56, 10, 12, "#3A3560"); text("?", px + 7, 58, 8, "#9A93B8"); }
      });
      menu(SKIN_IDS.map(id => ({ label: skinOwned(id) ? (id === skin ? "✓ " : "") + SKINS[id].name.split(" ")[0].toUpperCase() : "LOCKED", lock: !skinOwned(id),
        act: () => { if (skinOwned(id)) { skin = id; store.set("robodad.dadquest.skin", id); } else showToast(SKINS[id].how.toUpperCase(), "#FFF6D6"); } })), 88, 4, 56, 12, 4);
      const hov = SKIN_IDS[sel] ? SKINS[SKIN_IDS[sel]] : null;
      if (hov) text(skinOwned(SKIN_IDS[sel]) ? hov.name : "To unlock: " + hov.how, W / 2, 108, 7, "#9A93B8");
      menu([{ label: "BACK", act: () => setState("title") }], 124, 1, 80);
    } else if (state === "bonusPick") {
      panel(120);
      text("BONUS ROOMS", W / 2, 38, 12, "#F5C518");
      text("Jump into the block with the right answer", W / 2, 54, 7, "#9A93B8");
      menu([
        { label: "MATHS ROOM", act: () => startBonus("math", null, "title") },
        { label: "FRENCH ROOM", act: () => startBonus("word", "fr", "title") },
        { label: "HINDI ROOM", act: () => startBonus("word", "hi", "title") },
        { label: "BACK", act: () => setState("title") },
      ], 68, 1, 120, 12, 3);
    } else if (state === "level") {
      panel(110);
      text(ROOMS[level].name.toUpperCase() + " CLEARED!", W / 2, 44, 12, "#F5C518");
      text("Next: the " + ROOMS[level + 1].name.toLowerCase(), W / 2, 64, 8);
      const offer = level === 0 ? { label: "MATHS BONUS ROOM", act: () => startBonus("math", null, "next") }
        : { label: (lastLang === "fr" ? "HINDI" : "FRENCH") + " BONUS ROOM", act: () => { lastLang = lastLang === "fr" ? "hi" : "fr"; startBonus("word", lastLang, "next"); } };
      menu([{ label: "NEXT ROOM", act: () => start(level + 1) }, offer], 80, 1, 140, 12, 4);
      text("Bonus rooms are worth up to +1500", W / 2, 116, 7, "#9A93B8");
    } else if (state === "bonusEnd") {
      panel(124);
      const b = bonus, L = b.kind === "math" ? "math" : WORDS[b.lang].link;
      text("BONUS ROOM DONE", W / 2, 34, 12, "#F5C518");
      text(`${b.right} / 5 right${b.right === 5 ? "  ·  PERFECT +500" : ""}`, W / 2, 52, 9, b.right >= 4 ? "#27AE60" : "#FFF6D6");
      text(b.right >= 4 ? "Look at you. Smarter than your old man." : "Practice makes better. Not perfect. Better.", W / 2, 66, 7, "#9A93B8");
      menu([
        { label: b.after === "next" ? "NEXT ROOM" : "MENU", act: () => { if (b.after === "next") start(level + 1, false, true); else setState("title"); } },
        { label: b.kind === "math" ? "PRACTISE MATHS WITH DAD" : "LEARN MORE " + WORDS[b.lang].name.toUpperCase(), act: () => { location.href = "/?learn=" + L; } },
      ], 82, 1, 160, 12, 4);
    } else if (state === "over") {
      panel(fact ? 150 : 124);
      const top = fact ? 20 : 34;
      text("GAME OVER", W / 2, top, 14, "#FF4D6D");
      let y = wrapText("“" + joke + "”", W / 2, top + 20, 240, 7, "#FFF6D6", 9);
      if (fact) { R(50, y, W - 100, 1, "#3A3560"); text("DAD FACT", W / 2, y + 4, 7, "#F5C518"); y = wrapText(fact.f, W / 2, y + 14, 230, 7, "#FFF6D6", 9); }
      text("Score " + Math.floor(score) + "  ·  Best " + best, W / 2, y + 2, 8, "#F5C518");
      const list = [{ label: "AGAIN", act: () => start(endless ? 0 : level, endless, false) }, { label: "SHARE", act: share }];
      if (fact) list.push({ label: "ASK DAD", act: () => { location.href = "/?ask=" + encodeURIComponent(fact.ask); } });
      list.push({ label: "MENU", act: () => setState("title") });
      menu(list, y + 16, list.length, 56, 12, 4);
    } else if (state === "win") {
      panel(130);
      text("YOU FOUND EVERYTHING!", W / 2, 32, 12, "#F5C518");
      text(`${found.key} keys · ${found.remote} remotes · ${found.sock} socks · ${found.specs} glasses`, W / 2, 52, 7);
      text("Treasures found: " + treasureCount() + "/3", W / 2, 64, 7, "#7FD1FF");
      wrapText("Dad can finally sit down. Then he'll lose the remote again.", W / 2, 78, 230, 7);
      text("Score " + Math.floor(score), W / 2, 100, 8, "#F5C518");
      menu([{ label: "ENDLESS", act: () => start(0, true) }, { label: "SHARE", act: share }, { label: "MENU", act: () => setState("title") }], 116, 3, 70);
    } else if (state === "paused") {
      panel(84); text("PAUSED", W / 2, 54, 12, "#F5C518");
      menu([
        { label: "RESUME", act: () => setState(pausedFrom) },
        { label: "RESTART", act: () => { if (pausedFrom === "bonus") startBonus(bonus.kind, bonus.lang, bonus.after); else start(0, endless, false); } },
        { label: "QUIT TO MENU", act: () => { twoP = null; boss = null; setState("title"); } },
      ], 72, 1, 110, 12, 3);
    } else if (state === "pass") {
      panel(100);
      text("PLAYER 1: " + twoP.scores[0], W / 2, 50, 12, "#F5C518");
      text("Pass the phone to Player 2", W / 2, 72, 8);
      text("No peeking at the controls. Okay, peek a little.", W / 2, 86, 7, "#9A93B8");
      menu([{ label: "PLAYER 2, GO!", act: () => { twoP.turn = 2; start(0, true, false); } }], 104, 1, 120);
    } else if (state === "versus") {
      panel(124);
      const [a, b] = twoP.scores, win = a === b ? 0 : a > b ? 1 : 2;
      text(win ? `PLAYER ${win} WINS!` : "IT'S A TIE!", W / 2, 36, 14, "#F5C518");
      text(`Player 1: ${a}`, W / 2 - 50, 60, 8, win === 1 ? "#27AE60" : "#FFF6D6"); text(`Player 2: ${b}`, W / 2 + 50, 60, 8, win === 2 ? "#27AE60" : "#FFF6D6");
      wrapText(win ? "Winner picks what's for dinner. Loser does the dishes. Those are the rules." : "A tie! Settle it the dad way: rock, paper, scissors.", W / 2, 76, 230, 7, "#9A93B8", 9);
      menu([{ label: "REMATCH", act: () => { twoP = { turn: 1, scores: [0, 0] }; start(0, true, false); } }, { label: "MENU", act: () => { twoP = null; setState("title"); } }], 106, 2, 80);
    }
  }
  let lastLang = Math.random() < 0.5 ? "fr" : "hi";

  // test hook, only when a tester switches it on in this browser
  if (store.get("robodad.dadquest.debug") === "1") window.__DQ = {
    s: () => ({ state, level, dist: Math.floor(dist), lives, score: Math.floor(score), boss: boss && boss.name, bi: boss && boss.i, bonus: bonus && bonus.i, right: bonus && bonus.right, sel, nbtn: btns.length, power, skin }),
    go: (d) => { dist = d; obs = []; }, god: () => { lives = 99; maxLives = 5; }, mug: () => { power = 360; },
    blocks: () => bonus ? bonus.blocks.map(b => ({ l: b.label, x: Math.round(b.x) })) : [], answer: () => bonus && bonus.qs[bonus.i] && bonus.qs[bonus.i].a, dad: () => ({ x: P.x, y: P.y }),
  };

  // fixed 60 updates per second, whatever the screen's refresh rate
  let last = performance.now(), acc = 0;
  function loop(now){
    acc += Math.min(100, now - last); last = now;
    while (acc >= 1000 / 60) { update(); acc -= 1000 / 60; }
    draw(); requestAnimationFrame(loop);
  }
  say(unlocked ? "DAD QUEST. Use the arrow keys or tap to choose, Space to start." : "DAD QUEST is locked. Find the cartridge in the secret hunt.");
  requestAnimationFrame(loop);
})();
