import { getTaskOverview, listProjectsWithProgress } from '@/lib/ardis/actions';
import InboxCard from './InboxCard';

export default async function ArdisInboxPage() {
  const [{ inboxTasks }, projects] = await Promise.all([getTaskOverview(), listProjectsWithProgress()]);

  return (
    <main className="mx-auto max-w-md px-4 pt-10">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary/70">Captura</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">Inbox</h1>
      <p className="mt-1 text-sm text-white/40">
        Tareas capturadas sin clasificar — de Siri, o creadas sin fecha ni proyecto.
      </p>

      {inboxTasks.length === 0 && (
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <div className="relative flex h-16 w-16 items-center justify-center">
            <span className="absolute h-16 w-16 rounded-full bg-primary/15 blur-lg" />
            <span className="material-symbols-outlined relative text-3xl text-primary/70">inbox</span>
          </div>
          <p className="text-sm text-white/40">Inbox vacío. Buen trabajo.</p>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {inboxTasks.map((task) => (
          <InboxCard key={task.id} task={task} projects={projects} />
        ))}
      </div>
    </main>
  );
}
