'use client';

// Skylog V2.0 — Administración de socios (Etapa E1). Solo el superadmin de la plataforma: escuelas y asesores con su
// comisión, cupo de perfiles gratis, códigos de venta (personalizables), miembros e invitaciones.
import { useCallback, useEffect, useState } from 'react';
import { SectionHero, StatCard } from '../../_components/SectionHero';
import { Field, Button } from '@skylog/ui';

const EMPTY = { type: 'escuela', name: '', parent_partner_id: '', commission_pct: '10', free_seats_limit: '', free_days: '90', code: '' };
const INV_LABEL = { usable: 'Pendiente', usada: 'Aceptada', expirada: 'Vencida', revocada: 'Cancelada' };

async function api(method, body) {
  const res = await fetch('/api/admin/socios', { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'No se pudo completar la acción.');
  return data;
}

function PartnerCard({ partner, schools, onChange, onError, onNotice }) {
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState({ commission_pct: partner.commission_pct, free_seats_limit: partner.free_seats_limit ?? '', free_days: partner.free_days });
  const [newCode, setNewCode] = useState('');
  const [member, setMember] = useState({ email: '', role: partner.type === 'escuela' ? 'owner' : 'asesor' });
  const [busy, setBusy] = useState(false);

  async function run(fn, okMsg) {
    setBusy(true);
    onError(null);
    try {
      const r = await fn();
      if (okMsg) onNotice(typeof okMsg === 'function' ? okMsg(r) : okMsg);
      await onChange();
    } catch (e) {
      onError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const parent = schools.find((s) => s.id === partner.parent_partner_id);
  const pending = partner.invitations.filter((i) => i.state === 'usable');

  return (
    <div className={`bg-white rounded-2xl border ${partner.status === 'activo' ? 'border-navy-100' : 'border-red-100 opacity-80'}`}>
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between gap-3 p-4 text-left min-h-[56px]">
        <div className="min-w-0">
          <p className="text-sm font-bold text-navy truncate">{partner.name}</p>
          <p className="text-xs text-navy-400">
            {partner.type === 'escuela' ? 'Escuela' : 'Asesor'}{parent ? ` de ${parent.name}` : ''} · {partner.commission_pct}% · {partner.active_clients} cliente(s) · {partner.free_seats_used}/{partner.free_seats_limit ?? '∞'} gratis
          </p>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${partner.status === 'activo' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{partner.status}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-5 border-t border-navy-50 pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3">
            <Field label="Comisión (%)" type="number" min="0" max="100" step="0.5" value={edit.commission_pct} onChange={(e) => setEdit((s) => ({ ...s, commission_pct: e.target.value }))} />
            <Field label="Perfiles gratis (vacío = sin tope)" type="number" min="0" value={edit.free_seats_limit} onChange={(e) => setEdit((s) => ({ ...s, free_seats_limit: e.target.value }))} />
            <Field label="Días de cada regalo" type="number" min="1" value={edit.free_days} onChange={(e) => setEdit((s) => ({ ...s, free_days: e.target.value }))} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => run(() => api('PATCH', { id: partner.id, updateData: edit }), 'Condiciones guardadas.')}>Guardar condiciones</Button>
            <button type="button" disabled={busy} onClick={() => run(() => api('PATCH', { id: partner.id, updateData: { status: partner.status === 'activo' ? 'inactivo' : 'activo' } }), partner.status === 'activo' ? 'Socio desactivado.' : 'Socio activado.')}
              className="min-h-[44px] px-3 text-xs font-bold text-navy-500 hover:text-navy">{partner.status === 'activo' ? 'Desactivar' : 'Activar'}</button>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-navy-400 mb-2">Códigos de venta</p>
            <ul className="space-y-1.5">
              {partner.codes.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className={`font-mono font-bold ${c.active ? 'text-navy' : 'text-navy-300 line-through'}`}>{c.code}</span>
                  <span className="flex gap-3">
                    <button type="button" className="text-xs font-semibold text-primary-700 min-h-[44px]" onClick={() => { const v = prompt('Nuevo valor del código', c.code); if (v) run(() => api('POST', { action: 'update_code', code_id: c.id, code: v }), 'Código renombrado.'); }}>Renombrar</button>
                    <button type="button" className="text-xs font-semibold text-navy-500 min-h-[44px]" onClick={() => run(() => api('POST', { action: 'update_code', code_id: c.id, active: !c.active }))}>{c.active ? 'Desactivar' : 'Activar'}</button>
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex gap-2 mt-2">
              <input value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="Código propio (opcional)" className="flex-1 min-h-[44px] px-3 text-base md:text-sm border border-navy-100 rounded-xl" />
              <Button disabled={busy} onClick={() => run(async () => { await api('POST', { action: 'add_code', partner_id: partner.id, code: newCode }); setNewCode(''); }, 'Código agregado.')}>+ Código</Button>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-navy-400 mb-2">Miembros del panel</p>
            <ul className="space-y-1.5">
              {partner.members.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate">{m.name || m.email} <span className="text-xs text-navy-400">· {m.role === 'owner' ? 'dueño' : 'asesor'}</span></span>
                  <button type="button" className="text-xs font-semibold text-red-600 min-h-[44px]" onClick={() => confirm('¿Quitar a esta persona del panel?') && run(() => api('POST', { action: 'remove_member', member_id: m.id }), 'Miembro retirado.')}>Quitar</button>
                </li>
              ))}
              {partner.members.length === 0 && <li className="text-xs text-navy-400">Sin miembros todavía.</li>}
            </ul>
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2 mt-2 items-end">
              <input type="email" value={member.email} onChange={(e) => setMember((s) => ({ ...s, email: e.target.value }))} placeholder="correo@ejemplo.com" className="min-h-[44px] px-3 text-base md:text-sm border border-navy-100 rounded-xl" />
              <select value={member.role} onChange={(e) => setMember((s) => ({ ...s, role: e.target.value }))} className="min-h-[44px] px-3 text-base md:text-sm border border-navy-100 rounded-xl bg-white">
                <option value="owner">Dueño</option>
                <option value="asesor">Asesor</option>
              </select>
              <Button disabled={busy || !member.email} onClick={() => run(async () => { const r = await api('POST', { action: 'add_member', partner_id: partner.id, ...member }); setMember((s) => ({ ...s, email: '' })); return r; }, (r) => (r.linked ? 'Vinculado: ya tenía cuenta.' : 'Invitación enviada: crea su cuenta con el enlace.') + (r.emailSent ? '' : ' (el correo no salió)'))}>Vincular</Button>
            </div>
            {pending.length > 0 && (
              <ul className="mt-2 space-y-1">
                {pending.map((i) => (
                  <li key={i.id} className="flex items-center justify-between text-xs text-navy-500">
                    <span className="truncate">{i.email} · {INV_LABEL[i.state]} (vence {i.expires_at.slice(0, 10)})</span>
                    <button type="button" className="font-semibold text-red-600 min-h-[44px] px-2" onClick={() => run(() => api('POST', { action: 'revoke_invitation', invitation_id: i.id }), 'Invitación cancelada.')}>Cancelar</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


const COP = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(n) || 0);

function Commissions() {
  const [status, setStatus] = useState('pendiente');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/socios/comisiones?status=${status}`);
    const json = await res.json();
    if (!res.ok) return setError(json.error);
    setError(null);
    setData(json);
  }, [status]);
  useEffect(() => { load(); }, [load]);

  async function settle(ids) {
    if (!confirm(`¿Marcar ${ids.length} comisión(es) como liquidadas?`)) return;
    setBusy(true);
    try {
      const res = await fetch('/api/admin/socios/comisiones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-navy">Comisiones</h2>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="min-h-[44px] px-3 text-base md:text-sm border border-navy-100 rounded-xl bg-white">
          <option value="pendiente">Pendientes</option>
          <option value="liquidada">Liquidadas</option>
          <option value="all">Todas</option>
        </select>
      </div>
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
      {data && (
        <p className="text-xs text-navy-400">Pendiente: <b className="text-navy">{COP(data.totals.pending)}</b> · Liquidado: <b className="text-navy">{COP(data.totals.paid)}</b> · {data.totals.count} pago(s)</p>
      )}
      {data && data.partners.length === 0 && <p className="text-sm text-navy-400">No hay comisiones en este filtro.</p>}
      {(data?.partners || []).map((p) => (
        <div key={p.partner_id} className="bg-white rounded-2xl border border-navy-100 p-4">
          <p className="text-sm font-bold text-navy">{p.partner_name} <span className="text-xs font-normal text-navy-400">· {p.partner_type}</span></p>
          <ul className="mt-2 divide-y divide-navy-50">
            {p.periods.map((per) => (
              <li key={per.period} className="py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>{per.period} · {per.payments_count} pago(s) · ventas {COP(per.total_sales)}</span>
                <span className="flex items-center gap-3">
                  <b>{COP(per.total_commission)}</b>
                  {per.statuses.includes('pendiente') && <Button disabled={busy} onClick={() => settle(per.commission_ids)}>Liquidar</Button>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default function AdminSociosPage() {
  const [partners, setPartners] = useState(null);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/socios');
    if (res.status === 403 || res.status === 401) return setDenied(true);
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    setPartners(data.partners);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function create(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api('POST', { ...form, parent_partner_id: form.type === 'asesor' ? form.parent_partner_id || null : null });
      setNotice(r.code_error || `Socio creado con el código ${r.codes?.[0]?.code}.`);
      setForm(EMPTY);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (denied) return <p className="text-sm text-navy-500 p-6">Esta sección es solo para el administrador de la plataforma.</p>;
  const schools = (partners || []).filter((p) => p.type === 'escuela');
  const active = (partners || []).filter((p) => p.status === 'activo');

  return (
    <div className="space-y-6 max-w-5xl">
      <SectionHero eyebrow="Plataforma" title="Programa de socios" description="Escuelas y asesores: comisión recurrente, perfiles gratis y códigos de venta."
        cta={!showForm && <Button onClick={() => setShowForm(true)}>Nuevo socio</Button>} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon="school" color="primary" label="Escuelas" value={schools.length} />
        <StatCard icon="support_agent" color="blue" label="Asesores" value={(partners || []).length - schools.length} />
        <StatCard icon="verified" color="emerald" label="Activos" value={active.length} />
        <StatCard icon="storefront" color="violet" label="Clientes con código" value={(partners || []).reduce((n, p) => n + p.active_clients, 0)} />
      </div>
      {notice && <p className="text-sm text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2">{notice}</p>}
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

      {showForm && (
        <form onSubmit={create} className="bg-white rounded-2xl border border-navy-100 p-4 grid grid-cols-1 sm:grid-cols-3 gap-x-3">
          <Field as="select" label="Tipo" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
            <option value="escuela">Escuela</option>
            <option value="asesor">Asesor</option>
          </Field>
          <Field label="Nombre" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          {form.type === 'asesor' ? (
            <Field as="select" label="Escuela (opcional)" value={form.parent_partner_id} onChange={(e) => setForm((f) => ({ ...f, parent_partner_id: e.target.value }))}>
              <option value="">Independiente</option>
              {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Field>
          ) : <div />}
          <Field label="Comisión (%)" type="number" min="0" max="100" step="0.5" value={form.commission_pct} onChange={(e) => setForm((f) => ({ ...f, commission_pct: e.target.value }))} />
          <Field label="Perfiles gratis (vacío = sin tope)" type="number" min="0" value={form.free_seats_limit} onChange={(e) => setForm((f) => ({ ...f, free_seats_limit: e.target.value }))} />
          <Field label="Días de cada regalo" type="number" min="1" value={form.free_days} onChange={(e) => setForm((f) => ({ ...f, free_days: e.target.value }))} />
          <Field label="Código de venta (opcional)" value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} />
          <div className="sm:col-span-3 flex gap-2">
            <Button type="submit" disabled={busy}>{busy ? 'Creando…' : 'Crear socio'}</Button>
            <button type="button" onClick={() => setShowForm(false)} className="text-xs font-semibold text-navy-400 px-2 min-h-[44px]">Cancelar</button>
          </div>
        </form>
      )}

      {partners === null ? <p className="text-sm text-navy-400">Cargando…</p> : partners.length === 0 ? <p className="text-sm text-navy-400">Aún no hay socios.</p> : (
        <div className="space-y-3">
          {partners.map((p) => <PartnerCard key={p.id} partner={p} schools={schools} onChange={load} onError={setError} onNotice={setNotice} />)}
        </div>
      )}
      <Commissions />
    </div>
  );
}
