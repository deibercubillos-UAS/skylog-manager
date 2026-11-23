'use client';

// Skylog V2.0 — Manuales: panel para crear un manual nuevo (primera versión)
// o publicar una versión nueva sobre uno existente (`manual` presente).
// Rediseño (pedido del usuario: "se ve plana y poco UX/UI") — categoría como
// chips de color en vez de `<select>` plano, campos con ícono guía (mismo
// patrón de Mi Perfil) y una zona de carga de archivo real (dropzone) en
// vez del input nativo desnudo.
import { useCallback, useState } from 'react';
import { Button } from '@skylog/ui';
import { Panel } from '@skylog/ui';
import IconField from '../perfil/_IconField';
import { CATEGORIES } from './_categoryMeta';

function formatBytes(bytes) {
  if (!bytes) return '';
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

const ACCEPT = 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB — mismo límite que valida el servidor

function FileDropzone({ file, onChange }) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragOver(false);
      const f = e.dataTransfer.files?.[0];
      if (f) onChange(f);
    },
    [onChange]
  );

  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center gap-1.5 text-center rounded-2xl border-2 border-dashed px-4 py-7 cursor-pointer transition-colors ${
        dragOver ? 'border-primary bg-primary-50' : file ? 'border-emerald-300 bg-emerald-50' : 'border-navy-200 bg-navy-50 hover:border-primary-300 hover:bg-primary-50/40'
      }`}
    >
      <span className={`material-symbols-outlined text-2xl ${file ? 'text-emerald-600' : 'text-navy-300'}`}>{file ? 'task' : 'upload_file'}</span>
      {file ? (
        <>
          <p className="text-sm font-semibold text-navy truncate max-w-full">{file.name}</p>
          <p className="text-xs text-navy-400">{formatBytes(file.size)} · toca para cambiar</p>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold text-navy">Arrastra el archivo aquí o toca para elegirlo</p>
          <p className="text-xs text-navy-400">PDF, Word o Excel · máx. 25 MB</p>
        </>
      )}
      <input type="file" accept={ACCEPT} onChange={(e) => onChange(e.target.files?.[0] || null)} className="hidden" />
    </label>
  );
}

export default function ManualFormPanel({ open, onClose, organizationId, manual, onSaved }) {
  const isNewVersion = !!manual;
  const [title, setTitle] = useState(manual?.title || '');
  // Un manual puede cumplir varias categorías; la primera es la principal.
  const [categories, setCategories] = useState(manual?.categories?.length ? manual.categories : manual?.category ? [manual.category] : ['MO']);
  const [version, setVersion] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [comments, setComments] = useState('');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) {
      setError('Selecciona un archivo');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('El archivo supera el límite de 25 MB');
      return;
    }
    if (!isNewVersion && !categories.length) {
      setError('Elige al menos una categoría');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // El archivo se sube DIRECTO a R2 con una URL prefirmada: así no pasa por
      // la función serverless (cuyo cuerpo está topado en ~4.5 MB en Vercel) y
      // los manuales grandes sí se pueden cargar.
      // 1) Pedir la URL de subida.
      const urlRes = await fetch('/api/manuales/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: isNewVersion ? undefined : organizationId,
          manualId: isNewVersion ? manual.id : undefined,
          version,
          fileName: file.name,
          contentType: file.type,
        }),
      });
      const urlData = await urlRes.json().catch(() => ({}));
      if (!urlRes.ok) throw new Error(urlData.error || 'No se pudo preparar la subida');

      // 2) Subir el archivo a R2 (el Content-Type debe coincidir con el firmado).
      const putRes = await fetch(urlData.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error('No se pudo subir el archivo al almacenamiento. Revisa tu conexión e inténtalo de nuevo.');

      // 3) Crear el manual / publicar la versión con la clave del archivo subido.
      const payload = { version, effectiveDate, comments, key: urlData.key, contentType: file.type };
      let res;
      if (isNewVersion) {
        res = await fetch(`/api/manuales/${manual.id}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/manuales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, organizationId, title, categories }),
        });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Error guardando el manual');
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const activeCat = CATEGORIES.find((c) => c.value === (manual?.categories?.[0] || manual?.category)) || CATEGORIES[0];
  const toggleCategory = (value) => setCategories((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));

  return (
    <Panel open={open} onClose={onClose} eyebrow="Manuales" icon="menu_book" title={isNewVersion ? `Nueva versión — ${manual.title}` : 'Nuevo manual'}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {!isNewVersion && (
          <>
            <IconField icon="title" label="Título" placeholder="Ej. Manual de Operaciones" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <div>
              <span className="block text-xs font-medium text-navy-400 mb-1">Categorías</span>
              <p className="text-[11px] text-navy-400 mb-2">Marca todas las que cumple este documento (puede ser más de una — p. ej. operacional y SMS).</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => {
                  const selected = categories.includes(c.value);
                  return (
                    <button
                      key={c.value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleCategory(c.value)}
                      className={`flex items-center gap-1.5 text-xs font-semibold rounded-full pl-2.5 pr-3 py-1.5 border transition-colors ${
                        selected ? `${c.tile} border-transparent shadow-sm` : 'bg-white border-navy-200 text-navy-500 hover:border-primary-300'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">{selected ? 'check' : c.icon}</span>
                      {c.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {isNewVersion && (
          <div className={`flex items-center gap-2 text-xs font-semibold rounded-xl px-3 py-2 bg-gradient-to-br ${activeCat.wash} border border-navy-100`}>
            <span className={`flex items-center justify-center w-7 h-7 rounded-lg shrink-0 ${activeCat.tile}`}>
              <span className="material-symbols-outlined text-[16px]">{activeCat.icon}</span>
            </span>
            <span className="text-navy-500">
              Versión vigente actual: <span className="text-navy font-bold">{manual.current_version || '—'}</span>
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
          <IconField icon="tag" label="Versión" placeholder="Ej. 1.0" value={version} onChange={(e) => setVersion(e.target.value)} required />
          <IconField icon="event" label="Fecha de vigencia" type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} required />
        </div>
        <IconField icon="edit_note" label="Comentarios (opcional)" placeholder="Qué cambió en esta versión" value={comments} onChange={(e) => setComments(e.target.value)} />

        <div>
          <span className="block text-xs font-medium text-navy-400 mb-2">Archivo</span>
          <FileDropzone file={file} onChange={setFile} />
        </div>

        {error && (
          <p className="flex items-center gap-1.5 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            <span className="material-symbols-outlined text-[16px]">error</span>
            {error}
          </p>
        )}

        <Button type="submit" disabled={busy} className="w-full justify-center">
          {busy ? 'Guardando…' : isNewVersion ? 'Publicar versión' : 'Crear manual'}
        </Button>
      </form>
    </Panel>
  );
}
