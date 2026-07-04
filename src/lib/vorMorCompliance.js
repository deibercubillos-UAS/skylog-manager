// Cumplimiento de plazo de radicación de reportes VOR/MOR (Fase 6 del plan
// de mejora SMS, ver docs/plan-mejora-sms-bitafly.md). Directiva 02-24: el
// Gerente de SMS debe radicar el MOR en IRIS dentro de 5 días hábiles desde
// la ocurrencia — VOR es voluntario y no tiene plazo regulatorio, pero usa
// el mismo mecanismo como plazo interno sugerido (decisión confirmada con
// el usuario). "Días hábiles" se aproxima excluyendo solo sábados/domingos
// (sin calendario de festivos colombianos) — aproximación deliberada y
// documentada, mismo espíritu que otras fechas "estimadas" del proyecto.

export const MOR_DEADLINE_BUSINESS_DAYS = 5;
export const VOR_DEADLINE_BUSINESS_DAYS = 5; // plazo interno sugerido, no regulatorio

export function addBusinessDays(dateStr, days) {
    const d = new Date(`${dateStr}T00:00:00`);
    let added = 0;
    while (added < days) {
        d.setDate(d.getDate() + 1);
        const dow = d.getDay();
        if (dow !== 0 && dow !== 6) added++;
    }
    return d;
}

// Estado de cumplimiento de un caso VOR/MOR frente a su plazo de radicación.
export function computeCaseCompliance(caseRow, today = new Date()) {
    const occurrenceDate = caseRow.occurrence_date || caseRow.created_at?.split('T')[0];
    if (!occurrenceDate) return null;

    const businessDays = caseRow.type === 'MOR' ? MOR_DEADLINE_BUSINESS_DAYS : VOR_DEADLINE_BUSINESS_DAYS;
    const deadline = addBusinessDays(occurrenceDate, businessDays);
    const deadlineISO = deadline.toISOString().split('T')[0];
    const daysLeft = Math.ceil((deadline - today) / 86400000);

    let status;
    if (caseRow.aerocivil_notified_at) status = 'enviado';
    else if (daysLeft < 0) status = 'vencido';
    else status = 'pendiente';

    return {
        status,               // 'enviado' | 'pendiente' | 'vencido'
        deadline: deadlineISO,
        daysLeft,
        regulatory: caseRow.type === 'MOR',
    };
}
