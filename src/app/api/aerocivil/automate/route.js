import { NextResponse }                        from 'next/server';
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { decrypt }                             from '@/app/api/aerocivil/credentials/route';
import { generateKML }                         from '@/lib/kmlGenerator';
import { PERMISSIONS }                         from '@/lib/roles';
import { getOrgContext }                       from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

// ── Helpers ──────────────────────────────────────────────────────────────────
async function getSession(supabase) {
  const ctx = await getOrgContext(supabase);
  if (!ctx.user) return {};
  return { user: ctx.user, prof: { organization_id: ctx.orgId, role: ctx.role } };
}

const ALLOWED_ROLES = PERMISSIONS.canManageAerocivil;

// ── POST /api/aerocivil/automate — lanza un job de automatización ─────────────
export async function POST(request) {
  try {
    const supabase       = await createClientSSR();
    const { user, prof } = await getSession(supabase);

    if (!prof?.organization_id)
      return NextResponse.json({ error: 'Sin organización' }, { status: 403 });
    if (!ALLOWED_ROLES.includes(prof.role))
      return NextResponse.json({ error: 'Sin permisos para radicar' }, { status: 403 });

    const body = await request.json();
    const { submissionId, formData, soraAssessmentId } = body;

    if (!formData)
      return NextResponse.json({ error: 'formData requerido' }, { status: 400 });

    // 1. Obtener credenciales AeroCivil de la organización
    const admin = createAdminClient();
    const { data: creds, error: credsErr } = await admin
      .from('aerocivil_credentials')
      .select('username, password_enc, solicitante, contact_name')
      .eq('organization_id', prof.organization_id)
      .single();

    if (credsErr || !creds)
      return NextResponse.json({ error: 'No hay credenciales AeroCivil configuradas' }, { status: 400 });

    // 2. Descifrar contraseña
    let password;
    try {
      password = decrypt(creds.password_enc);
    } catch {
      return NextResponse.json({ error: 'Error al descifrar credenciales — revise AEROCIVIL_ENCRYPTION_KEY' }, { status: 500 });
    }

    // 3. Generar KML si hay puntos en el formulario
    let kmlContent = null;
    if (formData.points?.length > 0) {
      kmlContent = generateKML(
        formData.geo_type   || 'polygon',
        formData.points,
        formData.radius     || 500,
        formData.geo_name   || 'Operacion-UAS',
        Number(formData.altitude_meters) || 120
      );
    }

    // 4. Crear registro en automation_jobs
    const { data: job, error: jobErr } = await admin
      .from('automation_jobs')
      .insert({
        organization_id: prof.organization_id,
        submission_id:   submissionId || null,
        created_by:      user.id,
        status:          'pending',
        step_number:     0,
        total_steps:     9,
        current_step:    'En cola',
        automation_log:  [{ step: 'CREADO', message: 'Job creado por usuario', ts: new Date().toISOString() }],
      })
      .select('id')
      .single();

    if (jobErr) throw jobErr;

    // 5. Llamar al microservicio Railway (fire-and-forget desde Vercel)
    const rawRailwayUrl = process.env.RAILWAY_AUTOMATION_URL;
    const railwaySecret = process.env.RAILWAY_API_SECRET;

    // Normalizar URL: asegurar que tenga protocolo https://
    const railwayUrl = rawRailwayUrl
      ? (rawRailwayUrl.startsWith('http') ? rawRailwayUrl.replace(/\/$/, '') : `https://${rawRailwayUrl.replace(/\/$/, '')}`)
      : null;

    if (!railwayUrl || !railwaySecret) {
      // Modo simulación: registrar el job pero no disparar el robot
      await admin.from('automation_jobs').update({
        status:        'failed',
        error_message: 'RAILWAY_AUTOMATION_URL o RAILWAY_API_SECRET no configurados en Vercel',
        completed_at:  new Date().toISOString(),
      }).eq('id', job.id);

      return NextResponse.json({
        jobId:   job.id,
        status:  'config_error',
        message: 'Variables RAILWAY_AUTOMATION_URL y RAILWAY_API_SECRET deben configurarse en Vercel',
      }, { status: 202 });
    }

    // Disparar Railway sin esperar respuesta (evita timeout de Vercel)
    fetch(`${railwayUrl}/automate`, {
      method:  'POST',
      headers: {
        'Content-Type':   'application/json',
        'x-api-secret':   railwaySecret,
      },
      body: JSON.stringify({
        jobId:       job.id,
        credentials: {
          username:     creds.username,
          password,
          solicitante:  creds.solicitante,
          contact_name: creds.contact_name,
        },
        formData,
        kmlContent,
      }),
      signal: AbortSignal.timeout(8000), // Vercel tiene max 10s, dejamos 2s de margen
    }).catch(err => {
      // Actualizar job con error de conexión
      admin.from('automation_jobs').update({
        status:        'failed',
        error_message: `No se pudo conectar con Railway: ${err.message}`,
        completed_at:  new Date().toISOString(),
      }).eq('id', job.id).then(() => {});
    });

    return NextResponse.json({
      jobId:   job.id,
      status:  'started',
      message: 'Automatización iniciada. Monitoree el progreso en tiempo real.',
    }, { status: 202 });

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── GET /api/aerocivil/automate?jobId=xxx — estado de un job ─────────────────
export async function GET(request) {
  try {
    const supabase       = await createClientSSR();
    const { prof }       = await getSession(supabase);
    if (!prof?.organization_id)
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });

    const jobId = new URL(request.url).searchParams.get('jobId');
    if (!jobId)
      return NextResponse.json({ error: 'jobId requerido' }, { status: 400 });

    const { data, error } = await supabase
      .from('automation_jobs')
      .select('id, status, current_step, step_number, total_steps, aerocivil_request_number, error_message, automation_log, started_at, completed_at')
      .eq('id', jobId)
      .eq('organization_id', prof.organization_id)
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
