'use client';

// Skylog V2.0 — Área de Capacitación y Examen, página propia (a pedido del
// usuario, distinta de /sms — que solo tiene cronograma de asistencia sin
// calificar). Vista utilitaria mínima (PRODUCT.md: sin superficie visual
// propia de F1 todavía). Cubre: configurar el examen, administrar el banco
// de preguntas, presentar el examen y ver el roster de cumplimiento.

import { useEffect, useState, useCallback } from 'react';

const STATUS_LABELS = {
  not_configured: 'Sin examen configurado',
  ok: 'Aprobado',
  pending: 'Pendiente',
  failed: 'Reprobado — sin intentos',
};

function ComplianceBadge({ compliance }) {
  if (!compliance) return null;
  const color = compliance.status === 'ok' ? '#1a7f37' : compliance.status === 'failed' ? '#8a2f10' : '#a3aab8';
  return (
    <span style={{ color, fontWeight: 600, fontSize: 13 }}>
      {STATUS_LABELS[compliance.status] || compliance.status}
      {compliance.attemptsRemaining != null && ` · ${compliance.attemptsRemaining} intento(s) restante(s)`}
    </span>
  );
}

function ExamForm({ questions, onSubmit, busy }) {
  const [answers, setAnswers] = useState(() => questions.map(() => null));
  const allAnswered = answers.every((a) => a !== null);

  return (
    <div style={{ border: '1px solid #e2e4e9', borderRadius: 8, padding: 12, marginTop: 12 }}>
      <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Examen</p>
      {questions.map((q, i) => (
        <div key={q.id} style={{ marginBottom: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 600 }}>
            {i + 1}. {q.question}
          </p>
          {q.options.map((opt, oi) => (
            <label key={oi} style={{ display: 'block', fontSize: 13, marginLeft: 8 }}>
              <input
                type="radio"
                name={`q${i}`}
                checked={answers[i] === oi}
                onChange={() => setAnswers((prev) => prev.map((a, idx) => (idx === i ? oi : a)))}
              />{' '}
              {opt}
            </label>
          ))}
        </div>
      ))}
      <button type="button" disabled={busy || !allAnswered} onClick={() => onSubmit(answers)}>
        Enviar examen
      </button>
    </div>
  );
}

