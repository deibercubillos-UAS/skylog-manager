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
  const [category, setCategory] = useState(manual?.category || 'MO');
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
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set('version', version);
      form.set('effectiveDate', effectiveDate);
      form.set('comments', comments);
      form.set('file', file);
      let res;
      if (isNewVersion) {
        res = await fetch(`/api/manuales/${manual.id}/versions`, { method: 'POST', body: form });
      } else {
        form.set('organizationId', organizationId);
        form.set('title', title);
        form.set('category', category);
        res = await fetch('/api/manuales', { method: 'POST', body: form });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error guardando el manual');
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const activeCat = CATEGORIES.find((c) => c.value === category) || CATEGORIES[0];

  return (
    <Panel open={open} onClose={onClose} title={isNewVersion ? `Nueva versión — ${manual.title}` : 'Nuevo manual'}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {!isNewVersion && (
          <>
            <IconField icon="title" label="Título" placeholder="Ej. Manual de Operaciones" value={title} onChange={(e) => setTitle(e.target.value)} required />
            <div>
              <span className="block text-xs font-medium text-navy-400 mb-2">Categoría</span>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => {
                  const selected = c.value === category;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setCategory(c.value)}
                      className={`flex items-center gap-1.5 text-xs font-semibold rounded-full pl-2.5 pr-3 py-1.5 border transition-colors ${
                        selected ? `${c.tile} border-transparent shadow-sm` : 'bg-white border-navy-200 text-navy-500 hover:border-primary-300'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">{c.icon}</span>
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
