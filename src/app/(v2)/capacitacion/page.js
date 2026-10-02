'use client';

// Skylog V2.0 — Capacitación: página única de ingreso para CUALQUIER
// miembro (piloto o gestor) — revisa el material de apoyo (si lo hay) y
// presenta el examen correspondiente, sin importar si es de Operación, SMS
// o Mantenimiento. Reemplaza las 3 páginas por pista
// (operacional/mantenimiento/seguridad-operacional) + el dashboard viejo de
// tarjetas con contadores — a pedido explícito del usuario
// (2026-09-26): "quiero que los pilotos tengan una sola pagina de ingreso
// para realizar la verificación de material (si lo hay), y para presentar
// la evaluación pertinente, sin importar si es de operación, sms o
// mantenimiento".
//
// La creación de evaluaciones, la carga de material y el roster de
// cumplimiento de otros miembros viven aparte, en
// `/capacitacion/administracion` (solo gestores) — un gestor que también
// vuela sigue viendo su propio cumplimiento aquí, con un acceso directo a
// Administración arriba.
import { useCallback, useEffect, useState } from 'react';
import { SectionHero } from '../_components/SectionHero';
import { Button } from '@skylog/ui';
import { TRAINING_TYPES, TRAINING_TYPE_LABELS } from '@/lib/v2/training';

const TRACK_ICON = { operaciones: 'flight', mantenimiento: 'build', seguridad_operacional: 'shield' };
const TRACK_TILE = {
  operaciones: 'bg-blue-500 text-white',
  mantenimiento: 'bg-amber-500 text-white',
  seguridad_operacional: 'bg-red-500 text-white',
};

const STATUS_LABELS = {
  not_configured: 'Sin examen configurado',
  ok: 'Aprobado',
  pending: 'Pendiente',
  failed: 'Reprobado — sin intentos',
  overdue: 'Vencido',
};

const STATUS_BADGE = {
  ok: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  failed: 'bg-red-50 text-red-700',
  overdue: 'bg-red-50 text-red-700',
  not_configured: 'bg-navy-50 text-navy-400',
};

function fmtDate(d) {
  if (!d) return '—';
  return new Date(`${d}T00:00:00`).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function ExamForm({ questions, onSubmit, busy }) {
  const [answers, setAnswers] = useState(() => questions.map(() => null));
  const allAnswered = answers.every((a) => a !== null);

  return (
    <div className="bg-navy-50/60 rounded-xl p-4 mt-3">
      <p className="text-sm font-semibold text-navy mb-3">Examen</p>
      {questions.map((q, i) => (
        <div key={q.id} className="mb-4">
          <p className="text-sm font-medium text-navy mb-1">
            {i + 1}. {q.question}
          </p>
          {q.options.map((opt, oi) => (
            <label key={oi} className="flex items-center gap-2 text-sm text-navy-500 ml-2">
              <input type="radio" name={`q${i}`} checked={answers[i] === oi} onChange={() => setAnswers((prev) => prev.map((a, idx) => (idx === i ? oi : a)))} />
              {opt}
            </label>
          ))}
        </div>
      ))}
      <Button disabled={!allAnswered || busy} onClick={() => onSubmit(answers)}>
        {busy ? 'Calificando…' : 'Enviar examen'}
      </Button>
    </div>
  );
}

function EvaluationRow({ evaluation, compliance, onError, onGraded }) {
  const [examQuestions, setExamQuestions] = useState(null);
  const [examBusy, setExamBusy] = useState(false);
  const [examResult, setExamResult] = useState(null);

  const hasMaterial = !!evaluation.material_path;
  const materialHref = `/api/capacitacion/material?evaluationId=${evaluation.id}`;
  const canAttempt = compliance?.status === 'pending' || compliance?.status === 'overdue';

  async function handleStartExam() {
    onError(null);
    const res = await fetch(`/api/capacitacion/exam?evaluationId=${evaluation.id}`);
    const data = await res.json();
    if (!res.ok) {
      onError(data.error);
      return;
    }
    setExamQuestions(data.questions || []);
    if (!data.questions?.length) onError('Esta evaluación todavía no tiene preguntas configuradas.');
  }

  async function handleSubmitExam(answers) {
    setExamBusy(true);
    onError(null);
    try {
      const res = await fetch('/api/capacitacion/exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evaluationId: evaluation.id, answers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error calificando el examen');
      setExamResult(data.grading);
      setExamQuestions(null);
      await onGraded();
    } catch (e) {
      onError(e.message);
    } finally {
      setExamBusy(false);
    }
  }

  return (
    <div className="border border-navy-100 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-navy">{evaluation.title}</p>
          <p className="text-xs text-navy-400 mt-0.5">Fecha límite: {fmtDate(evaluation.due_date)}</p>
        </div>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${STATUS_BADGE[compliance?.status] || 'bg-navy-50 text-navy-400'}`}>
          {STATUS_LABELS[compliance?.status] || '—'}
          {compliance?.attemptsRemaining != null && ` · ${compliance.attemptsRemaining} intento(s)`}
        </span>
      </div>

      {hasMaterial && (
        <div className="flex items-start justify-between gap-3 bg-navy-50/60 rounded-xl p-3 mt-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-navy truncate">{evaluation.material_title}</p>
            {evaluation.material_description && <p className="text-xs text-navy-400 mt-0.5">{evaluation.material_description}</p>}
          </div>
          <a href={materialHref} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs font-bold text-primary hover:underline whitespace-nowrap">
            Ver material
          </a>
        </div>
      )}

      {canAttempt && !examQuestions && (
        <div className="mt-3">
          <Button onClick={handleStartExam}>Presentar examen</Button>
        </div>
      )}

      {examResult && (
        <div className={`text-sm rounded-lg px-3 py-2 mt-3 ${examResult.passed ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
          Resultado: {examResult.score}% — {examResult.passed ? 'Aprobado' : 'Reprobado'}
        </div>
      )}

      {examQuestions?.length > 0 && <ExamForm questions={examQuestions} onSubmit={handleSubmitExam} busy={examBusy} />}
    </div>
  );
}

