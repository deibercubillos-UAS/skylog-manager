'use client';

// Skylog V2.0 — Manuales: panel de seguimiento de lectura de la versión
// vigente (gestores) — roster de la org con leído/pendiente + fecha.
// Rediseño (pedido del usuario: "se ve plana y poco UX/UI") — avatar de
// iniciales por persona + barra de progreso con color por avance, en vez de
// una lista de texto plano.
import { useEffect, useState } from 'react';
import { Panel } from '@skylog/ui';

function initialsOf(name) {
  return (name || '?')
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function AckRosterPanel({ open, onClose, manualId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !manualId) return;
    (async () => {
      setData(null);
      setError(null);
      const res = await fetch(`/api/manuales/${manualId}/acknowledgments`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || 'Error cargando el seguimiento');
        return;
      }
      setData(json);
    })();
  }, [open, manualId]);

  const pct = data?.total ? Math.round((data.read / data.total) * 100) : 0;
  const barColor = pct === 100 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <Panel open={open} onClose={onClose} title={data ? `Seguimiento — ${data.title}` : 'Seguimiento de lectura'}>
      {error && (
        <p className="flex items-center gap-1.5 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
          <span className="material-symbols-outlined text-[16px]">error</span>
          {error}
        </p>
      )}
      {!data && !error && <p className="text-sm text-navy-400">Cargando…</p>}
      {data && (
        <div className="space-y-5">
          <div className="rounded-2xl bg-gradient-to-br from-navy-50 to-white border border-navy-100 p-4">
            <div className="flex items-end justify-between mb-2">
              <p className="text-3xl font-black text-navy leading-none">
                {data.read}
                <span className="text-base font-semibold text-navy-300">/{data.total}</span>
              </p>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${pct === 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{pct}% leído</span>
            </div>
            <div className="h-2.5 rounded-full bg-navy-100 overflow-hidden">
              <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${pct}%` }} />
            </div>
          </div>

          <div className="space-y-1.5">
            {data.roster.map((r) => (
              <div key={r.personId} className="flex items-center gap-3 rounded-xl border border-navy-50 px-3 py-2.5 hover:bg-navy-50/50 transition-colors">
                <span className="flex items-center justify-center w-9 h-9 rounded-full bg-navy-100 text-navy-500 text-xs font-bold shrink-0">{initialsOf(r.fullName)}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-navy truncate">{r.fullName || r.email || 'Sin nombre'}</p>
                  <p className="text-xs text-navy-400 capitalize">{r.role?.replace('_', ' ')}</p>
                </div>
                {r.acknowledgedAt ? (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-full px-2.5 py-1 shrink-0">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    {new Date(r.acknowledgedAt).toLocaleDateString('es-CO')}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-semibold text-navy-400 bg-navy-50 rounded-full px-2.5 py-1 shrink-0">
                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                    Pendiente
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}
