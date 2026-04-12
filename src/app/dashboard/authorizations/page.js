'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import EditAuthorizationPanel from '@/components/EditAuthorizationPanel';

export default function MissionControlPage() {
    const [missions, setMissions] = useState([]);
    const [pilots, setPilots] = useState([]);
    const [drones, setDrones] = useState([]);
    const [org, setOrg] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingMission, setEditingMission] = useState(null);
    const [userRole, setUserRole] = useState('');

    const [form, setForm] = useState({ 
        pilot_id: '', 
        aircraft_id: '', 
        location: '', 
        scheduled_at: '', 
        mission_type: 'Operación Comercial' 
    });

    const loadData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: prof } = await supabase.from('profiles').select('organization_id, role').eq('id', user.id).single();
            setUserRole(prof.role);

            const [mRes, pRes, dRes, oRes] = await Promise.all([
                fetch('/api/flights/authorize'),
                supabase.from('pilots').select('*').eq('organization_id', prof.organization_id).eq('is_active', true),
                supabase.from('aircraft').select('*').eq('organization_id', prof.organization_id).eq('status', 'Operativo'),
                supabase.from('organizations').select('*').eq('id', prof.organization_id).single()
            ]);
            
            const mData = await mRes.json();
            setMissions(Array.isArray(mData) ? mData : []);
            setPilots(pRes.data || []);
            setDrones(dRes.data || []);
            setOrg(oRes.data);
        } catch (err) {
            console.error("Error cargando Torre de Control:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    // --- LÓGICA DE VALIDACIÓN TÉCNICA (SEMÁFORO) ---
    const getPilotStatus = () => {
        const p = pilots.find(x => x.id === form.pilot_id);
        if (!p || !p.medical_expiry) return null;
        const today = new Date();
        const expiry = new Date(p.medical_expiry);
        const diff = (expiry - today) / (1000 * 60 * 60 * 24);
        if (diff < 0) return { type: 'ERROR', msg: 'MÉDICO VENCIDO' };
        if (diff < 30) return { type: 'WARN', msg: `VENCE EN ${Math.round(diff)} DÍAS` };
        return { type: 'OK', msg: 'APTO PARA OPERACIÓN' };
    };

    const getDroneStatus = () => {
        const d = drones.find(x => x.id === form.aircraft_id);
        if (!d) return null;
        const currentHours = parseFloat(d.total_hours || 0);
        const lastHours = parseFloat(d.last_maintenance_hours || 0);
        const hoursUsed = currentHours - lastHours;
        const remaining = 200 - hoursUsed;
        if (remaining <= 0) return { type: 'ERROR', msg: 'MANTENIMIENTO REQUERIDO' };
        if (remaining <= 20) return { type: 'WARN', msg: `${remaining.toFixed(1)}H PARA SERVICIO` };
        return { type: 'OK', msg: 'AERONAVE OPERATIVA' };
    };

    const pStatus = getPilotStatus();
    const dStatus = getDroneStatus();

    const updatePrefix = async (val) => {
        const newPrefix = val.toUpperCase().substring(0, 3);
        setOrg(prev => ({ ...prev, flight_prefix: newPrefix }));
        await supabase.from('organizations').update({ flight_prefix: newPrefix }).eq('id', org.id);
    };

    const handleAuthorize = async (e) => {
        e.preventDefault();
        if (pStatus?.type === 'ERROR' || dStatus?.type === 'ERROR') return alert("🚫 BLOQUEO: Elementos vencidos");
        setSaving(true);
        try {
            const res = await fetch('/api/flights/authorize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            });
            if (res.ok) {
                alert("✅ MISIÓN AUTORIZADA");
                setForm({ pilot_id: '', aircraft_id: '', location: '', scheduled_at: '', mission_type: 'Operación Comercial' });
                loadData();
            }
        } finally {
            setSaving(false);
        }
    };

    const updateStatus = async (id, newStatus) => {
        await supabase.from('flight_authorizations').update({ status: newStatus }).eq('id', id);
        loadData();
    };

    if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase">Estableciendo Frecuencia...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-8 text-left pb-20 animate-in fade-in duration-500">
            <header className="flex justify-between items-center">
                <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Programación</h2>
                <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border shadow-sm">
                    <span className="text-[9px] font-black text-slate-400 uppercase">Prefijo:</span>
                    <input className="w-16 p-1 text-center font-black bg-slate-50 rounded-lg text-orange-600 uppercase border-none focus:ring-2 focus:ring-orange-500" 
                           value={org?.flight_prefix || ''} onChange={(e) => updatePrefix(e.target.value)} />
                </div>
            </header>

            {/* PANEL DE MANDO CENTRAL (ESTILO OSCURO RECOBRADO) */}
            <section className="bg-[#1A202C] p-10 rounded-[3rem] text-white shadow-2xl space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={`p-4 rounded-2xl border transition-all ${!pStatus ? 'border-white/10' : pStatus.type === 'ERROR' ? 'bg-red-500/20 border-red-500' : pStatus.type === 'WARN' ? 'bg-orange-500/20 border-orange-500' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                        <p className="text-[8px] font-black uppercase text-slate-500">Estatus Piloto</p>
                        <p className="text-[10px] font-bold mt-1 uppercase">{pStatus ? pStatus.msg : 'Seleccione PIC'}</p>
                    </div>
                    <div className={`p-4 rounded-2xl border transition-all ${!dStatus ? 'border-white/10' : dStatus.type === 'ERROR' ? 'bg-red-500/20 border-red-500' : dStatus.type === 'WARN' ? 'bg-orange-500/20 border-orange-500' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                        <p className="text-[8px] font-black uppercase text-slate-500">Estatus Aeronave</p>
                        <p className="text-[10px] font-bold mt-1 uppercase">{dStatus ? dStatus.msg : 'Seleccione UAS'}</p>
                    </div>
                </div>

                <form onSubmit={handleAuthorize} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">PIC (Piloto al Mando)</label>
                        <select required className="w-full bg-slate-800 p-4 rounded-2xl border-none text-white text-sm font-bold" value={form.pilot_id} onChange={e => setForm({...form, pilot_id: e.target.value})}>
                            <option value="">Seleccionar...</option>
                            {pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">UAS (Aeronave)</label>
                        <select required className="w-full bg-slate-800 p-4 rounded-2xl border-none text-white text-sm font-bold" value={form.aircraft_id} onChange={e => setForm({...form, aircraft_id: e.target.value})}>
                            <option value="">Seleccionar...</option>
                            {drones.map(d => <option key={d.id} value={d.id}>{d.model} ({d.serial_number})</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">Tipo de Misión</label>
                        <select required className="w-full bg-slate-800 p-4 rounded-2xl border-none text-white text-sm font-bold" value={form.mission_type} onChange={e => setForm({...form, mission_type: e.target.value})}>
                            <option value="Operación Comercial">Operación Comercial</option>
                            <option value="Inspección Técnica">Inspección Técnica</option>
                            <option value="Entrenamiento">Entrenamiento</option>
                            <option value="Búsqueda y Rescate">Búsqueda y Rescate</option>
                        </select>
                    </div>
                    <div className="md:col-span-2 grid grid-cols-2 gap-4">
                        <input required className="w-full bg-slate-800 p-4 rounded-2xl border-none text-white text-sm font-bold" placeholder="Lugar de Operación" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
                        <input required type="date" className="w-full bg-slate-800 p-4 rounded-2xl border-none text-white text-sm font-bold" value={form.scheduled_at} onChange={e => setForm({...form, scheduled_at: e.target.value})} />
                    </div>
                    <button type="submit" disabled={saving} className="bg-orange-600 hover:bg-orange-700 text-white p-4 rounded-2xl font-black uppercase text-xs shadow-xl transition-all active:scale-95">
                        {saving ? '...' : 'EMITIR ORDEN'}
                    </button>
                </form>
            </section>

            {/* TABLA DE ÓRDENES (RECOBRADA) */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                        <tr><th className="p-5">Orden</th><th className="p-5">Tripulación / Equipo</th><th className="p-5">Estado</th><th className="p-5 text-right">Acción</th></tr>
                    </thead>
                    <tbody className="divide-y text-sm">
                        {missions.map(m => (
                            <tr key={m.id} className="hover:bg-slate-50">
                                <td className="p-5 font-black text-orange-600 font-mono">{m.mission_id}</td>
                                <td className="p-5"><b>{m.pilots?.name}</b><br/><span className="text-[10px] text-slate-400 uppercase">{m.aircraft?.model}</span></td>
                                <td className="p-5">
                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${m.status === 'realizado' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                                        {m.status}
                                    </span>
                                </td>
                                <td className="p-5 text-right space-x-2">
                                    <button onClick={() => setEditingMission(m)} className="material-symbols-outlined text-slate-300 hover:text-orange-600 transition-colors">edit_square</button>
                                    <button onClick={() => updateStatus(m.id, 'realizado')} title="Marcar Realizado" className="material-symbols-outlined text-emerald-500 hover:scale-110 transition-all">check_circle</button>
                                    <button onClick={() => updateStatus(m.id, 'cancelado')} title="Cancelar" className="material-symbols-outlined text-red-400 hover:scale-110 transition-all">cancel</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* PANEL DE EDICIÓN */}
            {editingMission && (
                <div className="fixed inset-0 z-[200] flex justify-end">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditingMission(null)} />
                    <EditAuthorizationPanel 
                        mission={editingMission} 
                        pilots={pilots} 
                        drones={drones} 
                        onClose={() => setEditingMission(null)} 
                        onSuccess={() => { setEditingMission(null); loadData(); }} 
                    />
                </div>
            )}
        </div>
    );
}