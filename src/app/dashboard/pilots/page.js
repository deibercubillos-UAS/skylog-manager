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
  const [activePanel, setActivePanel] = useState(null);
  const [editingPilot, setEditingPilot] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const [profRes, pilotsRes] = await Promise.all([
        fetch(`/api/user/profile?userId=${session.user.id}`),
        fetch(`/api/pilots?userId=${session.user.id}`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        })
      ]);

      const profData = await profRes.json();
      const pilotsData = await pilotsRes.json();

      setUserProfile(profData);
      setPilots(Array.isArray(pilotsData) ? pilotsData : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleDelete = async (id) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`/api/pilots/${id}?userId=${session.user.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });

    if (res.ok) {
      alert("✅ Piloto dado de baja.");
      fetchData();
    } else {
      const err = await res.json();
      alert(err.error);
    }
  };

  const canModify = ['admin', 'gerente_sms', 'jefe_pilotos'].includes(userProfile?.role);

  return (
    <div className="space-y-10 text-left animate-in fade-in duration-500 relative h-full">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Mi Tripulación</h2>
          <p className="text-slate-500 text-sm mt-2">Gestionando {pilots.filter(p => p.is_active !== false).length} operadores activos.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setActivePanel('manual')} className="border-2 border-slate-200 text-slate-600 px-6 py-3 rounded-2xl font-black text-[10px] uppercase">Agregar Manual</button>
          <button onClick={() => setActivePanel('invite')} className="bg-[#ec5b13] text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg">Invitar</button>
        </div>
      </header>

      {loading ? (
        <div className="p-20 text-center animate-pulse text-slate-300 font-black uppercase">Sincronizando...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pilots.filter(p => p.is_active !== false).map(p => (
            <PilotCard 
              key={p.id} 
              pilot={p} 
              canEdit={canModify} 
              onEdit={(pilot) => { setEditingPilot(pilot); setActivePanel('edit'); }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* RENDERIZADO DE PANELES */}
      {activePanel === 'invite' && <InvitePilotPanel onClose={() => setActivePanel(null)} onSuccess={() => { setActivePanel(null); fetchData(); }} />}
      {activePanel === 'manual' && <AddManualPilotPanel onClose={() => setActivePanel(null)} onSuccess={() => { setActivePanel(null); fetchData(); }} currentPlan={userProfile?.subscription_plan} currentCount={pilots.length} />}
      {activePanel === 'edit' && editingPilot && <EditPilotPanel pilot={editingPilot} onClose={() => setActivePanel(null)} onSuccess={() => { setActivePanel(null); fetchData(); }} />}
    </div>
  );
}