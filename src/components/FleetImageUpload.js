'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';

const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const BUCKET = 'fleet-images';

export default function FleetImageUpload({ onUploadSuccess }) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_MIME.includes(file.type) && !/\.(heic|heif)$/i.test(file.name)) {
      toast.error('Solo se permiten imágenes JPG, PNG, WebP o HEIC.');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_SIZE) {
      toast.error('La imagen supera el límite de 5 MB.');
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) throw new Error('Sesión expirada.');

      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', auth.user.id)
        .single();
      if (!profile?.organization_id) throw new Error('Organización no encontrada.');

      const ext = file.name.split('.').pop().toLowerCase();
      const slug = Math.random().toString(36).slice(2, 10);
      const path = `${profile.organization_id}/drones/${Date.now()}_${slug}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { cacheControl: '31536000', upsert: false, contentType: file.type });
      if (uploadErr) throw uploadErr;

      // URL pública directa — sin signed URL, sin roundtrip servidor
      const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path);
      onUploadSuccess(publicUrl);
      toast.success('Imagen actualizada.');
    } catch (err) {
      toast.error('Error al subir imagen: ' + err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-xs font-black uppercase text-slate-400">Foto de la aeronave</label>
      <div className={`relative border-2 border-dashed rounded-2xl p-4 transition-all cursor-pointer
        ${uploading ? 'bg-slate-100 border-slate-300' : 'hover:bg-orange-50 border-slate-200'}`}>
        <input
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.heic,.heif"
          onChange={handleUpload}
          disabled={uploading}
          className="absolute inset-0 opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
        />
        <div className="flex items-center justify-center gap-2">
          <span className={`material-symbols-outlined text-xl ${uploading ? 'animate-spin text-orange-500' : 'text-slate-400'}`}>
            {uploading ? 'sync' : 'add_photo_alternate'}
          </span>
          <p className="text-xs font-bold text-slate-500 uppercase">
            {uploading ? 'Subiendo imagen...' : 'Seleccionar foto (JPG · PNG · WebP)'}
          </p>
        </div>
      </div>
    </div>
  );
}
