'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function SoraConfigPage() {
  const [items, setItems] = useState([]);
  const [newCategory, setNewCategory] = useState('Mitigación Terrestre');
  const [newLabel, setNewLabel] = useState('');
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
    await supabase.from('sora_templates').insert([{ owner_id: user.id, category: newCategory, label: newLabel }]);
    setNewLabel('');
    fetchItems();
  };

  const deleteItem = async (id) => {
    await supabase.from('sora_templates').delete().eq('id', id);
    fetchItems();
  };

  const grouped = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div className="max-w-5xl mx-auto text-left animate-in fade-in duration-500">
      <header className="mb-8">
        <h2 className="text-3xl font-black text-slate-900 uppercase">Configuración de Riesgos SORA</h2>
        <p className="text-slate-500">Define las barreras de seguridad y mitigaciones requeridas para tus misiones SAIL.</p>
      </header>

      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm space-y-10">
        <form onSubmit={addItem} className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#1A202C] p-8 rounded-3xl text-white">
          <div className="space-y-2 text-left">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Barrera de Riesgo</label>
            <select className="w-full bg-slate-800 border-none rounded-xl px-4 py-3 text-sm outline-none" value={newCategory} onChange={e => setNewCategory(e.target.value)}>
              <option>Mitigación Terrestre (GRC)</option>
              <option>Mitigación Aérea (ARC)</option>
              <option>Contención Estratégica</option>
              <option>Protocolos de Emergencia</option>
            </select>
          </div>
          <div className="space-y-2 md:col-span-2 text-left">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Descripción de la Mitigación</label>
            <div className="flex gap-3">
              <input type="text" className="flex-1 bg-slate-800 border-none rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#ec5b13]" placeholder="Ej: Uso de paracaídas certificado M2..." value={newLabel} onChange={e => setNewLabel(e.target.value)} />
              <button type="submit" className="bg-[#ec5b13] px-6 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg active:scale-95 transition-all">Añadir</button>
            </div>
          </div>
        </form>

        <div className="space-y-8">
          {Object.keys(grouped).length > 0 ? Object.keys(grouped).map(cat => (
            <div key={cat} className="space-y-4">
              <h3 className="text-xs font-black uppercase text-[#ec5b13] tracking-[0.3em] flex items-center gap-4">
                <span className="shrink-0">{cat}</span>
                <span className="h-px bg-slate-100 w-full"></span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {grouped[cat].map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                    <span className="text-sm font-bold text-slate-600">{item.label}</span>
                    <button onClick={() => deleteItem(item.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                      <span className="material-symbols-outlined text-lg">cancel</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )) : (
            <div className="py-20 text-center text-slate-300 border-2 border-dashed border-slate-100 rounded-3xl italic text-sm uppercase font-bold">
              No hay mitigaciones SORA definidas.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}