'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { saveHandle, getHandle, clearHandle } from '@/lib/idbHandleStore';
import {
  postFlightFile,
  isNativeFlightSource,
  hasNativeFlightPermission,
  requestNativeFlightPermission,
  listNativeFlightFiles,
  readNativeFlightFile,
  supportsBackgroundSync,
  enableBackgroundSync,
  disableBackgroundSync,
  isBackgroundSyncEnabled,
} from '@/lib/flightImportBridge';

// Clave bajo la que se recuerda la carpeta FlightRecord en IndexedDB.
const FLIGHTRECORD_KEY = 'dji-flightrecord';
// Preferencia de auto-sincronización (persistida en localStorage).
const AUTOSYNC_KEY = 'bitafly_dji_autosync';
const AUTOSYNC_INTERVAL_MS = 20000; // sondeo cada 20s (solo donde hay File System API)

// Instrucciones para desktop (copiar al PC primero)
const DEVICE_INSTRUCTIONS = {
  rc: {
    label: 'DJI RC',
    icon: 'videogame_asset',
    steps: [
      {
        title: 'Conecta el RC al PC',
        detail: 'Usa el cable USB-C incluido con el RC.',
      },
      {
        title: 'En la pantalla del RC',
        detail: 'Selecciona "Transferencia de archivos" cuando aparezca el aviso.',
      },
      {
        title: 'Abre el Explorador de Windows',
        detail: null,
        path: 'Este equipo → DJI RC 2 → Almacenamiento interno compartido → Android → data → dji.go.v5 → files → FlightRecord',
      },
      {
        title: 'Copia la carpeta FlightRecord a tu PC',
        detail: 'Arrástrala al Escritorio o Descargas. El navegador no puede leer dispositivos USB directamente.',
      },
      {
        title: 'Haz clic en "Seleccionar carpeta" y elige la carpeta copiada',
        detail: null,
      },
    ],
  },
  android: {
    label: 'Android',
    icon: 'android',
    steps: [
      {
        title: 'Conecta el celular al PC con USB',
        detail: null,
      },
      {
        title: 'En el celular: selecciona "Transferencia de archivos" (MTP)',
        detail: 'Desliza la barra de notificaciones y toca la notificación de USB.',
      },
      {
        title: 'Abre el Explorador de Windows',
        detail: null,
        path: 'Este equipo → [Tu celular] → Almacenamiento interno → Android → data → dji.go.v5 → files → FlightRecord',
        note: 'En Android 11 o superior la carpeta Android/data puede estar bloqueada vía USB. Si no la ves, usa la app "Files by Google" en el celular para copiar la carpeta a Descargas y luego transfiere.',
      },
      {
        title: 'Copia la carpeta FlightRecord al PC',
        detail: 'Arrástrala al Escritorio o Descargas.',
      },
      {
        title: 'Haz clic en "Seleccionar carpeta" y elige la carpeta copiada',
        detail: null,
      },
    ],
  },
  iphone: {
    label: 'iPhone',
    icon: 'phone_iphone',
    steps: [
      {
        title: 'Conecta el iPhone al PC con el cable Lightning / USB-C',
        detail: 'Acepta "Confiar en este equipo" en el iPhone si aparece el aviso.',
      },
      {
        title: 'Abre iTunes (Windows) o el Finder (Mac)',
        detail: null,
      },
      {
        title: 'Selecciona tu iPhone → pestaña "Archivos" (File Sharing)',
        detail: 'En iTunes: clic en el ícono del iPhone → sección Compartir archivos.',
        path: 'iTunes → [Tu iPhone] → Archivos → DJI Fly → FlightRecord',
      },
      {
        title: 'Selecciona la carpeta FlightRecord y haz clic en "Guardar en…"',
        detail: 'Guárdala en el Escritorio o Descargas del PC.',
      },
      {
        title: 'Haz clic en "Seleccionar carpeta" y elige la carpeta guardada',
        detail: null,
      },
    ],
  },
};

// Instrucciones para mobile (el usuario está EN el celular)
const MOBILE_DEVICE_INSTRUCTIONS = {
  android: {
    label: 'Android',
    icon: 'android',
    steps: [
      {
        title: 'Abre el administrador de archivos',
        detail: 'Usa "Files by Google" o el explorador de archivos nativo de tu celular.',
      },
      {
        title: 'Navega a la carpeta de logs DJI',
        path: 'Almacenamiento interno → Android → data → dji.go.v5 → files → FlightRecord',
        note: 'En Android 11+ esta carpeta puede estar restringida vía USB. Usa "Files by Google" → Buscar "FlightRecord", o copia los archivos .txt a la carpeta Descargas.',
      },
      {
        title: 'Toca "Seleccionar archivos" y elige los archivos .txt',
        detail: 'Navega hasta la carpeta FlightRecord y selecciona los que quieres importar.',
      },
    ],
  },
  iphone: {
    label: 'iPhone',
    icon: 'phone_iphone',
    steps: [
      {
        title: 'Toca "Seleccionar archivos" abajo',
        detail: 'Se abrirá el selector de archivos del iPhone (app Archivos).',
      },
      {
        title: 'Navega a la carpeta de logs DJI',
        path: 'En mi iPhone → DJI Fly → FlightRecord',
        detail: 'Si no ves "En mi iPhone", toca "Explorar" en la parte inferior del selector de archivos.',
      },
      {
        title: 'Selecciona los archivos .txt que quieres importar',
        detail: 'Mantén presionado para seleccionar múltiples archivos a la vez.',
      },
    ],
  },
};

// Extrae YYYY-MM-DD del nombre: FlightRecord_2026-05-01_[18-17-11].txt
function dateFromName(name) {
  const m = name.match(/(\d{4}-\d{2}-\d{2})/);
  return m ? m[1] : null;
}

// Extrae HH:MM del nombre: FlightRecord_2026-05-01_[18-17-11].txt
function timeFromName(name) {
  const m = name.match(/\[(\d{2})-(\d{2})-(\d{2})\]/);
  return m ? `${m[1]}:${m[2]}` : null;
}

// Busca FlightRecord dentro de la carpeta seleccionada.
// Soporta el caso donde el usuario ya seleccionó FlightRecord directamente,
// o seleccionó una carpeta padre (con distintos nombres en español/inglés).
const DJI_INNER_PATH = ['Android', 'data', 'dji.go.v5', 'files', 'FlightRecord'];
const DJI_STORAGE_NAMES = ['Almacenamiento interno compartido', 'Internal Storage', 'sdcard', 'storage'];

async function findFlightRecordDir(rootHandle) {
  // Caso 1: el usuario seleccionó directamente FlightRecord
  if (rootHandle.name === 'FlightRecord') return rootHandle;

  // Caso 2: seleccionó "files" (un nivel arriba)
  try { return await rootHandle.getDirectoryHandle('FlightRecord'); } catch { /* sigue */ }

  // Caso 3: seleccionó "dji.go.v5" o "data" (varios niveles arriba)
  try {
    let cur = rootHandle;
    for (const seg of ['files', 'FlightRecord']) {
      cur = await cur.getDirectoryHandle(seg);
    }
    return cur;
  } catch { /* sigue */ }

  // Caso 4: seleccionó "Almacenamiento interno compartido" u otro storage root
  for (const storageName of DJI_STORAGE_NAMES) {
    try {
      let cur = await rootHandle.getDirectoryHandle(storageName);
      for (const seg of DJI_INNER_PATH) {
        cur = await cur.getDirectoryHandle(seg);
      }
      return cur;
    } catch { /* sigue */ }
  }

  // Caso 5: búsqueda recursiva hasta 6 niveles como último recurso
  return findDirRecursive(rootHandle, 'FlightRecord', 6);
}

