import { NextResponse } from 'next/server';
import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext }   from '@/lib/apiAuth';
import { PERMISSIONS }     from '@/lib/roles';

export const dynamic = 'force-dynamic';

const DJI_KEYCHAINS_URL = 'https://dev.dji.com/openapi/v1/flight-records/keychains';

/**
 * POST /api/dev/dji-keychains-proxy
 *
 * Proxy para la API de DJI de keychains — el browser no puede llamarla
 * directamente por falta de CORS. Recibe el body que construye dji-log-parser-js
 * (KeychainsRequest: { version, department, keychainsArray }) y lo reenvía a DJI
 * con el Api-Key real del entorno.
 *
 * El archivo .txt NUNCA llega a este endpoint — solo el pequeño JSON de keychains.
 */
export async function POST(request) {
  try {
    const supabase = await createClientSSR();
    const ctx      = await getOrgContext(supabase);
    if (!ctx?.orgId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    if (!PERMISSIONS.canManageFleet.includes(ctx.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const DJI_API_KEY = process.env.DJI_API_KEY;
    if (!DJI_API_KEY) {
      return NextResponse.json(
        { error: 'DJI_API_KEY no configurada en las variables de entorno de Vercel.' },
        { status: 503 }
      );
    }

    // El body ya viene construido por dji-log-parser-js WASM:
    // { version, department, keychainsArray }
    // fetchKeychains() hace: POST endpoint con ese JSON + Api-Key header
    const body = await request.text();

    const djiRes = await fetch(DJI_KEYCHAINS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': DJI_API_KEY,
      },
      body,
    });

    const djiData = await djiRes.json();

    if (!djiRes.ok) {
      console.error('[dji-keychains-proxy] DJI API error:', djiRes.status, djiData);
      return NextResponse.json(
        { error: `DJI API respondió con error ${djiRes.status}`, details: djiData },
        { status: 502 }
      );
    }

    // Devolver la respuesta completa de DJI al browser
    return NextResponse.json(djiData, { status: 200 });

  } catch (err) {
    console.error('[dji-keychains-proxy]', err.message);
    return NextResponse.json({ error: 'Error en el proxy de keychains.' }, { status: 500 });
  }
}
