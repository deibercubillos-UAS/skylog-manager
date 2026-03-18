'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import AircraftCard from '@/components/AircraftCard';
import AddAircraftPanel from '@/components/AddAircraftPanel';
import EditAircraftPanel from '@/components/EditAircraftPanel';

export default function FleetPage() {
  const [fleet, setFleet] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingDrone, setEditingDrone] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Cargar Perfil
      const profRes = await fetch(`/api/user/profile?userId=${session.user.id}`);
      const profData = await profRes.json();
      setUserProfile(profData);

      // Cargar Flota vía API
      const res = await fetch(`/api/fleet?userId=${session.user.id}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const data = await res.json();
      setFleet(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="space-y-8 text-left animate-in fade-in duration-500 relative h-full">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Mi Flota</h2>
          <p className="text-slate-500 text-sm mt-2 font-medium uppercase tracking-widest text-[10px]">
            {fleet.length} Unidades registradas
          </p>
        </div>
        <button onClick={() => setIsAddOpen(true)} className="bg-[#ec5b13] text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-base">add</span> Registrar Drone
        </button>
      </header>

      {loading ? (
        <div className="p-20 text-center font-black text-slate-300 animate-pulse">SINCRONIZANDO ACTIVOS...</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {fleet.map(drone => (
            <div key={drone.id} className="relative group">
              <AircraftCard aircraft={drone} />
              <button onClick={() => setEditingDrone(drone)} className="absolute top-4 right-4 bg-white/90 backdrop-blur p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all text-[#ec5b13] hover:bg-[#ec5b13] hover:text-white z-20">
                <span className="material-symbols-outlined text-lg">edit</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* PANELES */}
      {isAddOpen && <AddAircraftPanel onClose={() => setIsAddOpen(false)} onSuccess={() => { setIsAddOpen(false); fetchData(); }} currentPlan={userProfile?.subscription_plan} />}
      {editingDrone && <EditAircraftPanel aircraft={editingDrone} onClose={() => setEditingDrone(null)} onSuccess={() => { setEditingDrone(null); fetchData(); }} />}
    </div>
  );
}