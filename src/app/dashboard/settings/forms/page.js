// FILE: src/app/dashboard/settings/forms/page.js
'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { z } from 'zod';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Esquema de validación para el constructor de formularios
const fieldSchema = z.object({
  name: z.string().min(1, 'El nombre técnico es requerido').regex(/^[a-z0-9_]+$/, 'Solo minúsculas, números y guion bajo'),
  label: z.string().min(1, 'La etiqueta es requerida'),
  type: z.enum(['text', 'number', 'date', 'textarea', 'select']),
  options: z.string().optional(), // Para tipo 'select', separado por comas
});

const templateSchema = z.object({
  name: z.string().min(3, 'El nombre del formato es requerido'),
  form_code: z.string().optional(),
  version: z.string().min(1, 'La versión es requerida'),
  schema: z.array(fieldSchema).min(1, 'El formulario debe tener al menos un campo'),
});

export default function FormBuilderPage() {
  const [loading, setLoading] = useState(false);
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: '',
      form_code: '',
      version: '1.0',
      schema: [{ name: 'nombre_piloto', label: 'Nombre del Piloto', type: 'text' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'schema',
  });

  const onSubmit = async (formData) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('/api/form-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Error al guardar la plantilla');

      alert('✅ Plantilla de formulario guardada con éxito.');
      reset(); // Limpia el formulario
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
        <header>
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Constructor de Formatos</h2>
            <p className="text-slate-500 text-sm mt-1 font-medium">Diseña tus propios formularios de recolección de datos.</p>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <input {...register('name')} placeholder="Nombre del Formato (ej. Bitácora de Baterías)" className="w-full bg-slate-50 p-3 rounded-lg border text-sm" />
              <input {...register('form_code')} placeholder="Código (ej. F-MNT-002)" className="w-full bg-slate-50 p-3 rounded-lg border text-sm" />
              <input {...register('version')} placeholder="Versión" className="w-full bg-slate-50 p-3 rounded-lg border text-sm" />
            </div>
             {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}

            <div className="space-y-4 border-t pt-4">
                <h3 className="font-bold text-slate-600">Campos del Formulario</h3>
                {fields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-10 gap-2 items-center p-2 bg-slate-50 rounded">
                        <input {...register(`schema.${index}.label`)} placeholder="Etiqueta visible" className="col-span-3 p-2 rounded border text-xs" />
                        <input {...register(`schema.${index}.name`)} placeholder="nombre_tecnico" className="col-span-3 p-2 rounded border text-xs font-mono" />
                        <select {...register(`schema.${index}.type`)} className="col-span-3 p-2 rounded border text-xs bg-white">
                            <option value="text">Texto Corto</option>
                            <option value="number">Número</option>
                            <option value="date">Fecha</option>
                            <option value="textarea">Texto Largo</option>
                            <option value="select">Selección</option>
                        </select>
                        <button type="button" onClick={() => remove(index)} className="col-span-1 text-red-400">
                            <span className="material-symbols-outlined">delete</span>
                        </button>
                    </div>
                ))}
                {errors.schema && <p className="text-red-500 text-xs">{errors.schema.message}</p>}

                <button type="button" onClick={() => append({ name: '', label: '', type: 'text' })} className="text-sm font-bold text-blue-500">+ Añadir Campo</button>
            </div>

            <button type="submit" disabled={loading} className="w-full py-4 bg-[#ec5b13] text-white font-black rounded-lg uppercase text-xs">
                {loading ? 'Guardando...' : 'Guardar Plantilla de Formulario'}
            </button>
        </form>
    </div>
  );
}