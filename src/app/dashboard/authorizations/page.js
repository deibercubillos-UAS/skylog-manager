'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function MissionControlPage() {
    const [missions, setMissions] = useState([]);
    const [pilots, setPilots] = useState([]);
    const [drones, setDrones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Estado del formulario con ID de misión editable
    const [form, setForm] = useState({ 
        pilot_id: '', 
        aircraft_id: '', 
        location: '', 
        scheduled_at: '',
        mission_id: '' 
    });

    const loadData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        const [mRes, pRes, dRes, profRes] = await Promise.all([
            fetch('/api/flights/authorize'),
            supabase.from('pilots').select('*').eq('is_active', true),
            supabase.from('aircraft').select('*').eq('status', 'Operativo'),
            supabase.from('profiles').select('flight_prefix').eq('id', user.id).single()
        ]);
        
        const mData = await mRes.json();
        setMissions(Array.isArray(mData) ? mData : []);
        setPilots(pRes.data || []);
        setDrones(dRes.data || []);
        
        // Sugerir un ID inicial basado en el prefijo del perfil
        if (!form.mission_id) {
            const prefix = profRes.data?.flight_prefix || 'BIT';
            setForm(prev => ({ ...prev, mission_id: `${prefix}-00${mData.length + 1}` }));
        }
        setLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await fetch('/api/flights/authorize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            
            if (res.ok) {
                alert("✅ Misión autorizada correctamente.");
                setForm({ ...form, location: '', scheduled_at: '' });
                loadData();
            } else {
                const err = await res.json();
                alert("❌ Error: " + err.error);
            }
        } catch (err) {
            alert("❌ Error de conexión.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-300">CARGANDO TORRE DE CONTROL...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-10 text-left animate-in fade-in duration-500 pb-20">
            <header>
                <h2 className="text-3xl font-black uppercase tracking-tighter">Programación de Misiones</h2>
                <p className="text-slate-500 text-sm">Emisión y control de órdenes de vuelo.</p>
            </header>

            {/* FORMULARIO DE EMISIÓN */}
            <section className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-xl">
                <form onSubmit={handleCreate} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">ID de Misión (Editable)</label>
                            <input required className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 font-mono font-black text-[#ec5b13] uppercase" 
                                   value={form.mission_id} onChange={e => setForm({...form, mission_id: e.target.value.toUpperCase()})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Piloto asignado</label>
                            <select required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" 
                                    value={form.pilot_id} onChange={e => setForm({...form, pilot_id: e.target.value})}>
                                <option value="">Seleccionar...</option>
                                {pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Aeronave autorizada</label>
                            <select required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" 
                                    value={form.aircraft_id} onChange={e => setForm({...form, aircraft_id: e.target.value})}>
                                <option value="">Seleccionar...</option>
                                {drones.map(d => <option key={d.id} value={d.id}>{d.model} ({d.serial_number})</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                        <div className="space-y-1 md:col-span-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Ubicación</label>
                            <input required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" placeholder="Sitio de vuelo" 
                                   value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
                        </div>
                        <div className="space-y-1 md:col-span-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Fecha y Hora Tentativa</label>
                            <input required type="datetime-local" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" 
                                   value={form.scheduled_at} onChange={e => setForm({...form, scheduled_at: e.target.value})} />
                        </div>
                        <button type="submit" disabled={saving} className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-lg uppercase tracking-widest active:scale-95 transition-all">
                            {saving ? 'PROCESANDO...' : 'AUTORIZAR MISIÓN'}
                        </button>
                    </div>
                </form>
            </section>

            {/* TABLA DE SEGUIMIENTO */}
            <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden text-left">
                <div className="p-8 border-b border-slate-50 bg-slate-50/30">
                    <h3 className="text-xs font-black uppercase text-slate-400 tracking-widest">Tablero de Control Operativo</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                <th className="px-8 py-4">ID Misión</th>
                                <th className="px-8 py-4">Personal / Equipo</th>
                                <th className="px-8 py-4">Programado para</th>
                                <th className="px-8 py-4">Estado</th>
                                <th className="px-8 py-4 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {missions.map(m => (
                                <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-5 text-xs font-black text-[#ec5b13] font-mono">{m.mission_id}</td>
                                    <td className="px-8 py-5">
                                        <p className="text-sm font-bold text-slate-700">{m.pilots?.name}</p>
                                        <p className="text-[10px] text-slate-400 uppercase font-bold">{m.aircraft?.model}</p>
                                    </td>
                                    <td className="px-8 py-5 text-xs font-bold text-slate-600">
                                        {new Date(m.scheduled_at).toLocaleString()}
                                    </td>
                                    <td className="px-8 py-5">
                                        {m.is_completed ? (
                                            <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase border border-emerald-100">Vuelo Realizado</span>
                                        ) : (
                                            <span className="px-3 py-1 bg-orange-50 text-orange-600 rounded-full text-[9px] font-black uppercase border border-orange-100">Pendiente</span>
                                        )}
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <button className="material-symbols-outlined text-slate-300 hover:text-blue-500 transition-colors">edit_square</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}