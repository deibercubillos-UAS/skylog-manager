import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

async function guardSuperadmin(req) {
    const supabase = createClientSSR(req);
    const { user, role } = await getOrgContext(supabase);
    if (!user || role !== 'superadmin') return null;
    return user;
}

// GET — historial de versiones (más nueva primero)
export async function GET(req) {
    const user = await guardSuperadmin(req);
    if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const supabase = createAdminClient();
    const { data, error } = await supabase
        .from('app_releases')
        .select('*')
        .order('version_code', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ releases: data });
}

// POST — publicar nueva versión
export async function POST(req) {
    const user = await guardSuperadmin(req);
    if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { version_name, version_code, apk_url, release_notes, force_update } = await req.json();
    if (!version_name || !version_code || !apk_url) {
        return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from('app_releases').insert([{
        version_name,
        version_code,
        apk_url,
        release_notes: release_notes || null,
        force_update: !!force_update,
        is_current: true,
    }]);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}

// DELETE — retirar versión (is_current = false)
export async function DELETE(req) {
    const user = await guardSuperadmin(req);
    if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 });

    const supabase = createAdminClient();
    const { error } = await supabase
        .from('app_releases')
        .update({ is_current: false })
        .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}
