'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link'; // Importar Link para el botón de retorno

export default function FormSettings() {
    const [type, setType] = useState('briefing');
    const [selectedModel, setSelectedModel] = useState('General');
    const [models, setModels] = useState([]);
    const [labels, setLabels] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const LIMITS = { health: 30, briefing: 50, preflight: 70 };

    useEffect(() => {
        async function init() {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
            
            // Cargar modelos de drones de la empresa
            const { data: drones } = await supabase.from('aircraft').select('model').eq('organization_id', prof.organization_id);
            const uniqueModels = [...new Set(drones?.map(d => d.model))];
            setModels(uniqueModels);

            // Cargar etiquetas actuales
            const query = supabase.from('form_definitions').select('*').eq('organization_id', prof.organization_id).eq('form_type', type);
            if (type === 'preflight') query.eq('aircraft_model', selectedModel);
            
            const { data } = await query;
            const labelMap = {};
            data?.forEach(d => { labelMap[d.field_number] = d.label_text; });
            setLabels(labelMap);
            setLoading(false);
        }
        init();
    }, [type, selectedModel]);

    const handleSave = async () => {
        setSaving(true);
        const { data: { user } } = await supabase.auth.getUser();
        const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();

        const updates = Object.entries(labels).filter(([_, text]) => text.trim() !== "").map(([num, text]) => ({
            organization_id: prof.organization_id,
            form_type: type,
            aircraft_model: type === 'preflight' ? selectedModel : 'General',
            field_number: parseInt(num),
            label_text: text
        }));

        const { error } = await supabase.from('form_definitions').upsert(updates);

        if (error) alert("Error: " + error.message);
        else alert(`✅ Protocolo ${type.toUpperCase()} (${selectedModel}) guardado.`);
        setSaving(false);
    };

    if (loading) return <div className="p-20 text-center font-black animate-pulse">SINCRONIZANDO DICCIONARIO...</div>;

    return (
        <div className="max-w-4xl mx-auto p-10 space-y-8 text-left animate-in fade-in duration-500">
            <header className="flex justify-between items-end border-b pb-6">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Editor de Protocolos</h2>
                    <p className="text-slate-500 text-sm italic">Ingrese los datos, segpun corresponda en su Manual de Operaciones y MCM</p>
                </div>
                <button onClick={handleSave} disabled={saving} className="bg-orange-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">
                    {saving ? 'PROCESANDO...' : 'GUARDAR CAMBIOS'}
                </button>
            </header>

            <div className="flex flex-wrap gap-4 items-center justify-between">
                <div className="flex bg-slate-100 p-1 rounded-2xl">
                    {['health', 'briefing', 'preflight'].map(t => (
                        <button key={t} onClick={() => setType(t)} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${type === t ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}>{t}</button>
                    ))}
                </div>

                {type === 'preflight' && (
                    <select className="bg-white border-2 border-orange-100 p-3 rounded-2xl font-black text-[10px] uppercase text-orange-600 outline-none" value={selectedModel} onChange={e => setSelectedModel(e.target.value)}>
                        <option value="General">Modelo General</option>
                        {models.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                )}
            </div>

            <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-10 grid grid-cols-1 gap-4 max-h-[500px] overflow-y-auto custom-scrollbar">
                    {Array.from({ length: LIMITS[type] }).map((_, i) => (
                        <div key={i} className="flex items-center gap-6 group">
                            <span className="text-[11px] font-black text-slate-300 w-8 group-hover:text-orange-600">{(i + 1).toString().padStart(2, '0')}</span>
                            <input 
                                value={labels[i + 1] || ''}
                                placeholder="Escriba requerimiento..."
                                className="flex-1 p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm focus:bg-orange-50 outline-none"
                                onChange={(e) => setLabels({...labels, [i + 1]: e.target.value})}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
    return (
        <>
            {/* BLOQUEO PARA CELULARES */}
            <div className="lg:hidden flex flex-col items-center justify-center min-h-[70vh] p-10 text-center animate-in fade-in">
                <div className="size-20 bg-orange-100 rounded-3xl flex items-center justify-center text-orange-600 mb-6 shadow-lg">
                    <span className="material-symbols-outlined text-5xl">desktop_windows</span>
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 leading-tight">Configuración Restringida</h2>
                <p className="text-slate-500 text-sm mt-4 font-medium max-w-xs uppercase tracking-widest text-[10px]">
                    El mapeo de slots y protocolos de flota requiere una pantalla de alta resolución para garantizar la precisión. Por favor, use un <span className="text-orange-600 font-black">Computador</span>.
                </p>
                <Link href="/dashboard" className="mt-10 px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest">Volver al Mando</Link>
            </div>

            {/* CONTENIDO SOLO PARA PC */}
            <div className="hidden lg:block max-w-4xl mx-auto p-10 space-y-8 text-left animate-in fade-in duration-500">
                {/* ... (Todo su código anterior del Editor de Formatos se mantiene aquí adentro) ... */}
            </div>
        </>
    );
}

