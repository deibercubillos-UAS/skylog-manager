'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AddTechPanel({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ brand: '', model: '', serial_number: '', category: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Capturar identidad en el momento del clic (Manual)
      const { data: { user } } = await supabase.auth.getUser();
      const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();

      if (!prof?.organization_id) throw new Error("OrgID no detectado");

      // 2. Inserción con inyección de identidad verificada
      const { error } = await supabase.from('inventory_items').insert([{ 
        category: form.category,
        brand: form.brand,
        model: form.model,
        serial_number: form.serial_number,
        name: `${form.brand} ${form.model}`,
        organization_id: prof.organization_id, // <--- VÍNCULO CRÍTICO
        owner_id: user.id,
        status: 'Operativo'
      }]);

      if (error) throw error;

      alert("✅ EQUIPO REGISTRADO: Sincronizando flota...");
      onSuccess(); // Esto dispara el fetchData del padre

    } catch (err) {
      alert("Error de registro: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-[250] p-10 flex flex-col text-left animate-in slide-in-from-right">
      <h3 className="text-xl font-black uppercase mb-8 tracking-tighter">Registrar Payload</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Tipo de Equipo</label>
          <input required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" placeholder="Ej: Cámara Térmica" onChange={e => setForm({...form, category: e.target.value})} />
        </div>
        <div>
            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Marca / Modelo</label>
            <input required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm mt-1" placeholder="Marca" onChange={e => setForm({...form, brand: e.target.value})} />
            <input required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm mt-2" placeholder="Modelo" onChange={e => setForm({...form, model: e.target.value})} />
        </div>
        <div>
            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Serial (S/N)</label>
            <input required className="w-full p-4 bg-white border-2 border-orange-100 rounded-2xl font-mono text-sm uppercase" placeholder="S/N" onChange={e => setForm({...form, serial_number: e.target.value})} />
        </div>
        
        <button disabled={loading} type="submit" className="w-full py-5 bg-orange-600 text-white font-black rounded-2xl shadow-xl uppercase text-xs tracking-widest active:scale-95 transition-all">
            {loading ? 'SINCRO...' : 'CONFIRMAR CARGA'}
        </button>
        <button type="button" onClick={onClose} className="w-full py-2 text-slate-400 font-bold uppercase text-[9px]">Cancelar</button>
      </form>
    </aside>
  );
}