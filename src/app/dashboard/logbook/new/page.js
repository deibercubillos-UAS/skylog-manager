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
    
    // FLUJO: data -> health -> preflight -> briefing
    const [step, setStep] = useState('data'); 
    const [dynamicLabels, setDynamicLabels] = useState([]);
    const [form, setForm] = useState({ auth_id: '', battery_id: '', takeoff_time: '', visual_condition: 'VMC', notes: '' });
    const [checks, setChecks] = useState({ health: {}, briefing: {}, preflight: {} });

    // ESTADO CANCELACIÓN
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [cancelNotes, setCancelNotes] = useState('');

    useEffect(() => {
        async function init() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
                const [auths, batteries, health] = await Promise.all([
    supabase.from('flight_authorizations')
        .select('*, pilots:pilot_id(name), aircraft:aircraft_id(model)')
        .eq('organization_id', prof.organization_id)
        .eq('status', 'autorizado'), // <--- CAMBIO CLAVE: De 'pendiente' a 'autorizado'
    
    supabase.from('batteries')
        .select('*')
        .eq('organization_id', prof.organization_id)
        .eq('status', 'Operativo'),
        
    supabase.from('daily_health_checks')
        .select('*')
        .eq('user_id', user.id)
        .eq('check_date', new Date().toISOString().split('T')[0])
]);
                setResources({ auths: auths.data || [], batteries: batteries.data || [] });
                if (health.data?.length > 0) setHealthDone(true);
            } finally { setLoading(false); }
        }
        init();
    }, []);

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

    const handleCheck = (num, value) => {
        setChecks(prev => ({ ...prev, [step]: { ...prev[step], [num]: value } }));
    };

    const handleNextStep = () => {
        if (step === 'data') setStep(healthDone ? 'preflight' : 'health');
        else if (step === 'health') setStep('preflight');
        else if (step === 'preflight') setStep('briefing');
    };

    const confirmCancellation = async () => {
        if (!cancelNotes) return alert("Por favor ingrese las observaciones de cancelación.");
        setSaving(true);
        await supabase.from('flight_authorizations')
            .update({ status: 'cancelado', cancellation_notes: cancelNotes })
            .eq('id', form.auth_id);
        alert("🚫 MISIÓN CANCELADA");
        router.push('/dashboard/authorizations');
    };

    const handleFinalize = async () => {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const selectedAuth = resources.auths.find(a => a.id === form.auth_id);

            // INSERCIÓN CORREGIDA: Incluyendo mission_id
            const { data: flight, error: fErr } = await supabase.from('flights').insert([{ 
                ...form, // contiene battery_id, takeoff_time, etc.
                auth_id: selectedAuth.id, 
                pilot_id: selectedAuth.pilot_id, 
                aircraft_id: selectedAuth.aircraft_id, 
                location: selectedAuth.location, 
                mission_id: selectedAuth.mission_id, // <--- ESTO ASEGURA QUE APAREZCA EN LA BITÁCORA
                flight_date: new Date().toISOString().split('T')[0], 
                organization_id: selectedAuth.organization_id, 
                owner_id: user.id 
            }]).select().single();

            if (fErr) throw fErr;

            await Promise.all([
                supabase.from('results_health').insert([{ flight_id: flight.id, checks: checks.health }]),
                supabase.from('results_briefing').insert([{ flight_id: flight.id, checks: checks.briefing }]),
                supabase.from('results_preflight').insert([{ flight_id: flight.id, checks: checks.preflight }]),
                supabase.from('flight_authorizations').update({ status: 'realizado' }).eq('id', form.auth_id)
            ]);

            if (!healthDone) await supabase.from('daily_health_checks').insert([{ user_id: user.id, organization_id: selectedAuth.organization_id }]);
            
            alert("🟢 ¡AUTORIZADO VOLAR!");
            router.push(`/dashboard/logbook/finalize?id=${flight.id}`);
        } catch (err) {
            alert("Error: " + err.message);
        } finally { setSaving(false); }
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-[#f8f6f6] font-black animate-pulse">AUTORIZANDO...</div>;

    return (
        <div className="fixed inset-0 bg-[#f8f6f6] z-[200] flex flex-col font-display text-left">
            <header className="h-20 bg-white border-b flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="size-10 bg-orange-600 rounded-xl flex items-center justify-center text-white font-black">B</div>
                    <h2 className="text-sm font-black uppercase">Protocolo de Despacho</h2>
                </div>
                <button onClick={() => router.back()} className="material-symbols-outlined text-slate-400">close</button>
            </header>

            <main className="flex-1 overflow-y-auto p-6 md:p-12">
                <div className="max-w-3xl mx-auto space-y-8 pb-20">
                    {/* PASO 01: DATOS */}
                    {step === 'data' && (
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 space-y-6 animate-in slide-in-from-bottom">
                            <h3 className="text-lg font-black uppercase">01. Configuración de Operación</h3>
                            <div className="grid gap-6">
                                <select className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" value={form.auth_id} onChange={e => setForm({...form, auth_id: e.target.value})}>
                                    <option value="">-- Seleccionar Misión --</option>
                                    {resources.auths.map(a => <option key={a.id} value={a.id}>{a.mission_id} - {a.location}</option>)}
                                </select>
                                <select className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" value={form.battery_id} onChange={e => setForm({...form, battery_id: e.target.value})}>
                                    <option value="">-- Seleccionar Batería --</option>
                                    {resources.batteries.map(b => <option key={b.id} value={b.id}>{b.brand} {b.model} ({b.serial_number})</option>)}
                                </select>
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="time" className="p-4 bg-slate-50 rounded-2xl border-none font-bold" onChange={e => setForm({...form, takeoff_time: e.target.value})} />
                                    <select className="p-4 bg-slate-50 rounded-2xl border-none font-bold" onChange={e => setForm({...form, visual_condition: e.target.value})}>
                                        <option value="VMC">VMC</option><option value="IMC">IMC</option><option value="NIGHT">NOCTURNO</option>
                                    </select>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button disabled={!form.auth_id || !form.battery_id || !form.takeoff_time} onClick={handleNextStep} className="flex-1 py-5 bg-orange-600 text-white rounded-[2rem] font-black uppercase text-xs disabled:bg-slate-200 transition-all">Siguiente: Seguridad</button>
                                {form.auth_id && <button onClick={() => setShowCancelModal(true)} className="px-6 py-5 bg-red-50 text-red-600 rounded-[2rem] font-black uppercase text-[10px]">Cancelar</button>}
                            </div>
                        </div>
                    )}

                    {/* PASOS DE CHECKLIST */}
                    {step !== 'data' && (
                        <div className="space-y-8 animate-in slide-in-from-right">
                            <div className="flex justify-between items-center">
                                <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-800">Validación: {step.toUpperCase()}</h3>
                                <button onClick={() => setStep('data')} className="text-[10px] font-black text-slate-400 uppercase underline">Corregir Datos</button>
                            </div>
                            
                            <div className="grid gap-4">
                                {dynamicLabels.map(item => (
                                    <CheckItem key={item.id} label={item.label_text} value={checks[step][item.field_number]} onChange={(val) => handleCheck(item.field_number, val)} />
                                ))}
                            </div>

                            <div className="flex flex-col md:flex-row gap-4 mt-12">
                                <button onClick={() => setShowCancelModal(true)} className="flex-1 py-5 bg-red-50 text-red-600 rounded-[2rem] font-black uppercase text-xs border border-red-100">Vuelo Cancelado</button>
                                
                                {step !== 'briefing' ? (
                                    <button onClick={handleNextStep} className="flex-[2] py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-xs shadow-xl">Siguiente Protocolo</button>
                                ) : (
                                    <button 
                                        disabled={!dynamicLabels.every(l => checks.briefing[l.field_number] === true) || saving}
                                        onClick={handleFinalize}
                                        className="flex-[2] py-5 bg-emerald-600 text-white rounded-[2rem] font-black uppercase text-xs shadow-xl disabled:bg-slate-200"
                                    > Vuelo Aprobado </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* MODAL DE CANCELACIÓN */}
            {showCancelModal && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[300] flex items-center justify-center p-6">
                    <div className="bg-white p-10 rounded-[3rem] w-full max-w-md space-y-6 animate-in zoom-in duration-300">
                        <h2 className="text-xl font-black uppercase text-red-600">Abortar Misión</h2>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Observaciones de Cancelación</label>
                            <textarea required rows="4" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium text-sm" placeholder="Indique el motivo técnico o meteorológico..." onChange={e => setCancelNotes(e.target.value)} />
                        </div>
                        <div className="flex gap-4">
                            <button onClick={confirmCancellation} disabled={saving} className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-black uppercase text-xs shadow-lg">Confirmar Cancelación</button>
                            <button onClick={() => setShowCancelModal(false)} className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black uppercase text-xs">Regresar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function CheckItem({ label, value, onChange }) {
    return (
        <div className={`flex items-center justify-between p-5 rounded-[2rem] border-2 transition-all ${value === true ? 'bg-emerald-50 border-emerald-500' : value === false ? 'bg-red-50 border-red-500' : 'bg-white border-slate-100'}`}>
            <span className={`text-sm font-bold ${value === true ? 'text-emerald-700' : value === false ? 'text-red-700' : 'text-slate-600'}`}>{label}</span>
            <div className="flex gap-2">
                <button onClick={() => onChange(true)} className={`size-10 rounded-full flex items-center justify-center transition-all ${value === true ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}><span className="material-symbols-outlined text-lg">check</span></button>
                <button onClick={() => onChange(false)} className={`size-10 rounded-full flex items-center justify-center transition-all ${value === false ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-400'}`}><span className="material-symbols-outlined text-lg">close</span></button>
            </div>
        </div>
    );
}