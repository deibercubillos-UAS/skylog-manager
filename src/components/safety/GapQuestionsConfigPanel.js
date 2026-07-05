'use client';
import { useState, useEffect } from 'react';
import { toast } from '@/lib/toast';

const CUSTOM_COMPONENT = 5;

export default function GapQuestionsConfigPanel({ onClose, onChanged }) {
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState([]);
  const [openComponent, setOpenComponent] = useState(1);
  const [busyId, setBusyId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [newQuestion, setNewQuestion] = useState({ element_number: '5.1', element_name: 'General', question_text: '' });
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    fetch('/api/safety/gap/questions?includeHidden=1').then(r => r.json())
      .then(d => setQuestions(Array.isArray(d) ? d : []))
      .catch(() => setQuestions([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const notifyChanged = () => { load(); onChanged?.(); };

  const toggleHidden = async (q) => {
    setBusyId(q.id);
    try {
      const res = await fetch(`/api/safety/gap/questions/${q.id}/visibility`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hidden: !q.hidden }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Error al actualizar la visibilidad.');
      notifyChanged();
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setBusyId(null);
    }
  };

  const startEdit = (q) => {
    setEditingId(q.id);
    setEditDraft({ element_number: q.element_number, element_name: q.element_name, question_text: q.question_text });
  };

  const saveEdit = async (id) => {
    if (!editDraft.question_text?.trim()) { toast.warn('El texto de la pregunta es obligatorio.'); return; }
    setBusyId(id);
    try {
      const res = await fetch(`/api/safety/gap/questions/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editDraft),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Error al guardar los cambios.');
      toast.success('Pregunta actualizada.');
      setEditingId(null);
      notifyChanged();
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setBusyId(null);
    }
  };

  const deleteQuestion = async (id) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/safety/gap/questions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Error al eliminar la pregunta.');
      toast.success('Pregunta eliminada.');
      notifyChanged();
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setBusyId(null);
    }
  };

  const addQuestion = async () => {
    if (!newQuestion.question_text.trim()) { toast.warn('El texto de la pregunta es obligatorio.'); return; }
    setCreating(true);
    try {
      const res = await fetch('/api/safety/gap/questions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newQuestion),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Error al agregar la pregunta.');
      toast.success('Pregunta agregada.');
      setNewQuestion({ element_number: '5.1', element_name: 'General', question_text: '' });
      setOpenComponent(CUSTOM_COMPONENT);
      notifyChanged();
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const components = [...new Set(questions.map(q => q.component_number))].sort();
  const inputCls = "bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900";

  return (
    <aside className="fixed z-[300] bg-white flex flex-col text-left
      inset-x-0 bottom-0 top-14 rounded-t-3xl
      md:inset-y-0 md:left-auto md:right-0 md:top-0 md:rounded-none md:w-[95vw] md:max-w-[880px]
      shadow-[0_-4px_30px_rgba(0,0,0,0.14)] md:shadow-2xl
      animate-in slide-in-from-bottom md:slide-in-from-right duration-300">

      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-slate-400 truncate">Seguridad SMS · Mejora Continua</span>
          <span className="material-symbols-outlined text-sm text-slate-300 shrink-0">chevron_right</span>
          <span className="text-xs font-black text-slate-900 truncate">Configurar preguntas del GAP</span>
        </div>
        <button type="button" onClick={onClose}
          className="size-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all active:scale-95 shrink-0">
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-4">
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3">
          <p className="text-xs font-semibold text-indigo-800 leading-relaxed">
            Las 100 preguntas oficiales del Apéndice 1 (componentes 1-4) no se pueden editar ni borrar —
            pero puedes <span className="font-black">ocultarlas</span> si no aplican a tu operación, y
            <span className="font-black"> agregar tus propias preguntas</span> en &quot;Preguntas personalizadas&quot;.
            Nada de esto afecta a otras organizaciones.
          </p>
        </div>

        {loading ? (
          <p className="text-center text-xs font-black text-slate-300 uppercase tracking-widest py-10 animate-pulse">Cargando...</p>
        ) : (
          components.map(compNum => {
            const compQuestions = questions.filter(q => q.component_number === compNum);
            const compName = compQuestions[0]?.component_name;
            const isOpen = openComponent === compNum;
            const elements = [...new Set(compQuestions.map(q => q.element_number))];
            const isCustomComponent = compNum === CUSTOM_COMPONENT;
            return (
              <div key={compNum} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <button type="button" onClick={() => setOpenComponent(isOpen ? null : compNum)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                  <p className="text-xs font-black text-slate-800">Componente {compNum} — {compName}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400">{compQuestions.length} preguntas</span>
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
                          {elQuestions.map(q => (
                            <div key={q.id} className={`rounded-xl border px-3 py-2.5 space-y-2 ${q.hidden ? 'border-slate-100 bg-slate-50 opacity-60' : 'border-slate-100'}`}>
                              {editingId === q.id ? (
                                <div className="space-y-2">
                                  <textarea rows={2} className={inputCls + ' w-full'} value={editDraft.question_text}
                                    onChange={e => setEditDraft({ ...editDraft, question_text: e.target.value })} />
                                  <div className="flex items-center gap-2">
                                    <input className={inputCls} placeholder="N° elemento" value={editDraft.element_number}
                                      onChange={e => setEditDraft({ ...editDraft, element_number: e.target.value })} />
                                    <input className={inputCls + ' flex-1'} placeholder="Nombre del elemento" value={editDraft.element_name}
                                      onChange={e => setEditDraft({ ...editDraft, element_name: e.target.value })} />
                                  </div>
                                  <div className="flex justify-end gap-2">
                                    <button type="button" onClick={() => setEditingId(null)} className="text-[10.5px] font-black text-slate-500 uppercase">Cancelar</button>
                                    <button type="button" onClick={() => saveEdit(q.id)} disabled={busyId === q.id}
                                      className="text-[10.5px] font-black text-orange-600 uppercase disabled:opacity-50">
                                      {busyId === q.id ? 'Guardando...' : 'Guardar'}
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start gap-2">
                                  <p className="text-xs font-semibold text-slate-700 leading-snug flex-1">
                                    {q.question_text}
                                    {q.is_custom && <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-indigo-50 text-indigo-600">Personalizada</span>}
                                    {q.hidden && <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-slate-200 text-slate-500">Oculta</span>}
                                  </p>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button type="button" onClick={() => toggleHidden(q)} disabled={busyId === q.id}
                                      title={q.hidden ? 'Mostrar de nuevo' : 'Ocultar para mi organización'}
                                      className="size-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all disabled:opacity-50">
                                      <span className="material-symbols-outlined text-base">{q.hidden ? 'visibility_off' : 'visibility'}</span>
                                    </button>
                                    {q.is_custom && (
                                      <>
                                        <button type="button" onClick={() => startEdit(q)}
                                          className="size-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all">
                                          <span className="material-symbols-outlined text-base">edit</span>
                                        </button>
                                        <button type="button" onClick={() => deleteQuestion(q.id)} disabled={busyId === q.id}
                                          className="size-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all disabled:opacity-50">
                                          <span className="material-symbols-outlined text-base">delete</span>
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      );
                    })}
                    {isCustomComponent && (
                      <div className="p-4 border-t border-dashed border-slate-200 space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-wide text-slate-400">Agregar pregunta personalizada</p>
                        <textarea rows={2} className={inputCls + ' w-full'} placeholder="Texto de la pregunta (ej. ¿Se realiza inspección visual de hélices antes de cada vuelo?)"
                          value={newQuestion.question_text} onChange={e => setNewQuestion({ ...newQuestion, question_text: e.target.value })} />
                        <div className="flex items-center gap-2">
                          <input className={inputCls} placeholder="N° elemento (ej. 5.1)" value={newQuestion.element_number}
                            onChange={e => setNewQuestion({ ...newQuestion, element_number: e.target.value })} />
                          <input className={inputCls + ' flex-1'} placeholder="Nombre del elemento (ej. Chequeos de campo)" value={newQuestion.element_name}
                            onChange={e => setNewQuestion({ ...newQuestion, element_name: e.target.value })} />
                        </div>
                        <div className="flex justify-end">
                          <button type="button" onClick={addQuestion} disabled={creating}
                            className="flex items-center gap-1.5 text-xs font-black text-orange-600 hover:underline uppercase disabled:opacity-50">
                            <span className="material-symbols-outlined text-sm">add_circle</span>
                            {creating ? 'Agregando...' : 'Agregar pregunta'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}

        {!loading && !components.includes(CUSTOM_COMPONENT) && (
          <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-4 space-y-2">
            <p className="text-xs font-black text-slate-800">Preguntas personalizadas de la organización</p>
            <textarea rows={2} className={inputCls + ' w-full'} placeholder="Texto de la pregunta (ej. ¿Se realiza inspección visual de hélices antes de cada vuelo?)"
              value={newQuestion.question_text} onChange={e => setNewQuestion({ ...newQuestion, question_text: e.target.value })} />
            <div className="flex items-center gap-2">
              <input className={inputCls} placeholder="N° elemento (ej. 5.1)" value={newQuestion.element_number}
                onChange={e => setNewQuestion({ ...newQuestion, element_number: e.target.value })} />
              <input className={inputCls + ' flex-1'} placeholder="Nombre del elemento (ej. Chequeos de campo)" value={newQuestion.element_name}
                onChange={e => setNewQuestion({ ...newQuestion, element_name: e.target.value })} />
            </div>
            <div className="flex justify-end">
              <button type="button" onClick={addQuestion} disabled={creating}
                className="flex items-center gap-1.5 text-xs font-black text-orange-600 hover:underline uppercase disabled:opacity-50">
                <span className="material-symbols-outlined text-sm">add_circle</span>
                {creating ? 'Agregando...' : 'Agregar pregunta'}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-end">
        <button type="button" onClick={onClose}
          className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-black text-xs uppercase tracking-wide hover:bg-slate-50 transition-all">
          Cerrar
        </button>
      </div>
    </aside>
  );
}
