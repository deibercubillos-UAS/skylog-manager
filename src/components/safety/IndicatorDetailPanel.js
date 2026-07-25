'use client';
import { useState, useMemo } from 'react';
import { toast } from '@/lib/toast';
import {
  MONTH_LABELS, periodsOfYear, computeRate, computeYearStats, suggestedTarget,
  DEFENSE_TYPE_LABELS, ACTION_STATUS_LABELS,
} from '@/lib/safetyIndicatorStats';

const emptyAction = () => ({ defense_type: '', root_cause: '', trigger_factor: '', action_plan: '', document_ref: '', execution_days: '', status: 'pendiente' });

function RateChart({ rates, alert1, alert2, alert3, target }) {
  const W = 640, H = 180, PAD = 24;
  const values = [...rates.filter(r => r !== null), alert1, alert2, alert3, target].filter(v => v !== null && v !== undefined);
  const max = Math.max(1, ...values) * 1.15;
  const x = (i) => PAD + (i / 11) * (W - PAD * 2);
  const y = (v) => H - PAD - (Math.min(v, max) / max) * (H - PAD * 2);

  const linePath = rates.map((r, i) => r === null ? null : `${x(i)},${y(r)}`).filter(Boolean).join(' L ');
  const hLine = (v, color, label) => v === null || v === undefined ? null : (
    <g>
      <line x1={PAD} y1={y(v)} x2={W - PAD} y2={y(v)} stroke={color} strokeWidth="1" strokeDasharray="4 3" />
      <text x={W - PAD + 4} y={y(v) + 3} fontSize="8" fill={color} fontWeight="bold">{label}</text>
    </g>
  );

  return (
    <svg viewBox={`0 0 ${W + 40} ${H}`} className="w-full h-auto">
      {hLine(alert3, '#dc2626', '3DE')}
      {hLine(alert2, '#d97706', '2DE')}
      {hLine(alert1, '#eab308', '1DE')}
      {hLine(target, '#16a34a', 'Meta')}
      {linePath && <path d={`M ${linePath}`} fill="none" stroke="#4f46e5" strokeWidth="2" />}
      {rates.map((r, i) => r === null ? null : <circle key={i} cx={x(i)} cy={y(r)} r="2.5" fill="#4f46e5" />)}
      {MONTH_LABELS.map((m, i) => <text key={m} x={x(i)} y={H - 6} fontSize="7" fill="#94a3b8" textAnchor="middle">{m}</text>)}
    </svg>
  );
}

