import Link from 'next/link';
import { listProjectsWithProgress } from '@/lib/ardis/actions';

const STATUS_LABEL = { active: 'Activo', paused: 'Pausado', done: 'Terminado' };

export default async function ArdisProyectosPage() {
  const projects = await listProjectsWithProgress();

  return (
    <main className="mx-auto max-w-md px-4 pt-8">
      <h1 className="text-2xl font-semibold text-white">Proyectos</h1>

      {projects.length === 0 && (
        <p className="mt-10 text-center text-sm text-white/40">
          Sin proyectos todavía. Créalos hablando con ARDIS.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/ardis/proyectos/${project.id}`}
            className="block rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3"
          >
            <div className="flex items-center justify-between">
              <p className="font-medium text-white">{project.name}</p>
              <span className="text-xs text-white/40">{STATUS_LABEL[project.status] || project.status}</span>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-primary" style={{ width: `${project.progress}%` }} />
            </div>
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-white/40">
              <span>{project.taskCount} tarea{project.taskCount === 1 ? '' : 's'}</span>
              <span>{project.progress}%</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
