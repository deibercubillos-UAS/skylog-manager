'use client';

// Skylog V2.0 — Flota & Equipo: Tripulación. Roster sobre `people`/
// `memberships` (30-entidades.md §2 — Cuenta/Persona/Membresía, construidas
// en F5). El certificado médico es de la PERSONA, no de la membresía —
// editarlo aquí lo actualiza para toda organización donde esa persona esté
// vinculada, a propósito (mismo criterio ya documentado en el esquema).
// "Agregar tripulante" reutiliza la Persona si ya existe (por documento o
// correo) en vez de duplicarla — el problema real que 30-entidades.md
// documenta como E1 en la plataforma actual.

import { Fragment, useCallback, useEffect, useState } from 'react';
import { Field, Button } from '@skylog/ui';
import { SectionHero, StatCard } from '../../_components/SectionHero';

const ROLE_LABELS = { admin: 'Gerente General', jefe_pilotos: 'Jefe de Pilotos', gerente_sms: 'Gerente SMS', piloto: 'Piloto', superadmin: 'Superadmin' };
const ASSIGNABLE_ROLES = ['admin', 'jefe_pilotos', 'gerente_sms', 'piloto'];
const DOCUMENT_TYPES = ['CC', 'CE', 'Pasaporte'];

function certStatus(expiry) {
  if (!expiry) return { label: 'Sin registrar', tone: 'navy' };
  const days = Math.ceil((new Date(expiry) - new Date()) / 86_400_000);
  if (days < 0) return { label: 'Vencido', tone: 'red', days };
  if (days <= 30) return { label: `Vence en ${days}d`, tone: 'amber', days };
  return { label: 'Vigente', tone: 'emerald', days };
}

const TONE_CLASS = {
  emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  amber: 'bg-amber-50 text-amber-600 border-amber-100',
  red: 'bg-red-50 text-red-600 border-red-100',
  navy: 'bg-navy-50 text-navy-400 border-navy-100',
};

const emptyForm = { fullName: '', documentType: 'CC', documentNumber: '', email: '', phone: '', licenseNumber: '', medicalCertExpiry: '', role: 'piloto' };

