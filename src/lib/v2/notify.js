// Skylog V2.0 — crear notificaciones dentro de la app (campana). SOLO el servidor las crea (con la llave de servicio):
// resuelve los destinatarios por rol y/o por persona DENTRO de la organización (nunca entre organizaciones) y excluye al
// autor. «Mejor esfuerzo»: un fallo se registra y nunca rompe la operación que lo dispara (igual que los correos).
import { createAdminClient } from '@/lib/supabaseServer';
import { resolveRecipients, safeInternalLink, NOTIFICATION_TYPES } from '@skylog/domain';

/**
 * @param {{organizationId: string, roles?: string[], personIds?: string[], type: string, title: string, body?: string,
 *   link?: string, actorPersonId?: string, includeActor?: boolean, dedupeKey?: string, metadata?: object}} n
 * @returns {Promise<{ created: number }>}
 */
export async function createNotifications(n, admin = null) {
  try {
    if (!n?.organizationId || !n.title || !NOTIFICATION_TYPES[n.type]) return { created: 0 };
    const db = admin || createAdminClient();
    const { data: members } = await db.from('memberships').select('person_id, role').eq('organization_id', n.organizationId).eq('status', 'activa');
    const recipients = resolveRecipients({ members, roles: n.roles || [], personIds: n.personIds || [], actorPersonId: n.actorPersonId || null, includeActor: !!n.includeActor });
    if (!recipients.length) return { created: 0 };
    const rows = recipients.map((personId) => ({
      organization_id: n.organizationId,
      person_id: personId,
      type: n.type,
      title: String(n.title).slice(0, 160),
      body: n.body ? String(n.body).slice(0, 600) : null,
      link: safeInternalLink(n.link),
      actor_person_id: n.actorPersonId || null,
      dedupe_key: n.dedupeKey || null,
      metadata: n.metadata || null,
    }));
    // Con clave de deduplicación, un aviso repetido simplemente se ignora (índice único parcial).
    const { data, error } = n.dedupeKey
      ? await db.from('notifications').upsert(rows, { onConflict: 'person_id,dedupe_key', ignoreDuplicates: true }).select('id')
      : await db.from('notifications').insert(rows).select('id');
    if (error) {
      console.error('[notify] no se pudieron crear las notificaciones:', error.message);
      return { created: 0 };
    }
    return { created: (data || []).length };
  } catch (e) {
    console.error('[notify] error creando notificaciones:', e.message);
    return { created: 0 };
  }
}
