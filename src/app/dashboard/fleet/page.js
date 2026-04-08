'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AircraftCard from '@/components/AircraftCard';
import BatteryCard from '@/components/BatteryCard';
import AddAircraftPanel from '@/components/AddAircraftPanel';
import AddBatteryPanel from '@/components/AddBatteryPanel';
import EditAircraftPanel from '@/components/EditAircraftPanel';
import EditBatteryPanel from '@/components/EditBatteryPanel';

export default function FleetPage() {
  const [data, setData] = useState({ fleet: [], batteries: [] });
  const [loading, setLoading] = useState(true);
  
  // Estados para Control de Paneles
  const [activePanel, setActivePanel] = useState(null); // 'add_drone', 'add_battery'
  const [editingDrone, setEditingDrone] = useState(null);
  const [editingBattery, setEditingBattery] = useState(null);

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

  if (loading) return <div className="p-20 text-center font-black animate-pulse uppercase text-slate-400">Actualizando Inventario...</div>;

  return (
    <div className="space-y-16 text-left animate-in fade-in duration-500 pb-20">
      
      {/* SECCIÓN AERONAVES */}
      <section>
        <header className="flex justify-between items-end border-b border-slate-200 pb-4 mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Aeronaves UAS</h2>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{data.fleet.length} ACTIVOS</p>
          </div>
          <button onClick={() => setActivePanel('add_drone')} className="bg-[#1A202C] text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-orange-600 transition-all">+ Nuevo Drone</button>
        </header>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {data.fleet.map(drone => (
            <AircraftCard key={drone.id} aircraft={drone} onEdit={(d) => setEditingDrone(d)} />
          ))}
        </div>
      </section>

      {/* SECCIÓN BATERÍAS */}
      <section>
        <header className="flex justify-between items-end border-b border-slate-200 pb-4 mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Gestión de Energía</h2>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{data.batteries.length} CÉLULAS</p>
          </div>
          <button onClick={() => setActivePanel('add_battery')} className="bg-[#1A202C] text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-orange-600 transition-all">+ Nueva Batería</button>
        </header>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.batteries.map(bat => (
            <BatteryCard key={bat.id} battery={bat} onEdit={(b) => setEditingBattery(b)} />
          ))}
        </div>
      </section>

      {/* RENDERIZADO DE PANELES (ADD) */}
      {activePanel === 'add_drone' && <AddAircraftPanel onClose={() => setActivePanel(null)} onSuccess={() => { setActivePanel(null); fetchData(); }} />}
      {activePanel === 'add_battery' && <AddBatteryPanel onClose={() => setActivePanel(null)} onSuccess={() => { setActivePanel(null); fetchData(); }} />}

      {/* RENDERIZADO DE PANELES (EDIT) */}
      {editingDrone && <EditAircraftPanel aircraft={editingDrone} onClose={() => setEditingDrone(null)} onSuccess={() => { setEditingDrone(null); fetchData(); }} />}
      {editingBattery && <EditBatteryPanel battery={editingBattery} onClose={() => setEditingBattery(null)} onSuccess={() => { setEditingBattery(null); fetchData(); }} />}
      
    </div>
  );
}