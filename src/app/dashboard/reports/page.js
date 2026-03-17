'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { downloadPDF, downloadExcel, downloadCSV } from '@/lib/reportGenerators';

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [userProfile, setUserProfile] = useState({ role: 'piloto', subscription_plan: 'piloto' });
  const [reportType, setReportType] = useState('pilotos'); // pilotos, aeronaves, sms
  const [exportFormat, setExportFormat] = useState('pdf');
  
  // Datos para filtros
  const [listData, setListData] = useState({ pilots: [], aircrafts: [] });
  const [config, setConfig] = useState({
    dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
  });

  // 1. CARGAR PERFIL Y LISTAS
  useEffect(() => {
    async function loadInitialData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from('profiles').select('role, subscription_plan').eq('id', user.id).single();
      if (profile) setUserProfile(profile);

      const { data: p } = await supabase.from('pilots').select('id, name').eq('owner_id', user.id);
      const { data: a } = await supabase.from('aircraft').select('id, model').eq('owner_id', user.id);
      setListData({ pilots: p || [], aircrafts: a || [] });

      if (profile?.role === 'jefe_pilotos') setReportType('pilotos');
      setLoading(false);
    }
    loadInitialData();
  }, []);

  // --- LÓGICA DE PERMISOS ---
  const isSmsManager = userProfile.role === 'gerente_sms' || userProfile.role === 'admin';
  const isProPlan = userProfile.subscription_plan !== 'piloto';

  const reportOptions = [
    { id: 'pilotos', name: 'Reporte de Pilotos', icon: 'person', allowed: true },
    { id: 'aeronaves', name: 'Reporte de Aeronaves', icon: 'precision_manufacturing', allowed: true },
    { id: 'sms', name: 'Reporte de Seguridad (SMS)', icon: 'report_problem', allowed: isSmsManager }
  ];

  // 2. LÓGICA DE GENERACIÓN Y DESCARGA REAL
  const handleGenerateDownload = async () => {
    setDownloading(true);
    const { data: { user } } = await supabase.auth.getUser();

    let table = '';
    if (reportType === 'pilotos') table = 'pilots';
    else if (reportType === 'aeronaves') table = 'aircraft';
    else if (reportType === 'sms') table = 'sms_reports';

    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('owner_id', user.id)
      .gte('created_at', config.dateFrom)
      .lte('created_at', config.dateTo);

    if (error || !data || data.length === 0) {
      alert("No se encontraron registros en el periodo seleccionado.");
      setDownloading(false);
      return;
    }

    // Limpiar campos internos para el reporte
    const cleanData = data.map(({ id, owner_id, created_at, ...rest }) => rest);

    // Disparar generador según formato
    try {
      if (exportFormat === 'pdf') {
        downloadPDF(reportType, cleanData, config);
      } else if (exportFormat === 'excel') {
        downloadExcel(reportType, cleanData);
      } else if (exportFormat === 'csv') {
        downloadCSV(reportType, cleanData);
      }
    } catch (err) {
      alert("Error al generar el archivo: " + err.message);
    }

    setDownloading(false);
  };

  if (loading) return <div className="p-10 animate-pulse font-black text-slate-400 text-left">ESTABLECIENDO CONEXIÓN SEGURA...</div>;

  return (
    <div className="flex h-screen -m-8 overflow-hidden bg-slate-100">
      
      {/* PANEL DE CONFIGURACIÓN (IZQUIERDA) */}
      <aside className="w-1/4 min-w-[320px] bg-[#1A202C] text-white flex flex-col border-r border-slate-700 p-6 text-left shadow-2xl">
        <h1 className="text-xl font-black text-[#ec5b13] mb-1">GENERADOR</h1>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-8">Centro de Cumplimiento</p>

        <div className="space-y-8 flex-1">
          {/* 01. TIPO DE REPORTE */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">01. Seleccione Categoría</label>
            <div className="space-y-2">
              {reportOptions.map(opt => opt.allowed && (
                <button 
                  key={opt.id}
                  onClick={() => setReportType(opt.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                    reportType === opt.id ? 'bg-[#ec5b13] border-[#ec5b13] shadow-lg shadow-orange-500/20' : 'border-slate-700 hover:bg-slate-800 text-slate-400'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">{opt.icon}</span>
                  <span className="text-sm font-bold uppercase tracking-tight">{opt.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 02. RANGO DE FECHAS */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">02. Periodo de Auditoría</label>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" className="bg-slate-800 border-none p-2 rounded-lg text-[10px] outline-none font-bold" value={config.dateFrom} onChange={e => setConfig({...config, dateFrom: e.target.value})}/>
              <input type="date" className="bg-slate-800 border-none p-2 rounded-lg text-[10px] outline-none font-bold" value={config.dateTo} onChange={e => setConfig({...config, dateTo: e.target.value})}/>
            </div>
          </div>

          {/* 03. FORMATO SEGÚN PLAN */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">03. Formato de Salida</label>
            <div className="grid grid-cols-3 gap-2">
              <FormatBtn id="pdf" icon="picture_as_pdf" label="PDF" active={exportFormat === 'pdf'} onClick={setExportFormat} />
              <FormatBtn id="excel" icon="table_view" label="XLS" active={exportFormat === 'excel'} onClick={setExportFormat} disabled={!isProPlan} />
              <FormatBtn id="csv" icon="csv" label="CSV" active={exportFormat === 'csv'} onClick={setExportFormat} disabled={!isProPlan} />
            </div>
            {!isProPlan && (
              <p className="text-[9px] text-orange-400 font-bold uppercase leading-tight mt-3 bg-orange-500/10 p-2 rounded-lg border border-orange-500/20">
                * Formatos XLS/CSV exclusivos para Plan Escuadrilla o Superior.
              </p>
            )}
          </div>
        </div>

        {/* BOTÓN DESCARGA REAL */}
        <button 
          onClick={handleGenerateDownload}
          disabled={downloading}
          className="mt-8 w-full bg-[#ec5b13] hover:bg-orange-600 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all flex justify-center items-center gap-2"
        >
          {downloading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Procesando...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-sm">cloud_download</span>
              Descargar Reporte
            </>
          )}
        </button>
      </aside>

      {/* VISTA PREVIA (DERECHA) */}
      <main className="flex-1 overflow-y-auto p-12 flex flex-col items-center custom-scrollbar">
        <div className="bg-white text-slate-900 w-full max-w-[800px] aspect-[1.414] shadow-2xl p-12 flex flex-col text-left border border-slate-300">
          <div className="flex justify-between items-start border-b-4 border-[#1A202C] pb-6 mb-8">
            <div className="flex items-center gap-4">
              <div className="size-12 bg-[#1A202C] rounded-lg flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-3xl">flight_takeoff</span>
              </div>
              <div>
                <h2 className="text-xl font-black uppercase text-[#1A202C] leading-none mb-1">SkyLog Manager</h2>
                <p className="text-[9px] font-bold text-[#ec5b13] uppercase tracking-widest">Reporte Oficial de {reportType}</p>
              </div>
            </div>
            <div className="text-right text-[10px] font-bold text-slate-400">
              <p>REF: SKL-{reportType.toUpperCase()}</p>
              <p>EMISIÓN: {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-center items-center text-slate-300 border-2 border-dashed border-slate-100 rounded-2xl p-10">
            <span className="material-symbols-outlined text-6xl mb-4">description</span>
            <p className="font-black uppercase text-xs tracking-widest mb-2">Previsualización del Documento</p>
            <p className="text-[10px] font-medium max-w-xs text-center">Selecciona el periodo y formato a la izquierda para generar la descarga oficial con datos reales.</p>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-100 flex justify-between items-end">
            <div>
              <p className="text-[10px] font-black uppercase text-[#1A202C]">Firma Digital Autorizada</p>
              <p className="text-[8px] text-slate-400 uppercase tracking-widest mt-1">ID Operador: {userProfile.role.replace('_', ' ')}</p>
            </div>
            <div className="text-[8px] text-slate-400 font-bold uppercase">SkyLog v2.4 - Aviation Software</div>
          </div>
        </div>
      </main>
    </div>
  );
}

// COMPONENTE AUXILIAR BOTÓN FORMATO
function FormatBtn({ id, icon, label, active, onClick, disabled }) {
  return (
    <button 
      disabled={disabled}
      onClick={() => onClick(id)}
      className={`relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
        disabled ? 'opacity-20 cursor-not-allowed border-slate-800' :
        active ? 'bg-[#ec5b13] border-[#ec5b13] text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700'
      }`}
    >
      <span className="material-symbols-outlined text-lg mb-1">{icon}</span>
      <span className="text-[9px] font-black tracking-tighter">{label}</span>
      {disabled && <span className="material-symbols-outlined text-[10px] absolute top-1 right-1 text-orange-400">lock</span>}
    </button>
  );
}