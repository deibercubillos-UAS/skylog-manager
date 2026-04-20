'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AddTechPanel({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ brand: '', model: '', serial_number: '', category: 'Cámara RGB' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', auth.user.id).single();

      const { error } = await supabase.from('inventory_items').update([{ 
        ...form, 
        owner_id: auth.user.id,
        organization_id: prof.organization_id,
        status: 'Operativo'
      }]);

      if (error) throw error;
      alert("✅ Equipo tecnológico registrado.");
      onSuccess();
    } catch (err) { alert(err.message); }
    finally { setLoading(false); }
  };

  return (
    <aside className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-[200] p-10 flex flex-col text-left animate-in slide-in-from-right">
      <h3 className="text-xl font-black uppercase mb-8 tracking-tighter">Registrar Tecnología</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <select required className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
           <option value="Cámara RGB">Cámara RGB</option>
           <option value="Cámara Térmica">Cámara Térmica</option>
           <option value="Sensor Lidar">Sensor Lidar</option>
           <option value="Sistema de Aspersión">Sistema de Aspersión</option>
           <option value="Multiespectral">Multiespectral</option>
        </select>
        <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm" placeholder="Marca" onChange={e => setForm({...form, brand: e.target.value})} />
        <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm" placeholder="Modelo" onChange={e => setForm({...form, model: e.target.value})} />
        <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-mono text-sm uppercase" placeholder="Número de Serie" onChange={e => setForm({...form, serial_number: e.target.value})} />
        
        <button disabled={loading} className="w-full py-4 bg-orange-600 text-white font-black rounded-xl uppercase text-xs mt-6">
            {loading ? 'SINCRO...' : 'FINALIZAR REGISTRO'}
        </button>
        <button type="button" onClick={onClose} className="w-full py-2 text-slate-400 font-bold uppercase text-[9px]">Cancelar</button>
      </form>
    </aside>
  );
}