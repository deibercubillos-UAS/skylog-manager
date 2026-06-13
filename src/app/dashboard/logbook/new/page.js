'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from '@/lib/toast';
import WeatherWidget from '@/components/WeatherWidget';

const MISSION_TYPES = [
    'Fotografía / Video',
    'Inspección técnica',
    'Mapeo / Fotogrametría',
    'Agricultura de precisión',
    'Vigilancia / Seguridad',
    'Búsqueda y rescate',
    'Entrenamiento / Práctica',
    'Recreativo',
    'Otro',
];

export default function NewOperationPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [resources, setResources] = useState({ auths: [], batteries: [], aircraft: [] });
    const [healthDone, setHealthDone] = useState(false);
    const [healthEnabled, setHealthEnabled] = useState(true);
    const [preflightEnabled, setPreflightEnabled] = useState(true);
    const [briefingEnabled, setBriefingEnabled] = useState(true);

    // Plan del usuario — el piloto individual tiene un despacho simplificado
    const [isPilotoPlan, setIsPilotoPlan] = useState(false);
    const [myPilotId, setMyPilotId] = useState(null);
    const [flightPlans, setFlightPlans] = useState([]);

    // FLUJO: data -> health -> preflight -> briefing (los pasos se saltan si están desactivados)
    const [step, setStep] = useState('data');
    const [dynamicLabels, setDynamicLabels] = useState([]);
    const [form, setForm] = useState({ auth_id: '', aircraft_id: '', mission_type: '', plan_id: '', has_plan: false, takeoff_time: '', visual_condition: 'VMC', notes: '' });
    const [userRole, setUserRole] = useState(null);
    const [showAuthDetails, setShowAuthDetails] = useState(false);
    const [checks, setChecks] = useState({ health: {}, briefing: {}, preflight: {} });
    const [selectedAuth, setSelectedAuth] = useState(null);
    const [cancelNotes, setCancelNotes] = useState('');
    const [showCancelModal, setShowCancelModal] = useState(false);

    const stepNames = { data: 'OPERATIVA', health: 'SALUD', preflight: 'PRE-VUELO', briefing: 'BRIEFING' };

    useEffect(() => {
        async function init() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                const { data: prof } = await supabase.from('profiles').select('organization_id, subscription_plan, role').eq('id', user.id).single();
                // Piloto independiente = dueño de su propia org (role 'admin') en plan piloto.
                // Los miembros de una org (piloto/jefe/gsms) también tienen profile.subscription_plan='piloto',
                // pero NO son independientes: deben usar el despacho con orden de vuelo.
                const pilotPlan = prof?.subscription_plan === 'piloto' && prof?.role === 'admin';
                setIsPilotoPlan(pilotPlan);
                setUserRole(prof?.role || null);

                const [auths, batteries, aircraft, health, org, plans] = await Promise.all([
                    fetch('/api/flights/authorize').then(r => r.json()),
                    supabase.from('batteries').select('*').eq('organization_id', prof.organization_id).eq('status', 'Operativo'),
                    supabase.from('aircraft').select('id, model, serial_number').eq('organization_id', prof.organization_id).neq('status', 'Baja'),
                    supabase.from('daily_health_checks').select('*').eq('user_id', user.id).eq('check_date', new Date().toISOString().split('T')[0]),
                    supabase.from('organizations').select('enable_health_check, enable_preflight, enable_briefing').eq('id', prof.organization_id).single(),
                    fetch('/api/flight-plans').then(r => { if (!r.ok) { console.warn('[fetch] /api/flight-plans failed:', r.status); return []; } return r.json(); })
                ]);

                const aircraftList = aircraft.data || [];
                setFlightPlans(Array.isArray(plans) ? plans : []);
                setResources({ auths: auths || [], batteries: batteries.data || [], aircraft: aircraftList });
                setHealthDone(health.data?.length > 0);
                setHealthEnabled(org.data?.enable_health_check ?? true);
                setPreflightEnabled(org.data?.enable_preflight ?? true);
                setBriefingEnabled(org.data?.enable_briefing ?? true);

                // Resolver el registro de piloto del usuario (para todos los planes/roles).
                // Sirve para el despacho del piloto individual y para filtrar las
                // órdenes de vuelo del piloto asignado en organizaciones.
                const { data: pilotRow } = await supabase
                    .from('pilots')
                    .select('id')
                    .eq('organization_id', prof.organization_id)
                    .or(`email.eq.${user.email},owner_id.eq.${user.id},profile_id.eq.${user.id}`)
                    .limit(1)
                    .maybeSingle();
                setMyPilotId(pilotRow?.id ?? null);

                if (pilotPlan && aircraftList.length === 1) {
                    setForm(prev => ({ ...prev, aircraft_id: aircraftList[0].id }));
                }
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

    // El piloto (rol 'piloto') solo ve las órdenes donde es el PIC asignado.
    // Managers (admin, jefe_pilotos, gerente_sms) ven todas para despachar.
    const visibleAuths = (userRole === 'piloto' && myPilotId)
        ? resources.auths.filter(a => a.pilot_id === myPilotId)
        : resources.auths;

    const handleAuthChange = (id) => {
        const auth = resources.auths.find(a => a.id === id);
        setSelectedAuth(auth || null);
        setShowAuthDetails(false);
        setForm(prev => ({ ...prev, auth_id: id }));
    };

    // Seleccionar un plan de vuelo guardado → prellena datos vacíos del despacho
    const handleSelectPlan = (planId) => {
        const plan = flightPlans.find(p => p.id === planId);
        setForm(prev => ({
            ...prev,
            plan_id:      planId,
            has_plan:     !!planId,
            takeoff_time: prev.takeoff_time || plan?.takeoff_time?.slice(0, 5) || '',
            notes:        prev.notes || plan?.name || '',
        }));
    };

    const handleCheck = (num, value) => setChecks(prev => ({ ...prev, [step]: { ...prev[step], [num]: value } }));

    // Pasos de seguridad activos, en orden. Health se omite si está desactivado o ya se hizo hoy.
    const safetySteps = [
        (healthEnabled && !healthDone) ? 'health' : null,
        preflightEnabled ? 'preflight' : null,
        briefingEnabled ? 'briefing' : null,
    ].filter(Boolean);

    // Último paso activo: en él se muestra el botón "Aprobar Vuelo"
    const lastStep = safetySteps[safetySteps.length - 1] || null;
    const isLastStep = step === lastStep;

    const handleNextStep = () => {
        if (step === 'data') {
            // Si no hay pasos de seguridad activos, aprobar directamente
            if (safetySteps.length === 0) { handleFinalize(); return; }
            setStep(safetySteps[0]);
            return;
        }
        const idx = safetySteps.indexOf(step);
        if (idx >= 0 && idx < safetySteps.length - 1) setStep(safetySteps[idx + 1]);
    };

    const handleFinalize = async () => {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();

            let flightRecord;

            if (isPilotoPlan) {
                // ── Despacho simplificado: piloto individual ──────────────────
                // Sin orden de vuelo ni batería (la batería se actualiza al subir
                // los registros DJI). El piloto es siempre el dueño de la cuenta.
                const planNote = form.has_plan ? 'Planeación de vuelo: realizada.' : null;
                const combinedNotes = [form.notes?.trim() || null, planNote].filter(Boolean).join(' ') || null;

                const selPlan = flightPlans.find(p => p.id === form.plan_id);
                flightRecord = {
                    takeoff_time:    form.takeoff_time || null,
                    visual_condition: form.visual_condition,
                    notes:           combinedNotes,
                    mission_type:    form.mission_type || null,
                    pilot_id:        myPilotId,
                    aircraft_id:     form.aircraft_id,
                    plan_id:         form.plan_id || null,
                    location:        selPlan?.location || null,
                    flight_date:     new Date().toISOString().split('T')[0],
                    organization_id: prof.organization_id,
                    owner_id:        user.id,
                };
            } else {
                // ── Despacho con orden de vuelo (organizaciones) ──────────────
                const selectedAuth = resources.auths.find(a => a.id === form.auth_id);
                flightRecord = {
                    takeoff_time:    form.takeoff_time,
                    visual_condition: form.visual_condition,
                    notes:           form.notes,
                    auth_id:         selectedAuth.id,
                    pilot_id:        selectedAuth.pilot_id,
                    aircraft_id:     selectedAuth.aircraft_id,
                    location:        selectedAuth.location,
                    mission_id:      selectedAuth.mission_id,
                    flight_date:     new Date().toISOString().split('T')[0],
                    organization_id: selectedAuth.organization_id,
                    owner_id:        user.id,
                };
            }

            const orgId = flightRecord.organization_id;

            // 1. Crear el vuelo
            const { data: flight, error: fErr } = await supabase.from('flights').insert([flightRecord]).select().single();
            if (fErr) throw fErr;

            // 2. Guardar resultados de las listas de chequeo
            const tasks = [
                supabase.from('results_health').insert([{ flight_id: flight.id, checks: checks.health, organization_id: orgId }]),
                supabase.from('results_briefing').insert([{ flight_id: flight.id, checks: checks.briefing, organization_id: orgId }]),
                supabase.from('results_preflight').insert([{ flight_id: flight.id, checks: checks.preflight, organization_id: orgId }]),
            ];
            // Solo marcar la orden como realizada cuando existe (flujo con auth)
            if (!isPilotoPlan && form.auth_id) {
                tasks.push(supabase.from('flight_authorizations').update({ status: 'realizado' }).eq('id', form.auth_id));
            }
            await Promise.all(tasks);

            toast.success("¡Autorizado volar! Redirigiendo al cierre de misión...");
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
                    
                    {step === 'data' && isPilotoPlan && (
                        <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
                            <section className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-200 space-y-6">
                                <div className="grid grid-cols-1 gap-4 md:gap-6">

                                    {/* Tipo de vuelo */}
                                    <div className="space-y-1">
                                        <label htmlFor="pi-mission-type" className="text-xs font-black uppercase text-slate-600 ml-1">Tipo de Vuelo <span className="text-orange-600">*</span></label>
                                        <select id="pi-mission-type" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-orange-500" value={form.mission_type} onChange={e => setForm({...form, mission_type: e.target.value})}>
                                            <option value="">-- Seleccionar tipo --</option>
                                            {MISSION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>

                                    {/* Aeronave */}
                                    <div className="space-y-1">
                                        <label htmlFor="pi-aircraft" className="text-xs font-black uppercase text-slate-600 ml-1">Aeronave <span className="text-orange-600">*</span></label>
                                        {resources.aircraft.length === 0 ? (
                                            <Link href="/dashboard/fleet" className="block w-full p-4 bg-amber-50 border border-amber-200 rounded-2xl font-bold text-xs text-amber-700">
                                                No tienes aeronaves registradas. Toca para añadir una en Flota.
                                            </Link>
                                        ) : (
                                            <select id="pi-aircraft" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-orange-500" value={form.aircraft_id} onChange={e => setForm({...form, aircraft_id: e.target.value})}>
                                                <option value="">-- Seleccionar aeronave --</option>
                                                {resources.aircraft.map(a => <option key={a.id} value={a.id}>{a.model} ({a.serial_number})</option>)}
                                            </select>
                                        )}
                                    </div>

                                    {/* Planeación de vuelo */}
                                    <div className="space-y-2">
                                        <label htmlFor="pi-plan" className="text-xs font-black uppercase text-slate-600 ml-1">Planeación de Vuelo <span className="normal-case font-bold text-slate-300">(opcional)</span></label>
                                        {flightPlans.length > 0 ? (
                                            <select id="pi-plan" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-orange-500" value={form.plan_id} onChange={e => handleSelectPlan(e.target.value)}>
                                                <option value="">-- Sin planeación / vuelo libre --</option>
                                                {flightPlans.map(p => (
                                                    <option key={p.id} value={p.id}>
                                                        {p.name}{p.flight_date ? ` · ${p.flight_date}` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        ) : (
                                            <p className="text-xs font-bold text-slate-400 bg-slate-50 rounded-2xl p-4">
                                                Aún no tienes planeaciones guardadas.
                                            </p>
                                        )}
                                        <a
                                            href="/dashboard/plan-vuelo"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 text-xs font-black uppercase text-orange-600 hover:text-orange-700 ml-1 mt-1"
                                        >
                                            <span className="material-symbols-outlined text-sm">add_location_alt</span>
                                            Crear nueva planeación
                                        </a>
                                    </div>

                                    {/* Hora de despegue + condición */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label htmlFor="pi-takeoff" className="text-xs font-black uppercase text-slate-600 ml-1">Hora Despegue <span className="text-orange-600">*</span></label>
                                            <input id="pi-takeoff" type="time" value={form.takeoff_time} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-orange-500" onChange={e => setForm({...form, takeoff_time: e.target.value})} />
                                        </div>
                                        <div className="space-y-1">
                                            <label htmlFor="pi-condition" className="text-xs font-black uppercase text-slate-600 ml-1">Condición</label>
                                            <select id="pi-condition" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-orange-500" value={form.visual_condition} onChange={e => setForm({...form, visual_condition: e.target.value})}>
                                                <option value="VMC">VMC</option><option value="IMC">IMC</option><option value="NIGHT">NIGHT</option>
                                            </select>
                                        </div>
                                    </div>

                                    <p className="text-xs font-bold text-slate-400 bg-slate-50 rounded-2xl p-4 flex items-start gap-2">
                                        <span className="material-symbols-outlined text-base text-slate-300 mt-0.5 shrink-0">info</span>
                                        La batería y las horas de vuelo se actualizan automáticamente al subir los registros DJI.
                                    </p>
                                </div>
                                <div className="flex flex-col gap-3 pt-4">
                                    <button disabled={!form.mission_type || !form.aircraft_id || !form.takeoff_time} onClick={handleNextStep} className="w-full py-5 bg-orange-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl disabled:bg-slate-200 transition-all active:scale-95">{safetySteps.length === 0 ? 'Registrar Vuelo' : 'Continuar a Seguridad'}</button>
                                </div>
                            </section>
                        </div>
                    )}

                    {step === 'data' && !isPilotoPlan && (
                        <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
                            <section className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-200 space-y-6">
                                <div className="grid grid-cols-1 gap-4 md:gap-6">
                                    <div className="space-y-1">
                                        <label htmlFor="new-flight-auth" className="text-xs font-black uppercase text-slate-600 ml-1">Orden de Vuelo</label>
                                        <select id="new-flight-auth" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-orange-500" value={form.auth_id} onChange={e => handleAuthChange(e.target.value)}>
                                            <option value="">-- Seleccionar Misión --</option>
                                            {visibleAuths.map(a => <option key={a.id} value={a.id}>{a.mission_id} - {a.location}</option>)}
                                        </select>
                                        {userRole === 'piloto' && visibleAuths.length === 0 && (
                                            <p className="text-xs font-bold text-slate-400 bg-slate-50 rounded-2xl p-4 mt-2">
                                                No tienes vuelos asignados por el momento.
                                            </p>
                                        )}
                                    </div>

                                    {selectedAuth && (
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 animate-in zoom-in duration-300">
                                            <InfoBox label="PIC" val={selectedAuth.pilots?.name} />
                                            <InfoBox label="Aeronave" val={selectedAuth.aircraft?.model} />
                                            <InfoBox label="Payload" val={selectedAuth.payload?.model || 'N/A'} />
                                            <InfoBox label="Lugar" val={selectedAuth.location} />
                                        </div>
                                    )}

                                    {selectedAuth && (() => {
                                        const pts = selectedAuth.plan_data?.points;
                                        const coord = Array.isArray(pts) && pts[0];
                                        if (!coord) return null;
                                        const lat = Array.isArray(coord) ? coord[0] : coord.lat;
                                        const lon = Array.isArray(coord) ? coord[1] : coord.lng ?? coord.lon;
                                        if (!lat || !lon) return null;
                                        return (
                                            <WeatherWidget
                                                lat={lat}
                                                lon={lon}
                                                label={selectedAuth.location}
                                                compact
                                            />
                                        );
                                    })()}

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label htmlFor="new-flight-takeoff" className="text-xs font-black uppercase text-slate-600 ml-1">Hora Despegue</label>
                                            <input id="new-flight-takeoff" type="time" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-orange-500" onChange={e => setForm({...form, takeoff_time: e.target.value})} />
                                        </div>
                                        <div className="space-y-1">
                                            <label htmlFor="new-flight-condition" className="text-xs font-black uppercase text-slate-600 ml-1">Condición</label>
                                            <select id="new-flight-condition" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold outline-none focus:ring-2 focus:ring-orange-500" value={form.visual_condition} onChange={e => setForm({...form, visual_condition: e.target.value})}>
                                                <option value="VMC">VMC</option><option value="IMC">IMC</option><option value="NIGHT">NIGHT</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-3 pt-4">
                                    <button disabled={!form.auth_id || !form.takeoff_time} onClick={handleNextStep} className="w-full py-5 bg-orange-600 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl disabled:bg-slate-200 transition-all active:scale-95">Continuar a Seguridad</button>
                                    {form.auth_id && <button onClick={() => setShowCancelModal(true)} className="w-full py-3 text-red-500 font-black uppercase text-xs">Cancelar Misión</button>}
                                </div>

                                {/* DETALLES DE LA PROGRAMACIÓN — desplegable */}
                                {selectedAuth && (
                                    <AuthDetails auth={selectedAuth} open={showAuthDetails} onToggle={() => setShowAuthDetails(v => !v)} />
                                )}
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
                                {!isLastStep ? (
                                    <button onClick={handleNextStep} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-xs shadow-xl active:scale-95">Siguiente Protocolo</button>
                                ) : (
                                    <button disabled={!dynamicLabels.every(l => checks[step][l.field_number] === true) || saving} onClick={handleFinalize} className="w-full py-5 bg-emerald-600 text-white rounded-[2rem] font-black uppercase text-xs shadow-xl disabled:bg-slate-200 active:scale-95">Aprobar Vuelo</button>
                                )}
                                <button onClick={() => isPilotoPlan ? router.back() : setShowCancelModal(true)} className="w-full py-3 bg-red-50 text-red-600 rounded-[2rem] font-black uppercase text-xs border border-red-100">Abortar Operación</button>
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
                        <label htmlFor="cancel-notes" className="text-xs font-black uppercase text-slate-600">Motivo de cancelación (opcional)</label>
                        <textarea id="cancel-notes"
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
    </>
    );
}

function AuthDetails({ auth, open, onToggle }) {
    const pd = auth.plan_data || {};
    const fmtDate = (d) => d ? String(d).slice(0, 10) : '—';
    const geoLabel = { polygon: 'Polígono', linear: 'Tramo lineal', circle: 'Circunferencia' }[pd.geo_type] || '—';
    const rows = [
        ['N° Misión',        auth.mission_id],
        ['Operación',        pd.op_name || auth.mission_type],
        ['Tipo de misión',   auth.mission_type],
        ['Piloto (PIC)',     auth.pilots?.name],
        ['Aeronave',         auth.aircraft?.model ? `${auth.aircraft.model}${auth.aircraft.serial_number ? ' · ' + auth.aircraft.serial_number : ''}` : null],
        ['Ubicación',        auth.location],
        ['Fecha programada', fmtDate(auth.scheduled_at)],
        ['Hora de despegue', pd.takeoff_time || null],
        ['Altitud máx. AGL', pd.altitude != null ? `${pd.altitude} m` : null],
        ['Zona',             pd.points?.length ? `${geoLabel} · ${pd.points.length} punto(s)` : null],
        ['Observaciones',    pd.notes || null],
    ].filter(([, v]) => v != null && v !== '');

    return (
        <div className="mt-4 border border-slate-200 rounded-2xl overflow-hidden">
            <button onClick={onToggle} className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 hover:bg-slate-100 transition-colors">
                <span className="text-xs font-black uppercase tracking-widest text-slate-600 flex items-center gap-2">
                    <span className="material-symbols-outlined text-base text-orange-500">description</span>
                    Detalles de la programación
                </span>
                <span className={`material-symbols-outlined text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}>expand_more</span>
            </button>
            {open && (
                <div className="p-5 space-y-2 animate-in slide-in-from-top-2 duration-300">
                    {rows.map(([label, val]) => (
                        <div key={label} className="flex items-start justify-between gap-4 text-xs py-1.5 border-b border-slate-50 last:border-0">
                            <span className="font-black uppercase text-slate-400 shrink-0">{label}</span>
                            <span className="font-bold text-slate-800 text-right">{val}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
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