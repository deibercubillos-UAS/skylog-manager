// scripts/etl/lib/commit.mjs — escribe el PLAN en el proyecto de V2. Idempotente (etl_id_map) y resiliente: una fila que
// falla no tumba la corrida, se informa. Nunca corre contra el proyecto de v1 (guarda de abajo).
import { createClient } from '@supabase/supabase-js';
import { newFileKey } from '../../../packages/domain/src/migration/index.js';

const V1_PROJECT_REF = 'ilozajejhecskmhwxkui';
const CHUNK = 200;

export async function commitPlan(plan, { log = () => {} } = {}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY del proyecto de V2.');
  if (url.includes(V1_PROJECT_REF)) throw new Error('El destino es el proyecto de v1 (producción actual): el ETL jamás escribe ahí.');
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  // ── mapa de identificadores ─────────────────────────────────────────────────────────────────────────────────
  const idMap = new Map();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from('etl_id_map').select('entity, id_v1, id_v2').range(from, from + 999);
    if (error) throw new Error(`etl_id_map: ${error.message}`);
    data.forEach((r) => idMap.set(`${r.entity}|${r.id_v1}`, r.id_v2));
    if (data.length < 1000) break;
  }
  const get = (entity, id) => idMap.get(`${entity}|${id}`) || null;
  const stats = {};
  const stat = (entity) => (stats[entity] ||= { inserted: 0, existing: 0, failed: [] });

  async function remember(entity, pairs) {
    if (!pairs.length) return;
    for (let i = 0; i < pairs.length; i += CHUNK) {
      const { error } = await db.from('etl_id_map').upsert(pairs.slice(i, i + CHUNK).map(([id_v1, id_v2]) => ({ entity, id_v1: String(id_v1), id_v2 })), { onConflict: 'entity,id_v1' });
      if (error) throw new Error(`etl_id_map (${entity}): ${error.message}`);
    }
    pairs.forEach(([id1, id2]) => idMap.set(`${entity}|${id1}`, id2));
  }

  /** Inserta las filas nuevas de `items` ({ v1Id, row }) y recuerda su id. Fila a fila si el lote falla. */
  async function load(entity, table, items, build, { each = false } = {}) {
    const s = stat(entity);
    const todo = [];
    for (const it of items) { if (get(entity, it.v1Id)) s.existing++; else todo.push(it); }
    const pairs = [];
    const insertOne = async (it) => {
      const { data, error } = await db.from(table).insert(build(it)).select('id').single();
      if (error || !data) s.failed.push({ id: it.v1Id, error: error?.message || 'sin respuesta' });
      else { pairs.push([it.v1Id, data.id]); s.inserted++; }
    };
    if (each) for (const it of todo) await insertOne(it);
    else {
      for (let i = 0; i < todo.length; i += CHUNK) {
        const part = todo.slice(i, i + CHUNK);
        const { data, error } = await db.from(table).insert(part.map(build)).select('id');
        if (error || !data || data.length !== part.length) { for (const it of part) await insertOne(it); }
        else { part.forEach((it, j) => pairs.push([it.v1Id, data[j].id])); s.inserted += part.length; }
      }
    }
    await remember(entity, pairs);
    log(`  ${entity}: +${s.inserted} (ya estaban ${s.existing}, fallaron ${s.failed.length})`);
  }

  const orgOf = (v1) => get('organizations', v1);
  // `created_at` nulo se omite para que V2 use su valor por defecto (la columna es NOT NULL); el resto de nulos sí se escriben.
  const clean = (o) => Object.fromEntries(Object.entries(o).filter(([k, v]) => v !== undefined && !(k === 'created_at' && v === null)));

  // 1 · Organizaciones y certificaciones
  log('Organizaciones…');
  await load('organizations', 'organizations', plan.orgs, (o) => clean(o.row), { each: true });
  await load('organization_certifications', 'organization_certifications', plan.orgs.filter((o) => o.cert).map((o) => ({ v1Id: o.v1Id, row: o.cert })), (o) => clean({ ...o.row, organization_id: orgOf(o.v1Id) }), { each: true });

  // 2 · Personas (+ «Sin asignar» por organización)
  log('Personas…');
  const personItems = plan.people.map((p) => ({ v1Id: p.v1Key, row: { full_name: p.full_name, document_type: p.document_type, document_number: p.document_number, phone: p.phone, email: p.email, license_number: p.license_number, medical_cert_expiry: p.medical_cert_expiry, emergency_contact_name: p.emergency_contact_name, emergency_contact_phone: p.emergency_contact_phone, created_at: p.created_at || undefined } }));
  await load('people', 'people', personItems, (p) => clean(p.row), { each: true });
  await load('people', 'people', plan.unassigned.map((u) => ({ v1Id: u.v1Key, row: u.row })), (p) => clean(p.row), { each: true });
  const personId = (index) => get('people', plan.people[index]?.v1Key);
  const unassignedFor = (v1Org) => get('people', `unassigned:${v1Org}`);

  // 3 · Cuentas: usuario de autenticación con su contraseña cifrada (hash) + fila de `accounts`
  log('Cuentas…');
  {
    const s = stat('accounts');
    const pairs = [];
    for (const a of plan.accounts) {
      if (get('accounts', a.v1AuthId)) { s.existing++; continue; }
      const pid = personId(a.personKey);
      if (!pid) { s.failed.push({ id: a.v1AuthId, error: 'persona no creada' }); continue; }
      const person = plan.people[a.personKey];
      const payload = { email: a.email, email_confirm: a.email_confirmed || true, user_metadata: { full_name: person.full_name } };
      if (a.password_hash) payload.password_hash = a.password_hash;
      const { data: made, error } = await db.auth.admin.createUser(payload);
      if (error || !made?.user) { s.failed.push({ id: a.v1AuthId, error: error?.message || 'sin usuario' }); continue; }
      const { data: acc, error: accError } = await db.from('accounts').insert(clean({ person_id: pid, auth_user_id: made.user.id, signup_attribution: a.signup_attribution || undefined })).select('id').single();
      if (accError) { await db.auth.admin.deleteUser(made.user.id); s.failed.push({ id: a.v1AuthId, error: accError.message }); continue; }
      pairs.push([a.v1AuthId, acc.id]);
      s.inserted++;
    }
    await remember('accounts', pairs);
    log(`  accounts: +${s.inserted} (ya estaban ${s.existing}, fallaron ${s.failed.length})`);
  }

  // 4 · Membresías y adiciones de la licencia
  log('Membresías…');
  await load('memberships', 'memberships', plan.memberships.map((m) => ({ v1Id: `${m.personKey}|${m.v1Org}`, row: m })), (it) => {
    const m = it.row;
    return clean({ person_id: personId(m.personKey), organization_id: orgOf(m.v1Org), role: m.role, status: m.active ? 'activa' : 'cerrada', started_at: m.started_at || undefined, ended_at: m.ended_at || undefined });
  }, { each: true });
  await load('person_additions', 'person_additions', plan.additions.map((a) => ({ v1Id: `${a.personKey}|${a.addition}`, row: a })), (it) => ({ person_id: personId(it.row.personKey), addition: it.row.addition }), { each: true });

  // 5 · Flota
  log('Flota…');
  await load('aircraft_models', 'aircraft_models', plan.models.map((m) => ({ v1Id: m.key, row: m })), (it) => clean({ organization_id: orgOf(it.row.v1Org), brand: it.row.brand, model: it.row.model, mtow_kg: it.row.mtow_kg ?? undefined }), { each: true });
  await load('aircraft', 'aircraft', plan.aircraft, (a) => clean({ ...a.row, organization_id: orgOf(a.v1Org), model_id: get('aircraft_models', a.modelKey) }), { each: true });
  await load('batteries', 'batteries', plan.batteries, (b) => clean({ ...b.row, organization_id: orgOf(b.v1Org) }));
  await load('aircraft_components', 'aircraft_components', plan.components, (c) => clean({ ...c.row, organization_id: orgOf(c.v1Org), aircraft_id: get('aircraft', c.v1Aircraft) }));

  // 6 · Misiones y vuelos
  log('Misiones y vuelos…');
  await load('missions', 'missions', plan.missions, (m) => clean({ ...m.row, organization_id: orgOf(m.v1Org), aircraft_id: m.row.aircraft_id ? get('aircraft', m.row.aircraft_id) : null, pic_person_id: m.picKey !== null && m.picKey !== undefined ? personId(m.picKey) : unassignedFor(m.v1Org), observer_person_id: m.observerKey !== null && m.observerKey !== undefined ? personId(m.observerKey) : null }));
  await load('flights', 'flights', plan.flights, (f) => clean({ ...f.row, organization_id: orgOf(f.v1Org), aircraft_id: get('aircraft', f.v1Aircraft), mission_id: f.v1Mission ? get('missions', f.v1Mission) : null, pilot_person_id: f.pilotKey !== null && f.pilotKey !== undefined ? personId(f.pilotKey) : unassignedFor(f.v1Org) }));

  // 7 · Pólizas, suscripciones
  log('Pólizas y suscripciones…');
  await load('insurance_policies', 'insurance_policies', plan.insurance, (p) => clean({ ...p.row, organization_id: orgOf(p.v1Org) }), { each: true });
  {
    const pairs = plan.insurance.filter((p) => p.v1Aircraft && get('insurance_policies', p.v1Id) && get('aircraft', p.v1Aircraft)).map((p) => ({ policy_id: get('insurance_policies', p.v1Id), aircraft_id: get('aircraft', p.v1Aircraft) }));
    if (pairs.length) { const { error } = await db.from('insurance_policy_aircraft').upsert(pairs, { onConflict: 'policy_id,aircraft_id', ignoreDuplicates: true }); if (error) stat('insurance_policy_aircraft').failed.push({ id: 'lote', error: error.message }); }
  }
  {
    const s = stat('subscriptions');
    for (const sub of plan.subscriptions) {
      const org = orgOf(sub.v1Org);
      if (!org) { s.failed.push({ id: sub.v1Org, error: 'organización no creada' }); continue; }
      const { error } = await db.from('subscriptions').upsert(clean({ ...sub.row, organization_id: org }), { onConflict: 'organization_id' });
      if (error) s.failed.push({ id: sub.v1Org, error: error.message }); else s.inserted++;
    }
    log(`  subscriptions: ${s.inserted} (fallaron ${s.failed.length})`);
  }

  // 8 · Programa de socios
  log('Socios…');
  await load('partners', 'partners', plan.partners, (p) => clean({ ...p.row, parent_partner_id: null }), { each: true });
  for (const p of plan.partners.filter((x) => x.v1Parent && get('partners', x.v1Parent))) {
    await db.from('partners').update({ parent_partner_id: get('partners', p.v1Parent) }).eq('id', get('partners', p.v1Id));
  }
  await load('partner_codes', 'partner_codes', plan.partnerCodes, (c) => clean({ ...c.row, partner_id: get('partners', c.v1Partner) }), { each: true });
  await load('partner_members', 'partner_members', plan.partnerMembers, (m) => clean({ ...m.row, partner_id: get('partners', m.v1Partner), person_id: personId(m.personKey) }), { each: true });
  await load('free_grants', 'free_grants', plan.grants, (g) => clean({ ...g.row, partner_id: g.v1Partner ? get('partners', g.v1Partner) : null, advisor_member_id: g.v1Advisor ? get('partner_members', g.v1Advisor) : null, redeemed_organization_id: g.v1RedeemedOrg ? orgOf(g.v1RedeemedOrg) : null }), { each: true });
  await load('referrals', 'referrals', plan.referrals, (r) => clean({ ...r.row, partner_id: get('partners', r.v1Partner), organization_id: orgOf(r.v1Org) }), { each: true });

  // 9 · APK vigente y municipios
  if (plan.release) {
    const { data: has } = await db.from('app_releases').select('id').eq('version_code', plan.release.version_code).maybeSingle();
    if (!has) await db.from('app_releases').insert({ version_name: plan.release.version_name, version_code: plan.release.version_code, apk_url: plan.release.apk_url, release_notes: plan.release.release_notes || null, force_update: !!plan.release.force_update, is_current: true });
  }
  if (plan.geo.length) {
    for (let i = 0; i < plan.geo.length; i += 500) {
      const { error } = await db.from('colombia_geo').upsert(plan.geo.slice(i, i + 500), { onConflict: 'code' });
      if (error) stat('colombia_geo').failed.push({ id: `lote ${i}`, error: error.message });
    }
  }


  // ── Fase 2 ─────────────────────────────────────────────────────────────────────────────────────────────────────
  const files = []; // manifiesto de archivos a copiar en R2 (lo ejecuta scripts/etl/copy-files.mjs)
  /** Registra la copia de un objeto y devuelve la clave nueva (o null si v1 solo guardó una URL antigua sin objeto). */
  const fileTo = (entity, id1, ref, folder, orgV2, bucketTo = 'documents') => {
    if (!ref) return null;
    if (!ref.key) { files.push({ entity, id_v1: id1, from_bucket: ref.bucket, from_key: ref.legacyUrl, to_bucket: '', to_key: '', note: 'URL del almacenamiento anterior: no hay objeto en R2, volver a subir a mano' }); return null; }
    const to = newFileKey(orgV2 || 'sin-org', folder, ref.key);
    files.push({ entity, id_v1: id1, from_bucket: ref.bucket, from_key: ref.key, to_bucket: bucketTo, to_key: to, note: '' });
    return to;
  };
  const setColumn = async (table, id, patch) => { const { error } = await db.from(table).update(patch).eq('id', id); if (error) stat(`${table}.archivo`).failed.push({ id, error: error.message }); };

  log('Fase 2…');
  await load('organization_emergency_contacts', 'organization_emergency_contacts', plan.emergencyContacts, (c) => clean({ ...c.row, organization_id: orgOf(c.v1Org) }), { each: true });

  await load('maintenance_events', 'maintenance_events', plan.maintenance, (m) => clean({ ...m.row, organization_id: orgOf(m.v1Org), aircraft_id: get('aircraft', m.v1Aircraft) }), { each: true });
  for (const m of plan.maintenance) {
    const id = get('maintenance_events', m.v1Id);
    if (!id) continue;
    const doc = fileTo('maintenance_events', m.v1Id, m.attachment, `mantenimiento/${id}`, orgOf(m.v1Org));
    if (doc) await setColumn('maintenance_events', id, { document_path: doc });
    if (m.receipt) fileTo('maintenance_events.recibo', m.v1Id, m.receipt, `mantenimiento/${id}`, orgOf(m.v1Org)); // V2 guarda un solo adjunto: el recibo se copia y queda en el archivo de v1
  }

  await load('suppliers', 'suppliers', plan.suppliers, (s) => clean({ ...s.row, organization_id: orgOf(s.v1Org) }), { each: true });
  await load('supplier_audit_criteria', 'supplier_audit_criteria', plan.criteria, (c) => clean({ ...c.row, organization_id: orgOf(c.v1Org) }), { each: true });
  {
    const { remapAuditResponses } = await import('../../../packages/domain/src/migration/index.js');
    await load('supplier_audits', 'supplier_audits', plan.audits, (a) => {
      const r = remapAuditResponses(a.responsesV1, (old) => get('supplier_audit_criteria', old));
      return clean({ ...a.row, organization_id: orgOf(a.v1Org), supplier_id: get('suppliers', a.v1Supplier), responses: r.responses });
    }, { each: true });
  }

  await load('manuales', 'manuales', plan.manuals, (m) => clean({ ...m.row, organization_id: orgOf(m.v1Org), current_file_path: null }), { each: true });
  await load('manual_versions', 'manual_versions', plan.manualVersions, (v) => {
    const manualId = get('manuales', v.v1Manual);
    const to = v.file?.key ? newFileKey(orgOf(v.v1Org), `manuales/${manualId}/${v.v1Id}`, v.file.key) : `sin-archivo/${v.v1Id}`;
    return clean({ ...v.row, organization_id: orgOf(v.v1Org), manual_id: manualId, file_path: to });
  }, { each: true });
  for (const v of plan.manualVersions) {
    const id = get('manual_versions', v.v1Id);
    if (!id) continue;
    fileTo('manual_versions', v.v1Id, v.file, `manuales/${get('manuales', v.v1Manual)}/${v.v1Id}`, orgOf(v.v1Org));
  }
  for (const m of plan.manuals) {
    const id = get('manuales', m.v1Id);
    const versionId = m.v1CurrentVersion ? get('manual_versions', m.v1CurrentVersion) : null;
    if (!id || !versionId) continue;
    const { data: ver } = await db.from('manual_versions').select('file_path').eq('id', versionId).single();
    await setColumn('manuales', id, { current_version_id: versionId, current_file_path: ver?.file_path || null });
  }
  await load('manual_acknowledgments', 'manual_acknowledgments', plan.manualAcks, (a) => clean({ ...a.row, organization_id: orgOf(a.v1Org), manual_id: get('manuales', a.v1Manual), version_id: get('manual_versions', a.v1Version), person_id: personId(a.personKey) }), { each: true });

  await load('checklists', 'checklists', plan.checklists, (c) => clean({ ...c.row, organization_id: orgOf(c.v1Org) }), { each: true });

  // SMS: reportes + su caso, acciones, línea de tiempo, peligros y barreras
  log('SMS…');
  await load('sms_reports', 'sms_reports', plan.smsReports, (r) => clean({ ...r.row, organization_id: orgOf(r.v1Org), reported_by: r.reporterKey !== null && r.reporterKey !== undefined ? personId(r.reporterKey) : null, flight_id: r.flightV1 ? get('flights', r.flightV1) : null }), { each: true });
  await load('sms_cases', 'sms_cases', plan.smsReports, (r) => clean({ report_id: get('sms_reports', r.v1Id), organization_id: orgOf(r.v1Org), status: r.caseStatus, closed_at: r.caseClosedAt || undefined, assigned_to: r.assignedKey !== null && r.assignedKey !== undefined ? personId(r.assignedKey) : undefined, ...r.caseExtras }), { each: true });
  await load('sms_case_actions', 'sms_case_actions', plan.caseActions, (a) => clean({ ...a.row, organization_id: orgOf(a.v1Org), case_id: get('sms_cases', a.v1Report) }), { each: true });
  await load('sms_case_events', 'sms_case_events', plan.caseEvents, (e) => clean({ ...e.row, organization_id: orgOf(e.v1Org), case_id: get('sms_cases', e.v1Report), created_by: e.actorKey !== null && e.actorKey !== undefined ? personId(e.actorKey) : undefined }), { each: true });
  await load('hazards', 'hazards', plan.hazards, (h) => clean({ ...h.hazard, organization_id: orgOf(h.v1Org) }), { each: true });
  await load('risk_assessments', 'risk_assessments', plan.hazards.filter((h) => h.assessment).map((h) => ({ ...h, v1Id: `ra:${h.v1Id}` })), (h) => clean({ ...h.assessment, organization_id: orgOf(h.v1Org), hazard_id: get('hazards', h.v1Id.replace(/^ra:/, '')) }), { each: true });
  await load('barriers', 'barriers', plan.barriers, (b) => clean({ ...b.row, organization_id: orgOf(b.v1Org) }), { each: true });

  // Expediente, fotos y logos
  const firstOrgOf = (personKey) => { const m = plan.memberships.find((x) => x.personKey === personKey); return m ? orgOf(m.v1Org) : null; };
  for (const d of plan.personDocs) {
    const pid = personId(d.personKey);
    if (!pid || get('person_documents', `${d.personKey}|${d.doc_type}`)) continue;
    const to = fileTo('person_documents', `${d.personKey}|${d.doc_type}`, d.ref, `personal/${pid}/${d.doc_type}`, firstOrgOf(d.personKey));
    if (!to) continue;
    const { data, error } = await db.from('person_documents').insert({ person_id: pid, doc_type: d.doc_type, document_path: to }).select('id').single();
    if (error) stat('person_documents').failed.push({ id: `${d.personKey}|${d.doc_type}`, error: error.message });
    else { await remember('person_documents', [[`${d.personKey}|${d.doc_type}`, data.id]]); stat('person_documents').inserted++; }
  }
  for (const a of plan.avatarRefs) {
    const pid = personId(a.personKey);
    const to = pid ? fileTo('people.avatar', String(a.personKey), a.ref, `personal/${pid}`, firstOrgOf(a.personKey)) : null;
    if (to) await setColumn('people', pid, { avatar_path: to });
  }
  for (const a of plan.aircraftImages) {
    const id = get('aircraft', a.v1Id);
    const to = id ? fileTo('aircraft.image', a.v1Id, a.ref, `aeronaves/${id}`, orgOf(a.v1Org)) : null;
    if (to) await setColumn('aircraft', id, { image_path: to });
  }
  for (const l of plan.orgLogos) {
    const org = orgOf(l.v1Id);
    const to = org ? fileTo('organizations.logo', l.v1Id, l.ref, 'logo', org, 'partner-logos') : null;
    if (to && process.env.R2_LOGOS_BASE_URL) await setColumn('organizations', org, { logo_url: `${process.env.R2_LOGOS_BASE_URL.replace(/\/$/, '')}/${to}` });
  }

  // Archivo fiel de v1 (JSONB), sin contraseñas
  {
    const s = stat('legacy_v1_rows');
    for (const [table, rows] of Object.entries(plan.archive || {})) {
      for (let i = 0; i < rows.length; i += 200) {
        const batch = rows.slice(i, i + 200).map((r, j) => ({ source_table: table, id_v1: String(r.id ?? `${table}#${i + j}`), data: r }));
        const { error } = await db.from('legacy_v1_rows').upsert(batch, { onConflict: 'source_table,id_v1' });
        if (error) s.failed.push({ id: `${table} ${i}`, error: error.message }); else s.inserted += batch.length;
      }
    }
    log(`  legacy_v1_rows: ${s.inserted} fila(s) archivada(s) (fallaron ${s.failed.length})`);
  }

  return { files, stats: Object.fromEntries(Object.entries(stats).map(([k, v]) => [k, { inserted: v.inserted, existing: v.existing, failed: v.failed.length, failures: v.failed.slice(0, 20) }])) };
}
