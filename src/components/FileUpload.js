'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function FileUpload({ bucket, path, onUploadSuccess, label }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (event) => {
    try {
      setUploading(true);
      const file = event.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${path}/${fileName}`;

      // 1. Subir a Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      onUploadSuccess(publicUrl);
      alert("Archivo cargado exitosamente");
    } catch (error) {
      alert("Error cargando archivo: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-black uppercase text-slate-400 ml-1">{label}</label>
      <div className="relative group cursor-pointer">
        <input 
          type="file" 
          onChange={handleUpload}
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <div className={`p-4 border-2 border-dashed rounded-2xl flex items-center justify-center gap-3 transition-all ${
          uploading ? 'bg-slate-100 border-slate-200' : 'bg-slate-50 border-slate-200 group-hover:border-[#ec5b13] group-hover:bg-orange-50'
        }`}>
          <span className={`material-symbols-outlined ${uploading ? 'animate-spin' : 'text-slate-400 group-hover:text-[#ec5b13]'}`}>
            {uploading ? 'sync' : 'cloud_upload'}
          </span>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-tighter">
            {uploading ? 'Procesando...' : 'Cargar Documento PDF'}
          </span>
        </div>
      </div>
    </div>
  );
}