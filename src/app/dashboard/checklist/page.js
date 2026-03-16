'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function ChecklistConfigPage() {
  const [items, setItems] = useState([]);
  const [newItem, setNewItem] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase.from('checklist_templates').select('*').eq('owner_id', user.id).order('created_at', { ascending: true });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const addItem = async () => {
    if (!newItem) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('checklist_templates').insert([{ owner_id: user.id, label: newItem }]);
    setNewItem('');
    fetchItems();
  };

  const deleteItem = async (id) => {
    await supabase.from('checklist_templates').delete().eq('id', id);
    fetchItems();
  };

  return (
    <div className="max-w-4xl mx-auto text-left animate-in fade-in duration-500">
      <header className="mb-8">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Configurador de Checklist</h2>
        <p className="text-slate-500">Personaliza los puntos de seguridad que tus clientes exigen para cada operación.</p>
      </header>

      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
        <div className="flex gap-4">
          <input 
            type="text" 
            className="flex-1 bg-slate-50 border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#ec5b13]/20" 
            placeholder="Ej: Verificar estado de la pista de aterrizaje..."
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
          />
          <button onClick={addItem} className="bg-[#ec5b13] text-white px-6 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg">Agregar</button>
        </div>

        <div className="space-y-3 pt-6 border-t border-slate-100">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Puntos de verificación activos</h3>
          {loading ? <p className="animate-pulse">Cargando...</p> : items.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
              <span className="text-sm font-bold text-slate-700">{item.label}</span>
              <button onClick={() => deleteItem(item.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                <span className="material-symbols-outlined text-lg">delete</span>
              </button>
            </div>
          ))}
          {items.length === 0 && !loading && <p className="text-center py-10 text-slate-400 italic">No hay ítems configurados. Agrega el primero arriba.</p>}
        </div>
      </div>
    </div>
  );
}
