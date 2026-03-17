'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import PilotCard from '@/components/PilotCard';
import InvitePilotPanel from '@/components/InvitePilotPanel';
import AddManualPilotPanel from '@/components/AddManualPilotPanel';
import EditPilotPanel from '@/components/EditPilotPanel';

export default function PilotsPage() {
  const [pilots, setPilots] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Control de Paneles
  const [activePanel, setActivePanel] = useState(null); // 'invite', 'manual', 'edit'
  const [editingPilot, setEditingPilot] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Obtener perfil del usuario logueado para verificar ROL
    const { data: profile } = await supabase.from('profiles').select('role, subscription_plan').eq('id', user.id).single();
    setUserProfile(profile);

    // 2. Obtener lista de pilotos
    const { data: pilotsData } = await supabase.from('pilots').select('*').eq('owner_id', user.id).order('name', { ascending: true });
    
    setPilots(pilotsData || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Lógica de Permisos: Solo Admin o Gerente SMS pueden editar
  const canModify = userProfile?.role === 'admin' || userProfile?.role === 'gerente_sms';

  const openEdit = (pilot) => {
    setEditingPilot(pilot);
    setActivePanel('edit');
  };

  return (
    <div className="space-y-10 text-left animate-in fade-in duration-500 relative h-full">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Mi Tripulación</h2>
          <p className="text-slate-500 text-sm mt-2 font-medium uppercase tracking-widest text-[10px]">
            {canModify ? 'Gestión Administrativa Activada' : 'Vista de Consulta'}
          </p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={() => setActivePanel('manual')}
            className="flex-1 md:flex-none border-2 border-slate-200 text-slate-600 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
          >
            Agregar Manual
          </button>
          <button 
            onClick={() => setActivePanel('invite')}
            className="flex-1 md:flex-none bg-[#ec5b13] text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-base">mail</span> Invitar Piloto
          </button>
        </div>
      </header>

      {loading ? (
        <div className="p-10 text-center animate-pulse font-black text-slate-300">SINCRONIZANDO EQUIPO...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pilots.map(p => (
            <PilotCard 
              key={p.id} 
              pilot={p} 
              canEdit={canModify} 
              onEdit={openEdit} 
            />
          ))}
          {pilots.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-[2.5rem]">
              <p className="text-slate-400 italic text-sm">No hay tripulantes registrados en esta organización.</p>
            </div>
          )}
        </div>
      )}

      {/* RENDERIZADO DE PANELES LATERALES */}
      {activePanel === 'invite' && (
        <InvitePilotPanel onClose={() => setActivePanel(null)} onSuccess={() => { setActivePanel(null); fetchData(); }} />
      )}

      {activePanel === 'manual' && (
        <AddManualPilotPanel 
          onClose={() => setActivePanel(null)} 
          onSuccess={() => { setActivePanel(null); fetchData(); }}
          currentPlan={userProfile?.subscription_plan}
          currentCount={pilots.length}
        />
      )}

      {editingPilot && (
    <EditPilotPanel 
    pilot={editingPilot} 
    onClose={() => setEditingPilot(null)} 
    onSuccess={() => {
      setEditingPilot(null);
      fetchData(); // Refresca la lista
    }} 
  />
)}