'use client';

// Skylog V2.0 — SMS / Gobernanza: Política y objetivos (Fase 1 oficial de
// MAUT-5.0-22-017) + designación del Gerente de Seguridad Operacional.
// Las 2 APIs ya existían (`api/sms/governance/policy|gso`), validadas contra
// la norma — esta es la pantalla real que les faltaba (40-sms.md §5.8/§5.9,
// sub-frente SMS-A). Ver 41-tiempos-servicio.md para el patrón ya probado de
// "designar sobre `designations`" (mismo criterio que la designación de
// Jefe de Pilotos de F5).
import { useCallback, useEffect, useState } from 'react';
import { SectionHero, SectionCard } from '../../_components/SectionHero';
import { Button } from '@skylog/ui';
import { GSO_PROFILE_REQUIREMENTS } from '@skylog/domain';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(`${d}T00:00:00`).toLocaleDateString('es-CO');
}

export default function SmsGobernanzaPage() {
  const [context, setContext] = useState(null);
  const [organizationId, setOrganizationId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [policies, setPolicies] = useState([]);
  const [currentPolicy, setCurrentPolicy] = useState(null);
  const [designation, setDesignation] = useState(null);
  const [orgProfile, setOrgProfile] = useState(null);
  const [roster, setRoster] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  const [policyForm, setPolicyForm] = useState({ policyText: '', scope: '', effectiveDate: new Date().toISOString().slice(0, 10), sign: true });
  const [policyBusy, setPolicyBusy] = useState(false);
  const [policyError, setPolicyError] = useState(null);

  const [gsoCandidateId, setGsoCandidateId] = useState('');
  const [gsoProfile, setGsoProfile] = useState({});
  const [gsoBusy, setGsoBusy] = useState(false);
  const [gsoError, setGsoError] = useState(null);
  const [gsoMissing, setGsoMissing] = useState([]);

  const currentOrg = context?.organizations?.find((o) => o.id === organizationId);
  const isManager = !!currentOrg?.isDutyManager;

  const loadAll = useCallback(async (orgId) => {
    if (!orgId) return;
    const [policyRes, gsoRes, rosterRes] = await Promise.all([
      fetch(`/api/sms/governance/policy?organizationId=${orgId}`),
      fetch(`/api/sms/governance/gso?organizationId=${orgId}`),
      fetch(`/api/flota/roster?organizationId=${orgId}`),
    ]);
    const [policyData, gsoData, rosterData] = await Promise.all([policyRes.json(), gsoRes.json(), rosterRes.json()]);
    if (policyRes.ok) {
      setPolicies(policyData.policies || []);
      setCurrentPolicy(policyData.current || null);
    }
    if (gsoRes.ok) {
      setDesignation(gsoData.designation || null);
      setOrgProfile(gsoData.profile || null);
    }
    if (rosterRes.ok) setRoster(rosterData.roster || []);
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
    if (organizationId) loadAll(organizationId);
  }, [organizationId, loadAll]);

  async function handlePolicySubmit(e) {
    e.preventDefault();
    setPolicyBusy(true);
    setPolicyError(null);
    try {
      const res = await fetch('/api/sms/governance/policy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, ...policyForm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error publicando la política');
      setPolicyForm((f) => ({ ...f, policyText: '' }));
      await loadAll(organizationId);
    } catch (e) {
      setPolicyError(e.message);
    } finally {
      setPolicyBusy(false);
    }
  }

  async function handleGsoSubmit(e) {
    e.preventDefault();
    if (!gsoCandidateId) {
      setGsoError('Elige un candidato');
      return;
    }
    setGsoBusy(true);
    setGsoError(null);
    setGsoMissing([]);
    try {
      const res = await fetch('/api/sms/governance/gso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, personId: gsoCandidateId, profile: gsoProfile }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGsoMissing(data.missing || []);
        throw new Error(data.error || 'Error registrando la designación');
      }
      setGsoCandidateId('');
      setGsoProfile({});
      await loadAll(organizationId);
    } catch (e) {
      setGsoError(e.message);
    } finally {
      setGsoBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-navy-400">Cargando…</p>;

  if (!context?.personId) {
    return (
      <div>
        <SectionHero eyebrow="SMS" title="Gobernanza" description="Política de seguridad operacional y designación del Gerente de Seguridad Operacional." />
        <p className="text-sm text-navy-400 mt-4">Esta cuenta no tiene todavía un registro de Persona vinculado.</p>
      </div>
    );
  }

  const historyPolicies = policies.filter((p) => p.id !== currentPolicy?.id);

  return (
    <div className="space-y-6">
      <SectionHero
        eyebrow="SMS"
        title="Gobernanza"
        description="Política y objetivos de seguridad operacional + designación del Gerente de Seguridad Operacional — Fase 1 de MAUT-5.0-22-017."
      />

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <SectionCard
          icon="gavel"
          tile="bg-primary text-white"
          wash="from-primary-50 to-white"
          title="Política y objetivos"
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
          {currentPolicy && (
            <div className="mb-4 space-y-2">
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
          )}

          {isManager ? (
            <form onSubmit={handlePolicySubmit} className="space-y-3 border-t border-navy-50 pt-4">
              <p className="text-xs font-semibold text-navy-500">{currentPolicy ? 'Publicar nueva versión' : 'Publicar la primera versión'}</p>
              <div>
                <label className="text-xs font-medium text-navy-400 block mb-1">Alcance</label>
                <input
                  value={policyForm.scope}
                  onChange={(e) => setPolicyForm((f) => ({ ...f, scope: e.target.value }))}
                  placeholder="Ej. Toda la organización"
                  required
                  className="w-full text-sm border border-navy-200 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-navy-400 block mb-1">Texto de la política</label>
                <textarea
                  value={policyForm.policyText}
                  onChange={(e) => setPolicyForm((f) => ({ ...f, policyText: e.target.value }))}
                  rows={5}
                  required
                  className="w-full text-sm border border-navy-200 rounded-lg px-3 py-2"
                  placeholder="Compromiso de la dirección, importancia de la notificación, Cultura Justa y confidencialidad…"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-navy-400 block mb-1">Fecha de vigencia</label>
                <input
                  type="date"
                  value={policyForm.effectiveDate}
                  onChange={(e) => setPolicyForm((f) => ({ ...f, effectiveDate: e.target.value }))}
                  required
                  className="w-full text-sm border border-navy-200 rounded-lg px-3 py-2"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-navy-500">
                <input type="checkbox" checked={policyForm.sign} onChange={(e) => setPolicyForm((f) => ({ ...f, sign: e.target.checked }))} />
                Firmar y publicar ahora (como {context.fullName || 'yo'})
              </label>
              {policyError && <p className="text-xs text-red-600">{policyError}</p>}
              <Button type="submit" disabled={policyBusy} className="w-full justify-center">
                {policyBusy ? 'Guardando…' : currentPolicy ? 'Publicar nueva versión' : 'Publicar política'}
              </Button>
            </form>
          ) : (
            !currentPolicy && <p className="text-xs text-navy-300">Solo un gestor puede publicar la política.</p>
          )}
        </SectionCard>

        <SectionCard
          icon="shield_person"
          tile="bg-red-500 text-white"
          wash="from-red-50 to-white"
          title="Gerente de Seguridad Operacional"
          description={designation ? `Designado — ${designation.people?.full_name || 'sin nombre'}` : 'Sin designación activa'}
          badge={
            designation ? (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 rounded-full px-2.5 py-1">
                <span className="material-symbols-outlined text-[14px]">check_circle</span>
                Activo
              </span>
            ) : null
          }
        >
          {orgProfile && (
            <p className="flex items-start gap-1.5 text-xs text-navy-500 bg-navy-50 rounded-lg px-3 py-2 mb-3">
              <span className="material-symbols-outlined text-[14px] text-navy-300 shrink-0 mt-0.5">info</span>
              {orgProfile.note}
            </p>
          )}
          {designation && (
            <div className="mb-4 space-y-1.5">
              <p className="text-sm font-semibold text-navy">{designation.people?.full_name}</p>
              <p className="text-xs text-navy-400">Vigente desde {new Date(designation.created_at).toLocaleDateString('es-CO')}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {GSO_PROFILE_REQUIREMENTS.map((r) => (
                  <span key={r.key} className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">
                    <span className="material-symbols-outlined text-[12px]">check</span>
                    {r.label.split('(')[0].trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {isManager ? (
            <form onSubmit={handleGsoSubmit} className="space-y-3 border-t border-navy-50 pt-4">
              <p className="text-xs font-semibold text-navy-500">{designation ? 'Redesignar (cierra la designación vigente)' : 'Designar al GSO'}</p>
              <div>
                <label className="text-xs font-medium text-navy-400 block mb-1">Candidato</label>
                <select value={gsoCandidateId} onChange={(e) => setGsoCandidateId(e.target.value)} required className="w-full text-sm border border-navy-200 rounded-lg px-3 py-2">
                  <option value="">Elige un miembro de la organización</option>
                  {roster.map((m) => (
                    <option key={m.person.id} value={m.person.id}>
                      {m.person.full_name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-xs font-medium text-navy-400 mb-1.5">Perfil — RAC 100 §100.545(d) + MAUT-1.0-22-007 §7.2.3 (unión de ambas normas)</p>
                <div className="space-y-1.5">
                  {GSO_PROFILE_REQUIREMENTS.map((r) => {
                    const missingFlag = gsoMissing.some((m) => m.key === r.key);
                    return (
                      <label key={r.key} className={`flex items-start gap-2 text-xs rounded-lg px-2 py-1.5 ${missingFlag ? 'bg-red-50 text-red-700' : 'text-navy-500'}`}>
                        <input
                          type="checkbox"
                          checked={!!gsoProfile[r.key]}
                          onChange={(e) => setGsoProfile((p) => ({ ...p, [r.key]: e.target.checked }))}
                          className="mt-0.5"
                        />
                        {r.label}
                      </label>
                    );
                  })}
                </div>
              </div>
              {gsoError && <p className="text-xs text-red-600">{gsoError}</p>}
              <Button type="submit" disabled={gsoBusy} className="w-full justify-center" variant="secondary">
                {gsoBusy ? 'Guardando…' : designation ? 'Redesignar' : 'Designar GSO'}
              </Button>
            </form>
          ) : (
            !designation && <p className="text-xs text-navy-300">Solo un gestor puede designar al GSO.</p>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
