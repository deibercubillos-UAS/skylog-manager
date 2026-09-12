'use client';

// Vista previa de F1 — landing pública, réplica más clara de la landing real
// de BitaFly (src/app/page.js), redisañada con @skylog/ui + GSAP (skill
// ui-ux-pro-max: patrón "Hero + Features + CTA", motion "Scroll Reveal" +
// "Stagger List", estilo con profundidad tipo glass sutil). NUNCA dice
// "Skylog V2.0" — de cara al público el producto siempre es BitaFly
// (01-reglas.md §7). Vive FUERA del route group (v2) a propósito: esa
// carpeta lleva el nav de espacios de trabajo (post-login), que no debe
// aparecer en una landing pre-login.
//
// Imágenes: capturas REALES del producto en producción (public/screenshots/,
// ya existían en el repo) — nunca mockups fabricados (regla V1). El hero
// (piloto operando el control, foto real de persona) y el banner del CTA
// final (dron DJI en vuelo) son fotos de stock de licencia libre (Unsplash,
// uso comercial sin atribución requerida) descargadas para esta tarea — se
// verificó visualmente el contenido de cada una antes de integrarla (un
// primer intento de descarga anterior resultó ser solo un degradado de
// cielo sin dron, detectado y corregido antes de usarlo — ver 51-bitacora.md
// decisión 65). Se reemplazan por material propio de BitaFly cuando exista.

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { Button } from '@skylog/ui';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const TRUST_STATS = [
  { value: '100%', label: 'Cumplimiento RAC 100' },
  { value: '5', label: 'Roles operacionales' },
  { value: '99.9%', label: 'Disponibilidad' },
  { value: '24/7', label: 'Acceso en la nube' },
];

// Condensado de las 21 funciones reales (src/app/page.js) a 2-3
// representativas por grupo — la landing actual muestra las 21 de golpe;
// "más clara" significa menos abrumador en el primer vistazo, no menos real.
// Cada grupo/función lleva su propio ícono (`FEATURE_ICONS`) — mismo trazo
// que los íconos de espacios de trabajo de @skylog/ui, para consistencia
// visual en todo el producto.
const FEATURE_GROUPS = [
  {
    group: 'Operación',
    icon: 'operacion',
    items: [
      { icon: 'bitacora', title: 'Bitácora Digital RAC 100', desc: 'Registra cada vuelo con todos los campos que exige la AeroCivil, sumando horas automáticamente.', href: '/bitacora-digital' },
      { icon: 'riesgo', title: 'Despacho con Evaluación de Riesgos', desc: 'Evalúa Probabilidad × Gravedad antes de cada vuelo — exige mitigar si el riesgo es inaceptable.' },
      { icon: 'replay', title: 'Replay GPS de Vuelo', desc: 'Reproduce cada operación cuadro a cuadro: ruta, altitud, velocidad y batería.', href: '/replay-gps-drones' },
      { icon: 'clima', title: 'Clima y Meteorología UAV', desc: 'Verifica viento, ráfagas y visibilidad antes de cada vuelo con un score de aptitud 0-100.', href: '/clima-drones' },
      { icon: 'radar', title: 'Evaluación SORA', desc: 'Análisis de riesgo (GRC/ARC/SAIL) obligatorio antes de autorizar cualquier misión.', href: '/sora' },
    ],
  },
  {
    group: 'Flota & Equipo',
    icon: 'flota',
    items: [
      { icon: 'flota', title: 'Gestión de Flota', desc: 'Aeronaves con horas de vuelo automáticas y estado operativo en tiempo real.', href: '/gestion-flota-drones' },
      { icon: 'mantenimiento', title: 'Mantenimiento Programado', desc: 'Alertas por horas o días, con bloqueo de despacho al vencer.', href: '/mantenimiento-drones' },
      { icon: 'bateria', title: 'Baterías LiPo', desc: 'Control de ciclos con umbral configurable — previene fallos en operación crítica.' },
      { icon: 'mapa', title: 'Plan de Vuelo', desc: 'Traza la zona de operación y exporta KMZ/PDF listos para presentar.', href: '/plan-vuelo-drones' },
    ],
  },
  {
    group: 'Documentación & Cumplimiento',
    icon: 'sms',
    items: [
      { icon: 'sms', title: 'SMS Aeronáutico', desc: 'Matriz de riesgo, indicadores SPI con alertas, GAP y acciones correctivas.', href: '/sms-aeronautico' },
      { icon: 'capacitacion', title: 'Capacitación con Examen', desc: 'Cronograma recurrente con examen calificado — bloquea el despacho si no se aprueba.', href: '/capacitacion-drones' },
      { icon: 'reportes', title: 'Reportes RAC 100', desc: 'Más de 20 formatos en PDF/Excel, listos para una auditoría.', href: '/reportes-auditoria' },
      { icon: 'roles', title: 'Expediente de Pilotos', desc: 'Licencias, certificaciones y vencimientos de toda la tripulación en un solo lugar.', href: '/gestion-pilotos' },
    ],
  },
  {
    group: 'Plataforma y Seguridad',
    icon: 'roles',
    items: [
      { icon: 'roles', title: 'Roles y Multi-usuario', desc: 'Cinco roles predefinidos con aislamiento de datos por organización.' },
      { icon: 'nube', title: '100% en la Nube', desc: 'Sin instalación. Respaldos automáticos, disponible desde cualquier navegador.' },
      { icon: 'bolt', title: 'Recursos Adicionales', desc: 'Amplía pilotos o drones sobre tu plan actual, sin cambiar de suscripción.' },
      { icon: 'apps', title: 'App Android Nativa', desc: 'Compatible con controladores DJI RC Plus para registrar vuelos desde el campo.' },
    ],
  },
];

const ICON_STROKE = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round', strokeLinejoin: 'round' };

