'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const response = await fetch(`/api/dashboard?userId=${user.id}`);
      const result = await response.json();
      if (!result.error) setData(result);
      setLoading(false);
    }
    loadDashboard();
  }, []);

  if (loading) return <div className="p-20 text-center font-black text-slate-300">SINCRONIZANDO...</div>;

  return (
    <div className="p-8 space-y-8 text-left">
      <h2 className="text-3xl font-black text-slate-900 uppercase">Centro de Mando</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200">
           <p className="text-[10px] font-black text-slate-400 uppercase">Horas Reales</p>
           <p className="text-3xl font-black text-slate-900">{data?.stats?.hours}h</p>
        </div>
        {/* Repetir para los otros KPIs */}
      </div>
    </div>
  );
}