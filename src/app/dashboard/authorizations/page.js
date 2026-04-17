'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import EditAuthorizationPanel from '@/components/EditAuthorizationPanel';
import HelpTooltip from '@/components/HelpTooltip';

export default function MissionControlPage() {
    // --- 1. ESTADOS DE NAVEGACIÓN Y CARGA ---
    const [activeTab, setActiveTab] = useState('basica');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [missions, setMissions] = useState([]);
    const [pilots, setPilots] = useState([]);
    const [drones, setDrones] = useState([]);
    const [org, setOrg] = useState(null);
    const [editingMission, setEditingMission] = useState(null);

    // --- 2. ESTADO: PROGRAMACIÓN BÁSICA ---
    const [form, setForm] = useState({ 
        pilot_id: '', aircraft_id: '', location: '', 
        scheduled_at: '', mission_type: 'Operación Comercial' 
    });

    // --- 3. ESTADO: FORMULARIO AEROCIVIL (SECCIONES 3 Y 4) ---
    const [aeroForm, setAeroForm] = useState({
        op_types: [],
        client: '',
        start_date: '',
        end_date: '',
        start_time: '',
        end_time: '',
        mtow: '',
        municipality: '',
        department: '',
        cronogram_details: ''
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
            console.error("Falla de Mando:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    // --- LÓGICA DE VALIDACIÓN TÉCNICA (BÁSICA) ---
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

    // --- LÓGICA DE ACCIONES ---
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

    const toggleOpType = (id) => {
        setAeroForm(prev => ({
            ...prev,
            op_types: prev.op_types.includes(id) ? prev.op_types.filter(t => t !== id) : [...prev.op_types, id]
        }));
    };

    if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400">CARGANDO TORRE DE CONTROL...</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-8 text-left pb-32 animate-in fade-in duration-500">
            
            {/* CABECERA Y SWITCHER */}
            <header className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 leading-none">Mando y Control</h2>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2">Nomenclatura: {org?.flight_prefix}</p>
                </div>
                <div className="flex bg-slate-200/50 p-1.5 rounded-[1.5rem] shadow-inner">
                    <button onClick={() => setActiveTab('basica')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'basica' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}>Programación Básica</button>
                    <button onClick={() => setActiveTab('aerocivil')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'aerocivil' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}>Formato 100 Aerocivil</button>
                </div>
            </header>

            {/* --- CONTENIDO 01: PROGRAMACIÓN BÁSICA --- */}
            {activeTab === 'basica' && (
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
                                <tr><th className="p-5">Orden</th><th className="p-5">PIC / UAS</th><th className="p-5">Estado</th><th className="p-5 text-right">Acción</th></tr>
                            </thead>
                            <tbody className="divide-y text-sm">
                                {missions.map(m => (
                                    <tr key={m.id} className="hover:bg-slate-50 transition-all">
                                        <td className="p-5 font-black text-orange-600 font-mono">{m.mission_id}</td>
                                        <td className="p-5"><b>{m.pilots?.name}</b><br/><span className="text-[10px] text-slate-400 uppercase">{m.aircraft?.model}</span></td>
                                        <td className="p-5">
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${m.status === 'realizado' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'}`}>
                                                {m.status}
                                            </span>
                                        </td>
                                        <td className="p-5 text-right space-x-2">
                                            <button onClick={() => setEditingMission(m)} className="material-symbols-outlined text-slate-300 hover:text-orange-600">edit_square</button>
                                            <button onClick={() => updateStatus(m.id, 'realizado')} className="material-symbols-outlined text-emerald-500 hover:scale-110 transition-all">check_circle</button>
                                            <button onClick={() => updateStatus(m.id, 'cancelado')} className="material-symbols-outlined text-red-400 hover:scale-110 transition-all">cancel</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* --- CONTENIDO 02: PROGRAMACIÓN AEROCIVIL --- */}
            {activeTab === 'aerocivil' && (
                <div className="space-y-10 animate-in slide-in-from-right duration-500">
                    <div className="bg-slate-900 p-8 rounded-[3rem] text-white flex justify-between items-center border-l-8 border-orange-600 shadow-2xl">
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tight">Formato 100</h3>
                            <p className="text-orange-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Solicitud de Autorización UAS - UAEAC</p>
                        </div>
                        <div className="size-14 bg-white/5 rounded-2xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-4xl text-orange-500">gavel</span>
                        </div>
                    </div>

                    {/* SECCIÓN 3: TIPO DE OPERACIÓN */}
                    <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                        <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center px-8">
                            <h4 className="font-black text-slate-900 uppercase text-[11px] tracking-widest">3. TIPO DE OPERACIÓN AÉREA</h4>
                            <HelpTooltip text="Marque los tipos de operación autorizados por la UAEAC acorde a su registro mercantil." />
                        </div>
                        <div className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <OpCard label="Simple captura de imágenes o datos." selected={aeroForm.op_types.includes('simple')} onClick={() => toggleOpType('simple')} />
                                <OpCard label="Captura con fines de vigilancia y seguridad privada." selected={aeroForm.op_types.includes('vigilancia')} onClick={() => toggleOpType('vigilancia')} />
                                <OpCard label="Captura para medios masivos de comunicación." selected={aeroForm.op_types.includes('medios')} onClick={() => toggleOpType('medios')} />
                                <OpCard label="Aspersión." selected={aeroForm.op_types.includes('aspersion')} onClick={() => toggleOpType('aspersion')} />
                                <OpCard label="Dispersión." selected={aeroForm.op_types.includes('dispersion')} onClick={() => toggleOpType('dispersion')} />
                                <OpCard label="Enjambre." selected={aeroForm.op_types.includes('enjambre')} onClick={() => toggleOpType('enjambre')} />
                                <OpCard label="Transporte de carga ('Drone Delivery')." selected={aeroForm.op_types.includes('carga')} onClick={() => toggleOpType('carga')} />
                                <OpCard label="Instrucción." selected={aeroForm.op_types.includes('instruccion')} onClick={() => toggleOpType('instruccion')} />
                                <div className="md:col-span-2">
                                    <OpCard label="Actividades misionales de entidades públicas." selected={aeroForm.op_types.includes('misiones_publicas')} onClick={() => toggleOpType('misiones_publicas')} />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* SECCIÓN 4: INFORMACIÓN DE LA OPERACIÓN */}
                    {/* FILA 5: UBICACIÓN GEOGRÁFICA (API COLOMBIA) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Departamento</label>
                            <select 
                                className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-xs focus:ring-2 focus:ring-orange-500 outline-none appearance-none"
                                value={aeroForm.department}
                                onChange={e => handleDeptChange(e.target.value)}
                            >
                                <option value="">-- Seleccionar Departamento --</option>
                                {departments.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Municipio</label>
                            <select 
                                disabled={!aeroForm.department}
                                className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-xs focus:ring-2 focus:ring-orange-500 outline-none appearance-none disabled:opacity-50"
                                value={aeroForm.municipality}
                                onChange={e => setAeroForm({...aeroForm, municipality: e.target.value})}
                            >
                                <option value="">-- Seleccionar Municipio --</option>
                                {filteredMunicipios.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            )}

            {/* PANEL DE EDICIÓN (BÁSICO) */}
            {editingMission && (
                <div className="fixed inset-0 z-[200] flex justify-end">
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditingMission(null)} />
                    <EditAuthorizationPanel mission={editingMission} pilots={pilots} drones={drones} onClose={() => setEditingMission(null)} onSuccess={() => { setEditingMission(null); loadData(); }} />
                </div>
            )}
        </div>
    );
}

// --- ZONA DE COMPONENTES AUXILIARES (DEFINIDOS FUERA PARA ESTABILIDAD) ---
function StatusBox({ status, title, defaultMsg }) {
    const baseClass = "p-4 rounded-2xl border transition-all";
    if (!status) return (
        <div className={`${baseClass} border-white/10 bg-white/5`}>
            <p className="text-[8px] font-black uppercase text-slate-500">{title}</p>
            <p className="text-[10px] font-bold mt-1 text-slate-400">{defaultMsg}</p>
        </div>
    );
    return (
        <div className={`${baseClass} ${status.type === 'ERROR' ? 'bg-red-500/20 border-red-500' : status.type === 'WARN' ? 'bg-orange-500/20 border-orange-500' : 'bg-emerald-500/20 border-emerald-500'}`}>
            <p className="text-[8px] font-black uppercase text-white opacity-60">{title}</p>
            <p className="text-[10px] font-bold mt-1 text-white">{status.msg}</p>
        </div>
    );
}

function OpCard({ label, selected, onClick }) {
    return (
        <button type="button" onClick={onClick} className={`w-full flex items-center justify-between p-5 rounded-[1.5rem] border-2 transition-all text-left ${selected ? 'border-orange-500 bg-orange-50/50 shadow-md' : 'border-slate-100 bg-slate-50/30 hover:border-slate-200'}`}>
            <span className={`text-[10px] font-black uppercase ${selected ? 'text-orange-700' : 'text-slate-500'}`}>{label}</span>
            <div className={`size-6 rounded-lg border-2 flex items-center justify-center shrink-0 ${selected ? 'bg-orange-500 border-orange-500 shadow-sm' : 'border-slate-300 bg-white'}`}>
                {selected && <span className="material-symbols-outlined text-white text-base">check</span>}
            </div>
        </button>
    );
}

function InputCol({ label, placeholder, type = "text", value, onChange }) {
    return (
        <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">{label}</label>
            <input type={type} className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-xs focus:ring-2 focus:ring-orange-500 outline-none" placeholder={placeholder} value={value} onChange={onChange} />
        </div>
    );
}