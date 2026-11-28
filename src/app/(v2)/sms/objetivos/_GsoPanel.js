'use client';

// Skylog V2.0 — SMS: pestaña «Gerente SMS» dentro de Objetivos SMS. Designación
// del Gerente de Seguridad Operacional (GSO) sobre `designations` (RAC 100
// §100.545(d) + MAUT-1.0-22-007 §7.2.3). Antes vivía en la sección «Gobernanza»,
// que quedó eliminada; la API (`/api/sms/governance/gso`) no cambió.
import { useCallback, useEffect, useState } from 'react';
import { SectionCard } from '../../_components/SectionHero';
import { Button } from '@skylog/ui';
import { GSO_PROFILE_REQUIREMENTS } from '@skylog/domain';

export default function GsoPanel({ organizationId, isManager, canViewRoster }) {
  const [designation, setDesignation] = useState(null);
  const [orgProfile, setOrgProfile] = useState(null);
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [candidateId, setCandidateId] = useState('');
  const [profile, setProfile] = useState({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);
  const [missing, setMissing] = useState([]);

  const load = useCallback(
    async (orgId) => {
      if (!orgId) return;
      setLoading(true);
      const [gsoRes, rosterRes] = await Promise.all([
        fetch(`/api/sms/governance/gso?organizationId=${orgId}`),
        canViewRoster ? fetch(`/api/flota/roster?organizationId=${orgId}`) : Promise.resolve({ ok: false, json: async () => ({}) }),
      ]);
      const [gsoData, rosterData] = await Promise.all([gsoRes.json(), rosterRes.json()]);
      if (gsoRes.ok) {
        setDesignation(gsoData.designation || null);
        setOrgProfile(gsoData.profile || null);
      } else {
        setError(gsoData.error || 'Error cargando la designación');
      }
      if (rosterRes.ok) setRoster(rosterData.roster || []);
      setLoading(false);
    },
    [canViewRoster],
  );

  useEffect(() => {
    if (organizationId) load(organizationId);
  }, [organizationId, load]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!candidateId) {
      setFormError('Elige un candidato');
      return;
    }
    setBusy(true);
    setFormError(null);
    setMissing([]);
    try {
      const res = await fetch('/api/sms/governance/gso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, personId: candidateId, profile }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMissing(data.missing || []);
        throw new Error(data.error || 'Error registrando la designación');
      }
      setCandidateId('');
      setProfile({});
      await load(organizationId);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-sm text-navy-400">Cargando designación…</p>;

  return (
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
      {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>}
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
        <form onSubmit={handleSubmit} className="space-y-3 border-t border-navy-50 pt-4">
          <p className="text-xs font-semibold text-navy-500">{designation ? 'Redesignar (cierra la designación vigente)' : 'Designar al GSO'}</p>
          <div>
            <label className="text-xs font-medium text-navy-400 block mb-1">Candidato</label>
            <select value={candidateId} onChange={(e) => setCandidateId(e.target.value)} required className="w-full text-sm border border-navy-200 rounded-lg px-3 py-2">
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
                const missingFlag = missing.some((m) => m.key === r.key);
                return (
                  <label key={r.key} className={`flex items-start gap-2 text-xs rounded-lg px-2 py-1.5 ${missingFlag ? 'bg-red-50 text-red-700' : 'text-navy-500'}`}>
                    <input type="checkbox" checked={!!profile[r.key]} onChange={(e) => setProfile((p) => ({ ...p, [r.key]: e.target.checked }))} className="mt-0.5" />
                    {r.label}
                  </label>
                );
              })}
            </div>
          </div>
          {formError && <p className="text-xs text-red-600">{formError}</p>}
          <Button type="submit" disabled={busy} className="w-full justify-center" variant="secondary">
            {busy ? 'Guardando…' : designation ? 'Redesignar' : 'Designar GSO'}
          </Button>
        </form>
      ) : (
        !designation && <p className="text-xs text-navy-300">Solo un gestor puede designar al GSO.</p>
      )}
    </SectionCard>
  );
}
