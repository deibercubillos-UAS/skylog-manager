'use client';

// Skylog V2.0 — SMS, Evaluación de Riesgo, Fase 2 del Asistente de
// implantación ("Gestión del riesgo" — 40-sms.md §5.2). Construido sobre 4
// APIs ya existentes que hasta ahora no tenían ninguna pantalla:
// `/api/sms/risk-matrix`, `/api/sms/barriers`, `/api/sms/hazards`,
// `/api/sms/risk-assessments`. Orden real de uso: Barreras y Matriz se
// configuran primero (los Peligros las referencian), luego se registran y
// evalúan Peligros contra la matriz ya configurada — la zona
// inicial/residual SIEMPRE se calcula server-side (evaluateInternalHazard,
// packages/domain), nunca se confía en el valor que arme el cliente.
//
// Sin semilla OACI Doc 9859: packages/domain/internalRiskMatrix.js documenta
// por qué (regla V1 — no fabricar contenido normativo sin fuente verificada)
// — cada organización configura su matriz desde cero.
import { useCallback, useEffect, useState } from 'react';
import { SectionHero, StatCard } from '../../_components/SectionHero';
import { Field, Button } from '@skylog/ui';
import {
  DEFAULT_PROBABILITY_LEVELS,
  DEFAULT_SEVERITY_LEVELS,
  buildDefaultTolerability,
  ZONE_STYLES,
  ZONE_CYCLE,
} from '@/lib/v2/riskMatrixDefaults';
import { fetchDutyContext, pickOrganizationId } from '@/lib/v2/dutyContextClient';

const ZONES = Object.entries(ZONE_STYLES).map(([value, s]) => ({ value, label: s.label, color: s.soft }));

function zoneMeta(zone) {
  return ZONES.find((z) => z.value === zone) || { label: zone || '—', color: 'bg-navy-100 text-navy-400' };
}

function LevelListEditor({ label, levels, onChange }) {
  const [code, setCode] = useState('');
  const [text, setText] = useState('');

  function add() {
    if (!code.trim() || !text.trim()) return;
    onChange([...levels, { code: code.trim(), label: text.trim() }]);
    setCode('');
    setText('');
  }

  return (
    <div>
      <p className="text-xs font-semibold text-navy-500 mb-1.5">{label}</p>
      <div className="space-y-1 mb-2">
        {levels.map((l, i) => (
          <div key={l.code} className="flex items-center justify-between text-xs bg-navy-50 rounded-lg px-2 py-1">
            <span>
              <span className="font-mono text-navy-400">{l.code}</span> — {l.label}
            </span>
            <button type="button" onClick={() => onChange(levels.filter((_, j) => j !== i))} className="text-red-500">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        ))}
        {levels.length === 0 && <p className="text-xs text-navy-300">Sin niveles todavía.</p>}
      </div>
      <div className="flex gap-1.5">
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Código" className="w-16 text-xs border border-navy-200 rounded px-2 py-1" />
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Nombre del nivel" className="flex-1 text-xs border border-navy-200 rounded px-2 py-1" />
        <button type="button" onClick={add} className="text-xs text-primary-700 font-semibold px-2">
          Agregar
        </button>
      </div>
    </div>
  );
}

