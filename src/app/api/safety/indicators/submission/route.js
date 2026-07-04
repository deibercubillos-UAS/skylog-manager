import { createClientSSR } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { PERMISSIONS } from '@/lib/roles';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const YEAR_REGEX = /^\d{4}$/;

// GET /api/safety/indicators/submission?year=YYYY — ¿ya se marcó como enviado?
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const year = searchParams.get('year');
        if (!YEAR_REGEX.test(year || '')) {
            return NextResponse.json({ error: 'Año inválido' }, { status: 400 });
        }

        const supabase = await createClientSSR();
        const { user, orgId } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });

        const { data } = await supabase
            .from('safety_indicator_submissions')
            .select('sent_at, sent_by, sent_by_profile:sent_by(full_name)')
            .eq('organization_id', orgId)
            .eq('year', Number(year))
            .maybeSingle();

        return NextResponse.json({
            year: Number(year),
            sent: !!data?.sent_at,
            sentAt: data?.sent_at || null,
            sentByName: data?.sent_by_profile?.full_name || null,
        });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// POST /api/safety/indicators/submission { year } — marca el año como enviado
export async function POST(request) {
    try {
        const supabase = await createClientSSR();
        const { user, orgId, role } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });
        if (!PERMISSIONS.canManageSMS.includes(role)) {
            return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
        }

        const { year } = await request.json();
        if (!YEAR_REGEX.test(String(year || ''))) {
            return NextResponse.json({ error: 'Año inválido' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('safety_indicator_submissions')
            .upsert(
                { organization_id: orgId, year: Number(year), sent_at: new Date().toISOString(), sent_by: user.id },
                { onConflict: 'organization_id,year' }
            )
            .select()
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
