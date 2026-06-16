package com.bitafly.app;

import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;
import android.util.Base64;

import androidx.activity.result.ActivityResult;
import androidx.documentfile.provider.DocumentFile;
import androidx.work.Constraints;
import androidx.work.ExistingPeriodicWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * FlightFiles — plugin nativo Android para leer los logs DJI (.txt) de la carpeta
 * FlightRecord. Dos vías de acceso:
 *   1) SAF (Storage Access Framework): el usuario elige la carpeta una vez
 *      (pickFlightFolder) y se persiste el permiso de URI → lectura por DocumentFile.
 *      Es la vía robusta: funciona en controles DJI donde listFiles() crudo falla
 *      aunque MANAGE_EXTERNAL_STORAGE esté concedido.
 *   2) Acceso directo a File (respaldo) si hay permiso de "todos los archivos".
 * Consumido por lib/flightImportBridge.js — reusa POST /api/logbook/import-dji.
 */
@CapacitorPlugin(name = "FlightFiles")
public class FlightFilesPlugin extends Plugin {

    private static final String WORK_NAME = "bitafly-dji-sync";
    static final String PREFS = "bitafly_dji_sync";
    static final String KEY_TREE_URI = "tree_uri";

    private static final String[] KNOWN_PATHS = {
        "DJI/com.dji.industry.pilot/FlightRecord", // DJI Pilot 2 Enterprise (controles RC)
        "DJI/dji.go.v5/FlightRecord",
        "DJI/dji.pilot/FlightRecord",
        "Android/data/dji.go.v5/files/FlightRecord"
    };

