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
      const { data: aircraftData } = await supabase.from('aircraft').select('total_hours, status').eq('owner_id', user.id);
      const totalH = aircraftData?.reduce((acc, drone) => acc + (drone.total_hours || 0), 0) || 0;
      setStats({
        totalHours: totalH.toFixed(1),
        fleetOperativa: "0/0",
        pilotosContador: 0,
        vencimientosMedicos: 0,
        loading: false
      });
    }
    fetchStats();
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Dashboard operativo</h1>
      <p>Total Horas: {stats.totalHours}h</p>
    </div>
  );
}