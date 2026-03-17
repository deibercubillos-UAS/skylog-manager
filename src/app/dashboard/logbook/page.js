'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function FlightLogPage() {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Seleccionamos flight_number explícitamente para asegurarnos de que llegue
    const { data } = await supabase
      .from('flights')
      .select('*, pilots(name), aircraft(model)')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    setFlights(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData() }, []);

  return (
    <div className="flex flex-col h-full -m-8 bg-[#f8f6f6] text-left animate-in fade-in duration-500">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-slate-400">history_edu</span>
          <h2 className="text-xl font-bold text-slate-800">Bitácora Oficial de Vuelo</h2>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/logbook/new" className="bg-[#ec5b13] hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all shadow-sm">
            <span className="material-symbols-outlined text-lg">add</span> Registrar Nuevo Vuelo
          </Link>
        </div>
      </header>

      <div className="p-8 space-y-6 overflow-y-auto">
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-[0.15em]">
                  <th className="px-6 py-5">Fecha Operación</th>
                  <th className="px-6 py-5">Misión ID</th>
                  <th className="px-6 py-5">Piloto / Aeronave</th>
                  <th className="px-6 py-5">Ubicación / Novedades</th>
                  <th className="px-6 py-5 text-right">Detalles</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="p-20 text-center animate-pulse text-slate-400 font-bold uppercase text-xs tracking-widest">
                      Sincronizando Bitácora con la Nube...
                    </td>
                  </tr>
                ) : flights.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-800">{f.flight_date}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{f.takeoff_time?.slice(0,5)} UTC</p>
                    </td>
                    
                    {/* AQUÍ ESTÁ EL CAMBIO: Mostramos f.flight_number en lugar del ID técnico */}
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-black text-[#ec5b13] bg-orange-50 px-2 py-1 rounded border border-orange-100 shadow-sm">
                        {f.flight_number || 'N/A'}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-700">{f.pilots?.name}</p>
                      <p className="text-xs text-slate-400 italic font-medium">{f.aircraft?.model}</p>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm font-bold text-slate-600">
                        <span className="material-symbols-outlined text-sm text-slate-400">location_on</span>
                        {f.location}
                      </div>
                      {f.notes && (
                         <p className="text-[10px] text-slate-400 mt-1 truncate w-48">{f.notes}</p>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <button className="size-8 rounded-lg border border-slate-100 flex items-center justify-center text-slate-300 hover:text-[#ec5b13] hover:border-[#ec5b13] transition-all group">
                        <span className="material-symbols-outlined text-lg group-hover:scale-110">visibility</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {!loading && flights.length === 0 && (
            <div className="py-20 text-center text-slate-400 italic">
              No hay vuelos registrados en este historial.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}