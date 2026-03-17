'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import PilotCard from '@/components/PilotCard';
import InvitePilotPanel from '@/components/InvitePilotPanel';
import AddManualPilotPanel from '@/components/AddManualPilotPanel';

export default function PilotsPage() {
  const [pilots, setPilots] = useState([]);
  const [userPlan, setUserPlan] = useState('piloto');
  const [loading, setLoading] = useState(true);
  const [panel, setPanel] = useState(null); // 'invite' o 'manual'

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: profile } = await supabase.from('profiles').select('subscription_plan').eq('id', user.id).single();
    const { data: pilotsData } = await supabase.from('pilots').select('*').eq('owner_id', user.id);
    
    setUserPlan(profile?.subscription_plan || 'piloto');
    setPilots(pilotsData || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="space-y-10 text-left animate-in fade-in duration-500 relative h-full">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Gestión de Tripulación</h2>
          <p className="text-slate-500 text-sm mt-2 font-medium">Límite actual: {pilots.length} pilotos registrados.</p>
        </div>
        
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={() => setPanel('manual')}
            className="flex-1 md:flex-none border-2 border-slate-200 text-slate-600 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
          >
            Agregar Manual
          </button>
          <button 
            onClick={() => setPanel('invite')}
            className="flex-1 md:flex-none bg-[#ec5b13] text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-base">mail</span> Invitar por Email
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pilots.map(p => <PilotCard key={p.id} pilot={p} />)}
      </div>

      {/* PANALES LATERALES */}
      {panel === 'invite' && (
        <InvitePilotPanel 
          onClose={() => setPanel(null)} 
          onSuccess={() => { setPanel(null); fetchData(); }} 
        />
      )}

      {panel === 'manual' && (
        <AddManualPilotPanel 
          onClose={() => setPanel(null)} 
          onSuccess={() => { setPanel(null); fetchData(); }}
          currentPlan={userPlan}
          currentCount={pilots.length}
        />
      )}
    </div>
  );
}