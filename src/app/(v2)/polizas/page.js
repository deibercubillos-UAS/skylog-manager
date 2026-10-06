'use client';

// Skylog V2.0 — Pólizas (RAC 100 §100.535(27)): registro de pólizas con
// vigencia, cobertura por aeronave y certificado adjunto. Solo gestores
// (mismo criterio que Proveedores). El estado de vigencia se calcula con
// @skylog/domain (insuranceCoverage) — nunca se guarda. La RCE es la que
// exige §100.410(a)(2)(i) para autorizar una operación.
import { useCallback, useEffect, useRef, useState } from 'react';
import { SectionHero, StatCard } from '../_components/SectionHero';
import { Field, Button } from '@skylog/ui';
import { computePolicyStatus, summarizePolicies, POLICY_EXPIRY_WARNING_DAYS } from '@skylog/domain';

const TYPE_LABELS = { rce: 'RCE (responsabilidad civil)', casco: 'Casco', otra: 'Otra' };
const STATUS_META = {
  vigente: { label: 'Vigente', cls: 'bg-emerald-50 text-emerald-700' },
  por_vencer: { label: 'Por vencer', cls: 'bg-amber-50 text-amber-700' },
  vencida: { label: 'Vencida', cls: 'bg-red-50 text-red-700' },
  futura: { label: 'Aún no inicia', cls: 'bg-sky-50 text-sky-700' },
  sin_datos: { label: 'Sin datos', cls: 'bg-navy-50 text-navy-400' },
};
const EMPTY_FORM = { policyType: 'rce', insurer: '', policyNumber: '', startDate: '', endDate: '', coversAllFleet: true, aircraftIds: [], coveredAmountCop: '', notes: '' };

// Fecha de hoy en hora de Colombia (no UTC): a las 8 p. m. en Bogotá ya es "mañana" en UTC.
function todayBogota() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
}

function formatCop(value) {
  if (value == null) return null;
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value);
}

