import { NextResponse } from 'next/server';
import { guardArdisRoute } from '@/lib/ardis/guard';
import { createArdisAdminClient } from '@/lib/ardis/admin';

export async function GET(request) {
  const guard = guardArdisRoute();
  if (guard) return guard;

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('project_id');
  const status = searchParams.get('status');
  const area = searchParams.get('area');

  const supabase = createArdisAdminClient();
  let query = supabase.from('tasks').select('*').order('due_at', { ascending: true, nullsFirst: false });
  if (projectId) query = query.eq('project_id', projectId);
  if (status) query = query.eq('status', status);
  if (area) query = query.eq('area', area);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ tasks: data });
}

export async function POST(request) {
  const guard = guardArdisRoute();
  if (guard) return guard;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  }

  const title = body?.title?.trim();
  if (!title) {
    return NextResponse.json({ error: 'title es requerido' }, { status: 400 });
  }

  const supabase = createArdisAdminClient();
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title,
      project_id: body.project_id || null,
      area: body.area || null,
      start_date: body.start_date || null,
      due_at: body.due_at || null,
      priority: body.priority ?? 2,
      status: body.status || (body.due_at ? 'todo' : 'inbox'),
      waiting_for: body.waiting_for || null,
      recurrence: body.recurrence || null,
      depends_on: body.depends_on || null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ task: data }, { status: 201 });
}
