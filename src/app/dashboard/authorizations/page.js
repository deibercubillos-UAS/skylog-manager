'use client';
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
    const [orgPrefix, setOrgPrefix] = useState('BIT');

    const [form, setForm] = useState({ pilot_id: '', aircraft_id: '', location: '', scheduled_at: '' });

    const loadData = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        
        if (prof?.organization_id) {
            const [mRes, pRes, dRes] = await Promise.all([
                fetch('/api/flights/authorize'),
                supabase.from('pilots').select('*').eq('organization_id', prof.organization_id),
                supabase.from('aircraft').select('*').eq('organization_id', prof.organization_id).eq('status', 'Operativo')
            ]);
            
            const mData = await mRes.json();
            setMissions(Array.isArray(mData) ? mData : []);
            setPilots(pRes.data || []);
            setDrones(dRes.data || []);
            setOrgPrefix(prof.organization_id.substring(0, 3).toUpperCase());
        }
        setLoading(false);
    };

    useEffect(() => { loadData(); }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        setSaving(true);
        const mID = `${orgPrefix}-${(missions.length + 1).toString().padStart(3, '0')}`;
        
        const res = await fetch('/api/flights/authorize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...form, mission_id: mID })
        });

        if (res.ok) {
            alert("🚀 MISIÓN AUTORIZADA");
            setForm({ pilot_id: '', aircraft_id: '', location: '', scheduled_at: '' });
            loadData();
        }
        setSaving(false);
    };

    if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400">ABRIENDO CANAL DE MANDO...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-8 text-left animate-in fade-in duration-500 pb-20">
            <header>
                <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Programación de Operaciones</h2>
                <p className="text-slate-500 text-sm">Emisión de órdenes de vuelo y control de escuadrilla.</p>
            </header>

            {/* PANEL DE ACCIÓN (DARK MODE STYLE) */}
            <section className="bg-[#1A202C] p-8 rounded-[2.5rem] text-white shadow-2xl">
                <h3 className="text-orange-500 text-[10px] font-black uppercase tracking-[0.2em] mb-6">Nueva Autorización (ID: {orgPrefix}-{(missions.length + 1).toString().padStart(3, '0')})</h3>
                <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">Piloto</label>
                        <select required className="w-full bg-slate-800 border-none rounded-xl p-3 text-xs font-bold text-white" value={form.pilot_id} onChange={e => setForm({...form, pilot_id: e.target.value})}>
                            <option value="">PIC...</option>
                            {pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">Aeronave</label>
                        <select required className="w-full bg-slate-800 border-none rounded-xl p-3 text-xs font-bold text-white" value={form.aircraft_id} onChange={e => setForm({...form, aircraft_id: e.target.value})}>
                            <option value="">UAS...</option>
                            {drones.map(d => <option key={d.id} value={d.id}>{d.model}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">Lugar</label>
                        <input required className="w-full bg-slate-800 border-none rounded-xl p-3 text-xs font-bold text-white" placeholder="Zona G" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">Fecha</label>
                        <input required type="date" className="w-full bg-slate-800 border-none rounded-xl p-3 text-xs font-bold text-white" value={form.scheduled_at} onChange={e => setForm({...form, scheduled_at: e.target.value})} />
                    </div>
                    <button type="submit" disabled={saving} className="bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">
                        {saving ? '...' : 'AUTORIZAR'}
                    </button>
                </form>
            </section>

            {/* TABLA DE MISIONES */}
            <section className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase">
                                <th className="px-8 py-4">ID OP</th>
                                <th className="px-8 py-4">PIC / UAS</th>
                                <th className="px-8 py-4">Ubicación</th>
                                <th className="px-8 py-4">Estatus</th>
                                <th className="px-8 py-4 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {missions.map(m => (
                                <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-5 text-xs font-black text-orange-600 font-mono">{m.mission_id}</td>
                                    <td className="px-8 py-5">
                                        <p className="text-sm font-bold text-slate-800">{m.pilots?.name}</p>
                                        <p className="text-[10px] text-slate-400 font-black uppercase">{m.aircraft?.model}</p>
                                    </td>
                                    <td className="px-8 py-5 text-xs font-bold text-slate-500">{m.location}</td>
                                    <td className="px-8 py-5">
                                        <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase bg-orange-50 text-orange-600 border border-orange-100">
                                            Vuelo Pendiente
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <button onClick={() => setEditingMission(m)} className="material-symbols-outlined text-slate-300 hover:text-orange-600 transition-all">edit_square</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {missions.length === 0 && <div className="p-20 text-center text-slate-400 italic font-bold">No hay órdenes de vuelo activas.</div>}
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