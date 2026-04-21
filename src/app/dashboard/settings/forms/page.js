'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function FormSettings() {
    const [type, setType] = useState('briefing');
    const [selectedModel, setSelectedModel] = useState('General');
    const [models, setModels] = useState([]);
    const [labels, setLabels] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [healthEnabled, setHealthEnabled] = useState(true);

    const LIMITS = { health: 30, briefing: 50, preflight: 70 };

    useEffect(() => {
        async function init() {
            try {
                setLoading(true);
                const { data: { user } } = await supabase.auth.getUser();
                const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
                
                // Cargar modelos y configuración de salud
                const [dronesRes, orgRes] = await Promise.all([
                    supabase.from('aircraft').select('model').eq('organization_id', prof.organization_id),
                    supabase.from('organizations').select('enable_health_check').eq('id', prof.organization_id).single()
                ]);

                const uniqueModels = [...new Set(dronesRes.data?.map(d => d.model))];
                setModels(uniqueModels);
                setHealthEnabled(orgRes.data?.enable_health_check ?? true);

                // Cargar etiquetas actuales
                const query = supabase.from('form_definitions').select('*').eq('organization_id', prof.organization_id).eq('form_type', type);
                if (type === 'preflight') query.eq('aircraft_model', selectedModel);
                else query.eq('aircraft_model', 'General');
                
                const { data: defs } = await query;
                const labelMap = {};
                defs?.forEach(d => { labelMap[d.field_number] = d.label_text; });
                setLabels(labelMap);
            } finally {
                setLoading(false);
            }
        }
        init();
    }, [type, selectedModel]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();

            const updates = Object.entries(labels)
                .filter(([_, text]) => text && text.trim() !== "")
                .map(([num, text]) => ({
                    organization_id: prof.organization_id,
                    form_type: type,
                    aircraft_model: type === 'preflight' ? selectedModel : 'General',
                    field_number: parseInt(num),
                    label_text: text.toUpperCase()
                }));

            const { error } = await supabase.from('form_definitions').upsert(updates);
            if (error) throw error;
            alert("✅ PROTOCOLO GUARDADO EXITOSAMENTE");
        } catch (e) {
            alert("Error: " + e.message);
        } finally {
            setSaving(false);
        }
    };

    const toggleHealth = async () => {
        const newStatus = !healthEnabled;
        setHealthEnabled(newStatus);
        const { data: { user } } = await supabase.auth.getUser();
        const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        await supabase.from('organizations').update({ enable_health_check: newStatus }).eq('id', prof.organization_id);
    };

    if (loading) return <div className="p-20 text-center font-black animate-pulse text-slate-400">CARGANDO DICCIONARIO...</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-6 md:space-y-10 text-left animate-in fade-in duration-500 pb-32 px-4 md:px-0">
            
            {/* HEADER RESPONSIVO */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b pb-6">
                <div>
                    <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter text-slate-900">Editor de Protocolos</h2>
                    <p className="text-slate-500 text-xs md:text-sm italic mt-1">Configuración técnica de la organización</p>
                </div>
                <button 
                    onClick={handleSave} 
                    disabled={saving} 
                    className="w-full md:w-auto bg-orange-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                >
                    {saving ? 'SINCRO...' : 'Guardar Cambios'}
                </button>
            </header>

            {/* SELECTORES Y FILTROS */}
            <div className="flex flex-col gap-4">
                <div className="flex bg-slate-200/50 p-1.5 rounded-2xl w-full md:w-fit overflow-x-auto custom-scrollbar">
                    {[
                        { id: 'health', label: 'SALUD' },
                        { id: 'preflight', label: 'PRE-VUELO' },
                        { id: 'briefing', label: 'BRIEFING' }
                    ].map(t => (
                        <button 
                            key={t.id} 
                            onClick={() => setType(t.id)} 
                            className={`flex-1 md:flex-none px-6 md:px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${type === t.id ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500'}`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {type === 'preflight' && (
                    <div className="flex items-center gap-3 animate-in slide-in-from-left">
                        <span className="text-[9px] font-black text-slate-400 uppercase ml-2">Modelo:</span>
                        <select 
                            className="bg-white border-2 border-orange-100 p-3 rounded-2xl font-black text-[10px] uppercase text-orange-600 outline-none flex-1 md:flex-none" 
                            value={selectedModel} 
                            onChange={e => setSelectedModel(e.target.value)}
                        >
                            <option value="General">Modelo General</option>
                            {models.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                )}
            </div>

            {/* SWITCH DE SALUD PARA MOBILE */}
            {type === 'health' && (
                <div className="flex items-center justify-between bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <div className="pr-4">
                        <p className="text-xs font-black text-slate-900 uppercase">Activar Protocolo</p>
                        <p className="text-[9px] text-slate-500 mt-1 uppercase font-bold">Solicitar chequeo médico antes de cada vuelo</p>
                    </div>
                    <button 
                        onClick={toggleHealth}
                        className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${healthEnabled ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'}`}
                    >
                        {healthEnabled ? 'ON' : 'OFF'}
                    </button>
                </div>
            )}

            {/* LISTADO DE SLOTS OPTIMIZADO */}
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="hidden md:flex p-4 bg-slate-50 border-b justify-between px-10 text-[9px] font-black text-slate-400 uppercase">
                    <span>Posición (Slot)</span>
                    <span>Descripción del Requerimiento Técnico</span>
                </div>
                <div className="p-4 md:p-10 grid grid-cols-1 gap-3 md:gap-4 max-h-[60vh] overflow-y-auto custom-scrollbar bg-white">
                    {Array.from({ length: LIMITS[type] }).map((_, i) => (
                        <div key={i} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-6 group border-b border-slate-50 pb-3 md:pb-0 md:border-none last:border-none">
                            <div className="flex items-center gap-3">
                                <span className="text-[11px] font-black text-slate-300 w-8 group-hover:text-orange-600 transition-colors">{(i + 1).toString().padStart(2, '0')}</span>
                                <span className="md:hidden text-[9px] font-black text-slate-400 uppercase tracking-widest">Requerimiento</span>
                            </div>
                            <input 
                                value={labels[i + 1] || ''}
                                placeholder="Describa el punto de chequeo..."
                                className="flex-1 p-3 md:p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm focus:bg-orange-50 focus:ring-2 focus:ring-orange-200 outline-none transition-all"
                                onChange={(e) => setLabels({...labels, [i + 1]: e.target.value})}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}