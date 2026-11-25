package com.bitafly.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;

import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private static final int RC_LOCATION = 1001;

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
        // Geolocalización del WebView (botón "usar mi ubicación" en meteorología): Capacitor ya
        // concede el permiso de geolocalización al WebView, pero Android solo entrega la posición
        // si la app tiene el permiso en runtime. Lo pedimos una vez; si el usuario lo niega, la
        // función degrada a escribir el lugar a mano y el resto de la app no se afecta.
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                != PackageManager.PERMISSION_GRANTED
                && ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION)
                != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(
                this,
                new String[] {
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
                },
                RC_LOCATION
            );
        }
    }
}
