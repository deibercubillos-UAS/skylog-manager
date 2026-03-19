'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import MaintenanceDroneCard from '@/components/MaintenanceDroneCard';
import AddMaintenancePanel from '@/components/AddMaintenancePanel';

export default function MaintenancePage() {
  const [data, setData] = useState({ drones: [], logs: [], kpis: {} });
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/maintenance?userId=${session.user.id}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const result = await res.json();
      if (!result.error) setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-300 uppercase">Sincronizando Salud de Flota...</div>;

  return (
    <div className="space-y-10 text-left animate-in fade-in duration-500 relative">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Flota</h2>
          <p className="text-slate-500 text-sm font-medium">Control preventivo y correctivo de aeronaves.</p>
        </div>
        <button onClick={() => setShowPanel(true)} className="bg-[#ec5b13] text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2">
           <span className="material-symbols-outlined text-sm">add_circle</span> Nuevo Registro
        </button>
      </header>

      {/* KPIs dinámicos del Backend */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPICard title="Alertas Críticas" value={data.kpis.critical} icon="error_outline" color="text-red-500" />
        <KPICard title="Horas Totales" value={`${data.kpis.totalHours}h`} icon="timer" color="text-emerald-500" />
        <KPICard title="Tareas Pendientes" value={data.kpis.pendingTasks} icon="assignment" color="text-[#ec5b13]" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {data.drones.map(d => (
          <MaintenanceDroneCard key={d.id} drone={d} />
        ))}
      </div>

      {/* Historial Técnico */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-8 border-b border-slate-50 bg-slate-50/30">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Historial de Intervenciones</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                <th className="px-8 py-4">Fecha</th>
                <th className="px-8 py-4">Drone</th>
                <th className="px-8 py-4">Tipo</th>
                <th className="px-8 py-4">Técnico</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5 text-xs font-bold text-slate-600">{log.maintenance_date}</td>
                  <td className="px-8 py-5 text-sm font-black text-slate-800">{log.aircraft?.model}</td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${log.maintenance_type === 'REPAIR' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>{log.maintenance_type}</span>
                  </td>
                  <td className="px-8 py-5 text-xs text-slate-500 font-bold uppercase">{log.technician}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showPanel && <AddMaintenancePanel onClose={() => setShowPanel(false)} onSuccess={() => { setShowPanel(false); fetchData(); }} />}
    </div>
  );
}

function KPICard({ title, value, icon, color }) {
  return (
    <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col justify-between">
      <div className="flex justify-between items-start mb-4">
        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{title}</span>
        <span className={`material-symbols-outlined ${color}`}>{icon}</span>
      </div>
      <span className="text-4xl font-black text-slate-900 tracking-tighter">{value}</span>
    </div>
  );
}