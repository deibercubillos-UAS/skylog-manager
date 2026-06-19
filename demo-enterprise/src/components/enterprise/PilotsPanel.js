'use client';

import { useState } from 'react';
import { useDemo } from '@/lib/demoStore';
import Icon from '@/components/Icon';

const STATUS = {
  activo:    { label: 'Activo',    cls: 'bg-emerald-100 text-emerald-700' },
  pendiente: { label: 'Pendiente', cls: 'bg-amber-100 text-amber-700' },
  revocado:  { label: 'Revocado',  cls: 'bg-slate-200 text-slate-500' },
};

export default function PilotsPanel() {
  const { pilots, addPilot, revokePilot } = useDemo();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');

  const submit = (e) => {
    e.preventDefault();
    const r = addPilot({ name, email });
    if (r.ok) {
      setMsg(`✓ Invitación enviada a ${email}`);
      setName(''); setEmail('');
    } else {
      setMsg(r.reason === 'ya_existe' ? '✗ Ese correo ya está vinculado' : '✗ Correo inválido');
    }
    setTimeout(() => setMsg(''), 3500);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Icon name="group" className="text-lg" style={{ color: 'var(--brand-accent)' }} />
        <h2 className="text-sm font-black uppercase tracking-widest" style={{ color: 'var(--brand-navy)' }}>
          Pilotos patrocinados
        </h2>
        <span className="ml-auto text-xs text-slate-400">{pilots.length} vinculados</span>
      </div>

      {/* Alta por correo (onboarding) */}
      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2 mb-4">
        <input
          value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Nombre (opcional)"
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[var(--brand-accent)]"
        />
        <input
          value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="correo@piloto.com"
          type="email"
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[var(--brand-accent)]"
        />
        <button className="flex items-center justify-center gap-1.5 text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shrink-0"
                style={{ backgroundColor: 'var(--brand-accent)' }}>
          <Icon name="mail" className="text-base" /> Invitar
        </button>
      </form>
      {msg && <p className={`text-xs font-bold mb-3 ${msg.startsWith('✓') ? 'text-emerald-600' : 'text-red-600'}`}>{msg}</p>}

      {/* Lista */}
      <div className="space-y-2">
        {pilots.map((p) => {
          const st = STATUS[p.status] || STATUS.pendiente;
          return (
            <div key={p.id} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
              <div className="size-9 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0">
                <span className="text-xs font-black text-slate-500">
                  {p.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">
                  {p.name}
                  {p.paid && <span className="ml-2 text-[10px] font-black text-emerald-600 uppercase">· Plan pago</span>}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {p.email}{p.aircraft ? ` · ${p.aircraft}` : ''}
                </p>
              </div>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase shrink-0 ${st.cls}`}>
                {st.label}
              </span>
              {p.status !== 'revocado' && (
                <button
                  onClick={() => revokePilot(p.id)}
                  title="Revocar vínculo"
                  className="size-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 shrink-0"
                >
                  <Icon name="link_off" className="text-base" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
