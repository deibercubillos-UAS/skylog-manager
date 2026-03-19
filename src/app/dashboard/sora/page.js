'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function SoraAnalysisPage() {
  const [templates, setTemplates] = useState([]);
  const [checked, setChecked] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/sora?userId=${session.user.id}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const data = await res.json();
      setTemplates(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error cargando SORA:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Agrupar mitigaciones por categoría (Terrestre, Aérea, etc)
  const grouped = templates.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  // Cálculo de progreso de mitigación
  const totalItems = templates.length;
  const checkedItems = Object.values(checked).filter(v => v).length;
  const progress = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

  if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-300 uppercase tracking-widest">Calculando Matriz de Riesgos...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 text-left animate-in fade-in duration-500 pb-20">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">Evaluación SORA</h2>
          <p className="text-slate-500 text-sm mt-2 font-medium italic">Metodología de Evaluación de Riesgos Operacionales</p>
        </div>
        <Link href="/dashboard/safety-config" className="bg-[#1A202C] text-white px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2">
           <span className="material-symbols-outlined text-sm">settings</span> Configurar Barreras
        </Link>
      </header>

      {/* MONITOR DE MITIGACIÓN */}
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center gap-8">
        <div className="size-24 rounded-full border-8 border-slate-100 dark:border-slate-800 flex items-center justify-center relative shrink-0">
          <svg className="size-full -rotate-90 absolute">
            <circle cx="48" cy="48" r="40" fill="none" stroke="#ec5b13" strokeWidth="8" strokeDasharray="251" strokeDashoffset={251 - (251 * progress) / 100} className="transition-all duration-1000" />
          </svg>
          <span className="text-xl font-black text-slate-900 dark:text-white">{progress}%</span>
        </div>
        <div className="flex-1 text-left">
          <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Estado de la Operación</h3>
          <p className="text-sm text-slate-500 font-medium">
            {progress < 100 ? `Faltan ${totalItems - checkedItems} barreras de seguridad por validar para alcanzar el cumplimiento SAIL.` : 'Todas las mitigaciones han sido validadas exitosamente.'}
          </p>
        </div>
        {progress === 100 && (
          <div className="bg-emerald-500 text-white px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-500/20 animate-bounce">
            Operación Autorizada
          </div>
        )}
      </div>

      {/* GRID DE CATEGORÍAS SORA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {Object.keys(grouped).map(cat => (
          <div key={cat} className="space-y-4">
            <h4 className="text-[10px] font-black uppercase text-[#ec5b13] tracking-[0.3em] ml-2">{cat}</h4>
            <div className="space-y-3">
              {grouped[cat].map(item => (
                <label key={item.id} className={`flex items-center justify-between p-5 bg-white dark:bg-slate-900 border rounded-3xl transition-all cursor-pointer ${checked[item.id] ? 'border-emerald-500 ring-4 ring-emerald-500/5 bg-emerald-50/10' : 'border-slate-200 dark:border-slate-800 hover:border-slate-400'}`}>
                  <div className="text-left pr-4">
                    <p className={`text-sm font-bold ${checked[item.id] ? 'text-emerald-700' : 'text-slate-700 dark:text-slate-300'}`}>{item.label}</p>
                    <p className="text-[9px] font-black text-slate-400 uppercase mt-1">Impacto: {item.score} pts</p>
                  </div>
                  <input 
                    type="checkbox" 
                    className="size-6 rounded-lg text-[#ec5b13] border-slate-300 focus:ring-0 cursor-pointer"
                    onChange={e => setChecked({...checked, [item.id]: e.target.checked})} 
                  />
                </label>
              ))}
            </div>
          </div>
        ))}

        {templates.length === 0 && !loading && (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-200 rounded-[2.5rem]">
            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No hay matriz SORA configurada.</p>
            <Link href="/dashboard/safety-config" className="text-[#ec5b13] text-xs font-black underline mt-2 block uppercase">Definir barreras ahora</Link>
          </div>
        )}
      </div>
    </div>
  );
}