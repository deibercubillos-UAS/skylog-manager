'use client';
import { useState } from 'react';
import { toast } from '@/lib/toast';

const RECURRENCES = [
  { value: 'semanal', label: 'Semanal' },
  { value: 'quincenal', label: 'Quincenal' },
  { value: 'mensual', label: 'Mensual' },
  { value: 'personalizado', label: 'Personalizado' },
];

export default function AddSmsSessionPanel({ session, onClose, onSuccess }) {
  const isEdit = !!session;
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [form, setForm] = useState({
    topic: session?.topic || '',
    recurrence: session?.recurrence || 'mensual',
    recurrence_days: session?.recurrence_days || 30,
    start_date: session?.start_date || new Date().toISOString().split('T')[0],
    notes: session?.notes || '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.topic.trim()) { toast.warn('El tema de la sesión es obligatorio.'); return; }
    setLoading(true);
    try {
      const res = await fetch(isEdit ? `/api/safety/training/sessions/${session.id}` : '/api/safety/training/sessions', {
        method:  isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar la sesión.');
      toast.success(isEdit ? 'Sesión actualizada.' : 'Sesión creada.');
      onSuccess();
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/safety/training/sessions/${session.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al eliminar la sesión.');
      toast.success('Sesión eliminada.');
      onSuccess();
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-3 text-sm font-bold text-slate-900";
  const labelCls = "text-[9.5px] font-black text-slate-400 uppercase tracking-wide ml-0.5";

  return (
    <aside className="fixed z-[300] bg-white flex flex-col text-left
      inset-x-0 bottom-0 top-14 rounded-t-3xl
      md:inset-y-0 md:left-auto md:right-0 md:top-0 md:rounded-none md:w-[92vw] md:max-w-[560px]
      shadow-[0_-4px_30px_rgba(0,0,0,0.14)] md:shadow-2xl
      animate-in slide-in-from-bottom md:slide-in-from-right duration-300">

      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-slate-400 truncate">Seguridad SMS</span>
          <span className="material-symbols-outlined text-sm text-slate-300 shrink-0">chevron_right</span>
          <span className="text-xs font-black text-slate-900 shrink-0">{isEdit ? 'Editar sesión' : 'Nueva sesión'}</span>
        </div>
        <button type="button" onClick={onClose}
          className="size-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all active:scale-95 shrink-0">
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-5">
        <div className="bg-[#1A202C] rounded-2xl px-5 py-4 md:px-6 md:py-5">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-500">Cumplimiento · SMS</p>
          <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-tight mt-1">{isEdit ? 'Editar sesión' : 'Nueva sesión de Capacitación SMS'}</h3>
          <p className="text-xs font-semibold text-slate-400 mt-1">Inducción, SORA, Factores Humanos, Cultura Justa, TEM, etc. — dirigido a todo el personal</p>
        </div>

        <form id="add-sms-session-form" onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 md:p-7 space-y-5">
          <div className="space-y-1">
            <label className={labelCls}>Tema de la sesión <span className="text-orange-600">*</span></label>
            <input required className={inputCls} placeholder="Ej. Inducción y reinducción SMS"
              value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Recurrencia</label>
            <div className="flex flex-wrap gap-2">
              {RECURRENCES.map(r => (
                <button key={r.value} type="button" onClick={() => setForm({ ...form, recurrence: r.value })}
                  className={`px-3.5 py-2 rounded-xl border-[1.5px] text-xs font-bold transition-all ${
                    form.recurrence === r.value ? 'border-orange-600 bg-orange-50 text-orange-600' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                  }`}>
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          {form.recurrence === 'personalizado' && (
            <div className="space-y-1">
              <label className={labelCls}>Cada cuántos días</label>
              <input type="number" min="1" className={inputCls} value={form.recurrence_days}
                onChange={e => setForm({ ...form, recurrence_days: e.target.value })} />
            </div>
          )}
          <div className="space-y-1">
            <label className={labelCls}>Fecha de inicio</label>
            <input type="date" className={inputCls} value={form.start_date}
              onChange={e => setForm({ ...form, start_date: e.target.value })} />
          </div>
          <div className="space-y-1">
            <label className={labelCls}>Notas (opcional)</label>
            <textarea rows={3} className={inputCls + ' resize-none'} value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
        </form>
      </div>

      <div className="shrink-0 px-6 py-4 border-t border-slate-100 bg-white flex items-center justify-between gap-3">
        {isEdit ? (
          confirmDelete ? (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">¿Eliminar esta sesión?</span>
              <button type="button" onClick={handleDelete} disabled={loading}
                className="px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase transition-all disabled:opacity-50">
                Sí, eliminar
              </button>
              <button type="button" onClick={() => setConfirmDelete(false)}
                className="px-3 py-2 rounded-lg border border-slate-200 text-slate-500 font-black text-xs uppercase transition-all">
                Cancelar
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1.5 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 font-black text-xs uppercase tracking-wide transition-all">
              <span className="material-symbols-outlined text-base">delete</span>
              Eliminar
            </button>
          )
        ) : <span />}
        <div className="flex gap-3">
          <button type="button" onClick={onClose}
            className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-black text-xs uppercase tracking-wide hover:bg-slate-50 transition-all">
            Cancelar
          </button>
          <button form="add-sms-session-form" type="submit" disabled={loading}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs uppercase tracking-wide shadow-lg shadow-orange-600/25 active:scale-95 transition-all disabled:opacity-50">
            <span className="material-symbols-outlined text-base">add_circle</span>
            {loading ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear sesión'}
          </button>
        </div>
      </div>
    </aside>
  );
}
