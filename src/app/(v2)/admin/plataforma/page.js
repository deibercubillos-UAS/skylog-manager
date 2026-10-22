'use client';

// Skylog V2.0 — Plataforma (Etapa F). Lo mínimo para operar V2 sin el Master de la versión actual, solo para el
// superadmin: organizaciones (plan y vencimiento, eliminar), cuentas (buscar y eliminar), regalos de la casa y las
// versiones del APK. Todo lo destructivo pide confirmar escribiendo el nombre o el correo exacto.
import { useCallback, useEffect, useState } from 'react';
import { SectionHero } from '../../_components/SectionHero';
import { Field, Button } from '@skylog/ui';
import { PLANS, PLAN_LABELS } from '@/lib/v2/planLimits';
import { addBillingPeriod, isOrgReadOnly } from '@skylog/domain';

const TABS = [['organizaciones', 'Organizaciones'], ['cuentas', 'Cuentas'], ['regalos', 'Regalos'], ['app', 'App Android']];

async function api(method, url, body) {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'No se pudo completar la acción.');
  return data;
}

function Msg({ error, notice }) {
  return (
    <>
      {notice && <p className="text-sm text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2">{notice}</p>}
      {error && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</p>}
    </>
  );
}

const BILLING_LABELS = { monthly: 'Mensual', annual: 'Anual' };
const todayIso = () => new Date().toISOString().slice(0, 10);

// Estado de la suscripción tal como lo vive el cliente: vigente, vencida (7 días de gracia) o en solo lectura.
function subscriptionStatus(sub) {
  if (!sub) return { label: 'Sin plan', tone: 'bg-navy-50 text-navy-500' };
  if (!sub.expires_at) return { label: 'Sin vencimiento', tone: 'bg-emerald-50 text-emerald-700' };
  const days = Math.round((Date.parse(`${sub.expires_at}T00:00:00Z`) - Date.parse(`${todayIso()}T00:00:00Z`)) / 86400000);
  if (isOrgReadOnly({ plan: sub.plan, expiresAt: sub.expires_at })) return { label: `Solo lectura · venció hace ${-days} d`, tone: 'bg-red-50 text-red-700' };
  if (days < 0) return { label: `Vencida hace ${-days} d (en gracia)`, tone: 'bg-amber-50 text-amber-700' };
  if (days <= 7) return { label: `Vence en ${days} d`, tone: 'bg-amber-50 text-amber-700' };
  return { label: `Vigente · ${days} d`, tone: 'bg-emerald-50 text-emerald-700' };
}

