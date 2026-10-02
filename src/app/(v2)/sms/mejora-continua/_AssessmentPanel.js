'use client';

// Skylog V2.0 — SMS-D: diligenciar una autoevaluación GAP — checklist Sí/No
// por pregunta, con responsable/plazo/estado/comentarios cuando la
// respuesta es "No" (hallazgo). No exige responder el 100% para guardar.
import { useCallback, useEffect, useState } from 'react';
import { Panel, Button } from '@skylog/ui';

export default function AssessmentPanel({ open, onClose, organizationId, assessment, onSaved }) {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({}); // question_id -> { response, comments, responsible, status, evidenceDate }
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    if (!assessment?.id || !organizationId) return;
    setLoading(true);
    setSaved(false);
    const [questionsRes, detailRes] = await Promise.all([
      fetch(`/api/sms/gap/questions?organizationId=${organizationId}`),
      fetch(`/api/sms/gap/assessments/${assessment.id}`),
    ]);
    const [questionsData, detailData] = await Promise.all([questionsRes.json(), detailRes.json()]);
    if (questionsRes.ok) setQuestions(questionsData.questions || []);
    if (detailRes.ok) {
      const map = {};
      for (const r of detailData.responses || []) {
        map[r.question_id] = { response: r.response, comments: r.comments || '', responsible: r.responsible || '', status: r.status, evidenceDate: r.evidence_date || '' };
      }
      setAnswers(map);
    }
    setLoading(false);
  }, [assessment?.id, organizationId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  function setAnswer(questionId, patch) {
    setAnswers((a) => ({ ...a, [questionId]: { response: null, comments: '', responsible: '', status: 'pendiente', evidenceDate: '', ...a[questionId], ...patch } }));
  }

  async function handleSave() {
    setBusy(true);
    setError(null);
    try {
      const responses = Object.entries(answers)
        .filter(([, v]) => v.response)
        .map(([questionId, v]) => ({ questionId, ...v }));
      if (!responses.length) throw new Error('Responde al menos una pregunta antes de guardar');
      const res = await fetch('/api/sms/gap/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentId: assessment.id, responses }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error guardando');
      setSaved(true);
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const byComponent = questions.reduce((acc, q) => {
    (acc[q.component_number] = acc[q.component_number] || { name: q.component_name, items: [] }).items.push(q);
    return acc;
  }, {});
  const answeredCount = Object.values(answers).filter((a) => a.response).length;

  return (
    <Panel
      open={open}
      onClose={onClose}
      title={assessment ? `Evaluación — ${assessment.title || new Date(`${assessment.assessment_date}T00:00:00`).toLocaleDateString('es-CO')}` : 'Evaluación GAP'}
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-navy-400">
            {answeredCount}/{questions.length} respondidas
          </p>
          <Button onClick={handleSave} disabled={busy}>
            {busy ? 'Guardando…' : saved ? 'Guardado — seguir editando' : 'Guardar respuestas'}
          </Button>
        </div>
      }
    >
      {loading ? (
        <p className="text-sm text-navy-400">Cargando…</p>
      ) : (
        <div className="space-y-4">
          {error && <p className="text-xs text-red-600">{error}</p>}
          {Object.entries(byComponent).map(([num, c]) => (
            <div key={num}>
              <p className="text-xs font-bold text-navy-500 uppercase tracking-wide mb-2">
                {num}. {c.name}
              </p>
              <div className="space-y-2">
                {c.items.map((q) => {
                  const a = answers[q.id] || {};
                  return (
                    <div key={q.id} className="border border-navy-100 rounded-xl p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-navy-400">
                            {q.element_number} {q.element_name}
                          </p>
                          <p className="text-sm text-navy">{q.question_text}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setAnswer(q.id, { response: 'si' })}
                            className={`text-xs font-bold px-2.5 py-1 rounded-full ${a.response === 'si' ? 'bg-emerald-500 text-white' : 'bg-navy-50 text-navy-400'}`}
                          >
                            Sí
                          </button>
                          <button
                            type="button"
                            onClick={() => setAnswer(q.id, { response: 'no' })}
                            className={`text-xs font-bold px-2.5 py-1 rounded-full ${a.response === 'no' ? 'bg-red-500 text-white' : 'bg-navy-50 text-navy-400'}`}
                          >
                            No
                          </button>
                        </div>
                      </div>
                      {a.response === 'no' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-navy-50">
                          <input
                            value={a.responsible || ''}
                            onChange={(e) => setAnswer(q.id, { responsible: e.target.value })}
                            placeholder="Responsable del hallazgo"
                            className="text-xs border border-navy-200 rounded-lg px-2.5 py-1.5"
                          />
                          <input
                            type="date"
                            value={a.evidenceDate || ''}
                            onChange={(e) => setAnswer(q.id, { evidenceDate: e.target.value })}
                            placeholder="Plazo"
                            className="text-xs border border-navy-200 rounded-lg px-2.5 py-1.5"
                          />
                          <select
                            value={a.status || 'pendiente'}
                            onChange={(e) => setAnswer(q.id, { status: e.target.value })}
                            className="text-xs border border-navy-200 rounded-lg px-2.5 py-1.5"
                          >
                            <option value="pendiente">Pendiente</option>
                            <option value="en_progreso">En progreso</option>
                            <option value="completado">Completado</option>
                          </select>
                          <input
                            value={a.comments || ''}
                            onChange={(e) => setAnswer(q.id, { comments: e.target.value })}
                            placeholder="Observaciones"
                            className="text-xs border border-navy-200 rounded-lg px-2.5 py-1.5"
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}
