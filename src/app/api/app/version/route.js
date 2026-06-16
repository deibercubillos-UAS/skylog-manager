import { createAdminClient } from '@/lib/supabaseServer';

export async function GET() {
    try {
        const supabase = createAdminClient();
        const { data, error } = await supabase
            .from('app_releases')
            .select('version_name, version_code, apk_url, release_notes, force_update')
            .eq('is_current', true)
            .order('version_code', { ascending: false })
            .limit(1)
            .single();

        if (error || !data) {
            return Response.json({ error: 'No version found' }, { status: 404 });
        }

        return Response.json(data);
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
}
