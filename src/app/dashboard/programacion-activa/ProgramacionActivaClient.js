'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { toast } from '@/lib/toast';
import { getZoneSummary, downloadFlightKMZ, generateFlightPlanPdf } from '@/lib/flightPlanDocs';
import KPIStrip from '@/components/KPIStrip';

export default function ProgramacionActivaClient({
  pilotEmail = null,   // si se pasa, solo muestra misiones de ese piloto (vista del piloto)
  pilotId = null,      // filtro preferido por pilot_id (más fiable que el email)
  readOnly = false,    // oculta el botón "Nueva misión"
  title = 'Programación Activa',
  embedded = false,       // true cuando se incrusta bajo el PageHero de Programación (oculta encabezado propio)
  onCreateMission = null, // si se pasa, "Nueva misión" abre este callback en vez de navegar a /dashboard/authorizations
} = {}) {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [busy, setBusy]         = useState(null); // `${id}:kmz` | `${id}:pdf`
  const [view, setView]         = useState('semana'); // 'lista' | 'semana'
  const [weekOffset, setWeekOffset] = useState(0);   // 0 = semana actual

  // N° de autorización AeroCivil (circular 2026351070026944) — edición inline en la
  // lista, lo captura el Gerente SMS/Jefe de Pilotos una vez llega la aprobación.
  const [editingAuthNum, setEditingAuthNum] = useState(null); // mission id
  const [authNumDraft, setAuthNumDraft]     = useState('');
  const [savingAuthNum, setSavingAuthNum]   = useState(null);

  const DAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const iso = (d) => d.toISOString().slice(0, 10);

  // Lunes de una semana dada (offset en semanas respecto a la actual).
  const mondayOf = (offset) => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const day = (d.getDay() + 6) % 7; // 0 = lunes
    d.setDate(d.getDate() - day + offset * 7);
    return d;
  };
  const daysFrom = (start) => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });

  // Semana visible en el calendario (según navegación weekOffset)
  const weekStart = mondayOf(weekOffset);
  const weekDays = daysFrom(weekStart);
  const missionsOn = (d) => missions.filter(m => (m.scheduled_at ? String(m.scheduled_at).slice(0, 10) : '') === iso(d));

  // Semana real "de hoy" — fija, independiente de la navegación, para la franja de KPIs
  const thisWeekDays = useMemo(() => daysFrom(mondayOf(0)), [missions]); // eslint-disable-line react-hooks/exhaustive-deps

  // Conflictos de agenda del PIC: mismo piloto + mismo día calendario (misma convención
  // que /api/flights/conflicts — scheduled_at solo guarda la fecha, no la hora).
  const conflictKeys = useMemo(() => {
    const counts = {};
    missions.forEach(m => {
      if (!m.pilot_id || !m.scheduled_at) return;
      const key = `${m.pilot_id}_${String(m.scheduled_at).slice(0, 10)}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    return new Set(Object.keys(counts).filter(k => counts[k] > 1));
  }, [missions]);
  const isConflict = (m) => m.pilot_id && m.scheduled_at && conflictKeys.has(`${m.pilot_id}_${String(m.scheduled_at).slice(0, 10)}`);

  // Franja de KPIs — datos reales de la semana actual (no fabricados)
  const weekMissions = thisWeekDays.flatMap(missionsOn);
  const distinctPilots = new Set(weekMissions.filter(m => m.pilot_id).map(m => m.pilot_id)).size;
  const distinctAircraft = new Set(weekMissions.filter(m => m.aircraft_id).map(m => m.aircraft_id)).size;
  const conflictCount = weekMissions.filter(isConflict).length;
  const stats = [
    { key: 'missions', icon: 'event_available', iconColor: '#ec5b13', label: 'Misiones esta semana', value: weekMissions.length },
    { key: 'aircraft', icon: 'precision_manufacturing', iconColor: '#94a3b8', label: 'Aeronaves asignadas', value: distinctAircraft },
    { key: 'pilots', icon: 'group', iconColor: '#94a3b8', label: 'Pilotos asignados', value: distinctPilots },
    { key: 'conflicts', icon: 'warning', iconColor: conflictCount > 0 ? '#dc2626' : '#94a3b8', label: 'Conflictos de horario', value: conflictCount },
  ];

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/flights/authorize');
      const data = await res.json();
      let rows = Array.isArray(data) ? data : [];
      // Vista del piloto: filtra por pilot_id (preferido) o por email como respaldo.
      if (pilotId || pilotEmail) {
        const me = String(pilotEmail || '').toLowerCase();
        rows = rows.filter(m =>
          (pilotId && m.pilot_id === pilotId) ||
          (me && String(m.pilots?.email || '').toLowerCase() === me)
        );
      }
      setMissions(rows);
    } catch (e) {
      console.error('Error cargando programación', e);
    } finally {
      setLoading(false);
    }
  }, [pilotEmail, pilotId]);

  useEffect(() => { loadData(); }, [loadData]);

  const statusBadge = (status) => {
    const map = {
      autorizado: 'bg-orange-50 text-orange-600 border-orange-200',
      realizado:  'bg-emerald-50 text-emerald-600 border-emerald-200',
      cancelado:  'bg-red-50 text-red-600 border-red-200',
    };
    const label = (status || 'autorizado').toUpperCase();
    const cls = map[status] || 'bg-slate-50 text-slate-500 border-slate-200';
    return <span className={`px-2.5 py-1 rounded-full text-xs font-black uppercase border ${cls}`}>{label}</span>;
  };

  // Construye los datos del plan a partir de la misión guardada
  const planFromMission = (m) => {
    const pd = m.plan_data || {};
    const zone = (pd.points && pd.points.length)
      ? { points: pd.points, radius: pd.radius ?? null }
      : null;
    const geoType = pd.geo_type || 'polygon';
    const flightDate = m.scheduled_at ? String(m.scheduled_at).slice(0, 10) : '';
    return {
      opName:      pd.op_name || m.mission_type || m.mission_id,
      flightDate,
      takeoffTime: pd.takeoff_time || '',
      altitude:    pd.altitude ?? 120,
      notes:       pd.notes || null,
      geoType, zone,
      summary:     zone ? getZoneSummary(geoType, zone.points, zone.radius) : null,
      pilotInfo: {
        name:  m.pilots?.name || '',
        email: m.pilots?.email || '',
      },
    };
  };

  const handleKMZ = async (m) => {
    setBusy(`${m.id}:kmz`);
    try { await downloadFlightKMZ(planFromMission(m)); }
    catch (e) { toast.error('No se pudo generar el KMZ: ' + e.message); }
    finally { setBusy(null); }
  };
  const handlePDF = async (m) => {
    setBusy(`${m.id}:pdf`);
    try { await generateFlightPlanPdf(planFromMission(m)); }
    catch (e) { toast.error('No se pudo generar el PDF: ' + e.message); }
    finally { setBusy(null); }
  };

  const startEditAuthNum = (m) => {
    setEditingAuthNum(m.id);
    setAuthNumDraft(m.aerocivil_auth_number || '');
  };

  const saveAuthNum = async (missionId) => {
    setSavingAuthNum(missionId);
    try {
      const res = await fetch('/api/flights/authorize', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: missionId, aerocivil_auth_number: authNumDraft.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Error al guardar');
      setMissions(prev => prev.map(m => m.id === missionId ? { ...m, aerocivil_auth_number: data.aerocivil_auth_number } : m));
      setEditingAuthNum(null);
    } catch (e) {
      toast.error('No se pudo guardar: ' + e.message);
    } finally {
      setSavingAuthNum(null);
    }
  };

  // Botón/link "Nueva misión" — navega a /dashboard/authorizations salvo que el padre
  // (Programación embebida) prefiera abrir su propio panel de creación.
  const NewMissionCTA = ({ className }) => onCreateMission ? (
    <button onClick={onCreateMission} className={className}>
      <span className="material-symbols-outlined text-base">add</span> Nueva misión
    </button>
  ) : (
    <Link href="/dashboard/authorizations" className={className}>
      <span className="material-symbols-outlined text-base">add</span> Nueva misión
    </Link>
  );

  return (
    <div className={embedded ? 'space-y-5' : 'max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 text-left pb-20'}>
      {/* HEADER — oculto cuando se incrusta bajo el PageHero de Programación */}
      {!embedded && (
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 border-b border-slate-200 pb-5">
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-navy uppercase tracking-tighter">{title}</h2>
            <p className="text-slate-400 text-xs font-black uppercase mt-1">
              {missions.length} {pilotEmail ? 'misiones asignadas a ti' : 'misiones registradas'}
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <button onClick={loadData} className="px-4 py-2.5 text-xs font-black uppercase text-slate-500 hover:text-orange-600 transition-colors flex items-center gap-1.5">
              <span className="material-symbols-outlined text-base">sync</span> Refrescar
            </button>
            {!readOnly && (
              <NewMissionCTA className="px-5 py-2.5 bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-orange-700 transition-all flex items-center gap-1.5" />
            )}
          </div>
        </header>
      )}

      {/* Franja de KPIs — datos reales de la semana en curso */}
      {!loading && (
        <section aria-label="Indicadores de programación" className="bg-white rounded-[1.5rem] border border-slate-100 px-2 py-3 md:px-4">
          <KPIStrip variant="strip" items={stats} />
        </section>
      )}

      {loading ? (
        <div className="p-16 text-center text-slate-400 font-black text-xs uppercase tracking-widest animate-pulse">
          Cargando programación...
        </div>
      ) : missions.length === 0 ? (
        <div className="bg-white rounded-[2rem] border border-slate-200 p-16 text-center">
          <span className="material-symbols-outlined text-5xl text-slate-200">event_available</span>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-4">
            {pilotEmail ? 'No tienes vuelos programados' : 'Sin misiones programadas'}
          </p>
          {!readOnly && (
            <NewMissionCTA className="inline-flex items-center gap-1.5 mt-5 px-6 py-3 bg-navy text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all" />
          )}
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          {/* Toolbar: navegación de semana (si aplica) + selector Semana/Lista */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-wrap gap-3">
            <div className="flex items-center gap-2.5 min-h-[28px]">
              {view === 'semana' ? (
                <>
                  <button onClick={() => setWeekOffset(o => o - 1)} className="size-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all">
                    <span className="material-symbols-outlined text-base">chevron_left</span>
                  </button>
                  <span className="text-xs font-black text-slate-800 whitespace-nowrap">
                    Semana del {weekStart.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })} — {weekDays[6].toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}
                  </span>
                  <button onClick={() => setWeekOffset(o => o + 1)} className="size-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-all">
                    <span className="material-symbols-outlined text-base">chevron_right</span>
                  </button>
                  {weekOffset !== 0 && (
                    <button onClick={() => setWeekOffset(0)} className="text-[10.5px] font-black text-orange-500 uppercase ml-1">Hoy</button>
                  )}
                </>
              ) : (
                <span className="text-xs font-black uppercase tracking-widest text-slate-700">
                  {missions.length} {pilotEmail ? 'misiones asignadas a ti' : 'misiones registradas'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                {['semana', 'lista'].map(v => (
                  <button key={v} onClick={() => setView(v)}
                    className={`px-3.5 py-1.5 rounded-lg text-[10.5px] font-black uppercase transition-all ${view === v ? 'bg-navy text-white shadow-sm' : 'text-slate-500'}`}>
                    {v === 'lista' ? 'Lista' : 'Semana'}
                  </button>
                ))}
              </div>
              <button onClick={loadData} title="Refrescar" className="size-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-orange-600 transition-colors">
                <span className="material-symbols-outlined text-base">sync</span>
              </button>
            </div>
          </div>

          {view === 'semana' ? (
            <>
              {/* Encabezados de día */}
              <div className="hidden sm:grid grid-cols-7 border-b border-slate-100">
                {weekDays.map((d, i) => {
                  const isToday = iso(d) === iso(new Date());
                  return (
                    <div key={i} className={`text-center py-3 ${isToday ? 'bg-orange-50' : ''}`}>
                      <p className={`text-[9px] font-black uppercase tracking-widest ${isToday ? 'text-orange-600' : 'text-slate-400'}`}>{DAY_LABELS[i]}</p>
                      <p className={`text-base font-black mt-0.5 ${isToday ? 'text-orange-600' : 'text-navy'}`}>{d.getDate()}</p>
                    </div>
                  );
                })}
              </div>
              {/* Grilla 7 días */}
              <div className="grid grid-cols-1 sm:grid-cols-7 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                {weekDays.map((d, i) => {
                  const dayMissions = missionsOn(d);
                  const isToday = iso(d) === iso(new Date());
                  return (
                    <div key={i} className={`min-h-[140px] p-2 space-y-1.5 ${isToday ? 'bg-orange-50/30' : ''}`}>
                      <p className="sm:hidden text-[10px] font-black uppercase tracking-widest text-slate-400">{DAY_LABELS[i]} {d.getDate()}</p>
                      {dayMissions.map(m => {
                        const conflict = isConflict(m);
                        return (
                          <div key={m.id} className={`rounded-lg px-2.5 py-1.5 ${conflict ? 'bg-red-50 border-l-2 border-red-600' : 'bg-orange-50/60 border-l-2 border-orange-500'}`}>
                            {conflict && (
                              <div className="flex items-center gap-1 text-[9px] font-black text-red-600 uppercase">
                                <span className="material-symbols-outlined text-xs">warning</span> Conflicto
                              </div>
                            )}
                            <p className={`text-[10px] font-black ${conflict ? 'text-red-600' : 'text-orange-600'}`}>{m.plan_data?.takeoff_time || m.mission_id}</p>
                            <p className="text-[11px] font-bold text-slate-700 truncate mt-0.5">{m.mission_type || m.mission_id}</p>
                            <p className="text-[10px] text-slate-400 truncate">{m.pilots?.name || '---'}</p>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <>
          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-slate-100">
            {missions.map(m => {
              const hasZone = (m.plan_data?.points?.length || 0) > 0;
              return (
                <div key={m.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-black font-mono text-orange-600">{m.mission_id}</p>
                      <p className="text-sm font-bold text-slate-800 mt-0.5 truncate">{m.pilots?.name || '---'}</p>
                      <p className="text-xs text-slate-400 uppercase font-bold truncate">{m.aircraft?.model || '---'}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{m.scheduled_at ? String(m.scheduled_at).slice(0,10) : ''} · {m.location}</p>
                    </div>
                    {statusBadge(m.status)}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleKMZ(m)} disabled={busy === `${m.id}:kmz`}
                      className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-1.5 disabled:opacity-50">
                      <span className="material-symbols-outlined text-sm">{busy === `${m.id}:kmz` ? 'progress_activity' : 'download'}</span> KMZ
                    </button>
                    <button onClick={() => handlePDF(m)} disabled={busy === `${m.id}:pdf`}
                      className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-1.5 disabled:opacity-50">
                      <span className="material-symbols-outlined text-sm">{busy === `${m.id}:pdf` ? 'progress_activity' : 'picture_as_pdf'}</span> PDF
                    </button>
                  </div>
                  {!hasZone && <p className="text-xs text-slate-400">Sin zona definida — el KMZ saldrá sin geometría.</p>}
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left min-w-[900px]">
              <thead>
                <tr className="bg-slate-50 text-xs font-black uppercase text-slate-400 tracking-widest border-b">
                  <th className="px-5 py-4">N° Misión</th>
                  <th className="px-5 py-4">Fecha</th>
                  <th className="px-5 py-4">Piloto (PIC)</th>
                  <th className="px-5 py-4">Aeronave</th>
                  <th className="px-5 py-4">Ubicación</th>
                  <th className="px-5 py-4">Estado</th>
                  {!readOnly && <th className="px-5 py-4">N° Autorización AeroCivil</th>}
                  <th className="px-5 py-4 text-right">Descargas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {missions.map(m => (
                  <tr key={m.id} className="hover:bg-orange-50/30 transition-all text-xs">
                    <td className="px-5 py-4 font-black font-mono text-orange-600">{m.mission_id}</td>
                    <td className="px-5 py-4 text-slate-700 whitespace-nowrap">{m.scheduled_at ? String(m.scheduled_at).slice(0,10) : ''}</td>
                    <td className="px-5 py-4 font-bold text-slate-900">{m.pilots?.name || '---'}</td>
                    <td className="px-5 py-4 text-xs text-slate-500">
                      {m.aircraft?.model || '---'}
                      {m.aircraft?.serial_number && <span className="block font-mono text-xs text-slate-400">S/N {m.aircraft.serial_number}</span>}
                    </td>
                    <td className="px-5 py-4 text-xs text-slate-500 max-w-[200px] truncate">{m.location}</td>
                    <td className="px-5 py-4">{statusBadge(m.status)}</td>
                    {!readOnly && (
                      <td className="px-5 py-4">
                        {editingAuthNum === m.id ? (
                          <div className="flex items-center gap-1.5">
                            <input autoFocus value={authNumDraft} onChange={e => setAuthNumDraft(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') saveAuthNum(m.id); if (e.key === 'Escape') setEditingAuthNum(null); }}
                              placeholder="Ej: 2507545"
                              className="w-32 px-2 py-1.5 rounded-lg border border-orange-300 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-orange-400" />
                            <button onClick={() => saveAuthNum(m.id)} disabled={savingAuthNum === m.id}
                              className="text-emerald-600 hover:text-emerald-700 disabled:opacity-50">
                              <span className={`material-symbols-outlined text-base ${savingAuthNum === m.id ? 'animate-spin' : ''}`}>{savingAuthNum === m.id ? 'progress_activity' : 'check'}</span>
                            </button>
                            <button onClick={() => setEditingAuthNum(null)} className="text-slate-400 hover:text-red-500">
                              <span className="material-symbols-outlined text-base">close</span>
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => startEditAuthNum(m)}
                            className="flex items-center gap-1.5 group rounded-lg px-2 py-1 -mx-2 -my-1 hover:bg-orange-50 transition-all">
                            <span className="material-symbols-outlined text-sm text-slate-300 group-hover:text-orange-400 transition-colors">edit</span>
                            <span className={m.aerocivil_auth_number ? 'text-slate-700 font-mono font-bold' : 'text-slate-300 italic'}>
                              {m.aerocivil_auth_number || 'Sin registrar'}
                            </span>
                          </button>
                        )}
                      </td>
                    )}
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleKMZ(m)} disabled={busy === `${m.id}:kmz`} title="Descargar KMZ"
                          className="size-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-900 hover:text-white transition-all disabled:opacity-50">
                          <span className={`material-symbols-outlined text-base ${busy === `${m.id}:kmz` ? 'animate-spin' : ''}`}>{busy === `${m.id}:kmz` ? 'progress_activity' : 'download'}</span>
                        </button>
                        <button onClick={() => handlePDF(m)} disabled={busy === `${m.id}:pdf`} title="Descargar PDF"
                          className="size-9 flex items-center justify-center rounded-xl bg-slate-100 text-orange-600 hover:bg-orange-600 hover:text-white transition-all disabled:opacity-50">
                          <span className={`material-symbols-outlined text-base ${busy === `${m.id}:pdf` ? 'animate-spin' : ''}`}>{busy === `${m.id}:pdf` ? 'progress_activity' : 'picture_as_pdf'}</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
