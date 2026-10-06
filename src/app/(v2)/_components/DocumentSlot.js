'use client';

// Skylog V2.0 — un documento adjunto (PDF/imagen ≤ 4 MB) a una fila: ver, subir/reemplazar y quitar. Habla con las
// rutas hechas con `makeRowDocumentRoute` (lib/v2/rowDocument.js). Nunca recibe la ruta del archivo, solo `has`.
import { useRef, useState } from 'react';

export default function DocumentSlot({ label, endpoint, uploadEndpoint, extraFields, has, canUpload, canView = true, onChanged }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function upload(file) {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) return setError('El archivo supera el límite de 4 MB');
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.append('file', file);
    for (const [k, v] of Object.entries(extraFields || {})) if (v != null) fd.append(k, v);
    const res = await fetch(uploadEndpoint || endpoint, { method: 'POST', body: fd });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (input.current) input.current.value = '';
    if (!res.ok) return setError(data.error || 'No se pudo subir');
    onChanged?.();
  }

  async function remove() {
    if (!confirm(`¿Quitar «${label}»?`)) return;
    setBusy(true);
    setError(null);
    const res = await fetch(endpoint, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || 'No se pudo quitar');
    onChanged?.();
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
      <span className="font-semibold text-navy-500">{label}:</span>
      {has ? (
        <>
          {canView && <a href={endpoint} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary-700 hover:underline min-h-[36px] inline-flex items-center">Ver</a>}
          {!canView && <span className="text-emerald-700 font-semibold">Cargado</span>}
        </>
      ) : (
        <span className="text-amber-700">Sin cargar</span>
      )}
      {canUpload && (
        <>
          <button type="button" disabled={busy} onClick={() => input.current?.click()} className="font-semibold text-navy-500 hover:text-navy min-h-[36px] disabled:opacity-40">
            {busy ? 'Subiendo…' : has ? 'Reemplazar' : 'Subir'}
          </button>
          {has && <button type="button" disabled={busy} onClick={remove} className="font-semibold text-red-600 hover:underline min-h-[36px] disabled:opacity-40">Quitar</button>}
          <input ref={input} type="file" accept=".pdf,image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
        </>
      )}
      {error && <span className="text-red-600 w-full">{error}</span>}
    </div>
  );
}
