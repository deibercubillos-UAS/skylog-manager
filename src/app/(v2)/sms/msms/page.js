'use client';

// Skylog V2.0 — SMS-I: MSMS como documento vivo. Antes era un archivo que
// alguien subía a Manuales; esta pantalla lo genera 100% desde la
// configuración real del SMS (política, GSO, objetivos BSC, riesgo, SPI,
// capacitación) y lo publica como una versión en Manuales (decisión 135,
// categoría SMS) — que ya da versionado + acuses de lectura gratis. El
// archivo subido a mano sigue siendo válido para quien lo prefiera; esta
// es una vía adicional, no la única. Ver 40-sms.md §5.9 sub-frente SMS-I.
import { useCallback, useEffect, useState } from 'react';
import { SectionHero, StatCard } from '../../_components/SectionHero';
import { Button } from '@skylog/ui';

const MSMS_TITLE = 'MSMS — Manual del Sistema de Gestión de Seguridad Operacional';

function nextVersion(current) {
  const n = Number(current);
  if (Number.isFinite(n)) return (n + 1).toFixed(1);
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function SmsMsmsPage() {
  const [context, setContext] = useState(null);
  const [organizationId, setOrganizationId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [manual, setManual] = useState(null);
  const [generating, setGenerating] = useState(false);

  const currentOrg = context?.organizations?.find((o) => o.id === organizationId);
  const isManager = !!currentOrg?.isDutyManager;

  const loadManual = useCallback(async (orgId) => {
    if (!orgId) return;
    const res = await fetch(`/api/manuales?organizationId=${orgId}`);
    const data = await res.json();
    if (res.ok) setManual((data.manuales || []).find((m) => m.title === MSMS_TITLE) || null);
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
    if (organizationId) loadManual(organizationId);
  }, [organizationId, loadManual]);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const [policyRes, gsoRes, objectivesRes, matrixRes, hazardsRes, barriersRes, indicatorsRes, sessionsRes] = await Promise.all([
        fetch(`/api/sms/governance/policy?organizationId=${organizationId}`),
        fetch(`/api/sms/governance/gso?organizationId=${organizationId}`),
        fetch(`/api/sms/objectives?organizationId=${organizationId}`),
        fetch(`/api/sms/risk-matrix?organizationId=${organizationId}`),
        fetch(`/api/sms/hazards?organizationId=${organizationId}`),
        fetch(`/api/sms/barriers?organizationId=${organizationId}`),
        fetch(`/api/sms/indicators?organizationId=${organizationId}`),
        fetch(`/api/sms/training/sessions?organizationId=${organizationId}`),
      ]);
      const [policyData, gsoData, objectivesData, matrixData, hazardsData, barriersData, indicatorsData, sessionsData] = await Promise.all([
        policyRes.json(),
        gsoRes.json(),
        objectivesRes.json(),
        matrixRes.json(),
        hazardsRes.json(),
        barriersRes.json(),
        indicatorsRes.json(),
        sessionsRes.json(),
      ]);

      const { generateMsmsDocumentBlob } = await import('@/lib/v2/msmsDocument');
      const blob = await generateMsmsDocumentBlob(
        {
          policy: policyData.current || null,
          designation: gsoData.designation || null,
          objectives: objectivesData.objectives || [],
          riskMatrixConfigured: !!matrixData.riskMatrix?.tolerability?.length,
          hazards: hazardsData.hazards || [],
          barriers: barriersData.barriers || [],
          indicators: indicatorsData.indicators || [],
          trainingSessions: sessionsData.sessions || [],
        },
        { orgName: currentOrg?.name, logoUrl: currentOrg?.logoUrl }
      );

      const file = new File([blob], 'MSMS.pdf', { type: 'application/pdf' });
      const today = new Date().toISOString().slice(0, 10);
      const comments = 'Generado automáticamente desde la configuración vigente del SMS.';

      let res;
      if (manual) {
        const form = new FormData();
        form.set('version', nextVersion(manual.current_version));
        form.set('effectiveDate', today);
        form.set('comments', comments);
        form.set('file', file);
        res = await fetch(`/api/manuales/${manual.id}/versions`, { method: 'POST', body: form });
      } else {
        const form = new FormData();
        form.set('organizationId', organizationId);
        form.set('title', MSMS_TITLE);
        form.set('category', 'SMS');
        form.set('version', '1.0');
        form.set('effectiveDate', today);
        form.set('comments', comments);
        form.set('file', file);
        res = await fetch('/api/manuales', { method: 'POST', body: form });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error publicando el MSMS');
      await loadManual(organizationId);
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  }

  if (loading) return <p className="text-sm text-navy-400">Cargando…</p>;

  if (!context?.personId) {
    return (
      <div>
        <SectionHero eyebrow="SMS" title="MSMS" description="Manual del Sistema de Gestión de Seguridad Operacional, generado desde la configuración real." />
        <p className="text-sm text-navy-400 mt-4">Esta cuenta no tiene todavía un registro de Persona vinculado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHero
        eyebrow="SMS"
        title="MSMS"
        description="Manual del Sistema de Gestión de Seguridad Operacional — generado desde la política, GSO, objetivos, riesgo, SPI y capacitación vigentes, no un PDF suelto."
      />

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard icon="description" color="primary" label="Versión vigente" value={manual?.current_version || '—'} />
        <StatCard icon="event" color="blue" label="Publicada" value={manual?.current_effective_date ? new Date(`${manual.current_effective_date}T00:00:00`).toLocaleDateString('es-CO') : '—'} />
        <StatCard icon="check_circle" color="emerald" label="Leído por mí" value={manual?.acknowledged ? 'Sí' : 'No'} />
      </div>

      <div className="bg-white rounded-2xl border border-navy-100 p-5 space-y-3">
        <p className="text-sm text-navy-500">
          Cada vez que generas una nueva versión, se publica en <span className="font-semibold text-navy">Manuales</span> (categoría SMS) — con historial de
          versiones, acuse de lectura y notificación, exactamente igual que cualquier otro manual.
        </p>
        {isManager ? (
          <Button onClick={handleGenerate} disabled={generating}>
            <span className="material-symbols-outlined text-base align-middle mr-1">auto_awesome</span>
            {generating ? 'Generando…' : manual ? 'Generar nueva versión' : 'Generar el MSMS por primera vez'}
          </Button>
        ) : (
          <p className="text-xs text-navy-300">Solo un gestor puede generar una versión nueva del MSMS.</p>
        )}
        {manual && (
          <a href="/manuales" className="block text-xs font-semibold text-primary-700 hover:underline">
            Ver historial de versiones y seguimiento de lectura en Manuales →
          </a>
        )}
      </div>
    </div>
  );
}
