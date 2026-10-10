// Skylog V2.0 — Onboarding Express (carga inicial por Excel): construye la plantilla y aplica el archivo. Las reglas de
// lectura/validación son puras y viven en @skylog/domain/onboardingImport.js; aquí van Excel y Supabase.
// Garantías: idempotente (lo que ya existe se omite, nunca se duplica), respeta el cupo del plan, cada fila falla sola
// (un error no frena las demás) y `dryRun` calcula el mismo informe sin escribir nada.
import ExcelJS from 'exceljs';
import { ONBOARDING_SHEETS, parseOnboardingSheet, dedupeInFile, canInviteRole } from '@skylog/domain';
import { orgCapacity, capacityMessage } from '@/lib/v2/planCapacity';
import { loadJoinContextByOrgId, decideJoin } from '@/lib/v2/joinOrganization';
import { newInvitationToken, sendInvitationEmail, likeExact } from '@/lib/v2/invitationsServer';
import { invitationExpiresAt } from '@skylog/domain';
import { crewCountsForLimit } from '@/lib/v2/planLimits';

export const MAX_ROWS_PER_SHEET = 500;
export const MAX_INVITATIONS = 50;
const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A202C' } };
const LISTS = { Rol: 'piloto,jefe de pilotos,gerente SMS,gerente general', 'Estado de salud': 'buena,regular,mala', Tipo: 'rce,casco,otra' };

