package com.bitafly.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.util.Log;
import android.webkit.CookieManager;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.documentfile.provider.DocumentFile;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import java.io.DataOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * FlightSyncWorker — vigilancia en segundo plano de la carpeta DJI FlightRecord (F3.8).
 *
 * Corre vía WorkManager (periódico, mín. 15 min) aunque la app esté cerrada.
 * Lee los .txt por la carpeta SAF elegida (DocumentFile/ContentResolver) o, en su
 * defecto, por acceso directo a File. Reusa la SESIÓN de la WebView (cookies) → sube
 * al mismo POST /api/logbook/import-dji, sin cambios en el backend ni tokens aparte.
 * Deduplica localmente por nombre (SharedPreferences) + el server descarta 409.
 */
public class FlightSyncWorker extends Worker {
    private static final String TAG = "BitaflyDjiSync";
    static final String API_BASE = "https://bitafly.com";
    private static final String PREFS = "bitafly_dji_sync";
    private static final String KEY_UPLOADED = "uploaded_names";
    private static final String KEY_TREE_URI = "tree_uri";
    private static final String CHANNEL_ID = "dji_sync";

    private static final String[] KNOWN_PATHS = {
        "DJI/com.dji.industry.pilot/FlightRecord",
        "DJI/dji.go.v5/FlightRecord",
        "DJI/dji.pilot/FlightRecord",
        "Android/data/dji.go.v5/files/FlightRecord"
    };

    // Un log a subir: nombre + cómo abrir su contenido (File o content URI).
    private static class Entry {
        final String name;
        final File file;       // una de las dos vías
        final Uri uri;
        Entry(String name, File file, Uri uri) { this.name = name; this.file = file; this.uri = uri; }
    }

    public FlightSyncWorker(@NonNull Context ctx, @NonNull WorkerParameters params) {
        super(ctx, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context ctx = getApplicationContext();

        String cookies = null;
        try { cookies = CookieManager.getInstance().getCookie(API_BASE); } catch (Exception ignored) {}
        if (cookies == null || cookies.isEmpty()) {
            Log.i(TAG, "Sin sesion (sin cookies de la WebView); nada que sincronizar.");
            return Result.success();
        }

        List<Entry> files = scan(ctx);
        Log.i(TAG, "Logs DJI encontrados: " + files.size());
        if (files.isEmpty()) return Result.success();

        SharedPreferences prefs = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
        Set<String> uploaded = new HashSet<>(prefs.getStringSet(KEY_UPLOADED, new HashSet<>()));

        int imported = 0;
        for (Entry e : files) {
            if (uploaded.contains(e.name)) continue;
            int status = uploadEntry(ctx, e, cookies);
            Log.i(TAG, "Subida " + e.name + " -> HTTP " + status);
            if (status == 200 || status == 201 || status == 409) {
                uploaded.add(e.name);
                if (status != 409) imported++;
            }
        }
        prefs.edit().putStringSet(KEY_UPLOADED, uploaded).apply();

        if (imported > 0) postNotification(ctx, imported);
        Log.i(TAG, "Ciclo terminado. Vuelos nuevos sincronizados: " + imported);
        return Result.success();
    }

    private List<Entry> scan(Context ctx) {
        List<Entry> out = new ArrayList<>();

        // 1) Carpeta SAF elegida (vía robusta)
        String treeStr = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_TREE_URI, null);
        if (treeStr != null) {
            try {
                DocumentFile tree = DocumentFile.fromTreeUri(ctx, Uri.parse(treeStr));
                collectTxtDoc(tree, out, 0, 4);
            } catch (Exception ignored) {}
        }

        // 2) Respaldo: acceso directo a File si hay all-files-access
        boolean allFiles = Build.VERSION.SDK_INT < Build.VERSION_CODES.R || Environment.isExternalStorageManager();
        if (out.isEmpty() && allFiles) {
            File root = Environment.getExternalStorageDirectory();
            List<File> raw = new ArrayList<>();
            for (String rel : KNOWN_PATHS) {
                File dir = new File(root, rel);
                if (dir.isDirectory()) collectTxtRecursive(dir, raw, 0, 3);
            }
            if (raw.isEmpty()) walkForFlightRecords(root, raw, 0, 6);
            for (File f : raw) out.add(new Entry(f.getName(), f, null));
        }
        return out;
    }

