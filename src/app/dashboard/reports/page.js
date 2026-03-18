'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { downloadPDF, downloadExcel, downloadCSV } from '@/lib/reportGenerators';

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [userProfile, setUserProfile] = useState({});
  const [reportType, setReportType] = useState('vuelos'); // vuelos, aeronaves, sms
  const [exportFormat, setExportFormat] = useState('pdf');
  
  // Listas para los filtros selectores
  const [pilots, setPilots] = useState([]);
  const [aircrafts, setAircrafts] = useState([]);
  
  // Datos reales obtenidos para el reporte
  const [reportData, setReportData] = useState([]);
  const [lastMaint, setLastMaint] = useState(null);

  // Estado de filtros
  const [filters, setFilters] = useState({
    dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    pilotId: 'all',
    aircraftId: 'all'
  });

  // 1. CARGA INICIAL DE PERFIL Y LISTAS
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

  // 2. OBTENER DATOS DEL REPORTE SEGÚN FILTROS
  useEffect(() => {
    async function fetchReportData() {
      const { data: { user } } = await supabase.auth.getUser();
      let table = reportType === 'vuelos' ? 'flights' : (reportType === 'aeronaves' ? 'aircraft' : 'sms_reports');
      
      let query = supabase.from(table).select('*, pilots(name), aircraft(model, serial_number)').eq('owner_id', user.id)
        .gte('created_at', filters.dateFrom).lte('created_at', filters.dateTo);

      if (filters.pilotId !== 'all' && reportType === 'vuelos') query = query.eq('pilot_id', filters.pilotId);
      if (filters.aircraftId !== 'all') query = query.eq('aircraft_id', filters.aircraftId);

      const { data } = await query.order('created_at', { ascending: false });
      setReportData(data || []);

      // Lógica de último mantenimiento si se filtra por aeronave específica
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

  // 3. LÓGICA DE DESCARGA (CORREGIDA PARA EVITAR ERROR EN PDF)
  const handleDownload = () => {
    if (reportData.length === 0) return alert("No hay datos disponibles para el periodo seleccionado.");
    
    setDownloading(true);

    // --- APLANAR DATOS: Convertir objetos anidados en texto simple para jsPDF ---
    const cleanData = reportData.map(row => ({
      FECHA: row.flight_date || row.maintenance_date || row.created_at?.slice(0,10),
      ID_REF: row.flight_number || row.serial_number || 'N/A',
      TIPO: row.mission_type || row.model || row.severity || 'General',
      PILOTO: row.pilots?.name || 'Admin',
      AERONAVE: row.aircraft?.model || row.model || 'N/A',
      UBICACION: row.location || 'Operación Base',
      NOTAS: row.notes || 'Sin novedades registradas'
    }));

    try {
      if (exportFormat === 'pdf') {
        downloadPDF(reportType, cleanData, filters, lastMaint);
      } else if (exportFormat === 'excel') {
        downloadExcel(reportType, cleanData);
      } else if (exportFormat === 'csv') {
        downloadCSV(reportType, cleanData);
      }
    } catch (error) {
      alert("Error en la generación del archivo: " + error.message);
    }

    setDownloading(false);
  };

  if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-300 uppercase tracking-widest">Sincronizando BitaFly Reports...</div>;

  const isPro = userProfile.subscription_plan !== 'piloto';

  return (
    <div className="flex h-screen -m-8 overflow-hidden bg-slate-100 text-left font-display">
      
      {/* SIDEBAR DE CONFIGURACIÓN */}
      <aside className="w-1/4 min-w-[320px] bg-[#1A202C] text-white flex flex-col p-6 shadow-2xl overflow-y-auto">
        <h1 className="text-xl font-black text-[#ec5b13] mb-1 tracking-tighter uppercase">Generador</h1>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-8">Auditoría & Cumplimiento</p>

        <div className="space-y-6 flex-1">
          {/* 01. TIPO */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">01. Categoría</label>
            <div className="grid gap-2">
              {['vuelos', 'aeronaves', 'sms'].map(t => (
                <button key={t} onClick={() => setReportType(t)} className={`py-3 px-4 rounded-xl text-xs font-bold uppercase border transition-all ${reportType === t ? 'bg-[#ec5b13] border-[#ec5b13] shadow-lg' : 'border-slate-700 text-slate-400 hover:bg-slate-800'}`}>
                  {t === 'aeronaves' ? 'Mi Flota' : t === 'vuelos' ? 'Bitácora' : 'SMS'}
                </button>
              ))}
            </div>
          </div>

          {/* 02. FILTROS DINÁMICOS */}
          <div className="space-y-4 pt-4 border-t border-white/5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">02. Filtros de Búsqueda</label>
            
            {reportType === 'vuelos' && (
              <select className="w-full bg-slate-800 border-none p-3 rounded-xl text-xs font-bold outline-none" value={filters.pilotId} onChange={e => setFilters({...filters, pilotId: e.target.value})}>
                <option value="all">Filtrar: Todos los Pilotos</option>
                {pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}

            <select className="w-full bg-slate-800 border-none p-3 rounded-xl text-xs font-bold outline-none" value={filters.aircraftId} onChange={e => setFilters({...filters, aircraftId: e.target.value})}>
              <option value="all">Filtrar: Todas las Aeronaves</option>
              {aircrafts.map(a => <option key={a.id} value={a.id}>{a.model} ({a.serial_number})</option>)}
            </select>

            <div className="grid grid-cols-2 gap-2">
              <input type="date" className="bg-slate-800 border-none p-2 rounded-lg text-[10px] outline-none font-bold" value={filters.dateFrom} onChange={e => setFilters({...filters, dateFrom: e.target.value})}/>
              <input type="date" className="bg-slate-800 border-none p-2 rounded-lg text-[10px] outline-none font-bold" value={filters.dateTo} onChange={e => setFilters({...filters, dateTo: e.target.value})}/>
            </div>
          </div>

          {/* 03. FORMATO */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">03. Formato de Salida</label>
            <div className="grid grid-cols-3 gap-2">
              <button onClick={() => setExportFormat('pdf')} className={`py-2 rounded-lg text-[10px] font-black uppercase border transition-all ${exportFormat === 'pdf' ? 'bg-[#ec5b13] border-[#ec5b13] text-white shadow-lg' : 'border-slate-700 text-slate-500'}`}>PDF</button>
              <button disabled={!isPro} onClick={() => setExportFormat('excel')} className={`py-2 rounded-lg text-[10px] font-black uppercase border transition-all ${!isPro ? 'opacity-20' : exportFormat === 'excel' ? 'bg-[#ec5b13] border-[#ec5b13] text-white shadow-lg' : 'border-slate-700 text-slate-500'}`}>XLS</button>
              <button disabled={!isPro} onClick={() => setExportFormat('csv')} className={`py-2 rounded-lg text-[10px] font-black uppercase border transition-all ${!isPro ? 'opacity-20' : exportFormat === 'csv' ? 'bg-[#ec5b13] border-[#ec5b13] text-white shadow-lg' : 'border-slate-700 text-slate-500'}`}>CSV</button>
            </div>
          </div>
        </div>

        <button onClick={handleDownload} disabled={downloading} className="mt-8 w-full bg-[#ec5b13] hover:bg-orange-600 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all">
          {downloading ? 'PROCESANDO...' : 'GENERAR DESCARGA'}
        </button>
      </aside>

      {/* VISTA PREVIA (DERECHA) */}
      <main className="flex-1 overflow-y-auto p-12 flex flex-col items-center custom-scrollbar">
        <div className="bg-white text-slate-900 w-full max-w-[900px] aspect-[1.414] shadow-2xl p-10 flex flex-col border border-slate-300">
          
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

          <div className="flex-1 overflow-hidden">
            <table className="w-full text-[9px] border-collapse">
              <thead>
                <tr className="bg-slate-100 font-black uppercase border-b-2 border-slate-200">
                  <th className="p-2 text-left">Fecha</th>
                  <th className="p-2 text-left">ID Referencia</th>
                  <th className="p-2 text-left">Resumen Operativo</th>
                  <th className="p-2 text-center">Ubicación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.length > 0 ? reportData.map((row, i) => (
                  <tr key={i}>
                    <td className="p-2 font-bold">{row.flight_date || row.maintenance_date || row.created_at?.slice(0,10)}</td>
                    <td className="p-2 font-mono text-[#ec5b13] font-bold">{row.flight_number || row.serial_number || 'N/A'}</td>
                    <td className="p-2 uppercase">{row.mission_type || row.model || row.severity}</td>
                    <td className="p-2 text-center text-slate-500">{row.location || 'Base Principal'}</td>
                  </tr>
                )) : (
                  <tr><td colSpan="4" className="p-20 text-center text-slate-300 italic uppercase font-black">Sin registros detectados</td></tr>
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