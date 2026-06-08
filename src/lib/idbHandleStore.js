// Almacén mínimo en IndexedDB para FileSystemDirectoryHandle (File System Access API).
//
// Los handles de carpeta son structured-cloneable, así que se pueden persistir en
// IndexedDB (NO en localStorage, que solo guarda strings). Se usa para recordar la
// carpeta FlightRecord que el usuario eligió y evitar volver a navegar la ruta en
// cada sincronización DJI.
//
// Todas las operaciones fallan en silencio (devuelven false/null) para que nunca
// rompan el flujo de importación si IndexedDB no está disponible (modo privado,
// SSR, navegador sin soporte).

const DB_NAME = 'bitafly-fs';
const STORE = 'handles';
const DB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB no disponible'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Guarda un handle bajo una clave. Devuelve true si tuvo éxito.
export async function saveHandle(key, handle) {
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(handle, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    return true;
  } catch {
    return false;
  }
}

// Recupera el handle guardado bajo una clave, o null si no existe / falla.
export async function getHandle(key) {
  try {
    const db = await openDb();
    const result = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return result ?? null;
  } catch {
    return null;
  }
}

// Borra el handle guardado bajo una clave. Devuelve true si tuvo éxito.
export async function clearHandle(key) {
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    return true;
  } catch {
    return false;
  }
}
