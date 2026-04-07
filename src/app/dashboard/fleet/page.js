'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AircraftCard from '@/components/AircraftCard';
import BatteryCard from '@/components/BatteryCard';
import AddAircraftPanel from '@/components/AddAircraftPanel';
import AddBatteryPanel from '@/components/AddBatteryPanel';
import EditBatteryPanel from '@/components/EditBatteryPanel'; // <-- Nueva importación

export default function FleetPage() {
  const [fleet, setFleet] = useState([]);
  const [batteries, setBatteries] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para controlar qué panel está abierto
  const [activePanel, setActivePanel] = useState(null); 
  const [editingBattery, setEditingBattery] = useState(null); // <-- Estado para editar

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const [dRes, bRes] = await Promise.all([
      supabase.from('aircraft').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }),
      supabase.from('batteries').select('*').eq('owner_id', user.id).order('created_at', { ascending: false })
    ]);
    
    setFleet(dRes.data || []);
    setBatteries(bRes.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return <div className="p-20 text-center animate-pulse font-black uppercase tracking-widest text-slate-300">Sincronizando Inventario...</div>;

  return (
    <div className="space-y-16 text-left animate-in fade-in duration-500 pb-20">
      
      {/* SECCIÓN 1: AERONAVES UAS */}
      <section className="space-y-6">
        <header className="flex justify-between items-end border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">Aeronaves UAS</h2>
            <p className="text-slate-400 text-[10px] font-black uppercase mt-2 tracking-widest">{fleet.length} UNIDADES REGISTRADAS</p>
          </div>
          <button 
            onClick={() => setActivePanel('drone')} 
            className="bg-[#1A202C] text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all active:scale-95"
          >
            + Nuevo Drone
          </button>
        </header>
        
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {fleet.map(drone => (
            <AircraftCard key={drone.id} aircraft={drone} />
          ))}
        </div>
      </section>

      {/* SECCIÓN 2: BATERÍAS Y ENERGÍA */}
      <section className="space-y-6">
        <header className="flex justify-between items-end border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">Gestión de Energía</h2>
            <p className="text-slate-400 text-[10px] font-black uppercase mt-2 tracking-widest">{batteries.length} BATERÍAS EN SISTEMA</p>
          </div>
          <button 
            onClick={() => setActivePanel('battery')} 
            className="bg-[#1A202C] text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-slate-800 transition-all active:scale-95"
          >
            + Nueva Batería
          </button>
        </header>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {batteries.map(bat => (
            <BatteryCard 
              key={bat.id} 
              battery={bat} 
              onEdit={(selectedBat) => setEditingBattery(selectedBat)} // <-- Abre el panel de edición
            />
          ))}
        </div>
      </section>

      {/* RENDERIZADO CONDICIONAL DE PANELES (MODALES) */}
      
      {/* Panel para agregar Drone */}
      {activePanel === 'drone' && (
        <AddAircraftPanel 
          onClose={() => setActivePanel(null)} 
          onSuccess={() => { setActivePanel(null); fetchData(); }} 
        />
      )}

      {/* Panel para agregar Batería */}
      {activePanel === 'battery' && (
        <AddBatteryPanel 
          onClose={() => setActivePanel(null)} 
          onSuccess={() => { setActivePanel(null); fetchData(); }} 
        />
      )}

      {/* Panel para editar Batería existente */}
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