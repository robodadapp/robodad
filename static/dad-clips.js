// Modern Dad's performance clips: four short animated moments played on top of the SVG rig.
// They are flat pictures, so they only play when the dad on screen is exactly the one they show:
// Modern Dad, Steel, hair as drawn, no beard, the Classic look in light mode. Everyone else keeps the rig.
// Taps are never blocked, and a missing file simply means the rig carries on.
(() => {
  const FILES = { hello: "hello_wave", try: "try_again", did: "you_did_it", trick: "heres_the_trick" };
  const BASE = "/static/clips/modern_", VERSION = "?v=1";
  const LENGTH = 4000, FADE = 120;
  const blobs = {};            // name -> Promise<Blob|null>
  let live = null, misses = 0;

  const $ = (id) => document.getElementById(id);
  const calm = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  function eligible(){
    const AV = window.RoboAvatars;
    if (!AV || !window.RDDadKind || window.RDDadKind() !== "modern") return false;
    if (AV.getSkin() !== "steel" || AV.getHair() !== "drawn" || AV.getBeard()) return false;
    const root = document.documentElement;
    if ((root.dataset.look || "classic") !== "classic") return false;
    // The clips are painted in Classic light colours; dark mode changes these.
    return getComputedStyle(root).getPropertyValue("--metal").trim().toUpperCase() === "#B9C7D4";
  }

  function load(name){
    if (!blobs[name]) blobs[name] = fetch(BASE + FILES[name] + ".webp" + VERSION)
      .then((r) => (r.ok ? r.blob() : null))
      .catch(() => null)
      .then((b) => { if (!b) delete blobs[name]; return b; });
    return blobs[name];
  }

  // Never perform over a crisis or check-in reply.
  function serious(){
    const all = document.querySelectorAll(".bubble");
    return !!all.length && all[all.length - 1].classList.contains("safety");
  }

  function stop(){
    if (!live) return;
    const { img, hero, url, timer } = live; live = null;
    clearTimeout(timer);
    removeEventListener("pointerdown", stop, true);
    removeEventListener("wheel", stop, true);
    removeEventListener("touchmove", stop, true);
    removeEventListener("resize", stop);
    if (hero) hero.style.visibility = "";
    img.style.opacity = "0";
    setTimeout(() => { img.remove(); URL.revokeObjectURL(url); }, FADE);
  }

  // On the home screen he performs in place of the big dad. Inside a game he pops up in the corner.
  function place(img){
    const hero = $("avHero"), r = hero?.getBoundingClientRect();
    const covered = document.querySelector(".overlay:not([hidden])");
    const s = img.style;
    s.position = "fixed"; s.zIndex = "9999"; s.pointerEvents = "none";
    s.opacity = "0"; s.transition = `opacity ${FADE}ms linear`;
    if (!covered && r && r.width && r.bottom > 0 && r.top < innerHeight) {
      // The clip frame is 1.333 times the avatar box; these offsets line his shoulders up with the SVG.
      s.width = s.height = r.width * 1.3333 + "px";
      s.left = r.left - r.width * 0.1667 + "px";
      s.top = r.top - r.height * 0.3177 + "px";
      return hero;
    }
    s.width = s.height = "148px";
    s.right = "8px"; s.bottom = "calc(8px + env(safe-area-inset-bottom, 0px))";
    s.background = "var(--surface)"; s.border = "2px solid var(--line)"; s.borderRadius = "24px";
    return null;
  }

  function ready(){ return !live && !document.hidden && !calm() && eligible() && !serious(); }

  async function play(name){
    if (!FILES[name] || !ready()) return false;
    const asked = Date.now();
    const blob = await load(name);
    // Too late to feel like a reaction, or things changed while it loaded.
    if (!blob || Date.now() - asked > 1500 || !ready()) return false;
    const img = new Image(), url = URL.createObjectURL(blob);   // a fresh URL restarts the animation
    img.alt = ""; img.setAttribute("aria-hidden", "true"); img.className = "dad-clip";
    img.src = url;
    const hero = place(img);
    live = { img, hero, url, timer: 0 };
    const mine = live;
    try { await img.decode(); } catch { /* shows as soon as it can */ }
    if (live !== mine) return false;
    document.body.appendChild(img);
    requestAnimationFrame(() => { img.style.opacity = "1"; if (hero) hero.style.visibility = "hidden"; });
    mine.timer = setTimeout(stop, LENGTH - FADE);
    addEventListener("pointerdown", stop, true);
    addEventListener("wheel", stop, true);
    addEventListener("touchmove", stop, true);
    addEventListener("resize", stop);
    return true;
  }

  // Quizzes report every answer: the second miss in a row gets "Try again".
  function answer(ok){
    misses = ok ? 0 : misses + 1;
    if (misses >= 2) { misses = 0; play("try"); }
  }

  // One hello a day, on the home screen, once nothing else is in the way.
  function hello(){
    const KEY = "robodad.clipHello", today = new Date().toDateString();
    try { if (localStorage.getItem(KEY) === today) return; } catch { return; }
    const gate = $("gate"), home = $("hello");
    if ((gate && !gate.hidden) || !home || home.hidden || document.querySelector(".overlay:not([hidden])")) return;
    play("hello").then((shown) => { if (shown) try { localStorage.setItem(KEY, today); } catch {} });
  }

  window.RDClips = { play, answer, stop };

  // Fetch the clips quietly after the page has settled, unless the phone asks to save data.
  addEventListener("load", () => setTimeout(async () => {
    if (!eligible() || calm()) return;
    await load("hello");
    hello();
    if (!navigator.connection?.saveData) ["try", "did", "trick"].forEach(load);
  }, 1200));
})();
