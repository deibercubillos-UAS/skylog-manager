'use client';

import { useState } from 'react';
import { useDemo } from '@/lib/demoStore';
import { fmtDate } from '@/lib/format';
import Icon from '@/components/Icon';
import ScheduleMissionModal from '@/components/enterprise/ScheduleMissionModal';

const MST = {
  programada: { label: 'Programada', cls: 'bg-sky-100 text-sky-700' },
  en_curso:   { label: 'En curso',   cls: 'bg-amber-100 text-amber-700' },
  completada: { label: 'Completada', cls: 'bg-emerald-100 text-emerald-700' },
};

export default function MissionsPanel() {
  const { missions, pilots, flightsOfMission, reassignMission, loadFlight, pilotById } = useDemo();
  const [toast, setToast] = useState('');
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const activePilots = pilots.filter((p) => p.status === 'activo');

  const simulate = (missionId) => {
    const r = loadFlight(missionId);
    if (r.ok) setToast('✓ Vuelo cargado — se descontó 1 crédito');
    else if (r.reason === 'no_credits') setToast('⛔ Sin créditos — recarga para cargar vuelos');
    else setToast('✗ No se pudo cargar');
    setTimeout(() => setToast(''), 3000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon name="assignment" className="text-lg" style={{ color: 'var(--brand-accent)' }} />
        <h2 className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--brand-navy)' }}>
          Misiones programadas
        </h2>
        <button
          onClick={() => setScheduleOpen(true)}
          className="ml-auto flex items-center gap-1.5 text-white rounded-lg px-3 py-1.5 text-xs font-black uppercase tracking-wider"
          style={{ backgroundColor: 'var(--brand-accent)' }}
        >
          <Icon name="add" className="text-sm" /> Programar
        </button>
      </div>

      {toast && (
        <p className={`text-xs font-bold mb-3 ${toast.startsWith('✓') ? 'text-emerald-600' : toast.startsWith('⛔') ? 'text-red-600' : 'text-slate-500'}`}>
          {toast}
        </p>
      )}

      <div className="space-y-3">
        {missions.map((m) => {
          const st = MST[m.status] || MST.programada;
          const count = flightsOfMission(m.id).length;
          const pilot = pilotById(m.pilotId);
          return (
            <div key={m.id} className="border border-slate-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800">{m.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                    <Icon name="location_on" className="text-sm" /> {m.location} · {fmtDate(m.date)}{m.takeoff ? ` · ${m.takeoff}` : ''}
                  </p>
                  {(m.opType || m.racCategory) && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {m.opType && <Tag>{m.opType}</Tag>}
                      {m.racCategory && <Tag>{m.racCategory}</Tag>}
                      {m.altitude != null && <Tag>{m.altitude} m AGL</Tag>}
                      {m.geoType && <Tag>{m.geoType}</Tag>}
                    </div>
                  )}
                </div>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase shrink-0 ${st.cls}`}>
                  {st.label}
                </span>
              </div>

              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {/* Reasignar piloto */}
                <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2 py-1.5">
                  <Icon name="person" className="text-sm text-slate-400" />
                  <select
                    value={m.pilotId || ''}
                    onChange={(e) => reassignMission(m.id, e.target.value)}
                    className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
                  >
                    {!pilot && <option value="">Sin asignar</option>}
                    {activePilots.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>

                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <Icon name="flight" className="text-sm" /> {count} vuelo{count !== 1 ? 's' : ''}
                </span>

                <button
                  onClick={() => simulate(m.id)}
                  className="ml-auto flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-white border border-slate-200 hover:border-transparent hover:bg-[var(--brand-accent)] rounded-lg px-2.5 py-1.5 transition-colors"
                >
                  <Icon name="add" className="text-sm" /> Simular vuelo
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-slate-400 mt-3">
        &quot;Simular vuelo&quot; emula que el piloto carga un registro de la misión (descuenta 1 crédito).
      </p>

      <ScheduleMissionModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        onDone={(name) => { setToast(`✓ Misión programada y asignada: ${name}`); setTimeout(() => setToast(''), 3500); }}
      />
    </div>
  );
}

function Tag({ children }) {
  return (
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
      {children}
    </span>
  );
}
