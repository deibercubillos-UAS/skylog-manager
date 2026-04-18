'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import HelpTooltip from '@/components/HelpTooltip';

export default function AerocivilForm() {
    // 1. ESTADOS DE GEOGRAFÍA
    const [geo, setGeo] = useState({ depts: [], munis: [], all: [] });
    const [loadingGeo, setLoadingGeo] = useState(true);

    // 2. ESTADO MAESTRO (Estructura Corregida)
    const [aeroForm, setAeroForm] = useState({
        department: '',
        municipality: '',
        empresa_contratante: '',
        fecha_inicio: '',
        hora_inicio: '',
        fecha_fin: '',
        hora_fin: '',
        otros_detalles: '',
        peso_maximo: '',
        contacto_visual: 'VLOS',
        justificacion_especial: '',
        tipo_operacion: {
            simple_captura: false,
            vigilancia_seguridad: false,
            medios_comunicacion: false,
            aspersion: false,
            dispersion: false,
            enjambre: false,
            carga_delivery: false,
            instruccion: false,
            misiones_publicas: false
        },
        vuelos_especiales: {
            nocturno: false,
            autonomo: false,
            cautiva: false,
            urbana: false,
            demostracion: false,
            recreativo: false
        }
    });

    // CARGA DE GEOGRAFÍA
    useEffect(() => {
        async function loadGeo() {
            setLoadingGeo(true);
            try {
                const { data, error } = await supabase
                    .from('colombia_geo')
                    .select('"Nombre Departamento", "Nombre Municipio"')
                    .range(0, 1200)
                    .order('"Nombre Departamento"', { ascending: true });
                if (error) throw error;
                if (data) {
                    const uniqueDepts = [...new Set(data.map(i => i["Nombre Departamento"]))].sort();
                    setGeo({ depts: uniqueDepts, munis: [], all: data });
                }
            } catch (err) {
                console.error("Geo Load Error:", err.message);
            } finally {
                setLoadingGeo(false);
            }
        }
        loadGeo();
    }, []);

    // LÓGICA DE NEGOCIO
    const handleDeptChange = (deptName) => {
        const filtered = geo.all.filter(i => i["Nombre Departamento"] === deptName).map(i => i["Nombre Municipio"]).sort();
        setGeo(prev => ({ ...prev, munis: filtered }));
        setAeroForm({ ...aeroForm, department: deptName, municipality: '' });
    };

    const toggleAeroCheck = (field) => {
        setAeroForm(prev => ({
            ...prev,
            tipo_operacion: { ...prev.tipo_operacion, [field]: !prev.tipo_operacion[field] }
        }));
    };

    const toggleSpecialVuelo = (field) => {
        setAeroForm(prev => ({
            ...prev,
            vuelos_especiales: { ...prev.vuelos_especiales, [field]: !prev.vuelos_especiales[field] }
        }));
    };

    if (loadingGeo) return <div className="p-20 text-center font-black animate-pulse uppercase">Sincronizando Formato 100...</div>;

    return (
        <div className="space-y-10 animate-in fade-in duration-500 pb-20 text-left">
            
            {/* SECCIÓN 3: TIPO DE OPERACIÓN */}
            <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-100 border-b p-4 flex justify-between items-center px-8">
                    <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest">3. TIPO DE OPERACIÓN AÉREA</h4>
                    <HelpTooltip text="Marque las opciones acordes a su autorización UAEAC." />
                </div>
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AeroCheck label="SIMPLE CAPTURA DE IMÁGENES O DATOS" checked={aeroForm.tipo_operacion.simple_captura} onChange={() => toggleAeroCheck('simple_captura')} />
                    <AeroCheck label="VIGILANCIA Y SEGURIDAD PRIVADA" checked={aeroForm.tipo_operacion.vigilancia_seguridad} onChange={() => toggleAeroCheck('vigilancia_seguridad')} />
                    <AeroCheck label="ASPERSIÓN" checked={aeroForm.tipo_operacion.aspersion} onChange={() => toggleAeroCheck('aspersion')} />
                    <AeroCheck label="INSTRUCCIÓN" checked={aeroForm.tipo_operacion.instruccion} onChange={() => toggleAeroCheck('instruccion')} />
                    <div className="md:col-span-2">
                        <AeroCheck label="ACTIVIDADES MISIONALES DE ENTIDADES PÚBLICAS" checked={aeroForm.tipo_operacion.misiones_publicas} onChange={() => toggleAeroCheck('misiones_publicas')} />
                    </div>
                </div>
            </section>

            {/* SECCIÓN 4: INFORMACIÓN OPERACIÓN */}
            <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-100 border-b p-4 flex justify-between items-center px-8">
                    <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest">4. INFORMACIÓN DE LA OPERACIÓN</h4>
                </div>
                <div className="p-8 space-y-6">
                    <input className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" placeholder="Empresa Contratante" value={aeroForm.empresa_contratante} onChange={e => setAeroForm({...aeroForm, empresa_contratante: e.target.value})} />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <input type="number" className="p-4 bg-white border-2 border-orange-100 rounded-2xl font-black text-orange-600" placeholder="Peso Bruto (Kg)" value={aeroForm.peso_maximo} onChange={e => setAeroForm({...aeroForm, peso_maximo: e.target.value})} />
                        <select className="p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={aeroForm.department} onChange={e => handleDeptChange(e.target.value)}>
                            <option value="">-- Departamento --</option>
                            {geo.depts.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <select className="p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={aeroForm.municipality} onChange={e => setAeroForm({...aeroForm, municipality: e.target.value})}>
                            <option value="">-- Municipio --</option>
                            {geo.munis.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                </div>
            </section>

            {/* SECCIÓN 5: CONTACTO VISUAL */}
            <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-100 border-b p-4 flex justify-between items-center px-8">
                    <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest">5. CONTACTO VISUAL</h4>
                </div>
                <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <VisualOption label="VLOS (Hasta 750m)" selected={aeroForm.contacto_visual === 'VLOS'} onClick={() => setAeroForm({...aeroForm, contacto_visual: 'VLOS'})} />
                    <VisualOption label="EVLOS (Hasta 3000m)" selected={aeroForm.contacto_visual === 'EVLOS'} onClick={() => setAeroForm({...aeroForm, contacto_visual: 'EVLOS'})} />
                </div>
            </section>

            {/* SECCIÓN 6: VUELO ESPECIAL */}
            <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-100 border-b p-4 flex justify-between items-center px-8">
                    <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest">6. VUELO ESPECIAL</h4>
                </div>
                <div className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <AeroCheck label="VUELO NOCTURNO" checked={aeroForm.vuelos_especiales.nocturno} onChange={() => toggleSpecialVuelo('nocturno')} />
                        <AeroCheck label="VUELO EN ZONA URBANA" checked={aeroForm.vuelos_especiales.urbana} onChange={() => toggleSpecialVuelo('urbana')} />
                    </div>
                    <textarea rows="3" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium text-sm" placeholder="Justificación técnica..." value={aeroForm.justificacion_especial} onChange={e => setAeroForm({...aeroForm, justificacion_especial: e.target.value})} />
                </div>
            </section>

            <button className="w-full py-6 bg-slate-900 text-white font-black rounded-[2.5rem] shadow-xl uppercase text-xs tracking-widest hover:bg-orange-600 transition-all">Generar Formato 100 PDF</button>
        </div>
    );
}

// COMPONENTES AUXILIARES
function AeroCheck({ label, checked, onChange }) {
    return (
        <button type="button" onClick={onChange} className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left ${checked ? 'border-orange-500 bg-orange-50/50 shadow-md' : 'border-slate-100 bg-slate-50/30 hover:border-slate-200'}`}>
            <span className="text-[10px] font-black uppercase text-slate-700">{label}</span>
            <div className={`size-6 rounded-lg border-2 flex items-center justify-center ${checked ? 'bg-orange-600 border-orange-600' : 'border-slate-200 bg-white'}`}>
                {checked && <span className="material-symbols-outlined text-white text-base">close</span>}
            </div>
        </button>
    );
}

function VisualOption({ label, selected, onClick }) {
    return (
        <button type="button" onClick={onClick} className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${selected ? 'border-orange-500 bg-orange-50/30 shadow-md' : 'border-slate-100 bg-slate-50/30'}`}>
            <span className="text-[10px] font-black uppercase text-slate-700">{label}</span>
            <div className={`size-6 rounded-full border-2 flex items-center justify-center ${selected ? 'bg-orange-600 border-orange-600' : 'border-slate-200 bg-white'}`}>
                {selected && <span className="material-symbols-outlined text-white text-base">check</span>}
            </div>
        </button>
    );
}