'use client';

// Skylog V2.0 — Manuales: reclasificar un manual ya cargado (título y categorías) sin subir una versión nueva.
// Un manual puede cumplir varias categorías a la vez; usa el PATCH /api/manuales/[id] (gestores). Ver 35-frontend.md.
import { useEffect, useState } from 'react';
import { Button, Panel } from '@skylog/ui';
import IconField from '../perfil/_IconField';
import { CATEGORIES } from './_categoryMeta';

export default function ReclassifyPanel({ open, onClose, manual, onSaved }) {
  const [title, setTitle] = useState('');
  const [categories, setCategories] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (manual) {
      setTitle(manual.title || '');
      setCategories(manual.categories?.length ? manual.categories : manual.category ? [manual.category] : []);
      setError(null);
    }
  }, [manual]);

  const toggle = (value) => setCategories((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return setError('El título es obligatorio');
    if (!categories.length) return setError('Elige al menos una categoría');
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/manuales/${manual.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), categories }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar');
      onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel open={open} onClose={onClose} eyebrow="Manuales" icon="sell" title={manual ? `Reclasificar — ${manual.title}` : 'Reclasificar'}>
      <form onSubmit={handleSubmit} className="space-y-5">
        <IconField icon="title" label="Título" value={title} onChange={(e) => setTitle(e.target.value)} required />
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
                  onClick={() => toggle(c.value)}
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
        {error && (
          <p className="flex items-center gap-1.5 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
            <span className="material-symbols-outlined text-[16px]">error</span>
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy} className="w-full justify-center">
          {busy ? 'Guardando…' : 'Guardar cambios'}
        </Button>
      </form>
    </Panel>
  );
}
