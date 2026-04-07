'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AddAircraftPanel({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ brand: '', model: '', serial_number: '', ruas: '', mtow: 0 });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('aircraft').insert([{ 
      ...formData, 
      owner_id: user.id, 
      status: 'Operativo' 
    }]);

    if (!error) onSuccess();
    else alert(error.message);
    setLoading(false);
  };

  return (
    <aside className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-[100] p-8 flex flex-col text-left animate-in slide-in-from-right duration-300">
      <h3 className="text-xl font-black uppercase mb-6 tracking-tighter">Registrar Aeronave</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Marca / Fabricante</label>
          <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold" placeholder="Ej: DJI, Autel..." onChange={e => setFormData({...formData, brand: e.target.value})} />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Modelo</label>
          <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold" placeholder="Ej: Mavic 3 Enterprise" onChange={e => setFormData({...formData, model: e.target.value})} />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Número de Serie (S/N)</label>
          <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-mono" placeholder="S/N" onChange={e => setFormData({...formData, serial_number: e.target.value})} />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase ml-1">RUAS (Opcional)</label>
          <input className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold" placeholder="Registro Aerocivil" onChange={e => setFormData({...formData, ruas: e.target.value})} />
        </div>
        <button type="submit" disabled={loading} className="w-full py-4 bg-[#ec5b13] text-white font-black rounded-2xl shadow-lg uppercase text-[10px] tracking-widest mt-6">
          {loading ? 'Validando...' : 'Finalizar Registro'}
        </button>
        <button type="button" onClick={onClose} className="w-full py-3 text-slate-400 font-bold uppercase text-[9px]">Cancelar</button>
      </form>
    </aside>
  );
}
