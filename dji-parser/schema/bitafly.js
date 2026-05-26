/**
 * Normalizes raw parsed data (from DAT or TXT) into a Bitafly logbook entry.
 * Fields match the logbook table columns used in the import API.
 */
export function toBitaflyEntry(raw) {
  const m = raw._meta ?? {};

  return {
    // ── Campos core de la bitácora ──────────────────────────
    serial_aeronave:  raw.serial_aeronave  ?? null,
    fecha:            raw.fecha            ?? null,   // YYYY-MM-DD
    hora_despegue:    raw.hora_despegue    ?? null,   // HH:MM
    hora_aterrizaje:  raw.hora_aterrizaje  ?? null,   // HH:MM
    ubicacion:        raw.ubicacion        ?? null,
    condicion_visual: raw.condicion_visual ?? 'VMC',
    tipo_mision:      raw.tipo_mision      ?? null,
    notas:            raw.notas            ?? `Importado desde DJI ${m.fuente ?? 'log'}`,
    incidentes:       raw.incidentes       ?? 'NO',

    // ── Telemetría extendida ─────────────────────────────────
    _meta: {
      fuente:              m.fuente             ?? null,
      log_version:         m.log_version        ?? null,

      // Aeronave
      modelo_aeronave:     m.modelo_aeronave    ?? null,
      nombre_aeronave:     m.nombre_aeronave    ?? null,
      serial_aeronave_full: m.serial_aeronave_full ?? null,

      // Componentes
      serial_camara:       m.serial_camara      ?? null,
      serial_rc:           m.serial_rc          ?? null,
      serial_bateria:      m.serial_bateria     ?? null,

      // Firmware
      firmware_camara:     m.firmware_camara    ?? m.firmware ?? null,
      firmware_fc:         m.firmware_fc        ?? null,
      firmware_rc:         m.firmware_rc        ?? null,
      firmware_app:        m.firmware_app       ?? null,

      // Vuelo
      duracion_s:          m.duracion_s         ?? null,
      distancia_max_m:     m.distancia_max_m    ?? null,
      altitud_max_m:       m.altitud_max_m      ?? null,
      altitud_msl_m:       m.altitud_msl_m      ?? null,
      vel_horizontal_max:  m.vel_horizontal_max ?? null,
      gps_satelites_max:   m.gps_satelites_max  ?? null,
      lat_inicio:          m.lat_inicio         ?? null,
      lng_inicio:          m.lng_inicio         ?? null,

      // Batería telemetría
      bateria_inicio_pct:    m.bateria_inicio_pct    ?? null,
      bateria_fin_pct:       m.bateria_fin_pct       ?? null,
      bateria_cap_mah:       m.bateria_cap_mah       ?? null,
      bateria_temp_max_c:    m.bateria_temp_max_c    ?? null,
      bateria_volt_min_v:    m.bateria_volt_min_v    ?? null,
      bateria_volt_max_v:    m.bateria_volt_max_v    ?? null,
      bateria_current_max_a: m.bateria_current_max_a ?? null,
      celda_volt_min_v:      m.celda_volt_min_v      ?? null,
      celda_volt_max_v:      m.celda_volt_max_v      ?? null,

      // Batería salud (SmartBatteryStatic)
      ciclos_bateria:        m.ciclos_bateria        ?? null,
      bateria_vida_pct:      m.bateria_vida_pct      ?? null,
      bateria_cap_diseno:    m.bateria_cap_diseno    ?? null,
    },
  };
}

/**
 * Validates that mandatory fields are present in a Bitafly entry.
 * Returns { valid: bool, errors: string[] }.
 */
export function validateEntry(entry) {
  const errors = [];
  if (!entry.serial_aeronave) errors.push('serial_aeronave es obligatorio');
  if (!entry.fecha)           errors.push('fecha es obligatoria');
  return { valid: errors.length === 0, errors };
}
