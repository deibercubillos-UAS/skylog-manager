'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
    notes: '', // CASILLA DE OBSERVACIONES RESTAURADA
    flight_number: 'Cargando...'
  });

  useEffect(() => {
    async function loadAll() {
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
    loadAll();
  }, []);

  // AGRUPAR CHECKLIST POR CATEGORÍA (Motores, Estructura, etc)
  const groupedChecklist = safetyItems.checklist.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const isAuthorized = safetyItems.checklist.length > 0 && 
                     safetyItems.checklist.every(i => checked[i.id]) && 
                     safetyItems.sora.every(i => checked[i.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase.from('flights').insert([{
      flight_number: formData.flight_number,
      aircraft_id: formData.aircraft_id,
      pilot_id: formData.pilot_id,
      mission_type: formData.mission_type,
      location: formData.location,
      takeoff_time: formData.takeoff_time,
      landing_time: formData.landing_time,
      notes: formData.notes,
      owner_id: user.id,
      flight_date: new Date().toISOString().split('T')[0]
    }]);

    if (!error) router.push('/dashboard/logbook');
    else { alert(error.message); setLoading(false); }
  };

  return (
    <div className="flex flex-col h-full -m-8 bg-[#f8f6f6] text-left animate-in fade-in duration-500">
      <header className="bg-white border-b border-slate-200 px-8 py-6 sticky top-0 z-10 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Registro de Operación</h2>
          <span className="text-[10px] font-black bg-orange-100 text-[#ec5b13] px-2 py-0.5 rounded uppercase tracking-widest mt-1 inline-block">
            ID: {formData.flight_number}
          </span>
        </div>
        <Link href="/dashboard/logbook" className="text-xs font-bold text-slate-400 hover:text-red-500 uppercase tracking-widest">Cancelar</Link>
      </header>

      <form onSubmit={handleSubmit} className="p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest border-b border-slate-50 pb-2">Datos de Misión</h3>
            
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
                <input required className="w-full rounded-xl border-slate-200 bg-slate-50 p-4 text-sm font-bold" 
                  placeholder="Ciudad o Coordenadas" onChange={e => setFormData({...formData, location: e.target.value})} />
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

            {/* CASILLA DE OBSERVACIONES RESTAURADA */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Novedades y Observaciones</label>
              <textarea rows="3" className="w-full rounded-xl border-slate-200 bg-slate-50 p-4 text-sm outline-none focus:ring-2 focus:ring-[#ec5b13]/10" 
                placeholder="Escriba aquí fallos técnicos, interferencias o incidentes..." value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
            </div>
          </section>
        </div>

        {/* PANEL DE SEGURIDAD (CHECKLIST AGRUPADO) */}
        <aside className="bg-[#1A202C] text-white p-6 rounded-[2.5rem] shadow-2xl flex flex-col h-[700px]">
          <div className="flex bg-slate-800 rounded-xl p-1 mb-6 shrink-0">
            <button type="button" onClick={() => setActiveTab('checklist')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${activeTab === 'checklist' ? 'bg-[#ec5b13] text-white' : 'text-slate-400'}`}>Checklist</button>
            <button type="button" onClick={() => setActiveTab('sora')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${activeTab === 'sora' ? 'bg-[#ec5b13] text-white' : 'text-slate-400'}`}>SORA</button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pr-2">
            {activeTab === 'checklist' ? (
              Object.keys(groupedChecklist).map(cat => (
                <div key={cat} className="space-y-2">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-white/5 p-2 rounded-lg">{cat}</p>
                  <div className="space-y-2 pl-1">
                    {groupedChecklist[cat].map(item => (
                      <label key={item.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${checked[item.id] ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-slate-800/40 border-slate-700'}`}>
                        <span className="text-[10px] font-bold leading-tight">{item.label}</span>
                        <input type="checkbox" className="rounded text-[#ec5b13]" onChange={e => setChecked({...checked, [item.id]: e.target.checked})} />
                      </label>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              safetyItems.sora.map(item => (
                <label key={item.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${checked[item.id] ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-slate-800/40 border-slate-700'}`}>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-left">{item.label}</span>
                    <span className="text-[8px] text-slate-500 font-black">VALOR: {item.score}</span>
                  </div>
                  <input type="checkbox" className="rounded text-[#ec5b13]" onChange={e => setChecked({...checked, [item.id]: e.target.checked})} />
                </label>
              ))
            )}
          </div>

          <button disabled={!isAuthorized || loading} className={`mt-6 w-full py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all ${isAuthorized ? 'bg-[#ec5b13] text-white hover:scale-105' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}>
            {loading ? 'Sincronizando...' : 'Autorizar y Guardar'}
          </button>
        </aside>
      </form>
    </div>
  );
}