'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AddPilotPanel({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '', license_number: '', medical_expiry: '', pilot_role: 'PIC - Piloto al Mando'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase
      .from('pilots')
      .insert([{ ...formData, owner_id: user.id }]);

    if (error) alert(error.message);
    else onSuccess();
    setLoading(false);
  };

  return (
    <aside className="w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 z-50">
      <div className="p-6 border-b border-slate-100 flex justify-between items-center">
        <h3 className="text-lg font-bold uppercase tracking-tight">Nuevo Piloto</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Nombre Completo</label>
            <input required className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#ec5b13]/20" 
              placeholder="Ej: Juan Sebastián Pérez" onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Número de Licencia / DAN</label>
            <input required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" 
              placeholder="Ej: 123456789" onChange={e => setFormData({...formData, license_number: e.target.value})} />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Vencimiento Certificado Médico</label>
              <input required type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none" 
                onChange={e => setFormData({...formData, medical_expiry: e.target.value})} />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Rol Operativo</label>
            <select className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none appearance-none"
              onChange={e => setFormData({...formData, pilot_role: e.target.value})}>
              <option>PIC - Piloto al Mando</option>
              <option>Observador Visual</option>
              <option>Instructor UAS</option>
              <option>Operador de Carga Útil</option>
            </select>
          </div>
        </div>
      </form>

      <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
        <button type="button" onClick={onClose} className="flex-1 py-3 text-sm font-bold text-slate-500">Cancelar</button>
        <button onClick={handleSubmit} disabled={loading} className="flex-1 py-3 bg-[#ec5b13] text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-500/20">
          {loading ? 'Guardando...' : 'Registrar Piloto'}
        </button>
      </div>
    </aside>
  );
}