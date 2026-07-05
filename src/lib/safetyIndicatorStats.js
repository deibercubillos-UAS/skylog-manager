// Cálculo de tasas, líneas de alerta y meta sugerida para Indicadores SPI
// (Circular MAUT-1.0-22-005 + Excel MAUT-1.0-12-002). Fórmulas verificadas
// contra el Excel oficial de referencia — ver docs/plan-mejora-sms-bitafly.md,
// Fase 3. Nada se guarda como columna derivada: todo se calcula en el
// cliente a partir de los datos mensuales reales (mismo patrón que
// lib/safetyRiskDefaults.js / lib/trainingCompliance.js).

export const DENOMINATOR_UNITS = [
    { value: 'ciclos_vuelo', label: 'Ciclos de vuelo', hint: 'Aviación comercial regular (pasajeros y carga)' },
    { value: 'horas_vuelo',  label: 'Horas de vuelo',  hint: 'Aviación comercial no regular / trabajos aéreos especiales / centros de instrucción — lo habitual para un explotador UAS' },
    { value: 'horas_hombre', label: 'Horas-hombre',    hint: 'Mantenimiento' },
    { value: 'operaciones',  label: 'Número de operaciones', hint: 'Aeródromos / ATS' },
];

export const MONTH_LABELS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function periodsOfYear(year) {
    return MONTH_LABELS.map((_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);
}

// Tasa de eventos por 1000, según la fórmula fija de la circular (todo
// indicador de todo tipo de proveedor se calcula sobre 1000).
export function computeRate(eventCount, denominatorValue) {
    if (!denominatorValue) return 0;
    return (eventCount / denominatorValue) * 1000;
}

// Promedio y desviación estándar POBLACIONAL (N, no N-1) de las tasas de un
// año — verificado contra el Excel oficial (MAUT-1.0-12-002). Solo se
// calcula si están los 12 meses del año, para no fabricar precisión sobre
// datos incompletos.
export function computeYearStats(monthlyRows, year) {
    const periods = periodsOfYear(year);
    const rates = periods.map(p => {
        const row = monthlyRows.find(m => m.period === p);
        if (!row) return null;
        return computeRate(row.event_count, row.denominator_value);
    });
    if (rates.some(r => r === null)) return null;

    const n = rates.length;
    const avg = rates.reduce((a, b) => a + b, 0) / n;
    const variance = rates.reduce((a, b) => a + (b - avg) ** 2, 0) / n;
    const stdDev = Math.sqrt(variance);
    return {
        rates, avg, stdDev,
        alert1: avg + stdDev,
        alert2: avg + 2 * stdDev,
        alert3: avg + 3 * stdDev,
    };
}

// Meta sugerida = promedio del año anterior * (1 - mejora esperada %)
export function suggestedTarget(avgPrevYear, improvementPct) {
    if (avgPrevYear === null || avgPrevYear === undefined) return null;
    return avgPrevYear * (1 - (improvementPct || 0));
}

export const DEFENSE_TYPE_LABELS = { T: 'Tecnología', R: 'Reglamentación interna', E: 'Entrenamiento' };
export const ACTION_STATUS_LABELS = { pendiente: 'Pendiente', en_progreso: 'En progreso', completado: 'Completado' };

// Set de indicadores de ejemplo — solo definiciones (nombre/denominador/
// descripción), SIN datos mensuales inventados: guían al usuario sobre qué
// suele medir un explotador UAS, y quedan listos para que capture datos
// reales mes a mes. Editables/eliminables después de cargarlos.
export const EXAMPLE_INDICATORS = [
    {
        name: 'Activaciones de Retorno a Casa (RTH) por batería crítica',
        denominator_unit: 'horas_vuelo',
        expected_improvement_pct: 0.1,
        description: 'Mide cuántas veces el sistema tuvo que forzar el regreso automático por nivel crítico de batería — indicador de planeación de autonomía.',
    },
    {
        name: 'Pérdida de enlace de control (fly-away / lost link)',
        denominator_unit: 'horas_vuelo',
        expected_improvement_pct: 0.1,
        description: 'Eventos de pérdida de enlace RC/telemetría durante el vuelo, con o sin recuperación — indicador crítico de integridad del enlace C2.',
    },
    {
        name: 'Aterrizajes de emergencia por falla técnica',
        denominator_unit: 'horas_vuelo',
        expected_improvement_pct: 0.1,
        description: 'Aterrizajes no planeados originados por falla de motor, ESC, hélice u otro componente — indicador de confiabilidad de la flota.',
    },
    {
        name: 'Vuelos con degradación de señal GNSS/GPS',
        denominator_unit: 'horas_vuelo',
        expected_improvement_pct: 0.1,
        description: 'Casos de pérdida o degradación de posicionamiento satelital en vuelo — relevante para operaciones BVLOS y zonas urbanas.',
    },
    {
        name: 'Incursiones en espacio aéreo restringido o prohibido',
        denominator_unit: 'horas_vuelo',
        expected_improvement_pct: 0.1,
        description: 'Vuelos que entraron, aun sin autorización, a una zona restringida/prohibida (CTR, TMA, zona militar, etc.).',
    },
    {
        name: 'Reportes VOR/MOR presentados',
        denominator_unit: 'horas_vuelo',
        expected_improvement_pct: 0.1,
        description: 'Volumen de reportes voluntarios/obligatorios de eventos de seguridad — una tasa creciente puede reflejar mejor cultura de reporte, no necesariamente más riesgo.',
    },
];
