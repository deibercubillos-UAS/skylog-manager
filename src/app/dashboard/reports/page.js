'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function ReportsPage() {
  const [loading, setLoading] = useState(false);
  const [pilots, setPilots] = useState([]);
  const [aircrafts, setAircrafts] = useState([]);
  
  // Estados de configuración del reporte
  const [reportConfig, setReportConfig] = useState({
    type: 'Bitácora de Vuelo Mensual (RAC 100)',
    dateFrom: '2023-10-01',
    dateTo: '2023-10-31',
    pilotId: 'all',
    aircraftId: 'all',
    includeSignature: true,
    includeLogo: true
  });

  useEffect(() => {
    async function loadFilters() {
      const { data: p } = await supabase.from('pilots').select('id, name');
      const { data: a } = await supabase.from('aircraft').select('id, model, serial_number');
      setPilots(p || []);
      setAircrafts(a || []);
    }
    loadFilters();
  }, []);

  return (
    <div className="flex h-screen -m-8 overflow-hidden bg-slate-200 dark:bg-slate-950">
      
      {/* SIDEBAR DE CONFIGURACIÓN (25%) */}
      <aside className="w-1/4 min-w-[320px] bg-[#1A202C] text-white flex flex-col border-r border-slate-700 overflow-y-auto custom-scrollbar">
        <div className="p-6 border-b border-slate-700 text-left">
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-[#ec5b13] rounded-lg p-2 flex items-center justify-center">
              <span className="material-symbols-outlined text-white">analytics</span>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Report Generator</h1>
              <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest">Configuración Técnica</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-8 flex-1 text-left">
          {/* Paso 1 */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
              <span className="text-[#ec5b13]">01.</span> Tipo de Reporte
            </label>
            <select 
              className="w-full bg-slate-800 border-slate-700 rounded-xl text-sm py-3 px-4 outline-none focus:ring-2 focus:ring-[#ec5b13]/50"
              value={reportConfig.type}
              onChange={(e) => setReportConfig({...reportConfig, type: e.target.value})}
            >
              <option>Bitácora de Vuelo Mensual (RAC 100)</option>
              <option>Historial Técnico de Aeronave</option>
              <option>Resumen de Horas de Piloto</option>
            </select>
          </div>

          {/* Paso 2 */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
              <span className="text-[#ec5b13]">02.</span> Rango de Fechas
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" className="bg-slate-800 border-slate-700 rounded-lg text-xs p-2 outline-none" value={reportConfig.dateFrom} />
              <input type="date" className="bg-slate-800 border-slate-700 rounded-lg text-xs p-2 outline-none" value={reportConfig.dateTo} />
            </div>
          </div>

          {/* Paso 3 */}
          <div className="space-y-4">
            <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
              <span className="text-[#ec5b13]">03.</span> Filtros Específicos
            </label>
            <div className="space-y-3">
              <select className="w-full bg-slate-800 border-slate-700 rounded-lg text-xs py-2.5 px-3 outline-none">
                <option value="all">Todos los Pilotos</option>
                {pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select className="w-full bg-slate-800 border-slate-700 rounded-lg text-xs py-2.5 px-3 outline-none">
                <option value="all">Todas las Aeronaves</option>
                {aircrafts.map(a => <option key={a.id} value={a.id}>{a.model} ({a.serial_number})</option>)}
              </select>
            </div>
          </div>

          {/* Opciones Adicionales */}
          <div className="space-y-4 pt-2">
            <Toggle label="Incluir Firma Digital" checked={reportConfig.includeSignature} />
            <Toggle label="Logo Corporativo" checked={reportConfig.includeLogo} />
          </div>
        </div>

        {/* Acciones Finales */}
        <div className="p-6 bg-slate-900/50 space-y-4">
          <button className="w-full bg-[#ec5b13] hover:bg-[#e04f0d] text-white font-black py-4 rounded-xl shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 text-sm uppercase tracking-widest">
            <span className="material-symbols-outlined">picture_as_pdf</span>
            Descargar PDF
          </button>
        </div>
      </aside>

      {/* ÁREA DE VISTA PREVIA (75%) */}
      <main className="flex-1 overflow-y-auto flex flex-col items-center custom-scrollbar">
        {/* Toolbar de Preview */}
        <div className="w-full bg-white border-b border-slate-300 px-8 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div className="flex gap-4 text-slate-400">
            <span className="material-symbols-outlined cursor-pointer hover:text-[#ec5b13]">zoom_in</span>
            <span className="material-symbols-outlined cursor-pointer hover:text-[#ec5b13]">zoom_out</span>
            <span className="material-symbols-outlined cursor-pointer hover:text-[#ec5b13]">print</span>
          </div>
          <div className="text-sm font-bold text-slate-500 uppercase tracking-tighter">
            Vista Previa de Impresión (A4)
          </div>
          <div className="text-xs font-bold text-slate-400">Página 1 de 1</div>
        </div>

        {/* HOJA VIRTUAL */}
        <div className="p-12 w-full max-w-[850px]">
          <div className="bg-white text-slate-900 aspect-[1/1.414] shadow-2xl rounded-sm p-12 flex flex-col border border-slate-300 text-left">
            
            {/* Header Documento */}
            <div className="flex justify-between items-start border-b-2 border-slate-800 pb-8 mb-8">
              <div className="flex items-center gap-4">
                <div className="size-16 bg-[#1A202C] rounded-lg flex items-center justify-center text-white">
                  <span className="material-symbols-outlined text-4xl">flight_takeoff</span>
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight uppercase leading-tight">SkyLog Manager</h2>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Operaciones Aéreas No Tripuladas</p>
                </div>
              </div>
              <div className="text-right">
                <h3 className="text-lg font-black uppercase text-[#1A202C]">Reporte Oficial de Vuelo</h3>
                <p className="text-[10px] font-bold text-slate-500">REF: {new Date().getFullYear()}-LOG-{Math.floor(Math.random() * 1000)}</p>
                <p className="text-[10px] font-bold text-slate-500">Generado: {new Date().toLocaleDateString()}</p>
              </div>
            </div>

            {/* Datos Operador */}
            <div className="grid grid-cols-2 gap-8 mb-10">
              <div className="bg-slate-50 p-4 rounded border border-slate-200">
                <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Operador / Compañía</span>
                <p className="font-bold text-sm">Nombre del Usuario Registrado</p>
                <p className="text-xs text-slate-500 italic">Operador Certificado RAC 100</p>
              </div>
              <div className="bg-slate-50 p-4 rounded border border-slate-200">
                <span className="text-[9px] font-black uppercase text-slate-400 block mb-1">Periodo del Reporte</span>
                <p className="text-xs font-bold">{reportConfig.dateFrom} AL {reportConfig.dateTo}</p>
                <p className="text-xs text-slate-500 font-medium">Estado: Certificado Digitalmente</p>
              </div>
            </div>

            {/* Tabla de Datos */}
            <div className="flex-1 overflow-hidden border border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#1A202C] text-white text-[9px] font-black uppercase tracking-widest">
                    <th className="p-3 border-r border-slate-700">Fecha</th>
                    <th className="p-3 border-r border-slate-700">Aeronave (S/N)</th>
                    <th className="p-3 border-r border-slate-700">Piloto</th>
                    <th className="p-3 border-r border-slate-700">Tipo Misión</th>
                    <th className="p-3 text-center">Duración</th>
                  </tr>
                </thead>
                <tbody className="text-[10px] divide-y divide-slate-200">
                  <tr className="bg-slate-50 font-medium">
                    <td className="p-3">04/10/2023</td>
                    <td className="p-3 font-bold uppercase">M300 RTK (HK-202X)</td>
                    <td className="p-3">Cap. Juan Pérez</td>
                    <td className="p-3">Inspección de Infraestructura</td>
                    <td className="p-3 text-center font-bold">01:45:00</td>
                  </tr>
                  {/* Se pueden mapear aquí los vuelos reales de Supabase en el futuro */}
                </tbody>
              </table>
              <div className="p-10 text-center text-slate-300 text-xs italic">
                -- Fin de los registros correspondientes al periodo seleccionado --
              </div>
            </div>

            {/* Firma y Resumen */}
            <div className="mt-12 pt-8 border-t-2 border-slate-100 flex justify-between items-end">
              <div className="w-1/3">
                <span className="text-[9px] font-black text-slate-400 uppercase block mb-2">Resumen Operativo</span>
                <div className="bg-[#1A202C] text-white p-4 rounded">
                  <p className="text-[10px] opacity-60 font-bold uppercase">Horas Totales</p>
                  <p className="text-xl font-black font-mono">01:45:00</p>
                </div>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-48 border-b border-slate-400 h-16 flex items-end justify-center mb-2">
                  <span className="text-[10px] text-slate-300 italic">Firma Digital SkyLog</span>
                </div>
                <p className="text-[10px] font-black uppercase text-slate-800">Responsable de Operaciones</p>
                <p className="text-[9px] text-slate-500">ID Aeronáutico Registrado</p>
              </div>
            </div>

            <div className="mt-8 flex justify-between text-[8px] text-slate-400 font-bold uppercase tracking-widest">
              <p>Este reporte es una representación oficial de SkyLog Manager UAS</p>
              <p>v2.4.1 - Certified System</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Componentes Auxiliares
function Toggle({ label, checked }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] font-bold text-slate-300 uppercase tracking-tight">{label}</span>
      <div className={`w-9 h-5 rounded-full relative transition-colors ${checked ? 'bg-[#ec5b13]' : 'bg-slate-700'}`}>
        <div className={`absolute top-1 size-3 bg-white rounded-full transition-all ${checked ? 'right-1' : 'left-1'}`}></div>
      </div>
    </div>
  );
}