export default function CapacitacionPage() {
  const [context, setContext] = useState(null);
  const [organizationId, setOrganizationId] = useState('');
  const [examConfig, setExamConfig] = useState({ passingScore: 70, maxAttempts: 3, recurrence: 'mensual', recurrenceDays: '', startDate: '' });
  const [questionForm, setQuestionForm] = useState({ question: '', options: ['', ''], correctIndex: 0 });
  const [questions, setQuestions] = useState([]);
  const [examData, setExamData] = useState(null);
  const [result, setResult] = useState(null);
  const [roster, setRoster] = useState(null);
  const [myCompliance, setMyCompliance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const loadContext = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/duty/context');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error cargando contexto');
      setContext(data);
      if (data.organizations?.length && !organizationId) setOrganizationId(data.organizations[0].id);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadContext();
  }, [loadContext]);

  const currentOrg = context?.organizations?.find((o) => o.id === organizationId);
  const isManager = !!currentOrg?.isDutyManager;

  const loadCompliance = useCallback(async () => {
    if (!organizationId) return;
    try {
      const res = await fetch('/api/capacitacion/compliance?organizationId=' + organizationId);
      const data = await res.json();
      if (!res.ok) return;
      if (data.roster) setRoster(data.roster);
      else setMyCompliance(data.compliance);
    } catch {
      // silencioso
    }
  }, [organizationId]);

  useEffect(() => {
    loadCompliance();
  }, [loadCompliance]);

  const loadQuestions = useCallback(async () => {
    if (!organizationId || !isManager) return;
    try {
      const res = await fetch('/api/capacitacion/questions?organizationId=' + organizationId);
      const data = await res.json();
      if (res.ok) setQuestions(data.questions || []);
    } catch {
      // silencioso
    }
  }, [organizationId, isManager]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const loadExam = useCallback(async () => {
    if (!organizationId) return;
    try {
      const res = await fetch('/api/capacitacion/exam?organizationId=' + organizationId);
      const data = await res.json();
      if (res.ok) setExamData(data);
    } catch {
      // silencioso
    }
  }, [organizationId]);

  useEffect(() => {
    loadExam();
  }, [loadExam]);

  async function saveExamConfig(e) {
    e.preventDefault();
    if (!organizationId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/capacitacion/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          passingScore: Number(examConfig.passingScore),
          maxAttempts: Number(examConfig.maxAttempts),
          recurrence: examConfig.recurrence,
          recurrenceDays: examConfig.recurrenceDays ? Number(examConfig.recurrenceDays) : null,
          startDate: examConfig.startDate,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar la configuración');
      await Promise.all([loadExam(), loadCompliance()]);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function addQuestion(e) {
    e.preventDefault();
    if (!organizationId || !questionForm.question || questionForm.options.some((o) => !o)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/capacitacion/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          question: questionForm.question,
          options: questionForm.options,
          correctIndex: Number(questionForm.correctIndex),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al agregar la pregunta');
      setQuestionForm({ question: '', options: ['', ''], correctIndex: 0 });
      await loadQuestions();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitExam(answers) {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/capacitacion/exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, answers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al enviar el examen');
      setResult(data.grading);
      await Promise.all([loadExam(), loadCompliance()]);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div style={{ padding: 24 }}>Cargando…</div>;

  if (!context?.personId) {
    return (
      <div style={{ padding: 24, maxWidth: 480 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1A202C' }}>Capacitación y Examen</h1>
        <p style={{ marginTop: 12, color: '#702810' }}>
          Esta cuenta no tiene todavía un registro de Persona vinculado — no se puede acceder
          hasta que exista.
        </p>
      </div>
    );
  }

  const inputStyle = { display: 'block', marginTop: 4, marginBottom: 10, padding: 8, width: '100%', boxSizing: 'border-box' };

  return (
    <div style={{ padding: 24, maxWidth: 720, fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1A202C' }}>Capacitación y Examen</h1>
      <p style={{ fontSize: 13, color: '#a3aab8', marginTop: 4 }}>Skylog V2.0 — área propia, con examen calificado</p>

      {context.organizations?.length > 1 && (
        <select style={inputStyle} value={organizationId} onChange={(e) => setOrganizationId(e.target.value)}>
          {context.organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name} ({o.role})
            </option>
          ))}
        </select>
      )}

      {error && <p style={{ color: '#8a2f10', fontSize: 13 }}>{error}</p>}

      {!isManager && myCompliance && (
        <p>
          Mi estado: <ComplianceBadge compliance={myCompliance} />
        </p>
      )}

      {isManager && (
        <>
          <form onSubmit={saveExamConfig} style={{ marginTop: 12, marginBottom: 20, padding: 12, border: '1px solid #e2e4e9', borderRadius: 8 }}>
            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Configurar el examen</p>
            <label style={{ fontSize: 12 }}>Umbral de aprobación (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              style={inputStyle}
              value={examConfig.passingScore}
              onChange={(e) => setExamConfig((f) => ({ ...f, passingScore: e.target.value }))}
            />
            <label style={{ fontSize: 12 }}>Intentos por ciclo</label>
            <input
              type="number"
              min="1"
              style={inputStyle}
              value={examConfig.maxAttempts}
              onChange={(e) => setExamConfig((f) => ({ ...f, maxAttempts: e.target.value }))}
            />
            <select style={inputStyle} value={examConfig.recurrence} onChange={(e) => setExamConfig((f) => ({ ...f, recurrence: e.target.value }))}>
              <option value="semanal">Semanal</option>
              <option value="quincenal">Quincenal</option>
              <option value="mensual">Mensual</option>
              <option value="personalizado">Personalizado (días)</option>
            </select>
            {examConfig.recurrence === 'personalizado' && (
              <input
                type="number"
                min="1"
                placeholder="Días del ciclo"
                style={inputStyle}
                value={examConfig.recurrenceDays}
                onChange={(e) => setExamConfig((f) => ({ ...f, recurrenceDays: e.target.value }))}
              />
            )}
            <label style={{ fontSize: 12 }}>Fecha de inicio del cronograma</label>
            <input
              type="date"
              style={inputStyle}
              value={examConfig.startDate}
              onChange={(e) => setExamConfig((f) => ({ ...f, startDate: e.target.value }))}
              required
            />
            <button type="submit" disabled={busy}>
              Guardar configuración
            </button>
          </form>

          <form onSubmit={addQuestion} style={{ marginBottom: 20, padding: 12, border: '1px solid #e2e4e9', borderRadius: 8 }}>
            <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Banco de preguntas ({questions.length})</p>
            <input
              style={inputStyle}
              placeholder="Pregunta"
              value={questionForm.question}
              onChange={(e) => setQuestionForm((f) => ({ ...f, question: e.target.value }))}
            />
            {questionForm.options.map((opt, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                <input
                  style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
                  placeholder={`Opción ${i + 1}`}
                  value={opt}
                  onChange={(e) =>
                    setQuestionForm((f) => ({ ...f, options: f.options.map((o, oi) => (oi === i ? e.target.value : o)) }))
                  }
                />
                <label style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                  <input
                    type="radio"
                    name="correct"
                    checked={questionForm.correctIndex === i}
                    onChange={() => setQuestionForm((f) => ({ ...f, correctIndex: i }))}
                  />{' '}
                  Correcta
                </label>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setQuestionForm((f) => ({ ...f, options: [...f.options, ''] }))}
              style={{ marginBottom: 8 }}
            >
              + Opción
            </button>
            <button type="submit" disabled={busy}>
              Agregar pregunta
            </button>
          </form>

          {roster && (
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Cumplimiento del equipo</p>
              {roster.map((r) => (
                <p key={r.personId} style={{ fontSize: 13 }}>
                  {r.fullName} — <ComplianceBadge compliance={r.compliance} />
                </p>
              ))}
            </div>
          )}
        </>
      )}

      {examData?.compliance?.status === 'pending' && examData.questions?.length > 0 && (
        <ExamForm questions={examData.questions} onSubmit={submitExam} busy={busy} />
      )}
      {examData && examData.exam && examData.compliance?.status !== 'pending' && (
        <p style={{ fontSize: 13, marginTop: 12 }}>
          Estado del examen: <ComplianceBadge compliance={examData.compliance} />
        </p>
      )}
      {result && (
        <p style={{ fontSize: 13, marginTop: 8, fontWeight: 600, color: result.passed ? '#1a7f37' : '#8a2f10' }}>
          Resultado: {result.score.toFixed(1)}% ({result.correctCount}/{result.total}) —{' '}
          {result.passed ? 'Aprobado' : 'No aprobado'}
        </p>
      )}
    </div>
  );
}
