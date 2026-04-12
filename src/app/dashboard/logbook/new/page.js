'use client';
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
    const [activeTab, setActiveTab] = useState('briefing');
    
    // ESTADO DEL FORMULARIO
    const [form, setForm] = useState({
        auth_id: '', battery_id: '', takeoff_time: '', 
        visual_condition: 'VMC', notes: ''
    });

    // ESTADO DE LOS CHECKLISTS
    const [checks, setChecks] = useState({
        briefing: { weather: false, terrain: false, safety: false },
        preflight: { power: false, motors: false, link: false, gps: false },
        health: { no_meds: false, rested: false, ready: false }
    });

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

    // VALIDACIONES DE SEGURIDAD
    const isBriefingOk = Object.values(checks.briefing).every(v => v);
    const isPreflightOk = Object.values(checks.preflight).every(v => v);
    const isHealthOk = healthDone || Object.values(checks.health).every(v => v);
    const isAuthorized = isBriefingOk && isPreflightOk && isHealthOk && form.auth_id && form.battery_id && form.takeoff_time;

    const handleFinalize = async () => {
        if (!isAuthorized) return;
        setSaving(true);
        try {
            const selectedAuth = resources.auths.find(a => a.id === form.auth_id);
            const { data: { user } } = await supabase.auth.getUser();
            
            // 1. Guardar Salud si no estaba hecha
            if (!healthDone) {
                await supabase.from('daily_health_checks').insert([{ user_id: user.id, organization_id: selectedAuth.organization_id }]);
            }

            // 2. Registrar Vuelo
            const { error: fErr } = await supabase.from('flights').insert([{
                ...form,
                pilot_id: selectedAuth.pilot_id,
                aircraft_id: selectedAuth.aircraft_id,
                location: selectedAuth.location,
                mission_id: selectedAuth.mission_id,
                flight_date: new Date().toISOString().split('T')[0],
                organization_id: selectedAuth.organization_id,
                owner_id: user.id
            }]);

            if (!fErr) {
                await supabase.from('flight_authorizations').update({ status: 'realizado' }).eq('id', form.auth_id);
                alert("🚀 AUTORIZADO VOLAR: Bitácora generada.");
                router.push('/dashboard/logbook');
            }
        } finally { setSaving(false); }
    };

    if (loading) return <div className="p-20 text-center font-black animate-pulse">SISTEMAS PRE-VUELO...</div>;

    return (
        <div className="flex h-screen -m-10 bg-[#f8f6f6] text-left">
            <div className="flex-1 overflow-y-auto p-10 space-y-8">
                <header className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter">Nueva Operación</h2>
                        <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mt-1">F-OPS-001 | Preparación de Misión</p>
                    </div>
                    <Link href="/dashboard" className="text-xs font-bold text-slate-400 hover:text-red-500 uppercase">Abortar</Link>
                </header>

                {/* PASO 1: DATOS OPERATIVOS */}
                <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Misión Programada</label>
                            <select className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={form.auth_id} onChange={e => setForm({...form, auth_id: e.target.value})}>
                                <option value="">-- Seleccionar Orden de Vuelo --</option>
                                {resources.auths.map(a => <option key={a.id} value={a.id}>{a.mission_id} - {a.location}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Batería UAS</label>
                            <select className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={form.battery_id} onChange={e => setForm({...form, battery_id: e.target.value})}>
                                <option value="">-- Seleccionar Energía --</option>
                                {resources.batteries.map(b => <option key={b.id} value={b.id}>{b.brand} {b.model} ({b.serial_number})</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Hora de Despegue</label>
                            <input type="time" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" onChange={e => setForm({...form, takeoff_time: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Condición Visual</label>
                            <select className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" onChange={e => setForm({...form, visual_condition: e.target.value})}>
                                <option value="VMC">VMC (Visual)</option>
                                <option value="IMC">IMC (Instrumental)</option>
                                <option value="NIGHT">NOCTURNO</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* RESUMEN DE MISIÓN SELECCIONADA */}
                {form.auth_id && (
                    <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-500">
                        <div className="p-4 bg-orange-600 text-white rounded-2xl">
                           <p className="text-[8px] font-black uppercase opacity-60 tracking-widest">Aeronave Seleccionada</p>
                           <p className="text-sm font-black">{resources.auths.find(a => a.id === form.auth_id)?.aircraft?.model}</p>
                        </div>
                        <div className="p-4 bg-slate-900 text-white rounded-2xl">
                           <p className="text-[8px] font-black uppercase opacity-60 tracking-widest">Piloto al Mando</p>
                           <p className="text-sm font-black">{resources.auths.find(a => a.id === form.auth_id)?.pilots?.name}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* SIDEBAR DE PROTOCOLOS (MODO OSCURO) */}
            <aside className="w-[450px] bg-[#1A202C] text-white p-10 flex flex-col shadow-2xl overflow-y-auto custom-scrollbar">
                <h3 className="text-xl font-black uppercase tracking-tighter mb-8">Protocolos Operativos</h3>
                
                <div className="flex bg-white/5 p-1 rounded-xl mb-10">
                    <button onClick={() => setActiveTab('briefing')} className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${activeTab === 'briefing' ? 'bg-orange-600' : 'text-slate-500'}`}>Briefing</button>
                    <button onClick={() => setActiveTab('preflight')} className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${activeTab === 'preflight' ? 'bg-orange-600' : 'text-slate-500'}`}>Prevuelo</button>
                    {!healthDone && <button onClick={() => setActiveTab('health')} className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${activeTab === 'health' ? 'bg-orange-600' : 'text-slate-500'}`}>Salud</button>}
                </div>

                <div className="flex-1 space-y-4">
                    {activeTab === 'briefing' && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <CheckItem label="Meteorología dentro de límites" checked={checks.briefing.weather} onChange={() => setChecks({...checks, briefing: {...checks.briefing, weather: !checks.briefing.weather}})} />
                            <CheckItem label="Área de operaciones libre de obstáculos" checked={checks.briefing.terrain} onChange={() => setChecks({...checks, briefing: {...checks.briefing, terrain: !checks.briefing.terrain}})} />
                            <CheckItem label="Protocolo de emergencia socializado" checked={checks.briefing.safety} onChange={() => setChecks({...checks, briefing: {...checks.briefing, safety: !checks.briefing.safety}})} />
                        </div>
                    )}
                    {activeTab === 'preflight' && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <CheckItem label="Sistemas de energía al 100%" checked={checks.preflight.power} onChange={() => setChecks({...checks, preflight: {...checks.preflight, power: !checks.preflight.power}})} />
                            <CheckItem label="Hélices y motores sin daños" checked={checks.preflight.motors} onChange={() => setChecks({...checks, preflight: {...checks.preflight, motors: !checks.preflight.motors}})} />
                            <CheckItem label="Enlace de mando y control (RC) estable" checked={checks.preflight.link} onChange={() => setChecks({...checks, preflight: {...checks.preflight, link: !checks.preflight.link}})} />
                            <CheckItem label="GPS mínimo 12 satélites" checked={checks.preflight.gps} onChange={() => setChecks({...checks, preflight: {...checks.preflight, gps: !checks.preflight.gps}})} />
                        </div>
                    )}
                    {activeTab === 'health' && (
                        <div className="space-y-4 animate-in fade-in duration-300">
                            <CheckItem label="Sin consumo de medicamentos / alcohol" checked={checks.health.no_meds} onChange={() => setChecks({...checks, health: {...checks.health, no_meds: !checks.health.no_meds}})} />
                            <CheckItem label="Descanso mínimo de 8 horas" checked={checks.health.rested} onChange={() => setChecks({...checks, health: {...checks.health, rested: !checks.health.rested}})} />
                            <CheckItem label="En plenas condiciones físicas y mentales" checked={checks.health.ready} onChange={() => setChecks({...checks, health: {...checks.health, ready: !checks.health.ready}})} />
                        </div>
                    )}
                </div>

                <div className="mt-10 border-t border-white/10 pt-10">
                    <button 
                        disabled={!isAuthorized || saving}
                        onClick={handleFinalize}
                        className={`w-full py-5 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl transition-all ${isAuthorized ? 'bg-orange-600 text-white hover:scale-[1.02] active:scale-95' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                    >
                        {saving ? 'PROCESANDO...' : isAuthorized ? 'AUTORIZADO VOLAR' : 'COMPLETAR PASOS'}
                    </button>
                    <p className="text-[8px] text-center mt-4 text-slate-500 uppercase font-bold tracking-widest">La bitácora se cerrará al confirmar el aterrizaje</p>
                </div>
            </aside>
        </div>
    );
}

function CheckItem({ label, checked, onChange }) {
    return (
        <label className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${checked ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-white/5 border-white/10'}`}>
            <span className={`text-[11px] font-bold ${checked ? 'text-emerald-400' : 'text-slate-400'}`}>{label}</span>
            <input type="checkbox" checked={checked} onChange={onChange} className="size-5 rounded border-none text-orange-600 focus:ring-0" />
        </label>
    );
}