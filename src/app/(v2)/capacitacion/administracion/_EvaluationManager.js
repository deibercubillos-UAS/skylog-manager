'use client';

// Skylog V2.0 — Capacitación, Administración: material de apoyo + banco de
// preguntas de UNA evaluación puntual — cada evaluación tiene los suyos
// propios (a pedido explícito del usuario: "diferentes bancos de preguntas
// dependiendo del material de apoyo"). Componente separado (prefijo `_`)
// para no inflar `page.js`, se monta al expandir una evaluación de la
// lista.
import { useCallback, useEffect, useState } from 'react';
import { Field, Button } from '@skylog/ui';

export default function EvaluationManager({ evaluation, onMaterialSaved }) {
  const evaluationId = evaluation.id;

  const [materialForm, setMaterialForm] = useState({ title: evaluation.material_title || '', description: evaluation.material_description || '' });
  const [materialFile, setMaterialFile] = useState(null);
  const [materialBusy, setMaterialBusy] = useState(false);
  const [materialError, setMaterialError] = useState(null);
  const [material, setMaterial] = useState(evaluation.material_path ? { path: evaluation.material_path } : null);

  const [questions, setQuestions] = useState([]);
  const [qForm, setQForm] = useState({ question: '', options: ['', ''], correctIndex: 0 });
  const [qBusy, setQBusy] = useState(false);
  const [qError, setQError] = useState(null);

  const loadQuestions = useCallback(async () => {
    const res = await fetch(`/api/capacitacion/questions?evaluationId=${evaluationId}`);
    const data = await res.json();
    if (res.ok) setQuestions(data.questions || []);
  }, [evaluationId]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  async function handleMaterialSubmit(e) {
    e.preventDefault();
    setMaterialBusy(true);
    setMaterialError(null);
    try {
      const form = new FormData();
      form.set('evaluationId', evaluationId);
      form.set('title', materialForm.title);
      form.set('description', materialForm.description);
      if (materialFile) form.set('file', materialFile);
      const res = await fetch('/api/capacitacion/material', { method: 'POST', body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error guardando el material');
      setMaterial(data.evaluation.material_path ? { path: data.evaluation.material_path } : null);
      setMaterialFile(null);
      onMaterialSaved?.();
    } catch (e) {
      setMaterialError(e.message);
    } finally {
      setMaterialBusy(false);
    }
  }

  async function handleMaterialDelete() {
    setMaterialBusy(true);
    setMaterialError(null);
    try {
      const res = await fetch(`/api/capacitacion/material?evaluationId=${evaluationId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error quitando el material');
      setMaterial(null);
      setMaterialForm({ title: '', description: '' });
      onMaterialSaved?.();
    } catch (e) {
      setMaterialError(e.message);
    } finally {
      setMaterialBusy(false);
    }
  }

  async function handleQuestionSubmit(e) {
    e.preventDefault();
    setQBusy(true);
    setQError(null);
    try {
      const res = await fetch('/api/capacitacion/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluationId,
          question: qForm.question,
          options: qForm.options.filter((o) => o.trim()),
          correctIndex: qForm.correctIndex,
          orderIndex: questions.length,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error creando la pregunta');
      setQForm({ question: '', options: ['', ''], correctIndex: 0 });
      await loadQuestions();
    } catch (e) {
      setQError(e.message);
    } finally {
      setQBusy(false);
    }
  }

  async function handleQuestionDelete(id) {
    const res = await fetch(`/api/capacitacion/questions?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      setQError(data.error);
      return;
    }
    await loadQuestions();
  }

  return (
    <div className="mt-3 space-y-3 border-t border-navy-50 pt-3">
      {/* Material de apoyo */}
      <div className="bg-navy-50/40 rounded-xl p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-navy-400 mb-2">Material de apoyo</p>

        {material?.path && (
          <div className="flex items-center justify-between gap-3 bg-white rounded-lg p-2.5 mb-2">
            <a
              href={`/api/capacitacion/material?evaluationId=${evaluationId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-primary hover:underline truncate"
            >
              Ver archivo actual
            </a>
            <button type="button" onClick={handleMaterialDelete} disabled={materialBusy} className="text-xs text-red-600 hover:underline shrink-0">
              Quitar
            </button>
          </div>
        )}

        <form onSubmit={handleMaterialSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2">
          <Field label="Título" value={materialForm.title} onChange={(e) => setMaterialForm((f) => ({ ...f, title: e.target.value }))} required />
          <Field label="Descripción (opcional)" value={materialForm.description} onChange={(e) => setMaterialForm((f) => ({ ...f, description: e.target.value }))} />
          <div className="sm:col-span-2">
            <label className="text-xs font-medium text-navy-400 block mb-1.5">
              Archivo (PDF, PNG, JPEG o WEBP, máx. 15 MB) {material?.path && '— deja vacío para conservar el actual'}
            </label>
            <input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={(e) => setMaterialFile(e.target.files?.[0] || null)} className="text-sm" />
          </div>
          {materialError && <p className="text-sm text-red-600 sm:col-span-2">{materialError}</p>}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={materialBusy}>
              {materialBusy ? 'Guardando…' : 'Guardar material'}
            </Button>
          </div>
        </form>
      </div>

      {/* Banco de preguntas */}
      <div className="bg-navy-50/40 rounded-xl p-3">
        <p className="text-xs font-bold uppercase tracking-wide text-navy-400 mb-2">Banco de preguntas — {questions.length} configurada(s)</p>

        {questions.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {questions.map((q, i) => (
              <div key={q.id} className="flex items-start justify-between gap-2 text-xs bg-white rounded-lg px-2 py-1.5">
                <div>
                  <span className="font-medium text-navy">
                    {i + 1}. {q.question}
                  </span>
                  <p className="text-navy-400 mt-0.5">
                    {q.options.map((o, oi) => (
                      <span key={oi} className={oi === q.correct_index ? 'text-emerald-600 font-semibold' : ''}>
                        {oi > 0 ? ' · ' : ''}
                        {o}
                      </span>
                    ))}
                  </p>
                </div>
                <button type="button" onClick={() => handleQuestionDelete(q.id)} className="text-red-500 shrink-0">
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={handleQuestionSubmit}>
          <Field label="Pregunta" value={qForm.question} onChange={(e) => setQForm((f) => ({ ...f, question: e.target.value }))} required />
          <p className="text-xs font-medium text-navy-400 mb-1.5 mt-1">Opciones (marca la correcta)</p>
          <div className="space-y-1.5 mb-2">
            {qForm.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="radio" name={`correctOption-${evaluationId}`} checked={qForm.correctIndex === i} onChange={() => setQForm((f) => ({ ...f, correctIndex: i }))} />
                <input
                  value={opt}
                  onChange={(e) => setQForm((f) => ({ ...f, options: f.options.map((o, oi) => (oi === i ? e.target.value : o)) }))}
                  placeholder={`Opción ${i + 1}`}
                  className="flex-1 text-sm border border-navy-200 rounded-lg px-2 py-1.5"
                />
                {qForm.options.length > 2 && (
                  <button
                    type="button"
                    onClick={() =>
                      setQForm((f) => ({
                        options: f.options.filter((_, oi) => oi !== i),
                        correctIndex: f.correctIndex >= i && f.correctIndex > 0 ? f.correctIndex - 1 : f.correctIndex,
                        question: f.question,
                      }))
                    }
                    className="text-red-500"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => setQForm((f) => ({ ...f, options: [...f.options, ''] }))} className="text-xs text-primary-700 hover:underline">
              + Agregar opción
            </button>
          </div>
          {qError && <p className="text-sm text-red-600 mb-2">{qError}</p>}
          <Button type="submit" disabled={qBusy}>
            {qBusy ? 'Guardando…' : 'Agregar pregunta'}
          </Button>
        </form>
      </div>
    </div>
  );
}