    private boolean hasAllFilesAccess() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            return Environment.isExternalStorageManager();
        }
        return true;
    }

    private SharedPrefsTree prefs() { return new SharedPrefsTree(getContext()); }

    // ── Permiso "todos los archivos" (respaldo) ────────────────────────────

    @PluginMethod
    public void checkPermission(PluginCall call) {
        JSObject ret = new JSObject();
        // "granted" = puede leer por ALGUNA vía: carpeta SAF elegida o all-files-access.
        ret.put("granted", prefs().getTreeUri() != null || hasAllFilesAccess());
        ret.put("allFiles", hasAllFilesAccess());
        ret.put("folder", prefs().getTreeUri() != null);
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
                getActivity().startActivity(new Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION));
            }
        }
        JSObject ret = new JSObject();
        ret.put("granted", hasAllFilesAccess());
        call.resolve(ret);
    }

    // ── Selección de carpeta vía SAF (vía robusta) ─────────────────────────

    @PluginMethod
    public void pickFlightFolder(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION
            | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
        startActivityForResult(call, intent, "folderPicked");
    }

    @ActivityCallback
    private void folderPicked(PluginCall call, ActivityResult result) {
        if (call == null) return;
        Intent data = result.getData();
        if (result.getResultCode() != Activity.RESULT_OK || data == null || data.getData() == null) {
            JSObject ret = new JSObject();
            ret.put("picked", false);
            call.resolve(ret);
            return;
        }
        Uri treeUri = data.getData();
        try {
            getContext().getContentResolver().takePersistableUriPermission(
                treeUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
        } catch (Exception ignored) {}
        prefs().setTreeUri(treeUri.toString());

        JSArray arr = new JSArray();
        collectTxtDoc(DocumentFile.fromTreeUri(getContext(), treeUri), arr, 0, 4);
        JSObject ret = new JSObject();
        ret.put("picked", true);
        ret.put("uri", treeUri.toString());
        ret.put("txt", arr.length());
        call.resolve(ret);
    }

    @PluginMethod
    public void hasFlightFolder(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("has", prefs().getTreeUri() != null);
        call.resolve(ret);
    }

    @PluginMethod
    public void clearFlightFolder(PluginCall call) {
        prefs().setTreeUri(null);
        call.resolve();
    }

    // ── Listar / leer ──────────────────────────────────────────────────────

    @PluginMethod
    public void listFlightFiles(PluginCall call) {
        JSArray arr = new JSArray();

        // 1) Vía SAF (carpeta elegida) — funciona donde listFiles() crudo falla
        DocumentFile tree = getTree();
        if (tree != null) collectTxtDoc(tree, arr, 0, 4);

        // 2) Respaldo: acceso directo a File si hay all-files-access
        if (arr.length() == 0 && hasAllFilesAccess()) {
            File root = Environment.getExternalStorageDirectory();
            List<File> found = new ArrayList<>();
            for (String rel : KNOWN_PATHS) {
                File dir = new File(root, rel);
                if (dir.isDirectory()) collectTxtRecursive(dir, found, 0, 3);
            }
            if (found.isEmpty()) walkForFlightRecords(root, found, 0, 6);
            for (File f : found) {
                JSObject o = new JSObject();
                o.put("name", f.getName());
                o.put("path", f.getAbsolutePath());
                o.put("size", f.length());
                o.put("mtime", f.lastModified());
                arr.put(o);
            }
        }

        JSObject ret = new JSObject();
        ret.put("files", arr);
        call.resolve(ret);
    }

    @PluginMethod
    public void readFlightFile(PluginCall call) {
        String path = call.getString("path");
        if (path == null) { call.reject("NO_PATH"); return; }
        try {
            InputStream in;
            String name;
            if (path.startsWith("content://")) {
                in = getContext().getContentResolver().openInputStream(Uri.parse(path));
                name = call.getString("name", "flight.txt");
            } else {
                File f = new File(path);
                if (!f.isFile()) { call.reject("NOT_FOUND"); return; }
                in = new FileInputStream(f);
                name = f.getName();
            }
            if (in == null) { call.reject("READ_ERROR"); return; }
            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int n;
            while ((n = in.read(buf)) != -1) bos.write(buf, 0, n);
            in.close();
            JSObject ret = new JSObject();
            ret.put("name", name);
            ret.put("data", Base64.encodeToString(bos.toByteArray(), Base64.NO_WRAP));
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("READ_ERROR", e);
        }
    }

    private DocumentFile getTree() {
        String s = prefs().getTreeUri();
        if (s == null) return null;
        try { return DocumentFile.fromTreeUri(getContext(), Uri.parse(s)); }
        catch (Exception e) { return null; }
    }

    private void collectTxtDoc(DocumentFile dir, JSArray out, int depth, int maxDepth) {
        if (dir == null) return;
        DocumentFile[] kids;
        try { kids = dir.listFiles(); } catch (Exception e) { return; }
        for (DocumentFile f : kids) {
            String n = f.getName();
            if (f.isFile() && n != null && n.toLowerCase().endsWith(".txt")) {
                JSObject o = new JSObject();
                o.put("name", n);
                o.put("path", f.getUri().toString());
                o.put("size", f.length());
                o.put("mtime", f.lastModified());
                out.put(o);
            } else if (f.isDirectory() && depth < maxDepth) {
                collectTxtDoc(f, out, depth + 1, maxDepth);
            }
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

    @PluginMethod
    public void runBackgroundSyncNow(PluginCall call) {
        OneTimeWorkRequest req = new OneTimeWorkRequest.Builder(FlightSyncWorker.class).build();
        WorkManager.getInstance(getContext()).enqueue(req);
        call.resolve();
    }

    // ── Acceso directo a File (respaldo) ───────────────────────────────────

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

    // ── Diagnóstico ────────────────────────────────────────────────────────

    @PluginMethod
    public void diagnose(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("granted", hasAllFilesAccess());
        ret.put("folder", prefs().getTreeUri() != null);
        File root = Environment.getExternalStorageDirectory();
        ret.put("root", root.getAbsolutePath());

        // Conteo por SAF (si hay carpeta elegida)
        DocumentFile tree = getTree();
        JSArray safArr = new JSArray();
        if (tree != null) collectTxtDoc(tree, safArr, 0, 4);
        ret.put("folderTxt", safArr.length());

        JSArray known = new JSArray();
        for (String rel : KNOWN_PATHS) {
            File d = new File(root, rel);
            List<File> tmp = new ArrayList<>();
            if (d.isDirectory()) collectTxtRecursive(d, tmp, 0, 3);
            JSObject o = new JSObject();
            o.put("path", rel);
            o.put("exists", d.isDirectory());
            o.put("txt", tmp.size());
            known.put(o);
        }
        ret.put("knownPaths", known);

        JSArray top = new JSArray();
        File[] kids = root.listFiles();
        if (kids != null) for (File k : kids) if (k.isDirectory()) top.put(k.getName());
        ret.put("topLevel", top);

        List<File> frFiles = new ArrayList<>();
        walkForFlightRecords(root, frFiles, 0, 6);
        ret.put("flightRecordTxt", frFiles.size());
        call.resolve(ret);
    }

    // Helper de preferencias para la URI de la carpeta SAF (compartida con el worker).
    static class SharedPrefsTree {
        private final Context ctx;
        SharedPrefsTree(Context c) { ctx = c; }
        String getTreeUri() {
            return ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY_TREE_URI, null);
        }
        void setTreeUri(String uri) {
            if (uri == null) {
                ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().remove(KEY_TREE_URI).apply();
            } else {
                ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY_TREE_URI, uri).apply();
            }
        }
    }
}
