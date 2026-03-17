'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function FileUpload({ bucket, path, onUploadSuccess, label }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (event) => {
    try {
      const file = event.target.files[0];
      if (!file) return;

      // --- VALIDACIÓN DE TAMAÑO (MAX 1MB) ---
      const MAX_SIZE = 1 * 1024 * 1024; // 1MB en bytes
      if (file.size > MAX_SIZE) {
        alert("⚠️ ARCHIVO DEMASIADO GRANDE: El límite por seguridad es de 1 MB. Por favor, comprime el PDF o usa una imagen más pequeña.");
        event.target.value = ""; // Limpiar el input
        return;
      }

      setUploading(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${path}/${fileName}`;

      // Subida a Supabase
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Obtener URL pública
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      onUploadSuccess(publicUrl);
      console.log("Archivo cargado en:", publicUrl);

    } catch (error) {
      alert("Error cargando archivo: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2 text-left">
      <label className="block text-[10px] font-black uppercase text-slate-400 ml-1">{label}</label>
      <div className="relative group cursor-pointer">
        <input 
          type="file" 
          accept=".pdf,.jpg,.jpeg,.png"
          onChange={handleUpload}
          disabled={uploading}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
        />
        <div className={`p-4 border-2 border-dashed rounded-2xl flex items-center justify-center gap-3 transition-all ${
          uploading 
          ? 'bg-slate-100 border-slate-200' 
          : 'bg-slate-50 border-slate-200 group-hover:border-[#ec5b13] group-hover:bg-orange-50'
        }`}>
          <span className={`material-symbols-outlined text-xl ${uploading ? 'animate-spin text-[#ec5b13]' : 'text-slate-400 group-hover:text-[#ec5b13]'}`}>
            {uploading ? 'sync' : 'cloud_upload'}
          </span>
          <div className="flex flex-col items-start">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tighter">
              {uploading ? 'Subiendo documento...' : 'Cargar Archivo'}
            </span>
            <span className="text-[9px] text-slate-400 font-medium">Máximo 1 MB (PDF/JPG)</span>
          </div>
        </div>
      </div>
    </div>
  );
}