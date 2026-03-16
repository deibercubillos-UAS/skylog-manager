'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AddAircraftPanel({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    model: '', serial_number: '', mtow: '', status: 'Operativo', total_hours: 0
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('aircraft')
      .insert([{ ...formData, owner_id: user.id, health: 0 }]);

    if (error) alert(error.message);
    else onSuccess();
    setLoading(false);
  };

  return (
    <aside className="w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 z-50">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <h3 className="text-lg font-bold">Nueva Aeronave</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Marca / Modelo</label>
            <input required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#ec5b13]/20" 
              placeholder="Ej: DJI Matrice 350" onChange={e => setFormData({...formData, model: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">S/N</label>
              <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none" 
                placeholder="Serial" onChange={e => setFormData({...formData, serial_number: e.target.value})} />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">MTOW (kg)</label>
              <input required type="number" step="0.01" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none" 
                placeholder="0.0" onChange={e => setFormData({...formData, mtow: e.target.value})} />
            </div>
          </div>
        </div>

        {/* Dropzone visual */}
        <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center hover:border-[#ec5b13] transition-colors group cursor-pointer">
          <span className="material-symbols-outlined text-4xl text-slate-300 group-hover:text-[#ec5b13] mb-2">cloud_upload</span>
          <p className="text-[10px] font-bold text-slate-400 uppercase">Cargar DAN o Seguro</p>
        </div>
      </form>

      <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-3">
        <button type="button" onClick={onClose} className="flex-1 py-3 text-sm font-bold text-slate-500">Cancelar</button>
        <button onClick={handleSubmit} disabled={loading} className="flex-1 py-3 bg-[#ec5b13] text-white rounded-xl text-sm font-bold shadow-lg shadow-[#ec5b13]/20">
          {loading ? 'Guardando...' : 'Guardar Aeronave'}
        </button>
      </div>
    </aside>
  );
}