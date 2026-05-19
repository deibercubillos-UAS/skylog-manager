/**
 * kmlGenerator.js — KML / KMZ generation for AeroCivil submissions
 * Pure utility: no React, no side-effects.
 * Generates WGS-84 KML compatible with Google Earth and AeroCivil portal.
 */

// ─── Circle → polygon approximation ────────────────────────────────────────
function circleToPolygon(center, radiusM, numPts = 64) {
  const R_LAT = 111320; // metres per degree latitude
  const pts   = [];
  for (let i = 0; i <= numPts; i++) {
    const angle = (i / numPts) * 2 * Math.PI;
    const lat   = center.lat + (radiusM / R_LAT) * Math.cos(angle);
    const lng   = center.lng + (radiusM / (R_LAT * Math.cos((center.lat * Math.PI) / 180))) * Math.sin(angle);
    pts.push({ lat, lng });
  }
  return pts;
}

// ─── Coordinates string for KML ─────────────────────────────────────────────
function coordString(points, altM = 0) {
  return points.map(p => `${p.lng},${p.lat},${altM}`).join('\n              ');
}

// ─── Main KML generator ─────────────────────────────────────────────────────
/**
 * @param {'polygon'|'linear'|'circle'} geoType
 * @param {Array<{lat:number,lng:number}>} points
 * @param {number} radiusM  — only used when geoType === 'circle'
 * @param {string} name     — placemark name
 * @param {number} altM     — altitude in metres AGL
 * @param {string} desc     — optional description embedded in the KML document
 * @returns {string} KML document as string
 */
export function generateKML(geoType, points, radiusM = 500, name = 'Operación UAS', altM = 120, desc = '') {
  if (!points || points.length === 0) return null;

  let placemark = '';

  if (geoType === 'polygon' && points.length >= 3) {
    const closed = [...points, points[0]]; // close the ring
    placemark = `
    <Placemark>
      <name>${name}</name>
      <Style>
        <LineStyle><color>ff1457ec</color><width>2</width></LineStyle>
        <PolyStyle><color>401457ec</color></PolyStyle>
      </Style>
      <Polygon>
        <extrude>1</extrude>
        <altitudeMode>relativeToGround</altitudeMode>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              ${coordString(closed, altM)}
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>`;

  } else if (geoType === 'linear' && points.length >= 2) {
    placemark = `
    <Placemark>
      <name>${name}</name>
      <Style>
        <LineStyle><color>ff1457ec</color><width>3</width></LineStyle>
      </Style>
      <LineString>
        <extrude>1</extrude>
        <tessellate>1</tessellate>
        <altitudeMode>relativeToGround</altitudeMode>
        <coordinates>
          ${coordString(points, altM)}
        </coordinates>
      </LineString>
    </Placemark>`;

  } else if (geoType === 'circle' && points.length === 1) {
    const polyPts = circleToPolygon(points[0], radiusM);
    placemark = `
    <Placemark>
      <name>${name} (r=${radiusM}m)</name>
      <Style>
        <LineStyle><color>ff1457ec</color><width>2</width></LineStyle>
        <PolyStyle><color>401457ec</color></PolyStyle>
      </Style>
      <Polygon>
        <extrude>1</extrude>
        <altitudeMode>relativeToGround</altitudeMode>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>
              ${coordString(polyPts, altM)}
            </coordinates>
          </LinearRing>
        </outerBoundaryIs>
      </Polygon>
    </Placemark>`;
  } else {
    return null;
  }

  const description = desc
    ? `${desc}\n\nGenerado por Bitafly · Sistema de Gestión RAC 100`
    : 'Operación UAS — Generado por Bitafly · Sistema de Gestión RAC 100';

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"
     xmlns:gx="http://www.google.com/kml/ext/2.2">
  <Document>
    <name>${name}</name>
    <description>${description}</description>
    ${placemark}
  </Document>
</kml>`;
}

// ─── Browser download trigger ────────────────────────────────────────────────
export function downloadKML(kmlString, filename = 'operacion-uas.kml') {
  if (typeof window === 'undefined' || !kmlString) return;
  const blob = new Blob([kmlString], { type: 'application/vnd.google-earth.kml+xml' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── KMZ download (KML inside a ZIP container) ───────────────────────────────
/**
 * Generates a .kmz file (ZIP with doc.kml inside) for AeroCivil submissions.
 * Uses fflate (already bundled via jsPDF) — no extra network request.
 */
export async function downloadKMZ(kmlString, filename = 'operacion-uas.kmz') {
  if (typeof window === 'undefined' || !kmlString) return;
  const { zipSync, strToU8 } = await import('fflate');
  const zipped = zipSync({ 'doc.kml': strToU8(kmlString) }, { level: 6 });
  const blob = new Blob([zipped], { type: 'application/vnd.google-earth.kmz' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Geometry helpers ────────────────────────────────────────────────────────
const R_EARTH = 6371000; // metres

function toRad(deg) { return (deg * Math.PI) / 180; }

/** Haversine distance between two {lat,lng} points in metres */
export function haversine(a, b) {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.sqrt(h));
}

/** Perimeter of a polygon (metres) */
export function polygonPerimeter(points) {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < points.length; i++) {
    total += haversine(points[i], points[(i + 1) % points.length]);
  }
  return total;
}

/** Approximate area of a polygon (m²) using shoelace + correction */
export function polygonAreaM2(points) {
  if (points.length < 3) return 0;
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += toRad(points[j].lng - points[i].lng) *
            (2 + Math.sin(toRad(points[i].lat)) + Math.sin(toRad(points[j].lat)));
  }
  return Math.abs(area * R_EARTH * R_EARTH / 2);
}

/** Total length of a polyline (metres) */
export function polylineLength(points) {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += haversine(points[i], points[i + 1]);
  }
  return total;
}

/** Format metres as readable string: "1.23 km" or "456 m" */
export function fmtMetres(m) {
  return m >= 1000 ? `${(m / 1000).toFixed(2)} km` : `${Math.round(m)} m`;
}

/** Format m² as "1.23 ha" or "456 m²" */
export function fmtArea(m2) {
  return m2 >= 10000 ? `${(m2 / 10000).toFixed(2)} ha` : `${Math.round(m2)} m²`;
}
