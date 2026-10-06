'use client';

// Skylog V2.0 — declaración de mercancías peligrosas (MAUT-5.0-12-174, ítems 7 y 24). Todo explotador declara si
// transporta o no, aunque no transporte. No hay clasificación/NOTOC: si declara que transporta, solo se registra.
import { useState } from 'react';
import { DG_DECLARATIONS } from '@skylog/domain';
import { Field, Button } from '@skylog/ui';

export default function DangerousGoods({ organizationId, cert, canSign, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [declaration, setDeclaration] = useState(cert?.dangerous_goods_declaration || '');
  const [notes, setNotes] = useState(cert?.dangerous_goods_notes || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const current = DG_DECLARATIONS.find((d) => d.key === cert?.dangerous_goods_declaration);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch('/api/organizacion/dangerous-goods', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organizationId, declaration, notes }) });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error);
    setEditing(false);
    onSaved?.();
  }

  return (
    <div className="bg-white rounded-2xl border border-navy-100 p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-navy">Mercancías peligrosas</p>
          <p className="text-xs text-navy-400">Todo explotador debe declarar si las transporta, aunque no lo haga (MAUT-5.0-12-174). Coherente con las OpSpecs.</p>
        </div>
        {canSign && !editing && (
          <button type="button" onClick={() => setEditing(true)} className="text-xs font-semibold text-primary-700 hover:underline min-h-[36px]">
            {current ? 'Actualizar declaración' : 'Declarar'}
          </button>
        )}
      </div>

      {!editing && (
        <div className="mt-3 text-sm">
          {current ? (
            <>
              <p className="font-medium text-navy">{current.label}</p>
              {cert.dangerous_goods_notes && <p className="text-xs text-navy-500 mt-0.5">{cert.dangerous_goods_notes}</p>}
              {cert.dangerous_goods_declared_at && <p className="text-xs text-navy-300 mt-0.5">Declarado el {cert.dangerous_goods_declared_at.slice(0, 10)}</p>}
              {cert.dangerous_goods_declaration === 'transporta' && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mt-2">Esta plataforma todavía no gestiona la clasificación, el NOTOC ni los diagramas de carga: llévalos según tu MO.</p>
              )}
            </>
          ) : (
            <p className="text-xs text-amber-700">Sin declarar.</p>
          )}
          <p className="text-xs text-navy-400 mt-2">
            La capacitación del personal en las políticas propias también es exigible: regístrala como evaluación en <a href="/capacitacion/administracion" className="underline font-semibold">Capacitación</a>.
          </p>
        </div>
      )}

      {editing && (
        <form onSubmit={save} className="mt-3">
          <div className="space-y-2 mb-3">
            {DG_DECLARATIONS.map((d) => (
              <label key={d.key} className={`flex items-center gap-3 rounded-xl border px-3 min-h-[44px] text-sm cursor-pointer ${declaration === d.key ? 'border-primary bg-primary-50/50' : 'border-navy-100'}`}>
                <input type="radio" name="dg" checked={declaration === d.key} onChange={() => setDeclaration(d.key)} className="accent-primary" />
                {d.label}
              </label>
            ))}
          </div>
          <Field as="textarea" rows={2} label={declaration === 'transporta' ? 'Qué transporta y bajo qué procedimiento' : 'Observaciones (opcional)'} value={notes} onChange={(e) => setNotes(e.target.value)} />
          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={busy || !declaration}>{busy ? 'Guardando…' : 'Firmar declaración'}</Button>
            <button type="button" onClick={() => setEditing(false)} className="text-xs font-semibold text-navy-400 px-2 min-h-[44px]">Cancelar</button>
          </div>
        </form>
      )}
    </div>
  );
}
