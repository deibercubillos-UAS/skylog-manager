'use client';

// Skylog V2.0 — SMS-F: crear/editar un objetivo SMS y vincularlo a los
// KPI (indicadores propios de la organización) que lo miden (checklist, no un select — un objetivo
// puede medirse con varios indicadores a la vez).
//
// Ventana flotante centrada con el patrón de diálogo ya probado de BitaFly
// (mismo lenguaje que `operacion/bitacora/_FlightEditDialog`): portal al body,
// velo navy, tarjeta blanca redondeada, cabecera de marca y pie con acciones.
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const inputCls =
  'mt-1 w-full min-h-[44px] text-base md:text-sm bg-white border border-navy-200 rounded-xl px-3 py-2 placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-300 transition-shadow';
const labelCls = 'block text-xs font-bold uppercase tracking-wide text-navy-400';

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

  // Cerrar con Escape y bloquear el scroll de fondo mientras está abierta.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

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

  if (!open) return null;

  const title = objective ? 'Editar objetivo SMS' : 'Nuevo objetivo SMS';
  const dialog = (
    <div
      className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center bg-navy/50 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full sm:max-w-xl max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl"
      >
        {/* Cabecera de marca: degradado navy + brillo primary */}
        <header className="relative isolate overflow-hidden bg-gradient-to-br from-navy via-navy to-[#0f1420] text-white px-5 py-4 rounded-t-3xl">
          <div className="absolute -right-10 -top-14 w-44 h-44 rounded-full bg-primary/30 blur-3xl -z-10" aria-hidden="true" />
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 border border-white/15 shrink-0">
              <span className="material-symbols-outlined text-xl text-primary-200">target</span>
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary-300 leading-none mb-1">SMS · Objetivos</p>
              <h2 className="font-black tracking-tight leading-tight text-lg">{title}</h2>
              <p className="text-xs text-navy-300 mt-1">Un objetivo SMART, vinculado a los KPI que lo miden.</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="shrink-0 -mr-1.5 -mt-1 size-9 flex items-center justify-center rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>
          </div>
        </header>

        {/* Cuerpo */}
        <div className="px-5 py-5 space-y-4">
          <label className={labelCls}>
            Objetivo (SMART)
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Ej. Reducir los eventos de pérdida de enlace C2 en 10% anual"
              required
              autoFocus
              className={`${inputCls} normal-case font-normal text-navy`}
            />
          </label>

          <label className={labelCls}>
            Cómo se mide <span className="normal-case font-normal text-navy-300">· opcional</span>
            <textarea
              value={form.metricDescription}
              onChange={(e) => setForm((f) => ({ ...f, metricDescription: e.target.value }))}
              rows={2}
              placeholder="Qué dato concreto se sigue y cómo se verifica"
              className={`${inputCls} normal-case font-normal text-navy`}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className={labelCls}>
              Meta <span className="normal-case font-normal text-navy-300">· opcional</span>
              <input type="number" step="any" value={form.targetValue} onChange={(e) => setForm((f) => ({ ...f, targetValue: e.target.value }))} placeholder="0" className={`${inputCls} normal-case font-normal text-navy`} />
            </label>
            <label className={labelCls}>
              Unidad
              <input value={form.targetUnit} onChange={(e) => setForm((f) => ({ ...f, targetUnit: e.target.value }))} placeholder="%, eventos…" className={`${inputCls} normal-case font-normal text-navy`} />
            </label>
          </div>

          {/* KPI que lo miden */}
          <div className="border-t border-navy-100 pt-4">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-navy-400">
                <span className="material-symbols-outlined text-base text-blue-500">monitoring</span>
                KPI que lo miden
              </p>
              {form.indicatorIds.length > 0 && (
                <span className="text-[11px] font-bold text-primary-700 bg-primary-50 rounded-full px-2 py-0.5">
                  {form.indicatorIds.length} vinculado{form.indicatorIds.length > 1 ? 's' : ''}
                </span>
              )}
            </div>
            {indicators.length === 0 ? (
              <p className="flex items-start gap-1.5 text-xs text-navy-500 bg-navy-50 rounded-xl px-3 py-2">
                <span className="material-symbols-outlined text-[14px] text-navy-300 shrink-0 mt-0.5">info</span>
                Aún no hay KPI. Crea KPI propios en <b className="font-semibold">Indicadores (SPI/KPI)</b> (cada uno mide un peligro) y vincúlalos aquí.
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

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="min-h-[44px] px-4 rounded-xl border border-navy-200 text-sm font-bold text-navy-600 hover:bg-navy-50 transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy || !form.title.trim()}
              className="min-h-[44px] px-4 rounded-xl text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">save</span>
              {busy ? 'Guardando…' : objective ? 'Guardar cambios' : 'Crear objetivo'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );

  return typeof document === 'undefined' ? null : createPortal(dialog, document.body);
}
