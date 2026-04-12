'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function FormSettings() {
    const [type, setType] = useState('briefing'); // health, briefing, preflight
    const [labels, setLabels] = useState({});
    const [loading, setLoading] = useState(false);

    const LIMITS = { health: 30, briefing: 50, preflight: 70 };

    const saveLabel = async (num, text) => {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: prof } = await supabase.from('profiles').select('organization_id').eq('id', user.id).single();
        
        await supabase.from('form_definitions').upsert({
            organization_id: prof.organization_id,
            form_type: type,
            field_number: num,
            label_text: text
        }, { onConflict: 'organization_id, form_type, field_number' });
    };

    return (
        <div className="max-w-4xl mx-auto p-10 space-y-8 text-left">
            <header>
                <h2 className="text-3xl font-black uppercase tracking-tighter">Editor de Protocolos</h2>
                <p className="text-slate-500">Personaliza los puntos de chequeo de tu organización.</p>
            </header>

            <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
                {['health', 'briefing', 'preflight'].map(t => (
                    <button key={t} onClick={() => setType(t)} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase ${type === t ? 'bg-orange-600 text-white' : 'text-slate-500'}`}>{t}</button>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-3 bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm max-h-[600px] overflow-y-auto custom-scrollbar">
                {Array.from({ length: LIMITS[type] }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                        <span className="text-[10px] font-black text-slate-300 w-8">{i + 1}.</span>
                        <input 
                            placeholder="Escriba el requerimiento aquí..."
                            className="flex-1 p-3 bg-slate-50 rounded-xl border-none text-sm font-medium"
                            onBlur={(e) => saveLabel(i + 1, e.target.value)}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}