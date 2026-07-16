import { createAdminClient } from '@/lib/supabaseServer';

// Tipos válidos (deben coincidir con el CHECK de la tabla notifications).
export const NOTIFICATION_TYPES = [
  'flight_scheduled', 'flight_dispatched', 'manual_published',
  'drone_alert', 'maintenance_due', 'invitation',
  'document_updated', 'vor_mor', 'announcement', 'system',
  'aerocivil_report_due', 'training_exam_due', 'spi_report_due', 'vormor_deadline_due',
  'minor_maintenance_due', 'grant_expiring_soon',
];

/**
 * Fan-out de notificaciones in-app: resuelve destinatarios (por rol y/o ids
 * explícitos, siempre dentro de la org) y crea una fila por usuario.
 *
 * Usa el service role (createAdminClient) → la tabla no expone INSERT a usuarios.
 * Pensado como fire-and-forget: el caller lo envuelve en try/catch para no
 * romper la operación principal si el envío falla.
 *
 * @param {object}   p
 * @param {string}   p.orgId
 * @param {string[]} [p.roles]        — roles destino dentro de la org (admin, jefe_pilotos, gerente_sms, piloto)
 * @param {string[]} [p.profileIds]   — ids de perfiles destino (además de roles); se validan contra la org
 * @param {string}   p.type           — uno de NOTIFICATION_TYPES
 * @param {string}   p.title
 * @param {string}   [p.body]
 * @param {string}   [p.link]         — ruta destino al hacer clic (ej. /dashboard/manuales)
 * @param {string}   [p.actorId]      — quién originó el evento (se excluye salvo includeActor)
 * @param {object}   [p.metadata]     — ids relacionados (manual_id, flight_id…)
 * @param {boolean}  [p.includeActor] — incluir al actor entre los destinatarios (default false)
 * @returns {Promise<number>} cuántas notificaciones se crearon
 */
export async function createNotifications({
  orgId, roles, profileIds, type, title, body, link, actorId, metadata, includeActor = false,
}) {
  if (!orgId || !type || !title) return 0;
  if (!NOTIFICATION_TYPES.includes(type)) {
    console.warn('[notify] tipo inválido:', type);
    return 0;
  }

  const admin = createAdminClient();

  // Miembros de la org — resuelto vía organization_members (rol) cruzado con
  // profiles.active_organization_id (mismo criterio que antes, cuando se leía
  // profiles.organization_id directo: solo cuentan los que tienen esta org
  // como ACTIVA ahora mismo, no cualquier membresía histórica). Garantiza que
  // todo destinatario pertenezca a la org, también los ids explícitos (evita cross-tenant).
  const { data: memberRows, error: mErr } = await admin
    .from('organization_members')
    .select('user_id, role')
    .eq('organization_id', orgId);
  if (mErr) { console.warn('[notify] no se pudieron leer miembros:', mErr.message); return 0; }

  const candidateIds = (memberRows || []).map(m => m.user_id);
  let members = [];
  if (candidateIds.length) {
    const { data: activeProfiles, error: pErr } = await admin
      .from('profiles')
      .select('id')
      .eq('active_organization_id', orgId)
      .in('id', candidateIds);
    if (pErr) { console.warn('[notify] no se pudo verificar organización activa:', pErr.message); return 0; }
    const activeIds = new Set((activeProfiles || []).map(p => p.id));
    members = memberRows.filter(m => activeIds.has(m.user_id)).map(m => ({ id: m.user_id, role: m.role }));
  }

  const orgMemberIds = new Set((members || []).map(m => m.id));
  const recipients = new Set();

  if (roles?.length) {
    (members || []).filter(m => roles.includes(m.role)).forEach(m => recipients.add(m.id));
  }
  (profileIds || []).forEach(id => { if (id && orgMemberIds.has(id)) recipients.add(id); });

  if (!includeActor && actorId) recipients.delete(actorId);
  if (recipients.size === 0) return 0;

  const rows = [...recipients].map(pid => ({
    organization_id: orgId,
    profile_id:      pid,
    type,
    title:           String(title).slice(0, 200),
    body:            body ? String(body).slice(0, 1000) : null,
    link:            link || null,
    actor_id:        actorId || null,
    metadata:        metadata || {},
  }));

  const { error, count } = await admin
    .from('notifications')
    .insert(rows, { count: 'exact' });
  if (error) { console.warn('[notify] insert falló:', error.message); return 0; }
  return count ?? rows.length;
}
