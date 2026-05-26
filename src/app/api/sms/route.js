import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';

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
    const { user, orgId, role } = await getOrgContext(supabase);
    if (!user)  return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    if (!orgId) return NextResponse.json({ error: "Sin organización asignada" }, { status: 403 });

    // Solo admin y gerente_sms pueden emitir reportes oficiales
    const ALLOWED_ROLES = ['admin', 'gerente_sms', 'superadmin'];
    if (!ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: "Solo el Gerente SMS puede emitir reportes oficiales." }, { status: 403 });
    }

    const body = await request.json();
    const { reportData } = body;

    const { data, error } = await supabase
      .from('sms_reports')
      .insert([{
        ...reportData,
        owner_id:        user.id,
        organization_id: orgId,
      }])
      .select();

    if (error) throw error;
    return NextResponse.json(data[0], { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
