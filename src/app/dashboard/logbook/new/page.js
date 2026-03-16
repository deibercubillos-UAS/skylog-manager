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
      // Cargar Drones
      const { data: aircraftData } = await supabase.from('aircraft').select('id, model, serial_number').eq('owner_id', user.id);
      setDrones(aircraftData || []);
      // Cargar Checklist Dinámico desde la nueva tabla
      const { data: checklistData } = await supabase.from('checklist_templates').select('id, label').eq('owner_id', user.id);
      setDynamicChecklist(checklistData || []);
    }
    loadData();
  }, []);

  const isSafeToFly = dynamicChecklist.length > 0 && dynamicChecklist.every(item => checkedItems[item.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('flights').insert([{
      owner_id: user.id, pilot_id: user.id, aircraft_id: formData.aircraft_id,
      flight_date: new Date().toISOString().split('T')[0],
      takeoff_time: formData.takeoff_time, landing_time: formData.landing_time,
      location: formData.location, notes: formData.notes, mission_type: 'Inspección'
    }]);
    if (!error) { router.push('/dashboard/logbook'); }
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full -m-8 bg-slate-50 text-left">
      <header className="bg-white border-b border-slate-200 px-8 py-6 sticky top-0 z-10">
        <h2 className="text-2xl font-black uppercase">Nueva Operación</h2>
      </header>

      <form onSubmit={handleSubmit} className="p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Datos del Vuelo</h3>
            <select required className="w-full rounded-xl border-slate-200 bg-slate-50 p-3 text-sm font-bold" onChange={(e) => setFormData({...formData, aircraft_id: e.target.value})}>
               <option value="">Seleccionar Aeronave...</option>
               {drones.map(d => <option key={d.id} value={d.id}>{d.model}</option>)}
            </select>
            <input required className="w-full rounded-xl border-slate-200 bg-slate-50 p-3 text-sm font-bold" placeholder="Ubicación" onChange={(e) => setFormData({...formData, location: e.target.value})} />
          </section>
        </div>

        <aside className="space-y-6">
          <div className="bg-[#1A202C] text-white p-6 rounded-3xl shadow-xl space-y-4">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#ec5b13]">Pre-Flight Check</h3>
            <div className="space-y-2">
              {dynamicChecklist.map(item => (
                <label key={item.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-xl border border-slate-700 cursor-pointer">
                  <span className="text-[11px] font-bold text-slate-300">{item.label}</span>
                  <input type="checkbox" className="rounded text-[#ec5b13]" onChange={(e) => setCheckedItems({...checkedItems, [item.id]: e.target.checked})} />
                </label>
              ))}
            </div>
            <button disabled={!isSafeToFly} className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${isSafeToFly ? 'bg-[#ec5b13] text-white' : 'bg-slate-700 text-slate-500 cursor-not-allowed'}`}>
              Autorizar Vuelo
            </button>
          </div>
        </aside>
      </form>
    </div>
  );
}