function TrackCard({ type, organizationId, onError }) {
  const [evaluations, setEvaluations] = useState([]);
  const [compliances, setCompliances] = useState({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!organizationId) return;
    const res = await fetch(`/api/capacitacion/compliance?organizationId=${organizationId}&type=${type}`);
    const data = await res.json();
    if (res.ok) {
      setEvaluations(data.evaluations || []);
      setCompliances(data.compliances || {});
    }
    setLoading(false);
  }, [organizationId, type]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="bg-white rounded-2xl border border-navy-100 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-navy-50">
        <span className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 shadow-sm ${TRACK_TILE[type]}`}>
          <span className="material-symbols-outlined text-xl">{TRACK_ICON[type]}</span>
        </span>
        <p className="text-sm font-bold text-navy">{TRAINING_TYPE_LABELS[type]}</p>
      </div>

      <div className="p-5 space-y-3">
        {loading ? (
          <p className="text-sm text-navy-300">Cargando…</p>
        ) : evaluations.length === 0 ? (
          <p className="text-sm text-navy-300">Sin evaluaciones configuradas todavía.</p>
        ) : (
          evaluations.map((evaluation) => (
            <EvaluationRow key={evaluation.id} evaluation={evaluation} compliance={compliances[evaluation.id]} onError={onError} onGraded={load} />
          ))
        )}
      </div>
    </div>
  );
}

export default function CapacitacionInicio() {
  const [context, setContext] = useState(null);
  const [organizationId, setOrganizationId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const currentOrg = context?.organizations?.find((o) => o.id === organizationId);
  const isManager = !!currentOrg?.isDutyManager;

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/duty/context');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error cargando contexto');
        setContext(data);
        setOrganizationId(data.organizations?.[0]?.id || '');
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p className="text-sm text-navy-400">Cargando…</p>;

  if (!context?.personId) {
    return (
      <div>
        <SectionHero eyebrow="Documentación" title="Capacitación" description="Material de estudio y evaluaciones — Operación, Mantenimiento y Seguridad Operacional." />
        <p className="text-sm text-navy-400 mt-4">Esta cuenta no tiene todavía un registro de Persona vinculado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHero
        eyebrow="Documentación"
        title="Capacitación"
        description="Revisa el material de apoyo y presenta la evaluación correspondiente — Operación, Mantenimiento y Seguridad Operacional."
        cta={
          isManager && (
            <a href="/capacitacion/administracion">
              <Button>
                <span className="material-symbols-outlined text-base align-middle mr-1">admin_panel_settings</span>
                Administración
              </Button>
            </a>
          )
        }
      />

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {TRAINING_TYPES.map((type) => (
          <TrackCard key={type} type={type} organizationId={organizationId} onError={setError} />
        ))}
      </div>
    </div>
  );
}
