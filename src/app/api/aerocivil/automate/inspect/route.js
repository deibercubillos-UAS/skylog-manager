import { NextResponse }                        from 'next/server';
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { decrypt }                             from '@/app/api/aerocivil/credentials/route';

export const dynamic = 'force-dynamic';

// ── Helpers ──────────────────────────────────────────────────────────────────
async function getSession(supabase) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};
  const { data: prof } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single();
  return { user, prof };
}

const ALLOWED_ROLES = ['superadmin', 'admin', 'jefe_pilotos'];

// ── POST /api/aerocivil/automate/inspect ─────────────────────────────────────
// Proxy hacia Railway /inspect — navega el portal y devuelve screenshots +
// elementos detectados por paso. Solo para diagnóstico de selectores.
export async function POST() {
  try {
    const supabase       = await createClientSSR();
    const { prof }       = await getSession(supabase);

    if (!prof?.organization_id)
      return NextResponse.json({ error: 'Sin organización' }, { status: 403 });
    if (!ALLOWED_ROLES.includes(prof.role))
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

    // 1. Obtener credenciales de la organización
    const admin = createAdminClient();
    const { data: creds, error: credsErr } = await admin
      .from('aerocivil_credentials')
      .select('username, password_enc')
      .eq('organization_id', prof.organization_id)
      .single();

    if (credsErr || !creds)
      return NextResponse.json({ error: 'No hay credenciales AeroCivil configuradas' }, { status: 400 });

    // 2. Descifrar contraseña
    let password;
    try {
      password = decrypt(creds.password_enc);
    } catch {
      return NextResponse.json({ error: 'Error al descifrar credenciales' }, { status: 500 });
    }

    // 3. Verificar que Railway está configurado
    const rawRailwayUrl = process.env.RAILWAY_AUTOMATION_URL;
    const railwaySecret = process.env.RAILWAY_API_SECRET;

    if (!rawRailwayUrl || !railwaySecret)
      return NextResponse.json({
        error: 'RAILWAY_AUTOMATION_URL o RAILWAY_API_SECRET no están configurados en Vercel',
      }, { status: 400 });

    // Normalizar URL: asegurar que tenga protocolo https://
    const railwayUrl = rawRailwayUrl.startsWith('http')
      ? rawRailwayUrl.replace(/\/$/, '')
      : `https://${rawRailwayUrl.replace(/\/$/, '')}`;

    // 4. Llamar a Railway /inspect (esperar respuesta — la inspección dura ~30s)
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 90_000); // 90s

    let railwayRes;
    try {
      railwayRes = await fetch(`${railwayUrl}/inspect`, {
        method:  'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-secret': railwaySecret,
        },
        body:   JSON.stringify({ credentials: { username: creds.username, password } }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!railwayRes.ok) {
      const errBody = await railwayRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: errBody.error || `Railway respondió ${railwayRes.status}` },
        { status: 502 },
      );
    }

    const data = await railwayRes.json();
    return NextResponse.json(data);

  } catch (err) {
    if (err.name === 'AbortError')
      return NextResponse.json({ error: 'Tiempo de espera agotado (90s). Railway puede estar iniciando.' }, { status: 504 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
