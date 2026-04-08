'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AircraftCard from '@/components/AircraftCard';
import AddAircraftPanel from '@/components/AddAircraftPanel';

export default function FleetPage() {
  const [fleet, setFleet] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
    
    const { data: aircraft } = await supabase
      .from('aircraft')
      .select('*')
      .eq('organization_id', prof.organization_id)
      .order('created_at', { ascending: false });

    setFleet(aircraft || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return <div className="p-20 text-center font-black text-slate-300 uppercase animate-pulse">Sincronizando Flota...</div>;

  return (
    <div className="space-y-10 text-left animate-in fade-in duration-500">
      <header className="flex justify-between items-end border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Aeronaves UAS</h2>
          <p className="text-slate-400 text-[10px] font-black uppercase mt-2 tracking-widest">{fleet.length} UNIDADES ACTIVAS</p>
        </div>
        <button onClick={() => setShowPanel(true)} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-orange-600 transition-all">+ Nuevo Drone</button>
      </header>
      
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {fleet.map(drone => <AircraftCard key={drone.id} aircraft={drone} />)}
        {fleet.length === 0 && <div className="col-span-full py-20 text-center text-slate-400 italic font-bold">No hay aeronaves registradas para esta organización.</div>}
      </div>

      {showPanel && <AddAircraftPanel onClose={() => setShowPanel(false)} onSuccess={() => { setShowPanel(false); fetchData(); }} />}
    </div>
  );
}