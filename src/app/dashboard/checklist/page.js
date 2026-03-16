'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function ChecklistConfigPage() {
  const [items, setItems] = useState([]);
  const [newCategory, setNewCategory] = useState('Motores');
  const [newLabel, setNewLabel] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from('checklist_templates').select('*').eq('owner_id', user.id).order('category', { ascending: true });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const addItem = async (e) => {
    e.preventDefault();
    if (!newLabel || !newCategory) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('checklist_templates').insert([{ owner_id: user.id, category: newCategory, label: newLabel }]);
    setNewLabel('');
    fetchItems();
  };

  const deleteItem = async (id) => {
    await supabase.from('checklist_templates').delete().eq('id', id);
    fetchItems();
  };

  // Agrupar ítems por categoría para la vista previa
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div className="max-w-4xl mx-auto text-left animate-in fade-in duration-500">
      <header className="mb-8">
        <h2 className="text-3xl font-black text-slate-900 uppercase">Grupos de Verificación</h2>
        <p className="text-slate-500 text-sm">Organiza los puntos de chequeo por sistemas (Motores, Energía, Entorno...)</p>
      </header>

      <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-8">
        <form onSubmit={addItem} className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-100">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Grupo / Sistema</label>
            <input type="text" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none" placeholder="Ej: Motores" value={newCategory} onChange={e => setNewCategory(e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Punto de verificación (Sub-ítem)</label>
            <div className="flex gap-2">
              <input type="text" className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-[#ec5b13]/20" placeholder="Ej: Hélices sin fisuras..." value={newLabel} onChange={e => setNewLabel(e.target.value)} />
              <button type="submit" className="bg-[#ec5b13] text-white px-6 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg">Añadir</button>
            </div>
          </div>
        </form>

        <div className="space-y-8 pt-4">
          {Object.keys(groupedItems).map(cat => (
            <div key={cat} className="space-y-3">
              <h3 className="text-xs font-black uppercase text-[#ec5b13] tracking-[0.2em] flex items-center gap-2">
                <span className="w-8 h-[2px] bg-[#ec5b13]"></span> {cat}
              </h3>
              <div className="grid gap-2">
                {groupedItems[cat].map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-slate-100 hover:shadow-sm transition-all group">
                    <span className="text-sm font-bold text-slate-600">{item.label}</span>
                    <button onClick={() => deleteItem(item.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}