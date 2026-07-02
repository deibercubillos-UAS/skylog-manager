import { createAdminClient } from '@/lib/supabaseServer';

/**
 * logAudit — registra una acción en public.audit_log (Fase 5.a).
 *
 * FIRE-AND-FORGET: nunca lanza. Si la tabla no existe todavía (migración sin
 * aplicar) o falla la escritura, se traga el error y no afecta al flujo que la
 * invocó. Usa el service role (la tabla no tiene política de INSERT).
 *
 * @param {object} p
 * @param {string} p.orgId
 * @param {string} [p.actorId]
 * @param {string} [p.actorName]
 * @param {string} p.action        - 'create' | 'update' | 'delete' | ...
 * @param {string} p.module        - 'fleet' | 'pilots' | 'flights' | 'maintenance' | ...
 * @param {string} [p.entityLabel] - descripción legible del objeto afectado
 * @param {object} [p.metadata]
 */
export async function logAudit({ orgId, actorId, actorName, action, module, entityLabel, metadata }) {
  if (!orgId || !action || !module) return;
  try {
    const admin = createAdminClient();
    await admin.from('audit_log').insert([{
      organization_id: orgId,
      actor_id:        actorId || null,
      actor_name:      actorName || null,
      action,
      module,
      entity_label:    entityLabel || null,
      metadata:        metadata || null,
    }]);
  } catch {
    // best-effort: la auditoría nunca rompe la operación instrumentada.
  }
}
