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
  const [safetyItems, setSafetyItems] = useState({ checklist: [], sora: [] });
  const [checked, setChecked] = useState({});
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
    async function loadResources() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const [profileRes, flightsRes, aircraftRes, pilotsRes, missionsRes, safetyRes] = await Promise.all([
        supabase.from('profiles').select('flight_prefix').eq('id', user.id).single(),
        supabase.from('flights').select('id', { count: 'exact', head: true }).eq('owner_id', user.id),
        supabase.from('aircraft').select('*').eq('owner_id', user.id).eq('status', 'Operativo'),
        supabase.from('pilots').select('*').eq('owner_id', user.id).eq('is_active', true),
        supabase.from('mission_types').select('*').eq('owner_id', user.id),
        fetch(`/api/safety-config?userId=${user.id}`, { headers: { 'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}` } }).then(r => r.json())
      ]);

      const prefix = profileRes.data?.flight_prefix || 'SKL';
      const count = flightsRes.count || 0;
      const nextId = `${prefix}-${(count + 1).toString().padStart(4, '0')}`;

      setData({ drones: aircraftRes.data || [], pilots: pilotsRes.data || [], missions: missionsRes.data || [] });
      setSafetyItems(safetyRes);
      setFormData(prev => ({ ...prev, flight_number: nextId }));
    }
    loadResources();
  }, []);

  // Agrupamiento dinámico para la UI
  const groupedChecklist = safetyItems.checklist.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const isChecklistOk = safetyItems.checklist.length > 0 && safetyItems.checklist.every(i => checked[i.id]);
  const isSoraOk = safetyItems.sora.length > 0 && safetyItems.sora.every(i => checked[i.id]);
  const isAuthorized = isChecklistOk && isSoraOk;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthorized) return alert("Seguridad insuficiente. Complete el checklist.");
    
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/logbook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({
          userId: session.user.id,
          flightData: {
            ...formData,
            flight_date: new Date().toISOString().split('T')[0],
            checklist_details: checked // Guardamos evidencia de qué se marcó
          }
        }),
      });

      if (!response.ok) throw new Error("Error al registrar vuelo");
      router.push('/dashboard/logbook');
    } catch (err) {
      alert(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full -m-8 bg-[#f8f6f6] text-left animate-in fade-in duration-500">
      <header className="bg-white border-b border-slate-200 px-8 py-6 sticky top-0 z-10 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Nueva Operación</h2>
          <div className="flex gap-2 mt-1">
             <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${isChecklistOk ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>Checklist {isChecklistOk ? '✓' : ''}</span>
             <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${isSoraOk ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>SORA {isSoraOk ? '✓' : ''}</span>
             <span className="text-[10px] font-black text-[#ec5b13] ml-2">ID: {formData.flight_number}</span>
          </div>
        </div>
        <Link href="/dashboard/logbook" className="text-xs font-bold text-slate-400 hover:text-red-500 uppercase tracking-widest">Cancelar</Link>
      </header>

      <form onSubmit={handleSubmit} className="p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest border-b border-slate-50 pb-2">Información de Misión</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Piloto al Mando</label>
                <select required className="w-full rounded-xl border-slate-200 bg-slate-50 p-4 text-sm font-bold outline-none" onChange={e => setFormData({...formData, pilot_id: e.target.value})}>
                  <option value="">Seleccionar...</option>
                  {data.pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Tipo de Misión</label>
                <select required className="w-full rounded-xl border-slate-200 bg-slate-50 p-4 text-sm font-bold outline-none" onChange={e => setFormData({...formData, mission_type: e.target.value})}>
                  <option value="">Seleccionar...</option>
                  {data.missions.map(m => <option key={m.id} value={m.label}>{m.label}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Aeronave</label>
                <select required className="w-full rounded-xl border-slate-200 bg-slate-50 p-4 text-sm font-bold outline-none" onChange={e => setFormData({...formData, aircraft_id: e.target.value})}>
                  <option value="">Seleccionar...</option>
                  {data.drones.map(d => <option key={d.id} value={d.id}>{d.model}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Ubicación</label>
                <input required className="w-full rounded-xl border-slate-200 bg-slate-50 p-4 text-sm font-bold" placeholder="Ciudad / Coordenadas" onChange={e => setFormData({...formData, location: e.target.value})} />
              </div>
            </div>
            <textarea rows="3" className="w-full rounded-xl border-slate-200 bg-slate-50 p-4 text-sm outline-none" placeholder="Observaciones técnicas..." onChange={e => setFormData({...formData, notes: e.target.value})} />
          </section>
        </div>

        {/* ASIDE DE PROTOCOLO DINÁMICO */}
        <aside className="bg-[#1A202C] text-white p-6 rounded-[2.5rem] shadow-2xl flex flex-col h-[700px]">
          <div className="flex bg-slate-800 rounded-xl p-1 mb-6">
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
                        <input type="checkbox" className="rounded text-[#ec5b13] focus:ring-0" onChange={e => setChecked({...checked, [item.id]: e.target.checked})} />
                      </label>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              safetyItems.sora.map(item => (
                <label key={item.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${checked[item.id] ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-slate-800/40 border-slate-700'}`}>
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] font-bold leading-tight">{item.label}</span>
                    <span className="text-[8px] text-slate-500 font-black uppercase mt-1">Impacto: {item.score} pts</span>
                  </div>
                  <input type="checkbox" className="rounded text-[#ec5b13] focus:ring-0" onChange={e => setChecked({...checked, [item.id]: e.target.checked})} />
                </label>
              ))
            )}
          </div>

          <button disabled={!isAuthorized || loading} className={`mt-6 w-full py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all ${isAuthorized ? 'bg-[#ec5b13] text-white hover:scale-[1.02]' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}>
            {loading ? 'AUTORIZANDO...' : 'FINALIZAR Y DESPEGAR'}
          </button>
        </aside>
      </form>
    </div>
  );
}