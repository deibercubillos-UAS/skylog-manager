'use client';
import { useState, useEffect } from 'react';
// Usamos el cliente optimizado del Paso 6
import { createClient } from '@/utils/supabase/client'; 
import AircraftCard from '@/components/AircraftCard';
import BatteryCard from '@/components/BatteryCard';
import TechCard from '@/components/TechCard';
import AddAircraftPanel from '@/components/AddAircraftPanel';
import AddBatteryPanel from '@/components/AddBatteryPanel';
import AddTechPanel from '@/components/AddTechPanel';
import EditAircraftPanel from '@/components/EditAircraftPanel';
import EditBatteryPanel from '@/components/EditBatteryPanel';
import EditTechPanel from '@/components/EditTechPanel';

export default function FleetPage() {
  const supabase = createClient();
  const [drones, setDrones] = useState([]);
  const [batteries, setBatteries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null); // Estado para el rol
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

      // 1. Obtener Perfil y Rol exacto
      const { data: prof } = await supabase
        .from('profiles')
        .select('role, organization_id')
        .eq('id', user.id)
        .single();
      
      if (prof) {
        setUserRole(prof.role); // Seteamos 'superadmin', 'admin' o 'jefe_pilotos'
      }

      if (prof?.organization_id) {
        // PARALELISMO: Carga instantánea de todo el inventario
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
      console.error("Error crítico en FleetPage:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // LÓGICA DE PERMISOS (Corregida para que no de error de referencia)
  const canManage = userRole && ['superadmin', 'admin', 'jefe_pilotos'].includes(userRole);

  const handleDelete = async (id, table) => {
    if (!confirm("¿Está seguro de eliminar este activo? Esta acción es irreversible.")) return;
    
    try {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) {
            alert("Error de Servidor: " + error.message);
        } else {
            fetchData();
        }
    } catch (err) {
        alert("Falla de red al intentar eliminar.");
    }
  };

  if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase tracking-widest">Sincronizando Inventario Técnico...</div>;

  return (
    <div className="space-y-16 text-left animate-in fade-in duration-500 pb-20 px-4 md:px-0">
      
      {/* SECCIÓN AERONAVES */}
      <section className="animate-in fade-in duration-700">
        <header className="flex justify-between items-end border-b pb-4 mb-8">
          <div className="text-left">
            <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Aeronaves</h2>
            <p className="text-slate-400 text-[10px] font-black uppercase">{drones.length} UNIDADES EN FLOTA</p>
          </div>

          {canManage && (
            <button 
                onClick={() => setActivePanel('drone')} 
                className="bg-orange-600 hover:bg-slate-900 text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2 active:scale-95"
            >
                <span className="material-symbols-outlined text-sm">add_circle</span>
                Nuevo UAS
            </button>
          )}
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {drones.map(d => (
                <AircraftCard key={d.id} aircraft={d} onEdit={setEditingDrone} onDelete={(id) => handleDelete(id, 'aircraft')} />
            ))}
        </div>
      </section>

      {/* SECCIÓN TECNOLOGÍA */} 
      <section className="mb-12">
        <header className="flex justify-between items-end border-b pb-4 mb-8">
            <h2 className="text-3xl font-black uppercase text-slate-900">Tecnología</h2>
            {canManage && (
              <button onClick={() => setActivePanel('tech')} className="bg-[#1A202C] text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-orange-600 transition-all">+ Nuevo Payload</button>
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
              <h2 className="text-3xl font-black uppercase text-slate-900">Baterías</h2>
              {canManage && (
                <button onClick={() => setActivePanel('battery')} className="bg-[#1A202C] text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-orange-600 transition-all">+ Nueva Batería</button>
              )}
          </header>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {batteries.map(b => (
                  <BatteryCard key={b.id} battery={b} onEdit={setEditingBattery} onDelete={(id) => handleDelete(id, 'batteries')} />
              ))}
          </div>
      </section>

      {/* RENDERIZADO DE PANELES (Toda tu lógica original intacta) */}
      {activePanel === 'drone' && <AddAircraftPanel onClose={() => setActivePanel(null)} onSuccess={() => { setActivePanel(null); fetchData(); }} />}
      {activePanel === 'battery' && <AddBatteryPanel onClose={() => setActivePanel(null)} onSuccess={() => { setActivePanel(null); fetchData(); }} />}
      {activePanel === 'tech' && <AddTechPanel onClose={() => setActivePanel(null)} onSuccess={() => { setActivePanel(null); fetchData(); }} />}
      {editingDrone && <EditAircraftPanel aircraft={editingDrone} onClose={() => setEditingDrone(null)} onSuccess={() => { setEditingDrone(null); fetchData(); }} />}
      {editingBattery && <EditBatteryPanel battery={editingBattery} onClose={() => setEditingBattery(null)} onSuccess={() => { setEditingBattery(null); fetchData(); }} />}
      {editingTech && <EditTechPanel item={editingTech} onClose={() => setEditingTech(null)} onSuccess={() => { setEditingTech(null); fetchData(); }} />}
    </div>
  );
}