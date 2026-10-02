'use client';

// Skylog V2.0 — SMS-G: Reporte Mensual SMS — el paquete único que exige RAC
// 100 §100.535(a)(26): estadística de operaciones + indicadores SPI +
// reportes MOR del mes, con acuse real de envío. Antes eran 3 cosas
// separadas; esta página las agrega en un solo lugar (en vivo, sin
// persistir snapshot). Ver 40-sms.md §5.9 sub-frente SMS-G.
import { useCallback, useEffect, useState } from 'react';
import { SectionHero, StatCard } from '../../_components/SectionHero';
import { Button } from '@skylog/ui';

function currentPeriod() {
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1); // mes vencido por defecto
  return `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
}

export default function SmsReporteMensualPage() {
  const [context, setContext] = useState(null);
  const [organizationId, setOrganizationId] = useState('');
  const [period, setPeriod] = useState(currentPeriod());
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const currentOrg = context?.organizations?.find((o) => o.id === organizationId);
  const isManager = !!currentOrg?.isDutyManager;

  const loadReport = useCallback(async (orgId, p) => {
    if (!orgId || !p) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/sms/monthly-report?organizationId=${orgId}&period=${p}`);
    const data = await res.json();
    if (res.ok) setReport(data);
    else setError(data.error);
    setLoading(false);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/duty/context');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error cargando contexto');
        setContext(data);
        setOrganizationId(data.organizations?.[0]?.id || '');
      } catch (e) {
        setError(e.message);
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (organizationId) loadReport(organizationId, period);
  }, [organizationId, period, loadReport]);

  async function handleMarkSent() {
    setBusy(true);
    try {
      const res = await fetch('/api/sms/monthly-report/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, period, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await loadReport(organizationId, period);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!context) return <p className="text-sm text-navy-400">Cargando…</p>;

  if (!context.personId) {
    return (
      <div>
        <SectionHero eyebrow="SMS" title="Reporte Mensual SMS" description="Paquete único de estadística + SPI + MOR, RAC 100 §100.535(a)(26)." />
        <p className="text-sm text-navy-400 mt-4">Esta cuenta no tiene todavía un registro de Persona vinculado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHero
        eyebrow="SMS"
        title="Reporte Mensual SMS"
        description="Paquete único de estadística de operaciones + indicadores SPI + reportes MOR — RAC 100 §100.535(a)(26), primeros 5 días hábiles del mes vencido."
        cta={
          <input
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="text-sm rounded-xl px-3 py-2 bg-white/10 text-white border border-white/10 backdrop-blur-sm [color-scheme:dark]"
          />
        }
      />

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      {!isManager ? (
        <p className="text-sm text-navy-400">Solo un gestor puede ver el reporte mensual SMS.</p>
      ) : loading || !report ? (
        <p className="text-sm text-navy-400">Cargando…</p>
      ) : (
        <>
          <div
            className={`rounded-2xl border p-4 flex items-center justify-between gap-3 flex-wrap ${
              report.status ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
            }`}
          >
            {report.status ? (
              <p className="text-sm text-emerald-800">
                <span className="font-bold">Enviado</span> el {new Date(report.status.sent_at).toLocaleString('es-CO')} por {report.status.sentBy?.full_name || '—'}
                {report.status.notes && ` — ${report.status.notes}`}
              </p>
            ) : (
              <>
                <p className="text-sm text-amber-800">Este período aún no se ha marcado como enviado a la Aerocivil.</p>
                <div className="flex items-center gap-2">
                  <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notas (opcional)" className="text-sm border border-amber-300 rounded-lg px-3 py-1.5" />
                  <Button onClick={handleMarkSent} disabled={busy}>
                    {busy ? 'Guardando…' : 'Marcar como enviado'}
                  </Button>
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon="flight" color="primary" label="Vuelos del mes" value={report.operationalStats.totalFlights} />
            <StatCard icon="schedule" color="blue" label="Horas voladas" value={report.operationalStats.totalHours} />
            <StatCard icon="monitoring" color="violet" label="Indicadores con dato" value={report.indicators.length} />
            <StatCard icon="report" color="amber" label="Reportes MOR" value={report.morReports.length} />
          </div>

          <div className="bg-white rounded-2xl border border-navy-100 p-4">
            <p className="text-sm font-bold text-navy mb-3">1. Estadística de operaciones</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-navy-400 uppercase tracking-wide mb-1.5">Por tipo de misión</p>
                {Object.keys(report.operationalStats.byMissionType).length === 0 ? (
                  <p className="text-xs text-navy-300">Sin vuelos en el período.</p>
                ) : (
                  Object.entries(report.operationalStats.byMissionType).map(([k, v]) => (
                    <p key={k} className="text-xs text-navy-600">
                      {k}: <span className="font-semibold">{v}</span>
                    </p>
                  ))
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-navy-400 uppercase tracking-wide mb-1.5">Por condición visual</p>
                {Object.keys(report.operationalStats.byCondition).length === 0 ? (
                  <p className="text-xs text-navy-300">Sin vuelos en el período.</p>
                ) : (
                  Object.entries(report.operationalStats.byCondition).map(([k, v]) => (
                    <p key={k} className="text-xs text-navy-600">
                      {k}: <span className="font-semibold">{v}</span>
                    </p>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-navy-100 p-4">
            <p className="text-sm font-bold text-navy mb-3">2. Indicadores SPI</p>
            {report.indicators.length === 0 ? (
              <p className="text-xs text-navy-300">Sin datos mensuales registrados para este período.</p>
            ) : (
              <div className="space-y-1.5">
                {report.indicators.map((i, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-navy-600">{i.name}</span>
                    <span className="font-semibold text-navy">
                      {i.events} eventos · tasa {i.rate}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-navy-100 p-4">
            <p className="text-sm font-bold text-navy mb-3">3. Reportes MOR del período</p>
            {report.morReports.length === 0 ? (
              <p className="text-xs text-navy-300">Sin reportes MOR en este período.</p>
            ) : (
              <div className="space-y-2">
                {report.morReports.map((r) => (
                  <div key={r.id} className="border-b border-navy-50 pb-2">
                    <p className="text-sm text-navy">{r.description}</p>
                    <p className="text-xs text-navy-400">
                      {r.event_code} · {r.severity} · {r.identity_redacted ? 'Confidencial — identidad protegida' : r.reporter?.full_name || '—'} ·{' '}
                      {new Date(r.created_at).toLocaleDateString('es-CO')}
                      {r.filed_at ? ' · radicado' : ' · sin radicar'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
