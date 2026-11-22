import { Capacitor, registerPlugin } from '@capacitor/core';

// Puente con el plugin nativo FlightFiles para el método de importación POR CARPETA:
// el piloto elige UNA vez la carpeta FlightRecord del control/celular (selector del sistema,
// SAF) o concede acceso a todos los archivos, y BitaFly lista y lee los .txt para subirlos al
// mismo análisis (POST /api/flights/import-dji) + confirmación §100.540 de la Bitácora.
//
// Es la vía hermana del "Compartir" (lib/flightShare.js): aquella recibe un log a la vez desde
// DJI Fly; esta lista TODA la carpeta y sube en lote los que el piloto marque. Sirve sobre todo a
// DJI Pilot 2 (controles Matrice enterprise), que guarda los logs en almacenamiento PÚBLICO
// (DJI/com.dji.industry.pilot/FlightRecord), alcanzable por carpeta a diferencia del DJI Fly de
// consumo. En navegador (no nativo) todo es no-op, así que la bitácora web se comporta igual.
const FlightFiles = Capacitor.isNativePlatform() ? registerPlugin('FlightFiles') : null;

export const isFolderImportAvailable = () => !!FlightFiles;

/** Convierte {name, data(base64)} del plugin en un File, igual que lo produciría un <input type="file">. */
function toFile({ name, data }) {
  const bin = atob(data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], name || 'flightlog.txt', { type: 'text/plain' });
}

/** Estado de acceso: { granted, allFiles, folder }. En web/no-nativo, todo en false. */
export async function checkFolderPermission() {
  if (!FlightFiles) return { granted: false, allFiles: false, folder: false };
  try { return await FlightFiles.checkPermission(); }
  catch { return { granted: false, allFiles: false, folder: false }; }
}

/** Abre el ajuste de "acceso a todos los archivos" (solo build sin Google Play). Devuelve { granted }. */
export async function requestAllFilesPermission() {
  if (!FlightFiles) return { granted: false };
  try { return await FlightFiles.requestPermission(); }
  catch { return { granted: false }; }
}

/** Selector del sistema (SAF) para elegir la carpeta FlightRecord. Devuelve { picked, uri, txt }. */
export async function pickFlightFolder() {
  if (!FlightFiles) return { picked: false };
  try { return await FlightFiles.pickFlightFolder(); }
  catch { return { picked: false }; }
}

/** ¿Hay una carpeta SAF ya elegida y persistida? */
export async function hasFlightFolder() {
  if (!FlightFiles) return false;
  try { return !!(await FlightFiles.hasFlightFolder()).has; }
  catch { return false; }
}

/** Olvida la carpeta SAF elegida (para volver a elegir otra). */
export async function clearFlightFolder() {
  if (!FlightFiles) return;
  try { await FlightFiles.clearFlightFolder(); } catch { /* no-op */ }
}

/** Lista los .txt accesibles: [{ name, path, size, mtime }]. Lista vacía si no hay o no es nativo. */
export async function listFolderFlightFiles() {
  if (!FlightFiles) return [];
  try {
    const { files } = await FlightFiles.listFlightFiles();
    return files || [];
  } catch { return []; }
}

/**
 * Lee un .txt que ESTE plugin listó (el nativo valida que la ruta esté dentro de la carpeta
 * elegida o de una carpeta FlightRecord) y lo devuelve como File. null si falla.
 */
export async function readFolderFlightFile(path) {
  if (!FlightFiles) return null;
  try {
    const res = await FlightFiles.readFlightFile({ path });
    return toFile(res);
  } catch { return null; }
}
