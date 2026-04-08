'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import PilotCard from '@/components/PilotCard';
import AddPilotPanel from '@/components/AddPilotPanel';
import EditPilotPanel from '@/components/EditPilotPanel';

export default function PilotsPage() {
  const [pilots, setPilots] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editingPilot, setEditingPilot] = useState(null);

  const rolesAutorizados = ['superadmin', 'admin', 'gerente_sms', 'jefe_pilotos'];

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: prof } = await supabase.from('profiles').select('role, organization_id').eq('id', user.id).single();
    
    setUserRole(prof?.role);

    if (prof?.organization_id) {
      const { data } = await supabase
        .from('pilots')
        .select('*')
        .eq('organization_id', prof.organization_id)
        .order('name', { ascending: true });
      setPilots(data || []);
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("¿Dar de baja a este tripulante?")) return;
    const { error } = await supabase.from('pilots').delete().eq('id', id);
    if (error) alert("Error: No tienes permisos para eliminar personal.");
    else fetchData();
  };

  useEffect(() => { fetchData(); }, []);

  const canManage = rolesAutorizados.includes(userRole);

  if (loading) return <div className="p-20 text-center font-black animate-pulse uppercase">Sincronizando Tripulación...</div>;

  return (
    <div className="space-y-10 text-left animate-in fade-in duration-500">
      <header className="flex justify-between items-end border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Cuerpo de Pilotos</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{pilots.length} OPERADORES ACTIVOS</p>
        </div>
        {canManage && (
          <button onClick={() => setShowAdd(true)} className="bg-orange-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-slate-900 transition-all">+ Registrar Piloto</button>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pilots.map(p => (
          <PilotCard 
            key={p.id} 
            pilot={p} 
            canManage={canManage} 
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