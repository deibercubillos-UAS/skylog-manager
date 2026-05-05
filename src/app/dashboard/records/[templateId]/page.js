'use client';
import { useEffect, useState, use } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';

export default function DynamicFormPage({ params }) {
    const resolvedParams = use(params);
    const templateId = resolvedParams.templateId;
    const [template, setTemplate] = useState(null);
    const [loading, setLoading] = useState(true);
    const { register, handleSubmit } = useForm();

    useEffect(() => {
        async function fetchTemplate() {
            const { data } = await supabase.from('form_templates').select('*').eq('id', templateId).single();
            setTemplate(data);
            setLoading(false);
        }
        fetchTemplate();
    }, [templateId]);

    const onSubmit = async (formData) => {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from('form_records').insert([
            { owner_id: user.id, template_id: templateId, data: formData }
        ]);
        if (!error) alert("Registro guardado exitosamente");
    };

    if (loading) return <div className="p-20 text-center animate-pulse font-black uppercase">Cargando Formato...</div>;

    return (
        <div className="max-w-2xl mx-auto bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm text-left">
            <h2 className="text-2xl font-black uppercase mb-2">{template.name}</h2>
            <p className="text-xs font-bold text-slate-400 uppercase mb-8">{template.form_code} | v{template.version}</p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {template.schema?.map((field) => (
                    <div key={field.name} className="space-y-1 text-left">
                        <label className="text-xs font-black uppercase text-slate-400 ml-1">{field.label}</label>
                        <input 
                            {...register(field.name)}
                            type={field.type}
                            className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm"
                        />
                    </div>
                ))}
                <button type="submit" className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-xl uppercase text-xs">Guardar en Bitácora</button>
            </form>
        </div>
    );
}
