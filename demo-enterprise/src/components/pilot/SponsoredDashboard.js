'use client';

import { useState } from 'react';
import { useDemo } from '@/lib/demoStore';
import { DEMO } from '@/demo.config';
import { fmtDate, fmtDuration } from '@/lib/format';
import Icon from '@/components/Icon';

const MST = {
  programada: { label: 'Programada', cls: 'bg-sky-100 text-sky-700' },
  en_curso:   { label: 'En curso',   cls: 'bg-amber-100 text-amber-700' },
  completada: { label: 'Completada', cls: 'bg-emerald-100 text-emerald-700' },
};

export default function SponsoredDashboard({ pilot }) {
  const { missions, flights, loadFlight, blocked } = useDemo();
  const [toast, setToast] = useState('');

  const myMissions = missions.filter((m) => m.pilotId === pilot.id);
  const myFlights = flights.filter((f) => f.pilotId === pilot.id);

  const cargar = (missionId) => {
    const r = loadFlight(missionId);
    if (r.ok) setToast('✓ Vuelo cargado y compartido con la organización');
    else if (r.reason === 'no_credits') setToast('⛔ La organización no tiene créditos — contáctala para recargar');
    else setToast('✗ No se pudo cargar el vuelo');
    setTimeout(() => setToast(''), 3500);
  };

  return (
    <div className="space-y-5">
      {/* Banner patrocinado */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-start gap-3">
          <div className="size-10 rounded-xl flex items-center justify-center shrink-0"
               style={{ backgroundColor: 'color-mix(in srgb, var(--brand-accent) 14%, white)' }}>
            <Icon name="verified_user" className="text-xl" style={{ color: 'var(--brand-accent)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black" style={{ color: 'var(--brand-navy)' }}>
              Cuenta patrocinada por {DEMO.clientName}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Operas las misiones que la organización te asigna. Tu cuenta es gratuita.
            </p>
          </div>
          {pilot.paid && (
            <span className="text-[10px] font-black px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 uppercase shrink-0">
              Plan pago
            </span>
          )}
        </div>

        {/* Capacidades */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Chip ok icon="flight">Drones y baterías</Chip>
          <Chip ok icon="assignment_turned_in">Bitácora de misiones</Chip>
          <Chip locked={!pilot.paid} icon="event">Programar vuelos</Chip>
          <Chip locked={!pilot.paid} icon="download">Exportar bitácora</Chip>
        </div>
        {!pilot.paid && (
          <p className="text-[11px] text-slate-400 mt-3 flex items-center gap-1">
            <Icon name="lock" className="text-xs" />
            Funciones bloqueadas — disponibles con el plan Piloto Independiente.
          </p>
        )}
      </div>

      {toast && (
        <p className={`text-sm font-bold ${toast.startsWith('✓') ? 'text-emerald-600' : toast.startsWith('⛔') ? 'text-red-600' : 'text-slate-500'}`}>
          {toast}
        </p>
      )}

      {/* Misiones asignadas */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Icon name="assignment" className="text-lg" style={{ color: 'var(--brand-accent)' }} />
          <h2 className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--brand-navy)' }}>
            Mis misiones asignadas
          </h2>
          <span className="ml-auto text-xs text-slate-400">{myMissions.length}</span>
        </div>

        {myMissions.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">La organización aún no te asigna misiones.</p>
        ) : (
          <div className="space-y-3">
            {myMissions.map((m) => {
              const st = MST[m.status] || MST.programada;
              const count = flights.filter((f) => f.missionId === m.id).length;
              return (
                <div key={m.id} className="border border-slate-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800">{m.name}</p>
                      <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                        <Icon name="location_on" className="text-sm" /> {m.location} · {fmtDate(m.date)}
                      </p>
                    </div>
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase shrink-0 ${st.cls}`}>
                      {st.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Icon name="flight" className="text-sm" /> {count} vuelo{count !== 1 ? 's' : ''} cargado{count !== 1 ? 's' : ''}
                    </span>
                    <button
                      onClick={() => cargar(m.id)}
                      className="ml-auto flex items-center gap-1.5 text-white rounded-lg px-3 py-2 text-xs font-black uppercase tracking-wider"
                      style={{ backgroundColor: blocked ? '#94a3b8' : 'var(--brand-accent)' }}
                    >
                      <Icon name="upload" className="text-sm" /> Cargar vuelo
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Mi bitácora */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Icon name="menu_book" className="text-lg" style={{ color: 'var(--brand-accent)' }} />
          <h2 className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--brand-navy)' }}>
            Mi bitácora
          </h2>
          <span className="ml-auto text-xs text-slate-400">{myFlights.length} vuelos</span>
        </div>

        {myFlights.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">Aún no has cargado vuelos.</p>
        ) : (
          <div className="space-y-2">
            {myFlights.map((f) => (
              <div key={f.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
                <Icon name="flight_takeoff" className="text-lg text-slate-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-700">
                    {fmtDate(f.date)} · {f.takeoff} · {fmtDuration(f.durationMin)}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{f.aircraft} · {f.distanceKm} km · {f.maxAlt} m</p>
                </div>
                <span className="text-[10px] font-black px-2 py-1 rounded-full uppercase shrink-0"
                      style={{ backgroundColor: 'color-mix(in srgb, var(--brand-accent) 12%, white)', color: 'var(--brand-accent)' }}>
                  Asignado por la organización
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="text-[11px] text-slate-400 mt-3 flex items-center gap-1">
          <Icon name="lock" className="text-xs" /> La descarga/exportación requiere plan Piloto Independiente.
        </p>
      </div>
    </div>
  );
}

function Chip({ children, icon, ok, locked }) {
  const cls = ok
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : locked
      ? 'bg-slate-100 text-slate-400 border-slate-200'
      : 'bg-slate-50 text-slate-600 border-slate-200';
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg border ${cls}`}>
      <Icon name={locked ? 'lock' : icon} className="text-sm" /> {children}
    </span>
  );
}
