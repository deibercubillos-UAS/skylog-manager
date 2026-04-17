'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import HelpTooltip from '@/components/HelpTooltip';

export default function AerocivilForm() {
    const [geo, setGeo] = useState({ depts: [], munis: [], all: [] });
    const [loading, setLoading] = useState(true);
    const [aeroForm, setAeroForm] = useState({ department: '', municipality: '' });

    useEffect(() => {
        async function loadGeo() {
            try {
                // CONSULTA TOTAL (Sin filtros iniciales para evitar el 406)
                const { data, error } = await supabase
                    .from('colombia_geo')
                    .select('department, municipality')
                    .range(0, 1500); // Cubrimos los 1,122 municipios

                if (error) {
                    console.error("Error Supabase Geo:", error.message);
                    return;
                }

                if (data && data.length > 0) {
                    console.log("Mapa de Colombia cargado:", data.length, "registros.");
                    // Estandarizamos a Mayúsculas para evitar errores de duplicidad
                    const uniqueDepts = [...new Set(data.map(i => i.department?.toUpperCase()))].sort();
                    setGeo({ depts: uniqueDepts, munis: [], all: data });
                } else {
                    console.warn("La tabla colombia_geo parece estar vacía.");
                }
            } catch (err) {
                console.error("Falla de red en geografía:", err);
            } finally {
                setLoading(false);
            }
        }
        loadGeo();
    }, []);

    const handleDeptChange = (deptName) => {
        // 1. Filtramos municipios del departamento (Case Insensitive)
        const filtered = geo.all
            .filter(i => i.department?.toUpperCase() === deptName.toUpperCase())
            .map(i => i.municipality?.toUpperCase())
            .sort();
            
        // 2. Actualizamos estados
        setGeo(prev => ({ ...prev, munis: filtered }));
        setAeroForm({ ...aeroForm, department: deptName, municipality: '' });
    };

    if (loading) return (
        <div className="p-10 text-center space-y-4">
            <div className="animate-spin size-8 border-4 border-orange-500 border-b-transparent rounded-full mx-auto"></div>
            <p className="font-black text-slate-400 uppercase text-xs tracking-widest">Sincronizando Municipios de Colombia...</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20 text-left">
            <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm space-y-8">
                <div className="flex items-center justify-between border-b pb-4">
                    <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest">4. UBICACIÓN DE LA OPERACIÓN</h4>
                    <HelpTooltip text="Seleccione el departamento y luego el municipio. Estos datos provienen de su base de datos interna de geografía." />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* SELECTOR DE DEPARTAMENTO */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Departamento</label>
                        <select 
                            className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm text-slate-700 focus:ring-2 focus:ring-orange-500 appearance-none outline-none"
                            value={aeroForm.department}
                            onChange={e => handleDeptChange(e.target.value)}
                        >
                            <option value="">-- {geo.depts.length > 0 ? `Seleccionar (${geo.depts.length})` : 'Cargando Departamentos...'} --</option>
                            {geo.depts.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>

                    {/* SELECTOR DE MUNICIPIO */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Municipio</label>
                        <select 
                            disabled={!aeroForm.department}
                            className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm text-slate-700 focus:ring-2 focus:ring-orange-500 disabled:opacity-30 appearance-none outline-none"
                            value={aeroForm.municipality}
                            onChange={e => setAeroForm({...aeroForm, municipality: e.target.value})}
                        >
                            <option value="">
                                {aeroForm.department ? `-- Seleccionar (${geo.munis.length}) --` : "Elija departamento primero"}
                            </option>
                            {geo.munis.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                </div>

                {aeroForm.municipality && (
                    <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 text-center animate-in zoom-in">
                        <p className="text-[10px] font-black text-orange-600 uppercase">
                            Localización Confirmada: {aeroForm.municipality}, {aeroForm.department}
                        </p>
                    </div>
                )}
            </section>

            <button className="w-full py-6 bg-slate-900 text-white font-black rounded-[2.5rem] shadow-xl uppercase text-xs tracking-widest hover:bg-orange-600 transition-all active:scale-95">
                Continuar Solicitud Aerocivil
            </button>
        </div>
    );
}
