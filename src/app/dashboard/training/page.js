import { createClient } from '@/lib/supabaseServer';
import TrainingClient from './TrainingClient';
import { getOrgContext } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

export default async function TrainingPage() {
    const supabase = await createClient();
    const ctx = await getOrgContext(supabase);
    const user = ctx.user;
    const profile = { organization_id: ctx.orgId, role: ctx.role };
    const orgId = profile.organization_id;

    const [
        { data: sessions },
        { data: exams },
        { data: questions },
        { data: attempts },
        { data: pilots },
        { data: myPilot },
        { data: smsSessions },
    ] = await Promise.all([
        supabase.from('training_sessions').select('*').eq('organization_id', orgId).order('topic'),
        supabase.from('training_exams').select('*').eq('organization_id', orgId),
        supabase.from('training_exam_questions').select('id, exam_id, question_text, options, order_index').eq('organization_id', orgId).order('order_index'),
        supabase.from('training_exam_attempts').select('*').eq('organization_id', orgId).order('submitted_at', { ascending: false }),
        supabase.from('pilots').select('id, name').eq('organization_id', orgId).order('name'),
        supabase.from('pilots').select('id').eq('organization_id', orgId)
            .or(`email.eq.${user?.email},owner_id.eq.${user?.id},profile_id.eq.${user?.id}`)
            .limit(1).maybeSingle(),
        // Cronograma de Capacitación SMS (todo el personal) — RLS restringe las filas a
        // superadmin/admin/gerente_sms; para jefe_pilotos/piloto simplemente viene vacío.
        supabase.from('sms_training_sessions')
            .select('*, attendance:sms_training_attendance(*, profile:profile_id(full_name, email, role))')
            .eq('organization_id', orgId).order('topic'),
    ]);

    const byType = (rows) => {
        const out = { operaciones: [], mantenimiento: [] };
        (rows || []).forEach(r => { out[r.type]?.push(r); });
        return out;
    };

    const examsByType = { operaciones: null, mantenimiento: null };
    (exams || []).forEach(e => { examsByType[e.type] = e; });

    const questionsByExam = {};
    (questions || []).forEach(q => { (questionsByExam[q.exam_id] ||= []).push(q); });

    const initialData = {
        organizationId: orgId,
        role: profile?.role,
        myPilotId: myPilot?.id || null,
        sessions: byType(sessions),
        exams: examsByType,
        questionsByExam,
        attempts: attempts || [],
        pilots: pilots || [],
        smsSessions: smsSessions || [],
    };

    return <TrainingClient initialData={initialData} />;
}
