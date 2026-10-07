// migration/phase2 — mantenimiento, proveedores, manuales y listas de chequeo (32-migracion.md §2.1, fase 2 del ETL).
import { colombiaInstant, dateOnly } from './core.js';

const clean = (v) => (v === null || v === undefined ? '' : String(v).trim());

const MAINT_TYPE = { preventivo: 'programado', programado: 'programado', correctivo: 'correctivo', menor: 'menor' };

/** Un registro de `maintenance_logs` → evento de mantenimiento de V2. Sin fecha no se inventa una: se omite. */
export function transformMaintenance(m, ctx) {
  const warnings = [];
  const aircraftId = ctx.aircraft(m.aircraft_id);
  if (!aircraftId) return { ok: false, reason: 'aeronave no migrada' };
  const organization = ctx.organization(m.organization_id);
  if (!organization) return { ok: false, reason: 'organización no migrada' };
  const performed = m.maintenance_date ? colombiaInstant(m.maintenance_date, '00:00') : null;
  if (!performed) return { ok: false, reason: 'sin fecha de mantenimiento' };
  const mapped = MAINT_TYPE[clean(m.maintenance_type).toLowerCase()];
  if (!mapped) warnings.push(`tipo «${m.maintenance_type}» sin equivalente → correctivo`);
  const hours = Number(m.hours_at_service);
  const parts = [clean(m.description), clean(m.technician_name) ? `Técnico: ${clean(m.technician_name)}` : ''].filter(Boolean);
  return {
    ok: true,
    warnings,
    row: {
      type: mapped || 'correctivo',
      performed_at: performed,
      performed_at_aircraft_hours: Number.isFinite(hours) && m.hours_at_service !== null ? hours : null,
      findings: parts.join('\n') || null,
      created_at: m.created_at || undefined,
    },
    // Archivos (adjunto y recibo): el primero va al evento; el segundo se conserva en `legacy_v1_rows` y en el manifiesto.
    attachment: clean(m.attachment_path) || null,
    receipt: clean(m.return_doc_path) || null,
    hasChecklists: !!(m.return_checklist || m.minor_checklist),
  };
}

/** Contacto del proveedor: V2 guarda un solo campo de texto; v1 tenía nombre, correo y teléfono por separado. */
export function joinSupplierContact(s) {
  return [clean(s.contact_name), clean(s.contact_email), clean(s.contact_phone)].filter(Boolean).join(' · ') || null;
}

/** Las respuestas de una auditoría vienen indexadas por el id del criterio de v1: se re-indexan al id nuevo. */
export function remapAuditResponses(responses, criterionMap) {
  let obj = responses;
  if (typeof obj === 'string') { try { obj = JSON.parse(obj); } catch { obj = null; } }
  if (!obj || typeof obj !== 'object') return { responses: {}, dropped: [] };
  const out = {};
  const dropped = [];
  for (const [oldId, value] of Object.entries(obj)) {
    const newId = criterionMap(oldId);
    if (newId) out[newId] = value; else dropped.push(oldId);
  }
  return { responses: out, dropped };
}

const MANUAL_STATUS = { active: 'active', archived: 'archived' };
export const mapManualStatus = (s) => MANUAL_STATUS[clean(s).toLowerCase()] || 'active';

/** Clave nueva de un archivo en R2 (el prefijo `v2-orgs/` es el que valida la descarga de V2). */
export function newFileKey(organizationId, folder, v1Path) {
  const name = clean(v1Path).split('/').pop().replace(/[^\w.\-]+/g, '_') || 'archivo';
  return `v2-orgs/${organizationId}/${folder}/${name}`;
}

const FORM_LABELS = {
  health: { name: 'Salud del piloto', category: 'Prevuelo' },
  preflight: { name: 'Pre-vuelo', category: 'Prevuelo' },
  briefing: { name: 'Briefing de misión', category: 'Prevuelo' },
  inventory: { name: 'Inventario de operación', category: 'Prevuelo' },
  minor_maintenance: { name: 'Mantenimiento menor', category: 'Mantenimiento' },
  maintenance_return: { name: 'Recibo de mantenimiento', category: 'Mantenimiento' },
};
const PROTOCOL_CATEGORIES = ['Prevuelo', 'Reportes', 'Seguridad Operacional', 'Mantenimiento'];

