'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import HelpTooltip from '@/components/HelpTooltip';

export default function AerocivilForm() {
    // 1. ESTADOS DE GEOGRAFÍA
    const [geo, setGeo] = useState({ depts: [], munis: [], all: [] });
    const [loadingGeo, setLoadingGeo] = useState(true);

    // 2. ESTADO MAESTRO DEL FORMULARIO (SECCIONES 3 Y 4)
    const [aeroForm, setAeroForm] = useState({
        department: '',
        municipality: '',
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
        }
    });

    // CARGA DE DIVIPOLA (MUNICIPIOS) DESDE SUPABASE
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

    // MANEJO DE CAMBIO DE DEPARTAMENTO
    const handleDeptChange = (deptName) => {
        const filtered = geo.all
            .filter(i => i["Nombre Departamento"] === deptName)
            .map(i => i["Nombre Municipio"])
            .sort();
            
        setGeo(prev => ({ ...prev, munis: filtered }));
        setAeroForm({ ...aeroForm, department: deptName, municipality: '' });
    };

    // LÓGICA DE SELECCIÓN DE OPERACIÓN (X)
    const toggleAeroCheck = (field) => {
        setAeroForm(prev => ({
            ...prev,
            tipo_operacion: {
                ...prev.tipo_operacion,
                [field]: !prev.tipo_operacion[field]
            }
        }));
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-right duration-500 pb-20 text-left">
            
            {/* ENCABEZADO TÉCNICO */}
            <div className="bg-slate-900 p-8 rounded-[3rem] text-white flex justify-between items-center border-l-8 border-orange-600 shadow-2xl">
                <div>
                    <h3 className="text-2xl font-black uppercase tracking-tight">Formato 100 UAEAC</h3>
                    <p className="text-orange-500 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Módulo de Cumplimiento Normativo</p>
                </div>
                <div className="size-14 bg-white/5 rounded-2xl flex items-center justify-center">
                    <span className="material-symbols-outlined text-4xl text-orange-500">gavel</span>
                </div>
            </div>

            {/* SECCIÓN 3: TIPO DE OPERACIÓN AÉREA */}
            <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="bg-slate-100 border-b border-slate-200 p-4 flex justify-between items-center px-8">
                    <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest">3. TIPO DE OPERACIÓN AÉREA</h4>
                    <HelpTooltip text="Marque con una equis (X) el tipo de operación aérea que se solicita acorde a lo autorizado por la UAEAC." />
                </div>

                <div className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <AeroCheck 
                            label="SIMPLE CAPTURA DE IMÁGENES O DATOS" 
                            checked={aeroForm.tipo_operacion.simple_captura}
                            onChange={() => toggleAeroCheck('simple_captura')}
                        />
                        <AeroCheck 
                            label="CAPTURA PARA VIGILANCIA Y SEGURIDAD PRIVADA" 
                            checked={aeroForm.tipo_operacion.vigilancia_seguridad}
                            onChange={() => toggleAeroCheck('vigilancia_seguridad')}
                        />
                        <AeroCheck 
                            label="CAPTURA PARA MEDIOS MASIVOS DE COMUNICACIÓN" 
                            checked={aeroForm.tipo_operacion.medios_comunicacion}
                            onChange={() => toggleAeroCheck('medios_comunicacion')}
                        />
                        <AeroCheck 
                            label="ASPERSIÓN" 
                            checked={aeroForm.tipo_operacion.aspersion}
                            onChange={() => toggleAeroCheck('aspersion')}
                        />
                        <AeroCheck 
                            label="DISPERSIÓN" 
                            checked={aeroForm.tipo_operacion.dispersion}
                            onChange={() => toggleAeroCheck('dispersion')}
                        />
                        <AeroCheck 
                            label="ENJAMBRE" 
                            checked={aeroForm.tipo_operacion.enjambre}
                            onChange={() => toggleAeroCheck('enjambre')}
                        />
                        <AeroCheck 
                            label="TRANSPORTE DE CARGA ('DRONE DELIVERY')" 
                            checked={aeroForm.tipo_operacion.carga_delivery}
                            onChange={() => toggleAeroCheck('carga_delivery')}
                        />
                        <AeroCheck 
                            label="INSTRUCCIÓN" 
                            checked={aeroForm.tipo_operacion.instruccion}
                            onChange={() => toggleAeroCheck('instruccion')}
                        />
                        <div className="md:col-span-2">
                            <AeroCheck 
                                label="ACTIVIDADES MISIONALES DE ENTIDADES PÚBLICAS" 
                                checked={aeroForm.tipo_operacion.misiones_publicas}
                                onChange={() => toggleAeroCheck('misiones_publicas')}
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* SECCIÓN 4: UBICACIÓN GEOGRÁFICA */}
            <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8">
                <div className="flex items-center justify-between border-b pb-4">
                    <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest">4. UBICACIÓN DE LA OPERACIÓN</h4>
                    <HelpTooltip text="Seleccione el departamento y municipio según el Divipola nacional." />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Departamento</label>
                        <select 
                            className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm text-slate-700 outline-none focus:ring-2 focus:ring-orange-500 appearance-none"
                            value={aeroForm.department}
                            onChange={e => handleDeptChange(e.target.value)}
                        >
                            <option value="">-- {geo.depts.length > 0 ? `Seleccionar (${geo.depts.length})` : 'Cargando...'} --</option>
                            {geo.depts.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Municipio</label>
                        <select 
                            disabled={!aeroForm.department}
                            className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm text-slate-700 outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-30 appearance-none"
                            value={aeroForm.municipality}
                            onChange={e => setAeroForm({...aeroForm, municipality: e.target.value})}
                        >
                            <option value="">-- {aeroForm.department ? `Seleccionar (${geo.munis.length})` : 'Elija departamento'} --</option>
                            {geo.munis.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                </div>
            </section>

            <button className="w-full py-6 bg-slate-900 text-white font-black rounded-[2.5rem] shadow-xl uppercase text-xs tracking-widest hover:bg-orange-600 transition-all active:scale-95">
                Generar Formato 100 PDF
            </button>
        </div>
    );
}

// COMPONENTES AUXILIARES
function AeroCheck({ label, checked, onChange }) {
    return (
        <button 
            type="button"
            onClick={onChange}
            className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left ${
                checked 
                ? 'border-orange-500 bg-orange-50/50 shadow-md scale-[1.01]' 
                : 'border-slate-100 bg-slate-50/30 hover:border-slate-200'
            }`}
        >
            <span className={`text-[10px] font-black leading-tight uppercase ${checked ? 'text-orange-700' : 'text-slate-500'}`}>{label}</span>
            <div className={`size-6 rounded-lg border-2 flex items-center justify-center shrink-0 ${checked ? 'bg-orange-600 border-orange-600' : 'border-slate-200 bg-white'}`}>
                {checked && <span className="material-symbols-outlined text-white text-base">close</span>}
            </div>
        </button>
    );
}