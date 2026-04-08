'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function MissionControlPage() {
    const [missions, setMissions] = useState([]);
    const [pilots, setPilots] = useState([]);
    const [drones, setDrones] = useState([]);
    const [org, setOrg] = useState({ flight_prefix: 'BIT' });
    const [userRole, setUserRole] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({ pilot_id: '', aircraft_id: '', location: '', scheduled_at: '' });

    const loadData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: prof } = await supabase.from('profiles').select('organization_id, role').eq('id', user.id).single();
        setUserRole(prof.role);

        const [mRes, pRes, dRes, oRes] = await Promise.all([
            fetch('/api/flights/authorize'),
            supabase.from('pilots').select('*').eq('organization_id', prof.organization_id),
            supabase.from('aircraft').select('*').eq('organization_id', prof.organization_id).eq('status', 'Operativo'),
            supabase.from('organizations').select('*').eq('id', prof.organization_id).single()
        ]);
        
        const mData = await mRes.json();
        setMissions(Array.isArray(mData) ? mData : []);
        setPilots(pRes.data || []);
        setDrones(dRes.data || []);
        setOrg(oRes.data);
        setLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    const updatePrefix = async (newVal) => {
        const prefix = newVal.toUpperCase().substring(0, 3);
        const { error } = await supabase.from('organizations').update({ flight_prefix: prefix }).eq('id', org.id);
        if (!error) {
            setOrg({ ...org, flight_prefix: prefix });
            loadData(); // Recargar para actualizar el ID visual
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        setSaving(true);
        const res = await fetch('/api/flights/authorize', {
            method: 'POST',
            body: JSON.stringify(form)
        });
        if (res.ok) {
            setForm({ pilot_id: '', aircraft_id: '', location: '', scheduled_at: '' });
            loadData();
        }
        setSaving(false);
    };

    if (loading) return <div className="p-20 text-center font-black animate-pulse uppercase">Sincronizando...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-8 text-left pb-20">
            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Programación</h2>
                    <p className="text-slate-500 text-sm">Contador actual: {org.flight_prefix}</p>
                </div>
                {['admin', 'superadmin'].includes(userRole) && (
                    <div className="flex items-center gap-2 bg-white p-2 rounded-xl border">
                        <label className="text-[9px] font-black uppercase text-slate-400">Prefijo:</label>
                        <input maxLength="3" className="w-16 p-1 text-center font-black bg-slate-50 rounded uppercase text-orange-600" 
                               value={org.flight_prefix} onChange={(e) => updatePrefix(e.target.value)} />
                    </div>
                )}
            </header>

            <section className="bg-[#1A202C] p-8 rounded-[2.5rem] text-white shadow-2xl animate-in slide-in-from-top duration-500">
                <h3 className="text-orange-500 text-[10px] font-black uppercase tracking-[0.2em] mb-6">Autorizar Misión</h3>
                <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <select required className="w-full bg-slate-800 p-3 rounded-xl border-none text-white text-xs font-bold" value={form.pilot_id} onChange={e => setForm({...form, pilot_id: e.target.value})}>
                        <option value="">PIC...</option>
                        {pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <select required className="w-full bg-slate-800 p-3 rounded-xl border-none text-white text-xs font-bold" value={form.aircraft_id} onChange={e => setForm({...form, aircraft_id: e.target.value})}>
                        <option value="">UAS...</option>
                        {drones.map(d => <option key={d.id} value={d.id}>{d.model}</option>)}
                    </select>
                    <input required className="w-full bg-slate-800 p-3 rounded-xl border-none text-white text-xs" placeholder="Lugar" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
                    <input required type="date" className="w-full bg-slate-800 p-3 rounded-xl border-none text-white text-xs" value={form.scheduled_at} onChange={e => setForm({...form, scheduled_at: e.target.value})} />
                    <button type="submit" disabled={saving} className="bg-orange-600 p-3 rounded-xl font-black uppercase text-[10px] hover:bg-orange-700 transition-all">
                        {saving ? '...' : 'AUTORIZAR'}
                    </button>
                </form>
            </section>

            <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                        <tr><th className="p-5">ID OP</th><th className="p-5">PIC / UAS</th><th className="p-5">Lugar</th><th className="p-5">Fecha</th></tr>
                    </thead>
                    <tbody className="divide-y text-sm">
                        {missions.map(m => (
                            <tr key={m.id} className="hover:bg-slate-50">
                                <td className="p-5 font-black text-orange-600 font-mono">{m.mission_id}</td>
                                <td className="p-5"><p className="font-bold">{m.pilots?.name}</p><p className="text-[10px] uppercase text-slate-400">{m.aircraft?.model}</p></td>
                                <td className="p-5 font-medium">{m.location}</td>
                                <td className="p-5 text-slate-500">{m.scheduled_at}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}