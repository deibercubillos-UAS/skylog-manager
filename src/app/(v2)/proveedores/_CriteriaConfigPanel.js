'use client';

// Skylog V2.0 — Proveedores: catálogo de criterios de auditoría, propio de
// cada organización (sin catálogo global — no hay una taxonomía oficial de
// proveedores en RAC 100 que forzar, mismo criterio que v1). Tarjeta en
// línea (no modal — V2 todavía no adopta el patrón de panel deslizable de
// v1 para módulos como este).
import { useState } from 'react';
import { Field, Button } from '@skylog/ui';

export default function CriteriaConfigPanel({ organizationId, criteria, onClose, onChanged }) {
  const [form, setForm] = useState({ criterion: '', category: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/proveedores/criteria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, criterion: form.criterion, category: form.category, orderIndex: criteria.length }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error creando el criterio');
      setForm({ criterion: '', category: '' });
      onChanged();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id) {
    const res = await fetch(`/api/proveedores/criteria?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    onChanged();
  }

  return (
    <div className="bg-white rounded-2xl border border-navy-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-navy">Checklist de auditoría</p>
          <p className="text-xs text-navy-400">Criterios que se evalúan al auditar cualquier proveedor — el mismo checklist para todos.</p>
        </div>
        <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full text-navy-400 hover:bg-navy-50 hover:text-navy">
          <span className="material-symbols-outlined text-lg">close</span>
        </button>
      </div>

      {criteria.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {criteria.map((c, i) => (
            <div key={c.id} className="flex items-center justify-between gap-2 text-sm bg-navy-50/60 rounded-lg px-3 py-2">
              <span className="text-navy">
                {i + 1}. {c.criterion}
                {c.category && <span className="text-navy-400"> — {c.category}</span>}
              </span>
              <button type="button" onClick={() => handleDelete(c.id)} className="text-red-500 shrink-0">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
        <Field label="Criterio" value={form.criterion} onChange={(e) => setForm((f) => ({ ...f, criterion: e.target.value }))} placeholder="Ej. Cuenta con póliza de responsabilidad civil vigente" required />
        <Field label="Categoría (opcional)" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="Ej. Documentación legal" />
        {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
        <div className="sm:col-span-2">
          <Button type="submit" disabled={busy}>
            {busy ? 'Guardando…' : '+ Agregar criterio'}
          </Button>
        </div>
      </form>
    </div>
  );
}
