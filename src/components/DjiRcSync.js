'use client';
import { useState } from 'react';

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

// Navega automáticamente al FlightRecord dentro de la raíz del RC.
// Primero intenta la ruta conocida del DJI RC 2; si falla hace búsqueda recursiva.
const DJI_KNOWN_PATH = ['Android', 'data', 'dji.go.v5', 'files', 'FlightRecord'];
const DJI_KNOWN_PATH_WITH_STORAGE = ['Internal Storage', ...DJI_KNOWN_PATH];

async function findFlightRecordDir(rootHandle) {
  // Intento 1: ruta exacta del DJI RC 2 con "Internal Storage"
  try {
    let cur = rootHandle;
    for (const seg of DJI_KNOWN_PATH_WITH_STORAGE) {
      cur = await cur.getDirectoryHandle(seg);
    }
    return cur;
  } catch { /* sigue */ }

  // Intento 2: sin "Internal Storage" (algunas variantes del RC)
  try {
    let cur = rootHandle;
    for (const seg of DJI_KNOWN_PATH) {
      cur = await cur.getDirectoryHandle(seg);
    }
    return cur;
  } catch { /* sigue */ }

  // Intento 3: búsqueda recursiva hasta 5 niveles
  return findDirRecursive(rootHandle, 'FlightRecord', 5);
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
  pending:   null,
  loading:   'hourglass_empty',
  ok:        'check_circle',
  duplicate: 'sync',
  error:     'error',
};

const STATUS_COLOR = {
  pending:   '',
  loading:   'text-orange-500 animate-spin',
  ok:        'text-green-500',
  duplicate: 'text-slate-400',
  error:     'text-red-500',
};

export default function DjiRcSync({ onImported }) {
  const [state, setState] = useState('idle'); // idle | scanning | ready | uploading | done
  const [files, setFiles] = useState([]);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);

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
        const fileObj = await fileInfo.handle.getFile();
        const fd = new FormData();
        fd.append('file', fileObj, fileInfo.name);

        const res  = await fetch('/api/logbook/import-dji', { method: 'POST', body: fd });
        const data = await res.json();

        if (res.ok) {
          imported++;
          setFiles(prev =>
            prev.map(f => f.name === fileInfo.name ? { ...f, status: 'ok', result: data } : f)
          );
        } else if (res.status === 409) {
          skipped++;
          setFiles(prev =>
            prev.map(f => f.name === fileInfo.name ? { ...f, status: 'duplicate', result: data } : f)
          );
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

      {/* ── Instrucciones ──────────────────────────────────────── */}
      {(state === 'idle' || state === 'scanning') && (
        <div className="bg-sky-50 border border-sky-100 rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-sky-500 shrink-0 mt-0.5">info</span>
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-widest text-sky-700">
                Pasos previos
              </p>
              <ol className="space-y-1.5 text-xs text-sky-800 font-medium list-decimal list-inside leading-relaxed">
                <li>Conecta el RC al PC con el cable USB-C</li>
                <li>En la pantalla del RC: selecciona <strong>"Transferencia de archivos"</strong></li>
                <li>Haz clic en el botón y <strong>selecciona la raíz del DJI RC</strong> (la unidad que aparece al conectarlo)</li>
              </ol>
              <p className="text-xs text-sky-600 font-medium mt-2">
                BitaFly navegará automáticamente a la carpeta <code className="bg-sky-100 px-1 rounded font-mono">FlightRecord</code>.
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
          <span className="material-symbols-outlined text-sm">usb</span>
          Seleccionar carpeta del RC
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
                      <p className="text-xs text-green-600 font-bold">
                        {f.result?.duracion ? `${Math.round(f.result.duracion / 60)} min` : 'Importado'}
                        {f.result?.altMax ? ` · ${f.result.altMax} m` : ''}
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
    </div>
  );
}
