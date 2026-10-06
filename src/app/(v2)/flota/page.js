'use client';

// Skylog V2.0 — Flota & Equipo, Fase 1: Modelo de UAS + Aeronave
// (30-entidades.md §3.1 · 31-esquema-datos.md §2). Primera pantalla real de
// este grupo del sidebar — antes solo mostraba "Próximamente" (ver
// 35-frontend.md §3.2b). Modelo y Aeronave son entidades separadas a
// propósito: la ficha técnica/programa de mantenimiento son del modelo, no
// de cada unidad — por eso "Nueva aeronave" pide elegir un modelo existente
// o crear uno nuevo, en vez de repetir la ficha por cada serie.
//
// Fase 1 deliberadamente NO incluye (siguientes fases, documentadas en
// 35-frontend.md §3.7): baterías, componentes, ETA, programa de
// mantenimiento por modelo ni eventos de mantenimiento — solo el catálogo
// mínimo real de modelo+aeronave que ya puede asignarse en Programación/
// Bitácora (missions.aircraft_id/flights.aircraft_id, columnas que existían
// sin FK desde F5/F4a y ahora sí apuntan a una tabla real).
//
// Editar aeronaves + "fuera de servicio" (a pedido explícito del usuario):
// tercer estado operacional, distinto de "en mantenimiento" (temporal) —
// una aeronave fuera de servicio NUNCA se borra ni pierde su historial de
// vuelos/mantenimiento (30-entidades.md: "dar de baja no borra la
// historia"), solo deja de contar como flota activa. Los selectores de
// Programación/Bitácora/Mantenimiento y el cálculo de vencimiento de
// `/flota/mantenimiento` la excluyen del lado del cliente — ver
// `../operacion/programacion/page.js`, `../operacion/bitacora/page.js` y
// `./mantenimiento/page.js`.

import { Fragment, useCallback, useEffect, useState } from 'react';
import { Field, Button } from '@skylog/ui';
import { SectionHero, SectionCard, StatCard } from '../_components/SectionHero';
import { computeSpecCompleteness } from '@skylog/domain';
import ModelSpecSheet from './_ModelSpecSheet';
import DocumentSlot from '../_components/DocumentSlot';

const CATEGORIES = [
  { key: 'ala_fija', label: 'Ala fija' },
  { key: 'ala_rotatoria', label: 'Ala rotatoria' },
  { key: 'mixta', label: 'Mixta' },
];
const CATEGORY_LABEL = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label]));

