'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function AddMaintenancePanel({ onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [drones, setDrones] = useState([]);
  const [formData, setFormData] = useState({
    aircraft_id: '',
    maintenance_type: 'ROUTINE',
    technician: '',
    description: ''
  });

  useEffect(() => {
    async function loadDrones() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('aircraft').select('id, model').eq('owner_id', user.id);
      setDrones(data || []);
    }
    loadDrones();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase.from('maintenance_logs').insert([{
      ...formData,
      owner_id: user.id
    }]);

    if (!error) {
      alert("Registro de mantenimiento guardado");
      onSuccess();
    } else {
      alert(error.message);
    }
    setLoading(false);
  };

  return (
    <aside className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-50 animate-in slide-in-from-right duration-300 flex flex-col">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
        <h3 className="text-lg font-black uppercase tracking-tighter">Registrar Intervención</h3>
        <button onClick={onClose} className="material-symbols-outlined text-slate-400 hover:text-red-500">close</button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 flex-1 space-y-6 text-left overflow-y-auto">
        <div className="space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Aeronave a Intervenir</label>
            <select required className="w-full bg-slate-50 dark:bg-slate-800 border-slate-200 rounded-xl p-3 text-sm font-bold"
              onChange={e => setFormData({...formData, aircraft_id: e.target.value})}>
              <option value="">Seleccionar Drone...</option>
              {drones.map(d => <option key={d.id} value={d.id}>{d.model}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Tipo de Mantenimiento</label>
            <div className="grid grid-cols-3 gap-2">
              {['ROUTINE', 'REPAIR', 'UPDATE'].map(type => (
                <button key={type} type="button" 
                  onClick={() => setFormData({...formData, maintenance_type: type})}
                  className={`py-2 text-[10px] font-black rounded-lg border transition-all ${formData.maintenance_type === type ? 'bg-[#ec5b13] border-[#ec5b13] text-white shadow-lg' : 'bg-white text-slate-400 border-slate-200'}`}>
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Técnico Responsable</label>
            <input required type="text" className="w-full bg-slate-50 border-slate-200 rounded-xl p-3 text-sm font-bold" placeholder="Nombre del ingeniero"
              onChange={e => setFormData({...formData, technician: e.target.value})} />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-400 mb-2">Descripción de la Tarea</label>
            <textarea required rows="4" className="w-full bg-slate-50 border-slate-200 rounded-xl p-3 text-sm font-medium" placeholder="Detalle las piezas cambiadas o ajustes realizados..."
              onChange={e => setFormData({...formData, description: e.target.value})} />
          </div>
        </div>
      </form>

      <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
        <button type="button" onClick={onClose} className="flex-1 py-3 text-xs font-black uppercase text-slate-400">Cancelar</button>
        <button type="submit" onClick={handleSubmit} disabled={loading} className="flex-2 px-8 py-3 bg-[#ec5b13] text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-orange-500/20">
          {loading ? 'Guardando...' : 'Finalizar Registro'}
        </button>
      </div>
    </aside>
  );
}