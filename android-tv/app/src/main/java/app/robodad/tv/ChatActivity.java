package app.robodad.tv;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import android.util.Base64;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import androidx.core.content.FileProvider;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

/**
 * RoboDad TV chat: robodad.app shown inside the app (a WebView), with
 * native stand-ins for the web features a WebView lacks: the phone's voice
 * (speechSynthesis), talk-instead-of-typing (SpeechRecognition) and sharing.
 */
public class ChatActivity extends Activity {

    private static final String START_URL = "https://robodad.app/?source=tv";
    private static final Set<String> OUR_HOSTS = new HashSet<>(Arrays.asList(
            "robodad.app", "www.robodad.app", "robodad.onrender.com",
            "robodad.ca", "www.robodad.ca", "robodad.online", "www.robodad.online"));
    private static final Set<String> OUR_ORIGINS = new HashSet<>(Arrays.asList(
            "https://robodad.app", "https://www.robodad.app", "https://robodad.onrender.com",
            "https://robodad.ca", "https://www.robodad.ca", "https://robodad.online", "https://www.robodad.online"));
    private static final int REQ_MIC = 7;

    private WebView web;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private String bridgeJs = "";
    private boolean scriptAtStart = false;

    private TextToSpeech tts;
    private boolean ttsReady = false;

    private SpeechRecognizer recognizer;
    private String recId = null;
    private boolean recEnded = true;
    private String pendingRecId, pendingRecLang;
    private boolean pendingRecInterim;

    @SuppressLint({"SetJavaScriptEnabled", "JavascriptInterface"})
    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        bridgeJs = readAsset("bridge.js") + "\n" + readAsset("tvnav.js");

        FrameLayout root = new FrameLayout(this);
        web = new WebView(this);
        root.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(root);
        applyInsets(root);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setSupportMultipleWindows(false);
        s.setUserAgentString(s.getUserAgentString() + " RoboDadApp/" + BuildConfigLite.VERSION + " RoboDadTV");
        CookieManager.getInstance().setAcceptCookie(true);

