'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import EditAuthorizationPanel from '@/components/EditAuthorizationPanel';

export default function MissionControlPage() {
    const [missions, setMissions] = useState([]);
    const [pilots, setPilots] = useState([]);
    const [drones, setDrones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingMission, setEditingMission] = useState(null);

    // Estado del Prefijo separado del Consecutivo
    const [prefix, setPrefix] = useState('BIT');
    const [nextNumber, setNextNumber] = useState('001');
    const [form, setForm] = useState({ pilot_id: '', aircraft_id: '', location: '', scheduled_at: '' });

    const loadData = async () => {
        const [mRes, pRes, dRes] = await Promise.all([
            fetch('/api/flights/authorize'),
            supabase.from('pilots').select('*').eq('is_active', true),
            supabase.from('aircraft').select('*').eq('status', 'Operativo')
        ]);
        const mData = await mRes.json();
        setMissions(Array.isArray(mData) ? mData : []);
        setPilots(pRes.data || []);
        setDrones(dRes.data || []);
        
        // Calcular siguiente consecutivo
        setNextNumber(((mData.length || 0) + 1).toString().padStart(3, '0'));
        setLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        setSaving(true);
        const missionId = `${prefix.substring(0,3).toUpperCase()}-${nextNumber}`;
        
        const res = await fetch('/api/flights/authorize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, mission_id: missionId })
        });
        
        if (res.ok) {
            alert("✅ Misión Autorizada.");
            setForm({ pilot_id: '', aircraft_id: '', location: '', scheduled_at: '' });
            loadData();
        }
        setSaving(false);
    };

    if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-300 uppercase">Sincronizando OPS...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-10 text-left animate-in fade-in duration-500 pb-20">
            <header>
                <h2 className="text-3xl font-black uppercase tracking-tighter">Programación de Misiones</h2>
            </header>

            {/* EMISIÓN CON REGLAS ESTRICTAS */}
            <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl">
                <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Prefijo</label>
                        <input required maxLength="3" className="w-full p-3 bg-slate-50 rounded-xl font-black text-[#ec5b13] text-center" 
                               value={prefix} onChange={e => setPrefix(e.target.value.toUpperCase())} />
                    </div>
                    <div className="space-y-1 text-center">
                        <span className="text-slate-300 font-bold">-</span>
                        <div className="p-3 bg-slate-100 rounded-xl font-mono text-slate-400 text-xs">{nextNumber}</div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Piloto</label>
                        <select required className="w-full p-3 bg-slate-50 rounded-xl font-bold text-xs" value={form.pilot_id} onChange={e => setForm({...form, pilot_id: e.target.value})}>
                            <option value="">Seleccionar...</option>
                            {pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Fecha</label>
                        <input required type="date" className="w-full p-3 bg-slate-50 rounded-xl font-bold text-xs" value={form.scheduled_at} onChange={e => setForm({...form, scheduled_at: e.target.value})} />
                    </div>
                    <button type="submit" disabled={saving} className="bg-[#ec5b13] text-white py-3 rounded-xl font-black uppercase text-[10px] tracking-widest">Autorizar</button>
                </form>
            </section>

            {/* TABLA CON BOTÓN EDITAR ACTIVO */}
            <section className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase">
                                <th className="px-8 py-4">ID Misión</th>
                                <th className="px-8 py-4">Piloto / Aeronave</th>
                                <th className="px-8 py-4">Fecha</th>
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
                                        <p className="text-[10px] text-slate-400 font-bold">{m.aircraft?.model}</p>
                                    </td>
                                    <td className="px-8 py-5 text-xs font-bold text-slate-600">{m.scheduled_at.split('T')[0]}</td>
                                    <td className="px-8 py-5">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${m.is_completed ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>
                                            {m.is_completed ? 'Realizado' : 'Pendiente'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <button onClick={() => setEditingMission(m)} className="material-symbols-outlined text-slate-300 hover:text-[#ec5b13]">edit_square</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {editingMission && (
                <EditAuthorizationPanel 
                    mission={editingMission} 
                    pilots={pilots} 
                    drones={drones} 
                    onClose={() => setEditingMission(null)} 
                    onSuccess={() => { setEditingMission(null); loadData(); }} 
                />
            )}
        </div>
    );
}