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
                // Consultamos las columnas exactas del CSV
                const { data, error } = await supabase
                    .from('colombia_geo')
                    .select('"Nombre Departamento", "Nombre Municipio"')
                    .range(0, 1200)
                    .order('"Nombre Departamento"', { ascending: true });

                if (error) throw error;

                if (data) {
                    // Extraemos departamentos usando la clave exacta con espacios
                    const uniqueDepts = [...new Set(data.map(i => i["Nombre Departamento"]))].sort();
                    setGeo({ depts: uniqueDepts, munis: [], all: data });
                }
            } catch (err) {
                console.error("Error de mapeo CSV:", err.message);
            } finally {
                setLoading(false);
            }
        }
        loadGeo();
    }, []);

    const handleDeptChange = (deptName) => {
        // Filtrado por la clave exacta del CSV
        const filtered = geo.all
            .filter(i => i["Nombre Departamento"] === deptName)
            .map(i => i["Nombre Municipio"])
            .sort();
            
        setGeo(prev => ({ ...prev, munis: filtered }));
        setAeroForm({ ...aeroForm, department: deptName, municipality: '' });
    };

    if (loading) return (
        <div className="p-10 text-center space-y-3">
            <div className="animate-spin size-6 border-2 border-orange-500 border-b-transparent rounded-full mx-auto"></div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando Base de Datos Geográfica...</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20 text-left">
            <section className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
                <div className="flex items-center justify-between border-b pb-4">
                    <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest">4. UBICACIÓN DE LA OPERACIÓN</h4>
                    <HelpTooltip text="Seleccione departamento y municipio. Datos sincronizados con el Divipola Nacional." />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Departamento</label>
                        <select 
                            className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm text-slate-700 outline-none focus:ring-2 focus:ring-orange-500 appearance-none"
                            value={aeroForm.department}
                            onChange={e => handleDeptChange(e.target.value)}
                        >
                            <option value="">-- Seleccionar ({geo.depts.length}) --</option>
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
                            <option value="">
                                {aeroForm.department ? `-- Seleccionar (${geo.munis.length}) --` : "Elija departamento"}
                            </option>
                            {geo.munis.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                </div>
            </section>

            <button className="w-full py-6 bg-slate-900 text-white font-black rounded-[2.5rem] shadow-xl uppercase text-xs tracking-widest hover:bg-orange-600 transition-all">
                Generar Formato 100
            </button>
        </div>
    );
}