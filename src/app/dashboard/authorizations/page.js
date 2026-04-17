'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import EditAuthorizationPanel from '@/components/EditAuthorizationPanel';
import HelpTooltip from '@/components/HelpTooltip';

export default function MissionControlPage() {
    const [activeTab, setActiveTab] = useState('basica');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [missions, setMissions] = useState([]);
    const [pilots, setPilots] = useState([]);
    const [drones, setDrones] = useState([]);
    const [org, setOrg] = useState(null);
    const [editingMission, setEditingMission] = useState(null);

    // ESTADO DEL FORMULARIO BÁSICO
    const [form, setForm] = useState({ 
        pilot_id: '', aircraft_id: '', location: '', 
        scheduled_at: '', mission_type: 'Operación Comercial' 
    });

    // ESTADO DEL FORMULARIO AEROCIVIL (TOTALIDAD DE DATOS)
    const [aeroForm, setAeroForm] = useState({
        // 3. Tipo de Operación
        op_types: [],
        // 4. Información Operación
        client: '', start_date: '', end_date: '', start_time: '', end_time: '',
        weight: '', municipality: '', department: '', cronogram_details: '',
        // 5. Contacto Visual
        visual_type: 'VLOS',
        // 6. Vuelo Especial
        special_types: [], justification: '',
        // 7, 8, 9, 10. Listas (Iniciamos con un slot vacío)
        aircrafts: [{ brand: '', model: '', type: '', sn: '', insurer: '', policy: '', start: '', end: '' }],
        crew: [{ name: '', id: '', phone: '' }],
        coordinates: [{ item: '1', lat: '', lon: '', alt: '' }]
    });

    const loadData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: prof } = await supabase.from('profiles').select('organization_id, role').eq('id', user.id).single();
            const [mRes, pRes, dRes, oRes] = await Promise.all([
                fetch('/api/flights/authorize'),
                supabase.from('pilots').select('*').eq('organization_id', prof.organization_id).eq('is_active', true),
                supabase.from('aircraft').select('*').eq('organization_id', prof.organization_id).eq('status', 'Operativo'),
                supabase.from('organizations').select('*').eq('id', prof.organization_id).single()
            ]);
            setMissions(await mRes.json());
            setPilots(pRes.data || []);
            setDrones(dRes.data || []);
            setOrg(oRes.data);
        } finally { setLoading(false); }
    };

    useEffect(() => { loadData(); }, []);

    if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400">CARGANDO TORRE DE CONTROL...</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-8 text-left pb-32 animate-in fade-in duration-500">
            {/* SELECTOR DE PANTALLAS */}
            <header className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900">Mando y Control</h2>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Prefijo: {org?.flight_prefix}</p>
                </div>
                <div className="flex bg-slate-200/50 p-1.5 rounded-[1.5rem] shadow-inner">
                    <button onClick={() => setActiveTab('basica')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'basica' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}>Programación Básica</button>
                    <button onClick={() => setActiveTab('aerocivil')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'aerocivil' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}>Formato 100 Aerocivil</button>
                </div>
            </header>

            {activeTab === 'basica' ? (
                /* PANTALLA BÁSICA (Mantenemos su lógica) */
                <div className="space-y-8 animate-in slide-in-from-left">
                    <section className="bg-[#1A202C] p-10 rounded-[3rem] text-white shadow-2xl">
                        <form className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-500 uppercase">PIC (Piloto al Mando)</label>
                                <select className="w-full bg-slate-800 p-4 rounded-2xl border-none text-white text-sm font-bold" value={form.pilot_id} onChange={e => setForm({...form, pilot_id: e.target.value})}>
                                    <option value="">Seleccionar...</option>
                                    {pilots.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-500 uppercase">UAS (Aeronave)</label>
                                <select className="w-full bg-slate-800 p-4 rounded-2xl border-none text-white text-sm font-bold" value={form.aircraft_id} onChange={e => setForm({...form, aircraft_id: e.target.value})}>
                                    <option value="">Seleccionar...</option>
                                    {drones.map(d => <option key={d.id} value={d.id}>{d.model}</option>)}
                                </select>
                            </div>
                            <button className="bg-orange-600 p-4 rounded-2xl font-black uppercase text-xs">Emitir Orden</button>
                        </form>
                    </section>
                </div>
            ) : (
                /* PANTALLA AEROCIVIL TOTAL (Formato 100) */
                <div className="space-y-10 animate-in slide-in-from-right">
                    <div className="bg-slate-900 p-8 rounded-[3rem] text-white flex justify-between items-center border-l-8 border-orange-600">
                        <div>
                            <h3 className="text-2xl font-black uppercase">Solicitud de Autorización UAS</h3>
                            <p className="text-orange-500 text-[10px] font-black uppercase tracking-[0.3em]">Formato 100 - UAEAC</p>
                        </div>
                        <HelpTooltip text="Asegúrese de que la información sea detallada, legible y veraz para evitar devoluciones." />
                    </div>

                    {/* SECCIÓN 3 Y 4 */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                            <div className="flex items-center justify-between border-b pb-4">
                                <h4 className="font-black text-slate-900 uppercase text-xs">3. Tipo de Operación Aérea</h4>
                                <HelpTooltip text="Marque las casillas que correspondan a su registro mercantil y autorización UAEAC." />
                            </div>
                            <div className="grid grid-cols-1 gap-3">
                                <CheckOption label="Simple captura de imágenes o datos" />
                                <CheckOption label="Vigilancia y Seguridad Privada" />
                                <CheckOption label="Medios Masivos de Comunicación" />
                                <CheckOption label="Aspersión / Dispersión" />
                                <CheckOption label="Transporte de Carga (Drone Delivery)" />
                                <CheckOption label="Instrucción" />
                            </div>
                        </section>

                        <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                            <div className="flex items-center justify-between border-b pb-4">
                                <h4 className="font-black text-slate-900 uppercase text-xs">4. Información de la Operación</h4>
                                <HelpTooltip text="Fechas y horarios deben expresarse en hora local. El peso bruto debe incluir la carga útil." />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputCol label="Empresa Contratante" placeholder="Nombre S.A.S" />
                                <InputCol label="Peso Bruto Máximo (Kg)" placeholder="0.00" type="number" />
                                <InputCol label="Fecha Inicio" type="date" />
                                <InputCol label="Hora Inicio (UTC)" type="time" />
                                <InputCol label="Fecha Finalización" type="date" />
                                <InputCol label="Hora Finalización (UTC)" type="time" />
                                <InputCol label="Municipio" placeholder="Ej: Bogotá" />
                                <InputCol label="Departamento" placeholder="Ej: Cundinamarca" />
                            </div>
                        </section>
                    </div>

                    {/* SECCIÓN 7: AERONAVES (TABLA TÉCNICA) */}
                    <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-6">
                        <div className="flex items-center justify-between">
                            <h4 className="font-black text-slate-900 uppercase text-xs">7. Aeronaves no Tripuladas (UAS)</h4>
                            <HelpTooltip text="Las aeronaves deben estar previamente registradas ante la UAEAC. Relacione los datos de la póliza RCE." />
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border">
                                <thead className="bg-slate-50 text-[8px] font-black uppercase">
                                    <tr>
                                        <th className="p-3 border">Marca/Modelo</th>
                                        <th className="p-3 border">Tipo/Serie</th>
                                        <th className="p-3 border">Aseguradora/Póliza</th>
                                        <th className="p-3 border">Vigencia (Inicio/Fin)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="p-2 border"><input className="w-full p-1 text-[10px]" placeholder="DJI Mavic 3" /></td>
                                        <td className="p-2 border"><input className="w-full p-1 text-[10px]" placeholder="Multirotor / SN..." /></td>
                                        <td className="p-2 border"><input className="w-full p-1 text-[10px]" placeholder="Seguros S.A" /></td>
                                        <td className="p-2 border"><input type="date" className="w-full p-1 text-[10px]" /></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* SECCIÓN 11: COORDENADAS (GEOMETRÍA) */}
                    <section className="bg-[#1A202C] p-10 rounded-[3rem] text-white space-y-6 shadow-2xl">
                        <div className="flex items-center justify-between border-b border-white/10 pb-4">
                            <h4 className="font-black uppercase text-sm text-orange-500 tracking-widest">11. Coordenadas de la Operación (WGS-84)</h4>
                            <HelpTooltip text="Grados, minutos, segundos. El polígono debe cerrarse repitiendo la primera coordenada al final." />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-500 uppercase">Item</label>
                                <input className="w-full bg-slate-800 p-3 rounded-xl border-none text-xs font-mono" placeholder="1" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-500 uppercase">Latitud (N/S)</label>
                                <input className="w-full bg-slate-800 p-3 rounded-xl border-none text-xs font-mono" placeholder="00°00'00\"N" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-500 uppercase">Longitud (W)</label>
                                <input className="w-full bg-slate-800 p-3 rounded-xl border-none text-xs font-mono" placeholder="00°00'00\"W" />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[8px] font-black text-slate-500 uppercase">Altura (ft/m)</label>
                                <input className="w-full bg-slate-800 p-3 rounded-xl border-none text-xs font-mono" placeholder="400ft" />
                            </div>
                        </div>
                        <button className="text-[10px] font-black text-orange-500 uppercase hover:underline">+ Añadir vértice al polígono</button>
                    </section>

                    <div className="bg-orange-50 p-6 rounded-2xl border border-orange-100">
                        <p className="text-[9px] text-orange-700 font-bold uppercase leading-relaxed">
                            * Al generar este documento, usted declara bajo gravedad de juramento que la información registrada es verdadera, cumpliendo con la Ley 1581 de 2012.
                        </p>
                    </div>

                    <button className="w-full py-6 bg-orange-600 text-white font-black rounded-[2rem] shadow-xl uppercase text-xs tracking-widest hover:bg-slate-900 transition-all active:scale-95">
                        Generar Formato 100 Ofical (PDF)
                    </button>
                </div>
            )}
        </div>
    );
}

