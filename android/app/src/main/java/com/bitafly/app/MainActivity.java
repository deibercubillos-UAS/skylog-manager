package com.bitafly.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Plugin nativo de lectura de logs DJI (FlightRecord) — F3.6.
        registerPlugin(FlightFilesPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
