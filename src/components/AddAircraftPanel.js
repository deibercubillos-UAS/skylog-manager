'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AddAircraftPanel({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ brand: '', model: '', serial_number: '', ruas: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();

      const { error } = await supabase.from('aircraft').insert([{ 
        ...form, 
        owner_id: user.id,
        organization_id: prof.organization_id, // <--- LLAVE MAESTRA
        status: 'Operativo',
        total_hours: 0
      }]);

      if (error) throw error;
      alert("✅ Aeronave registrada en la flota.");
      onSuccess();
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-[150] p-8 flex flex-col text-left animate-in slide-in-from-right">
      <h3 className="text-xl font-black uppercase mb-6">Registrar Aeronave</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold" placeholder="Marca" onChange={e => setForm({...form, brand: e.target.value})} />
        <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold" placeholder="Modelo" onChange={e => setForm({...form, model: e.target.value})} />
        <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-mono" placeholder="S/N" onChange={e => setForm({...form, serial_number: e.target.value})} />
        <input className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold" placeholder="RUAS" onChange={e => setForm({...form, ruas: e.target.value})} />
        <button disabled={loading} className="w-full py-4 bg-orange-600 text-white font-black rounded-xl uppercase text-xs">
          {loading ? 'Validando...' : 'Finalizar Registro'}
        </button>
        <button type="button" onClick={onClose} className="w-full py-2 text-slate-400 font-bold uppercase text-[9px]">Cancelar</button>
      </form>
    </aside>
  );
}