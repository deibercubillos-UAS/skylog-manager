'use client';

// Skylog V2.0 — SMS, Matriz de peligros (tercera sección del grupo SMS).
// Sobre el catálogo de peligros ya existente (`hazards`, compartido con
// Evaluación de Riesgo) se definen controles, y de cada control se registran
// avances con evidencia (archivo PDF/imagen en R2). Permisos de la familia de
// riesgo: ver P1, gestionar P2.
import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { SectionHero, StatCard } from '../../_components/SectionHero';
import IconSelectField from '../../_components/IconSelectField';
import DocumentSlot from '../../_components/DocumentSlot';
import { Button } from '@skylog/ui';
import { fetchDutyContext, pickOrganizationId } from '@/lib/v2/dutyContextClient';

const STATUS = {
  pendiente: { label: 'Pendiente', cls: 'bg-navy-100 text-navy-500 border-navy-200' },
  en_progreso: { label: 'En progreso', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  implementado: { label: 'Implementado', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  verificado: { label: 'Verificado', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};
const STATUS_ORDER = ['pendiente', 'en_progreso', 'implementado', 'verificado'];
const TYPE_LABEL = { preventivo: 'Preventivo', mitigador: 'Mitigador', recuperacion: 'Recuperación' };

function fmtDate(d) {
  if (!d) return '—';
  return new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('es-CO');
}

export default function MatrizPeligrosPage() {
  const [context, setContext] = useState(null);
  const [organizationId, setOrganizationId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hazards, setHazards] = useState([]);
  const [controls, setControls] = useState([]);
  const [showControlForm, setShowControlForm] = useState(false);
  const [presetHazardId, setPresetHazardId] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [avance, setAvance] = useState({ note: '', pct: '' });
  const [busy, setBusy] = useState(false);
  const [showHazardForm, setShowHazardForm] = useState(false);
  const [hazardForm, setHazardForm] = useState({ description: '', source: '', missionType: '' });
  const [editHazardId, setEditHazardId] = useState(null); // id del peligro que se edita (null = nuevo)
  const [hazardBusy, setHazardBusy] = useState(false);
  const [hazardError, setHazardError] = useState(null);

  const currentOrg = context?.organizations?.find((o) => o.id === organizationId);
  const canView = (currentOrg?.permissions?.['P1'] || 'none') !== 'none';
  const isManager = currentOrg?.permissions?.['P2'] === 'edit';

  const loadData = useCallback(async (orgId) => {
    if (!orgId) return;
    const [hazRes, ctrlRes] = await Promise.all([fetch(`/api/sms/hazards?organizationId=${orgId}`), fetch(`/api/sms/hazard-controls?organizationId=${orgId}`)]);
    const [hazData, ctrlData] = await Promise.all([hazRes.json(), ctrlRes.json()]);
    if (hazRes.ok) setHazards(hazData.hazards || []);
    if (ctrlRes.ok) setControls(ctrlData.controls || []);
    else setError(ctrlData.error || 'Error cargando los controles');
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchDutyContext();
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error cargando contexto');
        setContext(data);
        setOrganizationId(pickOrganizationId(data));
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (organizationId && canView) loadData(organizationId).catch((e) => setError(e.message));
  }, [organizationId, canView, loadData]);

  function startNewHazard() {
    setEditHazardId(null);
    setHazardForm({ description: '', source: '', missionType: '' });
    setHazardError(null);
    setShowHazardForm(true);
  }

  function startEditHazard(h) {
    setEditHazardId(h.id);
    setHazardForm({ description: h.description || '', source: h.source || '', missionType: h.mission_type || '' });
    setHazardError(null);
    setShowHazardForm(true);
  }

  function closeHazardForm() {
    setShowHazardForm(false);
    setEditHazardId(null);
    setHazardForm({ description: '', source: '', missionType: '' });
    setHazardError(null);
  }

  async function handleSaveHazard(e) {
    e.preventDefault();
    setHazardBusy(true);
    setHazardError(null);
    try {
      const res = await fetch(editHazardId ? `/api/sms/hazards/${editHazardId}` : '/api/sms/hazards', {
        method: editHazardId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          editHazardId
            ? { description: hazardForm.description, source: hazardForm.source || null, missionType: hazardForm.missionType || null }
            : { organizationId, description: hazardForm.description, source: hazardForm.source || null, missionType: hazardForm.missionType || null },
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (editHazardId ? 'Error guardando el peligro' : 'Error registrando el peligro'));
      closeHazardForm();
      await loadData(organizationId);
    } catch (err) {
      setHazardError(err.message);
    } finally {
      setHazardBusy(false);
    }
  }

  async function changeStatus(control, status) {
    setControls((cs) => cs.map((c) => (c.id === control.id ? { ...c, status } : c))); // optimista
    const res = await fetch(`/api/sms/hazard-controls/${control.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error || 'No se pudo cambiar el estado');
      loadData(organizationId);
    }
  }

  async function handleDeleteHazard(h) {
    const n = byHazard(h.id).length;
    const extra = n > 0 ? ` y sus ${n} control${n === 1 ? '' : 'es'} (con avances y evidencias)` : '';
    if (!confirm(`¿Eliminar el peligro "${h.description.slice(0, 80)}"${extra}? También se borra su evaluación de riesgo. No se puede deshacer.`)) return;
    const res = await fetch(`/api/sms/hazards/${h.id}`, { method: 'DELETE' });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return setError(d.error || 'No se pudo eliminar el peligro');
    if (expandedId && byHazard(h.id).some((c) => c.id === expandedId)) setExpandedId(null);
    loadData(organizationId);
  }

  async function handleDeleteControl(control) {
    if (!confirm('¿Eliminar este control y todos sus avances?')) return;
    const res = await fetch(`/api/sms/hazard-controls/${control.id}`, { method: 'DELETE' });
    const d = await res.json();
    if (!res.ok) return setError(d.error);
    loadData(organizationId);
  }

  async function handleAddAvance(control) {
    if (!avance.note.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/sms/control-updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, controlId: control.id, note: avance.note, progressPct: avance.pct }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || 'Error registrando el avance');
      setAvance({ note: '', pct: '' });
      await loadData(organizationId);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteAvance(u) {
    if (!confirm('¿Eliminar este avance?')) return;
    const res = await fetch(`/api/sms/control-updates/${u.id}`, { method: 'DELETE' });
    const d = await res.json();
    if (!res.ok) return setError(d.error);
    loadData(organizationId);
  }

  if (loading) return <p className="text-sm text-navy-400">Cargando…</p>;

  if (!context?.personId || !canView) {
    return (
      <div>
        <SectionHero eyebrow="SMS" title="Matriz de peligros" description="Controles sobre cada peligro, con avances y evidencias." />
        <p className="text-sm text-navy-400 mt-4">
          {!context?.personId ? 'Esta cuenta no tiene todavía un registro de Persona vinculado.' : 'Tu rol no tiene acceso a la matriz de peligros.'}
        </p>
      </div>
    );
  }

  const byHazard = (hazardId) => controls.filter((c) => c.hazard_id === hazardId);
  const closedCount = controls.filter((c) => c.status === 'implementado' || c.status === 'verificado').length;
  const openCount = controls.length - closedCount;

  return (
    <div className="space-y-6">
      <SectionHero
        eyebrow="SMS"
        title="Matriz de peligros"
        description="Cada peligro del catálogo lleva sus controles, y de cada control se registran los avances y la evidencia que los respalda."
        cta={
          isManager && (
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" onClick={() => (showHazardForm && !editHazardId ? closeHazardForm() : startNewHazard())}>
                <span className="material-symbols-outlined text-base align-middle mr-1">report_problem</span>
                Nuevo peligro
              </Button>
              {hazards.length > 0 && (
                <Button
                  onClick={() => {
                    setPresetHazardId('');
                    setShowControlForm(true);
                  }}
                >
                  <span className="material-symbols-outlined text-base align-middle mr-1">add</span>
                  Nuevo control
                </Button>
              )}
            </div>
          )
        }
      />

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon="report_problem" label="Peligros" value={hazards.length} />
        <StatCard icon="shield" label="Controles" value={controls.length} />
        <StatCard icon="pending_actions" label="En curso o pendientes" value={openCount} />
        <StatCard icon="verified" label="Implementados" value={closedCount} />
      </div>

      {isManager && showHazardForm && (
        <form onSubmit={handleSaveHazard} className="rounded-2xl border border-navy-100 bg-white p-4 space-y-3">
          <p className="text-sm font-bold text-navy">{editHazardId ? 'Editar peligro' : 'Nuevo peligro'}</p>
          <div>
            <label className="text-xs font-medium text-navy-400 block mb-1">Peligro</label>
            <input
              value={hazardForm.description}
              onChange={(e) => setHazardForm((f) => ({ ...f, description: e.target.value }))}
              required
              className="w-full text-sm border border-navy-200 rounded-lg px-3 py-2"
              placeholder="Ej. Pérdida de enlace de control en zona urbana"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-navy-400 block mb-1">Origen (opcional)</label>
              <input
                value={hazardForm.source}
                onChange={(e) => setHazardForm((f) => ({ ...f, source: e.target.value }))}
                className="w-full text-sm border border-navy-200 rounded-lg px-3 py-2"
                placeholder="Ej. observación, reporte SMS, auditoría"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-navy-400 block mb-1">Descripción (opcional)</label>
              <input
                value={hazardForm.missionType}
                onChange={(e) => setHazardForm((f) => ({ ...f, missionType: e.target.value }))}
                className="w-full text-sm border border-navy-200 rounded-lg px-3 py-2"
                placeholder="Detalle o contexto del peligro"
              />
            </div>
          </div>
          {hazardError && <p className="text-xs text-red-600">{hazardError}</p>}
          <div className="flex gap-2">
            <Button type="submit" disabled={hazardBusy} className="text-xs px-3 py-1.5">
              {hazardBusy ? 'Guardando…' : editHazardId ? 'Guardar cambios' : 'Registrar peligro'}
            </Button>
            <Button type="button" variant="secondary" onClick={closeHazardForm} className="text-xs px-3 py-1.5">
              Cancelar
            </Button>
          </div>
        </form>
      )}

      {hazards.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 text-center rounded-2xl border border-dashed border-navy-200 bg-navy-50/50 py-12 px-6">
          <span className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white shadow-sm text-navy-300">
            <span className="material-symbols-outlined text-2xl">report_problem</span>
          </span>
          <p className="text-sm font-semibold text-navy">Aún no hay peligros en el catálogo</p>
          <p className="text-xs text-navy-400">{isManager ? 'Usa «Nuevo peligro» arriba para registrar el primero; luego le defines controles, avances y evidencias.' : 'Todavía no se han registrado peligros.'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {hazards.map((h) => {
            const list = byHazard(h.id);
            return (
              <div key={h.id} className="bg-white rounded-2xl border border-navy-100 overflow-hidden">
                <div className="px-4 py-3 bg-navy-50/40 border-b border-navy-50 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0 bg-amber-100 text-amber-600">
                      <span className="material-symbols-outlined text-xl">report_problem</span>
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-navy leading-snug">{h.description}</p>
                      {h.mission_type && <p className="text-xs text-navy-500 mt-0.5">{h.mission_type}</p>}
                      <p className="text-[11px] text-navy-400 mt-0.5">
                        {list.length} control{list.length === 1 ? '' : 'es'}
                        {h.source ? ` · origen: ${h.source}` : ''}
                      </p>
                    </div>
                  </div>
                  {isManager && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setPresetHazardId(h.id);
                          setShowControlForm(true);
                        }}
                        className="text-xs font-bold text-primary-700 hover:text-primary-800 flex items-center gap-1 whitespace-nowrap"
                      >
                        <span className="material-symbols-outlined text-base">add</span>
                        Control
                      </button>
                      <button type="button" onClick={() => startEditHazard(h)} className="w-7 h-7 flex items-center justify-center rounded-full text-navy-400 hover:bg-navy-50" aria-label="Editar peligro">
                        <span className="material-symbols-outlined text-base">edit</span>
                      </button>
                      <button type="button" onClick={() => handleDeleteHazard(h)} className="w-7 h-7 flex items-center justify-center rounded-full text-red-500 hover:bg-red-50" aria-label="Eliminar peligro">
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  )}
                </div>

                {list.length === 0 ? (
                  <p className="px-4 py-4 text-xs text-navy-300">Sin controles definidos para este peligro todavía.</p>
                ) : (
                  <ul className="divide-y divide-navy-50">
                    {list.map((c) => {
                      const expanded = expandedId === c.id;
                      return (
                        <li key={c.id} className="px-4 py-3">
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="flex items-start gap-2.5 min-w-0">
                              <span className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 bg-navy-50 text-navy-400">
                                <span className="material-symbols-outlined text-lg">shield</span>
                              </span>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-navy leading-snug">{c.description}</p>
                                <p className="text-[11px] text-navy-400 mt-0.5 flex flex-wrap gap-x-2">
                                  {c.control_type && <span>{TYPE_LABEL[c.control_type]}</span>}
                                  {c.responsible && <span>· {c.responsible}</span>}
                                  {c.due_date && <span>· vence {fmtDate(c.due_date)}</span>}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {isManager ? (
                                <select
                                  value={c.status}
                                  onChange={(e) => changeStatus(c, e.target.value)}
                                  className={`text-[11px] font-bold uppercase tracking-wide rounded-full border px-2.5 py-1 appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-300 ${STATUS[c.status].cls}`}
                                >
                                  {STATUS_ORDER.map((s) => (
                                    <option key={s} value={s}>
                                      {STATUS[s].label}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <span className={`text-[11px] font-bold uppercase tracking-wide rounded-full border px-2.5 py-1 ${STATUS[c.status].cls}`}>{STATUS[c.status].label}</span>
                              )}
                              {isManager && (
                                <button type="button" onClick={() => handleDeleteControl(c)} className="w-7 h-7 flex items-center justify-center rounded-full text-red-500 hover:bg-red-50" aria-label="Eliminar control">
                                  <span className="material-symbols-outlined text-base">delete</span>
                                </button>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setExpandedId(expanded ? null : c.id);
                              setAvance({ note: '', pct: '' });
                            }}
                            className="mt-2 text-xs font-semibold text-primary-700 hover:underline flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[15px]">{expanded ? 'expand_less' : 'timeline'}</span>
                            {c.updates.length > 0 ? `Avances (${c.updates.length})` : 'Registrar avance'}
                          </button>

                          {expanded && (
                            <div className="mt-3 pl-2 border-l-2 border-navy-100 space-y-3">
                              {c.updates.length === 0 && <p className="text-xs text-navy-300">Sin avances registrados todavía.</p>}
                              {c.updates.map((u) => (
                                <div key={u.id} className="bg-navy-50/40 rounded-xl p-3">
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-xs text-navy-700 whitespace-pre-wrap min-w-0">{u.note}</p>
                                    <div className="flex items-center gap-2 shrink-0">
                                      {u.progress_pct != null && <span className="text-[11px] font-bold text-primary-700 bg-primary-50 rounded-full px-2 py-0.5">{u.progress_pct}%</span>}
                                      {isManager && (
                                        <button type="button" onClick={() => handleDeleteAvance(u)} className="text-navy-300 hover:text-red-600" aria-label="Eliminar avance">
                                          <span className="material-symbols-outlined text-[16px]">close</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <p className="text-[11px] text-navy-400 mt-1">{new Date(u.created_at).toLocaleDateString('es-CO')}</p>
                                  <div className="mt-2">
                                    <DocumentSlot
                                      label="Evidencia"
                                      endpoint={`/api/sms/control-updates/${u.id}/evidence`}
                                      has={u.has_evidence}
                                      canUpload={isManager}
                                      canView
                                      onChanged={() => loadData(organizationId)}
                                    />
                                  </div>
                                </div>
                              ))}

                              {isManager && (
                                <div className="bg-white border border-navy-100 rounded-xl p-3 space-y-2">
                                  <textarea
                                    value={avance.note}
                                    onChange={(e) => setAvance((a) => ({ ...a, note: e.target.value }))}
                                    rows={2}
                                    placeholder="Describe el avance del control…"
                                    className="w-full text-sm bg-white border border-navy-200 rounded-lg px-3 py-2 placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-primary-300"
                                  />
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <label className="flex items-center gap-1.5 text-xs text-navy-500">
                                      Avance
                                      <input
                                        type="number"
                                        min="0"
                                        max="100"
                                        value={avance.pct}
                                        onChange={(e) => setAvance((a) => ({ ...a, pct: e.target.value }))}
                                        placeholder="%"
                                        className="w-16 text-sm bg-white border border-navy-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-300"
                                      />
                                      %
                                    </label>
                                    <Button onClick={() => handleAddAvance(c)} disabled={busy || !avance.note.trim()} className="text-sm">
                                      <span className="material-symbols-outlined text-base align-middle mr-1">add</span>
                                      {busy ? 'Guardando…' : 'Agregar avance'}
                                    </Button>
                                  </div>
                                  <p className="text-[11px] text-navy-400">Tras agregar el avance podrás adjuntar la evidencia (PDF o imagen) en su tarjeta.</p>
                                </div>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ControlFormDialog
        open={showControlForm}
        onClose={() => setShowControlForm(false)}
        organizationId={organizationId}
        hazards={hazards}
        presetHazardId={presetHazardId}
        onSaved={() => loadData(organizationId)}
      />
    </div>
  );
}

// Ventana flotante para definir un control — patrón de diálogo de BitaFly.
function ControlFormDialog({ open, onClose, organizationId, hazards, presetHazardId, onSaved }) {
  const [form, setForm] = useState({ hazardId: '', description: '', controlType: '', responsible: '', dueDate: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setForm({ hazardId: presetHazardId || '', description: '', controlType: '', responsible: '', dueDate: '' });
    setError(null);
  }, [open, presetHazardId]);

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
      const res = await fetch('/api/sms/hazard-controls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error guardando el control');
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  const dialog = (
    <div className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center bg-navy/50 backdrop-blur-sm p-0 sm:p-4" role="dialog" aria-modal="true" aria-label="Nuevo control" onClick={onClose}>
      <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()} className="bg-white w-full sm:max-w-xl max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl shadow-2xl">
        <header className="relative isolate overflow-hidden bg-gradient-to-br from-navy via-navy to-[#0f1420] text-white px-5 py-4 rounded-t-3xl">
          <div className="absolute -right-10 -top-14 w-44 h-44 rounded-full bg-primary/30 blur-3xl -z-10" aria-hidden="true" />
          <div className="flex items-start gap-3">
            <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 border border-white/15 shrink-0">
              <span className="material-symbols-outlined text-xl text-primary-200">shield</span>
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <p className="text-[11px] font-bold uppercase tracking-widest text-primary-300 leading-none mb-1">SMS · Matriz de peligros</p>
              <h2 className="font-black tracking-tight leading-tight text-lg">Nuevo control</h2>
              <p className="text-xs text-navy-300 mt-1">Una defensa sobre un peligro; luego registras sus avances y evidencias.</p>
            </div>
            <button type="button" onClick={onClose} aria-label="Cerrar" className="shrink-0 -mr-1.5 -mt-1 size-9 flex items-center justify-center rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors">
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>
          </div>
        </header>

        <div className="px-5 py-5 space-y-4">
          <IconSelectField icon="report_problem" label="Peligro" value={form.hazardId} onChange={(e) => setForm((f) => ({ ...f, hazardId: e.target.value }))} required>
            <option value="">Selecciona el peligro…</option>
            {hazards.map((h) => (
              <option key={h.id} value={h.id}>
                {h.description.length > 80 ? `${h.description.slice(0, 80)}…` : h.description}
              </option>
            ))}
          </IconSelectField>

          <label className="block text-xs font-bold uppercase tracking-wide text-navy-400">
            Control / defensa
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              required
              autoFocus
              placeholder="Ej. Lista de verificación de enlace C2 antes de cada vuelo"
              className="mt-1 w-full text-base md:text-sm bg-white border border-navy-200 rounded-xl px-3 py-2 normal-case font-normal text-navy placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </label>

          <IconSelectField icon="category" label="Tipo (opcional)" value={form.controlType} onChange={(e) => setForm((f) => ({ ...f, controlType: e.target.value }))}>
            <option value="">Sin especificar</option>
            <option value="preventivo">Preventivo</option>
            <option value="mitigador">Mitigador</option>
            <option value="recuperacion">Recuperación</option>
          </IconSelectField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block text-xs font-bold uppercase tracking-wide text-navy-400">
              Responsable (opcional)
              <input
                value={form.responsible}
                onChange={(e) => setForm((f) => ({ ...f, responsible: e.target.value }))}
                placeholder="Nombre o cargo"
                className="mt-1 w-full min-h-[44px] text-base md:text-sm bg-white border border-navy-200 rounded-xl px-3 normal-case font-normal text-navy placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
            </label>
            <label className="block text-xs font-bold uppercase tracking-wide text-navy-400">
              Fecha límite (opcional)
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                className="mt-1 w-full min-h-[44px] text-base md:text-sm bg-white border border-navy-200 rounded-xl px-3 normal-case font-normal text-navy focus:outline-none focus:ring-2 focus:ring-primary-300"
              />
            </label>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="min-h-[44px] px-4 rounded-xl border border-navy-200 text-sm font-bold text-navy-600 hover:bg-navy-50 transition-colors">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy || !form.hazardId || !form.description.trim()}
              className="min-h-[44px] px-4 rounded-xl text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 transition-colors inline-flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">save</span>
              {busy ? 'Guardando…' : 'Crear control'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );

  return typeof document === 'undefined' ? null : createPortal(dialog, document.body);
}
