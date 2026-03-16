'use client';
import { useState } from 'react';
import Sidebar from '@/components/Sidebar';
import AircraftCard from '@/components/AircraftCard';
import AddAircraftPanel from '@/components/AddAircraftPanel';

export default function FleetPage() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Datos de ejemplo (Luego vendrán de Supabase)
  const fleet = [
    {
      id: 1,
      model: "DJI Matrice 300 RTK",
      alias: "Alpha-01",
      sn: "3Q4DH8C00201Z5",
      hours: 124.5,
      mtow: 9.0,
      status: "Operativo",
      health: 75,
      image: "https://images.unsplash.com/photo-1508614589041-895b88991e3e?q=80&w=500"
    },
    {
      id: 2,
      model: "Mavic 3 Enterprise",
      alias: "Echo-02",
      sn: "5E6RH9A00102X2",
      hours: 45.2,
      mtow: 1.05,
      status: "Mantenimiento",
      health: 92,
      image: "https://images.unsplash.com/photo-1473963500601-abc414a27e90?q=80&w=500"
    }
  ];

  return (
    <div className="flex min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100">
      <Sidebar />

      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto p-8">
          {/* Header */}
          <div className="flex justify-between items-end mb-8">
            <div>
              <h2 className="text-3xl font-black tracking-tight">Gestión de Flota</h2>
              <p className="text-slate-500 dark:text-slate-400 mt-1">Supervisión técnica de aeronaves y estados operativos.</p>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setIsPanelOpen(true)}
                className="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-primary/20 transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                Registrar Nueva Aeronave
              </button>
            </div>
          </div>

          {/* Filtros rápidos */}
          <div className="flex flex-wrap gap-3 mb-8">
             <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium">
                <span>Estado: Todos</span>
                <span className="material-symbols-outlined text-[18px]">expand_more</span>
             </button>
          </div>

          {/* Grid de Aeronaves */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {fleet.map((drone) => (
              <AircraftCard key={drone.id} drone={drone} />
            ))}
          </div>
        </div>

        {/* Panel Lateral derecho (Condicional) */}
        {isPanelOpen && <AddAircraftPanel onClose={() => setIsPanelOpen(false)} />}
      </main>
    </div>
  );
}