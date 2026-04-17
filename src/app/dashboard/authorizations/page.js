'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import EditAuthorizationPanel from '@/components/EditAuthorizationPanel';
import HelpTooltip from '@/components/HelpTooltip'; // Asegúrese de que el archivo existe

export default function MissionControlPage() {
    const [activeTab, setActiveTab] = useState('basica');
    const [missions, setMissions] = useState([]);
    const [pilots, setPilots] = useState([]);
    const [drones, setDrones] = useState([]);
    const [org, setOrg] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editingMission, setEditingMission] = useState(null);
    const [userRole, setUserRole] = useState('');

    const [form, setForm] = useState({ 
        pilot_id: '', aircraft_id: '', location: '', 
        scheduled_at: '', mission_type: 'Operación Comercial' 
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

    // LOGICA DE VALIDACIÓN TÉCNICA
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
        const remaining = 200 - (currentHours - lastHours);
        if (remaining <= 0) return { type: 'ERROR', msg: 'MANTENIMIENTO REQUERIDO' };
        if (remaining <= 20) return { type: 'WARN', msg: `${remaining.toFixed(1)}H PARA SERVICIO` };
        return { type: 'OK', msg: 'AERONAVE OPERATIVA' };
    };

    const pStatus = getPilotStatus();
    const dStatus = getDroneStatus();

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
        } finally { setSaving(false); }
    };

    const updateStatus = async (id, newStatus) => {
        await supabase.from('flight_authorizations').update({ status: newStatus }).eq('id', id);
        loadData();
    };

    if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase">Estableciendo Frecuencia...</div>;

    return (
        <div className="max-w-6xl mx-auto space-y-8 text-left pb-20 animate-in fade-in duration-500">
            
            <header className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Programación</h2>
                    <p className="text-slate-500 text-[10px] font-black uppercase mt-1">Prefijo Actual: {org?.flight_prefix}</p>
                </div>

                <div className="flex bg-slate-200/50 p-1.5 rounded-[1.5rem] shadow-inner">
                    <button 
                        onClick={() => setActiveTab('basica')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'basica' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    > Programación Básica </button>
                    <button 
                        onClick={() => setActiveTab('aerocivil')}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'aerocivil' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    > Programación Aerocivil </button>
                </div>
            </header>

            {activeTab === 'basica' ? (
                <div className="space-y-8 animate-in slide-in-from-left duration-500">
                    <section className="bg-[#1A202C] p-10 rounded-[3rem] text-white shadow-2xl space-y-8 border border-white/5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <StatusBox status={pStatus} title="Estatus Piloto" defaultMsg="Seleccione PIC" />
                            <StatusBox status={dStatus} title="Estatus Aeronave" defaultMsg="Seleccione UAS" />
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
                                </select>
                            </div>
                            <div className="md:col-span-2 grid grid-cols-2 gap-4">
                                <input required className="w-full bg-slate-800 p-4 rounded-2xl border-none text-white text-sm font-bold" placeholder="Lugar de Operación" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
                                <input required type="date" className="w-full bg-slate-800 p-4 rounded-2xl border-none text-white text-sm font-bold" value={form.scheduled_at} onChange={e => setForm({...form, scheduled_at: e.target.value})} />
                            </div>
                            <button type="submit" disabled={saving} className="bg-orange-600 hover:bg-orange-700 text-white p-4 rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all">
                                {saving ? 'SINCRO...' : 'EMITIR ORDEN'}
                            </button>
                        </form>
                    </section>

                    <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
                                <tr><th className="p-5">Orden</th><th className="p-5">PIC / UAS</th><th className="p-5 text-right">Acción</th></tr>
                            </thead>
                            <tbody className="divide-y text-sm">
                                {missions.map(m => (
                                    <tr key={m.id} className="hover:bg-slate-50 transition-all">
                                        <td className="p-5 font-black text-orange-600 font-mono">{m.mission_id}</td>
                                        <td className="p-5"><b>{m.pilots?.name}</b><br/><span className="text-[10px] text-slate-400 uppercase">{m.aircraft?.model}</span></td>
                                        <td className="p-5 text-right space-x-2">
                                            <button onClick={() => setEditingMission(m)} className="material-symbols-outlined text-slate-300 hover:text-orange-600">edit_square</button>
                                            <button onClick={() => updateStatus(m.id, 'realizado')} className="material-symbols-outlined text-emerald-500">check_circle</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="space-y-6 animate-in slide-in-from-right duration-500">
                    <div className="bg-orange-600 p-8 rounded-[3rem] text-white flex justify-between items-center shadow-xl">
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter">Formato 100</h3>
                            <p className="text-[10px] font-black uppercase opacity-80 tracking-widest">Solicitud de Autorización Aerocivil</p>
                        </div>
                        <span className="material-symbols-outlined text-4xl opacity-50">gavel</span>
                    </div>

                    <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                        <div className="flex items-center">
                            <h4 className="font-black text-slate-900 uppercase text-sm">3. Tipo de Operación Aérea</h4>
                            <HelpTooltip text="Se marca con una equis (X) el tipo de operación aérea que se solicita acorde a lo autorizado por la UAEAC." />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <CheckOption label="Simple captura de imágenes o datos" />
                            <CheckOption label="Vigilancia y Seguridad Privada" />
                            <CheckOption label="Medios masivos de comunicación" />
                            <CheckOption label="Aspersión / Dispersión" />
                        </div>
                    </section>

                    <section className="bg-[#1A202C] p-8 rounded-[2.5rem] text-white space-y-6 shadow-xl">
                        <div className="flex items-center">
                            <h4 className="font-black uppercase text-sm text-orange-500">11. Coordenadas de la Operación</h4>
                            <HelpTooltip text="Coordenadas en formato WGS-84 (grados, minutos, segundos)." />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <input className="p-3 bg-slate-800 rounded-xl border-none text-[10px] font-mono text-white" placeholder="Item" />
                            <input className="p-3 bg-slate-800 rounded-xl border-none text-[10px] font-mono text-white" placeholder="Latitud (N/S)" />
                            <input className="p-3 bg-slate-800 rounded-xl border-none text-[10px] font-mono text-white" placeholder="Longitud (W)" />
                        </div>
                    </section>

                    <button className="w-full py-5 bg-slate-900 text-white font-black rounded-[2rem] shadow-2xl uppercase text-xs tracking-widest hover:bg-orange-600 transition-all">
                        Generar Solicitud PDF
                    </button>
                </div>
            )}

            {editingMission && (
                <div className="fixed inset-0 z-[200] flex justify-end">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditingMission(null)} />
                    <EditAuthorizationPanel 
                        mission={editingMission} pilots={pilots} drones={drones} 
                        onClose={() => setEditingMission(null)} 
                        onSuccess={() => { setEditingMission(null); loadData(); }} 
                    />
                </div>
            )}
        </div>
    );
}

// COMPONENTES AUXILIARES FUERA DEL RENDER
function StatusBox({ status, title, defaultMsg }) {
    return (
        <div className={`p-4 rounded-2xl border transition-all ${!status ? 'border-white/10' : status.type === 'ERROR' ? 'bg-red-500/20 border-red-500' : status.type === 'WARN' ? 'bg-orange-500/20 border-orange-500' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
            <p className="text-[8px] font-black uppercase text-slate-500">{title}</p>
            <p className="text-[10px] font-bold mt-1 uppercase">{status ? status.msg : defaultMsg}</p>
        </div>
    );
}

function CheckOption({ label }) {
    return (
        <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-orange-50 transition-all group border border-transparent hover:border-orange-200">
            <input type="checkbox" className="size-5 rounded border-slate-300 text-orange-600 focus:ring-0" />
            <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900 uppercase">{label}</span>
        </label>
    );
}