/**
 * `form_definitions` (una fila por ítem) → listas de chequeo (una por organización, tipo y, en pre-vuelo, modelo).
 * Los espacios vacíos se descartan; las preguntas de SORA no son listas de chequeo y se archivan aparte.
 */
export function groupChecklists(definitions) {
  const groups = new Map();
  let discardedEmpty = 0;
  for (const d of definitions) {
    const meta = FORM_LABELS[d.form_type];
    if (!meta || !d.organization_id) continue;
    if (!clean(d.label_text)) { discardedEmpty++; continue; }
    const model = d.form_type === 'preflight' && clean(d.aircraft_model) && clean(d.aircraft_model) !== 'General' ? clean(d.aircraft_model) : '';
    const key = `${d.organization_id}|${d.form_type}|${model}`;
    if (!groups.has(key)) groups.set(key, { key, v1Org: d.organization_id, name: model ? `${meta.name} — ${model}` : meta.name, category: meta.category, items: [] });
    groups.get(key).items.push({ n: Number(d.field_number) || 0, text: clean(d.label_text) });
  }
  const lists = [...groups.values()].map((g) => ({ key: g.key, v1Org: g.v1Org, name: g.name, category: g.category, steps: g.items.sort((a, b) => a.n - b.n).map((i) => i.text), version: '1.0', description: 'Migrada de la versión anterior' }));
  return { lists, discardedEmpty };
}

/** Un protocolo libre de v1 → lista de chequeo (mismas cuatro categorías). */
export function transformProtocol(p) {
  const steps = Array.isArray(p.steps) ? p.steps.map(clean).filter(Boolean) : [];
  const category = PROTOCOL_CATEGORIES.includes(p.category) ? p.category : 'Seguridad Operacional';
  return { name: clean(p.name) || 'Protocolo migrado', category, description: clean(p.description) || null, icon: clean(p.icon) || null, steps, version: '1.0', warning: PROTOCOL_CATEGORIES.includes(p.category) ? null : `categoría «${p.category}» sin equivalente → Seguridad Operacional` };
}

const HOST_BUCKETS = { 'cdn.bitafly.com': 'fleet-images', 'logos.bitafly.com': 'partner-logos', 'releases.bitafly.com': 'app-releases' };

/**
 * Referencia a un objeto de R2 a partir de lo que v1 guardó: un *path* del bucket, o una URL antigua (pública o de otro
 * almacenamiento). Devuelve { bucket, key } o null. Una URL de Supabase Storage antigua ya no tiene objeto que copiar.
 */
export function v1ObjectRef(value, defaultBucket) {
  const v = clean(value);
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) {
    let url;
    try { url = new URL(v); } catch { return null; }
    if (/supabase\.co$/i.test(url.hostname)) return { bucket: defaultBucket, key: null, legacyUrl: v }; // almacenamiento anterior: sin objeto en R2
    const bucket = HOST_BUCKETS[url.hostname] || defaultBucket;
    const key = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    return key ? { bucket, key } : null;
  }
  return { bucket: defaultBucket, key: v.replace(/^\/+/, '') };
}

export const PERSON_DOC_COLUMNS = [
  ['id_doc_url', 'cedula'],
  ['pilot_course_url', 'curso_piloto'],
  ['theoretical_exam_url', 'examen_teorico'],
  ['medical_cert_url', 'certificado_medico'],
  ['medical_url', 'certificado_medico'],
  ['certificate_url', 'otro'],
];

/** Documentos del expediente de una persona a partir de sus filas de piloto (gana la más reciente por tipo). */
export function personDocuments(pilotRows) {
  const byType = new Map();
  const sorted = [...pilotRows].sort((a, b) => Date.parse(b.updated_at || b.created_at || 0) - Date.parse(a.updated_at || a.created_at || 0));
  for (const row of sorted) {
    for (const [column, docType] of PERSON_DOC_COLUMNS) {
      const ref = v1ObjectRef(row[column], 'documents');
      if (ref && !byType.has(docType)) byType.set(docType, ref);
    }
  }
  return [...byType.entries()].map(([doc_type, ref]) => ({ doc_type, ref }));
}
