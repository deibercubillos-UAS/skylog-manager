'use client';

// Skylog V2.0 — «Unirme a otra organización» desde Mi Perfil (Etapa B, cuenta existente). Solo agrega una membresía;
// no cambia la organización activa ni mueve datos. Para cambiar de organización se usa el selector del encabezado.
import { useState } from 'react';
import { Button } from '@skylog/ui';
import JoinByNit from '../_components/JoinByNit';

const inputCls = 'w-full min-h-[44px] px-3 py-2 rounded-lg border border-navy-200 text-base md:text-sm focus:outline-none focus:ring-2 focus:ring-primary-300';

export default function JoinOrganization({ onJoined }) {
  const [open, setOpen] = useState(false);
  const [nit, setNit] = useState('');
  const [role, setRole] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch('/api/alta/unirse-cuenta', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nit, role }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || 'No se pudo completar.');
    setDone(data.organizationName);
    setOpen(false);
    setNit('');
    setRole('');
    onJoined?.();
  }

  return (
    <div className="mt-3">
      {done && <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 mb-2">Te uniste a {done}. Cámbiate de organización desde el encabezado.</p>}
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="text-xs font-semibold text-primary-700 hover:underline min-h-[44px]">+ Unirme a otra organización</button>
      ) : (
        <form onSubmit={submit} className="bg-white rounded-xl border border-navy-100 p-3 space-y-3">
          <JoinByNit nit={nit} role={role} onNit={setNit} onRole={setRole} inputClass={inputCls} labelClass="text-xs font-medium text-navy-400" />
          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={busy || !nit || !role}>{busy ? 'Uniéndome…' : 'Unirme'}</Button>
            <button type="button" onClick={() => { setOpen(false); setError(null); }} className="text-xs font-semibold text-navy-400 px-2 min-h-[44px]">Cancelar</button>
          </div>
        </form>
      )}
    </div>
  );
}
