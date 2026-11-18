// Shared behaviour for RoboDad's public pages (parents and Learn with Dad).
(function () {
  // the dads, drawn from the same art as the app
  try {
    var sprite = document.querySelector('svg[width="0"]');
    if (sprite && window.RoboAvatars) window.RoboAvatars.installSymbols(sprite);
  } catch (e) {}

  // a thin line under the header once the page has scrolled
  var head = document.getElementById("head");
  if (head) {
    var onScroll = function () { head.classList.toggle("scrolled", window.scrollY > 8); };
    window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
  }

  // the parents page demo: the teen asks, Dad types, answers, then hands the question back to the parent
  var msgs = document.getElementById("msgs");
  if (msgs) {
    var steps = Array.prototype.slice.call(msgs.querySelectorAll(".step"));
    var replay = document.getElementById("replay");
    var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var timers = [], typing = null;
    var clear = function () { timers.forEach(clearTimeout); timers = []; if (typing) { typing.remove(); typing = null; } };
    var showAll = function () { clear(); steps.forEach(function (s) { s.classList.add("on"); }); };
    var play = function () {
      clear(); steps.forEach(function (s) { s.classList.remove("on"); });
      if (replay) replay.hidden = true;
      var at = 500;
      steps.forEach(function (s, i) {
        if (i > 0) {
          timers.push(setTimeout(function () {
            typing = document.createElement("p"); typing.className = "msg bot typing"; typing.setAttribute("aria-hidden", "true");
            typing.innerHTML = "<i></i><i></i><i></i>"; msgs.insertBefore(typing, s);
          }, at));
          at += i === 1 ? 1400 : 1100;
        }
        timers.push(setTimeout(function () { if (typing) { typing.remove(); typing = null; } s.classList.add("on"); }, at));
        at += 700;
      });
      timers.push(setTimeout(function () { if (replay) replay.hidden = false; }, at + 600));
    };
    if (replay) replay.addEventListener("click", play);
    if (still || !("IntersectionObserver" in window)) { showAll(); }
    else {
      var seen = false;
      new IntersectionObserver(function (es, ob) {
        if (es[0].isIntersecting && !seen) { seen = true; play(); ob.disconnect(); }
      }, { threshold: .35 }).observe(msgs);
    }
  }
})();
