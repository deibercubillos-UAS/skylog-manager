'use client';

// Skylog V2.0 — solicitudes para unirse a la organización por NIT. Quien se registra con el NIT no entra hasta que un
// Gerente General o Jefe de Pilotos la aprueba aquí; el rol que pidió se ve antes de decidir. Si quien mira no puede
// decidir (p. ej. Gerente SMS), la sección no se muestra (la API responde 403).
import { useCallback, useEffect, useState } from 'react';
import { JOIN_ROLE_LABELS } from '@skylog/domain';
import { Button } from '@skylog/ui';

export default function JoinRequests({ organizationId, onChanged }) {
  const [list, setList] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/solicitudes-ingreso?organizationId=${organizationId}`);
    if (!res.ok) return setList([]);
    const data = await res.json().catch(() => ({}));
    setList(data.requests || []);
  }, [organizationId]);

  useEffect(() => {
    if (organizationId) load();
  }, [organizationId, load]);

  async function decide(r, action) {
    const label = JOIN_ROLE_LABELS[r.role] || r.role;
    const question = action === 'aprobar' ? `¿Aprobar a ${r.fullName} como ${label}? Tendrá acceso a la organización.` : `¿Rechazar la solicitud de ${r.fullName}?`;
    if (!confirm(question)) return;
    setBusyId(r.id);
    setError(null);
    const res = await fetch('/api/solicitudes-ingreso', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: r.id, action }) });
    const data = await res.json().catch(() => ({}));
    setBusyId(null);
    if (!res.ok) setError(data.error || 'No se pudo completar.');
    await load();
    if (res.ok) onChanged?.();
  }

  if (list.length === 0 && !error) return null;
  return (
    <section className="bg-white rounded-2xl border border-amber-200 p-4 space-y-3">
      <h3 className="font-black text-xs uppercase text-amber-700 tracking-widest">Solicitudes de ingreso ({list.length})</h3>
      <p className="text-xs text-navy-400">Estas personas se registraron con el NIT de la organización y no tienen acceso hasta que las apruebes. Si no las reconoces, recházalas.</p>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      <ul className="divide-y divide-navy-50">
        {list.map((r) => (
          <li key={r.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm">
            <span>
              <span className="font-bold text-navy">{r.fullName}</span>
              <span className="text-navy-400"> · pide ser {JOIN_ROLE_LABELS[r.role] || r.role}</span>
              <span className="block text-xs text-navy-300">{[r.email, r.phone].filter(Boolean).join(' · ')}</span>
            </span>
            <span className="flex gap-2">
              <Button type="button" disabled={busyId === r.id} onClick={() => decide(r, 'aprobar')}>Aprobar</Button>
              <button type="button" disabled={busyId === r.id} onClick={() => decide(r, 'rechazar')} className="text-xs font-semibold text-red-600 px-2 min-h-[44px] disabled:opacity-50">Rechazar</button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
