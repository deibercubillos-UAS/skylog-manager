// Skylog V2.0 — configuración del formulario MOR/VOR (docs/skylog-v2/40b-sms-formularios-mor-vor.md).
// El Gerente SMS (y el Gerente General) personaliza, por tipo, el listado de campos estándar
// (ocultar/obligar/ordenar/renombrar) y agrega preguntas propias. Los mínimos regulatorios (descripción,
// severidad) quedan bloqueados en el dominio y aquí se fuerzan. Lectura: miembros de la organización (para
// renderizar el formulario); escritura: gestores, respaldada además por la RLS de sms_report_form_fields.
import { createClientSSR } from '@/lib/supabaseServer';
import { resolveCurrentPerson } from '@/lib/v2/duty';
import { readOnlyBlock } from '@/lib/v2/permissions';
import { getAuthUser } from '@/lib/v2/authUser';
import { dbError } from '@/lib/v2/apiErrors';
import { STANDARD_REPORT_FIELDS, CUSTOM_INPUT_TYPES, REPORT_FORM_TYPES, effectiveFormFields } from '@skylog/domain';

const EDIT_ROLES = ['gerente_sms', 'admin', 'superadmin'];
const SELECT_COLS = 'id, kind, field_key, label, input_type, options, required, visible, locked, sort_order';

async function resolve(supabase, organizationId) {
  const user = await getAuthUser(supabase);
  if (!user) return { res: Response.json({ error: 'No autenticado' }, { status: 401 }) };
  const { error, memberships } = await resolveCurrentPerson(supabase, user.id);
  if (error) return { res: Response.json({ error: 'No se pudo resolver la persona' }, { status: 500 }) };
  const membership = (memberships || []).find((m) => m.organization_id === organizationId);
  return { memberships, membership };
}

const loadRows = (supabase, organizationId, type) =>
  supabase.from('sms_report_form_fields').select(SELECT_COLS).eq('organization_id', organizationId).eq('report_type', type);

export async function GET(request) {
  const supabase = await createClientSSR();
  const url = new URL(request.url);
  const organizationId = url.searchParams.get('organizationId');
  const type = url.searchParams.get('type');
  if (!organizationId || !REPORT_FORM_TYPES.includes(type)) {
    return Response.json({ error: "organizationId y type ('mor'|'vor') son requeridos" }, { status: 400 });
  }
  const { res, membership } = await resolve(supabase, organizationId);
  if (res) return res;
  if (!membership) return Response.json({ error: 'Sin acceso a esta organización' }, { status: 403 });

  const { data, error } = await loadRows(supabase, organizationId, type);
  if (error) return dbError(error, 'sms/report-forms');
  return Response.json({ type, fields: effectiveFormFields(type, data || []), canEdit: EDIT_ROLES.includes(membership.role) });
}

function badCustom(f) {
  const label = String(f.label || '').trim();
  if (!label || label.length > 100) return 'Cada pregunta propia necesita un nombre (máximo 100 caracteres).';
  if (!CUSTOM_INPUT_TYPES.includes(f.input_type)) return 'Tipo de pregunta no válido.';
  if (f.input_type === 'select') {
    const opts = Array.isArray(f.options) ? f.options.map((o) => String(o).trim()).filter(Boolean) : [];
    if (opts.length < 1) return `La pregunta "${label}" es de lista y necesita al menos una opción.`;
  }
  return null;
}

export async function PUT(request) {
  const supabase = await createClientSSR();
  const body = await request.json().catch(() => ({}));
  const { organizationId, type, fields } = body;
  if (!organizationId || !REPORT_FORM_TYPES.includes(type) || !Array.isArray(fields)) {
    return Response.json({ error: "organizationId, type ('mor'|'vor') y fields[] son requeridos" }, { status: 400 });
  }
  const { res, membership, memberships } = await resolve(supabase, organizationId);
  if (res) return res;
  if (!membership || !EDIT_ROLES.includes(membership.role)) {
    return Response.json({ error: 'Solo el Gerente SMS o el Gerente General configuran el formulario' }, { status: 403 });
  }
  const readOnly = readOnlyBlock(memberships, organizationId);
  if (readOnly) return readOnly;

  // El orden global sale de la posición en el arreglo recibido (la interfaz los envía en orden de pantalla).
  const standardByKey = new Map();
  const customs = [];
  fields.forEach((f, i) => {
    if (f.kind === 'standard' && f.field_key) standardByKey.set(f.field_key, { ...f, _i: i });
    else if (f.kind === 'custom') customs.push({ ...f, _i: i });
  });

  // 1) Campos estándar: upsert por (org, tipo, field_key); los bloqueados se fuerzan visibles + obligatorios.
  const standardRows = STANDARD_REPORT_FIELDS.map((d, di) => {
    const p = standardByKey.get(d.key);
    const labelRaw = String(p?.label ?? '').trim();
    return {
      organization_id: organizationId,
      report_type: type,
      kind: 'standard',
      field_key: d.key,
      label: labelRaw ? labelRaw.slice(0, 100) : d.label,
      input_type: d.input_type,
      options: [],
      required: d.locked ? true : (p ? !!p.required : d.defaultRequired),
      visible: d.locked ? true : (p ? p.visible !== false : true),
      locked: d.locked,
      sort_order: p?._i ?? di,
    };
  });
  const { error: upErr } = await supabase
    .from('sms_report_form_fields')
    .upsert(standardRows, { onConflict: 'organization_id,report_type,field_key' });
  if (upErr) return dbError(upErr, 'sms/report-forms');

  // 2) Preguntas propias: validar, luego eliminar las que ya no están, actualizar las existentes e insertar nuevas.
  for (const c of customs) {
    const bad = badCustom(c);
    if (bad) return Response.json({ error: bad }, { status: 400 });
  }
  const { data: existing, error: exErr } = await supabase
    .from('sms_report_form_fields')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('report_type', type)
    .eq('kind', 'custom');
  if (exErr) return dbError(exErr, 'sms/report-forms');
  const existingIds = new Set((existing || []).map((r) => r.id));
  const keepIds = new Set(customs.filter((c) => c.id && existingIds.has(c.id)).map((c) => c.id));

  const toDelete = [...existingIds].filter((id) => !keepIds.has(id));
  if (toDelete.length) {
    const { error } = await supabase.from('sms_report_form_fields').delete().eq('organization_id', organizationId).in('id', toDelete);
    if (error) return dbError(error, 'sms/report-forms');
  }

  const toInsert = [];
  for (const c of customs) {
    const opts = c.input_type === 'select' ? c.options.map((o) => String(o).trim()).filter(Boolean) : [];
    const row = {
      label: String(c.label).trim().slice(0, 100),
      input_type: c.input_type,
      options: opts,
      required: !!c.required,
      visible: c.visible !== false,
      sort_order: c._i,
    };
    if (c.id && existingIds.has(c.id)) {
      const { error } = await supabase.from('sms_report_form_fields').update(row).eq('id', c.id).eq('organization_id', organizationId);
      if (error) return dbError(error, 'sms/report-forms');
    } else {
      toInsert.push({ organization_id: organizationId, report_type: type, kind: 'custom', field_key: null, locked: false, ...row });
    }
  }
  if (toInsert.length) {
    const { error } = await supabase.from('sms_report_form_fields').insert(toInsert);
    if (error) return dbError(error, 'sms/report-forms');
  }

  const { data: fresh } = await loadRows(supabase, organizationId, type);
  return Response.json({ type, fields: effectiveFormFields(type, fresh || []) });
}
