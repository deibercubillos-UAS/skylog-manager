'use client';

// Skylog V2.0 — Despacho: asistente paso a paso para una misión.
//   Verificaciones → UNA lista de chequeo por pantalla (cada una se llena y avanza a la siguiente)
//   → Evaluación de riesgos (si la organización configuró su matriz) → Confirmar.
// El navegador solo recoge respuestas: POST /api/despacho vuelve a evaluar TODO antes de escribir.
// Pensado para usarse en campo, de pie y quizá con guantes: botones grandes, un solo tema por
// pantalla, salto automático al siguiente paso sin responder y barra de acción fija abajo.
import { useEffect, useMemo, useRef, useState } from 'react';
import { evaluateDispatchRisk, buildChecklistItems } from '@skylog/domain';

const GATE_STYLE = {
  ok: { icon: 'check_circle', cls: 'text-emerald-600', row: 'bg-emerald-50/70 border-emerald-100' },
  warn: { icon: 'warning', cls: 'text-amber-600', row: 'bg-amber-50 border-amber-100' },
  info: { icon: 'info', cls: 'text-sky-600', row: 'bg-sky-50/70 border-sky-100' },
  blocked: { icon: 'block', cls: 'text-red-600', row: 'bg-red-50 border-red-100' },
};
const GATE_TITLE = { schedule: 'Programación', duty: 'Tiempos de servicio', training: 'Capacitación', aircraft: 'Aeronave', insurance: 'Póliza RCE', checklists: 'Listas de chequeo', risk_matrix: 'Matriz de riesgo' };
const ZONE_STYLE = { aceptable: 'bg-emerald-50 text-emerald-700', tolerable: 'bg-amber-50 text-amber-700', inaceptable: 'bg-red-50 text-red-700' };
const OPTIONS = [
  { value: 'si', label: 'Sí', on: 'bg-emerald-500 text-white border-emerald-500 shadow-sm shadow-emerald-500/30' },
  { value: 'no', label: 'No', on: 'bg-red-500 text-white border-red-500 shadow-sm shadow-red-500/30' },
  { value: 'na', label: 'N/A', on: 'bg-navy text-white border-navy shadow-sm' },
];

