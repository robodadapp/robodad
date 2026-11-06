package app.robodad.tv;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.IntentFilter;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.util.Base64;
import android.view.KeyEvent;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.webkit.WebViewAssetLoader;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * RoboDad TV's home screen: the page in assets/home.html, plus a small bridge
 * that lets it list and open the TV's own apps, open Settings, and open the
 * RoboDad chat. The page is local, so the TV's home screen still appears when
 * the internet is down.
 */
public class HomeActivity extends Activity {

    private static final String HOME_URL = "https://appassets.androidplatform.net/assets/home.html";

    private WebView web;
    private WebViewAssetLoader assets;
    private final Handler ui = new Handler(Looper.getMainLooper());
    private final Map<String, String> artCache = new HashMap<>();
    private boolean pageReady = false;
    private boolean armPending = false;

    // The TV waking from standby (power button): the moment the birthday surprise plays.
    private final BroadcastReceiver wake = new BroadcastReceiver() {
        @Override
        public void onReceive(Context c, Intent i) { js("window.tvWake && window.tvWake()"); }
    };

    @SuppressLint({"SetJavaScriptEnabled", "JavascriptInterface"})
    @Override
    protected void onCreate(Bundle saved) {
        super.onCreate(saved);
        assets = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        web = new WebView(this);
        web.setBackgroundColor(0xFF0E1620);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setSupportMultipleWindows(false);

        web.addJavascriptInterface(new Tv(), "RoboDadTV");
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest req) {
                return assets.shouldInterceptRequest(req.getUrl());
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                pageReady = true;
                if (armPending) { armPending = false; js("window.tvArm && window.tvArm()"); }
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                // The home page never navigates anywhere else.
                return !req.getUrl().toString().startsWith("https://appassets.androidplatform.net/");
            }
        });
        web.loadUrl(HOME_URL);
        web.requestFocus();
        registerReceiver(wake, new IntentFilter(Intent.ACTION_SCREEN_ON));
        checkArm(getIntent());
    }

    /** adb shell am start -n app.robodad.tv/.HomeActivity --ez armSurprise true */
    private void checkArm(Intent i) {
        if (i == null || !i.getBooleanExtra("armSurprise", false)) return;
        i.removeExtra("armSurprise");
        if (pageReady) js("window.tvArm && window.tvArm()"); else armPending = true;
    }

    @Override
    protected void onResume() {
        super.onResume();
        js("window.tvResume && window.tvResume()");
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (intent != null && intent.getBooleanExtra("armSurprise", false)) { checkArm(intent); return; }
        // Home button pressed while already home: jump back to the top row.
        js("window.tvHome && window.tvHome()");
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        // A home screen has nowhere to go back to; let the page close a panel instead.
        js("window.tvBack && window.tvBack()");
    }

    @Override
    public boolean dispatchKeyEvent(KeyEvent e) {
        if (e.getKeyCode() == KeyEvent.KEYCODE_BACK) {
            if (e.getAction() == KeyEvent.ACTION_UP) onBackPressed();
            return true;
        }
        return super.dispatchKeyEvent(e);
    }

    @Override
    protected void onDestroy() {
        try { unregisterReceiver(wake); } catch (Exception ignored) { }
        web.destroy();
        super.onDestroy();
    }

    private void js(String code) {
        ui.post(() -> { if (web != null) web.evaluateJavascript(code, null); });
    }

    // ---------- what the page can ask for ----------
    private class Tv {
        /** Every app on the TV that can be opened, with its TV banner or icon. */
        @JavascriptInterface
        public String apps() {
            PackageManager pm = getPackageManager();
            List<ResolveInfo> found = new ArrayList<>();
            found.addAll(query(pm, Intent.CATEGORY_LEANBACK_LAUNCHER));
            found.addAll(query(pm, Intent.CATEGORY_LAUNCHER));
            Set<String> seen = new HashSet<>();
            List<JSONObject> out = new ArrayList<>();
            for (ResolveInfo r : found) {
                ActivityInfo a = r.activityInfo;
                if (a == null || a.packageName.equals(getPackageName()) || !seen.add(a.packageName)) continue;
                try {
                    JSONObject o = new JSONObject();
                    o.put("pkg", a.packageName);
                    o.put("name", String.valueOf(r.loadLabel(pm)));
                    o.put("art", art(pm, a));
                    o.put("icon", iconArt(pm, a));
                    out.add(o);
                } catch (Exception ignored) { }
            }
            Collections.sort(out, (x, y) -> x.optString("name").toLowerCase(Locale.ROOT)
                    .compareTo(y.optString("name").toLowerCase(Locale.ROOT)));
            JSONArray arr = new JSONArray();
            for (JSONObject o : out) arr.put(o);
            return arr.toString();
        }

        @JavascriptInterface
        public boolean has(String pkg) {
            return launchIntent(pkg) != null;
        }

        @JavascriptInterface
        public boolean launch(String pkg) {
            Intent i = launchIntent(pkg);
            if (i == null) return false;
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try { startActivity(i); return true; } catch (ActivityNotFoundException e) { return false; }
        }

        @JavascriptInterface
        public void chat() {
            ui.post(() -> startActivity(new Intent(HomeActivity.this, ChatActivity.class)));
        }

        /** Opens the chat and asks RoboDad this question. */
        @JavascriptInterface
        public void ask(String q) {
            ui.post(() -> startActivity(new Intent(HomeActivity.this, ChatActivity.class)
                    .putExtra("ask", q).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)));
        }

        /** Opens YouTube on the TV with this search. */
        @JavascriptInterface
        public boolean youtube(String q) {
            String pkg = "com.google.android.youtube.tv";
            Uri u = Uri.parse("https://www.youtube.com/results?search_query=" + Uri.encode(q));
            Intent[] tries = {
                new Intent(Intent.ACTION_VIEW, u).setPackage(pkg),
                new Intent(Intent.ACTION_SEARCH).setPackage(pkg).putExtra(android.app.SearchManager.QUERY, q),
            };
            for (Intent i : tries) {
                try { startActivity(i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); return true; }
                catch (Exception ignored) { }
            }
            return launch(pkg);
        }

        /** Opens an app's Play Store page so it can be installed. */
        @JavascriptInterface
        public void market(String pkg) {
            ui.post(() -> {
                try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=" + pkg)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); }
                catch (Exception e) { launch("com.android.vending"); }
            });
        }

        @JavascriptInterface
        public void settings() {
            ui.post(() -> {
                try { startActivity(new Intent(Settings.ACTION_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)); }
                catch (ActivityNotFoundException ignored) { }
            });
        }

        @JavascriptInterface
        public String version() {
            try { return getPackageManager().getPackageInfo(getPackageName(), 0).versionName; }
            catch (Exception e) { return ""; }
        }
    }

    private List<ResolveInfo> query(PackageManager pm, String category) {
        Intent i = new Intent(Intent.ACTION_MAIN).addCategory(category);
        try { return pm.queryIntentActivities(i, 0); } catch (Exception e) { return new ArrayList<>(); }
    }

    private Intent launchIntent(String pkg) {
        if (pkg == null || pkg.isEmpty() || pkg.equals(getPackageName())) return null;
        PackageManager pm = getPackageManager();
        Intent i = null;
        try { i = pm.getLeanbackLaunchIntentForPackage(pkg); } catch (Exception ignored) { }
        if (i == null) {
            try { i = pm.getLaunchIntentForPackage(pkg); } catch (Exception ignored) { }
        }
        return i;
    }

    /** The app's square launcher icon, for round or odd-shaped spots in the room. */
    private String iconArt(PackageManager pm, ActivityInfo a) {
        String key = "icon:" + a.packageName;
        synchronized (artCache) { if (artCache.containsKey(key)) return artCache.get(key); }
        String result = "";
        try {
            Drawable d = a.loadIcon(pm);
            Bitmap b = Bitmap.createBitmap(192, 192, Bitmap.Config.ARGB_8888);
            Canvas c = new Canvas(b);
            d.setBounds(0, 0, 192, 192);
            d.draw(c);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            b.compress(Bitmap.CompressFormat.PNG, 100, out);
            result = "data:image/png;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP);
        } catch (Exception ignored) { }
        synchronized (artCache) { artCache.put(key, result); }
        return result;
    }

    /** The app's own TV banner (or its icon if it has none), as a picture the page can show. */
    private String art(PackageManager pm, ActivityInfo a) {
        String key = a.packageName;
        synchronized (artCache) { if (artCache.containsKey(key)) return artCache.get(key); }
        String result = "";
        try {
            Drawable d = a.loadBanner(pm);
            boolean banner = d != null;
            if (d == null) d = a.applicationInfo.loadBanner(pm);
            banner = banner || d != null;
            if (d == null) d = a.loadIcon(pm);
            int w = banner ? 320 : 128, h = banner ? 180 : 128;
            Bitmap b = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888);
            Canvas c = new Canvas(b);
            d.setBounds(0, 0, w, h);
            d.draw(c);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            b.compress(Bitmap.CompressFormat.PNG, 100, out);
            result = (banner ? "banner:" : "icon:") + "data:image/png;base64," + Base64.encodeToString(out.toByteArray(), Base64.NO_WRAP);
        } catch (Exception ignored) { }
        synchronized (artCache) { artCache.put(key, result); }
        return result;
    }
}
