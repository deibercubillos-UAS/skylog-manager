// Skylog V2.0 — piezas compartidas del seguimiento de sucesos VOR/MOR (bandeja de reportes, pantalla del
// caso y formulario público). Carpeta con `_`: no crea ruta. Solo presentación: las reglas (plazos, cierre)
// viven en packages/domain/src/smsTracking.js.

export const SEVERITY_LABELS = { incidente: 'Incidente', incidente_grave: 'Incidente grave', accidente: 'Accidente' };

export const ROUTE_META = {
  mor: { label: 'MOR', soft: 'bg-red-100 text-red-700' },
  vor: { label: 'VOR', soft: 'bg-amber-100 text-amber-700' },
  rac114: { label: 'RAC 114', soft: 'bg-navy-100 text-navy-600' },
};

export const CASE_STATUS_META = {
  abierto: { label: 'Abierto', soft: 'bg-red-100 text-red-700' },
  en_analisis: { label: 'En análisis', soft: 'bg-amber-100 text-amber-700' },
  cerrado: { label: 'Cerrado', soft: 'bg-emerald-100 text-emerald-700' },
};

export const AUTO_SOURCE_LABELS = {
  public: 'Reporte recibido por el enlace público',
  auto_duty_exception: 'Borrador automático · excepción de tiempo de servicio',
  auto_unexpected_event: 'Borrador automático · evento inesperado en vuelo',
  auto_training_exam_failed: 'Borrador automático · examen de capacitación reprobado',
};

const DEADLINE_STYLE = {
  en_plazo: 'bg-blue-50 text-blue-700',
  por_vencer: 'bg-amber-100 text-amber-800',
  vence_hoy: 'bg-orange-100 text-orange-800',
  vencido: 'bg-red-100 text-red-700',
  radicado: 'bg-emerald-100 text-emerald-700',
  radicado_tarde: 'bg-amber-100 text-amber-800',
};

const fmtDay = (d) => new Date(`${d}T12:00:00-05:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/** Texto + estilo del plazo de radicación de un reporte (resultado de computeReportDeadline). */
export function deadlineLabel(deadline) {
  if (!deadline?.applicable) {
    return deadline?.reason === 'sin_plazo_vor' ? { text: 'VOR · sin plazo fijado', cls: 'bg-navy-50 text-navy-500' } : null;
  }
  const est = deadline.estimated ? ' (estimado: sin fecha del suceso)' : '';
  switch (deadline.status) {
    case 'radicado':
      return { text: 'Radicado a tiempo', cls: DEADLINE_STYLE.radicado };
    case 'radicado_tarde':
      return { text: `Radicado fuera de plazo (${plural(deadline.businessDaysLate, 'día hábil', 'días hábiles')} tarde)`, cls: DEADLINE_STYLE.radicado_tarde };
    case 'vencido':
      return { text: `Plazo IRIS vencido hace ${plural(Math.abs(deadline.businessDaysLeft), 'día hábil', 'días hábiles')} · ${fmtDay(deadline.deadline)}${est}`, cls: DEADLINE_STYLE.vencido };
    case 'vence_hoy':
      return { text: `Plazo IRIS vence HOY · ${fmtDay(deadline.deadline)}${est}`, cls: DEADLINE_STYLE.vence_hoy };
    default:
      return { text: `Plazo IRIS: ${fmtDay(deadline.deadline)} · faltan ${plural(deadline.businessDaysLeft, 'día hábil', 'días hábiles')}${est}`, cls: DEADLINE_STYLE[deadline.status] || DEADLINE_STYLE.en_plazo };
  }
}

export function DeadlineChip({ deadline, className = '' }) {
  const meta = deadlineLabel(deadline);
  if (!meta) return null;
  return <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${meta.cls} ${className}`}>{meta.text}</span>;
}

export const fmtDateTime = (ts) =>
  ts ? new Date(ts).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' }) : '—';

export const aircraftLabel = (a) => (a ? `${a.model?.brand || ''} ${a.model?.model || ''} · ${a.serial_number}`.trim() : null);

export const formatBytes = (n) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

// <input type="datetime-local"> no trae zona: se interpreta como hora de Colombia (UTC−5, sin horario de verano).
export const toBogotaIso = (v) => (v ? new Date(`${v}:00-05:00`).toISOString() : '');
export function toBogotaInput(date) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(date)
      .map((x) => [x.type, x.value])
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