    private void collectTxtDoc(DocumentFile dir, List<Entry> out, int depth, int maxDepth) {
        if (dir == null) return;
        DocumentFile[] kids;
        try { kids = dir.listFiles(); } catch (Exception e) { return; }
        for (DocumentFile f : kids) {
            String n = f.getName();
            if (f.isFile() && n != null && n.toLowerCase().endsWith(".txt")) {
                out.add(new Entry(n, null, f.getUri()));
            } else if (f.isDirectory() && depth < maxDepth) {
                collectTxtDoc(f, out, depth + 1, maxDepth);
            }
        }
    }

    private void walkForFlightRecords(File dir, List<File> out, int depth, int maxDepth) {
        if (depth > maxDepth) return;
        File[] kids = dir.listFiles();
        if (kids == null) return;
        for (File k : kids) {
            if (!k.isDirectory()) continue;
            String name = k.getName();
            if (depth == 0 && name.equalsIgnoreCase("Android")) continue;
            if (name.equalsIgnoreCase("FlightRecord")) collectTxtRecursive(k, out, 0, 3);
            else walkForFlightRecords(k, out, depth + 1, maxDepth);
        }
    }

    private void collectTxtRecursive(File dir, List<File> out, int depth, int maxDepth) {
        File[] kids = dir.listFiles();
        if (kids == null) return;
        for (File k : kids) {
            if (k.isFile() && k.getName().toLowerCase().endsWith(".txt")) out.add(k);
            else if (k.isDirectory() && depth < maxDepth) collectTxtRecursive(k, out, depth + 1, maxDepth);
        }
    }

    private int uploadEntry(Context ctx, Entry e, String cookies) {
        String boundary = "----bitafly" + System.currentTimeMillis();
        HttpURLConnection conn = null;
        try {
            InputStream src = (e.uri != null)
                ? ctx.getContentResolver().openInputStream(e.uri)
                : new FileInputStream(e.file);
            if (src == null) return -1;

            URL url = new URL(API_BASE + "/api/logbook/import-dji");
            conn = (HttpURLConnection) url.openConnection();
            conn.setDoOutput(true);
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Cookie", cookies);
            conn.setRequestProperty("Content-Type", "multipart/form-data; boundary=" + boundary);
            conn.setConnectTimeout(20000);
            conn.setReadTimeout(60000);

            try (DataOutputStream out = new DataOutputStream(conn.getOutputStream()); InputStream in = src) {
                out.writeBytes("--" + boundary + "\r\n");
                out.writeBytes("Content-Disposition: form-data; name=\"file\"; filename=\"" + e.name + "\"\r\n");
                out.writeBytes("Content-Type: text/plain\r\n\r\n");
                byte[] buf = new byte[8192];
                int n;
                while ((n = in.read(buf)) != -1) out.write(buf, 0, n);
                out.writeBytes("\r\n--" + boundary + "--\r\n");
                out.flush();
            }
            return conn.getResponseCode();
        } catch (Exception ex) {
            Log.e(TAG, "Error subiendo " + e.name, ex);
            return -1;
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    private void postNotification(Context ctx, int count) {
        NotificationManager nm = (NotificationManager) ctx.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            nm.createNotificationChannel(
                new NotificationChannel(CHANNEL_ID, "Sincronizacion DJI", NotificationManager.IMPORTANCE_LOW));
        }
        Notification n = new NotificationCompat.Builder(ctx, CHANNEL_ID)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle("BitaFly")
            .setContentText(count + " vuelo(s) DJI sincronizado(s) automaticamente")
            .setAutoCancel(true)
            .build();
        nm.notify(1001, n);
    }
}
