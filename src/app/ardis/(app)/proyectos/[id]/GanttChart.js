'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';

function toDateInput(value) {
  return value ? new Date(value).toISOString().slice(0, 10) : null;
}

function toGanttTasks(tasks) {
  return tasks.map((t) => {
    let start = toDateInput(t.start_date) || toDateInput(t.due_at);
    let end = toDateInput(t.due_at) || start;
    if (!start) {
      start = new Date().toISOString().slice(0, 10);
      end = start;
    }
    if (start === end) {
      // frappe-gantt necesita start < end para dibujar una barra visible.
      const d = new Date(end);
      d.setDate(d.getDate() + 1);
      end = d.toISOString().slice(0, 10);
    }
    return {
      id: t.id,
      name: t.title,
      start,
      end,
      progress: t.status === 'done' ? 100 : 0,
      dependencies: t.depends_on ? String(t.depends_on) : '',
    };
  });
}

export default function GanttChart({ tasks }) {
  const containerRef = useRef(null);
  const [ready, setReady] = useState(typeof window !== 'undefined' && !!window.Gantt);

  useEffect(() => {
    if (!ready || !containerRef.current) return;
    const ganttTasks = toGanttTasks(tasks);
    if (!ganttTasks.length) return;

    containerRef.current.innerHTML = '';
    // eslint-disable-next-line no-new
    new window.Gantt(containerRef.current, ganttTasks, {
      view_mode: 'Week',
      bar_height: 24,
      bar_corner_radius: 4,
      padding: 20,
    });
  }, [ready, tasks]);

  return (
    <>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/frappe-gantt@0.6.1/dist/frappe-gantt.css" />
      <Script
        src="https://cdn.jsdelivr.net/npm/frappe-gantt@0.6.1/dist/frappe-gantt.min.js"
        strategy="afterInteractive"
        onReady={() => setReady(true)}
        onLoad={() => setReady(true)}
      />
      {tasks.length === 0 ? (
        <p className="mt-6 text-center text-sm text-white/40">Sin tareas con fecha para mostrar en el Gantt.</p>
      ) : (
        <div className="ardis-gantt mt-4 overflow-x-auto rounded-xl bg-white p-2" ref={containerRef} />
      )}
    </>
  );
}
