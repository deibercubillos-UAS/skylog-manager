'use client';

// Skylog V2.0 — Listas de Chequeo: biblioteca libre de checklists/
// procedimientos, a pedido explícito del usuario ("continuemos con la
// sección para crear las listas de chequeo"). Réplica funcional de la
// biblioteca libre "Protocolos" de v1 (2026-07-03, reorganizada en 4
// grupos el 2026-07-05) — mismas 4 categorías reales, sobre datos 100% V2.
// Deliberadamente SIN wiring a un flujo de Despacho todavía (esa pantalla
// no existe en V2) — es la biblioteca de definiciones, no la ejecución.
import { useCallback, useEffect, useState } from 'react';
import { SectionHero, StatCard } from '../_components/SectionHero';
import { Field, Button } from '@skylog/ui';
import { downloadChecklistPdf } from '@/lib/v2/checklistDocs';

const CATEGORIES = ['Prevuelo', 'Reportes', 'Seguridad Operacional', 'Mantenimiento'];

const CATEGORY_STYLE = {
  Prevuelo: { tile: 'bg-blue-500 text-white', wash: 'from-blue-50 to-white', statColor: 'blue' },
  Reportes: { tile: 'bg-violet-500 text-white', wash: 'from-violet-50 to-white', statColor: 'violet' },
  'Seguridad Operacional': { tile: 'bg-red-500 text-white', wash: 'from-red-50 to-white', statColor: 'red' },
  Mantenimiento: { tile: 'bg-amber-500 text-white', wash: 'from-amber-50 to-white', statColor: 'amber' },
};

const ICONS = ['checklist', 'task_alt', 'flight', 'warning', 'health_and_safety', 'description', 'build', 'inventory_2'];

const EMPTY_FORM = { name: '', category: CATEGORIES[0], description: '', icon: ICONS[0], steps: [''], version: '1.0' };

