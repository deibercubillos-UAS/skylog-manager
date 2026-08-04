// Videos tutoriales de YouTube mostrados en /tutoriales.
//
// Fuente única de la línea editorial: docs/plan-videos-youtube-bitafly.md — un video
// SOLO aparece en la página si existe una sección `### Guion — N.N ·` para ese número
// en ese documento. Si el guion se edita/elimina/renumera ahí, la entrada desaparece
// de la página automáticamente sin tocar este archivo (se revalida contra el .md en
// cada carga server-side, ver getScriptedIds()).
//
// Cuando un guion nuevo queda listo en el .md, agregar aquí su entrada (id igual al
// número del guion, ej. '1.2'). Mientras `youtubeId` sea null se muestra como
// "Próximamente"; al publicarse en YouTube, completar youtubeId/duration/publishedAt
// (duration en formato ISO 8601, ej. "PT2M43S" = 2 min 43 s).

import fs from 'fs';
import path from 'path';

const PLAN_PATH = path.join(process.cwd(), 'docs', 'plan-videos-youtube-bitafly.md');

function getScriptedIds() {
  try {
    const md = fs.readFileSync(PLAN_PATH, 'utf8');
    const ids = new Set();
    for (const m of md.matchAll(/^### Guion — (\d+\.\d+)/gm)) ids.add(m[1]);
    return ids;
  } catch {
    return new Set();
  }
}

const VIDEOS = [
  {
    id: '0.1',
    bloque: 0,
    title: '¿Qué es BitaFly? La plataforma para gestionar tu operación de drones en Colombia',
    description: '¿Todavía llevas tu bitácora de vuelo en papel o en un Excel que se puede dañar en cualquier momento? En menos de 5 minutos te mostramos qué es BitaFly: la plataforma de gestión de operaciones con drones hecha para la normativa colombiana (RAC 100, AeroCivil, UAEAC).',
    youtubeId: 'YAYyYUf_kdg',
    duration: 'PT2M43S',
    publishedAt: '2026-07-20',
  },
  {
    id: '0.2',
    bloque: 0,
    title: '¿BitaFly es para ti? Piloto Independiente vs Empresa | RAC 100',
    description: 'Hay dos formas de volar dentro de BitaFly: por tu cuenta, con el control total en tus manos, o como parte de un equipo que cumple el RAC 100 de punta a punta. Te mostramos exactamente qué te da cada plan.',
    youtubeId: 'pQsRugm4H9Y',
    duration: 'PT2M4S',
    publishedAt: '2026-07-25',
  },
  {
    id: '0.3',
    bloque: 0,
    title: 'Crea tu cuenta en BitaFly en lo que dura un café',
    description: '¿Sabes cuánto se demora preparar un café? Vas a tardar lo mismo en abrir tu cuenta en BitaFly. Registro real, paso a paso — vueles por tu cuenta o estés armando tu operación como empresa.',
    youtubeId: 'Zi9eLHTyZJ0',
    duration: 'PT1M39S',
    publishedAt: '2026-07-27',
  },
  {
    id: '0.5',
    bloque: 0,
    title: 'Recorrido del panel de BitaFly',
    description: 'Ya tienes tu cuenta lista — ¿y ahora qué? Te mostramos el panel completo: menú lateral, buscador, notificaciones y tu perfil, para que nunca te sientas perdido.',
    youtubeId: 'BCDV18PBVUY',
    duration: 'PT1M42S',
    publishedAt: '2026-08-01',
  },
  {
    id: '0.6',
    bloque: 0,
    title: 'Planes y precios de BitaFly: ¿cuál elegir para tu operación? (RAC 100)',
    description: '¿Cuál plan de BitaFly te conviene según el tamaño de tu operación con drones? Te mostramos qué incluye cada uno de los 4 planes y cuánto cuesta, para que elijas sin perder tiempo comparando tabla por tabla.',
    youtubeId: 'BhbOdvT1etc',
    duration: 'PT2M20S',
    publishedAt: '2026-08-03',
  },
];

const BLOQUE_META = [
  { num: 0, title: 'Introducción y fundamentos', icon: 'flag' },
  { num: 1, title: 'Por perfil y rol',            icon: 'group' },
  { num: 2, title: 'Por módulo funcional',        icon: 'dashboard' },
  { num: 3, title: 'Casos de uso con drones reales', icon: 'flight' },
];

// Bloques con al menos un video que tenga guion vigente en el .md — un bloque sin
// ningún guion listo todavía simplemente no se renderiza en la página.
export function getTutorialBloques() {
  const scriptedIds = getScriptedIds();
  const visible = VIDEOS.filter((v) => scriptedIds.has(v.id));
  return BLOQUE_META
    .map((b) => ({ ...b, videos: visible.filter((v) => v.bloque === b.num) }))
    .filter((b) => b.videos.length > 0);
}

export function getPublishedTutorialVideos() {
  return getTutorialBloques().flatMap((b) => b.videos.filter((v) => v.youtubeId));
}
