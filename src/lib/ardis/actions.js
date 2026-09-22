import { createArdisAdminClient } from './admin.js';
import { computeNextOccurrence } from './recurrence.js';

// Ejecuta una intención ya confirmada por el usuario contra ardis.projects /
// ardis.tasks. La fecha (dueAt) ya viene resuelta desde /api/ardis/command
// (fresca, calculada con chrono sobre el texto actual) — esta función no
// vuelve a interpretar fechas, solo persiste.

async function findTaskByTitle(supabase, title) {
  if (!title) return null;
  const { data } = await supabase
    .from('tasks')
    .select('*')
    .ilike('title', `%${title}%`)
    .neq('status', 'done')
    .order('created_at', { ascending: false })
    .limit(1);
  return data?.[0] || null;
}

async function findProjectByName(supabase, name) {
  if (!name) return null;
  const { data } = await supabase.from('projects').select('*').ilike('name', `%${name}%`).limit(1);
  return data?.[0] || null;
}

export async function executeIntent(intent) {
  const supabase = createArdisAdminClient();

  switch (intent.type) {
    case 'create_task': {
      let dependsOn = null;
      if (intent.dependsOnTitle) {
        const dep = await findTaskByTitle(supabase, intent.dependsOnTitle);
        dependsOn = dep?.id || null;
      }

      const dueAt = intent.dueAt || null;
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          title: intent.title,
          area: intent.area || null,
          due_at: dueAt ? new Date(dueAt).toISOString() : null,
          status: dueAt ? 'todo' : 'inbox',
          waiting_for: intent.waitingFor || null,
          recurrence: intent.recurrence || null,
          depends_on: dependsOn,
        })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return { task: data };
    }

    case 'complete_task': {
      const task = await findTaskByTitle(supabase, intent.title);
      if (!task) return { error: 'No encontré una tarea con ese nombre' };

      const now = new Date().toISOString();
      const { data: updated, error } = await supabase
        .from('tasks')
        .update({ status: 'done', done_at: now })
        .eq('id', task.id)
        .select()
        .single();
      if (error) throw new Error(error.message);

      let nextTask = null;
      if (task.recurrence) {
        const nextDue = computeNextOccurrence(task.recurrence, task.due_at || now);
        if (nextDue) {
          const { data: created } = await supabase
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
          nextTask = created || null;
        }
      }
      return { task: updated, nextTask };
    }

    case 'postpone_task': {
      const task = await findTaskByTitle(supabase, intent.title);
      if (!task) return { error: 'No encontré una tarea con ese nombre' };
      if (!intent.dueAt) return { error: 'No pude interpretar la nueva fecha' };

      const { data, error } = await supabase
        .from('tasks')
        .update({ due_at: new Date(intent.dueAt).toISOString() })
        .eq('id', task.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return { task: data };
    }

    case 'progress_update': {
      const project = await findProjectByName(supabase, intent.target);
      if (!project) return { error: 'No encontré un proyecto con ese nombre' };

      const { data: tasks, error } = await supabase.from('tasks').select('status').eq('project_id', project.id);
      if (error) throw new Error(error.message);
      const done = tasks.filter((t) => t.status === 'done').length;
      const total = tasks.length;
      const progress = total ? Math.round((done / total) * 100) : 0;

      return {
        project: { ...project, progress },
        note: 'El avance se calcula de las tareas, no se guarda un porcentaje manual.',
      };
    }

    case 'daily_summary':
    case 'next_task':
    case 'day_close': {
      const { data: allTasks, error } = await supabase.from('tasks').select('*');
      if (error) throw new Error(error.message);

      const doneIds = new Set(allTasks.filter((t) => t.status === 'done').map((t) => t.id));
      const openTasks = allTasks
        .filter((t) => t.status !== 'done')
        .filter((t) => !t.depends_on || doneIds.has(t.depends_on))
        .sort((a, b) => {
          if (!a.due_at) return 1;
          if (!b.due_at) return -1;
          return new Date(a.due_at) - new Date(b.due_at);
        });

      if (intent.type === 'next_task') {
        return { task: openTasks[0] || null };
      }

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date(startOfToday);
      endOfToday.setDate(endOfToday.getDate() + 1);

      if (intent.type === 'daily_summary') {
        const dueToday = openTasks.filter((t) => t.due_at && new Date(t.due_at) < endOfToday);
        return { dueToday, totalOpen: openTasks.length };
      }

      const completedToday = allTasks.filter(
        (t) => t.status === 'done' && t.done_at && new Date(t.done_at) >= startOfToday
      );
      return { completedToday, remaining: openTasks.length };
    }

    default:
      return { error: 'Tipo de intención desconocido' };
  }
}
