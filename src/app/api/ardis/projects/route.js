import { NextResponse } from 'next/server';
import { guardArdisRoute } from '@/lib/ardis/guard';
import { createArdisAdminClient } from '@/lib/ardis/admin';

function withProgress(project, tasks) {
  const projectTasks = tasks.filter((t) => t.project_id === project.id);
  const done = projectTasks.filter((t) => t.status === 'done').length;
  const total = projectTasks.length;
  return { ...project, progress: total ? Math.round((done / total) * 100) : 0, taskCount: total };
}

export async function GET() {
  const guard = guardArdisRoute();
  if (guard) return guard;

  const supabase = createArdisAdminClient();
  const [{ data: projects, error: projectsError }, { data: tasks, error: tasksError }] = await Promise.all([
    supabase.from('projects').select('*').order('created_at', { ascending: false }),
    supabase.from('tasks').select('id, project_id, status'),
  ]);

  if (projectsError) return NextResponse.json({ error: projectsError.message }, { status: 500 });
  if (tasksError) return NextResponse.json({ error: tasksError.message }, { status: 500 });

  return NextResponse.json({ projects: (projects || []).map((p) => withProgress(p, tasks || [])) });
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
