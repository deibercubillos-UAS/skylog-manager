'use client';

// Skylog V2.0 — ficha técnica del modelo (RAC 100 Apéndice 1, Parte B). Los campos salen del catálogo
// `SPEC_FIELDS` del dominio: la misma lista valida en el servidor y mide la completitud.
import { useState } from 'react';
import { SPEC_FIELDS, SPEC_GROUPS, C2_FIELDS } from '@skylog/domain';
import { Field, Button } from '@skylog/ui';
import DocumentSlot from '../_components/DocumentSlot';

function initialValue(f, model) {
  const v = model[f.key];
  if (f.type === 'list') return Array.isArray(v) ? v.join(', ') : '';
  if (f.type === 'c2') return { ...(v || {}) };
  if (f.type === 'bool') return v === true ? 'si' : v === false ? 'no' : '';
  return v ?? '';
}

export default function ModelSpecSheet({ model, readOnly, onSaved, onCancel, onDocumentChanged }) {
  const [vals, setVals] = useState(() => Object.fromEntries(SPEC_FIELDS.map((f) => [f.key, initialValue(f, model)])));
  const [identity, setIdentity] = useState({ brand: model.brand, model: model.model });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const set = (key, v) => setVals((x) => ({ ...x, [key]: v }));

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = { ...identity };
    for (const f of SPEC_FIELDS) {
      body[f.key] = f.type === 'bool' ? (vals[f.key] === 'si' ? true : vals[f.key] === 'no' ? false : '') : vals[f.key];
    }
    const res = await fetch(`/api/flota/models/${model.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error);
    onSaved(data.model);
  }

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
        <Field label="Marca" value={identity.brand} disabled={readOnly} onChange={(e) => setIdentity((x) => ({ ...x, brand: e.target.value }))} required />
        <Field label="Modelo" value={identity.model} disabled={readOnly} onChange={(e) => setIdentity((x) => ({ ...x, model: e.target.value }))} required />
      </div>

      {SPEC_GROUPS.map((group) => (
        <div key={group}>
          <p className="text-xs font-black uppercase text-navy-300 tracking-widest mb-2">{group}</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4">
            {SPEC_FIELDS.filter((f) => f.group === group).map((f) => {
              const label = f.unit ? `${f.label} (${f.unit})` : f.label;
              if (f.type === 'c2') {
                return (
                  <div key={f.key} className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-4 gap-x-4">
                    {C2_FIELDS.map((c) => (
                      <Field key={c.key} label={c.label} value={vals.c2_link[c.key] || ''} disabled={readOnly} onChange={(e) => set('c2_link', { ...vals.c2_link, [c.key]: e.target.value })} />
                    ))}
                  </div>
                );
              }
              if (f.type === 'select') {
                return (
                  <Field key={f.key} as="select" label={label} value={vals[f.key]} disabled={readOnly} onChange={(e) => set(f.key, e.target.value)}>
                    <option value="">Sin especificar</option>
                    {f.options.map((o) => <option key={o} value={o}>{f.optionLabels?.[o] || o}</option>)}
                  </Field>
                );
              }
              if (f.type === 'bool') {
                return (
                  <Field key={f.key} as="select" label={label} value={vals[f.key]} disabled={readOnly} onChange={(e) => set(f.key, e.target.value)}>
                    <option value="">Sin especificar</option>
                    <option value="si">Sí</option>
                    <option value="no">No</option>
                  </Field>
                );
              }
              return <Field key={f.key} type={f.type === 'number' ? 'number' : 'text'} step={f.type === 'number' ? 'any' : undefined} label={label} value={vals[f.key]} disabled={readOnly} onChange={(e) => set(f.key, e.target.value)} />;
            })}
          </div>
        </div>
      ))}

      <div>
        <p className="text-xs font-black uppercase text-navy-300 tracking-widest mb-2">Autorización de la ANE</p>
        <p className="text-xs text-navy-400 mb-1">Solo si el enlace usa una banda de frecuencias licenciada.</p>
        <DocumentSlot label="Autorización" endpoint={`/api/flota/models/${model.id}/ane-document`} has={model.has_ane_document} canUpload={!readOnly} onChanged={onDocumentChanged} />
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      {!readOnly && (
        <div className="flex gap-2">
          <Button type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar ficha'}</Button>
          <button type="button" onClick={onCancel} className="text-xs font-semibold text-navy-400 px-2">Cancelar</button>
        </div>
      )}
    </form>
  );
}
