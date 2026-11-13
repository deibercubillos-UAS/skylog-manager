package com.bitafly.app;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.util.Log;


import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;

/**
 * AppUpdate — plugin nativo para OTA updates sin Google Play.
 *
 * Flujo:
 *   1. JS llama checkForUpdate() → compara BuildConfig.VERSION_CODE con el servidor.
 *   2. Si hay nueva versión, JS muestra el dialog (AppUpdateBanner).
 *   3. JS llama downloadAndInstall() → la app pide de nuevo la versión al servidor (no usa una URL de JS), descarga,
 *      verifica la huella SHA-256, notifica progreso vía "downloadProgress" y lanza el instalador del sistema.
 */
@CapacitorPlugin(name = "AppUpdate")
public class AppUpdatePlugin extends Plugin {

    private static final String TAG = "BitaflyAppUpdate";
    private static final String API_BASE = "https://bitafly.com";
    private static final String APK_FILENAME = "bitafly-update.apk";

    @PluginMethod
    public void checkForUpdate(PluginCall call) {
        // Google Play no permite actualizarse instalando APK por fuera de la tienda: en esa variante nunca hay OTA.
        if (BuildConfig.PLAY_BUILD) {
            call.resolve(new JSObject().put("hasUpdate", false));
            return;
        }
        new Thread(() -> {
            try {
                URL url = new URL(API_BASE + "/api/app/version");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setConnectTimeout(10000);
                conn.setReadTimeout(10000);
                conn.setRequestMethod("GET");

                int status = conn.getResponseCode();
                if (status != 200) {
                    call.resolve(new JSObject().put("hasUpdate", false));
                    return;
                }

                StringBuilder sb = new StringBuilder();
                try (InputStream in = conn.getInputStream()) {
                    byte[] buf = new byte[4096];
                    int n;
                    while ((n = in.read(buf)) != -1) sb.append(new String(buf, 0, n));
                }
                conn.disconnect();

                JSONObject json = new JSONObject(sb.toString());
                int serverCode = json.optInt("version_code", 0);

                PackageInfo pInfo = getContext().getPackageManager()
                    .getPackageInfo(getContext().getPackageName(), 0);
                int currentCode = (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P)
                    ? (int) pInfo.getLongVersionCode()
                    : pInfo.versionCode;
                String currentName = pInfo.versionName;

                JSObject ret = new JSObject();
                ret.put("hasUpdate", serverCode > currentCode);
                ret.put("currentVersionCode", currentCode);
                ret.put("currentVersionName", currentName);
                ret.put("versionCode", serverCode);
                ret.put("versionName", json.optString("version_name", ""));
                ret.put("apkUrl", json.optString("apk_url", ""));
                ret.put("releaseNotes", json.optString("release_notes", ""));
                ret.put("forceUpdate", json.optBoolean("force_update", false));
                call.resolve(ret);

            } catch (Exception e) {
                Log.e(TAG, "checkForUpdate error", e);
                JSObject ret = new JSObject();
                ret.put("hasUpdate", false);
                call.resolve(ret);
            }
        }).start();
    }

    // Máximo que se acepta descargar (el APK real pesa decenas de MB): evita llenar el almacenamiento.
    private static final long MAX_APK_BYTES = 300L * 1024 * 1024;
    // Único host desde el que se instala (bucket de releases); lo mismo valida el servidor al publicar.
    private static final String APK_HOST = "releases.bitafly.com";

