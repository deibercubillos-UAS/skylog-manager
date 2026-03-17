'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react'; // IMPORTACIÓN CORREGIDA
import { supabase } from '@/lib/supabase';
import AircraftCard from '@/components/AircraftCard';
import AddAircraftPanel from '@/components/AddAircraftPanel';
import EditAircraftPanel from '@/components/EditAircraftPanel';

export default function FleetPage() {
  const [fleet, setFleet] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingAircraft, setEditingAircraft] = useState(null);
  const [isAddPanelOpen, setIsAddPanelOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('aircraft')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false });
      
      if (!error) setFleet(data || []);
    } catch (err) {
      console.error("Error cargando flota:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-8 text-left animate-in fade-in duration-500 relative h-full">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">Mi Flota</h2>
          <p className="text-slate-500 text-sm mt-2 font-medium">Gestión técnica de aeronaves y estados operativos.</p>
        </div>
        
        <button 
          onClick={() => setIsAddPanelOpen(true)}
          className="bg-[#ec5b13] text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 hover:scale-105 transition-all"
        >
          <span className="material-symbols-outlined text-base">add</span> Registrar Aeronave
        </button>
      </header>

      {loading ? (
        <div className="p-10 text-center animate-pulse font-black text-slate-300">SINCRONIZANDO ACTIVOS...</div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {fleet.map(drone => (
            <div key={drone.id} className="relative group">
              <AircraftCard aircraft={drone} />
              {/* Botón de edición flotante */}
              <button 
                onClick={() => setEditingAircraft(drone)}
                className="absolute top-4 right-4 bg-white/90 backdrop-blur p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all text-[#ec5b13] hover:bg-[#ec5b13] hover:text-white z-20"
              >
                <span className="material-symbols-outlined text-lg">edit</span>
              </button>
            </div>
          ))}
          {fleet.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-[2.5rem]">
              <p className="text-slate-400 italic text-sm">No hay aeronaves registradas. Registra tu primer drone para empezar.</p>
            </div>
          )}
        </div>
      )}

      {/* PANELES LATERALES */}
      {isAddPanelOpen && (
        <AddAircraftPanel 
          onClose={() => setIsAddPanelOpen(false)} 
          onSuccess={() => { setIsAddPanelOpen(false); fetchData(); }} 
        />
      )}

      {editingAircraft && (
        <EditAircraftPanel 
          aircraft={editingAircraft} 
          onClose={() => setEditingAircraft(null)} 
          onSuccess={() => { setEditingAircraft(null); fetchData(); }} 
        />
      )}
    </div>
  );
}