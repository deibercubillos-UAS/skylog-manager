/**
 * _resolveOrg.js  — helper compartido para los endpoints públicos VOR/MOR/upload
 *
 * Resuelve un orgCode (slug de empresa o unique_code legacy) a { id, company_name, slug }
 *
 * Orden de búsqueda:
 *   1. Por `slug`       — "drone-tech-colombia-sas"  (URL amigable, preferido)
 *   2. Por `unique_code` — "9001234567" o "MASTER"   (NIT / código legacy, retrocompat)
 *
 * Esto garantiza que QR codes ya impresos con el NIT sigan funcionando,
 * y los nuevos QR usan el slug con el nombre de la empresa.
 */
import { createClient } from '@supabase/supabase-js';

// Lazy — no crear el cliente hasta que se llame la función (evita "supabaseUrl is required" en build)
const getAdminClient = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export { getAdminClient };

// supabaseAdmin lazy — no instancia el cliente en tiempo de módulo (evita el error de build cuando las env vars no están disponibles)
export const supabaseAdmin = new Proxy({}, {
    get(_t, prop) {
        const client = getAdminClient();
        const val = client[prop];
        return typeof val === 'function' ? val.bind(client) : val;
    }
});

export async function resolveOrg(param) {
    if (!param) return null;
    const supabaseAdmin = getAdminClient();

    // 1. Intentar por slug (lowercase, ya normalizado)
    const slug = param.toLowerCase().trim();
    const { data: bySlug } = await supabaseAdmin
        .from('organizations')
        .select('id, company_name, slug')
        .eq('slug', slug)
        .maybeSingle();

    if (bySlug) return bySlug;

    // 2. Fallback: unique_code (NIT / código legacy) — case-insensitive
    const code = param.replace(/\s|\./g, '').toUpperCase();
    const { data: byCode } = await supabaseAdmin
        .from('organizations')
        .select('id, company_name, slug')
        .eq('unique_code', code)
        .maybeSingle();

    return byCode || null;
}
