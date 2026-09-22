import { getTaskOverview, listProjectsWithProgress } from '@/lib/ardis/actions';
import InboxCard from './InboxCard';

export default async function ArdisInboxPage() {
  const [{ inboxTasks }, projects] = await Promise.all([getTaskOverview(), listProjectsWithProgress()]);

  return (
    <main className="mx-auto max-w-md px-4 pt-8">
      <h1 className="text-2xl font-semibold text-white">Inbox</h1>
      <p className="mt-1 text-sm text-white/50">
        Tareas capturadas sin clasificar — de Siri, o creadas sin fecha ni proyecto.
      </p>

      {inboxTasks.length === 0 && (
        <p className="mt-10 text-center text-sm text-white/40">Inbox vacío. Buen trabajo.</p>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {inboxTasks.map((task) => (
          <InboxCard key={task.id} task={task} projects={projects} />
        ))}
      </div>
    </main>
  );
}
