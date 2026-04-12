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
    
    // CONTROL DE FLUJO: 'data' -> 'health' -> 'preflight' -> 'briefing'
    const [step, setStep] = useState('data'); 
    const [dynamicLabels, setDynamicLabels] = useState([]);
    const [form, setForm] = useState({ auth_id: '', battery_id: '', takeoff_time: '', visual_condition: 'VMC', notes: '' });
    const [checks, setChecks] = useState({ health: {}, briefing: {}, preflight: {} });

    useEffect(() => {
        async function init() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
                const [auths, batteries, health] = await Promise.all([
                    supabase.from('flight_authorizations').select('*, pilots:pilot_id(name), aircraft:aircraft_id(model)').eq('organization_id', prof.organization_id).eq('status', 'pendiente'),
                    supabase.from('batteries').select('*').eq('organization_id', prof.organization_id).eq('status', 'Operativo'),
                    supabase.from('daily_health_checks').select('*').eq('user_id', user.id).eq('check_date', new Date().toISOString().split('T')[0])
                ]);
                setResources({ auths: auths.data || [], batteries: batteries.data || [] });
                if (health.data?.length > 0) setHealthDone(true);
            } finally { setLoading(false); }
        }
        init();
    }, []);

    // CARGA DE ETIQUETAS SEGÚN EL PASO ACTUAL
    useEffect(() => {
        async function loadLabels() {
            if (step === 'data') return;
            const { data: { user } } = await supabase.auth.getUser();
            const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
            const selectedMission = resources.auths.find(a => a.id === form.auth_id);
            const modelToFilter = (step === 'preflight' && selectedMission) ? selectedMission.aircraft.model : 'General';
            
            const { data } = await supabase.from('form_definitions').select('*').eq('organization_id', prof.organization_id).eq('form_type', step).eq('aircraft_model', modelToFilter).order('field_number', { ascending: true });
            setDynamicLabels(data || []);
        }
        loadLabels();
    }, [step, form.auth_id]);

    // SALTO AUTOMÁTICO DE TABS
    const handleCheck = (num) => {
        const newChecks = { ...checks[step], [num]: !checks[step][num] };
        setChecks(prev => ({ ...prev, [step]: newChecks }));

        // Verificar si completó todos los puntos actuales para saltar
        const isComplete = dynamicLabels.every(l => l.field_number === num ? !checks[step][num] : newChecks[l.field_number]);
        
        if (isComplete) {
            setTimeout(() => {
                if (step === 'health') setStep('preflight');
                else if (step === 'preflight') setStep('briefing');
            }, 600);
        }
    };

    const handleCancelMission = async () => {
        if (!confirm("¿CONFIRMA CANCELACIÓN DE LA MISIÓN?")) return;
        await supabase.from('flight_authorizations').update({ status: 'cancelado' }).eq('id', form.auth_id);
        router.push('/dashboard/authorizations');
    };

    const handleFinalize = async () => {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const selectedAuth = resources.auths.find(a => a.id === form.auth_id);
            const { data: flight } = await supabase.from('flights').insert([{ ...form, pilot_id: selectedAuth.pilot_id, aircraft_id: selectedAuth.aircraft_id, location: selectedAuth.location, mission_id: selectedAuth.mission_id, flight_date: new Date().toISOString().split('T')[0], organization_id: selectedAuth.organization_id, owner_id: user.id }]).select().single();
            await Promise.all([
                supabase.from('results_health').insert([{ flight_id: flight.id, checks: checks.health }]),
                supabase.from('results_briefing').insert([{ flight_id: flight.id, checks: checks.briefing }]),
                supabase.from('results_preflight').insert([{ flight_id: flight.id, checks: checks.preflight }]),
                supabase.from('flight_authorizations').update({ status: 'realizado' }).eq('id', form.auth_id)
            ]);
            if (!healthDone) await supabase.from('daily_health_checks').insert([{ user_id: user.id, organization_id: selectedAuth.organization_id }]);
            alert("🚀 AUTORIZADO VOLAR");
            router.push('/dashboard/logbook');
        } finally { setSaving(false); }
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-[#f8f6f6] font-black animate-pulse">CARGANDO PROTOCOLOS...</div>;

    return (
        <div className="fixed inset-0 bg-[#f8f6f6] z-[200] flex flex-col font-display text-left">
            {/* HEADER FIJO */}
            <header className="h-20 bg-white border-b flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="size-10 bg-orange-600 rounded-xl flex items-center justify-center text-white font-black">B</div>
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-tight">Despacho de Aeronave</h2>
                        <p className="text-[10px] font-bold text-orange-600 uppercase">{step === 'data' ? 'Fase 01: Operativa' : `Fase 02: ${step}`}</p>
                    </div>
                </div>
                <button onClick={() => router.back()} className="material-symbols-outlined text-slate-400">close</button>
            </header>

            <main className="flex-1 overflow-y-auto p-6 md:p-12">
                <div className="max-w-3xl mx-auto">
                    
                    {/* PASO 1: DATOS (Solo visible en step 'data') */}
                    {step === 'data' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 space-y-6">
                                <h3 className="text-lg font-black uppercase tracking-tighter">Configuración Inicial</h3>
                                <div className="grid gap-6">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Misión Programada</label>
                                        <select className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={form.auth_id} onChange={e => setForm({...form, auth_id: e.target.value})}>
                                            <option value="">-- Seleccionar Misión --</option>
                                            {resources.auths.map(a => <option key={a.id} value={a.id}>{a.mission_id} - {a.location}</option>)}
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Batería UAS</label>
                                        <select className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={form.battery_id} onChange={e => setForm({...form, battery_id: e.target.value})}>
                                            <option value="">-- Seleccionar Energía --</option>
                                            {resources.batteries.map(b => <option key={b.id} value={b.id}>{b.brand} {b.model} ({b.serial_number})</option>)}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Hora Despegue</label>
                                            <input type="time" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" onChange={e => setForm({...form, takeoff_time: e.target.value})} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Condición</label>
                                            <select className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" onChange={e => setForm({...form, visual_condition: e.target.value})}>
                                                <option value="VMC">VMC</option><option value="IMC">IMC</option><option value="NIGHT">NOCTURNO</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    disabled={!form.auth_id || !form.battery_id || !form.takeoff_time}
                                    onClick={() => setStep(healthDone ? 'preflight' : 'health')}
                                    className="w-full py-5 bg-orange-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl disabled:bg-slate-200"
                                >
                                    Siguiente: Protocolos de Seguridad
                                </button>
                            </div>
                        </div>
                    )}

                    {/* PASOS DE CHECKLIST (Full Screen Content) */}
                    {step !== 'data' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-right duration-500 pb-32">
                            <div className="flex items-center gap-4 mb-6">
                                <button onClick={() => setStep('data')} className="size-10 bg-white rounded-full flex items-center justify-center border text-slate-400"><span className="material-symbols-outlined">arrow_back</span></button>
                                <h3 className="text-2xl font-black uppercase tracking-tighter">Validación: {step.toUpperCase()}</h3>
                            </div>
                            
                            <div className="grid gap-4">
                                {dynamicLabels.map(item => (
                                    <CheckItem 
                                        key={item.id} 
                                        label={item.label_text} 
                                        checked={checks[step][item.field_number] || false} 
                                        onChange={() => handleCheck(item.field_number)} 
                                    />
                                ))}
                            </div>

                            {/* ACCIONES FINALES EN BRIEFING */}
                            {step === 'briefing' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12">
                                    <button onClick={handleCancelMission} className="py-5 bg-red-50 text-red-600 rounded-[2rem] font-black uppercase text-xs border border-red-100 hover:bg-red-600 hover:text-white transition-all">
                                        Vuelo Cancelado
                                    </button>
                                    <button 
                                        disabled={!dynamicLabels.every(l => checks.briefing[l.field_number]) || saving}
                                        onClick={handleFinalize}
                                        className="py-5 bg-emerald-600 text-white rounded-[2rem] font-black uppercase text-xs shadow-xl hover:bg-slate-900 transition-all active:scale-95"
                                    >
                                        Vuelo Aprobado
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

function CheckItem({ label, checked, onChange }) {
    return (
        <label className={`flex items-center justify-between p-6 rounded-[2rem] border-2 transition-all duration-300 cursor-pointer ${checked ? 'bg-emerald-50 border-emerald-500 scale-[1.02]' : 'bg-white border-slate-100 hover:border-orange-200'}`}>
            <span className={`text-sm md:text-base font-bold ${checked ? 'text-emerald-700' : 'text-slate-600'}`}>{label}</span>
            <div className={`size-8 rounded-full border-2 flex items-center justify-center shrink-0 ${checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-200'}`}>
                {checked && <span className="material-symbols-outlined text-white text-xl">check</span>}
            </div>
            <input type="checkbox" checked={checked} onChange={onChange} className="hidden" />
        </label>
    );
}