'use client';

// Skylog V2.0 — SMS-F: crear/editar un objetivo SMS y vincularlo a los
// indicadores SPI que lo miden (checklist, no un select — un objetivo
// puede medirse con varios indicadores a la vez).
import { useEffect, useState } from 'react';
import { Panel, Button } from '@skylog/ui';

export default function ObjectiveFormPanel({ open, onClose, organizationId, objective, indicators, onSaved }) {
  const [form, setForm] = useState({ title: '', metricDescription: '', targetValue: '', targetUnit: '', indicatorIds: [] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setForm({
      title: objective?.title || '',
      metricDescription: objective?.metric_description || '',
      targetValue: objective?.target_value ?? '',
      targetUnit: objective?.target_unit || '',
      indicatorIds: objective?.indicators?.map((i) => i.id) || [],
    });
    setError(null);
  }, [open, objective]);

  function toggleIndicator(id) {
    setForm((f) => ({ ...f, indicatorIds: f.indicatorIds.includes(id) ? f.indicatorIds.filter((x) => x !== id) : [...f.indicatorIds, id] }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload = {
        title: form.title,
        metricDescription: form.metricDescription,
        targetValue: form.targetValue === '' ? null : Number(form.targetValue),
        targetUnit: form.targetUnit,
        indicatorIds: form.indicatorIds,
      };
      const res = objective
        ? await fetch(`/api/sms/objectives/${objective.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        : await fetch('/api/sms/objectives', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organizationId, ...payload }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error guardando el objetivo');
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel open={open} onClose={onClose} title={objective ? 'Editar objetivo SMS' : 'Nuevo objetivo SMS'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-medium text-navy-400 block mb-1">Objetivo (SMART)</label>
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="Ej. Reducir los eventos de pérdida de enlace C2 en 10% anual"
            required
            className="w-full text-sm border border-navy-200 rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-navy-400 block mb-1">Cómo se mide (opcional)</label>
          <textarea
            value={form.metricDescription}
            onChange={(e) => setForm((f) => ({ ...f, metricDescription: e.target.value }))}
            rows={2}
            placeholder="Qué dato concreto se sigue y cómo se verifica"
            className="w-full text-sm border border-navy-200 rounded-lg px-3 py-2"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-navy-400 block mb-1">Meta (opcional)</label>
            <input type="number" step="any" value={form.targetValue} onChange={(e) => setForm((f) => ({ ...f, targetValue: e.target.value }))} className="w-full text-sm border border-navy-200 rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="text-xs font-medium text-navy-400 block mb-1">Unidad</label>
            <input value={form.targetUnit} onChange={(e) => setForm((f) => ({ ...f, targetUnit: e.target.value }))} placeholder="%, eventos…" className="w-full text-sm border border-navy-200 rounded-lg px-3 py-2" />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-navy-400 block mb-2">Indicadores (SPI) que lo miden</label>
          {indicators.length === 0 ? (
            <p className="text-xs text-navy-300">Sin indicadores configurados todavía en Indicadores (SPI).</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {indicators.map((ind) => {
                const selected = form.indicatorIds.includes(ind.id);
                return (
                  <button
                    key={ind.id}
                    type="button"
                    onClick={() => toggleIndicator(ind.id)}
                    className={`text-xs font-semibold rounded-full px-3 py-1.5 border transition-colors ${
                      selected ? 'bg-primary text-white border-transparent' : 'bg-white border-navy-200 text-navy-500 hover:border-primary-300'
                    }`}
                  >
                    {ind.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <Button type="submit" disabled={busy} className="w-full justify-center">
          {busy ? 'Guardando…' : 'Guardar'}
        </Button>
      </form>
    </Panel>
  );
}
