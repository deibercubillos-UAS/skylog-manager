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
    const { data } = await supabase.from('flights').select('*, pilots(name), aircraft(model)').eq('owner_id', user.id).order('flight_date', { ascending: false });
    setFlights(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData() }, []);

  return (
    <div className="flex flex-col h-full -m-8 bg-[#f8f6f6]">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-slate-400">history_edu</span>
          <h2 className="text-xl font-bold text-slate-800 text-left">Bitácora Oficial de Vuelo</h2>
        </div>
        <div className="flex gap-3">
          <Link href="/dashboard/logbook/new" className="bg-[#ec5b13] hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all shadow-sm">
            <span className="material-symbols-outlined text-lg">add</span> Registrar Nuevo Vuelo
          </Link>
        </div>
      </header>

      <div className="p-8 space-y-6 overflow-y-auto">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden text-left">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Misión ID</th>
                <th className="px-6 py-4">Piloto / Aeronave</th>
                <th className="px-6 py-4">Ubicación</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="5" className="p-10 text-center animate-pulse">Consultando bitácora...</td></tr>
              ) : flights.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-bold">{f.flight_date}</td>
                  <td className="px-6 py-4 font-mono text-xs font-black text-[#ec5b13]">#SKL-{f.id.toString().slice(0,4)}</td>
                  <td className="px-6 py-4 text-sm font-semibold">{f.pilots?.name} <span className="text-xs text-slate-400 font-normal block">{f.aircraft?.model}</span></td>
                  <td className="px-6 py-4 text-sm text-slate-500">{f.location}</td>
                  <td className="px-6 py-4 text-right"><span className="material-symbols-outlined text-slate-300">visibility</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
