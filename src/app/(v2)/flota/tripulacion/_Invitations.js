'use client';

// Skylog V2.0 — invitar tripulantes por correo y ver las invitaciones pendientes (Etapa C). La invitación lleva un
// enlace personal que vence en 7 días; si el correo no sale, el gestor puede copiar el enlace y enviarlo por otro medio.
import { useCallback, useEffect, useState } from 'react';
import { INVITE_ROLES, INVITE_ROLE_LABELS } from '@skylog/domain';
import { Field, Button } from '@skylog/ui';

const STATE_LABEL = { usable: 'Pendiente', expirada: 'Vencida', usada: 'Aceptada', revocada: 'Cancelada' };
const STATE_CLS = { usable: 'bg-amber-50 text-amber-700', expirada: 'bg-navy-50 text-navy-400', usada: 'bg-emerald-50 text-emerald-700', revocada: 'bg-navy-50 text-navy-400' };

export default function Invitations({ organizationId, isAdmin, draft, onDraftUsed }) {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: '', name: '', role: 'piloto' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [copied, setCopied] = useState(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/invitaciones?organizationId=${organizationId}`);
    const data = await res.json();
    if (res.ok) setList(data.invitations || []);
  }, [organizationId]);

  useEffect(() => {
    if (organizationId) load();
  }, [organizationId, load]);

  // «Invitar» desde una fila de la tripulación: abre el formulario con los datos de esa persona.
  useEffect(() => {
    if (draft) {
      setForm({ email: draft.email || '', name: draft.name || '', role: draft.role || 'piloto' });
      setOpen(true);
      setNotice(null);
      setError(null);
      onDraftUsed?.();
    }
  }, [draft, onDraftUsed]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    const res = await fetch('/api/invitaciones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organizationId, ...form }) });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error);
    setNotice(data.emailSent ? `Invitación enviada a ${data.invitation.email}.` : `Se creó la invitación, pero el correo no salió. Copia el enlace y envíaselo a ${data.invitation.email}.`);
    setForm({ email: '', name: '', role: 'piloto' });
    setOpen(false);
    await load();
  }

  async function revoke(id) {
    if (!confirm('¿Cancelar esta invitación? El enlace dejará de funcionar.')) return;
    const res = await fetch(`/api/invitaciones?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    await load();
  }

  async function copy(link, id) {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError('No se pudo copiar: selecciona el enlace a mano.');
    }
  }

  const pending = list.filter((i) => i.state === 'usable');
  const past = list.filter((i) => i.state !== 'usable').slice(0, 5);

  return (
    <div className="bg-white rounded-2xl border border-navy-100 p-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-navy">Invitaciones</p>
          <p className="text-xs text-navy-400">Invita por correo: la persona crea su cuenta (o inicia sesión) y entra con el rol que elijas. Es gratis para ella.</p>
        </div>
        {!open && <button type="button" onClick={() => setOpen(true)} className="text-xs font-semibold text-primary-700 hover:underline min-h-[44px]">Invitar por correo</button>}
      </div>

      {notice && <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 mt-2">{notice}</p>}
      {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-2">{error}</p>}

      {open && (
        <form onSubmit={submit} className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-x-3">
          <Field label="Correo" type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
          <Field label="Nombre (opcional)" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          <Field as="select" label="Rol" value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}>
            {INVITE_ROLES.filter((r) => r !== 'admin' || isAdmin).map((r) => <option key={r} value={r}>{INVITE_ROLE_LABELS[r]}</option>)}
          </Field>
          <div className="sm:col-span-3 flex gap-2">
            <Button type="submit" disabled={busy}>{busy ? 'Enviando…' : 'Enviar invitación'}</Button>
            <button type="button" onClick={() => { setOpen(false); setError(null); }} className="text-xs font-semibold text-navy-400 px-2 min-h-[44px]">Cancelar</button>
          </div>
        </form>
      )}

      {pending.length > 0 && (
        <ul className="mt-3 divide-y divide-navy-50">
          {pending.map((i) => (
            <li key={i.id} className="py-2 flex items-center justify-between gap-3 flex-wrap text-sm">
              <div className="min-w-0">
                <p className="font-medium text-navy truncate">{i.name ? `${i.name} · ` : ''}{i.email}</p>
                <p className="text-xs text-navy-400">{INVITE_ROLE_LABELS[i.role]} · vence {i.expires_at.slice(0, 10)}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button type="button" onClick={() => copy(i.link, i.id)} className="text-xs font-semibold text-primary-700 hover:underline min-h-[44px]">{copied === i.id ? 'Copiado ✓' : 'Copiar enlace'}</button>
                <button type="button" onClick={() => revoke(i.id)} className="text-xs font-semibold text-red-600 hover:underline min-h-[44px]">Cancelar</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {past.length > 0 && (
        <ul className="mt-2 space-y-1">
          {past.map((i) => (
            <li key={i.id} className="text-xs text-navy-400 flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full font-semibold ${STATE_CLS[i.state]}`}>{STATE_LABEL[i.state]}</span>
              <span className="truncate">{i.email} · {INVITE_ROLE_LABELS[i.role]}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
