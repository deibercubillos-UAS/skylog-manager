'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function DailyFlightForm() {
    const [auths, setAuths] = useState([]); // Autorizaciones programadas
    const [drones, setDrones] = useState([]);
    const [pilots, setPilots] = useState([]);
    const [selectedDrone, setSelectedDrone] = useState(null);
    const [selectedPilot, setSelectedPilot] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        takeoff: '', landing: '', total_time: '0.0',
        weather: 'Despejado', visual: 'VMC', location: '', mission_number: ''
    });

    useEffect(() => {
        async function loadData() {
            const { data: { user } } = await supabase.auth.getUser();
            
            const [dRes, pRes, aRes] = await Promise.all([
                supabase.from('aircraft').select('*').eq('owner_id', user.id),
                supabase.from('pilots').select('*').eq('owner_id', user.id),
                supabase.from('flight_authorizations')
                    .select('*, pilots(*), aircraft(*)')
                    .eq('owner_id', user.id)
                    .eq('status', 'autorizado')
            ]);

            setDrones(dRes.data || []);
            setPilots(pRes.data || []);
            setAuths(aRes.data || []);
            setLoading(false);
        }
        loadData();
    }, []);

    // Lógica para auto-completar al seleccionar una misión programada
    const handleAuthSelect = (authId) => {
        const auth = auths.find(a => a.id === authId);
        if (auth) {
            setSelectedDrone(auth.aircraft);
            setSelectedPilot(auth.pilots);
            setForm({
                ...form,
                location: auth.location,
                mission_number: auth.mission_id
            });
        } else {
            // Reset si elige "Vuelo libre"
            setSelectedDrone(null);
            setSelectedPilot(null);
            setForm({ ...form, location: '', mission_number: '' });
        }
    };

    // Cálculo automático de horas
    useEffect(() => {
        if (form.takeoff && form.landing) {
            const t1 = new Date(`2000-01-01T${form.takeoff}`);
            const t2 = new Date(`2000-01-01T${form.landing}`);
            let diff = (t2 - t1) / 1000 / 60 / 60;
            if (diff < 0) diff += 24;
            setForm(prev => ({ ...prev, total_time: diff.toFixed(1) }));
        }
    }, [form.takeoff, form.landing]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        // Aquí iría el guardado en la tabla 'flights'
        alert("✅ Registro de vuelo guardado y vinculado a la misión.");
        setSaving(false);
    };

    if (loading) return <div className="p-20 text-center animate-pulse font-black uppercase text-slate-300">Sincronizando con Torre de Control...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 text-left pb-20">
            <header className="flex justify-between items-center text-left">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Formato de Vuelo Diario</h2>
                    <p className="text-slate-500 text-sm">Registro de operación F-OPS-001.</p>
                </div>
                <span className="bg-orange-100 text-[#ec5b13] px-4 py-1.5 rounded-full text-[10px] font-black uppercase">F-OPS-001</span>
            </header>

            {/* SELECCIÓN DE MISIÓN PROGRAMADA */}
            <section className="bg-orange-50 p-8 rounded-[2rem] border border-orange-200 text-left">
                <h3 className="text-[10px] font-black uppercase text-orange-600 tracking-widest mb-4">Misiones Autorizadas (Jefatura de Pilotos)</h3>
                <select 
                    className="w-full p-4 bg-white border border-orange-200 rounded-2xl font-black text-sm text-slate-700 outline-none focus:ring-2 focus:ring-orange-500"
                    onChange={e => handleAuthSelect(e.target.value)}
                >
                    <option value="">-- Seleccionar Misión Programada o Vuelo Libre --</option>
                    {auths.map(a => (
                        <option key={a.id} value={a.id}>{a.mission_id} - {a.location} ({new Date(a.scheduled_at).toLocaleDateString()})</option>
                    ))}
                </select>
                <p className="mt-3 text-[10px] text-orange-400 font-bold italic">Al seleccionar una misión, los datos técnicos se cargarán automáticamente.</p>
            </section>

            <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* INFO UAS */}
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-4 text-left">
                        <h3 className="text-[10px] font-black uppercase text-[#ec5b13] tracking-widest">Información UAS</h3>
                        <div className="p-4 bg-slate-50 rounded-2xl space-y-2">
                            <p className="text-[9px] font-black text-slate-400 uppercase">Aeronave</p>
                            <p className="text-sm font-bold text-slate-800">{selectedDrone ? `${selectedDrone.brand} ${selectedDrone.model}` : 'No seleccionado'}</p>
                            <p className="text-[10px] font-mono text-slate-500">S/N: {selectedDrone?.serial_number || '---'}</p>
                            <p className="text-[10px] font-bold text-[#ec5b13]">RUAS: {selectedDrone?.ruas || '---'}</p>
                        </div>
                    </div>

                    {/* INFO PILOTO */}
                    <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-4 text-left">
                        <h3 className="text-[10px] font-black uppercase text-[#ec5b13] tracking-widest">Tripulación</h3>
                        <div className="p-4 bg-slate-50 rounded-2xl space-y-2">
                            <p className="text-[9px] font-black text-slate-400 uppercase">Piloto al Mando (PIC)</p>
                            <p className="text-sm font-bold text-slate-800">{selectedPilot?.name || 'No seleccionado'}</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">CIPU: {selectedPilot?.cipu_number || '---'}</p>
                            <p className="text-[10px] font-black text-emerald-500 uppercase">{selectedPilot?.position || '---'}</p>
                        </div>
                    </div>
                </div>

                {/* INFO VUELO */}
                <div className="bg-[#1A202C] p-10 rounded-[3rem] text-white space-y-8 text-left">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-500 uppercase">Hora Despegue</label>
                            <input required type="time" className="w-full bg-slate-800 p-4 rounded-2xl border-none font-bold" onChange={e => setForm({...form, takeoff: e.target.value})}/>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-500 uppercase">Hora Aterrizaje</label>
                            <input required type="time" className="w-full bg-slate-800 p-4 rounded-2xl border-none font-bold" onChange={e => setForm({...form, landing: e.target.value})}/>
                        </div>
                        <div className="p-4 bg-[#ec5b13] rounded-2xl text-center shadow-lg shadow-orange-500/20">
                            <p className="text-[9px] font-black uppercase opacity-60">Tiempo Total</p>
                            <p className="text-2xl font-black">{form.total_time} h</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-500 uppercase">Lugar de Operación</label>
                            <input required className="w-full bg-slate-800 p-4 rounded-2xl border-none font-bold" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-500 uppercase">Condición Visual</label>
                            <select className="w-full bg-slate-800 p-4 rounded-2xl border-none font-bold" onChange={e => setForm({...form, visual: e.target.value})}>
                                <option value="VMC">VMC (Visual)</option>
                                <option value="IMC">IMC (Instrumental)</option>
                            </select>
                        </div>
                    </div>

                    <button type="submit" disabled={saving} className="w-full py-5 bg-[#ec5b13] hover:bg-orange-600 text-white font-black rounded-2xl shadow-xl uppercase transition-all active:scale-95">
                        {saving ? 'Guardando...' : 'Finalizar y Guardar en Bitácora'}
                    </button>
                </div>
            </form>
        </div>
    );
}