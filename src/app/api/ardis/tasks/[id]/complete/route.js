import { NextResponse } from 'next/server';
import { guardArdisRoute } from '@/lib/ardis/guard';
import { createArdisAdminClient } from '@/lib/ardis/admin';
import { computeNextOccurrence } from '@/lib/ardis/recurrence';

export async function POST(request, { params }) {
  const guard = guardArdisRoute();
  if (guard) return guard;

  const supabase = createArdisAdminClient();
  const { data: task, error: fetchError } = await supabase.from('tasks').select('*').eq('id', params.id).single();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 404 });

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from('tasks')
    .update({ status: 'done', done_at: now })
    .eq('id', params.id)
    .select()
    .single();
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  // Tarea recurrente: crear la siguiente ocurrencia al completar.
  let nextTask = null;
  if (task.recurrence) {
    const nextDue = computeNextOccurrence(task.recurrence, task.due_at || now);
    if (nextDue) {
      const { data: created, error: createError } = await supabase
        .from('tasks')
        .insert({
          project_id: task.project_id,
          area: task.area,
          title: task.title,
          priority: task.priority,
          status: 'todo',
          recurrence: task.recurrence,
          due_at: nextDue.toISOString(),
        })
        .select()
        .single();
      if (!createError) nextTask = created;
    }
  }

  return NextResponse.json({ task: updated, nextTask });
}
