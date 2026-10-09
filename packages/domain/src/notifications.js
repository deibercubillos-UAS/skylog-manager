// notifications — reglas de las notificaciones dentro de la app (campana). Lógica pura y con pruebas: el servidor y la
// pantalla usan las MISMAS definiciones de tipos, destinatarios, anuncios y agrupación.

export const NOTIFICATION_TYPES = {
  mision_programada: { label: 'Misión programada', icon: 'event_available' },
  manual_publicado: { label: 'Manual publicado', icon: 'library_books' },
  miembro_nuevo: { label: 'Nuevo miembro', icon: 'person_add' },
  sms_reporte: { label: 'Reporte SMS', icon: 'report' },
  sms_caso_asignado: { label: 'Caso asignado', icon: 'assignment_ind' },
  sms_plazo: { label: 'Plazo SMS', icon: 'alarm' },
  custodia_abierta: { label: 'Custodia legal', icon: 'gavel' },
  vencimiento: { label: 'Vencimiento', icon: 'event_busy' },
  anuncio: { label: 'Anuncio', icon: 'campaign' },
  sistema: { label: 'Sistema', icon: 'info' },
};
export const NOTIFICATION_TYPE_KEYS = Object.keys(NOTIFICATION_TYPES);

/** Quienes gestionan la organización (reciben avisos de gestión y pueden enviar anuncios). */
export const MANAGER_ROLES = ['admin', 'jefe_pilotos', 'gerente_sms', 'superadmin'];
/** Roles a los que un anuncio puede dirigirse. */
export const ANNOUNCEMENT_AUDIENCES = ['admin', 'jefe_pilotos', 'gerente_sms', 'piloto'];

export const NOTIFICATION_MAX_AGE_DAYS = 180;
export const NOTIFICATION_READ_MAX_AGE_DAYS = 60;

export const canSendAnnouncement = (roles) => (roles || []).some((r) => MANAGER_ROLES.includes(r));

/** Valida el anuncio de un gestor. `roles` vacío = toda la organización. */
export function validateAnnouncement(input) {
  const errors = [];
  const title = String(input?.title || '').trim();
  const body = String(input?.body || '').trim();
  if (title.length < 3) errors.push('Escribe un título (mínimo 3 caracteres).');
  if (title.length > 120) errors.push('El título es demasiado largo (máximo 120 caracteres).');
  if (body.length > 600) errors.push('El mensaje es demasiado largo (máximo 600 caracteres).');
  const roles = Array.isArray(input?.roles) ? input.roles : [];
  if (roles.some((r) => !ANNOUNCEMENT_AUDIENCES.includes(r))) errors.push('Hay un destinatario inválido.');
  return { ok: errors.length === 0, errors, clean: { title, body: body || null, roles: [...new Set(roles)] } };
}

/** Una ruta interna segura para el enlace de una notificación (nunca otro sitio). */
export function safeInternalLink(link) {
  const v = String(link || '');
  return v.startsWith('/') && !v.startsWith('//') && !v.includes('\\') ? v : null;
}

/**
 * Quién recibe un aviso: las personas pedidas por id + las que tienen alguno de los roles, SOLO si son miembros activos
 * de la organización, sin repetir y sin el autor (a menos que `includeActor`).
 * @param {{person_id: string, role: string}[]} members membresías activas de la organización
 */
export function resolveRecipients({ members, roles = [], personIds = [], actorPersonId = null, includeActor = false }) {
  const active = new Map();
  for (const m of members || []) {
    if (!active.has(m.person_id)) active.set(m.person_id, new Set());
    active.get(m.person_id).add(m.role);
  }
  const out = new Set();
  for (const id of personIds || []) if (id && active.has(id)) out.add(id);
  for (const [id, rs] of active) if ([...rs].some((r) => roles.includes(r))) out.add(id);
  if (!includeActor && actorPersonId) out.delete(actorPersonId);
  return [...out];
}

/** Agrupa por día (Hoy / Ayer / fecha) para la lista; `now` y la zona de Colombia (UTC−5) se inyectan. */
export function groupByDay(items, now = new Date()) {
  const key = (d) => new Date(new Date(d).getTime() - 5 * 3_600_000).toISOString().slice(0, 10);
  const today = key(now);
  const yesterday = key(new Date(new Date(now).getTime() - 86_400_000));
  const groups = [];
  for (const n of items || []) {
    const k = key(n.created_at);
    const label = k === today ? 'Hoy' : k === yesterday ? 'Ayer' : k;
    const last = groups[groups.length - 1];
    if (last && last.key === k) last.items.push(n);
    else groups.push({ key: k, label, items: [n] });
  }
  return groups;
}

/** Texto corto de hace cuánto ocurrió (la lista ya agrupa por día; esto es el detalle). */
export function timeAgo(date, now = new Date()) {
  const s = Math.max(0, Math.round((new Date(now).getTime() - new Date(date).getTime()) / 1000));
  if (s < 60) return 'ahora';
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86_400) return `hace ${Math.floor(s / 3600)} h`;
  return `hace ${Math.floor(s / 86_400)} d`;
}

/** Una alerta de vencimiento (de `computeExpiryAlerts`) → datos de notificación, con clave para no repetirla cada día. */
export function expiryAlertToNotification(alert, today) {
  return {
    type: 'vencimiento',
    title: alert.title,
    body: alert.detail,
    link: safeInternalLink(alert.href),
    // Una vez por semana por alerta: la clave cambia con la semana, así recuerda sin saturar.
    dedupeKey: `venc:${alert.key}:${weekKey(today)}`,
    severity: alert.severity,
  };
}

/** Semana ISO aproximada (año + número de semana) de una fecha 'YYYY-MM-DD'. */
export function weekKey(dateStr) {
  const d = new Date(`${String(dateStr).slice(0, 10)}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d - firstThursday) / 86_400_000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
