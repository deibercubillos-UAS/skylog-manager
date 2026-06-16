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

/**
 * AppUpdate — plugin nativo para OTA updates sin Google Play.
 *
 * Flujo:
 *   1. JS llama checkForUpdate() → compara BuildConfig.VERSION_CODE con el servidor.
 *   2. Si hay nueva versión, JS muestra el dialog (AppUpdateBanner).
 *   3. JS llama downloadAndInstall(apkUrl) → descarga en segundo plano,
 *      notifica progreso vía "downloadProgress", lanza el instalador del sistema.
 */
@CapacitorPlugin(name = "AppUpdate")
public class AppUpdatePlugin extends Plugin {

    private static final String TAG = "BitaflyAppUpdate";
    private static final String API_BASE = "https://bitafly.com";
    private static final String APK_FILENAME = "bitafly-update.apk";

    @PluginMethod
    public void checkForUpdate(PluginCall call) {
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

    @PluginMethod(returnType = PluginMethod.RETURN_CALLBACK)
    public void downloadAndInstall(PluginCall call) {
        call.setKeepAlive(true);
        String apkUrl = call.getString("apkUrl");
        if (apkUrl == null || apkUrl.isEmpty()) {
            call.reject("NO_URL");
            return;
        }

        new Thread(() -> {
            File apkFile = new File(getContext().getExternalFilesDir(null), APK_FILENAME);
            try {
                URL url = new URL(apkUrl);
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(120000);
                conn.connect();

                int total = conn.getContentLength();
                int downloaded = 0;

                try (InputStream in = conn.getInputStream();
                     FileOutputStream out = new FileOutputStream(apkFile)) {
                    byte[] buf = new byte[8192];
                    int n;
                    while ((n = in.read(buf)) != -1) {
                        out.write(buf, 0, n);
                        downloaded += n;
                        if (total > 0) {
                            JSObject progress = new JSObject();
                            progress.put("progress", (int) ((downloaded * 100L) / total));
                            notifyListeners("downloadProgress", progress);
                        }
                    }
                }
                conn.disconnect();

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
