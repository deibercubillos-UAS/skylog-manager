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
  
  const [filters, setFilters] = useState({
    dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    pilotId: 'all',
    aircraftId: 'all'
  });

  const [reportData, setReportData] = useState([]);
  const [pilots, setPilots] = useState([]);
  const [aircrafts, setAircrafts] = useState([]);

  // 1. Cargar filtros iniciales
  useEffect(() => {
    async function loadResources() {
      const { data: { user } } = await supabase.auth.getUser();
      const [prof, p, a] = await Promise.all([
        fetch(`/api/user/profile?userId=${user.id}`).then(r => r.json()),
        supabase.from('pilots').select('id, name').eq('owner_id', user.id),
        supabase.from('aircraft').select('id, model').eq('owner_id', user.id)
      ]);
      setUserProfile(prof);
      setPilots(p.data || []);
      setAircrafts(a.data || []);
      setLoading(false);
    }
    loadResources();
  }, []);

  // 2. Obtener data para el Preview vía API
  useEffect(() => {
    async function getReportData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const url = `/api/reports?userId=${session.user.id}&type=${reportType}&from=${filters.dateFrom}&to=${filters.dateTo}&pilotId=${filters.pilotId}&aircraftId=${filters.aircraftId}`;
      
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const data = await res.json();
      setReportData(Array.isArray(data) ? data : []);
    }
    if (!loading) getReportData();
  }, [reportType, filters, loading]);

  const handleDownload = () => {
    if (reportData.length === 0) return alert("Sin datos para exportar.");
    setDownloading(true);
    
    if (exportFormat === 'pdf') downloadPDF(reportType, reportData, filters);
    else if (exportFormat === 'excel') downloadExcel(reportType, reportData);
    else if (exportFormat === 'csv') downloadCSV(reportType, reportData);
    
    setDownloading(false);
  };

  if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-300">INICIANDO AUDITORÍA...</div>;

  return (
    <div className="flex h-screen -m-8 overflow-hidden bg-slate-100 text-left font-display">
      {/* SIDEBAR CONFIG */}
      <aside className="w-1/4 min-w-[320px] bg-[#1A202C] text-white flex flex-col p-6 shadow-2xl">
        <h1 className="text-xl font-black text-[#ec5b13] mb-8 tracking-tighter uppercase">BitaFly Reports</h1>
        
        <div className="space-y-6 flex-1 overflow-y-auto pr-2 custom-scrollbar">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">01. Categoría</label>
            <div className="grid gap-2">
              {['vuelos', 'sms'].map(t => (
                <button key={t} onClick={() => setReportType(t)} className={`py-3 px-4 rounded-xl text-xs font-bold uppercase border transition-all ${reportType === t ? 'bg-[#ec5b13] border-[#ec5b13] shadow-lg' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}>
                  {t === 'vuelos' ? 'Bitácora Operativa' : 'Sucesos SMS'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-white/5">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">02. Filtros</label>
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

        <button onClick={handleDownload} disabled={downloading} className="mt-8 w-full bg-[#ec5b13] hover:bg-orange-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">
          {downloading ? 'PROCESANDO...' : 'GENERAR DESCARGA'}
        </button>
      </aside>

      {/* PREVIEW SHEET */}
      <main className="flex-1 overflow-y-auto p-12 flex flex-col items-center custom-scrollbar">
        <div className="bg-white text-slate-900 w-full max-w-[900px] aspect-[1.414] shadow-2xl p-10 flex flex-col border border-slate-300">
          <div className="flex justify-between items-start border-b-4 border-slate-900 pb-6 mb-6 font-black uppercase text-left">
            <div>
              <h2 className="text-xl leading-tight">BitaFly Manager UAS</h2>
              <p className="text-[9px] text-[#ec5b13] tracking-widest">Reporte de Cumplimiento Oficial</p>
            </div>
            <div className="text-right text-[9px] text-slate-400">
               <p>OPERADOR: {userProfile.company_name || 'N/A'}</p>
               <p>PERIODO: {filters.dateFrom} / {filters.dateTo}</p>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <table className="w-full text-[9px] border-collapse">
              <thead>
                <tr className="bg-slate-100 font-black uppercase border-b-2 border-slate-200">
                  <th className="p-2 text-left">Fecha</th>
                  <th className="p-2 text-left">ID</th>
                  <th className="p-2 text-left">Detalle</th>
                  <th className="p-2 text-left">Tripulación / Equipo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.map((row, i) => (
                  <tr key={i}>
                    <td className="p-2 font-bold">{row.FECHA}</td>
                    <td className="p-2 font-mono text-[#ec5b13] font-bold">{row.ID_REF}</td>
                    <td className="p-2">{row.DETALLE}</td>
                    <td className="p-2">{row.PILOTO} / {row.EQUIPO}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}