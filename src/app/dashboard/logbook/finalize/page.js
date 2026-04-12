'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function FinalizeFlightPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const flightIdParam = searchParams.get('id');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [openFlights, setOpenFlights] = useState([]);
    const [selectedFlight, setSelectedFlight] = useState(null);
    const [form, setForm] = useState({
        flight_id: '', landing_time: '', safety_report: false, notes: ''
    });

    useEffect(() => {
        async function loadOpenFlights() {
            const { data: { user } } = await supabase.auth.getUser();
            const { data } = await supabase
                .from('flights')
                .select('*, aircraft(model, serial_number), pilots(name)')
                .is('landing_time', null)
                .order('created_at', { ascending: false });
            
            setOpenFlights(data || []);
            
            const targetId = flightIdParam || (data?.length > 0 ? data[0].id : '');
            if (targetId) {
                setForm(prev => ({ ...prev, flight_id: targetId }));
                setSelectedFlight(data?.find(f => f.id === targetId));
            }
            setLoading(false);
        }
        loadOpenFlights();
    }, [flightIdParam]);

    const handleSelectChange = (id) => {
        setForm(prev => ({ ...prev, flight_id: id }));
        setSelectedFlight(openFlights.find(f => f.id === id));
    };

    const handleCloseFlight = async (e) => {
    e.preventDefault();
    if (!form.landing_time || !selectedFlight) return alert("Faltan datos");
    
    setSaving(true);
    try {
        // 1. Cálculo de duración precisa
        const [h1, m1] = selectedFlight.takeoff_time.split(':').map(Number);
        const [h2, m2] = form.landing_time.split(':').map(Number);
        let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
        if (diff < 0) diff += 1440; 
        const duration = parseFloat((diff / 60).toFixed(2));

        // 2. Actualizar el registro del vuelo
        const { error: logError } = await supabase.from('flights').update({
            landing_time: form.landing_time,
            safety_report: form.safety_report,
            notes: form.notes,
            total_time: duration
        }).eq('id', form.flight_id);

        if (logError) throw logError;

        // 3. ACTUALIZAR HORAS DE LA FLOTA (Corrección de lógica)
        // Obtenemos las horas actuales del drone directamente para evitar desfases
        const { data: droneData } = await supabase
            .from('aircraft')
            .select('total_hours')
            .eq('id', selectedFlight.aircraft_id)
            .single();

        const currentDroneHours = parseFloat(droneData?.total_hours || 0);
        const { error: airError } = await supabase
            .from('aircraft')
            .update({ total_hours: currentDroneHours + duration })
            .eq('id', selectedFlight.aircraft_id);

        if (airError) throw airError;

        alert("✅ OPERACIÓN FINALIZADA\nID: " + selectedFlight.mission_id + "\nTiempo: " + duration + " horas.");
        router.push('/dashboard/logbook');

    } catch (err) {
        alert("⚠️ Error de Sincronización: " + err.message);
    } finally { setSaving(false); }
};

    if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400">LOCALIZANDO AERONAVE...</div>;

    if (openFlights.length === 0) return (
        <div className="p-10 text-center space-y-6">
            <div className="size-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
                <span className="material-symbols-outlined text-4xl">flight_land</span>
            </div>
            <h2 className="text-xl font-black uppercase text-slate-900">No hay vuelos activos</h2>
            <p className="text-sm text-slate-500 uppercase font-bold text-[10px]">Todos los registros están cerrados.</p>
            <Link href="/dashboard/logbook/new" className="inline-block px-8 py-3 bg-orange-600 text-white rounded-xl font-black text-[10px] uppercase">Iniciar Nueva Operación</Link>
        </div>
    );

    return (
        <div className="max-w-xl mx-auto space-y-6 text-left pb-20 animate-in fade-in duration-500">
            <header className="px-2">
                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-slate-900">Cierre de Vuelo</h2>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1">Registro de Aterrizaje F-OPS-001</p>
            </header>

            {/* CONTEXTO DE LA MISIÓN (CARD) */}
            {selectedFlight && (
                <div className="bg-[#1A202C] p-6 rounded-[2.5rem] text-white shadow-xl border border-white/5 space-y-4 mx-2">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-[8px] font-black text-orange-500 uppercase tracking-widest">Misión en Curso</p>
                            <h3 className="text-lg font-black uppercase">{selectedFlight.mission_id}</h3>
                        </div>
                        <span className="px-3 py-1 bg-orange-600 text-[9px] font-black rounded-full animate-pulse">EN VUELO</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
                        <div>
                            <p className="text-[7px] font-black text-slate-500 uppercase">Aeronave / S/N</p>
                            <p className="text-[11px] font-bold truncate">{selectedFlight.aircraft?.model}</p>
                        </div>
                        <div>
                            <p className="text-[7px] font-black text-slate-500 uppercase">Hora Despegue</p>
                            <p className="text-[11px] font-bold text-orange-400">{selectedFlight.takeoff_time}</p>
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handleCloseFlight} className="bg-white p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] shadow-sm border border-slate-200 space-y-8 mx-2">
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Cambiar Vuelo</label>
                        <select className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={form.flight_id} onChange={e => handleSelectChange(e.target.value)}>
                            {openFlights.map(f => (
                                <option key={f.id} value={f.id}>{f.mission_id} - {f.aircraft?.model}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Hora de Aterrizaje (24H)</label>
                        <input required type="time" className="w-full p-5 bg-slate-100 rounded-3xl border-none font-black text-2xl text-slate-900" onChange={e => setForm({...form, landing_time: e.target.value})} />
                    </div>

                    <div className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="text-center sm:text-left">
                            <p className="text-xs font-black text-slate-900 uppercase">¿Reporte SMS?</p>
                            <p className="text-[8px] text-slate-400 font-bold uppercase mt-1">¿Hubo incidentes en el aterrizaje?</p>
                        </div>
                        <div className="flex bg-white p-1.5 rounded-2xl border shadow-sm w-full sm:w-auto">
                            <button type="button" onClick={() => setForm({...form, safety_report: false})} className={`flex-1 sm:px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${!form.safety_report ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400'}`}>No</button>
                            <button type="button" onClick={() => setForm({...form, safety_report: true})} className={`flex-1 sm:px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${form.safety_report ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-slate-400'}`}>Sí</button>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Observaciones Finales</label>
                        <textarea rows="4" className="w-full p-4 bg-slate-50 rounded-2xl border-none text-sm font-medium focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Estado final del equipo..." onChange={e => setForm({...form, notes: e.target.value})} />
                    </div>
                </div>

                <button disabled={saving} type="submit" className="w-full py-5 bg-slate-900 text-white font-black rounded-[2rem] shadow-xl uppercase text-xs tracking-widest active:scale-95 transition-all">
                    {saving ? 'CERRANDO...' : 'FINALIZAR MISIÓN'}
                </button>
            </form>
        </div>
    );
}