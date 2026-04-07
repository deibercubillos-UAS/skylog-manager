// Este sería un componente/página reutilizable.
// Por ejemplo, en: src/app/dashboard/records/[templateId]/page.js
'use client';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/lib/supabase';

function DynamicFormRenderer({ templateId }) {
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const { register, handleSubmit } = useForm();

  useEffect(() => {
    const fetchTemplate = async () => {
      // Aquí harías un fetch a `/api/form-templates/[id]` para obtener la plantilla
      const { data } = await supabase.from('form_templates').select('*').eq('id', templateId).single();
      setTemplate(data);
      setLoading(false);
    };
    fetchTemplate();
  }, [templateId]);

  const onSubmit = async (formData) => {
    // Aquí enviarías los datos a una API `/api/form-records`
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('form_records').insert([
      { owner_id: user.id, template_id: template.id, data: formData }
    ]);
    alert('Registro guardado!');
  };

  if (loading) return <p>Cargando formulario...</p>;
  if (!template) return <p>Plantilla no encontrada.</p>;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <h2 className="text-xl font-bold">{template.name}</h2>
      {template.schema.map((field) => (
        <div key={field.name}>
          <label className="text-sm font-bold">{field.label}</label>
          <input 
            {...register(field.name, { required: field.required })}
            type={field.type}
            className="w-full p-2 border rounded"
          />
        </div>
      ))}
      <button type="submit" className="bg-blue-500 text-white p-2 rounded">Guardar Registro</button>
    </form>
  );
}