'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import EditAuthorizationPanel from '@/components/EditAuthorizationPanel';
import HelpTooltip from '@/components/HelpTooltip';

export default function MissionControlPage() {
    const [activeTab, setActiveTab] = useState('basica');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [missions, setMissions] = useState([]);
    const [pilots, setPilots] = useState([]);
    const [drones, setDrones] = useState([]);
    const [org, setOrg] = useState(null);
    const [editingMission, setEditingMission] = useState(null);

    const [form, setForm] = useState({ 
        pilot_id: '', aircraft_id: '', location: '', 
        scheduled_at: '', mission_type: 'Operación Comercial' 
    });

    const loadData = async () => {
        try {
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
        } catch (err) {
            console.error("Error cargando Torre de Control:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    // SEMÁFORO TÉCNICO
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

    if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400">CARGANDO MANDO CENTRAL...</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-8 text-left pb-32 animate-in fade-in duration-500">
            
            <header className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Programación</h2>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Prefijo: {org?.flight_prefix}</p>
                </div>
                <div className="flex bg-slate-200/50 p-1.5 rounded-[1.5rem] shadow-inner">
                    <button onClick={() => setActiveTab('basica')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'basica' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}>Operativa</button>
                    <button onClick={() => setActiveTab('aerocivil')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'aerocivil' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}>Formato 100</button>
                </div>
            </header>

            {activeTab === 'basica' ? (
                <div className="space-y-8 animate-in slide-in-from-left">
                    <section className="bg-[#1A202C] p-10 rounded-[3rem] text-white shadow-2xl border border-white/5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                            <StatusBox status={pStatus} title="Estatus Piloto" defaultMsg="Seleccione PIC" />
                            <StatusBox status={dStatus} title="Estatus Aeronave" defaultMsg="Seleccione UAS" />
                        </div>
                        <form onSubmit={handleAuthorize} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-500 uppercase">Piloto al Mando</label>
                                <select required className="w-full bg-slate-800 p-4 rounded-2xl border-none text-white text-sm font-bold" value={form.pilot_id} onChange={e => setForm({...form, pilot_id: e.target.value})}>
                                    <option value="">Seleccionar...</option>
                                    {pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-500 uppercase">Aeronave (UAS)</label>
                                <select required className="w-full bg-slate-800 p-4 rounded-2xl border-none text-white text-sm font-bold" value={form.aircraft_id} onChange={e => setForm({...form, aircraft_id: e.target.value})}>
                                    <option value="">Seleccionar...</option>
                                    {drones.map(d => <option key={d.id} value={d.id}>{d.model}</option>)}
                                </select>
                            </div>
                            <button type="submit" disabled={saving} className="bg-orange-600 hover:bg-orange-700 text-white p-4 rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all">
                                {saving ? 'SINCRO...' : 'EMITIR ORDEN'}
                            </button>
                        </form>
                    </section>
                </div>
            ) : (
                <div className="space-y-10 animate-in slide-in-from-right">
                    {/* FORMATO 100 UAEAC */}
                    <div className="bg-slate-900 p-8 rounded-[3rem] text-white flex justify-between items-center border-l-8 border-orange-600 shadow-xl">
                        <div>
                            <h3 className="text-2xl font-black uppercase">Solicitud UAEAC</h3>
                            <p className="text-orange-500 text-[10px] font-black uppercase tracking-widest">Protocolo Normativo Formato 100</p>
                        </div>
                        <HelpTooltip text="Cumpla con la totalidad de datos técnicos para evitar devoluciones en el trámite ante la autoridad." />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                            <div className="flex items-center justify-between border-b pb-4">
                                <h4 className="font-black text-slate-900 uppercase text-xs">3. Tipo de Operación Aérea</h4>
                                <HelpTooltip text="Seleccione los tipos de operación autorizados en su manual de operaciones." />
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                <CheckOption label="Simple captura de imágenes o datos" />
                                <CheckOption label="Vigilancia y Seguridad Privada" />
                                <CheckOption label="Aspersión / Dispersión" />
                                <CheckOption label="Instrucción / Entrenamiento" />
                            </div>
                        </section>

                        <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                            <div className="flex items-center justify-between border-b pb-4">
                                <h4 className="font-black text-slate-900 uppercase text-xs">4. Detalles de Misión</h4>
                                <HelpTooltip text="Incluya pesos brutos y ubicación exacta para el despacho." />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputCol label="Empresa Contratante" placeholder="Cliente S.A.S" />
                                <InputCol label="Peso Bruto Máximo (Kg)" placeholder="0.00" type="number" />
                                <InputCol label="Municipio" placeholder="Ej: Bogotá" />
                                <InputCol label="Departamento" placeholder="Ej: Cundinamarca" />
                            </div>
                        </section>
                    </div>

                    <section className="bg-[#1A202C] p-10 rounded-[3rem] text-white space-y-8 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <h4 className="font-black uppercase text-sm text-orange-500 tracking-widest">11. Coordenadas WGS-84</h4>
                            <HelpTooltip text="Ingrese las coordenadas en formato grados, minutos y segundos." />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <InputCol label="Punto de Referencia" placeholder="Item 1" isDark />
                            {/* FIX: Se eliminó el escape de barra invertida conflictivo */}
                            <InputCol label="Latitud" placeholder={"00°00'00\"N"} isDark />
                            <InputCol label="Longitud" placeholder={"00°00'00\"W"} isDark />
                        </div>
                        <button className="text-[10px] font-black text-orange-500 uppercase">+ Añadir Vértice Geográfico</button>
                    </section>

                    <button className="w-full py-6 bg-orange-600 text-white font-black rounded-[2rem] shadow-xl uppercase text-xs tracking-widest hover:bg-slate-900 transition-all">
                        Generar Solicitud de Autorización (PDF)
                    </button>
                </div>
            )}
        </div>
    );
}

// COMPONENTES AUXILIARES
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
            <span className="text-[10px] font-bold text-slate-600 group-hover:text-slate-900 uppercase">{label}</span>
        </label>
    );
}

function InputCol({ label, placeholder, type = "text", isDark = false }) {
    return (
        <div className="space-y-1">
            <label className={`text-[9px] font-black uppercase ml-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>{label}</label>
            <input type={type} className={`w-full p-3 rounded-xl border-none font-bold text-xs focus:ring-2 focus:ring-orange-500 ${isDark ? 'bg-slate-800 text-white' : 'bg-slate-50 text-slate-900'}`} placeholder={placeholder} />
        </div>
    );
}