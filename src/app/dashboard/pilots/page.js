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

      // 1. Obtener perfil para rol y plan
      const profileRes = await fetch(`/api/user/profile?userId=${session.user.id}`);
      const profileData = await profileRes.json();
      setUserProfile(profileData);

      // 2. Obtener pilotos vía API
      const res = await fetch(`/api/pilots?userId=${session.user.id}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const pilotsData = await res.json();
      setPilots(pilotsData || []);
    } catch (err) {
      console.error("Falla en tripulación:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const canModify = userProfile?.role === 'admin' || userProfile?.role === 'gerente_sms';

  return (
    <div className="space-y-10 text-left animate-in fade-in duration-500 relative h-full">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Tripulación</h2>
          <p className="text-slate-500 text-sm font-medium">Gestionando {pilots.length} operadores certificados.</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setActivePanel('manual')} className="border-2 border-slate-200 text-slate-600 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white transition-all">Agregar Manual</button>
          <button onClick={() => setActivePanel('invite')} className="bg-[#ec5b13] text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-500/20 flex items-center gap-2">
            <span className="material-symbols-outlined text-base">mail</span> Invitar
          </button>
        </div>
      </header>

      {loading ? (
        <div className="p-20 text-center font-black text-slate-300 animate-pulse">SINCRONIZANDO EQUIPO...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pilots.map(p => (
            <PilotCard key={p.id} pilot={p} canEdit={canModify} onEdit={(pilot) => { setEditingPilot(pilot); setActivePanel('edit'); }} />
          ))}
        </div>
      )}

      {/* RENDER DE PANELES (Estos también deben actualizarse para llamar a las APIs) */}
      {activePanel === 'invite' && <InvitePilotPanel onClose={() => setActivePanel(null)} onSuccess={() => { setActivePanel(null); fetchData(); }} />}
      {activePanel === 'manual' && <AddManualPilotPanel onClose={() => setActivePanel(null)} onSuccess={() => { setActivePanel(null); fetchData(); }} currentPlan={userProfile?.subscription_plan} currentCount={pilots.length} />}
      {activePanel === 'edit' && editingPilot && <EditPilotPanel pilot={editingPilot} onClose={() => setActivePanel(null)} onSuccess={() => { setActivePanel(null); fetchData(); }} />}
    </div>
  );
}