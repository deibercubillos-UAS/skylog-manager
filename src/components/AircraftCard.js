'use client';
import { useState } from 'react';
import AircraftCard from '@/components/AircraftCard';

export default function FleetPage() {
  const [showPanel, setShowPanel] = useState(false);

  // Datos Mockup (Esto luego vendrá de Supabase)
  const fleet = [
    { id: 1, model: "DJI Matrice 300 RTK", alias: "Alpha-01", status: "Operativo", total_hours: 124.5, mtow: 9.0, serial_number: "3Q4DH8C00201Z5", health: 75 },
    { id: 2, model: "Mavic 3 Enterprise", alias: "Echo-02", status: "Mantenimiento", total_hours: 45.2, mtow: 1.05, serial_number: "5E6RH9A00102X2", health: 92 },
  ];

  return (
    <div className="flex h-full -m-8 overflow-hidden relative">
      <div className="flex-1 overflow-y-auto p-8 space-y-8">
        
        {/* Header de Sección */}
        <div className="flex justify-between items-end">
          <div className="text-left">
            <h2 className="text-3xl font-black tracking-tight text-slate-900">Gestión de Flota</h2>
            <p className="text-slate-500 mt-1">Supervisión técnica de aeronaves y estados operativos.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowPanel(true)}
              className="bg-[#ec5b13] hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-orange-500/20 transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Registrar Nueva Aeronave
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3">
          <FilterButton label="Tipo: Todos" />
          <FilterButton label="Estado: Operativo" />
          <div className="h-8 w-px bg-slate-200 mx-2 self-center"></div>
          <button className="text-xs font-bold text-slate-400 hover:text-[#ec5b13] uppercase tracking-widest">Limpiar Filtros</button>
        </div>

        {/* Galería de Flota */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {fleet.map(drone => (
            <AircraftCard key={drone.id} aircraft={drone} />
          ))}
        </div>
      </div>

      {/* Panel Lateral de Registro (Condicional) */}
      {showPanel && (
        <aside className="w-96 bg-white border-l border-slate-200 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300 z-50">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="text-lg font-bold">Nueva Aeronave</h3>
            <button onClick={() => setShowPanel(false)} className="text-slate-400 hover:text-red-500">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
            <div className="space-y-4">
              <label className="block text-[10px] font-black uppercase text-slate-400">Marca / Modelo</label>
              <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#ec5b13]/20 outline-none" placeholder="Ej: Autel Evo II RTK" />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase text-slate-400">S/N</label>
                  <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none" placeholder="Serial" />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase text-slate-400">DAN / Matrícula</label>
                  <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none" placeholder="DAN-0000" />
                </div>
              </div>
            </div>

            {/* Dropzone de Documentos */}
            <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center hover:border-[#ec5b13] transition-colors group cursor-pointer">
              <span className="material-symbols-outlined text-4xl text-slate-300 group-hover:text-[#ec5b13] mb-2">cloud_upload</span>
              <p className="text-[10px] font-bold text-slate-400 uppercase">Cargar Póliza o Registro</p>
            </div>
          </div>

          <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
            <button onClick={() => setShowPanel(false)} className="flex-1 py-3 text-sm font-bold text-slate-500">Cancelar</button>
            <button className="flex-1 py-3 bg-[#ec5b13] text-white rounded-xl text-sm font-bold shadow-lg shadow-orange-500/20">Guardar</button>
          </div>
        </aside>
      )}
    </div>
  );
}

function FilterButton({ label }) {
  return (
    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors">
      {label}
      <span className="material-symbols-outlined text-[18px]">expand_more</span>
    </button>
  );
}