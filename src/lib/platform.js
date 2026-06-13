// lib/platform.js — capa única de detección de entorno (web vs app nativa).
//
// No depende del paquete de Capacitor: lee el global `window.Capacitor` que el
// shell nativo inyecta en runtime. Mientras no exista shell nativo, todo resuelve
// a 'web' y el comportamiento de la página no cambia en absoluto.
//
// Uso:
//   import { getPlatform, isNative, isAndroidApp, capabilities } from '@/lib/platform';
//   if (isNative()) { ... usa plugin nativo ... } else { ... flujo web actual ... }

// Devuelve el objeto Capacitor inyectado, o null en web pura / SSR.
function cap() {
  if (typeof window === 'undefined') return null;
  return window.Capacitor || null;
}

// 'web' | 'android' | 'ios'
export function getPlatform() {
  const c = cap();
  if (c && typeof c.getPlatform === 'function') {
    const p = c.getPlatform(); // 'web' | 'android' | 'ios'
    if (p === 'android' || p === 'ios') return p;
  }
  return 'web';
}

// ¿Corriendo dentro del shell nativo (Capacitor), no en el navegador?
export function isNative() {
  const c = cap();
  if (c) {
    if (typeof c.isNativePlatform === 'function') return c.isNativePlatform();
    return getPlatform() !== 'web';
  }
  return false;
}

export function isWeb()        { return !isNative(); }
export function isAndroidApp() { return getPlatform() === 'android'; }
export function isIOSApp()     { return getPlatform() === 'ios'; }

// Capacidades por entorno — fuente única para decidir qué ruta tomar.
// Se calculan como getters para reflejar el estado real en cada acceso.
export const capabilities = {
  // Lectura nativa de la carpeta DJI FlightRecord (sistema de archivos / SAF).
  // Solo el shell Android la tendrá (vía plugin, Etapa 3). iOS queda fuera por ahora.
  get nativeFlightImport() { return isAndroidApp(); },

  // Sincronización en segundo plano de logs de vuelo (WorkManager — F3.8).
  get backgroundFlightSync() { return isAndroidApp(); },

  // Notificaciones push nativas (FCM/APNs — F5.2). Por ahora ninguna activa.
  get nativePush() { return false; },
};

// Helper de diagnóstico (útil para logs / telemetría F5.3).
export function platformInfo() {
  return {
    platform: getPlatform(),
    native: isNative(),
    capabilities: {
      nativeFlightImport: capabilities.nativeFlightImport,
      backgroundFlightSync: capabilities.backgroundFlightSync,
      nativePush: capabilities.nativePush,
    },
  };
}
