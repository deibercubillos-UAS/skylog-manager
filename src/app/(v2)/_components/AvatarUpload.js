'use client';

// Skylog V2.0 — foto de perfil: se ve y se cambia desde Mi Perfil. La foto se sirve por URL firmada.
import { useRef, useState } from 'react';

export default function AvatarUpload({ personId, hasAvatar, initials, onChanged }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [version, setVersion] = useState(0);

  async function upload(file) {
    if (!file) return;
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/perfil/avatar', { method: 'POST', body: fd });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (input.current) input.current.value = '';
    if (!res.ok) return setError(data.error || 'No se pudo subir la foto');
    setVersion((v) => v + 1);
    onChanged?.();
  }

  async function remove() {
    setBusy(true);
    const res = await fetch('/api/perfil/avatar', { method: 'DELETE' });
    setBusy(false);
    if (res.ok) {
      setVersion((v) => v + 1);
      onChanged?.();
    }
  }

  return (
    <div className="flex items-center gap-4 mb-3">
      {hasAvatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/api/perfil/avatar?personId=${personId}&v=${version}`} alt="Foto de perfil" className="size-16 rounded-full object-cover bg-navy-50" />
      ) : (
        <span className="size-16 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-lg font-black text-white">{initials}</span>
      )}
      <div className="text-xs space-y-1">
        <button type="button" disabled={busy} onClick={() => input.current?.click()} className="font-semibold text-primary-700 hover:underline min-h-[36px] disabled:opacity-40">
          {busy ? 'Subiendo…' : hasAvatar ? 'Cambiar foto' : 'Subir foto'}
        </button>
        {hasAvatar && (
          <button type="button" disabled={busy} onClick={remove} className="ml-3 font-semibold text-red-600 hover:underline min-h-[36px] disabled:opacity-40">Quitar</button>
        )}
        <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
        {error && <p className="text-red-600">{error}</p>}
      </div>
    </div>
  );
}
