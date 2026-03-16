'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import MaintenanceDroneCard from '@/components/MaintenanceDroneCard';

export default function MaintenancePage() {
  const [drones, setDrones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMaintenanceData() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase
        .from('aircraft')
        .select('*')
        .eq('owner_id', user.id);
      
      setDrones(data || []);
      setLoading(false);
    }
    fetchMaintenanceData();
  }, []);

  // Calculamos KPIs rápidos
  const criticalCount = drones.filter(d => (d.total_hours % 200) > 180).length;
  const totalFleetHours = drones.reduce((acc, d) => acc + (d.total_hours || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      
      {/* Header con acciones */}
      <div className="flex justify-between items-end">
        <div className="text-left">
          <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Fleet Health</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Monitoreo predictivo de componentes y ciclos de vida.</p>
        </div>
        <button className="bg-[#ec5b13] hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-orange-500/20 transition-all">
          <span className="material-symbols-outlined">add_circle</span>
          REGISTRAR MANTENIMIENTO
        </button>
      </div>

      {/* KPIs de Mantenimiento */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPIMiniCard title="Aeronaves en Alerta" value={criticalCount} icon="error" color="text-red-500" />
        <KPIMiniCard title="Tareas Pendientes" value="12" icon="assignment" color="text-blue-500" />
        <KPIMiniCard title="Horas Totales Flota" value={`${totalFleetHours.toFixed(1)}h`} icon="timer" color="text-green-500" />
      </div>

      {/* Grid de Aeronaves */}
      <div className="space-y-4">
        <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2 uppercase tracking-tight">
          <span className="material-symbols-outlined text-[#ec5b13]">monitor_heart</span>
          Estado Técnico de Células
        </h3>
        
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
            {[1,2,3].map(i => <div key={i} className="h-64 bg-slate-200 rounded-2xl"></div>)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {drones.map(d => (
              <MaintenanceDroneCard key={d.id} drone={d} />
            ))}
          </div>
        )}
      </div>

      {/* Log de Mantenimiento (Mockup visual para completar el diseño) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-black text-xs uppercase tracking-widest text-slate-500 flex items-center gap-2 text-left">
            <span className="material-symbols-outlined text-sm">history</span>
            Log de Intervenciones Recientes
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-black uppercase text-slate-400 tracking-tighter">
              <tr>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Aeronave</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Técnico</th>
                <th className="px-6 py-4 text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              <LogTableRow date="24/05/2024" model="DJI Matrice 300" type="ROUTINE" tech="Ing. Roberto G." status="Completado" />
              <LogTableRow date="23/05/2024" model="Autel Evo II" type="UPDATE" tech="Sistema (Auto)" status="Exitoso" />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KPIMiniCard({ title, value, icon, color }) {
  return (
    <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm text-left">
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{title}</span>
        <span className={`material-symbols-outlined ${color}`}>{icon}</span>
      </div>
      <span className="text-3xl font-black font-mono text-slate-900 dark:text-white">{value}</span>
    </div>
  );
}

function LogTableRow({ date, model, type, tech, status }) {
  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-6 py-4 font-mono font-bold text-xs">{date}</td>
      <td className="px-6 py-4 font-bold">{model}</td>
      <td className="px-6 py-4">
        <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-blue-100 text-blue-600 uppercase">{type}</span>
      </td>
      <td className="px-6 py-4 text-slate-500 font-medium">{tech}</td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-2 text-[10px] font-bold uppercase text-green-600">
          <span className="size-1.5 rounded-full bg-green-500"></span> {status}
        </div>
      </td>
    </tr>
  );
}