export default function TripulacionPage() {
  const [context, setContext] = useState(null);
  const [organizationId, setOrganizationId] = useState('');
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(null);

  const currentOrg = context?.organizations?.find((o) => o.id === organizationId);
  const isManager = !!currentOrg?.isDutyManager;

  const loadRoster = useCallback(async (orgId) => {
    if (!orgId) return;
    const res = await fetch(`/api/flota/roster?organizationId=${orgId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error cargando la tripulación');
    setRoster(data.roster || []);
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
    if (organizationId) loadRoster(organizationId).catch((e) => setError(e.message));
  }, [organizationId, loadRoster]);

  async function handleAddMember(e) {
    e.preventDefault();
    if (!organizationId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/flota/roster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error agregando el tripulante');
      setForm(emptyForm);
      setShowForm(false);
      await loadRoster(organizationId);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  function startEdit(m) {
    setEditingId(m.id);
    setEditForm({
      documentType: m.person.document_type || 'CC',
      documentNumber: m.person.document_number || '',
      email: m.person.email || '',
      phone: m.person.phone || '',
      licenseNumber: m.person.license_number || '',
      medicalCertExpiry: m.person.medical_cert_expiry || '',
      role: m.role,
    });
  }

  async function handleSaveEdit(m) {
    setBusy(true);
    setError(null);
    try {
      const personRes = await fetch(`/api/flota/roster/${m.person.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: editForm.documentType,
          documentNumber: editForm.documentNumber,
          email: editForm.email,
          phone: editForm.phone,
          licenseNumber: editForm.licenseNumber,
          medicalCertExpiry: editForm.medicalCertExpiry || null,
        }),
      });
      const personData = await personRes.json();
      if (!personRes.ok) throw new Error(personData.error || 'Error actualizando la persona');

      if (isManager && editForm.role !== m.role) {
        const roleRes = await fetch(`/api/flota/roster/membership/${m.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: editForm.role }),
        });
        const roleData = await roleRes.json();
        if (!roleRes.ok) throw new Error(roleData.error || 'Error actualizando el rol');
      }

      setEditingId(null);
      await loadRoster(organizationId);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleCloseMembership(m) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/flota/roster/membership/${m.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ close: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error dando de baja al tripulante');
      await loadRoster(organizationId);
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
          <p className="text-xs font-black text-navy-300 uppercase tracking-widest animate-pulse">Cargando tripulación…</p>
        </div>
      </div>
    );
  }

  if (!context?.personId) {
    return (
      <div className="space-y-4">
        <SectionHero eyebrow="Flota & Equipo" title="Tripulación" description="Roster de la organización — persona, licencia y certificado médico." />
        <p className="text-sm text-navy-400">Esta cuenta no tiene todavía un registro de Persona vinculado.</p>
      </div>
    );
  }

  const roleCount = new Set(roster.map((m) => m.role)).size;
  const expiringSoon = roster.filter((m) => {
    const s = certStatus(m.person.medical_cert_expiry);
    return s.tone === 'amber';
  }).length;
  const expired = roster.filter((m) => certStatus(m.person.medical_cert_expiry).tone === 'red').length;

  return (
    <div className="space-y-6">
      <SectionHero
        eyebrow="Flota & Equipo"
        title="Tripulación"
        description="Roster de la organización — persona, licencia y certificado médico."
        metric={{ value: roster.length, label: 'Miembros activos' }}
        cta={
          isManager && (
            <Button onClick={() => setShowForm((s) => !s)}>
              <span className="material-symbols-outlined text-base align-middle mr-1">{showForm ? 'close' : 'add'}</span>
              {showForm ? 'Cerrar' : 'Agregar tripulante'}
            </Button>
          )
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon="groups" color="primary" label="Miembros activos" value={roster.length} />
        <StatCard icon="badge" color="blue" label="Roles distintos" value={roleCount} />
        <StatCard icon="warning" color={expiringSoon > 0 ? 'amber' : 'emerald'} label="Certificado por vencer" value={expiringSoon} />
        <StatCard icon="error" color={expired > 0 ? 'red' : 'emerald'} label="Certificado vencido" value={expired} />
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

      {showForm && isManager && (
        <form onSubmit={handleAddMember} className="bg-white rounded-[2rem] border border-navy-100 shadow-sm p-5">
          <p className="text-xs font-black uppercase text-navy-300 tracking-widest mb-4 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            Agregar tripulante
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <Field label="Nombre completo" value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} required />
            <Field as="select" label="Rol" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} required>
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </Field>
            <Field as="select" label="Tipo de documento" value={form.documentType} onChange={(e) => setForm((f) => ({ ...f, documentType: e.target.value }))}>
              {DOCUMENT_TYPES.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </Field>
            <Field label="Número de documento" value={form.documentNumber} onChange={(e) => setForm((f) => ({ ...f, documentNumber: e.target.value }))} />
            <Field label="Correo (opcional)" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            <Field label="Teléfono (opcional)" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            <Field label="N.º de licencia (opcional)" value={form.licenseNumber} onChange={(e) => setForm((f) => ({ ...f, licenseNumber: e.target.value }))} />
            <Field label="Vigencia certificado médico (opcional)" type="date" value={form.medicalCertExpiry} onChange={(e) => setForm((f) => ({ ...f, medicalCertExpiry: e.target.value }))} />
          </div>
          <p className="text-xs text-navy-400 -mt-2 mb-3">
            Si ya existe una persona con este documento o correo en otra organización, se vincula la misma — no se duplica.
          </p>
          <Button type="submit" disabled={busy || !form.fullName} className="w-full">
            {busy ? 'Guardando…' : 'Agregar tripulante'}
          </Button>
        </form>
      )}

      <div className="bg-white rounded-[2rem] border border-navy-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        <div className="px-6 py-3.5 border-b border-navy-50 bg-navy-50/30">
          <h3 className="font-black text-xs uppercase text-navy-300 tracking-widest">Tripulación</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-navy-50/50 text-xs font-black text-navy-300 uppercase tracking-widest">
                <th className="px-6 py-2.5">Nombre</th>
                <th className="px-6 py-2.5">Documento</th>
                <th className="px-6 py-2.5">Rol</th>
                <th className="px-6 py-2.5">Licencia</th>
                <th className="px-6 py-2.5">Certificado médico</th>
                <th className="px-6 py-2.5 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-50">
              {roster.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center opacity-40">
                    <span className="material-symbols-outlined text-5xl text-navy-300 mb-3 block">groups</span>
                    <p className="text-xs font-black uppercase tracking-widest text-navy-500">Sin tripulación registrada todavía</p>
                  </td>
                </tr>
              ) : (
                roster.map((m) => {
                  const isEditing = editingId === m.id;
                  const cert = certStatus(m.person.medical_cert_expiry);
                  const canEdit = isManager || context.personId === m.person.id;
                  return (
                    <Fragment key={m.id}>
                      <tr className="hover:bg-navy-50/40 transition-colors">
                        <td className="px-6 py-2.5 text-xs font-bold text-navy whitespace-nowrap">{m.person.full_name}</td>
                        <td className="px-6 py-2.5 text-xs font-semibold text-navy-500 whitespace-nowrap">
                          {m.person.document_number ? `${m.person.document_type || ''} ${m.person.document_number}` : '—'}
                        </td>
                        <td className="px-6 py-2.5 text-xs font-semibold text-navy-500 whitespace-nowrap">{ROLE_LABELS[m.role] || m.role}</td>
                        <td className="px-6 py-2.5 text-xs font-semibold text-navy-500 whitespace-nowrap">{m.person.license_number || '—'}</td>
                        <td className="px-6 py-2.5 whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase border ${TONE_CLASS[cert.tone]}`}>{cert.label}</span>
                        </td>
                        <td className="px-6 py-2.5 text-right whitespace-nowrap space-x-2">
                          {canEdit && (
                            <button type="button" onClick={() => (isEditing ? setEditingId(null) : startEdit(m))} className="text-xs font-bold text-primary-600 hover:text-primary-700">
                              {isEditing ? 'Cancelar' : 'Editar'}
                            </button>
                          )}
                          {isManager && (
                            <button type="button" disabled={busy} onClick={() => handleCloseMembership(m)} className="text-xs font-bold text-navy-400 hover:text-red-600">
                              Dar de baja
                            </button>
                          )}
                        </td>
                      </tr>
                      {isEditing && (
                        <tr>
                          <td colSpan={6} className="px-6 py-4 bg-navy-50/30">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4">
                              <Field as="select" label="Tipo de documento" value={editForm.documentType} onChange={(e) => setEditForm((f) => ({ ...f, documentType: e.target.value }))}>
                                {DOCUMENT_TYPES.map((d) => (
                                  <option key={d} value={d}>{d}</option>
                                ))}
                              </Field>
                              <Field label="Número de documento" value={editForm.documentNumber} onChange={(e) => setEditForm((f) => ({ ...f, documentNumber: e.target.value }))} />
                              {isManager ? (
                                <Field as="select" label="Rol" value={editForm.role} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}>
                                  {ASSIGNABLE_ROLES.map((r) => (
                                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                                  ))}
                                </Field>
                              ) : (
                                <div />
                              )}
                              <Field label="Correo" type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} />
                              <Field label="Teléfono" value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} />
                              <Field label="N.º de licencia" value={editForm.licenseNumber} onChange={(e) => setEditForm((f) => ({ ...f, licenseNumber: e.target.value }))} />
                              <Field label="Vigencia certificado médico" type="date" value={editForm.medicalCertExpiry} onChange={(e) => setEditForm((f) => ({ ...f, medicalCertExpiry: e.target.value }))} />
                            </div>
                            <Button type="button" onClick={() => handleSaveEdit(m)} disabled={busy} className="mt-1">
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
    </div>
  );
}
