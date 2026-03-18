'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Componente Principal de la Página
export default function NewFlightPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ drones: [], pilots: [], missions: [] });
  const [checked, setChecked] = useState({});
  const [safetyItems, setSafetyItems] = useState({ checklist: [], sora: [] });
  const [activeTab, setActiveTab] = useState('checklist');

  const [formData, setFormData] = useState({
    aircraft_id: '',
    pilot_id: '',
    mission_type: '',
    location: '',
    takeoff_time: '09:00',
    landing_time: '10:00',
    notes: '',
    flight_number: 'Calculando...'
  });

  useEffect(() => {
    async function loadInitialData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const [profileRes, flightsRes, aircraftRes, pilotsRes, missionsRes, checklistRes, soraRes] = await Promise.all([
        supabase.from('profiles').select('flight_prefix').eq('id', user.id).single(),
        supabase.from('flights').select('id', { count: 'exact', head: true }).eq('owner_id', user.id),
        supabase.from('aircraft').select('*').eq('owner_id', user.id),
        supabase.from('pilots').select('*').eq('owner_id', user.id),
        supabase.from('mission_types').select('*').eq('owner_id', user.id),
        supabase.from('checklist_templates').select('*').eq('owner_id', user.id),
        supabase.from('sora_templates').select('*').eq('owner_id', user.id)
      ]);

      const prefix = profileRes.data?.flight_prefix || 'SKL';
      const count = flightsRes.count || 0;
      const nextId = `${prefix}-${(count + 1).toString().padStart(4, '0')}`;

      setData({ drones: aircraftRes.data || [], pilots: pilotsRes.data || [], missions: missionsRes.data || [] });
      setSafetyItems({ checklist: checklistRes.data || [], sora: soraRes.data || [] });
      setFormData(prev => ({ ...prev, flight_number: nextId, pilot_id: user.id }));
    }
    loadInitialData();
  }, []);

  const checklistDone = safetyItems.checklist.length > 0 && safetyItems.checklist.every(i => checked[i.id]);
  const soraDone = safetyItems.sora.length > 0 && safetyItems.sora.every(i => checked[i.id]);
  const isAuthorized = checklistDone && soraDone;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthorized) return alert("Debe completar los protocolos de seguridad.");
    
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/logbook', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          userId: session.user.id,
          flightData: {
            ...formData,
            flight_date: new Date().toISOString().split('T')[0]
          }
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error);

      alert("✅ Vuelo registrado exitosamente.");
      router.push('/dashboard/logbook');
    } catch (err) {
      alert("Error: " + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full -m-8 bg-[#f8f6f6] text-left animate-in fade-in duration-500">
      <header className="bg-white border-b border-slate-200 px-8 py-6 sticky top-0 z-10 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 leading-none">Nueva Operación</h2>
          <div className="flex items-center gap-2 mt-2">
            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${checklistDone ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>Checklist</span>
            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${soraDone ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>SORA</span>
            <span className="text-[10px] font-black text-[#ec5b13] ml-2">ID: {formData.flight_number}</span>
          </div>
        </div>
        <Link href="/dashboard/logbook" className="text-xs font-bold text-slate-400 hover:text-red-500">CANCELAR</Link>
      </header>

      <form onSubmit={handleSubmit} className="p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest border-b border-slate-50 pb-2">Configuración de Vuelo</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Piloto al Mando</label>
                <select required className="w-full rounded-xl border-slate-200 bg-slate-50 p-4 text-sm font-bold outline-none"
                  value={formData.pilot_id} onChange={e => setFormData({...formData, pilot_id: e.target.value})}>
                  <option value="">Seleccionar...</option>
                  {data.pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Aeronave</label>
                <select required className="w-full rounded-xl border-slate-200 bg-slate-50 p-4 text-sm font-bold outline-none"
                  value={formData.aircraft_id} onChange={e => setFormData({...formData, aircraft_id: e.target.value})}>
                  <option value="">Seleccionar...</option>
                  {data.drones.map(d => <option key={d.id} value={d.id}>{d.model}</option>)}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Ubicación</label>
                <input required className="w-full rounded-xl border-slate-200 bg-slate-50 p-4 text-sm font-bold outline-none" 
                  placeholder="Ej: Base Norte" onChange={e => setFormData({...formData, location: e.target.value})} />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Tipo de Misión</label>
                <select required className="w-full rounded-xl border-slate-200 bg-slate-50 p-4 text-sm font-bold outline-none"
                  onChange={e => setFormData({...formData, mission_type: e.target.value})}>
                  <option value="">Seleccionar...</option>
                  {data.missions.map(m => <option key={m.id} value={m.label}>{m.label}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-50">
              <input type="time" required className="rounded-xl border-slate-200 bg-slate-50 p-4 font-mono font-bold" onChange={e => setFormData({...formData, takeoff_time: e.target.value})} />
              <input type="time" required className="rounded-xl border-slate-200 bg-slate-50 p-4 font-mono font-bold" onChange={e => setFormData({...formData, landing_time: e.target.value})} />
            </div>

            <textarea rows="3" className="w-full rounded-xl border-slate-200 bg-slate-50 p-4 text-sm outline-none" 
              placeholder="Novedades u observaciones..." onChange={e => setFormData({...formData, notes: e.target.value})} />
          </section>
        </div>

        <aside className="bg-[#1A202C] text-white p-6 rounded-[2.5rem] shadow-2xl flex flex-col h-[650px]">
          <div className="flex bg-slate-800 rounded-xl p-1 mb-6">
            <button type="button" onClick={() => setActiveTab('checklist')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${activeTab === 'checklist' ? 'bg-[#ec5b13] text-white' : 'text-slate-400'}`}>Seguridad</button>
            <button type="button" onClick={() => setActiveTab('sora')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${activeTab === 'sora' ? 'bg-[#ec5b13] text-white' : 'text-slate-400'}`}>SORA</button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {(activeTab === 'checklist' ? safetyItems.checklist : safetyItems.sora).map(item => (
              <label key={item.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${checked[item.id] ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-slate-800/40 border-slate-700'}`}>
                <span className="text-[10px] font-bold text-left leading-tight">{item.label}</span>
                <input type="checkbox" className="rounded text-primary focus:ring-0" onChange={e => setChecked({...checked, [item.id]: e.target.checked})} />
              </label>
            ))}
          </div>

          <button disabled={!isAuthorized || loading} className={`mt-6 w-full py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all ${isAuthorized ? 'bg-[#ec5b13] text-white' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}>
            {loading ? 'Sincronizando...' : 'Autorizar y Guardar'}
          </button>
        </aside>
      </form>
    </div>
  );
}