async function findDirRecursive(handle, target, depth) {
  if (depth <= 0) return null;
  for await (const [name, h] of handle.entries()) {
    if (h.kind !== 'directory') continue;
    if (name === target) return h;
    const found = await findDirRecursive(h, target, depth - 1);
    if (found) return found;
  }
  return null;
}

const STATUS_ICON = {
  pending:        null,
  loading:        'hourglass_empty',
  ok:             'check_circle',
  duplicate:      'sync',
  skipped:        'timer_off',
  error:          'error',
  needs_aircraft: 'flight',
  ok_no_battery:  'check_circle',
};

const STATUS_COLOR = {
  pending:        '',
  loading:        'text-orange-500 animate-spin',
  ok:             'text-green-500',
  duplicate:      'text-slate-400',
  skipped:        'text-slate-400',
  error:          'text-red-500',
  needs_aircraft: 'text-amber-500',
  ok_no_battery:  'text-green-500',
};

const EMPTY_AIRCRAFT = { model: '', brand: 'DJI', serial_number: '', ruas: '' };
const EMPTY_BATTERY  = { brand: 'DJI', model: '', serial_number: '', cycles: 0, health_status: 100 };

export default function DjiRcSync({ onImported, onFlightImported, isMobile: isMobileProp }) {
  const [state, setState] = useState('idle'); // idle | scanning | ready | uploading | done
  const [device, setDevice] = useState('rc'); // rc | android | iphone
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);
  const [isMobile, setIsMobile] = useState(isMobileProp ?? false);
  const [savedHandle, setSavedHandle] = useState(null); // carpeta FlightRecord recordada
  const mobileInputRef = useRef(null);

  // ── Auto-sincronización (solo donde hay File System Access API) ──
  const [autoSync, setAutoSync]       = useState(false);
  const [autoStatus, setAutoStatus]   = useState('');   // texto del último sondeo
  const autoTimerRef = useRef(null);
  const autoBusyRef  = useRef(false);   // evita sondeos solapados

  // ── Fuente nativa Android (plugin FlightFiles — F3.6/F3.7) ──
  const [nativeSource, setNativeSource] = useState(false);  // ¿hay plugin nativo?
  const [nativeGranted, setNativeGranted] = useState(false); // ¿permiso concedido?
  const [nativeStatus, setNativeStatus] = useState('');      // texto del último resultado
  const [bgSync, setBgSync] = useState(false);               // sync en segundo plano (F3.8)
  const [bgSupported, setBgSupported] = useState(false);

  // Modal crear aeronave
  const [aircraftModal, setAircraftModal] = useState(null); // null | { serial, modelo, nombre, pendingFile }
  const [aircraftForm, setAircraftForm] = useState(EMPTY_AIRCRAFT);
  const [creatingAircraft, setCreatingAircraft] = useState(false);
  const [aircraftError, setAircraftError] = useState('');

  // Modal crear batería (no bloquea el import — se ofrece inline al finalizar)
  const [batteryModal, setBatteryModal] = useState(null); // null | { serial_bateria, ciclos_bateria, modelo_bateria, fileName }
  const [batteryForm, setBatteryForm] = useState(EMPTY_BATTERY);
  const [creatingBattery, setCreatingBattery] = useState(false);
  const [batteryError, setBatteryError] = useState('');

  useEffect(() => {
    const mobile = isMobileProp ?? /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIsMobile(mobile);
    if (mobile) {
      // Auto-detectar tipo de dispositivo
      setDevice(/iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'iphone' : 'android');
    }
  }, [isMobileProp]);

  // ── Cargar la carpeta recordada + preferencia de auto-sync al montar ──
  // (File System Access API: Chrome/Edge escritorio; el RC funciona vía PC)
  useEffect(() => {
    if (typeof window === 'undefined' || !('showDirectoryPicker' in window)) return;
    let cancelled = false;
    getHandle(FLIGHTRECORD_KEY).then(h => {
      if (!cancelled && h) setSavedHandle(h);
    });
    try {
      if (localStorage.getItem(AUTOSYNC_KEY) === '1') setAutoSync(true);
    } catch { /* localStorage no disponible */ }
    return () => { cancelled = true; };
  }, []);

  // ── Detectar fuente nativa al montar + auto-importar si hay permiso ──
  useEffect(() => {
    if (!isNativeFlightSource()) return;
    setNativeSource(true);
    let cancelled = false;
    setBgSupported(supportsBackgroundSync());
    setBgSync(isBackgroundSyncEnabled());
    hasNativeFlightPermission().then(granted => {
      if (cancelled) return;
      setNativeGranted(granted);
      // Si ya hay permiso, sincronizar solo al abrir (auto-import "una vez configurado").
      if (granted) nativeSyncRef.current?.();
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isSupported =
    typeof window !== 'undefined' && 'showDirectoryPicker' in window;

  // ── Bloquear navegación mientras se importa ───────────────────
  const isUploading = state === 'uploading';
  useEffect(() => {
    if (!isUploading) return;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = ''; // Chrome requiere asignar a returnValue
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isUploading]);

  // ── Verificar duplicados contra la BD ─────────────────────────
  // Usa POST para evitar límite de URL con carpetas grandes (>50 archivos)
  const checkExisting = async (files) => {
    const pairs = files
      .map(f => {
        const date = dateFromName(f.name);
        const time = timeFromName(f.name);
        return date && time ? `${date}|${time}` : null;
      })
      .filter(Boolean);

    if (!pairs.length) return new Set();

    try {
      const res = await fetch('/api/logbook/import-dji/check', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ pairs }),
      });
      if (!res.ok) return new Set();
      const { existing } = await res.json();
      return new Set(existing ?? []);
    } catch {
      return new Set(); // Si falla la verificación, no bloqueamos la importación
    }
  };

  // ── Escanear una carpeta FlightRecord ya resuelta → preparar lista ──
  // Lógica compartida por el pick manual (handleSelectFolder) y, más adelante,
  // por la carpeta recordada. Recibe el handle de FlightRecord ya localizado.
  const scanFlightRecordDir = async (dirHandle) => {
    const found = [];
    for await (const [name, handle] of dirHandle.entries()) {
      if (handle.kind === 'file' && /\.txt$/i.test(name)) {
        found.push({ name, handle, selected: true, status: 'pending', result: null });
      }
    }

    if (!found.length) {
      setError('No se encontraron archivos .txt de DJI en la carpeta seleccionada.');
      setState('idle');
      return;
    }

    // Más recientes primero
    found.sort((a, b) => b.name.localeCompare(a.name));

    // Verificar cuáles ya están importados (una sola consulta)
    const existingSet = await checkExisting(found);

    const withStatus = found.map(f => {
      const date = dateFromName(f.name);
      const time = timeFromName(f.name);
      const key  = date && time ? `${date}|${time}` : null;
      const isDuplicate = key && existingSet.has(key);
      return {
        ...f,
        selected: !isDuplicate, // Pre-deseleccionar duplicados
        status:   isDuplicate ? 'duplicate' : 'pending',
      };
    });

    setFiles(withStatus);
    setState('ready');
  };

  // ── Seleccionar carpeta del RC ─────────────────────────────────
  const handleSelectFolder = async () => {
    setError('');
    try {
      const rootHandle = await window.showDirectoryPicker({ mode: 'read' });
      setState('scanning');

      // Intentar localizar una subcarpeta FlightRecord automáticamente.
      // Si no existe, usar la carpeta seleccionada directamente — el usuario
      // puede haber copiado los archivos .txt a cualquier carpeta.
      const dirHandle = (await findFlightRecordDir(rootHandle)) ?? rootHandle;

      // Recordar esta carpeta para futuras sincronizaciones.
      saveHandle(FLIGHTRECORD_KEY, dirHandle);
      setSavedHandle(dirHandle);

      await scanFlightRecordDir(dirHandle);
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError('No se pudo acceder a la carpeta: ' + err.message);
      }
      setState('idle');
    }
  };

  // ── Sincronización rápida con la carpeta recordada (Fase 3) ───
  // Reutiliza el handle guardado: el clic es el gesto que permite requestPermission,
  // así que no hay que volver a navegar la ruta.
  const handleQuickSync = async () => {
    if (!savedHandle) return;
    setError('');
    try {
      const perm = await savedHandle.requestPermission({ mode: 'read' });
      if (perm !== 'granted') {
        setError('Permiso denegado para la carpeta guardada. Usa "Elegir otra carpeta" para seleccionarla de nuevo.');
        return;
      }
      setState('scanning');
      await scanFlightRecordDir(savedHandle);
    } catch (err) {
      if (err.name === 'AbortError') return;
      // Handle obsoleto (carpeta movida/borrada/sin permiso) → olvidarlo para no insistir.
      await clearHandle(FLIGHTRECORD_KEY);
      setSavedHandle(null);
      setError('La carpeta guardada ya no está disponible. Selecciónala de nuevo.');
      setState('idle');
    }
  };

  // ── Olvidar la carpeta recordada (Fase 4) ─────────────────────
  const handleForgetFolder = async () => {
    await clearHandle(FLIGHTRECORD_KEY);
    setSavedHandle(null);
    setError('');
  };

  // ── Sincronización nativa Android (plugin FlightFiles — F3.7) ──
  // Lee la carpeta FlightRecord directo del control/celular, deduplica contra la
  // BD y prepara la lista; auto-importa lo nuevo reusando el mismo flujo web.
  const nativeSyncRef = useRef(null);
  nativeSyncRef.current = async () => {
    setError('');
    // 1) Asegurar permiso de "todos los archivos" (abre Ajustes en A11+).
    let granted = await hasNativeFlightPermission();
    if (!granted) {
      granted = await requestNativeFlightPermission();
      setNativeGranted(granted);
      if (!granted) {
        setNativeStatus('Concede el permiso de archivos para leer los vuelos DJI.');
        return;
      }
    }
    setNativeGranted(true);

    setState('scanning');
    try {
      const list = await listNativeFlightFiles(); // [{ name, path, size, mtime }]
      const txt = list.filter(f => /\.txt$/i.test(f.name));
      if (!txt.length) {
        setNativeStatus('No se encontraron logs DJI en el dispositivo.');
        setState('idle');
        return;
      }
      const found = txt
        .map(f => ({ name: f.name, nativePath: f.path, handle: null, fileObj: null, selected: true, status: 'pending', result: null }))
        .sort((a, b) => b.name.localeCompare(a.name));

      const existingSet = await checkExisting(found);
      const withStatus = found.map(f => {
        const date = dateFromName(f.name);
        const time = timeFromName(f.name);
        const key  = date && time ? `${date}|${time}` : null;
        const isDuplicate = key && existingSet.has(key);
        return { ...f, selected: !isDuplicate, status: isDuplicate ? 'duplicate' : 'pending' };
      });

      setFiles(withStatus);
      setState('ready');

      const pendingNew = withStatus.filter(f => f.selected && f.status === 'pending');
      if (pendingNew.length) {
        setNativeStatus(`${pendingNew.length} vuelo(s) nuevo(s) — importando…`);
        await handleImport(withStatus);
      } else {
        setNativeStatus('Sin vuelos nuevos. Todo está en la bitácora.');
      }
    } catch (err) {
      setError('No se pudo leer la carpeta DJI: ' + (err?.message || err));
      setState('idle');
    }
  };
  const handleNativeSync = () => nativeSyncRef.current?.();

  // Activar/desactivar la sincronización en segundo plano (WorkManager — F3.8).
  const toggleBgSync = async () => {
    const next = !bgSync;
    if (next) {
      let granted = await hasNativeFlightPermission();
      if (!granted) granted = await requestNativeFlightPermission();
      setNativeGranted(granted);
      if (!granted) {
        setNativeStatus('Concede el permiso de archivos para la sincronización en segundo plano.');
        return;
      }
      await enableBackgroundSync();
    } else {
      await disableBackgroundSync();
    }
    setBgSync(next);
  };

  // ── Selección individual y masiva ──────────────────────────────
  // Solo se pueden seleccionar archivos pendientes (no ya importados)
  const toggleFile = (name) =>
    setFiles(prev => prev.map(f =>
      f.name === name && f.status === 'pending'
        ? { ...f, selected: !f.selected }
        : f
    ));

  const toggleAll = (val) =>
    setFiles(prev => prev.map(f =>
      f.status === 'pending'
        ? { ...f, selected: val }
        : f
    ));

  // ── Auto-crear aeronave con datos del .txt (sin modal) ───────
  const autoCreateAircraft = async (data) => {
    try {
      const res = await fetch('/api/fleet', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          aircraftData: {
            model:         data.modelo || 'Aeronave DJI',
            brand:         'DJI',
            serial_number: data.serial,
            total_hours:   0,
          },
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  };

  // ── Subir un archivo individual ───────────────────────────────
  // La resolución del File es específica de web (handle/fileObj); el POST se
  // delega al bridge compartido (postFlightFile) que también usará el plugin nativo.
  const uploadFile = async (fileInfo) => {
    // Fuente nativa (Android): leer el .txt por su path vía el plugin FlightFiles.
    // Web: handle (File System API) o fileObj (input móvil).
    const fileObj = fileInfo.nativePath
      ? await readNativeFlightFile(fileInfo.nativePath)
      : (fileInfo.fileObj ?? await fileInfo.handle.getFile());
    return postFlightFile(fileObj, fileInfo.name);
  };

  // ── Importar archivos seleccionados ───────────────────────────
  // Acepta una lista explícita (auto-importación tras escaneo) o usa el estado.
  const handleImport = async (explicitList) => {
    const source = Array.isArray(explicitList) ? explicitList : files;
    const toImport = source.filter(f => f.selected && f.status === 'pending');
    if (!toImport.length) return;

    setState('uploading');
    let imported = 0, skipped = 0, errors = 0;

    for (const fileInfo of toImport) {
      setFiles(prev =>
        prev.map(f => f.name === fileInfo.name ? { ...f, status: 'loading' } : f)
      );

      try {
        const { status, data } = await uploadFile(fileInfo);

        if ((status === 200 || status === 201) && data.skipped) {
          // Vuelo de 0 minutos — no se registró
          skipped++;
          setFiles(prev =>
            prev.map(f => f.name === fileInfo.name ? { ...f, status: 'skipped', result: data } : f)
          );
        } else if (status === 200 || status === 201) {
          imported++;
          setFiles(prev =>
            prev.map(f => f.name === fileInfo.name
              ? { ...f, status: 'ok', result: data }
              : f
            )
          );
          onFlightImported?.(data);
        } else if (status === 409) {
          skipped++;
          setFiles(prev =>
            prev.map(f => f.name === fileInfo.name ? { ...f, status: 'duplicate', result: data } : f)
          );
        } else if (status === 404 && data.needs_aircraft) {
          // Aeronave no registrada — intentar auto-crear con datos del .txt
          const model = String(data.modelo ?? '').trim();
          if (model) {
            const acCreated = await autoCreateAircraft(data);
            if (acCreated) {
              // Reintentar el vuelo ahora que la aeronave existe
              setFiles(prev =>
                prev.map(f => f.name === fileInfo.name ? { ...f, status: 'loading' } : f)
              );
              const retry = await uploadFile(fileInfo);
              if (retry.status === 200 || retry.status === 201) {
                imported++;
                const retryData = { ...retry.data, aircraft_auto_created: model };
                setFiles(prev =>
                  prev.map(f => f.name === fileInfo.name ? { ...f, status: 'ok', result: retryData } : f)
                );
                onFlightImported?.(retryData);
              } else if (retry.status === 409) {
                skipped++;
                setFiles(prev =>
                  prev.map(f => f.name === fileInfo.name ? { ...f, status: 'duplicate', result: retry.data } : f)
                );
              } else {
                errors++;
                setFiles(prev =>
                  prev.map(f => f.name === fileInfo.name ? { ...f, status: 'error', result: retry.data } : f)
                );
              }
            } else {
              // Auto-crear falló (límite de plan u otro) → pausar con modal
              setFiles(prev =>
                prev.map(f => f.name === fileInfo.name ? { ...f, status: 'needs_aircraft', result: data } : f)
              );
              setAircraftForm({ ...EMPTY_AIRCRAFT, serial_number: String(data.serial ?? ''), model });
              setAircraftModal({ ...data, pendingFile: fileInfo });
              return;
            }
          } else {
            // Sin modelo en el .txt → pedir al usuario con modal
            setFiles(prev =>
              prev.map(f => f.name === fileInfo.name ? { ...f, status: 'needs_aircraft', result: data } : f)
            );
            setAircraftForm({ ...EMPTY_AIRCRAFT, serial_number: String(data.serial ?? ''), model: '' });
            setAircraftModal({ ...data, pendingFile: fileInfo });
            return;
          }
        } else {
          errors++;
          setFiles(prev =>
            prev.map(f => f.name === fileInfo.name ? { ...f, status: 'error', result: data } : f)
          );
        }
      } catch (err) {
        errors++;
        setFiles(prev =>
          prev.map(f => f.name === fileInfo.name
            ? { ...f, status: 'error', result: { error: err.message } }
            : f
          )
        );
      }
    }

    setResults({ imported, skipped, errors });
    setState('done');
    if (imported > 0) onImported?.();
  };

  // ── Continuar importación tras crear aeronave ─────────────────
  const continueAfterAircraftCreated = async (pendingFile) => {
    setAircraftModal(null);

    // Reintentar el archivo que falló
    let imported = 0, skipped = 0, errors = 0;
    setFiles(prev =>
      prev.map(f => f.name === pendingFile.name ? { ...f, status: 'loading' } : f)
    );
    try {
      const { status, data } = await uploadFile(pendingFile);
      if ((status === 200 || status === 201) && data.skipped) {
        skipped++;
        setFiles(prev =>
          prev.map(f => f.name === pendingFile.name ? { ...f, status: 'skipped', result: data } : f)
        );
      } else if (status === 200 || status === 201) {
        imported++;
        setFiles(prev =>
          prev.map(f => f.name === pendingFile.name ? { ...f, status: 'ok', result: data } : f)
        );
        onFlightImported?.(data);
      } else {
        errors++;
        setFiles(prev =>
          prev.map(f => f.name === pendingFile.name ? { ...f, status: 'error', result: data } : f)
        );
      }
    } catch (err) {
      errors++;
      setFiles(prev =>
        prev.map(f => f.name === pendingFile.name
          ? { ...f, status: 'error', result: { error: err.message } }
          : f
        )
      );
    }

    // Continuar con los archivos restantes que aún estén en pending
    const remaining = files.filter(
      f => f.selected && f.status === 'pending' && f.name !== pendingFile.name
    );
    let rImported = 0, rSkipped = 0, rErrors = 0;

    for (const fileInfo of remaining) {
      setFiles(prev =>
        prev.map(f => f.name === fileInfo.name ? { ...f, status: 'loading' } : f)
      );
      try {
        const { status, data } = await uploadFile(fileInfo);
        if ((status === 200 || status === 201) && data.skipped) {
          rSkipped++;
          setFiles(prev => prev.map(f => f.name === fileInfo.name ? { ...f, status: 'skipped', result: data } : f));
        } else if (status === 200 || status === 201) {
          rImported++;
          setFiles(prev => prev.map(f => f.name === fileInfo.name ? { ...f, status: 'ok', result: data } : f));
          onFlightImported?.(data);
        } else if (status === 409) {
          rSkipped++;
          setFiles(prev => prev.map(f => f.name === fileInfo.name ? { ...f, status: 'duplicate', result: data } : f));
        } else if (status === 404 && data.needs_aircraft) {
          const model = String(data.modelo ?? '').trim();
          if (model) {
            const acCreated = await autoCreateAircraft(data);
            if (acCreated) {
              setFiles(prev => prev.map(f => f.name === fileInfo.name ? { ...f, status: 'loading' } : f));
              const retry = await uploadFile(fileInfo);
              if (retry.status === 200 || retry.status === 201) {
                rImported++;
                const retryData = { ...retry.data, aircraft_auto_created: model };
                setFiles(prev => prev.map(f => f.name === fileInfo.name ? { ...f, status: 'ok', result: retryData } : f));
                onFlightImported?.(retryData);
              } else {
                rErrors++;
                setFiles(prev => prev.map(f => f.name === fileInfo.name ? { ...f, status: 'error', result: retry.data } : f));
              }
            } else {
              setFiles(prev => prev.map(f => f.name === fileInfo.name ? { ...f, status: 'needs_aircraft', result: data } : f));
              setAircraftForm({ ...EMPTY_AIRCRAFT, serial_number: String(data.serial ?? ''), model });
              setAircraftModal({ ...data, pendingFile: fileInfo });
              return;
            }
          } else {
            setFiles(prev => prev.map(f => f.name === fileInfo.name ? { ...f, status: 'needs_aircraft', result: data } : f));
            setAircraftForm({ ...EMPTY_AIRCRAFT, serial_number: String(data.serial ?? ''), model: '' });
            setAircraftModal({ ...data, pendingFile: fileInfo });
            return;
          }
        } else {
          rErrors++;
          setFiles(prev => prev.map(f => f.name === fileInfo.name ? { ...f, status: 'error', result: data } : f));
        }
      } catch (err) {
        rErrors++;
        setFiles(prev => prev.map(f => f.name === fileInfo.name ? { ...f, status: 'error', result: { error: err.message } } : f));
      }
    }

    const total = {
      imported: imported + rImported,
      skipped:  skipped  + rSkipped,
      errors:   errors   + rErrors,
    };
    setResults(total);
    setState('done');
    if (total.imported > 0) onImported?.();
  };

  // ── Crear aeronave desde modal ────────────────────────────────
  const handleCreateAircraft = async () => {
    if (!String(aircraftForm.model ?? '').trim() || !String(aircraftForm.serial_number ?? '').trim()) {
      setAircraftError('Modelo y serial son obligatorios.');
      return;
    }
    setCreatingAircraft(true);
    setAircraftError('');
    try {
      const res  = await fetch('/api/fleet', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ aircraftData: aircraftForm }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAircraftError(data.error || 'Error al crear la aeronave.');
        setCreatingAircraft(false);
        return;
      }
      const pending = aircraftModal.pendingFile;
      setCreatingAircraft(false);
      continueAfterAircraftCreated(pending);
    } catch (err) {
      setAircraftError(err.message);
      setCreatingAircraft(false);
    }
  };

  // ── Crear batería desde modal inline ─────────────────────────
  const handleCreateBattery = async () => {
    if (!batteryForm.serial_number.trim()) {
      setBatteryError('El serial es obligatorio.');
      return;
    }
    setCreatingBattery(true);
    setBatteryError('');
    try {
      const res  = await fetch('/api/fleet/batteries', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(batteryForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setBatteryError(data.error || 'Error al crear la batería.');
        setCreatingBattery(false);
        return;
      }
      // Marcar el archivo como ok completo
      setFiles(prev =>
        prev.map(f =>
          f.name === batteryModal.fileName
            ? { ...f, status: 'ok', result: { ...f.result, needs_battery: false,
                bateria_actualizada: { serial: data.serial_number, ciclos_anteriores: 0, ciclos_nuevos: data.cycles ?? 0 } } }
            : f
        )
      );
      setBatteryModal(null);
      setBatteryForm(EMPTY_BATTERY);
      setCreatingBattery(false);
    } catch (err) {
      setBatteryError(err.message);
      setCreatingBattery(false);
    }
  };

  // ── Selección de archivos en mobile (input[type=file]) ───────
  const handleMobileFileSelect = async (e) => {
    const selectedFiles = Array.from(e.target.files ?? []);
    // Limpiar input para que el usuario pueda volver a seleccionar los mismos archivos
    if (mobileInputRef.current) mobileInputRef.current.value = '';
    if (!selectedFiles.length) return;

    const txtFiles = selectedFiles.filter(f => /\.txt$/i.test(f.name));
    if (!txtFiles.length) {
      setError('No se encontraron archivos .txt de DJI en la selección.');
      return;
    }

    setState('scanning');
    const found = txtFiles.map(fileObj => ({
      name:     fileObj.name,
      fileObj,          // File object directo (no handle)
      handle:   null,
      selected: true,
      status:   'pending',
      result:   null,
    }));

    found.sort((a, b) => b.name.localeCompare(a.name));

    const existingSet = await checkExisting(found);
    const withStatus = found.map(f => {
      const date = dateFromName(f.name);
      const time = timeFromName(f.name);
      const key  = date && time ? `${date}|${time}` : null;
      const isDuplicate = key && existingSet.has(key);
      return { ...f, selected: !isDuplicate, status: isDuplicate ? 'duplicate' : 'pending' };
    });

    setFiles(withStatus);
    setState('ready');

    // Auto-importar de inmediato lo nuevo (sin botón aparte). Si todo es duplicado,
    // no hace nada y queda la lista visible.
    const pendingNew = withStatus.filter(f => f.selected && f.status === 'pending');
    if (pendingNew.length) {
      await handleImport(withStatus);
    }
  };

  // ── Auto-importación de la carpeta recordada (File System API) ──
  // Sondea la carpeta y trae solo los .txt nuevos, sin intervención del usuario.
  // Ref para evitar closures obsoletas y dependencias en el efecto de sondeo.
  const autoImportRef = useRef(null);
  autoImportRef.current = async () => {
    if (autoBusyRef.current) return;
    const handle = savedHandle;
    if (!handle) return;

    // En segundo plano no se puede solicitar permiso — solo continuar si ya está concedido.
    let perm = 'granted';
    try { perm = await handle.queryPermission?.({ mode: 'read' }); } catch { return; }
    if (perm && perm !== 'granted') {
      setAutoStatus('Permiso pendiente — pulsa "Sincronizar" una vez');
      return;
    }

    autoBusyRef.current = true;
    try {
      const found = [];
      for await (const [name, h] of handle.entries()) {
        if (h.kind === 'file' && /\.txt$/i.test(name)) found.push({ name, handle: h });
      }
      if (!found.length) { setAutoStatus('Carpeta vacía'); return; }

      const existingSet = await checkExisting(found);
      const fresh = found.filter(f => {
        const date = dateFromName(f.name), time = timeFromName(f.name);
        const key = date && time ? `${date}|${time}` : null;
        return !(key && existingSet.has(key));
      });
      if (!fresh.length) { setAutoStatus('Sin vuelos nuevos'); return; }

      let imported = 0;
      for (const f of fresh) {
        const { status, data } = await uploadFile({ name: f.name, handle: f.handle, fileObj: null });
        if ((status === 200 || status === 201) && !data.skipped) {
          imported++;
          onFlightImported?.(data);
        }
        // needs_aircraft / errores: se omiten en segundo plano (el import manual los gestiona)
      }
      if (imported > 0) onImported?.();
      setAutoStatus(imported > 0 ? `${imported} vuelo(s) nuevo(s) sincronizado(s)` : 'Sin vuelos nuevos');
    } catch {
      // Carpeta inaccesible (movida / sin permiso) — no romper el ciclo
    } finally {
      autoBusyRef.current = false;
    }
  };

  // Ciclo de sondeo cada 20s mientras auto-sync esté activo y haya carpeta recordada.
  useEffect(() => {
    if (!autoSync || !savedHandle || !isSupported) return;
    const tick = () => {
      if (typeof document !== 'undefined' && document.hidden) return; // pausar si la pestaña está oculta
      if (state === 'uploading' || state === 'scanning') return;       // no chocar con import manual
      autoImportRef.current?.();
    };
    tick(); // primer sondeo inmediato
    autoTimerRef.current = setInterval(tick, AUTOSYNC_INTERVAL_MS);
    return () => clearInterval(autoTimerRef.current);
    // autoImportRef es estable; state se relee en cada re-ejecución del efecto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSync, savedHandle, isSupported, state]);

  const toggleAutoSync = () => {
    setAutoSync(prev => {
      const next = !prev;
      try { localStorage.setItem(AUTOSYNC_KEY, next ? '1' : '0'); } catch { /* no-op */ }
      if (!next) setAutoStatus('');
      return next;
    });
  };

  // ── Reiniciar ─────────────────────────────────────────────────
  const handleReset = () => {
    setState('idle');
    setFiles([]);
    setResults(null);
    setError('');
  };

  const selectedCount = files.filter(f => f.selected && f.status === 'pending').length;

  // ── Browser no compatible (solo desktop sin showDirectoryPicker) ──
  if (!isSupported && !isMobile) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center space-y-3">
        <span className="material-symbols-outlined text-4xl text-amber-500 block">browser_not_supported</span>
        <p className="text-sm font-black text-amber-800 uppercase tracking-widest">
          Requiere Chrome o Edge
        </p>
        <p className="text-xs text-amber-700 font-medium leading-relaxed">
          Esta función usa la API de archivos del navegador, disponible solo en Chrome y Edge (escritorio).
          Abre Bitafly en Chrome para usar la sincronización con el RC.
        </p>
      </div>
    );
  }

  // ── Seleccionar instrucciones según modo ──────────────────────
  const activeInstructions = isMobile ? MOBILE_DEVICE_INSTRUCTIONS : DEVICE_INSTRUCTIONS;
  const activeTabs = isMobile
    ? Object.entries(MOBILE_DEVICE_INSTRUCTIONS)
    : Object.entries(DEVICE_INSTRUCTIONS);

  return (
    <div className="space-y-5">

      {/* ── Banner: no cambies de página durante la importación ── */}
      {isUploading && (
        <div className="sticky top-0 z-30 flex items-center gap-3 bg-orange-600 text-white px-4 py-3 rounded-2xl shadow-lg shadow-orange-500/30 animate-pulse">
          <span className="material-symbols-outlined text-xl shrink-0">warning</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black uppercase tracking-wide">Importación en progreso</p>
            <p className="text-xs font-medium opacity-90 leading-snug">
              No cambies de página ni cierres el navegador hasta que finalice.
            </p>
          </div>
          <span className="material-symbols-outlined text-xl shrink-0 animate-spin">sync</span>
        </div>
      )}

      {/* ── App nativa Android: sincronización directa del control ── */}
      {nativeSource && state === 'idle' && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50/60 p-5 space-y-3">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-orange-500 text-2xl shrink-0">smartphone</span>
            <div className="min-w-0">
              <p className="text-sm font-black text-navy uppercase tracking-tight">Sincronización automática</p>
              <p className="text-xs text-slate-500 font-medium leading-snug mt-0.5">
                Lee los vuelos DJI directo del control — no necesitas copiar archivos ni navegar carpetas.
              </p>
            </div>
          </div>
          <button
            onClick={handleNativeSync}
            className="w-full py-5 bg-orange-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-orange-500/20 hover:bg-orange-700 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">sync</span>
            {nativeGranted ? 'Sincronizar vuelos del control' : 'Conceder acceso y sincronizar'}
          </button>
          {nativeStatus && (
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-emerald-500 text-sm">info</span>
              <p className="text-[11px] font-bold text-slate-500">{nativeStatus}</p>
            </div>
          )}

          {/* Toggle: sincronización en segundo plano (WorkManager — F3.8) */}
          {bgSupported && (
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-orange-100">
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="material-symbols-outlined text-orange-500 text-xl shrink-0 mt-0.5">autorenew</span>
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-700">En segundo plano</p>
                  <p className="text-[11px] text-slate-400 font-medium leading-snug">
                    Sube los vuelos nuevos solo, incluso con la app cerrada (cada ~15 min).
                  </p>
                </div>
              </div>
              <button
                onClick={toggleBgSync}
                role="switch"
                aria-checked={bgSync}
                aria-label="Activar sincronización en segundo plano"
                className={`relative w-12 h-7 rounded-full shrink-0 transition-colors ${bgSync ? 'bg-orange-500' : 'bg-slate-200'}`}
              >
                <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${bgSync ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Instrucciones con tabs (oculto en la app nativa) ───── */}
      {!nativeSource && (state === 'idle' || state === 'scanning') && (
        <div className="rounded-2xl border border-slate-200 overflow-hidden">

          {/* Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50">
            {activeTabs.map(([key, dev]) => (
              <button
                key={key}
                onClick={() => setDevice(key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-black uppercase tracking-widest transition-all ${
                  device === key
                    ? 'bg-white text-navy border-b-2 border-orange-500'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <span className="material-symbols-outlined text-sm">{dev.icon}</span>
                {dev.label}
              </button>
            ))}
          </div>

          {/* Contenido del tab activo */}
          <div className="p-5 space-y-3 bg-white">
            <ol className="space-y-3">
              {(activeInstructions[device] ?? Object.values(activeInstructions)[0]).steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-xs font-black flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <div className="space-y-1 flex-1">
                    <p className="text-xs font-bold text-slate-800">{step.title}</p>
                    {step.detail && (
                      <p className="text-xs text-slate-500 font-medium leading-relaxed">{step.detail}</p>
                    )}
                    {step.path && (() => {
                      const segments = step.path.split('→').map(s => s.trim());
                      return (
                        <>
                          {/* Desktop: ruta horizontal en una línea con scroll si es muy larga */}
                          <code className="hidden sm:block text-xs bg-slate-100 text-slate-700 px-2 py-1.5 rounded-lg font-mono leading-relaxed mt-1 overflow-x-auto whitespace-nowrap">
                            {segments.map((seg, j) => (
                              <span key={j}>
                                {j > 0 && <span className="text-slate-400 mx-1">→</span>}
                                <span className={j === segments.length - 1 ? 'font-black text-orange-600' : ''}>{seg}</span>
                              </span>
                            ))}
                          </code>
                          {/* Mobile: ruta vertical — cada segmento en su propia línea */}
                          <div className="sm:hidden mt-1.5 bg-slate-100 rounded-xl overflow-hidden">
                            {segments.map((seg, j) => (
                              <div key={j} className="flex items-center gap-2 px-3 py-1.5 border-b border-slate-200/60 last:border-0">
                                {j === 0 ? (
                                  <span className="material-symbols-outlined text-slate-400 text-sm shrink-0">folder</span>
                                ) : (
                                  <span className="material-symbols-outlined text-slate-300 text-sm shrink-0 ml-1">subdirectory_arrow_right</span>
                                )}
                                <span className={`text-xs font-mono break-all ${j === segments.length - 1 ? 'font-black text-orange-600' : 'text-slate-600'}`}>
                                  {seg}
                                </span>
                              </div>
                            ))}
                          </div>
                        </>
                      );
                    })()}
                    {step.note && (
                      <div className="flex gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 mt-1.5">
                        <span className="material-symbols-outlined text-amber-500 text-base shrink-0 mt-0.5">warning</span>
                        <p className="text-xs text-amber-700 font-medium leading-relaxed">{step.note}</p>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>

            {!isMobile && (
              <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
                <span className="material-symbols-outlined text-slate-400 text-sm">info</span>
                <p className="text-xs text-slate-400 font-medium">
                  El navegador no puede leer dispositivos USB directamente — es necesario copiar la carpeta al PC primero.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Sincronización rápida con carpeta recordada ────────── */}
      {state === 'idle' && isSupported && savedHandle && (
        <button
          onClick={handleQuickSync}
          className="w-full py-5 bg-orange-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl shadow-orange-500/20 hover:bg-orange-700 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">sync</span>
          Sincronizar de nuevo · carpeta guardada
        </button>
      )}

      {/* ── Auto-sincronización (solo donde hay File System API) ── */}
      {state === 'idle' && isSupported && savedHandle && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <span className="material-symbols-outlined text-orange-500 text-xl shrink-0 mt-0.5">autorenew</span>
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-widest text-slate-700">Auto-sincronización</p>
                <p className="text-[11px] text-slate-400 font-medium leading-snug">
                  Revisa la carpeta cada 20s e importa los vuelos nuevos automáticamente.
                </p>
              </div>
            </div>
            {/* Toggle */}
            <button
              onClick={toggleAutoSync}
              role="switch"
              aria-checked={autoSync}
              aria-label="Activar auto-sincronización"
              className={`relative w-12 h-7 rounded-full shrink-0 transition-colors ${autoSync ? 'bg-orange-500' : 'bg-slate-200'}`}
            >
              <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${autoSync ? 'translate-x-5' : ''}`} />
            </button>
          </div>
          {autoSync && (
            <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
              <span className="material-symbols-outlined text-emerald-500 text-sm animate-pulse">radio_button_checked</span>
              <p className="text-[11px] font-bold text-slate-500">
                Vigilando carpeta{autoStatus ? ` · ${autoStatus}` : '…'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Botón principal ────────────────────────────────────── */}
      {state === 'idle' && isSupported && (
        <button
          onClick={handleSelectFolder}
          className={`w-full py-5 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${
            savedHandle
              ? 'bg-white text-navy border border-slate-200 hover:border-slate-400'
              : 'bg-navy text-white hover:bg-slate-700'
          }`}
        >
          <span className="material-symbols-outlined text-sm">folder_open</span>
          {savedHandle ? 'Elegir otra carpeta' : 'Seleccionar carpeta de vuelos'}
        </button>
      )}

      {/* ── Olvidar carpeta recordada ──────────────────────────── */}
      {state === 'idle' && isSupported && savedHandle && (
        <button
          onClick={handleForgetFolder}
          className="w-full text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center gap-1.5 py-1"
        >
          <span className="material-symbols-outlined text-sm">delete_outline</span>
          Olvidar esta carpeta
        </button>
      )}

      {/* ── Botón mobile (sin File System API: iOS / Chrome Android) ── */}
      {state === 'idle' && !isSupported && !nativeSource && (
        <>
          {/* Android: webkitdirectory permite elegir la carpeta FlightRecord completa
              de una vez → se auto-importan los vuelos nuevos. iOS Safari NO soporta
              selección de carpeta → selección de archivos múltiples. */}
          {device === 'iphone' ? (
            <input
              ref={mobileInputRef}
              type="file"
              multiple
              accept=".txt"
              className="hidden"
              onChange={handleMobileFileSelect}
            />
          ) : (
            <input
              ref={mobileInputRef}
              type="file"
              multiple
              accept=".txt"
              webkitdirectory=""
              directory=""
              className="hidden"
              onChange={handleMobileFileSelect}
            />
          )}
          <button
            onClick={() => mobileInputRef.current?.click()}
            className="w-full py-5 bg-navy text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">{device === 'iphone' ? 'upload_file' : 'folder_open'}</span>
            {device === 'iphone' ? 'Seleccionar archivos DJI' : 'Seleccionar carpeta de vuelos'}
          </button>
          <p className="text-[11px] text-slate-400 font-medium text-center leading-snug px-2">
            {device === 'iphone'
              ? 'Selecciona los .txt de FlightRecord. Se importan automáticamente los vuelos nuevos.'
              : 'Elige la carpeta FlightRecord una vez. Se importan automáticamente los vuelos nuevos.'}
            {' '}En celular/tablet repite el paso cuando tengas vuelos nuevos (el navegador no permite vigilar la carpeta en segundo plano).
          </p>
        </>
      )}

      {/* ── Escaneando ──────────────────────────────────────────── */}
      {state === 'scanning' && (
        <div className="py-10 text-center space-y-3">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-black uppercase text-slate-400 tracking-widest">
            Leyendo archivos de vuelo...
          </p>
        </div>
      )}

      {/* ── Lista de archivos ───────────────────────────────────── */}
      {['ready', 'uploading', 'done'].includes(state) && files.length > 0 && (
        <div className="space-y-3">

          {/* Control de selección */}
          {state === 'ready' && (() => {
            const newCount  = files.filter(f => f.status === 'pending').length;
            const dupCount  = files.filter(f => f.status === 'duplicate').length;
            return (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-3">
                    <p className="text-xs font-black uppercase text-slate-400 tracking-widest">
                      {selectedCount} seleccionado{selectedCount !== 1 ? 's' : ''}
                    </p>
                    {newCount > 0 && (
                      <span className="bg-green-100 text-green-700 text-xs font-black px-2 py-0.5 rounded-full">
                        {newCount} nuevo{newCount !== 1 ? 's' : ''}
                      </span>
                    )}
                    {dupCount > 0 && (
                      <span className="bg-slate-100 text-slate-500 text-xs font-black px-2 py-0.5 rounded-full">
                        {dupCount} ya importado{dupCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-4">
                    <button onClick={() => toggleAll(true)}  className="text-xs font-black text-orange-600 hover:underline">Todos</button>
                    <button onClick={() => toggleAll(false)} className="text-xs font-black text-slate-400 hover:underline">Ninguno</button>
                  </div>
                </div>
                {dupCount > 0 && newCount === 0 && (
                  <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                    <span className="material-symbols-outlined text-green-500 text-base shrink-0">check_circle</span>
                    <p className="text-xs text-green-700 font-bold">
                      Todos los vuelos de este RC ya están en la bitácora.
                    </p>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Archivos — los duplicados (ya importados) se ocultan */}
          <div className="bg-slate-50 rounded-2xl overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto">
            {files.filter(f => f.status !== 'duplicate').map(f => {
              const date = dateFromName(f.name);
              const time = timeFromName(f.name);
              const icon = STATUS_ICON[f.status];

              return (
                <label
                  key={f.name}
                  className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors ${
                    f.status === 'ok'        ? 'bg-green-50' :
                    f.status === 'error'     ? 'bg-red-50'   :
                    f.status === 'duplicate' ? 'bg-slate-100' :
                    'hover:bg-white'
                  }`}
                >
                  {/* Checkbox solo en estado ready y archivo pendiente */}
                  {state === 'ready' && f.status === 'pending' && (
                    <input
                      type="checkbox"
                      checked={f.selected}
                      onChange={() => toggleFile(f.name)}
                      className="accent-orange-600 w-4 h-4 rounded shrink-0"
                    />
                  )}
                  {/* Spacer para mantener alineación cuando no hay checkbox */}
                  {state === 'ready' && f.status !== 'pending' && (
                    <span className="w-4 h-4 shrink-0" />
                  )}

                  {/* Icono de estado */}
                  {icon && (
                    <span className={`material-symbols-outlined text-base shrink-0 ${STATUS_COLOR[f.status]}`}>
                      {icon}
                    </span>
                  )}
                  {state !== 'ready' && !icon && (
                    <span className="material-symbols-outlined text-base shrink-0 text-slate-300 animate-pulse">
                      schedule
                    </span>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-slate-800 font-mono">
                      {date ?? f.name}
                      {time && <span className="text-slate-400 font-normal ml-2">{time}</span>}
                    </p>
                    {f.status === 'duplicate' && (
                      <p className="text-xs text-slate-400 font-bold">Ya importado</p>
                    )}
                    {f.status === 'skipped' && (
                      <p className="text-xs text-slate-400 font-bold">Vuelo de 0 min — omitido</p>
                    )}
                    {f.status === 'error' && f.result?.error && (
                      <p className="text-xs text-red-500 font-bold mt-0.5 truncate" title={f.result.error}>
                        {f.result.error}
                      </p>
                    )}
                    {f.status === 'ok' && (
                      <div className="space-y-0.5">
                        <p className="text-xs text-green-600 font-bold">
                          {f.result?.duracion ? `${Math.round(f.result.duracion / 60)} min` : 'Importado'}
                          {f.result?.altMax ? ` · ${f.result.altMax} m` : ''}
                        </p>
                        {f.result?.aircraft_auto_created && (
                          <p className="text-xs text-blue-500 font-bold">
                            ✈ {f.result.aircraft_auto_created} registrada
                          </p>
                        )}
                        {f.result?.bateria_actualizada && (
                          <p className="text-xs text-sky-500 font-bold">
                            🔋 {f.result.bateria_actualizada.serial} · {f.result.bateria_actualizada.ciclos_anteriores}→{f.result.bateria_actualizada.ciclos_nuevos} ciclos
                          </p>
                        )}
                        {f.result?.battery_auto_created && (
                          <p className="text-xs text-sky-500 font-bold">
                            🔋 Batería registrada automáticamente
                          </p>
                        )}
                      </div>
                    )}
                    {f.status === 'needs_aircraft' && (
                      <p className="text-xs text-amber-600 font-bold">
                        Aeronave no registrada · SN: {f.result?.serial}
                      </p>
                    )}
                    {f.status === 'ok_no_battery' && (
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-sky-600 font-bold">
                          Vuelo importado · Batería SN {f.result?.serial_bateria} no registrada
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setBatteryForm({ ...EMPTY_BATTERY, serial_number: f.result?.serial_bateria ?? '', cycles: f.result?.ciclos_bateria ?? 0, model: f.result?.modelo_bateria ?? '' });
                            setBatteryModal({ serial_bateria: f.result?.serial_bateria, ciclos_bateria: f.result?.ciclos_bateria, modelo_bateria: f.result?.modelo_bateria, fileName: f.name });
                          }}
                          className="shrink-0 bg-sky-600 text-white px-2 py-0.5 rounded-lg text-xs font-black hover:bg-sky-700 transition-all"
                        >
                          + Registrar
                        </button>
                      </div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>

          {/* Botón importar */}
          {state === 'ready' && (
            <button
              onClick={handleImport}
              disabled={selectedCount === 0}
              className="w-full py-4 bg-orange-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-lg shadow-orange-500/20 disabled:opacity-40 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">cloud_upload</span>
              Importar {selectedCount} vuelo{selectedCount !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      )}

      {/* ── Resultado final ─────────────────────────────────────── */}
      {state === 'done' && results && (
        <div className={`rounded-2xl p-6 text-center space-y-2 ${
          results.imported > 0 ? 'bg-green-50' : 'bg-amber-50'
        }`}>
          <span className={`material-symbols-outlined text-5xl block ${
            results.imported > 0 ? 'text-green-500' : 'text-amber-500'
          }`}>
            {results.imported > 0 ? 'check_circle' : 'warning'}
          </span>
          <p className="text-2xl font-black text-navy">
            {results.imported} vuelo{results.imported !== 1 ? 's' : ''} importado{results.imported !== 1 ? 's' : ''}
          </p>
          <div className="flex justify-center gap-4 text-xs font-bold">
            {results.skipped > 0 && (
              <span className="text-slate-400">{results.skipped} duplicado{results.skipped !== 1 ? 's' : ''}</span>
            )}
            {results.errors > 0 && (
              <span className="text-red-500">{results.errors} error{results.errors !== 1 ? 'es' : ''}</span>
            )}
          </div>
        </div>
      )}

      {/* ── Error global ────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 flex gap-2">
          <span className="material-symbols-outlined text-red-400 text-base shrink-0 mt-0.5">error</span>
          <p className="text-xs text-red-600 font-bold">{error}</p>
        </div>
      )}

      {/* ── Volver a sincronizar ────────────────────────────────── */}
      {state === 'done' && (
        <button
          onClick={handleReset}
          className="w-full py-3 text-xs font-black text-slate-400 uppercase border border-slate-200 rounded-2xl hover:border-slate-400 transition-all"
        >
          Sincronizar más archivos
        </button>
      )}

      {/* ── Modal: crear aeronave ────────────────────────────────── */}
      {aircraftModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="bg-amber-50 border-b border-amber-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-amber-500 text-2xl">flight</span>
                <div>
                  <p className="text-sm font-black text-slate-900 uppercase tracking-tight">
                    Aeronave no registrada
                  </p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    SN detectado: <code className="bg-amber-100 px-1.5 rounded font-mono">{aircraftModal.serial}</code>
                    {aircraftModal.modelo && <span className="ml-2 text-slate-400">· {aircraftModal.modelo}</span>}
                  </p>
                </div>
              </div>
              <p className="text-xs text-amber-700 font-medium mt-3 leading-relaxed">
                Esta aeronave no está en tu flota. Completa los datos para registrarla y continuar la importación.
              </p>
            </div>

            {/* Form */}
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-black uppercase text-slate-500 tracking-widest block mb-1">Modelo *</label>
                  <input
                    value={aircraftForm.model}
                    onChange={e => setAircraftForm(p => ({ ...p, model: e.target.value }))}
                    placeholder="Ej: DJI Mini 3 Pro"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase text-slate-500 tracking-widest block mb-1">Fabricante</label>
                  <input
                    value={aircraftForm.brand}
                    onChange={e => setAircraftForm(p => ({ ...p, brand: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase text-slate-500 tracking-widest block mb-1">Serial (SN)</label>
                  <input
                    value={aircraftForm.serial_number}
                    onChange={e => setAircraftForm(p => ({ ...p, serial_number: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-400 font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-black uppercase text-slate-500 tracking-widest block mb-1">No. RUAS / Matrícula</label>
                  <input
                    value={aircraftForm.ruas}
                    onChange={e => setAircraftForm(p => ({ ...p, ruas: e.target.value }))}
                    placeholder="Número de registro Aerocivil"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                </div>
                <div className="col-span-2">
                  <a
                    href="/dashboard/fleet"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-start gap-2.5 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2.5 hover:bg-orange-100 transition-all group"
                  >
                    <span className="material-symbols-outlined text-orange-500 text-base shrink-0 mt-0.5">build</span>
                    <div>
                      <p className="text-xs font-black text-orange-700 uppercase tracking-wide">Mantenimiento técnico</p>
                      <p className="text-xs text-orange-600 font-medium leading-snug mt-0.5">
                        Actualiza la fecha del último mantenimiento en <span className="font-black underline underline-offset-2 group-hover:text-orange-800">Flota → editar aeronave</span> después de crearla.
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-orange-400 text-sm shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform">arrow_forward</span>
                  </a>
                </div>
              </div>

              {aircraftError && (
                <div className="flex gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  <span className="material-symbols-outlined text-red-400 text-sm shrink-0">error</span>
                  <p className="text-xs text-red-600 font-bold">{aircraftError}</p>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setAircraftModal(null); setState('done'); setResults({ imported: 0, skipped: 0, errors: 1 }); }}
                  className="flex-1 py-3 text-xs font-black text-slate-400 uppercase border border-slate-200 rounded-2xl hover:border-slate-400 transition-all"
                >
                  Omitir
                </button>
                <button
                  onClick={handleCreateAircraft}
                  disabled={creatingAircraft || !String(aircraftForm.model ?? '').trim()}
                  className="flex-1 py-3 bg-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-500/20 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                >
                  {creatingAircraft
                    ? <><span className="material-symbols-outlined text-sm animate-spin">sync</span>Creando...</>
                    : <><span className="material-symbols-outlined text-sm">add</span>Crear y continuar</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: crear batería ─────────────────────────────────── */}
      {batteryModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-[2rem] shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="bg-sky-50 border-b border-sky-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-sky-500 text-2xl">battery_charging_full</span>
                <div>
                  <p className="text-sm font-black text-slate-900 uppercase tracking-tight">
                    Batería no registrada
                  </p>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    SN detectado: <code className="bg-sky-100 px-1.5 rounded font-mono">{batteryModal.serial_bateria}</code>
                    {batteryModal.modelo_bateria && <span className="ml-2 text-slate-400">· {batteryModal.modelo_bateria}</span>}
                  </p>
                </div>
              </div>
              <p className="text-xs text-sky-700 font-medium mt-3 leading-relaxed">
                El vuelo fue importado correctamente. Esta batería no está registrada en tu flota. Regístrala ahora o omite para hacerlo después.
              </p>
            </div>

            {/* Form */}
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-black uppercase text-slate-500 tracking-widest block mb-1">Fabricante</label>
                  <input
                    value={batteryForm.brand}
                    onChange={e => setBatteryForm(p => ({ ...p, brand: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase text-slate-500 tracking-widest block mb-1">Modelo</label>
                  <input
                    value={batteryForm.model}
                    onChange={e => setBatteryForm(p => ({ ...p, model: e.target.value }))}
                    placeholder="Ej: TB60"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-black uppercase text-slate-500 tracking-widest block mb-1">Serial (SN)</label>
                  <input
                    value={batteryForm.serial_number}
                    onChange={e => setBatteryForm(p => ({ ...p, serial_number: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase text-slate-500 tracking-widest block mb-1">Ciclos actuales</label>
                  <input
                    type="number"
                    min="0"
                    value={batteryForm.cycles}
                    onChange={e => setBatteryForm(p => ({ ...p, cycles: Number(e.target.value) }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-black uppercase text-slate-500 tracking-widest block mb-1">Salud (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={batteryForm.health_status}
                    onChange={e => setBatteryForm(p => ({ ...p, health_status: Number(e.target.value) }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
              </div>

              {batteryError && (
                <div className="flex gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                  <span className="material-symbols-outlined text-red-400 text-sm shrink-0">error</span>
                  <p className="text-xs text-red-600 font-bold">{batteryError}</p>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => { setBatteryModal(null); setBatteryError(''); }}
                  className="flex-1 py-3 text-xs font-black text-slate-400 uppercase border border-slate-200 rounded-2xl hover:border-slate-400 transition-all"
                >
                  Omitir
                </button>
                <button
                  onClick={handleCreateBattery}
                  disabled={creatingBattery || !batteryForm.serial_number.trim()}
                  className="flex-1 py-3 bg-sky-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-sky-500/20 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                >
                  {creatingBattery
                    ? <><span className="material-symbols-outlined text-sm animate-spin">sync</span>Creando...</>
                    : <><span className="material-symbols-outlined text-sm">add</span>Registrar batería</>
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
