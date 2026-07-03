'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024; // 4 MB (límite de subida proxy por Vercel)

export default function FileUpload({ path, onUploadSuccess, label, variant = 'default' }) {
  const [uploading, setUploading] = useState(false);
  const BUCKET = 'documents';

  const handleUpload = async (event) => {
    try {
      const file = event.target.files[0];
      if (!file) return;

      // Validación de tipo MIME (más fiable que solo la extensión)
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        toast.error('Solo se permiten archivos PDF, JPG y PNG.');
        event.target.value = '';
        return;
      }

      // Validación de tamaño (máx 4 MB)
      if (file.size > MAX_FILE_SIZE_BYTES) {
        toast.error('El archivo supera el límite de 4 MB.');
        event.target.value = '';
        return;
      }

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

      // 3. Subida PROXY por el servidor (mismo origen → sin CORS ni URL prefirmada)
      const fd = new FormData();
      fd.append('bucket', BUCKET);
      fd.append('key', filePath);
      fd.append('file', file);
      const upRes = await fetch('/api/storage/upload', { method: 'POST', body: fd });
      if (!upRes.ok) {
        const e = await upRes.json().catch(() => ({}));
        throw new Error(e.error || 'Error al subir el archivo.');
      }

      // 4. Devolver el PATH del objeto (no URL pública). El bucket `documents`
      //    es privado: el acceso se hace vía /api/documents/open (signed URL).
      onUploadSuccess(filePath);

    } catch (error) {
      console.error("Error en FileUpload:", error.message);
      toast.error("Error crítico de carga: " + error.message);
    } finally {
      setUploading(false);
      // Limpiar el input para permitir subir el mismo archivo si falla
      event.target.value = '';
    }
  };

  if (variant === 'avatar') {
    return (
      <label
        title={label || 'Cambiar foto'}
        className={`absolute -bottom-1 -right-1 size-7 rounded-full bg-white border-2 border-[#1A202C] flex items-center justify-center transition-colors ${uploading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:bg-orange-50'}`}
      >
        <input type="file" accept=".pdf, .jpg, .jpeg, .png" onChange={handleUpload} disabled={uploading} className="hidden" />
        <span className={`material-symbols-outlined text-[13px] text-orange-600 ${uploading ? 'animate-spin' : ''}`}>
          {uploading ? 'sync' : 'photo_camera'}
        </span>
      </label>
    );
  }

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