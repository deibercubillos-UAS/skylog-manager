'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function BatteryLogPage() {
    const [drones, setDrones] = useState([]);
    const [inventoryBatteries, setInventoryBatteries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [form, setForm] = useState({
        aircraft_id: '', battery_model: '', battery_sn: '', 
        charge_percentage: 100, cycle_number: 1, notes: ''
    });

    useEffect(() => {
        async function loadResources() {
            const { data: { user } } = await supabase.auth.getUser();
            const [dRes, bRes] = await Promise.all([
                supabase.from('aircraft').select('*').eq('owner_id', user.id),
                supabase.from('batteries').select('*').eq('owner_id', user.id).eq('status', 'Operativo')
            ]);
            setDrones(dRes.data || []);
            setInventoryBatteries(bRes.data || []);
            setLoading(false);
        }
        loadResources();
    }, []);

    // Función para auto-completar al elegir batería
    const handleBatterySelect = (batteryId) => {
        const selected = inventoryBatteries.find(b => b.id === batteryId);
        if (selected) {
            setForm({
                ...form,
                battery_model: `${selected.brand} ${selected.model}`,
                battery_sn: selected.serial_number,
                cycle_number: (selected.cycles || 0) + 1 // Sugerir el siguiente ciclo
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        const res = await fetch('/api/logbook/batteries', {
            method: 'POST',
            body: JSON.stringify(form)
        });
        
        if (res.ok) {
            // OPCIONAL: Podríamos actualizar automáticamente la tabla 'batteries' aquí
            alert("✅ Registro guardado.");
            setForm({ aircraft_id: '', battery_model: '', battery_sn: '', charge_percentage: 100, cycle_number: 1, notes: '' });
        }
        setSaving(false);
    };

    if (loading) return <div className="p-20 text-center animate-pulse font-black uppercase">Sincronizando Energía...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-10 text-left animate-in fade-in duration-500 pb-20">
            <header className="flex justify-between items-center text-left">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Registro de Baterías</h2>
                    <p className="text-slate-500 text-sm">Control de ciclos de vuelo.</p>
                </div>
            </header>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* SELECCIÓN INTELIGENTE */}
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6 text-left">
                        <h3 className="text-[10px] font-black uppercase text-[#ec5b13] tracking-widest">1. Selección de Activos</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Seleccionar Drone</label>
                                <select required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" 
                                        onChange={e => setForm({...form, aircraft_id: e.target.value})}>
                                    <option value="">¿En qué drone voló?</option>
                                    {drones.map(d => <option key={d.id} value={d.id}>{d.model} ({d.serial_number})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Seleccionar Batería del Inventario</label>
                                <select required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" 
                                        onChange={e => handleBatterySelect(e.target.value)}>
                                    <option value="">¿Qué batería usó?</option>
                                    {inventoryBatteries.map(b => <option key={b.id} value={b.id}>{b.brand} {b.model} - S/N: {b.serial_number}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* DATOS AUTO-COMPLETADOS */}
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-4 text-left">
                        <h3 className="text-[10px] font-black uppercase text-[#ec5b13] tracking-widest">2. Datos Técnicos</h3>
                        <div className="p-4 bg-slate-50 rounded-2xl">
                            <p className="text-[9px] font-black text-slate-400 uppercase">S/N Detectado</p>
                            <p className="text-sm font-mono font-bold text-slate-700">{form.battery_sn || 'Esperando selección...'}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl">
                            <p className="text-[9px] font-black text-slate-400 uppercase">Modelo Detectado</p>
                            <p className="text-sm font-bold text-slate-700">{form.battery_model || '---'}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-[#1A202C] p-10 rounded-[3rem] text-white space-y-6 text-left">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-500 uppercase">Número de Ciclo a Registrar</label>
                            <input type="number" className="w-full bg-slate-800 p-4 rounded-2xl border-none font-bold text-xl"
                                   value={form.cycle_number} onChange={e => setForm({...form, cycle_number: e.target.value})} />
                        </div>
                        <button type="submit" disabled={saving} className="bg-[#ec5b13] py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">
                            {saving ? 'Registrando...' : 'Confirmar Ciclo de Batería'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}