export default function Wizard({ mission, onCancel, onDone }) {
  const [prep, setPrep] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [risk, setRisk] = useState({ probabilityCode: '', severityCode: '', mitigation: '', residualProbabilityCode: '', residualSeverityCode: '' });
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [setupNeeded, setSetupNeeded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/despacho/prepare?missionId=${mission.id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error preparando el despacho');
        setPrep(data);
      } catch (e) {
        setLoadError(e.message);
      }
    })();
  }, [mission.id]);

  // Un paso por pantalla: verificaciones, cada lista, riesgos (si aplica) y confirmar.
  const steps = useMemo(() => {
    if (!prep) return [];
    return [
      { key: 'gates', label: 'Verificaciones', icon: 'verified' },
      ...prep.checklists.map((list) => ({ key: `list:${list.id}`, kind: 'list', list, label: list.name, icon: list.icon || 'checklist' })),
      ...(prep.riskMatrix ? [{ key: 'risk', label: 'Riesgos', icon: 'warning' }] : []),
      { key: 'confirm', label: 'Confirmar', icon: 'rocket_launch' },
    ];
  }, [prep]);
  const step = steps[stepIndex];
  const nextStep = steps[stepIndex + 1];

  // Siempre al inicio al cambiar de paso: la lista nueva empieza arriba.
  useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [stepIndex]);

  const overall = useMemo(() => (prep ? buildChecklistItems(prep.checklists, answers) : { complete: true, missing: 0, noCount: 0, items: [] }), [prep, answers]);
  const riskState = useMemo(() => (prep?.riskMatrix ? evaluateDispatchRisk({ tolerability: prep.riskMatrix.tolerability, ...risk }) : null), [prep, risk]);

  // ¿Está completo el paso actual?
  const listProgress = (list) => {
    const given = answers[list.id] || [];
    const done = list.steps.filter((_, p) => ['si', 'no', 'na'].includes(given[p]?.value)).length;
    return { done, total: list.steps.length, complete: done === list.steps.length };
  };
  const stepComplete = !step ? false : step.key === 'gates' ? !!prep.canDispatch : step.kind === 'list' ? listProgress(step.list).complete : step.key === 'risk' ? !!riskState?.ok : true;

  const setAnswer = (listId, position, patch) =>
    setAnswers((prev) => {
      const list = [...(prev[listId] || [])];
      list[position] = { ...(list[position] || {}), ...patch };
      return { ...prev, [listId]: list };
    });

  async function submit() {
    setBusy(true);
    setSubmitError(null);
    setSetupNeeded(false);
    try {
      const res = await fetch('/api/despacho', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ missionId: mission.id, answers, risk: prep.riskMatrix ? risk : undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.setup) setSetupNeeded(true);
        throw new Error(data.error || 'No se pudo despachar');
      }
      onDone(data);
    } catch (e) {
      setSubmitError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (loadError) return <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{loadError}</p>;
  if (!prep) return <p className="text-sm text-navy-400">Verificando la misión…</p>;

  const pct = Math.round((stepIndex / (steps.length - 1)) * 100);
  const aircraft = prep.mission.aircraft ? `${prep.mission.aircraft.model?.brand || ''} ${prep.mission.aircraft.model?.model || ''} · ${prep.mission.aircraft.serial_number}`.trim() : 'Sin aeronave';

  // Texto del botón principal: dice a dónde lleva.
  let nextLabel = 'Continuar';
  if (step.kind === 'list') {
    const p = listProgress(step.list);
    nextLabel = !p.complete ? `Faltan ${p.total - p.done}` : nextStep?.kind === 'list' ? `Siguiente lista: ${nextStep.label}` : nextStep?.key === 'risk' ? 'Continuar a riesgos' : 'Revisar y confirmar';
  } else if (step.key === 'gates') {
    nextLabel = !prep.canDispatch ? 'Hay verificaciones que bloquean' : nextStep?.kind === 'list' ? `Empezar: ${nextStep.label}` : nextStep?.key === 'risk' ? 'Continuar a riesgos' : 'Revisar y confirmar';
  } else if (step.key === 'risk') {
    nextLabel = stepComplete ? 'Revisar y confirmar' : 'Completa la evaluación';
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Encabezado: misión + dónde voy */}
      <div className="bg-white rounded-2xl border border-navy-100 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-primary-600">Paso {stepIndex + 1} de {steps.length}</p>
            <p className="text-lg font-black text-navy truncate">{step.label}</p>
            <p className="text-xs text-navy-400 truncate">
              {prep.mission.name} · {prep.mission.zone} · {aircraft}
            </p>
          </div>
          <button type="button" onClick={onCancel} className="shrink-0 text-xs font-semibold px-3 py-2 rounded-full bg-navy-50 text-navy-600 hover:bg-navy-100">
            Salir
          </button>
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-navy-50 overflow-hidden">
          <div className="h-full bg-primary transition-all duration-300" style={{ width: `${pct}%` }} />
        </div>
        <ol className="flex items-center gap-1 mt-3 overflow-x-auto">
          {steps.map((s, i) => {
            const isDone = i < stepIndex;
            return (
              <li key={s.key} title={s.label} className={`flex items-center justify-center w-7 h-7 rounded-full shrink-0 text-[11px] font-bold ${i === stepIndex ? 'bg-primary text-white' : isDone ? 'bg-emerald-100 text-emerald-700' : 'bg-navy-50 text-navy-300'}`}>
                {isDone ? <span className="material-symbols-outlined text-sm">check</span> : i + 1}
              </li>
            );
          })}
        </ol>
      </div>

      {step.key === 'gates' && <GatesStep prep={prep} />}

      {step.kind === 'list' && (
        <ChecklistStep
          key={step.key}
          list={step.list}
          position={prep.checklists.findIndex((c) => c.id === step.list.id) + 1}
          total={prep.checklists.length}
          answers={answers[step.list.id] || []}
          progress={listProgress(step.list)}
          onAnswer={(p, patch) => setAnswer(step.list.id, p, patch)}
        />
      )}

      {step.key === 'risk' && <RiskStep matrix={prep.riskMatrix} risk={risk} setRisk={setRisk} state={riskState} />}

      {step.key === 'confirm' && <ConfirmStep prep={prep} answers={answers} overall={overall} riskState={riskState} submitError={submitError} setupNeeded={setupNeeded} />}

      {/* Barra de acción fija: el botón principal siempre al alcance del pulgar */}
      <div className="fixed bottom-0 inset-x-0 z-30 border-t border-navy-100 bg-white/95 backdrop-blur px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <button type="button" onClick={() => setStepIndex((i) => Math.max(0, i - 1))} disabled={stepIndex === 0 || busy} className="min-h-[48px] px-5 rounded-xl border border-navy-200 text-sm font-semibold text-navy-600 disabled:opacity-40 hover:bg-navy-50">
            Atrás
          </button>
          {step.key !== 'confirm' ? (
            <button type="button" disabled={!stepComplete} onClick={() => setStepIndex((i) => i + 1)} className="flex-1 min-h-[48px] rounded-xl text-sm font-bold bg-primary text-white disabled:bg-navy-100 disabled:text-navy-400 hover:opacity-90 transition-colors">
              {nextLabel} {stepComplete && '→'}
            </button>
          ) : (
            <button type="button" disabled={busy} onClick={submit} className="flex-1 min-h-[48px] rounded-xl text-sm font-bold bg-emerald-600 text-white disabled:opacity-60 hover:opacity-90">
              {busy ? 'Despachando…' : 'Despachar misión'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function GatesStep({ prep }) {
  // Lo que bloquea, primero.
  const order = { blocked: 0, warn: 1, info: 2, ok: 3 };
  const gates = [...prep.gates].sort((a, b) => order[a.status] - order[b.status]);
  return (
    <div className="space-y-2">
      {gates.map((g) => {
        const st = GATE_STYLE[g.status];
        return (
          <div key={g.id} className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${st.row}`}>
            <span className={`material-symbols-outlined text-2xl ${st.cls}`}>{st.icon}</span>
            <div>
              <p className="text-sm font-bold text-navy">
                {GATE_TITLE[g.id] || g.id}
                {g.status === 'blocked' && <span className="ml-2 text-[11px] font-black text-red-700">BLOQUEA</span>}
              </p>
              <p className="text-xs text-navy-500 mt-0.5">{g.message}</p>
            </div>
          </div>
        );
      })}
      {!prep.canDispatch && <p className="text-sm text-red-700 bg-red-50 rounded-xl px-4 py-3">No se puede despachar mientras haya verificaciones que bloquean. Resuélvelas y vuelve a intentarlo.</p>}
    </div>
  );
}

// Una lista completa por pantalla. Tras cada respuesta salta al siguiente paso sin responder.
function ChecklistStep({ list, position, total, answers, progress, onAnswer }) {
  const refs = useRef([]);
  const doneRef = useRef(null);

  const answer = (p, value) => {
    onAnswer(p, { value });
    if (value === 'no') return; // con "No" se queda para dejar la nota
    // Salta al siguiente sin responder (de este en adelante; si no hay, al primero pendiente).
    const given = answers.map((a) => a?.value);
    given[p] = value;
    let next = list.steps.findIndex((_, i) => i > p && !given[i]);
    if (next === -1) next = list.steps.findIndex((_, i) => !given[i]);
    setTimeout(() => {
      const target = next === -1 ? doneRef.current : refs.current[next];
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  };

  const noCount = answers.filter((a) => a?.value === 'no').length;
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl border border-navy-100 p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-navy-400">
            Lista {position} de {total}
            {list.version && ` · v${list.version}`}
          </p>
          <p className="text-xs font-bold text-navy">
            {progress.done}/{progress.total} respondidos
          </p>
        </div>
        <div className="mt-2 h-2 rounded-full bg-navy-50 overflow-hidden">
          <div className={`h-full transition-all duration-300 ${progress.complete ? 'bg-emerald-500' : 'bg-primary'}`} style={{ width: `${(progress.done / progress.total) * 100}%` }} />
        </div>
      </div>

      <ul className="space-y-2">
        {list.steps.map((text, p) => {
          const a = answers[p];
          const state = a?.value;
          return (
            <li
              key={p}
              ref={(el) => (refs.current[p] = el)}
              className={`bg-white rounded-2xl border p-4 transition-colors ${state === 'no' ? 'border-red-200 bg-red-50/40' : state ? 'border-emerald-100' : 'border-navy-100'}`}
            >
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold shrink-0 ${state ? 'bg-emerald-100 text-emerald-700' : 'bg-navy-50 text-navy-400'}`}>
                  {state ? <span className="material-symbols-outlined text-sm">check</span> : p + 1}
                </span>
                <p className="text-[15px] leading-snug text-navy font-medium">{typeof text === 'string' ? text : text?.text}</p>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3">
                {OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => answer(p, o.value)}
                    aria-pressed={state === o.value}
                    className={`min-h-[48px] rounded-xl border text-sm font-bold transition-all ${state === o.value ? o.on : 'bg-white text-navy-500 border-navy-200 hover:bg-navy-50 active:scale-[0.98]'}`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              {state === 'no' && (
                <input
                  autoFocus
                  value={a.note || ''}
                  onChange={(e) => onAnswer(p, { note: e.target.value })}
                  placeholder="¿Qué encontraste? (opcional, queda en el registro)"
                  className="mt-3 w-full text-sm border border-red-200 rounded-xl px-3 py-2.5 bg-white"
                />
              )}
            </li>
          );
        })}
      </ul>

      <div ref={doneRef} className={`rounded-2xl px-4 py-3 text-sm ${progress.complete ? 'bg-emerald-50 text-emerald-700' : 'bg-navy-50 text-navy-400'}`}>
        {progress.complete ? (
          <>
            <strong>Lista completa.</strong>
            {noCount > 0 ? ` Marcaste ${noCount} paso(s) en "No": quedan registrados.` : ' Todo en orden.'} Usa el botón de abajo para continuar.
          </>
        ) : (
          `Faltan ${progress.total - progress.done} paso(s) por responder.`
        )}
      </div>
    </div>
  );
}

function ConfirmStep({ prep, answers, overall, riskState, submitError, setupNeeded }) {
  const warns = prep.gates.filter((g) => g.status === 'warn').length;
  const flagged = overall.items.filter((i) => i.value === 'no');
  return (
    <div className="space-y-3">
      <div className="bg-white rounded-2xl border border-navy-100 p-4 space-y-2">
        <p className="text-sm font-bold text-navy">Resumen del despacho</p>
        <p className="text-xs text-navy-400">
          Al confirmar queda la constancia (verificaciones, listas y riesgo) y la misión pasa a <strong>despachada</strong>. Si no tenías un período de servicio abierto, se inicia uno automáticamente.
        </p>
        <ul className="text-sm text-navy-500 space-y-1 pt-1">
          <li>✓ Verificaciones: {prep.gates.filter((g) => g.status === 'ok').length} en orden{warns > 0 ? `, ${warns} aviso(s)` : ''}</li>
          {prep.checklists.map((c) => {
            const given = answers[c.id] || [];
            const nos = given.filter((a) => a?.value === 'no').length;
            return (
              <li key={c.id}>
                ✓ {c.name}: {c.steps.length} paso(s){nos > 0 ? <span className="text-red-600 font-semibold"> · {nos} en "No"</span> : ''}
              </li>
            );
          })}
          {riskState && (
            <li>
              ✓ Riesgo inicial{' '}
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ZONE_STYLE[riskState.initialZone] || ''}`}>{riskState.initialZone || '—'}</span>
              {riskState.needsMitigation ? ` → residual ${riskState.residualZone}` : ''}
            </li>
          )}
        </ul>
      </div>

      {flagged.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
          <p className="text-sm font-bold text-red-700">Pasos que marcaste en "No"</p>
          <ul className="mt-1 text-xs text-red-700 space-y-0.5">
            {flagged.map((f) => (
              <li key={`${f.checklist_id}-${f.position}`}>
                • {f.checklist_name}: {f.step_text}
                {f.note ? ` — ${f.note}` : ''}
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-red-600 mt-2">No bloquea el despacho, pero queda registrado. Si algo no está en condiciones, corrígelo antes de volar.</p>
        </div>
      )}

      {submitError && (
        <div className={`rounded-2xl px-4 py-3 text-sm ${setupNeeded ? 'bg-amber-50 border border-amber-200 text-amber-800' : 'bg-red-50 text-red-700'}`}>
          {setupNeeded && <p className="font-bold mb-1">Falta una configuración del servidor</p>}
          <p>{submitError}</p>
        </div>
      )}
    </div>
  );
}

function RiskStep({ matrix, risk, setRisk, state }) {
  const set = (patch) => setRisk((r) => ({ ...r, ...patch }));
  const opts = (levels) =>
    (levels || []).map((l) => (
      <option key={l.code} value={l.code}>
        {l.code} — {l.label}
      </option>
    ));
  const selectCls = 'mt-1 w-full min-h-[48px] text-sm border border-navy-200 rounded-xl px-3 bg-white';
  return (
    <div className="bg-white rounded-2xl border border-navy-100 p-4 space-y-3">
      <p className="text-xs text-navy-400">Evalúa el riesgo de la operación de hoy contra la matriz de tu organización.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block text-xs font-semibold text-navy-500">
          Probabilidad
          <select value={risk.probabilityCode} onChange={(e) => set({ probabilityCode: e.target.value })} className={selectCls}>
            <option value="">Elige…</option>
            {opts(matrix.probabilityLevels)}
          </select>
        </label>
        <label className="block text-xs font-semibold text-navy-500">
          Gravedad
          <select value={risk.severityCode} onChange={(e) => set({ severityCode: e.target.value })} className={selectCls}>
            <option value="">Elige…</option>
            {opts(matrix.severityLevels)}
          </select>
        </label>
      </div>

      {state?.initialZone && (
        <p className={`text-sm font-semibold rounded-xl px-4 py-3 ${ZONE_STYLE[state.initialZone] || 'bg-navy-50 text-navy-500'}`}>
          Riesgo {state.initialZone}
          {state.initialZone === 'tolerable' && ' — puedes registrar barreras si quieres (opcional).'}
          {state.initialZone === 'inaceptable' && ' — debes mitigarlo antes de despachar.'}
        </p>
      )}

      {(state?.initialZone === 'tolerable' || state?.initialZone === 'inaceptable') && (
        <label className="block text-xs font-semibold text-navy-500">
          Barreras / mitigaciones {state.initialZone === 'inaceptable' ? '(obligatorio)' : '(opcional)'}
          <textarea value={risk.mitigation} onChange={(e) => set({ mitigation: e.target.value })} rows={3} className="mt-1 w-full text-sm border border-navy-200 rounded-xl px-3 py-2.5" />
        </label>
      )}

      {state?.needsMitigation && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block text-xs font-semibold text-navy-500">
            Probabilidad residual
            <select value={risk.residualProbabilityCode} onChange={(e) => set({ residualProbabilityCode: e.target.value })} className={selectCls}>
              <option value="">Elige…</option>
              {opts(matrix.probabilityLevels)}
            </select>
          </label>
          <label className="block text-xs font-semibold text-navy-500">
            Gravedad residual
            <select value={risk.residualSeverityCode} onChange={(e) => set({ residualSeverityCode: e.target.value })} className={selectCls}>
              <option value="">Elige…</option>
              {opts(matrix.severityLevels)}
            </select>
          </label>
        </div>
      )}

      {state && !state.ok && risk.probabilityCode && risk.severityCode && (
        <ul className="text-xs text-red-600 space-y-0.5">
          {state.errors.map((e) => (
            <li key={e}>• {e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
