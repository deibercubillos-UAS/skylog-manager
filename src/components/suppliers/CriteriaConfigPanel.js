'use client';
import { useState, useEffect } from 'react';
import { toast } from '@/lib/toast';

export default function CriteriaConfigPanel({ onClose, onChanged }) {
  const [loading, setLoading] = useState(true);
  const [criteria, setCriteria] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [newCriterion, setNewCriterion] = useState({ criterion: '', category: '' });
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    fetch('/api/suppliers/criteria').then(r => r.json())
      .then(d => setCriteria(Array.isArray(d) ? d : []))
      .catch(() => setCriteria([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const notifyChanged = () => { load(); onChanged?.(); };

  const startEdit = (c) => {
    setEditingId(c.id);
    setEditDraft({ criterion: c.criterion, category: c.category || '' });
  };

  const saveEdit = async (id) => {
    if (!editDraft.criterion?.trim()) { toast.warn('El criterio es obligatorio.'); return; }
    setBusyId(id);
    try {
      const res = await fetch(`/api/suppliers/criteria/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editDraft),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Error al guardar los cambios.');
      toast.success('Criterio actualizado.');
      setEditingId(null);
      notifyChanged();
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setBusyId(null);
    }
  };

  const deleteCriterion = async (id) => {
    setBusyId(id);
    try {
      const res = await fetch(`/api/suppliers/criteria/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error || 'Error al eliminar el criterio.');
      toast.success('Criterio eliminado.');
      notifyChanged();
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setBusyId(null);
    }
  };

  const addCriterion = async () => {
    if (!newCriterion.criterion.trim()) { toast.warn('El criterio es obligatorio.'); return; }
    setCreating(true);
    try {
      const res = await fetch('/api/suppliers/criteria', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newCriterion),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Error al agregar el criterio.');
      toast.success('Criterio agregado.');
      setNewCriterion({ criterion: '', category: '' });
      notifyChanged();
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const inputCls = "bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900";

  return (
    <aside className="fixed z-[300] bg-white flex flex-col text-left
      inset-x-0 bottom-0 top-14 rounded-t-3xl
      md:inset-y-0 md:left-auto md:right-0 md:top-0 md:rounded-none md:w-[95vw] md:max-w-[720px]
      shadow-[0_-4px_30px_rgba(0,0,0,0.14)] md:shadow-2xl
      animate-in slide-in-from-bottom md:slide-in-from-right duration-300">

      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-bold text-slate-400 truncate">Proveedores</span>
          <span className="material-symbols-outlined text-sm text-slate-300 shrink-0">chevron_right</span>
          <span className="text-xs font-black text-slate-900 truncate">Checklist de auditoría</span>
        </div>
        <button type="button" onClick={onClose}
          className="size-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all active:scale-95 shrink-0">
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar space-y-4">
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl px-4 py-3">
          <p className="text-xs font-semibold text-indigo-800 leading-relaxed">
            Este checklist es único y se aplica a cualquier proveedor que audites — agrega, edita o
            elimina los criterios que necesite tu organización. La &quot;categoría&quot; es solo una
            etiqueta libre para agrupar visualmente (ej. Documentación, Calidad, Seguridad).
          </p>
        </div>

        {loading ? (
          <p className="text-center text-xs font-black text-slate-300 uppercase tracking-widest py-10 animate-pulse">Cargando...</p>
        ) : criteria.length === 0 ? (
          <p className="text-center text-xs font-bold text-slate-400 py-6">Aún no hay criterios — agrega el primero abajo.</p>
        ) : (
          <div className="space-y-2">
            {criteria.map(c => (
              <div key={c.id} className="rounded-xl border border-slate-100 px-3 py-2.5 space-y-2">
                {editingId === c.id ? (
                  <div className="space-y-2">
                    <textarea rows={2} className={inputCls + ' w-full'} value={editDraft.criterion}
                      onChange={e => setEditDraft({ ...editDraft, criterion: e.target.value })} />
                    <input className={inputCls + ' w-full'} placeholder="Categoría (opcional)" value={editDraft.category}
                      onChange={e => setEditDraft({ ...editDraft, category: e.target.value })} />
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setEditingId(null)} className="text-[10.5px] font-black text-slate-500 uppercase">Cancelar</button>
                      <button type="button" onClick={() => saveEdit(c.id)} disabled={busyId === c.id}
                        className="text-[10.5px] font-black text-orange-600 uppercase disabled:opacity-50">
                        {busyId === c.id ? 'Guardando...' : 'Guardar'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <div className="flex-1">
                      {c.category && (
                        <p className="text-[9px] font-black uppercase tracking-wide text-slate-400 mb-0.5">{c.category}</p>
                      )}
                      <p className="text-xs font-semibold text-slate-700 leading-snug">{c.criterion}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button type="button" onClick={() => startEdit(c)}
                        className="size-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all">
                        <span className="material-symbols-outlined text-base">edit</span>
                      </button>
                      <button type="button" onClick={() => deleteCriterion(c.id)} disabled={busyId === c.id}
                        className="size-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all disabled:opacity-50">
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-4 space-y-2">
          <p className="text-xs font-black text-slate-800">Agregar criterio</p>
          <textarea rows={2} className={inputCls + ' w-full'} placeholder="Ej. Cuenta con certificaciones de calidad vigentes"
            value={newCriterion.criterion} onChange={e => setNewCriterion({ ...newCriterion, criterion: e.target.value })} />
          <input className={inputCls + ' w-full'} placeholder="Categoría (opcional, ej. Documentación)" value={newCriterion.category}
            onChange={e => setNewCriterion({ ...newCriterion, category: e.target.value })} />
          <div className="flex justify-end">
            <button type="button" onClick={addCriterion} disabled={creating}
              className="flex items-center gap-1.5 text-xs font-black text-orange-600 hover:underline uppercase disabled:opacity-50">
              <span className="material-symbols-outlined text-sm">add_circle</span>
              {creating ? 'Agregando...' : 'Agregar criterio'}
            </button>
          </div>
        </div>
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
