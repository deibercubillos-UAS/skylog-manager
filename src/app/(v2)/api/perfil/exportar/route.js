// GET /api/perfil/exportar — «Descargar mis datos» (Ley 1581): un JSON con TODO lo que la plataforma guarda de la
// persona autenticada. Cada consulta se filtra por el `person_id` de la sesión (nunca por un valor del cliente) y
// solo incluye registros propios: no trae datos de otras personas ni de la organización.
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { checkRateLimit, getClientIp } from '@/lib/rateLimiter';
import { EXPORT_SOURCES } from '@skylog/domain';

export const dynamic = 'force-dynamic';
const MAX_ROWS = 50000;

export async function GET(request) {
  const supabase = await createClientSSR();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
  if (!checkRateLimit(`export:${user.id}:${getClientIp(request)}`, { limit: 5, windowMs: 3_600_000 }).allowed) {
    return Response.json({ error: 'Ya descargaste tus datos varias veces. Intenta en una hora.' }, { status: 429 });
  }
  const { error, personId } = await resolveCurrentPerson(supabase, user.id);
  if (error) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado' }, { status: 404 });

  const admin = createAdminClient();
  const out = {
    generado_en: new Date().toISOString(),
    cuenta: { correo: user.email, ultimo_acceso: user.last_sign_in_at || null, creada: user.created_at || null },
    nota: 'Datos personales que Skylog guarda de esta cuenta. Los registros operativos de tu organización (otras personas, flota, etc.) no se incluyen.',
  };
  const failed = [];
  for (const src of EXPORT_SOURCES) {
    const { data, error: qError } = await admin.from(src.table).select(src.columns || '*').eq(src.column, personId).limit(MAX_ROWS);
    if (qError) failed.push(src.key);
    out[src.key] = qError ? [] : data || [];
  }
  if (failed.length) out.advertencia = `No se pudieron leer: ${failed.join(', ')}. Vuelve a intentarlo.`;

  return new Response(JSON.stringify(out, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="mis-datos-skylog-${new Date().toISOString().slice(0, 10)}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
