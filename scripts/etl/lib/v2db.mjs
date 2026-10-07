// Cliente de V2 para los scripts del corte. Nunca el proyecto de v1.
import { createClient } from '@supabase/supabase-js';

const V1_PROJECT_REF = 'ilozajejhecskmhwxkui';

export function v2db() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY del proyecto de V2.');
  if (url.includes(V1_PROJECT_REF)) throw new Error('El destino es el proyecto de v1: este script solo opera sobre V2.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Suscripciones que vienen de v1 con el Gerente General de cada una (correos). */
export async function migratedSubscriptions(db) {
  const { data: subs, error } = await db.from('subscriptions').select('organization_id, plan, billing, expires_at, payment_provider, wompi_payment_source_id, legacy_epayco_subscription_id, migration_notice_sent_at, organization:organizations(company_name)').eq('migrated_from_v1', true);
  if (error) throw new Error(error.message);
  const out = [];
  for (const s of subs || []) {
    const { data: admins } = await db.from('memberships').select('person:people(full_name, email)').eq('organization_id', s.organization_id).eq('role', 'admin').eq('status', 'activa');
    out.push({ ...s, company: s.organization?.company_name || s.organization_id, admins: (admins || []).map((a) => a.person).filter((p) => p?.email) });
  }
  return out;
}
