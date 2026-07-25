'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from '@/lib/toast';
import { getOrgContext } from '@/lib/apiAuth';

export default function FinalizeFlightPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const flightIdParam = searchParams.get('id');

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [openFlights, setOpenFlights] = useState([]);
    const [selectedFlight, setSelectedFlight] = useState(null);
    const [orgCode, setOrgCode] = useState(null);
    const [form, setForm] = useState({
        flight_id: '', landing_time: '', safety_report: false, report_type: '', notes: ''
    });

    useEffect(() => {
    async function loadOpenFlights() {
        // Resuelve la organización activa vía organization_members (evita error 406)
        const ctx = await getOrgContext(supabase);

        const [{ data, error }, { data: org }] = await Promise.all([
            supabase
                .from('flights')
                .select('*, aircraft(model, serial_number, total_hours)')
                .eq('organization_id', ctx.orgId) // Filtro explícito
                .is('landing_time', null)
                .order('created_at', { ascending: false }),
            supabase.from('organizations').select('slug, unique_code').eq('id', ctx.orgId).maybeSingle(),
        ]);
        setOrgCode(org?.slug || org?.unique_code || null);

        if (error) console.error(error);

        const flights = data || [];
        setOpenFlights(flights);

        // Vincular el ID que viene por URL (verificando que pertenezca a un vuelo abierto)
        let targetId = '';
        if (flightIdParam) {
            const match = flights.find(f => f.id === flightIdParam);
            if (match) {
                targetId = flightIdParam;
            } else if (flights.length > 0) {
                // El ID de la URL no corresponde a ningún vuelo abierto de esta org
                toast.warn('El vuelo solicitado ya fue cerrado o no existe. Selecciona uno de la lista.');
                targetId = flights[0].id;
            }
        } else if (flights.length > 0) {
            targetId = flights[0].id;
        }

        if (targetId) {
            setForm(prev => ({ ...prev, flight_id: targetId }));
            setSelectedFlight(flights.find(f => f.id === targetId));
        }
        setLoading(false);
    }
    loadOpenFlights();
    }, [flightIdParam]);

    const handleSelectChange = (id) => {
        // Resetear los campos capturados — si no, al cambiar de "Cambiar Vuelo" la hora de
        // aterrizaje / reporte SMS / notas ya escritas para el vuelo anterior quedaban
        // aplicadas por error al vuelo recién seleccionado.
        setForm(prev => ({ ...prev, flight_id: id, landing_time: '', safety_report: false, report_type: '', notes: '' }));
        setSelectedFlight(openFlights.find(f => f.id === id));
    };

    const handleCloseFlight = async (e) => {
    e.preventDefault();
    if (!form.landing_time || !selectedFlight) return toast.warn("Faltan datos");
    if (form.safety_report && !form.report_type) return toast.warn("Especifica si el reporte es VOR o MOR");

    // VALIDACIÓN: La hora de aterrizaje debe ser POSTERIOR a la de despegue
    const [h1, m1] = selectedFlight.takeoff_time.split(':').map(Number);
    const [h2, m2] = form.landing_time.split(':').map(Number);
    let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
    // Vuelos nocturnos (condición NIGHT) pueden cruzar medianoche — este formulario solo
    // captura hora, no fecha de aterrizaje. Si el resultado directo es negativo pero
    // asumir que el aterrizaje fue al día siguiente da una duración corta y plausible
    // (≤ 6h, muy por encima de la autonomía real de cualquier batería de dron), se
    // interpreta como cruce de medianoche en vez de bloquearlo como hora inválida.
    if (diff <= 0 && diff + 1440 <= 360) diff += 1440;
    if (diff <= 0) {
        return toast.warn(`Hora inválida: el aterrizaje (${form.landing_time}) debe ser posterior al despegue (${selectedFlight.takeoff_time}). Verifique los valores.`);
    }
    const durationOfThisFlight = parseFloat((diff / 60).toFixed(2));

    setSaving(true);
    try {

        // 2. OBTENER HORAS DEL DRONE + CICLOS DE LA BATERÍA EN PARALELO
        const [droneRes, batteryRes] = await Promise.all([
            supabase.from('aircraft').select('total_hours').eq('id', selectedFlight.aircraft_id).single(),
            selectedFlight.battery_id
                ? supabase.from('batteries').select('cycles').eq('id', selectedFlight.battery_id).single()
                : Promise.resolve({ data: null })
        ]);
        if (droneRes.error) throw droneRes.error;

        // 3. CALCULAR NUEVOS VALORES
        const currentTotalHours = parseFloat(droneRes.data?.total_hours || 0);
        const finalTotalHours = parseFloat((currentTotalHours + durationOfThisFlight).toFixed(2));
        const currentCycles = parseInt(batteryRes.data?.cycles || 0, 10);
        const newCycles = currentCycles + 1;

        // 4. ACTUALIZACIÓN ATÓMICA (vuelo + drone + batería)
        const { error: logError } = await supabase.from('flights').update({
            landing_time: form.landing_time,
            safety_report: form.safety_report,
            notes: form.notes,
            total_time: durationOfThisFlight
        }).eq('id', form.flight_id);
        if (logError) throw logError;

        const { error: airError } = await supabase.from('aircraft').update({
            total_hours: finalTotalHours
        }).eq('id', selectedFlight.aircraft_id).eq('organization_id', selectedFlight.organization_id);
        if (airError) throw airError;

        // Solo actualizamos batería si el vuelo tenía una asociada
        if (selectedFlight.battery_id) {
            const { error: batError } = await supabase.from('batteries').update({
                cycles: newCycles
            }).eq('id', selectedFlight.battery_id);
            if (batError) console.warn('No se pudo actualizar ciclos de batería:', batError.message);
        }

        toast.success(`Operación cerrada. Anterior: ${currentTotalHours}h | Volado: ${durationOfThisFlight}h | Nuevo Total: ${finalTotalHours}h`);

        // Si hubo reporte de seguridad, se redirige al formato público correspondiente
        // (VOR o MOR) en vez de volver a la Bitácora — mismo formulario público que usa
        // cualquier miembro de la tripulación desde su Dashboard, para radicarlo de
        // inmediato mientras el incidente está fresco. safety_report/report_type NO
        // crean el reporte automáticamente (siguen siendo solo una bandera + esta
        // redirección) — el reportante debe diligenciar el formulario igual que siempre.
        if (form.safety_report && form.report_type && orgCode) {
            toast.info(`Redirigiendo al formato ${form.report_type}...`);
            window.location.href = `/${form.report_type.toLowerCase()}/${orgCode}`;
        } else {
            window.location.href = '/dashboard/logbook';
        }

    } catch (err) {
        toast.error("Error de cálculo: " + err.message);
    } finally { setSaving(false); }
};

    if (loading) return (
        <div className="fixed inset-0 bg-[#f8f6f6] z-[200] flex items-center justify-center">
            <p className="font-black animate-pulse text-slate-400 uppercase text-xs tracking-widest">Localizando aeronave...</p>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-[#f8f6f6] z-[200] flex flex-col font-display text-left">
            <header className="h-16 md:h-20 bg-[#1A202C] flex items-center justify-between px-4 md:px-10 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="size-8 md:size-10 bg-orange-600 rounded-xl flex items-center justify-center text-white font-black">B</div>
                    <div className="text-left">
                        <h2 className="text-xs md:text-sm font-black uppercase leading-none text-white">Cierre de Vuelo</h2>
                        <p className="text-xs font-bold text-orange-400 uppercase mt-1">Registro de Aterrizaje F-OPS-001</p>
                    </div>
                </div>
                <button onClick={() => router.push('/dashboard/logbook')} className="material-symbols-outlined text-slate-400 hover:text-red-400 transition-colors">close</button>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-12">
                <div className="max-w-xl mx-auto space-y-6 md:space-y-8 pb-[max(5rem,calc(2rem+env(safe-area-inset-bottom,16px)))]">

                    {openFlights.length === 0 ? (
                        <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-200 text-center space-y-6 animate-in slide-in-from-bottom duration-500">
                            <div className="size-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
                                <span className="material-symbols-outlined text-4xl">flight_land</span>
                            </div>
                            <h2 className="text-xl font-black uppercase text-slate-900">No hay vuelos activos</h2>
                            <p className="text-sm text-slate-500 uppercase font-bold text-xs">Todos los registros están cerrados.</p>
                            <button onClick={() => router.push('/dashboard/logbook/new')} className="inline-block px-8 py-3 bg-orange-600 text-white rounded-xl font-black text-xs uppercase active:scale-95 transition-all">Iniciar Nueva Operación</button>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
                            {/* CONTEXTO DE LA MISIÓN (CARD) */}
                            {selectedFlight && (
                                <div className="bg-[#1A202C] p-6 rounded-[2.5rem] text-white shadow-xl border border-white/5 space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-xs font-black text-orange-500 uppercase tracking-widest">Misión en Curso</p>
                                            <h3 className="text-lg font-black uppercase">{selectedFlight.mission_id}</h3>
                                        </div>
                                        <span className="px-3 py-1 bg-orange-600 text-xs font-black rounded-full animate-pulse">EN VUELO</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/10 pt-4">
                                        <div>
                                            <p className="text-xs font-black text-slate-500 uppercase">Aeronave / S/N</p>
                                            <p className="text-xs font-bold truncate">{selectedFlight.aircraft?.model}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-500 uppercase">Hora Despegue</p>
                                            <p className="text-xs font-bold text-orange-400">{selectedFlight.takeoff_time}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleCloseFlight} className="bg-white p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] shadow-sm border border-slate-200 space-y-8">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-slate-400 ml-1">Cambiar Vuelo</label>
                                        <select className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-orange-500" value={form.flight_id} onChange={e => handleSelectChange(e.target.value)}>
                                            {openFlights.map(f => (
                                                <option key={f.id} value={f.id}>{f.mission_id} - {f.aircraft?.model}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-slate-400 ml-1">Hora de Aterrizaje (24H)</label>
                                        <input required type="time" value={form.landing_time} className="w-full p-5 bg-slate-100 rounded-3xl border-none font-black text-2xl text-slate-900 outline-none focus:ring-2 focus:ring-orange-500" onChange={e => setForm({...form, landing_time: e.target.value})} />
                                    </div>

                                    <div className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4">
                                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                            <div className="text-center sm:text-left">
                                                <p className="text-xs font-black text-slate-900 uppercase">¿Reporte SMS?</p>
                                                <p className="text-xs text-slate-400 font-bold uppercase mt-1">¿Hubo incidentes en el aterrizaje?</p>
                                            </div>
                                            <div className="flex bg-white p-1.5 rounded-2xl border shadow-sm w-full sm:w-auto">
                                                <button type="button" onClick={() => setForm({...form, safety_report: false, report_type: ''})} className={`flex-1 sm:px-6 py-3 rounded-xl text-xs font-black uppercase transition-all ${!form.safety_report ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400'}`}>No</button>
                                                <button type="button" onClick={() => setForm({...form, safety_report: true})} className={`flex-1 sm:px-6 py-3 rounded-xl text-xs font-black uppercase transition-all ${form.safety_report ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' : 'text-slate-400'}`}>Sí</button>
                                            </div>
                                        </div>

                                        {form.safety_report && (
                                            <div className="space-y-2 pt-3 border-t border-slate-200 animate-in fade-in slide-in-from-top-2 duration-300">
                                                <p className="text-xs font-black text-slate-700 uppercase text-center sm:text-left">¿Es un reporte VOR o MOR? <span className="text-orange-600">*</span></p>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <button type="button" onClick={() => setForm({...form, report_type: 'VOR'})}
                                                        className={`p-4 rounded-2xl border-2 text-left transition-all ${form.report_type === 'VOR' ? 'border-orange-500 bg-orange-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                                                        <span className="material-symbols-outlined text-orange-600 text-xl">description</span>
                                                        <p className="text-xs font-black uppercase mt-1.5 text-slate-900">VOR</p>
                                                        <p className="text-[10.5px] text-slate-500 leading-snug mt-0.5">Reporte voluntario, no obligatorio</p>
                                                    </button>
                                                    <button type="button" onClick={() => setForm({...form, report_type: 'MOR'})}
                                                        className={`p-4 rounded-2xl border-2 text-left transition-all ${form.report_type === 'MOR' ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                                                        <span className="material-symbols-outlined text-red-600 text-xl">gavel</span>
                                                        <p className="text-xs font-black uppercase mt-1.5 text-slate-900">MOR</p>
                                                        <p className="text-[10.5px] text-slate-500 leading-snug mt-0.5">Reporte obligatorio ante AeroCivil</p>
                                                    </button>
                                                </div>
                                                {form.report_type && (
                                                    <p className="text-[10.5px] font-semibold text-slate-400 pt-1">
                                                        Al finalizar la misión se te redirigirá al formato {form.report_type} para radicarlo.
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-black uppercase text-slate-400 ml-1">Observaciones Finales</label>
                                        <textarea rows="4" value={form.notes} className="w-full p-4 bg-slate-50 rounded-2xl border-none text-sm font-medium focus:ring-2 focus:ring-orange-500 outline-none" placeholder="Estado final del equipo..." onChange={e => setForm({...form, notes: e.target.value})} />
                                    </div>
                                </div>

                                <button disabled={saving} type="submit" className="w-full py-5 bg-slate-900 text-white font-black rounded-[2rem] shadow-xl uppercase text-xs tracking-widest active:scale-95 transition-all disabled:opacity-50">
                                    {saving ? 'CERRANDO...' : 'FINALIZAR MISIÓN'}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
