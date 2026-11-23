// Evaluación de SALIDA DE ZONA de un vuelo (Operación/Bitácora/SMS). Dada la traza GPS real de un
// vuelo y la geometría de la zona de operación, decide si el dron se salió de la zona y DÓNDE/CUÁNTO.
// Lógica pura y probada: la usa el servidor al cargar un vuelo (nunca el cliente) para, si hubo
// salida, pedir el reporte de motivos al piloto y avisar al Gerente SMS (ver 40-sms.md, regla S).
//
// Robustez ante ruido de GPS (decisión del usuario, 2026-11-22): una salida solo cuenta si el dron
// queda fuera del perímetro por más de un MARGEN horizontal y de forma SOSTENIDA en el tiempo;
// ambos son configurables por la organización (dato interno configurable, regla C). Así un salto
// puntual de la señal no dispara un reporte.
//
// La zona es 2D (lat/lng): esta evaluación es solo HORIZONTAL. El techo de altura queda fuera de
// alcance por ahora (la geometría de zona no lo guarda).

import { haversineM } from './flightTelemetry.js';

export const ZONE_GEO_TYPES = ['polygon', 'linear', 'circle'];
export const DEFAULT_EXCURSION_MARGIN_M = 15; // error típico de GPS de consumo
export const DEFAULT_EXCURSION_MIN_DURATION_S = 3;

const round = (x, n = 1) => (x == null ? null : Math.round(x * 10 ** n) / 10 ** n);

/**
 * Valida y normaliza la geometría de zona `{ geoType, points:[{lat,lng}], radius }`.
 * Mismo vocabulario que missions.zone_geo / flightPlanDocs.js (GEO_TYPES). Devuelve null si no sirve.
 */
export function validateZoneGeo(geo) {
  if (!geo || typeof geo !== 'object') return null;
  const { geoType } = geo;
  if (!ZONE_GEO_TYPES.includes(geoType)) return null;
  const points = (Array.isArray(geo.points) ? geo.points : [])
    .filter((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng))
    .map((p) => ({ lat: p.lat, lng: p.lng }));
  const radius = Number.isFinite(geo.radius) && geo.radius > 0 ? geo.radius : null;
  if (geoType === 'polygon' && points.length < 3) return null;
  if (geoType === 'circle' && (points.length !== 1 || radius == null)) return null;
  if (geoType === 'linear' && (points.length < 2 || radius == null)) return null; // un pasillo sin ancho no se puede evaluar
  return { geoType, points, radius };
}

// Proyección local equirectangular (metros) alrededor de un punto de referencia. Exacta para áreas
// operativas (escala de km) y más simple que haversine arista por arista.
function projector(refLat, refLng) {
  const mPerDegLat = 111320;
  const mPerDegLng = 111320 * Math.cos((refLat * Math.PI) / 180);
  return (p) => ({ x: (p.lng - refLng) * mPerDegLng, y: (p.lat - refLat) * mPerDegLat });
}

function pointInPolygon(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const intersect =
      poly[i].y > pt.y !== poly[j].y > pt.y &&
      pt.x < ((poly[j].x - poly[i].x) * (pt.y - poly[i].y)) / (poly[j].y - poly[i].y) + poly[i].x;
    if (intersect) inside = !inside;
  }
  return inside;
}

function distToSegment(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/**
 * Distancia (m) del punto AL BORDE de la zona, con signo: negativa = dentro, positiva = fuera.
 * @param {{lat:number,lng:number}} point
 * @param {object} zone  geometría ya validada (validateZoneGeo)
 */
export function outsideByMeters(point, zone) {
  if (zone.geoType === 'circle') {
    const c = zone.points[0];
    return haversineM(c.lat, c.lng, point.lat, point.lng) - zone.radius;
  }
  const ref = zone.points[0];
  const proj = projector(ref.lat, ref.lng);
  const poly = zone.points.map(proj);
  const pt = proj(point);
  if (zone.geoType === 'polygon') {
    let min = Infinity;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) min = Math.min(min, distToSegment(pt, poly[j], poly[i]));
    return pointInPolygon(pt, poly) ? -min : min;
  }
  // linear: pasillo de media-anchura `radius` alrededor de la polilínea
  let min = Infinity;
  for (let i = 1; i < poly.length; i++) min = Math.min(min, distToSegment(pt, poly[i - 1], poly[i]));
  return min - zone.radius;
}

/**
 * Evalúa si la traza GPS de un vuelo salió de la zona de operación.
 * @param {Array<{t?:number, lat:number, lng:number}>} points traza (p.ej. salida de normalizeReplay().points)
 * @param {object} zoneRaw geometría de zona sin validar
 * @param {{marginM?:number, minDurationS?:number}} [opts]
 * @returns {{applicable:boolean, outside:boolean, reason?:string, maxExceedM?:number,
 *   segments?:Array, geoType?:string, pointsOutside?:number, params?:object}}
 */
export function evaluateZoneExcursion(points, zoneRaw, opts = {}) {
  const zone = validateZoneGeo(zoneRaw);
  const marginM = Number.isFinite(opts.marginM) && opts.marginM >= 0 ? opts.marginM : DEFAULT_EXCURSION_MARGIN_M;
  const minDurationS = Number.isFinite(opts.minDurationS) && opts.minDurationS >= 0 ? opts.minDurationS : DEFAULT_EXCURSION_MIN_DURATION_S;
  const track = (Array.isArray(points) ? points : []).filter((p) => p && Number.isFinite(p.lat) && Number.isFinite(p.lng));

  if (!zone) return { applicable: false, outside: false, reason: 'zona inválida o incompleta' };
  if (track.length < 2) return { applicable: false, outside: false, reason: 'sin traza GPS suficiente' };

  // Agrupa puntos consecutivos cuya distancia fuera del perímetro supera el margen, en segmentos.
  const segments = [];
  let cur = null;
  for (const p of track) {
    const outBy = outsideByMeters(p, zone);
    const t = Number.isFinite(p.t) ? p.t : null;
    if (outBy > marginM) {
      if (!cur) cur = { startT: t, endT: t, points: 1, maxExceedM: outBy, peak: { lat: p.lat, lng: p.lng, exceedM: outBy } };
      else {
        cur.endT = t;
        cur.points += 1;
        if (outBy > cur.maxExceedM) {
          cur.maxExceedM = outBy;
          cur.peak = { lat: p.lat, lng: p.lng, exceedM: outBy };
        }
      }
    } else if (cur) {
      segments.push(cur);
      cur = null;
    }
  }
  if (cur) segments.push(cur);

  // Solo cuentan las salidas SOSTENIDAS: duración ≥ minDurationS (si hay tiempos) o más de un punto (si no).
  const kept = segments
    .filter((s) => {
      const dur = s.startT != null && s.endT != null ? s.endT - s.startT : null;
      return dur == null ? s.points > 1 : dur >= minDurationS;
    })
    .map((s) => ({
      startT: round(s.startT),
      endT: round(s.endT),
      durationS: s.startT != null && s.endT != null ? round(s.endT - s.startT) : null,
      points: s.points,
      maxExceedM: Math.round(s.maxExceedM),
      peak: { lat: round(s.peak.lat, 6), lng: round(s.peak.lng, 6), exceedM: Math.round(s.peak.exceedM) },
    }));

  return {
    applicable: true,
    outside: kept.length > 0,
    geoType: zone.geoType,
    maxExceedM: kept.reduce((mx, s) => Math.max(mx, s.maxExceedM), 0),
    segments: kept,
    pointsOutside: track.filter((p) => outsideByMeters(p, zone) > marginM).length,
    params: { marginM, minDurationS },
  };
}
