import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { logCaseEvent } from '@/lib/smsCase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { user, orgId } = await getOrgContext(supabase);
    if (!user)  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (!orgId) return NextResponse.json({ error: "Sin organización asignada" }, { status: 403 });

    // Filtro por organization_id para que todos los miembros con permiso vean los reportes
    const { data, error } = await supabase
      .from('sms_reports')
      .select('id,severity,narrative,immediate_actions,created_at,owner_id,flights(flight_number,location)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;

    const res = NextResponse.json(data || []);
    res.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = await createClient();
    const { user, orgId, role, fullName } = await getOrgContext(supabase);
    if (!user)  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (!orgId) return NextResponse.json({ error: "Sin organización asignada" }, { status: 403 });

    // Solo admin y gerente_sms pueden emitir reportes oficiales
    if (!PERMISSIONS.canManageSMS.includes(role)) {
      return NextResponse.json({ error: "Solo el Gerente SMS puede emitir reportes oficiales." }, { status: 403 });
    }

    const body = await request.json();
    const { reportData } = body;

    // Allowlist explícita — evita mass-assignment sobre columnas sensibles (id, created_at, etc.)
    const safeData = {
      flight_id:             reportData?.flight_id             ?? null,
      severity:              reportData?.severity              ?? null,
      occurrence_date:       reportData?.occurrence_date       ?? null,
      location:              reportData?.location              ?? null,
      event_type:            reportData?.event_type            ?? null,
      damage_description:    reportData?.damage_description    ?? null,
      damaged_parts:         reportData?.damaged_parts         ?? null,
      third_party_damage:    reportData?.third_party_damage    ?? null,
      aircraft_status_post:  reportData?.aircraft_status_post  ?? null,
      narrative:             reportData?.narrative             ?? null,
      immediate_actions:     reportData?.immediate_actions     ?? null,
      status:                reportData?.status                ?? 'abierto',
    };

    const { data, error } = await supabase
      .from('sms_reports')
      .insert([{
        ...safeData,
        owner_id:        user.id,
        organization_id: orgId,
      }])
      .select();

    if (error) throw error;

    await logCaseEvent({
      orgId,
      smsReportId: data[0].id,
      label: 'Reporte creado',
      actorId: user.id,
      actorName: fullName || user.email,
    });

    return NextResponse.json(data[0], { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
