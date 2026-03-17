'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState({ role: 'piloto', subscription_plan: 'piloto' });
  const [reportType, setReportType] = useState('pilotos'); // pilotos, aeronaves, sms
  const [exportFormat, setExportFormat] = useState('pdf');
  
  // Datos para filtros
  const [listData, setListData] = useState({ pilots: [], aircrafts: [] });
  const [config, setConfig] = useState({
    dateFrom: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    dateTo: new Date().toISOString().split('T')[0],
    targetId: 'all'
  });

  useEffect(() => {
    async function loadInitialData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Obtener Perfil (Rol y Plan)
      const { data: profile } = await supabase.from('profiles').select('role, subscription_plan').eq('id', user.id).single();
      if (profile) setUserProfile(profile);

      // 2. Cargar listas para filtros
      const { data: p } = await supabase.from('pilots').select('id, name').eq('owner_id', user.id);
      const { data: a } = await supabase.from('aircraft').select('id, model').eq('owner_id', user.id);
      setListData({ pilots: p || [], aircrafts: a || [] });

      // Ajustar tipo de reporte inicial si el Jefe de Pilotos no tiene acceso a SMS
      if (profile?.role === 'jefe_pilotos') setReportType('pilotos');
      
      setLoading(false);
    }
    loadInitialData();
  }, []);

  // --- LÓGICA DE PERMISOS ---
  const isSmsManager = userProfile.role === 'gerente_sms' || userProfile.role === 'admin';
  const isJefePilotos = userProfile.role === 'jefe_pilotos';
  const isProPlan = userProfile.subscription_plan !== 'piloto'; // Escuadrilla, Flota o Enterprise

  // Opciones de reporte permitidas según Rol
  const reportOptions = [
    { id: 'pilotos', name: 'Reporte de Pilotos', icon: 'person', allowed: true },
    { id: 'aeronaves', name: 'Reporte de Aeronaves', icon: 'precision_manufacturing', allowed: true },
    { id: 'sms', name: 'Reporte de Seguridad (SMS)', icon: 'report_problem', allowed: isSmsManager }
  ];

  if (loading) return <div className="p-10 animate-pulse font-black text-slate-400">CONFIGURANDO ACCESOS...</div>;

  return (
    <div className="flex h-screen -m-8 overflow-hidden bg-slate-100">
      
      {/* PANEL DE CONFIGURACIÓN (IZQUIERDA) */}
      <aside className="w-1/4 min-w-[320px] bg-[#1A202C] text-white flex flex-col border-r border-slate-700 p-6 text-left">
        <h1 className="text-xl font-black text-[#ec5b13] mb-1">GENERADOR</h1>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-8">Centro de Cumplimiento</p>

        <div className="space-y-8 flex-1">
          {/* 01. SELECCIÓN DE REPORTE */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase">01. Seleccione Categoría</label>
            <div className="space-y-2">
              {reportOptions.map(opt => opt.allowed && (
                <button 
                  key={opt.id}
                  onClick={() => setReportType(opt.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                    reportType === opt.id ? 'bg-[#ec5b13] border-[#ec5b13] shadow-lg' : 'border-slate-700 hover:bg-slate-800 text-slate-400'
                  }`}
                >
                  <span className="material-symbols-outlined text-xl">{opt.icon}</span>
                  <span className="text-sm font-bold">{opt.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 02. FILTROS DE TIEMPO */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase">02. Periodo</label>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" className="bg-slate-800 p-2 rounded-lg text-xs outline-none" value={config.dateFrom} onChange={e => setConfig({...config, dateFrom: e.target.value})}/>
              <input type="date" className="bg-slate-800 p-2 rounded-lg text-xs outline-none" value={config.dateTo} onChange={e => setConfig({...config, dateTo: e.target.value})}/>
            </div>
          </div>

          {/* 03. FORMATO DE EXPORTACIÓN (Basado en Plan) */}
          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase">03. Formato de Salida</label>
            <div className="grid grid-cols-3 gap-2">
              <FormatBtn id="pdf" icon="picture_as_pdf" label="PDF" active={exportFormat === 'pdf'} onClick={setExportFormat} />
              <FormatBtn id="excel" icon="table_view" label="XLS" active={exportFormat === 'excel'} onClick={setExportFormat} disabled={!isProPlan} />
              <FormatBtn id="csv" icon="csv" label="CSV" active={exportFormat === 'csv'} onClick={setExportFormat} disabled={!isProPlan} />
            </div>
            {!isProPlan && (
              <p className="text-[9px] text-orange-400 font-bold uppercase leading-tight mt-2 italic">
                * XLS/CSV disponibles en Plan Escuadrilla o superior.
              </p>
            )}
          </div>
        </div>

        <button className="mt-8 w-full bg-[#ec5b13] py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">
          Generar y Descargar
        </button>
      </aside>

      {/* VISTA PREVIA (DERECHA) */}
      <main className="flex-1 overflow-y-auto p-12 flex flex-col items-center custom-scrollbar">
        <div className="bg-white text-slate-900 w-full max-w-[800px] aspect-[1/1.414] shadow-2xl p-12 flex flex-col text-left border border-slate-300">
          <div className="flex justify-between items-start border-b-4 border-[#1A202C] pb-6 mb-8">
            <div>
              <h2 className="text-2xl font-black uppercase text-[#1A202C]">SkyLog Manager</h2>
              <p className="text-[10px] font-bold text-[#ec5b13] uppercase tracking-widest">Reporte de {reportType}</p>
            </div>
            <div className="text-right text-[10px] font-bold text-slate-400">
              <p>ID: REP-{reportType.toUpperCase()}-001</p>
              <p>FECHA: {new Date().toLocaleDateString()}</p>
            </div>
          </div>

          {/* Contenido Simulado del Reporte */}
          <div className="flex-1 space-y-6">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Resumen de Parámetros</p>
              <div className="grid grid-cols-2 gap-4 text-xs font-bold">
                <p>Periodo: <span className="text-slate-500">{config.dateFrom} / {config.dateTo}</span></p>
                <p>Generado por: <span className="text-slate-500">{userProfile.role.replace('_', ' ').toUpperCase()}</span></p>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
               <div className="bg-slate-900 text-white p-2 text-[9px] font-black uppercase text-center tracking-widest">Previsualización de Datos</div>
               <div className="h-64 flex items-center justify-center text-slate-300 italic text-sm">
                  Cargando registros del periodo...
               </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-slate-100 flex justify-between items-end">
            <div className="text-center w-48 border-t border-slate-300 pt-2">
               <p className="text-[9px] font-black uppercase">Responsable Operativo</p>
            </div>
            <div className="text-[8px] text-slate-400 font-bold uppercase">Representación digital oficial - SkyLog v2.4</div>
          </div>
        </div>
      </main>
    </div>
  );
}

function FormatBtn({ id, icon, label, active, onClick, disabled }) {
  return (
    <button 
      disabled={disabled}
      onClick={() => onClick(id)}
      className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
        disabled ? 'opacity-20 cursor-not-allowed border-slate-800' :
        active ? 'bg-[#ec5b13] border-[#ec5b13] text-white' : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700'
      }`}
    >
      <span className="material-symbols-outlined text-lg mb-1">{icon}</span>
      <span className="text-[9px] font-black">{label}</span>
      {disabled && <span className="material-symbols-outlined text-[10px] absolute top-1 right-1">lock</span>}
    </button>
  );
}