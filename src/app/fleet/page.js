'use client';
import { useState } from 'react';
import AircraftCard from '@/components/AircraftCard';

export default function FleetPage() {
  const [showPanel, setShowPanel] = useState(false);

  const fleet = [
    { id: 1, model: "DJI Matrice 300 RTK", alias: "Alpha-01", status: "Operativo", total_hours: 124.5, mtow: 9.0, serial_number: "3Q4DH8C00201Z5", health: 75 },
    { id: 2, model: "Mavic 3 Enterprise", alias: "Echo-02", status: "Mantenimiento", total_hours: 45.2, mtow: 1.05, serial_number: "5E6RH9A00102X2", health: 92 },
  ];

  return (
    <div className="space-y-8 text-left">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-900">Gestión de Flota</h2>
          <p className="text-slate-500 mt-1">Supervisión técnica de aeronaves.</p>
        </div>
        <button onClick={() => setShowPanel(true)} className="bg-[#ec5b13] text-white px-6 py-2.5 rounded-xl font-bold shadow-lg">
          Registrar Aeronave
        </button>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {fleet.map(drone => <AircraftCard key={drone.id} aircraft={drone} />)}
      </div>
    </div>
  );
}