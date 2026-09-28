'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

const AREA_COLOR = {
  SKY: 'bg-sky-500/20 text-sky-300',
  WAS: 'bg-violet-500/20 text-violet-300',
  BIT: 'bg-amber-500/20 text-amber-300',
  PER: 'bg-emerald-500/20 text-emerald-300',
};

function formatDue(iso) {
  if (!iso) return null;
  const date = new Date(iso);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((new Date(date).setHours(0, 0, 0, 0) - today) / 86400000);

  const time = date.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
  if (diffDays === 0) return `Hoy ${time}`;
  if (diffDays === 1) return `Mañana ${time}`;
  if (diffDays < 0) return `Venció ${date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}`;
  return date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) + ` ${time}`;
}

export default function TaskRow({ task, onDone }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);

  async function complete() {
    setDone(true);
    await fetch(`/api/ardis/tasks/${task.id}/complete`, { method: 'POST' });
    startTransition(() => {
      router.refresh();
      onDone?.(task.id);
    });
  }

  const dueLabel = formatDue(task.due_at);
  const overdue = task.due_at && new Date(task.due_at) < new Date() && task.status !== 'done';

  return (
    <div
      className={`group flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03]
                  px-4 py-3 backdrop-blur-sm transition-all hover:border-white/10 ${done ? 'opacity-40' : ''}`}
    >
      <button
        onClick={complete}
        disabled={done || pending}
        aria-label="Completar"
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 border-white/20
                   text-transparent transition hover:border-primary hover:text-primary hover:shadow-[0_0_10px_rgba(236,91,19,0.5)]
                   active:scale-95"
      >
        <span className="material-symbols-outlined text-[16px]">check</span>
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{task.title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
          {task.area && (
            <span
              className={`rounded px-1.5 py-0.5 font-semibold tracking-wide ${AREA_COLOR[task.area] || 'bg-white/10 text-white/60'}`}
            >
              {task.area}
            </span>
          )}
          {dueLabel && (
            <span className={overdue ? 'text-red-400' : 'text-white/35'}>{dueLabel.toUpperCase()}</span>
          )}
          {task.waiting_for && <span className="text-white/35">→ {task.waiting_for.toUpperCase()}</span>}
        </div>
      </div>
    </div>
  );
}
