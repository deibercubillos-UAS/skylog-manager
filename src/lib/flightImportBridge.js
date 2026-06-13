// lib/flightImportBridge.js — punto único de importación de vuelos DJI.
//
// Centraliza el POST a /api/logbook/import-dji para que TANTO el flujo web actual
// (DjiRcSync) COMO el futuro plugin nativo de Android (Etapa 3) suban los archivos
// por el mismo camino y con la misma sesión/endpoint.
//
// Mientras no exista el shell nativo, las funciones `native*` son stubs inertes y
// el comportamiento web no cambia en nada.

import { capabilities } from '@/lib/platform';

const MAX_FILE_BYTES = 50 * 1024 * 1024; // 50 MB (igual que el límite del server)

// Sube un único archivo de vuelo (Blob/File) al endpoint de importación.
// Devuelve { status, data } — el mismo shape que ya consume DjiRcSync.
export async function postFlightFile(fileObj, fileName) {
  if (fileObj && fileObj.size > MAX_FILE_BYTES) {
    return { status: 413, data: { error: 'Archivo demasiado grande (máx 50 MB)' } };
  }

  const fd = new FormData();
  fd.append('file', fileObj, fileName);

  let res;
  try {
    res = await fetch('/api/logbook/import-dji', { method: 'POST', body: fd });
  } catch (networkErr) {
    return { status: 0, data: { error: 'Error de red: ' + networkErr.message } };
  }

  let data;
  try {
    data = await res.json();
  } catch {
    data = { error: `Error ${res.status} del servidor` };
  }
  return { status: res.status, data };
}

// ── Fuente nativa de archivos (Android) — stubs hasta F3.6 ───────────────────

// ¿Hay una fuente nativa de logs de vuelo disponible en este entorno?
// Requiere la capacidad (Android app) Y que el plugin esté presente en runtime.
export function isNativeFlightSource() {
  if (!capabilities.nativeFlightImport) return false;
  // El plugin real se registrará en F3.6 (p.ej. window.Capacitor.Plugins.FlightFiles).
  if (typeof window === 'undefined') return false;
  return !!window.Capacitor?.Plugins?.FlightFiles;
}

// Lista los archivos .txt nuevos desde la carpeta FlightRecord nativa.
// Stub: se implementa en F3.6 (plugin de archivos). En web nunca se llama.
export async function listNativeFlightFiles() {
  if (!isNativeFlightSource()) return [];
  throw new Error('listNativeFlightFiles: plugin nativo no implementado todavía (F3.6).');
}

// Lee un archivo de vuelo nativo y devuelve un Blob para postFlightFile.
// Stub: se implementa en F3.6.
export async function readNativeFlightFile(/* ref */) {
  throw new Error('readNativeFlightFile: plugin nativo no implementado todavía (F3.6).');
}
