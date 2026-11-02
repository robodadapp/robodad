/* RoboDad Android app: native stand-ins for web features a WebView lacks.
   Runs before the page's own scripts on robodad.app. */
(function () {
  if (window.__rdNative || !window.RoboDadNative) return;
  window.__rdNative = true;
  var N = window.RoboDadNative, cbs = {}, seq = 0;
  window.__rdCb = function (id, type, data) { var c = cbs[id]; if (c) c(type, data); };
  function fire(target, type, extra) {
    var e = new Event(type);
    if (extra) for (var k in extra) e[k] = extra[k];
    try { if (typeof target["on" + type] === "function") target["on" + type](e); } catch (x) { setTimeout(function () { throw x; }); }
    target.dispatchEvent(e);
  }

  // ---- the phone's voice (speechSynthesis) ----
  var voices = [];
  function loadVoices() {
    try {
      voices = JSON.parse(N.ttsVoices() || "[]").map(function (v) {
        return { name: v.name, lang: v.lang, voiceURI: v.name, localService: true, "default": false };
      });
    } catch (e) { voices = []; }
  }
  function Utterance(text) {
    var t = new EventTarget();
    t.text = text || ""; t.lang = ""; t.voice = null; t.rate = 1; t.pitch = 1; t.volume = 1;
    t.onstart = t.onend = t.onerror = t.onboundary = t.onpause = t.onresume = t.onmark = null;
    return t;
  }
  var synth = new EventTarget();
  synth.speaking = false; synth.pending = false; synth.paused = false; synth.onvoiceschanged = null;
  var live = 0;
  synth.getVoices = function () { if (!voices.length) loadVoices(); return voices.slice(); };
  synth.speak = function (u) {
    var id = String(++seq); live++; synth.speaking = true;
    cbs[id] = function (type, data) {
      if (type === "start") { fire(u, "start"); return; }
      delete cbs[id]; live = Math.max(0, live - 1); synth.speaking = live > 0;
      if (type === "end") fire(u, "end"); else fire(u, "error", { error: data || "synthesis-failed" });
    };
    N.ttsSpeak(id, String(u.text || ""), String(u.lang || ""), u.voice ? String(u.voice.name) : "", +u.rate || 1, +u.pitch || 1);
  };
  synth.cancel = function () { N.ttsStop(); };
  synth.pause = function () {}; synth.resume = function () {};
  window.__rdVoices = function () { loadVoices(); fire(synth, "voiceschanged"); };
  loadVoices();
  try { Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true, writable: true }); } catch (e) {}
  window.SpeechSynthesisUtterance = Utterance;

  // ---- talk instead of typing (SpeechRecognition) ----
  function Recognition() {
    var r = new EventTarget();
    r.lang = ""; r.interimResults = false; r.continuous = false; r.maxAlternatives = 1;
    r.onstart = r.onresult = r.onerror = r.onend = r.onaudiostart = r.onspeechend = r.onnomatch = null;
    r.start = function () {
      var id = String(++seq);
      cbs[id] = function (type, data) {
        if (type === "start") fire(r, "start");
        else if (type === "result") {
          var d = {}; try { d = JSON.parse(data); } catch (e) {}
          var alt = { transcript: d.text || "", confidence: 0.9 };
          var res = [alt]; res.isFinal = !!d["final"]; res.item = function (i) { return this[i]; };
          var list = [res]; list.item = function (i) { return this[i]; };
          fire(r, "result", { results: list, resultIndex: 0 });
        } else if (type === "error") fire(r, "error", { error: data || "aborted" });
        else if (type === "end") { delete cbs[id]; fire(r, "end"); }
      };
      N.recStart(id, String(r.lang || navigator.language || "en-US"), !!r.interimResults);
    };
    r.stop = function () { N.recStop(); };
    r.abort = function () { N.recCancel(); };
    return r;
  }
  window.SpeechRecognition = Recognition;
  window.webkitSpeechRecognition = Recognition;

  // ---- sharing ----
  function toB64(file) {
    return new Promise(function (ok, bad) {
      var fr = new FileReader();
      fr.onload = function () { ok(String(fr.result).split(",")[1] || ""); };
      fr.onerror = bad; fr.readAsDataURL(file);
    });
  }
  var share = function (d) {
    d = d || {};
    var files = Array.prototype.slice.call(d.files || [], 0, 1);
    return Promise.all(files.map(toB64)).then(function (data) {
      N.share(JSON.stringify({
        title: d.title || "", text: d.text || "", url: d.url || "",
        files: files.map(function (f, i) { return { name: f.name || "robodad.png", type: f.type || "image/png", data: data[i] }; })
      }));
    });
  };
  try {
    Object.defineProperty(navigator, "share", { value: share, configurable: true, writable: true });
    Object.defineProperty(navigator, "canShare", { value: function () { return true; }, configurable: true, writable: true });
  } catch (e) {}
})();
