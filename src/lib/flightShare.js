import { Capacitor, registerPlugin } from '@capacitor/core';

// Puente con el plugin nativo FlightFiles para el método de importación por "Compartir":
// el piloto envía los .txt de FlightRecord desde DJI Fly / el gestor de archivos a BitaFly.
// Sin credenciales de DJI y sin depender del acceso a carpetas (restringido en Android 12+).
// En navegador (no nativo) todo esto es no-op, así que la bitácora web se comporta igual.
const FlightFiles = Capacitor.isNativePlatform() ? registerPlugin('FlightFiles') : null;

export const isNativeApp = () => !!FlightFiles;

/** Convierte {name, data(base64)} del plugin en un File, tal como lo produciría un <input type="file">. */
function toFile({ name, data }) {
  const bin = atob(data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], name || 'flightlog.txt', { type: 'text/plain' });
}

/**
 * Recoge los logs que llegaron por "Compartir" (uso único: el plugin los descarta al entregarlos)
 * y los devuelve como File[]. Lista vacía si no hay ninguno o no es la app nativa.
 */
export async function pullSharedFlightFiles() {
  if (!FlightFiles) return [];
  try {
    const { files } = await FlightFiles.getSharedFlightFiles();
    return (files || []).map(toFile);
  } catch {
    return [];
  }
}

/**
 * Avisa cuando la app, ya abierta, recibe un "Compartir" (el usuario la tenía en segundo plano).
 * Devuelve una función para cancelar la suscripción. onShared se llama sin argumentos; el consumidor
 * debe llamar pullSharedFlightFiles() para recoger los archivos.
 */
export function onSharedFlightFiles(onShared) {
  if (!FlightFiles) return () => {};
  const handle = FlightFiles.addListener('sharedFlightFiles', () => onShared());
  return () => {
    Promise.resolve(handle).then((h) => h?.remove?.()).catch(() => {});
  };
}
