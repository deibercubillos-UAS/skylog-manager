// authorizationReadiness — ítems del checklist de preparación de una solicitud de autorización
// (RAC 100 §100.805) distintos de la póliza RCE: CDO-U vigente, antelación y aeronaves registradas.
// Lógica pura, fechas 'YYYY-MM-DD' con `today` inyectado. Todo es INFORMATIVO: avisa lo que falta,
// no bloquea firmar ni radicar (misma decisión que la póliza).
import { businessDaysUntil } from './colombianCalendar.js';

export const LEAD_TIME_CONTROLLED = 15; // días hábiles — espacio aéreo controlado (§100.805)
export const LEAD_TIME_BVLOS_CORRIDOR = 10; // días hábiles — corredores BVLOS

/**
 * CDO-U (certificado de explotador) vigente durante TODO el periodo [startDate, endDate].
 * status: ok · sin_cdo · sin_vigencia (no hay fecha de vencimiento registrada) · vencido · no_cubre_periodo
 */
export function evaluateCdoForAuthorization(cert, { startDate, endDate }, today) {
  if (!cert || !cert.cdo_number) return { status: 'sin_cdo' };
  if (!cert.expires_at) return { status: 'sin_vigencia', cdoNumber: cert.cdo_number };
  if (cert.expires_at < today) return { status: 'vencido', cdoNumber: cert.cdo_number, expiresAt: cert.expires_at };
  if (cert.expires_at < endDate) return { status: 'no_cubre_periodo', cdoNumber: cert.cdo_number, expiresAt: cert.expires_at };
  return { status: 'ok', cdoNumber: cert.cdo_number, expiresAt: cert.expires_at };
}

/**
 * Antelación entre hoy y el inicio de la operación, en días hábiles colombianos.
 * ok (≥15) · solo_corredor_bvlos (10–14: alcanza solo para corredores BVLOS) · insuficiente (<10) · pasada (ya inició).
 * No se sabe si la zona es espacio aéreo controlado, por eso se informan ambos umbrales.
 */
export function evaluateLeadTime({ scopeStart }, today) {
  if (scopeStart <= today) return { status: 'pasada', businessDays: 0 };
  const businessDays = businessDaysUntil(today, scopeStart);
  let status = 'insuficiente';
  if (businessDays >= LEAD_TIME_CONTROLLED) status = 'ok';
  else if (businessDays >= LEAD_TIME_BVLOS_CORRIDOR) status = 'solo_corredor_bvlos';
  return { status, businessDays };
}

/** Aeronaves sin número de registro (RUAS): la solicitud identifica cada aeronave. */
export function evaluateAircraftRegistration(aircraft) {
  const list = aircraft || [];
  const missing = list.filter((a) => !(a.ruas_number || '').trim()).map((a) => a.id);
  return { total: list.length, missing, status: list.length === 0 ? 'no_aircraft' : missing.length === 0 ? 'ok' : 'incompleta' };
}
