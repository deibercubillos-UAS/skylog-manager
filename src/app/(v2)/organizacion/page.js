'use client';

// Skylog V2.0 — Organización. Datos de la empresa + certificación AeroCivil
// (CDO-U/OpSpecs) + roster de miembros con gestión de rol — a pedido
// explícito del usuario ("vamos con la mejora de la sección de
// organización"). Migrado al lenguaje visual moderno (`SectionHero`/
// `StatCard`) — Organización era una de las últimas páginas de V2 que
// seguía en `PageHero`/`@skylog/ui` puro.
import { useCallback, useEffect, useRef, useState } from 'react';
import { SectionHero, StatCard } from '../_components/SectionHero';
import { Field, Button } from '@skylog/ui';
import Designations from './_Designations';
import DangerousGoods from './_DangerousGoods';

const ROLE_LABELS = {
  admin: 'Gerente General',
  superadmin: 'Superadmin',
  jefe_pilotos: 'Jefe de Pilotos',
  gerente_sms: 'Gerente SMS',
  piloto: 'Piloto',
};

const ASSIGNABLE_ROLES = ['admin', 'jefe_pilotos', 'gerente_sms', 'piloto'];
const OPERATION_TYPE_OPTIONS = ['VLOS', 'EVLOS', 'BVLOS'];

// Mismo límite/formatos que valida `/api/organizacion/logo` — se repite
// aquí para poder rechazar en el cliente antes de disparar la petición.
const LOGO_MAX_BYTES = 2 * 1024 * 1024;
const LOGO_ALLOWED_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']);

function certStatus(expiresAt) {
  if (!expiresAt) return { label: 'Sin vigencia registrada', badge: 'bg-navy-50 text-navy-400' };
  const days = Math.ceil((new Date(`${expiresAt}T00:00:00`) - new Date()) / 86_400_000);
  if (days < 0) return { label: 'Vencida', badge: 'bg-red-50 text-red-700' };
  if (days <= 60) return { label: `Vence en ${days} día(s)`, badge: 'bg-amber-50 text-amber-700' };
  return { label: 'Vigente', badge: 'bg-emerald-50 text-emerald-700' };
}

