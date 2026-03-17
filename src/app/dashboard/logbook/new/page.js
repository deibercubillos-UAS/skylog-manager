'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewFlightPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({ drones: [], pilots: [], missions: [], profile: {} });
  const [checked, setChecked] = useState({});
  const [safetyItems, setSafetyItems] = useState({ checklist: [], sora: [] });
  const [activeTab, setActiveTab] = useState('checklist');

  const [formData, setFormData] = useState({
    aircraft_id: '',
    pilot_id: '', // Este DEBE venir de la tabla pilots
    mission_type: '',
    location: '',
    takeoff_time: '09:00',
    landing_time: '10:00',
    notes: '',
    flight_number: ''
  });

  useEffect(() => {
    async function loadAll() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: aircraft } = await supabase.from('aircraft').select('*').eq('owner_id', user.id);
      const { data: pilotsList } = await supabase.from('pilots').select('*').eq('owner_id', user.id);
      const { data: missions } = await supabase.from('mission_types').select('*').eq('owner_id', user.id);
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      const { data: c } = await supabase.from('checklist_templates').select('*').eq('owner_id', user.id);
      const { data: s } = await supabase.from('sora_templates').select('*').eq('owner_id', user.id);
      
      const { count } = await supabase.from('flights').select('*', { count: 'exact', head: true }).eq('owner_id', user.id);
      const nextNum = `${profile?.flight_prefix || 'SKL'}-${(count + 1).toString().padStart(4, '0')}`;

      setData({ drones: aircraft || [], pilots: pilotsList || [], missions: missions || [], profile });
      setSafetyItems({ checklist: c || [], sora: s || [] });
      setFormData(prev => ({ ...prev, flight_number: nextNum }));
    }
    loadAll();
  }, []);

  const isAuthorized = safetyItems.checklist.every(i => checked[i.id]) && safetyItems.sora.every(i => checked[i.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    // --- DEPURACIÓN: Verificamos qué se envía ---
    console.log("Enviando pilot_id:", formData.pilot_id);

    const { error } = await supabase.from('flights').insert([{
      flight_number: formData.flight_number,
      aircraft_id: formData.aircraft_id,
      pilot_id: formData.pilot_id, // ID de la tabla pilots
      mission_type: formData.mission_type,
      location: formData.location,
      takeoff_time: formData.takeoff_time,
      landing_time: formData.landing_time,
      notes: formData.notes,
      owner_id: user.id,
      flight_date: new Date().toISOString().split('T')[0]
    }]);

    if (!error) {
      router.push('/dashboard/logbook');
    } else {
      console.error("Error de Supabase:", error);
      alert("Falla de vinculación: El piloto seleccionado no es válido en la base de datos.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full -m-8 bg-[#f8f6f6] text-left animate-in fade-in duration-500">
      <header className="bg-white border-b border-slate-200 px-8 py-6 sticky top-0 z-10 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Nueva Operación</h2>
          <p className="text-[10px] font-bold text-primary uppercase tracking-widest">ID Vuelo: {formData.flight_number}</p>
        </div>
        <Link href="/dashboard/logbook" className="text-xs font-bold text-slate-400 hover:text-red-500">CANCELAR</Link>
      </header>

      <form onSubmit={handleSubmit} className="p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-xs font-black uppercase text-[#ec5b13] tracking-widest">Configuración Técnica</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* SELECTOR DE PILOTO (CRÍTICO) */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Piloto al Mando (PIC)</label>
                <select 
                  required 
                  className="w-full rounded-xl border-slate-200 bg-slate-50 p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-[#ec5b13]/20"
                  value={formData.pilot_id} 
                  onChange={e => setFormData({...formData, pilot_id: e.target.value})}
                >
                  <option value="">Seleccione un piloto de la lista...</option>
                  {data.pilots.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                {data.pilots.length === 0 && (
                  <p className="text-[9px] text-red-500 font-bold uppercase mt-1">⚠️ No hay pilotos. Crea uno en 'Mis Pilotos' primero.</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Aeronave</label>
                <select required className="w-full rounded-xl border-slate-200 bg-slate-50 p-4 text-sm font-bold outline-none"
                  value={formData.aircraft_id} onChange={e => setFormData({...formData, aircraft_id: e.target.value})}>
                  <option value="">Seleccionar Drone...</option>
                  {data.drones.map(d => <option key={d.id} value={d.id}>{d.model} ({d.serial_number})</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Ubicación</label>
                <input required className="w-full rounded-xl border-slate-200 bg-slate-50 p-4 text-sm font-bold outline-none" 
                  placeholder="Ej: Base Norte" onChange={e => setFormData({...formData, location: e.target.value})} />
              </div>

              <div className="space-y-2">
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

        {/* ASIDE DE SEGURIDAD */}
        <aside className="bg-[#1A202C] text-white p-6 rounded-[2.5rem] shadow-2xl flex flex-col h-[600px]">
          <div className="flex bg-slate-800 rounded-xl p-1 mb-6">
            <button type="button" onClick={() => setActiveTab('checklist')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${activeTab === 'checklist' ? 'bg-primary text-white' : 'text-slate-400'}`}>Seguridad</button>
            <button type="button" onClick={() => setActiveTab('sora')} className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${activeTab === 'sora' ? 'bg-primary text-white' : 'text-slate-400'}`}>SORA</button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
            {(activeTab === 'checklist' ? safetyItems.checklist : safetyItems.sora).map(item => (
              <label key={item.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${checked[item.id] ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-slate-800/40 border-slate-700'}`}>
                <span className="text-[10px] font-bold text-left leading-tight">{item.label}</span>
                <input type="checkbox" className="rounded text-primary" onChange={e => setChecked({...checked, [item.id]: e.target.checked})} />
              </label>
            ))}
          </div>

          <button disabled={!isAuthorized || loading} className={`mt-6 w-full py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all ${isAuthorized ? 'bg-primary text-white' : 'bg-slate-800 text-slate-600 cursor-not-allowed'}`}>
            {loading ? 'Sincronizando...' : 'Finalizar y Guardar'}
          </button>
        </aside>
      </form>
    </div>
  );
}