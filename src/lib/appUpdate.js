import { Capacitor, registerPlugin } from '@capacitor/core';

const AppUpdate = Capacitor.isNativePlatform()
    ? registerPlugin('AppUpdate')
    : null;

/**
 * Compara la versión instalada con la del servidor.
 * Retorna null si no es plataforma nativa o si hay error de red.
 */
export async function checkForUpdate() {
    if (!AppUpdate) return null;
    try {
        return await AppUpdate.checkForUpdate();
    } catch {
        return null;
    }
}

/**
 * Descarga el APK desde apkUrl e inicia la instalación del sistema.
 * onProgress(0-100) se llama durante la descarga.
 */
export async function downloadAndInstall(apkUrl, onProgress) {
    if (!AppUpdate) return;
    if (onProgress) {
        await AppUpdate.addListener('downloadProgress', ({ progress }) => {
            onProgress(progress);
        });
    }
    return AppUpdate.downloadAndInstall({ apkUrl });
}
