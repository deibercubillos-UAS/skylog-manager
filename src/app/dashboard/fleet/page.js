'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AircraftCard from '@/components/AircraftCard';
import BatteryCard from '@/components/BatteryCard';
import TechCard from '@/components/TechCard'; // <--- IMPORTANTE
import AddAircraftPanel from '@/components/AddAircraftPanel';
import AddBatteryPanel from '@/components/AddBatteryPanel';
import AddTechPanel from '@/components/AddTechPanel'; // <--- IMPORTANTE
import EditAircraftPanel from '@/components/EditAircraftPanel';
import EditBatteryPanel from '@/components/EditBatteryPanel';
import EditTechPanel from '@/components/EditTechPanel'; // <--- IMPORTANTE

export default function FleetPage() {
  const [drones, setDrones] = useState([]);
  const [batteries, setBatteries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [tech, setTech] = useState([]);
  const [editingTech, setEditingTech] = useState(null);
  
  // Estados de Control de UI
  const [activePanel, setActivePanel] = useState(null);
  const [editingDrone, setEditingDrone] = useState(null);
  const [editingBattery, setEditingBattery] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. OBTENER ROL PARA EL CONTROL DE ACCESO
      const { data: prof } = await supabase.from('profiles').select('role, organization_id').eq('id', user.id).single();
      setUserRole(prof?.role);
      
      if (prof?.organization_id) {
        const [resDrones, resBatteries] = await Promise.all([
          supabase.from('aircraft').select('*').eq('organization_id', prof.organization_id).order('created_at', { ascending: false }),
          supabase.from('batteries').select('*').eq('organization_id', prof.organization_id).order('created_at', { ascending: false })
        ]);
        
        setDrones(resDrones.data || []);
        setBatteries(resBatteries.data || []);
      }
    } catch (err) {
      console.error("Error de carga:", err);
    } finally {
      setLoading(false);
    }
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
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // LÓGICA DE PERMISOS: Solo estos roles pueden modificar la flota
  const canManage = ['superadmin', 'admin', 'jefe_pilotos'].includes(userRole);

  const handleDelete = async (id, table) => {
    if (!canManage) return alert("Acceso Denegado: No tiene permisos de escritura.");
    if (!confirm("¿Eliminar este activo permanentemente?")) return;
    
    const { error } = await supabase.from(table).delete().eq('id', id);
    if (!error) fetchData();
    else alert("Error al eliminar: " + error.message);
  };

  if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400">CARGANDO INVENTARIO TÉCNICO...</div>;

  return (
    <div className="space-y-16 text-left animate-in fade-in duration-500 pb-20">
      
      {/* SECCIÓN AERONAVES */}
      <section>
        <header className="flex justify-between items-end border-b border-slate-200 pb-4 mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">Aeronaves</h2>
            <p className="text-slate-400 text-[10px] font-black uppercase mt-2 tracking-widest">{drones.length} Unidades en Flota</p>
          </div>
          {/* Solo mostramos el botón si tiene permisos */}
          {canManage && (
            <button 
              onClick={() => setActivePanel('drone')} 
              className="bg-[#1A202C] text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-orange-600 transition-all active:scale-95"
            >
              + Nuevo Drone
            </button>
          )}
        </header>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {drones.map(d => (
            <AircraftCard 
              key={d.id} 
              aircraft={d} 
              onEdit={canManage ? setEditingDrone : null} 
              onDelete={canManage ? (id) => handleDelete(id, 'aircraft') : null} 
            />
          ))}
        </div>
      </section>

     {/*SECCION EQUIPOS*/} 
      <section>
        <header className="flex justify-between items-end border-b pb-4 mb-8">
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Equipos Tecnológicos</h2>
          <button onClick={() => setActivePanel('tech')} className="bg-[#1A202C] text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-purple-600 transition-all">+ Nuevo Equipo</button>
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tech && tech.length > 0 ? tech.map(t => (
              <TechCard 
                  key={t.id} 
                  item={t} 
                  onEdit={(item) => setEditingTech(item)} 
                  onDelete={(id) => handleDelete(id, 'inventory_items')} 
              />
            )) : (
              <div className="col-span-full py-10 text-center text-slate-400 border-2 border-dashed rounded-3xl">
                  No hay equipos tecnológicos registrados aún.
              </div>
            )}
        </div>
      </section>

            {/* SECCIÓN BATERÍAS */}
      <section>
        <header className="flex justify-between items-end border-b border-slate-200 pb-4 mb-8">
          <div>
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">Baterías</h2>
            <p className="text-slate-400 text-[10px] font-black uppercase mt-2 tracking-widest">{batteries.length} Células de Energía</p>
          </div>
          {/* Solo mostramos el botón si tiene permisos */}
          {canManage && (
            <button 
              onClick={() => setActivePanel('battery')} 
              className="bg-[#1A202C] text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-orange-600 transition-all active:scale-95"
            >
              + Nueva Batería
            </button>
          )}
        </header>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {batteries.map(b => (
            <BatteryCard 
              key={b.id} 
              battery={b} 
              onEdit={canManage ? setEditingBattery : null} 
              onDelete={canManage ? (id) => handleDelete(id, 'batteries') : null} 
            />
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