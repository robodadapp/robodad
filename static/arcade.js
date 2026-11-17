/* RoboDad Mall Arcade, step 1: tickets and the Prize Counter.
   Every game page loads this file and calls RoboArcade.award(...) when a game ends.
   Tickets, prizes and daily caps live in one localStorage key (robodad.arcade),
   so nothing leaves the phone. On the main page it also draws the arcade bar at
   the top of the Play sheet and builds the Prize Counter dialog.
   No gambling mechanics: every ticket is earned by playing, every prize has a fixed price. */
(function(){
  "use strict";
  const KEY = "robodad.arcade";
  const lsGet = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch {} };

  // ---------- the cabinets that pay tickets (more join in later steps) ----------
  const GAMES = {
    chess: { name: "Beat Dad at chess", href: "/chess" },
    tiles: { name: "Tile Talk", href: "/tiles" },
    quest: { name: "DAD QUEST", href: "/quest" },
    stack: { name: "Garage Stack", href: "/stack" },
    remote: { name: "Remote Hunt", href: "/remote" },
    // the learning cabinets: they pay a fixed number of tickets per finished game (passed in as o.tickets) and never take part in Cabinet of the Week
    brain: { name: "Brain Teasers", href: "" },
    duel: { name: "Vocab Duel", href: "" },
    grammar: { name: "Grammar with Dad", href: "" },
  };
  const BASE_CAP = 60, WEEK_CAP = 100;          // tickets per game per day
  const QUEST_POINTS_PER_TICKET = 150, STACK_LAYERS_PER_TICKET = 2;
  const DAILY_RUN_BONUS = 8;

  // ---------- the Prize Counter ----------
  const ART = {
    ball: '<circle cx="24" cy="24" r="16" fill="#E07A66"/><path d="M10 20c8 6 20 6 28 0" stroke="#fff" stroke-width="3" fill="none"/>',
    keys: '<circle cx="24" cy="11" r="6" fill="none" stroke="#B9C7D4" stroke-width="3"/><rect x="15" y="19" width="18" height="22" rx="4" fill="#4C80B8"/><rect x="20" y="25" width="8" height="8" rx="1" fill="#fff"/>',
    ring: '<circle cx="24" cy="30" r="12" fill="none" stroke="#F2B533" stroke-width="4"/><path d="M18 14l6-6 6 6-6 8z" fill="#5FBF93"/>',
    mixtape: '<rect x="6" y="12" width="36" height="24" rx="3" fill="#F2B533"/><rect x="12" y="17" width="24" height="9" rx="2" fill="#2A1E00"/><circle cx="19" cy="21.5" r="2.5" fill="#F2B533"/><circle cx="29" cy="21.5" r="2.5" fill="#F2B533"/>',
    walkman: '<rect x="9" y="8" width="30" height="34" rx="4" fill="#4C80B8"/><rect x="13" y="12" width="22" height="12" rx="2" fill="#fff"/><circle cx="19" cy="18" r="3" fill="#1A2632"/><circle cx="29" cy="18" r="3" fill="#1A2632"/><circle cx="24" cy="33" r="4" fill="#F2B533"/>',
    polaroid: '<rect x="8" y="6" width="32" height="36" rx="2" fill="#fff" stroke="#8C97A3" stroke-width="1.5"/><rect x="12" y="10" width="24" height="22" fill="#4C80B8"/>',
    pager: '<rect x="8" y="12" width="32" height="24" rx="4" fill="#B9C7D4"/><rect x="12" y="16" width="24" height="9" rx="1" fill="#5FBF93"/><circle cx="16" cy="31" r="2" fill="#4C80B8"/><circle cx="24" cy="31" r="2" fill="#4C80B8"/>',
    lava: '<path d="M16 6h16l4 36H12z" fill="#E07A66"/><circle cx="22" cy="28" r="5" fill="#F2B533"/><circle cx="28" cy="16" r="3" fill="#F2B533"/>',
    token: '<circle cx="24" cy="24" r="16" fill="#F2B533" stroke="#C99A0C" stroke-width="3"/><circle cx="24" cy="24" r="9" fill="none" stroke="#C99A0C" stroke-width="2.5"/><path d="M24 18v12M20 22h8" stroke="#C99A0C" stroke-width="2.5" stroke-linecap="round"/>',
    cart: '<path d="M10 6h28v30l-4 6H14l-4-6z" fill="#8C97A3"/><rect x="15" y="10" width="18" height="13" rx="2" fill="#2DE2E6"/><path d="M16 38v3M21 38v3M27 38v3M32 38v3" stroke="#1B2A3A" stroke-width="2"/>',
  };
  const PRIZES = [
    { id: "ball",     name: "Bouncy Ball", cost: 30,  art: "ball",     story: "Bounced off every wall in the house, and twice off the one thing Dad said not to touch." },
    { id: "keys",     name: "Keychain",    cost: 60,  art: "keys",     story: "Eleven keys on it. Dad knows what ten of them open." },
    { id: "ring",     name: "Mood Ring",   cost: 90,  art: "ring",     story: "Dad's version turns green every time he says the thermostat is fine. It is not fine." },
    { id: "mixtape",  name: "Mixtape",     cost: 120, art: "mixtape",  story: "Side A is the perfect road trip. Side B is whatever was left on the radio." },
    { id: "walkman",  name: "Walkman",     cost: 180, art: "walkman",  story: "Eats batteries for breakfast. Dad fixed its tape with a pencil, and he is still proud of it." },
    { id: "polaroid", name: "Polaroid",    cost: 240, art: "polaroid", story: "Dad waved it around for a full minute. The picture had been ready the whole time." },
    { id: "pager",    name: "Pager",       cost: 320, art: "pager",    story: "Dad's version of a text. One beep meant call him. Two beeps meant call him now." },
    { id: "lava",     name: "Lava Lamp",   cost: 400, art: "lava",     story: "Takes forty minutes to warm up and a lifetime to stop watching." },
    { id: "token",    name: "Golden Token", cost: 0, art: "token", secret: true, hint: "Find all six cartridge fragments to unlock",
      story: "Six fragments, one shiny token. Dad says it is worth a quarter. Dad is wrong." },
    { id: "cart",     name: "Blown-On Cartridge", cost: 0, art: "cart", secret: true, hint: "Solve The Lost Cartridge to unlock",
      story: "Yours for solving The Lost Cartridge. Blow on it anyway. That is how it works." },
  ];
  const BYID = Object.fromEntries(PRIZES.map((p) => [p.id, p]));

  // ---------- Lost Cartridge fragments: two milestones per cabinet ----------
  const FRAG_BONUS = 20;
  const FRAGS = [
    { id: "chess1", game: "chess", name: "Win a game of chess" },
    { id: "chess2", game: "chess", name: "Beat one of the top dads at chess" },
    { id: "tiles1", game: "tiles", name: "Win a game of Tile Talk" },
    { id: "tiles2", game: "tiles", name: "Beat one of the top dads at Tile Talk" },
    { id: "quest1", game: "quest", name: "Score 1,500 in one DAD QUEST run" },
    { id: "quest2", game: "quest", name: "Clear every room in DAD QUEST" },
  ];
  const FBYID = Object.fromEntries(FRAGS.map((f) => [f.id, f]));
  const TOP_TIER = 4;

  // ---------- DAD QUEST high-score ladder: beat each dad's score once for a bonus ----------
  const GHOSTS = [
    { id: "modern",    name: "Modern Dad",    score: 1000,  bonus: 15 },
    { id: "skater",    name: "Skater Dad",    score: 2500,  bonus: 15 },
    { id: "gamer",     name: "Gamer Dad",     score: 4500,  bonus: 20 },
    { id: "professor", name: "Professor Dad", score: 8000,  bonus: 25 },
    { id: "grandpa",   name: "Robo-Grandpa",  score: 12000, bonus: 30, secret: true },
  ];
  const GBYID = Object.fromEntries(GHOSTS.map((g) => [g.id, g]));
  const questBest = () => Math.max(0, parseInt(lsGet("robodad.dadquest.best") || "0", 10) || 0);
  const huntSolved = () => !!lsGet("robodad.hunt.done");
  const questOpen = () => !!lsGet("robodad.egg.dadquest");

  // ---------- state ----------
  const pad = (n) => (n < 10 ? "0" : "") + n;
  const dayKey = () => { const d = new Date(); return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); };
  const blank = () => ({ v: 1, tickets: 0, lifetime: 0, prizes: [], frags: [], ghosts: [], carry: {}, day: dayKey(), today: {}, dailyPaid: "" });
  function load() {
    let s;
    try { s = JSON.parse(lsGet(KEY) || "null"); } catch { s = null; }
    if (!s || typeof s !== "object") s = blank();
    s.tickets = Math.max(0, Math.floor(+s.tickets || 0));
    s.lifetime = Math.max(0, Math.floor(+s.lifetime || 0));
    s.prizes = Array.isArray(s.prizes) ? s.prizes.filter((id) => BYID[id]) : [];
    s.frags = Array.isArray(s.frags) ? s.frags.filter((id) => FBYID[id]) : [];
    s.ghosts = Array.isArray(s.ghosts) ? s.ghosts.filter((id) => GBYID[id]) : [];
    s.carry = s.carry && typeof s.carry === "object" ? s.carry : {};
    s.today = s.today && typeof s.today === "object" ? s.today : {};
    if (s.day !== dayKey()) { s.day = dayKey(); s.today = {}; }
    if (huntSolved() && !s.prizes.includes("cart")) s.prizes.push("cart");   // secret prizes are gifts, not purchases
    if (s.frags.length === FRAGS.length && !s.prizes.includes("token")) s.prizes.push("token");
    return s;
  }
  const save = (s) => { lsSet(KEY, JSON.stringify(s)); try { window.dispatchEvent(new Event("robodad-arcade")); } catch {} };

  // ---------- Cabinet of the Week: one cabinet pays double, rotating every Monday ----------
  function weekGame() {
    const list = ["chess", "tiles", "stack", "remote"].concat(questOpen() ? ["quest"] : []);
    const week = Math.floor((Date.now() / 864e5 + 3) / 7);         // weeks start on Monday
    return list[((week % list.length) + list.length) % list.length];
  }

  // ---------- earning ----------
  function award(game, o) {
    o = o || {};
    if (!GAMES[game]) return 0;
    const s = load();
    let t = 0;
    if (game === "quest") {
      const pts = Math.max(0, Math.floor(+o.points || 0)) + (+s.carry.quest || 0);
      t = Math.floor(pts / QUEST_POINTS_PER_TICKET);
      s.carry.quest = pts - t * QUEST_POINTS_PER_TICKET;
      if (o.daily && s.dailyPaid !== dayKey()) { s.dailyPaid = dayKey(); t += DAILY_RUN_BONUS; }
    } else if (game === "stack") {
      const pts = Math.max(0, Math.floor(+o.points || 0)) + (+s.carry.stack || 0);
      t = Math.floor(pts / STACK_LAYERS_PER_TICKET);
      s.carry.stack = pts - t * STACK_LAYERS_PER_TICKET;
    } else if (game === "remote") {
      t = Math.max(0, Math.min(14, Math.floor((+o.points || 0) / 2)));   // a perfect game is 25 points, 12 tickets
    } else if (game === "brain" || game === "duel" || game === "grammar") {
      t = Math.max(0, Math.min(20, Math.floor(+o.tickets || 0)));
    } else {
      t = o.result === "win" ? 12 + Math.max(0, Math.floor(+o.bonus || 0)) : o.result === "draw" ? 4 : 0;
    }
    const wk = game === weekGame();
    if (wk) t *= 2;
    const cap = wk ? WEEK_CAP : BASE_CAP, used = +s.today[game] || 0;
    const got = Math.max(0, Math.min(t, cap - used));
    s.today[game] = used + got;
    s.tickets += got; s.lifetime += got;
    save(s);
    if (got > 0) window.RoboSfx?.play("ticket");
    if (got > 0) toast("+" + got + " ticket" + (got === 1 ? "" : "s") + (wk ? " (2x week bonus)" : ""));
    else if (t > 0) toast("Ticket limit reached for this game today");
    if ((game === "chess" || game === "tiles") && o.result === "win") {
      fragment(game + "1");
      if ((+o.tier || 0) >= TOP_TIER) fragment(game + "2");
    }
    if (game === "quest" && (+o.runScore || 0) >= 1500) fragment("quest1");
    if (game === "quest") beatGhosts(+o.runScore || 0, false);
    return got;
  }

  // beating a dad's DAD QUEST score pays once; quiet = no toast per dad (used to credit an old high score)
  function beatGhosts(score, quiet) {
    const s = load(); let sum = 0; const won = [];
    GHOSTS.forEach((g) => { if (score >= g.score && !s.ghosts.includes(g.id)) { s.ghosts.push(g.id); s.tickets += g.bonus; s.lifetime += g.bonus; sum += g.bonus; won.push(g); } });
    if (!won.length) return 0;
    save(s);
    window.RoboSfx?.play("ticket");
    if (quiet) toast("Your old DAD QUEST best beat " + won.length + (won.length === 1 ? " dad" : " dads") + ": +" + sum + " tickets");
    else won.forEach((g) => toast("You beat " + g.name + "'s high score! +" + g.bonus + " tickets"));
    return sum;
  }

  // a cartridge fragment is found once; it pays a bonus that ignores the daily cap
  function fragment(id) {
    const f = FBYID[id], s = load();
    if (!f || s.frags.includes(id)) return false;
    window.RoboSfx?.play("prize");
    s.frags.push(id); s.tickets += FRAG_BONUS; s.lifetime += FRAG_BONUS; save(s);
    toast("Cartridge fragment found! +" + FRAG_BONUS + " tickets (" + s.frags.length + " of " + FRAGS.length + ")");
    if (s.frags.length === FRAGS.length) toast("All six fragments! A Golden Token is waiting at the Prize Counter");
    return true;
  }

  // ---------- spending ----------
  function buy(id) {
    const p = BYID[id], s = load();
    if (!p || p.secret || s.prizes.includes(id) || s.tickets < p.cost) return false;
    s.tickets -= p.cost; s.prizes.push(id); save(s);
    if (window.RoboSfx) { RoboSfx.play("counterBell"); setTimeout(() => RoboSfx.play("prize"), 260); }
    return true;
  }

  // ---------- a small toast, shown on any page ----------
  let toastEl = null, toastT = 0, toastBusy = false;
  const toastQ = [];
  function toast(text) { toastQ.push(text); if (!toastBusy) nextToast(); }
  function nextToast() {
    if (!toastQ.length) { toastBusy = false; return; }
    toastBusy = true; showToast(toastQ.shift()); setTimeout(nextToast, 2600);
  }
  function showToast(text) {
    if (!document.body) return;
    if (!toastEl) {
      toastEl = document.createElement("div");
      toastEl.setAttribute("role", "status"); toastEl.setAttribute("aria-live", "polite");
      toastEl.style.cssText = "position:fixed;left:50%;bottom:84px;transform:translateX(-50%);z-index:60;max-width:90vw;padding:10px 16px;border-radius:999px;background:var(--mustard,#F2B533);color:var(--mustard-ink,#2A1E00);font:900 14px/1.2 Nunito,system-ui,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.3);pointer-events:none;transition:opacity .2s";
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = text; toastEl.style.opacity = "1";
    clearTimeout(toastT); toastT = setTimeout(() => { toastEl.style.opacity = "0"; }, 3200);
  }

  const api = {
    award, buy, toast, weekGame, fragment, ladder: () => GHOSTS.slice(), fragments: () => FRAGS.slice(), prizes: () => PRIZES.slice(),
    state: () => { const s = load(); return { tickets: s.tickets, lifetime: s.lifetime, prizes: s.prizes.slice(), frags: s.frags.slice(), ghosts: s.ghosts.slice() }; },
  };
  window.RoboArcade = api;

  // ---------- the main page: arcade bar + Prize Counter ----------
  const playDlg = document.getElementById("playDlg");
  if (!playDlg) return;

  const css = document.createElement("style");
  css.textContent = `
.arc-bar{margin:10px 0 4px; display:flex; flex-direction:column; gap:10px}
.arc-row{display:flex; align-items:center; gap:10px}
.arc-pill{display:inline-flex; align-items:center; gap:6px; min-height:40px; padding:0 14px; border-radius:999px; border:1.5px solid var(--line); background:var(--surface); font-weight:900; font-size:15px; color:var(--ink)}
.arc-pill svg{width:18px; height:18px; color:var(--mustard); flex:none}
.arc-open{flex:1; min-height:48px; display:flex; align-items:center; justify-content:space-between; gap:8px; padding:0 14px; border-radius:16px; border:1.5px dashed var(--mustard); background:transparent; color:var(--ink); font:inherit; font-weight:900; text-align:left; cursor:pointer}
.arc-open small{display:block; font-weight:700; color:var(--muted); font-size:12px}
.arc-open:hover,.arc-open:focus-visible{background:color-mix(in srgb, var(--mustard) 14%, transparent)}
.arc-week{display:flex; align-items:center; gap:12px; padding:12px 14px; border-radius:18px; background:var(--mustard); color:var(--mustard-ink)}
.arc-week div{flex:1; min-width:0}
.arc-tag{display:block; font-size:11px; font-weight:800; letter-spacing:.08em}
.arc-week b{display:block; font-size:19px; font-weight:900; line-height:1.15}
.arc-week small{font-size:13px; font-weight:700}
.arc-week a{display:inline-grid; place-items:center; min-height:44px; padding:0 20px; border-radius:14px; background:var(--mustard-ink); color:var(--mustard); font-weight:900; text-decoration:none}
.arc-frags{border:1.5px solid var(--line); border-radius:16px; background:var(--surface); padding:10px 14px}
.arc-frags summary{display:flex; align-items:center; gap:10px; min-height:32px; cursor:pointer; font-weight:900; font-size:14px; list-style:none}
.arc-frags summary::-webkit-details-marker{display:none}
.arc-frags summary:focus-visible{outline:3px solid var(--denim); outline-offset:2px; border-radius:8px}
.arc-pips{display:inline-flex; gap:4px; margin-left:auto}
.arc-pip{width:12px; height:16px; border-radius:3px; border:1.5px solid var(--mustard)}
.arc-pip.on{background:var(--mustard)}
.arc-frags ul{margin:8px 0 2px; padding:0; list-style:none; display:flex; flex-direction:column; gap:6px; font-size:13px; font-weight:700; color:var(--muted)}
.arc-frags li{display:flex; gap:8px; align-items:flex-start}
.arc-frags li b{color:var(--ink); font-weight:800}
.arc-frags li.done b{color:var(--ok)}
.arc-hint{margin:0; font-size:13px; font-weight:700; color:var(--muted)}
.arc-2x{align-self:flex-start; margin-top:2px; padding:1px 8px; border-radius:999px; background:var(--mustard); color:var(--mustard-ink); font-size:11px; font-weight:900}
.arc-sub{display:flex; align-items:center; justify-content:space-between; gap:10px; margin:6px 0 14px; font-weight:800; color:var(--muted); font-size:14px}
.arc-shelf{display:grid; grid-template-columns:repeat(3,1fr); gap:8px; padding:0 2px}
.arc-plank{height:8px; border-radius:4px; background:var(--line); margin:6px 0 14px}
.arc-item{display:flex; flex-direction:column; align-items:center; gap:4px; background:transparent; border:0; padding:0; color:var(--ink); font:inherit; cursor:pointer}
.arc-plate{display:grid; place-items:center; width:76px; height:76px; border-radius:18px; background:var(--surface); border:1.5px solid var(--line)}
.arc-item[aria-pressed="true"] .arc-plate{border:2.5px solid var(--mustard)}
.arc-item:focus-visible .arc-plate{outline:3px solid var(--denim); outline-offset:2px}
.arc-plate svg{width:48px; height:48px}
.arc-item.off .arc-plate svg{filter:brightness(0) opacity(.28)}
.arc-name{font-size:12px; font-weight:800; line-height:1.15; text-align:center}
.arc-cost{display:inline-flex; align-items:center; gap:3px; font-size:11px; font-weight:800; color:var(--muted)}
.arc-cost svg{width:12px; height:12px}
.arc-cost.own{color:var(--ok)}
.arc-cost.can{color:var(--ink)}
.arc-detail{padding:14px; border-radius:18px; border:1.5px solid var(--line); background:var(--surface)}
.arc-detail h3{margin:0; font-size:17px; font-weight:900}
.arc-detail p{margin:6px 0 12px; font-size:14px; line-height:1.45; color:var(--muted); font-weight:600}
.arc-detail .primary{width:100%; min-height:48px}
.arc-detail .primary[disabled]{opacity:.55}
`;
  document.head.appendChild(css);

  const ICON_TICKET = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 8h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z"/></svg>';
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const bar = document.createElement("section");
  bar.className = "arc-bar"; bar.setAttribute("aria-label", "Arcade");
  const tilesEl = playDlg.querySelector(".tiles");
  if (tilesEl) tilesEl.parentNode.insertBefore(bar, tilesEl);

  function fragHtml(s) {
    const q = questOpen();
    const pips = FRAGS.map((f) => '<span class="arc-pip' + (s.frags.includes(f.id) ? " on" : "") + '"></span>').join("");
    const items = FRAGS.map((f) => {
      const done = s.frags.includes(f.id);
      const txt = f.game === "quest" && !q && !done ? "A hidden cabinet holds this one" : f.name;
      return '<li class="' + (done ? "done" : "") + '"><span aria-hidden="true">' + (done ? "&#10003;" : "&#9675;") + '</span><span><b>' + esc(txt) + '</b>' + (done ? " (found)" : "") + '</span></li>';
    }).join("");
    return '<details class="arc-frags"><summary><span>The Lost Cartridge: ' + s.frags.length + ' of ' + FRAGS.length + ' fragments</span><span class="arc-pips" aria-hidden="true">' + pips + '</span></summary><ul>' + items + '</ul><p class="arc-hint" style="margin-top:8px">Each fragment pays ' + FRAG_BONUS + ' bonus tickets. Find all six for a Golden Token.</p></details>';
  }
  function ladderHtml(s) {
    if (!questOpen()) return "";
    const best = Math.max(questBest(), 0), fmt = (n) => n.toLocaleString("en-US");
    const nextIdx = GHOSTS.findIndex((g) => !s.ghosts.includes(g.id));
    const rows = GHOSTS.map((g, i) => {
      const done = s.ghosts.includes(g.id);
      const hide = g.secret && !done && !s.ghosts.includes("professor");
      const status = done ? " (beaten)" : i === nextIdx ? " (next up)" : "";
      return '<li class="' + (done ? "done" : "") + '"><span aria-hidden="true">' + (done ? "&#10003;" : "&#9675;") + '</span><span><b>' + (hide ? "???" : esc(g.name)) + '</b> ' + (hide ? "" : fmt(g.score) + " points") + status + '</span></li>';
    }).join("");
    const nxt = nextIdx >= 0 ? GHOSTS[nextIdx] : null;
    const pct = nxt ? Math.min(100, Math.round(best / nxt.score * 100)) : 100;
    const line = nxt ? "Your best: " + fmt(best) + ". " + (nxt.secret && !s.ghosts.includes("professor") ? "Keep climbing." : fmt(Math.max(0, nxt.score - best)) + " to beat " + esc(nxt.name) + ".") : "Your best: " + fmt(best) + ". You beat every dad.";
    return '<details class="arc-frags"><summary><span>DAD QUEST: beat the dads\' scores</span><span class="arc-pips" aria-hidden="true">' + GHOSTS.map((g) => '<span class="arc-pip' + (s.ghosts.includes(g.id) ? " on" : "") + '"></span>').join("") + '</span></summary><ul>' + rows + '</ul><div style="height:6px;border-radius:3px;background:var(--line);margin:10px 0 6px" aria-hidden="true"><div style="height:6px;border-radius:3px;background:var(--mustard);width:' + pct + '%"></div></div><p class="arc-hint">' + line + ' Each dad pays a one-time bonus.</p></details>';
  }
  function renderBar() {
    const s = load(), wk = weekGame(), g = GAMES[wk];
    const afford = PRIZES.filter((p) => !p.secret && !s.prizes.includes(p.id) && p.cost <= s.tickets).length;
    const sub = s.lifetime === 0 ? "Win a game to earn your first tickets" : afford ? afford + (afford === 1 ? " prize" : " prizes") + " you can afford" : "Keep playing to afford the next prize";
    const openIdx = Array.from(bar.querySelectorAll("details")).map((d) => d.open);
    bar.innerHTML =
      '<div class="arc-row"><span class="arc-pill" role="img" aria-label="' + s.tickets + ' tickets">' + ICON_TICKET + s.tickets + '</span>' +
      '<button class="arc-open" id="arcOpen" type="button" aria-haspopup="dialog"><span>Prize Counter<small>' + esc(sub) + '</small></span><span aria-hidden="true" style="color:var(--mustard)">Open</span></button></div>' +
      fragHtml(s) + ladderHtml(s) +
      '<div class="arc-week"><div><span class="arc-tag">CABINET OF THE WEEK</span><b>' + esc(g.name) + '</b><small>Double tickets until Sunday</small></div><a href="' + g.href + '" aria-label="Play ' + esc(g.name) + '">Play</a></div>';
    playDlg.querySelectorAll(".arc-2x").forEach((n) => n.remove());
    const tile = playDlg.querySelector('.tile[href="' + g.href + '"]');
    if (tile && !tile.hidden) { const m = document.createElement("span"); m.className = "arc-2x"; m.textContent = "2x tickets this week"; tile.appendChild(m); }
    bar.querySelector("#arcOpen").addEventListener("click", openPrizes);
    bar.querySelectorAll("details").forEach((d, i) => { if (openIdx[i]) d.open = true; });
  }

  // ----- Prize Counter dialog -----
  const dlg = document.createElement("div");
  dlg.className = "overlay sheet"; dlg.id = "prizeDlg"; dlg.hidden = true;
  dlg.setAttribute("role", "dialog"); dlg.setAttribute("aria-modal", "true"); dlg.setAttribute("aria-labelledby", "prizeTitle");
  dlg.innerHTML = '<div class="card"><div class="sheet-head"><h2 id="prizeTitle">Prize Counter</h2><button class="ghost" id="prizeClose" type="button">Close</button></div><div class="arc-sub" id="prizeSub"></div><section class="arc-detail" id="prizeDetail" aria-live="polite"></section><div id="prizeShelves" style="margin-top:16px"></div></div>';
  document.body.appendChild(dlg);
  let sel = "ring", opener = null;

  function renderPrizes() {
    const s = load();
    if (!BYID[sel]) sel = PRIZES[0].id;
    const own = (id) => s.prizes.includes(id);
    document.getElementById("prizeSub").innerHTML = '<span>Collected ' + s.prizes.length + ' of ' + PRIZES.length + '</span><span class="arc-pill" role="img" aria-label="' + s.tickets + ' tickets">' + ICON_TICKET + s.tickets + '</span>';
    let html = "";
    for (let i = 0; i < PRIZES.length; i += 3) {
      html += '<div class="arc-shelf">' + PRIZES.slice(i, i + 3).map((p) => {
        const o = own(p.id), can = !o && !p.secret && s.tickets >= p.cost;
        const lab = o ? '<span class="arc-cost own">Owned</span>' : p.secret ? '<span class="arc-cost">Secret</span>' : '<span class="arc-cost' + (can ? " can" : "") + '">' + ICON_TICKET + p.cost + '</span>';
        const nm = o || !p.secret ? p.name : "???";
        return '<button class="arc-item' + (o ? "" : " off") + '" type="button" data-id="' + p.id + '" aria-pressed="' + (p.id === sel) + '"><span class="arc-plate"><svg viewBox="0 0 48 48" aria-hidden="true">' + ART[p.art] + '</svg></span><span class="arc-name">' + esc(nm) + '</span>' + lab + '</button>';
      }).join("") + '</div><div class="arc-plank"></div>';
    }
    document.getElementById("prizeShelves").innerHTML = html;
    const p = BYID[sel], o = own(sel);
    let act;
    if (o) act = '<button class="primary" type="button" disabled>On your shelf</button>';
    else if (p.secret) act = '<button class="primary" type="button" disabled>' + esc(p.hint || "Secret") + '</button>';
    else if (s.tickets >= p.cost) act = '<button class="primary" type="button" id="prizeBuy">Get it for ' + p.cost + ' tickets</button>';
    else act = '<button class="primary" type="button" disabled>Need ' + (p.cost - s.tickets) + ' more tickets</button>';
    document.getElementById("prizeDetail").innerHTML = '<h3>' + esc(o || !p.secret ? p.name : "Secret prize") + '</h3><p>' + esc(o || !p.secret ? p.story : "Something is waiting for whoever finishes the hunt.") + '</p>' + act;
  }
  function openPrizes() { opener = document.getElementById("arcOpen"); renderPrizes(); dlg.hidden = false; document.getElementById("prizeClose").focus(); }
  function closePrizes() { dlg.hidden = true; renderBar(); const b = document.getElementById("arcOpen"); if (b) b.focus(); }
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg || e.target.id === "prizeClose") return closePrizes();
    const it = e.target.closest(".arc-item");
    if (it) { sel = it.dataset.id; return renderPrizes(); }
    if (e.target.id === "prizeBuy") {
      const p = BYID[sel];
      if (buy(sel)) { renderPrizes(); toast(p.name + " is on your shelf"); }
    }
  });
  dlg.addEventListener("keydown", (e) => { if (e.key === "Escape") { e.stopPropagation(); closePrizes(); } });

  if (questOpen()) beatGhosts(questBest(), true);       // credit a high score from before the arcade opened
  renderBar();
  new MutationObserver(() => { if (!playDlg.hidden) renderBar(); }).observe(playDlg, { attributes: true, attributeFilter: ["hidden"] });
  window.addEventListener("robodad-arcade", () => { if (!playDlg.hidden) renderBar(); });
  window.addEventListener("storage", (e) => { if (e.key === KEY && !playDlg.hidden) renderBar(); });
})();
