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
  
  const [pilots, setPilots] = useState([]);
  const [aircrafts, setAircrafts] = useState([]);
  const [reportData, setReportData] = useState([]);

  const [filters, setFilters] = useState({
    dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    pilotId: 'all',
    aircraftId: 'all'
  });

  useEffect(() => {
    async function loadInitial() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [profileRes, pilotsRes, aircraftRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('pilots').select('id, name').eq('owner_id', user.id),
        supabase.from('aircraft').select('id, model, serial_number').eq('owner_id', user.id)
      ]);
      setUserProfile(profileRes.data || {});
      setPilots(pilotsRes.data || []);
      setAircrafts(aircraftRes.data || []);
      setLoading(false);
    }
    loadInitial();
  }, []);

  useEffect(() => {
    async function fetchReportData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const url = `/api/reports?userId=${session.user.id}&type=${reportType}&from=${filters.dateFrom}&to=${filters.dateTo}&pilotId=${filters.pilotId}&aircraftId=${filters.aircraftId}`;
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${session.access_token}` } });
      const data = await res.json();
      setReportData(Array.isArray(data) ? data : []);
    }
    if (!loading) fetchReportData();
  }, [reportType, filters, loading]);

  const handleDownload = () => {
    if (reportData.length === 0) return alert("No hay datos disponibles.");
    setDownloading(true);
    
    if (exportFormat === 'pdf') downloadPDF(reportType, reportData, filters);
    else if (exportFormat === 'excel') downloadExcel(reportType, reportData);
    else if (exportFormat === 'csv') downloadCSV(reportType, reportData);
    
    setDownloading(false);
  };

  const totalMins = reportData.reduce((acc, r) => acc + (parseInt(r.DURACION.split(':')[0]) * 60 + parseInt(r.DURACION.split(':')[1])), 0);
  const totalDisplay = `${Math.floor(totalMins / 60)}h ${totalMins % 60}m`;

  if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-300">ESTABLECIENDO PROTOCOLO DE AUDITORÍA...</div>;

  return (
    <div className="flex h-screen -m-8 overflow-hidden bg-slate-100 text-left font-display">
      
      {/* SIDEBAR CONFIG */}
      <aside className="w-1/4 min-w-[320px] bg-[#1A202C] text-white flex flex-col p-6 shadow-2xl">
        <h1 className="text-xl font-black text-[#ec5b13] mb-8 tracking-tighter uppercase">BitaFly Reports</h1>

        <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">01. Sujeto de Análisis</label>
            <div className="grid gap-2">
              <button onClick={() => setReportType('vuelos')} className={`py-3 px-4 rounded-xl text-xs font-bold uppercase border transition-all ${reportType === 'vuelos' ? 'bg-[#ec5b13] border-[#ec5b13]' : 'border-slate-700 text-slate-400'}`}>Bitácora General</button>
              <button onClick={() => setReportType('sms')} className={`py-3 px-4 rounded-xl text-xs font-bold uppercase border transition-all ${reportType === 'sms' ? 'bg-red-600 border-red-600' : 'border-slate-700 text-slate-400'}`}>Incidentes SMS</button>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-white/5">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">02. Filtros Cruzados</label>
            <select className="w-full bg-slate-800 p-3 rounded-xl text-xs font-bold outline-none" value={filters.pilotId} onChange={e => setFilters({...filters, pilotId: e.target.value})}>
              <option value="all">Todos los Pilotos</option>
              {pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select className="w-full bg-slate-800 p-3 rounded-xl text-xs font-bold outline-none" value={filters.aircraftId} onChange={e => setFilters({...filters, aircraftId: e.target.value})}>
              <option value="all">Todas las Aeronaves</option>
              {aircrafts.map(a => <option key={a.id} value={a.id}>{a.model}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" className="bg-slate-800 p-2 rounded-lg text-[10px] font-bold outline-none" value={filters.dateFrom} onChange={e => setFilters({...filters, dateFrom: e.target.value})}/>
              <input type="date" className="bg-slate-800 p-2 rounded-lg text-[10px] font-bold outline-none" value={filters.dateTo} onChange={e => setFilters({...filters, dateTo: e.target.value})}/>
            </div>
          </div>
        </div>

        <button onClick={handleDownload} disabled={downloading} className="mt-8 w-full bg-[#ec5b13] hover:bg-orange-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all">
          {downloading ? 'GENERANDO...' : 'DESCARGAR REPORTE'}
        </button>
      </aside>

      {/* PREVIEW SHEET */}
      <main className="flex-1 overflow-y-auto p-12 flex flex-col items-center custom-scrollbar">
        <div className="bg-white text-slate-900 w-full max-w-[900px] aspect-[1.414] shadow-2xl p-10 flex flex-col border border-slate-300">
          <div className="flex justify-between items-start border-b-4 border-slate-900 pb-6 mb-6 uppercase">
            <div>
              <h2 className="text-xl font-black leading-tight">BitaFly Manager UAS</h2>
              <p className="text-[9px] font-bold text-[#ec5b13] tracking-widest">Reporte de Cumplimiento Oficial</p>
            </div>
            <div className="text-right text-[9px] text-slate-400 font-bold">
               <p>OPERADOR: {userProfile.company_name || 'N/A'}</p>
               <p>PERIODO: {filters.dateFrom} / {filters.dateTo}</p>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <table className="w-full text-[8px] border-collapse">
              <thead>
                <tr className="bg-slate-100 font-black uppercase border-b-2 border-slate-200 text-slate-500">
                  <th className="p-2 text-left">Fecha</th>
                  <th className="p-2 text-left">ID Vuelo</th>
                  <th className="p-2 text-left">Tripulante</th>
                  <th className="p-2 text-left">Aeronave</th>
                  <th className="p-2 text-center">Tiempo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.map((row, i) => (
                  <tr key={i}>
                    <td className="p-2 font-bold">{row.FECHA}</td>
                    <td className="p-2 font-mono text-[#ec5b13] font-bold">{row.ID_VUELO}</td>
                    <td className="p-2 font-bold text-slate-700">{row.TRIPULANTE}</td>
                    <td className="p-2 uppercase">{row.AERONAVE}</td>
                    <td className="p-2 text-center font-black text-slate-900">{row.DURACION}</td>
                  </tr>
                ))}
              </tbody>
              {reportData.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-900 text-white font-black">
                    <td colSpan="4" className="p-2 text-right uppercase tracking-widest text-[7px]">Total Acumulado en el Periodo:</td>
                    <td className="p-2 text-center text-[9px]">{totalDisplay}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}