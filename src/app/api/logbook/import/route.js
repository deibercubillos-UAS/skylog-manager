import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClientSSR } from '@/lib/supabaseServer';
import ExcelJS from 'exceljs';

export const dynamic = 'force-dynamic';

// Columnas esperadas en el Excel (nombre exacto de la cabecera)
const COL = {
  fecha:            'FECHA',           // YYYY-MM-DD o DD/MM/YYYY
  serial_aeronave:  'SERIAL_AERONAVE', // S/N del dron (obligatorio)
  tipo_mision:      'TIPO_MISION',     // Inspección, Mapeo, Fumigación, etc.
  hora_despegue:    'HORA_DESPEGUE',   // HH:MM (opcional)
  hora_aterrizaje:  'HORA_ATERRIZAJE', // HH:MM (opcional)
  condicion_visual: 'CONDICION_VISUAL',// VMC | IMC | NIGHT
  ubicacion:        'UBICACION',
  notas:            'NOTAS',
  incidentes:       'INCIDENTES',      // SI | NO
};

// Normaliza fecha desde formatos comunes → 'YYYY-MM-DD'
function parseDate(raw) {
  if (!raw) return null;

  // ExcelJS devuelve Date para celdas con formato fecha
  if (raw instanceof Date) {
    if (isNaN(raw.getTime())) return null;
    const y = raw.getUTCFullYear();
    const m = String(raw.getUTCMonth() + 1).padStart(2, '0');
    const d = String(raw.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const s = String(raw).trim();

  // Número de serie Excel (días desde 1900) — fallback para celdas no tipadas
  if (/^\d{5}$/.test(s)) {
    const date = new Date((Number(s) - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
  }

  // DD/MM/YYYY o DD-MM-YYYY
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2,'0')}-${dmy[1].padStart(2,'0')}`;

  // YYYY-MM-DD
  const ymd = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymd) return `${ymd[1]}-${ymd[2].padStart(2,'0')}-${ymd[3].padStart(2,'0')}`;

  return null;
}

// Extrae el valor primitivo de una celda ExcelJS
function getCellValue(cell) {
  const val = cell.value;
  if (val === null || val === undefined) return '';
  if (val instanceof Date) return val; // parseDate lo maneja
  if (typeof val === 'object') {
    if (val.richText)            return val.richText.map(r => r.text).join('');
    if (val.result !== undefined) return val.result ?? '';
    return String(val);
  }
  return val;
}

export async function POST(request) {
  try {
    // 1. Autenticar usuario
    const supabaseUser = await createClientSSR();
    const { data: { user } } = await supabaseUser.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: prof } = await supabaseUser
      .from('profiles')
      .select('organization_id, role')
      .eq('id', user.id)
      .single();

    if (!prof?.organization_id) {
      return NextResponse.json({ error: 'Perfil sin organización asignada' }, { status: 403 });
    }

    // Solo admin, jefe_pilotos y superadmin pueden importar
    const allowedRoles = ['superadmin', 'admin', 'jefe_pilotos'];
    if (!allowedRoles.includes(prof.role)) {
      return NextResponse.json({ error: 'Sin permisos para importar vuelos' }, { status: 403 });
    }

    // 2. Leer archivo Excel
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) return NextResponse.json({ error: 'Archivo no recibido' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const ws = workbook.worksheets[0];

    if (!ws) {
      return NextResponse.json({ error: 'El archivo está vacío' }, { status: 400 });
    }

    // Extraer encabezados de la primera fila
    const colMap = {};
    ws.getRow(1).eachCell((cell, colNumber) => {
      colMap[colNumber] = cell.value ? String(cell.value).trim() : '';
    });

    // Extraer filas de datos
    const rows = [];
    ws.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const obj = {};
      Object.entries(colMap).forEach(([colNum, header]) => {
        if (header) obj[header] = getCellValue(row.getCell(Number(colNum)));
      });
      rows.push(obj);
    });

    if (!rows.length) {
      return NextResponse.json({ error: 'El archivo está vacío' }, { status: 400 });
    }

    // 3. Cargar aeronaves de la organización para lookup por serial
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: aircraftList } = await supabaseAdmin
      .from('aircraft')
      .select('id, serial_number, total_hours')
      .eq('organization_id', prof.organization_id);

    const aircraftMap = {};
    (aircraftList || []).forEach(a => {
      aircraftMap[a.serial_number.toUpperCase()] = a;
    });

    // 4. Corte de tiempo: solo se aceptan fechas ANTERIORES a este momento
    const uploadedAt = new Date();
    const todayStr = uploadedAt.toISOString().split('T')[0]; // YYYY-MM-DD

    // 5. Validar y transformar cada fila
    const valid   = [];
    const invalid = [];

    rows.forEach((row, i) => {
      const rowNum = i + 2; // +2 por encabezado (fila 1) y base-0
      const errors = [];

      const fecha = parseDate(row[COL.fecha]);
      const serial = String(row[COL.serial_aeronave] || '').trim().toUpperCase();

      if (!fecha)   errors.push('Fecha inválida o ausente');
      if (!serial)  errors.push('Serial de aeronave obligatorio');

      if (fecha && fecha >= todayStr) {
        errors.push(`Fecha ${fecha} es hoy o futura — solo se permiten fechas anteriores`);
      }

      const aircraft = serial ? aircraftMap[serial] : null;
      if (serial && !aircraft) {
        errors.push(`Serial "${serial}" no encontrado en tu flota`);
      }

      if (errors.length) {
        invalid.push({ fila: rowNum, errores: errors, datos: row });
        return;
      }

      valid.push({
        owner_id:       user.id,
        organization_id: prof.organization_id,
        aircraft_id:    aircraft.id,
        flight_date:    fecha,
        takeoff_time:   row[COL.hora_despegue]    || null,
        landing_time:   row[COL.hora_aterrizaje]   || null,
        mission_type:   row[COL.tipo_mision]       || 'Inspección',
        visual_condition: row[COL.condicion_visual] || 'VMC',
        location:       row[COL.ubicacion]         || null,
        notes:          row[COL.notas]             || null,
        incidents:      String(row[COL.incidentes]).toUpperCase() === 'SI',
        imported:       true, // marca para distinguir vuelos importados
      });
    });

    if (!valid.length) {
      return NextResponse.json({
        success: false,
        inserted: 0,
        invalid,
        message: 'Ninguna fila pasó la validación',
      });
    }

    // 6. Insertar vuelos válidos
    const { error: insertErr } = await supabaseAdmin
      .from('flights')
      .insert(valid);

    if (insertErr) throw insertErr;

    return NextResponse.json({
      success: true,
      inserted: valid.length,
      skipped: invalid.length,
      invalid,
    });

  } catch (err) {
    console.error('Import error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
