// Skylog V2.0 — registro de acciones de usuario. «Mejor esfuerzo»: nunca lanza ni retrasa la operación que audita
// (un fallo se registra en consola). Resuelve al autor desde la sesión de la petición, así los puntos de uso solo dicen
// qué pasó. La tabla es solo-agregar (ver migración 20261009170000).
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';

export const AUDIT_ACTIONS = ['create', 'update', 'delete'];

/**
 * @param {{ organizationId: string, action: 'create'|'update'|'delete', module: string, entityLabel?: string, metadata?: object }} e
 */
export async function logAudit({ organizationId, action, module, entityLabel = null, metadata = null }) {
  try {
    if (!organizationId || !AUDIT_ACTIONS.includes(action) || !module) return;
    const supabase = await createClientSSR();
    const { data: { user } } = await supabase.auth.getUser();
    const admin = createAdminClient();
    let actorPersonId = null;
    let actorName = null;
    if (user) {
      const { data: account } = await admin.from('accounts').select('person_id, people(full_name)').eq('auth_user_id', user.id).maybeSingle();
      actorPersonId = account?.person_id || null;
      actorName = account?.people?.full_name || user.email || null;
    }
    const { error } = await admin.from('audit_log').insert({
      organization_id: organizationId,
      actor_person_id: actorPersonId,
      actor_name: actorName,
      action,
      module,
      entity_label: entityLabel ? String(entityLabel).slice(0, 200) : null,
      metadata,
    });
    if (error) console.error('[auditLog] no se pudo registrar:', error.message);
  } catch (e) {
    console.error('[auditLog] error registrando:', e.message);
  }
}
