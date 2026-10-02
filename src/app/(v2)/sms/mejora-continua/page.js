'use client';

// Skylog V2.0 — SMS-D: Mejora Continua — autoevaluación GAP del Apéndice 1
// de MAUT-5.0-22-017 (100 preguntas oficiales, personalizable por org).
// La pieza que más le faltaba a la Fase 3 (proceso proactivo real) del
// asistente de implantación (40-sms.md §5.9). Ver /sms/asistente —
// `mejora_continua` y `identificacion_peligros_proactiva` ahora pueden
// detectarse automáticamente desde esta misma tabla.
import { useCallback, useEffect, useState } from 'react';
import { SectionHero, StatCard } from '../../_components/SectionHero';
import { Button } from '@skylog/ui';
import AssessmentPanel from './_AssessmentPanel';
import QuestionsConfigPanel from './_QuestionsConfigPanel';

export default function SmsMejoraContinuaPage() {
  const [context, setContext] = useState(null);
  const [organizationId, setOrganizationId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [creating, setCreating] = useState(false);

  const currentOrg = context?.organizations?.find((o) => o.id === organizationId);
  const isManager = !!currentOrg?.isDutyManager;

  const loadAssessments = useCallback(async (orgId) => {
    if (!orgId) return;
    const res = await fetch(`/api/sms/gap/assessments?organizationId=${orgId}`);
    const data = await res.json();
    if (res.ok) setAssessments(data.assessments || []);
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
    if (organizationId) loadAssessments(organizationId);
  }, [organizationId, loadAssessments]);

  async function handleNewAssessment() {
    setCreating(true);
    try {
      const res = await fetch('/api/sms/gap/assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, assessmentDate: new Date().toISOString().slice(0, 10) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error creando la evaluación');
      await loadAssessments(organizationId);
      setSelectedAssessment(data.assessment);
    } catch (e) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(a) {
    if (!confirm('¿Eliminar esta evaluación y todas sus respuestas?')) return;
    const res = await fetch(`/api/sms/gap/assessments/${a.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    await loadAssessments(organizationId);
  }

  if (loading) return <p className="text-sm text-navy-400">Cargando…</p>;

  if (!context?.personId) {
    return (
      <div>
        <SectionHero eyebrow="SMS" title="Mejora Continua" description="Autoevaluación GAP del Apéndice 1." />
        <p className="text-sm text-navy-400 mt-4">Esta cuenta no tiene todavía un registro de Persona vinculado.</p>
      </div>
    );
  }

  const latest = assessments[0];

  return (
    <div className="space-y-6">
      <SectionHero
        eyebrow="SMS"
        title="Mejora Continua"
        description="Autoevaluación GAP del Apéndice 1 (MAUT-5.0-22-017) — 100 preguntas oficiales, personalizable por organización."
        cta={
          isManager && (
            <div className="flex items-center gap-2">
              <button onClick={() => setShowConfig(true)} type="button" className="px-4 py-2 rounded-xl text-sm font-semibold bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm border border-white/10">
                <span className="material-symbols-outlined text-base align-middle mr-1">checklist</span>
                Configurar preguntas
              </button>
              <Button onClick={handleNewAssessment} disabled={creating}>
                <span className="material-symbols-outlined text-base align-middle mr-1">add</span>
                {creating ? 'Creando…' : 'Nueva evaluación'}
              </Button>
            </div>
          )
        }
      />

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      {latest && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon="fact_check" color="primary" label="Última evaluación" value={`${latest.stats.pct.toFixed(0)}%`} />
          <StatCard icon="checklist" color="blue" label="Respondidas" value={latest.stats.total} />
          <StatCard icon="event" color="violet" label="Fecha" value={new Date(`${latest.assessment_date}T00:00:00`).toLocaleDateString('es-CO')} />
          <StatCard icon="history" color="emerald" label="Evaluaciones realizadas" value={assessments.length} />
        </div>
      )}

      <div className="space-y-3">
        {assessments.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 text-center rounded-2xl border border-dashed border-navy-200 bg-navy-50/50 py-12 px-6">
            <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white shadow-sm text-navy-300">
              <span className="material-symbols-outlined text-2xl">fact_check</span>
            </span>
            <p className="text-sm font-semibold text-navy">Sin autoevaluaciones GAP todavía</p>
            {isManager && <p className="text-xs text-navy-400">Crea la primera — no es necesario responder las 100 preguntas de una sola vez.</p>}
          </div>
        ) : (
          assessments.map((a, i) => {
            const prev = assessments[i + 1];
            const delta = prev ? a.stats.pct - prev.stats.pct : null;
            return (
              <div key={a.id} className="bg-white rounded-2xl border border-navy-100 p-4 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-start gap-3 min-w-0">
                  <span className="flex items-center justify-center w-11 h-11 rounded-xl shrink-0 shadow-sm bg-primary text-white">
                    <span className="material-symbols-outlined text-xl">fact_check</span>
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-navy truncate">{a.title || `Evaluación ${new Date(`${a.assessment_date}T00:00:00`).toLocaleDateString('es-CO')}`}</p>
                    <p className="text-xs text-navy-400 mt-0.5">
                      {a.stats.pct.toFixed(0)}% de cumplimiento · {a.stats.total} preguntas respondidas
                      {delta != null && (
                        <span className={`ml-1.5 font-semibold ${delta >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          ({delta >= 0 ? '+' : ''}
                          {delta.toFixed(0)} pts vs. anterior)
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button variant="ghost" onClick={() => setSelectedAssessment(a)}>
                    Abrir
                  </Button>
                  {isManager && (
                    <button type="button" onClick={() => handleDelete(a)} className="w-9 h-9 flex items-center justify-center rounded-full text-red-500 hover:bg-red-50">
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <AssessmentPanel
        open={!!selectedAssessment}
        onClose={() => setSelectedAssessment(null)}
        organizationId={organizationId}
        assessment={selectedAssessment}
        onSaved={() => loadAssessments(organizationId)}
      />
      <QuestionsConfigPanel open={showConfig} onClose={() => setShowConfig(false)} organizationId={organizationId} onChanged={() => loadAssessments(organizationId)} />
    </div>
  );
}
