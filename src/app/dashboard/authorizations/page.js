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

    // --- ZONA DE ESTADO: CONFIGURACIÓN FORMULARIO AEROCIVIL ---
    const [aeroForm, setAeroForm] = useState({
        op_types: [], // Selección de Sección 3
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

    // LOGICA DE SELECCIÓN SECCIÓN 3
    const toggleOpType = (id) => {
        setAeroForm(prev => ({
            ...prev,
            op_types: prev.op_types.includes(id) 
                ? prev.op_types.filter(t => t !== id) 
                : [...prev.op_types, id]
        }));
    };

    if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400">CARGANDO MANDO CENTRAL...</div>;

    return (
        <div className="max-w-7xl mx-auto space-y-8 text-left pb-32 animate-in fade-in duration-500">
            
            {/* CABECERA Y SWITCHER */}
            <header className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 leading-none">Mando y Control</h2>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2">Nomenclatura: {org?.flight_prefix}</p>
                </div>
                <div className="flex bg-slate-200/50 p-1.5 rounded-[1.5rem] shadow-inner">
                    <button onClick={() => setActiveTab('basica')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'basica' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}>Programación Básica</button>
                    <button onClick={() => setActiveTab('aerocivil')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'aerocivil' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}>Formato 100 Aerocivil</button>
                </div>
            </header>

            {activeTab === 'basica' ? (
                <div className="animate-in slide-in-from-left duration-500">
                    {/* Aquí va el contenido de Programación Básica que ya tenemos */}
                    <p className="p-20 text-center text-slate-400 font-bold uppercase italic border-2 border-dashed rounded-[3rem]">Módulo Operativo Activo</p>
                </div>
            ) : (
                /* --- ZONA PESTAÑA AEROCIVIL --- */
                <div className="space-y-10 animate-in slide-in-from-right duration-500">
                    
                    {/* ENCABEZADO TÉCNICO */}
                    <div className="bg-slate-900 p-8 rounded-[3rem] text-white flex justify-between items-center border-l-8 border-orange-600 shadow-2xl">
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tight">Solicitud de Autorización UAS</h3>
                            <p className="text-orange-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Apéndice 13 - Formato 100 - UAEAC</p>
                        </div>
                        <div className="size-14 bg-white/5 rounded-2xl flex items-center justify-center">
                            <span className="material-symbols-outlined text-4xl text-orange-500">gavel</span>
                        </div>
                    </div>

                    {/* SECCIÓN 3: TIPO DE OPERACIÓN AÉREA */}
                    <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                        <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center px-8">
                            <h4 className="font-black text-slate-900 uppercase text-[11px] tracking-widest">3. TIPO DE OPERACIÓN AÉREA</h4>
                            <HelpTooltip text="Marque con una equis (X) el tipo de operación aérea que se solicita, la(s) cual(es) deben estar acorde(s) a lo autorizado por la UAEAC y el registro mercantil." />
                        </div>

                        <div className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <OpCard 
                                    label="Simple captura de imágenes o datos." 
                                    selected={aeroForm.op_types.includes('simple_captura')}
                                    onClick={() => toggleOpType('simple_captura')}
                                />
                                <OpCard 
                                    label="Captura de imágenes o datos con fines de vigilancia y seguridad privada." 
                                    selected={aeroForm.op_types.includes('vigilancia')}
                                    onClick={() => toggleOpType('vigilancia')}
                                />
                                <OpCard 
                                    label="Captura de imágenes o datos, para medios masivos de comunicación." 
                                    selected={aeroForm.op_types.includes('medios')}
                                    onClick={() => toggleOpType('medios')}
                                />
                                <OpCard 
                                    label="Aspersión." 
                                    selected={aeroForm.op_types.includes('aspersion')}
                                    onClick={() => toggleOpType('aspersion')}
                                />
                                <OpCard 
                                    label="Dispersión." 
                                    selected={aeroForm.op_types.includes('dispersion')}
                                    onClick={() => toggleOpType('dispersion')}
                                />
                                <OpCard 
                                    label="Enjambre." 
                                    selected={aeroForm.op_types.includes('enjambre')}
                                    onClick={() => toggleOpType('enjambre')}
                                />
                                <OpCard 
                                    label="Transporte de carga ('Drone Delivery')." 
                                    selected={aeroForm.op_types.includes('carga')}
                                    onClick={() => toggleOpType('carga')}
                                />
                                <OpCard 
                                    label="Instrucción." 
                                    selected={aeroForm.op_types.includes('instruccion')}
                                    onClick={() => toggleOpType('instruccion')}
                                />
                                <div className="md:col-span-2">
                                    <OpCard 
                                        label="Actividades misionales de entidades públicas." 
                                        selected={aeroForm.op_types.includes('misiones_publicas')}
                                        onClick={() => toggleOpType('misiones_publicas')}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Placeholder para próximas secciones */}
                    <div className="p-10 border-2 border-dashed border-slate-200 rounded-[3rem] text-center opacity-40">
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Próxima Mejora: Sección 4. Información de la Operación</p>
                    </div>

                </div>
            )}
        </div>
    );
}

// --- ZONA DE COMPONENTES AUXILIARES ---
function OpCard({ label, selected, onClick }) {
    return (
        <button 
            type="button"
            onClick={onClick}
            className={`w-full flex items-center justify-between p-5 rounded-[1.5rem] border-2 transition-all text-left group ${
                selected 
                ? 'border-orange-500 bg-orange-50/50 shadow-md scale-[1.01]' 
                : 'border-slate-100 bg-slate-50/30 hover:border-slate-200'
            }`}
        >
            <span className={`text-[10px] font-black leading-tight uppercase transition-colors ${
                selected ? 'text-orange-700' : 'text-slate-500'
            }`}>
                {label}
            </span>
            <div className={`size-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
                selected ? 'bg-orange-500 border-orange-500 shadow-sm' : 'border-slate-300 bg-white'
            }`}>
                {selected && <span className="material-symbols-outlined text-white text-base">check</span>}
            </div>
        </button>
    );
}