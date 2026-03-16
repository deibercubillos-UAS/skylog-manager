'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);
  const [pilots, setPilots] = useState([]);
  const [aircrafts, setAircrafts] = useState([]);
  const [reportFlights, setReportFlights] = useState([]);
  
  // Estado de filtros
  const [config, setConfig] = useState({
    dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], // 1ro del mes
    dateTo: new Date().toISOString().split('T')[0], // Hoy
    pilotId: 'all',
    aircraftId: 'all',
  });

  // 1. Cargar selectores iniciales
  useEffect(() => {
    async function loadData() {
      const { data: p } = await supabase.from('pilots').select('id, name');
      const { data: a } = await supabase.from('aircraft').select('id, model, serial_number');
      setPilots(p || []);
      setAircrafts(a || []);
    }
    loadData();
  }, []);

  // 2. Función para obtener vuelos reales basados en filtros
  const fetchReportData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    let query = supabase
      .from('flights')
      .select('*, pilots(name), aircraft(model, serial_number)')
      .eq('owner_id', user.id)
      .gte('flight_date', config.dateFrom)
      .lte('flight_date', config.dateTo)
      .order('flight_date', { ascending: true });

    if (config.pilotId !== 'all') query = query.eq('pilot_id', config.pilotId);
    if (config.aircraftId !== 'all') query = query.eq('aircraft_id', config.aircraftId);

    const { data, error } = await query;
    if (!error) setReportFlights(data || []);
    setLoading(false);
  };

  // Ejecutar búsqueda cuando cambian los filtros principales
  useEffect(() => { fetchReportData(); }, [config]);

  return (
    <div className="flex h-screen -m-8 overflow-hidden bg-slate-200 dark:bg-slate-950">
      
      {/* CONFIGURACIÓN (IZQUIERDA) */}
      <aside className="w-1/4 min-w-[320px] bg-[#1A202C] text-white flex flex-col border-r border-slate-700 overflow-y-auto">
        <div className="p-6 border-b border-slate-700 text-left">
          <h1 className="text-lg font-bold tracking-tight">Configuración de Reporte</h1>
          <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Filtros Aeronáuticos</p>
        </div>

        <div className="p-6 space-y-8 flex-1 text-left">
          {/* Fechas */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase">Rango de Operación</label>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" className="bg-slate-800 border-slate-700 rounded-lg text-xs p-2 outline-none" 
                value={config.dateFrom} onChange={(e) => setConfig({...config, dateFrom: e.target.value})} />
              <input type="date" className="bg-slate-800 border-slate-700 rounded-lg text-xs p-2 outline-none" 
                value={config.dateTo} onChange={(e) => setConfig({...config, dateTo: e.target.value})} />
            </div>
          </div>

          {/* Piloto */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase">Filtrar por Piloto</label>
            <select className="w-full bg-slate-800 border-slate-700 rounded-lg text-xs py-2.5 px-3 outline-none"
              value={config.pilotId} onChange={(e) => setConfig({...config, pilotId: e.target.value})}>
              <option value="all">Todos los Pilotos</option>
              {pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Aeronave */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase">Filtrar por Aeronave</label>
            <select className="w-full bg-slate-800 border-slate-700 rounded-lg text-xs py-2.5 px-3 outline-none"
              value={config.aircraftId} onChange={(e) => setConfig({...config, aircraftId: e.target.value})}>
              <option value="all">Todas las Aeronaves</option>
              {aircrafts.map(a => <option key={a.id} value={a.id}>{a.model} ({a.serial_number})</option>)}
            </select>
          </div>
        </div>

        <div className="p-6 bg-slate-900/50">
          <button className="w-full bg-[#ec5b13] hover:bg-[#e04f0d] text-white font-black py-4 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 text-xs uppercase tracking-widest">
            <span className="material-symbols-outlined">picture_as_pdf</span>
            Generar PDF Oficial
          </button>
        </div>
      </aside>

      {/* VISTA PREVIA (DERECHA) */}
      <main className="flex-1 overflow-y-auto flex flex-col items-center p-12 custom-scrollbar">
        <div className="bg-white text-slate-900 w-full max-w-[800px] aspect-[1/1.414] shadow-2xl rounded-sm p-12 flex flex-col border border-slate-300 text-left">
          
          {/* Header del PDF */}
          <div className="flex justify-between items-start border-b-2 border-slate-800 pb-8 mb-8">
            <div className="flex items-center gap-4">
              <div className="size-14 bg-[#1A202C] rounded-lg flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-3xl">flight_takeoff</span>
              </div>
              <div>
                <h2 className="text-xl font-black uppercase leading-tight">SkyLog Manager</h2>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Reporte Generado por Sistema Certificado</p>
              </div>
            </div>
            <div className="text-right">
              <h3 className="text-md font-black uppercase text-[#1A202C]">Bitácora de Vuelo RAC 100</h3>
              <p className="text-[9px] font-bold text-slate-500">PERIODO: {config.dateFrom} AL {config.dateTo}</p>
            </div>
          </div>

          {/* Tabla de Vuelos Reales */}
          <div className="flex-1 overflow-hidden">
            <table className="w-full text-left border-collapse border border-slate-300">
              <thead>
                <tr className="bg-[#1A202C] text-white text-[9px] font-black uppercase tracking-widest">
                  <th className="p-2 border border-slate-600">Fecha</th>
                  <th className="p-2 border border-slate-600">Aeronave</th>
                  <th className="p-2 border border-slate-600">Piloto</th>
                  <th className="p-2 border border-slate-600">Misión</th>
                  <th className="p-2 border border-slate-600 text-center">Duración</th>
                </tr>
              </thead>
              <tbody className="text-[9px]">
                {loading ? (
                  <tr><td colSpan="5" className="p-10 text-center italic text-slate-400">Consultando registros en base de datos...</td></tr>
                ) : reportFlights.length > 0 ? (
                  reportFlights.map((f) => (
                    <tr key={f.id} className="border-b border-slate-200">
                      <td className="p-2 font-bold">{f.flight_date}</td>
                      <td className="p-2 uppercase">{f.aircraft?.model}</td>
                      <td className="p-2 font-medium">{f.pilots?.name}</td>
                      <td className="p-2 text-slate-500">{f.mission_type}</td>
                      <td className="p-2 text-center font-mono font-bold">01:00:00</td> {/* Aquí puedes calcular landing_time - takeoff_time */}
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="5" className="p-20 text-center text-slate-300 italic uppercase tracking-widest">No se encontraron registros para este periodo</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer del PDF */}
          <div className="mt-10 pt-6 border-t-2 border-slate-100 flex justify-between items-end">
            <div className="w-1/3">
              <div className="bg-[#1A202C] text-white p-3 rounded">
                <p className="text-[8px] opacity-60 font-bold uppercase">Total Vuelos en Reporte</p>
                <p className="text-xl font-black">{reportFlights.length}</p>
              </div>
            </div>
            <div className="text-center">
              <div className="w-40 border-b border-slate-400 h-12 mb-2"></div>
              <p className="text-[9px] font-black uppercase">Responsable de Operaciones</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}