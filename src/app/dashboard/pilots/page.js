'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import PilotCard from '@/components/PilotCard';
import InvitePilotPanel from '@/components/InvitePilotPanel';

export default function PilotsPage() {
  const [pilots, setPilots] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    // Pilotos ya vinculados
    const { data: pData } = await supabase.from('pilots').select('*').eq('owner_id', user.id);
    // Invitaciones enviadas
    const { data: iData } = await supabase.from('invitations').select('*').eq('organization_id', user.id).eq('status', 'pending');
    
    setPilots(pData || []);
    setInvites(iData || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="space-y-10 text-left animate-in fade-in duration-500 relative">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Mi Equipo</h2>
          <p className="text-slate-500 text-sm mt-2 font-medium">Gestiona la jerarquía operativa de tu escuadrilla.</p>
        </div>
        <button 
          onClick={() => setShowInvite(true)}
          className="bg-[#ec5b13] text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-500/20 flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">person_add</span> Invitar Piloto
        </button>
      </header>

      {/* SECCIÓN DE INVITACIONES PENDIENTES */}
      {invites.length > 0 && (
        <section className="space-y-4">
          <h3 className="text-[10px] font-black uppercase text-[#ec5b13] tracking-[0.3em] ml-1">Invitaciones en Espera</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {invites.map(invite => (
              <div key={invite.id} className="p-5 bg-white border border-dashed border-[#ec5b13]/30 rounded-3xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                    <span className="material-symbols-outlined text-sm">mail</span>
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-bold text-slate-700 truncate w-32 md:w-auto">{invite.email}</p>
                    <p className="text-[9px] font-black uppercase text-slate-400">{invite.role}</p>
                  </div>
                </div>
                <span className="text-[8px] font-black bg-orange-50 text-orange-500 px-2 py-1 rounded-full uppercase">Pendiente</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SECCIÓN DE PILOTOS ACTIVOS */}
      <section className="space-y-4">
        <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] ml-1">Tripulantes Certificados</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pilots.map(p => <PilotCard key={p.id} pilot={p} />)}
          {pilots.length === 0 && !loading && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-[2.5rem]">
               <p className="text-slate-400 italic text-sm">No hay pilotos vinculados. ¡Envía tu primera invitación!</p>
            </div>
          )}
        </div>
      </section>

      {/* DRAWER DE INVITACIÓN */}
      {showInvite && (
        <InvitePilotPanel 
          onClose={() => setShowInvite(false)} 
          onSuccess={() => { setShowInvite(false); fetchData(); }} 
        />
      )}
    </div>
  );
}