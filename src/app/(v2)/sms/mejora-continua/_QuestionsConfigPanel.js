'use client';

// Skylog V2.0 — SMS-D: configurar el catálogo GAP — ocultar cualquier
// pregunta (oficial o propia) solo para esta org, y agregar preguntas
// propias en el componente 5.
import { useCallback, useEffect, useState } from 'react';
import { Panel, Button } from '@skylog/ui';

export default function QuestionsConfigPanel({ open, onClose, organizationId, onChanged }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openComponents, setOpenComponents] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ elementNumber: '5.1', elementName: '', questionText: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    const res = await fetch(`/api/sms/gap/questions?organizationId=${organizationId}&includeHidden=1`);
    const data = await res.json();
    if (res.ok) setQuestions(data.questions || []);
    else setError(data.error);
    setLoading(false);
  }, [organizationId]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  async function toggleHidden(q) {
    const res = await fetch(`/api/sms/gap/questions/${q.id}/visibility`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId, hidden: !q.hidden }),
    });
    if (res.ok) {
      await load();
      onChanged?.();
    }
  }

  async function deleteCustom(q) {
    if (!confirm('¿Eliminar esta pregunta?')) return;
    const res = await fetch(`/api/sms/gap/questions/${q.id}`, { method: 'DELETE' });
    if (res.ok) {
      await load();
      onChanged?.();
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch('/api/sms/gap/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setForm({ elementNumber: '5.1', elementName: '', questionText: '' });
      setShowAddForm(false);
      await load();
      onChanged?.();
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

  return (
    <Panel open={open} onClose={onClose} title="Configurar catálogo GAP">
      {loading ? (
        <p className="text-sm text-navy-400">Cargando…</p>
      ) : (
        <div className="space-y-4">
          {error && <p className="text-xs text-red-600">{error}</p>}
          {Object.entries(byComponent).map(([num, c]) => (
            <div key={num} className="border border-navy-100 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenComponents((o) => ({ ...o, [num]: !o[num] }))}
                className="w-full flex items-center justify-between px-3 py-2 bg-navy-50 text-left"
              >
                <span className="text-xs font-bold text-navy">
                  {num}. {c.name} ({c.items.length})
                </span>
                <span className="material-symbols-outlined text-sm text-navy-400">{openComponents[num] ? 'expand_less' : 'expand_more'}</span>
              </button>
              {openComponents[num] && (
                <div className="divide-y divide-navy-50">
                  {c.items.map((q) => (
                    <div key={q.id} className="flex items-start justify-between gap-2 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-navy-400">
                          {q.element_number} {q.element_name}
                        </p>
                        <p className={`text-xs ${q.hidden ? 'text-navy-300 line-through' : 'text-navy-600'}`}>{q.question_text}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button type="button" onClick={() => toggleHidden(q)} className="text-[11px] font-semibold text-primary-700 hover:underline">
                          {q.hidden ? 'Mostrar' : 'Ocultar'}
                        </button>
                        {q.organization_id && (
                          <button type="button" onClick={() => deleteCustom(q)} className="text-[11px] font-semibold text-red-500 hover:underline">
                            Eliminar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <Button type="button" variant="ghost" onClick={() => setShowAddForm((s) => !s)} className="w-full justify-center">
            {showAddForm ? 'Cancelar' : '+ Agregar pregunta propia (componente 5)'}
          </Button>

          {showAddForm && (
            <form onSubmit={handleAdd} className="space-y-2 bg-navy-50/60 rounded-xl p-3">
              <input
                value={form.elementNumber}
                onChange={(e) => setForm((f) => ({ ...f, elementNumber: e.target.value }))}
                placeholder="N.º de elemento (ej. 5.1)"
                required
                className="w-full text-sm border border-navy-200 rounded-lg px-3 py-2"
              />
              <input
                value={form.elementName}
                onChange={(e) => setForm((f) => ({ ...f, elementName: e.target.value }))}
                placeholder="Nombre del elemento"
                required
                className="w-full text-sm border border-navy-200 rounded-lg px-3 py-2"
              />
              <textarea
                value={form.questionText}
                onChange={(e) => setForm((f) => ({ ...f, questionText: e.target.value }))}
                placeholder="Pregunta"
                required
                rows={2}
                className="w-full text-sm border border-navy-200 rounded-lg px-3 py-2"
              />
              <Button type="submit" disabled={busy} className="w-full justify-center">
                {busy ? 'Guardando…' : 'Agregar'}
              </Button>
            </form>
          )}
        </div>
      )}
    </Panel>
  );
}
