'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function FlightLogPage() {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, hours: '0h 0m', incidents: 0 });

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: flightsData } = await supabase
      .from('flights')
      .select('*, pilots(name), aircraft(model)')
      .eq('owner_id', user.id)
      .order('flight_date', { ascending: false });

    if (flightsData) {
      setFlights(flightsData);
      // Cálculo rápido de stats
      const totalMin = flightsData.length * 45; // Simulación de minutos por ahora
      setStats({
        total: flightsData.length,
        hours: `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`,
        incidents: flightsData.filter(f => f.incidents).length
      });
    }
    setLoading(false);
  };

  useEffect(() => { fetchData() }, []);

  return (
    <div className="flex flex-col h-full -m-8 bg-[#f8f6f6]">
      {/* Header de la Bitácora */}
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-slate-400">history_edu</span>
          <h2 className="text-xl font-bold text-slate-800 text-left">Bitácora Oficial de Vuelo</h2>
        </div>
        <div className="flex gap-3">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all shadow-sm">
            <span className="material-symbols-outlined text-lg">download</span>
            Exportar Reporte
          </button>
          <button className="bg-[#ec5b13] hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all shadow-sm">
            <span className="material-symbols-outlined text-lg">add</span>
            Registrar Nuevo Vuelo
          </button>
        </div>
      </header>

      <div className="p-8 space-y-6 overflow-y-auto">
        {/* Cards de Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard icon="analytics" label="Total Vuelos" value={stats.total} color="text-blue-600" bg="bg-blue-100" />
          <StatCard icon="schedule" label="Horas Totales" value={stats.hours} color="text-[#ec5b13]" bg="bg-orange-100" isMono />
          <StatCard icon="verified_user" label="Incidentes" value={stats.incidents} color="text-emerald-600" bg="bg-emerald-100" />
        </div>

        {/* Barra de Filtros */}
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <input className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#ec5b13]/20" placeholder="Buscar por ID, Piloto o Ubicación..." />
          </div>
          <div className="flex gap-2">
             <FilterPill label="Fotogrametría" />
             <FilterPill label="Inspección" active />
             <FilterPill label="Vigilancia" />
          </div>
        </div>

        {/* Tabla Principal */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-left">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                  <th className="px-6 py-4">Fecha & Hora</th>
                  <th className="px-6 py-4">Misión ID</th>
                  <th className="px-6 py-4">Piloto / Aeronave</th>
                  <th className="px-6 py-4">Ubicación</th>
                  <th className="px-6 py-4">Estado</th>
                  <th className="px-6 py-4 text-center">Docs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan="6" className="p-10 text-center animate-pulse text-slate-400">Cargando registros oficiales...</td></tr>
                ) : flights.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-800">{f.flight_date}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{f.takeoff_time || '00:00'}</p>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs font-black text-[#ec5b13]">
                      #SKL-{f.id.toString().slice(0,4)}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-semibold text-slate-700">{f.pilots?.name || 'N/A'}</p>
                      <p className="text-xs text-slate-400 italic">{f.aircraft?.model || 'Drone'}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">location_on</span>
                        {f.location}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${f.incidents ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-700'}`}>
                        {f.incidents ? 'Incident' : 'Completed'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2 text-slate-400">
                        <span className="material-symbols-outlined text-lg hover:text-[#ec5b13] cursor-pointer">assignment_turned_in</span>
                        <span className="material-symbols-outlined text-lg hover:text-[#ec5b13] cursor-pointer">file_save</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// Componentes Auxiliares
function StatCard({ icon, label, value, color, bg, isMono }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 text-left">
      <div className={`size-12 rounded-full ${bg} flex items-center justify-center ${color}`}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div>
        <p className="text-xs text-slate-500 font-bold uppercase tracking-tighter">{label}</p>
        <p className={`text-2xl font-black text-slate-900 ${isMono ? 'font-mono' : ''}`}>{value}</p>
      </div>
    </div>
  );
}

function FilterPill({ label, active }) {
  return (
    <button className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
      active ? 'bg-[#ec5b13] text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
    }`}>
      {label}
    </button>
  );
}