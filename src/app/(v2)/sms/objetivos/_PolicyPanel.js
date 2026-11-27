'use client';

// Skylog V2.0 — SMS-F: pestaña «Políticas» dentro de Objetivos SMS. Reúne la
// cadena del Balanced Scorecard en un solo lugar: la política declara los
// objetivos y los KPI (indicadores SPI) los miden (MAUT-5.0-22-017 §7.3.5.1).
// Habla con la misma API ya validada contra la norma (`sms_policies`,
// `/api/sms/governance/policy`) que usa Gobernanza — sin tabla nueva.
import { useCallback, useEffect, useState } from 'react';
import { SectionCard } from '../../_components/SectionHero';
import { Button } from '@skylog/ui';

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
  const [form, setForm] = useState({ policyText: '', scope: '', effectiveDate: new Date().toISOString().slice(0, 10), sign: true });
  const [busy, setBusy] = useState(false);
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
      setForm((f) => ({ ...f, policyText: '' }));
      setShowForm(false);
      await load(organizationId);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

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
            La política declara el compromiso de la dirección y de ella se desprenden los objetivos SMS; los KPI (indicadores SPI) miden su cumplimiento.
          </p>
        )}

        {isManager ? (
          !showForm ? (
            <div className="border-t border-navy-50 pt-4 mt-4">
              <Button variant="ghost" onClick={() => setShowForm(true)} className="text-sm">
                <span className="material-symbols-outlined text-base align-middle mr-1">{currentPolicy ? 'history_edu' : 'add'}</span>
                {currentPolicy ? 'Publicar nueva versión' : 'Publicar la primera política'}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3 border-t border-navy-50 pt-4 mt-4">
              <p className="text-xs font-semibold text-navy-500">{currentPolicy ? 'Publicar nueva versión' : 'Publicar la primera versión'}</p>
              <div>
                <label className="text-xs font-medium text-navy-400 block mb-1">Alcance</label>
                <input
                  value={form.scope}
                  onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value }))}
                  placeholder="Ej. Toda la organización"
                  required
                  className="w-full text-sm border border-navy-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-navy-400 block mb-1">Texto de la política</label>
                <textarea
                  value={form.policyText}
                  onChange={(e) => setForm((f) => ({ ...f, policyText: e.target.value }))}
                  rows={5}
                  required
                  className="w-full text-sm border border-navy-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300"
                  placeholder="Compromiso de la dirección, importancia de la notificación, Cultura Justa y confidencialidad…"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-navy-400 block mb-1">Fecha de vigencia</label>
                <input
                  type="date"
                  value={form.effectiveDate}
                  onChange={(e) => setForm((f) => ({ ...f, effectiveDate: e.target.value }))}
                  required
                  className="w-full text-sm border border-navy-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-300"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-navy-500">
                <input type="checkbox" checked={form.sign} onChange={(e) => setForm((f) => ({ ...f, sign: e.target.checked }))} />
                Firmar y publicar ahora (como {fullName || 'yo'})
              </label>
              <div className="flex gap-2">
                <Button type="submit" disabled={busy} className="justify-center">
                  {busy ? 'Guardando…' : currentPolicy ? 'Publicar nueva versión' : 'Publicar política'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          )
        ) : (
          !currentPolicy && <p className="text-xs text-navy-300 border-t border-navy-50 pt-4 mt-4">Solo un gestor puede publicar la política.</p>
        )}
      </SectionCard>
    </div>
  );
}
