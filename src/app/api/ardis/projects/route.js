import { NextResponse } from 'next/server';
import { guardArdisRoute } from '@/lib/ardis/guard';
import { createArdisAdminClient } from '@/lib/ardis/admin';
import { listProjectsWithProgress } from '@/lib/ardis/actions';

export async function GET() {
  const guard = guardArdisRoute();
  if (guard) return guard;

  try {
    const projects = await listProjectsWithProgress();
    return NextResponse.json({ projects });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
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

  const name = body?.name?.trim();
  if (!name) {
    return NextResponse.json({ error: 'name es requerido' }, { status: 400 });
  }

  const supabase = createArdisAdminClient();
  const { data, error } = await supabase
    .from('projects')
    .insert({
      name,
      area: body.area || null,
      start_date: body.start_date || null,
      due_date: body.due_date || null,
      status: body.status || 'active',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ project: { ...data, progress: 0, taskCount: 0 } }, { status: 201 });
}
