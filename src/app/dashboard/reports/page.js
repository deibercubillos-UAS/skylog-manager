'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { downloadPDF, downloadExcel, downloadCSV } from '@/lib/reportGenerators';

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [userProfile, setUserProfile] = useState({});
  const [reportType, setReportType] = useState('vuelos');
  const [exportFormat, setExportFormat] = useState('pdf');
  
  // Listas para filtros
  const [pilots, setPilots] = useState([]);
  const [aircrafts, setAircrafts] = useState([]);
  
  // Datos del reporte
  const [reportData, setReportData] = useState([]);
  const [lastMaint, setLastMaint] = useState(null);

  // Filtros dinámicos
  const [filters, setFilters] = useState({
    dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    pilotId: 'all',
    aircraftId: 'all'
  });

  useEffect(() => {
    async function loadInitial() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      const { data: p } = await supabase.from('pilots').select('id, name').eq('owner_id', user.id);
      const { data: a } = await supabase.from('aircraft').select('id, model, serial_number').eq('owner_id', user.id);
      
      setUserProfile(profile || {});
      setPilots(p || []);
      setAircrafts(a || []);
      setLoading(false);
    }
    loadInitial();
  }, []);

  // CARGAR DATA DEL REPORTE Y ÚLTIMO MANTENIMIENTO
  useEffect(() => {
    async function fetchReportData() {
      const { data: { user } } = await supabase.auth.getUser();
      let table = reportType === 'vuelos' ? 'flights' : (reportType === 'aeronaves' ? 'aircraft' : 'sms_reports');
      
      let query = supabase.from(table).select('*').eq('owner_id', user.id)
        .gte('created_at', filters.dateFrom).lte('created_at', filters.dateTo);

      if (filters.pilotId !== 'all' && reportType === 'vuelos') query = query.eq('pilot_id', filters.pilotId);
      if (filters.aircraftId !== 'all') query = query.eq('aircraft_id', filters.aircraftId);

      const { data } = await query.order('created_at', { ascending: false });
      setReportData(data || []);

      // Si es reporte de aeronave y hay una seleccionada, buscar su último mantenimiento
      if (reportType === 'aeronaves' && filters.aircraftId !== 'all') {
        const { data: maint } = await supabase.from('maintenance_logs')
          .select('*').eq('aircraft_id', filters.aircraftId).order('maintenance_date', { ascending: false }).limit(1).single();
        setLastMaint(maint);
      } else {
        setLastMaint(null);
      }
    }
    if (!loading) fetchReportData();
  }, [reportType, filters, loading]);

  const handleDownload = () => {
    if (reportData.length === 0) return alert("Sin datos");
    const clean = reportData.map(({ id, owner_id, organization_id, ...rest }) => rest);
    
    if (exportFormat === 'pdf') downloadPDF(reportType, clean, filters, lastMaint);
    else if (exportFormat === 'excel') downloadExcel(reportType, clean);
    else if (exportFormat === 'csv') downloadCSV(reportType, clean);
  };

  if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-300">CONFIGURANDO REPORTE...</div>;

  return (
    <div className="flex h-screen -m-8 overflow-hidden bg-slate-100 text-left">
      {/* SIDEBAR */}
      <aside className="w-1/4 min-w-[320px] bg-[#1A202C] text-white flex flex-col p-6 shadow-2xl">
        <h1 className="text-xl font-black text-[#ec5b13] mb-1 tracking-tighter">BitaFly Reports</h1>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-8">Auditoría Aeronáutica</p>

        <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
          {/* TIPO */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase">01. Categoría</label>
            <div className="grid gap-2">
              {['vuelos', 'aeronaves', 'sms'].map(t => (
                <button key={t} onClick={() => setReportType(t)} className={`py-3 px-4 rounded-xl text-xs font-bold uppercase border transition-all ${reportType === t ? 'bg-[#ec5b13] border-[#ec5b13]' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}>
                  {t.replace('aeronaves', 'Flota')}
                </button>
              ))}
            </div>
          </div>

          {/* FILTROS CRUZADOS */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <label className="text-[10px] font-black text-slate-400 uppercase">02. Filtros de Análisis</label>
            
            {reportType === 'vuelos' && (
              <select className="w-full bg-slate-800 p-3 rounded-xl text-xs font-bold outline-none" value={filters.pilotId} onChange={e => setFilters({...filters, pilotId: e.target.value})}>
                <option value="all">Todos los Pilotos</option>
                {pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}

            <select className="w-full bg-slate-800 p-3 rounded-xl text-xs font-bold outline-none" value={filters.aircraftId} onChange={e => setFilters({...filters, aircraftId: e.target.value})}>
              <option value="all">Todas las Aeronaves</option>
              {aircrafts.map(a => <option key={a.id} value={a.id}>{a.model} ({a.serial_number})</option>)}
            </select>

            <div className="grid grid-cols-2 gap-2">
              <input type="date" className="bg-slate-800 p-2 rounded-lg text-[10px] outline-none font-bold" value={filters.dateFrom} onChange={e => setFilters({...filters, dateFrom: e.target.value})}/>
              <input type="date" className="bg-slate-800 p-2 rounded-lg text-[10px] outline-none font-bold" value={filters.dateTo} onChange={e => setFilters({...filters, dateTo: e.target.value})}/>
            </div>
          </div>

          {/* FORMATO */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase">03. Formato</label>
            <div className="grid grid-cols-3 gap-2">
              {['pdf', 'excel', 'csv'].map(f => (
                <button key={f} onClick={() => setExportFormat(f)} className={`py-2 rounded-lg text-[10px] font-black uppercase border ${exportFormat === f ? 'bg-[#ec5b13] border-[#ec5b13]' : 'border-slate-700'}`}>{f}</button>
              ))}
            </div>
          </div>
        </div>

        <button onClick={handleDownload} disabled={downloading} className="mt-8 w-full bg-[#ec5b13] py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">
          {downloading ? 'PROCESANDO...' : 'GENERAR DESCARGA'}
        </button>
      </aside>

      {/* VISTA PREVIA REAL */}
      <main className="flex-1 overflow-y-auto p-12 flex flex-col items-center custom-scrollbar">
        <div className="bg-white text-slate-900 w-full max-w-[900px] aspect-[1.414] shadow-2xl p-10 flex flex-col border border-slate-300">
          
          {/* Header Preview */}
          <div className="flex justify-between items-start border-b-4 border-slate-900 pb-6 mb-6">
            <div className="flex items-center gap-4">
              <img src="/logo.png" className="size-14 object-contain" />
              <div>
                <h2 className="text-xl font-black uppercase leading-tight">BitaFly Manager UAS</h2>
                <p className="text-[9px] font-bold text-[#ec5b13] uppercase tracking-widest">Reporte de Operaciones Oficial</p>
              </div>
            </div>
            <div className="text-right">
              {lastMaint && (
                <div className="bg-orange-50 p-2 rounded border border-orange-100 mb-2">
                  <p className="text-[8px] font-black text-[#ec5b13] uppercase">Último Mantenimiento</p>
                  <p className="text-[10px] font-bold text-slate-700">{lastMaint.maintenance_date}</p>
                </div>
              )}
              <p className="text-[9px] font-bold text-slate-400 uppercase">Rango: {filters.dateFrom} - {filters.dateTo}</p>
            </div>
          </div>

          {/* TABLA DE VISTA PREVIA REAL */}
          <div className="flex-1 overflow-hidden">
            <table className="w-full text-[9px] border-collapse">
              <thead>
                <tr className="bg-slate-100 font-black uppercase border-b-2 border-slate-200">
                  <th className="p-2 text-left">Fecha</th>
                  <th className="p-2 text-left">Referencia</th>
                  <th className="p-2 text-left">Detalle Principal</th>
                  <th className="p-2 text-center">Ubicación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.length > 0 ? reportData.map((row, i) => (
                  <tr key={i}>
                    <td className="p-2 font-bold">{row.flight_date || row.created_at?.slice(0,10)}</td>
                    <td className="p-2 font-mono text-[#ec5b13] font-bold">{row.flight_number || 'N/A'}</td>
                    <td className="p-2">{row.mission_type || row.model || row.severity}</td>
                    <td className="p-2 text-center">{row.location || 'N/A'}</td>
                  </tr>
                )) : (
                  <tr><td colSpan="4" className="p-20 text-center text-slate-300 italic">No hay datos en el rango seleccionado</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center opacity-50">
            <p className="text-[8px] font-black uppercase tracking-widest">BitaFly Aviation Systems v2.4</p>
            <div className="w-32 border-b border-slate-300 h-8"></div>
          </div>
        </div>
      </main>
    </div>
  );
}