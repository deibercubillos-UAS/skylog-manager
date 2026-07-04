// Matriz estándar OACI Doc 9859 (Manual de Gestión de la Seguridad
// Operacional) — semilla por defecto, editable por organización. Ver
// Circular MAUT-5.0-22-017 ("el explotador UAS ha de personalizar estos
// criterios como mejor se ajusten a su organización") y
// docs/plan-mejora-sms-bitafly.md, Fase 2.

export const DEFAULT_PROBABILITY_LEVELS = [
    { code: '5', order_index: 5, label: 'Frecuente',                description: 'Es probable que ocurra muchas veces (ha ocurrido con frecuencia)' },
    { code: '4', order_index: 4, label: 'Ocasional',                description: 'Es probable que ocurra pocas veces (ha ocurrido en pocas ocasiones)' },
    { code: '3', order_index: 3, label: 'Remoto',                   description: 'Improbable, pero posible que ocurra (ha ocurrido raras veces)' },
    { code: '2', order_index: 2, label: 'Improbable',               description: 'Muy improbable que ocurra (no se conoce que haya ocurrido)' },
    { code: '1', order_index: 1, label: 'Extremadamente improbable', description: 'Casi inconcebible que el evento llegue a ocurrir' },
];

export const DEFAULT_SEVERITY_LEVELS = [
    { code: 'A', order_index: 5, label: 'Catastrófico',   description: 'Destrucción del equipo / múltiples muertes' },
    { code: 'B', order_index: 4, label: 'Peligroso',      description: 'Reducción importante de los márgenes de seguridad, lesiones graves, daños importantes al equipo' },
    { code: 'C', order_index: 3, label: 'Mayor',          description: 'Reducción significativa de los márgenes de seguridad, lesiones graves' },
    { code: 'D', order_index: 2, label: 'Menor',          description: 'Molestias, limitaciones operacionales, uso de procedimientos de emergencia' },
    { code: 'E', order_index: 1, label: 'Insignificante', description: 'Pocas consecuencias' },
];

// Zonas de la Ilustración 5 (Matriz de tolerabilidad) de MAUT-5.0-22-017 —
// mismo layout de colores rojo/amarillo/verde de la imagen de referencia.
const TOLERABILITY_ROWS = {
    5: { A: 'inaceptable', B: 'inaceptable', C: 'inaceptable', D: 'tolerable',  E: 'tolerable' },
    4: { A: 'inaceptable', B: 'inaceptable', C: 'tolerable',   D: 'tolerable',  E: 'tolerable' },
    3: { A: 'inaceptable', B: 'tolerable',   C: 'tolerable',   D: 'tolerable',  E: 'aceptable' },
    2: { A: 'tolerable',   B: 'tolerable',   C: 'tolerable',   D: 'tolerable',  E: 'aceptable' },
    1: { A: 'aceptable',   B: 'aceptable',   C: 'aceptable',   D: 'aceptable',  E: 'aceptable' },
};

export function buildDefaultTolerability() {
    const rows = [];
    for (const probCode of ['5', '4', '3', '2', '1']) {
        for (const sevCode of ['A', 'B', 'C', 'D', 'E']) {
            rows.push({
                probability_code: probCode,
                severity_code: sevCode,
                zone: TOLERABILITY_ROWS[probCode][sevCode],
            });
        }
    }
    return rows;
}

export const ZONE_META = {
    inaceptable: { label: 'Inaceptable', color: '#dc2626', bg: '#fee2e2' },
    tolerable:   { label: 'Tolerable',   color: '#d97706', bg: '#fef3c7' },
    aceptable:   { label: 'Aceptable',   color: '#16a34a', bg: '#dcfce7' },
};

// Índice de riesgo (ej. "5A") a partir de los códigos de probabilidad/gravedad.
export function riskIndex(probabilityCode, severityCode) {
    if (!probabilityCode || !severityCode) return null;
    return `${probabilityCode}${severityCode}`;
}

// Resuelve la zona de tolerabilidad de una celda contra la matriz configurada
// (array de filas de safety_risk_tolerability) — null si la organización aún
// no configuró esa celda.
export function resolveZone(tolerability, probabilityCode, severityCode) {
    if (!probabilityCode || !severityCode) return null;
    const row = (tolerability || []).find(t => t.probability_code === probabilityCode && t.severity_code === severityCode);
    return row?.zone || null;
}
