'use client';

import { useDemo } from '@/lib/demoStore';
import { DEMO } from '@/demo.config';
import Icon from '@/components/Icon';

// Tarjeta de invitación: el piloto decide aceptar (pierde autonomía, gratis)
// o rechazar. Refleja claramente qué gana y qué pierde.
export default function InvitationCard({ pilot }) {
  const { acceptInvite, revokePilot } = useDemo();

  return (
    <div className="max-w-xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 md:p-8">
      <div className="flex items-center gap-3 mb-5">
        <div className="size-12 rounded-xl flex items-center justify-center shrink-0"
             style={{ backgroundColor: 'color-mix(in srgb, var(--brand-accent) 14%, white)' }}>
          <Icon name="mark_email_unread" className="text-2xl" style={{ color: 'var(--brand-accent)' }} />
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Invitación</p>
          <h2 className="text-lg font-black" style={{ color: 'var(--brand-navy)' }}>
            {DEMO.clientName} quiere vincularte
          </h2>
        </div>
      </div>

      <p className="text-sm text-slate-600 leading-relaxed mb-5">
        Hola <strong>{pilot.name}</strong>, <strong>{DEMO.clientName}</strong> te invita a operar como
        <strong> piloto patrocinado</strong>. Tu cuenta será gratuita: la organización cubre tus operaciones.
      </p>

      <div className="grid sm:grid-cols-2 gap-3 mb-6">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-xs font-black uppercase tracking-widest text-emerald-700 mb-2 flex items-center gap-1">
            <Icon name="check_circle" className="text-sm" /> Podrás
          </p>
          <ul className="text-xs text-emerald-800 space-y-1">
            <li>· Registrar drones y baterías</li>
            <li>· Volar las misiones que te asignen</li>
            <li>· Cargar la bitácora de esas misiones</li>
          </ul>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs font-black uppercase tracking-widest text-amber-700 mb-2 flex items-center gap-1">
            <Icon name="lock" className="text-sm" /> No podrás (sin plan pago)
          </p>
          <ul className="text-xs text-amber-800 space-y-1">
            <li>· Programar tus propios vuelos</li>
            <li>· Descargar/exportar la bitácora</li>
            <li>· Volar fuera de la organización</li>
          </ul>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 mb-5">
        Al aceptar, la organización podrá programarte vuelos y pierdes autonomía. Pagando el
        plan Piloto Independiente recuperas todo y conservas las misiones de la organización.
      </p>

      <div className="flex gap-3">
        <button
          onClick={() => revokePilot(pilot.id)}
          className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50"
        >
          Rechazar
        </button>
        <button
          onClick={() => acceptInvite(pilot.id)}
          className="flex-1 py-3 rounded-xl text-sm font-black text-white"
          style={{ backgroundColor: 'var(--brand-accent)' }}
        >
          Aceptar y vincularme
        </button>
      </div>
    </div>
  );
}
