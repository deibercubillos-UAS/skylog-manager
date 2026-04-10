'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DailyFlightForm() {
    const router = useRouter();
    const [auths, setAuths] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedAuth, setSelectedAuth] = useState(null);

    const [form, setForm] = useState({
        takeoff_time: '', landing_time: '', location: '', 
        mission_id: '', aircraft_id: '', pilot_id: '', notes: ''
    });

    useEffect(() => {
        async function loadPendingMissions() {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
            
            const { data } = await supabase
                .from('flight_authorizations')
                .select('*, pilots:pilot_id(*), aircraft:aircraft_id(*)')
                .eq('organization_id', prof.organization_id)
                .eq('status', 'pendiente');
            
            setAuths(data || []);
            setLoading(false);
        }
        loadPendingMissions();
    }, []);

    const handleAuthSelect = (id) => {
        const auth = auths.find(a => a.id === id);
        if (auth) {
            setSelectedAuth(auth);
            setForm({
                ...form,
                location: auth.location,
                mission_id: auth.mission_id,
                aircraft_id: auth.aircraft_id,
                pilot_id: auth.pilot_id
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        const { data: { user } } = await supabase.auth.getUser();
        const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();

        const { error } = await supabase.from('flights').insert([{
            ...form,
            organization_id: prof.organization_id,
            owner_id: user.id,
            flight_date: new Date().toISOString().split('T')[0]
        }]);

        if (!error) {
            await supabase.from('flight_authorizations').update({ status: 'realizado' }).eq('mission_id', form.mission_id);
            alert("✅ VUELO REGISTRADO EN BITÁCORA");
            router.push('/dashboard/logbook');
        }
        setSaving(false);
    };

    if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400">CARGANDO FORMULARIO...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8 text-left pb-20 animate-in fade-in duration-500">
            <header className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Vuelo Diario</h2>
                    <p className="text-slate-500 text-sm">Registro de operación F-OPS-001</p>
                </div>
                <Link href="/dashboard/logbook" className="text-xs font-bold text-slate-400 uppercase">Cancelar</Link>
            </header>

            {/* SECTOR DE AUTO-COMPLETADO */}
            <section className="bg-orange-50 p-8 rounded-[2.5rem] border border-orange-200">
                <h3 className="text-[10px] font-black text-orange-600 uppercase mb-4 tracking-widest text-left">Órdenes de Vuelo Disponibles</h3>
                <select 
                    className="w-full p-4 bg-white rounded-2xl border-none font-bold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-orange-500"
                    onChange={(e) => handleAuthSelect(e.target.value)}
                >
                    <option value="">-- Seleccionar Misión Programada --</option>
                    {auths.map(a => (
                        <option key={a.id} value={a.id}>{a.mission_id} - {a.location} ({a.pilots?.name})</option>
                    ))}
                </select>
            </section>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Información Técnica</p>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Aeronave Seleccionada</label>
                            <input disabled className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-500" value={selectedAuth?.aircraft?.model || 'Esperando selección...'} />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Piloto al Mando (PIC)</label>
                            <input disabled className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-500" value={selectedAuth?.pilots?.name || 'Esperando selección...'} />
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tiempos de Vuelo</p>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400">Despegue</label>
                                <input required type="time" className="w-full p-3 bg-slate-50 rounded-xl font-bold" onChange={e => setForm({...form, takeoff_time: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400">Aterrizaje</label>
                                <input required type="time" className="w-full p-3 bg-slate-50 rounded-xl font-bold" onChange={e => setForm({...form, landing_time: e.target.value})} />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-400">Ubicación de Operación</label>
                            <input required className="w-full p-3 bg-slate-50 rounded-xl font-bold" value={form.location} onChange={e => setForm({...form, location: e.target.value})} />
                        </div>
                    </div>
                </div>

                <textarea 
                    className="w-full p-6 bg-white rounded-[2rem] border border-slate-100 text-sm font-medium outline-none focus:ring-2 focus:ring-orange-500" 
                    rows="3" 
                    placeholder="Observaciones de la misión y novedades técnicas..."
                    onChange={e => setForm({...form, notes: e.target.value})}
                />

                <button 
                    disabled={saving || !selectedAuth} 
                    type="submit" 
                    className={`w-full py-5 rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-xl transition-all ${selectedAuth ? 'bg-orange-600 text-white hover:scale-[1.01] active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                >
                    {saving ? 'PROCESANDO...' : 'FINALIZAR Y GUARDAR EN BITÁCORA'}
                </button>
            </form>
        </div>
    );
}