export default function PolizasPage() {
  const [context, setContext] = useState(null);
  const [organizationId, setOrganizationId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [policies, setPolicies] = useState([]);
  const [aircraft, setAircraft] = useState([]);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);
  const fileInputRef = useRef(null);
  const uploadTargetRef = useRef(null);

  const today = todayBogota();
  const currentOrg = context?.organizations?.find((o) => o.id === organizationId);
  const isManager = !!currentOrg?.isDutyManager;

  const loadPolicies = useCallback(async (orgId) => {
    if (!orgId) return;
    const res = await fetch(`/api/polizas?organizationId=${orgId}`);
    const data = await res.json();
    if (res.ok) setPolicies(data.policies || []);
    else setError(data.error);
  }, []);

  const loadAircraft = useCallback(async (orgId) => {
    if (!orgId) return;
    const res = await fetch(`/api/flota/aircraft?organizationId=${orgId}`);
    const data = await res.json();
    if (res.ok) setAircraft(data.aircraft || []);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/duty/context');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error cargando contexto');
        setContext(data);
        setOrganizationId(data.organizations?.[0]?.id || '');
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!organizationId || !isManager) return;
    loadPolicies(organizationId);
    loadAircraft(organizationId);
  }, [organizationId, isManager, loadPolicies, loadAircraft]);

  function openNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(p) {
    setEditingId(p.id);
    setForm({
      policyType: p.policy_type,
      insurer: p.insurer,
      policyNumber: p.policy_number,
      startDate: p.start_date,
      endDate: p.end_date,
      coversAllFleet: p.covers_all_fleet,
      aircraftIds: p.aircraft_ids || [],
      coveredAmountCop: p.covered_amount_cop ?? '',
      notes: p.notes || '',
    });
    setFormError(null);
    setShowForm(true);
  }

  function toggleAircraft(id) {
    setForm((f) => ({ ...f, aircraftIds: f.aircraftIds.includes(id) ? f.aircraftIds.filter((a) => a !== id) : [...f.aircraftIds, id] }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      const payload = { ...form, coveredAmountCop: form.coveredAmountCop === '' ? '' : Number(form.coveredAmountCop) };
      const res = await fetch('/api/polizas', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : { organizationId, ...payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error guardando la póliza');
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      await loadPolicies(organizationId);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(p) {
    if (!confirm(`¿Eliminar la póliza ${p.policy_number} de ${p.insurer}? También se borrará su certificado.`)) return;
    const res = await fetch(`/api/polizas?id=${p.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    await loadPolicies(organizationId);
  }

  async function handleToggleActive(p) {
    const res = await fetch('/api/polizas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id, isActive: !p.is_active }),
    });
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    await loadPolicies(organizationId);
  }

  function pickCertificate(policyId) {
    uploadTargetRef.current = policyId;
    fileInputRef.current?.click();
  }

  async function handleCertificateSelected(e) {
    const file = e.target.files?.[0];
    const policyId = uploadTargetRef.current;
    e.target.value = '';
    if (!file || !policyId) return;
    setUploadingId(policyId);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/polizas/${policyId}/document`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error subiendo el certificado');
      await loadPolicies(organizationId);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploadingId(null);
    }
  }

  if (loading) return <p className="text-sm text-navy-400">Cargando…</p>;

  const hero = <SectionHero eyebrow="Documentación" title="Pólizas" description="Pólizas con vigencia y cobertura por aeronave — la RCE es requisito para autorizar operaciones." />;

  if (!context?.personId) {
    return (
      <div>
        {hero}
        <p className="text-sm text-navy-400 mt-4">Esta cuenta no tiene todavía un registro de Persona vinculado.</p>
      </div>
    );
  }
  if (!isManager) {
    return (
      <div>
        {hero}
        <p className="text-sm text-navy-400 mt-4">Solo un gestor (Jefe de Pilotos, Gerente SMS, admin) puede ver las pólizas.</p>
      </div>
    );
  }

  const summary = summarizePolicies(policies, today);
  const hasActiveRce = policies.some((p) => p.policy_type === 'rce' && p.is_active && ['vigente', 'por_vencer'].includes(computePolicyStatus(p, today).status));
  const aircraftLabel = (id) => {
    const a = aircraft.find((x) => x.id === id);
    return a ? `${a.model?.brand || ''} ${a.model?.model || ''} · ${a.serial_number}`.trim() : id.slice(0, 8);
  };

  return (
    <div className="space-y-6">
      <SectionHero
        eyebrow="Documentación"
        title="Pólizas"
        description="Pólizas con vigencia y cobertura por aeronave — la RCE es requisito para autorizar operaciones."
        metric={{ value: summary.total, label: 'Pólizas activas' }}
        cta={
          <Button onClick={() => (showForm ? setShowForm(false) : openNew())}>
            <span className="material-symbols-outlined text-base align-middle mr-1">{showForm ? 'close' : 'add'}</span>
            {showForm ? 'Cerrar' : 'Nueva póliza'}
          </Button>
        }
      />

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      {!hasActiveRce && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
          <span className="material-symbols-outlined text-red-500">warning</span>
          <p className="text-sm text-red-700">
            No hay una póliza <strong>RCE vigente</strong>. Sin ella no se puede solicitar autorización de vuelo (RAC 100 §100.410(a)(2)(i)).
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon="verified_user" color="emerald" label="Vigentes" value={summary.vigente} />
        <StatCard icon="schedule" color="amber" label={`Por vencer (≤${POLICY_EXPIRY_WARNING_DAYS} d)`} value={summary.por_vencer} />
        <StatCard icon="error" color="red" label="Vencidas" value={summary.vencida} />
        <StatCard icon="event_upcoming" color="blue" label="Aún no inician" value={summary.futura} />
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-navy-100 p-4">
          <p className="text-sm font-semibold text-navy mb-3">{editingId ? 'Editar póliza' : 'Nueva póliza'}</p>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <label className="block mb-3">
              <span className="text-xs font-semibold text-navy-500">Tipo</span>
              <select value={form.policyType} onChange={(e) => setForm((f) => ({ ...f, policyType: e.target.value }))} className="mt-1 w-full text-sm border border-navy-200 rounded-xl px-3 py-2.5 bg-white">
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <Field label="Aseguradora" value={form.insurer} onChange={(e) => setForm((f) => ({ ...f, insurer: e.target.value }))} required />
            <Field label="N.º de póliza" value={form.policyNumber} onChange={(e) => setForm((f) => ({ ...f, policyNumber: e.target.value }))} required />
            <Field label="Valor asegurado COP (opcional)" type="number" min="0" value={form.coveredAmountCop} onChange={(e) => setForm((f) => ({ ...f, coveredAmountCop: e.target.value }))} />
            <Field label="Inicio de vigencia" type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} required />
            <Field label="Fin de vigencia" type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} required />

            <div className="sm:col-span-2 mb-3">
              <p className="text-xs font-semibold text-navy-500 mb-1">Cobertura</p>
              <label className="flex items-center gap-2 text-sm text-navy">
                <input type="checkbox" checked={form.coversAllFleet} onChange={(e) => setForm((f) => ({ ...f, coversAllFleet: e.target.checked }))} />
                Cubre toda la flota (incluye aeronaves que se agreguen después)
              </label>
              {!form.coversAllFleet && (
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {aircraft.length === 0 && <p className="text-xs text-navy-300">No hay aeronaves registradas todavía.</p>}
                  {aircraft.map((a) => (
                    <label key={a.id} className="flex items-center gap-2 text-sm text-navy border border-navy-100 rounded-lg px-2.5 py-1.5">
                      <input type="checkbox" checked={form.aircraftIds.includes(a.id)} onChange={() => toggleAircraft(a.id)} />
                      {aircraftLabel(a.id)}
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="sm:col-span-2">
              <Field label="Notas (opcional)" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            {formError && <p className="text-sm text-red-600 sm:col-span-2 mb-2">{formError}</p>}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={busy}>
                {busy ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Registrar póliza'}
              </Button>
            </div>
          </form>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="application/pdf,image/png,image/jpeg,image/webp" className="hidden" onChange={handleCertificateSelected} />

      <div className="space-y-3">
        {policies.length === 0 ? (
          <p className="text-sm text-navy-300">Sin pólizas registradas todavía.</p>
        ) : (
          policies.map((p) => {
            const { status, daysLeft } = computePolicyStatus(p, today);
            const meta = STATUS_META[status];
            return (
              <div key={p.id} className={`bg-white rounded-2xl border border-navy-100 p-4 ${p.is_active ? '' : 'opacity-60'}`}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3">
                    <span className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0 shadow-sm bg-violet-500 text-white">
                      <span className="material-symbols-outlined text-xl">verified_user</span>
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-navy">
                        {p.insurer} · {p.policy_number}
                      </p>
                      <p className="text-xs text-navy-400 mt-0.5">
                        {TYPE_LABELS[p.policy_type]} · {p.start_date} → {p.end_date}
                        {daysLeft != null && ` · ${daysLeft === 0 ? 'vence hoy' : `${daysLeft} d restantes`}`}
                        {p.covered_amount_cop != null && ` · ${formatCop(p.covered_amount_cop)}`}
                      </p>
                      <p className="text-xs text-navy-400 mt-0.5">
                        {p.covers_all_fleet ? 'Cubre toda la flota' : `Cubre: ${(p.aircraft_ids || []).map(aircraftLabel).join(', ') || '—'}`}
                      </p>
                      {p.notes && <p className="text-xs text-navy-300 mt-0.5">{p.notes}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 flex-wrap">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${meta.cls}`}>{meta.label}</span>
                    {p.document_path ? (
                      <a href={`/api/polizas/${p.id}/document`} target="_blank" rel="noreferrer" className="text-xs font-semibold px-2.5 py-1 rounded-full bg-navy-50 text-navy-600 hover:bg-navy-100">
                        Ver certificado
                      </a>
                    ) : null}
                    <button type="button" onClick={() => pickCertificate(p.id)} disabled={uploadingId === p.id} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 hover:bg-primary-100 disabled:opacity-50">
                      {uploadingId === p.id ? 'Subiendo…' : p.document_path ? 'Reemplazar certificado' : 'Adjuntar certificado'}
                    </button>
                    <button type="button" onClick={() => handleToggleActive(p)} className="text-xs font-semibold px-2.5 py-1 rounded-full bg-navy-50 text-navy-500 hover:bg-navy-100">
                      {p.is_active ? 'Desactivar' : 'Activar'}
                    </button>
                    <button type="button" onClick={() => openEdit(p)} title="Editar" className="w-8 h-8 flex items-center justify-center rounded-full text-navy-500 hover:bg-navy-50">
                      <span className="material-symbols-outlined text-lg">edit</span>
                    </button>
                    <button type="button" onClick={() => handleDelete(p)} title="Eliminar" className="w-8 h-8 flex items-center justify-center rounded-full text-red-500 hover:bg-red-50">
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
