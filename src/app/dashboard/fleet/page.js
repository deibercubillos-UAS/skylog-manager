'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AircraftCard from '@/components/AircraftCard';
import AddAircraftPanel from '@/components/AddAircraftPanel';

export default function FleetPage() {
  const [fleet, setFleet] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const fetchFleet = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from('aircraft')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });
    
    if (!error) setFleet(data);
    setLoading(false);
  };

  useEffect(() => { fetchFleet(); }, []);

  return (
    <div className="flex h-full -m-8 overflow-hidden relative">
      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        
        {/* Header de Flota */}
        <div className="flex justify-between items-end">
          <div className="text-left">
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Gestión de Flota</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Supervisión técnica de aeronaves y estados operativos.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setIsPanelOpen(true)}
              className="bg-[#ec5b13] hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-[#ec5b13]/20 transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Registrar Nueva Aeronave
            </button>
          </div>
        </div>

        {/* Galería */}
        {loading ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 animate-pulse">
            {[1,2,3,4].map(i => <div key={i} className="h-44 bg-slate-200 rounded-xl"></div>)}
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {fleet.map(drone => (
              <AircraftCard key={drone.id} aircraft={drone} />
            ))}
          </div>
        )}
      </div>

      {/* Panel Lateral */}
      {isPanelOpen && (
        <AddAircraftPanel 
          onClose={() => setIsPanelOpen(false)} 
          onSuccess={() => { setIsPanelOpen(false); fetchFleet(); }} 
        />
      )}
    </div>
  );
}