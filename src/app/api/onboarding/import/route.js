import { NextResponse }                        from 'next/server';
import { createClientSSR, createAdminClient } from '@/lib/supabaseServer';
import { getOrgContext }                       from '@/lib/apiAuth';
import { PERMISSIONS }                         from '@/lib/roles';
import { canAddResource }                      from '@/lib/planLimits';
import { createCrewInvitation, roleFromPilotRole } from '@/lib/invitations';

export const dynamic = 'force-dynamic';

// ── Helpers reutilizados del importador de logbook ────────────────────────

function parseDate(raw) {
  if (!raw) return null;
  if (raw instanceof Date) {
    if (isNaN(raw.getTime())) return null;
    const y = raw.getUTCFullYear();
    const m = String(raw.getUTCMonth() + 1).padStart(2, '0');
    const d = String(raw.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(raw).trim();
  if (/^\d{5}$/.test(s)) {
    const date = new Date((Number(s) - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) {
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth()+1).padStart(2,'0')}-${String(date.getUTCDate()).padStart(2,'0')}`;
    }
  }
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`;
  const ymd = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymd) return `${ymd[1]}-${ymd[2].padStart(2,'0')}-${ymd[3].padStart(2,'0')}`;
  return null;
}

function getCellValue(cell) {
  const val = cell.value;
  if (val === null || val === undefined) return '';
  if (val instanceof Date) return val;
  if (typeof val === 'object') {
    if (val.richText)             return val.richText.map(r => r.text).join('');
    if (val.text !== undefined)   return val.text;        // celda con hipervínculo { text, hyperlink }
    if (val.hyperlink !== undefined) return val.hyperlink;
    if (val.result !== undefined) return val.result ?? '';
    return String(val);
  }
  return val;
}

function str(v) { return String(v ?? '').trim(); }
function num(v) { const n = parseFloat(String(v ?? '').replace(',', '.')); return isNaN(n) ? null : n; }

// Lee todas las filas de una hoja como array de objetos { col1: val, col2: val, ... }
function readSheet(ws) {
  if (!ws) return [];
  const headers = {};
  ws.getRow(1).eachCell((cell, col) => {
    // Quitar el sufijo " *" que marca columnas obligatorias en la plantilla,
    // para que las claves coincidan con los nombres limpios que usa el importador.
    const h = str(getCellValue(cell)).replace(/\s*\*\s*$/, '');
    if (h) headers[col] = h;
  });
  const rows = [];
  ws.eachRow((row, rowNum) => {
    if (rowNum === 1) return;
    const obj = {};
    Object.entries(headers).forEach(([col, h]) => {
      obj[h] = getCellValue(row.getCell(Number(col)));
    });
    // Saltar filas completamente vacías
    if (Object.values(obj).every(v => v === '' || v === null || v === undefined)) return;
    obj._row = rowNum;
    rows.push(obj);
  });
  return rows;
}

// ── POST /api/onboarding/import ───────────────────────────────────────────
export async function POST(request) {
  try {
    const supabase = await createClientSSR();
    const ctx = await getOrgContext(supabase);
    if (!ctx?.orgId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    if (!PERMISSIONS.canManageFleet.includes(ctx.role))
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) return NextResponse.json({ error: 'Campo "file" requerido' }, { status: 400 });

    if (file.size > 10_000_000)
      return NextResponse.json({ error: 'Archivo demasiado grande (máx 10 MB)' }, { status: 413 });

    const XLSX_MIMES = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    if (file.type && !XLSX_MIMES.includes(file.type))
      return NextResponse.json({ error: 'Solo se aceptan archivos .xlsx' }, { status: 415 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const ExcelJS = (await import('exceljs')).default;
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer);


    const admin   = createAdminClient();
    const orgId   = ctx.orgId;
    const userId  = ctx.user?.id;   // getOrgContext retorna `user`, no `userId`
    const plan    = ctx.subscription_plan || 'piloto';

    if (!userId) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });

    const results = {
      org:        { updated: false, name: null },
      flota:      { created: 0, skipped: 0, errors: [] },
      tripulacion:{ created: 0, skipped: 0, invited: 0, errors: [] },
      baterias:   { created: 0, skipped: 0, errors: [] },
      polizas:    { created: 0, skipped: 0, errors: [] },
      contactos:  { created: 0, skipped: 0 },
      bitacora:   { inserted: 0, duplicates: 0, errors: [] },
    };

    // ── 1. ORGANIZACIÓN ──────────────────────────────────────────────────
    const wsOrg = wb.getWorksheet('🏢 Organización');
    if (wsOrg) {
      const rows = readSheet(wsOrg);
      if (rows.length > 0) {
        const r = rows[0];
        const updates = {};
        if (str(r['Razón Social']))        updates.company_name    = str(r['Razón Social']);
        if (str(r['Tipo Documento']))      updates.tax_id_type     = str(r['Tipo Documento']);
        if (str(r['Número Documento']))    updates.tax_id          = str(r['Número Documento']);
        if (str(r['N° Explotador DAN']))   updates.dan_number      = str(r['N° Explotador DAN']);
        if (str(r['Representante Legal'])) updates.legal_rep       = str(r['Representante Legal']);
        if (str(r['Email Corporativo']))   updates.operator_email  = str(r['Email Corporativo']);
        if (str(r['Teléfono']))            updates.phone           = str(r['Teléfono']);
        if (str(r['Dirección']))           updates.address         = str(r['Dirección']);
        if (str(r['Prefijo Misiones']))    updates.flight_prefix   = str(r['Prefijo Misiones']).toUpperCase().slice(0, 4);

        if (Object.keys(updates).length > 0) {
          const { error } = await admin.from('organizations').update(updates).eq('id', orgId);
          if (!error) {
            results.org.updated = true;
            results.org.name    = updates.company_name || null;
          }
        }
      }
    }

    // ── 2. FLOTA (antes que tripulación y baterías — FK) ─────────────────
    const wsFlota = wb.getWorksheet('✈️ Flota');
    if (wsFlota) {
      const rows = readSheet(wsFlota);

      // Cargar seriales existentes para dedup
      const { data: existingAC } = await admin
        .from('aircraft').select('serial_number').eq('organization_id', orgId);
      const existingSerials = new Set((existingAC || []).map(a => a.serial_number.toUpperCase()));

      // Verificar límite del plan
      let acCount = existingSerials.size;

      for (const r of rows) {
        const brand  = str(r['Fabricante']);
        const model  = str(r['Modelo']);
        const serial = str(r['Serial / S/N']).toUpperCase();

        if (!brand || !model || !serial) {
          results.flota.errors.push(`Fila ${r._row}: fabricante, modelo y serial son obligatorios`);
          continue;
        }
        if (existingSerials.has(serial)) {
          results.flota.skipped++;
          continue;
        }
        if (!canAddResource(plan, acCount, 'drone')) {
          results.flota.errors.push(`Fila ${r._row}: límite de aeronaves del plan alcanzado (${plan})`);
          continue;
        }

        const { error } = await admin.from('aircraft').insert({
          organization_id:        orgId,
          owner_id:               userId,
          brand,
          model,
          serial_number:          serial,
          ruas:                   str(r['Registro RUAS']) || null,
          total_hours:            num(r['Horas Acumuladas']) || 0,
          status:                 str(r['Estado']) || 'Operativo',
          last_maintenance_date:  null,
          last_maintenance_hours: 0,
        });

        if (error) {
          results.flota.errors.push(`Fila ${r._row}: ${error.message}`);
        } else {
          results.flota.created++;
          acCount++;
          existingSerials.add(serial);
        }
      }
    }

    // ── 3. TRIPULACIÓN ───────────────────────────────────────────────────
    const wsTripulacion = wb.getWorksheet('👥 Tripulación');
    if (wsTripulacion) {
      const rows = readSheet(wsTripulacion);

      const { data: existingPilots } = await admin
        .from('pilots').select('id_number, email').eq('organization_id', orgId);
      const existingIds    = new Set((existingPilots || []).map(p => String(p.id_number || '').trim()).filter(Boolean));
      const existingEmails = new Set((existingPilots || []).map(p => String(p.email || '').trim().toLowerCase()).filter(Boolean));

      // Datos para los correos de invitación
      const { data: orgRow } = await admin
        .from('organizations').select('company_name').eq('id', orgId).maybeSingle();
      const { data: senderRow } = await admin
        .from('profiles').select('full_name').eq('id', userId).maybeSingle();
      const orgName    = orgRow?.company_name || 'tu organización';
      const senderName = senderRow?.full_name || 'Un administrador';
      const selfEmail  = String(ctx.user?.email || '').trim().toLowerCase();

      let pilotCount = existingIds.size;
      const toInvite = []; // { pilotId, name, email, role }

      for (const r of rows) {
        const name     = str(r['Nombre Completo']);
        const idNumber = str(r['Número Cédula / Pasaporte']);
        const emailRaw = str(r['Email']);
        const emailLc  = emailRaw.toLowerCase();

        if (!name) {
          results.tripulacion.errors.push(`Fila ${r._row}: nombre es obligatorio`);
          continue;
        }
        // Dedup por cédula O por email (evita duplicar a quien ya está, incl. uno mismo)
        if (idNumber && existingIds.has(idNumber)) {
          results.tripulacion.skipped++;
          continue;
        }
        if (emailLc && existingEmails.has(emailLc)) {
          results.tripulacion.skipped++;
          continue;
        }
        if (!canAddResource(plan, pilotCount, 'pilot')) {
          results.tripulacion.errors.push(`Fila ${r._row}: límite de tripulantes del plan alcanzado (${plan})`);
          continue;
        }

        const medExp = parseDate(r['Vencimiento Médico']);
        const email  = str(r['Email']) || null;
        const role   = str(r['Rol']) || 'Piloto';

        // Si tiene email se invita → queda 'pending'; sin email se agrega sin invitación.
        const { data: inserted, error } = await admin.from('pilots').insert({
          organization_id:         orgId,
          owner_id:                userId,
          name,
          id_number:               idNumber || null,
          license_number:          str(r['CIPU / N° Licencia']) || null,
          medical_expiry:          medExp,
          pilot_role:              role,
          phone:                   str(r['Teléfono']) || null,
          email,
          emergency_contact_name:  str(r['Contacto Emergencia — Nombre']) || null,
          emergency_contact_phone: str(r['Contacto Emergencia — Teléfono']) || null,
          is_active:               true,
          invitation_status:       email ? 'pending' : null,
        }).select('id').single();

        if (error) {
          results.tripulacion.errors.push(`Fila ${r._row}: ${error.message}`);
        } else {
          results.tripulacion.created++;
          pilotCount++;
          if (idNumber) existingIds.add(idNumber);
          if (emailLc) existingEmails.add(emailLc);
          // Invitar solo si tiene email y NO es el propio importador
          if (email && inserted?.id && emailLc !== selfEmail) {
            toInvite.push({ pilotId: inserted.id, name, email, role });
          }
        }
      }

      // Crear invitaciones + enviar correos (fuera del bucle de inserción)
      for (const inv of toInvite) {
        try {
          await createCrewInvitation(admin, {
            orgId,
            invitedBy:  userId,
            pilotId:    inv.pilotId,
            name:       inv.name,
            email:      inv.email,
            role:       roleFromPilotRole(inv.role),
            orgName,
            senderName,
          });
          results.tripulacion.invited++;
        } catch (e) {
          results.tripulacion.errors.push(`Invitación a ${inv.email}: ${e.message}`);
        }
      }
    }

    // ── 4. BATERÍAS ──────────────────────────────────────────────────────
    const wsBaterias = wb.getWorksheet('🔋 Baterías');
    if (wsBaterias) {
      const rows = readSheet(wsBaterias);

      const { data: existingBat } = await admin
        .from('batteries').select('serial_number').eq('organization_id', orgId);
      const existingBatSerials = new Set((existingBat || []).map(b => b.serial_number.toUpperCase()));

      for (const r of rows) {
        const serial = str(r['Serial / S/N']).toUpperCase();
        if (!serial) {
          results.baterias.errors.push(`Fila ${r._row}: serial es obligatorio`);
          continue;
        }
        if (existingBatSerials.has(serial)) {
          results.baterias.skipped++;
          continue;
        }

        // Nota: la tabla `batteries` no vincula a aeronave; la columna
        // "Serial Aeronave Asignada" es informativa y no se almacena.
        const { error } = await admin.from('batteries').insert({
          organization_id: orgId,
          owner_id:        userId,
          serial_number:   serial,
          brand:           str(r['Marca']) || null,
          cycles:          num(r['Ciclos Acumulados']) || 0,
        });

        if (error) {
          results.baterias.errors.push(`Fila ${r._row}: ${error.message}`);
        } else {
          results.baterias.created++;
          existingBatSerials.add(serial);
        }
      }
    }

    // ── 5. PÓLIZAS RCE ───────────────────────────────────────────────────
    const wsPolizas = wb.getWorksheet('📋 Pólizas RCE');
    if (wsPolizas) {
      const rows = readSheet(wsPolizas);

      const { data: existingPol } = await admin
        .from('insurance_policies').select('policy_number').eq('organization_id', orgId);
      const existingPolNums = new Set((existingPol || []).map(p => str(p.policy_number)));

      const { data: acForPol } = await admin
        .from('aircraft').select('id, serial_number').eq('organization_id', orgId);
      const acMapPol = {};
      (acForPol || []).forEach(a => { acMapPol[a.serial_number.toUpperCase()] = a.id; });

      for (const r of rows) {
        const company    = str(r['Aseguradora']);
        const policyNum  = str(r['Número de Póliza']);
        const startDate  = parseDate(r['Fecha Inicio']);
        const endDate    = parseDate(r['Fecha Fin']);

        if (!company || !policyNum || !startDate || !endDate) {
          results.polizas.errors.push(`Fila ${r._row}: aseguradora, número póliza y fechas son obligatorios`);
          continue;
        }
        if (existingPolNums.has(policyNum)) {
          results.polizas.skipped++;
          continue;
        }

        const acSerial  = str(r['Serial Aeronave (o escribe FLOTA)']).toUpperCase();
        const aircraft_id = (acSerial && acSerial !== 'FLOTA')
          ? (acMapPol[acSerial] || null)
          : null;

        const { error } = await admin.from('insurance_policies').insert({
          organization_id:   orgId,
          insurance_company: company,
          policy_number:     policyNum,
          start_date:        startDate,
          end_date:          endDate,
          aircraft_id,
        });

        if (error) {
          results.polizas.errors.push(`Fila ${r._row}: ${error.message}`);
        } else {
          results.polizas.created++;
          existingPolNums.add(policyNum);
        }
      }
    }

    // ── 6. CONTACTOS DE EMERGENCIA ───────────────────────────────────────
    const wsContactos = wb.getWorksheet('🚨 Contactos Emergencia');
    if (wsContactos) {
      const rows = readSheet(wsContactos);

      // Dedup por (nombre + teléfono) para que re-subir un template pre-llenado
      // no cree contactos duplicados.
      const { data: existingContacts } = await admin
        .from('emergency_contacts').select('name, phone').eq('organization_id', orgId);
      const contactKey = (n, p) => `${str(n).toLowerCase()}|${str(p)}`;
      const existingContactKeys = new Set(
        (existingContacts || []).map(c => contactKey(c.name, c.phone))
      );

      const inserts = [];
      for (const r of rows) {
        const name  = str(r['Nombre Completo']);
        if (!name) continue;
        const phone = str(r['Teléfono']) || null;
        const key   = contactKey(name, phone);
        if (existingContactKeys.has(key)) { results.contactos.skipped++; continue; }
        existingContactKeys.add(key);
        inserts.push({
          organization_id: orgId,
          name,
          role:  str(r['Cargo / Rol'])  || null,
          phone,
          email: str(r['Email'])        || null,
          notes: str(r['Notas'])        || null,
        });
      }

      if (inserts.length > 0) {
        const { error, data } = await admin
          .from('emergency_contacts').insert(inserts).select('id');
        if (!error) results.contactos.created = data?.length || inserts.length;
      }
    }

    // ── 7. BITÁCORA ──────────────────────────────────────────────────────
    const wsBitacora = wb.getWorksheet('📒 Bitácora de Vuelos');
    if (wsBitacora) {
      const rows = readSheet(wsBitacora);
      const today = new Date().toISOString().split('T')[0];

      // Mapa serial → aircraft_id (actualizado con lo recién importado)
      const { data: acAll } = await admin
        .from('aircraft').select('id, serial_number').eq('organization_id', orgId);
      const acMapFlight = {};
      (acAll || []).forEach(a => { acMapFlight[a.serial_number.toUpperCase()] = a.id; });

      // Mapa nombre → pilot_id (match parcial, case-insensitive)
      const { data: pilotAll } = await admin
        .from('pilots').select('id, name').eq('organization_id', orgId).eq('is_active', true);
      const pilotMap = {};
      (pilotAll || []).forEach(p => { pilotMap[p.name.trim().toLowerCase()] = p.id; });

      function findPilot(name) {
        if (!name) return null;
        const key = name.trim().toLowerCase();
        if (pilotMap[key]) return pilotMap[key];
        // Búsqueda parcial: si algún nombre de la BD contiene el texto buscado
        for (const [k, id] of Object.entries(pilotMap)) {
          if (k.includes(key) || key.includes(k)) return id;
        }
        return null;
      }

      const valid = [];
      for (const r of rows) {
        const fecha  = parseDate(r['Fecha']);
        const serial = str(r['Serial Aeronave']).toUpperCase();

        if (!fecha) {
          results.bitacora.errors.push(`Fila ${r._row}: fecha inválida`);
          continue;
        }
        if (fecha >= today) {
          results.bitacora.errors.push(`Fila ${r._row}: fecha futura no permitida`);
          continue;
        }
        if (!serial) {
          results.bitacora.errors.push(`Fila ${r._row}: serial de aeronave obligatorio`);
          continue;
        }
        const aircraft_id = acMapFlight[serial];
        if (!aircraft_id) {
          results.bitacora.errors.push(`Fila ${r._row}: serial "${serial}" no encontrado`);
          continue;
        }

        const takeoff = str(r['Hora Despegue (HH:MM)']) || null;
        const landing = str(r['Hora Aterrizaje (HH:MM)']) || null;

        valid.push({
          owner_id:         userId,
          organization_id:  orgId,
          aircraft_id,
          flight_date:      fecha,
          takeoff_time:     takeoff,
          landing_time:     landing,
          mission_type:     str(r['Tipo de Misión'])        || 'Inspección',
          visual_condition: str(r['Condición Visual'])       || 'VMC',
          location:         str(r['Ubicación / Municipio'])  || null,
          notes:            str(r['Notas / Observaciones'])  || null,
          incidents:        str(r['Incidente (SI/NO)']).toUpperCase() === 'SI',
          pilot_id:         findPilot(str(r['Nombre Piloto'])),
          imported:         true,
        });
      }

      if (valid.length > 0) {
        const BATCH = 50;
        for (let i = 0; i < valid.length; i += BATCH) {
          const chunk = valid.slice(i, i + BATCH);
          const { error: insertErr, data: inserted } = await admin
            .from('flights')
            .upsert(chunk, {
              onConflict:       'organization_id,aircraft_id,flight_date,takeoff_time',
              ignoreDuplicates: true,
            })
            .select('id, aircraft_id, takeoff_time, landing_time');

          if (insertErr) throw insertErr;

          const realInserted = inserted || [];
          results.bitacora.inserted  += realInserted.length;
          results.bitacora.duplicates += chunk.length - realInserted.length;

          // Actualizar total_hours atómicamente
          const hoursByAC = {};
          realInserted.forEach(f => {
            if (f.takeoff_time && f.landing_time) {
              const [h1, m1] = f.takeoff_time.split(':').map(Number);
              const [h2, m2] = f.landing_time.split(':').map(Number);
              let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
              if (diff < 0) diff += 1440;
              hoursByAC[f.aircraft_id] = (hoursByAC[f.aircraft_id] || 0) + (diff / 60);
            }
          });
          await Promise.all(
            Object.entries(hoursByAC).map(([id, h]) =>
              admin.rpc('increment_aircraft_hours', { p_id: id, p_hours: parseFloat(h.toFixed(4)) })
            )
          );
        }
      }
    }

    // ── Resumen ──────────────────────────────────────────────────────────
    const totalCreated =
      (results.org.updated ? 1 : 0) +
      results.flota.created +
      results.tripulacion.created +
      results.baterias.created +
      results.polizas.created +
      results.contactos.created +
      results.bitacora.inserted;

    const totalSkipped =
      results.flota.skipped +
      results.tripulacion.skipped +
      results.baterias.skipped +
      results.polizas.skipped +
      results.bitacora.duplicates;

    return NextResponse.json({ success: true, results, totalCreated, totalSkipped });

  } catch (err) {
    console.error('[onboarding/import] Error:', err.message);
    return NextResponse.json({ error: 'Error procesando el archivo' }, { status: 500 });
  }
}
