package com.miflix.tv;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.appcompat.app.AppCompatActivity;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MimeTypes;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.common.TrackSelectionParameters;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.DefaultRenderersFactory;
import androidx.media3.ui.PlayerView;

import org.json.JSONArray;
import org.json.JSONObject;

import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends AppCompatActivity {
    private FrameLayout root;
    private WebView webView;
    private FrameLayout playerLayer;
    private PlayerView playerView;
    private ProgressBar playerLoading;
    private TextView playerTitle;
    private TextView playerClose;
    private FrameLayout splashLayer;
    private ExoPlayer player;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private boolean playerVisible = false;
    private String currentTitle = "MiFlix";
    private final Runnable hidePlayerChrome = () -> {
        if (!playerVisible) return;
        if (playerTitle != null) playerTitle.animate().alpha(0f).setDuration(160).withEndAction(() -> playerTitle.setVisibility(View.GONE)).start();
        if (playerClose != null) playerClose.animate().alpha(0f).setDuration(160).withEndAction(() -> playerClose.setVisibility(View.GONE)).start();
    };

    private final Runnable stateTicker = new Runnable() {
        @Override public void run() {
            if (playerVisible && player != null) {
                sendNativeState("tick");
                mainHandler.postDelayed(this, 1000);
            }
        }
    };

    @SuppressLint({"SetJavaScriptEnabled", "JavascriptInterface"})
    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        hideSystemUi();

        root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);
        setContentView(root);

        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(5,5,7));
        webView.setFocusable(true);
        webView.setFocusableInTouchMode(true);
        WebSettings ws = webView.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        ws.setDatabaseEnabled(true);
        ws.setAllowFileAccess(true);
        ws.setAllowContentAccess(true);
        ws.setMediaPlaybackRequiresUserGesture(false);
        ws.setLoadWithOverviewMode(false);
        ws.setUseWideViewPort(true);
        ws.setSupportZoom(false);
        ws.setBuiltInZoomControls(false);
        ws.setDisplayZoomControls(false);
        ws.setCacheMode(WebSettings.LOAD_DEFAULT);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.setVerticalScrollBarEnabled(false);
        webView.setHorizontalScrollBarEnabled(false);
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
        ws.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        ws.setAllowFileAccessFromFileURLs(true);
        ws.setAllowUniversalAccessFromFileURLs(true);
        ws.setUserAgentString(ws.getUserAgentString() + " MiFlixTV/1.9.7");
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true);
        webView.setWebViewClient(new WebViewClient() {
            @Override public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                mainHandler.postDelayed(() -> hideSplash(), 550);
            }
        });
        webView.setWebChromeClient(new WebChromeClient());
        webView.addJavascriptInterface(new MiFlixBridge(), "MiFlixAndroid");
        root.addView(webView, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        buildNativePlayer();
        buildSplash();
        webView.loadUrl("file:///android_asset/miflix/index.html");
    }

    private void buildNativePlayer() {
        playerLayer = new FrameLayout(this);
        playerLayer.setBackgroundColor(Color.BLACK);
        playerLayer.setVisibility(View.GONE);
        root.addView(playerLayer, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        playerView = (PlayerView) getLayoutInflater().inflate(R.layout.player_view_tv, playerLayer, false);
        playerView.setBackgroundColor(Color.BLACK);
        playerView.setUseController(true);
        playerView.setControllerAutoShow(true);
        playerView.setControllerHideOnTouch(true);
        playerView.setControllerShowTimeoutMs(4000);
        playerView.setShowRewindButton(true);
        playerView.setShowFastForwardButton(true);
        playerView.setShowSubtitleButton(true);
        playerView.setKeepScreenOn(true);
        playerView.setKeepContentOnPlayerReset(true);
        playerView.setShutterBackgroundColor(Color.TRANSPARENT);
        playerLayer.addView(playerView, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        playerLoading = new ProgressBar(this);
        FrameLayout.LayoutParams loadParams = new FrameLayout.LayoutParams(dp(52), dp(52));
        loadParams.gravity = Gravity.CENTER;
        playerLayer.addView(playerLoading, loadParams);

        playerTitle = new TextView(this);
        playerTitle.setTextColor(Color.WHITE);
        playerTitle.setTextSize(20);
        playerTitle.setMaxLines(1);
        playerTitle.setPadding(dp(18), dp(10), dp(18), dp(10));
        GradientDrawable titleBg = new GradientDrawable();
        titleBg.setColor(0x66000000);
        titleBg.setCornerRadius(dp(18));
        playerTitle.setBackground(titleBg);
        FrameLayout.LayoutParams titleParams = new FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        titleParams.gravity = Gravity.TOP | Gravity.START;
        titleParams.setMargins(dp(24), dp(22), dp(100), 0);
        playerLayer.addView(playerTitle, titleParams);

        playerClose = new TextView(this);
        playerClose.setText("✕");
        playerClose.setTextColor(Color.WHITE);
        playerClose.setTextSize(26);
        playerClose.setGravity(Gravity.CENTER);
        playerClose.setFocusable(true);
        playerClose.setClickable(true);
        GradientDrawable closeBg = new GradientDrawable();
        closeBg.setColor(0x99000000);
        closeBg.setShape(GradientDrawable.OVAL);
        playerClose.setBackground(closeBg);
        playerClose.setOnClickListener(v -> closeNativePlayer(true));
        FrameLayout.LayoutParams closeParams = new FrameLayout.LayoutParams(dp(58), dp(58));
        closeParams.gravity = Gravity.TOP | Gravity.END;
        closeParams.setMargins(0, dp(18), dp(22), 0);
        playerLayer.addView(playerClose, closeParams);
    }

    private void buildSplash() {
        splashLayer = new FrameLayout(this);
        splashLayer.setBackgroundColor(Color.rgb(5, 5, 7));
        splashLayer.setClickable(true);
        splashLayer.setFocusable(true);

        TextView logo = new TextView(this);
        logo.setText("M");
        logo.setTextColor(Color.WHITE);
        logo.setTextSize(42);
        logo.setGravity(Gravity.CENTER);
        logo.setTypeface(logo.getTypeface(), android.graphics.Typeface.BOLD);
        GradientDrawable logoBg = new GradientDrawable(
                GradientDrawable.Orientation.TL_BR,
                new int[]{0xFF8B5CF6, 0xFF5B39D8});
        logoBg.setCornerRadius(dp(28));
        logo.setBackground(logoBg);
        FrameLayout.LayoutParams logoParams = new FrameLayout.LayoutParams(dp(112), dp(112));
        logoParams.gravity = Gravity.CENTER;
        logoParams.setMargins(0, 0, 0, dp(34));
        splashLayer.addView(logo, logoParams);

        TextView title = new TextView(this);
        title.setText("MiFlix");
        title.setTextColor(Color.WHITE);
        title.setTextSize(28);
        title.setGravity(Gravity.CENTER);
        title.setTypeface(title.getTypeface(), android.graphics.Typeface.BOLD);
        FrameLayout.LayoutParams titleParams = new FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        titleParams.gravity = Gravity.CENTER;
        titleParams.setMargins(0, dp(132), 0, 0);
        splashLayer.addView(title, titleParams);

        TextView subtitle = new TextView(this);
        subtitle.setText("Your media, one place");
        subtitle.setTextColor(0xFF9A9DA8);
        subtitle.setTextSize(13);
        subtitle.setGravity(Gravity.CENTER);
        FrameLayout.LayoutParams subParams = new FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        subParams.gravity = Gravity.CENTER;
        subParams.setMargins(0, dp(190), 0, 0);
        splashLayer.addView(subtitle, subParams);

        root.addView(splashLayer, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        splashLayer.bringToFront();
    }

    private void hideSplash() {
        if (splashLayer == null || splashLayer.getVisibility() != View.VISIBLE) return;
        splashLayer.animate().alpha(0f).setDuration(320).withEndAction(() -> {
            splashLayer.setVisibility(View.GONE);
            splashLayer.setAlpha(1f);
            webView.requestFocus();
        }).start();
    }

    private void showPlayerChrome() {
        if (!playerVisible) return;
        mainHandler.removeCallbacks(hidePlayerChrome);
        if (playerTitle != null) { playerTitle.setVisibility(View.VISIBLE); playerTitle.setAlpha(1f); }
        if (playerClose != null) { playerClose.setVisibility(View.VISIBLE); playerClose.setAlpha(1f); }
        mainHandler.postDelayed(hidePlayerChrome, 2000);
    }

    private void ensurePlayer() {
        if (player != null) return;
        DefaultRenderersFactory renderersFactory = new DefaultRenderersFactory(this)
                .setEnableDecoderFallback(true);
        player = new ExoPlayer.Builder(this, renderersFactory).build();
        player.setVideoScalingMode(C.VIDEO_SCALING_MODE_SCALE_TO_FIT);
        player.setSeekBackIncrementMs(10_000);
        player.setSeekForwardIncrementMs(10_000);
        playerView.setPlayer(player);
        player.addListener(new Player.Listener() {
            @Override public void onPlaybackStateChanged(int state) {
                playerLoading.setVisibility(state == Player.STATE_BUFFERING ? View.VISIBLE : View.GONE);
                if (state == Player.STATE_ENDED) sendNativeState("ended");
            }
            @Override public void onIsPlayingChanged(boolean isPlaying) {
                sendNativeState(isPlaying ? "play" : "pause");
            }
            @Override public void onPositionDiscontinuity(Player.PositionInfo oldPosition, Player.PositionInfo newPosition, int reason) {
                if (reason == Player.DISCONTINUITY_REASON_SEEK) sendNativeState("seek");
            }
            @Override public void onPlayerError(PlaybackException error) {
                sendNativeState("error");
            }
        });
    }

    private void playNative(String raw) {
        runOnUiThread(() -> {
            try {
                JSONObject data = new JSONObject(raw);
                String url = data.optString("url", "");
                if (url.isEmpty()) return;
                currentTitle = data.optString("title", "MiFlix");
                int season = data.optInt("season", 0), episode = data.optInt("episode", 0);
                playerTitle.setText(currentTitle + (season > 0 ? "  ·  S" + season + " E" + episode : ""));

                ensurePlayer();
                List<MediaItem.SubtitleConfiguration> subtitleConfigs = new ArrayList<>();
                JSONArray subtitles = data.optJSONArray("subtitles");
                String preferredSubtitle = normalizeLanguage(data.optString("preferredSubtitle", ""));
                if (subtitles != null) {
                    for (int i = 0; i < subtitles.length(); i++) {
                        JSONObject s = subtitles.optJSONObject(i);
                        if (s == null) continue;
                        String subUrl = s.optString("url", "");
                        if (subUrl.isEmpty()) continue;
                        String lang = normalizeLanguage(s.optString("lang", ""));
                        String label = s.optString("label", lang.isEmpty() ? "Subtitle " + (i + 1) : lang);
                        int flags = (!preferredSubtitle.isEmpty() && languageMatches(lang, preferredSubtitle)) ? C.SELECTION_FLAG_DEFAULT : 0;
                        MediaItem.SubtitleConfiguration cfg = new MediaItem.SubtitleConfiguration.Builder(Uri.parse(subUrl))
                                .setMimeType(subtitleMime(subUrl))
                                .setLanguage(lang.isEmpty() ? null : lang)
                                .setLabel(label)
                                .setSelectionFlags(flags)
                                .build();
                        subtitleConfigs.add(cfg);
                    }
                }

                MediaItem item = new MediaItem.Builder()
                        .setUri(Uri.parse(url))
                        .setSubtitleConfigurations(subtitleConfigs)
                        .build();

                String preferredAudio = normalizeLanguage(data.optString("preferredAudio", ""));
                TrackSelectionParameters.Builder trackBuilder = player.getTrackSelectionParameters().buildUpon();
                if (!preferredAudio.isEmpty()) trackBuilder.setPreferredAudioLanguage(preferredAudio);
                if (!preferredSubtitle.isEmpty()) {
                    trackBuilder.setPreferredTextLanguage(preferredSubtitle);
                    trackBuilder.setSelectUndeterminedTextLanguage(true);
                }
                player.setTrackSelectionParameters(trackBuilder.build());
                player.setMediaItem(item);
                player.prepare();
                long positionMs = Math.max(0L, (long)(data.optDouble("position", 0) * 1000.0));
                if (positionMs > 0) player.seekTo(positionMs);
                player.play();

                playerVisible = true;
                playerLayer.setVisibility(View.VISIBLE);
                playerLayer.bringToFront();
                playerView.requestFocus();
                showPlayerChrome();
                hideSystemUi();
                mainHandler.removeCallbacks(stateTicker);
                mainHandler.post(stateTicker);
            } catch (Exception e) {
                sendJsError(e.getMessage());
            }
        });
    }

    private void nativeCommand(String raw) {
        runOnUiThread(() -> {
            if (player == null) return;
            try {
                JSONObject data = new JSONObject(raw);
                String action = data.optString("action", "");
                switch (action) {
                    case "play": player.play(); break;
                    case "pause": player.pause(); break;
                    case "seek": player.seekTo(Math.max(0L, (long)(data.optDouble("position", 0) * 1000.0))); break;
                    case "close": closeNativePlayer(true); break;
                    default: break;
                }
            } catch (Exception ignored) { }
        });
    }

    private void closeNativePlayer(boolean notifyJs) {
        if (player != null) {
            try { player.pause(); player.stop(); player.clearMediaItems(); } catch (Exception ignored) { }
        }
        playerVisible = false;
        mainHandler.removeCallbacks(hidePlayerChrome);
        playerLayer.setVisibility(View.GONE);
        mainHandler.removeCallbacks(stateTicker);
        webView.requestFocus();
        if (notifyJs) sendNativeState("closed");
    }

    private void sendNativeState(String event) {
        if (webView == null) return;
        long pos = player == null ? 0 : Math.max(0, player.getCurrentPosition());
        long dur = player == null ? 0 : Math.max(0, player.getDuration());
        boolean playing = player != null && player.isPlaying();
        try {
            JSONObject state = new JSONObject();
            state.put("event", event);
            state.put("position", pos / 1000.0);
            state.put("duration", dur == C.TIME_UNSET ? 0 : dur / 1000.0);
            state.put("playing", playing);
            String arg = JSONObject.quote(state.toString());
            runOnUiThread(() -> webView.evaluateJavascript("window.onMiFlixNativePlayerState&&window.onMiFlixNativePlayerState(" + arg + ");", null));
        } catch (Exception ignored) { }
    }

    private void sendJsError(String message) {
        final String msg = message == null ? "Native player error" : message;
        runOnUiThread(() -> webView.evaluateJavascript("window.onMiFlixNativePlayerState&&window.onMiFlixNativePlayerState(" + JSONObject.quote("{\"event\":\"error\",\"message\":" + JSONObject.quote(msg) + "}") + ");", null));
    }

    private String discoverParty(String room) {
        room = room == null ? "" : room.trim().toUpperCase();
        if (room.isEmpty()) return "{\"ok\":false,\"error\":\"Missing room\"}";
        DatagramSocket socket = null;
        try {
            socket = new DatagramSocket();
            socket.setBroadcast(true);
            socket.setSoTimeout(2800);
            byte[] payload = ("MIFLIX_DISCOVER:" + room).getBytes(StandardCharsets.US_ASCII);
            DatagramPacket packet = new DatagramPacket(payload, payload.length, InetAddress.getByName("255.255.255.255"), 19287);
            socket.send(packet);
            byte[] buf = new byte[256];
            DatagramPacket response = new DatagramPacket(buf, buf.length);
            socket.receive(response);
            String text = new String(response.getData(), 0, response.getLength(), StandardCharsets.US_ASCII).trim();
            if (text.startsWith("MIFLIX_HOST:")) {
                String[] parts = text.split(":");
                if (parts.length >= 3 && room.equalsIgnoreCase(parts[1])) {
                    return "{\"ok\":true,\"host\":\"" + response.getAddress().getHostAddress() + "\"}";
                }
            }
            return "{\"ok\":false,\"error\":\"Room not found\"}";
        } catch (Exception e) {
            return "{\"ok\":false,\"error\":" + JSONObject.quote(e.getMessage() == null ? "Discovery failed" : e.getMessage()) + "}";
        } finally {
            if (socket != null) socket.close();
        }
    }

    private String subtitleMime(String url) {
        String x = url == null ? "" : url.toLowerCase();
        int q = x.indexOf('?'); if (q >= 0) x = x.substring(0, q);
        if (x.endsWith(".vtt")) return MimeTypes.TEXT_VTT;
        if (x.endsWith(".ass") || x.endsWith(".ssa")) return MimeTypes.TEXT_SSA;
        if (x.endsWith(".ttml") || x.endsWith(".xml")) return MimeTypes.APPLICATION_TTML;
        return MimeTypes.APPLICATION_SUBRIP;
    }

    private String normalizeLanguage(String value) {
        if (value == null) return "";
        String x = value.trim().toLowerCase();
        if (x.equals("spa") || x.equals("esl")) return "es";
        if (x.equals("eng")) return "en";
        if (x.equals("jpn")) return "ja";
        if (x.equals("por")) return "pt";
        if (x.equals("fre") || x.equals("fra")) return "fr";
        if (x.equals("ger") || x.equals("deu")) return "de";
        if (x.equals("ita")) return "it";
        if (x.equals("kor")) return "ko";
        if (x.equals("chi") || x.equals("zho")) return "zh";
        int dash = x.indexOf('-');
        return dash > 0 ? x.substring(0, dash) : x;
    }

    private boolean languageMatches(String a, String b) {
        return !normalizeLanguage(a).isEmpty() && normalizeLanguage(a).equals(normalizeLanguage(b));
    }

    private int dp(int value) {
        return (int)(value * getResources().getDisplayMetrics().density + 0.5f);
    }

    @SuppressWarnings("deprecation")
    private void hideSystemUi() {
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_FULLSCREEN |
                View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN |
                View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
                View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
    }

    @Override public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (playerVisible && keyCode != KeyEvent.KEYCODE_BACK) {
            showPlayerChrome();
            if (playerView != null) playerView.showController();
        }
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            if (playerVisible) {
                closeNativePlayer(true);
            } else if (webView != null) {
                webView.evaluateJavascript("window.handleMiFlixTvBack&&window.handleMiFlixTvBack();", null);
            }
            return true;
        }
        return super.onKeyDown(keyCode, event);
    }

    @Override protected void onResume() {
        super.onResume();
        hideSystemUi();
        if (player != null) playerView.onResume();
    }

    @Override protected void onPause() {
        if (player != null) playerView.onPause();
        super.onPause();
    }

    @Override protected void onDestroy() {
        mainHandler.removeCallbacksAndMessages(null);
        if (player != null) {
            player.release();
            player = null;
        }
        if (webView != null) webView.destroy();
        super.onDestroy();
    }

    private class MiFlixBridge {
        @JavascriptInterface public void play(String json) { playNative(json); }
        @JavascriptInterface public void command(String json) { nativeCommand(json); }
        @JavascriptInterface public String discoverParty(String room) { return MainActivity.this.discoverParty(room); }
        @JavascriptInterface public void openExternal(String url, String title) {
            runOnUiThread(() -> {
                try {
                    Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                    intent.setDataAndType(Uri.parse(url), "video/*");
                    startActivity(Intent.createChooser(intent, title == null ? "MiFlix" : title));
                } catch (Exception ignored) { }
            });
        }
        @JavascriptInterface public String platform() { return "android-tv"; }
    }
}
