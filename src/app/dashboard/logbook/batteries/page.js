'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function BatteryLogPage() {
    const [drones, setDrones] = useState([]);
    const [inventoryBatteries, setInventoryBatteries] = useState([]);
    const [flights, setFlights] = useState([]);
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
                supabase.from('flights').select('*').eq('owner_id', user.id).order('flight_date', { ascending: false })
            ]);
            setDrones(dRes.data || []);
            setInventoryBatteries(bRes.data || []);
            setFlights(fRes.data || []);
            setLoading(false);
        }
        loadResources();
    }, []);

    // AUTO-COMPLETADO DE DRONE AL SELECCIONAR VUELO
    const handleFlightSelect = (flightId) => {
        const selectedFlight = flights.find(f => f.id === flightId);
        if (selectedFlight) {
            setForm(prev => ({
                ...prev,
                flight_id: flightId,
                aircraft_id: selectedFlight.aircraft_id // <-- Auto-selección del drone
            }));
        }
    };

    const handleBatterySelect = (batteryId) => {
        const selected = inventoryBatteries.find(b => b.id === batteryId);
        if (selected) {
            setForm(prev => ({
                ...prev,
                battery_model: `${selected.brand} ${selected.model}`,
                battery_sn: selected.serial_number,
                cycle_number: (selected.cycles || 0) + 1
            }));
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
            alert("✅ Ciclo de batería vinculado exitosamente.");
            setForm({ aircraft_id: '', flight_id: '', battery_model: '', battery_sn: '', charge_percentage: 100, cycle_number: 1, notes: '' });
        }
        setSaving(false);
    };

    if (loading) return <div className="p-20 text-center animate-pulse font-black uppercase text-slate-300">Cargando bitácora de energía...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-10 text-left animate-in fade-in duration-500 pb-20">
            <header>
                <h2 className="text-3xl font-black uppercase tracking-tighter">Registro de Baterías</h2>
                <p className="text-slate-500 text-sm">Control operativo vinculado a misiones.</p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                        <h3 className="text-xs font-black uppercase text-[#ec5b13] tracking-widest">1. Misión y Aeronave</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase">Seleccionar Número de Vuelo</label>
                                <select required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" 
                                        value={form.flight_id} onChange={e => handleFlightSelect(e.target.value)}>
                                    <option value="">Seleccionar...</option>
                                    {flights.map(f => <option key={f.id} value={f.id}>{f.flight_number} - {f.location}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-black text-slate-400 uppercase">Drone Usado (Auto-detectado)</label>
                                <select disabled className="w-full p-4 bg-slate-100 rounded-2xl border-none font-bold text-sm text-slate-500" 
                                        value={form.aircraft_id}>
                                    <option value="">Esperando vuelo...</option>
                                    {drones.map(d => <option key={d.id} value={d.id}>{d.model} ({d.serial_number})</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                        <h3 className="text-xs font-black uppercase text-[#ec5b13] tracking-widest">2. Selección de Energía</h3>
                        <div>
                            <label className="text-xs font-black text-slate-400 uppercase">Batería Utilizada</label>
                            <select required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" 
                                    onChange={e => handleBatterySelect(e.target.value)}>
                                <option value="">Seleccionar del inventario...</option>
                                {inventoryBatteries.map(b => <option key={b.id} value={b.id}>{b.brand} {b.model} ({b.serial_number})</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="bg-[#1A202C] p-10 rounded-[3rem] text-white">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase">Ciclo a Registrar</label>
                            <input type="number" className="w-full bg-slate-800 p-4 rounded-2xl border-none font-bold text-2xl text-emerald-400"
                                   value={form.cycle_number} onChange={e => setForm({...form, cycle_number: e.target.value})} />
                        </div>
                        <button type="submit" disabled={saving} className="bg-[#ec5b13] hover:bg-orange-600 py-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl">
                            {saving ? 'Guardando...' : 'Confirmar Registro'}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}