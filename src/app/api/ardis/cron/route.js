import { NextResponse } from 'next/server';
import { isArdisEnabled } from '@/lib/ardis/env';
import { createArdisAdminClient } from '@/lib/ardis/admin';
import { sendPushToAll } from '@/lib/ardis/push';
import { syncGanttToSheet, backupToDrive } from '@/lib/ardis/gas';
import { colombiaStartOfDay, colombiaEndOfDay } from '@/lib/ardis/colombiaTime';

// Colombia es UTC-5 todo el año (sin horario de verano) — seguro fijarlo.
// 21:00–6:00 hora Colombia == 02:00–11:00 UTC.
function isQuietHoursUtc(date) {
  const utcHour = date.getUTCHours();
  return utcHour >= 2 && utcHour < 11;
}

async function getOpenTasksWithDeps(supabase) {
  const { data: allTasks, error } = await supabase.from('tasks').select('*');
  if (error) throw new Error(error.message);
  const doneIds = new Set(allTasks.filter((t) => t.status === 'done').map((t) => t.id));
  return allTasks
    .filter((t) => t.status !== 'done')
    .filter((t) => !t.depends_on || doneIds.has(t.depends_on));
}

// Ruta de sistema — no usa guardArdisRoute() (eso exige cookie de sesión de
// navegador). Se valida con su propio secreto, como pide la regla 6.
export async function GET(request) {
  if (!isArdisEnabled()) {
    return new NextResponse(null, { status: 404 });
  }

  const url = new URL(request.url);
  const secret = request.headers.get('x-ardis-cron-secret') || url.searchParams.get('secret');
  if (!process.env.ARDIS_CRON_SECRET || secret !== process.env.ARDIS_CRON_SECRET) {
    return new NextResponse(null, { status: 404 });
  }

  const kind = url.searchParams.get('kind');
  const supabase = createArdisAdminClient();
  const now = new Date();

  // Respaldo silencioso: no es un aviso al usuario, así que corre sin
  // importar la hora — perderlo por caer en la ventana de silencio sería peor
  // que mandarlo de madrugada.
  if (kind === 'gantt_backup') {
    const { data: projects, error: projectsError } = await supabase.from('projects').select('*');
    const { data: tasks, error: tasksError } = await supabase.from('tasks').select('*');
    if (projectsError || tasksError) {
      return NextResponse.json({ ok: false, kind, error: (projectsError || tasksError).message }, { status: 500 });
    }

    try {
      for (const project of projects || []) {
        const projectTasks = (tasks || []).filter((t) => t.project_id === project.id);
        await syncGanttToSheet(project.name, projectTasks);
      }
      await backupToDrive({ projects, tasks, exportedAt: now.toISOString() });
    } catch (err) {
      return NextResponse.json({ ok: false, kind, error: err.message }, { status: 502 });
    }

    return NextResponse.json({ ok: true, kind, projects: projects?.length || 0 });
  }

  // Todo lo demás son avisos push — respetan la ventana de silencio aunque
  // GitHub Actions dispare tarde por algún retraso del runner.
  if (isQuietHoursUtc(now)) {
    return NextResponse.json({ ok: true, kind, skipped: 'quiet_hours' });
  }

  if (kind === 'daily_summary') {
    const openTasks = await getOpenTasksWithDeps(supabase);
    const endOfToday = colombiaEndOfDay(now);
    const dueToday = openTasks.filter((t) => t.due_at && new Date(t.due_at) < endOfToday);

    const body = dueToday.length
      ? `${dueToday.length} tareas para hoy: ${dueToday.slice(0, 3).map((t) => t.title).join(', ')}${dueToday.length > 3 ? '…' : ''}`
      : `Sin tareas vencidas para hoy. ${openTasks.length} abiertas en total.`;

    const result = await sendPushToAll({ title: 'Buenos días — ARDIS', body, url: '/ardis' });
    return NextResponse.json({ ok: true, kind, ...result });
  }

  if (kind === 'due_soon') {
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const { data: dueSoon, error } = await supabase
      .from('tasks')
      .select('*')
      .neq('status', 'done')
      .is('due_soon_notified_at', null)
      .not('due_at', 'is', null)
      .lte('due_at', in24h.toISOString());
    if (error) return NextResponse.json({ ok: false, kind, error: error.message }, { status: 500 });

    if (!dueSoon?.length) {
      return NextResponse.json({ ok: true, kind, notified: 0 });
    }

    const body = `${dueSoon.length} tarea(s) vencen pronto: ${dueSoon.slice(0, 3).map((t) => t.title).join(', ')}${dueSoon.length > 3 ? '…' : ''}`;
    const result = await sendPushToAll({ title: 'Vence pronto — ARDIS', body, url: '/ardis' });

    await supabase
      .from('tasks')
      .update({ due_soon_notified_at: now.toISOString() })
      .in('id', dueSoon.map((t) => t.id));

    return NextResponse.json({ ok: true, kind, notified: dueSoon.length, ...result });
  }

  if (kind === 'close_reminder') {
    const openTasks = await getOpenTasksWithDeps(supabase);
    const startOfToday = colombiaStartOfDay(now);
    const { data: allTasks, error } = await supabase.from('tasks').select('status, done_at');
    if (error) return NextResponse.json({ ok: false, kind, error: error.message }, { status: 500 });

    const completedToday = (allTasks || []).filter(
      (t) => t.status === 'done' && t.done_at && new Date(t.done_at) >= startOfToday
    ).length;

    const body = `Hoy completaste ${completedToday}, quedan ${openTasks.length} abiertas.`;
    const result = await sendPushToAll({ title: 'Cierre del día — ARDIS', body, url: '/ardis' });
    return NextResponse.json({ ok: true, kind, ...result });
  }

  if (kind === 'weekly_review') {
    const { data: projects, error: projectsError } = await supabase.from('projects').select('*').eq('status', 'active');
    const { data: tasks, error: tasksError } = await supabase.from('tasks').select('project_id, status');
    if (projectsError || tasksError) {
      return NextResponse.json({ ok: false, kind, error: (projectsError || tasksError).message }, { status: 500 });
    }

    const lines = (projects || []).map((p) => {
      const projectTasks = (tasks || []).filter((t) => t.project_id === p.id);
      const done = projectTasks.filter((t) => t.status === 'done').length;
      const total = projectTasks.length;
      const pct = total ? Math.round((done / total) * 100) : 0;
      return `${p.name}: ${pct}%`;
    });

    const body = lines.length ? lines.join(' · ') : 'Sin proyectos activos.';
    const result = await sendPushToAll({ title: 'Revisión semanal — ARDIS', body, url: '/ardis' });
    return NextResponse.json({ ok: true, kind, ...result });
  }

  return NextResponse.json({ error: 'kind desconocido' }, { status: 400 });
}
