'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import PilotCard from '@/components/PilotCard';
import AddPilotPanel from '@/components/AddPilotPanel';

export default function PilotsPage() {
  const [pilots, setPilots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const fetchPilots = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('pilots')
      .select('*')
      .eq('owner_id', user.id)
      .order('name', { ascending: true });
    
    if (!error) setPilots(data);
    setLoading(false);
  };

  useEffect(() => { fetchPilots(); }, []);

  return (
    <div className="flex h-full -m-8 overflow-hidden relative">
      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        
        <div className="flex justify-between items-end">
          <div className="text-left">
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Directorio de Pilotos</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Gestión de tripulantes, licencias y certificados médicos.</p>
          </div>
          <button 
            onClick={() => setIsPanelOpen(true)}
            className="bg-[#ec5b13] hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-[#ec5b13]/20 transition-all"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Registrar Piloto
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-pulse">
            {[1,2,3,4].map(i => <div key={i} className="h-32 bg-slate-200 rounded-xl"></div>)}
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {pilots.length > 0 ? (
              pilots.map(p => <PilotCard key={p.id} pilot={p} />)
            ) : (
              <div className="col-span-full py-20 text-center text-slate-400 italic">
                No hay pilotos registrados en tu base de datos.
              </div>
            )}
          </div>
        )}
      </div>

      {isPanelOpen && (
        <AddPilotPanel 
          onClose={() => setIsPanelOpen(false)} 
          onSuccess={() => { setIsPanelOpen(false); fetchPilots(); }} 
        />
      )}
    </div>
  );
}