function OrgRow({ org, onChange, onError, onNotice }) {
  const [open, setOpen] = useState(false);
  const sub = org.subscription;
  const [form, setForm] = useState({ plan: sub?.plan || 'piloto', billing: sub?.billing || 'monthly', expires_at: sub?.expires_at ? String(sub.expires_at).slice(0, 10) : '', notes: sub?.notes || '' });
  const status = subscriptionStatus(sub);
  // Extender: desde el vencimiento actual si aún no ha pasado; si ya venció (o no tiene), desde hoy.
  const extend = (billing) => setForm((f) => {
    const base = f.expires_at && f.expires_at > todayIso() ? f.expires_at : todayIso();
    return { ...f, expires_at: addBillingPeriod(base, billing) };
  });
  const [busy, setBusy] = useState(false);

  async function run(fn, ok) {
    setBusy(true);
    onError(null);
    try {
      await fn();
      onNotice(ok);
      await onChange();
    } catch (e) {
      onError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-navy-100">
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between gap-3 p-4 text-left min-h-[56px]">
        <div className="min-w-0">
          <p className="text-sm font-bold text-navy truncate">{org.company_name}</p>
          <p className="text-xs text-navy-400">NIT {org.nit || '—'} · {org.members} miembro(s) · {org.aircraft} aeronave(s)</p>
        </div>
        <span className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-navy-50 text-navy-500">{sub ? `${PLAN_LABELS[sub.plan] || sub.plan}${sub.billing ? ` · ${BILLING_LABELS[sub.billing] || sub.billing}` : ''}${sub.expires_at ? ` · ${String(sub.expires_at).slice(0, 10)}` : ''}` : 'sin plan'}</span>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${status.tone}`}>{status.label}</span>
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-3 border-t border-navy-50 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3">
            <Field as="select" label="Plan" value={form.plan} onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))}>
              {PLANS.map((p) => <option key={p} value={p}>{PLAN_LABELS[p] || p}</option>)}
            </Field>
            <Field as="select" label="Periodo de cobro" value={form.billing} onChange={(e) => setForm((f) => ({ ...f, billing: e.target.value }))}>
              {Object.entries(BILLING_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </Field>
            <Field label="Vence (vacío = sin vencimiento)" type="date" value={form.expires_at} onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))} />
          </div>
          <div className="flex flex-wrap gap-2">
            {[['+1 mes', 'monthly'], ['+1 año', 'annual']].map(([label, b]) => (
              <button key={b} type="button" onClick={() => extend(b)} className="min-h-[40px] px-3 rounded-xl text-xs font-bold border border-navy-100 text-navy-500 bg-white">{label}</button>
            ))}
            <button type="button" onClick={() => setForm((f) => ({ ...f, expires_at: '' }))} className="min-h-[40px] px-3 rounded-xl text-xs font-bold border border-navy-100 text-navy-500 bg-white">Sin vencimiento</button>
          </div>
          <Field label="Notas internas" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          {sub?.payment_provider === 'wompi' && (
            <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2">Este cliente paga con Wompi: el cobro automático usará el plan y el periodo que guardes, a partir de la nueva fecha de vencimiento.</p>
          )}
          <div className="flex flex-wrap gap-3 items-center">
            <Button disabled={busy} onClick={() => run(() => api('PATCH', '/api/admin/organizaciones', { organization_id: org.id, ...form }), 'Plan guardado. El cliente lo verá en su próxima carga (máx. 1 minuto).')}>Guardar plan</Button>
            <button type="button" disabled={busy} className="text-xs font-bold text-red-600 min-h-[44px] px-2"
              onClick={() => {
                const name = prompt(`Para ELIMINAR esta organización y todo lo suyo, escribe su nombre exacto:\n${org.company_name}`);
                if (name) run(() => api('DELETE', '/api/admin/organizaciones', { organization_id: org.id, confirmName: name }), 'Organización eliminada.');
              }}>Eliminar organización</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Organizaciones({ onError, onNotice }) {
  const [q, setQ] = useState('');
  const [orgs, setOrgs] = useState(null);
  const load = useCallback(async () => {
    try {
      const d = await api('GET', `/api/admin/organizaciones?q=${encodeURIComponent(q)}`);
      setOrgs(d.organizations);
    } catch (e) { onError(e.message); }
  }, [q, onError]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  return (
    <div className="space-y-3">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o NIT" className="w-full min-h-[44px] px-3 text-base md:text-sm border border-navy-100 rounded-xl bg-white" />
      {orgs === null ? <p className="text-sm text-navy-400">Cargando…</p> : orgs.length === 0 ? <p className="text-sm text-navy-400">Sin resultados.</p> : orgs.map((o) => <OrgRow key={o.id} org={o} onChange={load} onError={onError} onNotice={onNotice} />)}
    </div>
  );
}

function Cuentas({ onError, onNotice }) {
  const [q, setQ] = useState('');
  const [people, setPeople] = useState([]);
  const load = useCallback(async () => {
    if (q.trim().length < 3) return setPeople([]);
    try { setPeople((await api('GET', `/api/admin/cuentas?q=${encodeURIComponent(q)}`)).people); } catch (e) { onError(e.message); }
  }, [q, onError]);
  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);

  async function remove(p) {
    const email = prompt(`Para ELIMINAR esta cuenta, escribe su correo exacto:\n${p.email}`);
    if (!email) return;
    onError(null);
    try {
      const r = await api('DELETE', '/api/admin/cuentas', { person_id: p.id, confirmEmail: email });
      onNotice(`Cuenta eliminada. Organizaciones eliminadas: ${r.organizations_deleted}.${r.anonymized ? ' La persona se anonimizó porque aún firma registros que se conservan.' : ''}`);
      await load();
    } catch (e) { onError(e.message); }
  }
  return (
    <div className="space-y-3">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Correo o nombre (mínimo 3 letras)" className="w-full min-h-[44px] px-3 text-base md:text-sm border border-navy-100 rounded-xl bg-white" />
      {people.map((p) => (
        <div key={p.id} className="bg-white rounded-2xl border border-navy-100 p-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 text-sm">
            <p className="font-bold text-navy truncate">{p.full_name} <span className="font-normal text-navy-400">· {p.email || 'sin correo'}</span></p>
            <p className="text-xs text-navy-400">{p.has_account ? 'Con cuenta' : 'Sin cuenta'} · {p.memberships.map((m) => `${m.role} en ${m.organization}`).join(', ') || 'sin organizaciones'}{p.partners.length ? ` · socio: ${p.partners.map((x) => x.name).join(', ')}` : ''}</p>
          </div>
          {p.email && <button type="button" onClick={() => remove(p)} className="text-xs font-bold text-red-600 min-h-[44px] px-2">Eliminar cuenta</button>}
        </div>
      ))}
    </div>
  );
}

