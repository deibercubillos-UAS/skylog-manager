'use client';
import { useState } from 'react';

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
  error:          'error',
  needs_aircraft: 'flight',
};

const STATUS_COLOR = {
  pending:        '',
  loading:        'text-orange-500 animate-spin',
  ok:             'text-green-500',
  duplicate:      'text-slate-400',
  error:          'text-red-500',
  needs_aircraft: 'text-amber-500',
};

const EMPTY_AIRCRAFT = { model: '', manufacturer: 'DJI', serial_number: '', ruas: '', notes: '' };

export default function DjiRcSync({ onImported }) {
  const [state, setState] = useState('idle'); // idle | scanning | ready | uploading | done
  const [device, setDevice] = useState('rc'); // rc | android | iphone
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);

  // Modal crear aeronave
  const [aircraftModal, setAircraftModal] = useState(null); // null | { serial, modelo, nombre, pendingFile }
  const [aircraftForm, setAircraftForm] = useState(EMPTY_AIRCRAFT);
  const [creatingAircraft, setCreatingAircraft] = useState(false);
  const [aircraftError, setAircraftError] = useState('');

  const isSupported =
    typeof window !== 'undefined' && 'showDirectoryPicker' in window;

  // ── Verificar duplicados contra la BD ─────────────────────────
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
      const res = await fetch(
        `/api/logbook/import-dji?pairs=${encodeURIComponent(pairs.join(','))}`
      );
      if (!res.ok) return new Set();
      const { existing } = await res.json();
      return new Set(existing ?? []);
    } catch {
      return new Set(); // Si falla la verificación, no bloqueamos la importación
    }
  };

  // ── Seleccionar carpeta del RC ─────────────────────────────────
  const handleSelectFolder = async () => {
    setError('');
    try {
      const rootHandle = await window.showDirectoryPicker({ mode: 'read' });
      setState('scanning');

      // Navegar automáticamente a FlightRecord
      const dirHandle = await findFlightRecordDir(rootHandle);
      if (!dirHandle) {
        setError('No se encontró la carpeta "FlightRecord" en el RC. Asegúrate de seleccionar la raíz del DJI RC y que esté en modo "Transferencia de archivos".');
        setState('idle');
        return;
      }

      const found = [];
      for await (const [name, handle] of dirHandle.entries()) {
        if (handle.kind === 'file' && /\.txt$/i.test(name)) {
          found.push({ name, handle, selected: true, status: 'pending', result: null });
        }
      }

      if (!found.length) {
        setError('La carpeta "FlightRecord" está vacía. Aún no hay vuelos registrados en este RC.');
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
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError('No se pudo acceder a la carpeta: ' + err.message);
      }
      setState('idle');
    }
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

  // ── Subir un archivo individual, devuelve { ok, skipped, needsAircraft, data } ──
  const uploadFile = async (fileInfo) => {
    const fileObj = await fileInfo.handle.getFile();
    const fd = new FormData();
    fd.append('file', fileObj, fileInfo.name);
    const res  = await fetch('/api/logbook/import-dji', { method: 'POST', body: fd });
    const data = await res.json();
    return { status: res.status, data };
  };

  // ── Importar archivos seleccionados ───────────────────────────
  const handleImport = async () => {
    const toImport = files.filter(f => f.selected && f.status === 'pending');
    if (!toImport.length) return;

    setState('uploading');
    let imported = 0, skipped = 0, errors = 0;

    for (const fileInfo of toImport) {
      setFiles(prev =>
        prev.map(f => f.name === fileInfo.name ? { ...f, status: 'loading' } : f)
      );

      try {
        const { status, data } = await uploadFile(fileInfo);

        if (status === 200 || status === 201) {
          imported++;
          setFiles(prev =>
            prev.map(f => f.name === fileInfo.name ? { ...f, status: 'ok', result: data } : f)
          );
        } else if (status === 409) {
          skipped++;
          setFiles(prev =>
            prev.map(f => f.name === fileInfo.name ? { ...f, status: 'duplicate', result: data } : f)
          );
        } else if (status === 404 && data.needs_aircraft) {
          // Aeronave no registrada — pausar e invocar modal
          setFiles(prev =>
            prev.map(f => f.name === fileInfo.name ? { ...f, status: 'needs_aircraft', result: data } : f)
          );
          setAircraftForm({
            ...EMPTY_AIRCRAFT,
            serial_number: data.serial ?? '',
            model:         data.modelo  ?? '',
            notes:         data.nombre  ? `Nombre DJI: ${data.nombre}` : '',
          });
          setAircraftModal({ ...data, pendingFile: fileInfo });
          // Pausar el loop — el modal llama a continueImport cuando termine
          return;
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
      if (status === 200 || status === 201) {
        imported++;
        setFiles(prev =>
          prev.map(f => f.name === pendingFile.name ? { ...f, status: 'ok', result: data } : f)
        );
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
        if (status === 200 || status === 201) {
          rImported++;
          setFiles(prev => prev.map(f => f.name === fileInfo.name ? { ...f, status: 'ok', result: data } : f));
        } else if (status === 409) {
          rSkipped++;
          setFiles(prev => prev.map(f => f.name === fileInfo.name ? { ...f, status: 'duplicate', result: data } : f));
        } else if (status === 404 && data.needs_aircraft) {
          setFiles(prev => prev.map(f => f.name === fileInfo.name ? { ...f, status: 'needs_aircraft', result: data } : f));
          setAircraftForm({ ...EMPTY_AIRCRAFT, serial_number: data.serial ?? '', model: data.modelo ?? '', notes: data.nombre ? `Nombre DJI: ${data.nombre}` : '' });
          setAircraftModal({ ...data, pendingFile: fileInfo });
          return; // Pausar de nuevo
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
    if (!aircraftForm.model.trim() || !aircraftForm.serial_number.trim()) {
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

  // ── Reiniciar ─────────────────────────────────────────────────
  const handleReset = () => {
    setState('idle');
    setFiles([]);
    setResults(null);
    setError('');
  };

  const selectedCount = files.filter(f => f.selected && f.status === 'pending').length;

  // ── Browser no compatible ─────────────────────────────────────
  if (!isSupported) {
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

  return (
    <div className="space-y-5">

      {/* ── Instrucciones con tabs ─────────────────────────────── */}
      {(state === 'idle' || state === 'scanning') && (
        <div className="rounded-2xl border border-slate-200 overflow-hidden">

          {/* Tabs */}
          <div className="flex border-b border-slate-200 bg-slate-50">
            {Object.entries(DEVICE_INSTRUCTIONS).map(([key, dev]) => (
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
              {DEVICE_INSTRUCTIONS[device].steps.map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="shrink-0 w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-xs font-black flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <div className="space-y-1 flex-1">
                    <p className="text-xs font-bold text-slate-800">{step.title}</p>
                    {step.detail && (
                      <p className="text-xs text-slate-500 font-medium leading-relaxed">{step.detail}</p>
                    )}
                    {step.path && (
                      <code className="text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded-lg font-mono block leading-relaxed mt-1">
                        {step.path.split('→').map((seg, j, arr) => (
                          <span key={j}>
                            {j > 0 && <span className="text-slate-400 mx-1">→</span>}
                            <span className={j === arr.length - 1 ? 'font-black text-orange-600' : ''}>{seg.trim()}</span>
                          </span>
                        ))}
                      </code>
                    )}
                    {step.note && (
                      <div className="flex gap-1.5 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 mt-1">
                        <span className="material-symbols-outlined text-amber-500 text-sm shrink-0 mt-0.5">warning</span>
                        <p className="text-xs text-amber-700 font-medium leading-relaxed">{step.note}</p>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>

            <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100">
              <span className="material-symbols-outlined text-slate-400 text-sm">info</span>
              <p className="text-xs text-slate-400 font-medium">
                El navegador no puede leer dispositivos USB directamente — es necesario copiar la carpeta al PC primero.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Botón principal ────────────────────────────────────── */}
      {state === 'idle' && (
        <button
          onClick={handleSelectFolder}
          className="w-full py-5 bg-navy text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl hover:bg-slate-700 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">folder_open</span>
          Seleccionar carpeta FlightRecord
        </button>
      )}

      {/* ── Escaneando ──────────────────────────────────────────── */}
      {state === 'scanning' && (
        <div className="py-10 text-center space-y-3">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-black uppercase text-slate-400 tracking-widest">
            Buscando carpeta FlightRecord...
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
                  <p className="text-xs text-slate-400 font-medium px-1">
                    Todos los archivos ya fueron importados. Puedes seleccionarlos manualmente para reimportar.
                  </p>
                )}
              </div>
            );
          })()}

          {/* Archivos */}
          <div className="bg-slate-50 rounded-2xl overflow-hidden divide-y divide-slate-100 max-h-64 overflow-y-auto">
            {files.map(f => {
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
                        {f.result?.bateria_actualizada && (
                          <p className="text-xs text-sky-500 font-bold">
                            🔋 {f.result.bateria_actualizada.serial} · {f.result.bateria_actualizada.ciclos_anteriores}→{f.result.bateria_actualizada.ciclos_nuevos} ciclos
                          </p>
                        )}
                      </div>
                    )}
                    {f.status === 'needs_aircraft' && (
                      <p className="text-xs text-amber-600 font-bold">
                        Aeronave no registrada · SN: {f.result?.serial}
                      </p>
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
                    value={aircraftForm.manufacturer}
                    onChange={e => setAircraftForm(p => ({ ...p, manufacturer: e.target.value }))}
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
                  <label className="text-xs font-black uppercase text-slate-500 tracking-widest block mb-1">Notas</label>
                  <input
                    value={aircraftForm.notes}
                    onChange={e => setAircraftForm(p => ({ ...p, notes: e.target.value }))}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
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
                  disabled={creatingAircraft || !aircraftForm.model.trim()}
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
    </div>
  );
}
