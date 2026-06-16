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

// ── Fuente nativa de archivos (Android) — plugin FlightFiles (F3.6) ──────────

// Acceso al plugin nativo registrado en MainActivity (FlightFilesPlugin.java).
function flightFilesPlugin() {
  if (typeof window === 'undefined') return null;
  return window.Capacitor?.Plugins?.FlightFiles || null;
}

// ¿Hay una fuente nativa de logs de vuelo disponible en este entorno?
// Requiere la capacidad (Android app) Y que el plugin esté presente en runtime.
export function isNativeFlightSource() {
  if (!capabilities.nativeFlightImport) return false;
  return !!flightFilesPlugin();
}

// ¿Tiene la app permiso para leer la carpeta DJI? (MANAGE_EXTERNAL_STORAGE en A11+)
export async function hasNativeFlightPermission() {
  const p = flightFilesPlugin();
  if (!p) return false;
  try {
    const { granted } = await p.checkPermission();
    return !!granted;
  } catch {
    return false;
  }
}

// Solicita el permiso de "todos los archivos" (abre Ajustes en A11+). Devuelve si quedó concedido.
export async function requestNativeFlightPermission() {
  const p = flightFilesPlugin();
  if (!p) return false;
  try {
    const { granted } = await p.requestPermission();
    return !!granted;
  } catch {
    return false;
  }
}

// Lista los archivos .txt de la carpeta FlightRecord nativa.
// Devuelve [{ name, path, size, mtime }]. En web (sin plugin) devuelve [].
export async function listNativeFlightFiles() {
  const p = flightFilesPlugin();
  if (!p) return [];
  const { files } = await p.listFlightFiles();
  return Array.isArray(files) ? files : [];
}

// Lee un archivo de vuelo nativo por su path y lo devuelve como File para postFlightFile.
export async function readNativeFlightFile(pathOrRef) {
  const p = flightFilesPlugin();
  if (!p) throw new Error('readNativeFlightFile: plugin nativo no disponible.');
  const path = typeof pathOrRef === 'string' ? pathOrRef : pathOrRef?.path;
  if (!path) throw new Error('readNativeFlightFile: path requerido.');
  const { name, data } = await p.readFlightFile({ path });
  return base64ToFile(data, name || 'flight.txt');
}

// Convierte base64 (del plugin nativo) a un File para reusar el mismo POST que la web.
function base64ToFile(b64, name) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], name, { type: 'text/plain' });
}