export default function IndicatorDetailPanel({ indicator, onClose, onSuccess }) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [saving, setSaving] = useState(false);
  const [newAction, setNewAction] = useState(emptyAction());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState(indicator.description || '');
  const [savingDesc, setSavingDesc] = useState(false);

  const monthly = useMemo(() => indicator.monthly || [], [indicator.monthly]);
  const actions = indicator.actions || [];

  const [rowsDraft, setRowsDraft] = useState(() => {
    const periods = periodsOfYear(year);
    return periods.map(p => {
      const row = monthly.find(m => m.period === p);
      return { period: p, denominator_value: row?.denominator_value ?? '', event_count: row?.event_count ?? '' };
    });
  });

  const switchYear = (y) => {
    setYear(y);
    const periods = periodsOfYear(y);
    setRowsDraft(periods.map(p => {
      const row = monthly.find(m => m.period === p);
      return { period: p, denominator_value: row?.denominator_value ?? '', event_count: row?.event_count ?? '' };
    }));
  };

  const rates = rowsDraft.map(r => r.denominator_value === '' && r.event_count === '' ? null : computeRate(Number(r.event_count) || 0, Number(r.denominator_value) || 0));
  const prevYearStats = useMemo(() => computeYearStats(monthly, year - 1), [monthly, year]);
  const target = suggestedTarget(prevYearStats?.avg, indicator.expected_improvement_pct);

  const saveMonths = async () => {
    setSaving(true);
    try {
      await Promise.all(rowsDraft.map(r => {
        if (r.denominator_value === '' && r.event_count === '') return null;
        return fetch(`/api/safety/indicators/${indicator.id}/monthly`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ period: r.period, denominator_value: r.denominator_value, event_count: r.event_count }),
        });
      }));
      toast.success('Datos mensuales guardados.');
      onSuccess();
    } catch (err) {
      toast.error('Error al guardar los datos mensuales.');
    } finally {
      setSaving(false);
    }
  };

  const addAction = async () => {
    if (!newAction.action_plan.trim()) { toast.warn('El plan de acción es obligatorio.'); return; }
    try {
      const res = await fetch(`/api/safety/indicators/${indicator.id}/actions`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newAction),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al agregar el plan de acción.');
      toast.success('Plan de acción agregado.');
      setNewAction(emptyAction());
      onSuccess();
    } catch (err) {
      toast.error('Error: ' + err.message);
    }
  };

  const removeAction = async (id) => {
    try {
      await fetch(`/api/safety/indicators/actions/${id}`, { method: 'DELETE' });
      toast.success('Plan de acción eliminado.');
      onSuccess();
    } catch {
      toast.error('Error al eliminar.');
    }
  };

  const saveDescription = async () => {
    setSavingDesc(true);
    try {
      const res = await fetch(`/api/safety/indicators/${indicator.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: descDraft }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Error al guardar la descripción.');
      toast.success('Descripción guardada.');
      setEditingDesc(false);
      onSuccess();
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setSavingDesc(false);
    }
  };

  const deleteIndicator = async () => {
    try {
      await fetch(`/api/safety/indicators/${indicator.id}`, { method: 'DELETE' });
      toast.success('Indicador eliminado.');
      onClose();
      onSuccess();
    } catch {
      toast.error('Error al eliminar el indicador.');
    }
  };

  const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-900";

  return (
    <aside className="fixed z-[300] bg-white flex flex-col text-left
      inset-x-0 bottom-0 top-14 rounded-t-3xl
      md:inset-y-0 md:left-auto md:right-0 md:top-0 md:rounded-none md:w-[95vw] md:max-w-[900px]
      shadow-[0_-4px_30px_rgba(0,0,0,0.14)] md:shadow-2xl
      animate-in slide-in-from-bottom md:slide-in-from-right duration-300">

      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-slate-400 truncate">Seguridad SMS</span>
          <span className="material-symbols-outlined text-sm text-slate-300 shrink-0">chevron_right</span>
          <span className="text-xs font-black text-slate-900 truncate">{indicator.name}</span>
        </div>
        <button type="button" onClick={onClose}
          className="size-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all active:scale-95 shrink-0">
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-5">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2">
          {editingDesc ? (
            <div className="space-y-2">
              <textarea rows={2} className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-700"
                placeholder="¿Qué mide y por qué se hace seguimiento a este indicador?"
                value={descDraft} onChange={e => setDescDraft(e.target.value)} />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => { setEditingDesc(false); setDescDraft(indicator.description || ''); }} className="text-[10.5px] font-black text-slate-500 uppercase">Cancelar</button>
                <button type="button" onClick={saveDescription} disabled={savingDesc} className="text-[10.5px] font-black text-orange-600 uppercase disabled:opacity-50">
                  {savingDesc ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs font-semibold text-slate-500 leading-snug">
                {indicator.description || <span className="italic text-slate-400">Sin descripción — explica qué mide y por qué se hace seguimiento.</span>}
              </p>
              <button type="button" onClick={() => setEditingDesc(true)} className="shrink-0 text-slate-400 hover:text-orange-600">
                <span className="material-symbols-outlined text-base">edit</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button type="button" onClick={() => switchYear(year - 1)} className="size-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200">
            <span className="material-symbols-outlined text-base">chevron_left</span>
          </button>
          <p className="text-sm font-black text-slate-800 w-16 text-center">{year}</p>
          <button type="button" onClick={() => switchYear(year + 1)} className="size-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200">
            <span className="material-symbols-outlined text-base">chevron_right</span>
          </button>
          <span className="text-[10px] font-semibold text-slate-400 ml-2">
            Líneas de alerta y meta calculadas desde {year - 1} {prevYearStats ? '' : '— faltan meses de ese año para calcularlas'}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4">
          <RateChart rates={rates} alert1={prevYearStats?.alert1} alert2={prevYearStats?.alert2} alert3={prevYearStats?.alert3} target={target} />
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[480px]">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
                <th className="px-3 py-2">Mes</th><th className="px-3 py-2">Denominador</th><th className="px-3 py-2">Eventos</th><th className="px-3 py-2">Tasa /1000</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rowsDraft.map((r, i) => (
                <tr key={r.period}>
                  <td className="px-3 py-1.5 text-xs font-bold text-slate-500">{MONTH_LABELS[i]}</td>
                  <td className="px-3 py-1.5">
                    <input type="number" min="0" step="any" className={inputCls} value={r.denominator_value}
                      onChange={e => setRowsDraft(prev => prev.map((row, idx) => idx === i ? { ...row, denominator_value: e.target.value } : row))} />
                  </td>
                  <td className="px-3 py-1.5">
                    <input type="number" min="0" step="1" className={inputCls} value={r.event_count}
                      onChange={e => setRowsDraft(prev => prev.map((row, idx) => idx === i ? { ...row, event_count: e.target.value } : row))} />
                  </td>
                  <td className="px-3 py-1.5 text-xs font-black text-slate-700">{rates[i] !== null ? rates[i].toFixed(3) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="p-3 border-t border-slate-100 flex justify-end">
            <button type="button" onClick={saveMonths} disabled={saving}
              className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wide disabled:opacity-50">
              <span className="material-symbols-outlined text-sm">save</span>
              {saving ? 'Guardando...' : `Guardar ${year}`}
            </button>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Planes de acción — defensa, causa raíz y desencadenante</p>
          {actions.map(a => (
            <div key={a.id} className="flex items-start gap-2 border border-slate-100 rounded-xl p-3">
              <div className="flex-1 space-y-0.5">
                <p className="text-xs font-bold text-slate-800">{a.action_plan}</p>
                <p className="text-[10.5px] text-slate-400">
                  {a.defense_type && `${DEFENSE_TYPE_LABELS[a.defense_type]} · `}
                  {a.root_cause && `Causa: ${a.root_cause} · `}
                  {a.execution_days ? `${a.execution_days} días` : ''}
                </p>
                <p className="text-[10px] font-black uppercase" style={{ color: a.status === 'completado' ? '#16a34a' : a.status === 'en_progreso' ? '#4f46e5' : '#d97706' }}>
                  {ACTION_STATUS_LABELS[a.status]}
                </p>
              </div>
              <button type="button" onClick={() => removeAction(a.id)} className="text-slate-300 hover:text-red-500">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
          ))}
          <div className="border border-dashed border-slate-200 rounded-xl p-3 space-y-2">
            <textarea rows={2} className={inputCls + ' text-sm'} placeholder="Nuevo plan de acción..."
              value={newAction.action_plan} onChange={e => setNewAction({ ...newAction, action_plan: e.target.value })} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <select className={inputCls} value={newAction.defense_type} onChange={e => setNewAction({ ...newAction, defense_type: e.target.value })}>
                <option value="">Defensa</option>
                <option value="T">Tecnología</option><option value="R">Reglamentación</option><option value="E">Entrenamiento</option>
              </select>
              <input className={inputCls} placeholder="Causa raíz" value={newAction.root_cause} onChange={e => setNewAction({ ...newAction, root_cause: e.target.value })} />
              <input className={inputCls} placeholder="Desencadenante" value={newAction.trigger_factor} onChange={e => setNewAction({ ...newAction, trigger_factor: e.target.value })} />
              <input type="number" className={inputCls} placeholder="Días" value={newAction.execution_days} onChange={e => setNewAction({ ...newAction, execution_days: e.target.value })} />
            </div>
            <button type="button" onClick={addAction} className="text-xs font-black text-orange-600 hover:underline uppercase">Agregar plan de acción</button>
          </div>
        </div>
      </div>

      <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between gap-3">
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500">¿Eliminar este indicador?</span>
            <button type="button" onClick={deleteIndicator} className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase">Sí, eliminar</button>
            <button type="button" onClick={() => setConfirmDelete(false)} className="px-3 py-2 rounded-lg border border-slate-200 text-slate-500 font-black text-xs uppercase">Cancelar</button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 font-black text-xs uppercase tracking-wide transition-all">
            <span className="material-symbols-outlined text-base">delete</span>Eliminar indicador
          </button>
        )}
        <button type="button" onClick={onClose}
          className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-black text-xs uppercase tracking-wide hover:bg-slate-50 transition-all">
          Cerrar
        </button>
      </div>
    </aside>
  );
}