const FEATURE_ICONS = {
  operacion: (p) => <path d="M2 16l7-2 4-7 2 .6-2.4 6.8 5.4-.4 2 2-7 2.6-3.4 4-3-1 1.4-3-3-1z" {...p} />,
  bitacora: (p) => (
    <>
      <path d="M6 4h11a1 1 0 011 1v14a1 1 0 01-1 1H8a2 2 0 01-2-2V4z" {...p} />
      <path d="M9 8h6M9 12h6M9 16h3" {...p} />
    </>
  ),
  riesgo: (p) => (
    <>
      <path d="M12 3l7 3v6c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6z" {...p} />
      <path d="M9 12l2 2 4-4" {...p} />
    </>
  ),
  replay: (p) => (
    <>
      <circle cx="12" cy="12" r="8.5" {...p} />
      <path d="M10 9l5 3-5 3z" {...p} />
    </>
  ),
  flota: (p) => (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" {...p} />
      <path d="M3 10h18M8 3v4M16 3v4" {...p} />
    </>
  ),
  mantenimiento: (p) => (
    <path d="M14.7 6.3a4 4 0 00-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 005.4-5.4l-2.6 2.6-2-2z" {...p} />
  ),
  bateria: (p) => (
    <>
      <rect x="3" y="8" width="16" height="9" rx="1.5" {...p} />
      <path d="M20 11v3" {...p} />
      <path d="M7 12h2M11 12h2" {...p} />
    </>
  ),
  sms: (p) => (
    <>
      <path d="M12 3l7 3v6c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6z" {...p} />
      <path d="M12 8v5M12 16h.01" {...p} />
    </>
  ),
  capacitacion: (p) => (
    <>
      <path d="M2 8l10-4 10 4-10 4-10-4z" {...p} />
      <path d="M6 10.5V15c0 1.4 2.7 3 6 3s6-1.6 6-3v-4.5" {...p} />
    </>
  ),
  reportes: (p) => (
    <>
      <path d="M6 4h9l3 3v13a1 1 0 01-1 1H6a1 1 0 01-1-1V5a1 1 0 011-1z" {...p} />
      <path d="M9 12h6M9 16h6M9 8h3" {...p} />
    </>
  ),
  roles: (p) => (
    <>
      <circle cx="9" cy="8" r="3" {...p} />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" {...p} />
      <circle cx="18" cy="8.5" r="2.2" {...p} />
      <path d="M15.5 14.2c2.4.5 4.5 2.5 4.5 5.8" {...p} />
    </>
  ),
  nube: (p) => <path d="M7 18a4 4 0 01-1-7.9 5 5 0 019.6-1.7A4.5 4.5 0 0117.5 18H7z" {...p} />,
  bolt: (p) => <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" {...p} />,
  apps: (p) => (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1" {...p} />
      <rect x="14" y="4" width="6" height="6" rx="1" {...p} />
      <rect x="4" y="14" width="6" height="6" rx="1" {...p} />
      <rect x="14" y="14" width="6" height="6" rx="1" {...p} />
    </>
  ),
  sparkle: (p) => (
    <>
      <path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6z" {...p} />
      <path d="M19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" {...p} />
    </>
  ),
  lock: (p) => (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" {...p} />
      <path d="M8 11V7a4 4 0 018 0v4" {...p} />
    </>
  ),
  radar: (p) => (
    <>
      <circle cx="12" cy="12" r="9" {...p} />
      <circle cx="12" cy="12" r="4.5" {...p} />
      <path d="M12 12L12 3" {...p} />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  mapa: (p) => (
    <>
      <path d="M12 21s7-7.4 7-12a7 7 0 10-14 0c0 4.6 7 12 7 12z" {...p} />
      <circle cx="12" cy="9" r="2.3" {...p} />
    </>
  ),
  clima: (p) => (
    <>
      <circle cx="7.5" cy="7" r="2.8" {...p} />
      <path d="M8 17a4 4 0 01-1-7.9 5 5 0 019.6-1.7A4.5 4.5 0 0117.5 17H8z" {...p} />
    </>
  ),
};

function FeatureIcon({ name, className }) {
  const render = FEATURE_ICONS[name];
  if (!render) return null;
  return (
    <svg viewBox="0 0 24 24" className={className}>
      {render(ICON_STROKE)}
    </svg>
  );
}

// "Por qué BitaFly" — copy real de producción (src/app/page.js). El propio
// código de producción documenta por qué NO son testimonios: antes había un
// bloque de "citas de Cliente Bitafly" con nombre/rol/ciudad inventados y 5
// estrellas — se reemplazó a propósito por razones reales de la plataforma,
// sin fingir ser una reseña de alguien que no existe (regla V1 — no fabricar
// evidencia social). Los casos de éxito reales, cuando existan, viven en
// /casos, no aquí.
const WHY_REASONS = [
  {
    icon: 'riesgo',
    title: 'Auditorías sin sorpresas',
    text: 'Los reportes PDF (F-OPS-002, F-MNT-003, F-HUM-005 y +20 formatos más) traen exactamente los campos que pide un inspector de la AeroCivil.',
  },
  {
    icon: 'bateria',
    title: 'Cero ciclos de batería perdidos',
    text: 'Alertas automáticas de mantenimiento mayor, menor y ciclos de batería — sin depender de una hoja de Excel que alguien olvidó actualizar.',
  },
  {
    icon: 'bolt',
    title: 'Configuración en minutos, no semanas',
    text: 'Sin instalación, sin servidor propio, sin curva de aprendizaje larga. Soporte en español para todo el proceso de onboarding.',
  },
];

// FAQ — condensada de las 16 preguntas reales de producción (2 por grupo,
// las de mayor peso de decisión) a 8, con el mismo texto exacto — regla V1.
const FAQ_GROUPS = [
  {
    group: 'Plataforma y planes',
    icon: 'apps',
    items: [
      {
        q: '¿Cuánto cuesta BitaFly?',
        a: 'Ofrecemos un plan Piloto para operadores individuales y planes empresariales escalonados (Escuadrilla, Flota, Enterprise) según el tamaño de la flota y el número de tripulantes. Todos los planes tienen período de prueba y no requieren tarjeta de crédito para iniciar.',
      },
      {
        q: '¿Puedo gestionar varias organizaciones con una sola cuenta?',
        a: 'Sí. Una misma cuenta puede pertenecer a varias organizaciones al mismo tiempo (por ejemplo, un piloto que trabaja para varias operadoras, o un dueño con varias empresas). Un selector en el dashboard permite cambiar de organización activa en cualquier momento, sin mezclar los datos de una y otra.',
      },
    ],
  },
  {
    group: 'Cumplimiento RAC 100',
    icon: 'riesgo',
    items: [
      {
        q: '¿BitaFly cumple con la normativa RAC 100 de la AeroCivil?',
        a: 'Sí. Cada módulo está diseñado con base en los registros exigidos por la Unidad Administrativa Especial de Aeronáutica Civil de Colombia (UAEAC). Los reportes generados (Maestro de Vuelo, Baterías y Personal, con códigos F-OPS-002, F-MNT-003 y F-HUM-005 por defecto, personalizables) cumplen con la trazabilidad exigida por la RAC 100.',
      },
      {
        q: '¿Genera los reportes para auditorías de la AeroCivil?',
        a: 'Sí. BitaFly genera en PDF y Excel más de 20 formatos: Maestro de Vuelo, Registro de Baterías, Bitácora de Piloto, Expediente de Tripulante, Indicadores de Seguridad Operacional (SPI) y el Reporte Operacional Mensual UAS exigido por AeroCivil, entre otros — cada uno con tu logo, código de formato y versión.',
      },
    ],
  },
  {
    group: 'Módulos avanzados',
    icon: 'sparkle',
    items: [
      {
        q: '¿BitaFly gestiona la capacitación y los exámenes de mis pilotos?',
        a: 'Sí. Puedes crear un cronograma de capacitación con recurrencia y un examen interno calificado (banco de preguntas, nota mínima e intentos configurables). Si un piloto no aprueba el examen o su plazo vence, el sistema bloquea su despacho hasta que quede al día.',
      },
      {
        q: '¿El sistema evalúa el riesgo de cada vuelo antes de despachar?',
        a: 'Sí. Además de la evaluación SORA por misión, el wizard de despacho incluye un paso de Evaluación de Riesgos: el piloto clasifica Probabilidad y Gravedad contra la matriz configurada por el Gerente SMS, y si el resultado es "Inaceptable" debe documentar barreras de mitigación antes de continuar.',
      },
    ],
  },
  {
    group: 'Datos y seguridad',
    icon: 'lock',
    items: [
      {
        q: '¿Puedo registrar los vuelos desde el campo?',
        a: 'Sí. BitaFly es una aplicación web responsive que funciona desde cualquier celular o tablet con conexión a internet, y además cuenta con una app Android nativa para los controladores DJI RC Plus.',
      },
      {
        q: '¿Mis datos están seguros?',
        a: 'Sí. Toda la información se almacena cifrada en infraestructura en la nube con respaldos automáticos. Implementamos Row-Level Security (RLS): cada organización solo accede a sus propios datos, sin posibilidad técnica de fuga entre organizaciones.',
      },
    ],
  },
];

// Cómo funciona — 3 pasos reales del flujo de onboarding (registro →
// configurar flota/tripulación → despachar con evidencia), sin inventar
// pasos que no existen en el producto.
const HOW_IT_WORKS = [
  {
    step: '1',
    icon: 'bolt',
    title: 'Crea tu cuenta',
    desc: 'Regístrate en minutos, sin tarjeta de crédito. Elige plan Piloto (autónomo) o crea tu organización si operas con equipo.',
  },
  {
    step: '2',
    icon: 'flota',
    title: 'Configura flota y tripulación',
    desc: 'Registra tus aeronaves, baterías y pilotos — o usa Onboarding Express para cargar todo desde un solo Excel.',
  },
  {
    step: '3',
    icon: 'bitacora',
    title: 'Despacha con evidencia',
    desc: 'Cada vuelo queda registrado con checklist, clima y evaluación de riesgos — listo para bitácora y reportes de auditoría.',
  },
];

// Footer con columnas — mismos enlaces reales del footer de producción
// (src/components/seo/SEOFooter.js), acotados a rutas que existen hoy en
// este mismo repo (verificado contra el build — regla V1, sin enlaces
// inventados).
// Nav superior — mega-menú "Funciones" + dropdown "Recursos". Todos los
// destinos son rutas REALES ya verificadas contra el build de este mismo
// repo (regla V1) — nada apunta a una página que no existe. Los módulos del
// mega-menú son el mismo listado real que usa el nav de producción
// (`PLATFORM_ITEMS` en `src/components/landing/LandingNav.js`), agrupados
// en las mismas 4 categorías que ya organiza la sección "Funciones" de esta
// página, para que el mega-menú y esa sección cuenten la misma historia.
const NAV_FUNCIONES_GROUPS = [
  {
    group: 'Operación',
    icon: 'operacion',
    items: [
      { icon: 'bitacora', href: '/bitacora-digital', label: 'Bitácora Digital', desc: 'Registro RAC 100 completo' },
      { icon: 'radar', href: '/sora', label: 'SORA', desc: 'Espacio aéreo controlado' },
      { icon: 'replay', href: '/replay-gps-drones', label: 'Replay GPS', desc: 'Reproduce el vuelo' },
      { icon: 'mapa', href: '/plan-vuelo-drones', label: 'Plan de Vuelo', desc: 'KMZ y polígonos' },
      { icon: 'clima', href: '/clima-drones', label: 'Clima UAV', desc: 'Verificación pre-vuelo' },
    ],
  },
  {
    group: 'Flota & Equipo',
    icon: 'flota',
    items: [
      { icon: 'flota', href: '/gestion-flota-drones', label: 'Gestión de Flota', desc: 'Drones y baterías' },
      { icon: 'mantenimiento', href: '/mantenimiento-drones', label: 'Mantenimiento', desc: 'Alertas y trazabilidad' },
    ],
  },
  {
    group: 'Documentación & Cumplimiento',
    icon: 'sms',
    items: [
      { icon: 'sms', href: '/sms-aeronautico', label: 'SMS Aeronáutico', desc: 'Seguridad operacional' },
      { icon: 'roles', href: '/gestion-pilotos', label: 'Pilotos', desc: 'Expediente y licencias' },
      { icon: 'capacitacion', href: '/capacitacion-drones', label: 'Capacitación', desc: 'Examen y bloqueo de despacho' },
      { icon: 'reportes', href: '/reportes-auditoria', label: 'Reportes', desc: 'PDFs RAC 100' },
    ],
  },
];

// Recursos — a pedido del usuario: tutoriales + documentación normativa de
// AeroCivil (la página RAC 100 real) + el resto del listado ya usado en
// producción, SIN Blog (queda como ítem propio del nav, no duplicado aquí).
const NAV_RECURSOS_ITEMS = [
  { icon: 'replay', href: '/tutoriales', label: 'Tutoriales', desc: 'Videos paso a paso' },
  { icon: 'riesgo', href: '/rac-100', label: 'RAC 100', desc: 'Normativa AeroCivil' },
  { icon: 'reportes', href: '/documentacion', label: 'Documentación', desc: 'Guía de uso detallada' },
  { icon: 'sparkle', href: '/casos', label: 'Casos de éxito', desc: 'Resultados reales' },
  { icon: 'apps', href: '/comparativa-bitafly-airdata', label: 'Comparativas', desc: 'BitaFly vs competidores' },
];

const FOOTER_COLUMNS = [
  {
    heading: 'Plataforma',
    links: [
      { href: '/bitacora-digital', label: 'Bitácora Digital' },
      { href: '/mantenimiento-drones', label: 'Mantenimiento' },
      { href: '/gestion-flota-drones', label: 'Gestión de Flota' },
      { href: '/sms-aeronautico', label: 'SMS Aeronáutico' },
      { href: '/replay-gps-drones', label: 'Replay GPS' },
    ],
  },
  {
    heading: 'Empresa',
    links: [
      { href: '/rac-100', label: 'Cumplimiento RAC 100' },
      { href: '/operadores-uas', label: 'Operadores UAS' },
      { href: '/precios', label: 'Precios' },
      { href: '/registro', label: 'Comenzar gratis' },
      { href: '/login', label: 'Iniciar sesión' },
      { href: 'mailto:soporte@bitafly.com', label: 'Contáctanos' },
    ],
  },
  {
    heading: 'Recursos',
    links: [
      { href: '/tutoriales', label: 'Tutoriales en Video' },
      { href: '/documentacion', label: 'Documentación' },
      { href: '/reportes-auditoria', label: 'Reportes PDF' },
      { href: '/sora', label: 'Análisis SORA' },
    ],
  },
];

// Redes reales de BitaFly — nunca inventadas (regla V1): mismas que ya usa
// src/components/bitafly/PublicFooter.js. Esta página tiene su propia copia
// independiente del footer (no reutiliza ese componente), así que necesita
// su propia copia de estos datos.
const SOCIAL_LINKS = [
  {
    href: 'https://www.linkedin.com/company/bitafly',
    label: 'LinkedIn',
    icon: (
      <path d="M6.94 5a2 2 0 11-4-.02 2 2 0 014 .02zM7 8.48H3V21h4V8.48zm6.32 0H9.34V21h3.94v-6.57c0-3.66 4.77-4 4.77 0V21H22v-7.93c0-6.17-7.06-5.94-8.68-2.91V8.48z" />
    ),
  },
  {
    href: 'https://wa.me/573213569836',
    label: 'WhatsApp',
    icon: (
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.29-1.39a9.9 9.9 0 004.75 1.21h.01c5.46 0 9.9-4.45 9.9-9.91C21.96 6.45 17.5 2 12.04 2zm5.8 14.06c-.24.68-1.39 1.3-1.92 1.38-.49.08-1.1.11-1.78-.11-.41-.13-.94-.3-1.61-.6-2.85-1.23-4.71-4.1-4.85-4.29-.14-.19-1.16-1.54-1.16-2.94s.72-2.09.98-2.37c.24-.27.53-.34.71-.34l.51.01c.16 0 .38-.06.6.46.24.57.81 1.97.88 2.11.07.14.11.31.02.5-.09.19-.14.31-.28.48-.14.16-.29.36-.42.48-.14.13-.28.28-.12.55.16.27.71 1.18 1.53 1.91 1.05.94 1.94 1.23 2.21 1.37.27.14.43.11.59-.07.16-.18.68-.79.86-1.06.18-.27.36-.22.6-.13.24.09 1.55.73 1.81.86.27.13.44.2.51.31.07.11.07.65-.17 1.33z" />
    ),
  },
  {
    href: 'https://www.youtube.com/@Bitafly',
    label: 'YouTube',
    icon: (
      <path d="M21.58 7.19a2.52 2.52 0 00-1.77-1.78C18.25 5 12 5 12 5s-6.25 0-7.81.41c-.86.24-1.53.9-1.77 1.78C2 8.75 2 12 2 12s0 3.25.42 4.81c.24.87.9 1.53 1.77 1.77C5.75 19 12 19 12 19s6.25 0 7.81-.41a2.52 2.52 0 001.77-1.78C22 15.25 22 12 22 12s0-3.25-.42-4.81zM10 15V9l5.2 3z" />
    ),
  },
];

function FeatureCard({ icon, title, desc, href }) {
  const Tag = href ? 'a' : 'div';
  return (
    <Tag
      {...(href ? { href } : {})}
      className="feature-card block bg-white/[0.06] border border-white/10 rounded-2xl p-5 hover:bg-white/10 hover:border-primary-400/40 hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary-300 flex items-center justify-center mb-3">
        <FeatureIcon name={icon} className="w-5 h-5" />
      </div>
      <p className="font-bold text-white text-sm">{title}</p>
      <p className="text-sm text-navy-200 mt-1.5 leading-relaxed">{desc}</p>
      {href && <p className="text-xs font-bold text-primary-300 mt-2">Ver módulo →</p>}
    </Tag>
  );
}

function FuncionesMegaMenu({ onClose }) {
  return (
    <div className="absolute left-1/2 -translate-x-1/2 top-[calc(100%+8px)] z-50 w-[680px] bg-white rounded-2xl shadow-xl ring-1 ring-navy-100 overflow-hidden">
      <div className="bg-navy px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary-300">Módulos de BitaFly</p>
          <p className="text-white text-xs mt-0.5">Todo el cumplimiento RAC 100 en un solo lugar</p>
        </div>
        <a
          href="/registro"
          onClick={onClose}
          className="bg-primary text-white px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wide hover:bg-primary-600 transition-colors shrink-0"
        >
          Probar gratis
        </a>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-4 gap-px bg-navy-100 p-px">
        {NAV_FUNCIONES_GROUPS.flatMap((g) => g.items).map((item) => (
          <a
            key={item.href}
            href={item.href}
            onClick={onClose}
            className="group flex flex-col gap-1.5 bg-white px-4 py-4 hover:bg-primary-50 transition-colors"
          >
            <FeatureIcon name={item.icon} className="w-5 h-5 text-primary-600" />
            <p className="text-xs font-bold text-navy group-hover:text-primary-700">{item.label}</p>
            <p className="text-[11px] text-navy-300">{item.desc}</p>
          </a>
        ))}
      </div>
      <div className="bg-navy-50 px-6 py-3 flex items-center justify-between border-t border-navy-100">
        <p className="text-[11px] text-navy-300">
          <span className="font-bold text-navy">11 módulos</span> · Cumplimiento RAC 100 completo
        </p>
        <a href="#funciones" onClick={onClose} className="text-[11px] font-bold text-primary-600 hover:text-primary-700">
          Ver todas las funciones →
        </a>
      </div>
    </div>
  );
}

function RecursosDropdown({ onClose }) {
  return (
    <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-72 bg-white rounded-2xl shadow-xl ring-1 ring-navy-100 overflow-hidden p-2">
      {NAV_RECURSOS_ITEMS.map((item) => (
        <a
          key={item.href}
          href={item.href}
          onClick={onClose}
          className="group flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-navy-50 transition-colors"
        >
          <span className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
            <FeatureIcon name={item.icon} className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-bold text-navy group-hover:text-primary-700 truncate">{item.label}</p>
            <p className="text-[11px] text-navy-300 truncate">{item.desc}</p>
          </div>
        </a>
      ))}
    </div>
  );
}

export default function BitaflyLandingPreview() {
  const heroRef = useRef(null);
  const rootRef = useRef(null);
  const navRef = useRef(null);
  const [activeFeatureGroup, setActiveFeatureGroup] = useState(0);
  const [openNavMenu, setOpenNavMenu] = useState(null); // 'funciones' | 'recursos' | null

  // Formulario de contacto — mismo endpoint real ya usado en producción
  // (src/components/landing/Contact.js → POST /api/contact, envía por
  // Resend a soporte@bitafly.com) — nunca un formulario decorativo sin
  // backend detrás (regla V1).
  const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
  const [contactStatus, setContactStatus] = useState('idle'); // idle | loading | success | error
  const setContactField = (field) => (e) => setContactForm((f) => ({ ...f, [field]: e.target.value }));
  const sendContact = async (e) => {
    e.preventDefault();
    setContactStatus('loading');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contactForm),
      });
      if (!res.ok) throw new Error();
      setContactStatus('success');
      setContactForm({ name: '', email: '', message: '' });
    } catch {
      setContactStatus('error');
    }
  };

  // Clic fuera del nav cierra cualquier menú abierto — mismo patrón ya
  // usado en el nav de espacios de trabajo de src/app/(v2)/layout.js.
  useEffect(() => {
    function handleClickOutside(e) {
      if (navRef.current && !navRef.current.contains(e.target)) setOpenNavMenu(null);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return undefined; // respeta reduced-motion: sin animación, estado final directo

    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      // Hero — entrada suave al cargar (no en scroll, es lo primero visible).
      gsap.from('.hero-eyebrow, .hero-title, .hero-sub, .hero-cta, .hero-note', {
        opacity: 0,
        y: 16,
        duration: 0.5,
        ease: 'power1.out',
        stagger: 0.08,
      });
      gsap.from('.hero-visual', { opacity: 0, scale: 0.96, duration: 0.6, ease: 'power2.out', delay: 0.15 });

      // Blobs decorativos — parallax sutil, solo capas de fondo (nunca texto).
      gsap.utils.toArray('.parallax-blob').forEach((el, i) => {
        gsap.to(el, {
          yPercent: (i + 1) * -10,
          ease: 'none',
          scrollTrigger: { trigger: rootRef.current, scrub: 0.6 },
        });
      });

    }, rootRef);

    // Trust bar / feature cards / screenshots — revelado por scroll con
    // IntersectionObserver plano, no ScrollTrigger. Decisión deliberada tras
    // verificar en navegador real (Playwright) que ScrollTrigger calcula la
    // posición de disparo de cada sección UNA VEZ al montar — si el layout
    // se desplaza después (fuentes web, imágenes, cualquier carga async),
    // esas posiciones quedan desactualizadas y el contenido puede quedarse
    // en opacity:0 para siempre. Un IntersectionObserver evalúa la
    // intersección real en cada frame, sin caché de posiciones — no puede
    // quedar mal calculado por un cambio de layout posterior.
    const revealTargets = [
      ...document.querySelectorAll('.reveal-fade'),
      ...document.querySelectorAll('.reveal-stagger'),
    ];
    revealTargets.forEach((el) => el.classList.add('reveal-pending'));

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          if (el.classList.contains('reveal-stagger')) {
            Array.from(el.children).forEach((child, i) => {
              child.style.transitionDelay = `${i * 70}ms`;
            });
          }
          el.classList.remove('reveal-pending');
          observer.unobserve(el);
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );
    revealTargets.forEach((el) => observer.observe(el));

    return () => {
      ctx.revert();
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={rootRef} className="font-sans text-navy overflow-x-hidden">
      {/* Transiciones del revelado por scroll — CSS puro + IntersectionObserver
          (ver useEffect). `.reveal-pending` es el estado ANTES de entrar en
          viewport; quitarlo dispara la transición al estado final. Los hijos
          de `.reveal-stagger` reciben su propio transition-delay via JS
          (efecto escalonado) al momento de intersectar. */}
      <style jsx global>{`
        .reveal-fade,
        .reveal-stagger > * {
          transition: opacity 0.4s ease-out, transform 0.4s ease-out;
        }
        .reveal-fade.reveal-pending {
          opacity: 0;
          transform: translateY(12px);
        }
        .reveal-stagger.reveal-pending > * {
          opacity: 0;
          transform: translateY(16px) scale(0.97);
        }
      `}</style>

      {/* Nav pública — logo + centro (Funciones/Precios/Blog/Recursos) +
          acceso. Se deja igual de simple en móvil (el centro se oculta bajo
          lg, mismo criterio que el nav actual) — el menú hamburguesa queda
          fuera de esta pasada, a pedido del usuario de enfocarse en el
          contenido del centro primero. */}
      <header ref={navRef} className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-navy-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center gap-6">
          <div className="flex items-center gap-2 shrink-0">
            <Image
              src="/logo.png"
              alt=""
              width={36}
              height={36}
              className="h-8 w-auto"
              priority
            />
            <span className="font-black text-navy tracking-tight">BitaFly</span>
          </div>

          <nav className="hidden lg:flex items-center gap-1 flex-1" aria-label="Navegación principal">
            <div className="relative">
              <button
                type="button"
                aria-haspopup="true"
                aria-expanded={openNavMenu === 'funciones'}
                onClick={() => setOpenNavMenu(openNavMenu === 'funciones' ? null : 'funciones')}
                className="flex items-center gap-1 px-3.5 py-2 rounded-xl text-sm font-semibold text-navy-400 hover:text-navy hover:bg-navy-50 transition-colors"
              >
                Funciones
                <svg viewBox="0 0 24 24" className={`w-4 h-4 transition-transform ${openNavMenu === 'funciones' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {openNavMenu === 'funciones' && <FuncionesMegaMenu onClose={() => setOpenNavMenu(null)} />}
            </div>

            <a href="/precios" className="px-3.5 py-2 rounded-xl text-sm font-semibold text-navy-400 hover:text-navy hover:bg-navy-50 transition-colors">
              Precios
            </a>
            <a href="/blog" className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold text-navy-400 hover:text-navy hover:bg-navy-50 transition-colors">
              Blog
              <span className="bg-primary text-white text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full leading-none">Nuevo</span>
            </a>

            <div className="relative">
              <button
                type="button"
                aria-haspopup="true"
                aria-expanded={openNavMenu === 'recursos'}
                onClick={() => setOpenNavMenu(openNavMenu === 'recursos' ? null : 'recursos')}
                className="flex items-center gap-1 px-3.5 py-2 rounded-xl text-sm font-semibold text-navy-400 hover:text-navy hover:bg-navy-50 transition-colors"
              >
                Recursos
                <svg viewBox="0 0 24 24" className={`w-4 h-4 transition-transform ${openNavMenu === 'recursos' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {openNavMenu === 'recursos' && <RecursosDropdown onClose={() => setOpenNavMenu(null)} />}
            </div>
          </nav>

          <div className="flex items-center gap-2 shrink-0 ml-auto">
            <a href="/login">
              <Button variant="ghost">Iniciar sesión</Button>
            </a>
            <a href="/registro">
              <Button variant="primary">Comenzar gratis</Button>
            </a>
          </div>
        </div>
      </header>

      {/* Hero — full-bleed: la foto real ocupa TODO el ancho/alto del
          viewport (Hero-Centric Design, ui-ux-pro-max §landing), no una
          columna al lado del texto. Overlay en gradiente (izq→der, más
          oscuro donde va el texto) para mantener 4.5:1 de contraste sin
          apagar la foto por completo — foto real de un piloto operando el
          control con el dron en tierra (Unsplash, licencia libre, ver
          comentario de cabecera). */}
      <section ref={heroRef} className="relative isolate min-h-[92vh] flex items-center overflow-hidden">
        <Image
          src="/screenshots/marketing/hero-pilot.jpg"
          alt="Piloto operando el control de un dron antes del despegue"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[70%_center] -z-20"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/85 to-navy/30 -z-10" />
        <div className="parallax-blob pointer-events-none absolute top-1/3 right-10 w-72 h-72 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-6 w-full py-24">
          <div className="max-w-2xl">
            <p className="hero-eyebrow inline-flex items-center gap-2 bg-white/10 backdrop-blur text-primary-200 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border border-white/10">
              Bitácora, SMS y gestión de flota en un solo lugar
            </p>
            <h1 className="hero-title text-4xl md:text-6xl font-black text-white leading-[1.05] tracking-tight mt-5">
              Bitácora de vuelo y gestión de flota de <span className="text-primary-300">drones</span> en Colombia
            </h1>
            <p className="hero-sub text-base md:text-lg text-navy-100 max-w-xl mt-5">
              Bitácora digital, sistema de gestión de seguridad operacional (SMS), mantenimiento
              de baterías y revisión de vuelos con replay GPS — todo en una sola plataforma.
              Cumple con la RAC 100 desde el primer vuelo.
            </p>
            <div className="hero-cta flex flex-col sm:flex-row items-center gap-3 mt-8">
              <a href="/registro">
                <Button variant="primary" className="px-8 py-3.5 text-sm">
                  Comenzar gratis
                </Button>
              </a>
              <a href="/login" className="text-sm font-semibold text-white/90 hover:text-white underline underline-offset-4 px-2 py-3.5">
                Iniciar sesión →
              </a>
            </div>
            <p className="hero-note text-xs text-navy-200 mt-4">
              Sin tarjeta de crédito · Configuración en 5 minutos · Soporte en español
            </p>
          </div>

          {/* Tarjeta flotante tipo "glass" con un dato real del dashboard —
              conecta la foto (operación real) con el producto (datos reales),
              sin depender de una segunda imagen. */}
          <div className="hero-visual hidden lg:block absolute bottom-14 right-6 xl:right-16 w-64 rounded-2xl bg-white/95 backdrop-blur border border-white/40 shadow-2xl p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-navy-300">Operación de prueba</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <p className="text-sm font-bold text-navy">Operación normal</p>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <p className="text-xl font-black text-navy">6</p>
                <p className="text-[10px] text-navy-300">Vuelos del mes</p>
              </div>
              <div>
                <p className="text-xl font-black text-navy">0</p>
                <p className="text-[10px] text-navy-300">Alertas activas</p>
              </div>
            </div>
          </div>
        </div>

        {/* Trust bar — incrustada como pie del hero, no una sección aparte:
            mantiene la foto como único fondo continuo de arriba a abajo. */}
        <div className="reveal-stagger absolute inset-x-0 bottom-0 bg-navy/80 backdrop-blur border-t border-white/10 py-5 px-6">
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {TRUST_STATS.map((s) => (
              <div key={s.label}>
                <p className="text-xl md:text-2xl font-black text-primary-300">{s.value}</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-navy-200 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cómo funciona — 3 pasos reales del onboarding, conectados con una
          línea horizontal en desktop (puramente decorativa). */}
      <section className="py-16 md:py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="reveal-fade text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-600">Cómo funciona</p>
            <h2 className="text-2xl md:text-3xl font-black text-navy mt-1">Operando en tres pasos</h2>
          </div>
          <div className="reveal-stagger relative grid sm:grid-cols-3 gap-6">
            <div className="hidden sm:block absolute top-7 left-[16.5%] right-[16.5%] h-px bg-navy-100" />
            {HOW_IT_WORKS.map((s) => (
              <div key={s.step} className="relative bg-white rounded-3xl border border-navy-100 p-6 text-center">
                <div className="relative mx-auto w-14 h-14 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center mb-4">
                  <FeatureIcon name={s.icon} className="w-6 h-6" />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-white text-[11px] font-black flex items-center justify-center">
                    {s.step}
                  </span>
                </div>
                <p className="font-bold text-navy">{s.title}</p>
                <p className="text-sm text-navy-300 mt-2 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Funciones — fondo navy oscuro a propósito. Nivel de interactividad a mitad de camino entre esa
          sección (tour con imagen grande) y una lista plana: pills de grupo
          seleccionables que filtran a un solo grupo a la vez — el catálogo
          sigue siendo robusto (21 funciones reales condensadas), pero nunca
          se ven las 4 categorías de golpe. */}
      <section className="py-16 md:py-20 px-6 bg-navy">
        <div className="max-w-5xl mx-auto">
          <div className="reveal-fade text-center mb-8">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-300">Funciones</p>
            <h2 className="text-2xl md:text-3xl font-black text-white mt-1">Todo lo que necesita un explotador UAS</h2>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {FEATURE_GROUPS.map((g, i) => {
              const isActive = i === activeFeatureGroup;
              return (
                <button
                  key={g.group}
                  type="button"
                  onClick={() => setActiveFeatureGroup(i)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                    isActive ? 'bg-primary border-primary text-white' : 'bg-white/5 border-white/10 text-navy-200 hover:bg-white/10'
                  }`}
                >
                  <FeatureIcon name={g.icon} className="w-4 h-4" />
                  {g.group}
                </button>
              );
            })}
          </div>

          <div className="reveal-stagger grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURE_GROUPS[activeFeatureGroup].items.map((item) => (
              <FeatureCard key={item.title} {...item} />
            ))}
          </div>

          {/* Puente a Enterprise — el plan Enterprise (precios a medida, sin
              tarjeta propia en esta landing) enlaza directo a la sección de
              contacto de abajo, en vez de dejar sin salida a quien necesita
              algo más grande que Flota. */}
          <div className="reveal-fade mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/[0.06] border border-white/10 rounded-2xl px-6 py-5">
            <p className="text-sm text-navy-200 text-center sm:text-left">
              <span className="font-bold text-white">¿Tu operación es más grande que Flota?</span> El plan Enterprise se ajusta a tu volumen de drones y usuarios.
            </p>
            <a href="#contacto" className="shrink-0 bg-primary text-white text-xs font-bold uppercase tracking-widest px-5 py-3 rounded-xl hover:bg-primary-600 transition-colors">
              Hablar con ventas
            </a>
          </div>
        </div>
      </section>

      {/* Por qué BitaFly — 3 razones reales, nunca testimonios fabricados
          (ver comentario junto a WHY_REASONS). */}
      <section className="py-16 md:py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="reveal-fade text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-600">Por qué BitaFly</p>
            <h2 className="text-2xl md:text-3xl font-black text-navy mt-1">Pensado para operadores UAS en Colombia</h2>
          </div>
          <div className="reveal-stagger grid sm:grid-cols-3 gap-5">
            {WHY_REASONS.map((r) => (
              <div key={r.title} className="bg-navy-50 border border-navy-100 rounded-3xl p-6">
                <div className="w-11 h-11 rounded-2xl bg-primary-50 text-primary-600 flex items-center justify-center mb-4">
                  <FeatureIcon name={r.icon} className="w-6 h-6" />
                </div>
                <p className="font-bold text-navy">{r.title}</p>
                <p className="text-sm text-navy-300 mt-2 leading-relaxed">{r.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ — acordeón nativo (<details>/<summary>), sin JS de estado:
          accesible con teclado y lectores de pantalla de fábrica. */}
      <section className="py-16 md:py-20 px-6 bg-navy-50">
        <div className="max-w-5xl mx-auto">
          <div className="reveal-fade text-center mb-10">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-600">Preguntas frecuentes</p>
            <h2 className="text-2xl md:text-3xl font-black text-navy mt-1">Resolvemos tus dudas</h2>
          </div>
          <div className="reveal-fade grid md:grid-cols-2 gap-x-10 gap-y-8">
            {FAQ_GROUPS.map((g) => (
              <div key={g.group}>
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary-600 mb-3">
                  <FeatureIcon name={g.icon} className="w-4 h-4" />
                  {g.group}
                </p>
                <div className="space-y-3">
                  {g.items.map((f) => (
                    <details key={f.q} className="group bg-white rounded-2xl border border-navy-100 overflow-hidden">
                      <summary className="flex items-center justify-between gap-3 p-4 cursor-pointer list-none">
                        <span className="font-bold text-navy text-sm pr-2">{f.q}</span>
                        <svg viewBox="0 0 24 24" className="w-4 h-4 text-primary-600 shrink-0 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </summary>
                      <div className="px-4 pb-4 text-sm text-navy-300 leading-relaxed">{f.a}</div>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contáctanos — sección propia, prominente (pedido explícito del
          usuario: "más visible"), destino real del plan Enterprise (ver
          banner en Funciones) y de cualquiera con una duda antes de
          registrarse. Mismo backend real que ya usa producción
          (src/components/landing/Contact.js → POST /api/contact, Resend a
          soporte@bitafly.com) — nunca un formulario decorativo. Redes reales
          (LinkedIn/WhatsApp/YouTube) ya verificadas y en uso en el footer. */}
      <section id="contacto" className="py-16 md:py-20 px-6 bg-navy">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
          <div className="reveal-fade">
            <p className="text-xs font-bold uppercase tracking-widest text-primary-300">Contacto</p>
            <h2 className="text-2xl md:text-4xl font-black text-white mt-1">Hablemos de tu operación</h2>
            <p className="text-sm text-navy-200 mt-3 max-w-md leading-relaxed">
              ¿Plan Enterprise, una migración de datos, o una duda antes de registrarte? Nuestro equipo responde en menos de 24 horas.
            </p>
            <ul className="mt-6 space-y-2">
              {['Respuesta en menos de 24 horas', 'Soporte en español', 'Migración de datos sin costo'].map((item) => (
                <li key={item} className="flex items-center gap-3 text-sm text-navy-200">
                  <span className="material-symbols-outlined text-primary-300 text-lg">check_circle</span>
                  {item}
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-3 mt-8">
              <a href="mailto:soporte@bitafly.com" className="flex items-center gap-2 text-sm font-bold text-white hover:text-primary-300 transition-colors">
                <span className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center"><span className="material-symbols-outlined text-lg">mail</span></span>
                soporte@bitafly.com
              </a>
              <a href="https://wa.me/573213569836" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm font-bold text-white hover:text-primary-300 transition-colors">
                <span className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center"><span className="material-symbols-outlined text-lg">chat</span></span>
                WhatsApp
              </a>
            </div>
          </div>

          <div className="reveal-fade bg-white rounded-3xl shadow-2xl p-8">
            {contactStatus === 'success' ? (
              <div className="h-full flex flex-col items-center justify-center text-center gap-3 py-8">
                <span className="material-symbols-outlined text-5xl text-primary-600">mark_email_read</span>
                <p className="font-black text-navy uppercase">¡Mensaje enviado!</p>
                <p className="text-sm text-navy-300">Te responderemos en menos de 24 horas.</p>
                <button onClick={() => setContactStatus('idle')} className="mt-2 text-xs font-bold text-primary-600 uppercase tracking-widest hover:underline">
                  Enviar otro mensaje
                </button>
              </div>
            ) : (
              <form onSubmit={sendContact} className="space-y-4">
                <input required placeholder="Nombre" value={contactForm.name} onChange={setContactField('name')}
                  className="w-full px-4 py-3.5 bg-navy-50 border border-navy-100 rounded-xl text-sm font-medium outline-none focus:border-primary transition-colors" />
                <input required type="email" placeholder="Correo corporativo" value={contactForm.email} onChange={setContactField('email')}
                  className="w-full px-4 py-3.5 bg-navy-50 border border-navy-100 rounded-xl text-sm font-medium outline-none focus:border-primary transition-colors" />
                <textarea required rows={4} placeholder="¿Cómo podemos ayudarte?" value={contactForm.message} onChange={setContactField('message')}
                  className="w-full px-4 py-3.5 bg-navy-50 border border-navy-100 rounded-xl text-sm font-medium outline-none focus:border-primary transition-colors resize-none" />
                {contactStatus === 'error' && (
                  <p className="text-red-600 text-xs font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">error</span>
                    Error al enviar. Intenta de nuevo.
                  </p>
                )}
                <button type="submit" disabled={contactStatus === 'loading'}
                  className="w-full bg-primary text-white py-4 rounded-xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-primary-600 transition-all disabled:opacity-60 flex items-center justify-center gap-2">
                  {contactStatus === 'loading'
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Enviando...</>
                    : 'Enviar consulta'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* CTA final — banner con foto de dron en vuelo real (fondo, con overlay
          navy para contraste de texto ≥4.5:1). Foto de stock de licencia
          libre (Unsplash) mientras no exista material propio de BitaFly. */}
      <section className="relative isolate overflow-hidden py-24 px-6">
        <Image
          src="/screenshots/marketing/hero-drone.jpg"
          alt="Dron volando en exteriores"
          fill
          sizes="100vw"
          className="object-cover -z-20"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/70 to-navy/40 -z-10" />
        <div className="reveal-fade max-w-2xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-black text-white">Empieza a operar con evidencia, no con hojas de cálculo</h2>
          <p className="text-sm text-navy-100 mt-2">Configura tu organización en minutos.</p>
          <a href="/registro" className="inline-block mt-6">
            <Button variant="primary" className="px-8 py-3.5 text-sm">
              Comenzar gratis
            </Button>
          </a>
        </div>
      </section>

      {/* Footer con columnas — mismos enlaces reales del footer de producción
          (FOOTER_COLUMNS, acotados a rutas verificadas contra el build). */}
      <footer className="bg-navy text-navy-200 px-6 pt-14 pb-8">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-10">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2">
              <Image
                src="/logo.png"
                alt=""
                width={32}
                height={28}
                style={{ objectFit: 'contain', filter: 'brightness(0) invert(1)' }}
                className="h-7 w-auto"
              />
              <span className="font-black text-white tracking-tight">BitaFly</span>
            </div>
            <p className="text-xs text-navy-300 mt-3 max-w-[220px] leading-relaxed">
              Bitácora digital RAC 100 para operadores UAS en Colombia.
            </p>
            <div className="flex items-center gap-2 mt-4">
              {SOCIAL_LINKS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-primary/20 text-navy-300 hover:text-primary-300 flex items-center justify-center transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                    {s.icon}
                  </svg>
                </a>
              ))}
            </div>
          </div>
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.heading}>
              <p className="text-[11px] font-bold uppercase tracking-widest text-white mb-3">{col.heading}</p>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} className="text-xs text-navy-300 hover:text-primary-300 transition-colors">
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="max-w-5xl mx-auto border-t border-white/10 mt-10 pt-6 flex flex-col sm:flex-row justify-between gap-3 text-xs text-navy-300">
          <span>© {new Date().getFullYear()} BitaFly S.A.S. — vista previa de rediseño (F1, uso interno)</span>
          <a href="mailto:soporte@bitafly.com" className="hover:text-primary-300 transition-colors">
            soporte@bitafly.com
          </a>
        </div>
      </footer>
    </div>
  );
}
