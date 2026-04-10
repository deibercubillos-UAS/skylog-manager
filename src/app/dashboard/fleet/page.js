'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AircraftCard from '@/components/AircraftCard';
import BatteryCard from '@/components/BatteryCard';
import AddAircraftPanel from '@/components/AddAircraftPanel';
import AddBatteryPanel from '@/components/AddBatteryPanel';
import EditAircraftPanel from '@/components/EditAircraftPanel';

export default function FleetPage() {
  const [drones, setDrones] = useState([]);
  const [batteries, setBatteries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activePanel, setActivePanel] = useState(null);
  const [editingDrone, setEditingDrone] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
    
    if (prof?.organization_id) {
      const [resDrones, resBatteries] = await Promise.all([
        supabase.from('aircraft').select('*').eq('organization_id', prof.organization_id).order('created_at', { ascending: false }),
        supabase.from('batteries').select('*').eq('organization_id', prof.organization_id).order('created_at', { ascending: false })
      ]);
      setDrones(resDrones.data || []);
      setBatteries(resBatteries.data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id, table) => {
    if (!confirm("¿Eliminar este activo permanentemente?")) return;
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (error) alert("Error al eliminar: " + error.message);
    else fetchData();
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400">CARGANDO INVENTARIO...</div>;

  return (
    <div className="space-y-16 text-left animate-in fade-in duration-500 pb-20">
      
      {/* SECCIÓN DRONES */}
      <section>
        <header className="flex justify-between items-end border-b pb-4 mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Aeronaves</h2>
            <p className="text-slate-400 text-[10px] font-black uppercase">{drones.length} Unidades</p>
          </div>
          <button onClick={() => setActivePanel('drone')} className="bg-[#1A202C] text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg">+ Nuevo Drone</button>
        </header>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
          {drones.map(d => (
            <AircraftCard key={d.id} aircraft={d} onEdit={setEditingDrone} onDelete={(id) => handleDelete(id, 'aircraft')} />
          ))}
        </div>
      </section>

      {/* SECCIÓN BATERÍAS */}
      <section>
        <header className="flex justify-between items-end border-b pb-4 mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Baterías</h2>
            <p className="text-slate-400 text-[10px] font-black uppercase">{batteries.length} Células</p>
          </div>
          <button onClick={() => setActivePanel('battery')} className="bg-[#1A202C] text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg">+ Nueva Batería</button>
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
         {batteries.map(b => (
          <BatteryCard 
            key={b.id} 
            battery={b} 
            onEdit={(battery) => setEditingBattery(battery)} // <--- ACTIVA EL PANEL
            onDelete={(id) => handleDelete(id, 'batteries')} 
          />
        ))}
        </div>
      </section>

      {activePanel === 'drone' && <AddAircraftPanel onClose={() => setActivePanel(null)} onSuccess={() => { setActivePanel(null); fetchData(); }} />}
      {activePanel === 'battery' && <AddBatteryPanel onClose={() => setActivePanel(null)} onSuccess={() => { setActivePanel(null); fetchData(); }} />}
      {editingDrone && <EditAircraftPanel aircraft={editingDrone} onClose={() => setEditingDrone(null)} onSuccess={() => { setEditingDrone(null); fetchData(); }} />}
      {editingBattery && (
      <EditBatteryPanel 
          battery={editingBattery} 
          onClose={() => setEditingBattery(null)} 
          onSuccess={() => { setEditingBattery(null); fetchData(); }} 
        />
      )}
    </div>
  );
}