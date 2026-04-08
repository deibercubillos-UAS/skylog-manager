'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AircraftCard from '@/components/AircraftCard';
import BatteryCard from '@/components/BatteryCard';
import AddAircraftPanel from '@/components/AddAircraftPanel';
import AddBatteryPanel from '@/components/AddBatteryPanel';

export default function FleetPage() {
  const [data, setData] = useState({ fleet: [], batteries: [] });
  const [loading, setLoading] = useState(true);
  const [activePanel, setActivePanel] = useState(null); // 'drone' o 'battery'

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
    
    if (prof?.organization_id) {
      const [aircraft, batteries] = await Promise.all([
        supabase.from('aircraft').select('*').eq('organization_id', prof.organization_id).order('created_at', { ascending: false }),
        supabase.from('batteries').select('*').eq('organization_id', prof.organization_id).order('created_at', { ascending: false })
      ]);
      setData({ fleet: aircraft.data || [], batteries: batteries.data || [] });
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return <div className="p-20 text-center font-black animate-pulse uppercase text-slate-400">Sincronizando Activos...</div>;

  return (
    <div className="space-y-16 text-left animate-in fade-in duration-500 pb-20">
      {/* SECCIÓN AERONAVES */}
      <section>
        <header className="flex justify-between items-end border-b border-slate-200 pb-4 mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Aeronaves UAS</h2>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{data.fleet.length} UNIDADES REGISTRADAS</p>
          </div>
          <button onClick={() => setActivePanel('drone')} className="bg-[#1A202C] text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-orange-600 transition-all">+ Nuevo Drone</button>
        </header>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {data.fleet.map(drone => <AircraftCard key={drone.id} aircraft={drone} />)}
        </div>
      </section>

      {/* SECCIÓN BATERÍAS */}
      <section>
        <header className="flex justify-between items-end border-b border-slate-200 pb-4 mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Gestión de Energía</h2>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{data.batteries.length} CÉLULAS EN SISTEMA</p>
          </div>
          <button onClick={() => setActivePanel('battery')} className="bg-[#1A202C] text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-orange-600 transition-all">+ Nueva Batería</button>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.batteries.map(bat => <BatteryCard key={bat.id} battery={bat} />)}
        </div>
      </section>

      {/* PANELES LATERALES */}
      {activePanel === 'drone' && <AddAircraftPanel onClose={() => setActivePanel(null)} onSuccess={() => { setActivePanel(null); fetchData(); }} />}
      {activePanel === 'battery' && <AddBatteryPanel onClose={() => setActivePanel(null)} onSuccess={() => { setActivePanel(null); fetchData(); }} />}
    </div>
  );
}