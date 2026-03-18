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
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/logbook?userId=${session.user.id}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const data = await res.json();
      setFlights(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error en bitácora:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="flex flex-col h-full -m-8 bg-[#f8f6f6] animate-in fade-in duration-500">
      <header className="bg-white border-b border-slate-200 px-8 py-6 sticky top-0 z-40 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-slate-400">history_edu</span>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter text-left">Bitácora Oficial</h2>
        </div>
        <Link href="/dashboard/logbook/new" className="bg-[#ec5b13] hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">add</span> Nuevo Registro
        </Link>
      </header>

      <div className="p-8">
        <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden text-left">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                  <th className="px-8 py-5">Fecha</th>
                  <th className="px-8 py-5">ID Misión</th>
                  <th className="px-8 py-5">Tripulante / Equipo</th>
                  <th className="px-8 py-5">Ubicación</th>
                  <th className="px-8 py-5 text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan="5" className="p-20 text-center animate-pulse text-slate-400 font-bold uppercase text-xs">Sincronizando registros...</td></tr>
                ) : flights.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-5 text-sm font-bold text-slate-800">{f.flight_date}</td>
                    <td className="px-8 py-5">
                      <span className="font-mono text-xs font-black text-[#ec5b13] bg-orange-50 px-2 py-1 rounded border border-orange-100">
                        {f.flight_number}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <p className="text-sm font-bold text-slate-700">{f.pilots?.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">{f.aircraft?.model}</p>
                    </td>
                    <td className="px-8 py-5 text-sm text-slate-500 font-medium">
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm text-slate-300">location_on</span>
                        {f.location}
                      </div>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase border border-emerald-100">Cerrado</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!loading && flights.length === 0 && (
            <div className="py-20 text-center text-slate-400 italic font-medium uppercase text-xs tracking-widest">No hay registros en esta bitácora</div>
          )}
        </div>
      </div>
    </div>
  );
}