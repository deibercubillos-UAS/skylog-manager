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

     // FUNCIÓN PARA TOGGLE DE VUELOS ESPECIALES
        const toggleSpecialVuelo = (field) => {
            setAeroForm(prev => ({
                ...prev,
                vuelos_especiales: {
                    ...prev.vuelos_especiales,
                    [field]: !prev.vuelos_especiales[field]
                }
            }));
        };

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
            
            {/* SECCIÓN 4: INFORMACIÓN DE LA OPERACIÓN AÉREA */}
            <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in duration-500">
                <div className="bg-slate-100 border-b border-slate-200 p-4 flex justify-between items-center px-8">
                    <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest">4. INFORMACIÓN DE LA OPERACIÓN AÉREA</h4>
                    <HelpTooltip text="Diligencie los datos de la empresa contratante, fechas, horarios UTC, pesos brutos y ubicación geográfica de la operación." />
                </div>

                <div className="p-8 space-y-6">
                    {/* FILA 1: EMPRESA CONTRATANTE */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Empresa Contratante del Servicio</label>
                        <input 
                            className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="Razón Social del Cliente"
                            value={aeroForm.empresa_contratante}
                            onChange={e => setAeroForm({...aeroForm, empresa_contratante: e.target.value})}
                        />
                    </div>

                    {/* FILA 2 Y 3: CRONOGRAMA TÉCNICO */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Fecha Inicio</label>
                                <input type="date" className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-xs" value={aeroForm.fecha_inicio} onChange={e => setAeroForm({...aeroForm, fecha_inicio: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Hora Inicio</label>
                                <input type="time" className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-xs" value={aeroForm.hora_inicio} onChange={e => setAeroForm({...aeroForm, hora_inicio: e.target.value})} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Fecha Finalización</label>
                                <input type="date" className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-xs" value={aeroForm.fecha_fin} onChange={e => setAeroForm({...aeroForm, fecha_fin: e.target.value})} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Hora Fin</label>
                                <input type="time" className="w-full p-3 bg-slate-50 rounded-xl border-none font-bold text-xs" value={aeroForm.hora_fin} onChange={e => setAeroForm({...aeroForm, hora_fin: e.target.value})} />
                            </div>
                        </div>
                    </div>

                    {/* FILA 4: OTROS DETALLES */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Otros detalles del cronograma de operación</label>
                        <textarea 
                            rows="2"
                            className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="Especifique detalles adicionales si aplica..."
                            value={aeroForm.otros_detalles}
                            onChange={e => setAeroForm({...aeroForm, otros_detalles: e.target.value})}
                        />
                    </div>

                    {/* FILA 5: PESO Y GEOGRAFÍA */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Peso Bruto Máximo (Kg)</label>
                            <input 
                                type="number" step="0.01" 
                                className="w-full p-4 bg-white border-2 border-orange-100 rounded-2xl font-black text-sm text-orange-600 outline-none" 
                                placeholder="0.00"
                                value={aeroForm.peso_maximo}
                                onChange={e => setAeroForm({...aeroForm, peso_maximo: e.target.value})}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Departamento</label>
                            <select 
                                className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm text-slate-700 outline-none focus:ring-2 focus:ring-orange-500 appearance-none"
                                value={aeroForm.department}
                                onChange={e => handleDeptChange(e.target.value)}
                            >
                                <option value="">-- Seleccionar --</option>
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
                                <option value="">-- Seleccionar --</option>
                                {geo.munis.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </section>

            {/* SECCIÓN 5: TIPO DE CONTACTO VISUAL CON LA UA */}
            <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden mt-8 animate-in fade-in duration-500">
                <div className="bg-slate-100 border-b border-slate-200 p-4 flex justify-between items-center px-8">
                    <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest">5. TIPO DE CONTACTO VISUAL CON LA UA</h4>
                    <HelpTooltip text="Seleccione la condición visual de la operación. Recuerde que EVLOS requiere observadores y BVLOS requiere autorización específica de distancia." />
                </div>

                <div className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <VisualOption 
                            label="VLOS (Hasta 750 metros)" 
                            description="Línea de vista visual directa del piloto."
                            selected={aeroForm.contacto_visual === 'VLOS'}
                            onClick={() => setAeroForm({...aeroForm, contacto_visual: 'VLOS'})}
                        />
                        <VisualOption 
                            label="EVLOS (Hasta 3.000 metros con observador(es))" 
                            description="Línea de vista extendida mediante observadores."
                            selected={aeroForm.contacto_visual === 'EVLOS'}
                            onClick={() => setAeroForm({...aeroForm, contacto_visual: 'EVLOS'})}
                        />
                        <div className="md:col-span-2">
                            <VisualOption 
                                label="BVLOS (Distancia aprobada en la operación aérea)" 
                                description="Operación más allá de la línea de vista visual."
                                selected={aeroForm.contacto_visual === 'BVLOS'}
                                onClick={() => setAeroForm({...aeroForm, contacto_visual: 'BVLOS'})}
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* SECCIÓN 6: VUELO ESPECIAL */}
            <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden mt-8 animate-in fade-in duration-500">
                <div className="bg-slate-100 border-b border-slate-200 p-4 flex justify-between items-center px-8">
                    <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest">6. VUELO ESPECIAL</h4>
                    <HelpTooltip text="Marque con una equis (X) el tipo de vuelo especial que se realizará. Debe incluir una justificación detallada de la operación." />
                </div>

                <div className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <AeroCheck 
                            label="VUELO NOCTURNO" 
                            checked={aeroForm.vuelos_especiales.nocturno}
                            onChange={() => toggleSpecialVuelo('nocturno')}
                        />
                        <AeroCheck 
                            label="VUELO EN ZONA URBANA" 
                            checked={aeroForm.vuelos_especiales.urbana}
                            onChange={() => toggleSpecialVuelo('urbana')}
                        />
                        <AeroCheck 
                            label="VUELO AUTÓNOMO" 
                            checked={aeroForm.vuelos_especiales.autonomo}
                            onChange={() => toggleSpecialVuelo('autonomo')}
                        />
                        <AeroCheck 
                            label="VUELOS PARA DEMOSTRACIONES COMERCIALES" 
                            checked={aeroForm.vuelos_especiales.demostracion}
                            onChange={() => toggleSpecialVuelo('demostracion')}
                        />
                        <AeroCheck 
                            label="VUELO DE UA CAUTIVA" 
                            checked={aeroForm.vuelos_especiales.cautiva}
                            onChange={() => toggleSpecialVuelo('cautiva')}
                        />
                        <AeroCheck 
                            label="VUELOS EN COMPETENCIAS O RECREATIVOS" 
                            checked={aeroForm.vuelos_especiales.recreativo}
                            onChange={() => toggleSpecialVuelo('recreativo')}
                        />
                    </div>

                    {/* CAMPO DE JUSTIFICACIÓN */}
                    <div className="pt-4 border-t border-slate-50">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1 flex items-center gap-2">
                            Justificación de la Operación Especial
                            <HelpTooltip text="Describa brevemente la necesidad y los mitigantes de riesgo para el tipo de vuelo especial seleccionado." />
                        </label>
                        <textarea 
                            rows="3"
                            className="w-full p-4 bg-slate-50 rounded-2xl border-none font-medium text-sm mt-2 outline-none focus:ring-2 focus:ring-orange-500"
                            placeholder="Describa el propósito y medidas de seguridad..."
                            value={aeroForm.justificacion_especial}
                            onChange={e => setAeroForm({...aeroForm, justificacion_especial: e.target.value})}
                        />
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

// COMPONENTE VISUAL PARA SECCIÓN 5
function VisualOption({ label, description, selected, onClick }) {
    return (
        <button 
            type="button"
            onClick={onClick}
            className={`w-full flex items-center justify-between p-5 rounded-[1.5rem] border-2 transition-all text-left ${
                selected 
                ? 'border-orange-500 bg-orange-50/30 shadow-md' 
                : 'border-slate-100 bg-slate-50/30 hover:border-slate-200'
            }`}
        >
            <div className="flex-1 pr-4">
                <p className={`text-[10px] font-black uppercase ${selected ? 'text-orange-700' : 'text-slate-500'}`}>
                    {label}
                </p>
                <p className="text-[9px] text-slate-400 font-medium mt-1 leading-tight">
                    {description}
                </p>
            </div>
            <div className={`size-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                selected ? 'bg-orange-600 border-orange-600' : 'border-slate-200 bg-white'
            }`}>
                {selected && <span className="material-symbols-outlined text-white text-base">check</span>}
            </div>
        </button>
    );
}

const toggleSpecialVuelo = (field) => {
    setAeroForm(prev => ({
        ...prev,
        vuelos_especiales: {
            ...prev.vuelos_especiales,
            [field]: !prev.vuelos_especiales[field]
        }
    }));
};
       