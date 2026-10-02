// Skylog V2.0 — Programación. Parseo de un archivo .kmz/.kml subido por el
// usuario a la misma forma que ya usa MapPickerModal/flightPlanDocs.js
// (GEO_TYPES: polygon/linear/circle + points {lat,lng} + radius). Client-side
// puro (DOMParser del navegador) — nunca sube el archivo al servidor sin
// procesar.
//
// No existe ningún parser de KMZ en el proyecto todavía (v1 solo EXPORTA
// KMZ) — este es nuevo. Un KML exportado como "circunferencia" en realidad
// se guarda como un polígono aproximado (ver kmlGenerator.js#circleToPolygon)
// — no hay forma honesta de reconstruir "esto era un círculo" desde un KML
// genérico, así que un polígono importado siempre vuelve como 'polygon',
// nunca se adivina 'circle'. Solo un <Point> real se interpreta como centro
// de una zona circular (con un radio por defecto que el usuario debe ajustar
// — el KML no lleva esa información).

import JSZip from 'jszip';
import { kml as kmlToGeoJson } from '@tmcw/togeojson';

const DEFAULT_POINT_RADIUS_M = 500;

function sameCoord(a, b) {
  return a[0] === b[0] && a[1] === b[1];
}

function ringToPoints(ring) {
  const closed = ring.length > 1 && sameCoord(ring[0], ring[ring.length - 1]);
  return (closed ? ring.slice(0, -1) : ring).map(([lng, lat]) => ({ lat, lng }));
}

async function extractKmlText(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.kml')) return file.text();
  if (name.endsWith('.kmz')) {
    const zip = await JSZip.loadAsync(file);
    const entry = Object.values(zip.files).find((f) => f.name.toLowerCase().endsWith('.kml'));
    if (!entry) throw new Error('El archivo .kmz no contiene ningún .kml adentro.');
    return entry.async('text');
  }
  throw new Error('Formato no soportado — sube un archivo .kmz o .kml.');
}

/** @returns {Promise<{geoType: 'polygon'|'linear'|'circle', points: {lat:number,lng:number}[], radius: number|null}>} */
export async function parseKmzOrKml(file) {
  const kmlText = await extractKmlText(file);
  const dom = new DOMParser().parseFromString(kmlText, 'text/xml');
  if (dom.querySelector('parsererror')) throw new Error('El archivo no es un XML/KML válido.');

  const geojson = kmlToGeoJson(dom);
  const feature = (geojson.features || []).find((f) => f.geometry);
  if (!feature) throw new Error('No se encontró ninguna geometría (polígono, línea o punto) en el archivo.');

  const { type, coordinates } = feature.geometry;

  if (type === 'Polygon') {
    const points = ringToPoints(coordinates[0] || []);
    if (points.length < 3) throw new Error('El polígono del archivo no tiene suficientes vértices.');
    return { geoType: 'polygon', points, radius: null };
  }
  if (type === 'MultiPolygon') {
    const points = ringToPoints(coordinates[0]?.[0] || []);
    if (points.length < 3) throw new Error('El polígono del archivo no tiene suficientes vértices.');
    return { geoType: 'polygon', points, radius: null };
  }
  if (type === 'LineString') {
    const points = coordinates.map(([lng, lat]) => ({ lat, lng }));
    if (points.length < 2) throw new Error('La línea del archivo no tiene suficientes puntos.');
    return { geoType: 'linear', points, radius: null };
  }
  if (type === 'Point') {
    const [lng, lat] = coordinates;
    return { geoType: 'circle', points: [{ lat, lng }], radius: DEFAULT_POINT_RADIUS_M };
  }

  throw new Error(`Tipo de geometría "${type}" no soportado todavía.`);
}
