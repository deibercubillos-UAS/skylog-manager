'use client';

// Skylog V2.0 — campana de notificaciones del encabezado. Muestra las de la organización activa (las de la persona, por
// RLS), con contador de no leídas, lista agrupada por día, marcar leída al abrir, «marcar todo leído», descartar y, para
// un gestor, enviar un anuncio. Se actualiza al instante por Realtime (INSERT filtrado a la propia persona) y con un
// sondeo de respaldo cada 2 min (por si Realtime no está disponible); el sondeo se pausa con la pestaña oculta.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { NOTIFICATION_TYPES, ANNOUNCEMENT_AUDIENCES, groupByDay, timeAgo } from '@skylog/domain';

const POLL_MS = 120_000;
const AUDIENCE_LABEL = { admin: 'Gerente General', jefe_pilotos: 'Jefe de Pilotos', gerente_sms: 'Gerente SMS', piloto: 'Pilotos' };

export default function NotificationBell({ organizationId, personId, canAnnounce }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [composer, setComposer] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', roles: [] });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const ref = useRef(null);

  const load = useCallback(async () => {
    if (!organizationId) return;
    try {
      const res = await fetch(`/api/notificaciones?organizationId=${organizationId}&limit=40`);
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.notifications || []);
      setUnread(data.unreadCount || 0);
    } catch {
      // sin red: se conserva lo último que se mostró
    }
  }, [organizationId]);

  useEffect(() => { load(); }, [load]);

  // Respaldo por sondeo (pausado con la pestaña oculta).
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === 'visible') load(); }, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  // Tiempo real: llega una nueva → se vuelve a consultar (mantiene el contador exacto y el orden).
  useEffect(() => {
    if (!personId) return undefined;
    const channel = supabase
      .channel(`notif-${personId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `person_id=eq.${personId}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [personId, load]);

  useEffect(() => {
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  async function openItem(n) {
    setOpen(false);
    if (!n.read_at) {
      setItems((list) => list.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
      setUnread((u) => Math.max(0, u - 1));
      fetch('/api/notificaciones/leer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: n.id }) }).catch(() => {});
    }
    if (n.link) router.push(n.link);
  }

  async function markAll() {
    setItems((list) => list.map((x) => ({ ...x, read_at: x.read_at || new Date().toISOString() })));
    setUnread(0);
    await fetch('/api/notificaciones/leer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true, organizationId }) }).catch(() => {});
  }

  async function dismiss(e, n) {
    e.stopPropagation();
    setItems((list) => list.filter((x) => x.id !== n.id));
    if (!n.read_at) setUnread((u) => Math.max(0, u - 1));
    await fetch(`/api/notificaciones/${n.id}`, { method: 'DELETE' }).catch(() => {});
  }

  async function sendAnnouncement(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/notificaciones/anuncio', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organizationId, ...form }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo enviar el anuncio.');
      setMsg({ ok: true, text: `Enviado a ${data.delivered} persona(s).` });
      setForm({ title: '', body: '', roles: [] });
      setComposer(false);
      load();
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  }

  const groups = groupByDay(items);

  return (
    <div ref={ref} className="relative shrink-0 mr-1 md:mr-2">
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); if (!open) load(); }}
        className="relative size-10 lg:size-11 flex items-center justify-center rounded-xl bg-navy-50 text-navy-500 hover:bg-navy-100 active:scale-95 transition-all"
        aria-label={unread ? `Notificaciones: ${unread} sin leer` : 'Notificaciones'}
        aria-expanded={open}
      >
        <span className="material-symbols-outlined text-xl leading-none">{unread ? 'notifications_active' : 'notifications'}</span>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center ring-2 ring-white">{unread > 99 ? '99+' : unread}</span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-2 top-16 md:absolute md:inset-x-auto md:right-0 md:top-full md:mt-2 md:w-[380px] max-h-[75vh] flex flex-col bg-white border border-navy-100 rounded-2xl shadow-2xl z-[300] overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-navy-50 shrink-0">
            <p className="text-sm font-black text-navy">Notificaciones</p>
            <div className="flex items-center gap-1">
              {canAnnounce && <button type="button" onClick={() => { setComposer((v) => !v); setMsg(null); }} className="min-h-[44px] md:min-h-0 px-2 py-1 text-xs font-bold text-primary-700 hover:underline">{composer ? 'Cerrar' : 'Anuncio'}</button>}
              {unread > 0 && <button type="button" onClick={markAll} className="min-h-[44px] md:min-h-0 px-2 py-1 text-xs font-bold text-navy-500 hover:text-navy">Marcar todo leído</button>}
            </div>
          </div>

          {msg && <p className={`px-4 py-2 text-xs ${msg.ok ? 'text-emerald-700 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>{msg.text}</p>}

          {composer && (
            <form onSubmit={sendAnnouncement} className="px-4 py-3 border-b border-navy-50 space-y-2 shrink-0 bg-navy-50/40">
              <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Título del anuncio" maxLength={120} required className="w-full min-h-[44px] md:min-h-0 px-3 py-2 text-base md:text-sm border border-navy-100 rounded-xl bg-white" />
              <textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} placeholder="Mensaje (opcional)" maxLength={600} rows={2} className="w-full px-3 py-2 text-base md:text-sm border border-navy-100 rounded-xl bg-white" />
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wide text-navy-400 w-full">Para (vacío = toda la organización)</span>
                {ANNOUNCEMENT_AUDIENCES.map((r) => (
                  <label key={r} className="flex items-center gap-1.5 text-xs text-navy-600 min-h-[32px]">
                    <input type="checkbox" className="w-4 h-4 accent-primary" checked={form.roles.includes(r)} onChange={(e) => setForm((f) => ({ ...f, roles: e.target.checked ? [...f.roles, r] : f.roles.filter((x) => x !== r) }))} />
                    {AUDIENCE_LABEL[r]}
                  </label>
                ))}
              </div>
              <button type="submit" disabled={busy} className="min-h-[44px] md:min-h-0 px-4 py-2 rounded-xl bg-primary text-white text-xs font-black uppercase tracking-wide disabled:opacity-60">{busy ? 'Enviando…' : 'Enviar anuncio'}</button>
            </form>
          )}

          <div className="overflow-y-auto flex-1">
            {groups.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-navy-400">No tienes notificaciones.</p>
            ) : (
              groups.map((g) => (
                <div key={g.key}>
                  <p className="px-4 pt-3 pb-1 text-[10.5px] font-black uppercase tracking-widest text-navy-300">{g.label}</p>
                  {g.items.map((n) => {
                    const meta = NOTIFICATION_TYPES[n.type] || NOTIFICATION_TYPES.sistema;
                    return (
                      <div key={n.id} role="button" tabIndex={0} onClick={() => openItem(n)} onKeyDown={(e) => { if (e.key === 'Enter') openItem(n); }}
                        className={`group flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-navy-50 transition-colors min-h-[56px] ${n.read_at ? '' : 'bg-primary-50/50'}`}>
                        <span className={`material-symbols-outlined text-lg shrink-0 mt-0.5 ${n.read_at ? 'text-navy-300' : 'text-primary-600'}`}>{meta.icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm leading-snug ${n.read_at ? 'text-navy-500' : 'font-bold text-navy'}`}>{n.title}</p>
                          {n.body && <p className="text-xs text-navy-400 mt-0.5 line-clamp-2">{n.body}</p>}
                          <p className="text-[11px] text-navy-300 mt-1">{meta.label} · {timeAgo(n.created_at)}</p>
                        </div>
                        <button type="button" onClick={(e) => dismiss(e, n)} className="shrink-0 size-8 flex items-center justify-center rounded-lg text-navy-300 hover:text-red-500 hover:bg-white md:opacity-0 md:group-hover:opacity-100 focus:opacity-100" aria-label="Descartar notificación">
                          <span className="material-symbols-outlined text-base">close</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
