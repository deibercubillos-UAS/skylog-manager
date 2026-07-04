import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const MONTH_REGEX = /^\d{4}-\d{2}$/;

// GET /api/aerocivil-report/status?period=YYYY-MM — ¿ya se marcó como enviado?
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period');
    if (!period || !MONTH_REGEX.test(period)) {
      return NextResponse.json({ error: 'Formato de período inválido. Use YYYY-MM' }, { status: 400 });
    }

    const supabase = await createClientSSR();
    const { user, orgId } = await getOrgContext(supabase);
    if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });

    const { data } = await supabase
      .from('aerocivil_monthly_reports')
      .select('sent_at, sent_by, sent_by_profile:sent_by(full_name)')
      .eq('organization_id', orgId)
      .eq('period', period)
      .maybeSingle();

    return NextResponse.json({
      period,
      sent: !!data?.sent_at,
      sentAt: data?.sent_at || null,
      sentByName: data?.sent_by_profile?.full_name || null,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/aerocivil-report/status { period } — marca el período como enviado
export async function POST(request) {
  try {
    const supabase = await createClientSSR();
    const { user, orgId, role } = await getOrgContext(supabase);
    if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });
    if (!PERMISSIONS.canManageSMS.includes(role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const { period } = await request.json();
    if (!period || !MONTH_REGEX.test(period)) {
      return NextResponse.json({ error: 'Formato de período inválido. Use YYYY-MM' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('aerocivil_monthly_reports')
      .upsert(
        { organization_id: orgId, period, sent_at: new Date().toISOString(), sent_by: user.id },
        { onConflict: 'organization_id,period' }
      )
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
