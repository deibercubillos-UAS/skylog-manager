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

    // --- 2. ESTADOS GEOGRÁFICOS (COLOMBIA API) ---
    const [colombiaData, setColombiaData] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [filteredMunicipios, setFilteredMunicipios] = useState([]);

    // --- 3. ESTADO: PROGRAMACIÓN BÁSICA ---
    const [form, setForm] = useState({ 
        pilot_id: '', aircraft_id: '', location: '', 
        scheduled_at: '', mission_type: 'Operación Comercial' 
    });

    // --- 4. ESTADO: FORMULARIO AEROCIVIL (SECCIONES 3 Y 4) ---
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

    // --- 5. CARGA DE DATOS OPERATIVOS Y GEOGRÁFICOS ---
    const loadData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: prof } = await supabase.from('profiles').select('organization_id, role').eq('id', user.id).single();

            const [mRes, pRes, dRes, oRes, geoRes] = await Promise.all([
                fetch('/api/flights/authorize'),
                supabase.from('pilots').select('*').eq('organization_id', prof.organization_id).eq('is_active', true),
                supabase.from('aircraft').select('*').eq('organization_id', prof.organization_id).eq('status', 'Operativo'),
                supabase.from('organizations').select('*').eq('id', prof.organization_id).single(),
                fetch('https://www.datos.gov.co/resource/xdk5-pm3f.json?$limit=1200') // API Municipios
            ]);
            
            setMissions(await mRes.json());
            setPilots(pRes.data || []);
            setDrones(dRes.data || []);
            setOrg(oRes.data);

            const geoData = await geoRes.json();
            setColombiaData(geoData);
            const uniqueDepts = [...new Set(geoData.map(item => item.departamento))].sort();
            setDepartments(uniqueDepts);

        } catch (err) {
            console.error("Falla de Mando:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

    // --- 6. LÓGICA GEOGRÁFICA ---
    const handleDeptChange = (deptName) => {
        setAeroForm({ ...aeroForm, department: deptName, municipality: '' });
        const filtered = colombiaData
            .filter(item => item.departamento === deptName)
            .map(item => item.municipio)
            .sort();
        setFilteredMunicipios(filtered);
    };

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

    const handleAuthorize = async (e) => {
        e.preventDefault();
        if (getPilotStatus()?.type === 'ERROR' || getDroneStatus()?.type === 'ERROR') return alert("🚫 BLOQUEO: Elementos vencidos");
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

    if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400 uppercase">INICIALIZANDO TORRE DE CONTROL...</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-8 text-left pb-32 animate-in fade-in duration-500">
            
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

            {activeTab === 'basica' ? (
                <div className="space-y-8 animate-in slide-in-from-left">
                    <section className="bg-[#1A202C] p-10 rounded-[3rem] text-white shadow-2xl space-y-8 border border-white/5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <StatusBox status={getPilotStatus()} title="Estatus Piloto" defaultMsg="Seleccione PIC" />
                            <StatusBox status={getDroneStatus()} title="Estatus Aeronave" defaultMsg="Seleccione UAS" />
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
                                    {drones.map(d => <option key={d.id} value={d.id}>{d.model}</option>)}
                                </select>
                            </div>
                            <button type="submit" disabled={saving} className="bg-orange-600 hover:bg-orange-700 text-white p-4 rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all">
                                EMITIR ORDEN
                            </button>
                        </form>
                    </section>
                </div>
            ) : (
                <div className="space-y-10 animate-in slide-in-from-right">
                    {/* SECCIÓN 3 */}
                    <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                        <div className="bg-slate-50 border-b p-4 flex justify-between px-8">
                            <h4 className="font-black text-slate-900 uppercase text-[11px]">3. TIPO DE OPERACIÓN AÉREA</h4>
                            <HelpTooltip text="Marque los tipos de operación autorizados por la UAEAC." />
                        </div>
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <OpCard label="Simple captura de imágenes o datos." selected={aeroForm.op_types.includes('simple')} onClick={() => toggleOpType('simple')} />
                            <OpCard label="Vigilancia y Seguridad Privada." selected={aeroForm.op_types.includes('security')} onClick={() => toggleOpType('security')} />
                            <OpCard label="Medios masivos de comunicación." selected={aeroForm.op_types.includes('media')} onClick={() => toggleOpType('media')} />
                            <OpCard label="Aspersión." selected={aeroForm.op_types.includes('aspersion')} onClick={() => toggleOpType('aspersion')} />
                        </div>
                    </section>

                    {/* SECCIÓN 4 - CON SELECTORES GEOGRÁFICOS */}
                    <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden mt-8">
                        <div className="bg-slate-50 border-b p-4 flex justify-between px-8">
                            <h4 className="font-black text-slate-900 uppercase text-[11px]">4. INFORMACIÓN DE LA OPERACIÓN</h4>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputCol label="Empresa Contratante" placeholder="Nombre S.A.S" value={aeroForm.client} onChange={e => setAeroForm({...aeroForm, client: e.target.value})} />
                                <InputCol label="Peso Bruto Máximo (Kg)" type="number" placeholder="0.00" value={aeroForm.mtow} onChange={e => setAeroForm({...aeroForm, mtow: e.target.value})} />
                            </div>

                            {/* SELECTORES DE COLOMBIA */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Departamento</label>
                                    <select 
                                        className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-xs outline-none focus:ring-2 focus:ring-orange-500"
                                        value={aeroForm.department}
                                        onChange={e => handleDeptChange(e.target.value)}
                                    >
                                        <option value="">-- Seleccionar --</option>
                                        {departments.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Municipio</label>
                                    <select 
                                        disabled={!aeroForm.department}
                                        className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-xs outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                                        value={aeroForm.municipality}
                                        onChange={e => setAeroForm({...aeroForm, municipality: e.target.value})}
                                    >
                                        <option value="">-- Seleccionar --</option>
                                        {filteredMunicipios.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}

// --- COMPONENTES AUXILIARES ---
function InputCol({ label, placeholder, type = "text", value, onChange }) {
    return (
        <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">{label}</label>
            <input type={type} className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-xs focus:ring-2 focus:ring-orange-500 outline-none" placeholder={placeholder} value={value} onChange={onChange} />
        </div>
    );
}

function OpCard({ label, selected, onClick }) {
    return (
        <button type="button" onClick={onClick} className={`w-full flex items-center justify-between p-5 rounded-[1.5rem] border-2 transition-all text-left ${selected ? 'border-orange-500 bg-orange-50/50' : 'border-slate-100 bg-slate-50/30'}`}>
            <span className="text-[10px] font-black uppercase text-slate-500">{label}</span>
            <div className={`size-6 rounded-lg border-2 flex items-center justify-center ${selected ? 'bg-orange-500 border-orange-500' : 'border-slate-300'}`}>
                {selected && <span className="material-symbols-outlined text-white text-base">check</span>}
            </div>
        </button>
    );
}

function StatusBox({ status, title, defaultMsg }) {
    if (!status) return (
        <div className="p-4 rounded-2xl border border-white/10 bg-white/5 text-slate-500 text-[10px] font-bold uppercase">{title}: {defaultMsg}</div>
    );
    return (
        <div className={`p-4 rounded-2xl border ${status.type === 'ERROR' ? 'bg-red-500/20 border-red-500' : status.type === 'WARN' ? 'bg-orange-500/20 border-orange-500' : 'bg-emerald-500/20 border-emerald-500'}`}>
            <p className="text-[8px] font-black uppercase opacity-60 text-white">{title}</p>
            <p className="text-[10px] font-bold text-white uppercase">{status.msg}</p>
        </div>
    );
}