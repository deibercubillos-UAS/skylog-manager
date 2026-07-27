'use client';
import { useState, useRef, useEffect, memo } from 'react';
import { docOpenUrl } from '@/lib/docUrl';
import IconTile from '@/components/IconTile';

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

// Chip de batería coloreado por salud real (health_status) — no hay dato de "carga %"
// en el esquema, así que se usa el mismo umbral que el resto de la app (BatteryCard).
function battChipStyle(health) {
  if (health >= 85) return { color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0' };
  if (health >= 65) return { color: '#b45309', bg: '#fffbeb', border: '#fde68a' };
  return { color: '#8992a3', bg: '#f2efeb', border: '#e2ddd5' };
}

// Fallback estable — evita crear un array nuevo en cada render cuando el llamador
// pasa `batteryChips={mapa[id] || []}` sin memoizar el mapa; con `React.memo` abajo,
// un array `[]` recién creado en cada render del padre invalidaría el memo igual.
const EMPTY_BATTERY_CHIPS = [];

function AircraftCard({ aircraft, onEdit, onBaja, onTransfer, canManage = true, canManageStatus, batteryChips = EMPTY_BATTERY_CHIPS }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Trazabilidad de componentes (modal autocontenido)
  const [showTrace, setShowTrace] = useState(false);
  const [trace, setTrace] = useState(null);          // null = sin cargar; { active, history }
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
      setTrace({ active: data?.active || [], history: data?.history || [] });
    } catch {
      setTrace({ active: [], history: [] });
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
    <div className={`bg-white rounded-2xl border overflow-hidden flex flex-col group hover:shadow-md hover:border-orange-200 transition-all text-left ${inactive ? 'border-slate-200 opacity-60' : 'border-slate-200'}`}>
      {/* Foto/ícono + badges superpuestos */}
      <div className="relative h-24 shrink-0 bg-orange-50/60 flex items-center justify-center">
        <IconTile icon="flight" size={52} />
        {aircraft.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={resolveImg(aircraft.image_url)}
            alt=""
            className="absolute bottom-2 right-2 size-7 rounded-full border-2 border-white object-cover shadow-sm"
          />
        )}

        {/* Estado — arriba a la derecha */}
        <div className="absolute top-2 right-2">
          {inactive ? (
            <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[8.5px] font-black uppercase tracking-wide text-white ${isBaja ? 'bg-red-600' : 'bg-blue-600'}`}>
              {isBaja ? 'Baja' : 'Transferido'}
            </span>
          ) : inMaintenance ? (
            <span className="flex items-center gap-1 bg-amber-50/95 border border-amber-200 rounded-full px-2 py-0.5">
              <span className="size-1.5 rounded-full bg-amber-600" />
              <span className="text-[8.5px] font-black uppercase tracking-wide text-amber-700">Mantenim.</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 bg-emerald-50/95 border border-emerald-200 rounded-full px-2 py-0.5">
              <span className="size-1.5 rounded-full bg-emerald-600" />
              <span className="text-[8.5px] font-black uppercase tracking-wide text-emerald-700">Operativo</span>
            </span>
          )}
        </div>

        {/* Menú de acciones — arriba a la izquierda */}
        {canManage && !inactive && (
          <div className="absolute top-2 left-2 z-10" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(v => !v)}
              className="size-7 rounded-lg bg-white/90 shadow-sm flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors active:scale-95"
            >
              <span className="material-symbols-outlined text-base">more_vert</span>
            </button>

            {menuOpen && (
              <div className="absolute left-0 top-full mt-1 z-50 bg-white rounded-2xl shadow-2xl border border-slate-100 py-1 min-w-[200px]">
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

      {/* Cuerpo */}
      <div className="p-3.5 flex flex-col gap-2.5 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-black text-slate-900 text-xs uppercase leading-tight truncate">{aircraft.model || 'UAS'}</h3>
            <p className="text-slate-400 text-[10px] font-mono mt-0.5 truncate">{aircraft.serial_number || aircraft.ruas || '---'}</p>
          </div>
          {canManage && !inactive && (
            <button onClick={() => onEdit(aircraft)}
              className="size-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 hover:text-orange-600 transition-colors active:scale-95 shrink-0">
              <span className="material-symbols-outlined text-sm">edit_square</span>
            </button>
          )}
        </div>

        {isBaja && aircraft.baja_reason && (
          <p className="text-red-500 text-[10px] font-bold truncate">Baja: {aircraft.baja_reason}</p>
        )}

        {/* Baterías asociadas — derivadas del último battery_log por aeronave (reales) */}
        {batteryChips.length > 0 && (
          <div className="flex items-start gap-1.5">
            <span className="material-symbols-outlined text-sm text-slate-400 mt-0.5 shrink-0">battery_charging_full</span>
            <div className="flex flex-wrap gap-1">
              {batteryChips.map(b => {
                const st = battChipStyle(Number(b.health_status ?? 100));
                return (
                  <span key={b.id} title={`${b.serial_number} · ${b.cycles ?? 0} ciclos · salud ${b.health_status ?? 100}%`}
                    className="inline-flex items-center text-[9.5px] font-black font-mono rounded px-1.5 py-0.5"
                    style={{ color: st.color, background: st.bg, border: `1px solid ${st.border}` }}>
                    {b.serial_number}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-auto pt-2 border-t border-slate-100 space-y-2">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[8px] font-black uppercase tracking-wide text-slate-400">Horas</p>
              <p className="text-sm font-black text-orange-600">{hours.toFixed(1)}h</p>
            </div>
            <div className="text-right">
              <p className="text-[8px] font-black uppercase tracking-wide text-slate-400">Últ. mant.</p>
              <p className="text-[10px] font-bold text-slate-600">{aircraft.last_maintenance_date ? new Date(aircraft.last_maintenance_date).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</p>
            </div>
          </div>
          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full ${inactive ? 'bg-slate-300' : barColor} transition-all duration-1000`} style={{ width: `${finalProgress}%` }}></div>
          </div>
          {!inactive && isDue && (
            <p className="text-[9.5px] font-bold text-red-600">Mantenimiento vencido</p>
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
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
            {traceLoading ? (
              <p className="py-10 text-center text-xs font-black text-slate-300 uppercase tracking-widest animate-pulse">Cargando...</p>
            ) : (
              <>
                {/* Componentes activos con vida útil */}
                <div className="space-y-2">
                  <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Componentes activos</p>
                  {(!trace?.active || trace.active.length === 0) ? (
                    <p className="text-xs font-bold text-slate-300 italic">Sin componentes activos</p>
                  ) : trace.active.map(c => {
                    const days = Math.max(0, Math.floor((Date.now() - new Date(c.installed_at).getTime()) / 86400000));
                    return (
                      <div key={c.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-800 uppercase truncate">
                            {c.name || c.component_type}
                            {c.serial && <span className="font-mono font-normal text-slate-400 ml-1 text-xs">· {c.serial}</span>}
                          </p>
                          <p className="text-[11px] font-bold text-slate-400">Desde {new Date(c.installed_at).toLocaleDateString()}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-black text-orange-600">{Number(c.used_hours).toFixed(1)}h</p>
                          <p className="text-[11px] font-bold text-slate-400">{days}d de uso</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Historial de cambios */}
                {trace?.history?.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-black uppercase text-slate-400 tracking-widest">Historial de cambios</p>
                    {trace.history.map(c => (
                      <div key={c.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-black text-slate-800 uppercase">{c.component_type}</span>
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
              </>
            )}
          </div>
        </div>
      </div>
    )}
    </>
  );
}

export default memo(AircraftCard);
