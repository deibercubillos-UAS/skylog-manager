'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import HelpTooltip from '@/components/HelpTooltip';

export default function AerocivilForm({ drones, pilots }) { 
    const [geo, setGeo] = useState({ depts: [], munis: [], all: [] });
    const [loadingGeo, setLoadingGeo] = useState(true);

    // CORRECCIÓN LÍNEA 14: Estructura plana y sin duplicados
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
        },
        aeronaves: [
            { id: '', brand: '', model: '', serial_number: '', insurer: '', policy: '', start_date: '', end_date: '' }
        ],
        equipos: [
            { id: '', brand: '', model: '', type: '', serial_number: '' }
        ],
        pilotos_solicitud: [
            { id: '', name: '', id_number: '', phone: '' }
        ],
        observadores: [
            { id: '', name: '', id_number: '', phone: '' }
        ]
    });

     // --- FUNCIONES DE LÓGICA INTERNA ---
    const toggleSpecialVuelo = (field) => {
        setAeroForm(prev => ({
            ...prev,
            vuelos_especiales: { ...prev.vuelos_especiales, [field]: !prev.vuelos_especiales[field] }
        }));
    };

    const addAircraftSlot = () => {
        if (aeroForm.aeronaves.length < 3) {
            setAeroForm(prev => ({
                ...prev,
                aeronaves: [...prev.aeronaves, { id: '', brand: '', model: '', serial_number: '', insurer: '', policy: '', start_date: '', end_date: '' }]
            }));
        }
    };

    const handleAircraftSelect = (index, aircraftId) => {
        const selected = drones.find(d => d.id === aircraftId);
        const newAeronaves = [...aeroForm.aeronaves];
        newAeronaves[index] = {
            ...newAeronaves[index],
            id: aircraftId,
            brand: selected?.brand || '',
            model: selected?.model || '',
            serial_number: selected?.serial_number || ''
        };
        setAeroForm(prev => ({ ...prev, aeronaves: newAeronaves }));
    };

    const updateMaintField = (index, field, value) => {
        const newAeronaves = [...aeroForm.aeronaves];
        newAeronaves[index][field] = value;
        setAeroForm(prev => ({ ...prev, aeronaves: newAeronaves }));
    };

    // FUNCIÓN PARA AGREGAR SLOT DE TECNOLOGÍA
    const addTechSlot = () => {
        if (aeroForm.equipos.length < 3) {
            setAeroForm(prev => ({
                ...prev,
                equipos: [...prev.equipos, { id: '', brand: '', model: '', type: '', serial_number: '' }]
            }));
        }
    };

    // FUNCIÓN PARA AUTOCOMPLETAR EQUIPO (Simulando carga de inventario)
    const handleTechSelect = (index, itemId, inventoryList) => {
        const selected = inventoryList.find(i => i.id === itemId);
        const newEquipos = [...aeroForm.equipos];
        newEquipos[index] = {
            ...newEquipos[index],
            id: itemId,
            brand: selected?.brand || '',
            model: selected?.model || '',
            type: selected?.category || 'Cámara/Sensor',
            serial_number: selected?.serial_number || ''
        };
        setAeroForm(prev => ({ ...prev, equipos: newEquipos }));
    };

    // FUNCIÓN PARA AGREGAR SLOT DE PILOTO (MÁXIMO 3)
    const addPilotSlot = () => {
        if (aeroForm.pilotos_solicitud.length < 3) {
            setAeroForm(prev => ({
                ...prev,
                pilotos_solicitud: [...prev.pilotos_solicitud, { id: '', name: '', id_number: '', phone: '' }]
            }));
        }
    };

    // FUNCIÓN PARA AUTOCOMPLETAR DATOS DEL PILOTO
    const handlePilotSelect = (index, pilotId) => {
        const selected = pilots?.find(p => p.id === pilotId);
        const newPilotos = [...aeroForm.pilotos_solicitud];
        newPilotos[index] = {
            ...newPilotos[index],
            id: pilotId,
            name: selected?.name || '',
            id_number: selected?.id_number || '',
            phone: selected?.phone || ''
        };
        setAeroForm(prev => ({ ...prev, pilotos_solicitud: newPilotos }));
    };

    // FUNCIÓN PARA AGREGAR SLOT DE OBSERVADOR
    const addObserverSlot = () => {
        if (aeroForm.observadores.length < 2) {
            setAeroForm(prev => ({
                ...prev,
                observadores: [...prev.observadores, { id: '', name: '', id_number: '', phone: '' }]
            }));
        }
    };

    // FUNCIÓN PARA AUTOCOMPLETAR DATOS DEL OBSERVADOR (Desde lista de pilotos)
    const handleObserverSelect = (index, personId) => {
        const selected = pilots?.find(p => p.id === personId);
        const newObs = [...aeroForm.observadores];
        newObs[index] = {
            ...newObs[index],
            id: personId,
            name: selected?.name || '',
            id_number: selected?.id_number || '',
            phone: selected?.phone || ''
        };
        setAeroForm(prev => ({ ...prev, observadores: newObs }));
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

            {/* SECCIÓN 7: AERONAVE(S) NO TRIPULADA(S) UAS */}
            <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden mt-8 animate-in fade-in duration-500">
                <div className="bg-slate-100 border-b border-slate-200 p-4 flex justify-between items-center px-8">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-blue-600">aeroplane</span>
                        <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest">7. AERONAVE(S) NO TRIPULADA(S) UAS</h4>
                    </div>
                    <div className="flex items-center gap-4">
                        <p className="text-[9px] font-black text-slate-400 uppercase">Slots: {aeroForm.aeronaves.length} / 3</p>
                        <HelpTooltip text="Seleccione las aeronaves de su flota. Debe incluir los datos vigentes de la póliza de Responsabilidad Civil Extracontractual (RCE)." />
                    </div>
                </div>

                <div className="p-8 space-y-8">
                    {aeroForm.aeronaves.map((unit, index) => (
                        <div key={index} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4 relative">
                            <div className="flex justify-between items-center mb-2">
                                <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase">Aeronave #{index + 1}</span>
                                {index > 0 && (
                                    <button onClick={() => setAeroForm(prev => ({...prev, aeronaves: prev.aeronaves.filter((_, i) => i !== index)}))} className="text-red-500 material-symbols-outlined text-sm">delete</button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Seleccionar de Flota</label>
                                    <select 
                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-orange-500"
                                        value={unit.id}
                                        onChange={(e) => handleAircraftSelect(index, e.target.value, drones)}
                                    >
                                        <option value="">-- Elegir Equipo --</option>
                                        {drones?.map(d => <option key={d.id} value={d.id}>{d.model} ({d.serial_number})</option>)}
                                    </select>
                                </div>
                                <InputCol label="Marca" value={unit.brand} disabled isDark={false} />
                                <InputCol label="Modelo" value={unit.model} disabled isDark={false} />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-slate-200/50">
                                <InputCol label="Empresa Aseguradora" placeholder="Ej: Seguros Bolívar" value={unit.insurer} onChange={e => updateMaintField(index, 'insurer', e.target.value)} />
                                <InputCol label="Número de Póliza" placeholder="000-XXX-000" value={unit.policy} onChange={e => updateMaintField(index, 'policy', e.target.value)} />
                                <InputCol label="Inicio Cobertura" type="date" value={unit.start_date} onChange={e => updateMaintField(index, 'start_date', e.target.value)} />
                                <InputCol label="Fin Cobertura" type="date" value={unit.end_date} onChange={e => updateMaintField(index, 'end_date', e.target.value)} />
                            </div>
                        </div>
                    ))}

                    {aeroForm.aeronaves.length < 3 && (
                        <button 
                            onClick={addAircraftSlot}
                            className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-black text-[10px] uppercase hover:border-orange-500 hover:text-orange-500 transition-all flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-sm">add_circle</span>
                            Vincular otra aeronave a la solicitud
                        </button>
                    )}
                </div>
            </section>
            
            {/* SECCIÓN 8: EQUIPOS TECNOLÓGICOS */}
            <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden mt-8 animate-in fade-in duration-500">
                <div className="bg-slate-100 border-b border-slate-200 p-4 flex justify-between items-center px-8">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-purple-600">settings_input_component</span>
                        <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest">8. EQUIPOS TECNOLÓGICOS (PAYLOADS)</h4>
                    </div>
                    <HelpTooltip text="Relacione los equipos integrados o externos como cámaras, sensores LIDAR o sistemas de fumigación registrados en su inventario." />
                </div>

                <div className="p-8 space-y-8">
                    {aeroForm.equipos.map((item, index) => (
                        <div key={index} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4 relative">
                            <div className="flex justify-between items-center">
                                <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase">Equipo #{index + 1}</span>
                                {index > 0 && (
                                    <button onClick={() => setAeroForm(prev => ({...prev, equipos: prev.equipos.filter((_, i) => i !== index)}))} className="text-red-500 material-symbols-outlined text-sm">delete</button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="space-y-1 lg:col-span-2">
                                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Seleccionar de Inventario</label>
                                    <select 
                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-orange-500"
                                        value={item.id}
                                        onChange={(e) => handleTechSelect(index, e.target.value, []) /* Aquí iría su lista de inventario */}
                                    >
                                        <option value="">-- Elegir de Catálogo --</option>
                                        {/* El mapeo de inventoryItems irá aquí cuando conectemos la tabla */}
                                    </select>
                                </div>
                                <InputCol label="Tipo de Equipo" value={item.type} disabled />
                                <InputCol label="Número de Serie" value={item.serial_number} disabled />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputCol label="Marca" value={item.brand} disabled />
                                <InputCol label="Modelo" value={item.model} disabled />
                            </div>
                        </div>
                    ))}

                    {aeroForm.equipos.length < 3 && (
                        <button 
                            onClick={addTechSlot}
                            className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-black text-[10px] uppercase hover:border-purple-500 hover:text-purple-500 transition-all flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-sm">add_circle</span>
                            Vincular equipo tecnológico adicional
                        </button>
                    )}
                </div>
            </section>

            {/* SECCIÓN 9: PILOTO(S) UAS */}
            <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden mt-8 animate-in fade-in duration-500">
                <div className="bg-slate-100 border-b border-slate-200 p-4 flex justify-between items-center px-8">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-orange-600">person_check</span>
                        <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest">9. PILOTO(S) UAS</h4>
                    </div>
                    <div className="flex items-center gap-4">
                        <p className="text-[9px] font-black text-slate-400 uppercase">Tripulantes: {aeroForm.pilotos_solicitud.length} / 3</p>
                        <HelpTooltip text="Seleccione los pilotos que participarán en la misión. El sistema cargará su identificación y teléfono de contacto automáticamente." />
                    </div>
                </div>

                <div className="p-8 space-y-8">
                    {aeroForm.pilotos_solicitud.map((pilot, index) => (
                        <div key={index} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4 relative">
                            <div className="flex justify-between items-center mb-2">
                                <span className="bg-orange-600 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase">Piloto #{index + 1}</span>
                                {index > 0 && (
                                    <button onClick={() => setAeroForm(prev => ({...prev, pilotos_solicitud: prev.pilotos_solicitud.filter((_, i) => i !== index)}))} className="text-red-500 material-symbols-outlined text-sm">delete</button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Vincular de Tripulación</label>
                                    <select 
                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-orange-500"
                                        value={pilot.id}
                                        onChange={(e) => handlePilotSelect(index, e.target.value)}
                                    >
                                        <option value="">-- Seleccionar Piloto --</option>
                                        {pilots?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                <InputCol label="N° Documento Identificación" value={pilot.id_number} disabled />
                                <InputCol label="N° Teléfono Celular" value={pilot.phone} disabled />
                            </div>
                        </div>
                    ))}

                    {aeroForm.pilotos_solicitud.length < 3 && (
                        <button 
                            onClick={addPilotSlot}
                            className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-black text-[10px] uppercase hover:border-orange-500 hover:text-orange-500 transition-all flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-sm">group_add</span>
                            Vincular otro piloto a la misión
                        </button>
                    )}
                </div>
            </section>

            {/* SECCIÓN 10: OBSERVADOR(ES) UA */}
            <section className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden mt-8 animate-in fade-in duration-500">
                <div className="bg-slate-100 border-b border-slate-200 p-4 flex justify-between items-center px-8">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-emerald-600">visibility</span>
                        <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest">10. OBSERVADOR(ES) UA</h4>
                    </div>
                    <HelpTooltip text="Relacione el personal que actuará como observador visual de la operación. Pueden ser pilotos registrados u otro personal capacitado." />
                </div>

                <div className="p-8 space-y-6">
                    {aeroForm.observadores.map((obs, index) => (
                        <div key={index} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-4 relative">
                            <div className="flex justify-between items-center mb-2">
                                <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[9px] font-black uppercase">Observador #{index + 1}</span>
                                {index > 0 && (
                                    <button onClick={() => setAeroForm(prev => ({...prev, observadores: prev.observadores.filter((_, i) => i !== index)}))} className="text-red-500 material-symbols-outlined text-sm">delete</button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Vincular de Tripulación (Opcional)</label>
                                    <select 
                                        className="w-full p-3 bg-white border border-slate-200 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-orange-500"
                                        value={obs.id}
                                        onChange={(e) => handleObserverSelect(index, e.target.value)}
                                    >
                                        <option value="">-- Seleccionar de la lista --</option>
                                        {pilots?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                                {/* Campos editables por si el observador no está en la base de datos de pilotos */}
                                <InputCol 
                                    label="Nombre Completo" 
                                    value={obs.name} 
                                    onChange={e => {
                                        const newObs = [...aeroForm.observadores];
                                        newObs[index].name = e.target.value;
                                        setAeroForm({...aeroForm, observadores: newObs});
                                    }} 
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <InputCol 
                                        label="Documento ID" 
                                        value={obs.id_number} 
                                        onChange={e => {
                                            const newObs = [...aeroForm.observadores];
                                            newObs[index].id_number = e.target.value;
                                            setAeroForm({...aeroForm, observadores: newObs});
                                        }} 
                                    />
                                    <InputCol 
                                        label="Teléfono Celular" 
                                        value={obs.phone} 
                                        onChange={e => {
                                            const newObs = [...aeroForm.observadores];
                                            newObs[index].phone = e.target.value;
                                            setAeroForm({...aeroForm, observadores: newObs});
                                        }} 
                                    />
                                </div>
                            </div>
                        </div>
                    ))}

                    {aeroForm.observadores.length < 2 && (
                        <button 
                            onClick={addObserverSlot}
                            className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-black text-[10px] uppercase hover:border-emerald-500 hover:text-emerald-500 transition-all flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-sm">person_add_alt</span>
                            Asignar observador adicional
                        </button>
                    )}
                </div>
            </section>

            <button className="w-full py-6 bg-slate-900 text-white font-black rounded-[2.5rem] shadow-xl uppercase text-xs tracking-widest hover:bg-orange-600 transition-all active:scale-95">
                Generar Formato 100 PDF
            </button>
        </div>
    );
}

// --- ESTA DEBE SER LA ÚNICA VEZ QUE APAREZCAN ESTAS FUNCIONES AL FINAL DEL ARCHIVO ---

function AeroCheck({ label, checked, onChange }) {
    return (
        <button type="button" onClick={onChange} className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left ${checked ? 'border-orange-500 bg-orange-50/50 shadow-md scale-[1.01]' : 'border-slate-100 bg-slate-50/30 hover:border-slate-200'}`}>
            <span className={`text-[10px] font-black leading-tight uppercase ${checked ? 'text-orange-700' : 'text-slate-500'}`}>{label}</span>
            <div className={`size-6 rounded-lg border-2 flex items-center justify-center shrink-0 ${checked ? 'bg-orange-600 border-orange-600' : 'border-slate-200 bg-white'}`}>
                {checked && <span className="material-symbols-outlined text-white text-base">close</span>}
            </div>
        </button>
    );
}

function VisualOption({ label, description, selected, onClick }) {
    return (
        <button type="button" onClick={onClick} className={`w-full flex items-center justify-between p-5 rounded-[1.5rem] border-2 transition-all text-left ${selected ? 'border-orange-500 bg-orange-50/30 shadow-md' : 'border-slate-100 bg-slate-50/30 hover:border-slate-200'}`}>
            <div className="flex-1 pr-4">
                <p className={`text-[10px] font-black uppercase ${selected ? 'text-orange-700' : 'text-slate-500'}`}>{label}</p>
                <p className="text-[9px] text-slate-400 font-medium mt-1 leading-tight">{description}</p>
            </div>
            <div className={`size-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${selected ? 'bg-orange-600 border-orange-600' : 'border-slate-200 bg-white'}`}>
                {selected && <span className="material-symbols-outlined text-white text-base">check</span>}
            </div>
        </button>
    );
}

function InputCol({ label, placeholder, type = "text", value, onChange, disabled = false }) {
    return (
        <div className="space-y-1">
            <label className="text-[9px] font-black text-slate-400 uppercase ml-1">{label}</label>
            <input 
                disabled={disabled}
                type={type} 
                className={`w-full p-3 rounded-xl border-none font-bold text-xs focus:ring-2 focus:ring-orange-500 outline-none ${disabled ? 'bg-slate-200 text-slate-500' : 'bg-slate-50 text-slate-900'}`} 
                placeholder={placeholder} 
                value={value} 
                onChange={onChange} 
            />
        </div>
    );
}