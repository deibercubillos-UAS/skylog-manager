'use client';

// Skylog V2.0 — SMS-F: crear/editar un objetivo SMS y vincularlo a los
// KPI (indicadores SPI) que lo miden (checklist, no un select — un objetivo
// puede medirse con varios indicadores a la vez).
import { useEffect, useState } from 'react';
import { Panel, Button } from '@skylog/ui';

const inputClass =
  'w-full text-base md:text-sm bg-white border border-navy-200 rounded-lg px-3 py-2 min-h-[44px] md:min-h-0 placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-300 transition-shadow';

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
    <Panel
      open={open}
      onClose={onClose}
      eyebrow="SMS · Objetivos"
      icon="target"
      title={objective ? 'Editar objetivo SMS' : 'Nuevo objetivo SMS'}
      subtitle="Un objetivo SMART, vinculado a los KPI (indicadores SPI) que lo miden."
      footer={
        <div className="flex gap-2">
          <Button type="submit" form="objective-form" disabled={busy || !form.title.trim()} className="flex-1 justify-center">
            <span className="material-symbols-outlined text-base align-middle mr-1">save</span>
            {busy ? 'Guardando…' : objective ? 'Guardar cambios' : 'Crear objetivo'}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      }
    >
      <form id="objective-form" onSubmit={handleSubmit} className="space-y-4">
        {/* El objetivo */}
        <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-4 space-y-4">
          <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-navy-300">
            <span className="material-symbols-outlined text-base text-primary">flag</span>
            El objetivo
          </p>
          <div>
            <label className="text-xs font-medium text-navy-500 block mb-1">Objetivo (SMART)</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Ej. Reducir los eventos de pérdida de enlace C2 en 10% anual"
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-navy-500 block mb-1">
              Cómo se mide <span className="font-normal text-navy-300">· opcional</span>
            </label>
            <textarea
              value={form.metricDescription}
              onChange={(e) => setForm((f) => ({ ...f, metricDescription: e.target.value }))}
              rows={2}
              placeholder="Qué dato concreto se sigue y cómo se verifica"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-navy-500 block mb-1">
                Meta <span className="font-normal text-navy-300">· opcional</span>
              </label>
              <input type="number" step="any" value={form.targetValue} onChange={(e) => setForm((f) => ({ ...f, targetValue: e.target.value }))} placeholder="0" className={inputClass} />
            </div>
            <div>
              <label className="text-xs font-medium text-navy-500 block mb-1">Unidad</label>
              <input value={form.targetUnit} onChange={(e) => setForm((f) => ({ ...f, targetUnit: e.target.value }))} placeholder="%, eventos…" className={inputClass} />
            </div>
          </div>
        </div>

        {/* KPI que lo miden */}
        <div className="bg-white rounded-2xl border border-navy-100 shadow-sm p-4">
          <div className="flex items-center justify-between gap-2 mb-3">
            <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-navy-300">
              <span className="material-symbols-outlined text-base text-blue-500">monitoring</span>
              KPI que lo miden
            </p>
            {form.indicatorIds.length > 0 && (
              <span className="text-[11px] font-bold text-primary-700 bg-primary-50 rounded-full px-2 py-0.5">{form.indicatorIds.length} vinculado{form.indicatorIds.length > 1 ? 's' : ''}</span>
            )}
          </div>
          {indicators.length === 0 ? (
            <p className="flex items-start gap-1.5 text-xs text-navy-500 bg-navy-50 rounded-lg px-3 py-2">
              <span className="material-symbols-outlined text-[14px] text-navy-300 shrink-0 mt-0.5">info</span>
              Aún no hay KPI configurados. Créalos en <b className="font-semibold">Indicadores (SPI)</b> y vuelve a vincularlos aquí.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {indicators.map((ind) => {
                const selected = form.indicatorIds.includes(ind.id);
                return (
                  <button
                    key={ind.id}
                    type="button"
                    onClick={() => toggleIndicator(ind.id)}
                    className={`flex items-center gap-1.5 text-xs font-semibold rounded-full pl-2.5 pr-3 py-1.5 border transition-colors ${
                      selected ? 'bg-primary text-white border-transparent' : 'bg-white border-navy-200 text-navy-500 hover:border-primary-300'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[15px]">{selected ? 'check_circle' : 'add_circle'}</span>
                    {ind.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
      </form>
    </Panel>
  );
}
