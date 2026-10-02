'use client';

// Skylog V2.0 — SMS-F: Objetivos SMS (BSC) — vincula los objetivos de
// seguridad operacional declarados en la política con los indicadores SPI
// que los miden. Cierra el hallazgo de 17-implementacion-sms-uas.md §4:
// "los indicadores no son una lista suelta, son la medición de los
// objetivos declarados en la política". Ver 40-sms.md §5.9 sub-frente SMS-F.
import { useCallback, useEffect, useState } from 'react';
import { SectionHero, StatCard } from '../../_components/SectionHero';
import { Button } from '@skylog/ui';
import ObjectiveFormPanel from './_ObjectiveFormPanel';

const MONTH_LABEL = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function SmsObjetivosPage() {
  const [context, setContext] = useState(null);
  const [organizationId, setOrganizationId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [objectives, setObjectives] = useState([]);
  const [indicators, setIndicators] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  const currentOrg = context?.organizations?.find((o) => o.id === organizationId);
  const isManager = !!currentOrg?.isDutyManager;

  const loadAll = useCallback(async (orgId) => {
    if (!orgId) return;
    const [objectivesRes, indicatorsRes] = await Promise.all([
      fetch(`/api/sms/objectives?organizationId=${orgId}`),
      fetch(`/api/sms/indicators?organizationId=${orgId}`),
    ]);
    const [objectivesData, indicatorsData] = await Promise.all([objectivesRes.json(), indicatorsRes.json()]);
    if (objectivesRes.ok) setObjectives(objectivesData.objectives || []);
    if (indicatorsRes.ok) setIndicators((indicatorsData.indicators || []).filter((i) => i.active !== false));
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

  async function handleDelete(o) {
    if (!confirm(`¿Eliminar el objetivo "${o.title}"?`)) return;
    const res = await fetch(`/api/sms/objectives/${o.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    await loadAll(organizationId);
  }

  if (loading) return <p className="text-sm text-navy-400">Cargando…</p>;

  if (!context?.personId) {
    return (
      <div>
        <SectionHero eyebrow="SMS" title="Objetivos SMS" description="Objetivos de seguridad operacional vinculados a los indicadores que los miden." />
        <p className="text-sm text-navy-400 mt-4">Esta cuenta no tiene todavía un registro de Persona vinculado.</p>
      </div>
    );
  }

  const withIndicators = objectives.filter((o) => o.indicators?.length).length;

  return (
    <div className="space-y-6">
      <SectionHero
        eyebrow="SMS"
        title="Objetivos SMS"
        description="Balanced Scorecard — política, objetivos e indicadores vinculados, no listas sueltas (MAUT-5.0-22-017 §7.3.5.1)."
        cta={
          isManager && (
            <Button
              onClick={() => {
                setEditTarget(null);
                setShowForm(true);
              }}
            >
              <span className="material-symbols-outlined text-base align-middle mr-1">add</span>
              Nuevo objetivo
            </Button>
          )
        }
      />

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard icon="flag" color="primary" label="Objetivos activos" value={objectives.filter((o) => o.status === 'activo').length} />
        <StatCard icon="link" color="blue" label="Con indicador vinculado" value={withIndicators} />
        <StatCard icon="monitoring" color="violet" label="Indicadores disponibles" value={indicators.length} />
      </div>

      <div className="space-y-3">
        {objectives.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 text-center rounded-2xl border border-dashed border-navy-200 bg-navy-50/50 py-12 px-6">
            <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white shadow-sm text-navy-300">
              <span className="material-symbols-outlined text-2xl">flag</span>
            </span>
            <p className="text-sm font-semibold text-navy">Sin objetivos SMS todavía</p>
            {isManager && <p className="text-xs text-navy-400">Declara el primer objetivo y vincúlalo a uno o más indicadores SPI.</p>}
          </div>
        ) : (
          objectives.map((o) => (
            <div key={o.id} className="bg-white rounded-2xl border border-navy-100 p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="flex items-center justify-center w-11 h-11 rounded-xl shrink-0 shadow-sm bg-primary text-white">
                    <span className="material-symbols-outlined text-xl">flag</span>
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-navy">{o.title}</p>
                    {o.metric_description && <p className="text-xs text-navy-400 mt-0.5">{o.metric_description}</p>}
                    {o.target_value != null && (
                      <p className="text-xs text-navy-500 mt-0.5">
                        Meta: <span className="font-semibold">{o.target_value}</span> {o.target_unit}
                      </p>
                    )}
                  </div>
                </div>
                {isManager && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditTarget(o);
                        setShowForm(true);
                      }}
                      className="text-xs font-semibold text-primary-700 hover:underline"
                    >
                      Editar
                    </button>
                    <button type="button" onClick={() => handleDelete(o)} className="w-8 h-8 flex items-center justify-center rounded-full text-red-500 hover:bg-red-50">
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-navy-50">
                {o.indicators.length === 0 ? (
                  <p className="text-xs text-navy-300">Sin indicador vinculado todavía.</p>
                ) : (
                  o.indicators.map((ind) => (
                    <span key={ind.id} className="flex items-center gap-1.5 text-xs font-medium text-navy-600 bg-navy-50 rounded-full px-2.5 py-1.5">
                      <span className="material-symbols-outlined text-[14px] text-blue-500">monitoring</span>
                      {ind.name}
                      {ind.latest ? (
                        <span className="text-navy-400">
                          · {ind.latest.rate} ({MONTH_LABEL[ind.latest.month]} {ind.latest.year})
                        </span>
                      ) : (
                        <span className="text-navy-300">· sin datos mensuales</span>
                      )}
                    </span>
                  ))
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <ObjectiveFormPanel open={showForm} onClose={() => setShowForm(false)} organizationId={organizationId} objective={editTarget} indicators={indicators} onSaved={() => loadAll(organizationId)} />
    </div>
  );
}
