'use client';

import { useState } from 'react';
import AircraftCard from '@/components/AircraftCard';

export default function FleetPage() {
  const [showPanel, setShowPanel] = useState(false);
  const fleet = [];

  return (
    <div className="p-8">
      <h2 className="text-3xl font-black text-left">Gestión de Flota</h2>
      <button onClick={() => setShowPanel(true)} className="bg-[#ec5b13] text-white px-4 py-2 rounded-lg mt-4">
        Registrar Aeronave
      </button>
    </div>
  );
}