        web.addJavascriptInterface(new Bridge(), "RoboDadNative");
        if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            WebViewCompat.addDocumentStartJavaScript(web, bridgeJs, OUR_ORIGINS);
            scriptAtStart = true;
        }
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new Client());

        tts = new TextToSpeech(this, status -> {
            ttsReady = status == TextToSpeech.SUCCESS;
            if (ttsReady) {
                tts.setOnUtteranceProgressListener(new TtsListener());
                ui.post(() -> js("window.__rdVoices && window.__rdVoices()"));
            }
        });

        Uri data = getIntent() != null ? getIntent().getData() : null;
        if (saved != null) web.restoreState(saved);
        else web.loadUrl(data != null && isOurs(data) ? data.toString() : START_URL);
    }

    // Keep RoboDad clear of the status bar, navigation bar and keyboard (Android 15 draws edge to edge).
    private void applyInsets(View root) {
        if (Build.VERSION.SDK_INT >= 30) {
            root.setOnApplyWindowInsetsListener((v, insets) -> {
                android.graphics.Insets b = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.ime() | WindowInsets.Type.displayCutout());
                v.setPadding(b.left, b.top, b.right, b.bottom);
                return WindowInsets.CONSUMED;
            });
        } else {
            root.setFitsSystemWindows(true);
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        Uri data = intent.getData();
        if (data != null && isOurs(data)) web.loadUrl(data.toString());
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onPause() {
        super.onPause();
        CookieManager.getInstance().flush();
        if (tts != null) tts.stop();
        if (recognizer != null) recognizer.cancel();
        endRec();
    }

    @Override
    protected void onDestroy() {
        if (tts != null) tts.shutdown();
        if (recognizer != null) recognizer.destroy();
        web.destroy();
        super.onDestroy();
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        if (web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }

    // ---------- links ----------
    private static boolean isOurs(Uri u) {
        return "https".equals(u.getScheme()) && u.getHost() != null && OUR_HOSTS.contains(u.getHost().toLowerCase(Locale.ROOT));
    }

    private void openOutside(Uri u) {
        String scheme = u.getScheme() == null ? "" : u.getScheme();
        Intent i;
        if (scheme.equals("tel")) i = new Intent(Intent.ACTION_DIAL, u);
        else if (scheme.equals("sms") || scheme.equals("smsto") || scheme.equals("mailto")) i = new Intent(Intent.ACTION_SENDTO, u);
        else if (scheme.equals("intent")) {
            try { i = Intent.parseUri(u.toString(), Intent.URI_INTENT_SCHEME); i.setComponent(null); i.setSelector(null); }
            catch (Exception e) { return; }
        } else if (scheme.equals("http") || scheme.equals("https")) i = new Intent(Intent.ACTION_VIEW, u);
        else return;
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try { startActivity(i); } catch (ActivityNotFoundException ignored) { }
    }

    private class Client extends WebViewClient {
        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
            Uri u = req.getUrl();
            if (isOurs(u)) return false;
            if (u.toString().startsWith("file:///android_asset/")) return false;
            openOutside(u);
            return true;
        }

        @Override
        public void onPageStarted(WebView view, String url, Bitmap favicon) {
            if (!scriptAtStart && url != null && isOurs(Uri.parse(url))) view.evaluateJavascript(bridgeJs, null);
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            if (!scriptAtStart && url != null && isOurs(Uri.parse(url))) view.evaluateJavascript(bridgeJs, null);
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest req, WebResourceError err) {
            if (req.isForMainFrame()) view.loadUrl("file:///android_asset/offline.html");
        }
    }

    // ---------- talking to the page ----------
    private void js(String code) {
        ui.post(() -> { if (web != null) web.evaluateJavascript(code, null); });
    }

    private void callback(String id, String type, String data) {
        js("window.__rdCb && window.__rdCb(" + JSONObject.quote(id) + "," + JSONObject.quote(type) + "," + JSONObject.quote(data == null ? "" : data) + ")");
    }

    private boolean pageIsOurs() {
        String url = web.getUrl();
        return url != null && isOurs(Uri.parse(url));
    }

    private class Bridge {
        @JavascriptInterface
        public String ttsVoices() {
            JSONArray out = new JSONArray();
            if (!ttsReady) return out.toString();
            try {
                Set<Voice> vs = tts.getVoices();
                if (vs == null) return out.toString();
                for (Voice v : vs) {
                    if (v.getFeatures() != null && v.getFeatures().contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)) continue;
                    JSONObject o = new JSONObject();
                    o.put("name", v.getName());
                    o.put("lang", v.getLocale().toLanguageTag());
                    out.put(o);
                }
            } catch (Exception ignored) { }
            return out.toString();
        }

        @JavascriptInterface
        public void ttsSpeak(String id, String text, String lang, String voiceName, double rate, double pitch) {
            ui.post(() -> {
                if (!ttsReady || !pageIsOurs()) { callback(id, "error", "synthesis-unavailable"); return; }
                Voice chosen = null;
                if (voiceName != null && !voiceName.isEmpty()) {
                    try { for (Voice v : tts.getVoices()) if (v.getName().equals(voiceName)) { chosen = v; break; } } catch (Exception ignored) { }
                }
                if (chosen != null) tts.setVoice(chosen);
                else if (lang != null && !lang.isEmpty()) tts.setLanguage(Locale.forLanguageTag(lang.replace('_', '-')));
                else tts.setLanguage(Locale.getDefault());
                tts.setSpeechRate((float) Math.max(0.1, Math.min(4, rate)));
                tts.setPitch((float) Math.max(0.1, Math.min(2, pitch)));
                int r = tts.speak(text, TextToSpeech.QUEUE_ADD, null, id);
                if (r != TextToSpeech.SUCCESS) callback(id, "error", "synthesis-failed");
            });
        }

        @JavascriptInterface
        public void ttsStop() {
            ui.post(() -> { if (tts != null) tts.stop(); });
        }

        @JavascriptInterface
        public void recStart(String id, String lang, boolean interim) {
            ui.post(() -> {
                if (!pageIsOurs()) return;
                if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                    pendingRecId = id; pendingRecLang = lang; pendingRecInterim = interim;
                    requestPermissions(new String[]{Manifest.permission.RECORD_AUDIO}, REQ_MIC);
                    return;
                }
                startRec(id, lang, interim);
            });
        }

        @JavascriptInterface
        public void recStop() {
            ui.post(() -> { if (recognizer != null) recognizer.stopListening(); });
        }

        @JavascriptInterface
        public void recCancel() {
            ui.post(() -> { if (recognizer != null) recognizer.cancel(); endRec(); });
        }

        @JavascriptInterface
        public void share(String json) {
            ui.post(() -> { if (pageIsOurs()) doShare(json); });
        }
    }

    // ---------- the phone's voice ----------
    private class TtsListener extends UtteranceProgressListener {
        @Override public void onStart(String id) { callback(id, "start", ""); }
        @Override public void onDone(String id) { callback(id, "end", ""); }
        @Override @SuppressWarnings("deprecation") public void onError(String id) { callback(id, "error", "synthesis-failed"); }
        @Override public void onError(String id, int code) { callback(id, "error", "synthesis-failed"); }
        @Override public void onStop(String id, boolean interrupted) { callback(id, "end", ""); }
    }

    // ---------- talk instead of typing ----------
    @Override
    public void onRequestPermissionsResult(int code, String[] perms, int[] results) {
        super.onRequestPermissionsResult(code, perms, results);
        if (code != REQ_MIC || pendingRecId == null) return;
        String id = pendingRecId; pendingRecId = null;
        if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) startRec(id, pendingRecLang, pendingRecInterim);
        else { callback(id, "error", "not-allowed"); callback(id, "end", ""); }
    }

    private void startRec(String id, String lang, boolean interim) {
        if (!SpeechRecognizer.isRecognitionAvailable(this)) {
            callback(id, "error", "service-not-allowed"); callback(id, "end", ""); return;
        }
        if (recognizer != null) { recognizer.cancel(); endRec(); }
        else {
            recognizer = SpeechRecognizer.createSpeechRecognizer(this);
            recognizer.setRecognitionListener(new RecListener());
        }
        recId = id; recEnded = false;
        Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        if (lang != null && !lang.isEmpty()) i.putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang.replace('_', '-'));
        i.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, interim);
        i.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
        i.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, getPackageName());
        recognizer.startListening(i);
    }

    private void endRec() {
        if (recId != null && !recEnded) { recEnded = true; callback(recId, "end", ""); }
    }

    private void sendResult(Bundle b, boolean isFinal) {
        if (recId == null || b == null) return;
        ArrayList<String> list = b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        if (list == null || list.isEmpty()) return;
        try {
            JSONObject o = new JSONObject();
            o.put("text", list.get(0));
            o.put("final", isFinal);
            callback(recId, "result", o.toString());
        } catch (Exception ignored) { }
    }

    private class RecListener implements RecognitionListener {
        @Override public void onReadyForSpeech(Bundle p) { if (recId != null) callback(recId, "start", ""); }
        @Override public void onBeginningOfSpeech() { }
        @Override public void onRmsChanged(float v) { }
        @Override public void onBufferReceived(byte[] b) { }
        @Override public void onEndOfSpeech() { }
        @Override public void onPartialResults(Bundle b) { sendResult(b, false); }
        @Override public void onEvent(int t, Bundle b) { }
        @Override public void onResults(Bundle b) { sendResult(b, true); endRec(); }
        @Override public void onError(int error) {
            String e;
            switch (error) {
                case SpeechRecognizer.ERROR_NO_MATCH:
                case SpeechRecognizer.ERROR_SPEECH_TIMEOUT: e = "no-speech"; break;
                case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS: e = "not-allowed"; break;
                case SpeechRecognizer.ERROR_AUDIO: e = "audio-capture"; break;
                case SpeechRecognizer.ERROR_NETWORK:
                case SpeechRecognizer.ERROR_NETWORK_TIMEOUT:
                case SpeechRecognizer.ERROR_SERVER: e = "network"; break;
                case SpeechRecognizer.ERROR_CLIENT: e = "aborted"; break;
                default: e = "aborted";
            }
            if (recId != null && !recEnded) callback(recId, "error", e);
            endRec();
        }
    }

    // ---------- sharing badges and pictures ----------
    private void doShare(String json) {
        try {
            JSONObject d = new JSONObject(json);
            String text = d.optString("text", "");
            String url = d.optString("url", "");
            if (!url.isEmpty()) text = text.isEmpty() ? url : text + " " + url;
            JSONArray files = d.optJSONArray("files");
            Intent send = new Intent(Intent.ACTION_SEND);
            if (files != null && files.length() > 0) {
                JSONObject f = files.getJSONObject(0);
                File dir = new File(getCacheDir(), "share");
                if (!dir.exists() && !dir.mkdirs()) return;
                String name = f.optString("name", "robodad.png").replaceAll("[^A-Za-z0-9._-]", "_");
                File out = new File(dir, name.isEmpty() ? "robodad.png" : name);
                try (FileOutputStream fo = new FileOutputStream(out)) {
                    fo.write(Base64.decode(f.optString("data", ""), Base64.DEFAULT));
                }
                Uri uri = FileProvider.getUriForFile(this, "app.robodad.tv.files", out);
                send.setType(f.optString("type", "image/png"));
                send.putExtra(Intent.EXTRA_STREAM, uri);
                send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            } else {
                send.setType("text/plain");
            }
            if (!text.isEmpty()) send.putExtra(Intent.EXTRA_TEXT, text);
            String title = d.optString("title", "");
            if (!title.isEmpty()) send.putExtra(Intent.EXTRA_SUBJECT, title);
            startActivity(Intent.createChooser(send, title.isEmpty() ? "Share" : title));
        } catch (Exception ignored) { }
    }

    private String readAsset(String name) {
        try (InputStream in = getAssets().open(name); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buf = new byte[8192]; int n;
            while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            return out.toString(StandardCharsets.UTF_8.name());
        } catch (Exception e) {
            return "";
        }
    }
}
