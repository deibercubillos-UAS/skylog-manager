'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function BatteryLogPage() {
    const [drones, setDrones] = useState([]);
    const [inventoryBatteries, setInventoryBatteries] = useState([]);
    const [flights, setFlights] = useState([]); // <-- Nuevo estado para vuelos
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [form, setForm] = useState({
        aircraft_id: '', flight_id: '', battery_model: '', 
        battery_sn: '', charge_percentage: 100, cycle_number: 1, notes: ''
    });

    useEffect(() => {
        async function loadResources() {
            const { data: { user } } = await supabase.auth.getUser();
            const [dRes, bRes, fRes] = await Promise.all([
                supabase.from('aircraft').select('*').eq('owner_id', user.id),
                supabase.from('batteries').select('*').eq('owner_id', user.id).eq('status', 'Operativo'),
                supabase.from('flights').select('*').eq('owner_id', user.id).order('flight_date', { ascending: false }).limit(20)
            ]);
            setDrones(dRes.data || []);
            setInventoryBatteries(bRes.data || []);
            setFlights(fRes.data || []);
            setLoading(false);
        }
        loadResources();
    }, []);

    const handleBatterySelect = (batteryId) => {
        const selected = inventoryBatteries.find(b => b.id === batteryId);
        if (selected) {
            setForm({
                ...form,
                battery_model: `${selected.brand} ${selected.model}`,
                battery_sn: selected.serial_number,
                cycle_number: (selected.cycles || 0) + 1
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
            alert("✅ Ciclo vinculado al vuelo correctamente.");
            setForm({ aircraft_id: '', flight_id: '', battery_model: '', battery_sn: '', charge_percentage: 100, cycle_number: 1, notes: '' });
        }
        setSaving(false);
    };

    if (loading) return <div className="p-20 text-center animate-pulse font-black uppercase text-slate-300">Cargando bitácora de energía...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-10 text-left animate-in fade-in duration-500 pb-20">
            <header className="flex justify-between items-center text-left">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Registro de Baterías</h2>
                    <p className="text-slate-500 text-sm">Vinculación de ciclos por número de operación.</p>
                </div>
            </header>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* SECCIÓN VÍNCULO OPERATIVO */}
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6 text-left">
                        <h3 className="text-[10px] font-black uppercase text-[#ec5b13] tracking-widest">1. Datos de la Misión</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Número de Vuelo (Referencia)</label>
                                <select required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" 
                                        value={form.flight_id} onChange={e => setForm({...form, flight_id: e.target.value})}>
                                    <option value="">Seleccionar vuelo...</option>
                                    {flights.map(f => (
                                        <option key={f.id} value={f.id}>{f.flight_number} - {f.location} ({f.flight_date})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Aeronave Utilizada</label>
                                <select required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" 
                                        value={form.aircraft_id} onChange={e => setForm({...form, aircraft_id: e.target.value})}>
                                    <option value="">Confirmar Drone...</option>
                                    {drones.map(d => <option key={d.id} value={d.id}>{d.model} ({d.serial_number})</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* SECCIÓN BATERÍA */}
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-4 text-left">
                        <h3 className="text-[10px] font-black uppercase text-[#ec5b13] tracking-widest">2. Identificación de Batería</h3>
                        <div className="space-y-4">
                            <select required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" 
                                    onChange={e => handleBatterySelect(e.target.value)}>
                                <option value="">Seleccionar Batería...</option>
                                {inventoryBatteries.map(b => <option key={b.id} value={b.id}>{b.brand} {b.model} [S/N: {b.serial_number}]</option>)}
                            </select>
                            <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100">
                                <p className="text-[8px] font-black text-orange-400 uppercase tracking-tighter">S/N Detectado</p>
                                <p className="text-xs font-mono font-bold text-orange-700">{form.battery_sn || '---'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* BLOQUE DE CIERRE */}
                <div className="bg-[#1A202C] p-10 rounded-[3rem] text-white text-left">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                        <div className="space-y-2 text-left">
                            <label className="text-[9px] font-black text-slate-500 uppercase">Ciclo a Registrar</label>
                            <input type="number" className="w-full bg-slate-800 p-4 rounded-2xl border-none font-bold text-2xl text-emerald-400"
                                   value={form.cycle_number} onChange={e => setForm({...form, cycle_number: e.target.value})} />
                        </div>
                        <button type="submit" disabled={saving} className="bg-[#ec5b13] hover:bg-orange-600 py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl transition-all active:scale-95">
                            {saving ? 'Registrando...' : 'Finalizar y Vincular Ciclo'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}