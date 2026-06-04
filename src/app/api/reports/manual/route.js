import { NextResponse }                        from 'next/server';
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { getOrgContext }                       from '@/lib/apiAuth';
import { PERMISSIONS }                         from '@/lib/roles';

export const dynamic = 'force-dynamic';

const BUCKET   = 'manual-docs';
const CHAPTERS = ['5'];

// Ruta en storage: manual/{orgId}/cap{chapter}.docx
function storagePath(orgId, chapter) {
  return `manual/${orgId}/cap${chapter}.docx`;
}

// ── Auth helper ────────────────────────────────────────────────────────────
async function authorize(request) {
  const supabase = await createClientSSR();
  const ctx = await getOrgContext(supabase);
  if (!ctx?.orgId)                               return { error: 'No autorizado', status: 401 };
  if (!PERMISSIONS.canManageFleet.includes(ctx.role))
                                                 return { error: 'Sin permisos — requiere admin o jefe_pilotos', status: 403 };
  return { ctx };
}

// ── GET /api/reports/manual?chapter=5 ─────────────────────────────────────
// 1. Busca versión personalizada en storage → la sirve si existe
// 2. Si no hay versión personalizada → genera plantilla RAC 100 fresca
// ?meta=true → devuelve solo metadatos (no descarga el archivo)
export async function GET(request) {
  try {
    const { ctx, error, status } = await authorize(request);
    if (error) return NextResponse.json({ error }, { status });

    const { searchParams } = new URL(request.url);
    const chapter = searchParams.get('chapter') || '5';
    const metaOnly = searchParams.get('meta') === 'true';

    if (!CHAPTERS.includes(chapter)) {
      return NextResponse.json(
        { error: `Capítulo "${chapter}" no disponible. Disponibles: ${CHAPTERS.join(', ')}` },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const path  = storagePath(ctx.orgId, chapter);

    // ── Comprobar si existe versión personalizada ──
    const { data: existing } = await admin.storage
      .from(BUCKET)
      .list(`manual/${ctx.orgId}`, { search: `cap${chapter}.docx` });

    const customFile = existing?.find(f => f.name === `cap${chapter}.docx`);

    // Si solo se piden metadatos (para el estado de la UI)
    if (metaOnly) {
      return NextResponse.json({
        hasCustomVersion: !!customFile,
        updatedAt:        customFile?.updated_at || null,
        size:             customFile?.metadata?.size || null,
      });
    }

    const orgRes = await admin
      .from('organizations')
      .select('company_name,slug')
      .eq('id', ctx.orgId)
      .single();

    const slug    = orgRes.data?.slug || orgRes.data?.company_name?.replace(/\s+/g, '-').toLowerCase() || 'operador';
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `MO-Cap${chapter}-${slug}-${dateStr}.docx`;

    // ── Servir versión personalizada ──────────────────────────────────────
    if (customFile) {
      const { data: fileData, error: dlErr } = await admin.storage
        .from(BUCKET)
        .download(path);

      if (!dlErr && fileData) {
        const buffer = Buffer.from(await fileData.arrayBuffer());
        return new NextResponse(buffer, {
          status: 200,
          headers: {
            'Content-Type':        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'X-Manual-Version':    'custom',
            'Cache-Control':       'no-store',
          },
        });
      }
      // Si el download falló, caer a la generación fresca
    }

    // ── Generar plantilla fresca ──────────────────────────────────────────
    const [aircraftRes, pilotsRes, orgFullRes] = await Promise.all([
      admin.from('aircraft').select('brand,model,serial_number,ruas,total_hours,status').eq('organization_id', ctx.orgId).order('brand'),
      admin.from('pilots').select('name,license_number,id_number,medical_expiry,pilot_role,phone').eq('organization_id', ctx.orgId).eq('is_active', true).order('name'),
      admin.from('organizations').select('company_name,tax_id,tax_id_type,dan_number,legal_rep,address,phone,operator_email,logo_url,slug').eq('id', ctx.orgId).single(),
    ]);

    if (orgFullRes.error) throw orgFullRes.error;

    const { generateChapter5 } = await import('@/lib/manualGenerators');
    const buffer = await generateChapter5(
      orgFullRes.data,
      pilotsRes.data  || [],
      aircraftRes.data || [],
    );

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type':        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Manual-Version':    'generated',
        'Cache-Control':       'no-store',
      },
    });

  } catch (err) {
    console.error('[manual GET] Error:', err.message);
    return NextResponse.json({ error: 'Error generando el documento' }, { status: 500 });
  }
}

// ── POST /api/reports/manual?chapter=5 ────────────────────────────────────
// Sube una versión editada del .docx → queda como versión activa para esta org.
// Content-Type: multipart/form-data  campo: "file" (.docx)
export async function POST(request) {
  try {
    const { ctx, error, status } = await authorize(request);
    if (error) return NextResponse.json({ error }, { status });

    const { searchParams } = new URL(request.url);
    const chapter = searchParams.get('chapter') || '5';

    if (!CHAPTERS.includes(chapter)) {
      return NextResponse.json({ error: `Capítulo "${chapter}" no disponible` }, { status: 400 });
    }

    const formData = await request.formData();
    const file     = formData.get('file');

    if (!file) {
      return NextResponse.json({ error: 'Campo "file" requerido' }, { status: 400 });
    }

    // Validar tamaño (máx 20 MB) y tipo MIME
    if (file.size > 20_000_000) {
      return NextResponse.json({ error: 'Archivo demasiado grande (máx 20 MB)' }, { status: 413 });
    }
    const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (file.type && file.type !== DOCX_MIME) {
      return NextResponse.json({ error: 'Solo se aceptan archivos .docx' }, { status: 415 });
    }

    const admin  = createAdminClient();
    const path   = storagePath(ctx.orgId, chapter);
    const buffer = Buffer.from(await file.arrayBuffer());

    // upsert: si ya existe, reemplaza
    const { error: upErr } = await admin.storage
      .from(BUCKET)
      .upload(path, buffer, {
        contentType: DOCX_MIME,
        upsert:      true,
      });

    if (upErr) throw upErr;

    return NextResponse.json({
      success:   true,
      message:   `Capítulo ${chapter} guardado. Se usará esta versión en las próximas descargas.`,
      path,
      updatedAt: new Date().toISOString(),
    });

  } catch (err) {
    console.error('[manual POST] Error:', err.message);
    return NextResponse.json({ error: 'Error guardando el documento' }, { status: 500 });
  }
}

// ── DELETE /api/reports/manual?chapter=5 ──────────────────────────────────
// Elimina la versión personalizada → vuelve a generarse desde la plantilla RAC 100.
export async function DELETE(request) {
  try {
    const { ctx, error, status } = await authorize(request);
    if (error) return NextResponse.json({ error }, { status });

    const { searchParams } = new URL(request.url);
    const chapter = searchParams.get('chapter') || '5';

    const admin = createAdminClient();
    const path  = storagePath(ctx.orgId, chapter);

    const { error: delErr } = await admin.storage
      .from(BUCKET)
      .remove([path]);

    if (delErr) throw delErr;

    return NextResponse.json({
      success: true,
      message: `Versión personalizada eliminada. Se generará la plantilla RAC 100 en la próxima descarga.`,
    });

  } catch (err) {
    console.error('[manual DELETE] Error:', err.message);
    return NextResponse.json({ error: 'Error eliminando el documento' }, { status: 500 });
  }
}
