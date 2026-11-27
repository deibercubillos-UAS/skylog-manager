'use client';

// Skylog V2.0 — SMS-F: pestaña «Políticas» dentro de Objetivos SMS. Reúne la
// cadena del Balanced Scorecard en un solo lugar: la política declara los
// objetivos y los KPI los miden (MAUT-5.0-22-017 §7.3.5.1). Habla con la misma
// API ya validada contra la norma (`sms_policies`, `/api/sms/governance/policy`)
// que usa Gobernanza — sin tabla nueva. Publicar una versión se hace en una
// ventana flotante con el patrón de diálogo de BitaFly (igual que el objetivo).
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { SectionCard } from '../../_components/SectionHero';
import { Button } from '@skylog/ui';

const inputCls =
  'mt-1 w-full min-h-[44px] text-base md:text-sm bg-white border border-navy-200 rounded-xl px-3 py-2 placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-300 transition-shadow';
const labelCls = 'block text-xs font-bold uppercase tracking-wide text-navy-400';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(`${d}T00:00:00`).toLocaleDateString('es-CO');
}

export default function PolicyPanel({ organizationId, isManager, fullName }) {
  const [policies, setPolicies] = useState([]);
  const [currentPolicy, setCurrentPolicy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async (orgId) => {
    if (!orgId) return;
    setLoading(true);
    const res = await fetch(`/api/sms/governance/policy?organizationId=${orgId}`);
    const data = await res.json();
    if (res.ok) {
      setPolicies(data.policies || []);
      setCurrentPolicy(data.current || null);
    } else {
      setError(data.error || 'Error cargando las políticas');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (organizationId) load(organizationId);
  }, [organizationId, load]);

  if (loading) return <p className="text-sm text-navy-400">Cargando políticas…</p>;

  const historyPolicies = policies.filter((p) => p.id !== currentPolicy?.id);

  return (
    <div className="space-y-4">
      <SectionCard
        icon="gavel"
        tile="bg-primary text-white"
        wash="from-primary-50 to-white"
        title="Política de seguridad operacional"
        description={currentPolicy ? `Vigente desde ${fmtDate(currentPolicy.effective_date)}` : 'Sin política firmada todavía'}
        badge={
          currentPolicy?.signed_at ? (
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 rounded-full px-2.5 py-1">
              <span className="material-symbols-outlined text-[14px]">verified</span>
              Firmada
            </span>
          ) : currentPolicy ? (
            <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-100 rounded-full px-2.5 py-1">
              <span className="material-symbols-outlined text-[14px]">schedule</span>
              Sin firmar
            </span>
          ) : null
        }
      >
        {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>}

        {currentPolicy ? (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-navy-400 uppercase tracking-wide">Alcance</p>
            <p className="text-sm text-navy">{currentPolicy.scope}</p>
            <p className="text-xs font-semibold text-navy-400 uppercase tracking-wide mt-3">Texto vigente</p>
            <p className="text-sm text-navy-500 whitespace-pre-wrap">{currentPolicy.policy_text}</p>
            {historyPolicies.length > 0 && (
              <button type="button" onClick={() => setShowHistory((s) => !s)} className="text-xs font-semibold text-primary-700 hover:underline">
                {showHistory ? 'Ocultar historial' : `Ver historial (${historyPolicies.length})`}
              </button>
            )}
            {showHistory && (
              <div className="space-y-1.5 border-t border-navy-50 pt-2 mt-2">
                {historyPolicies.map((p) => (
                  <p key={p.id} className="text-xs text-navy-400">
                    {fmtDate(p.effective_date)} · {p.signed_at ? 'firmada' : 'sin firmar'} · {p.scope}
                  </p>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="flex items-start gap-1.5 text-xs text-navy-500 bg-navy-50 rounded-lg px-3 py-2">
            <span className="material-symbols-outlined text-[14px] text-navy-300 shrink-0 mt-0.5">info</span>
            La política declara el compromiso de la dirección y de ella se desprenden los objetivos SMS; los KPI miden su cumplimiento.
          </p>
        )}

        {isManager ? (
          <div className="border-t border-navy-50 pt-4 mt-4">
            <Button variant="ghost" onClick={() => setShowForm(true)} className="text-sm">
              <span className="material-symbols-outlined text-base align-middle mr-1">{currentPolicy ? 'history_edu' : 'add'}</span>
              {currentPolicy ? 'Publicar nueva versión' : 'Publicar la primera política'}
            </Button>
          </div>
        ) : (
          !currentPolicy && <p className="text-xs text-navy-300 border-t border-navy-50 pt-4 mt-4">Solo un gestor puede publicar la política.</p>
        )}
      </SectionCard>

      <PolicyFormDialog
        open={showForm}
        onClose={() => setShowForm(false)}
        organizationId={organizationId}
        hasCurrent={Boolean(currentPolicy)}
        fullName={fullName}
        onSaved={() => load(organizationId)}
      />
    </div>
  );
}

// Ventana flotante para publicar una versión de la política — mismo patrón de
// diálogo de BitaFly que el objetivo (portal, velo navy, tarjeta centrada).
function PolicyFormDialog({ open, onClose, organizationId, hasCurrent, fullName, onSaved }) {
  const [form, setForm] = useState({ policyText: '', scope: '', effectiveDate: new Date().toISOString().slice(0, 10), sign: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setForm({ policyText: '', scope: '', effectiveDate: new Date().toISOString().slice(0, 10), sign: true });
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/sms/governance/policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error publicando la política');
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  const title = hasCurrent ? 'Nueva versión de la política' : 'Publicar la política';
  const dialog = (
    <div
      className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center bg-navy/50 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()} className="bg-white w-full sm:max-w-xl max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl">
        <header className="relative isolate overflow-hidden bg-gradient-to-br from-navy via-navy to-[#0f1420] text-white px-5 py-4 rounded-t-3xl">
          <div className="absolute -right-10 -top-14 w-44 h-44 rounded-full bg-primary/30 blur-3xl -z-10" aria-hidden="true" />
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 border border-white/15 shrink-0">
              <span className="material-symbols-outlined text-xl text-primary-200">gavel</span>
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary-300 leading-none mb-1">SMS · Política</p>
              <h2 className="font-black tracking-tight leading-tight text-lg">{title}</h2>
              <p className="text-xs text-navy-300 mt-1">Compromiso de la dirección del que se desprenden los objetivos SMS.</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Cerrar" className="shrink-0 -mr-1.5 -mt-1 size-9 flex items-center justify-center rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors">
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>
          </div>
        </header>

        <div className="px-5 py-5 space-y-4">
          <label className={labelCls}>
            Alcance
            <input
              value={form.scope}
              onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value }))}
              placeholder="Ej. Toda la organización"
              required
              autoFocus
              className={`${inputCls} normal-case font-normal text-navy`}
            />
          </label>

          <label className={labelCls}>
            Texto de la política
            <textarea
              value={form.policyText}
              onChange={(e) => setForm((f) => ({ ...f, policyText: e.target.value }))}
              rows={6}
              required
              placeholder="Compromiso de la dirección, importancia de la notificación, Cultura Justa y confidencialidad…"
              className={`${inputCls} normal-case font-normal text-navy`}
            />
          </label>

          <label className={labelCls}>
            Fecha de vigencia
            <input type="date" value={form.effectiveDate} onChange={(e) => setForm((f) => ({ ...f, effectiveDate: e.target.value }))} required className={`${inputCls} normal-case font-normal text-navy`} />
          </label>

          <label className="flex items-center gap-2 text-sm text-navy-600 bg-navy-50/70 rounded-xl px-3 py-2.5">
            <input type="checkbox" checked={form.sign} onChange={(e) => setForm((f) => ({ ...f, sign: e.target.checked }))} className="accent-primary-600 size-4" />
            Firmar y publicar ahora (como {fullName || 'yo'})
          </label>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="min-h-[44px] px-4 rounded-xl border border-navy-200 text-sm font-bold text-navy-600 hover:bg-navy-50 transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy || !form.scope.trim() || !form.policyText.trim()}
              className="min-h-[44px] px-4 rounded-xl text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">{form.sign ? 'verified' : 'save'}</span>
              {busy ? 'Guardando…' : form.sign ? 'Firmar y publicar' : 'Guardar sin firmar'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );

  return typeof document === 'undefined' ? null : createPortal(dialog, document.body);
}
