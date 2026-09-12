// Skylog V2.0 — Área de Capacitación y Examen. Estado de cumplimiento —
// propio (cualquier persona) o de toda la organización (solo gestores, para
// el roster de seguimiento).
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson, isDutyManager } from '@/lib/v2/duty';
import { computeExamCompliance } from '@skylog/domain';

function toDomainExam(row) {
  if (!row) return null;
  return {
    recurrence: row.recurrence,
    recurrenceDays: row.recurrence_days,
    startDate: row.start_date,
    maxAttempts: row.max_attempts,
    passingScore: Number(row.passing_score),
  };
}

export async function GET(request) {
  const supabase = await createClientSSR();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get('organizationId');
  if (!organizationId) return Response.json({ error: 'organizationId es requerido' }, { status: 400 });

  const { error: resolveError, personId, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (resolveError) return Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 });
  if (!personId) return Response.json({ error: 'Esta cuenta no tiene un registro de Persona vinculado todavía' }, { status: 404 });

  const { data: examRow, error: examError } = await supabase
    .from('training_exams')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (examError) return Response.json({ error: examError.message }, { status: 500 });
  const exam = toDomainExam(examRow);

  if (isDutyManager(memberships, organizationId)) {
    // Roster completo — una fila por miembro con membresía activa.
    const { data: orgMembers, error: membersError } = await supabase
      .from('memberships')
      .select('person_id, people(full_name)')
      .eq('organization_id', organizationId)
      .eq('status', 'activa');
    if (membersError) return Response.json({ error: membersError.message }, { status: 500 });

    const { data: attempts, error: attemptsError } = await supabase
      .from('training_exam_attempts')
      .select('person_id, cycle_start, passed')
      .eq('organization_id', organizationId);
    if (attemptsError) return Response.json({ error: attemptsError.message }, { status: 500 });

    const roster = (orgMembers || []).map((m) => {
      const personAttempts = (attempts || [])
        .filter((a) => a.person_id === m.person_id)
        .map((a) => ({ cycleStart: a.cycle_start, passed: a.passed }));
      return {
        personId: m.person_id,
        fullName: m.people?.full_name || m.person_id,
        compliance: computeExamCompliance(exam, personAttempts),
      };
    });

    return Response.json({ exam: examRow, roster });
  }

  const { data: attempts, error: attemptsError } = await supabase
    .from('training_exam_attempts')
    .select('cycle_start, passed')
    .eq('organization_id', organizationId)
    .eq('person_id', personId);
  if (attemptsError) return Response.json({ error: attemptsError.message }, { status: 500 });

  const compliance = computeExamCompliance(
    exam,
    (attempts || []).map((a) => ({ cycleStart: a.cycle_start, passed: a.passed }))
  );

  return Response.json({ exam: examRow, compliance });
}
