'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function FormSettings() {
    const [type, setType] = useState('briefing'); // health, briefing, preflight
    const [labels, setLabels] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const LIMITS = { health: 30, briefing: 50, preflight: 70 };

    useEffect(() => {
        async function loadLabels() {
            setLoading(true);
            const { data: { user } } = await supabase.auth.getUser();
            const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
            
            const { data } = await supabase
                .from('form_definitions')
                .select('*')
                .eq('organization_id', prof.organization_id)
                .eq('form_type', type);

            const labelMap = {};
            data?.forEach(d => { labelMap[d.field_number] = d.label_text; });
            setLabels(labelMap);
            setLoading(false);
        }
        loadLabels();
    }, [type]);

    const handleSaveAll = async () => {
        setSaving(true);
        const { data: { user } } = await supabase.auth.getUser();
        const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();

        const updates = Object.entries(labels).map(([num, text]) => ({
            organization_id: prof.organization_id,
            form_type: type,
            field_number: parseInt(num),
            label_text: text
        }));

        const { error } = await supabase.from('form_definitions').upsert(updates, { 
            onConflict: 'organization_id, form_type, field_number' 
        });

        if (!error) alert(`✅ Protocolo de ${type.toUpperCase()} actualizado.`);
        setSaving(false);
    };

    if (loading) return <div className="p-20 text-center font-black animate-pulse uppercase">Cargando Diccionario Técnico...</div>;

    return (
        <div className="max-w-4xl mx-auto p-10 space-y-8 text-left animate-in fade-in duration-500">
            <header className="flex justify-between items-end border-b pb-6">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Editor de Protocolos</h2>
                    <p className="text-slate-500 text-sm">Configuración de slots para cumplimiento RAC 100.</p>
                </div>
                <button 
                    onClick={handleSaveAll}
                    disabled={saving}
                    className="bg-orange-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-slate-900 transition-all active:scale-95"
                >
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
            </header>

            <div className="flex bg-slate-100 p-1 rounded-2xl w-fit">
                {['health', 'briefing', 'preflight'].map(t => (
                    <button key={t} onClick={() => setType(t)} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${type === t ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>{t}</button>
                ))}
            </div>

            <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b flex justify-between px-10">
                    <span className="text-[10px] font-black text-slate-400 uppercase">Capacidad Máxima: {LIMITS[type]} Puntos</span>
                    <span className="text-[10px] font-black text-orange-600 uppercase">Estado: {type.toUpperCase()}</span>
                </div>
                <div className="p-10 grid grid-cols-1 gap-4 max-h-[550px] overflow-y-auto custom-scrollbar">
                    {Array.from({ length: LIMITS[type] }).map((_, i) => (
                        <div key={i} className="flex items-center gap-6 group">
                            <span className="text-[11px] font-black text-slate-300 w-8 group-hover:text-orange-600 transition-colors">{(i + 1).toString().padStart(2, '0')}</span>
                            <input 
                                value={labels[i + 1] || ''}
                                placeholder="Escriba el requerimiento operativo..."
                                className="flex-1 p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm focus:bg-orange-50 transition-all outline-none"
                                onChange={(e) => setLabels({...labels, [i + 1]: e.target.value})}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}