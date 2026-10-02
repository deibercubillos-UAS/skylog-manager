'use client';

// Skylog V2.0 — Capacitación, Administración: roster de cumplimiento
// consolidado (las 3 pistas en una sola tabla, una fila por persona) — la
// "área de verificación de cumplimiento de los otros miembros" pedida
// explícitamente por el usuario. Componente separado (prefijo `_`, no crea
// ruta) para no inflar `page.js` por encima de la convención de 500 líneas.
import { TRAINING_TYPES, TRAINING_TYPE_LABELS } from '@/lib/v2/training';

const STATUS_LABELS = {
  not_configured: 'Sin examen',
  ok: 'Aprobado',
  pending: 'Pendiente',
  failed: 'Reprobado',
  overdue: 'Vencido',
};

const STATUS_BADGE = {
  ok: 'bg-emerald-50 text-emerald-700',
  pending: 'bg-amber-50 text-amber-700',
  failed: 'bg-red-50 text-red-700',
  overdue: 'bg-red-50 text-red-700',
  not_configured: 'bg-navy-50 text-navy-400',
};

function StatusBadge({ compliance }) {
  if (!compliance) return <span className="text-xs text-navy-300">—</span>;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[compliance.status] || 'bg-navy-50 text-navy-400'}`}>
      {STATUS_LABELS[compliance.status] || compliance.status}
    </span>
  );
}

export default function ComplianceRoster({ roster, loading }) {
  return (
    <div className="bg-white rounded-2xl border border-navy-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-navy-50">
        <p className="text-sm font-semibold text-navy">Cumplimiento del equipo</p>
        <p className="text-xs text-navy-400">Estado de cada miembro en las 3 pistas de capacitación.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-navy-400 text-xs uppercase tracking-wide">
            <tr>
              <th className="text-left px-3 py-2.5">Persona</th>
              {TRAINING_TYPES.map((t) => (
                <th key={t} className="text-left px-3 py-2.5">
                  {TRAINING_TYPE_LABELS[t]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-50">
            {loading ? (
              <tr>
                <td colSpan={TRAINING_TYPES.length + 1} className="px-3 py-6 text-center text-navy-300">
                  Cargando…
                </td>
              </tr>
            ) : !roster || roster.length === 0 ? (
              <tr>
                <td colSpan={TRAINING_TYPES.length + 1} className="px-3 py-6 text-center text-navy-300">
                  Sin tripulación en esta organización.
                </td>
              </tr>
            ) : (
              roster.map((r) => (
                <tr key={r.personId}>
                  <td className="px-3 py-2 font-medium text-navy">{r.fullName}</td>
                  {TRAINING_TYPES.map((t) => (
                    <td key={t} className="px-3 py-2">
                      <StatusBadge compliance={r.byType[t]} />
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
