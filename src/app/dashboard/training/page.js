import { createClient } from '@/lib/supabaseServer';
import TrainingClient from './TrainingClient';

export const dynamic = 'force-dynamic';

export default async function TrainingPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('profiles').select('organization_id, role').eq('id', user?.id).single();
    const orgId = profile?.organization_id;

    const [{ data: programs }, { data: evaluations }, { data: pilots }] = await Promise.all([
        supabase.from('training_programs').select('*').eq('organization_id', orgId),
        supabase.from('training_evaluations')
            .select('*, pilot:pilot_id(name)')
            .eq('organization_id', orgId)
            .order('evaluation_date', { ascending: false }),
        supabase.from('pilots').select('id, name').eq('organization_id', orgId).order('name'),
    ]);

    const programsByType = { operaciones: null, mantenimiento: null };
    (programs || []).forEach(p => { programsByType[p.type] = p; });

    const evaluationsByType = { operaciones: [], mantenimiento: [] };
    (evaluations || []).forEach(e => { evaluationsByType[e.type]?.push(e); });

    const initialData = {
        organizationId: orgId,
        role: profile?.role,
        programs: programsByType,
        evaluations: evaluationsByType,
        pilots: pilots || [],
    };

    return <TrainingClient initialData={initialData} />;
}
