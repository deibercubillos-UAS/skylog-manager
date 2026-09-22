'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const AREAS = ['SKY', 'WAS', 'BIT', 'PER'];

export default function InboxCard({ task, projects }) {
  const router = useRouter();
  const [projectId, setProjectId] = useState(task.project_id || '');
  const [area, setArea] = useState(task.area || '');
  const [dueAt, setDueAt] = useState(task.due_at ? task.due_at.slice(0, 16) : '');
  const [busy, setBusy] = useState(false);
  const [gone, setGone] = useState(false);

  async function patch(fields) {
    setBusy(true);
    await fetch(`/api/ardis/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    setBusy(false);
  }

  async function procesar() {
    setBusy(true);
    await patch({
      project_id: projectId || null,
      area: area || null,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
      status: 'todo',
    });
    setGone(true);
    router.refresh();
  }

  async function completar() {
    setBusy(true);
    await fetch(`/api/ardis/tasks/${task.id}/complete`, { method: 'POST' });
    setGone(true);
    router.refresh();
  }

  async function borrar() {
    setBusy(true);
    await fetch(`/api/ardis/tasks/${task.id}`, { method: 'DELETE' });
    setGone(true);
    router.refresh();
  }

  if (gone) return null;

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
      <p className="text-sm font-medium text-white">{task.title}</p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <select
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          className="rounded-lg border border-white/10 bg-navy px-2 py-1.5 text-xs text-white"
        >
          <option value="">Sin proyecto</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          value={area}
          onChange={(e) => setArea(e.target.value)}
          className="rounded-lg border border-white/10 bg-navy px-2 py-1.5 text-xs text-white"
        >
          <option value="">Sin área</option>
          {AREAS.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>

        <input
          type="datetime-local"
          value={dueAt}
          onChange={(e) => setDueAt(e.target.value)}
          className="col-span-2 rounded-lg border border-white/10 bg-navy px-2 py-1.5 text-xs text-white"
        />
      </div>

      <div className="mt-3 flex gap-2">
        <button
          onClick={procesar}
          disabled={busy}
          className="flex-1 rounded-lg bg-primary py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          Procesar
        </button>
        <button
          onClick={completar}
          disabled={busy}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/70 disabled:opacity-50"
        >
          Listo
        </button>
        <button
          onClick={borrar}
          disabled={busy}
          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-red-400/80 disabled:opacity-50"
        >
          Borrar
        </button>
      </div>
    </div>
  );
}
