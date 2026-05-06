'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';

export default function MissionInventoryPage() {
    const [items, setItems] = useState([]);
    const [flights, setFlights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [selectedFlight, setSelectedFlight] = useState('');
    const [selectedItems, setSelectedItems] = useState([]);
    const [newItemName, setNewItemName] = useState('');

    useEffect(() => {
        async function loadData() {
            const { data: { user } } = await supabase.auth.getUser();
            const [iRes, fRes] = await Promise.all([
                fetch('/api/logbook/inventory'),
                supabase.from('flights').select('*').eq('owner_id', user.id).order('flight_date', { ascending: false })
            ]);
            const itemsData = await iRes.json();
            setItems(itemsData);
            setFlights(fRes.data || []);
            setLoading(false);
        }
        loadData();
    }, []);

    const toggleItem = (name) => {
        setSelectedItems(prev => prev.includes(name) ? prev.filter(i => i !== name) : [...prev, name]);
    };

    const handleAddItem = async () => {
        if (!newItemName) return;
        const res = await fetch('/api/logbook/inventory', {
            method: 'POST',
            body: JSON.stringify({ action: 'add_item', name: newItemName })
        });
        if (res.ok) {
            const newItem = await res.json();
            setItems([...items, newItem]);
            setNewItemName('');
        }
    };

    const handleSaveLog = async () => {
        if (!selectedFlight || selectedItems.length === 0) return toast.warn("Selecciona vuelo e ítems.");
        setSaving(true);
        const res = await fetch('/api/logbook/inventory', {
            method: 'POST',
            body: JSON.stringify({ flight_id: selectedFlight, items: selectedItems })
        });
        if (res.ok) {
            toast.success("Inventario de misión registrado.");
            setSelectedItems([]);
            setSelectedFlight('');
        }
        setSaving(false);
    };

    if (loading) return <div className="p-20 text-center animate-pulse font-black uppercase text-slate-300">Cargando Logística...</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-10 text-left animate-in fade-in duration-500 pb-20">
            <header className="flex justify-between items-center text-left">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Inventario de Misión</h2>
                    <p className="text-slate-500 text-sm italic text-left">Control de equipos F-LOG-004.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* COLUMNA 1: SELECCIÓN DE VUELO */}
                <div className="space-y-6">
                    <section className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm text-left">
                        <h3 className="text-xs font-black uppercase text-[#ec5b13] tracking-widest mb-4">Referencia Operativa</h3>
                        <label className="text-xs font-black text-slate-400 uppercase ml-1">Seleccionar Vuelo</label>
                        <select className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm"
                                value={selectedFlight} onChange={e => setSelectedFlight(e.target.value)}>
                            <option value="">¿Para qué vuelo?</option>
                            {flights.map(f => <option key={f.id} value={f.id}>{f.flight_number} - {f.location}</option>)}
                        </select>
                    </section>

                    <section className="bg-[#1A202C] p-8 rounded-[2rem] text-white text-left">
                        <h3 className="text-xs font-black uppercase text-[#ec5b13] tracking-widest mb-4">Gestión de Catálogo</h3>
                        <div className="flex gap-2">
                            <input className="flex-1 bg-slate-800 border-none rounded-xl p-3 text-xs" 
                                   placeholder="Nuevo artículo..." value={newItemName} onChange={e => setNewItemName(e.target.value)} />
                            <button onClick={handleAddItem} className="bg-[#ec5b13] p-3 rounded-xl material-symbols-outlined">add</button>
                        </div>
                    </section>
                </div>

                {/* COLUMNA 2-3: LISTA DE CHEQUEO */}
                <div className="lg:col-span-2">
                    <section className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm text-left">
                        <h3 className="text-xl font-black uppercase text-slate-800 mb-8 flex items-center gap-3">
                            <span className="material-symbols-outlined text-[#ec5b13]">inventory_2</span>
                            Checklist de Equipo
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {items.length === 0 && <p className="text-slate-400 italic text-sm">Agrega artículos a tu catálogo para empezar...</p>}
                            {items.map(item => (
                                <label key={item.id} className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${selectedItems.includes(item.name) ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-50 hover:border-slate-200'}`}>
                                    <span className={`text-sm font-bold ${selectedItems.includes(item.name) ? 'text-emerald-700' : 'text-slate-600'}`}>{item.name}</span>
                                    <input type="checkbox" className="size-5 rounded text-emerald-500 focus:ring-0" 
                                           checked={selectedItems.includes(item.name)} onChange={() => toggleItem(item.name)} />
                                </label>
                            ))}
                        </div>

                        <div className="mt-12 pt-8 border-t border-slate-50">
                            <button onClick={handleSaveLog} disabled={saving} className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-xl uppercase tracking-[0.2em] text-xs active:scale-95 transition-all">
                                {saving ? 'Sincronizando...' : 'Registrar Salida de Equipo'}
                            </button>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}