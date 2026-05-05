'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import AircraftCard from '@/components/AircraftCard';
import BatteryCard from '@/components/BatteryCard';
import TechCard from '@/components/TechCard';

// Paneles: carga diferida → no bloquean el bundle inicial
const AddAircraftPanel  = dynamic(() => import('@/components/AddAircraftPanel'),  { ssr: false });
const AddBatteryPanel   = dynamic(() => import('@/components/AddBatteryPanel'),   { ssr: false });
const AddTechPanel      = dynamic(() => import('@/components/AddTechPanel'),      { ssr: false });
const EditAircraftPanel = dynamic(() => import('@/components/EditAircraftPanel'), { ssr: false });
const EditBatteryPanel  = dynamic(() => import('@/components/EditBatteryPanel'),  { ssr: false });
const EditTechPanel     = dynamic(() => import('@/components/EditTechPanel'),     { ssr: false });

export default function FleetPage() {
  const [drones, setDrones] = useState([]);
  const [batteries, setBatteries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [tech, setTech] = useState([]);
  const [editingTech, setEditingTech] = useState(null);
  const [activePanel, setActivePanel] = useState(null);
  const [editingDrone, setEditingDrone] = useState(null);
  const [editingBattery, setEditingBattery] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Obtener Perfil y Rol
      const { data: prof } = await supabase.from('profiles').select('role, organization_id').eq('id', user.id).single();
      
      // VITAL: Guardar el rol en el estado
      if (prof) setUserRole(prof.role);

      if (prof?.organization_id) {
        const [resDrones, resBatteries, resTech] = await Promise.all([
    supabase.from('aircraft').select('*').eq('organization_id', prof.organization_id).order('created_at', { ascending: false }),
    supabase.from('batteries').select('*').eq('organization_id', prof.organization_id).order('created_at', { ascending: false }),
    supabase.from('inventory_items').select('*').eq('organization_id', prof.organization_id).order('created_at', { ascending: false })
]);

setDrones(resDrones.data || []);
setBatteries(resBatteries.data || []);
setTech(resTech.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // LÓGICA DE PERMISOS: Solo estos roles pueden modificar la flota
  const canManage = ['superadmin', 'admin', 'jefe_pilotos'].includes(userRole);

  const handleDelete = async (id, table) => {
    if (!confirm("¿Está seguro de eliminar este activo? Esta acción es irreversible.")) return;

    // Actualización optimista: eliminar del estado antes de esperar al servidor
    const prevDrones    = drones;
    const prevBatteries = batteries;
    const prevTech      = tech;

    if (table === 'aircraft')        setDrones(d    => d.filter(x => x.id !== id));
    else if (table === 'batteries')  setBatteries(b => b.filter(x => x.id !== id));
    else if (table === 'inventory_items') setTech(t => t.filter(x => x.id !== id));

    try {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
    } catch (err) {
        // Revertir si falla
        setDrones(prevDrones);
        setBatteries(prevBatteries);
        setTech(prevTech);
        alert("Error al eliminar: " + err.message);
    }
};

  if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400">CARGANDO INVENTARIO TÉCNICO...</div>;

  return (
    <div className="space-y-16 text-left animate-in fade-in duration-500 pb-20">
      
      {/* SECCIÓN AERONAVES */}
      <section className="animate-in fade-in duration-700">
      <header className="flex justify-between items-end border-b pb-4 mb-8">
      <div className="text-left">
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Aeronaves</h2>
          <p className="text-slate-400 text-xs font-black uppercase">{drones.length} UNIDADES</p>
      </div>

      {/* BOTÓN REPARADO: Se muestra si el rol es válido */}
      {canManage && (
          <button 
              onClick={() => setActivePanel('drone')} 
              className="bg-orange-600 hover:bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2 active:scale-95"
          >
              <span className="material-symbols-outlined text-sm">add_circle</span>
              Nuevo UAS
          </button>
      )}
      </header>

    {/* Grid de Aeronaves */}
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {drones.map(d => (
            <AircraftCard key={d.id} aircraft={d} onEdit={setEditingDrone} onDelete={(id) => handleDelete(id, 'aircraft')} />
        ))}
    </div>
      </section>

     {/*SECCION EQUIPOS*/} 
      <section className="mb-12">
        <header className="flex justify-between items-end border-b pb-4 mb-8">
            <div className="text-left">
                <h2 className="text-3xl font-black uppercase text-slate-900 tracking-tighter">Tecnología</h2>
                <p className="text-slate-400 text-xs font-black uppercase">{tech.length} PAYLOADS</p>
            </div>
            {canManage && (
                <button 
                    onClick={() => setActivePanel('tech')}
                    className="bg-orange-600 hover:bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2 active:scale-95"
                >
                    <span className="material-symbols-outlined text-sm">add_circle</span>
                    Nuevo Payload
                </button>
            )}
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tech.map(t => (
                <TechCard key={t.id} item={t} onEdit={setEditingTech} onDelete={(id) => handleDelete(id, 'inventory_items')} />
            ))}
        </div>
    </section>

            {/* SECCIÓN BATERÍAS */}
      <section className="mb-12">
          <header className="flex justify-between items-end border-b pb-4 mb-8">
                <div className="text-left">
                    <h2 className="text-3xl font-black uppercase text-slate-900 tracking-tighter">Baterías</h2>
                    <p className="text-slate-400 text-xs font-black uppercase">{batteries.length} UNIDADES</p>
                </div>
                {canManage && (
                    <button 
                        onClick={() => setActivePanel('battery')}
                        className="bg-orange-600 hover:bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2 active:scale-95"
                    >
                        <span className="material-symbols-outlined text-sm">add_circle</span>
                        Nueva Batería
                    </button>
                )}
            </header> 
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {batteries.map(b => (
                  <BatteryCard key={b.id} battery={b} onEdit={setEditingBattery} onDelete={(id) => handleDelete(id, 'batteries')} />
              ))}
          </div>
      </section>

      {/* RENDERIZADO DE PANELES */}
      {activePanel === 'drone' && <AddAircraftPanel onClose={() => setActivePanel(null)} onSuccess={() => { setActivePanel(null); fetchData(); }} />}
      {activePanel === 'battery' && <AddBatteryPanel onClose={() => setActivePanel(null)} onSuccess={() => { setActivePanel(null); fetchData(); }} />}
      {activePanel === 'tech' && <AddTechPanel onClose={() => setActivePanel(null)} onSuccess={() => { setActivePanel(null); fetchData(); }} />}
            {editingDrone && <EditAircraftPanel aircraft={editingDrone} onClose={() => setEditingDrone(null)} onSuccess={() => { setEditingDrone(null); fetchData(); }} />}
      {editingBattery && <EditBatteryPanel battery={editingBattery} onClose={() => setEditingBattery(null)} onSuccess={() => { setEditingBattery(null); fetchData(); }} />}
      {editingTech && <EditTechPanel item={editingTech} onClose={() => setEditingTech(null)} onSuccess={() => { setEditingTech(null); fetchData(); }} />}
    </div>
  );
}