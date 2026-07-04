'use client';
import { useState } from 'react';
import { toast } from '@/lib/toast';

const STATUS_OPTIONS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'en_progreso', label: 'En progreso' },
  { value: 'completado', label: 'Completado' },
];

export default function GapAssessmentPanel({ assessment, questions, onClose, onSuccess }) {
  const [title, setTitle] = useState(assessment.title || '');
  const [date, setDate] = useState(assessment.assessment_date || '');
  const [saving, setSaving] = useState(false);
  const [openComponent, setOpenComponent] = useState(1);
  const [responses, setResponses] = useState(() => {
    const byQuestion = {};
    (assessment.responses || []).forEach(r => { byQuestion[r.question_id] = r; });
    return byQuestion;
  });

  const setResponse = (questionId, patch) => {
    setResponses(prev => ({ ...prev, [questionId]: { ...(prev[questionId] || { question_id: questionId }), ...patch } }));
  };

  const answered = questions.filter(q => responses[q.id]?.response).length;
  const progressPct = Math.round((answered / questions.length) * 100);
  const siCount = questions.filter(q => responses[q.id]?.response === 'si').length;

  const components = [...new Set(questions.map(q => q.component_number))].sort();

  const save = async () => {
    setSaving(true);
    try {
      const responsesPayload = Object.values(responses).filter(r => r.response);
      const res = await fetch(`/api/safety/gap/assessments/${assessment.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, assessment_date: date, responses: responsesPayload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar la evaluación.');
      toast.success('Evaluación guardada.');
      onSuccess();
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900";

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
          <span className="text-xs font-black text-slate-900 truncate">Autoevaluación GAP</span>
        </div>
        <button type="button" onClick={onClose}
          className="size-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all active:scale-95 shrink-0">
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <input className={inputCls + ' flex-1 min-w-[200px]'} placeholder="Título (opcional, ej. Autoevaluación anual 2026)"
            value={title} onChange={e => setTitle(e.target.value)} />
          <input type="date" className={inputCls} value={date} onChange={e => setDate(e.target.value)} />
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-black text-slate-500">
            <span>{answered} de {questions.length} preguntas respondidas</span>
            <span>{siCount} Sí · {answered - siCount} No</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-orange-500 transition-all" style={{ width: `${progressPct}%` }} />
          </div>
        </div>

        {components.map(compNum => {
          const compQuestions = questions.filter(q => q.component_number === compNum);
          const compName = compQuestions[0]?.component_name;
          const compAnswered = compQuestions.filter(q => responses[q.id]?.response).length;
          const isOpen = openComponent === compNum;
          const elements = [...new Set(compQuestions.map(q => q.element_number))];
          return (
            <div key={compNum} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <button type="button" onClick={() => setOpenComponent(isOpen ? null : compNum)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                <p className="text-xs font-black text-slate-800">Componente {compNum} — {compName}</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400">{compAnswered}/{compQuestions.length}</span>
                  <span className="material-symbols-outlined text-base text-slate-400">{isOpen ? 'expand_less' : 'expand_more'}</span>
                </div>
              </button>
              {isOpen && (
                <div className="border-t border-slate-100 divide-y divide-slate-50">
                  {elements.map(elNum => {
                    const elQuestions = compQuestions.filter(q => q.element_number === elNum);
                    return (
                      <div key={elNum} className="p-4 space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                          Elemento {elNum} — {elQuestions[0].element_name}
                        </p>
                        {elQuestions.map(q => {
                          const r = responses[q.id] || {};
                          return (
                            <div key={q.id} className="space-y-1.5 pb-2">
                              <p className="text-xs font-semibold text-slate-700 leading-snug">{q.question_text}</p>
                              <div className="flex items-center gap-2">
                                <button type="button" onClick={() => setResponse(q.id, { response: 'si' })}
                                  className={`px-3 py-1 rounded-full text-[10.5px] font-black uppercase border ${r.response === 'si' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                                  Sí
                                </button>
                                <button type="button" onClick={() => setResponse(q.id, { response: 'no' })}
                                  className={`px-3 py-1 rounded-full text-[10.5px] font-black uppercase border ${r.response === 'no' ? 'bg-red-50 border-red-300 text-red-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                                  No
                                </button>
                              </div>
                              {r.response === 'no' && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pl-1 pt-1">
                                  <input className={inputCls} placeholder="Responsable"
                                    value={r.responsible || ''} onChange={e => setResponse(q.id, { responsible: e.target.value })} />
                                  <input type="date" className={inputCls} title="Evidencia estimada"
                                    value={r.evidence_date || ''} onChange={e => setResponse(q.id, { evidence_date: e.target.value })} />
                                  <select className={inputCls} value={r.status || 'pendiente'} onChange={e => setResponse(q.id, { status: e.target.value })}>
                                    {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                                  </select>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-end gap-3">
        <button type="button" onClick={onClose}
          className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-black text-xs uppercase tracking-wide hover:bg-slate-50 transition-all">
          Cerrar
        </button>
        <button type="button" onClick={save} disabled={saving}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wide shadow-lg shadow-orange-600/25 active:scale-95 transition-all disabled:opacity-50">
          <span className="material-symbols-outlined text-base">save</span>
          {saving ? 'Guardando...' : 'Guardar evaluación'}
        </button>
      </div>
    </aside>
  );
}
