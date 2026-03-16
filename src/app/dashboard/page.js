export const dynamic = "force-dynamic";
'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalHours: 0,
    fleetOperativa: "0/0",
    pilotosContador: 0,
    vencimientosMedicos: 0,
    loading: true
  });

  useEffect(() => {
    async function fetchStats() {
      // 1. Obtener ID del usuario actual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 2. Total Horas (Suma de total_hours en la tabla aircraft)
      const { data: aircraftData } = await supabase
        .from('aircraft')
        .select('total_hours, status')
        .eq('owner_id', user.id);

      const totalH = aircraftData?.reduce((acc, drone) => acc + (drone.total_hours || 0), 0) || 0;
      
      // 3. Flota Operativa (Contar drones con status 'Operativo')
      const totalDrones = aircraftData?.length || 0;
      const operativos = aircraftData?.filter(d => d.status === 'Operativo').length || 0;

      // 4. Pilotos Certificados (Conteo en tabla pilots)
      const { count: pilotsCount } = await supabase
        .from('pilots')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id);

      // 5. Vencimientos Médicos (Pilotos cuyo medical_expiry sea menor a 30 días)
      const today = new Date();
      const nextMonth = new Date();
      nextMonth.setDate(today.getDate() + 30);

      const { count: expiringMedicals } = await supabase
        .from('pilots')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id)
        .lt('medical_expiry', nextMonth.toISOString());

      setStats({
        totalHours: totalH.toFixed(1),
        fleetOperativa: `${operativos}/${totalDrones}`,
        pilotosContador: pilotsCount || 0,
        vencimientosMedicos: expiringMedicals || 0,
        loading: false
      });
    }

    fetchStats();
  }, []);

  if (stats.loading) return <div className="p-8 font-bold animate-pulse text-slate-400 text-left">Sincronizando con la flota...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* KPI Cards Conectados */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Total Horas de Vuelo" 
          value={`${stats.totalHours}h`} 
          trend="Acumulado" 
          color="emerald" 
        />
        <KPICard 
          title="Disponibilidad Flota" 
          value={stats.fleetOperativa} 
          subtitle="Drones Operativos" 
        />
        <KPICard 
          title="Pilotos en Comando" 
          value={stats.pilotosContador} 
          subtitle="Personal Activo" 
        />
        <KPICard 
          title="Alertas Médicas" 
          value={stats.vencimientosMedicos} 
          subtitle="Próximos 30 días"
          warning={stats.vencimientosMedicos > 0} 
        />
      </div>

      {/* El resto del Dashboard se mantiene igual por ahora */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-left">
        <h3 className="font-black text-xs uppercase tracking-widest text-slate-400 mb-4">Estado del Sistema</h3>
        <p className="text-sm text-slate-600">Base de datos Supabase conectada correctamente. Los KPIs muestran datos en tiempo real de tu flota.</p>
      </div>
    </div>
  );
}

// Componente Reutilizable KPICard
function KPICard({ title, value, trend, subtitle, warning }) {
  return (
    <div className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-left transition-all hover:shadow-md ${warning ? 'border-orange-500 bg-orange-50' : ''}`}>
      <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{title}</p>
      <div className="flex items-baseline justify-between">
        <span className={`text-3xl font-black ${warning ? 'text-orange-600' : 'text-slate-900'}`}>{value}</span>
        {trend && <span className="text-emerald-500 text-xs font-bold uppercase">{trend}</span>}
        {subtitle && <span className="text-slate-400 text-xs font-medium">{subtitle}</span>}
      </div>
      {warning && (
        <div className="flex items-center gap-1 mt-2 text-orange-600">
          <span className="material-symbols-outlined text-sm">warning</span>
          <span className="text-[10px] font-bold uppercase">Acción Requerida</span>
        </div>
      )}
    </div>
  );
}