import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { canAddResource } from '@/lib/planLimits';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// GET /api/pilots — Lista pilotos de la organización
export async function GET() {
  try {
    const supabase = await createClientSSR();
    const { orgId } = await getOrgContext(supabase);
    if (!orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data, error } = await supabase
      .from('pilots')
      .select('id,name,email,phone,id_number,license_number,medical_expiry,pilot_role,is_active,id_doc_url,medical_cert_url,pilot_course_url,avatar_url,aerocivil_additions,emergency_contact_name,emergency_contact_phone,created_at')
      .eq('organization_id', orgId)
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) throw error;

    const res = NextResponse.json(data || []);
    res.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120');
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/pilots — Crea un nuevo piloto
export async function POST(request) {
  try {
    const supabase = await createClientSSR();
    const { user, orgId, subscription_plan } = await getOrgContext(supabase);
    if (!orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const { pilotData } = body;

    if (!pilotData?.name) {
      return NextResponse.json({ error: 'El nombre del piloto es obligatorio' }, { status: 400 });
    }

    // ── Verificar límite de pilotos según plan ────────────────────────────
    const { count } = await supabase
      .from('pilots')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', orgId)
      .eq('is_active', true);

    if (!canAddResource(subscription_plan, count || 0, 'pilot')) {
      return NextResponse.json(
        { error: `Tu plan ${subscription_plan.toUpperCase()} ha llegado al límite de pilotos.` },
        { status: 403 }
      );
    }

    const { data, error } = await supabase
      .from('pilots')
      .insert([{ ...pilotData, owner_id: user.id, organization_id: orgId, is_active: true }])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
