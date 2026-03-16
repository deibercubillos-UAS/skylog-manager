'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function NewFlightPage() {
  const router = useRouter();
  const [drones, setDrones] = useState([]);
  const [dynamicChecklist, setDynamicChecklist] = useState([]);
  const [checkedItems, setCheckedItems] = useState({});
  const [formData, setFormData] = useState({ aircraft_id: '', location: '', takeoff_time: '09:00', landing_time: '10:00', notes: '' });

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: a } = await supabase.from('aircraft').select('id, model').eq('owner_id', user.id);
      const { data: c } = await supabase.from('checklist_templates').select('*').eq('owner_id', user.id);
      setDrones(a || []);
      setDynamicChecklist(c || []);
    }
    loadData();
  }, []);

  const isSafeToFly = dynamicChecklist.length > 0 && dynamicChecklist.every(item => checkedItems[item.id]);

  // Agrupar para renderizar en la UI
  const groupedChecklist = dynamicChecklist.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('flights').insert([{ 
      owner_id: user.id, pilot_id: user.id, aircraft_id: formData.aircraft_id,
      location: formData.location, notes: formData.notes, flight_date: new Date().toISOString().split('T')[0]
    }]);
    router.push('/dashboard/logbook');
  };

  return (
    <div className="flex flex-col h-full -m-8 bg-[#f8f6f6] text-left">
      <header className="bg-white border-b border-slate-200 px-8 py-6 sticky top-0 z-10">
        <h2 className="text-2xl font-black uppercase text-slate-900 tracking-tighter">Preparación de Vuelo</h2>
      </header>

      <form onSubmit={handleSubmit} className="p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* FORMULARIO IZQUIERDO */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-xs font-black uppercase text-[#ec5b13] tracking-widest">Información Básica</h3>
            <select required className="w-full rounded-xl border-slate-200 bg-slate-50 p-4 text-sm font-bold outline-none" onChange={e => setFormData({...formData, aircraft_id: e.target.value})}>
               <option value="">Seleccionar Aeronave...</option>
               {drones.map(d => <option key={d.id} value={d.id}>{d.model}</option>)}
            </select>
            <input required className="w-full rounded-xl border-slate-200 bg-slate-50 p-4 text-sm font-bold outline-none" placeholder="Ubicación de despegue" onChange={e => setFormData({...formData, location: e.target.value})} />
            <textarea rows="3" className="w-full rounded-xl border-slate-200 bg-slate-50 p-4 text-sm outline-none" placeholder="Observaciones..." onChange={e => setFormData({...formData, notes: e.target.value})} />
          </section>
        </div>

        {/* CHECKLIST AGRUPADO DERECHO */}
        <aside>
          <div className="bg-[#1A202C] text-white p-8 rounded-[2.5rem] shadow-2xl space-y-8 max-h-[80vh] overflow-y-auto custom-scrollbar">
            <div className="border-b border-white/10 pb-4">
               <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[#ec5b13]">Pre-Flight Protocol</h3>
            </div>

            {Object.keys(groupedChecklist).map(cat => (
              <div key={cat} className="space-y-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white/5 p-2 rounded-lg">{cat}</p>
                <div className="space-y-2 pl-2">
                  {groupedChecklist[cat].map(item => (
                    <label key={item.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${checkedItems[item.id] ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-slate-800/40 border-slate-700'}`}>
                      <span className={`text-[10px] font-bold ${checkedItems[item.id] ? 'text-emerald-400' : 'text-slate-400'}`}>{item.label}</span>
                      <input type="checkbox" className="size-4 rounded border-slate-600 text-[#ec5b13] focus:ring-0" onChange={e => setCheckedItems({...checkedItems, [item.id]: e.target.checked})} />
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <button disabled={!isSafeToFly} className={`w-full py-5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${isSafeToFly ? 'bg-[#ec5b13] text-white shadow-xl hover:scale-105' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}>
              Autorizar y Despegar
            </button>
          </div>
        </aside>
      </form>
    </div>
  );
}