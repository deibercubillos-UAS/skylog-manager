'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function NewFlightPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [drones, setDrones] = useState([]);
  const [dynamicChecklist, setDynamicChecklist] = useState([]);
  const [checkedItems, setCheckedItems] = useState({});
  const [formData, setFormData] = useState({ aircraft_id: '', location: '', takeoff_time: '09:00', landing_time: '10:00', notes: '' });

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      // 1. Cargar Drones
      const { data: aircraftData } = await supabase.from('aircraft').select('id, model').eq('owner_id', user.id);
      setDrones(aircraftData || []);
      // 2. Cargar Checklist Personalizado
      const { data: checklistData } = await supabase.from('checklist_templates').select('id, label').eq('owner_id', user.id);
      setDynamicChecklist(checklistData || []);
    }
    loadData();
  }, []);

  // Validación: Solo autoriza si TODOS los ítems dinámicos están marcados
  const isSafeToFly = dynamicChecklist.length > 0 && dynamicChecklist.every(item => checkedItems[item.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase.from('flights').insert([{
      owner_id: user.id,
      pilot_id: user.id,
      aircraft_id: formData.aircraft_id,
      flight_date: new Date().toISOString().split('T')[0],
      takeoff_time: formData.takeoff_time,
      landing_time: formData.landing_time,
      location: formData.location,
      notes: formData.notes,
      mission_type: 'Operación Comercial'
    }]);

    if (!error) router.push('/dashboard/logbook');
    else alert(error.message);
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full -m-8 bg-[#f8f6f6] text-left animate-in fade-in duration-500">
      <header className="bg-white border-b border-slate-200 px-8 py-6 sticky top-0 z-10 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Nueva Operación</h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Protocolo de Seguridad RAC 100</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Lado Izquierdo: Datos */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-xs font-black uppercase text-[#ec5b13] tracking-widest">Datos Generales</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <select required className="w-full rounded-xl border-slate-200 bg-slate-50 p-4 text-sm font-bold outline-none" onChange={(e) => setFormData({...formData, aircraft_id: e.target.value})}>
                <option value="">Seleccionar Aeronave...</option>
                {drones.map(d => <option key={d.id} value={d.id}>{d.model}</option>)}
              </select>
              <input required className="w-full rounded-xl border-slate-200 bg-slate-50 p-4 text-sm font-bold outline-none" placeholder="Ubicación de la misión" onChange={(e) => setFormData({...formData, location: e.target.value})} />
            </div>
            <textarea rows="4" className="w-full rounded-xl border-slate-200 bg-slate-50 p-4 text-sm font-medium outline-none" placeholder="Notas y observaciones de seguridad..." onChange={(e) => setFormData({...formData, notes: e.target.value})} />
          </section>
        </div>

        {/* Lado Derecho: Checklist Dinámico */}
        <aside className="space-y-6">
          <div className="bg-[#1A202C] text-white p-8 rounded-[2.5rem] shadow-2xl space-y-6">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <span className="material-symbols-outlined text-[#ec5b13]">verified</span>
              <h3 className="text-xs font-black uppercase tracking-[0.2em]">Pre-Flight Check</h3>
            </div>
            
            <div className="space-y-3">
              {dynamicChecklist.length > 0 ? dynamicChecklist.map(item => (
                <label key={item.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${checkedItems[item.id] ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-slate-800/50 border-slate-700 hover:border-slate-500'}`}>
                  <span className={`text-[11px] font-bold ${checkedItems[item.id] ? 'text-emerald-400' : 'text-slate-400'}`}>{item.label}</span>
                  <input 
                    type="checkbox" 
                    className="size-5 rounded border-slate-600 text-[#ec5b13] focus:ring-0" 
                    onChange={(e) => setCheckedItems({...checkedItems, [item.id]: e.target.checked})} 
                  />
                </label>
              )) : (
                <p className="text-[10px] text-orange-400 italic text-center py-4 uppercase font-bold">Debes configurar ítems en "Personalizar Checklist" primero.</p>
              )}
            </div>

            <div className="pt-4">
              <button 
                type="submit"
                disabled={!isSafeToFly || loading} 
                className={`w-full py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] transition-all shadow-xl ${
                  isSafeToFly ? 'bg-[#ec5b13] text-white hover:scale-[1.02]' : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                }`}
              >
                {loading ? 'Procesando...' : 'Autorizar Vuelo'}
              </button>
              {!isSafeToFly && dynamicChecklist.length > 0 && (
                <p className="text-[9px] text-red-500 font-black uppercase mt-4 text-center animate-pulse">Checklist Incompleto</p>
              )}
            </div>
          </div>
        </aside>

      </form>
    </div>
  );
}