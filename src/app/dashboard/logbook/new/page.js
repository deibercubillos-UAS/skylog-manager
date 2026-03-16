'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function NewFlightPage() {
  const router = useRouter();
  const [drones, setDrones] = useState([]);
  const [safetyItems, setSafetyItems] = useState({ checklist: [], sora: [] });
  const [checked, setChecked] = useState({}); // { id: boolean }
  const [activeTab, setActiveTab] = useState('checklist');
  const [formData, setFormData] = useState({ aircraft_id: '', location: '', notes: '' });

  useEffect(() => {
    async function loadSafetyData() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: a } = await supabase.from('aircraft').select('id, model').eq('owner_id', user.id);
      const { data: c } = await supabase.from('checklist_templates').select('*').eq('owner_id', user.id);
      const { data: s } = await supabase.from('sora_templates').select('*').eq('owner_id', user.id);
      setDrones(a || []);
      setSafetyItems({ checklist: c || [], sora: s || [] });
    }
    loadSafetyData();
  }, []);

  // VALIDACIONES
  const checklistDone = safetyItems.checklist.length > 0 && safetyItems.checklist.every(i => checked[i.id]);
  const soraDone = safetyItems.sora.length > 0 && safetyItems.sora.every(i => checked[i.id]);
  const isAuthorized = checklistDone && soraDone;

  // CÁLCULO DE RIESGO TOTAL
  const totalRiskScore = safetyItems.sora.reduce((acc, item) => checked[item.id] ? acc + item.score : acc, 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('flights').insert([{ 
      owner_id: user.id, pilot_id: user.id, aircraft_id: formData.aircraft_id,
      location: formData.location, notes: formData.notes, flight_date: new Date().toISOString().split('T')[0],
      sora_total_score: totalRiskScore
    }]);
    router.push('/dashboard/logbook');
  };

  return (
    <div className="flex flex-col h-full -m-8 bg-[#f8f6f6] text-left">
      <header className="bg-white border-b border-slate-200 px-8 py-6 sticky top-0 z-10 flex justify-between items-center">
        <h2 className="text-2xl font-black uppercase">Nueva Operación</h2>
        <div className="flex gap-2">
          <Badge label="Checklist" ok={checklistDone} />
          <Badge label="SORA" ok={soraDone} />
        </div>
      </header>

      <form onSubmit={handleSubmit} className="p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-xs font-black uppercase text-[#ec5b13] tracking-widest">Información de Vuelo</h3>
            <select required className="w-full rounded-xl border-slate-200 bg-slate-50 p-4 text-sm font-bold outline-none" onChange={e => setFormData({...formData, aircraft_id: e.target.value})}>
               <option value="">Aeronave...</option>
               {drones.map(d => <option key={d.id} value={d.id}>{d.model}</option>)}
            </select>
            <input required className="w-full rounded-xl border-slate-200 bg-slate-50 p-4 text-sm font-bold" placeholder="Ubicación" onChange={e => setFormData({...formData, location: e.target.value})} />
            <div className="p-6 bg-slate-900 rounded-2xl text-white">
              <p className="text-[10px] font-black uppercase text-slate-500 mb-1">Nivel de Riesgo Calculado</p>
              <p className="text-3xl font-black">{totalRiskScore} <span className="text-xs text-slate-400 font-bold uppercase">Puntos SORA</span></p>
            </div>
          </section>
        </div>

        <aside className="bg-[#1A202C] text-white p-6 rounded-[2.5rem] shadow-2xl flex flex-col h-[700px]">
          <div className="flex bg-slate-800 rounded-xl p-1 mb-6">
            <button type="button" onClick={() => setActiveTab('checklist')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${activeTab === 'checklist' ? 'bg-[#ec5b13] text-white' : 'text-slate-400'}`}>Checklist</button>
            <button type="button" onClick={() => setActiveTab('sora')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${activeTab === 'sora' ? 'bg-[#ec5b13] text-white' : 'text-slate-400'}`}>Análisis SORA</button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2 text-left">
            {(activeTab === 'checklist' ? safetyItems.checklist : safetyItems.sora).map(item => (
              <label key={item.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${checked[item.id] ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-slate-800/40 border-slate-700'}`}>
                <div className="flex flex-col">
                  <span className={`text-[10px] font-bold ${checked[item.id] ? 'text-emerald-400' : 'text-slate-300'}`}>{item.label}</span>
                  {item.score && <span className="text-[8px] text-slate-500 font-black">VALOR: {item.score}</span>}
                </div>
                <input type="checkbox" className="rounded text-[#ec5b13]" onChange={e => setChecked({...checked, [item.id]: e.target.checked})} />
              </label>
            ))}
          </div>

          <button disabled={!isAuthorized} className={`mt-6 w-full py-5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all ${isAuthorized ? 'bg-[#ec5b13] text-white shadow-xl' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}>
            Autorizar Despegue
          </button>
        </aside>
      </form>
    </div>
  );
}

function Badge({ label, ok }) {
  return (
    <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-1 ${ok ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
      <span className="material-symbols-outlined text-xs">{ok ? 'check_circle' : 'cancel'}</span> {label}
    </div>
  );
}