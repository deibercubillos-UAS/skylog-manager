import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProjectWithTasks } from '@/lib/ardis/actions';
import TaskRow from '../../TaskRow';
import GanttChart from './GanttChart';

export default async function ArdisProyectoPage({ params }) {
  const data = await getProjectWithTasks(params.id);
  if (!data) notFound();

  const { project, tasks } = data;
  const withDates = tasks.filter((t) => t.start_date || t.due_at);
  const withoutDates = tasks.filter((t) => !t.start_date && !t.due_at);

  return (
    <main className="mx-auto max-w-md px-4 pt-8">
      <Link href="/ardis/proyectos" className="text-sm text-white/40">
        ← Proyectos
      </Link>

      <h1 className="mt-2 text-2xl font-semibold text-white">{project.name}</h1>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-primary" style={{ width: `${project.progress}%` }} />
      </div>
      <p className="mt-1 text-[11px] text-white/40">
        {project.progress}% · {project.taskCount} tarea{project.taskCount === 1 ? '' : 's'}
      </p>

      <GanttChart tasks={withDates} />

      {withoutDates.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">Sin fecha</h2>
          <div className="flex flex-col gap-2">
            {withoutDates.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
