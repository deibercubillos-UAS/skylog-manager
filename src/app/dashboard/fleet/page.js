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
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();

      if (prof?.organization_id) {
        const { data: aircraft } = await supabase
          .from('aircraft')
          .select('*')
          .eq('organization_id', prof.organization_id);
        setFleet(aircraft || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return <div className="p-20 text-center font-black animate-pulse uppercase">Sincronizando Flota...</div>;

  return (
    <div className="space-y-10 text-left">
      <header className="flex justify-between items-end border-b pb-4">
        <h2 className="text-3xl font-black uppercase tracking-tighter">Aeronaves UAS</h2>
        <button onClick={() => setShowPanel(true)} className="bg-orange-600 text-white px-6 py-2 rounded-xl font-black text-[10px] uppercase shadow-lg">+ Nuevo Drone</button>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {fleet.map(drone => <AircraftCard key={drone.id} aircraft={drone} />)}
      </div>
      {showPanel && <AddAircraftPanel onClose={() => setShowPanel(false)} onSuccess={() => { setShowPanel(false); fetchData(); }} />}
    </div>
  );
}