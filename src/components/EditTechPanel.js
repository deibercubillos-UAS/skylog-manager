'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

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
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  return (
    <aside className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-[250] p-10 flex flex-col text-left animate-in slide-in-from-right">
      <h3 className="text-xl font-black uppercase mb-8 tracking-tighter">Editar Payload</h3>
      <form onSubmit={handleUpdate} className="space-y-4">
        <input className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm" value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="Tipo" />
        <input className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} placeholder="Marca" />
        <input className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm" value={form.model} onChange={e => setForm({...form, model: e.target.value})} placeholder="Modelo" />
        <input className="w-full p-3 bg-slate-50 rounded-xl border-none font-mono text-sm uppercase" value={form.serial_number} onChange={e => setForm({...form, serial_number: e.target.value})} placeholder="S/N" />
        <button disabled={loading} className="w-full py-4 bg-slate-900 text-white font-black rounded-xl uppercase text-xs mt-6 shadow-lg">
            {loading ? 'SINCRO...' : 'GUARDAR CAMBIOS'}
        </button>
        <button type="button" onClick={onClose} className="w-full py-2 text-slate-400 font-bold uppercase text-[9px]">Cancelar</button>
      </form>
    </aside>
  );
}