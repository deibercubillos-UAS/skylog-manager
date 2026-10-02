'use client';

// Skylog V2.0 — SMS-C: asistente de implantación reconstruido sobre las 4
// fases OFICIALES de MAUT-5.0-22-017 (40-sms.md §5.9), reemplazando la
// secuencia de 5 fases inventada que tenía esta misma ruta (§5.2, corrección
// documentada 2026-09-30 — el archivo viejo de dominio no se borra, sigue
// citado desde la bitácora). El entregable real no es una barra de
// progreso: es el plan tipo Gantt (responsable + recursos + fechas, 12-24
// meses) que se radica ante la Aerocivil — la barra solo ayuda a verlo.
import { useCallback, useEffect, useState } from 'react';
import { SectionHero, StatCard } from '../../_components/SectionHero';
import { Button } from '@skylog/ui';
import { OFFICIAL_PHASES } from '@skylog/domain';
import TaskPanel from './_TaskPanel';

function fmtDate(d) {
  if (!d) return null;
  return new Date(`${d}T00:00:00`).toLocaleDateString('es-CO');
}

function addMonths(dateStr, months) {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setMonth(d.getMonth() + months);
  return d;
}

export default function SmsAsistentePage() {
  const [context, setContext] = useState(null);
  const [organizationId, setOrganizationId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [progress, setProgress] = useState(null);
  const [plan, setPlan] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [roster, setRoster] = useState([]);

  const [planForm, setPlanForm] = useState({ planStartDate: new Date().toISOString().slice(0, 10), horizonMonths: 18 });
  const [editingPlan, setEditingPlan] = useState(false);
  const [planBusy, setPlanBusy] = useState(false);
  const [planError, setPlanError] = useState(null);

  const [panelTarget, setPanelTarget] = useState(null); // { phase, element, existingTask }

  const currentOrg = context?.organizations?.find((o) => o.id === organizationId);
  const isManager = !!currentOrg?.isDutyManager;

  const loadAll = useCallback(async (orgId) => {
    if (!orgId) return;
    const [planRes, rosterRes] = await Promise.all([
      fetch(`/api/sms/implementation-plan?organizationId=${orgId}`),
      fetch(`/api/flota/roster?organizationId=${orgId}`),
    ]);
    const [planData, rosterData] = await Promise.all([planRes.json(), rosterRes.json()]);
    if (planRes.ok) {
      setProgress(planData.progress);
      setPlan(planData.plan);
      setTasks(planData.tasks || []);
      if (planData.plan) setPlanForm({ planStartDate: planData.plan.plan_start_date, horizonMonths: planData.plan.horizon_months });
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

  async function handlePlanSubmit(e) {
    e.preventDefault();
    setPlanBusy(true);
    setPlanError(null);
    try {
      const res = await fetch('/api/sms/implementation-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, ...planForm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error guardando el plan');
      setEditingPlan(false);
      await loadAll(organizationId);
    } catch (e) {
      setPlanError(e.message);
    } finally {
      setPlanBusy(false);
    }
  }

  function exportCsv() {
    const rows = [['Fase', 'Elemento', 'Responsable', 'Recursos', 'Inicio', 'Fin', 'Estado']];
    for (const phase of progress.phases) {
      for (const el of phase.elements) {
        const task = tasks.find((t) => t.element_key === el.key);
        const done = progress.elementStatus[el.key];
        rows.push([
          `Fase ${phase.key} — ${phase.label}`,
          el.label,
          task?.responsible?.full_name || task?.responsible_name || '',
          task?.resources || '',
          task?.start_date || '',
          task?.end_date || '',
          done ? 'Completa' : 'Pendiente',
        ]);
      }
    }
    for (const t of tasks.filter((t) => !t.element_key)) {
      rows.push([`Fase ${t.phase}`, t.label, t.responsible?.full_name || t.responsible_name || '', t.resources || '', t.start_date || '', t.end_date || '', t.manual_done ? 'Completa' : 'Pendiente']);
    }
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plan-implementacion-sms-${organizationId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <p className="text-sm text-navy-400">Cargando…</p>;

  if (!context?.personId) {
    return (
      <div>
        <SectionHero eyebrow="SMS" title="Asistente de implantación" description="Plan de implementación sobre las 4 fases oficiales de MAUT-5.0-22-017." />
        <p className="text-sm text-navy-400 mt-4">Esta cuenta no tiene todavía un registro de Persona vinculado.</p>
      </div>
    );
  }

  const planEnd = plan ? addMonths(plan.plan_start_date, plan.horizon_months) : null;

  return (
    <div className="space-y-6">
      <SectionHero
        eyebrow="SMS"
        title="Asistente de implantación"
        description="Plan de implementación sobre las 4 fases oficiales de MAUT-5.0-22-017 — el plan tipo Gantt que se radica ante la Aerocivil."
        cta={
          plan &&
          progress && (
            <Button onClick={exportCsv} variant="secondary">
              <span className="material-symbols-outlined text-base align-middle mr-1">download</span>
              Exportar CSV
            </Button>
          )
        }
      />

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      {!plan || editingPlan ? (
        isManager ? (
          <form onSubmit={handlePlanSubmit} className="bg-white rounded-2xl border border-navy-100 p-4 space-y-3">
            <p className="text-sm font-semibold text-navy">{plan ? 'Editar plan' : 'Definir el plan de implementación'}</p>
            <p className="text-xs text-navy-400">
              La circular exige un horizonte de 12 a 24 meses, con la Aerocivil aprobando el plan según el tamaño de la organización.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-navy-400 block mb-1">Fecha de inicio del plan</label>
                <input
                  type="date"
                  value={planForm.planStartDate}
                  onChange={(e) => setPlanForm((f) => ({ ...f, planStartDate: e.target.value }))}
                  required
                  className="w-full text-sm border border-navy-200 rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-navy-400 block mb-1">Horizonte (meses, 12-24)</label>
                <input
                  type="number"
                  min={12}
                  max={24}
                  value={planForm.horizonMonths}
                  onChange={(e) => setPlanForm((f) => ({ ...f, horizonMonths: Number(e.target.value) }))}
                  required
                  className="w-full text-sm border border-navy-200 rounded-lg px-3 py-2"
                />
              </div>
            </div>
            {planError && <p className="text-xs text-red-600">{planError}</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={planBusy}>
                {planBusy ? 'Guardando…' : 'Guardar plan'}
              </Button>
              {plan && (
                <Button type="button" variant="ghost" onClick={() => setEditingPlan(false)}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        ) : (
          <p className="text-sm text-navy-400">Solo un gestor puede definir el plan de implementación.</p>
        )
      ) : (
        <div className="bg-gradient-to-br from-navy-50 to-white border border-navy-100 rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-navy-500">
            Plan desde <span className="font-bold text-navy">{fmtDate(plan.plan_start_date)}</span> · horizonte{' '}
            <span className="font-bold text-navy">{plan.horizon_months} meses</span> · fin estimado{' '}
            <span className="font-bold text-navy">{planEnd.toLocaleDateString('es-CO')}</span>
          </p>
          {isManager && (
            <button type="button" onClick={() => setEditingPlan(true)} className="text-xs font-semibold text-primary-700 hover:underline">
              Editar
            </button>
          )}
        </div>
      )}

      {progress && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon="checklist" color="primary" label="Elementos completos" value={`${progress.totalDone}/${progress.totalElements}`} />
            {progress.phases.map((p) => (
              <StatCard key={p.key} icon={p.complete ? 'check_circle' : 'pending'} color={p.complete ? 'emerald' : 'amber'} label={`Fase ${p.key}`} value={`${p.doneCount}/${p.totalCount}`} />
            ))}
          </div>

          <div className="space-y-5">
            {progress.phases.map((phaseProgress) => {
              const phaseMeta = OFFICIAL_PHASES.find((p) => p.key === phaseProgress.key);
              const customTasks = tasks.filter((t) => !t.element_key && t.phase === phaseProgress.key);
              return (
                <div key={phaseProgress.key} className="bg-white rounded-2xl border border-navy-100 overflow-hidden">
                  <div className="flex items-center justify-between gap-3 px-4 py-3 bg-navy-50/60 border-b border-navy-100">
                    <div className="flex items-center gap-2">
                      <span className={`flex items-center justify-center w-8 h-8 rounded-lg shrink-0 font-bold text-sm ${phaseProgress.complete ? 'bg-emerald-500 text-white' : 'bg-navy text-white'}`}>
                        {phaseProgress.key}
                      </span>
                      <p className="text-sm font-bold text-navy">{phaseMeta.label}</p>
                    </div>
                    {isManager && (
                      <button
                        type="button"
                        onClick={() => setPanelTarget({ phase: phaseProgress.key, element: null, existingTask: null })}
                        className="text-xs font-semibold text-primary-700 hover:underline"
                      >
                        + Tarea personalizada
                      </button>
                    )}
                  </div>
                  <div className="divide-y divide-navy-50">
                    {phaseProgress.elements.map((el) => {
                      const done = progress.elementStatus[el.key];
                      const task = tasks.find((t) => t.element_key === el.key);
                      return (
                        <div key={el.key} className="flex items-center justify-between gap-3 px-4 py-3 flex-wrap">
                          <div className="flex items-start gap-2 min-w-0">
                            <span className={`material-symbols-outlined text-[18px] mt-0.5 ${done ? 'text-emerald-500' : 'text-navy-200'}`}>{done ? 'check_circle' : 'radio_button_unchecked'}</span>
                            <div className="min-w-0">
                              <p className="text-sm text-navy font-medium">{el.label}</p>
                              {task && (
                                <p className="text-xs text-navy-400 mt-0.5">
                                  {(task.responsible?.full_name || task.responsible_name) && <>{task.responsible?.full_name || task.responsible_name} · </>}
                                  {task.start_date && fmtDate(task.start_date)}
                                  {task.end_date && ` – ${fmtDate(task.end_date)}`}
                                  {task.resources && ` · ${task.resources}`}
                                </p>
                              )}
                              {!el.autoKey && !task?.manual_done && (
                                <span className="text-[10px] font-semibold text-navy-300 uppercase tracking-wide">manual</span>
                              )}
                              {el.autoKey && (
                                <span className="text-[10px] font-semibold text-navy-300 uppercase tracking-wide">detección automática</span>
                              )}
                            </div>
                          </div>
                          {isManager && (
                            <button
                              type="button"
                              onClick={() => setPanelTarget({ phase: phaseProgress.key, element: el, existingTask: task || null })}
                              className="text-xs font-semibold text-primary-700 hover:underline shrink-0"
                            >
                              {task ? 'Editar' : 'Agregar al plan'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {customTasks.map((t) => (
                      <div key={t.id} className="flex items-center justify-between gap-3 px-4 py-3 flex-wrap bg-primary-50/30">
                        <div className="flex items-start gap-2 min-w-0">
                          <span className={`material-symbols-outlined text-[18px] mt-0.5 ${t.manual_done ? 'text-emerald-500' : 'text-navy-200'}`}>{t.manual_done ? 'check_circle' : 'radio_button_unchecked'}</span>
                          <div className="min-w-0">
                            <p className="text-sm text-navy font-medium">{t.label}</p>
                            <p className="text-xs text-navy-400 mt-0.5">
                              {(t.responsible?.full_name || t.responsible_name) && <>{t.responsible?.full_name || t.responsible_name} · </>}
                              {t.start_date && fmtDate(t.start_date)}
                              {t.end_date && ` – ${fmtDate(t.end_date)}`}
                              {t.resources && ` · ${t.resources}`}
                            </p>
                            <span className="text-[10px] font-semibold text-primary-400 uppercase tracking-wide">tarea personalizada</span>
                          </div>
                        </div>
                        {isManager && (
                          <button type="button" onClick={() => setPanelTarget({ phase: phaseProgress.key, element: null, existingTask: t })} className="text-xs font-semibold text-primary-700 hover:underline shrink-0">
                            Editar
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <TaskPanel
        open={!!panelTarget}
        onClose={() => setPanelTarget(null)}
        organizationId={organizationId}
        phase={panelTarget?.phase}
        element={panelTarget?.element}
        existingTask={panelTarget?.existingTask}
        roster={roster}
        onSaved={() => loadAll(organizationId)}
      />
    </div>
  );
}
