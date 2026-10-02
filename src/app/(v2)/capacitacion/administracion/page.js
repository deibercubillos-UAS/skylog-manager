'use client';

// Skylog V2.0 — Capacitación, Administración. Área propia de gestores
// (Jefe de Pilotos/Gerente General/Gerente SMS): crear varias evaluaciones
// a través del tiempo por pista, cada una con su propia fecha límite, su
// propio material de apoyo y su propio banco de preguntas — a pedido
// explícito del usuario: "podemos tener varios examenes a través del
// tiempo, por ende debo poder poner fechas límites de realización de la
// evaluación... diferentes bancos de preguntas dependiendo del material de
// apoyo" (2026-09-26). Reemplaza el examen recurrente único por pista de la
// decisión 55/121.
import { useCallback, useEffect, useState } from 'react';
import { SectionHero } from '../../_components/SectionHero';
import { Field, Button } from '@skylog/ui';
import { TRAINING_TYPES, TRAINING_TYPE_LABELS } from '@/lib/v2/training';
import ComplianceRoster from './_ComplianceRoster';
import EvaluationManager from './_EvaluationManager';

const EMPTY_EVAL_FORM = { title: '', passingScore: 70, maxAttempts: 3, dueDate: '' };

function fmtDate(d) {
  if (!d) return '—';
  return new Date(`${d}T00:00:00`).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdministracionPage() {
  const [context, setContext] = useState(null);
  const [organizationId, setOrganizationId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('operaciones');
  const isAuditTab = activeTab === 'auditoria';
  const type = isAuditTab ? null : activeTab;

  const [evaluations, setEvaluations] = useState([]);
  const [selectedEvaluationId, setSelectedEvaluationId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [evalForm, setEvalForm] = useState(EMPTY_EVAL_FORM);
  const [evalBusy, setEvalBusy] = useState(false);
  const [evalError, setEvalError] = useState(null);

  const [roster, setRoster] = useState(null);
  const [rosterLoading, setRosterLoading] = useState(false);

  const currentOrg = context?.organizations?.find((o) => o.id === organizationId);
  const isManager = !!currentOrg?.isDutyManager;

  const loadEvaluations = useCallback(async (orgId, t) => {
    if (!orgId || !t) return;
    const res = await fetch(`/api/capacitacion/evaluations?organizationId=${orgId}&type=${t}`);
    const data = await res.json();
    if (res.ok) setEvaluations(data.evaluations || []);
  }, []);

  const loadRoster = useCallback(async (orgId) => {
    if (!orgId) return;
    setRosterLoading(true);
    try {
      const results = await Promise.all(TRAINING_TYPES.map((t) => fetch(`/api/capacitacion/compliance?organizationId=${orgId}&type=${t}`).then((r) => r.json())));
      const byPerson = new Map();
      TRAINING_TYPES.forEach((t, i) => {
        (results[i].roster || []).forEach((r) => {
          if (!byPerson.has(r.personId)) byPerson.set(r.personId, { personId: r.personId, fullName: r.fullName, byType: {} });
          byPerson.get(r.personId).byType[t] = r.compliance;
        });
      });
      setRoster(Array.from(byPerson.values()));
    } finally {
      setRosterLoading(false);
    }
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
    if (!organizationId || !type) return;
    setSelectedEvaluationId(null);
    setEditingId(null);
    setEvalForm(EMPTY_EVAL_FORM);
    loadEvaluations(organizationId, type);
  }, [organizationId, type, loadEvaluations]);

  useEffect(() => {
    if (organizationId) loadRoster(organizationId);
  }, [organizationId, loadRoster]);

  function startEdit(evaluation) {
    setEditingId(evaluation.id);
    setEvalForm({ title: evaluation.title, passingScore: evaluation.passing_score, maxAttempts: evaluation.max_attempts, dueDate: evaluation.due_date });
    // Editar también abre material + banco de preguntas de esa misma
    // evaluación — un solo botón para toda la edición, en vez de tener que
    // encontrar por separado el enlace "Gestionar material y preguntas".
    setSelectedEvaluationId(evaluation.id);
  }

  function cancelEdit() {
    setEditingId(null);
    setEvalForm(EMPTY_EVAL_FORM);
    setEvalError(null);
  }

  async function handleEvalSubmit(e) {
    e.preventDefault();
    setEvalBusy(true);
    setEvalError(null);
    try {
      const payload = {
        title: evalForm.title,
        passingScore: Number(evalForm.passingScore),
        maxAttempts: Number(evalForm.maxAttempts),
        dueDate: evalForm.dueDate,
      };
      const res = editingId
        ? await fetch('/api/capacitacion/evaluations', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: editingId, ...payload }),
          })
        : await fetch('/api/capacitacion/evaluations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ organizationId, type, ...payload }),
          });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error guardando la evaluación');
      cancelEdit();
      await loadEvaluations(organizationId, type);
    } catch (e) {
      setEvalError(e.message);
    } finally {
      setEvalBusy(false);
    }
  }

  async function handleEvalDelete(id) {
    if (!confirm('¿Eliminar esta evaluación? Se borrará también su material de apoyo y su banco de preguntas.')) return;
    setError(null);
    const res = await fetch(`/api/capacitacion/evaluations?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    if (selectedEvaluationId === id) setSelectedEvaluationId(null);
    if (editingId === id) cancelEdit();
    await loadEvaluations(organizationId, type);
  }

  if (loading) return <p className="text-sm text-navy-400">Cargando…</p>;

  if (!context?.personId) {
    return (
      <div>
        <SectionHero eyebrow="Documentación" title="Administración" description="Crear evaluaciones, cargar material de apoyo y verificar el cumplimiento del equipo." />
        <p className="text-sm text-navy-400 mt-4">Esta cuenta no tiene todavía un registro de Persona vinculado.</p>
      </div>
    );
  }

  if (!isManager) {
    return (
      <div>
        <SectionHero eyebrow="Documentación" title="Administración" description="Crear evaluaciones, cargar material de apoyo y verificar el cumplimiento del equipo." />
        <p className="text-sm text-navy-400 mt-4">Solo un gestor (Jefe de Pilotos, Gerente SMS, admin) puede administrar Capacitación.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHero
        eyebrow="Documentación"
        title="Administración de Capacitación"
        description="Crear evaluaciones, cargar material de apoyo y verificar el cumplimiento de la tripulación."
        cta={
          <a href="/capacitacion">
            <Button>
              <span className="material-symbols-outlined text-base align-middle mr-1">badge</span>
              Mi capacitación
            </Button>
          </a>
        }
      />

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex flex-wrap items-center gap-1.5">
        {TRAINING_TYPES.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setActiveTab(t)}
            className={`px-3 h-8 rounded-full text-sm font-medium border transition-colors ${
              activeTab === t ? 'border-primary bg-primary/10 text-primary-700' : 'border-navy-200 text-navy-400 hover:border-navy-300'
            }`}
          >
            {TRAINING_TYPE_LABELS[t]}
          </button>
        ))}
        <span className="w-px h-5 bg-navy-100 mx-1" />
        <button
          type="button"
          onClick={() => setActiveTab('auditoria')}
          className={`flex items-center gap-1.5 px-3 h-8 rounded-full text-sm font-medium border transition-colors ${
            isAuditTab ? 'border-navy bg-navy text-white' : 'border-navy-200 text-navy-400 hover:border-navy-300'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">fact_check</span>
          Auditoría
        </button>
      </div>

      {isAuditTab ? (
        <ComplianceRoster roster={roster} loading={rosterLoading} />
      ) : (
        <>
          {/* Nueva evaluación / editar */}
          <div className="bg-white rounded-2xl border border-navy-100 p-4">
            <p className="text-sm font-semibold text-navy">{editingId ? 'Editar evaluación' : 'Nueva evaluación'} — {TRAINING_TYPE_LABELS[type]}</p>
            <p className="text-xs text-navy-400 mb-3">Cada evaluación tiene su propia fecha límite, su propio material y su propio banco de preguntas.</p>

            <form onSubmit={handleEvalSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
              <Field label="Título" value={evalForm.title} onChange={(e) => setEvalForm((f) => ({ ...f, title: e.target.value }))} placeholder="Ej. Evaluación Trimestre 1 2026" required />
              <Field
                label="Fecha límite de realización"
                type="date"
                value={evalForm.dueDate}
                onChange={(e) => setEvalForm((f) => ({ ...f, dueDate: e.target.value }))}
                required
              />
              <Field
                label="Nota mínima para aprobar (%)"
                type="number"
                min="0"
                max="100"
                value={evalForm.passingScore}
                onChange={(e) => setEvalForm((f) => ({ ...f, passingScore: e.target.value }))}
                required
              />
              <Field
                label="Intentos permitidos"
                type="number"
                min="1"
                value={evalForm.maxAttempts}
                onChange={(e) => setEvalForm((f) => ({ ...f, maxAttempts: e.target.value }))}
                required
              />
              {evalError && <p className="text-sm text-red-600 sm:col-span-2 mb-2">{evalError}</p>}
              <div className="sm:col-span-2 flex items-center gap-2">
                <Button type="submit" disabled={evalBusy}>
                  {evalBusy ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear evaluación'}
                </Button>
                {editingId && (
                  <button type="button" onClick={cancelEdit} className="text-sm text-navy-400 hover:text-navy">
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Lista de evaluaciones de esta pista */}
          <div className="space-y-3">
            {evaluations.length === 0 ? (
              <p className="text-sm text-navy-300">Sin evaluaciones creadas todavía para {TRAINING_TYPE_LABELS[type]}.</p>
            ) : (
              evaluations.map((ev) => (
                <div key={ev.id} className={`bg-white rounded-2xl border p-4 ${editingId === ev.id ? 'border-primary ring-1 ring-primary/30' : 'border-navy-100'}`}>
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-sm font-semibold text-navy">{ev.title}</p>
                      <p className="text-xs text-navy-400 mt-0.5">
                        Fecha límite: {fmtDate(ev.due_date)} · Aprobar con {ev.passing_score}% · {ev.max_attempts} intento(s)
                      </p>
                      {editingId === ev.id && <p className="text-xs font-semibold text-primary-700 mt-1">Editando — usa el formulario de arriba ↑</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button type="button" onClick={() => startEdit(ev)} title="Editar" className="w-8 h-8 flex items-center justify-center rounded-full text-navy-400 hover:bg-navy-50 hover:text-navy">
                        <span className="material-symbols-outlined text-lg">edit</span>
                      </button>
                      <button type="button" onClick={() => handleEvalDelete(ev.id)} title="Eliminar" className="w-8 h-8 flex items-center justify-center rounded-full text-red-500 hover:bg-red-50">
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedEvaluationId(selectedEvaluationId === ev.id ? null : ev.id)}
                    className="text-xs text-primary-700 hover:underline mt-2"
                  >
                    {selectedEvaluationId === ev.id ? 'Ocultar material y preguntas' : 'Gestionar material y preguntas'}
                  </button>

                  {selectedEvaluationId === ev.id && <EvaluationManager evaluation={ev} onMaterialSaved={() => loadEvaluations(organizationId, type)} />}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
