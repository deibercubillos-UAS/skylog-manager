'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from '@/lib/toast';

export default function NewOperationPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [resources, setResources] = useState({ auths: [], batteries: [] });
    const [healthDone, setHealthDone] = useState(false);
    const [healthEnabled, setHealthEnabled] = useState(true);
    
    // FLUJO: data -> health -> preflight -> briefing
    const [step, setStep] = useState('data'); 
    const [dynamicLabels, setDynamicLabels] = useState([]);
    const [form, setForm] = useState({ auth_id: '', battery_id: '', takeoff_time: '', visual_condition: 'VMC', notes: '' });
    const [checks, setChecks] = useState({ health: {}, briefing: {}, preflight: {} });
    const [selectedAuth, setSelectedAuth] = useState(null);
    const [cancelNotes, setCancelNotes] = useState('');
    const [showCancelModal, setShowCancelModal] = useState(false);

    const stepNames = { data: 'OPERATIVA', health: 'SALUD', preflight: 'PRE-VUELO', briefing: 'BRIEFING' };

    useEffect(() => {
        async function init() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
                const [auths, batteries, health, org] = await Promise.all([
                    fetch('/api/flights/authorize').then(r => r.json()),
                    supabase.from('batteries').select('*').eq('organization_id', prof.organization_id).eq('status', 'Operativo'),
                    supabase.from('daily_health_checks').select('*').eq('user_id', user.id).eq('check_date', new Date().toISOString().split('T')[0]),
                    supabase.from('organizations').select('enable_health_check').eq('id', prof.organization_id).single()
                ]);
                setResources({ auths: auths || [], batteries: batteries.data || [] });
                setHealthDone(health.data?.length > 0);
                setHealthEnabled(org.data?.enable_health_check ?? true);
            } finally { setLoading(false); }
        }
        init();
    }, []);

    useEffect(() => {
        async function loadLabels() {
            if (step === 'data') return;
            const { data: { user } } = await supabase.auth.getUser();
            const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
            const modelToFilter = (step === 'preflight' && selectedAuth) ? selectedAuth.aircraft.model : 'General';
            const { data } = await supabase.from('form_definitions').select('*').eq('organization_id', prof.organization_id).eq('form_type', step).eq('aircraft_model', modelToFilter).order('field_number', { ascending: true });
            setDynamicLabels(data || []);
        }
        loadLabels();
    }, [step, selectedAuth]);

    const handleAuthChange = (id) => {
        const auth = resources.auths.find(a => a.id === id);
        setSelectedAuth(auth || null);
        setForm(prev => ({ ...prev, auth_id: id }));
    };

    const handleCheck = (num, value) => setChecks(prev => ({ ...prev, [step]: { ...prev[step], [num]: value } }));

    const handleNextStep = () => {
        if (step === 'data') setStep(!healthEnabled || healthDone ? 'preflight' : 'health');
        else if (step === 'health') setStep('preflight');
        else if (step === 'preflight') setStep('briefing');
    };

    const handleFinalize = async () => {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const selectedAuth = resources.auths.find(a => a.id === form.auth_id);
            const orgId = selectedAuth.organization_id;

            // 1. Crear el Vuelo (Insertamos y esperamos confirmación)
            const { data: flight, error: fErr } = await supabase.from('flights').insert([{ 
                battery_id: form.battery_id,
                takeoff_time: form.takeoff_time,
                visual_condition: form.visual_condition,
                notes: form.notes,
                auth_id: selectedAuth.id, 
                pilot_id: selectedAuth.pilot_id, 
                aircraft_id: selectedAuth.aircraft_id, 
                location: selectedAuth.location, 
                mission_id: selectedAuth.mission_id, 
                flight_date: new Date().toISOString().split('T')[0], 
                organization_id: orgId, 
                owner_id: user.id 
            }]).select().single();

            if (fErr) throw fErr;

            // 2. Guardar resultados
            await Promise.all([
                supabase.from('results_health').insert([{ flight_id: flight.id, checks: checks.health, organization_id: orgId }]),
                supabase.from('results_briefing').insert([{ flight_id: flight.id, checks: checks.briefing, organization_id: orgId }]),
                supabase.from('results_preflight').insert([{ flight_id: flight.id, checks: checks.preflight, organization_id: orgId }]),
                supabase.from('flight_authorizations').update({ status: 'realizado' }).eq('id', form.auth_id)
            ]);

            toast.success("¡Autorizado volar! Redirigiendo al cierre de misión...");
            
            // REDIRECCIÓN FORZADA AL NAVEGADOR
            window.location.href = `/dashboard/logbook/finalize?id=${flight.id}`;

        } catch (err) {
            toast.error("Error de despacho: " + err.message);
        } finally { setSaving(false); }
    };

    const handleCancelMission = async () => {
        if (!form.auth_id) return;
        try {
            await supabase
                .from('flight_authorizations')
                .update({ status: 'cancelado', notes: cancelNotes || null })
                .eq('id', form.auth_id);
            toast.warn('Misión cancelada.');
            router.replace('/dashboard/logbook');
        } catch (err) {
            toast.error('No se pudo cancelar: ' + err.message);
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-[#f8f6f6] font-black animate-pulse text-slate-400">CARGANDO...</div>;

    return (
        <>
        <div className="fixed inset-0 bg-[#f8f6f6] z-[200] flex flex-col font-display text-left">
            <header className="h-16 md:h-20 bg-white border-b flex items-center justify-between px-4 md:px-10 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="size-8 md:size-10 bg-orange-600 rounded-xl flex items-center justify-center text-white font-black">B</div>
                    <div className="text-left">
                        <h2 className="text-xs md:text-sm font-black uppercase leading-none">Despacho</h2>
                        <p className="text-xs font-bold text-orange-600 uppercase mt-1">Fase: {stepNames[step]}</p>
                    </div>
                </div>
                <button onClick={() => router.back()} className="material-symbols-outlined text-slate-300 hover:text-red-500">close</button>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-12">
                <div className="max-w-3xl mx-auto space-y-6 md:space-y-8 pb-20">
                    
                    {step === 'data' && (
                        <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
                            <section className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-200 space-y-6">
                                <div className="grid grid-cols-1 gap-4 md:gap-6">
                                    <div className="space-y-1">
                                        <label className="text-xs font-black uppercase text-slate-400 ml-1">Orden de Vuelo</label>
                                        <select className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-orange-500" value={form.auth_id} onChange={e => handleAuthChange(e.target.value)}>
                                            <option value="">-- Seleccionar Misión --</option>
                                            {resources.auths.map(a => <option key={a.id} value={a.id}>{a.mission_id} - {a.location}</option>)}
                                        </select>
                                    </div>

                                    {selectedAuth && (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 animate-in zoom-in duration-300">
                                            <InfoBox label="PIC" val={selectedAuth.pilots?.name} />
                                            <InfoBox label="Aeronave" val={selectedAuth.aircraft?.model} />
                                            <InfoBox label="Payload" val={selectedAuth.payload?.model || 'N/A'} />
                                            <InfoBox label="Lugar" val={selectedAuth.location} />
                                        </div>
                                    )}

                                    <div className="space-y-1">
                                        <label className="text-xs font-black uppercase text-slate-400 ml-1">Batería</label>
                                        <select className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-orange-500" value={form.battery_id} onChange={e => setForm({...form, battery_id: e.target.value})}>
                                            <option value="">-- Seleccionar Batería --</option>
                                            {resources.batteries.map(b => <option key={b.id} value={b.id}>{b.brand} {b.model} ({b.serial_number})</option>)}
                                        </select>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-xs font-black uppercase text-slate-400 ml-1">Hora Despegue</label>
                                            <input type="time" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" onChange={e => setForm({...form, takeoff_time: e.target.value})} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-xs font-black uppercase text-slate-400 ml-1">Condición</label>
                                            <select className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" value={form.visual_condition} onChange={e => setForm({...form, visual_condition: e.target.value})}>
                                                <option value="VMC">VMC</option><option value="IMC">IMC</option><option value="NIGHT">NIGHT</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-3 pt-4">
                                    <button disabled={!form.auth_id || !form.battery_id || !form.takeoff_time} onClick={handleNextStep} className="w-full py-5 bg-orange-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl disabled:bg-slate-200 transition-all active:scale-95">Continuar a Seguridad</button>
                                    {form.auth_id && <button onClick={() => setShowCancelModal(true)} className="w-full py-3 text-red-500 font-black uppercase text-xs">Cancelar Misión</button>}
                                </div>
                            </section>
                        </div>
                    )}

                    {step !== 'data' && (
                        <div className="space-y-6 md:space-y-8 animate-in slide-in-from-right duration-500">
                            <div className="flex justify-between items-center px-2">
                                <h3 className="text-xl md:text-2xl font-black uppercase text-slate-800">{stepNames[step]}</h3>
                                <button onClick={() => setStep('data')} className="text-xs font-black text-slate-400 uppercase border-b border-slate-200">Corregir Datos</button>
                            </div>
                            
                            <div className="grid gap-3 md:gap-4">
                                {dynamicLabels.map(item => (
                                    <CheckItem key={item.id} label={item.label_text} value={checks[step][item.field_number]} onChange={(val) => handleCheck(item.field_number, val)} />
                                ))}
                            </div>

                            <div className="flex flex-col gap-4 mt-10">
                                {step !== 'briefing' ? (
                                    <button onClick={handleNextStep} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-xs shadow-xl active:scale-95">Siguiente Protocolo</button>
                                ) : (
                                    <button disabled={!dynamicLabels.every(l => checks.briefing[l.field_number] === true) || saving} onClick={handleFinalize} className="w-full py-5 bg-emerald-600 text-white rounded-[2rem] font-black uppercase text-xs shadow-xl disabled:bg-slate-200 active:scale-95">Aprobar Vuelo</button>
                                )}
                                <button onClick={() => setShowCancelModal(true)} className="w-full py-3 bg-red-50 text-red-600 rounded-[2rem] font-black uppercase text-xs border border-red-100">Abortar Operación</button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>

        {/* Modal de cancelación */}
        {showCancelModal && (
            <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md animate-in slide-in-from-bottom duration-300 p-8 space-y-6">
                    <div className="flex items-start gap-4">
                        <div className="size-12 bg-red-100 rounded-2xl flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-red-500">warning</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-black uppercase text-slate-900">¿Cancelar Misión?</h3>
                            <p className="text-xs text-slate-500 font-bold mt-1">La orden de vuelo quedará como cancelada y no podrá reactivarse.</p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-slate-400">Motivo de cancelación (opcional)</label>
                        <textarea
                            rows="3"
                            value={cancelNotes}
                            onChange={e => setCancelNotes(e.target.value)}
                            placeholder="Condiciones climáticas, avería técnica..."
                            className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-red-400 resize-none"
                        />
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowCancelModal(false)}
                            className="flex-1 py-3.5 rounded-2xl border-2 border-slate-200 text-xs font-black uppercase text-slate-500"
                        >
                            Volver
                        </button>
                        <button
                            onClick={async () => { setShowCancelModal(false); await handleCancelMission(); }}
                            className="flex-1 py-3.5 rounded-2xl bg-red-600 text-white text-xs font-black uppercase shadow-lg shadow-red-500/20"
                        >
                            Confirmar Cancelación
                        </button>
                    </div>
                </div>
            </div>
        )}
    </>;
}

function InfoBox({ label, val }) {
    return (
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-center">
            <p className="text-xs font-black text-slate-400 uppercase leading-none">{label}</p>
            <p className="text-xs font-bold text-slate-800 mt-1 uppercase truncate">{val || 'N/A'}</p>
        </div>
    );
}

function CheckItem({ label, value, onChange }) {
    return (
        <div className={`flex items-center justify-between p-4 md:p-6 rounded-[2rem] border-2 transition-all ${value === true ? 'bg-emerald-50 border-emerald-500' : value === false ? 'bg-red-50 border-red-500' : 'bg-white border-slate-100'}`}>
            <span className={`text-xs md:text-sm font-bold flex-1 pr-4 ${value === true ? 'text-emerald-700' : value === false ? 'text-red-700' : 'text-slate-600'}`}>{label}</span>
            <div className="flex gap-2 shrink-0">
                <button onClick={() => onChange(true)} className={`size-10 md:size-12 rounded-full flex items-center justify-center transition-all ${value === true ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-50 text-slate-300'}`}><span className="material-symbols-outlined">check</span></button>
                <button onClick={() => onChange(false)} className={`size-10 md:size-12 rounded-full flex items-center justify-center transition-all ${value === false ? 'bg-red-500 text-white shadow-lg' : 'bg-slate-50 text-slate-300'}`}><span className="material-symbols-outlined">close</span></button>
            </div>
        </div>
    );
}