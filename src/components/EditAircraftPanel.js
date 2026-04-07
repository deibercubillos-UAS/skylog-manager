'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function EditAircraftPanel({ aircraft, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    brand: aircraft?.brand || '',
    model: aircraft?.model || '',
    serial_number: aircraft?.serial_number || '',
    ruas: aircraft?.ruas || '',
    mtow: aircraft?.mtow || 0,
    status: aircraft?.status || 'Operativo'
  });

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from('aircraft').update(formData).eq('id', aircraft.id);
    if (!error) onSuccess();
    else alert(error.message);
    setLoading(false);
  };

  return (
    <aside className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-[100] p-8 flex flex-col text-left animate-in slide-in-from-right">
      <h3 className="text-xl font-black uppercase mb-6 tracking-tighter">Editar Ficha Técnica</h3>
      <form onSubmit={handleUpdate} className="space-y-4">
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Marca</label>
          <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Modelo</label>
          <input required className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} />
        </div>
        <div className="space-y-1">
          <label className="text-[9px] font-black text-slate-400 uppercase ml-1">RUAS</label>
          <input className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold" value={formData.ruas} onChange={e => setFormData({...formData, ruas: e.target.value})} />
        </div>
        <button type="submit" disabled={loading} className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl shadow-lg uppercase text-[10px] tracking-widest mt-6">
          {loading ? 'Guardando...' : 'Actualizar Datos'}
        </button>
        <button type="button" onClick={onClose} className="w-full py-3 text-slate-400 font-bold uppercase text-[9px]">Cerrar</button>
      </form>
    </aside>
  );
}
