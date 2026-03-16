'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function SoraAnalysisPage() {
  const [templates, setTemplates] = useState([]);
  const [checked, setChecked] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSora() {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('sora_templates').select('*').eq('owner_id', user.id);
      setTemplates(data || []);
      setLoading(false);
    }
    loadSora();
  }, []);

  const grouped = templates.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const progress = templates.length > 0 
    ? Math.round((Object.values(checked).filter(v => v).length / templates.length) * 100) 
    : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8 text-left animate-in fade-in duration-500">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Evaluación de Riesgos SORA</h2>
          <p className="text-slate-500">Valida las mitigaciones necesarias para el nivel de SAIL de tu operación.</p>
        </div>
        <Link href="/dashboard/sora/config" className="flex items-center gap-2 px-6 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200">
           <span className="material-symbols-outlined text-sm">settings</span> Configurar Barreras
        </Link>
      </header>

      {/* Barra de Progreso SAIL */}
      <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
        <div className="flex justify-between items-end mb-4">
          <span className="text-xs font-black uppercase text-[#ec5b13]">Validación de Mitigaciones</span>
          <span className="text-2xl font-black text-slate-900">{progress}%</span>
        </div>
        <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
          <div className="bg-[#ec5b13] h-full transition-all duration-700" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {Object.keys(grouped).map(cat => (
          <div key={cat} className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4">{cat}</h3>
            <div className="space-y-3">
              {grouped[cat].map(item => (
                <label key={item.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${checked[item.id] ? 'bg-emerald-50 border-emerald-500/30' : 'bg-slate-50 border-slate-100 hover:border-slate-300'}`}>
                  <span className={`text-xs font-bold ${checked[item.id] ? 'text-emerald-700' : 'text-slate-600'}`}>{item.label}</span>
                  <input type="checkbox" className="size-5 rounded border-slate-300 text-[#ec5b13] focus:ring-0" onChange={e => setChecked({...checked, [item.id]: e.target.checked})} />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {progress === 100 && (
        <div className="bg-emerald-600 p-6 rounded-2xl text-white flex items-center justify-between shadow-xl shadow-emerald-500/20 animate-bounce">
          <p className="font-black uppercase text-sm">Operación Validada Bajo Estándares SORA</p>
          <span className="material-symbols-outlined">verified</span>
        </div>
      )}
    </div>
  );
}