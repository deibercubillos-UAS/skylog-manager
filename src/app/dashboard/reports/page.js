'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { downloadPDF, downloadExcel, downloadCSV } from '@/lib/reportGenerators';

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [userProfile, setUserProfile] = useState({ role: 'piloto', subscription_plan: 'piloto' });
  const [reportType, setReportType] = useState('vuelos'); // vuelos, aeronaves, sms
  const [exportFormat, setExportFormat] = useState('pdf');
  const [previewData, setPreviewData] = useState([]);
  
  const [config, setConfig] = useState({
    dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
  });

  // 1. CARGAR PERFIL Y DATA INICIAL
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (profile) setUserProfile(profile);
      setLoading(false);
    }
    init();
  }, []);

  // 2. ACTUALIZAR VISTA PREVIA CUANDO CAMBIAN FILTROS
  useEffect(() => {
    async function fetchPreview() {
      const { data: { user } } = await supabase.auth.getUser();
      let table = reportType === 'vuelos' ? 'flights' : (reportType === 'aeronaves' ? 'aircraft' : 'sms_reports');
      
      const { data } = await supabase
        .from(table)
        .select('*')
        .eq('owner_id', user.id)
        .gte('created_at', config.dateFrom)
        .lte('created_at', config.dateTo)
        .limit(5); // Solo 5 para el preview visual
      
      setPreviewData(data || []);
    }
    if (!loading) fetchPreview();
  }, [reportType, config, loading]);

  // 3. LÓGICA DE DESCARGA
  const handleDownload = async () => {
    setDownloading(true);
    const { data: { user } } = await supabase.auth.getUser();
    let table = reportType === 'vuelos' ? 'flights' : (reportType === 'aeronaves' ? 'aircraft' : 'sms_reports');

    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('owner_id', user.id)
      .gte('created_at', config.dateFrom)
      .lte('created_at', config.dateTo);

    if (error || !data || data.length === 0) {
      alert("No hay registros en este periodo.");
      setDownloading(false);
      return;
    }

    // Limpieza de datos (Quitar IDs internos para el reporte)
    const cleanData = data.map(({ id, owner_id, organization_id, created_at, ...rest }) => rest);

    if (exportFormat === 'pdf') downloadPDF(reportType, cleanData, config);
    else if (exportFormat === 'excel') downloadExcel(reportType, cleanData);
    else if (exportFormat === 'csv') downloadCSV(reportType, cleanData);

    setDownloading(false);
  };

  // --- REGLAS DE NEGOCIO ---
  const isSmsManager = userProfile.role === 'gerente_sms' || userProfile.role === 'admin';
  const isPro = userProfile.subscription_plan !== 'piloto';

  const reportOptions = [
    { id: 'vuelos', name: 'Bitácora de Vuelos', icon: 'menu_book', allowed: true },
    { id: 'aeronaves', name: 'Historial de Flota', icon: 'precision_manufacturing', allowed: true },
    { id: 'sms', name: 'Sucesos de Seguridad (SMS)', icon: 'report_problem', allowed: isSmsManager }
  ];

  if (loading) return <div className="p-20 animate-pulse font-black text-slate-300 text-center uppercase tracking-widest">Sincronizando Archivos...</div>;

  return (
    <div className="flex h-screen -m-8 overflow-hidden bg-slate-100 font-display">
      
      {/* SIDEBAR DE CONFIGURACIÓN (IZQUIERDA) */}
      <aside className="w-1/4 min-w-[320px] bg-[#1A202C] text-white flex flex-col border-r border-slate-700 p-6 text-left shadow-2xl">
        <h1 className="text-xl font-black text-[#ec5b13] mb-1">REPORTERÍA</h1>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-8">Centro de Auditoría</p>

        <div className="space-y-8 flex-1">
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">01. Tipo de Reporte</label>
            <div className="space-y-2">
              {reportOptions.map(opt => opt.allowed && (
                <button key={opt.id} onClick={() => setReportType(opt.id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${reportType === opt.id ? 'bg-[#ec5b13] border-[#ec5b13] shadow-lg' : 'border-slate-700 hover:bg-slate-800 text-slate-400'}`}>
                  <span className="material-symbols-outlined text-xl">{opt.icon}</span>
                  <span className="text-xs font-bold uppercase tracking-tight">{opt.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">02. Periodo</label>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" className="bg-slate-800 border-none p-2 rounded-lg text-[10px] outline-none font-bold" value={config.dateFrom} onChange={e => setConfig({...config, dateFrom: e.target.value})}/>
              <input type="date" className="bg-slate-800 border-none p-2 rounded-lg text-[10px] outline-none font-bold" value={config.dateTo} onChange={e => setConfig({...config, dateTo: e.target.value})}/>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">03. Formato</label>
            <div className="grid grid-cols-3 gap-2">
              <FormatBtn id="pdf" icon="picture_as_pdf" label="PDF" active={exportFormat === 'pdf'} onClick={setExportFormat} />
              <FormatBtn id="excel" icon="table_view" label="XLS" active={exportFormat === 'excel'} onClick={setExportFormat} disabled={!isPro} />
              <FormatBtn id="csv" icon="csv" label="CSV" active={exportFormat === 'csv'} onClick={setExportFormat} disabled={!isPro} />
            </div>
            {!isPro && <p className="text-[9px] text-orange-400 font-bold uppercase mt-2">* XLS/CSV para planes PRO</p>}
          </div>
        </div>

        <button onClick={handleDownload} disabled={downloading} className="mt-8 w-full bg-[#ec5b13] hover:bg-orange-600 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl transition-all flex justify-center items-center gap-2">
          {downloading ? 'PROCESANDO...' : 'GENERAR REPORTE'}
        </button>
      </aside>

      {/* VISTA PREVIA (DERECHA) */}
      <main className="flex-1 overflow-y-auto p-12 flex flex-col items-center custom-scrollbar">
        <div className="bg-white text-slate-900 w-full max-w-[800px] aspect-[1.414] shadow-2xl p-12 flex flex-col text-left border border-slate-300">
          <div className="flex justify-between items-start border-b-4 border-[#1A202C] pb-6 mb-8">
            <div className="flex items-center gap-4">
              <img src="/logo.png" className="size-12 object-contain" />
              <div>
                <h2 className="text-xl font-black uppercase text-[#1A202C] leading-none mb-1">BitaFly Manager</h2>
                <p className="text-[9px] font-bold text-[#ec5b13] uppercase tracking-widest text-left">Aviation Reporting System</p>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-slate-400">
              <p>REF: {reportType.toUpperCase()}</p>
              <p>USER: {userProfile.full_name}</p>
            </div>
          </div>

          <div className="flex-1 space-y-4">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-xs font-bold">
               VISTA PREVIA: Se han detectado {previewData.length} registros recientes en este rango.
            </div>
            <div className="border border-slate-200 rounded-lg overflow-hidden h-96 flex flex-col items-center justify-center text-slate-300 italic text-sm">
               {previewData.length > 0 ? 'Data lista para exportación' : 'Sin datos para mostrar'}
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-100 text-[8px] text-slate-400 font-bold uppercase text-center">
            Este documento es una representación digital generada por BitaFly UAS.
          </div>
        </div>
      </main>
    </div>
  );
}

function FormatBtn({ id, icon, label, active, onClick, disabled }) {
  return (
    <button disabled={disabled} onClick={() => onClick(id)} className={`relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${disabled ? 'opacity-20 border-slate-800' : active ? 'bg-[#ec5b13] border-[#ec5b13] text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700'}`}>
      <span className="material-symbols-outlined text-lg mb-1">{icon}</span>
      <span className="text-[9px] font-black">{label}</span>
      {disabled && <span className="material-symbols-outlined text-[10px] absolute top-1 right-1 text-orange-500">lock</span>}
    </button>
  );
}