function ChecklistForm({ form, setForm, onSubmit, onCancel, busy, error, editing }) {
  return (
    <div className="bg-white rounded-2xl border border-navy-100 p-4">
      <p className="text-sm font-semibold text-navy mb-3">{editing ? 'Editar lista de chequeo' : 'Nueva lista de chequeo'}</p>
      <form onSubmit={onSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
        <Field label="Nombre" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ej. Verificación pre-vuelo" required />
        <Field as="select" label="Categoría" value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Field>
        <Field
          label="Versión"
          value={form.version}
          onChange={(e) => setForm((f) => ({ ...f, version: e.target.value }))}
          placeholder="Ej. 1.0"
        />
        <div className="sm:col-span-2">
          <Field label="Descripción breve (opcional)" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
        </div>

        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-navy-400 block mb-1.5">Ícono</label>
          <div className="flex flex-wrap gap-1.5">
            {ICONS.map((icon) => (
              <button
                key={icon}
                type="button"
                onClick={() => setForm((f) => ({ ...f, icon }))}
                className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-colors ${
                  form.icon === icon ? 'border-primary bg-primary/10 text-primary' : 'border-navy-200 text-navy-400 hover:border-navy-300'
                }`}
              >
                <span className="material-symbols-outlined text-lg">{icon}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="sm:col-span-2">
          <label className="text-xs font-medium text-navy-400 block mb-1.5">Pasos / ítems a verificar</label>
          <div className="space-y-1.5">
            {form.steps.map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-navy-300 w-5 shrink-0">{i + 1}.</span>
                <input
                  value={step}
                  onChange={(e) => setForm((f) => ({ ...f, steps: f.steps.map((s, si) => (si === i ? e.target.value : s)) }))}
                  placeholder={`Paso ${i + 1}`}
                  className="flex-1 text-sm border border-navy-200 rounded-lg px-2 py-1.5"
                />
                {form.steps.length > 1 && (
                  <button type="button" onClick={() => setForm((f) => ({ ...f, steps: f.steps.filter((_, si) => si !== i) }))} className="text-red-500 shrink-0">
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => setForm((f) => ({ ...f, steps: [...f.steps, ''] }))} className="text-xs text-primary-700 hover:underline">
              + Agregar paso
            </button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
        <div className="sm:col-span-2 flex items-center gap-2 mt-1">
          <Button type="submit" disabled={busy}>
            {busy ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear lista'}
          </Button>
          {editing && (
            <button type="button" onClick={onCancel} className="text-sm text-navy-400 hover:text-navy">
              Cancelar
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

function ChecklistCard({ checklist, isManager, orgName, logoUrl, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const style = CATEGORY_STYLE[checklist.category];
  const steps = checklist.steps || [];

  async function handleDownload() {
    setDownloading(true);
    try {
      await downloadChecklistPdf(checklist, { orgName, logoUrl });
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className={`rounded-2xl border border-navy-100 bg-gradient-to-br ${style.wash} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 shadow-sm ${style.tile}`}>
            <span className="material-symbols-outlined text-xl">{checklist.icon || 'checklist'}</span>
          </span>
          <div>
            <p className="text-sm font-semibold text-navy">{checklist.name}</p>
            {checklist.description && <p className="text-xs text-navy-400 mt-0.5">{checklist.description}</p>}
            <p className="text-xs text-navy-300 mt-0.5">
              v{checklist.version || '1.0'} · {steps.length} paso(s)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" onClick={handleDownload} disabled={downloading} title="Descargar PDF para imprimir" className="w-8 h-8 flex items-center justify-center rounded-full text-navy-400 hover:bg-white/60 hover:text-navy disabled:opacity-50">
            <span className="material-symbols-outlined text-lg">{downloading ? 'hourglass_empty' : 'picture_as_pdf'}</span>
          </button>
          {isManager && (
            <>
              <button type="button" onClick={() => onEdit(checklist)} title="Editar" className="w-8 h-8 flex items-center justify-center rounded-full text-navy-400 hover:bg-white/60 hover:text-navy">
                <span className="material-symbols-outlined text-lg">edit</span>
              </button>
              <button type="button" onClick={() => onDelete(checklist.id)} title="Eliminar" className="w-8 h-8 flex items-center justify-center rounded-full text-red-500 hover:bg-white/60">
                <span className="material-symbols-outlined text-lg">delete</span>
              </button>
            </>
          )}
        </div>
      </div>

      {steps.length > 0 && (
        <>
          <button type="button" onClick={() => setExpanded((e) => !e)} className="text-xs text-primary-700 hover:underline mt-2">
            {expanded ? 'Ocultar pasos' : 'Ver pasos'}
          </button>
          {expanded && (
            <ol className="list-decimal list-inside text-sm text-navy-500 mt-2 space-y-0.5">
              {steps.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  );
}

export default function ListasDeChequeoPage() {
  const [context, setContext] = useState(null);
  const [organizationId, setOrganizationId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [checklists, setChecklists] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState(null);

  const currentOrg = context?.organizations?.find((o) => o.id === organizationId);
  const isManager = !!currentOrg?.isDutyManager;

  const load = useCallback(async (orgId) => {
    if (!orgId) return;
    const res = await fetch(`/api/checklists?organizationId=${orgId}`);
    const data = await res.json();
    if (res.ok) setChecklists(data.checklists || []);
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
    if (organizationId) load(organizationId);
  }, [organizationId, load]);

  function startEdit(checklist) {
    setEditingId(checklist.id);
    setForm({
      name: checklist.name,
      category: checklist.category,
      description: checklist.description || '',
      icon: checklist.icon || ICONS[0],
      steps: checklist.steps?.length ? checklist.steps : [''],
      version: checklist.version || '1.0',
    });
    setShowForm(true);
    setFormError(null);
  }

  function cancelForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      const payload = { name: form.name, category: form.category, description: form.description, icon: form.icon, steps: form.steps, version: form.version };
      const res = editingId
        ? await fetch('/api/checklists', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingId, ...payload }) })
        : await fetch('/api/checklists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organizationId, ...payload }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error guardando la lista de chequeo');
      cancelForm();
      await load(organizationId);
    } catch (e) {
      setFormError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('¿Eliminar esta lista de chequeo?')) return;
    const res = await fetch(`/api/checklists?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    if (editingId === id) cancelForm();
    await load(organizationId);
  }

  if (loading) return <p className="text-sm text-navy-400">Cargando…</p>;

  if (!context?.personId) {
    return (
      <div>
        <SectionHero eyebrow="Documentación" title="Listas de Chequeo" description="Biblioteca de checklists y procedimientos." />
        <p className="text-sm text-navy-400 mt-4">Esta cuenta no tiene todavía un registro de Persona vinculado.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHero
        eyebrow="Documentación"
        title="Listas de Chequeo"
        description="Biblioteca de checklists y procedimientos — cada organización redacta los suyos."
        metric={{ value: checklists.length, label: 'Listas' }}
        cta={
          isManager && (
            <Button
              onClick={() => {
                if (showForm) cancelForm();
                else setShowForm(true);
              }}
            >
              <span className="material-symbols-outlined text-base align-middle mr-1">{showForm ? 'close' : 'add'}</span>
              {showForm ? 'Cerrar' : 'Nueva lista'}
            </Button>
          )
        }
      />

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {CATEGORIES.map((c) => (
          <StatCard key={c} icon="checklist" color={CATEGORY_STYLE[c].statColor} label={c} value={checklists.filter((ck) => ck.category === c).length} />
        ))}
      </div>

      {isManager && showForm && (
        <ChecklistForm form={form} setForm={setForm} onSubmit={handleSubmit} onCancel={cancelForm} busy={busy} error={formError} editing={!!editingId} />
      )}

      {CATEGORIES.map((category) => {
        const items = checklists.filter((c) => c.category === category);
        return (
          <div key={category}>
            <p className="text-xs font-bold uppercase tracking-wide text-navy-300 mb-2">{category}</p>
            {items.length === 0 ? (
              <p className="text-sm text-navy-300">Sin listas de chequeo en esta categoría todavía.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((c) => (
                  <ChecklistCard key={c.id} checklist={c} isManager={isManager} orgName={currentOrg?.name} logoUrl={currentOrg?.logoUrl} onEdit={startEdit} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
