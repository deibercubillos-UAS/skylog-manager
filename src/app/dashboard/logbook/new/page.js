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
    
    // TABS EN EL ORDEN SOLICITADO: Salud, Prevuelo, Briefing
    const [activeTab, setActiveTab] = useState('health'); 
    const [dynamicLabels, setDynamicLabels] = useState([]);

    const [form, setForm] = useState({
        auth_id: '', battery_id: '', takeoff_time: '', 
        visual_condition: 'VMC', notes: ''
    });

    const [checks, setChecks] = useState({ health: {}, briefing: {}, preflight: {} });

    // DETERMINAR SI LOS CAMPOS OPERATIVOS ESTÁN LISTOS
    const isOperationalFilled = form.auth_id && form.battery_id && form.takeoff_time;

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
                
                if (health.data?.length > 0) {
                    setHealthDone(true);
                    setActiveTab('preflight'); // Si salud ya se hizo hoy, saltar a Prevuelo
                }
            } finally { setLoading(false); }
        }
        init();
    }, []);

    useEffect(() => {
        async function loadLabels() {
            if (loading || !isOperationalFilled) return;
            const { data: { user } } = await supabase.auth.getUser();
            const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
            const selectedMission = resources.auths.find(a => a.id === form.auth_id);
            const modelToFilter = (activeTab === 'preflight' && selectedMission) ? selectedMission.aircraft.model : 'General';
            
            const { data } = await supabase.from('form_definitions')
                .select('*')
                .eq('organization_id', prof.organization_id)
                .eq('form_type', activeTab)
                .eq('aircraft_model', modelToFilter)
                .order('field_number', { ascending: true });
            
            setDynamicLabels(data || []);
        }
        loadLabels();
    }, [activeTab, form.auth_id, isOperationalFilled, loading]);

    const handleCheck = (num) => setChecks(prev => ({ ...prev, [activeTab]: { ...prev[activeTab], [num]: !prev[activeTab][num] } }));
    
    // VALIDACIÓN COMPLETA
    const isTabComplete = (tabName) => {
        // Si ya se hizo salud hoy y estamos validando salud, retornar true
        if (tabName === 'health' && healthDone) return true;
        
        // Filtramos las etiquetas dinámicas para ese tab específico
        // Nota: Para simplificar la validación inmediata, asumimos que todos los puntos cargados deben estar en true
        return dynamicLabels.length > 0 && dynamicLabels.every(l => checks[tabName][l.field_number]);
    };

    const isMissionReady = isOperationalFilled && isTabComplete('health') && isTabComplete('preflight') && isTabComplete('briefing');

    const handleFinalize = async () => {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const selectedAuth = resources.auths.find(a => a.id === form.auth_id);
            
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

            await Promise.all([
                supabase.from('results_health').insert([{ flight_id: flight.id, checks: checks.health }]),
                supabase.from('results_briefing').insert([{ flight_id: flight.id, checks: checks.briefing }]),
                supabase.from('results_preflight').insert([{ flight_id: flight.id, checks: checks.preflight }]),
                supabase.from('flight_authorizations').update({ status: 'realizado' }).eq('id', form.auth_id)
            ]);

            if (!healthDone) {
                await supabase.from('daily_health_checks').insert([{ user_id: user.id, organization_id: selectedAuth.organization_id }]);
            }

            alert("🚀 DESPEGUE AUTORIZADO");
            router.push('/dashboard/logbook');
        } finally { setSaving(false); }
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-[#f8f6f6] font-black animate-pulse text-slate-400">SINCRO...</div>;

    return (
        <div className="flex flex-col lg:flex-row h-screen -m-10 bg-[#f8f6f6] text-left overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 lg:p-10 space-y-8">
                <header className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                    <div>
                        <h2 className="text-xl lg:text-2xl font-black uppercase text-slate-900">Nueva Operación</h2>
                        <p className="text-[10px] font-black text-orange-600 uppercase mt-1">F-OPS-001 | Despacho</p>
                    </div>
                    <Link href="/dashboard" className="text-[10px] font-black text-slate-400 uppercase border px-4 py-2 rounded-xl">Abortar</Link>
                </header>

                {/* BLOQUE OPERATIVO: SIEMPRE VISIBLE */}
                <div className="bg-white p-6 lg:p-8 rounded-[2.5rem] shadow-sm border border-slate-200 space-y-6">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">01. Configuración de Vuelo</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Misión</label>
                            <select className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={form.auth_id} onChange={e => setForm({...form, auth_id: e.target.value})}>
                                <option value="">-- Seleccionar --</option>
                                {resources.auths.map(a => <option key={a.id} value={a.id}>{a.mission_id} - {a.location}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Batería</label>
                            <select className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={form.battery_id} onChange={e => setForm({...form, battery_id: e.target.value})}>
                                <option value="">-- Seleccionar --</option>
                                {resources.batteries.map(b => <option key={b.id} value={b.id}>{b.brand} {b.model}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Despegue</label>
                            <input type="time" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" onChange={e => setForm({...form, takeoff_time: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Condición</label>
                            <select className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" onChange={e => setForm({...form, visual_condition: e.target.value})}>
                                <option value="VMC">VMC</option><option value="IMC">IMC</option><option value="NIGHT">NOCTURNO</option>
                            </select>
                        </div>
                    </div>
                </div>

                {!isOperationalFilled && (
                    <div className="p-10 border-2 border-dashed border-slate-200 rounded-[3rem] text-center">
                        <span className="material-symbols-outlined text-slate-300 text-5xl">lock</span>
                        <p className="text-xs font-black text-slate-400 uppercase mt-4 tracking-widest">Complete los datos superiores para<br/>desplegar protocolos de seguridad</p>
                    </div>
                )}
            </div>

            {/* SIDEBAR ADAPTATIVO: SOLO SI SE LLENARON LOS CAMPOS */}
            {isOperationalFilled && (
                <aside className="w-full lg:w-[450px] bg-[#1A202C] text-white p-6 lg:p-10 flex flex-col shadow-2xl border-l border-white/5 overflow-y-auto animate-in slide-in-from-bottom lg:slide-in-from-right duration-500">
                    <div className="mb-8">
                        <h3 className="text-xl font-black uppercase">02. Seguridad</h3>
                        <p className="text-orange-500 text-[9px] font-black uppercase">Fase de Validación</p>
                    </div>

                    <div className="flex bg-white/5 p-1 rounded-xl mb-10">
                        {['health', 'preflight', 'briefing'].map(t => (
                            (!healthDone || t !== 'health') && (
                                <button key={t} onClick={() => setActiveTab(t)} className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${activeTab === t ? 'bg-orange-600 text-white' : 'text-slate-500'}`}>
                                    {t === 'health' ? 'Salud' : t === 'preflight' ? 'Prevuelo' : 'Briefing'}
                                </button>
                            )
                        ))}
                    </div>

                    <div className="flex-1 space-y-4">
                        {dynamicLabels.length > 0 ? dynamicLabels.map(item => (
                            <CheckItem key={item.id} label={item.label_text} checked={checks[activeTab][item.field_number] || false} onChange={() => handleCheck(item.field_number)} />
                        )) : (
                            <p className="text-center text-xs text-slate-500 italic py-10">No hay requerimientos configurados para {activeTab}.</p>
                        )}
                    </div>

                    <button 
                        disabled={!isMissionReady || saving} 
                        onClick={handleFinalize} 
                        className={`mt-10 w-full py-5 rounded-[2rem] font-black uppercase text-xs shadow-2xl transition-all ${isMissionReady ? 'bg-emerald-600 text-white active:scale-95' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                    >
                        {saving ? '...' : isMissionReady ? 'AUTORIZADO VOLAR' : 'PROTOCOLOS PENDIENTES'}
                    </button>
                </aside>
            )}
        </div>
    );
}

function CheckItem({ label, checked, onChange }) {
    return (
        <label className={`flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 cursor-pointer ${checked ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-white/5 border-white/10 hover:border-white/20'}`}>
            <span className={`text-[11px] font-bold ${checked ? 'text-emerald-400' : 'text-slate-400'}`}>{label}</span>
            <div className={`size-5 rounded border-2 flex items-center justify-center ${checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'}`}>
                {checked && <span className="material-symbols-outlined text-white text-[10px]">check</span>}
            </div>
            <input type="checkbox" checked={checked} onChange={onChange} className="hidden" />
        </label>
    );
}