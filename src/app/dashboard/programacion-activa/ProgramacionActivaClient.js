'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { toast } from '@/lib/toast';
import { getZoneSummary, downloadFlightKMZ, generateFlightPlanPdf } from '@/lib/flightPlanDocs';

export default function ProgramacionActivaClient() {
  const [missions, setMissions] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [busy, setBusy]         = useState(null); // `${id}:kmz` | `${id}:pdf`

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/flights/authorize');
      const data = await res.json();
      setMissions(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error cargando programación', e);
    } finally {
      setLoading(false);
    }
  }, []);

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

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-in fade-in duration-500 text-left pb-20">
      {/* HEADER */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3 border-b border-slate-200 pb-5">
        <div>
          <h2 className="text-2xl md:text-3xl font-black text-navy uppercase tracking-tighter">Programación Activa</h2>
          <p className="text-slate-400 text-xs font-black uppercase mt-1">{missions.length} misiones registradas</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadData} className="px-4 py-2.5 text-xs font-black uppercase text-slate-500 hover:text-orange-600 transition-colors flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">sync</span> Refrescar
          </button>
          <Link href="/dashboard/authorizations" className="px-5 py-2.5 bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-orange-700 transition-all flex items-center gap-1.5">
            <span className="material-symbols-outlined text-base">add</span> Nueva misión
          </Link>
        </div>
      </header>

      {loading ? (
        <div className="p-16 text-center text-slate-400 font-black text-xs uppercase tracking-widest animate-pulse">
          Cargando programación...
        </div>
      ) : missions.length === 0 ? (
        <div className="bg-white rounded-[2rem] border border-slate-200 p-16 text-center">
          <span className="material-symbols-outlined text-5xl text-slate-200">event_available</span>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-4">Sin misiones programadas</p>
          <Link href="/dashboard/authorizations" className="inline-block mt-5 px-6 py-3 bg-navy text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all">
            Programar una misión
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
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
        </div>
      )}
    </div>
  );
}
