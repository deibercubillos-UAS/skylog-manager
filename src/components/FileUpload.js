'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function FileUpload({ path, onUploadSuccess, label }) {
  const [uploading, setUploading] = useState(false);
  const BUCKET = 'documents';

  const handleUpload = async (event) => {
    try {
      const file = event.target.files[0];
      if (!file) return;

      setUploading(true);

      // 1. Obtener la sesión activa
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error("Sesión expirada. Por favor reingrese.");

      // 2. Obtener el ID de organización (Vital para el aislamiento RLS del Storage)
      const { data: profile, error: profError } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', auth.user.id)
        .single();
      
      if (profError || !profile?.organization_id) {
        throw new Error("No se pudo verificar la identidad de su organización.");
      }

      const orgId = profile.organization_id;
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      // ESTRUCTURA: ID_ORGANIZACION / RUTA / NOMBRE
      // Esto cumple con la política 'Folder_Isolation' que activamos en Supabase
      const filePath = `${orgId}/${path}/${fileName}`;

      // 3. Ejecutar subida
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 4. Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(filePath);

      onUploadSuccess(publicUrl);

    } catch (error) {
      console.error("Error en FileUpload:", error.message);
      alert("Error crítico de carga: " + error.message);
    } finally {
      setUploading(false);
      // Limpiar el input para permitir subir el mismo archivo si falla
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-black uppercase text-slate-400">{label}</label>
      <div className={`relative border-2 border-dashed rounded-2xl p-4 transition-all cursor-pointer ${uploading ? 'bg-slate-100 border-slate-300' : 'hover:bg-orange-50 border-slate-200'}`}>
        <input 
            type="file" 
            accept=".pdf, .jpg, .jpeg, .png" 
            onChange={handleUpload} 
            disabled={uploading} 
            className="absolute inset-0 opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed" 
        />
        <div className="flex items-center justify-center gap-2">
            <span className={`material-symbols-outlined text-xl ${uploading ? 'animate-spin text-orange-500' : 'text-slate-400'}`}>
                {uploading ? 'sync' : 'cloud_upload'}
            </span>
            <p className="text-xs font-bold text-slate-500 uppercase">
                {uploading ? 'Procesando Archivo...' : 'Seleccionar Documento (PDF/JPG)'}
            </p>
        </div>
      </div>
    </div>
  );
}