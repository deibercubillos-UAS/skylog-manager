'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function BatteryLogPage() {
    const [drones, setDrones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        aircraft_id: '', battery_model: '', battery_sn: '', 
        charge_percentage: 100, cycle_number: 1, notes: ''
    });

    useEffect(() => {
        async function loadDrones() {
            const { data: { user } } = await supabase.auth.getUser();
            const { data } = await supabase.from('aircraft').select('*').eq('owner_id', user.id);
            setDrones(data || []);
            setLoading(false);
        }
        loadDrones();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        const res = await fetch('/api/logbook/batteries', {
            method: 'POST',
            body: JSON.stringify(form)
        });
        if (res.ok) {
            alert("✅ Ciclo de batería registrado correctamente.");
            setForm({ aircraft_id: '', battery_model: '', battery_sn: '', charge_percentage: 100, cycle_number: 1, notes: '' });
        } else {
            alert("❌ Error al guardar.");
        }
        setSaving(false);
    };

    if (loading) return <div className="p-20 text-center animate-pulse font-black uppercase">Cargando Sistema de Energía...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-10 text-left animate-in fade-in duration-500 pb-20">
            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Registro de Baterías</h2>
                    <p className="text-slate-500 text-sm">Control operacional de ciclos y salud de celdas.</p>
                </div>
                <span className="bg-[#ec5b13]/10 text-[#ec5b13] px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-[#ec5b13]/20">F-MNT-003</span>
            </header>

            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* VINCULACIÓN CON AERONAVE */}
                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-6">
                    <h3 className="text-[10px] font-black uppercase text-[#ec5b13] tracking-widest">Aeronave Vinculada</h3>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">S/N de Aeronave</label>
                        <select required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" 
                                value={form.aircraft_id} onChange={e => setForm({...form, aircraft_id: e.target.value})}>
                            <option value="">Seleccionar Drone...</option>
                            {drones.map(d => <option key={d.id} value={d.id}>{d.serial_number} ({d.model})</option>)}
                        </select>
                    </div>
                </div>

                {/* DATOS DE LA BATERÍA */}
                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                    <h3 className="text-[10px] font-black uppercase text-[#ec5b13] tracking-widest">Ficha de Energía</h3>
                    <input required placeholder="Modelo de la batería" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm"
                           value={form.battery_model} onChange={e => setForm({...form, battery_model: e.target.value})} />
                    <input required placeholder="S/N de la batería" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-mono text-sm"
                           value={form.battery_sn} onChange={e => setForm({...form, battery_sn: e.target.value})} />
                </div>

                {/* MÉTRICAS */}
                <div className="md:col-span-2 bg-[#1A202C] p-10 rounded-[3rem] text-white">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end">
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">% de Carga Final</label>
                            <input type="number" max="100" min="0" className="w-full bg-slate-800 p-4 rounded-2xl border-none font-bold text-xl"
                                   value={form.charge_percentage} onChange={e => setForm({...form, charge_percentage: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Número de Ciclo</label>
                            <input type="number" className="w-full bg-slate-800 p-4 rounded-2xl border-none font-bold text-xl"
                                   value={form.cycle_number} onChange={e => setForm({...form, cycle_number: e.target.value})} />
                        </div>
                        <button type="submit" disabled={saving} className="bg-[#ec5b13] hover:bg-orange-600 py-5 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl shadow-orange-500/20 active:scale-95">
                            {saving ? 'Sincronizando...' : 'Registrar Operación'}
                        </button>
                    </div>
                    <textarea rows="3" placeholder="Observaciones técnicas de la batería..." className="w-full mt-8 bg-slate-800 p-4 rounded-2xl border-none text-sm"
                              value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
                </div>
            </form>
        </div>
    );
}