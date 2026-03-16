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
    const { data } = await supabase
      .from('checklist_templates')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: true });
    setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchItems(); }, []);

  const addItem = async (e) => {
    e.preventDefault();
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
        <p className="text-slate-500">Añade los puntos de seguridad específicos que tus clientes solicitan para autorizar el vuelo.</p>
      </header>

      <div className="bg-white border border-slate-200 rounded-[2rem] p-8 shadow-sm space-y-8">
        <form onSubmit={addItem} className="flex gap-4">
          <input 
            type="text" 
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-[#ec5b13]/20" 
            placeholder="Ej: Verificar permiso de predio colindante..."
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
          />
          <button type="submit" className="bg-[#ec5b13] text-white px-8 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg">Agregar</button>
        </form>

        <div className="space-y-3 pt-6 border-t border-slate-100">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4">Puntos de Verificación Actuales</h3>
          {loading ? (
            <div className="py-10 text-center animate-pulse text-slate-400 font-bold">CARGANDO PLANTILLA...</div>
          ) : items.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group transition-all hover:border-[#ec5b13]/30">
              <span className="text-sm font-bold text-slate-700">{item.label}</span>
              <button onClick={() => deleteItem(item.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                <span className="material-symbols-outlined">delete</span>
              </button>
            </div>
          ))}
          {!loading && items.length === 0 && (
            <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-3xl">
              <p className="text-slate-400 italic text-sm">No hay ítems configurados. Agrega el primero para que aparezca en el registro de vuelo.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}