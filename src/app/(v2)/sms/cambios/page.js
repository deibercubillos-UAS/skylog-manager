'use client';

// Skylog V2.0 — Gestión del cambio del SMS (RAC 219 §219.105(c)(2)). Un cambio (flota, procedimientos,
// personal, infraestructura…) se identifica, se evalúa —¿impacta la seguridad?, ¿qué peligro lo cubre?, ¿cómo se
// consideraron los factores humanos?— y solo entonces se implementa. Las reglas viven en
// packages/domain/src/changeManagement.js y el servidor las vuelve a aplicar en cada paso.
import { useCallback, useEffect, useState } from 'react';
import { CHANGE_TYPES } from '@skylog/domain';
import { SectionHero, StatCard } from '../../_components/SectionHero';
import { Button, Field } from '@skylog/ui';

const STATUS_META = {
  identificado: { label: 'Identificado', cls: 'bg-blue-50 text-blue-700' },
  evaluado: { label: 'Evaluado', cls: 'bg-amber-50 text-amber-700' },
  implementado: { label: 'Implementado', cls: 'bg-emerald-50 text-emerald-700' },
  descartado: { label: 'Descartado', cls: 'bg-navy-50 text-navy-400' },
};
const typeLabel = (k) => CHANGE_TYPES.find((t) => t.key === k)?.label || k;
const EMPTY = { title: '', description: '', change_type: 'otro', planned_date: '' };

