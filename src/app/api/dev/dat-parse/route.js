import { NextResponse } from 'next/server';
import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext }   from '@/lib/apiAuth';
import { PERMISSIONS }     from '@/lib/roles';

export const dynamic = 'force-dynamic';

/**
 * POST /api/dev/dat-parse
 *
 * Proxy hacia el microservicio Railway que parsea archivos .dat DJI.
 * El archivo .dat NUNCA se almacena — solo se procesa y se devuelve telemetría.
 *
 * El upload real al Railway se hace directamente desde el browser vía
 * /api/dev/dat-upload-url (que devuelve la URL del Railway con el token).
 * Este endpoint solo se usa para archivos pequeños (<= 10MB, e.g. testing).
 * Para archivos grandes, el browser sube directo a Railway.
 */
export async function GET(request) {
  // GET: devolver la URL del Railway + token para que el browser
  // pueda subir el .dat directamente sin pasar por Vercel
  try {
    const supabase = await createClientSSR();
    const ctx      = await getOrgContext(supabase);
    if (!ctx?.orgId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    if (!PERMISSIONS.canManageFleet.includes(ctx.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const RAILWAY_URL    = process.env.RAILWAY_ROBOT_URL;
    const RAILWAY_SECRET = process.env.RAILWAY_API_SECRET;

    if (!RAILWAY_URL || !RAILWAY_SECRET) {
      return NextResponse.json(
        { error: 'Microservicio Railway no configurado. Agrega RAILWAY_ROBOT_URL y RAILWAY_API_SECRET en Vercel.' },
        { status: 503 }
      );
    }

    // Devolver URL + token para upload directo del browser al Railway
    return NextResponse.json({
      uploadUrl: `${RAILWAY_URL}/api/dat/parse`,
      secret:    RAILWAY_SECRET,
    });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
