import { NextResponse } from 'next/server';
import { guardArdisRoute } from '@/lib/ardis/guard';
import { createArdisAdminClient } from '@/lib/ardis/admin';

export async function GET(request, { params }) {
  const guard = guardArdisRoute();
  if (guard) return guard;

  const supabase = createArdisAdminClient();
  const { data: project, error } = await supabase.from('projects').select('*').eq('id', params.id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });

  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('*')
    .eq('project_id', params.id)
    .order('due_at', { ascending: true, nullsFirst: false });
  if (tasksError) return NextResponse.json({ error: tasksError.message }, { status: 500 });

  const done = (tasks || []).filter((t) => t.status === 'done').length;
  const total = (tasks || []).length;

  return NextResponse.json({
    project: { ...project, progress: total ? Math.round((done / total) * 100) : 0, taskCount: total },
    tasks: tasks || [],
  });
}

export async function PATCH(request, { params }) {
  const guard = guardArdisRoute();
  if (guard) return guard;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  }

  const allowed = ['name', 'area', 'start_date', 'due_date', 'status'];
  const updates = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 });
  }

  const supabase = createArdisAdminClient();
  const { data, error } = await supabase.from('projects').update(updates).eq('id', params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ project: data });
}

export async function DELETE(request, { params }) {
  const guard = guardArdisRoute();
  if (guard) return guard;

  const supabase = createArdisAdminClient();
  const { error } = await supabase.from('projects').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
