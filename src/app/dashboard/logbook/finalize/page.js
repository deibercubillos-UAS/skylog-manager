'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';

export default function FinalizeFlightPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const flightIdParam = searchParams.get('id');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [openFlights, setOpenFlights] = useState([]);
    const [form, setForm] = useState({
        flight_id: '', landing_time: '', safety_report: false, notes: ''
    });

    useEffect(() => {
        async function loadOpenFlights() {
            const { data: { user } } = await supabase.auth.getUser();
            const { data } = await supabase
                .from('flights')
                .select('*, aircraft(model)')
                .is('landing_time', null)
                .order('created_at', { ascending: false });
            
            setOpenFlights(data || []);
            if (flightIdParam) setForm(prev => ({ ...prev, flight_id: flightIdParam }));
            else if (data?.length > 0) setForm(prev => ({ ...prev, flight_id: data[0].id }));
            
            setLoading(false);
        }
        loadOpenFlights();
    }, [flightIdParam]);

    const handleCloseFlight = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            // 1. Calcular duración (Simplificado)
            const flight = openFlights.find(f => f.id === form.flight_id);
            const t1 = flight.takeoff_time;
            const t2 = form.landing_time;
            
            // 2. Actualizar el vuelo
            const { error } = await supabase.from('flights').update({
                landing_time: form.landing_time,
                safety_report: form.safety_report,
                notes: form.notes
            }).eq('id', form.flight_id);

            if (!error) {
                alert("✅ BITÁCORA CERRADA EXITOSAMENTE");
                router.push('/dashboard/logbook');
            }
        } finally { setSaving(false); }
    };

    if (loading) return <div className="p-20 text-center font-black animate-pulse">LOCALIZANDO AERONAVE...</div>;

    return (
        <div className="max-w-2xl mx-auto space-y-8 text-left animate-in fade-in duration-500 pb-20">
            <header>
                <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Fin de Vuelo</h2>
                <p className="text-slate-500 text-sm">Registro de aterrizaje y reporte de seguridad.</p>
            </header>

            <form onSubmit={handleCloseFlight} className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 space-y-8">
                <div className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Seleccionar Vuelo en Curso</label>
                        <select required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={form.flight_id} onChange={e => setForm({...form, flight_id: e.target.value})}>
                            {openFlights.map(f => (
                                <option key={f.id} value={f.id}>{f.mission_id} - {f.aircraft?.model} (Despegue: {f.takeoff_time})</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Hora de Aterrizaje (Formato 24h)</label>
                        <input required type="time" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-lg" onChange={e => setForm({...form, landing_time: e.target.value})} />
                    </div>

                    <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-black text-slate-900 uppercase">¿Reporte de Seguridad?</p>
                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">¿Hubo alguna novedad o incidente?</p>
                        </div>
                        <div className="flex bg-white p-1 rounded-xl border">
                            <button type="button" onClick={() => setForm({...form, safety_report: false})} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${!form.safety_report ? 'bg-emerald-500 text-white' : 'text-slate-400'}`}>No</button>
                            <button type="button" onClick={() => setForm({...form, safety_report: true})} className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${form.safety_report ? 'bg-red-500 text-white' : 'text-slate-400'}`}>Sí</button>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Observaciones Finales</label>
                        <textarea rows="4" className="w-full p-4 bg-slate-50 rounded-2xl border-none text-sm font-medium" placeholder="Estado del equipo, nivel de batería final, etc..." onChange={e => setForm({...form, notes: e.target.value})} />
                    </div>
                </div>

                <button disabled={saving} type="submit" className="w-full py-5 bg-slate-900 text-white font-black rounded-[2rem] shadow-xl uppercase text-xs tracking-widest active:scale-95 transition-all">
                    {saving ? 'PROCESANDO...' : 'CERRAR BITÁCORA DE VUELO'}
                </button>
            </form>
        </div>
    );
}