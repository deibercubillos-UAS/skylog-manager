'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function MissionControlPage() {
    const [missions, setMissions] = useState([]);
    const [pilots, setPilots] = useState([]);
    const [drones, setDrones] = useState([]);
    const [org, setOrg] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ pilot_id: '', aircraft_id: '', location: '', scheduled_at: '' });

    const loadData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: prof } = await supabase.from('profiles').select('organization_id, role').eq('id', user.id).single();
        
        const [mRes, pRes, dRes, oRes] = await Promise.all([
            fetch('/api/flights/authorize'),
            supabase.from('pilots').select('*').eq('organization_id', prof.organization_id).eq('is_active', true),
            supabase.from('aircraft').select('*').eq('organization_id', prof.organization_id).eq('status', 'Operativo'),
            supabase.from('organizations').select('*').eq('id', prof.organization_id).single()
        ]);
        
        setMissions(await mRes.json());
        setPilots(pRes.data || []);
        setDrones(dRes.data || []);
        setOrg(oRes.data);
        setLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    const updatePrefix = async (val) => {
        const newPrefix = val.toUpperCase().substring(0, 3);
        setOrg({ ...org, flight_prefix: newPrefix }); // Actualización visual inmediata
        await supabase.from('organizations').update({ flight_prefix: newPrefix }).eq('id', org.id);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setSaving(true);
        const res = await fetch('/api/flights/authorize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form)
        });
        if (res.ok) {
            alert("✅ MISIÓN AUTORIZADA");
            setForm({ pilot_id: '', aircraft_id: '', location: '', scheduled_at: '' });
            loadData();
        }
        setSaving(false);
    };

    const updateStatus = async (id, newStatus) => {
        await supabase.from('flight_authorizations').update({ status: newStatus }).eq('id', id);
        loadData();
    };

    if (loading) return <div className="p-20 text-center font-black animate-pulse">CARGANDO MANDO...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-8 text-left pb-20">
            <header className="flex justify-between items-center">
                <h2 className="text-3xl font-black uppercase tracking-tighter">Programación</h2>
                <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border shadow-sm">
                    <span className="text-[9px] font-black text-slate-400 uppercase">Prefijo Corporativo:</span>
                    <input className="w-16 p-1 text-center font-black bg-slate-100 rounded-lg text-orange-600 uppercase border-none" 
                           value={org?.flight_prefix || ''} onChange={(e) => updatePrefix(e.target.value)} />
                </div>
            </header>

            <section className="bg-[#1A202C] p-8 rounded-[3rem] text-white shadow-2xl">
                <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">Piloto</label>
                        <select required className="w-full bg-slate-800 p-3 rounded-xl border-none text-white text-xs" value={form.pilot_id} onChange={e => setForm({...form, pilot_id: e.target.value})}>
                            <option value="">PIC...</option>
                            {pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">Drone</label>
                        <select required className="w-full bg-slate-800 p-3 rounded-xl border-none text-white text-xs" value={form.aircraft_id} onChange={e => setForm({...form, aircraft_id: e.target.value})}>
                            <option value="">UAS...</option>
                            {drones.map(d => <option key={d.id} value={d.id}>{d.model}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">Lugar</label>
                        <input required className="w-full bg-slate-800 p-3 rounded-xl border-none text-white text-xs" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">Fecha</label>
                        <input required type="date" className="w-full bg-slate-800 p-3 rounded-xl border-none text-white text-xs" value={form.scheduled_at} onChange={e => setForm({...form, scheduled_at: e.target.value})} />
                    </div>
                    <button type="submit" disabled={saving} className="bg-orange-600 p-3 rounded-xl font-black text-[10px] shadow-lg shadow-orange-500/20">AUTORIZAR</button>
                </form>
            </section>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                        <tr><th className="p-5">Misión</th><th className="p-5">PIC / UAS</th><th className="p-5">Estado</th><th className="p-5 text-right">Acción</th></tr>
                    </thead>
                    <tbody className="divide-y text-sm">
                        {missions.map(m => (
                            <tr key={m.id} className="hover:bg-slate-50">
                                <td className="p-5 font-black text-orange-600 font-mono">{m.mission_id}</td>
                                <td className="p-5"><b>{m.pilots?.name}</b><br/><span className="text-[10px] text-slate-400 uppercase">{m.aircraft?.model}</span></td>
                                <td className="p-5">
                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${m.status === 'pendiente' ? 'bg-orange-100 text-orange-600' : m.status === 'realizado' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                        {m.status}
                                    </span>
                                </td>
                                <td className="p-5 text-right space-x-2">
                                    <button onClick={() => updateStatus(m.id, 'realizado')} className="material-symbols-outlined text-emerald-500 text-sm">check_circle</button>
                                    <button onClick={() => updateStatus(m.id, 'cancelado')} className="material-symbols-outlined text-red-400 text-sm">cancel</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}