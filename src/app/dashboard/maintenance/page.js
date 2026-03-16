'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import MaintenanceDroneCard from '@/components/MaintenanceDroneCard';
import AddMaintenancePanel from '@/components/AddMaintenancePanel'; // Importamos el nuevo panel

export default function MaintenancePage() {
  const [drones, setDrones] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false); // Estado para el panel

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    // Cargar Drones
    const { data: dronesData } = await supabase.from('aircraft').select('*').eq('owner_id', user.id);
    setDrones(dronesData || []);

    // Cargar Logs de Mantenimiento Reales
    const { data: logsData } = await supabase
      .from('maintenance_logs')
      .select('*, aircraft(model)')
      .eq('owner_id', user.id)
      .order('maintenance_date', { ascending: false });
    setLogs(logsData || []);

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 relative">
      <div className="flex justify-between items-end">
        <div className="text-left">
          <h2 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Fleet Health</h2>
          <p className="text-slate-500 mt-1">Monitoreo predictivo de componentes.</p>
        </div>
        {/* ACTIVAMOS EL BOTÓN AQUÍ */}
        <button 
          onClick={() => setShowPanel(true)}
          className="bg-[#ec5b13] hover:bg-orange-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all"
        >
          <span className="material-symbols-outlined">add_circle</span>
          REGISTRAR MANTENIMIENTO
        </button>
      </div>

      {/* ... (Tus KPIs y Grid de Cards se mantienen igual) ... */}

      {/* Tabla con datos reales de la base de datos */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-6 border-b bg-slate-50/50">
          <h3 className="font-black text-xs uppercase tracking-widest text-slate-500 text-left">Historial Técnico Real</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 tracking-tighter">
              <tr>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Aeronave</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Técnico</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-xs">{log.maintenance_date}</td>
                  <td className="px-6 py-4 font-bold">{log.aircraft?.model}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                      log.maintenance_type === 'REPAIR' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                    }`}>{log.maintenance_type}</span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 font-medium">{log.technician}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="material-symbols-outlined text-slate-300 hover:text-[#ec5b13]">info</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* PANEL LATERAL CONDICIONAL */}
      {showPanel && (
        <AddMaintenancePanel 
          onClose={() => setShowPanel(false)} 
          onSuccess={() => { setShowPanel(false); fetchData(); }} 
        />
      )}
    </div>
  );
}