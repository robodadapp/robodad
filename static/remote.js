/* Remote Hunt: Dad has lost the TV remote. A hide-and-seek game for the RoboDad Mall Arcade.
   Ten hiding spots, four looks per round, five rounds. Dad says warmer or colder after each miss.
   Tickets are paid through RoboArcade (see arcade.js) when the game ends. */
(function(){
  "use strict";
  const ROUNDS = 5, LOOKS = 4;
  // x and y are percentages of the room; "miss" is what you find instead of the remote
  const SPOTS = [
    { id: "cushL", short: "Left cushion",  label: "Left couch cushion",  x: 24, y: 63, miss: "A sock. Not even a pair." },
    { id: "cushR", short: "Right cushion",  label: "Right couch cushion", x: 52, y: 57, miss: "Eleven coins and a crumb museum." },
    { id: "table", short: "Table",  label: "Under the coffee table", x: 50, y: 88, miss: "A stack of old magazines and a dusty dog toy." },
    { id: "plant", short: "Plant",  label: "Behind the plant",    x: 88, y: 82, miss: "Dirt. The plant is not thrilled." },
    { id: "shelf", short: "Shelf",  label: "Bookshelf",           x: 14, y: 40, miss: "Dad's old paperbacks. No remote." },
    { id: "chair", short: "Recliner",  label: "Dad's recliner",      x: 86, y: 59, miss: "A blanket, a mug, and a very warm seat." },
    { id: "lamp", short: "Lamp",   label: "Beside the lamp",     x: 72, y: 42, miss: "A phone charger that charges nothing." },
    { id: "toys", short: "Toy box",   label: "Toy box",             x: 11, y: 85, miss: "Building bricks. Dad stepped on one earlier." },
    { id: "pizza", short: "Pizza box",  label: "Pizza box on the floor", x: 79, y: 96, miss: "Cold crust. Dad is tempted anyway." },
    { id: "rug", short: "Rug",    label: "Under the rug edge",  x: 50, y: 77, miss: "Flat as a pancake. Nothing here." },
  ];
  const $ = (id) => document.getElementById(id);
  const room = $("room"), sayEl = $("say"), rndEl = $("rnd"), leftEl = $("left"), gotEl = $("got"), again = $("again"), nextBtn = $("nextBtn");
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  };
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const dist = (a, b) => Math.hypot((a.x - b.x) * 3.6, (a.y - b.y) * 3.0);   // roughly screen units

  let round, looksLeft, hiding, found, points, lastDist, over;
  const btns = SPOTS.map((s) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "spot"; b.style.left = s.x + "%"; b.style.top = s.y + "%";
    b.setAttribute("aria-label", "Look: " + s.label); b.textContent = s.short;
    b.addEventListener("click", () => look(s, b));
    room.appendChild(b);
    return b;
  });

  function say(t) { sayEl.textContent = t; }
  function hud() { rndEl.textContent = Math.min(round, ROUNDS); leftEl.textContent = looksLeft; gotEl.textContent = found; }
  function clearSpots() { btns.forEach((b, i) => { b.className = "spot"; b.disabled = false; b.textContent = SPOTS[i].short; b.setAttribute("aria-label", "Look: " + SPOTS[i].label); }); }

  function startRound() {
    let next; do { next = pick(SPOTS); } while (hiding && next.id === hiding.id);
    hiding = next; looksLeft = LOOKS; lastDist = null; clearSpots(); nextBtn.hidden = true;
    say(round === 1 ? "Somebody moved the remote again. Start looking." : "Round " + round + ". It is somewhere new. It is always somewhere new.");
    hud();
  }
  function newGame() {
    round = 1; found = 0; points = 0; over = false; hiding = null; again.hidden = true;
    startRound();
  }
  function lockAll() { btns.forEach((b) => { b.disabled = true; }); }

  function look(spot, btn) {
    if (over || btn.classList.contains("seen") || looksLeft <= 0) return;
    looksLeft--;
    btn.classList.add("seen");
    window.RoboSfx?.play("rummage");
    if (spot.id === hiding.id) {
      btn.classList.add("found"); btn.textContent = "REMOTE!"; btn.setAttribute("aria-label", spot.label + ": the remote");
      const used = LOOKS - looksLeft, p = 6 - used;            // 5 points for a first-look find, down to 2
      points += p; found++;
      say(pick(["Ah, the remote. Exactly where I left it.", "Found it! I knew it was there the whole time.", "There it is. Nobody tell your mother."]) + " +" + p + " for you.");
      window.RoboSfx?.play("correct", { streak: found });
      lockAll(); endRound(true);
    } else {
      btn.textContent = "Nothing"; btn.setAttribute("aria-label", spot.label + ": nothing here");
      const d = dist(spot, hiding);
      const band = d < 60 ? "Burning hot." : d < 110 ? "Warm." : d < 170 ? "Cool." : "Ice cold.";
      const trend = lastDist == null ? "" : d < lastDist - 8 ? " Warmer than last time." : d > lastDist + 8 ? " Colder than last time." : " About the same as before.";
      lastDist = d;
      setTimeout(() => window.RoboSfx?.play(d < 110 ? "warm" : "cold"), 220);
      say(spot.miss + " " + band + trend);
      if (looksLeft <= 0) {
        const r = SPOTS.find((s) => s.id === hiding.id), rb = btns[SPOTS.indexOf(r)];
        rb.classList.add("found"); rb.textContent = "It was here"; rb.setAttribute("aria-label", r.label + ": the remote was here");
        say("Out of looks. It was at the " + r.label.toLowerCase() + ". Of course it was.");
        lockAll(); endRound(false);
      }
    }
    hud();
  }
  function endRound() {
    if (round >= ROUNDS) return finish();
    nextBtn.hidden = false; nextBtn.focus();
  }
  function finish() {
    over = true;
    window.RoboSfx?.play("roundDone");
    const got = window.RoboArcade ? RoboArcade.award("remote", { points }) : 0;
    const best = Math.max(points, parseInt(store.get("robodad.remote.best") || "0", 10) || 0);
    store.set("robodad.remote.best", String(best));
    say("Game over. You found " + found + " of " + ROUNDS + " remotes for " + points + " points (best " + best + ")." + (got ? " +" + got + " arcade tickets." : ""));
    again.hidden = false; again.focus(); nextBtn.hidden = true;
  }
  nextBtn.addEventListener("click", () => { round++; startRound(); });
  again.addEventListener("click", newGame);
  newGame();
  window.__remoteHunt = { hiding: () => hiding && hiding.id, state: () => ({ round, looksLeft, found, points, over }) };   // read-only peek, used by the tests
})();
