package com.bitafly.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;
import android.util.Base64;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * FlightFiles — plugin nativo Android para leer los logs DJI (.txt) de la carpeta
 * FlightRecord directamente del almacenamiento del control/celular, sin que el
 * usuario navegue la ruta. Lo consume lib/flightImportBridge.js (F3.7), que reusa
 * el mismo POST /api/logbook/import-dji del flujo web.
 *
 * Requiere acceso a "todos los archivos" (MANAGE_EXTERNAL_STORAGE en Android 11+),
 * porque los logs viven en la carpeta pública DJI/ fuera del sandbox de la app.
 */
@CapacitorPlugin(name = "FlightFiles")
public class FlightFilesPlugin extends Plugin {

    private static final String WORK_NAME = "bitafly-dji-sync";

    // Rutas conocidas de logs DJI, relativas a la raíz de almacenamiento externo.
    private static final String[] KNOWN_PATHS = {
        "DJI/com.dji.industry.pilot/FlightRecord", // DJI Pilot 2 Enterprise (controles RC)
        "DJI/dji.go.v5/FlightRecord",
        "DJI/dji.pilot/FlightRecord",
        "Android/data/dji.go.v5/files/FlightRecord" // DJI Fly (puede estar restringido en A11+)
    };

    private boolean hasAllFilesAccess() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            return Environment.isExternalStorageManager();
        }
        return true; // En <11 basta READ_EXTERNAL_STORAGE (permiso de instalación/runtime)
    }

    @PluginMethod
    public void checkPermission(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", hasAllFilesAccess());
        call.resolve(ret);
    }

    @PluginMethod
    public void requestPermission(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R && !Environment.isExternalStorageManager()) {
            try {
                Intent intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
                intent.setData(Uri.parse("package:" + getContext().getPackageName()));
                getActivity().startActivity(intent);
            } catch (Exception e) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION);
                getActivity().startActivity(intent);
            }
        }
        JSObject ret = new JSObject();
        ret.put("granted", hasAllFilesAccess());
        call.resolve(ret);
    }

    @PluginMethod
    public void listFlightFiles(PluginCall call) {
        if (!hasAllFilesAccess()) {
            call.reject("PERMISSION_DENIED");
            return;
        }
        File root = Environment.getExternalStorageDirectory();
        List<File> found = new ArrayList<>();

        // 1) Rutas conocidas
        for (String rel : KNOWN_PATHS) {
            File dir = new File(root, rel);
            if (dir.isDirectory()) collectTxt(dir, found);
        }
        // 2) Respaldo: buscar carpetas "FlightRecord" bajo DJI/ con profundidad limitada
        if (found.isEmpty()) {
            File dji = new File(root, "DJI");
            if (dji.isDirectory()) findFlightRecordDirs(dji, found, 0, 4);
        }

        JSArray arr = new JSArray();
        for (File f : found) {
            JSObject o = new JSObject();
            o.put("name", f.getName());
            o.put("path", f.getAbsolutePath());
            o.put("size", f.length());
            o.put("mtime", f.lastModified());
            arr.put(o);
        }
        JSObject ret = new JSObject();
        ret.put("files", arr);
        call.resolve(ret);
    }

    @PluginMethod
    public void readFlightFile(PluginCall call) {
        String path = call.getString("path");
        if (path == null) { call.reject("NO_PATH"); return; }
        if (!hasAllFilesAccess()) { call.reject("PERMISSION_DENIED"); return; }

        File f = new File(path);
        if (!f.isFile()) { call.reject("NOT_FOUND"); return; }
        try (FileInputStream fis = new FileInputStream(f)) {
            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int n;
            while ((n = fis.read(buf)) != -1) bos.write(buf, 0, n);
            String b64 = Base64.encodeToString(bos.toByteArray(), Base64.NO_WRAP);
            JSObject ret = new JSObject();
            ret.put("name", f.getName());
            ret.put("data", b64);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("READ_ERROR", e);
        }
    }

    // ── Sincronización en segundo plano (WorkManager — F3.8) ───────────────

    @PluginMethod
    public void enableBackgroundSync(PluginCall call) {
        Constraints constraints = new Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build();
        PeriodicWorkRequest req = new PeriodicWorkRequest.Builder(
                FlightSyncWorker.class, 15, TimeUnit.MINUTES)
            .setConstraints(constraints)
            .build();
        WorkManager.getInstance(getContext())
            .enqueueUniquePeriodicWork(WORK_NAME, ExistingPeriodicWorkPolicy.UPDATE, req);
        JSObject ret = new JSObject();
        ret.put("enabled", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void disableBackgroundSync(PluginCall call) {
        WorkManager.getInstance(getContext()).cancelUniqueWork(WORK_NAME);
        JSObject ret = new JSObject();
        ret.put("enabled", false);
        call.resolve(ret);
    }

    // Ejecuta un ciclo de sincronización inmediato (diagnóstico / "sincronizar ahora").
    @PluginMethod
    public void runBackgroundSyncNow(PluginCall call) {
        OneTimeWorkRequest req = new OneTimeWorkRequest.Builder(FlightSyncWorker.class).build();
        WorkManager.getInstance(getContext()).enqueue(req);
        call.resolve();
    }

    private void collectTxt(File dir, List<File> out) {
        File[] kids = dir.listFiles();
        if (kids == null) return;
        for (File k : kids) {
            if (k.isFile() && k.getName().toLowerCase().endsWith(".txt")) out.add(k);
        }
    }

    private void findFlightRecordDirs(File dir, List<File> out, int depth, int maxDepth) {
        if (depth > maxDepth) return;
        File[] kids = dir.listFiles();
        if (kids == null) return;
        for (File k : kids) {
            if (k.isDirectory()) {
                if (k.getName().equalsIgnoreCase("FlightRecord")) collectTxt(k, out);
                else findFlightRecordDirs(k, out, depth + 1, maxDepth);
            }
        }
    }
}