function Regalos({ onError, onNotice }) {
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ email: '', days: '90' });
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { try { setList((await api('GET', '/api/admin/regalos')).grants); } catch (e) { onError(e.message); } }, [onError]);
  useEffect(() => { load(); }, [load]);
  async function send(e) {
    e.preventDefault();
    setBusy(true);
    onError(null);
    try {
      const r = await api('POST', '/api/admin/regalos', form);
      onNotice(r.reset ? 'Regalo reiniciado y reenviado.' : 'Regalo enviado.');
      setForm({ email: '', days: form.days });
      await load();
    } catch (err) { onError(err.message); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-4">
      <form onSubmit={send} className="bg-white rounded-2xl border border-navy-100 p-4 grid grid-cols-1 sm:grid-cols-[1fr_140px_auto] gap-x-3 items-end">
        <Field label="Correo (sin cuenta)" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
        <Field label="Días" type="number" min="1" max="730" value={form.days} onChange={(e) => setForm((f) => ({ ...f, days: e.target.value }))} />
        <Button type="submit" disabled={busy}>{busy ? 'Enviando…' : 'Regalar / reiniciar'}</Button>
      </form>
      <ul className="divide-y divide-navy-50 bg-white rounded-2xl border border-navy-100">
        {list.map((g) => (
          <li key={g.id} className="px-4 py-2.5 text-sm flex flex-wrap items-center justify-between gap-2">
            <span className="truncate">{g.email} <span className="text-xs text-navy-400">· {g.partner_name}</span></span>
            <span className="text-xs text-navy-400">{g.status} · vence {String(g.expires_at).slice(0, 10)}</span>
          </li>
        ))}
        {list.length === 0 && <li className="px-4 py-3 text-sm text-navy-400">Sin regalos.</li>}
      </ul>
    </div>
  );
}

