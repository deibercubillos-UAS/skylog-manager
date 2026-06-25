// src/lib/checklistDefaults.js
//
// Plantillas básicas para las listas de chequeo (form_definitions).
// Usadas para sembrar valores por defecto desde el Editor de Protocolos.
// El texto se guarda en MAYÚSCULAS (igual que handleSave en FormSettingsClient).

export const CHECKLIST_DEFAULTS = {
  // ── SALUD (chequeo médico diario tipo IMSAFE) ──────────────────────────
  health: [
    'Descansó al menos 8 horas la noche anterior',
    'Libre de medicamentos que afecten la concentración',
    'Sin consumo de alcohol en las últimas 12 horas',
    'Estado emocional estable, sin estrés excesivo',
    'Alimentación e hidratación adecuadas',
    'Sin síntomas de enfermedad, gripe o malestar',
    'Sin signos de fatiga o cansancio',
    'Visión y audición en condiciones normales',
  ],

  // ── PRE-VUELO (inspección física de la aeronave) ───────────────────────
  preflight: [
    'Inspección visual del fuselaje sin daños',
    'Hélices sin grietas, desgaste ni deformación',
    'Motores giran libremente sin obstrucción',
    'Batería de la aeronave cargada y asegurada',
    'Batería del control remoto cargada',
    'Tarjeta de memoria instalada y con espacio',
    'Firmware de aeronave y control actualizado',
    'Calibración de brújula (IMU) verificada',
    'Antenas del control en buen estado',
    'Tren de aterrizaje firme y completo',
    'Cámara / gimbal limpio y sin obstrucción',
    'Conexión control-aeronave estable',
    'Señal GPS adecuada (satélites suficientes)',
    'Return-to-Home (RTH) configurado y altura definida',
  ],

  // ── BRIEFING (preparación de la misión) ────────────────────────────────
  briefing: [
    'Condiciones meteorológicas verificadas (viento, lluvia, visibilidad)',
    'Espacio aéreo consultado (zonas restringidas / NOTAM)',
    'Permisos y autorizaciones vigentes',
    'Área de despegue y aterrizaje despejada',
    'Identificación de obstáculos (cables, árboles, edificios)',
    'Plan de vuelo y altura máxima definidos',
    'Punto de retorno (RTH) acordado',
    'Comunicación con observadores / tripulación establecida',
    'Procedimiento de emergencia repasado',
    'Distancia a personas no participantes asegurada',
    'Zona de aterrizaje alterno identificada',
    'Extintor / kit de primeros auxilios disponible',
  ],

  // ── RECIBO MTTO (recibo de drone posterior al mantenimiento) ───────────
  maintenance_return: [
    'Hélices instaladas, sin grietas ni desgaste',
    'Motores giran libremente y sin ruidos anómalos',
    'Tren de aterrizaje firme y completo',
    'Fuselaje sin daños, tornillería completa y ajustada',
    'Gimbal y cámara limpios, sin holguras ni obstrucción',
    'Baterías cargadas, sin deformación y aseguradas',
    'Firmware de aeronave y control actualizado',
    'Calibración de brújula (IMU) verificada',
    'Conexión control-aeronave estable',
    'Señal GPS adecuada (satélites suficientes)',
    'Return-to-Home (RTH) configurado y probado',
    'Prueba de motores en tierra satisfactoria',
    'Vuelo de prueba (hover) sin alertas',
    'Documentación de la intervención registrada',
  ],
};

// Helper: convierte un array de etiquetas en filas listas para upsert en form_definitions
export function buildChecklistRows(formType, orgId, aircraftModel = 'General') {
  const labels = CHECKLIST_DEFAULTS[formType] || [];
  return labels.map((text, idx) => ({
    organization_id: orgId,
    form_type:       formType,
    aircraft_model:  aircraftModel,
    field_number:    idx + 1,
    label_text:      text.toUpperCase(),
  }));
}
