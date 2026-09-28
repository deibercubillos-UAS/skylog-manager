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

  const empty = !nextTask && dueToday.length === 0 && restOfWeek.length === 0;

  return (
    <main className="mx-auto max-w-md px-4 pt-10">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary/70">Ardis · en línea</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">{greeting()}</h1>
      <p className="mt-1 text-sm text-white/40">
        {dueToday.length
          ? `${dueToday.length} tarea${dueToday.length === 1 ? '' : 's'} para hoy`
          : 'Sin tareas vencidas para hoy'}
        {' · '}
        {completedToday.length} completada{completedToday.length === 1 ? '' : 's'}
      </p>

      {nextTask && (
        <section className="relative mt-6 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary to-orange-700 p-5 shadow-[0_0_40px_rgba(236,91,19,0.25)]">
          <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-white/80">Siguiente</p>
          <p className="mt-1 text-lg font-semibold text-white">{nextTask.title}</p>
        </section>
      )}

      {inboxTasks.length > 0 && (
        <Link
          href="/ardis/inbox"
          className="mt-4 flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.03]
                     px-4 py-3 backdrop-blur-sm transition hover:border-white/10"
        >
          <span className="flex items-center gap-2 text-sm text-white/80">
            <span className="material-symbols-outlined text-[18px] text-primary">inbox</span>
            Inbox sin procesar
          </span>
          <span className="rounded-full bg-primary/20 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
            {inboxTasks.length}
          </span>
        </Link>
      )}

      {dueToday.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-white/30">Hoy</h2>
          <div className="flex flex-col gap-2">
            {dueToday.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>
        </section>
      )}

      {restOfWeek.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[0.25em] text-white/30">
            Próximas
          </h2>
          <div className="flex flex-col gap-2">
            {restOfWeek.map((task) => (
              <TaskRow key={task.id} task={task} />
            ))}
          </div>
        </section>
      )}

      {empty && (
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <div className="relative flex h-16 w-16 items-center justify-center">
            <span className="absolute h-16 w-16 rounded-full bg-primary/15 blur-lg" />
            <span className="material-symbols-outlined relative text-3xl text-primary/70">check_circle</span>
          </div>
          <p className="max-w-[16rem] text-sm text-white/40">
            No tienes tareas pendientes. Toca <span className="text-primary">Hablar</span> para crear la primera.
          </p>
        </div>
      )}
    </main>
  );
}
