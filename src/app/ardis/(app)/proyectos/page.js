import Link from 'next/link';
import { listProjectsWithProgress } from '@/lib/ardis/actions';

const STATUS_LABEL = { active: 'Activo', paused: 'Pausado', done: 'Terminado' };

export default async function ArdisProyectosPage() {
  const projects = await listProjectsWithProgress();

  return (
    <main className="mx-auto max-w-md px-4 pt-10">
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-primary/70">Panel</p>
      <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">Proyectos</h1>

      {projects.length === 0 && (
        <div className="mt-16 flex flex-col items-center gap-4 text-center">
          <div className="relative flex h-16 w-16 items-center justify-center">
            <span className="absolute h-16 w-16 rounded-full bg-primary/15 blur-lg" />
            <span className="material-symbols-outlined relative text-3xl text-primary/70">bar_chart</span>
          </div>
          <p className="max-w-[16rem] text-sm text-white/40">
            Sin proyectos todavía. Créalos hablando con <span className="text-primary">ARDIS</span>.
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/ardis/proyectos/${project.id}`}
            className="block rounded-2xl border border-white/[0.06] bg-white/[0.03] px-4 py-3.5
                       backdrop-blur-sm transition hover:border-primary/30 hover:bg-white/[0.05]"
          >
            <div className="flex items-center justify-between">
              <p className="font-medium text-white">{project.name}</p>
              <span className="font-mono text-[10px] uppercase tracking-wide text-white/30">
                {STATUS_LABEL[project.status] || project.status}
              </span>
            </div>
            <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-orange-400 shadow-[0_0_8px_rgba(236,91,19,0.6)]"
                style={{ width: `${project.progress}%` }}
              />
            </div>
            <div className="mt-1.5 flex items-center justify-between font-mono text-[10px] text-white/30">
              <span>{project.taskCount} tarea{project.taskCount === 1 ? '' : 's'}</span>
              <span className="text-primary/80">{project.progress}%</span>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
