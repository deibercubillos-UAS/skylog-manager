import { NextResponse } from 'next/server';
import { guardArdisRoute } from '@/lib/ardis/guard';
import { createArdisAdminClient } from '@/lib/ardis/admin';

const ALLOWED_FIELDS = [
  'title',
  'project_id',
  'area',
  'start_date',
  'due_at',
  'priority',
  'status',
  'waiting_for',
  'recurrence',
  'depends_on',
];

export async function GET(request, { params }) {
  const guard = guardArdisRoute();
  if (guard) return guard;

  const supabase = createArdisAdminClient();
  const { data, error } = await supabase.from('tasks').select('*').eq('id', params.id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ task: data });
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

  const updates = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in body) updates[key] = body[key];
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 });
  }
  if (updates.status === 'done' && !('done_at' in updates)) {
    updates.done_at = new Date().toISOString();
  }

  const supabase = createArdisAdminClient();
  const { data, error } = await supabase.from('tasks').update(updates).eq('id', params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ task: data });
}

export async function DELETE(request, { params }) {
  const guard = guardArdisRoute();
  if (guard) return guard;

  const supabase = createArdisAdminClient();
  const { error } = await supabase.from('tasks').delete().eq('id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
