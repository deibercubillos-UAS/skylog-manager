'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function SoraConfigPage() {
  const [items, setItems] = useState([]);
  const [newCategory, setNewCategory] = useState('Mitigación Terrestre');
  const [newLabel, setNewLabel] = useState('');
  const [newScore, setNewScore] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from('sora_templates').select('*').eq('owner_id', user.id).order('category', { ascending: true });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const addItem = async (e) => {
    e.preventDefault();
    if (!newLabel) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('sora_templates').insert([{ owner_id: user.id, category: newCategory, label: newLabel, score: parseInt(newScore) }]);
    setNewLabel('');
    fetchItems();
  };

  return (
    <div className="max-w-5xl mx-auto text-left animate-in fade-in duration-500">
      <header className="mb-8">
        <h2 className="text-3xl font-black text-slate-900 uppercase">Configurador de Matriz SORA</h2>
        <p className="text-slate-500">Define riesgos y asigna puntajes de criticidad para tus misiones.</p>
      </header>

      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-8">
        <form onSubmit={addItem} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-900 p-6 rounded-3xl">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Categoría</label>
            <select className="w-full bg-slate-800 text-white border-none rounded-xl py-3 px-4 text-xs outline-none" value={newCategory} onChange={e => setNewCategory(e.target.value)}>
              <option>Riesgo Terrestre (GRC)</option>
              <option>Riesgo Aéreo (ARC)</option>
              <option>Mitigación Operativa</option>
            </select>
          </div>
          <div className="md:col-span-2 space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Descripción del Riesgo</label>
            <input type="text" className="w-full bg-slate-800 text-white border-none rounded-xl py-3 px-4 text-xs outline-none" placeholder="Ej: Operación sobre personas..." value={newLabel} onChange={e => setNewLabel(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Puntaje (1-10)</label>
            <div className="flex gap-2">
              <input type="number" min="1" max="10" className="w-full bg-slate-800 text-white border-none rounded-xl py-3 px-4 text-xs outline-none" value={newScore} onChange={e => setNewScore(e.target.value)} />
              <button type="submit" className="bg-[#ec5b13] text-white px-4 rounded-xl font-black text-[10px] uppercase shadow-lg hover:scale-105 transition-all">Añadir</button>
            </div>
          </div>
        </form>

        <div className="grid grid-cols-1 gap-3">
          {items.map(item => (
            <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-[#ec5b13] uppercase tracking-widest">{item.category}</span>
                <span className="text-sm font-bold text-slate-700">{item.label}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="bg-slate-200 px-3 py-1 rounded-full text-[10px] font-black">SCORE: {item.score}</div>
                <button onClick={async () => { await supabase.from('sora_templates').delete().eq('id', item.id); fetchItems(); }} className="text-slate-300 hover:text-red-500">
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}