    /**
     * Descarga e instala la versión vigente. El argumento `apkUrl` que manda JavaScript se IGNORA: el origen de lo que
     * se instala no puede decidirlo la página (un script inyectado en el origen remoto podría pedir cualquier APK).
     * Aquí se vuelve a pedir la versión vigente al servidor, se exige https + host de releases + versión mayor a la
     * instalada + huella SHA-256, y se compara la huella con lo descargado ANTES de lanzar el instalador.
     * (Además Android solo instala sobre esta app un APK firmado con la misma llave.)
     */
    @PluginMethod(returnType = PluginMethod.RETURN_CALLBACK)
    public void downloadAndInstall(PluginCall call) {
        if (BuildConfig.PLAY_BUILD) {
            call.reject("NOT_SUPPORTED");
            return;
        }
        call.setKeepAlive(true);

        new Thread(() -> {
            File apkFile = new File(getContext().getExternalFilesDir(null), APK_FILENAME);
            try {
                JSONObject json = fetchCurrentRelease();
                if (json == null) { call.reject("NO_RELEASE"); return; }

                PackageInfo pInfo = getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
                int currentCode = (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) ? (int) pInfo.getLongVersionCode() : pInfo.versionCode;
                if (json.optInt("version_code", 0) <= currentCode) { call.reject("NO_UPDATE"); return; }

                String apkUrl = json.optString("apk_url", "");
                String expectedSha = json.optString("apk_sha256", "").toLowerCase(java.util.Locale.ROOT);
                if (!expectedSha.matches("[0-9a-f]{64}")) { call.reject("NO_HASH"); return; }
                URL url = new URL(apkUrl);
                if (!"https".equals(url.getProtocol()) || !APK_HOST.equalsIgnoreCase(url.getHost()) || url.getUserInfo() != null || url.getPort() != -1) {
                    call.reject("UNTRUSTED_URL");
                    return;
                }

                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setInstanceFollowRedirects(false); // una redirección podría llevar a otro host
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(120000);
                conn.connect();
                if (conn.getResponseCode() != 200) { conn.disconnect(); call.reject("DOWNLOAD_ERROR", "HTTP " + conn.getResponseCode()); return; }

                long total = conn.getContentLengthLong();
                if (total > MAX_APK_BYTES) { conn.disconnect(); call.reject("TOO_LARGE"); return; }
                long downloaded = 0;
                MessageDigest digest = MessageDigest.getInstance("SHA-256");

                try (InputStream in = conn.getInputStream();
                     FileOutputStream out = new FileOutputStream(apkFile)) {
                    byte[] buf = new byte[8192];
                    int n;
                    while ((n = in.read(buf)) != -1) {
                        downloaded += n;
                        if (downloaded > MAX_APK_BYTES) throw new java.io.IOException("TOO_LARGE");
                        digest.update(buf, 0, n);
                        out.write(buf, 0, n);
                        if (total > 0) {
                            JSObject progress = new JSObject();
                            progress.put("progress", (int) ((downloaded * 100L) / total));
                            notifyListeners("downloadProgress", progress);
                        }
                    }
                }
                conn.disconnect();

                StringBuilder hex = new StringBuilder();
                for (byte x : digest.digest()) hex.append(String.format("%02x", x));
                if (!MessageDigest.isEqual(hex.toString().getBytes(), expectedSha.getBytes())) {
                    apkFile.delete();
                    call.reject("HASH_MISMATCH");
                    return;
                }

                // Notificar 100% antes de lanzar el instalador
                JSObject done = new JSObject();
                done.put("progress", 100);
                notifyListeners("downloadProgress", done);

                installApk(apkFile);
                call.resolve(new JSObject().put("installed", true));

            } catch (Exception e) {
                Log.e(TAG, "downloadAndInstall error", e);
                if (apkFile.exists()) apkFile.delete();
                call.reject("DOWNLOAD_ERROR", e.getMessage());
            }
        }).start();
    }

    /** Versión vigente según el servidor (misma consulta de checkForUpdate); null si no se pudo leer. */
    private JSONObject fetchCurrentRelease() {
        try {
            HttpURLConnection conn = (HttpURLConnection) new URL(API_BASE + "/api/app/version").openConnection();
            conn.setInstanceFollowRedirects(false);
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);
            conn.setRequestMethod("GET");
            if (conn.getResponseCode() != 200) return null;
            StringBuilder sb = new StringBuilder();
            try (InputStream in = conn.getInputStream()) {
                byte[] buf = new byte[4096];
                int n;
                while ((n = in.read(buf)) != -1) sb.append(new String(buf, 0, n));
            }
            conn.disconnect();
            return new JSONObject(sb.toString());
        } catch (Exception e) {
            Log.e(TAG, "fetchCurrentRelease error", e);
            return null;
        }
    }

    private void installApk(File apkFile) {
        Activity activity = getActivity();
        if (activity == null) return;

        Uri apkUri;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            apkUri = FileProvider.getUriForFile(
                getContext(),
                getContext().getPackageName() + ".fileprovider",
                apkFile
            );
        } else {
            apkUri = Uri.fromFile(apkFile);
        }

        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(apkUri, "application/vnd.android.package-archive");
        intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        activity.startActivity(intent);
    }
}
