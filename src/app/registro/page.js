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
  const [reportData, setReportData] = useState([]);

  const [filters, setFilters] = useState({
    dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    async function loadInitial() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setUserProfile(profile || {});
      setLoading(false);
    }
    loadInitial();
  }, []);

  useEffect(() => {
    async function fetchReportData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const url = `/api/reports?userId=${session.user.id}&type=${reportType}&from=${filters.dateFrom}&to=${filters.dateTo}`;
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${session.access_token}` } });
      const data = await res.json();
      setReportData(Array.isArray(data) ? data : []);
    }
    if (!loading) fetchReportData();
  }, [reportType, filters, loading]);

  const handleDownload = () => {
    if (reportData.length === 0) return alert("Sin datos disponibles.");
    setDownloading(true);
    if (exportFormat === 'pdf') downloadPDF(reportType, reportData, filters);
    else if (exportFormat === 'excel') downloadExcel(reportType, reportData);
    else if (exportFormat === 'csv') downloadCSV(reportType, reportData);
    setDownloading(false);
  };

  // Cálculo de total (Solo para Bitácora)
  const totalMins = reportType === 'vuelos' ? reportData.reduce((acc, r) => acc + (parseInt(r.DURACION?.split(':')[0] || 0) * 60 + parseInt(r.DURACION?.split(':')[1] || 0)), 0) : 0;
  const totalDisplay = `${Math.floor(totalMins / 60)}h ${totalMins % 60}m`;

  if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-300">ESTABLECIENDO PROTOCOLO...</div>;

  return (
    <div className="flex h-screen -m-8 overflow-hidden bg-slate-100 text-left font-display">
      <aside className="w-1/4 min-w-[320px] bg-[#1A202C] text-white flex flex-col p-6 shadow-2xl">
        <h1 className="text-xl font-black text-[#ec5b13] mb-8 uppercase">BitaFly Reports</h1>

        <div className="space-y-6 flex-1">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500">01. Categoría</label>
            <div className="grid gap-2">
              <ReportBtn active={reportType === 'vuelos'} label="Bitácora Vuelos" icon="menu_book" onClick={() => setReportType('vuelos')} />
              <ReportBtn active={reportType === 'flota'} label="Reporte de Flota" icon="precision_manufacturing" onClick={() => setReportType('flota')} />
              <ReportBtn active={reportType === 'sms'} label="Incidentes SMS" icon="report_problem" onClick={() => setReportType('sms')} color="red" />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-white/5">
            <label className="text-[10px] font-black uppercase text-slate-500">02. Rango de Fechas</label>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" className="bg-slate-800 p-2 rounded-lg text-[10px] font-bold outline-none" value={filters.dateFrom} onChange={e => setFilters({...filters, dateFrom: e.target.value})}/>
              <input type="date" className="bg-slate-800 p-2 rounded-lg text-[10px] font-bold outline-none" value={filters.dateTo} onChange={e => setFilters({...filters, dateTo: e.target.value})}/>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase">03. Formato</label>
            <div className="grid grid-cols-3 gap-2">
              {['pdf', 'excel', 'csv'].map(f => (
                <button key={f} onClick={() => setExportFormat(f)} className={`py-2 rounded-lg text-[10px] font-black uppercase border ${exportFormat === f ? 'bg-[#ec5b13] border-[#ec5b13]' : 'border-slate-700'}`}>{f}</button>
              ))}
            </div>
          </div>
        </div>

        <button onClick={handleDownload} disabled={downloading} className="mt-8 w-full bg-[#ec5b13] hover:bg-orange-600 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all">
          {downloading ? 'PROCESANDO...' : 'GENERAR DESCARGA'}
        </button>
      </aside>

      <main className="flex-1 overflow-y-auto p-12 flex flex-col items-center">
        <div className="bg-white text-slate-900 w-full max-w-[900px] aspect-[1.414] shadow-2xl p-10 flex flex-col border border-slate-300">
          <div className="flex justify-between items-start border-b-4 border-slate-900 pb-6 mb-6">
            <div>
              <h2 className="text-xl font-black uppercase">BitaFly Manager UAS</h2>
              <p className="text-[9px] font-bold text-[#ec5b13] uppercase tracking-widest">Reporte Oficial: {reportType}</p>
            </div>
            <div className="text-right text-[9px] text-slate-400 font-bold uppercase">
               <p>{userProfile.company_name}</p>
               <p>{filters.dateFrom} / {filters.dateTo}</p>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <table className="w-full text-[8px] border-collapse">
              <thead>
                <tr className="bg-slate-100 font-black uppercase border-b-2 border-slate-200">
                  {reportData[0] && Object.keys(reportData[0]).map(h => (
                    <th key={h} className="p-2 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((val, j) => (
                      <td key={j} className="p-2 font-medium">{val}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
              {reportType === 'vuelos' && reportData.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-900 text-white font-black">
                    <td colSpan={reportData[0] ? Object.keys(reportData[0]).length - 1 : 1} className="p-2 text-right uppercase tracking-widest text-[7px]">Total Acumulado:</td>
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

function ReportBtn({ active, label, icon, onClick, color = "orange" }) {
  const activeColor = color === 'red' ? 'bg-red-600 border-red-600 shadow-red-500/20' : 'bg-[#ec5b13] border-[#ec5b13] shadow-orange-500/20';
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${active ? `${activeColor} text-white shadow-lg` : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}>
      <span className="material-symbols-outlined text-xl">{icon}</span>
      <span className="text-xs font-bold uppercase tracking-tight">{label}</span>
    </button>
  );
}