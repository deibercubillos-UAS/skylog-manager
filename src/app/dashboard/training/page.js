import { createClient } from '@/lib/supabaseServer';
import TrainingClient from './TrainingClient';

export const dynamic = 'force-dynamic';

export default async function TrainingPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('profiles').select('organization_id, role').eq('id', user?.id).single();
    const orgId = profile?.organization_id;

    const [
        { data: sessions },
        { data: exams },
        { data: questions },
        { data: attempts },
        { data: pilots },
        { data: myPilot },
    ] = await Promise.all([
        supabase.from('training_sessions').select('*').eq('organization_id', orgId).order('topic'),
        supabase.from('training_exams').select('*').eq('organization_id', orgId),
        supabase.from('training_exam_questions').select('id, exam_id, question_text, options, order_index').eq('organization_id', orgId).order('order_index'),
        supabase.from('training_exam_attempts').select('*').eq('organization_id', orgId).order('submitted_at', { ascending: false }),
        supabase.from('pilots').select('id, name').eq('organization_id', orgId).order('name'),
        supabase.from('pilots').select('id').eq('organization_id', orgId)
            .or(`email.eq.${user?.email},owner_id.eq.${user?.id},profile_id.eq.${user?.id}`)
            .limit(1).maybeSingle(),
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
    };

    return <TrainingClient initialData={initialData} />;
}
