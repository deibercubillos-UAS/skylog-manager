'use client';
import { useState, useRef, useEffect } from 'react';
import { docOpenUrl } from '@/lib/docUrl';

const DEFAULT_AIRCRAFT_IMG = 'https://images.unsplash.com/photo-1508614589041-895b88991e3e?q=80&w=400';

function resolveImg(raw) {
  if (!raw) return DEFAULT_AIRCRAFT_IMG;
  // URL externa (no Supabase ni R2): usar directo
  if (raw.startsWith('http') && !raw.includes('supabase.co') && !raw.includes('r2.dev') && !raw.includes('cdn.bitafly.com')) return raw;
  // Bucket público fleet-images vía Supabase (legacy)
  if (raw.includes('/object/public/fleet-images/')) return raw;
  // Bucket público fleet-images vía R2 (cdn.bitafly.com o r2.dev temporal)
  if (raw.includes('r2.dev') || raw.includes('cdn.bitafly.com')) return raw;
  // Path del bucket privado `documents` o URL legacy → signed URL vía endpoint
  return docOpenUrl(raw) || DEFAULT_AIRCRAFT_IMG;
}

export default function AircraftCard({ aircraft, onEdit, onBaja, onTransfer, canManage = true, canManageStatus }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Trazabilidad de componentes (modal autocontenido)
  const [showTrace, setShowTrace] = useState(false);
  const [trace, setTrace] = useState(null);          // null = sin cargar, [] = cargado vacío
  const [traceLoading, setTraceLoading] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const openTrace = async () => {
    setMenuOpen(false);
    setShowTrace(true);
    if (trace !== null) return;     // ya cargado
    setTraceLoading(true);
    try {
      const res = await fetch(`/api/maintenance/components?aircraft_id=${aircraft.id}`);
      const data = await res.json();
      setTrace(Array.isArray(data) ? data : []);
    } catch {
      setTrace([]);
    } finally {
      setTraceLoading(false);
    }
  };

  if (!aircraft) return null;

  // Intervalos configurables (con defaults). 0 = sin límite por ese criterio.
  const intervalHours = parseInt(aircraft.maintenance_interval_hours ?? 200, 10);
  const intervalDays  = parseInt(aircraft.maintenance_interval_days  ?? 180, 10);

  const hours = parseFloat(aircraft.total_hours || 0);
  const lastMaintHours = parseFloat(aircraft.last_maintenance_hours || 0);
  const diffHours = Math.max(0, hours - lastMaintHours);
  const hourProgress = intervalHours > 0 ? Math.min(100, (diffHours / intervalHours) * 100) : 0;

  const creationDate = aircraft.created_at ? new Date(aircraft.created_at) : new Date();
  const lastDate = aircraft.last_maintenance_date ? new Date(aircraft.last_maintenance_date) : creationDate;
  const daysSince = Math.ceil(Math.abs(new Date() - lastDate) / (1000 * 60 * 60 * 24));
  const timeProgress = intervalDays > 0 ? Math.min(100, (daysSince / intervalDays) * 100) : 0;

  // Vencido si supera horas O tiempo (cuando el criterio está activo)
  const hoursDue = intervalHours > 0 && diffHours >= intervalHours;
  const daysDue  = intervalDays  > 0 && daysSince >= intervalDays;
  const isDue = hoursDue || daysDue;

  const finalProgress = Math.max(hourProgress, timeProgress);
  let barColor = isDue ? "bg-red-600" : finalProgress >= 75 ? "bg-orange-500" : "bg-emerald-500";

  const isBaja = aircraft.status === 'Baja';
  const isTransferred = aircraft.status === 'Transferido';
  const inactive = isBaja || isTransferred;
  const inMaintenance = !inactive && aircraft.operational_status === 'en_mantenimiento';

  return (
    <>
    <div className={`bg-white rounded-[2rem] border shadow-sm flex flex-col sm:flex-row group hover:shadow-md transition-all text-left ${inactive ? 'border-slate-200 opacity-60' : 'border-slate-200'}`}>
      <div className="w-full sm:w-40 h-40 sm:h-auto bg-slate-100 shrink-0 relative overflow-hidden rounded-t-[2rem] sm:rounded-l-[2rem] sm:rounded-tr-none">
        <div className="w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${resolveImg(aircraft.image_url)})` }}></div>
        {inactive && (
          <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center">
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${isBaja ? 'bg-red-600 text-white' : 'bg-blue-600 text-white'}`}>
              {isBaja ? 'BAJA' : 'TRANSFERIDO'}
            </span>
          </div>
        )}
      </div>
      <div className="flex-1 p-5 md:p-6 flex flex-col justify-between min-w-0">
        <div className="flex justify-between items-start">
          <div className="truncate pr-2">
            <h3 className="font-black text-slate-900 text-base md:text-lg uppercase leading-tight truncate">{aircraft.model || 'UAS'}</h3>
            <p className="text-orange-600 text-xs font-black font-mono tracking-widest mt-1">RUAS: {aircraft.ruas || '---'}</p>
            {isBaja && aircraft.baja_reason && (
              <p className="text-red-500 text-[10px] font-bold mt-1 truncate">Baja: {aircraft.baja_reason}</p>
            )}
            {inMaintenance && (
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2 py-0.5 mt-1">
                <span className="material-symbols-outlined text-xs">build</span>
                EN MANTENIMIENTO
              </span>
            )}
          </div>
          <div className="flex gap-2 shrink-0 relative" ref={menuRef}>
            {/* Botón Editar — solo si puede gestionar la flota y no está en baja/transferido */}
            {canManage && !inactive && (
              <button onClick={() => onEdit(aircraft)}
                className="size-11 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-orange-600 transition-colors active:scale-95">
                <span className="material-symbols-outlined text-lg">edit_square</span>
              </button>
            )}

            {/* Menú de opciones adicionales */}
            {canManage && !inactive && (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(v => !v)}
                  className="size-11 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors active:scale-95"
                >
                  <span className="material-symbols-outlined text-lg">more_vert</span>
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-1 z-50 bg-white rounded-2xl shadow-2xl border border-slate-100 py-1 min-w-[200px]">
                    <button
                      onClick={() => { setMenuOpen(false); onEdit(aircraft); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-base text-slate-400">edit_square</span>
                      Editar aeronave
                    </button>

                    <button
                      onClick={openTrace}
                      className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-base text-slate-400">memory</span>
                      Trazabilidad de componentes
                    </button>

                    {canManageStatus && (
                      <>
                        <div className="h-px bg-slate-100 mx-3 my-1" />
                        <button
                          onClick={() => { setMenuOpen(false); onBaja(aircraft); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <span className="material-symbols-outlined text-base">archive</span>
                          Dar de baja
                        </button>
                        <button
                          onClick={() => { setMenuOpen(false); onTransfer(aircraft); }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-xs font-bold text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <span className="material-symbols-outlined text-base">swap_horiz</span>
                          Transferir a otra organización
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="space-y-3 mt-4">
          <div className="flex justify-between items-end">
            <p className="text-xs font-bold text-slate-700">{hours.toFixed(2)}h <span className="text-xs text-slate-400 uppercase">T.T</span></p>
            <p className="text-xs font-black text-slate-400 uppercase">Salud Técnica</p>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full ${inactive ? 'bg-slate-300' : barColor} transition-all duration-1000`} style={{ width: `${finalProgress}%` }}></div>
          </div>
          {!inactive && (
            <p className="text-[10px] font-bold text-slate-400">
              {isDue ? (
                <span className="text-red-600">Mantenimiento vencido</span>
              ) : intervalHours > 0 ? (
                <>Próximo mant.: <span className="text-slate-600">{Math.max(0, intervalHours - diffHours).toFixed(0)}h restantes</span>
                {intervalDays > 0 && <span className="text-slate-400"> · {Math.max(0, intervalDays - daysSince)}d</span>}</>
              ) : intervalDays > 0 ? (
                <>Próximo mant.: <span className="text-slate-600">{Math.max(0, intervalDays - daysSince)}d restantes</span></>
              ) : null}
            </p>
          )}
        </div>
      </div>
    </div>

    {/* Modal de trazabilidad de componentes */}
    {showTrace && (
      <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={() => setShowTrace(false)}>
        <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg animate-in slide-in-from-bottom duration-300 max-h-[85vh] flex flex-col"
          onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
            <div>
              <h3 className="text-base font-black uppercase tracking-tight text-slate-900">Trazabilidad de Componentes</h3>
              <p className="text-xs font-bold text-slate-400 mt-0.5">{aircraft.model} · {aircraft.serial_number}</p>
            </div>
            <button onClick={() => setShowTrace(false)}
              className="size-9 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all active:scale-95">
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            {traceLoading ? (
              <p className="py-10 text-center text-xs font-black text-slate-300 uppercase tracking-widest animate-pulse">Cargando histórico...</p>
            ) : !trace || trace.length === 0 ? (
              <p className="py-10 text-center text-xs font-black text-slate-300 uppercase tracking-widest">Sin cambios de componentes registrados</p>
            ) : (
              <div className="space-y-3">
                {trace.map(c => (
                  <div key={c.id} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-black text-slate-800 uppercase">{c.component_type}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase shrink-0 ${
                        c.action === 'reemplazado' ? 'bg-amber-100 text-amber-700'
                        : c.action === 'instalado' ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-200 text-slate-600'
                      }`}>{c.action}</span>
                    </div>
                    <p className="text-[11px] font-bold text-slate-400 mt-1">{new Date(c.created_at).toLocaleDateString()}</p>
                    {(c.part_old || c.part_new) && (
                      <p className="text-[11px] font-mono text-slate-500 mt-1.5">
                        {c.part_old && <>Sale: <span className="text-slate-700">{c.part_old}</span></>}
                        {c.part_old && c.part_new && ' → '}
                        {c.part_new && <>Entra: <span className="text-slate-700">{c.part_new}</span></>}
                      </p>
                    )}
                    {c.notes && <p className="text-xs text-slate-400 italic mt-1">{c.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}