const STATUSES = [
  { key: 'disponible', label: 'Disponible' },
  { key: 'en_mantenimiento', label: 'En mantenimiento' },
  { key: 'fuera_de_servicio', label: 'Fuera de servicio' },
];
const STATUS_META = {
  disponible: { label: 'Disponible', tone: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
  en_mantenimiento: { label: 'En mantenimiento', tone: 'bg-amber-50 text-amber-600 border-amber-100' },
  fuera_de_servicio: { label: 'Fuera de servicio', tone: 'bg-navy-100 text-navy-500 border-navy-200' },
};

// Fase 3 — Documento de propiedad (100.535(1)): tipo de tenencia + un
// archivo real (PDF/imagen) subido al bucket privado `documents`. Sin
// tabla `documents` genérica todavía en V2 — la ruta vive directo en
// `aircraft.ownership_document_path` (ver ../../api/flota/aircraft/[id]/ownership-document).
const OWNERSHIP_TYPES = [
  { key: 'propiedad', label: 'Propiedad' },
  { key: 'arrendamiento', label: 'Arrendamiento' },
  { key: 'comodato', label: 'Comodato' },
];

export default function FlotaPage() {
  const [context, setContext] = useState(null);
  const [organizationId, setOrganizationId] = useState('');
  const [aircraft, setAircraft] = useState([]);
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [showNewModel, setShowNewModel] = useState(false);
  const [form, setForm] = useState({ modelId: '', serialNumber: '', ruasNumber: '' });
  const [modelForm, setModelForm] = useState({ brand: '', model: '', category: '' });
  const [modelBusy, setModelBusy] = useState(false);
  const [seedBusy, setSeedBusy] = useState(false);
  const [seedMessage, setSeedMessage] = useState(null);

  const [specModelId, setSpecModelId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const currentOrg = context?.organizations?.find((o) => o.id === organizationId);
  const isManager = !!currentOrg?.isDutyManager;

  const loadAircraft = useCallback(async (orgId) => {
    if (!orgId) return;
    const res = await fetch(`/api/flota/aircraft?organizationId=${orgId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error cargando la flota');
    setAircraft(data.aircraft || []);
  }, []);

  const loadModels = useCallback(async (orgId) => {
    if (!orgId) return;
    const res = await fetch(`/api/flota/models?organizationId=${orgId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error cargando modelos');
    setModels(data.models || []);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const ctxRes = await fetch('/api/duty/context');
        const ctx = await ctxRes.json();
        if (!ctxRes.ok) throw new Error(ctx.error || 'Error cargando contexto');
        setContext(ctx);
        const firstOrgId = ctx.organizations?.[0]?.id || '';
        setOrganizationId(firstOrgId);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!organizationId) return;
    Promise.all([loadAircraft(organizationId), loadModels(organizationId)]).catch((e) => setError(e.message));
  }, [organizationId, loadAircraft, loadModels]);

  async function handleCreateModel(e) {
    e.preventDefault();
    if (!organizationId) return;
    setModelBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/flota/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, ...modelForm, category: modelForm.category || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error registrando el modelo');
      await loadModels(organizationId);
      setForm((f) => ({ ...f, modelId: data.model.id }));
      setModelForm({ brand: '', model: '', category: '' });
      setShowNewModel(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setModelBusy(false);
    }
  }

  async function handleSeedDjiModels() {
    if (!organizationId) return;
    setSeedBusy(true);
    setSeedMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/flota/models/seed-dji', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error precargando el catálogo DJI');
      await loadModels(organizationId);
      const createdCount = data.created?.length || 0;
      setSeedMessage(
        createdCount > 0
          ? `Se agregaron ${createdCount} modelos DJI nuevos${data.skipped > 0 ? ` (${data.skipped} ya existían)` : ''}.`
          : 'El catálogo DJI ya estaba completo — no había modelos nuevos por agregar.'
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setSeedBusy(false);
    }
  }

  async function handleCreateAircraft(e) {
    e.preventDefault();
    if (!organizationId || !form.modelId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/flota/aircraft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error registrando la aeronave');
      setForm({ modelId: '', serialNumber: '', ruasNumber: '' });
      setShowForm(false);
      await loadAircraft(organizationId);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSetStatus(a, nextStatus) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/flota/aircraft/${a.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operational_status: nextStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error actualizando el estado');
      await loadAircraft(organizationId);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function startEdit(a) {
    setEditingId(a.id);
    setEditForm({
      serialNumber: a.serial_number || '',
      ruasNumber: a.ruas_number || '',
      firmwareVersion: a.firmware_version || '',
      operationalStatus: a.operational_status,
      ownershipType: a.ownership_type || '',
      ownershipReference: a.ownership_reference || '',
      actualWeightKg: a.actual_weight_kg ?? '',
    });
  }

  async function handleSaveEdit(id) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/flota/aircraft/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serial_number: editForm.serialNumber,
          ruas_number: editForm.ruasNumber || null,
          firmware_version: editForm.firmwareVersion || null,
          operational_status: editForm.operationalStatus,
          ownership_type: editForm.ownershipType || null,
          ownership_reference: editForm.ownershipReference || null,
          actual_weight_kg: editForm.actualWeightKg === '' ? null : Number(editForm.actualWeightKg),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error actualizando la aeronave');
      setEditingId(null);
      await loadAircraft(organizationId);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleUploadOwnershipDocument(id, file) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/flota/aircraft/${id}/ownership-document`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error subiendo el documento');
      await loadAircraft(organizationId);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center py-24">
        <div className="text-center space-y-3">
          <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-black text-navy-300 uppercase tracking-widest animate-pulse">Cargando flota…</p>
        </div>
      </div>
    );
  }

  if (!context?.personId) {
    return (
      <div className="space-y-4">
        <SectionHero eyebrow="Flota & Equipo" title="Aeronaves" description="Catálogo de modelos y unidades físicas de la flota." />
        <p className="text-sm text-navy-400">Esta cuenta no tiene todavía un registro de Persona vinculado.</p>
      </div>
    );
  }

  const available = aircraft.filter((a) => a.operational_status === 'disponible').length;
  const inMaintenance = aircraft.filter((a) => a.operational_status === 'en_mantenimiento').length;
  const outOfService = aircraft.filter((a) => a.operational_status === 'fuera_de_servicio').length;
  const activeCount = aircraft.length - outOfService;

  return (
    <div className="space-y-6">
      <SectionHero
        eyebrow="Flota & Equipo"
        title="Aeronaves"
        description="Catálogo de modelos y unidades físicas de la flota."
        metric={{ value: activeCount, label: 'Flota activa' }}
        cta={
          isManager && (
            <Button onClick={() => setShowForm((s) => !s)}>
              <span className="material-symbols-outlined text-base align-middle mr-1">{showForm ? 'close' : 'add'}</span>
              {showForm ? 'Cerrar' : 'Nueva aeronave'}
            </Button>
          )
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon="flight" color="primary" label="Flota activa" value={activeCount} />
        <StatCard icon="check_circle" color="emerald" label="Disponibles" value={available} />
        <StatCard icon="build" color={inMaintenance > 0 ? 'amber' : 'emerald'} label="En mantenimiento" value={inMaintenance} />
        <StatCard icon="block" color={outOfService > 0 ? 'navy' : 'emerald'} label="Fuera de servicio" value={outOfService} />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

      {showForm && isManager && (
        <form onSubmit={handleCreateAircraft} className="bg-white rounded-[2rem] border border-navy-100 shadow-sm p-5">
          <p className="text-xs font-black uppercase text-navy-300 tracking-widest mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            Nueva aeronave
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <div>
              <Field as="select" label="Modelo" value={form.modelId} onChange={(e) => setForm((f) => ({ ...f, modelId: e.target.value }))} required>
                <option value="">Selecciona…</option>
                {models.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.brand} {m.model}
                    {m.category ? ` — ${CATEGORY_LABEL[m.category]}` : ''}
                  </option>
                ))}
              </Field>
              {!showNewModel ? (
                <div className="flex flex-wrap items-center gap-3 -mt-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setShowNewModel(true)}
                    className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-base">add_circle</span>
                    Registrar un modelo nuevo
                  </button>
                  <button
                    type="button"
                    onClick={handleSeedDjiModels}
                    disabled={seedBusy}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-base">{seedBusy ? 'progress_activity' : 'download_done'}</span>
                    {seedBusy ? 'Cargando…' : 'Cargar catálogo DJI'}
                  </button>
                  {seedMessage && <p className="text-xs text-navy-400 w-full">{seedMessage}</p>}
                </div>
              ) : (
                <div className="rounded-2xl border border-navy-100 bg-navy-50/30 p-3 mb-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
                    <Field label="Marca" value={modelForm.brand} onChange={(e) => setModelForm((f) => ({ ...f, brand: e.target.value }))} placeholder="Ej. DJI" />
                    <Field label="Modelo" value={modelForm.model} onChange={(e) => setModelForm((f) => ({ ...f, model: e.target.value }))} placeholder="Ej. Matrice 350 RTK" />
                  </div>
                  <Field as="select" label="Categoría (opcional)" value={modelForm.category} onChange={(e) => setModelForm((f) => ({ ...f, category: e.target.value }))}>
                    <option value="">Sin especificar</option>
                    {CATEGORIES.map((c) => (
                      <option key={c.key} value={c.key}>{c.label}</option>
                    ))}
                  </Field>
                  <div className="flex items-center gap-2">
                    <Button type="button" onClick={handleCreateModel} disabled={modelBusy || !modelForm.brand || !modelForm.model} className="text-xs px-3 py-1.5">
                      {modelBusy ? 'Guardando…' : 'Guardar modelo'}
                    </Button>
                    <button type="button" onClick={() => setShowNewModel(false)} className="text-xs text-navy-400 hover:text-navy-600">
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div>
              <Field
                label="Número de serie"
                value={form.serialNumber}
                onChange={(e) => setForm((f) => ({ ...f, serialNumber: e.target.value }))}
                placeholder="Ej. 1ZNBH...."
                required
              />
              <Field
                label="N.º RUAS (opcional)"
                value={form.ruasNumber}
                onChange={(e) => setForm((f) => ({ ...f, ruasNumber: e.target.value }))}
              />
            </div>
          </div>

          <Button type="submit" disabled={busy || !form.modelId} className="w-full mt-1">
            {busy ? 'Registrando…' : 'Registrar aeronave'}
          </Button>
        </form>
      )}

      <div className="bg-white rounded-[2rem] border border-navy-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        <div className="px-6 py-3.5 border-b border-navy-50 bg-navy-50/30">
          <h3 className="font-black text-xs uppercase text-navy-300 tracking-widest">Flota</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-navy-50/50 text-xs font-black text-navy-300 uppercase tracking-widest">
                <th className="px-6 py-2.5">Modelo</th>
                <th className="px-6 py-2.5">Serie</th>
                <th className="px-6 py-2.5">RUAS</th>
                <th className="px-6 py-2.5">Horas</th>
                <th className="px-6 py-2.5">Estado</th>
                {isManager && <th className="px-6 py-2.5 text-right">Acción</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50">
              {aircraft.length === 0 ? (
                <tr>
                  <td colSpan={isManager ? 6 : 5} className="py-12 text-center opacity-40">
                    <span className="material-symbols-outlined text-5xl text-navy-300 mb-3 block">flight</span>
                    <p className="text-xs font-black uppercase tracking-widest text-navy-500">Sin aeronaves registradas todavía</p>
                  </td>
                </tr>
              ) : (
                aircraft.map((a) => {
                  const isEditing = editingId === a.id;
                  const isOut = a.operational_status === 'fuera_de_servicio';
                  return (
                    <Fragment key={a.id}>
                      <tr className={`hover:bg-navy-50/40 transition-colors ${isOut ? 'opacity-60' : ''}`}>
                        <td className="px-6 py-2.5 text-xs font-bold text-navy whitespace-nowrap">
                          {a.model?.brand} {a.model?.model}
                        </td>
                        <td className="px-6 py-2.5 text-xs font-semibold text-navy-500 font-mono whitespace-nowrap">{a.serial_number}</td>
                        <td className="px-6 py-2.5 text-xs font-semibold text-navy-500 whitespace-nowrap">{a.ruas_number || '—'}</td>
                        <td className="px-6 py-2.5 text-xs font-black text-navy-700 tabular-nums whitespace-nowrap">{Number(a.total_hours).toFixed(1)}h</td>
                        <td className="px-6 py-2.5 whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase border ${STATUS_META[a.operational_status].tone}`}>
                            {STATUS_META[a.operational_status].label}
                          </span>
                        </td>
                        {isManager && (
                          <td className="px-6 py-2.5 text-right whitespace-nowrap space-x-2">
                            <button
                              type="button"
                              onClick={() => (isEditing ? setEditingId(null) : startEdit(a))}
                              className="text-xs font-bold text-primary-600 hover:text-primary-700"
                            >
                              {isEditing ? 'Cancelar' : 'Editar'}
                            </button>
                            {!isOut ? (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleSetStatus(a, 'fuera_de_servicio')}
                                className="text-xs font-bold text-navy-400 hover:text-red-600"
                              >
                                Fuera de servicio
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleSetStatus(a, 'disponible')}
                                className="text-xs font-bold text-navy-400 hover:text-emerald-600"
                              >
                                Reactivar
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                      {isEditing && (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 bg-navy-50/30">
                            <div className="grid grid-cols-1 sm:grid-cols-5 gap-x-4">
                              <Field label="Número de serie" value={editForm.serialNumber} onChange={(e) => setEditForm((f) => ({ ...f, serialNumber: e.target.value }))} />
                              <Field label="N.º RUAS" value={editForm.ruasNumber} onChange={(e) => setEditForm((f) => ({ ...f, ruasNumber: e.target.value }))} />
                              <Field label="Firmware" value={editForm.firmwareVersion} onChange={(e) => setEditForm((f) => ({ ...f, firmwareVersion: e.target.value }))} />
                              <Field type="number" step="any" min="0" label="Peso real (kg)" value={editForm.actualWeightKg} onChange={(e) => setEditForm((f) => ({ ...f, actualWeightKg: e.target.value }))} />
                              <Field as="select" label="Estado" value={editForm.operationalStatus} onChange={(e) => setEditForm((f) => ({ ...f, operationalStatus: e.target.value }))}>
                                {STATUSES.map((s) => (
                                  <option key={s.key} value={s.key}>{s.label}</option>
                                ))}
                              </Field>
                            </div>

                            <div className="mt-1 mb-2">
                              <DocumentSlot label="Foto de la aeronave" endpoint={`/api/flota/aircraft/${a.id}/image`} has={a.has_image} canUpload={isManager} onChanged={() => loadAircraft(organizationId)} />
                            </div>

                            <p className="text-xs font-black uppercase text-navy-300 tracking-widest mt-2 mb-2">Documento de propiedad — 100.535(1)</p>
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-x-4 items-end">
                              <Field as="select" label="Tipo de tenencia" value={editForm.ownershipType} onChange={(e) => setEditForm((f) => ({ ...f, ownershipType: e.target.value }))}>
                                <option value="">Sin especificar</option>
                                {OWNERSHIP_TYPES.map((t) => (
                                  <option key={t.key} value={t.key}>{t.label}</option>
                                ))}
                              </Field>
                              <Field
                                label="Referencia (contrato, factura…)"
                                value={editForm.ownershipReference}
                                onChange={(e) => setEditForm((f) => ({ ...f, ownershipReference: e.target.value }))}
                              />
                              <label className="mb-3 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-wide text-primary-700 bg-primary-50 border border-primary-100 rounded-lg px-3 py-2 cursor-pointer hover:bg-primary-100 transition-colors">
                                <span className="material-symbols-outlined text-base">upload_file</span>
                                {a.ownership_document_path ? 'Reemplazar archivo' : 'Subir archivo'}
                                <input
                                  type="file"
                                  accept=".pdf,image/png,image/jpeg,image/webp"
                                  className="hidden"
                                  onChange={(e) => handleUploadOwnershipDocument(a.id, e.target.files?.[0])}
                                />
                              </label>
                              {a.ownership_document_path && (
                                <a
                                  href={`/api/flota/aircraft/${a.id}/ownership-document`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mb-3 flex items-center justify-center gap-1.5 text-xs font-bold text-navy-500 hover:text-navy-700"
                                >
                                  <span className="material-symbols-outlined text-base">description</span>
                                  Ver documento cargado
                                </a>
                              )}
                            </div>

                            <Button type="button" onClick={() => handleSaveEdit(a.id)} disabled={busy} className="mt-1">
                              {busy ? 'Guardando…' : 'Guardar cambios'}
                            </Button>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <SectionCard icon="description" tile="bg-violet-500 text-white" wash="from-violet-50 to-white" title="Fichas técnicas de los modelos" description="Apéndice 1 Parte B del RAC 100: un dato por modelo, no por unidad">
        {models.length === 0 ? (
          <p className="text-sm text-navy-400">Aún no hay modelos. Se crean al registrar una aeronave.</p>
        ) : (
          <div className="space-y-2">
            {models.map((m) => {
              const c = computeSpecCompleteness(m);
              const open = specModelId === m.id;
              return (
                <div key={m.id} className="rounded-xl border border-navy-100 bg-white">
                  <button type="button" onClick={() => setSpecModelId(open ? null : m.id)} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-navy">{m.brand} {m.model}</p>
                      <p className="text-xs text-navy-400">{c.filled} de {c.total} atributos registrados</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="w-24 h-1.5 rounded-full bg-navy-50 overflow-hidden"><div className={`h-full ${c.pct >= 80 ? 'bg-emerald-500' : c.pct >= 40 ? 'bg-amber-500' : 'bg-red-400'}`} style={{ width: `${c.pct}%` }} /></div>
                      <span className="text-xs font-bold text-navy-500 tabular-nums w-9 text-right">{c.pct}%</span>
                      <span className="material-symbols-outlined text-base text-navy-300">{open ? 'expand_less' : 'expand_more'}</span>
                    </div>
                  </button>
                  {open && (
                    <div className="px-4 pb-4 pt-1 border-t border-navy-50">
                      <ModelSpecSheet
                        key={m.id}
                        model={m}
                        readOnly={!isManager}
                        onCancel={() => setSpecModelId(null)}
                        onDocumentChanged={() => loadModels(organizationId)}
                        onSaved={(saved) => {
                          setModels((prev) => prev.map((x) => (x.id === saved.id ? saved : x)));
                          setSpecModelId(null);
                        }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