const norm = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export async function buildTemplate() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Skylog';
  const info = wb.addWorksheet('Instrucciones');
  info.columns = [{ width: 110 }];
  [
    ['Plantilla de carga inicial — Skylog'],
    [''],
    ['1. Llena las hojas que necesites; las que dejes vacías se ignoran. Las columnas con * son obligatorias.'],
    ['2. Borra o ignora la fila que empieza con «Ejemplo» (también se omite sola si la dejas).'],
    ['3. Súbela en Organización → Importar desde Excel. Primero se muestra un informe y no se guarda nada hasta que confirmes.'],
    ['4. Subirla de nuevo es seguro: lo que ya existe se omite, no se duplica.'],
    [''],
    ...ONBOARDING_SHEETS.map((s) => [`• ${s.name}: ${s.hint}`]),
  ].forEach((r, i) => { const row = info.addRow(r); if (i === 0) row.font = { bold: true, size: 14 }; row.alignment = { wrapText: true }; });

  for (const s of ONBOARDING_SHEETS) {
    const ws = wb.addWorksheet(s.name);
    ws.columns = s.columns.map((c) => ({ header: c.required ? `${c.header} *` : c.header, key: c.key, width: Math.max(18, c.header.length + 6) }));
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = HEADER_FILL;
    ws.getRow(1).alignment = { vertical: 'middle' };
    const ex = ws.addRow(s.example);
    ex.font = { italic: true, color: { argb: 'FF888888' } };
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    s.columns.forEach((c, idx) => {
      const list = LISTS[c.header];
      if (!list) return;
      for (let r = 2; r <= 300; r++) ws.getCell(r, idx + 1).dataValidation = { type: 'list', allowBlank: true, formulae: [`"${list}"`] };
    });
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

function plain(v) {
  if (v && typeof v === 'object' && !(v instanceof Date)) {
    if (Array.isArray(v.richText)) return v.richText.map((t) => t.text).join('');
    return v.text ?? v.result ?? '';
  }
  return v;
}

/** @returns {Promise<Record<string, Record<string, unknown>[]>>} filas por clave de hoja, solo de las hojas reconocidas */
export async function readWorkbook(buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const out = {};
  for (const s of ONBOARDING_SHEETS) {
    const ws = wb.worksheets.find((w) => norm(w.name) === norm(s.name));
    if (!ws) continue;
    const headers = [];
    ws.getRow(1).eachCell({ includeEmpty: false }, (cell, col) => { headers[col] = String(plain(cell.value) ?? ''); });
    const rows = [];
    const last = Math.min(ws.actualRowCount ? ws.rowCount : 1, MAX_ROWS_PER_SHEET + 1);
    for (let r = 2; r <= last; r++) {
      const row = ws.getRow(r);
      const obj = {};
      headers.forEach((h, col) => { if (h) obj[h] = plain(row.getCell(col).value); });
      rows.push(obj);
    }
    out[s.key] = rows;
  }
  return out;
}

const blank = () => ({ rows: 0, created: 0, existing: 0, errors: [] });

async function importAircraft({ admin, organizationId, personId, items, dryRun }, rep) {
  const { unique, duplicates } = dedupeInFile(items, (i) => i.serial.toLowerCase());
  duplicates.forEach((d) => rep.errors.push({ row: d.row, message: `El n.º de serie ${d.serial} está repetido en el archivo.` }));
  const [{ data: have }, { data: models }, cap] = await Promise.all([
    admin.from('aircraft').select('serial_number').eq('organization_id', organizationId),
    admin.from('aircraft_models').select('id, brand, model').eq('organization_id', organizationId),
    orgCapacity(admin, organizationId, 'aircraft'),
  ]);
  const haveSerials = new Set((have || []).map((a) => a.serial_number.toLowerCase()));
  const modelByKey = new Map((models || []).map((m) => [`${m.brand}|${m.model}`.toLowerCase(), m.id]));
  let room = cap.room;
  for (const it of unique) {
    if (haveSerials.has(it.serial.toLowerCase())) { rep.existing += 1; continue; }
    if (room < 1) { rep.errors.push({ row: it.row, message: capacityMessage('aircraft', cap) }); continue; }
    if (dryRun) { rep.created += 1; room -= 1; continue; }
    const key = `${it.brand}|${it.model}`.toLowerCase();
    let modelId = modelByKey.get(key);
    if (!modelId) {
      const { data: m, error } = await admin.from('aircraft_models').insert({ organization_id: organizationId, brand: it.brand, model: it.model, created_by: personId }).select('id').single();
      if (error) { rep.errors.push({ row: it.row, message: `No se pudo crear el modelo: ${error.message}` }); continue; }
      modelId = m.id; modelByKey.set(key, modelId);
    }
    const { error } = await admin.from('aircraft').insert({ organization_id: organizationId, model_id: modelId, serial_number: it.serial, ruas_number: it.ruas, total_hours: it.hours, created_by: personId });
    if (error) {
      if (error.code === '23505') rep.existing += 1; else rep.errors.push({ row: it.row, message: error.message });
      continue;
    }
    rep.created += 1; room -= 1;
  }
}

async function importBatteries({ admin, organizationId, personId, items, dryRun }, rep) {
  const { unique, duplicates } = dedupeInFile(items, (i) => i.serial.toLowerCase());
  duplicates.forEach((d) => rep.errors.push({ row: d.row, message: `El n.º de serie ${d.serial} está repetido en el archivo.` }));
  const [{ data: have }, cap] = await Promise.all([
    admin.from('batteries').select('serial_number').eq('organization_id', organizationId),
    orgCapacity(admin, organizationId, 'batteries'),
  ]);
  const haveSerials = new Set((have || []).map((b) => b.serial_number.toLowerCase()));
  let room = cap.room;
  for (const it of unique) {
    if (haveSerials.has(it.serial.toLowerCase())) { rep.existing += 1; continue; }
    if (room < 1) { rep.errors.push({ row: it.row, message: capacityMessage('batteries', cap) }); continue; }
    if (dryRun) { rep.created += 1; room -= 1; continue; }
    const { error } = await admin.from('batteries').insert({ organization_id: organizationId, serial_number: it.serial, brand: it.brand, model: it.model, cycles: it.cycles, health_status: it.health, created_by: personId });
    if (error) {
      if (error.code === '23505') rep.existing += 1; else rep.errors.push({ row: it.row, message: error.message });
      continue;
    }
    rep.created += 1; room -= 1;
  }
}

async function importCrew({ admin, organizationId, personId, memberships, items, dryRun }, rep) {
  const { unique, duplicates } = dedupeInFile(items, (i) => i.email);
  duplicates.forEach((d) => rep.errors.push({ row: d.row, message: `El correo ${d.email} está repetido en el archivo.` }));
  const { data: org } = await admin.from('organizations').select('id, company_name').eq('id', organizationId).maybeSingle();
  const { data: inviter } = await admin.from('people').select('full_name').eq('id', personId).maybeSingle();
  const ctx = await loadJoinContextByOrgId(admin, org);
  const myRoles = (memberships || []).filter((m) => m.organization_id === organizationId).map((m) => m.role);
  let sentNow = 0;
  rep.emailsSent = 0;
  for (const it of unique) {
    if (!canInviteRole(myRoles, it.role)) { rep.errors.push({ row: it.row, message: it.role === 'admin' ? 'Solo un Gerente General puede invitar a otro Gerente General.' : 'No tienes permiso para invitar con ese rol.' }); continue; }
    const { data: person } = await admin.from('people').select('id').ilike('email', likeExact(it.email)).limit(1).maybeSingle();
    if (person) {
      const { data: member } = await admin.from('memberships').select('id').eq('person_id', person.id).eq('organization_id', organizationId).eq('status', 'activa').maybeSingle();
      if (member) { rep.existing += 1; continue; }
    }
    // Ya tiene una invitación vigente para ese correo: volver a subir el archivo no reenvía el correo (para reenviar, usa Tripulación).
    const { data: pending } = await admin.from('invitations').select('id').eq('organization_id', organizationId).ilike('email', likeExact(it.email)).eq('status', 'pendiente').gt('expires_at', new Date().toISOString()).limit(1).maybeSingle();
    if (pending) { rep.existing += 1; continue; }
    if (sentNow >= MAX_INVITATIONS) { rep.errors.push({ row: it.row, message: `Se envían máximo ${MAX_INVITATIONS} invitaciones por importación; sube el resto en otro archivo.` }); continue; }
    const decision = it.role === 'admin' ? { ok: true } : decideJoin(ctx, it.role);
    if (!decision.ok) { rep.errors.push({ row: it.row, message: decision.message }); continue; }
    if (dryRun) { rep.created += 1; sentNow += 1; ctx.members.push({ role: it.role }); if (crewCountsForLimit(it.role)) ctx.crewCount += 1; continue; }
    await admin.from('invitations').update({ status: 'revocada' }).eq('organization_id', organizationId).ilike('email', likeExact(it.email)).eq('status', 'pendiente');
    const token = newInvitationToken();
    const { error } = await admin.from('invitations').insert({ organization_id: organizationId, email: it.email, name: it.name, role: it.role, person_id: person?.id || null, invited_by: personId, token, expires_at: invitationExpiresAt(new Date().toISOString()) });
    if (error) { rep.errors.push({ row: it.row, message: error.message }); continue; }
    const mail = await sendInvitationEmail({ to: it.email, name: it.name, role: it.role, organizationName: org.company_name, inviterName: inviter?.full_name, token });
    if (mail.sent) rep.emailsSent += 1;
    ctx.members.push({ role: it.role }); if (crewCountsForLimit(it.role)) ctx.crewCount += 1;
    rep.created += 1; sentNow += 1;
  }
}

async function importContacts({ admin, organizationId, items, dryRun }, rep) {
  const key = (i) => `${i.name}|${i.phone || ''}`.toLowerCase();
  const { unique, duplicates } = dedupeInFile(items, key);
  duplicates.forEach((d) => rep.errors.push({ row: d.row, message: `El contacto ${d.name} está repetido en el archivo.` }));
  const { data: have } = await admin.from('organization_emergency_contacts').select('name, phone').eq('organization_id', organizationId);
  const haveKeys = new Set((have || []).map((c) => `${c.name}|${c.phone || ''}`.toLowerCase()));
  for (const it of unique) {
    if (haveKeys.has(key(it))) { rep.existing += 1; continue; }
    if (dryRun) { rep.created += 1; continue; }
    const { error } = await admin.from('organization_emergency_contacts').insert({ organization_id: organizationId, name: it.name, role: it.role, phone: it.phone, email: it.email, notes: it.notes });
    if (error) rep.errors.push({ row: it.row, message: error.message }); else rep.created += 1;
  }
}

async function importPolicies({ admin, organizationId, personId, items, dryRun }, rep) {
  const key = (i) => `${i.insurer}|${i.number}`.toLowerCase();
  const { unique, duplicates } = dedupeInFile(items, key);
  duplicates.forEach((d) => rep.errors.push({ row: d.row, message: `La póliza ${d.number} está repetida en el archivo.` }));
  const { data: have } = await admin.from('insurance_policies').select('insurer, policy_number').eq('organization_id', organizationId);
  const haveKeys = new Set((have || []).map((p) => `${p.insurer}|${p.policy_number}`.toLowerCase()));
  for (const it of unique) {
    if (haveKeys.has(key(it))) { rep.existing += 1; continue; }
    if (dryRun) { rep.created += 1; continue; }
    const { error } = await admin.from('insurance_policies').insert({ organization_id: organizationId, policy_type: it.type, insurer: it.insurer, policy_number: it.number, start_date: it.start, end_date: it.end, covers_all_fleet: true, covered_amount_cop: it.amount, created_by: personId });
    if (error) rep.errors.push({ row: it.row, message: error.code === '23505' ? 'Ya existe una póliza de esa aseguradora con ese número.' : error.message }); else rep.created += 1;
  }
}

const RUNNERS = { aeronaves: importAircraft, baterias: importBatteries, tripulacion: importCrew, contactos: importContacts, polizas: importPolicies };
// Orden: primero lo que otros dependen (aeronaves/baterías), tripulación al final porque envía correos.
const ORDER = ['aeronaves', 'baterias', 'contactos', 'polizas', 'tripulacion'];

/** @returns {Promise<Record<string, {rows:number, created:number, existing:number, errors:{row:number,message:string}[], emailsSent?:number}>>} */
export async function runImport({ admin, organizationId, personId, memberships, sheets, dryRun }) {
  const report = {};
  for (const sheetKey of ORDER) {
    if (!sheets[sheetKey]) continue;
    const parsed = parseOnboardingSheet(sheetKey, sheets[sheetKey]);
    const rep = blank();
    rep.rows = parsed.items.length + parsed.errors.length;
    parsed.errors.forEach((e) => rep.errors.push(e));
    try {
      await RUNNERS[sheetKey]({ admin, organizationId, personId, memberships, items: parsed.items, dryRun }, rep);
    } catch (e) {
      rep.errors.push({ row: 0, message: `Error inesperado en la hoja: ${e.message}` });
    }
    rep.errors.sort((a, b) => a.row - b.row);
    report[sheetKey] = rep;
  }
  return report;
}
