'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function SafetyConfigPage() {
  const [activeTab, setActiveTab] = useState('checklist'); // 'checklist' o 'sora'
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState({ checklist: [], sora: [] });
  
  // Estados para nuevos registros
  const [form, setForm] = useState({ category: '', label: '', score: 1 });

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { data: cData } = await supabase.from('checklist_templates').select('*').eq('owner_id', user.id).order('category');
    const { data: sData } = await supabase.from('sora_templates').select('*').eq('owner_id', user.id).order('category');
    
    setItems({ checklist: cData || [], sora: sData || [] });
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    const { data: { user } } = await supabase.auth.getUser();
    const table = activeTab === 'checklist' ? 'checklist_templates' : 'sora_templates';
    
    const payload = { 
      owner_id: user.id, 
      category: form.category || 'General', 
      label: form.label 
    };
    if (activeTab === 'sora') payload.score = form.score;

    const { error } = await supabase.from(table).insert([payload]);
    if (!error) {
      setForm({ category: '', label: '', score: 1 });
      fetchData();
    }
  };

  const handleDelete = async (id) => {
    const table = activeTab === 'checklist' ? 'checklist_templates' : 'sora_templates';
    await supabase.from(table).delete().eq('id', id);
    fetchData();
  };

  return (
    <div className="max-w-6xl mx-auto text-left animate-in fade-in duration-500">
      <header className="mb-8">
        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Protocolos de Seguridad</h2>
        <p className="text-slate-500 text-sm">Configura los estándares técnicos y de riesgo exigidos por tu organización.</p>
      </header>

      {/* Selector de Pestañas */}
      <div className="flex bg-white p-1 rounded-2xl border border-slate-200 w-fit mb-8 shadow-sm">
        <button onClick={() => setActiveTab('checklist')} className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'checklist' ? 'bg-[#ec5b13] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Checklist Pre-Vuelo</button>
        <button onClick={() => setActiveTab('sora')} className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'sora' ? 'bg-[#ec5b13] text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>Análisis de Riesgo SORA</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* FORMULARIO DE ADICIÓN */}
        <div className="lg:col-span-1">
          <form onSubmit={handleAdd} className="bg-[#1A202C] p-6 rounded-[2rem] text-white space-y-5 sticky top-24 shadow-xl">
            <h3 className="text-[#ec5b13] text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/10 pb-3">Nuevo Item: {activeTab.toUpperCase()}</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Grupo / Categoría</label>
                <input required type="text" className="w-full bg-slate-800 border-none rounded-xl p-3 text-sm font-bold" placeholder="Ej: Motores o Mitigación" value={form.category} onChange={e => setForm({...form, category: e.target.value})} />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Descripción del Punto</label>
                <textarea required rows="3" className="w-full bg-slate-800 border-none rounded-xl p-3 text-sm" placeholder="Ej: Hélices sin fisuras..." value={form.label} onChange={e => setForm({...form, label: e.target.value})} />
              </div>
              {activeTab === 'sora' && (
                <div>
                  <label className="text-[9px] font-black uppercase text-slate-500 ml-1">Puntaje de Riesgo (1-10)</label>
                  <input type="number" min="1" max="10" className="w-full bg-slate-800 border-none rounded-xl p-3 text-sm font-bold" value={form.score} onChange={e => setForm({...form, score: e.target.value})} />
                </div>
              )}
            </div>

            <button type="submit" className="w-full bg-[#ec5b13] py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">
              Añadir a Protocolo
            </button>
          </form>
        </div>

        {/* LISTA DE ITEMS ACTUALES */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
            {loading ? (
              <p className="animate-pulse font-black text-slate-300 py-20 text-center uppercase">Sincronizando Base de Datos...</p>
            ) : (
              <div className="space-y-8">
                {Object.entries(
                  (activeTab === 'checklist' ? items.checklist : items.sora).reduce((acc, curr) => {
                    if (!acc[curr.category]) acc[curr.category] = [];
                    acc[curr.category].push(curr);
                    return acc;
                  }, {})
                ).map(([cat, subItems]) => (
                  <div key={cat} className="space-y-3">
                    <h4 className="text-[10px] font-black uppercase text-[#ec5b13] tracking-widest bg-orange-50 p-2 px-4 rounded-lg inline-block">{cat}</h4>
                    <div className="grid gap-2">
                      {subItems.map(item => (
                        <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                          <div className="text-left">
                            <p className="text-sm font-bold text-slate-700">{item.label}</p>
                            {item.score && <p className="text-[9px] font-black text-slate-400 mt-0.5">SCORE: {item.score}</p>}
                          </div>
                          <button onClick={() => handleDelete(item.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {(activeTab === 'checklist' ? items.checklist : items.sora).length === 0 && (
                  <p className="text-center text-slate-400 py-20 italic">No hay protocolos definidos para esta sección.</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}