// COMPONENTES AUXILIARES DE INTERFAZ (FUERA DEL RENDER LOOP)
function CheckOption({ label }) {
    return (
        <label className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl cursor-pointer hover:bg-orange-50 transition-all group border border-transparent hover:border-orange-200">
            <input type="checkbox" className="size-5 rounded border-slate-300 text-orange-600 focus:ring-0" />
            <span className="text-[10px] font-bold text-slate-600 group-hover:text-slate-900 uppercase">{label}</span>
        </label>
    );
}

function InputCol({ label, placeholder, type = "text" }) {
    return (
        <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">{label}</label>
            <input type={type} className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-xs focus:ring-2 focus:ring-orange-500" placeholder={placeholder} />
        </div>
    );
}

function StatusBox({ status, title, defaultMsg }) {
    return (
        <div className={`p-4 rounded-2xl border transition-all ${!status ? 'border-white/10' : status.type === 'ERROR' ? 'bg-red-500/20 border-red-500' : status.type === 'WARN' ? 'bg-orange-500/20 border-orange-500' : 'bg-emerald-500/10 border-emerald-500/30'}`}>
            <p className="text-[8px] font-black uppercase text-slate-500">{title}</p>
            <p className="text-[10px] font-bold mt-1 uppercase">{status ? status.msg : defaultMsg}</p>
        </div>
    );
}