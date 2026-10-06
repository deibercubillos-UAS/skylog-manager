'use client';

// Skylog V2.0 — campos «NIT de la organización» + «tu rol» con consulta en vivo (Etapa B). Muestra a qué
// organización se unirá la persona y qué roles están disponibles ANTES de enviar. Se usa en el registro público y en
// Mi Perfil (cuenta existente). Estilo neutro: los inputs heredan la clase que le pase quien lo usa.
import { useEffect, useState } from 'react';
import { JOINABLE_ROLES, JOIN_ROLE_LABELS, normalizeNit } from '@skylog/domain';

export default function JoinByNit({ nit, role, onNit, onRole, inputClass, labelClass = 'text-xs font-black text-slate-500 uppercase tracking-widest' }) {
  const [lookup, setLookup] = useState({ state: 'idle' }); // idle | loading | found | missing | error

  useEffect(() => {
    const n = normalizeNit(nit);
    if (n.length < 5) {
      setLookup({ state: 'idle' });
      return;
    }
    setLookup({ state: 'loading' });
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/alta/organizacion?nit=${encodeURIComponent(n)}`);
        const data = await res.json();
        if (!res.ok) return setLookup({ state: 'error', message: data.error });
        setLookup(data.found ? { state: 'found', name: data.companyName, roles: data.roles } : { state: 'missing' });
      } catch {
        setLookup({ state: 'error', message: 'No se pudo consultar. Revisa tu conexión.' });
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [nit]);

  const roleInfo = (r) => (lookup.state === 'found' ? lookup.roles?.[r] : null);

  return (
    <div className="space-y-4">
      <label className="block space-y-1.5">
        <span className={labelClass}>NIT de la organización</span>
        <input className={inputClass} inputMode="text" placeholder="900.123.456-7" value={nit} onChange={(e) => onNit(e.target.value)} required />
        <span className="block text-xs min-h-[1.25rem]" aria-live="polite">
          {lookup.state === 'loading' && <span className="text-slate-400">Buscando…</span>}
          {lookup.state === 'found' && <span className="text-emerald-600 font-bold">✓ Te unirás a {lookup.name}</span>}
          {lookup.state === 'missing' && <span className="text-red-600 font-bold">No hay una organización con ese NIT. Verifica con tu gerente.</span>}
          {lookup.state === 'error' && <span className="text-amber-600 font-bold">{lookup.message}</span>}
        </span>
      </label>

      <fieldset className="space-y-2">
        <legend className={labelClass}>Tu rol</legend>
        {JOINABLE_ROLES.map((r) => {
          const info = roleInfo(r);
          const blocked = info && !info.ok;
          return (
            <label key={r} className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 min-h-[48px] text-sm ${blocked ? 'opacity-50 cursor-not-allowed border-slate-100' : role === r ? 'border-primary bg-orange-50/50 cursor-pointer' : 'border-slate-200 cursor-pointer'}`}>
              <input type="radio" name="join-role" className="mt-1 accent-primary" checked={role === r} disabled={blocked} onChange={() => onRole(r)} />
              <span>
                <span className="font-semibold text-slate-800">{JOIN_ROLE_LABELS[r]}</span>
                {blocked && <span className="block text-xs text-red-600">{info.message}</span>}
              </span>
            </label>
          );
        })}
      </fieldset>
    </div>
  );
}