export default function OrganizacionPage() {
  const [context, setContext] = useState(null);
  const [organizationId, setOrganizationId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [org, setOrg] = useState(null);
  const [orgForm, setOrgForm] = useState({ companyName: '', nit: '', domicile: '' });
  const [orgBusy, setOrgBusy] = useState(false);
  const [orgError, setOrgError] = useState(null);

  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState(null);
  const logoInputRef = useRef(null);

  const [cert, setCert] = useState(null);
  // `allowedOperationTypes` es el campo que de verdad gobierna qué se puede
  // programar (31-esquema-datos.md §1: "si BVLOS no está en
  // allowed_operation_types, el sistema no debe dejar programarlo") —
  // corrige un bug real: la versión anterior de este formulario escribía
  // el toggle VLOS/EVLOS/BVLOS en `allowedVisualContact`, dejando
  // `allowed_operation_types` (la columna que en teoría bloquea Programación)
  // sin poblar jamás. `allowedVisualContact` queda como columna existente
  // sin consumidor todavía — no se fabricó un significado nuevo para ella.
  const [certForm, setCertForm] = useState({ cdoNumber: '', cdoIssuedAt: '', expiresAt: '', allowedOperationTypes: [] });
  const [certBusy, setCertBusy] = useState(false);
  const [certError, setCertError] = useState(null);

  const [members, setMembers] = useState([]);
  const [roleBusyId, setRoleBusyId] = useState(null);
  const [roleError, setRoleError] = useState(null);

  const currentOrg = context?.organizations?.find((o) => o.id === organizationId);
  const isManager = !!currentOrg?.isDutyManager;

  const loadOrg = useCallback(async (orgId) => {
    if (!orgId) return;
    const res = await fetch(`/api/organizacion?organizationId=${orgId}`);
    const data = await res.json();
    if (res.ok) {
      setOrg(data.organization);
      setOrgForm({
        companyName: data.organization?.company_name || '',
        nit: data.organization?.nit || '',
        domicile: data.organization?.domicile || '',
      });
    }
  }, []);

  const loadCert = useCallback(async (orgId) => {
    if (!orgId) return;
    const res = await fetch(`/api/organizacion/certification?organizationId=${orgId}`);
    const data = await res.json();
    if (res.ok) {
      setCert(data.certification);
      setCertForm({
        cdoNumber: data.certification?.cdo_number || '',
        cdoIssuedAt: data.certification?.cdo_issued_at || '',
        expiresAt: data.certification?.expires_at || '',
        allowedOperationTypes: data.certification?.allowed_operation_types || [],
      });
    }
  }, []);

  const loadMembers = useCallback(async (orgId) => {
    if (!orgId) return;
    const res = await fetch(`/api/organizacion/members?organizationId=${orgId}`);
    const data = await res.json();
    if (res.ok) setMembers(data.members || []);
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
    if (!organizationId) return;
    loadOrg(organizationId);
    loadCert(organizationId);
    loadMembers(organizationId);
  }, [organizationId, loadOrg, loadCert, loadMembers]);

  async function handleOrgSubmit(e) {
    e.preventDefault();
    setOrgBusy(true);
    setOrgError(null);
    try {
      const res = await fetch('/api/organizacion', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, ...orgForm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error guardando los datos');
      setOrg(data.organization);
    } catch (e) {
      setOrgError(e.message);
    } finally {
      setOrgBusy(false);
    }
  }

  async function handleLogoChange(e) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite volver a subir el mismo archivo si falla
    if (!file || !organizationId) return;

    // Validación previa en el cliente — mismo límite/formatos que
    // `/api/organizacion/logo` (2 MB, PNG/JPEG/WEBP/SVG). Sin esto, un
    // archivo grande o de otro formato termina con un rechazo a nivel de
    // red antes de llegar a nuestra ruta ("Failed to fetch" — el mensaje
    // crudo del navegador, sin sentido para quien lo ve), en vez de un
    // error claro.
    if (!LOGO_ALLOWED_TYPES.has(file.type)) {
      setLogoError('Formato no soportado — usa PNG, JPEG, WEBP o SVG.');
      return;
    }
    if (file.size > LOGO_MAX_BYTES) {
      setLogoError(`El archivo pesa ${(file.size / 1024 / 1024).toFixed(1)} MB — el límite es 2 MB.`);
      return;
    }

    setLogoBusy(true);
    setLogoError(null);
    try {
      const formData = new FormData();
      formData.append('organizationId', organizationId);
      formData.append('file', file);
      const res = await fetch('/api/organizacion/logo', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error subiendo el logo');
      setOrg(data.organization);
    } catch (err) {
      // "Failed to fetch" es el TypeError crudo del navegador cuando la
      // petición nunca llegó a obtener respuesta (servidor caído, conexión
      // cortada) — se traduce a un mensaje que sí orienta a la persona.
      setLogoError(err instanceof TypeError ? 'No se pudo conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.' : err.message);
    } finally {
      setLogoBusy(false);
    }
  }

  async function handleCertSubmit(e) {
    e.preventDefault();
    setCertBusy(true);
    setCertError(null);
    try {
      const res = await fetch('/api/organizacion/certification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          cdoNumber: certForm.cdoNumber || null,
          cdoIssuedAt: certForm.cdoIssuedAt || null,
          expiresAt: certForm.expiresAt || null,
          allowedOperationTypes: certForm.allowedOperationTypes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error guardando la certificación');
      setCert(data.certification);
    } catch (e) {
      setCertError(e.message);
    } finally {
      setCertBusy(false);
    }
  }

  function toggleOperationType(v) {
    setCertForm((f) => ({
      ...f,
      allowedOperationTypes: f.allowedOperationTypes.includes(v) ? f.allowedOperationTypes.filter((x) => x !== v) : [...f.allowedOperationTypes, v],
    }));
  }

  async function handleRoleChange(personId, role) {
    setRoleBusyId(personId);
    setRoleError(null);
    try {
      const res = await fetch('/api/organizacion/members', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, personId, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error cambiando el rol');
      await loadMembers(organizationId);
    } catch (e) {
      setRoleError(e.message);
    } finally {
      setRoleBusyId(null);
    }
  }

  if (loading) return <p className="text-sm text-navy-400">Cargando…</p>;

  if (!context?.personId) {
    return (
      <div>
        <SectionHero eyebrow="Organización" title="Organización" description="Datos de la empresa y certificación AeroCivil." />
        <p className="text-sm text-navy-400 mt-4">Esta cuenta no tiene todavía un registro de Persona vinculado.</p>
      </div>
    );
  }

  const status = certStatus(cert?.expires_at);

  return (
    <div className="space-y-6">
      <SectionHero
        eyebrow="Organización"
        title={org?.company_name || 'Organización'}
        description="Datos de la empresa, certificación AeroCivil y miembros del equipo."
        metric={{ value: members.length, label: 'Miembros' }}
      />

      {context.organizations.length > 1 && (
        <Field as="select" label="Organización" value={organizationId} onChange={(e) => setOrganizationId(e.target.value)}>
          {context.organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </Field>
      )}

      {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon="groups" color="primary" label="Miembros activos" value={members.length} />
        <StatCard icon="admin_panel_settings" color="blue" label="Gestores" value={members.filter((m) => ASSIGNABLE_ROLES.includes(m.role) && m.role !== 'piloto').length} />
        <StatCard icon="badge" color="violet" label="CDO-U" value={cert?.cdo_number || '—'} />
        <StatCard icon="verified" color={status.badge.includes('red') ? 'red' : status.badge.includes('amber') ? 'amber' : status.badge.includes('emerald') ? 'emerald' : 'navy'} label="Vigencia CDO-U" value={status.label} />
      </div>

      {/* Datos de la empresa */}
      <div className="bg-white rounded-2xl border border-navy-100 p-4">
        <p className="text-sm font-semibold text-navy">Datos de la empresa</p>
        <p className="text-xs text-navy-400 mb-3">Razón social, NIT, domicilio y logo — el logo aparece en la esquina superior izquierda del menú.</p>

        <div className="flex items-center gap-3 mb-4">
          {org?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logo_url} alt={org.company_name} className="size-14 rounded-xl object-contain bg-navy-50 border border-navy-100 p-1.5" />
          ) : (
            <div className="size-14 rounded-xl bg-navy-50 border border-navy-100 flex items-center justify-center text-navy-300">
              <span className="material-symbols-outlined text-2xl">apartment</span>
            </div>
          )}
          {isManager && (
            <div>
              <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={handleLogoChange} />
              <Button type="button" variant="ghost" onClick={() => logoInputRef.current?.click()} disabled={logoBusy} className="text-xs px-3 py-1.5">
                {logoBusy ? 'Subiendo…' : org?.logo_url ? 'Cambiar logo' : 'Subir logo'}
              </Button>
              <p className="text-[11px] text-navy-300 mt-1">PNG, JPEG, WEBP o SVG — máx. 2 MB.</p>
              {logoError && <p className="text-xs text-red-600 mt-1">{logoError}</p>}
            </div>
          )}
        </div>

        {isManager ? (
          <form onSubmit={handleOrgSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <Field
              label="Razón social"
              value={orgForm.companyName}
              onChange={(e) => setOrgForm((f) => ({ ...f, companyName: e.target.value }))}
              className="sm:col-span-2"
              required
            />
            <Field label="NIT" value={orgForm.nit} onChange={(e) => setOrgForm((f) => ({ ...f, nit: e.target.value }))} />
            <Field label="Domicilio" value={orgForm.domicile} onChange={(e) => setOrgForm((f) => ({ ...f, domicile: e.target.value }))} />
            {orgError && <p className="text-sm text-red-600 sm:col-span-2 mb-2">{orgError}</p>}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={orgBusy}>
                {orgBusy ? 'Guardando…' : 'Guardar datos'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="text-sm text-navy-500 space-y-1">
            <p>
              <span className="text-navy-300">NIT:</span> {org?.nit || '—'}
            </p>
            <p>
              <span className="text-navy-300">Domicilio:</span> {org?.domicile || '—'}
            </p>
          </div>
        )}
      </div>

      {/* Certificación AeroCivil */}
      <div className="bg-white rounded-2xl border border-navy-100 p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-sm font-semibold text-navy">Certificación AeroCivil (CDO-U)</p>
            <p className="text-xs text-navy-400">Gobierna qué se puede programar — sin OpSpecs en PDF todavía (V2 no tiene carga de archivos aquí).</p>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${status.badge}`}>{status.label}</span>
        </div>

        {!cert && <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-3">Sin certificación registrada todavía.</p>}

        {isManager ? (
          <form onSubmit={handleCertSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            <Field label="Número CDO-U" value={certForm.cdoNumber} onChange={(e) => setCertForm((f) => ({ ...f, cdoNumber: e.target.value }))} />
            <Field
              label="Fecha de expedición"
              type="date"
              value={certForm.cdoIssuedAt}
              onChange={(e) => setCertForm((f) => ({ ...f, cdoIssuedAt: e.target.value }))}
            />
            <Field
              label="Fecha de vencimiento"
              type="date"
              value={certForm.expiresAt}
              onChange={(e) => setCertForm((f) => ({ ...f, expiresAt: e.target.value }))}
            />
            <div className="sm:col-span-2 mb-3">
              <span className="block text-xs font-medium text-navy-400 mb-1.5">Tipos de operación autorizados</span>
              <div className="flex flex-wrap gap-1.5">
                {OPERATION_TYPE_OPTIONS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => toggleOperationType(v)}
                    className={`px-3 h-8 rounded-full text-xs font-medium border transition-colors ${
                      certForm.allowedOperationTypes.includes(v) ? 'border-primary bg-primary/10 text-primary-700' : 'border-navy-200 text-navy-400 hover:border-navy-300'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            {certError && <p className="text-sm text-red-600 sm:col-span-2 mb-2">{certError}</p>}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={certBusy}>
                {certBusy ? 'Guardando…' : 'Guardar certificación'}
              </Button>
            </div>
          </form>
        ) : (
          cert && (
            <div className="text-sm text-navy-500 space-y-1">
              <p>
                <span className="text-navy-300">CDO-U:</span> {cert.cdo_number || '—'}
              </p>
              <p>
                <span className="text-navy-300">Vence:</span> {cert.expires_at || '—'}
              </p>
              <p>
                <span className="text-navy-300">Operaciones autorizadas:</span> {(cert.allowed_operation_types || []).join(', ') || '—'}
              </p>
            </div>
          )
        )}
      </div>

      <Designations organizationId={organizationId} members={members} />

      <DangerousGoods key={cert?.dangerous_goods_declared_at || 'none'} organizationId={organizationId} cert={cert} canSign={['admin', 'gerente_sms', 'superadmin'].includes(currentOrg?.role)} onSaved={() => loadCert(organizationId)} />

      {/* Miembros */}
      <div className="bg-white rounded-2xl border border-navy-100 overflow-hidden">
        <div className="p-4 pb-0">
          <p className="text-sm font-semibold text-navy">Miembros</p>
          <p className="text-xs text-navy-400 mb-3">{members.length} persona(s) con membresía activa.</p>
          {roleError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-1.5 mb-2">{roleError}</p>}
        </div>
        <div className="divide-y divide-navy-50">
          {members.length === 0 ? (
            <p className="text-sm text-navy-300 px-4 py-4">Sin miembros todavía.</p>
          ) : (
            members.map((m) => (
              <div key={m.person_id} className="flex items-center justify-between px-4 py-2.5 text-sm gap-3">
                <span className="font-medium text-navy truncate">{m.people?.full_name || m.person_id}</span>
                {isManager ? (
                  <select
                    value={m.role}
                    disabled={roleBusyId === m.person_id || m.role === 'superadmin'}
                    onChange={(e) => handleRoleChange(m.person_id, e.target.value)}
                    className="text-xs border border-navy-200 rounded-lg px-2 py-1 shrink-0 disabled:opacity-60"
                  >
                    {!ASSIGNABLE_ROLES.includes(m.role) && (
                      <option value={m.role} disabled>
                        {ROLE_LABELS[m.role] || m.role}
                      </option>
                    )}
                    {ASSIGNABLE_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-navy-400 shrink-0">{ROLE_LABELS[m.role] || m.role}</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
