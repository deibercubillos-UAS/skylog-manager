'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function SafetyConfigPage() {
  const [activeTab, setActiveTab] = useState('checklist');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState({ checklist: [], sora: [] });
  const [form, setForm] = useState({ category: '', label: '', score: 1 });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(`/api/safety-config?userId=${session.user.id}`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    const { data: { session } } = await supabase.auth.getSession();
    
    const payload = {
      userId: session.user.id,
      type: activeTab,
      data: {
        category: form.category || 'General',
        label: form.label,
        ...(activeTab === 'sora' && { score: form.score })
      }
    };

    const res = await fetch('/api/safety-config', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      setForm({ category: '', label: '', score: 1 });
      fetchData();
    }
  };

  const handleDelete = async (id) => {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`/api/safety-config/${id}?type=${activeTab}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });
    fetchData();
  };

  return (
    <div className="max-w-6xl mx-auto text-left animate-in fade-in duration-500 pb-20">
      <header className="mb-8">
        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Protocolos de Seguridad</h2>
        <p className="text-slate-500 text-sm">Estandariza los chequeos obligatorios para tu organización BitaFly.</p>
      </header>

      {/* TABS */}
      <div className="flex bg-white p-1 rounded-2xl border border-slate-200 w-fit mb-10 shadow-sm">
        {['checklist', 'sora'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-[#ec5b13] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>
            {t === 'checklist' ? 'Checklist Pre-Vuelo' : 'Análisis SORA'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* FORMULARIO */}
        <div className="lg:col-span-1">
          <form onSubmit={handleAdd} className="bg-[#1A202C] p-8 rounded-[2.5rem] text-white space-y-6 sticky top-24 shadow-2xl border border-white/5">
            <h3 className="text-[#ec5b13] text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5 pb-4">Nuevo Requerimiento</h3>
            <input required className="w-full bg-slate-800 border-none rounded-xl p-4 text-sm font-bold outline-none focus:ring-2 focus:ring-[#ec5b13]" placeholder="Categoría (Ej: Motores)" value={form.category} onChange={e => setForm({...form, category: e.target.value})} />
            <textarea required rows="3" className="w-full bg-slate-800 border-none rounded-xl p-4 text-sm outline-none focus:ring-2 focus:ring-[#ec5b13]" placeholder="Descripción del punto..." value={form.label} onChange={e => setForm({...form, label: e.target.value})} />
            {activeTab === 'sora' && (
              <input type="number" min="1" max="10" className="w-full bg-slate-800 border-none rounded-xl p-4 text-sm font-black" value={form.score} onChange={e => setForm({...form, score: e.target.value})} />
            )}
            <button type="submit" className="w-full bg-[#ec5b13] py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">Añadir al Sistema</button>
          </form>
        </div>

        {/* LISTA */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm min-h-[400px]">
            {loading ? (
              <div className="py-20 text-center animate-pulse text-slate-300 font-black uppercase tracking-widest">Sincronizando Protocolos...</div>
            ) : (
              <div className="space-y-10">
                {Object.entries(
                  (activeTab === 'checklist' ? items.checklist : items.sora).reduce((acc, curr) => {
                    if (!acc[curr.category]) acc[curr.category] = [];
                    acc[curr.category].push(curr);
                    return acc;
                  }, {})
                ).map(([cat, subItems]) => (
                  <div key={cat} className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase text-[#ec5b13] tracking-[0.3em] bg-orange-50 px-4 py-2 rounded-lg inline-block">{cat}</h4>
                    <div className="grid gap-3">
                      {subItems.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-[#ec5b13]/30 transition-all">
                          <div className="text-left">
                            <p className="text-sm font-bold text-slate-700">{item.label}</p>
                            {item.score && <p className="text-[9px] font-black text-slate-400 mt-1 uppercase">Riesgo: {item.score} pts</p>}
                          </div>
                          <button onClick={() => handleDelete(item.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                            <span className="material-symbols-outlined">delete_forever</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}