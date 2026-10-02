'use client';

// Skylog V2.0 — Proveedores: historial de auditorías de UN proveedor +
// formulario de nueva auditoría (botones tri-estado por criterio +
// observaciones, mismo patrón real de v1). El % de cumplimiento se calcula
// siempre en el cliente con `computeSupplierAuditScore` (dominio puro) —
// nunca se persiste como columna derivada.
import { useCallback, useEffect, useState } from 'react';
import { Field, Button } from '@skylog/ui';
import { computeSupplierAuditScore } from '@skylog/domain';

const TRISTATE = [
  { value: 'cumple', label: 'Cumple', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'no_cumple', label: 'No cumple', className: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'no_aplica', label: 'No aplica', className: 'bg-navy-50 text-navy-400 border-navy-200' },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(`${d}T00:00:00`).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function ScoreBadge({ score }) {
  if (score.percentage == null) return <span className="text-xs text-navy-300">Sin criterios aplicables</span>;
  const color = score.percentage >= 80 ? 'bg-emerald-50 text-emerald-700' : score.percentage >= 50 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700';
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>{score.percentage}% de cumplimiento</span>;
}

export default function SupplierDetail({ supplier, organizationId, criteria, fullName, onAuditSaved }) {
  const [audits, setAudits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({ auditDate: todayStr(), auditorName: fullName || '', responses: {}, overallNotes: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const criteriaIds = criteria.map((c) => c.id);

  const load = useCallback(async () => {
    const res = await fetch(`/api/proveedores/audits?organizationId=${organizationId}&supplierId=${supplier.id}`);
    const data = await res.json();
    if (res.ok) setAudits(data.audits || []);
    setLoading(false);
  }, [organizationId, supplier.id]);

  useEffect(() => {
    load();
  }, [load]);

  function setResponseValue(criterionId, value) {
    setForm((f) => ({ ...f, responses: { ...f.responses, [criterionId]: { ...f.responses[criterionId], value } } }));
  }

  function setResponseNotes(criterionId, notes) {
    setForm((f) => ({ ...f, responses: { ...f.responses, [criterionId]: { ...f.responses[criterionId], notes } } }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/proveedores/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, supplierId: supplier.id, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error registrando la auditoría');
      setForm({ auditDate: todayStr(), auditorName: fullName || '', responses: {}, overallNotes: '' });
      setShowForm(false);
      await load();
      onAuditSaved?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar esta auditoría?')) return;
    const res = await fetch(`/api/proveedores/audits?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    await load();
    onAuditSaved?.();
  }

  const livePreview = computeSupplierAuditScore(form.responses, criteriaIds);

  return (
    <div className="mt-3 space-y-3 border-t border-navy-50 pt-3">
      {loading ? (
        <p className="text-sm text-navy-300">Cargando historial…</p>
      ) : audits.length === 0 ? (
        <p className="text-sm text-navy-300">Sin auditorías registradas todavía.</p>
      ) : (
        <div className="space-y-1.5">
          {audits.map((a) => {
            const score = computeSupplierAuditScore(a.responses, criteriaIds);
            return (
              <div key={a.id} className="flex items-center justify-between gap-3 bg-navy-50/40 rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-navy">{fmtDate(a.audit_date)} — {a.auditor_name}</p>
                  {a.overall_notes && <p className="text-xs text-navy-400 mt-0.5">{a.overall_notes}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <ScoreBadge score={score} />
                  <button type="button" onClick={() => handleDelete(a.id)} className="text-red-500">
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {!showForm ? (
        <Button onClick={() => setShowForm(true)}>Nueva auditoría</Button>
      ) : (
        <form onSubmit={handleSubmit} className="bg-navy-50/40 rounded-xl p-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2">
            <Field label="Fecha de auditoría" type="date" value={form.auditDate} onChange={(e) => setForm((f) => ({ ...f, auditDate: e.target.value }))} required />
            <Field label="Auditor" value={form.auditorName} onChange={(e) => setForm((f) => ({ ...f, auditorName: e.target.value }))} required />
          </div>

          {criteria.length === 0 ? (
            <p className="text-xs text-navy-400">Sin criterios configurados — ábrelo desde &quot;Checklist de auditoría&quot; en la parte superior para poder calificar por ítem.</p>
          ) : (
            <div className="space-y-2">
              {criteria.map((c) => (
                <div key={c.id} className="bg-white rounded-lg p-2.5">
                  <p className="text-sm text-navy mb-1.5">{c.criterion}</p>
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {TRISTATE.map((t) => (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setResponseValue(c.id, t.value)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                          form.responses[c.id]?.value === t.value ? t.className : 'border-navy-200 text-navy-400 hover:border-navy-300'
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <input
                    value={form.responses[c.id]?.notes || ''}
                    onChange={(e) => setResponseNotes(c.id, e.target.value)}
                    placeholder="Observaciones de este criterio (opcional)"
                    className="w-full text-xs border border-navy-200 rounded-lg px-2 py-1.5"
                  />
                </div>
              ))}
            </div>
          )}

          <Field label="Observaciones generales (opcional)" value={form.overallNotes} onChange={(e) => setForm((f) => ({ ...f, overallNotes: e.target.value }))} />

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <ScoreBadge score={livePreview} />
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="text-sm text-navy-400 hover:text-navy">
                Cancelar
              </button>
              <Button type="submit" disabled={busy}>
                {busy ? 'Guardando…' : 'Registrar auditoría'}
              </Button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