function RiskMatrixPanel({ organizationId, isManager }) {
  const [matrix, setMatrix] = useState(null);
  const [probabilityLevels, setProbabilityLevels] = useState([]);
  const [severityLevels, setSeverityLevels] = useState([]);
  const [tolerability, setTolerability] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [missing, setMissing] = useState(null);
  const [editing, setEditing] = useState(false); // una matriz ya guardada queda en modo vista hasta pulsar "Editar"

  const load = useCallback(async () => {
    if (!organizationId) return;
    const res = await fetch(`/api/sms/risk-matrix?organizationId=${organizationId}`);
    const data = await res.json();
    if (res.ok && data.riskMatrix) {
      setMatrix(data.riskMatrix);
      setProbabilityLevels(data.riskMatrix.probability_levels || []);
      setSeverityLevels(data.riskMatrix.severity_levels || []);
      setTolerability(data.riskMatrix.tolerability || []);
    }
  }, [organizationId]);

  useEffect(() => {
    load();
  }, [load]);

  function cellZone(pCode, sCode) {
    return tolerability.find((c) => c.probabilityCode === pCode && c.severityCode === sCode)?.zone || '';
  }

  function setCellZone(pCode, sCode, zone) {
    const rest = tolerability.filter((c) => !(c.probabilityCode === pCode && c.severityCode === sCode));
    setTolerability(zone ? [...rest, { probabilityCode: pCode, severityCode: sCode, zone }] : rest);
  }

  function cycleCellZone(pCode, sCode) {
    const current = cellZone(pCode, sCode);
    const next = ZONE_CYCLE[(ZONE_CYCLE.indexOf(current) + 1) % ZONE_CYCLE.length];
    setCellZone(pCode, sCode, next);
  }

  // Plantilla de referencia (src/lib/v2/riskMatrixDefaults.js) — disponible
  // desde el inicio para que la organización no parta de cero: puebla el
  // formulario (probabilidad/severidad/celdas), pero NO guarda sola — el
  // usuario la revisa, la ajusta a sus propios criterios y recién entonces
  // pulsa "Guardar matriz". Nunca se presenta como norma oficial (ver
  // comentario de riskMatrixDefaults.js).
  function loadTemplate() {
    setProbabilityLevels(DEFAULT_PROBABILITY_LEVELS.map((l) => ({ ...l })));
    setSeverityLevels(DEFAULT_SEVERITY_LEVELS.map((l) => ({ ...l })));
    setTolerability(buildDefaultTolerability());
  }

  async function handleSave() {
    setBusy(true);
    setError(null);
    setMissing(null);
    try {
      const res = await fetch('/api/sms/risk-matrix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, probabilityLevels, severityLevels, tolerability }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error guardando la matriz');
      setMatrix(data.riskMatrix);
      setEditing(false); // guardada → vuelve a modo vista
      if (!data.completeness?.complete) setMissing(data.completeness?.missing || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const hasLevels = probabilityLevels.length > 0 && severityLevels.length > 0;
  // Modo edición: solo el gestor, y solo si pulsó "Editar" o aún no hay matriz guardada
  // (primera configuración). Una vez guardada, queda en modo VISTA (solo lectura).
  const editMode = isManager && (editing || !matrix);

  // Cancelar edición: descarta los cambios y vuelve a lo guardado (modo vista).
  function cancelEdit() {
    if (matrix) {
      setProbabilityLevels(matrix.probability_levels || []);
      setSeverityLevels(matrix.severity_levels || []);
      setTolerability(matrix.tolerability || []);
    }
    setError(null);
    setMissing(null);
    setEditing(false);
  }

  return (
    <div className="rounded-2xl border border-navy-100 bg-gradient-to-br from-red-50 to-white overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-navy-50">
        <span className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0 shadow-sm bg-red-500 text-white">
          <span className="material-symbols-outlined text-xl">grid_view</span>
        </span>
        <div>
          <p className="text-sm font-bold text-navy">Matriz de riesgo</p>
          <p className="text-xs text-navy-400">Configurable por tu organización — niveles de probabilidad/severidad y tolerabilidad de cada combinación</p>
        </div>
        {isManager && matrix && !editing && (
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
              <span className="material-symbols-outlined text-[13px]">check_circle</span>
              Registrada
            </span>
            <Button onClick={() => setEditing(true)} className="text-xs px-3 py-1.5">
              <span className="material-symbols-outlined text-[16px] align-middle mr-1">edit</span>
              Editar
            </Button>
          </div>
        )}
      </div>

      {!matrix && !hasLevels && (
        <div className="mx-4 mt-4 mb-4 rounded-xl border border-dashed border-primary-200 bg-primary-50/50 p-5 text-center">
          <span className="material-symbols-outlined text-3xl text-primary-500">grid_view</span>
          <p className="text-xs font-semibold text-navy mt-1.5">Aún no configuras tu matriz de evaluación de riesgo</p>
          <p className="text-[11px] text-navy-400 max-w-md mx-auto mt-1">
            Puedes partir de una plantilla de referencia (5 niveles de probabilidad × 5 de severidad) y personalizarla luego —
            no es un formato oficial, es solo un punto de partida para que lo ajustes a tu organización.
          </p>
          {isManager && (
            <button
              type="button"
              onClick={loadTemplate}
              className="inline-flex items-center gap-1.5 mt-3 bg-primary hover:bg-primary-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
              Cargar plantilla de referencia
            </button>
          )}
        </div>
      )}

      {editMode && hasLevels && (
        <div className="px-4 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <LevelListEditor label="Niveles de probabilidad" levels={probabilityLevels} onChange={setProbabilityLevels} />
            <LevelListEditor label="Niveles de severidad" levels={severityLevels} onChange={setSeverityLevels} />
          </div>
        </div>
      )}

      {hasLevels && (
        <div className={`px-4 pb-4 ${isManager ? '' : 'pt-4'}`}>
          <div className="overflow-x-auto">
            <table className="border-collapse mx-auto">
              <thead>
                <tr>
                  <th className="p-1.5"></th>
                  {severityLevels.map((s) => (
                    <th key={s.code} className="p-1.5 text-center">
                      <p className="text-[10px] font-black text-navy-400">{s.code}</p>
                      <p className="text-[9px] font-semibold text-navy-300 max-w-[64px] truncate">{s.label}</p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {probabilityLevels.map((p) => (
                  <tr key={p.code}>
                    <td className="p-1.5 text-right pr-2">
                      <p className="text-[10px] font-black text-navy-400">{p.code}</p>
                      <p className="text-[9px] font-semibold text-navy-300 max-w-[80px] truncate">{p.label}</p>
                    </td>
                    {severityLevels.map((s) => {
                      const zone = cellZone(p.code, s.code);
                      const style = zone ? ZONE_STYLES[zone]?.solid : 'bg-navy-50 text-navy-300';
                      return (
                        <td key={s.code} className="p-1">
                          <button
                            type="button"
                            disabled={!editMode}
                            onClick={() => cycleCellZone(p.code, s.code)}
                            title={zone ? ZONE_STYLES[zone]?.label : 'Sin definir'}
                            className={`size-10 flex items-center justify-center rounded-lg text-[11px] font-black transition-all ${style} ${
                              editMode ? 'cursor-pointer hover:scale-105' : 'cursor-default'
                            }`}
                          >
                            {p.code}
                            {s.code}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-center gap-5 pt-3 mt-3 border-t border-navy-50">
            {Object.entries(ZONE_STYLES).map(([key, z]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className={`size-2.5 rounded-full ${z.dot}`} />
                <span className="text-[10px] font-semibold text-navy-400">{z.label}</span>
              </div>
            ))}
          </div>
          {editMode && <p className="text-center text-[10px] text-navy-300 pt-2">Clic en una celda para cambiar su zona de tolerabilidad</p>}

          {editMode && (
            <div className="pt-3 flex items-center gap-3">
              {error && <p className="text-xs text-red-600">{error}</p>}
              {missing && missing.length > 0 && <p className="text-xs text-amber-600">Faltan {missing.length} combinación(es) por definir.</p>}
              <div className="ml-auto flex items-center gap-2">
                {matrix && (
                  <Button variant="ghost" onClick={cancelEdit} disabled={busy} className="text-xs px-3 py-1.5">Cancelar</Button>
                )}
                <Button onClick={handleSave} disabled={busy} className="text-xs px-3 py-1.5">
                  {busy ? 'Guardando…' : 'Guardar matriz'}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function BarriersPanel({ organizationId, isManager, barriers, onCreated }) {
  const [form, setForm] = useState({ description: '', category: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/sms/barriers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, description: form.description, category: form.category || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error registrando la barrera');
      setForm({ description: '', category: '' });
      onCreated();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-navy-100 bg-gradient-to-br from-amber-50 to-white overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-navy-50">
        <span className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0 shadow-sm bg-amber-500 text-white">
          <span className="material-symbols-outlined text-xl">shield</span>
        </span>
        <div>
          <p className="text-sm font-bold text-navy">Barreras</p>
          <p className="text-xs text-navy-400">Controles/mitigaciones declarados por la organización — los peligros pueden asociarse a una</p>
        </div>
      </div>

      <div className="p-5 bg-white/60">
        {barriers.length === 0 ? (
          <p className="text-sm text-navy-300 mb-3">Sin barreras registradas todavía.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {barriers.map((b) => (
              <span key={b.id} className="flex items-center gap-1.5 text-xs font-medium bg-amber-50 text-amber-800 rounded-full px-3 py-1.5">
                <span className="material-symbols-outlined text-[14px] text-amber-500">shield</span>
                {b.description}
                {b.category && <span className="text-amber-500">· {b.category}</span>}
              </span>
            ))}
          </div>
        )}

        {isManager && (
          <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
            <Field
              label="Descripción"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Ej. Checklist pre-vuelo obligatorio"
              className="flex-1 min-w-[220px]"
              required
            />
            <Field label="Categoría (opcional)" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="w-48" />
            <Button type="submit" disabled={busy} className="mb-3 text-xs px-3 py-1.5">
              {busy ? 'Guardando…' : 'Agregar'}
            </Button>
          </form>
        )}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}

// Enlace de las listas de chequeo con el nivel de riesgo (FRAT): peso por paso
// + dos umbrales total→zona. La ejecución (puntaje por vuelo) ocurre en Despacho.
function ChecklistRiskPanel({ organizationId, isManager }) {
  const [checklists, setChecklists] = useState([]);
  const [weights, setWeights] = useState({}); // `${checklistId}:${position}` -> weight
  const [config, setConfig] = useState(null);
  const [tol, setTol] = useState('1');
  const [ina, setIna] = useState('3');
  const [open, setOpen] = useState(false);
  const [savingThr, setSavingThr] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    const [cardRes, listsRes] = await Promise.all([
      fetch(`/api/sms/risk-card?organizationId=${organizationId}`),
      fetch(`/api/checklists?organizationId=${organizationId}`),
    ]);
    const card = await cardRes.json();
    const lists = await listsRes.json();
    if (cardRes.ok) {
      setConfig(card.config);
      if (card.config) {
        setTol(String(card.config.tolerable_threshold));
        setIna(String(card.config.inaceptable_threshold));
      }
      const m = {};
      (card.weights || []).forEach((w) => { m[`${w.checklist_id}:${w.position}`] = w.weight; });
      setWeights(m);
    } else setError(card.error);
    if (listsRes.ok) setChecklists(lists.checklists || []);
  }, [organizationId]);

  useEffect(() => { load().catch((e) => setError(e.message)); }, [load]);

  const stepText = (s) => (typeof s === 'string' ? s : s?.text || String(s));
  const maxTotal = Object.values(weights).reduce((a, b) => a + (b > 0 ? b : 0), 0);
  const weightedCount = Object.keys(weights).length;
  const tolN = Number(tol);
  const inaN = Number(ina);

  async function saveThresholds() {
    setSavingThr(true); setError(null);
    try {
      const res = await fetch('/api/sms/risk-card', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, tolerableThreshold: tolN, inaceptableThreshold: inaN }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Error guardando los umbrales');
      setConfig(d.config);
    } catch (e) { setError(e.message); } finally { setSavingThr(false); }
  }

  async function saveWeight(checklistId, position, value) {
    const w = String(value).trim() === '' ? 0 : Number(value);
    if (!Number.isInteger(w) || w < 0) return;
    const key = `${checklistId}:${position}`;
    if ((weights[key] || 0) === w) return;
    setWeights((m) => { const n = { ...m }; if (w > 0) n[key] = w; else delete n[key]; return n; }); // optimista
    const res = await fetch('/api/sms/risk-card/weights', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId, checklistId, position, weight: w }),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error || 'No se pudo guardar el peso'); load(); }
  }

  const thresholdsValid = Number.isInteger(tolN) && tolN >= 0 && Number.isInteger(inaN) && inaN > tolN;

  return (
    <div className="rounded-2xl border border-navy-100 bg-gradient-to-br from-sky-50 to-white overflow-hidden">
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-3 px-5 py-4 border-b border-navy-50 text-left">
        <span className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0 shadow-sm bg-sky-500 text-white">
          <span className="material-symbols-outlined text-xl">rule</span>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-navy">Enlace con listas de chequeo</p>
          <p className="text-xs text-navy-400">Asigna un peso a cada paso; al despachar, las respuestas «no» suman y el total define la zona y el GO/NO-GO.</p>
        </div>
        <span className="material-symbols-outlined text-navy-300">{open ? 'expand_less' : 'expand_more'}</span>
      </button>

      {open && (
        <div className="p-5 bg-white/60 space-y-5">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}

          {/* Umbrales + mapa de zonas */}
          <div className="rounded-xl border border-navy-100 bg-white p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-navy-400 mb-2">Umbrales del puntaje</p>
            {isManager ? (
              <div className="flex flex-wrap items-end gap-3">
                <label className="text-xs text-navy-500">
                  Tolerable desde
                  <input type="number" min="0" value={tol} onChange={(e) => setTol(e.target.value)} className="mt-1 block w-24 text-sm border border-navy-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-300" />
                </label>
                <label className="text-xs text-navy-500">
                  Inaceptable desde
                  <input type="number" min="1" value={ina} onChange={(e) => setIna(e.target.value)} className="mt-1 block w-24 text-sm border border-navy-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary-300" />
                </label>
                <Button onClick={saveThresholds} disabled={savingThr || !thresholdsValid} className="text-sm">
                  {savingThr ? 'Guardando…' : 'Guardar umbrales'}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-navy-600">Tolerable desde <b>{config?.tolerable_threshold ?? '—'}</b> · Inaceptable desde <b>{config?.inaceptable_threshold ?? '—'}</b></p>
            )}
            {thresholdsValid && (
              <div className="flex flex-wrap gap-1.5 mt-3 text-[11px] font-semibold">
                <span className={`rounded-full px-2 py-0.5 ${zoneMeta('aceptable').color}`}>Aceptable: 0–{tolN - 1}</span>
                <span className={`rounded-full px-2 py-0.5 ${zoneMeta('tolerable').color}`}>Tolerable: {tolN}–{inaN - 1}</span>
                <span className={`rounded-full px-2 py-0.5 ${zoneMeta('inaceptable').color}`}>Inaceptable: ≥ {inaN}</span>
                <span className="rounded-full px-2 py-0.5 bg-navy-100 text-navy-500">Puntaje máximo posible: {maxTotal}</span>
              </div>
            )}
            {thresholdsValid && maxTotal > 0 && maxTotal < inaN && (
              <p className="text-[11px] text-amber-600 mt-2">El puntaje máximo posible ({maxTotal}) no alcanza el umbral inaceptable ({inaN}): ninguna combinación llegaría a NO-GO.</p>
            )}
          </div>

          {/* Pesos por lista */}
          {checklists.length === 0 ? (
            <p className="text-xs text-navy-400">No hay listas de chequeo. Créalas en <a className="underline" href="/listas-de-chequeo">Listas de chequeo</a> y vuelve para asignarles peso.</p>
          ) : (
            <div className="space-y-3">
              {!isManager && <p className="text-[11px] text-navy-400">Solo un gestor puede editar los pesos.</p>}
              {checklists.map((cl) => {
                const steps = Array.isArray(cl.steps) ? cl.steps : [];
                return (
                  <div key={cl.id} className="rounded-xl border border-navy-100 bg-white overflow-hidden">
                    <div className="px-4 py-2.5 bg-navy-50/40 border-b border-navy-50 flex items-center gap-2">
                      <span className="material-symbols-outlined text-base text-navy-400">{cl.icon || 'checklist'}</span>
                      <p className="text-sm font-semibold text-navy">{cl.name}</p>
                      <span className="text-[11px] text-navy-400">· {cl.category}</span>
                    </div>
                    {steps.length === 0 ? (
                      <p className="px-4 py-3 text-xs text-navy-300">Esta lista no tiene pasos.</p>
                    ) : (
                      <ul className="divide-y divide-navy-50">
                        {steps.map((s, i) => {
                          const key = `${cl.id}:${i}`;
                          const wv = weights[key] || 0;
                          return (
                            <li key={i} className="px-4 py-2 flex items-center gap-3">
                              <span className="text-sm text-navy-700 min-w-0 flex-1">{i + 1}. {stepText(s)}</span>
                              {isManager ? (
                                <input
                                  type="number" min="0" defaultValue={wv || ''} placeholder="0"
                                  onBlur={(e) => saveWeight(cl.id, i, e.target.value)}
                                  onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                                  className="w-16 shrink-0 text-sm text-center border border-navy-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-300"
                                  aria-label={`Peso del paso ${i + 1}`}
                                />
                              ) : (
                                <span className={`shrink-0 text-[11px] font-bold rounded-full px-2 py-0.5 ${wv > 0 ? 'bg-primary-50 text-primary-700' : 'text-navy-300'}`}>{wv > 0 ? `+${wv}` : '—'}</span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                );
              })}
              <p className="text-[11px] text-navy-400">{weightedCount} paso(s) con peso · el peso suma al puntaje cuando el piloto responde «no» en el despacho.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function HazardRow({ hazard, matrix, isManager, barriers, onEvaluated, onDeleted }) {
  const [expanded, setExpanded] = useState(false);
  const [form, setForm] = useState({ probabilityCode: '', severityCode: '', mitigation: '', residualProbabilityCode: '', residualSeverityCode: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleDelete() {
    if (!confirm(`¿Eliminar el peligro "${hazard.description.slice(0, 80)}"? También se borran su evaluación de riesgo y, en la Matriz de peligros, sus controles, avances y evidencias. No se puede deshacer.`)) return;
    const res = await fetch(`/api/sms/hazards/${hazard.id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setError(data.error || 'No se pudo eliminar el peligro');
    onDeleted();
  }

  const assessments = hazard.risk_assessments || [];
  const latest = assessments[assessments.length - 1];
  const barrier = barriers.find((b) => b.id === hazard.related_barrier_id);
  const probabilityLevels = matrix?.probability_levels || [];
  const severityLevels = matrix?.severity_levels || [];

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/sms/risk-assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hazardId: hazard.id,
          probabilityCode: form.probabilityCode,
          severityCode: form.severityCode,
          mitigation: form.mitigation || null,
          residualProbabilityCode: form.residualProbabilityCode || null,
          residualSeverityCode: form.residualSeverityCode || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error evaluando el peligro');
      setForm({ probabilityCode: '', severityCode: '', mitigation: '', residualProbabilityCode: '', residualSeverityCode: '' });
      setExpanded(false);
      onEvaluated();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="py-2.5 border-b border-navy-50 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 shadow-sm bg-violet-500 text-white mt-0.5">
            <span className="material-symbols-outlined text-[16px]">warning</span>
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-navy">{hazard.description}</p>
            <p className="text-xs text-navy-400">
              {hazard.source || 'observación'}
              {hazard.mission_type ? ` · ${hazard.mission_type}` : ''}
              {barrier ? ` · Barrera: ${barrier.description}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {latest ? (
            <>
              <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${zoneMeta(latest.initial_zone).color}`}>{zoneMeta(latest.initial_zone).label}</span>
              {latest.residual_zone && (
                <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ${zoneMeta(latest.residual_zone).color}`}>Residual: {zoneMeta(latest.residual_zone).label}</span>
              )}
            </>
          ) : (
            isManager && (
              <button type="button" onClick={() => setExpanded((v) => !v)} className="text-xs text-primary-700 hover:underline">
                {expanded ? 'Cerrar' : 'Evaluar'}
              </button>
            )
          )}
          {isManager && (
            <button type="button" onClick={handleDelete} className="w-7 h-7 flex items-center justify-center rounded-full text-red-500 hover:bg-red-50" aria-label="Eliminar peligro">
              <span className="material-symbols-outlined text-[16px]">delete</span>
            </button>
          )}
        </div>
      </div>

      {expanded && !latest && (
        <form onSubmit={handleSubmit} className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-3">
          {!matrix ? (
            <p className="text-xs text-amber-600 sm:col-span-2">Configura la matriz de riesgo antes de evaluar peligros.</p>
          ) : (
            <>
              <Field as="select" label="Probabilidad" value={form.probabilityCode} onChange={(e) => setForm((f) => ({ ...f, probabilityCode: e.target.value }))} required>
                <option value="">Selecciona…</option>
                {probabilityLevels.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.code} — {p.label}
                  </option>
                ))}
              </Field>
              <Field as="select" label="Severidad" value={form.severityCode} onChange={(e) => setForm((f) => ({ ...f, severityCode: e.target.value }))} required>
                <option value="">Selecciona…</option>
                {severityLevels.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.code} — {s.label}
                  </option>
                ))}
              </Field>
              <Field
                as="textarea"
                label="Mitigación (opcional)"
                value={form.mitigation}
                onChange={(e) => setForm((f) => ({ ...f, mitigation: e.target.value }))}
                rows={2}
                className="sm:col-span-2"
              />
              <Field as="select" label="Probabilidad residual (opcional)" value={form.residualProbabilityCode} onChange={(e) => setForm((f) => ({ ...f, residualProbabilityCode: e.target.value }))}>
                <option value="">—</option>
                {probabilityLevels.map((p) => (
                  <option key={p.code} value={p.code}>
                    {p.code} — {p.label}
                  </option>
                ))}
              </Field>
              <Field as="select" label="Severidad residual (opcional)" value={form.residualSeverityCode} onChange={(e) => setForm((f) => ({ ...f, residualSeverityCode: e.target.value }))}>
                <option value="">—</option>
                {severityLevels.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.code} — {s.label}
                  </option>
                ))}
              </Field>
              {error && <p className="text-xs text-red-600 sm:col-span-2">{error}</p>}
              <div className="sm:col-span-2 mb-3">
                <Button type="submit" disabled={busy} className="text-xs px-3 py-1.5">
                  {busy ? 'Guardando…' : 'Guardar evaluación'}
                </Button>
              </div>
            </>
          )}
        </form>
      )}
    </div>
  );
}

export default function RiesgosPage() {
  const [context, setContext] = useState(null);
  const [organizationId, setOrganizationId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [matrix, setMatrix] = useState(null);
  const [barriers, setBarriers] = useState([]);
  const [hazards, setHazards] = useState([]);

  const currentOrg = context?.organizations?.find((o) => o.id === organizationId);
  const isManager = currentOrg?.permissions?.['P2'] === 'edit';

  const loadMatrix = useCallback(async (orgId) => {
    if (!orgId) return;
    const res = await fetch(`/api/sms/risk-matrix?organizationId=${orgId}`);
    const data = await res.json();
    if (res.ok) setMatrix(data.riskMatrix);
  }, []);

  const loadBarriers = useCallback(async (orgId) => {
    if (!orgId) return;
    const res = await fetch(`/api/sms/barriers?organizationId=${orgId}`);
    const data = await res.json();
    if (res.ok) setBarriers(data.barriers || []);
  }, []);

  const loadHazards = useCallback(async (orgId) => {
    if (!orgId) return;
    const res = await fetch(`/api/sms/hazards?organizationId=${orgId}`);
    const data = await res.json();
    if (res.ok) setHazards(data.hazards || []);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchDutyContext();
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error cargando contexto');
        setContext(data);
        const firstOrgId = pickOrganizationId(data);
        setOrganizationId(firstOrgId);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!organizationId) return;
    loadMatrix(organizationId);
    loadBarriers(organizationId);
    loadHazards(organizationId);
  }, [organizationId, loadMatrix, loadBarriers, loadHazards]);

  if (loading) return <p className="text-sm text-navy-400">Cargando…</p>;

  if (!context?.personId) {
    return (
      <div>
        <SectionHero eyebrow="SMS" title="Tarjeta de riesgo" description="Matriz de riesgo, barreras y enlace con las listas de chequeo." />
        <p className="text-sm text-navy-400 mt-4">Esta cuenta no tiene todavía un registro de Persona vinculado.</p>
      </div>
    );
  }

  const evaluated = hazards.filter((h) => h.risk_assessments?.length).length;

  return (
    <div className="space-y-6">
      <SectionHero
        eyebrow="SMS"
        title="Tarjeta de riesgo"
        description="Matriz de tolerabilidad, barreras y el enlace de las listas de chequeo con el nivel de riesgo para decidir el GO/NO-GO al despachar."
      />

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard icon="shield" color="amber" label="Barreras" value={barriers.length} />
        <StatCard icon="warning" color="violet" label="Peligros registrados" value={hazards.length} />
        <StatCard icon="fact_check" color="emerald" label="Peligros evaluados" value={evaluated} />
      </div>

      <RiskMatrixPanel organizationId={organizationId} isManager={isManager} />
      <BarriersPanel organizationId={organizationId} isManager={isManager} barriers={barriers} onCreated={() => loadBarriers(organizationId)} />
      <ChecklistRiskPanel organizationId={organizationId} isManager={isManager} />

      <div className="rounded-2xl border border-navy-100 bg-gradient-to-br from-violet-50 to-white overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-navy-50">
          <span className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0 shadow-sm bg-violet-500 text-white">
            <span className="material-symbols-outlined text-xl">warning</span>
          </span>
          <div>
            <p className="text-sm font-bold text-navy">Peligros</p>
            <p className="text-xs text-navy-400">Evalúa contra la matriz de riesgo los peligros del catálogo. Los peligros se registran en <a className="underline" href="/sms/matriz-peligros">Matriz de peligros</a>.</p>
          </div>
        </div>

        <div className="p-5 bg-white/60">
          {hazards.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 text-center rounded-2xl border border-dashed border-navy-200 bg-navy-50/50 py-10 px-6">
              <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white shadow-sm text-navy-300">
                <span className="material-symbols-outlined text-2xl">warning</span>
              </span>
              <p className="text-sm font-semibold text-navy">Sin peligros registrados todavía</p>
              <p className="text-xs text-navy-400">Regístralos en <a className="underline" href="/sms/matriz-peligros">Matriz de peligros</a> y aquí los evalúas contra la matriz de riesgo.</p>
            </div>
          ) : (
            <div>
              {hazards.map((h) => (
                <HazardRow key={h.id} hazard={h} matrix={matrix} isManager={isManager} barriers={barriers} onEvaluated={() => loadHazards(organizationId)} onDeleted={() => loadHazards(organizationId)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
