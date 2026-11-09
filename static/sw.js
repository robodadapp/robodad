// RoboDad service worker: makes the site installable and keeps it working when
// the free server is asleep or the phone is offline.
// Pages and app files are fetched fresh from the network first, so a new
// version shows up on the next open. If the network is slow (the free server
// waking up) or missing, the saved copy is used instead. Chat requests always
// go to the network.
const CACHE = "robodad-v73";
const SHELL = ["/", "/privacy", "/changelog", "/manifest.webmanifest", "/static/favicon.svg", "/static/radio.js", "/static/words.js", "/static/vocab.js", "/static/grammar.js", "/static/tiles-badges.js", "/static/glowup.js", "/static/tenses.js", "/static/lessons.js", "/static/maths.js", "/static/avatars.js", "/static/hunt.js", "/static/brainteasers.js", "/static/brain.js", "/static/chess-engine.js", "/static/chess-puzzles.js", "/static/sleep.js", "/static/quest.js", "/static/icon-192.png", "/static/icon-512.png"];
const PAGES = ["/", "/privacy", "/terms", "/testers", "/changelog", "/parents", "/learn", "/quest", "/attic", "/chess", "/tiles"];
const WAIT_MS = 3500;   // how long to wait for the network before using the saved copy

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE)
    .then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: "reload" }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET") return;                                   // chat, feedback
  const same = url.origin === location.origin;
  if (same && (url.pathname.startsWith("/api/") || url.pathname === "/health" || url.pathname === "/sw.js" || url.pathname.startsWith("/go/") || url.pathname.startsWith("/learn/"))) return;

  const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  if (!same && !isFont) return;

  if (isFont) {                                                       // fonts never change: saved copy first
    e.respondWith(caches.open(CACHE).then(async (cache) => {
      const hit = await cache.match(req); if (hit) return hit;
      const res = await fetch(req); if (res.ok || res.type === "opaque") cache.put(req, res.clone()); return res;
    }));
    return;
  }

  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (req.mode === "navigate" && !PAGES.includes(path)) return;
  const key = req.mode === "navigate" ? path : url.pathname;

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const net = (req.mode === "navigate" ? fetch(req) : fetch(url.pathname + url.search, { cache: "no-cache" }))
      .then((res) => { if (res.ok) cache.put(key, res.clone()); return res; });
    const quick = await Promise.race([net.catch(() => null), new Promise((r) => setTimeout(r, WAIT_MS, null))]);
    if (quick) return quick;
    return (await cache.match(key)) || net;
  })());
});
