'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';

export default function EditTechPanel({ item, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ ...item });

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.from('inventory_items').update({
        category: form.category,
        brand: form.brand,
        model: form.model,
        serial_number: form.serial_number,
        name: `${form.brand} ${form.model}`
      }).eq('id', item.id);

      if (error) throw error;
      onSuccess();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  };

  return (
    <aside className="fixed z-[300] bg-white flex flex-col text-left
      bottom-0 left-0 right-0 rounded-t-3xl max-h-[92vh]
      md:bottom-auto md:inset-y-0 md:left-auto md:right-0 md:rounded-none md:w-96
      shadow-[0_-4px_30px_rgba(0,0,0,0.14)] md:shadow-2xl
      animate-in slide-in-from-bottom duration-300">

      {/* Drag handle — mobile */}
      <div className="md:hidden flex justify-center pt-3 pb-1 shrink-0">
        <div className="w-10 h-1 bg-slate-200 rounded-full" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
        <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900">Editar Payload</h3>
        <button type="button" onClick={onClose}
          className="size-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all active:scale-95">
          <span className="material-symbols-outlined text-xl">close</span>
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
        <form onSubmit={handleUpdate} className="space-y-4">
          <input className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm" value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="Tipo" />
          <input className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} placeholder="Marca" />
          <input className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm" value={form.model} onChange={e => setForm({...form, model: e.target.value})} placeholder="Modelo" />
          <input className="w-full p-3 bg-slate-50 rounded-xl border-none font-mono text-sm uppercase" value={form.serial_number} onChange={e => setForm({...form, serial_number: e.target.value})} placeholder="S/N" />
          <button disabled={loading} className="w-full py-4 bg-slate-900 text-white font-black rounded-xl uppercase text-xs shadow-lg disabled:opacity-60 active:scale-95 transition-all">
            {loading ? 'SINCRO...' : 'GUARDAR CAMBIOS'}
          </button>
        </form>
      </div>
    </aside>
  );
}
