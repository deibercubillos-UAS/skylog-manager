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
                // Traemos todos los registros (1,122 municipios de Colombia)
                const { data, error } = await supabase
                    .from('colombia_geo')
                    .select('department, municipality')
                    .range(0, 1200)
                    .order('department', { ascending: true });

                if (error) throw error;

                if (data && data.length > 0) {
                    // Limpieza: Convertimos a Mayúsculas para estandarizar y quitamos duplicados
                    const uniqueDepts = [...new Set(data.map(i => i.department.toUpperCase()))].sort();
                    setGeo({ depts: uniqueDepts, munis: [], all: data });
                }
            } catch (err) {
                console.error("Error crítico de geografía:", err.message);
            } finally {
                setLoading(false);
            }
        }
        loadGeo();
    }, []);

    const handleDeptChange = (deptName) => {
        // Filtrado insensible a mayúsculas
        const filtered = geo.all
            .filter(i => i.department.toUpperCase() === deptName.toUpperCase())
            .map(i => i.municipality.toUpperCase())
            .sort();
            
        setGeo(prev => ({ ...prev, munis: filtered }));
        setAeroForm({ ...aeroForm, department: deptName, municipality: '' });
    };

    if (loading) return <div className="p-10 text-center animate-pulse font-black text-slate-300">CONFIGURANDO MAPA NACIONAL...</div>;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20 text-left">
            <section className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
                <div className="flex items-center justify-between border-b pb-4">
                    <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest">4. UBICACIÓN GEOGRÁFICA DE LA MISIÓN</h4>
                    <HelpTooltip text="Seleccione el departamento. La lista de municipios se cargará desde la base de datos oficial de la organización." />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* SELECTOR DE DEPARTAMENTO */}
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

                    {/* SELECTOR DE MUNICIPIO */}
                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Municipio</label>
                        <select 
                            disabled={!aeroForm.department}
                            className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm text-slate-700 outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-30 appearance-none"
                            value={aeroForm.municipality}
                            onChange={e => setAeroForm({...aeroForm, municipality: e.target.value})}
                        >
                            <option value="">-- Seleccionar ({geo.munis.length}) --</option>
                            {geo.munis.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                </div>
            </section>

            <button className="w-full py-6 bg-slate-900 text-white font-black rounded-[2.5rem] shadow-xl uppercase text-xs tracking-widest hover:bg-orange-600 transition-all active:scale-95">
                Continuar con Formato 100
            </button>
        </div>
    );
}