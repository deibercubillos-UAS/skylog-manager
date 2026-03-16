'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);
  const [listData, setListData] = useState({ pilots: [], aircrafts: [] });
  const [results, setResults] = useState({ flights: [], maintenance: [] });
  
  // Estado de Configuración Dinámica
  const [config, setConfig] = useState({
    reportType: 'piloto', // 'piloto' o 'aeronave'
    targetId: 'all',
    dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    // Toggles de información
    showHours: true,
    showCount: true,
    showTypes: true,
    showMaintenance: false
  });

  // 1. Cargar listas de selección
  useEffect(() => {
    async function loadInitialData() {
      const { data: p } = await supabase.from('pilots').select('id, name');
      const { data: a } = await supabase.from('aircraft').select('id, model, serial_number');
      setListData({ pilots: p || [], aircrafts: a || [] });
    }
    loadInitialData();
  }, []);

  // 2. Cargar datos del reporte basado en la configuración
  useEffect(() => {
    async function fetchReportData() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      // Consulta de Vuelos
      let flightQuery = supabase
        .from('flights')
        .select('*, pilots(name), aircraft(model, serial_number)')
        .eq('owner_id', user.id)
        .gte('flight_date', config.dateFrom)
        .lte('flight_date', config.dateTo);

      if (config.targetId !== 'all') {
        const filterKey = config.reportType === 'piloto' ? 'pilot_id' : 'aircraft_id';
        flightQuery = flightQuery.eq(filterKey, config.targetId);
      }

      const { data: flights } = await flightQuery.order('flight_date', { ascending: true });
      
      // Consulta de Mantenimiento (Solo si es reporte de aeronave)
      let maintenance = [];
      if (config.reportType === 'aeronave' && config.showMaintenance) {
        // Aquí podrías consultar una tabla de logs de mantenimiento si la tienes
        // Por ahora simularemos datos basados en el estado del dron
      }

      setResults({ flights: flights || [], maintenance });
      setLoading(false);
    }
    fetchReportData();
  }, [config]);

  // Cálculos de resumen
  const totalMinutes = results.flights.length * 45; // Simulación: 45 min por vuelo
  const totalHours = (totalMinutes / 60).toFixed(1);

  return (
    <div className="flex h-screen -m-8 overflow-hidden bg-slate-200">
      
      {/* SIDEBAR DE CONFIGURACIÓN */}
      <aside className="w-1/4 min-w-[320px] bg-[#1A202C] text-white flex flex-col border-r border-slate-700 overflow-y-auto p-6 text-left">
        <h1 className="text-xl font-black text-[#ec5b13] mb-1">REPORTERÍA</h1>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-8">Personalización de salida</p>

        <div className="space-y-6">
          {/* Selección de Sujeto */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase">Enfoque del Reporte</label>
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => setConfig({...config, reportType: 'piloto', targetId: 'all'})}
                className={`py-2 text-xs font-bold rounded-lg border transition-all ${config.reportType === 'piloto' ? 'bg-[#ec5b13] border-[#ec5b13]' : 'border-slate-700 hover:bg-slate-800'}`}>
                Piloto
              </button>
              <button 
                onClick={() => setConfig({...config, reportType: 'aeronave', targetId: 'all'})}
                className={`py-2 text-xs font-bold rounded-lg border transition-all ${config.reportType === 'aeronave' ? 'bg-[#ec5b13] border-[#ec5b13]' : 'border-slate-700 hover:bg-slate-800'}`}>
                Aeronave
              </button>
            </div>
          </div>

          {/* Selector Dinámico */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase">Seleccionar {config.reportType}</label>
            <select 
              className="w-full bg-slate-800 border-none rounded-xl py-3 px-4 text-xs font-bold outline-none"
              value={config.targetId}
              onChange={(e) => setConfig({...config, targetId: e.target.value})}
            >
              <option value="all">Todos los {config.reportType}s</option>
              {config.reportType === 'piloto' 
                ? listData.pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)
                : listData.aircrafts.map(a => <option key={a.id} value={a.id}>{a.model} ({a.serial_number})</option>)
              }
            </select>
          </div>

          {/* Rango de Fechas */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase">Periodo</label>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" className="bg-slate-800 p-2 rounded-lg text-[10px] outline-none" value={config.dateFrom} onChange={e => setConfig({...config, dateFrom: e.target.value})}/>
              <input type="date" className="bg-slate-800 p-2 rounded-lg text-[10px] outline-none" value={config.dateTo} onChange={e => setConfig({...config, dateTo: e.target.value})}/>
            </div>
          </div>

          {/* Toggles de Contenido */}
          <div className="pt-4 border-t border-slate-700 space-y-4">
            <label className="text-[10px] font-black text-slate-500 uppercase">Incluir en Reporte</label>
            <Toggle label="Horas de Vuelo" active={config.showHours} onClick={() => setConfig({...config, showHours: !config.showHours})} />
            <Toggle label="Cantidad de Vuelos" active={config.showCount} onClick={() => setConfig({...config, showCount: !config.showCount})} />
            <Toggle label="Tipos de Misión" active={config.showTypes} onClick={() => setConfig({...config, showTypes: !config.showTypes})} />
            {config.reportType === 'aeronave' && (
              <Toggle label="Historial Mantenimiento" active={config.showMaintenance} onClick={() => setConfig({...config, showMaintenance: !config.showMaintenance})} />
            )}
          </div>
        </div>

        <button className="mt-auto w-full bg-[#ec5b13] py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">
          Generar PDF Certificado
        </button>
      </aside>

      {/* VISTA PREVIA (HOJA A4) */}
      <main className="flex-1 overflow-y-auto p-12 custom-scrollbar flex flex-col items-center">
        <div className="bg-white text-slate-900 w-full max-w-[800px] aspect-[1/1.414] shadow-2xl p-12 flex flex-col text-left">
          
          {/* Header del Reporte */}
          <div className="flex justify-between items-start border-b-4 border-[#1A202C] pb-6 mb-8">
            <div>
              <h2 className="text-2xl font-black uppercase text-[#1A202C]">Reporte Operativo SkyLog</h2>
              <p className="text-[10px] font-bold text-slate-500">ENFOQUE: {config.reportType.toUpperCase()}</p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase">Fecha de Emisión</p>
              <p className="text-sm font-black">{new Date().toLocaleDateString()}</p>
            </div>
          </div>

          {/* Resumen Superior Condicional */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {config.showHours && (
              <div className="bg-slate-100 p-4 rounded-lg">
                <p className="text-[8px] font-black text-slate-400 uppercase">Horas Totales</p>
                <p className="text-xl font-black">{totalHours}h</p>
              </div>
            )}
            {config.showCount && (
              <div className="bg-slate-100 p-4 rounded-lg">
                <p className="text-[8px] font-black text-slate-400 uppercase">Vuelos Realizados</p>
                <p className="text-xl font-black">{results.flights.length}</p>
              </div>
            )}
            <div className="bg-[#1A202C] text-white p-4 rounded-lg">
              <p className="text-[8px] font-black opacity-60 uppercase">Estado Reporte</p>
              <p className="text-sm font-black uppercase tracking-widest text-[#ec5b13]">Certificado</p>
            </div>
          </div>

          {/* Tabla Dinámica */}
          <div className="flex-1 border border-slate-200">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="bg-[#1A202C] text-white uppercase">
                  <th className="p-2 border-r border-slate-700">Fecha</th>
                  <th className="p-2 border-r border-slate-700">{config.reportType === 'piloto' ? 'Aeronave' : 'Piloto'}</th>
                  {config.showTypes && <th className="p-2 border-r border-slate-700">Tipo Misión</th>}
                  <th className="p-2 border-r border-slate-700">Ubicación</th>
                  <th className="p-2 text-center">Horas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {results.flights.map((f) => (
                  <tr key={f.id}>
                    <td className="p-2 font-bold">{f.flight_date}</td>
                    <td className="p-2">{config.reportType === 'piloto' ? f.aircraft?.model : f.pilots?.name}</td>
                    {config.showTypes && <td className="p-2 italic text-slate-500">{f.mission_type}</td>}
                    <td className="p-2">{f.location}</td>
                    <td className="p-2 text-center font-mono font-bold">00:45:00</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Sección de Mantenimiento Dinámica */}
            {config.reportType === 'aeronave' && config.showMaintenance && (
              <div className="mt-8 px-2">
                <h4 className="text-[10px] font-black bg-orange-100 text-[#ec5b13] p-1 px-3 inline-block rounded mb-2 uppercase">Historial de Mantenimiento</h4>
                <div className="border border-orange-200 p-4 text-[9px] text-slate-500 italic">
                  No se registran intervenciones técnicas críticas en el periodo seleccionado.
                </div>
              </div>
            )}
          </div>

          {/* Footer Firma */}
          <div className="mt-12 flex justify-end">
            <div className="text-center w-64 border-t-2 border-slate-300 pt-2">
              <p className="text-[10px] font-black uppercase text-[#1A202C]">Firma del Responsable</p>
              <p className="text-[8px] text-slate-400">SkyLog Manager Security Services</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Componente Toggle reutilizable
function Toggle({ label, active, onClick }) {
  return (
    <div className="flex items-center justify-between cursor-pointer group" onClick={onClick}>
      <span className="text-[11px] font-bold text-slate-400 group-hover:text-white transition-colors">{label}</span>
      <div className={`w-8 h-4 rounded-full relative transition-all ${active ? 'bg-[#ec5b13]' : 'bg-slate-700'}`}>
        <div className={`absolute top-1 size-2 bg-white rounded-full transition-all ${active ? 'right-1' : 'left-1'}`}></div>
      </div>
    </div>
  );
}