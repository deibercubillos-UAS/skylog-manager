'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import HelpTooltip from '@/components/HelpTooltip';

export default function AerocivilForm() {
    const [geo, setGeo] = useState({ depts: [], munis: [], all: [] });
    const [loadingGeo, setLoadingGeo] = useState(true);
    const [aeroForm, setAeroForm] = useState({ department: '', municipality: '', op_types: [] });

    useEffect(() => {
        async function loadGeo() {
            setLoadingGeo(true);
            try {
                // Pedimos un rango extendido (0 a 2000) para superar el límite de 1000 de Supabase
                const { data, error } = await supabase
                    .from('colombia_geo')
                    .select('*')
                    .range(0, 2000) 
                    .order('department', { ascending: true });

                if (error) throw error;

                if (data) {
                    // Extraer nombres de departamentos únicos y ordenarlos
                    const uniqueDepts = [...new Set(data.map(i => i.department))].sort();
                    setGeo({ depts: uniqueDepts, munis: [], all: data });
                }
            } catch (err) {
                console.error("Error cargando geografía:", err.message);
            } finally {
                setLoadingGeo(false);
            }
        }
        loadGeo();
    }, []);

    const handleDeptChange = (deptName) => {
        // Filtrar municipios que pertenezcan exactamente al departamento seleccionado
        const filtered = geo.all
            .filter(i => i.department === deptName)
            .map(i => i.municipality)
            .sort();
            
        setGeo(prev => ({ ...prev, munis: filtered }));
        setAeroForm({ ...aeroForm, department: deptName, municipality: '' });
    };

    return (
        <div className="space-y-10 animate-in slide-in-from-right duration-500 pb-20">
            {/* ENCABEZADO FORMATO 100 */}
            <div className="bg-slate-900 p-8 rounded-[3rem] text-white flex justify-between items-center border-l-8 border-orange-600 shadow-2xl">
                <div>
                    <h3 className="text-2xl font-black uppercase tracking-tight leading-none">Formato 100</h3>
                    <p className="text-orange-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Localización Geográfica de Operación</p>
                </div>
                {loadingGeo && <div className="animate-spin size-6 border-b-2 border-orange-500 rounded-full"></div>}
            </div>

            <section className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
                <div className="flex items-center justify-between border-b pb-4">
                    <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-orange-600">distance</span>
                        <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest">4. UBICACIÓN GEOGRÁFICA</h4>
                    </div>
                    <HelpTooltip text="Seleccione el departamento. La lista de municipios se actualizará automáticamente según la codificación nacional." />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* SELECTOR DE DEPARTAMENTO */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Departamento</label>
                        <select 
                            className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none appearance-none"
                            value={aeroForm.department}
                            onChange={e => handleDeptChange(e.target.value)}
                        >
                            <option value="">-- Seleccionar Departamento ({geo.depts.length}) --</option>
                            {geo.depts.map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                    </div>

                    {/* SELECTOR DE MUNICIPIO */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Municipio</label>
                        <select 
                            disabled={!aeroForm.department || geo.munis.length === 0}
                            className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm text-slate-700 focus:ring-2 focus:ring-orange-500 outline-none appearance-none disabled:opacity-30"
                            value={aeroForm.municipality}
                            onChange={e => setAeroForm({...aeroForm, municipality: e.target.value})}
                        >
                            <option value="">
                                {!aeroForm.department ? "Elija un departamento primero" : `-- Seleccionar Municipio (${geo.munis.length}) --`}
                            </option>
                            {geo.munis.map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* VISUALIZACIÓN TÉCNICA */}
                {aeroForm.municipality && (
                    <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 animate-in zoom-in duration-300">
                        <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest text-center">
                            Operación Localizada: {aeroForm.municipality}, {aeroForm.department}
                        </p>
                    </div>
                )}
            </section>

            <button className="w-full py-6 bg-slate-900 text-white font-black rounded-[2rem] shadow-xl uppercase text-xs tracking-widest hover:bg-orange-600 transition-all active:scale-95">
                Generar Formato 100 PDF
            </button>
        </div>
    );
}