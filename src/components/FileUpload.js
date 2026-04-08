'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function FileUpload({ path, onUploadSuccess, label }) {
  const [uploading, setUploading] = useState(false);
  const BUCKET = 'documents'; // USAMOS EL BUCKET QUE YA EXISTE

  const handleUpload = async (event) => {
    try {
      const file = event.target.files[0];
      if (!file) return;
      setUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${path}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(filePath);

      onUploadSuccess(publicUrl);
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase text-slate-400">{label}</label>
      <div className="relative border-2 border-dashed rounded-2xl p-4 hover:bg-orange-50 transition-all cursor-pointer">
        <input type="file" accept="image/*" onChange={handleUpload} disabled={uploading} className="absolute inset-0 opacity-0 cursor-pointer" />
        <p className="text-center text-[10px] font-bold text-slate-500">
          {uploading ? 'SUBIENDO...' : 'CLIC PARA CARGAR IMAGEN'}
        </p>
      </div>
    </div>
  );
}