'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import PilotCard from '@/components/PilotCard';
import AddPilotPanel from '@/components/AddPilotPanel';
import EditPilotPanel from '@/components/EditPilotPanel';

export default function PilotsPage() {
  const [pilots, setPilots] = useState([]);
  const [userRole, setUserRole] = useState(null); // <--- ESTADO PARA EL ROL
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingPilot, setEditingPilot] = useState(null);

  // DEFINICIÓN DE ROLES CON PODER DE GESTIÓN
  const rolesAutorizados = ['superadmin', 'admin', 'jefe_pilotos'];

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. OBTENER ROL Y ORGANIZACIÓN DEL USUARIO LOGUEADO
      const { data: prof } = await supabase
        .from('profiles')
        .select('role, organization_id')
        .eq('id', user.id)
        .single();
      
      setUserRole(prof?.role);

      if (prof?.organization_id) {
        const { data } = await supabase
          .from('pilots')
          .select('*')
          .eq('organization_id', prof.organization_id)
          .order('name', { ascending: true });
        setPilots(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // LÓGICA DE PERMISOS
  const canManageCrew = rolesAutorizados.includes(userRole);

  const handleDelete = async (id) => {
    if (!canManageCrew) return alert("No tiene permisos para esta acción.");
    if (!confirm("¿Dar de baja a este tripulante?")) return;
    
    const { error } = await supabase.from('pilots').delete().eq('id', id);
    if (!error) fetchData();
  };

  if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400">SINCRO...</div>;

  return (
    <div className="space-y-10 text-left animate-in fade-in duration-500">
      <header className="flex justify-between items-end border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Cuerpo de Pilotos</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{pilots.length} Operadores Activos</p>
        </div>
        
        {/* EL BOTÓN SOLO APARECE SI ES UN ROL AUTORIZADO */}
        {canManageCrew && (
          <button 
            onClick={() => setShowAdd(true)} 
            className="bg-orange-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-slate-900 transition-all items-center gap-2 active:scale-95"
          >
            <span className="material-symbols-outlined text-sm">person_add</span>
            Registrar Piloto
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pilots.map(p => (
          <PilotCard 
            key={p.id} 
            pilot={p} 
            canManage={canManageCrew} // <--- PASAMOS EL PERMISO A LA TARJETA
            onEdit={setEditingPilot} 
            onDelete={handleDelete} 
          />
        ))}
      </div>

      {showAdd && <AddPilotPanel onClose={() => setShowAdd(false)} onSuccess={() => { setShowAdd(false); fetchData(); }} />}
      {editingPilot && <EditPilotPanel pilot={editingPilot} onClose={() => setEditingPilot(null)} onSuccess={() => { setEditingPilot(null); fetchData(); }} />}
    </div>
  );
}