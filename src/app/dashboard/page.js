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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: aircraftData } = await supabase
        .from('aircraft')
        .select('total_hours, status')
        .eq('owner_id', user.id);

      const totalH = aircraftData?.reduce((acc, drone) => acc + (drone.total_hours || 0), 0) || 0;
      const totalDrones = aircraftData?.length || 0;
      const operativos = aircraftData?.filter(d => d.status === 'Operativo').length || 0;

      const { count: pilotsCount } = await supabase
        .from('pilots')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id);

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

  if (stats.loading) return <div className="p-8 font-bold animate-pulse text-slate-400 text-left">Sincronizando...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard title="Total Horas" value={`${stats.totalHours}h`} trend="Acumulado" />
        <KPICard title="Disponibilidad" value={stats.fleetOperativa} subtitle="Operativos" />
        <KPICard title="Pilotos" value={stats.pilotosContador} subtitle="Activos" />
        <KPICard title="Alertas Médicas" value={stats.vencimientosMedicos} warning={stats.vencimientosMedicos > 0} />
      </div>
    </div>
  );
}

function KPICard({ title, value, trend, subtitle, warning }) {
  return (
    <div className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-left ${warning ? 'border-orange-500 bg-orange-50' : ''}`}>
      <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-1">{title}</p>
      <div className="flex items-baseline justify-between">
        <span className={`text-3xl font-black ${warning ? 'text-orange-600' : 'text-slate-900'}`}>{value}</span>
        {trend && <span className="text-emerald-500 text-xs font-bold uppercase">{trend}</span>}
        {subtitle && <span className="text-slate-400 text-xs font-medium">{subtitle}</span>}
      </div>
    </div>
  );
}