'use client';

// Skylog V2.0 — contactos de emergencia de la organización: a quién llamar si pasa algo.
import { useCallback, useEffect, useState } from 'react';
import { Field, Button } from '@skylog/ui';

const EMPTY = { name: '', role: '', phone: '', email: '' };

export default function EmergencyContacts({ organizationId }) {
  const [data, setData] = useState({ contacts: [], canEdit: false });
  const [form, setForm] = useState(EMPTY);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/organizacion/emergency-contacts?organizationId=${organizationId}`);
    const d = await res.json();
    if (res.ok) setData(d);
    else setError(d.error);
  }, [organizationId]);

  useEffect(() => {
    if (organizationId) load();
  }, [organizationId, load]);

  async function add(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch('/api/organizacion/emergency-contacts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organizationId, ...form }) });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) return setError(d.error);
    setForm(EMPTY);
    setAdding(false);
    await load();
  }

  async function remove(id) {
    if (!confirm('¿Quitar este contacto?')) return;
    const res = await fetch(`/api/organizacion/emergency-contacts?id=${id}`, { method: 'DELETE' });
    const d = await res.json();
    if (!res.ok) return setError(d.error);
    await load();
  }

  return (
    <div className="bg-white rounded-2xl border border-navy-100 p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-navy">Contactos de emergencia</p>
          <p className="text-xs text-navy-400">A quién llamar si ocurre un accidente o incidente (plan de respuesta ante emergencias).</p>
        </div>
        {data.canEdit && !adding && (
          <button type="button" onClick={() => setAdding(true)} className="text-xs font-semibold text-primary-700 hover:underline min-h-[36px]">Agregar contacto</button>
        )}
      </div>
      {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-1.5 mt-2">{error}</p>}

      {data.contacts.length === 0 && !adding && <p className="text-xs text-amber-700 mt-3">Sin contactos registrados.</p>}
      <ul className="mt-3 divide-y divide-navy-50">
        {data.contacts.map((c) => (
          <li key={c.id} className="py-2 flex items-center justify-between gap-3 text-sm">
            <div className="min-w-0">
              <p className="font-medium text-navy truncate">{c.name}{c.role && <span className="text-navy-400 font-normal"> · {c.role}</span>}</p>
              <p className="text-xs text-navy-500">
                {c.phone && <a href={`tel:${c.phone}`} className="underline">{c.phone}</a>}
                {c.phone && c.email && ' · '}
                {c.email}
              </p>
            </div>
            {data.canEdit && <button type="button" onClick={() => remove(c.id)} className="text-xs font-semibold text-red-600 hover:underline min-h-[36px] shrink-0">Quitar</button>}
          </li>
        ))}
      </ul>

      {adding && (
        <form onSubmit={add} className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <Field label="Nombre" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          <Field label="Cargo o entidad" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} placeholder="Bomberos, gerente, aseguradora…" />
          <Field label="Teléfono" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
          <Field label="Correo" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          <div className="sm:col-span-2 flex gap-2">
            <Button type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar contacto'}</Button>
            <button type="button" onClick={() => { setAdding(false); setForm(EMPTY); }} className="text-xs font-semibold text-navy-400 px-2 min-h-[44px]">Cancelar</button>
          </div>
        </form>
      )}
    </div>
  );
}
