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
    const [editingMission, setEditingMission] = useState(null);
    
    // FORMULARIO EXTENDIDO
    const [form, setForm] = useState({ 
        pilot_id: '', aircraft_id: '', location: '', 
        scheduled_at: '', mission_type: 'Operación Comercial' 
    });

    const loadData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        
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

    // --- LÓGICA DE VALIDACIÓN TÉCNICA ---
    const getPilotStatus = () => {
        const p = pilots.find(x => x.id === form.pilot_id);
        if (!p || !p.medical_expiry) return null;
        const today = new Date();
        const expiry = new Date(p.medical_expiry);
        const diff = (expiry - today) / (1000 * 60 * 60 * 24);
        
        if (diff < 0) return { type: 'ERROR', msg: 'MÉDICO VENCIDO: No apto para vuelo' };
        if (diff < 73) return { type: 'WARN', msg: `AVISO: Médico vence en ${Math.round(diff)} días` };
        return { type: 'OK', msg: 'Apto para Operación' };
    };

    const getDroneStatus = () => {
        const d = drones.find(x => x.id === form.aircraft_id);
        if (!d) return null;
        
        // Check Horas (200h)
        const hoursLeft = 200 - (parseFloat(d.total_hours || 0) - parseFloat(d.last_maintenance_hours || 0));
        // Check Tiempo (6 meses / 182 días)
        const lastM = d.last_maintenance_date ? new Date(d.last_maintenance_date) : new Date(d.created_at);
        const daysUsed = Math.ceil(Math.abs(new Date() - lastM) / (1000 * 60 * 60 * 24));
        const daysLeft = 182 - daysUsed;

        if (hoursLeft <= 0 || daysLeft <= 0) return { type: 'ERROR', msg: 'LÍMITE TÉCNICO ALCANZADO: Mantenimiento Requerido' };
        if (hoursLeft <= 40 || daysLeft <= 36) return { type: 'WARN', msg: `AVISO: Mantenimiento próximo (${hoursLeft.toFixed(1)}h o ${daysLeft}d)` };
        return { type: 'OK', msg: 'Aeronave Operativa' };
    };

    const pilotStatus = getPilotStatus();
    const droneStatus = getDroneStatus();

    const handleAuthorize = async (e) => {
        e.preventDefault();
        if (pilotStatus?.type === 'ERROR' || droneStatus?.type === 'ERROR') {
            return alert("🚫 BLOQUEO DE SEGURIDAD: No se puede autorizar con elementos vencidos.");
        }
        setSaving(true);
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
        setSaving(false);
    };

    if (loading) return <div className="p-20 text-center font-black animate-pulse">SINCRO...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-8 text-left pb-20">
            <header className="flex justify-between items-center">
                <h2 className="text-3xl font-black uppercase tracking-tighter">Programación</h2>
                <div className="bg-white px-4 py-2 rounded-xl border font-black text-orange-600 uppercase text-[10px]">Prefijo: {org?.flight_prefix}</div>
            </header>

            {/* PANEL DE AUTORIZACIÓN INTELIGENTE */}
            <section className="bg-[#1A202C] p-10 rounded-[3rem] text-white shadow-2xl space-y-8">
                <div className="flex gap-4">
                    <div className={`flex-1 p-4 rounded-2xl border transition-all ${!pilotStatus ? 'border-white/10' : pilotStatus.type === 'ERROR' ? 'bg-red-500/20 border-red-500' : pilotStatus.type === 'WARN' ? 'bg-orange-500/20 border-orange-500' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                        <p className="text-[8px] font-black uppercase text-slate-500">Estatus Piloto</p>
                        <p className="text-[10px] font-bold mt-1 uppercase">{pilotStatus ? pilotStatus.msg : 'Seleccione PIC'}</p>
                    </div>
                    <div className={`flex-1 p-4 rounded-2xl border transition-all ${!droneStatus ? 'border-white/10' : droneStatus.type === 'ERROR' ? 'bg-red-500/20 border-red-500' : droneStatus.type === 'WARN' ? 'bg-orange-500/20 border-orange-500' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
                        <p className="text-[8px] font-black uppercase text-slate-500">Estatus Aeronave</p>
                        <p className="text-[10px] font-bold mt-1 uppercase">{droneStatus ? droneStatus.msg : 'Seleccione UAS'}</p>
                    </div>
                </div>

                <form onSubmit={handleAuthorize} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">Piloto al Mando (PIC)</label>
                        <select required className="w-full bg-slate-800 p-4 rounded-2xl border-none text-white text-sm font-bold" value={form.pilot_id} onChange={e => setForm({...form, pilot_id: e.target.value})}>
                            <option value="">Seleccionar...</option>
                            {pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">Aeronave (UAS)</label>
                        <select required className="w-full bg-slate-800 p-4 rounded-2xl border-none text-white text-sm font-bold" value={form.aircraft_id} onChange={e => setForm({...form, aircraft_id: e.target.value})}>
                            <option value="">Seleccionar...</option>
                            {drones.map(d => <option key={d.id} value={d.id}>{d.model} ({d.serial_number})</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">Tipo de Operación</label>
                        <select required className="w-full bg-slate-800 p-4 rounded-2xl border-none text-white text-sm font-bold" value={form.mission_type} onChange={e => setForm({...form, mission_type: e.target.value})}>
                            <option value="Operación Comercial">Operación Comercial</option>
                            <option value="Inspección Técnica">Inspección Técnica</option>
                            <option value="Vuelo de Entrenamiento">Vuelo de Entrenamiento</option>
                            <option value="Vuelo de Prueba/Mantenimiento">Vuelo de Prueba/Mantenimiento</option>
                            <option value="Emergencia/Búsqueda">Emergencia/Búsqueda</option>
                        </select>
                    </div>
                    <div className="md:col-span-2 grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-500 uppercase">Lugar de Operación</label>
                            <input required className="w-full bg-slate-800 p-4 rounded-2xl border-none text-white text-sm font-bold" placeholder="Ej: Zona Norte Hangar 2" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-500 uppercase">Fecha Programada</label>
                            <input required type="date" className="w-full bg-slate-800 p-4 rounded-2xl border-none text-white text-sm font-bold uppercase" value={form.scheduled_at} onChange={e => setForm({...form, scheduled_at: e.target.value})} />
                        </div>
                    </div>
                    <button type="submit" disabled={saving} className="bg-orange-600 hover:bg-orange-700 text-white p-4 rounded-[1.5rem] font-black uppercase text-xs shadow-xl active:scale-95 transition-all">
                        {saving ? '...' : 'EMITIR ORDEN'}
                    </button>
                </form>
            </section>

            {/* TABLA DE ÓRDENES EMITIDAS */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400"><tr className="border-b"><th className="p-5">Orden</th><th className="p-5">Tripulación / Equipo</th><th className="p-5">Tipo</th><th className="p-5">Estado</th></tr></thead>
                    <tbody className="divide-y text-sm">
                        {missions.map(m => (
                            <tr key={m.id} className="hover:bg-slate-50">
                                <td className="p-5 font-black text-orange-600 font-mono">{m.mission_id}</td>
                                <td className="p-5"><b>{m.pilots?.name}</b><br/><span className="text-[10px] text-slate-400 uppercase">{m.aircraft?.model}</span></td>
                                <td className="p-5 font-bold text-slate-500">{m.mission_type}</td>
                                <td className="p-5">
                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${m.status === 'realizado' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>{m.status}</span>
                                </td>
                                {/* BOTÓN DE EDICIÓN */}
                                <td className="p-5 text-right">
                                    <button 
                                        onClick={() => setEditingMission(m)}
                                        className="material-symbols-outlined text-slate-300 hover:text-orange-600 transition-colors"
                                    >
                                        edit_square
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
       {editingMission && missions.length > 0 && (
    <div className="fixed inset-0 z-[200] flex justify-end">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditingMission(null)} />
        <EditAuthorizationPanel 
            mission={editingMission} 
            pilots={pilots} 
            drones={drones} 
            onClose={() => setEditingMission(null)} 
            onSuccess={() => { 
                setEditingMission(null); 
                loadData(); 
            }} 
        />
    </div>
)}