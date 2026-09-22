import Link from 'next/link';
import { getTaskOverview } from '@/lib/ardis/actions';
import TaskRow from './TaskRow';

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export default async function ArdisHoyPage() {
  const { dueToday, nextTask, openTasks, completedToday, inboxTasks } = await getTaskOverview();
  const restOfWeek = openTasks.filter((t) => !dueToday.includes(t)).slice(0, 5);

  return (
    <main className="mx-auto max-w-md px-4 pt-8">
      <h1 className="text-2xl font-semibold text-white">{greeting()}</h1>
      <p className="mt-1 text-sm text-white/50">
        {dueToday.length
          ? `${dueToday.length} tarea${dueToday.length === 1 ? '' : 's'} para hoy`
          : 'Sin tareas vencidas para hoy'}
        {' · '}
        {completedToday.length} completada{completedToday.length === 1 ? '' : 's'}
      </p>

      {nextTask && (
        <section className="mt-6 rounded-2xl bg-gradient-to-br from-primary to-orange-600 p-5 shadow-lg shadow-primary/20">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Siguiente</p>
          <p className="mt-1 text-lg font-semibold text-white">{nextTask.title}</p>
        </section>
      )}

      {inboxTasks.length > 0 && (
        <Link
          href="/ardis/inbox"
          className="mt-4 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
        >
          <span className="flex items-center gap-2 text-sm text-white/80">
            <span className="material-symbols-outlined text-[18px]">inbox</span>
            Inbox sin procesar
          </span>
          <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary">
            {inboxTasks.length}
          </span>
        </Link>
      )}

      {dueToday.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">Hoy</h2>
          <div className="flex flex-col gap-2">
            {dueToday.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>
        </section>
      )}

      {restOfWeek.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">Próximas</h2>
          <div className="flex flex-col gap-2">
            {restOfWeek.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>
        </section>
      )}

      {!nextTask && dueToday.length === 0 && restOfWeek.length === 0 && (
        <p className="mt-10 text-center text-sm text-white/40">
          No tienes tareas pendientes. Toca &ldquo;Hablar&rdquo; para crear una.
        </p>
      )}
    </main>
  );
}
