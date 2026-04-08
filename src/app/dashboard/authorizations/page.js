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
    const [prefix, setPrefix] = useState('BIT');
    const [form, setForm] = useState({ pilot_id: '', aircraft_id: '', location: '', scheduled_at: '' });

    const loadData = async () => {
        try {
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
            setPrefix(profRes.data?.flight_prefix || 'BIT');
        } catch (err) {
            console.error("Error cargando datos:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!form.pilot_id || !form.aircraft_id) return alert("Por favor seleccione piloto y aeronave.");
        
        setSaving(true);
        const missionId = `${prefix}-${(missions.length + 1).toString().padStart(3, '0')}`;
        
        try {
            const res = await fetch('/api/flights/authorize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    pilot_id: form.pilot_id,
                    aircraft_id: form.aircraft_id,
                    location: form.location,
                    scheduled_at: form.scheduled_at,
                    mission_id: missionId 
                })
            });

            const result = await res.json();

            if (res.ok) {
                alert("🚀 Misión Autorizada Correctamente.");
                setForm({ pilot_id: '', aircraft_id: '', location: '', scheduled_at: '' });
                loadData();
            } else {
                throw new Error(result.error || "Error desconocido en el servidor");
            }
        } catch (err) {
            alert("⚠️ FALLA DE AUTORIZACIÓN: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-300">Sincronizando Torre de Control...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-8 text-left animate-in fade-in duration-500 pb-20">
            <header className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm gap-4">
                <div className="text-left">
                    <h2 className="text-2xl font-black uppercase tracking-tighter">Programación de Misiones</h2>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Control Operativo UAS</p>
                </div>
                <div className="bg-[#ec5b13]/10 px-4 py-2 rounded-xl border border-[#ec5b13]/20">
                   <p className="text-[9px] font-black text-[#ec5b13] uppercase">Prefijo Actual: {prefix}</p>
                </div>
            </header>

            <section className="bg-[#1A202C] p-8 rounded-[2.5rem] text-white shadow-2xl">
                <h3 className="text-[#ec5b13] text-[10px] font-black uppercase tracking-[0.2em] mb-6">Nueva Orden de Operaciones</h3>
                <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end text-left">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">Piloto UAS</label>
                        <select required className="w-full bg-slate-800 border-none rounded-xl p-3 text-xs font-bold text-white" value={form.pilot_id} onChange={e => setForm({...form, pilot_id: e.target.value})}>
                            <option value="">Asignar...</option>
                            {pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">Aeronave UAS</label>
                        <select required className="w-full bg-slate-800 border-none rounded-xl p-3 text-xs font-bold text-white" value={form.aircraft_id} onChange={e => setForm({...form, aircraft_id: e.target.value})}>
                            <option value="">Autorizar...</option>
                            {drones.map(d => <option key={d.id} value={d.id}>{d.model} ({d.serial_number})</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">Ubicación</label>
                        <input required className="w-full bg-slate-800 border-none rounded-xl p-3 text-xs font-bold text-white" placeholder="Sitio" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">Fecha</label>
                        <input required type="date" className="w-full bg-slate-800 border-none rounded-xl p-3 text-xs font-bold text-white" value={form.scheduled_at} onChange={e => setForm({...form, scheduled_at: e.target.value})} />
                    </div>
                    <button type="submit" disabled={saving} className="bg-[#ec5b13] hover:bg-orange-600 text-white py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg shadow-orange-500/20 active:scale-95">
                        {saving ? 'PROCESANDO...' : 'AUTORIZAR'}
                    </button>
                </form>
            </section>

            <section className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase">
                            <tr>
                                <th className="px-8 py-4">ID Misión</th>
                                <th className="px-8 py-4">Tripulación y Drone</th>
                                <th className="px-8 py-4">Fecha Programada</th>
                                <th className="px-8 py-4">Estado</th>
                                <th className="px-8 py-4 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {missions.length === 0 ? (
                                <tr><td colSpan="5" className="p-10 text-center text-slate-400 italic">No hay misiones programadas.</td></tr>
                            ) : missions.map(m => (
                                <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-8 py-5 text-xs font-black text-[#ec5b13] font-mono">{m.mission_id}</td>
                                    <td className="px-8 py-5">
                                        <p className="text-sm font-bold text-slate-700">{m.pilots?.name}</p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">{m.aircraft?.model}</p>
                                    </td>
                                    <td className="px-8 py-5 text-xs font-bold text-slate-500">{m.scheduled_at.split('T')[0]}</td>
                                    <td className="px-8 py-5">
                                        <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase bg-orange-50 text-orange-600 border border-orange-100">
                                            Autorizado
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 text-right">
                                        <button onClick={() => setEditingMission(m)} className="material-symbols-outlined text-slate-300 hover:text-[#ec5b13] transition-all">edit_square</button>
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
