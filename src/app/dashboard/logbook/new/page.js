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
    
    const [activeTab, setActiveTab] = useState('briefing');
    const [dynamicLabels, setDynamicLabels] = useState([]);

    const [form, setForm] = useState({
        auth_id: '', battery_id: '', takeoff_time: '', 
        visual_condition: 'VMC', notes: ''
    });

    const [checks, setChecks] = useState({
        health: {},
        briefing: {},
        preflight: {}
    });

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
            } catch (err) {
                console.error("Error init:", err);
            } finally {
                setLoading(false);
            }
        }
        init();
    }, []);

    useEffect(() => {
        async function loadLabels() {
            if (loading) return;
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
        loadLabels();
    }, [activeTab, form.auth_id, loading, resources.auths]);

    const handleCheck = (fieldNumber) => {
        setChecks(prev => ({
            ...prev,
            [activeTab]: { ...prev[activeTab], [fieldNumber]: !prev[activeTab][fieldNumber] }
        }));
    };

    const isTabComplete = () => {
        if (dynamicLabels.length === 0) return false;
        return dynamicLabels.every(label => checks[activeTab][label.field_number]);
    };

    const isAuthorized = () => {
        return form.auth_id && form.battery_id && form.takeoff_time && isTabComplete();
    };

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

            if (!healthDone && Object.keys(checks.health).length > 0) {
                await supabase.from('daily_health_checks').insert([{ user_id: user.id, organization_id: selectedAuth.organization_id }]);
            }

            alert("🚀 DESPEGUE AUTORIZADO");
            router.push('/dashboard/logbook');
        } catch (err) {
            alert("Error: " + err.message);
        } finally { setSaving(false); }
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-[#f8f6f6] font-black animate-pulse">SISTEMAS PRE-VUELO...</div>;

    return (
        <>
            {/* BLOQUEO MOBILE */}
            <div className="lg:hidden flex flex-col items-center justify-center min-h-[70vh] p-10 text-center animate-in fade-in">
                <div className="size-20 bg-orange-100 rounded-3xl flex items-center justify-center text-orange-600 mb-6">
                    <span className="material-symbols-outlined text-5xl">desktop_windows</span>
                </div>
                <h2 className="text-2xl font-black uppercase text-slate-900">Acceso Restringido</h2>
                <p className="text-slate-500 text-sm mt-4 max-w-xs uppercase font-bold text-[10px] tracking-widest">
                    Esta sección requiere un <span className="text-orange-600">Computador o Tablet</span> para el correcto diligenciamiento de protocolos.
                </p>
                <Link href="/dashboard" className="mt-10 px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase">Volver</Link>
            </div>

            {/* INTERFAZ DESKTOP */}
            <div className="hidden lg:flex h-screen -m-10 bg-[#f8f6f6] text-left overflow-hidden">
                <div className="flex-1 overflow-y-auto p-10 space-y-8">
                    <header className="flex justify-between items-center bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                        <div>
                            <h2 className="text-2xl font-black uppercase text-slate-900">Nueva Operación</h2>
                            <p className="text-[10px] font-black text-orange-600 uppercase mt-1">F-OPS-001 | Despacho</p>
                        </div>
                        <Link href="/dashboard" className="text-xs font-bold text-slate-400 uppercase">Abortar</Link>
                    </header>

                    <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200 space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400">Misión Programada</label>
                                <select className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={form.auth_id} onChange={e => setForm({...form, auth_id: e.target.value})}>
                                    <option value="">-- Seleccionar --</option>
                                    {resources.auths.map(a => <option key={a.id} value={a.id}>{a.mission_id} - {a.location}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400">Batería</label>
                                <select className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={form.battery_id} onChange={e => setForm({...form, battery_id: e.target.value})}>
                                    <option value="">-- Seleccionar --</option>
                                    {resources.batteries.map(b => <option key={b.id} value={b.id}>{b.brand} {b.model} ({b.serial_number})</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400">Hora Despegue</label>
                                <input type="time" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" onChange={e => setForm({...form, takeoff_time: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase text-slate-400">Condición Visual</label>
                                <select className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" onChange={e => setForm({...form, visual_condition: e.target.value})}>
                                    <option value="VMC">VMC (Visual)</option>
                                    <option value="IMC">IMC (Instrumental)</option>
                                    <option value="NIGHT">Nocturno</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {form.auth_id && (
                        <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-bottom-4">
                            <div className="p-6 bg-orange-600 text-white rounded-[2rem]">
                               <p className="text-[8px] font-black uppercase opacity-60">Aeronave</p>
                               <p className="text-lg font-black">{resources.auths.find(a => a.id === form.auth_id)?.aircraft?.model}</p>
                            </div>
                            <div className="p-6 bg-slate-900 text-white rounded-[2rem]">
                               <p className="text-[8px] font-black uppercase opacity-60">PIC Autorizado</p>
                               <p className="text-lg font-black">{resources.auths.find(a => a.id === form.auth_id)?.pilots?.name}</p>
                            </div>
                        </div>
                    )}
                </div>

                <aside className="w-[450px] bg-[#1A202C] text-white p-10 flex flex-col shadow-2xl border-l border-white/5">
                    <div className="mb-10">
                        <h3 className="text-xl font-black uppercase">Seguridad</h3>
                        <p className="text-orange-500 text-[9px] font-black uppercase">Validación Protocolos</p>
                    </div>
                    <div className="flex bg-white/5 p-1 rounded-xl mb-10">
                        <button onClick={() => setActiveTab('briefing')} className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg ${activeTab === 'briefing' ? 'bg-orange-600' : 'text-slate-500'}`}>Briefing</button>
                        <button onClick={() => setActiveTab('preflight')} className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg ${activeTab === 'preflight' ? 'bg-orange-600' : 'text-slate-500'}`}>Prevuelo</button>
                        {!healthDone && <button onClick={() => setActiveTab('health')} className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg ${activeTab === 'health' ? 'bg-orange-600' : 'text-slate-500'}`}>Salud</button>}
                    </div>

                    <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar pr-2">
                        {dynamicLabels.map(item => (
                            <CheckItem 
                                key={item.id}
                                label={item.label_text} 
                                checked={checks[activeTab][item.field_number] || false} 
                                onChange={() => handleCheck(item.field_number)} 
                            />
                        ))}
                    </div>

                    <button 
                        disabled={!isAuthorized() || saving}
                        onClick={handleFinalize}
                        className={`mt-10 w-full py-5 rounded-[2rem] font-black uppercase text-xs shadow-2xl transition-all ${isAuthorized() ? 'bg-orange-600 text-white hover:scale-[1.02]' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                    >
                        {saving ? '...' : isAuthorized() ? 'AUTORIZADO VOLAR' : 'PASOS PENDIENTES'}
                    </button>
                </aside>
            </div>
        </>
    );
}

function CheckItem({ label, checked, onChange }) {
    return (
        <label className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${checked ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-white/5 border-white/10'}`}>
            <span className={`text-[11px] font-bold ${checked ? 'text-emerald-400' : 'text-slate-400'}`}>{label}</span>
            <div className={`size-5 rounded border-2 flex items-center justify-center ${checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-600'}`}>
                {checked && <span className="material-symbols-outlined text-white text-[10px]">check</span>}
            </div>
            <input type="checkbox" checked={checked} onChange={onChange} className="hidden" />
        </label>
    );
}