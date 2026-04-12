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
    
    const [step, setStep] = useState('data'); 
    const [dynamicLabels, setDynamicLabels] = useState([]);
    const [form, setForm] = useState({ auth_id: '', battery_id: '', takeoff_time: '', visual_condition: 'VMC', notes: '' });
    
    // Estado de checks: true = Cumple, false = No Cumple, undefined = Pendiente
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
        const newChecks = { ...checks[step], [num]: value };
        setChecks(prev => ({ ...prev, [step]: newChecks }));

        // Salto automático si es "Cumple" y es el último ítem
        const isLastItem = dynamicLabels[dynamicLabels.length - 1].field_number === num;
        if (value === true && isLastItem) {
            setTimeout(() => {
                if (step === 'health') setStep('preflight');
                else if (step === 'preflight') setStep('briefing');
            }, 600);
        }
    };

    const handleCancelMission = async () => {
        if (!confirm("¿CONFIRMA CANCELACIÓN?")) return;
        await supabase.from('flight_authorizations').update({ status: 'cancelado' }).eq('id', form.auth_id);
        router.push('/dashboard/authorizations');
    };

    const handleFinalize = async () => {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const selectedAuth = resources.auths.find(a => a.id === form.auth_id);

            // CORRECCIÓN: Separamos el auth_id del resto para evitar el error de columna inexistente si no se ha ejecutado el SQL
            const { auth_id, ...insertData } = form;

            const { data: flight, error: fErr } = await supabase.from('flights').insert([{ 
                ...insertData, 
                auth_id: auth_id, // Usará la columna nueva del SQL
                pilot_id: selectedAuth.pilot_id, 
                aircraft_id: selectedAuth.aircraft_id, 
                location: selectedAuth.location, 
                mission_id: selectedAuth.mission_id, 
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

    if (loading) return <div className="h-screen flex items-center justify-center bg-[#f8f6f6] font-black animate-pulse">CARGANDO...</div>;

    return (
        <div className="fixed inset-0 bg-[#f8f6f6] z-[200] flex flex-col font-display text-left">
            <header className="h-20 bg-white border-b flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="size-10 bg-orange-600 rounded-xl flex items-center justify-center text-white font-black">B</div>
                    <h2 className="text-sm font-black uppercase">Despacho de Aeronave</h2>
                </div>
                <button onClick={() => router.back()} className="material-symbols-outlined text-slate-400">close</button>
            </header>

            <main className="flex-1 overflow-y-auto p-6 md:p-12">
                <div className="max-w-3xl mx-auto">
                    {step === 'data' && (
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 space-y-6 animate-in slide-in-from-bottom">
                            <h3 className="text-lg font-black uppercase">Fase 01: Operativa</h3>
                            <div className="grid gap-6">
                                <select className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" value={form.auth_id} onChange={e => setForm({...form, auth_id: e.target.value})}>
                                    <option value="">-- Misión --</option>
                                    {resources.auths.map(a => <option key={a.id} value={a.id}>{a.mission_id} - {a.location}</option>)}
                                </select>
                                <select className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold" value={form.battery_id} onChange={e => setForm({...form, battery_id: e.target.value})}>
                                    <option value="">-- Batería --</option>
                                    {resources.batteries.map(b => <option key={b.id} value={b.id}>{b.brand} {b.model} ({b.serial_number})</option>)}
                                </select>
                                <div className="grid grid-cols-2 gap-4">
                                    <input type="time" className="p-4 bg-slate-50 rounded-2xl border-none font-bold" onChange={e => setForm({...form, takeoff_time: e.target.value})} />
                                    <select className="p-4 bg-slate-50 rounded-2xl border-none font-bold" onChange={e => setForm({...form, visual_condition: e.target.value})}>
                                        <option value="VMC">VMC</option><option value="IMC">IMC</option><option value="NIGHT">NOCTURNO</option>
                                    </select>
                                </div>
                            </div>
                            <button 
                                disabled={!form.auth_id || !form.battery_id || !form.takeoff_time}
                                onClick={() => setStep(healthDone ? 'preflight' : 'health')}
                                className="w-full py-5 bg-orange-600 text-white rounded-[2rem] font-black uppercase text-xs disabled:bg-slate-200"
                            > Siguiente: Seguridad </button>
                        </div>
                    )}

                    {step !== 'data' && (
                        <div className="space-y-8 animate-in slide-in-from-right">
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-800">02. Validación: {step.toUpperCase()}</h3>
                            <div className="grid gap-4">
                                {dynamicLabels.map(item => (
                                    <CheckItem 
                                        key={item.id} 
                                        label={item.label_text} 
                                        value={checks[step][item.field_number]} 
                                        onChange={(val) => handleCheck(item.field_number, val)} 
                                    />
                                ))}
                            </div>

                            {step === 'briefing' && (
                                <div className="grid grid-cols-2 gap-4 mt-12">
                                    <button onClick={handleCancelMission} className="py-5 bg-red-50 text-red-600 rounded-[2rem] font-black uppercase text-xs">Vuelo Cancelado</button>
                                    <button 
                                        disabled={!dynamicLabels.every(l => checks.briefing[l.field_number] === true) || saving}
                                        onClick={handleFinalize}
                                        className="py-5 bg-emerald-600 text-white rounded-[2rem] font-black uppercase text-xs"
                                    > Vuelo Aprobado </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

function CheckItem({ label, value, onChange }) {
    return (
        <div className={`flex items-center justify-between p-5 rounded-[2rem] border-2 transition-all ${value === true ? 'bg-emerald-50 border-emerald-500' : value === false ? 'bg-red-50 border-red-500' : 'bg-white border-slate-100'}`}>
            <span className={`text-sm font-bold ${value === true ? 'text-emerald-700' : value === false ? 'text-red-700' : 'text-slate-600'}`}>{label}</span>
            <div className="flex gap-2">
                <button 
                    onClick={() => onChange(true)}
                    className={`size-10 rounded-full flex items-center justify-center transition-all ${value === true ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}
                >
                    <span className="material-symbols-outlined text-lg">check</span>
                </button>
                <button 
                    onClick={() => onChange(false)}
                    className={`size-10 rounded-full flex items-center justify-center transition-all ${value === false ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-400'}`}
                >
                    <span className="material-symbols-outlined text-lg">close</span>
                </button>
            </div>
        </div>
    );
}