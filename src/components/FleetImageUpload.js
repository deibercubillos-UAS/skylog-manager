'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/lib/toast';
import { getOrgContext } from '@/lib/apiAuth';


const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const MAX_SIZE = 4 * 1024 * 1024; // 4 MB (límite de subida proxy por Vercel)
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
      toast.error('La imagen supera el límite de 4 MB.');
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const ctx = await getOrgContext(supabase);
      if (!ctx.user) throw new Error('Sesión expirada.');
      if (!ctx.orgId) throw new Error('Organización no encontrada.');

      const ext = file.name.split('.').pop().toLowerCase();
      const slug = Math.random().toString(36).slice(2, 10);
      const path = `${ctx.orgId}/drones/${Date.now()}_${slug}.${ext}`;

      // Subida PROXY por el servidor (mismo origen → sin CORS ni URL prefirmada)
      const fd = new FormData();
      fd.append('bucket', BUCKET);
      fd.append('key', path);
      fd.append('file', file);
      const upRes = await fetch('/api/storage/upload', { method: 'POST', body: fd });
      if (!upRes.ok) {
        const e = await upRes.json().catch(() => ({}));
        throw new Error(e.error || 'Error al subir la imagen.');
      }

      const { publicUrl } = await upRes.json();
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
