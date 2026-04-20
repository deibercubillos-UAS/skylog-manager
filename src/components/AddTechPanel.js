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
      const { data: auth } = await supabase.auth.getUser();
      const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', auth.user.id).single();

      // Inyectamos 'name' combinando marca y modelo para evitar el error de NOT NULL
      const { error } = await supabase.from('inventory_items').insert([{ 
        ...form, 
        name: `${form.brand} ${form.model}`, 
        owner_id: auth.user.id,
        organization_id: prof.organization_id,
        status: 'Operativo'
      }]);

      if (error) throw error;
      alert("✅ Equipo tecnológico registrado.");
      onSuccess();
    } catch (err) { alert("Falla: " + err.message); }
    finally { setLoading(false); }
  };

  return (
    <aside className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-[250] p-10 flex flex-col text-left animate-in slide-in-from-right">
      <h3 className="text-xl font-black uppercase mb-8 tracking-tighter">Nuevo Payload / Equipo</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Tipo de Equipo</label>
          <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm" placeholder="Ej: Cámara Térmica, Lidar..." onChange={e => setForm({...form, category: e.target.value})} />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Marca y Modelo</label>
          <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm mt-1" placeholder="Marca (Ej: MicaSense)" onChange={e => setForm({...form, brand: e.target.value})} />
          <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm mt-2" placeholder="Modelo (Ej: Altum-PT)" onChange={e => setForm({...form, model: e.target.value})} />
        </div>
        <div>
          <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Número de Serie</label>
          <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-mono text-sm uppercase mt-1" placeholder="S/N" onChange={e => setForm({...form, serial_number: e.target.value})} />
        </div>
        
        <button disabled={loading} className="w-full py-4 bg-orange-600 text-white font-black rounded-xl uppercase text-xs mt-6 shadow-lg">
            {loading ? 'SINCRO...' : 'FINALIZAR REGISTRO'}
        </button>
        <button type="button" onClick={onClose} className="w-full py-2 text-slate-400 font-bold uppercase text-[9px]">Cancelar</button>
      </form>
    </aside>
  );
}