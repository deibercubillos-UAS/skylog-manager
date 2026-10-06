'use client';

// Skylog V2.0 — cargos designados por acta (RAC 100 §100.535(14)(15)(16)). Muestra quién ocupa cada cargo,
// desde cuándo y con qué acta; designar a otra persona cierra la vigente y conserva el historial.
import { useCallback, useEffect, useState } from 'react';
import { Field, Button } from '@skylog/ui';
import DocumentSlot from '../_components/DocumentSlot';

const today = () => new Date().toISOString().slice(0, 10);

export default function Designations({ organizationId, members }) {
  const [data, setData] = useState({ designations: [], roles: [], canDesignate: false, canView: false });
  const [editing, setEditing] = useState(null); // role key
  const [form, setForm] = useState({ personId: '', actReference: '', actDate: today() });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/organizacion/designations?organizationId=${organizationId}`);
    const d = await res.json();
    if (res.ok) setData(d);
    else setError(d.error);
  }, [organizationId]);

  useEffect(() => {
    if (organizationId) load();
  }, [organizationId, load]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch('/api/organizacion/designations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organizationId, roleType: editing, ...form }) });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) return setError(d.error);
    setEditing(null);
    setForm({ personId: '', actReference: '', actDate: today() });
    await load();
  }

  const current = (role) => data.designations.find((x) => x.role_type === role && !x.ended_at);
  const history = data.designations.filter((x) => x.ended_at);

  return (
    <div className="bg-white rounded-2xl border border-navy-100 overflow-hidden">
      <div className="p-4 pb-2">
        <p className="text-sm font-semibold text-navy">Cargos designados</p>
        <p className="text-xs text-navy-400">La norma pide designar estos cargos por acta: un rol en una lista no es evidencia, el acta con fecha sí.</p>
        {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-1.5 mt-2">{error}</p>}
      </div>
      <div className="divide-y divide-navy-50">
        {data.roles.map((r) => {
          const d = current(r.key);
          return (
            <div key={r.key} className="px-4 py-3 text-sm">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="font-medium text-navy">{r.label} <span className="text-[11px] text-navy-300 font-normal">{r.norm}</span></p>
                  {d ? (
                    <p className="text-xs text-navy-500">
                      {d.person?.full_name} · desde {d.started_at.slice(0, 10)}
                      {d.act_reference ? ` · ${d.act_reference}${d.act_date ? ` (${d.act_date})` : ''}` : ' · sin acta registrada'}
                    </p>
                  ) : (
                    <p className="text-xs text-amber-700">Sin designar</p>
                  )}
                </div>
                {r.managedIn ? (
                  <a href={r.managedIn} className="text-xs font-semibold text-primary-700 hover:underline">Gestionar en SMS →</a>
                ) : (
                  data.canDesignate && editing !== r.key && (
                    <button type="button" onClick={() => { setEditing(r.key); setError(null); }} className="text-xs font-semibold text-primary-700 hover:underline">
                      {d ? 'Designar a otra persona' : 'Designar'}
                    </button>
                  )
                )}
              </div>
              {d && !r.managedIn && data.canView && (
                <div className="mt-2 space-y-0.5">
                  <DocumentSlot label="Acta" endpoint={`/api/organizacion/designations/${d.id}/document?kind=act`} has={d.has_act_document} canUpload={data.canDesignate} onChanged={load} />
                  <DocumentSlot label="Hoja de vida" endpoint={`/api/organizacion/designations/${d.id}/document?kind=resume`} has={d.has_resume_document} canUpload={data.canDesignate} onChanged={load} />
                </div>
              )}
              {editing === r.key && (
                <form onSubmit={submit} className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-x-3">
                  <Field as="select" label="Persona" value={form.personId} onChange={(e) => setForm((f) => ({ ...f, personId: e.target.value }))} required>
                    <option value="">— Elegir —</option>
                    {members.map((m) => <option key={m.person_id} value={m.person_id}>{m.people?.full_name || m.person_id}</option>)}
                  </Field>
                  <Field label="Acta (número o descripción)" value={form.actReference} onChange={(e) => setForm((f) => ({ ...f, actReference: e.target.value }))} required />
                  <Field type="date" label="Fecha del acta" max={today()} value={form.actDate} onChange={(e) => setForm((f) => ({ ...f, actDate: e.target.value }))} required />
                  <div className="sm:col-span-3 flex gap-2">
                    <Button type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar designación'}</Button>
                    <button type="button" onClick={() => setEditing(null)} className="text-xs font-semibold text-navy-400 px-2">Cancelar</button>
                  </div>
                </form>
              )}
            </div>
          );
        })}
      </div>
      {history.length > 0 && (
        <div className="px-4 py-2 border-t border-navy-50">
          <button type="button" onClick={() => setShowHistory(!showHistory)} className="text-xs font-semibold text-navy-400">
            {showHistory ? 'Ocultar historial' : `Ver historial (${history.length})`}
          </button>
          {showHistory && (
            <ul className="mt-2 space-y-1 text-xs text-navy-500">
              {history.map((h) => (
                <li key={h.id}>
                  {data.roles.find((r) => r.key === h.role_type)?.label}: {h.person?.full_name} · {h.started_at.slice(0, 10)} → {h.ended_at.slice(0, 10)}{h.act_reference ? ` · ${h.act_reference}` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
