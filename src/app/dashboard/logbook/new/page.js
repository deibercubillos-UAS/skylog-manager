'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function NewOperationPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [resources, setResources] = useState({ auths: [], batteries: [] });
    const [selectedAuth, setSelectedAuth] = useState(null); // <--- MISIÓN CARGADA
    const [form, setForm] = useState({ auth_id: '', battery_id: '', takeoff_time: '', visual_condition: 'VMC', notes: '' });

    useEffect(() => {
        async function init() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
                const [auths, batteries] = await Promise.all([
                    fetch('/api/flights/authorize').then(r => r.json()),
                    supabase.from('batteries').select('*').eq('organization_id', prof.organization_id).eq('status', 'Operativo')
                ]);
                setResources({ auths: auths || [], batteries: batteries.data || [] });
            } finally { setLoading(false); }
        }
        init();
    }, []);

    // FUNCIÓN DE AUTOCOMPLETADO
    const handleAuthChange = (id) => {
        const auth = resources.auths.find(a => a.id === id);
        if (auth) {
            setSelectedAuth(auth);
            setForm(prev => ({ ...prev, auth_id: id }));
        } else {
            setSelectedAuth(null);
        }
    };

    if (loading) return <div className="p-20 text-center font-black animate-pulse">SINCRO...</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-8 text-left pb-20 animate-in fade-in duration-500">
            <header className="flex justify-between items-center border-b pb-4">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Despacho de Vuelo</h2>
                    <p className="text-slate-500 text-sm italic">Sincronización con Torre de Control</p>
                </div>
                <Link href="/dashboard" className="text-xs font-bold text-slate-400 uppercase border px-4 py-2 rounded-xl">Cancelar</Link>
            </header>

            {/* SELECTOR DE MISIÓN */}
            <section className="bg-orange-600 p-8 rounded-[3rem] text-white shadow-xl">
                <label className="text-[10px] font-black uppercase opacity-80 tracking-widest ml-1">Cargar Orden de Vuelo Autorizada</label>
                <select 
                    className="w-full mt-2 p-5 bg-white rounded-3xl border-none font-black text-slate-900 text-lg shadow-2xl outline-none"
                    value={form.auth_id}
                    onChange={(e) => handleAuthChange(e.target.value)}
                >
                    <option value="">-- SELECCIONE ID DE MISIÓN --</option>
                    {resources.auths.map(a => (
                        <option key={a.id} value={a.id}>{a.mission_id} - {a.location}</option>
                    ))}
                </select>
            </section>

            {selectedAuth && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-bottom duration-500">
                    {/* RESUMEN TÉCNICO AUTOCOMPLETADO */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                        <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest border-b pb-2">Información del Despacho</p>
                        <div className="grid grid-cols-2 gap-4">
                            <InfoBox label="Aeronave" val={selectedAuth.aircraft?.model} />
                            <InfoBox label="S/N Drone" val={selectedAuth.aircraft?.serial_number} />
                            <InfoBox label="Piloto (PIC)" val={selectedAuth.pilots?.name} />
                            <InfoBox label="Ubicación" val={selectedAuth.location} />
                            {selectedAuth.payload && <InfoBox label="Payload (Cámara/Sensor)" val={`${selectedAuth.payload.brand} ${selectedAuth.payload.model}`} />}
                            {selectedAuth.observer && <InfoBox label="Observador" val={selectedAuth.observer.name} />}
                        </div>
                    </div>

                    {/* CAMPOS A COMPLETAR POR EL PILOTO */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Datos de Salida</p>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Batería de Vuelo</label>
                                <select className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm" value={form.battery_id} onChange={e => setForm({...form, battery_id: e.target.value})}>
                                    <option value="">-- Seleccionar --</option>
                                    {resources.batteries.map(b => <option key={b.id} value={b.id}>{b.brand} {b.model} ({b.serial_number})</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Hora Despegue</label>
                                    <input type="time" className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm" onChange={e => setForm({...form, takeoff_time: e.target.value})} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-500 uppercase ml-1">Visibilidad</label>
                                    <select className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-sm" value={form.visual_condition} onChange={e => setForm({...form, visual_condition: e.target.value})}>
                                        <option value="VMC">VMC</option><option value="IMC">IMC</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <button className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-orange-600 transition-all">Siguiente: Protocolos de Seguridad</button>
                    </div>
                </div>
            )}
        </div>
    );
}

function InfoBox({ label, val }) {
    return (
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-[7px] font-black text-slate-400 uppercase leading-none">{label}</p>
            <p className="text-[11px] font-bold text-slate-800 mt-1 uppercase truncate">{val || 'N/A'}</p>
        </div>
    );
}