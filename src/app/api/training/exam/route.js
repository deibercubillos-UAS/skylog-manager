import { NextResponse } from 'next/server';
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { getOrgContext } from '@/lib/apiAuth';
import { computeCompliance } from '@/lib/trainingCompliance';

export const dynamic = 'force-dynamic';

// RLS de training_exam_questions solo permite leer a managers (para no revelar
// correct_index a quien va a presentar el examen) — este endpoint usa el admin
// client para resolver preguntas/intentos del piloto, y es el único que decide
// qué se expone al cliente (nunca correct_index mientras no se haya calificado).
async function resolvePilot(supabase, orgId, user) {
    const { data } = await supabase
        .from('pilots')
        .select('id')
        .eq('organization_id', orgId)
        .or(`email.eq.${user.email},owner_id.eq.${user.id},profile_id.eq.${user.id}`)
        .limit(1)
        .maybeSingle();
    return data?.id || null;
}

// GET /api/training/exam?type=operaciones|mantenimiento
export async function GET(request) {
    try {
        const type = new URL(request.url).searchParams.get('type');
        if (!['operaciones', 'mantenimiento'].includes(type)) {
            return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
        }

        const supabase = await createClientSSR();
        const { user, orgId } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });

        const pilotId = await resolvePilot(supabase, orgId, user);
        if (!pilotId) return NextResponse.json({ error: 'No se encontró un registro de tripulante para tu cuenta.' }, { status: 404 });

        const admin = createAdminClient();
        const { data: exam } = await admin.from('training_exams').select('*').eq('organization_id', orgId).eq('type', type).maybeSingle();
        if (!exam) return NextResponse.json({ exam: null });

        const { data: attempts } = await admin
            .from('training_exam_attempts')
            .select('id, cycle_start, attempt_number, score, passed, submitted_at')
            .eq('exam_id', exam.id)
            .eq('pilot_id', pilotId)
            .order('submitted_at', { ascending: false });

        const compliance = computeCompliance(exam, attempts);

        // Solo se envían las preguntas (sin correct_index) si al piloto le queda
        // al menos un intento disponible en el ciclo vigente — evita exponer el
        // banco de preguntas sin motivo una vez agotados los intentos.
        let questions = [];
        if (compliance.attemptsLeft > 0) {
            const { data: qs } = await admin
                .from('training_exam_questions')
                .select('id, question_text, options')
                .eq('exam_id', exam.id)
                .order('order_index');
            questions = qs || [];
        }

        return NextResponse.json({ exam, questions, compliance, attempts: attempts || [] });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// POST /api/training/exam — { type, answers: [{ question_id, selected_index }] }
export async function POST(request) {
    try {
        const body = await request.json();
        const { type, answers } = body;
        if (!['operaciones', 'mantenimiento'].includes(type)) {
            return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
        }
        if (!Array.isArray(answers) || answers.length === 0) {
            return NextResponse.json({ error: 'Sin respuestas' }, { status: 400 });
        }

        const supabase = await createClientSSR();
        const { user, orgId } = await getOrgContext(supabase);
        if (!user)  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
        if (!orgId) return NextResponse.json({ error: 'Sin organización asignada' }, { status: 403 });

        const pilotId = await resolvePilot(supabase, orgId, user);
        if (!pilotId) return NextResponse.json({ error: 'No se encontró un registro de tripulante para tu cuenta.' }, { status: 404 });

        const admin = createAdminClient();
        const { data: exam } = await admin.from('training_exams').select('*').eq('organization_id', orgId).eq('type', type).maybeSingle();
        if (!exam) return NextResponse.json({ error: 'Este examen ya no está configurado.' }, { status: 404 });

        const { data: priorAttempts } = await admin
            .from('training_exam_attempts')
            .select('cycle_start, passed')
            .eq('exam_id', exam.id)
            .eq('pilot_id', pilotId);

        const compliance = computeCompliance(exam, priorAttempts);
        if (compliance.attemptsLeft <= 0) {
            return NextResponse.json({ error: 'Ya agotaste los intentos disponibles para este ciclo.' }, { status: 409 });
        }

        const { data: questions } = await admin
            .from('training_exam_questions')
            .select('id, correct_index')
            .eq('exam_id', exam.id);
        if (!questions || questions.length === 0) {
            return NextResponse.json({ error: 'El examen no tiene preguntas configuradas.' }, { status: 409 });
        }

        const correctById = Object.fromEntries(questions.map(q => [q.id, q.correct_index]));
        let correctCount = 0;
        answers.forEach(a => { if (correctById[a.question_id] === a.selected_index) correctCount++; });
        const score = Math.round((correctCount / questions.length) * 100);
        const passed = score >= Number(exam.passing_score);
        const cycleStartISO = compliance.cycleStart;
        const attemptNumber = compliance.attemptsUsed + 1;

        const { data: attempt, error } = await admin.from('training_exam_attempts').insert([{
            organization_id: orgId,
            exam_id: exam.id,
            pilot_id: pilotId,
            cycle_start: cycleStartISO,
            attempt_number: attemptNumber,
            answers,
            score,
            passed,
        }]).select().single();
        if (error) throw error;

        // Refleja el resultado en el expediente de Tripulante (misma tabla que ya
        // alimenta EditPilotPanel, el PDF de expediente y Reportes) sin tocar esas
        // 3 integraciones ya construidas.
        await admin.from('training_evaluations').insert([{
            organization_id: orgId,
            pilot_id: pilotId,
            type,
            evaluation_date: new Date().toISOString().split('T')[0],
            result: passed ? 'aprobado' : 'no_aprobado',
            evaluator_name: 'Examen interno (automático)',
            notes: `Puntaje: ${score}% · Intento ${attemptNumber}/${exam.max_attempts}`,
            created_by: user.id,
        }]);

        return NextResponse.json({ attempt, score, passed, correctCount, total: questions.length });
    } catch (err) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
