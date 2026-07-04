'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';

const AnnouncementComposer = dynamic(() => import('@/components/AnnouncementComposer'), { ssr: false });

// Realtime es la vía principal; el polling queda como red de seguridad (intervalo largo).
const POLL_MS = 120_000;

// type → ícono + color de acento
const TYPE_META = {
  flight_scheduled:  { icon: 'event_available', color: 'text-blue-500',    bg: 'bg-blue-50' },
  flight_dispatched: { icon: 'flight_takeoff',  color: 'text-sky-500',     bg: 'bg-sky-50' },
  manual_published:  { icon: 'menu_book',       color: 'text-orange-500',  bg: 'bg-orange-50' },
  drone_alert:       { icon: 'warning',         color: 'text-red-500',     bg: 'bg-red-50' },
  maintenance_due:   { icon: 'build',           color: 'text-amber-500',   bg: 'bg-amber-50' },
  invitation:        { icon: 'mail',            color: 'text-violet-500',  bg: 'bg-violet-50' },
  document_updated:  { icon: 'description',     color: 'text-teal-500',    bg: 'bg-teal-50' },
  vor_mor:           { icon: 'report',          color: 'text-rose-500',    bg: 'bg-rose-50' },
  announcement:      { icon: 'campaign',        color: 'text-orange-600',  bg: 'bg-orange-50' },
  system:            { icon: 'info',            color: 'text-slate-500',   bg: 'bg-slate-100' },
  aerocivil_report_due: { icon: 'assignment_turned_in', color: 'text-amber-600', bg: 'bg-amber-50' },
  training_exam_due: { icon: 'quiz', color: 'text-orange-600', bg: 'bg-orange-50' },
};
const metaFor = (t) => TYPE_META[t] || TYPE_META.system;

function timeAgo(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'hace un momento';
  const m = Math.floor(s / 60); if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60); if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24); if (d < 7) return `hace ${d} d`;
  try { return new Date(iso).toLocaleDateString('es-CO'); } catch { return ''; }
}

export default function NotificationBell({ canAnnounce = false }) {
  const router = useRouter();
  const [items, setItems]   = useState([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [composer, setComposer] = useState(false);
  const wrapRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.notifications || []);
      setUnread(data.unreadCount || 0);
    } catch { /* silencioso */ }
  }, []);

  // Carga inicial + polling de respaldo (pausado si la pestaña está oculta)
  useEffect(() => {
    load();
    const tick = () => { if (document.visibilityState === 'visible') load(); };
    const t = setInterval(tick, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  // Realtime: actualización instantánea ante cualquier cambio de mis notificaciones
  useEffect(() => {
    let channel;
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled || !user) return;
      channel = supabase
        .channel(`notifications:${user.id}`)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'notifications', filter: `profile_id=eq.${user.id}` },
          () => load())
        .subscribe();
    })();
    return () => { cancelled = true; if (channel) supabase.removeChannel(channel); };
  }, [load]);

  // Al abrir, refresca; cerrar al hacer clic afuera o Escape
  useEffect(() => {
    if (open) { setLoading(true); load().finally(() => setLoading(false)); }
    const onClick = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    const onKey   = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, [open, load]);

  const markRead = async (id) => {
    setItems(prev => prev.map(n => n.id === id ? { ...n, read_at: n.read_at || new Date().toISOString() } : n));
    setUnread(u => Math.max(0, u - 1));
    try {
      const res = await fetch('/api/notifications/read', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => null);
      if (data?.unreadCount != null) setUnread(data.unreadCount);
    } catch { /* el polling reconcilia */ }
  };

  const markAll = async () => {
    setItems(prev => prev.map(n => n.read_at ? n : { ...n, read_at: new Date().toISOString() }));
    setUnread(0);
    try { await fetch('/api/notifications/read', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true }),
    }); } catch { /* el polling reconcilia */ }
  };

  const dismiss = async (id, e) => {
    e.stopPropagation();
    const was = items.find(n => n.id === id);
    setItems(prev => prev.filter(n => n.id !== id));
    if (was && !was.read_at) setUnread(u => Math.max(0, u - 1));
    try { await fetch(`/api/notifications/${id}`, { method: 'DELETE' }); } catch { /* idem */ }
  };

  const onItemClick = (n) => {
    if (!n.read_at) markRead(n.id);
    if (n.link) { setOpen(false); router.push(n.link); }
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={`Notificaciones${unread ? ` (${unread} sin leer)` : ''}`}
        className="relative size-11 flex items-center justify-center rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 active:scale-95 transition-all"
      >
        <span className="material-symbols-outlined text-xl leading-none">notifications</span>
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center border-2 border-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed left-3 right-3 top-[4.5rem] w-auto sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-[120] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <p className="text-xs font-black uppercase tracking-widest text-slate-700">Notificaciones</p>
            <div className="flex items-center gap-3">
              {unread > 0 && (
                <button onClick={markAll} className="text-[11px] font-black text-orange-600 hover:underline uppercase tracking-wide">
                  Marcar todo leído
                </button>
              )}
              {canAnnounce && (
                <button
                  onClick={() => { setOpen(false); setComposer(true); }}
                  className="flex items-center gap-1 text-[11px] font-black text-slate-600 hover:text-orange-600 uppercase tracking-wide"
                >
                  <span className="material-symbols-outlined text-sm">campaign</span>
                  Anuncio
                </button>
              )}
            </div>
          </div>

          {/* Lista */}
          <div className="max-h-[calc(100vh-7.5rem)] sm:max-h-[60vh] overflow-y-auto">
            {loading && items.length === 0 ? (
              <p className="text-xs font-black text-slate-300 uppercase tracking-widest text-center py-10 animate-pulse">Cargando...</p>
            ) : items.length === 0 ? (
              <div className="py-12 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-200 block mb-2">notifications_off</span>
                <p className="text-xs font-bold text-slate-400">Sin notificaciones</p>
              </div>
            ) : items.map(n => {
              const m = metaFor(n.type);
              const isUnread = !n.read_at;
              return (
                <div
                  key={n.id}
                  onClick={() => onItemClick(n)}
                  className={`group flex items-start gap-3 px-4 py-3 border-b border-slate-50 last:border-0 cursor-pointer transition-colors ${
                    isUnread ? 'bg-orange-50/60 hover:bg-orange-50' : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className={`size-9 rounded-xl flex items-center justify-center shrink-0 ${isUnread ? m.bg : 'bg-slate-100'}`}>
                    <span className={`material-symbols-outlined text-base ${isUnread ? m.color : 'text-slate-400'}`}>{m.icon}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs leading-snug ${isUnread ? 'font-black text-slate-900' : 'font-bold text-slate-500'}`}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="text-[11px] text-slate-500 leading-snug mt-0.5 line-clamp-2">{n.body}</p>
                    )}
                    <p className="text-[10px] text-slate-400 font-bold mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                  <div className="flex flex-col items-center gap-1.5 shrink-0">
                    {isUnread && <span className="size-2 rounded-full bg-orange-500 mt-1" />}
                    <button
                      onClick={(e) => dismiss(n.id, e)}
                      aria-label="Descartar"
                      className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-500 transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {composer && (
        <AnnouncementComposer
          onClose={() => setComposer(false)}
          onSent={load}
        />
      )}
    </div>
  );
}
