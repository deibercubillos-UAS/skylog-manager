'use client';
import { useState, useEffect } from 'react';
import { toast } from '@/lib/toast';
import {
  DEFAULT_PROBABILITY_LEVELS, DEFAULT_SEVERITY_LEVELS, buildDefaultTolerability, ZONE_META,
} from '@/lib/safetyRiskDefaults';

const PROB_CODES = ['5', '4', '3', '2', '1'];
const SEV_CODES = ['A', 'B', 'C', 'D', 'E'];
const ZONE_CYCLE = ['aceptable', 'tolerable', 'inaceptable'];

export default function RiskMatrixEditor({ probability, severity, tolerability, onSaved }) {
  const isConfigured = probability.length > 0 && severity.length > 0;
  const [editing, setEditing] = useState(!isConfigured);
  const [prob, setProb] = useState(probability);
  const [sev, setSev] = useState(severity);
  const [zones, setZones] = useState(tolerability);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setProb(probability); setSev(severity); setZones(tolerability); }, [probability, severity, tolerability]);

  const zoneOf = (probCode, sevCode) => zones.find(z => z.probability_code === probCode && z.severity_code === sevCode)?.zone || 'aceptable';

  const cycleZone = (probCode, sevCode) => {
    const current = zoneOf(probCode, sevCode);
    const next = ZONE_CYCLE[(ZONE_CYCLE.indexOf(current) + 1) % ZONE_CYCLE.length];
    setZones(prev => {
      const rest = prev.filter(z => !(z.probability_code === probCode && z.severity_code === sevCode));
      return [...rest, { probability_code: probCode, severity_code: sevCode, zone: next }];
    });
  };

  const updateLevel = (list, setList, code, field, value) => {
    setList(list.map(l => l.code === code ? { ...l, [field]: value } : l));
  };

  const loadDefaults = () => {
    setProb(DEFAULT_PROBABILITY_LEVELS.map(l => ({ ...l, dimension: 'probabilidad' })));
    setSev(DEFAULT_SEVERITY_LEVELS.map(l => ({ ...l, dimension: 'gravedad' })));
    setZones(buildDefaultTolerability());
  };

  const save = async () => {
    if (prob.length !== 5 || sev.length !== 5) { toast.warn('Faltan niveles de probabilidad o gravedad.'); return; }
    setSaving(true);
    try {
      const scales = [
        ...prob.map(l => ({ dimension: 'probabilidad', code: l.code, order_index: l.order_index, label: l.label, description: l.description })),
        ...sev.map(l => ({ dimension: 'gravedad', code: l.code, order_index: l.order_index, label: l.label, description: l.description })),
      ];
      const res = await fetch('/api/safety/risk-config', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scales, tolerability: zones }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar la matriz.');
      toast.success('Matriz de riesgo guardada.');
      setEditing(false);
      onSaved();
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isConfigured && !editing) return null; // el padre muestra el estado vacío con el CTA

  if (!isConfigured) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-8 text-center space-y-4">
        <span className="material-symbols-outlined text-4xl text-orange-500">grid_view</span>
        <p className="text-sm font-black text-slate-800">Aún no configuras tu matriz de evaluación de riesgo</p>
        <p className="text-xs font-semibold text-slate-500 max-w-md mx-auto">
          Puedes partir de la matriz estándar OACI (Doc. 9859) y personalizarla luego — el explotador UAS
          puede ajustar los criterios de probabilidad, gravedad y tolerabilidad a su propia organización.
        </p>
        <button type="button" onClick={loadDefaults}
          className="inline-flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wide shadow-lg shadow-orange-600/20 transition-all active:scale-95">
          <span className="material-symbols-outlined text-base">auto_awesome</span>
          Cargar matriz estándar OACI
        </button>
        {prob.length > 0 && (
          <div className="pt-2">
            <button type="button" onClick={save} disabled={saving}
              className="text-xs font-black text-orange-600 hover:underline uppercase tracking-wide disabled:opacity-50">
              {saving ? 'Guardando...' : 'Confirmar y guardar'}
            </button>
          </div>
        )}
      </div>
    );
  }

  const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold text-slate-500">Matriz de evaluación y tolerabilidad del riesgo — personalizable</p>
        {!editing ? (
          <button type="button" onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-xs font-black text-orange-600 hover:text-orange-800 uppercase tracking-wide">
            <span className="material-symbols-outlined text-sm">edit</span>Editar matriz
          </button>
        ) : (
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => { setEditing(false); setProb(probability); setSev(severity); setZones(tolerability); }}
              className="text-xs font-black text-slate-400 hover:text-slate-600 uppercase tracking-wide">
              Cancelar
            </button>
            <button type="button" onClick={save} disabled={saving}
              className="flex items-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wide disabled:opacity-50">
              <span className="material-symbols-outlined text-sm">save</span>
              {saving ? 'Guardando...' : 'Guardar matriz'}
            </button>
          </div>
        )}
      </div>

      {editing && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Probabilidad</p>
            {PROB_CODES.map(code => {
              const l = prob.find(p => p.code === code);
              if (!l) return null;
              return (
                <div key={code} className="flex items-center gap-2">
                  <span className="size-6 shrink-0 flex items-center justify-center rounded-md bg-slate-100 text-[11px] font-black text-slate-500">{code}</span>
                  <input className={inputCls} value={l.label} onChange={e => updateLevel(prob, setProb, code, 'label', e.target.value)} />
                  <input className={inputCls + ' flex-1'} value={l.description || ''} placeholder="Criterio"
                    onChange={e => updateLevel(prob, setProb, code, 'description', e.target.value)} />
                </div>
              );
            })}
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Gravedad</p>
            {SEV_CODES.map(code => {
              const l = sev.find(s => s.code === code);
              if (!l) return null;
              return (
                <div key={code} className="flex items-center gap-2">
                  <span className="size-6 shrink-0 flex items-center justify-center rounded-md bg-slate-100 text-[11px] font-black text-slate-500">{code}</span>
                  <input className={inputCls} value={l.label} onChange={e => updateLevel(sev, setSev, code, 'label', e.target.value)} />
                  <input className={inputCls + ' flex-1'} value={l.description || ''} placeholder="Criterio"
                    onChange={e => updateLevel(sev, setSev, code, 'description', e.target.value)} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 overflow-x-auto">
        <table className="border-collapse mx-auto">
          <thead>
            <tr>
              <th className="p-2"></th>
              {SEV_CODES.map(sc => (
                <th key={sc} className="p-2 text-center">
                  <p className="text-[10px] font-black text-slate-400">{sc}</p>
                  <p className="text-[9px] font-bold text-slate-400 max-w-[70px] truncate">{sev.find(s => s.code === sc)?.label}</p>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PROB_CODES.map(pc => (
              <tr key={pc}>
                <td className="p-2 text-right pr-3">
                  <p className="text-[10px] font-black text-slate-400">{pc}</p>
                  <p className="text-[9px] font-bold text-slate-400 max-w-[90px] truncate">{prob.find(p => p.code === pc)?.label}</p>
                </td>
                {SEV_CODES.map(sc => {
                  const z = zoneOf(pc, sc);
                  const meta = ZONE_META[z];
                  return (
                    <td key={sc} className="p-1">
                      <button type="button" disabled={!editing} onClick={() => cycleZone(pc, sc)}
                        className={`size-12 flex items-center justify-center rounded-lg font-black text-xs transition-all ${editing ? 'cursor-pointer hover:scale-105' : 'cursor-default'}`}
                        style={{ background: meta.bg, color: meta.color }}
                        title={meta.label}>
                        {pc}{sc}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex items-center justify-center gap-5 pt-3 border-t border-slate-100 mt-3">
          {Object.entries(ZONE_META).map(([key, m]) => (
            <div key={key} className="flex items-center gap-1.5">
              <span className="size-3 rounded" style={{ background: m.color }} />
              <span className="text-[10px] font-bold text-slate-500">{m.label}</span>
            </div>
          ))}
        </div>
        {editing && <p className="text-center text-[10px] font-semibold text-slate-400 pt-2">Clic en una celda para cambiar su zona de tolerabilidad</p>}
      </div>
    </div>
  );
}
