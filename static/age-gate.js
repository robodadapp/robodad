// RoboDad is for ages 13 and up. The age question lives on the main page; every other
// page that talks to the AI or keeps progress loads this first. Without the "ok" answer
// saved on this device, it sends the visitor to the main page, which asks, then brings
// them back here. Only the result is stored, never the birth date (see /privacy).
(function () {
  var ok = false;
  try { ok = localStorage.getItem("robodad.ageCheck") === "ok"; } catch (e) { ok = false; }
  if (ok) return;
  var here = location.pathname + location.search + location.hash;
  location.replace("/?next=" + encodeURIComponent(here));
})();
