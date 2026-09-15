package com.choongchoongeestar.workout;

import com.getcapacitor.BridgeActivity;
import androidx.activity.OnBackPressedCallback;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(AppSettingsPlugin.class);
        super.onCreate(savedInstanceState);
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                var webView = getBridge().getWebView();
                var insets = ViewCompat.getRootWindowInsets(webView);
                if (insets != null && insets.isVisible(WindowInsetsCompat.Type.ime())) {
                    new WindowInsetsControllerCompat(getWindow(), webView).hide(WindowInsetsCompat.Type.ime());
                    return;
                }
                webView.evaluateJavascript("(() => { const dialog = document.querySelector('dialog[open]'); " +
                    "if (dialog) { dialog.dispatchEvent(new Event('cancel', {cancelable:true})); return true; } " +
                    "if (window.history.state?.idx > 0) { window.history.back(); return true; } return false; })()", result -> {
                    if ("true".equals(result)) return;
                    if (webView.canGoBack()) webView.goBack();
                    else {
                        setEnabled(false);
                        getOnBackPressedDispatcher().onBackPressed();
                        setEnabled(true);
                    }
                });
            }
        });
    }
}
