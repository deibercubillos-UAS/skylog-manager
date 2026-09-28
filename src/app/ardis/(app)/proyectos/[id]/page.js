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
    <main className="mx-auto max-w-md px-4 pt-10">
      <Link
        href="/ardis/proyectos"
        className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.25em] text-white/30 hover:text-primary"
      >
        <span className="material-symbols-outlined text-sm">chevron_left</span>
        Proyectos
      </Link>

      <h1 className="mt-3 text-2xl font-bold tracking-tight text-white">{project.name}</h1>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-orange-400 shadow-[0_0_8px_rgba(236,91,19,0.6)]"
          style={{ width: `${project.progress}%` }}
        />
      </div>
      <p className="mt-1.5 font-mono text-[10px] text-white/30">
        <span className="text-primary/80">{project.progress}%</span> · {project.taskCount} tarea
        {project.taskCount === 1 ? '' : 's'}
      </p>

      <GanttChart tasks={withDates} />

      {withoutDates.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-white/30">
            Sin fecha
          </h2>
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
