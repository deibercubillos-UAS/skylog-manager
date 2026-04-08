'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function NewFlightPage() {
  const router = useRouter();
  const [data, setData] = useState({ drones: [], pilots: [], auths: [] });
  const [checked, setChecked] = useState({});
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    aircraft_id: '', pilot_id: '', mission_type: 'General', 
    location: '', takeoff_time: '', landing_time: '', notes: '', mission_id: ''
  });

  useEffect(() => {
    async function loadResources() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
      
      const [aircraft, pilots, auths] = await Promise.all([
        supabase.from('aircraft').select('*').eq('organization_id', prof.organization_id).eq('status', 'Operativo'),
        supabase.from('pilots').select('*').eq('organization_id', prof.organization_id).eq('is_active', true),
        supabase.from('flight_authorizations').select('*').eq('organization_id', prof.organization_id).eq('status', 'pendiente')
      ]);

      setData({ drones: aircraft.data || [], pilots: pilots.data || [], auths: auths.data || [] });
    }
    loadResources();
  }, []);

  const handleSelectAuth = (authId) => {
    const auth = data.auths.find(a => a.id === authId);
    if (auth) {
        setFormData({
            ...formData,
            aircraft_id: auth.aircraft_id,
            pilot_id: auth.pilot_id,
            location: auth.location,
            mission_id: auth.mission_id
        });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Lógica de guardado en la tabla flights y actualización de status en authorizations
    const { error } = await supabase.from('flights').insert([{ ...formData, created_at: new Date() }]);
    if (!error) {
        await supabase.from('flight_authorizations').update({ status: 'realizado' }).eq('mission_id', formData.mission_id);
        router.push('/dashboard/logbook');
    }
    setLoading(false);
  };

  return (
    <div className="flex h-screen -m-8 bg-[#f8f6f6] text-left">
      <div className="flex-1 overflow-y-auto p-10 space-y-8">
        <header className="flex justify-between items-center">
            <h2 className="text-3xl font-black uppercase tracking-tighter">Nueva Operación</h2>
            <Link href="/dashboard/logbook" className="text-xs font-bold text-slate-400 uppercase">Cancelar</Link>
        </header>

        {/* SELECCIONADOR DE MISIÓN PROGRAMADA */}
        <section className="bg-orange-50 p-8 rounded-[2.5rem] border border-orange-200">
            <label className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Cargar Misión Programada</label>
            <select className="w-full mt-2 p-4 bg-white rounded-2xl border-none font-bold text-slate-700 shadow-sm" onChange={e => handleSelectAuth(e.target.value)}>
                <option value="">-- Vuelo Libre o Seleccionar Misión --</option>
                {data.auths.map(a => <option key={a.id} value={a.id}>{a.mission_id} - {a.location}</option>)}
            </select>
        </section>

        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-200 grid grid-cols-2 gap-6">
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Piloto al Mando</label>
                    <select required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" value={formData.pilot_id} onChange={e => setFormData({...formData, pilot_id: e.target.value})}>
                        <option value="">Seleccionar...</option>
                        {data.pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Aeronave</label>
                    <select required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" value={formData.aircraft_id} onChange={e => setFormData({...formData, aircraft_id: e.target.value})}>
                        <option value="">Seleccionar...</option>
                        {data.drones.map(d => <option key={d.id} value={d.id}>{d.model}</option>)}
                    </select>
                </div>
                <div className="col-span-2 space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400">Ubicación</label>
                    <input required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                </div>
            </div>
            <button type="submit" className="w-full py-5 bg-orange-600 text-white font-black rounded-[2rem] shadow-xl">FINALIZAR Y REGISTRAR VUELO</button>
        </form>
      </div>

      {/* PANEL LATERAL DE PROTOCOLOS (EL QUE TE GUSTA) */}
      <aside className="w-96 bg-[#1A202C] text-white p-8 flex flex-col">
          <h3 className="text-orange-500 text-[10px] font-black uppercase tracking-[0.2em] mb-10">Protocolos de Seguridad</h3>
          <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="space-y-3">
                  <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-white/5 p-2 rounded">Checklist Pre-Vuelo</p>
                  <label className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10 text-xs">
                      Sistemas de Energía OK <input type="checkbox" className="rounded border-none text-orange-600 focus:ring-0" />
                  </label>
                  <label className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/10 text-xs">
                      Motores y Hélices OK <input type="checkbox" className="rounded border-none text-orange-600 focus:ring-0" />
                  </label>
              </div>
          </div>
      </aside>
    </div>
  );
}