function ChangeCard({ change, hazards, members, isManager, onSave }) {
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  const closed = change.status === 'implementado' || change.status === 'descartado';
  const meta = STATUS_META[change.status];

  function expand() {
    if (!open) {
      setF({
        safety_impact: change.safety_impact,
        impact_justification: change.impact_justification || '',
        hazard_id: change.hazard_id || '',
        human_factors_notes: change.human_factors_notes || '',
        responsible_id: change.responsible_id || '',
        decision_notes: change.decision_notes || '',
      });
      setErr(null);
    }
    setOpen(!open);
  }

  async function submit(status) {
    setBusy(true);
    setErr(null);
    const out = await onSave({ id: change.id, ...f, ...(status ? { status } : {}) });
    setBusy(false);
    if (out.error) setErr(out.error);
    else if (status) setOpen(false);
  }

  return (
    <div className="bg-white rounded-2xl border border-navy-100 p-4">
      <button type="button" onClick={expand} className="w-full flex items-start justify-between gap-3 text-left">
        <div className="min-w-0">
          <p className="text-sm font-bold text-navy">{change.title}</p>
          <p className="text-xs text-navy-400 mt-0.5">
            {typeLabel(change.change_type)}
            {change.planned_date && ` · previsto ${change.planned_date}`}
            {change.responsible?.full_name && ` · responsable ${change.responsible.full_name}`}
          </p>
          {change.safety_impact !== 'por_evaluar' && (
            <p className="text-xs mt-1 text-navy-500">
              {change.safety_impact === 'si' ? 'Impacta la seguridad' : 'Sin impacto en la seguridad'}
              {change.hazard?.description && ` · peligro: ${change.hazard.description}`}
            </p>
          )}
        </div>
        <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${meta.cls}`}>{meta.label}</span>
      </button>

      {open && f && (
        <div className="mt-4 pt-4 border-t border-navy-100">
          {change.description && <p className="text-xs text-navy-500 mb-3">{change.description}</p>}
          {closed || !isManager ? (
            <div className="text-xs text-navy-500 space-y-1">
              {change.impact_justification && <p><b>Justificación:</b> {change.impact_justification}</p>}
              {change.human_factors_notes && <p><b>Factores humanos:</b> {change.human_factors_notes}</p>}
              {change.decision_notes && <p><b>Decisión:</b> {change.decision_notes}</p>}
              {change.implemented_at && <p><b>Implementado:</b> {change.implemented_at.slice(0, 10)}</p>}
            </div>
          ) : (
            <>
              <span className="block text-xs font-medium text-navy-400 mb-1.5">¿El cambio impacta la seguridad operacional?</span>
              <div className="flex gap-1.5 mb-3">
                {[['si', 'Sí impacta'], ['no', 'No impacta'], ['por_evaluar', 'Por evaluar']].map(([k, l]) => (
                  <button key={k} type="button" onClick={() => setF((x) => ({ ...x, safety_impact: k }))}
                    className={`px-3 h-8 rounded-full text-xs font-bold border ${f.safety_impact === k ? 'border-primary bg-primary/10 text-primary-700' : 'border-navy-200 text-navy-400'}`}>
                    {l}
                  </button>
                ))}
              </div>
              <Field as="textarea" rows={2} label="Justificación de la decisión" value={f.impact_justification} onChange={(e) => setF((x) => ({ ...x, impact_justification: e.target.value }))} />
              <Field as="select" label="Peligro asociado (de la Evaluación de Riesgo)" value={f.hazard_id} onChange={(e) => setF((x) => ({ ...x, hazard_id: e.target.value }))}>
                <option value="">— Sin enlazar —</option>
                {hazards.map((h) => <option key={h.id} value={h.id}>{h.description}</option>)}
              </Field>
              {f.safety_impact === 'si' && hazards.length === 0 && (
                <p className="text-xs text-amber-700 -mt-1 mb-3">No hay peligros registrados: créalo en <a className="underline" href="/sms/riesgos">Evaluación de Riesgo</a> y vuelve.</p>
              )}
              <Field as="textarea" rows={2} label="Factores humanos considerados" value={f.human_factors_notes} onChange={(e) => setF((x) => ({ ...x, human_factors_notes: e.target.value }))} placeholder="Capacitación, carga de trabajo, interfaz, fatiga…" />
              <Field as="select" label="Responsable" value={f.responsible_id} onChange={(e) => setF((x) => ({ ...x, responsible_id: e.target.value }))}>
                <option value="">— Sin asignar —</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </Field>
              <Field as="textarea" rows={2} label="Motivo (solo para descartar)" value={f.decision_notes} onChange={(e) => setF((x) => ({ ...x, decision_notes: e.target.value }))} />
              {err && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{err}</p>}
              <div className="flex flex-wrap gap-2">
                <Button type="button" disabled={busy} onClick={() => submit(null)}>Guardar</Button>
                {change.status === 'identificado' && <Button type="button" disabled={busy} onClick={() => submit('evaluado')}>Marcar como evaluado</Button>}
                {change.status === 'evaluado' && <Button type="button" disabled={busy} onClick={() => submit('implementado')}>Implementar</Button>}
                <button type="button" disabled={busy} onClick={() => submit('descartado')} className="text-xs font-semibold text-red-600 hover:underline px-2">Descartar</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function SmsCambiosPage() {
  const [context, setContext] = useState(null);
  const [organizationId, setOrganizationId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({ changes: [], hazards: [], members: [], isManager: false });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (orgId) => {
    if (!orgId) return;
    const res = await fetch(`/api/sms/changes?organizationId=${orgId}`);
    const d = await res.json();
    if (res.ok) setData(d);
    else setError(d.error);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/duty/context');
        const d = await res.json();
        if (!res.ok) throw new Error(d.error || 'Error cargando contexto');
        setContext(d);
        setOrganizationId(d.organizations?.[0]?.id || '');
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (organizationId) load(organizationId);
  }, [organizationId, load]);

  async function create(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch('/api/sms/changes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organizationId, ...form }) });
    const d = await res.json();
    setBusy(false);
    if (!res.ok) return setError(d.error);
    setForm(EMPTY);
    setShowForm(false);
    await load(organizationId);
  }

  async function save(payload) {
    const res = await fetch('/api/sms/changes', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const d = await res.json();
    if (!res.ok) return { error: d.error };
    await load(organizationId);
    return {};
  }

  if (loading) return <p className="text-sm text-navy-400">Cargando…</p>;
  if (!context?.personId) {
    return (
      <div>
        <SectionHero eyebrow="SMS" title="Gestión del cambio" description="Identifica y evalúa los cambios que pueden afectar la seguridad operacional." />
        <p className="text-sm text-navy-400 mt-4">Esta cuenta no tiene todavía un registro de Persona vinculado.</p>
      </div>
    );
  }

  const { changes, isManager } = data;
  const count = (s) => changes.filter((c) => c.status === s).length;

  return (
    <div className="space-y-6">
      <SectionHero
        eyebrow="SMS"
        title="Gestión del cambio"
        description="RAC 219 §219.105(c)(2): un cambio se evalúa antes de implementarse — impacto en la seguridad, peligro asociado y factores humanos."
        cta={isManager && <Button onClick={() => setShowForm(!showForm)}><span className="material-symbols-outlined text-base align-middle mr-1">add</span>Nuevo cambio</Button>}
      />

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon="flag" color="blue" label="Identificados" value={count('identificado')} />
        <StatCard icon="rule" color="amber" label="Evaluados" value={count('evaluado')} />
        <StatCard icon="task_alt" color="emerald" label="Implementados" value={count('implementado')} />
        <StatCard icon="block" color="navy" label="Descartados" value={count('descartado')} />
      </div>

      {showForm && (
        <form onSubmit={create} className="bg-white rounded-2xl border border-navy-100 p-4">
          <Field label="¿Qué va a cambiar?" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required placeholder="Ej. Nuevo modelo de aeronave, cambio de zona de operación…" />
          <Field as="textarea" rows={2} label="Descripción (opcional)" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <Field as="select" label="Tipo de cambio" value={form.change_type} onChange={(e) => setForm((f) => ({ ...f, change_type: e.target.value }))}>
              {CHANGE_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </Field>
            <Field type="date" label="Fecha prevista (opcional)" value={form.planned_date} onChange={(e) => setForm((f) => ({ ...f, planned_date: e.target.value }))} />
          </div>
          <Button type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Registrar cambio'}</Button>
        </form>
      )}

      <div className="space-y-3">
        {changes.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 text-center rounded-2xl border border-dashed border-navy-200 bg-navy-50/50 py-12 px-6">
            <span className="material-symbols-outlined text-3xl text-navy-300">published_with_changes</span>
            <p className="text-sm font-semibold text-navy">Sin cambios registrados</p>
            {isManager && <p className="text-xs text-navy-400">Registra aquí todo cambio de flota, procedimientos, personal o zonas antes de implementarlo.</p>}
          </div>
        ) : (
          changes.map((c) => <ChangeCard key={c.id} change={c} hazards={data.hazards} members={data.members} isManager={isManager} onSave={save} />)
        )}
      </div>
    </div>
  );
}
