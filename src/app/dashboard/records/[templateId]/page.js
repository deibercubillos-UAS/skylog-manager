'use client';
import { useEffect, useState, use } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';
import { getOrgContext } from '@/lib/apiAuth';

export default function DynamicFormPage({ params }) {
    const resolvedParams = use(params);
    const templateId = resolvedParams.templateId;
    const [template, setTemplate] = useState(null);
    const [orgId, setOrgId] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { register, handleSubmit, reset } = useForm();

    useEffect(() => {
        async function fetchTemplate() {
            try {
                // Obtener usuario y org activa
                const ctx = await getOrgContext(supabase);
                const user = ctx.user;
                if (!user) { setError('No autenticado'); setLoading(false); return; }

                const currentOrgId = ctx.orgId;
                if (!currentOrgId) { setError('Sin organización asignada'); setLoading(false); return; }

                setOrgId(currentOrgId);

                // Filtrar por owner_id del usuario Y por organización para evitar IDOR
                const { data } = await supabase
                    .from('form_templates')
                    .select('*')
                    .eq('id', templateId)
                    .eq('owner_id', user.id)
                    .maybeSingle();

                if (!data) { setError('Formato no encontrado'); setLoading(false); return; }

                setTemplate(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchTemplate();
    }, [templateId]);

    const onSubmit = async (formData) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user || !orgId) { alert('Sesión expirada. Recarga la página.'); return; }

            const { error: insertError } = await supabase.from('form_records').insert([{
                owner_id:        user.id,
                organization_id: orgId,
                template_id:     templateId,
                data:            formData,
            }]);

            if (insertError) throw insertError;
            alert('Registro guardado exitosamente');
            reset();
        } catch (err) {
            alert(`Error al guardar: ${err.message}`);
        }
    };

    if (loading) return <div className="p-20 text-center animate-pulse font-black uppercase">Cargando Formato...</div>;

    if (error || !template) return (
        <div className="p-20 text-center font-black uppercase text-red-500">
            {error || 'Formato no disponible'}
        </div>
    );

    return (
        <div className="max-w-2xl mx-auto bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm text-left">
            <h2 className="text-2xl font-black uppercase mb-2">{template.name}</h2>
            <p className="text-xs font-bold text-slate-400 uppercase mb-8">{template.form_code} | v{template.version}</p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {(template.schema || []).map((field) => (
                    <div key={field.label} className="space-y-1 text-left">
                        <label className="text-xs font-black uppercase text-slate-400 ml-1">{field.label}</label>
                        <input
                            {...register(field.label)}
                            type={field.type?.startsWith('auto_') ? 'text' : (field.type || 'text')}
                            className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-sm"
                        />
                    </div>
                ))}
                <button type="submit" className="w-full py-5 bg-[#ec5b13] text-white font-black rounded-2xl shadow-xl uppercase text-xs">Guardar en Bitácora</button>
            </form>
        </div>
    );
}
