'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import HelpTooltip from '@/components/HelpTooltip';

export default function AerocivilForm() {
    const [geo, setGeo] = useState({ depts: [], munis: [], all: [] });
    const [aeroForm, setAeroForm] = useState({ department: '', municipality: '', op_types: [] });

    useEffect(() => {
        async function loadGeo() {
            const { data } = await supabase.from('colombia_geo').select('*').order('department');
            if (data) {
                const uniqueDepts = [...new Set(data.map(i => i.department))];
                setGeo({ depts: uniqueDepts, munis: [], all: data });
            }
        }
        loadGeo();
    }, []);

    const handleDept = (name) => {
        const filtered = geo.all.filter(i => i.department === name).map(i => i.municipality).sort();
        setGeo(prev => ({ ...prev, munis: filtered }));
        setAeroForm({ ...aeroForm, department: name, municipality: '' });
    };

    return (
        <div className="space-y-10 animate-in slide-in-from-right duration-500">
            <section className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-sm space-y-8">
                <div className="flex items-center justify-between border-b pb-4">
                    <h4 className="font-black text-slate-900 uppercase text-xs">4. UBICACIÓN GEOGRÁFICA</h4>
                    <HelpTooltip text="Seleccione el departamento y municipio de la operación según el Divipola nacional." />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400">Departamento</label>
                        <select className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={aeroForm.department} onChange={e => handleDept(e.target.value)}>
                            <option value="">-- Seleccionar --</option>
                            {geo.depts.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400">Municipio</label>
                        <select disabled={!aeroForm.department} className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm" value={aeroForm.municipality} onChange={e => setAeroForm({...aeroForm, municipality: e.target.value})}>
                            <option value="">-- Seleccionar --</option>
                            {geo.munis.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                </div>
            </section>
            <button className="w-full py-6 bg-slate-900 text-white font-black rounded-[2rem] shadow-xl uppercase text-xs">Generar Formato 100 PDF</button>
        </div>
    );
}