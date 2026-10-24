package com.bitafly.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(FlightFilesPlugin.class);
        registerPlugin(AppUpdatePlugin.class);
        super.onCreate(savedInstanceState);
        // Variante Google Play: la web lo detecta por el user-agent y oculta/bloquea los pagos (política de facturación de Play).
        if (BuildConfig.PLAY_BUILD && getBridge() != null && getBridge().getWebView() != null) {
            android.webkit.WebSettings ws = getBridge().getWebView().getSettings();
            ws.setUserAgentString(ws.getUserAgentString() + " BitaFlyPlay");
        }
    }
}
