'use client';
import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';

// ──────────────────────────────────────────────
// Genera y descarga la plantilla Excel
// ──────────────────────────────────────────────
function downloadTemplate() {
  const headers = [
    'FECHA',
    'SERIAL_AERONAVE',
    'TIPO_MISION',
    'HORA_DESPEGUE',
    'HORA_ATERRIZAJE',
    'CONDICION_VISUAL',
    'UBICACION',
    'NOTAS',
    'INCIDENTES',
  ];

  const examples = [
    ['2024-03-15', 'DJI-M30T-001', 'Inspección', '08:00', '08:45', 'VMC', 'Bogotá, Cundinamarca', 'Vuelo de prueba', 'NO'],
    ['2024-03-16', 'DJI-M30T-001', 'Mapeo',       '14:00', '15:30', 'VMC', 'Medellín, Antioquia',  '',               'NO'],
    ['2024-04-01', 'DJI-M300-002', 'Fumigación',  '06:30', '07:45', 'VMC', 'Cali, Valle',          'Sin novedad',    'NO'],
  ];

  const ws = XLSX.utils.aoa_to_sheet([headers, ...examples]);

  // Anchos de columna
  ws['!cols'] = [
    { wch: 14 }, { wch: 20 }, { wch: 18 }, { wch: 14 },
    { wch: 16 }, { wch: 18 }, { wch: 28 }, { wch: 30 }, { wch: 12 },
  ];

  // Hoja de instrucciones
  const instrHeaders = ['CAMPO', 'OBLIGATORIO', 'FORMATO / VALORES ACEPTADOS'];
  const instrRows = [
    ['FECHA',             'SÍ',  'YYYY-MM-DD  ej: 2024-03-15  (solo fechas PASADAS)'],
    ['SERIAL_AERONAVE',   'SÍ',  'Número de serie exacto del dron registrado en Mi Flota'],
    ['TIPO_MISION',       'NO',  'Inspección | Mapeo | Fumigación | Vigilancia | Otro'],
    ['HORA_DESPEGUE',     'NO',  'HH:MM  ej: 08:30'],
    ['HORA_ATERRIZAJE',   'NO',  'HH:MM  ej: 09:15'],
    ['CONDICION_VISUAL',  'NO',  'VMC | IMC | NIGHT'],
    ['UBICACION',         'NO',  'Ciudad o descripción del sitio de operación'],
    ['NOTAS',             'NO',  'Texto libre — observaciones del vuelo'],
    ['INCIDENTES',        'NO',  'SI | NO'],
  ];

  const wsInstr = XLSX.utils.aoa_to_sheet([instrHeaders, ...instrRows]);
  wsInstr['!cols'] = [{ wch: 22 }, { wch: 14 }, { wch: 55 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws,     'Bitácora Histórica');
  XLSX.utils.book_append_sheet(wb, wsInstr,'Instrucciones');

  XLSX.writeFile(wb, 'Plantilla_Bitacora_Historica_Bitafly.xlsx');
}

// ──────────────────────────────────────────────
// Panel principal
// ──────────────────────────────────────────────
export default function LogbookImportPanel({ onClose, onSuccess }) {
  const [step, setStep] = useState('upload'); // upload | preview | done
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null); // { valid, invalid }
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const inputRef = useRef();

  const handleFile = (f) => {
    if (!f) return;
    setFile(f);
    setError('');

    // Preview local antes de enviar
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb  = XLSX.read(e.target.result, { type: 'array' });
        const ws  = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        setPreview({ rows, total: rows.length });
        setStep('preview');
      } catch {
        setError('No se pudo leer el archivo. Asegúrate de usar la plantilla descargada.');
      }
    };
    reader.readAsArrayBuffer(f);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  };

  const handleImport = async () => {
    setLoading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch('/api/logbook/import', { method: 'POST', body: fd });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Error al importar');

      setResult(data);
      setStep('done');
      if (data.inserted > 0) onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tighter text-navy">
              Importar Bitácora Histórica
            </h2>
            <p className="text-xs text-slate-400 font-bold mt-0.5">
              Solo se aceptan fechas anteriores a hoy
            </p>
          </div>
          <button
            onClick={onClose}
            className="size-9 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all"
          >
            <span className="material-symbols-outlined text-slate-500">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">

          {/* ── PASO 1: Descarga plantilla ── */}
          <div className="flex items-center gap-4 bg-orange-50 border border-orange-100 rounded-2xl p-5">
            <span className="material-symbols-outlined text-3xl text-primary shrink-0">description</span>
            <div className="flex-1">
              <p className="text-xs font-black uppercase tracking-widest text-navy">Paso 1 — Descarga la plantilla</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Incluye los campos correctos y una hoja de instrucciones
              </p>
            </div>
            <button
              onClick={downloadTemplate}
              className="bg-primary text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 shrink-0"
            >
              Descargar
            </button>
          </div>

          {/* ── PASO 2: Subir archivo ── */}
          {step === 'upload' && (
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3">
                Paso 2 — Sube el archivo completado
              </p>
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => inputRef.current.click()}
                className="border-2 border-dashed border-slate-200 hover:border-primary rounded-2xl p-12 text-center cursor-pointer transition-all hover:bg-orange-50/30"
              >
                <span className="material-symbols-outlined text-4xl text-slate-300 block mb-3">upload_file</span>
                <p className="text-sm font-black text-slate-500">
                  Arrastra el archivo aquí o <span className="text-primary">haz clic para seleccionar</span>
                </p>
                <p className="text-xs text-slate-400 font-medium mt-1">.xlsx · .xls · .csv</p>
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => handleFile(e.target.files[0])}
                />
              </div>
              {error && (
                <p className="mt-3 text-xs text-red-500 font-bold bg-red-50 rounded-xl px-4 py-2">{error}</p>
              )}
            </div>
          )}

          {/* ── PASO 2: Preview ── */}
          {step === 'preview' && preview && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">
                  Paso 2 — Confirmar importación
                </p>
                <button
                  onClick={() => { setStep('upload'); setFile(null); setPreview(null); }}
                  className="text-xs text-slate-400 hover:text-primary font-bold transition-colors"
                >
                  ← Cambiar archivo
                </button>
              </div>

              {/* Resumen */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-navy">{preview.total}</p>
                  <p className="text-xs font-black uppercase text-slate-400 mt-1">Filas detectadas</p>
                </div>
                <div className="bg-green-50 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-green-600">{preview.total}</p>
                  <p className="text-xs font-black uppercase text-slate-400 mt-1">A procesar</p>
                </div>
                <div className="bg-orange-50 rounded-2xl p-4 text-center">
                  <p className="text-2xl font-black text-primary">{file?.name}</p>
                  <p className="text-xs font-black uppercase text-slate-400 mt-1 truncate">Archivo</p>
                </div>
              </div>

              {/* Primeras filas */}
              <div className="bg-slate-50 rounded-2xl overflow-hidden">
                <p className="text-xs font-black uppercase tracking-widest text-slate-400 px-4 py-2 border-b border-slate-200">
                  Vista previa (primeras 5 filas)
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="bg-slate-100">
                        {preview.rows[0] && Object.keys(preview.rows[0]).map(k => (
                          <th key={k} className="px-3 py-2 text-left font-black text-slate-500 whitespace-nowrap">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-t border-slate-200">
                          {Object.values(row).map((v, j) => (
                            <td key={j} className="px-3 py-2 text-slate-600 whitespace-nowrap">{String(v)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex gap-2">
                <span className="material-symbols-outlined text-amber-500 text-base shrink-0 mt-0.5">info</span>
                <p className="text-xs text-amber-700 font-medium">
                  Las filas con fechas de hoy o futuras serán <strong>rechazadas automáticamente</strong>.
                  Las filas con seriales no encontrados en tu flota también serán descartadas.
                </p>
              </div>

              {error && (
                <p className="text-xs text-red-500 font-bold bg-red-50 rounded-xl px-4 py-2">{error}</p>
              )}
            </div>
          )}

          {/* ── PASO 3: Resultado ── */}
          {step === 'done' && result && (
            <div className="space-y-4">
              <div className={`rounded-2xl p-6 text-center ${result.inserted > 0 ? 'bg-green-50' : 'bg-amber-50'}`}>
                <span className={`material-symbols-outlined text-5xl block mb-3 ${result.inserted > 0 ? 'text-green-500' : 'text-amber-500'}`}>
                  {result.inserted > 0 ? 'check_circle' : 'warning'}
                </span>
                <p className="text-2xl font-black text-navy">{result.inserted} vuelos importados</p>
                {result.skipped > 0 && (
                  <p className="text-sm text-slate-500 font-bold mt-1">{result.skipped} filas rechazadas</p>
                )}
              </div>

              {/* Detalle de rechazados */}
              {result.invalid?.length > 0 && (
                <div className="bg-red-50 border border-red-100 rounded-2xl overflow-hidden">
                  <p className="text-xs font-black uppercase tracking-widest text-red-400 px-4 py-2 border-b border-red-100">
                    Filas rechazadas
                  </p>
                  <div className="divide-y divide-red-100 max-h-48 overflow-y-auto">
                    {result.invalid.map((row, i) => (
                      <div key={i} className="px-4 py-2">
                        <p className="text-xs font-black text-red-600">Fila {row.fila}</p>
                        {row.errores.map((e, j) => (
                          <p key={j} className="text-xs text-red-500 font-medium">• {e}</p>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-slate-100 flex justify-end gap-3">
          {step === 'done' ? (
            <button
              onClick={onClose}
              className="bg-navy text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all"
            >
              Cerrar
            </button>
          ) : step === 'preview' ? (
            <>
              <button
                onClick={onClose}
                className="px-6 py-3 rounded-2xl border border-slate-200 text-xs font-black text-slate-500 hover:border-slate-400 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleImport}
                disabled={loading}
                className="bg-primary text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-60 flex items-center gap-2"
              >
                {loading ? (
                  <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Importando...</>
                ) : (
                  <><span className="material-symbols-outlined text-sm">cloud_upload</span>Confirmar importación</>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-6 py-3 rounded-2xl border border-slate-200 text-xs font-black text-slate-500 hover:border-slate-400 transition-all"
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
