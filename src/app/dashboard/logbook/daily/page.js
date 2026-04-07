'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function DailyFlightForm() {
    const [drones, setDrones] = useState([]);
    const [pilots, setPilots] = useState([]);
    const [selectedDrone, setSelectedDrone] = useState(null);
    const [selectedPilot, setSelectedPilot] = useState(null);
    const [loading, setLoading] = useState(true);

    const [form, setForm] = useState({
        takeoff: '', landing: '', total_time: '0.0',
        weather: 'Despejado', visual: 'VMC', op_type: ''
    });

    useEffect(() => {
        async function loadData() {
            const { data: { user } } = await supabase.auth.getUser();
            const [dRes, pRes] = await Promise.all([
                supabase.from('aircraft').select('*').eq('owner_id', user.id),
                supabase.from('pilots').select('*').eq('owner_id', user.id)
            ]);
            setDrones(dRes.data || []);
            setPilots(pRes.data || []);
            setLoading(false);
        }
        loadData();
    }, []);

    // Cálculo automático de horas
    useEffect(() => {
        if (form.takeoff && form.landing) {
            const t1 = new Date(`2000-01-01T${form.takeoff}`);
            const t2 = new Date(`2000-01-01T${form.landing}`);
            let diff = (t2 - t1) / 1000 / 60 / 60; // Horas decimales
            if (diff < 0) diff += 24;
            setForm(prev => ({ ...prev, total_time: diff.toFixed(1) }));
        }
    }, [form.takeoff, form.landing]);

    if (loading) return <div className="p-20 text-center animate-pulse font-black">PREPARANDO SISTEMAS...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 text-left pb-20">
            <header className="flex justify-between items-center">
                <h2 className="text-3xl font-black uppercase tracking-tighter">Formato de Vuelo Diario</h2>
                <span className="bg-orange-100 text-[#ec5b13] px-4 py-1 rounded-full text-[10px] font-black uppercase">F-OPS-001 v2.0</span>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* SECCIÓN UAS */}
                <section className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                    <h3 className="text-[#ec5b13] text-[10px] font-black uppercase tracking-widest">Información UAS</h3>
                    <select className="w-full p-3 bg-slate-50 rounded-xl font-bold" onChange={e => setSelectedDrone(drones.find(d => d.id === e.target.value))}>
                        <option>Seleccionar S/N...</option>
                        {drones.map(d => <option key={d.id} value={d.id}>{d.serial_number} ({d.model})</option>)}
                    </select>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="p-3 bg-slate-50 rounded-lg"><b>MARCA:</b> {selectedDrone?.brand || '---'}</div>
                        <div className="p-3 bg-slate-50 rounded-lg"><b>MODELO:</b> {selectedDrone?.model || '---'}</div>
                        <div className="p-3 bg-slate-50 rounded-lg col-span-2"><b>RUAS:</b> {selectedDrone?.ruas || '---'}</div>
                    </div>
                </section>

                {/* SECCIÓN PILOTO */}
                <section className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm space-y-4">
                    <h3 className="text-[#ec5b13] text-[10px] font-black uppercase tracking-widest">Tripulación</h3>
                    <select className="w-full p-3 bg-slate-50 rounded-xl font-bold" onChange={e => setSelectedPilot(pilots.find(p => p.id === e.target.value))}>
                        <option>Seleccionar Nombre...</option>
                        {pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="p-3 bg-slate-50 rounded-lg"><b>CARGO:</b> {selectedPilot?.position || '---'}</div>
                        <div className="p-3 bg-slate-50 rounded-lg"><b>CIPU:</b> {selectedPilot?.cipu_number || '---'}</div>
                    </div>
                </section>
            </div>

            {/* DATOS DE VUELO Y TIEMPOS */}
            <section className="bg-[#1A202C] p-10 rounded-[3rem] text-white">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">Hora Despegue</label>
                        <input type="time" className="w-full bg-slate-800 p-4 rounded-2xl border-none font-bold" onChange={e => setForm({...form, takeoff: e.target.value})}/>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-500 uppercase">Hora Aterrizaje</label>
                        <input type="time" className="w-full bg-slate-800 p-4 rounded-2xl border-none font-bold" onChange={e => setForm({...form, landing: e.target.value})}/>
                    </div>
                    <div className="p-4 bg-[#ec5b13] rounded-2xl text-center">
                        <p className="text-[9px] font-black uppercase opacity-60">Tiempo Total</p>
                        <p className="text-2xl font-black">{form.total_time} h</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                    <input placeholder="Sitio / Lugar de Operación" className="w-full bg-slate-800 p-4 rounded-2xl border-none" />
                    <select className="w-full bg-slate-800 p-4 rounded-2xl border-none font-bold">
                        <option>Condición Visual...</option>
                        <option>VMC (Visual)</option>
                        <option>IMC (Instrumental)</option>
                    </select>
                </div>

                <button className="w-full mt-10 py-5 bg-[#ec5b13] hover:bg-orange-600 text-white font-black rounded-2xl shadow-xl uppercase transition-all active:scale-95">
                    Cerrar y Guardar Registro en Bitácora
                </button>
            </section>
        </div>
    );
}