function App({ onError, onNotice }) {
  const [releases, setReleases] = useState([]);
  const [form, setForm] = useState({ versionName: '', versionCode: '', apkUrl: '', releaseNotes: '', forceUpdate: false });
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { try { setReleases((await api('GET', '/api/admin/releases')).releases); } catch (e) { onError(e.message); } }, [onError]);
  useEffect(() => { load(); }, [load]);
  async function publish(e) {
    e.preventDefault();
    setBusy(true);
    onError(null);
    try {
      await api('POST', '/api/admin/releases', form);
      onNotice('Versión publicada: las apps instaladas la ofrecerán al abrirse.');
      setForm({ versionName: '', versionCode: '', apkUrl: '', releaseNotes: '', forceUpdate: false });
      await load();
    } catch (err) { onError(err.message); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-4">
      <form onSubmit={publish} className="bg-white rounded-2xl border border-navy-100 p-4 grid grid-cols-1 sm:grid-cols-2 gap-x-3">
        <Field label="Versión (ej. 2.0.0)" value={form.versionName} onChange={(e) => setForm((f) => ({ ...f, versionName: e.target.value }))} required />
        <Field label="Código de versión (entero, creciente)" type="number" min="1" value={form.versionCode} onChange={(e) => setForm((f) => ({ ...f, versionCode: e.target.value }))} required />
        <div className="sm:col-span-2"><Field label="URL del APK (https)" value={form.apkUrl} onChange={(e) => setForm((f) => ({ ...f, apkUrl: e.target.value }))} required /></div>
        <div className="sm:col-span-2"><Field label="Notas de la versión" value={form.releaseNotes} onChange={(e) => setForm((f) => ({ ...f, releaseNotes: e.target.value }))} /></div>
        <label className="sm:col-span-2 flex items-center gap-3 text-sm text-navy-500 min-h-[44px]">
          <input type="checkbox" className="w-5 h-5 accent-primary" checked={form.forceUpdate} onChange={(e) => setForm((f) => ({ ...f, forceUpdate: e.target.checked }))} />
          Actualización obligatoria (solo para correcciones críticas)
        </label>
        <div className="sm:col-span-2"><Button type="submit" disabled={busy}>{busy ? 'Publicando…' : 'Publicar versión'}</Button></div>
      </form>
      <ul className="divide-y divide-navy-50 bg-white rounded-2xl border border-navy-100">
        {releases.map((r) => (
          <li key={r.id} className="px-4 py-2.5 text-sm flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold text-navy">{r.version_name} <span className="font-normal text-navy-400">· código {r.version_code}{r.force_update ? ' · obligatoria' : ''}</span></span>
            {r.is_current && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">vigente</span>}
          </li>
        ))}
        {releases.length === 0 && <li className="px-4 py-3 text-sm text-navy-400">Aún no hay versiones.</li>}
      </ul>
    </div>
  );
}

export default function PlataformaPage() {
  const [tab, setTab] = useState('organizaciones');
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    fetch('/api/admin/organizaciones?q=zzzz-none').then((r) => { if (r.status === 401 || r.status === 403) setDenied(true); });
  }, []);
  const onError = useCallback((m) => { setError(m); if (m) setNotice(null); }, []);
  const onNotice = useCallback((m) => { setNotice(m); if (m) setError(null); }, []);

  if (denied) return <p className="text-sm text-navy-500 p-6">Esta sección es solo para el administrador de la plataforma.</p>;
  return (
    <div className="space-y-5 max-w-4xl">
      <SectionHero eyebrow="Plataforma" title="Administración" description="Planes, cuentas, regalos y versiones de la app." />
      <div role="tablist" className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(([key, label]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => { setTab(key); setError(null); setNotice(null); }}
            className={`min-h-[44px] px-4 rounded-xl text-xs font-black uppercase tracking-wide border whitespace-nowrap ${tab === key ? 'bg-primary text-white border-primary' : 'bg-white text-navy-500 border-navy-100'}`}>{label}</button>
        ))}
      </div>
      <Msg error={error} notice={notice} />
      {tab === 'organizaciones' && <Organizaciones onError={onError} onNotice={onNotice} />}
      {tab === 'cuentas' && <Cuentas onError={onError} onNotice={onNotice} />}
      {tab === 'regalos' && <Regalos onError={onError} onNotice={onNotice} />}
      {tab === 'app' && <App onError={onError} onNotice={onNotice} />}
    </div>
  );
}
