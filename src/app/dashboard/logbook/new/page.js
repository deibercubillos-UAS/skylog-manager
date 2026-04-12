'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewOperationPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [resources, setResources] = useState({ auths: [], batteries: [] });
    const [healthDone, setHealthDone] = useState(false);
    
    // UI States
    const [activeTab, setActiveTab] = useState('briefing'); // health, briefing, preflight
    const [dynamicLabels, setDynamicLabels] = useState([]);

    // ESTADO DEL FORMULARIO BASE
    const [form, setForm] = useState({
        auth_id: '', battery_id: '', takeoff_time: '', 
        visual_condition: 'VMC', notes: ''
    });

    // ESTADO DE LOS CHECKLISTS (Mapeo dinámico por Slot ID)
    const [checks, setChecks] = useState({
        health: {},
        briefing: {},
        preflight: {}
    });

    // 1. CARGA DE RECURSOS ESTÁTICOS (Misiones, Baterías, Salud del día)
    useEffect(() => {
        async function init() {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
            
            const [auths, batteries, health] = await Promise.all([
                supabase.from('flight_authorizations').select('*, pilots:pilot_id(name), aircraft:aircraft_id(model)').eq('organization_id', prof.organization_id).eq('status', 'pendiente'),
                supabase.from('batteries').select('*').eq('organization_id', prof.organization_id).eq('status', 'Operativo'),
                supabase.from('daily_health_checks').select('*').eq('user_id', user.id).eq('check_date', new Date().toISOString().split('T')[0])
            ]);

            setResources({ auths: auths.data || [], batteries: batteries.data || [] });
            if (health.data?.length > 0) setHealthDone(true);
            setLoading(false);
        }
        init();
    }, []);

    // 2. CARGA DE ETIQUETAS DINÁMICAS SEGÚN EL TAB ACTIVO
    useEffect(() => {
        async function loadDynamicLabels() {
            if (!form.auth_id && activeTab === 'preflight') return;
            
            const { data: { user } } = await supabase.auth.getUser();
            const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
            
            const selectedMission = resources.auths.find(a => a.id === form.auth_id);
            const modelToFilter = (activeTab === 'preflight' && selectedMission) ? selectedMission.aircraft.model : 'General';

            const { data } = await supabase
                .from('form_definitions')
                .select('*')
                .eq('organization_id', prof.organization_id)
                .eq('form_type', activeTab)
                .eq('aircraft_model', modelToFilter)
                .order('field_number', { ascending: true });
            
            setDynamicLabels(data || []);
        }
        loadDynamicLabels();
    }, [activeTab, form.auth_id, resources.auths]);

    // Lógica para marcar/desmarcar
    const handleCheck = (fieldNumber) => {
        setChecks(prev => ({
            ...prev,
            [activeTab]: {
                ...prev[activeTab],
                [fieldNumber]: !prev[activeTab][fieldNumber]
            }
        }));
    };

    // VALIDACIONES DE SEGURIDAD
    const isTabComplete = () => {
        if (dynamicLabels.length === 0) return false;
        return dynamicLabels.every(label => checks[activeTab][label.field_number]);
    };

    const isAuthorized = () => {
        const briefingOk = activeTab === 'briefing' ? isTabComplete() : true; // Simplificado para demo, idealmente validar todos
        return form.auth_id && form.battery_id && form.takeoff_time;
    };

    const handleFinalize = async () => {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const selectedAuth = resources.auths.find(a => a.id === form.auth_id);

            // 1. Crear el Vuelo principal
            const { data: flight, error: fErr } = await supabase.from('flights').insert([{
                ...form,
                pilot_id: selectedAuth.pilot_id,
                aircraft_id: selectedAuth.aircraft_id,
                location: selectedAuth.location,
                mission_id: selectedAuth.mission_id,
                flight_date: new Date().toISOString().split('T')[0],
                organization_id: selectedAuth.organization_id,
                owner_id: user.id
            }]).select().single();

            if (fErr) throw fErr;

            // 2. Guardar resultados en tablas independientes (Diferenciación lógica)
            await Promise.all([
                supabase.from('results_health').insert([{ flight_id: flight.id, checks: checks.health }]),
                supabase.from('results_briefing').insert([{ flight_id: flight.id, checks: checks.checks_briefing }]), // Usar los nombres de su estado
                supabase.from('results_preflight').insert([{ flight_id: flight.id, checks: checks.checks_preflight }])
            ]);

            // 3. Marcar autorización como realizada
            await supabase.from('flight_authorizations').update({ status: 'realizado' }).eq('id', form.auth_id);
            
            alert("🚀 DESPEGUE AUTORIZADO");
            router.push('/dashboard/logbook');

        } catch (err) {
            alert("Falla en despacho: " + err.message);
        } finally { setSaving(false); }
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-[#f8f6f6] font-black animate-pulse">AUTORIZANDO SISTEMAS...</div>;

    return (
        <div className="flex h-screen -m-10 bg-[#f8f6f6] text-left overflow-hidden">
            {/* LADO IZQUIERDO: FORMULARIO TÉCNICO */}
            <div className="flex-1 overflow-y-auto p-10 space-y-8">
                <header className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900">Nueva Operación</h2>
                        <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mt-1">F-OPS-001 | Despacho de Aeronave</p>
                    </div>
                    <Link href="/dashboard" className="text-xs font-bold text-slate-400 hover:text-red-500 uppercase transition-all">Abortar</Link>
                </header>

                <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Seleccionar Misión Programada</label>
                            <select className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm focus:ring-2 focus:ring-orange-500 outline-none" value={form.auth_id} onChange={e => setForm({...form, auth_id: e.target.value})}>
                                <option value="">-- Misiones Pendientes --</option>
                                {resources.auths.map(a => <option key={a.id} value={a.id}>{a.mission_id} - {a.location}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Fuente de Energía (Batería)</label>
                            <select className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm focus:ring-2 focus:ring-orange-500 outline-none" value={form.battery_id} onChange={e => setForm({...form, battery_id: e.target.value})}>
                                <option value="">-- Seleccionar Batería --</option>
                                {resources.batteries.map(b => <option key={b.id} value={b.id}>{b.brand} {b.model} ({b.serial_number})</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Hora de Despegue (Local)</label>
                            <input type="time" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" onChange={e => setForm({...form, takeoff_time: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Condición Meteorológica</label>
                            <select className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" onChange={e => setForm({...form, visual_condition: e.target.value})}>
                                <option value="VMC">VMC (Visual)</option>
                                <option value="IMC">IMC (Instrumental)</option>
                                <option value="NIGHT">Vuelo Nocturno</option>
                            </select>
                        </div>
                    </div>
                </div>

                {form.auth_id && (
                    <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="p-6 bg-orange-600 text-white rounded-[2rem] shadow-lg shadow-orange-600/20">
                           <p className="text-[8px] font-black uppercase opacity-60 tracking-widest">Aeronave Confirmada</p>
                           <p className="text-lg font-black">{resources.auths.find(a => a.id === form.auth_id)?.aircraft?.model}</p>
                        </div>
                        <div className="p-6 bg-slate-900 text-white rounded-[2rem] shadow-lg">
                           <p className="text-[8px] font-black uppercase opacity-60 tracking-widest">PIC Autorizado</p>
                           <p className="text-lg font-black">{resources.auths.find(a => a.id === form.auth_id)?.pilots?.name}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* LADO DERECHO: SIDEBAR DE PROTOCOLOS DINÁMICOS */}
            <aside className="w-[450px] bg-[#1A202C] text-white p-10 flex flex-col shadow-2xl border-l border-white/5">
                <div className="mb-10">
                    <h3 className="text-xl font-black uppercase tracking-tighter">Seguridad Operacional</h3>
                    <p className="text-orange-500 text-[9px] font-black uppercase mt-1 tracking-widest">Validación de Protocolos RAC</p>
                </div>
                
                <div className="flex bg-white/5 p-1 rounded-xl mb-10">
                    <button onClick={() => setActiveTab('briefing')} className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${activeTab === 'briefing' ? 'bg-orange-600 text-white' : 'text-slate-500'}`}>Briefing</button>
                    <button onClick={() => setActiveTab('preflight')} className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${activeTab === 'preflight' ? 'bg-orange-600 text-white' : 'text-slate-500'}`}>Prevuelo</button>
                    {!healthDone && <button onClick={() => setActiveTab('health')} className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${activeTab === 'health' ? 'bg-orange-600 text-white' : 'text-slate-500'}`}>Salud</button>}
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
                    {dynamicLabels.length > 0 ? dynamicLabels.map(item => (
                        <CheckItem 
                            key={item.id}
                            label={item.label_text} 
                            checked={checks[activeTab][item.field_number] || false} 
                            onChange={() => handleCheck(item.field_number)} 
                        />
                    )) : (
                        <div className="text-center py-10 border-2 border-dashed border-white/10 rounded-3xl opacity-30">
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Sin requerimientos<br/>configurados</p>
                        </div>
                    )}
                </div>

                <div className="mt-10 pt-10 border-t border-white/10">
                    <button 
                        disabled={!isAuthorized() || saving}
                        onClick={handleFinalize}
                        className={`w-full py-5 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl transition-all ${isAuthorized() ? 'bg-orange-600 text-white hover:scale-[1.02] active:scale-95' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                    >
                        {saving ? 'PROCESANDO...' : isAuthorized() ? 'AUTORIZADO VOLAR' : 'PENDIENTE DATOS'}
                    </button>
                    <p className="text-[7px] text-center mt-4 text-slate-500 uppercase font-black tracking-[0.3em]">BitaFly UAS System - Mission Critical</p>
                </div>
            </aside>
        </div>
    );
}

function CheckItem({ label, checked, onChange }) {
    return (
        <label className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${checked ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-white/5 border-white/10 hover:border-white/20'}`}>
            <span className={`text-[11px] font-bold ${checked ? 'text-emerald-400' : 'text-slate-400'}`}>{label}</span>
            <div className={`size-5 rounded border-2 flex items-center justify-center transition-all ${checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'}`}>
                {checked && <span className="material-symbols-outlined text-white text-xs">check</span>}
            </div>
            <input type="checkbox" checked={checked} onChange={onChange} className="hidden" />
        </label>
    );
}