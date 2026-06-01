/**
 * caseStudies.js — Casos de éxito de operadores UAS con Bitafly.
 * Estructura idéntica a blogPosts.js para reutilizar el sistema SSG.
 * Actualizar con datos reales del cliente antes de publicar en producción.
 */

export const CASE_STUDIES = [
  {
    slug:        'skymotion-bogota',
    empresa:     'Sky Motion UAS',
    ciudad:      'Bogotá, Cundinamarca',
    operador:    'Carlos M.',
    cargo:       'Director de Operaciones',
    tipo:        'Empresa de inspección y topografía',
    flota:       '4 aeronaves DJI',
    desde:       '2024',
    metaTitle:   'Sky Motion UAS Bogotá — Caso de Éxito Bitafly | Gestión de Flota RAC 100',
    metaDescription: 'Cómo Sky Motion UAS en Bogotá pasó de hojas de cálculo a Bitafly para gestionar su flota de 4 drones DJI y cumplir la RAC 100 sin fricciones.',
    keywords:    ['caso éxito drones colombia', 'gestión flota drones bogotá', 'bitafly caso uso', 'software operadores UAS colombia'],
    quote:       'Antes de Bitafly pasábamos horas al mes recopilando registros en Excel para cada inspección de la AeroCivil. Ahora el F-OPS-002 se genera en segundos y las auditorías no nos generan estrés.',
    reto:        'Sky Motion realizaba más de 60 vuelos al mes con 4 aeronaves DJI Mavic 3 Enterprise. Llevar la bitácora en hojas de cálculo compartidas generaba errores frecuentes: horas duplicadas, seriales equivocados y documentos PDF que debían rehacerse manualmente antes de cada auditoría.',
    solucion:    'Con Bitafly, cada vuelo se registra desde el celular en campo en menos de 2 minutos. Las horas se suman automáticamente al contador de cada aeronave. Las alertas de mantenimiento les avisaron con 10 días de anticipación cuando una de sus aeronaves llegó a las 190 horas.',
    resultados:  [
      'Tiempo de registro por vuelo: de 15 min (Excel) a 2 min (Bitafly)',
      'Cero errores en bitácoras durante la última inspección AeroCivil',
      'F-OPS-002 generado en PDF en menos de 30 segundos',
      'Alertas de mantenimiento activas para 4 aeronaves y 12 baterías',
      'Certificación ESUAS obtenida sin observaciones documentales',
    ],
    modulos:     ['bitacora-digital', 'gestion-flota-drones', 'mantenimiento-drones', 'reportes-auditoria'],
    publishedAt: '2025-06-01',
  },
  {
    slug:        'aerovisual-medellin',
    empresa:     'AeroVisual Colombia',
    ciudad:      'Medellín, Antioquia',
    operador:    'Andrés R.',
    cargo:       'Jefe de Pilotos',
    tipo:        'Producción audiovisual y publicidad con drones',
    flota:       '2 aeronaves DJI + 1 Autel',
    desde:       '2024',
    metaTitle:   'AeroVisual Colombia Medellín — Caso de Éxito Bitafly | SMS Aeronáutico',
    metaDescription: 'Cómo AeroVisual Colombia en Medellín implementó su SMS aeronáutico y obtuvo la certificación ESUAS usando Bitafly como plataforma de gestión RAC 100.',
    keywords:    ['caso éxito SMS aeronáutico colombia', 'certificación ESUAS colombia', 'bitafly medellín', 'software drones medellín'],
    quote:       'El módulo SMS de Bitafly nos permitió documentar tres incidentes menores durante el proceso de certificación. Eso le demostró a la AeroCivil que teníamos una cultura de seguridad real, no solo papeleo.',
    reto:        'AeroVisual necesitaba obtener la certificación como Explotador de Sistemas UAS (ESUAS) ante la AeroCivil para poder acceder a contratos con clientes corporativos. El proceso requería demostrar un SMS aeronáutico funcional, pero no sabían por dónde empezar.',
    solucion:    'Bitafly les proporcionó la estructura del SMS desde el primer día: formularios de reporte de peligros accesibles desde el celular, clasificación de eventos según la RAC 100, y el historial de incidentes documentado que presentaron en el proceso de certificación.',
    resultados:  [
      'Certificación ESUAS obtenida en 3 meses desde el inicio con Bitafly',
      'SMS implementado con 3 reportes de incidentes documentados',
      'Acceso a contratos corporativos antes reservados a empresas certificadas',
      'Reducción del tiempo de preparación para auditorías en un 70%',
      'Pilotos con CPR gestionados con alertas de vencimiento activas',
    ],
    modulos:     ['sms-aeronautico', 'gestion-pilotos', 'bitacora-digital', 'autorizaciones-aerocivil'],
    publishedAt: '2025-06-01',
  },
  {
    slug:        'agrodrone-cali',
    empresa:     'AgroDrone del Valle',
    ciudad:      'Cali, Valle del Cauca',
    operador:    'Laura V.',
    cargo:       'Gerente de Operaciones',
    tipo:        'Aplicaciones agrícolas — fumigación y monitoreo',
    flota:       '3 aeronaves DJI Agras',
    desde:       '2025',
    metaTitle:   'AgroDrone del Valle Cali — Caso de Éxito Bitafly | Drones Agrícolas Colombia',
    metaDescription: 'Cómo AgroDrone del Valle en Cali gestiona su flota de drones agrícolas DJI Agras con Bitafly: autorizaciones de vuelo, mantenimiento de baterías y bitácora RAC 100.',
    keywords:    ['drones agricolas colombia', 'caso éxito drones agrícolas colombia', 'bitafly cali', 'agras colombia software gestión'],
    quote:       'Operamos en zonas rurales con mala conectividad. Poder registrar el vuelo offline y sincronizar cuando llegamos a la ciudad nos cambió la vida. Ya no perdemos registros.',
    reto:        'AgroDrone del Valle realiza aplicaciones agrícolas en haciendas del Valle del Cauca. Muchas zonas no tienen señal de celular, lo que hacía imposible registrar vuelos en tiempo real. Además, sus baterías de alta capacidad tenían ciclos muy distintos entre sí y llevaban el control en notas de WhatsApp.',
    solucion:    'Bitafly funciona como app web Progressive (PWA) con capacidad offline básica. Los datos del vuelo se guardan localmente y sincronizan al recuperar conexión. El F-MNT-003 de baterías con ciclos individuales por batería resolvió el control que tenían en WhatsApp.',
    resultados:  [
      'Control de ciclos de 9 baterías DJI Agras en un solo panel',
      'Alertas automáticas a 180 ciclos (umbral configurado por ellos)',
      'Autorizaciones F-OPS-001 generadas para cada finca sin necesidad de abogado',
      'Reducción de baterías retiradas prematuramente por falta de control',
      'Primer cliente en el sector agrícola colombiano con ESUAS certificado en su departamento',
    ],
    modulos:     ['mantenimiento-drones', 'bitacora-digital', 'autorizaciones-aerocivil', 'gestion-flota-drones'],
    publishedAt: '2025-06-01',
  },
];

export function getCaseBySlug(slug) {
  return CASE_STUDIES.find(c => c.slug === slug);
}

export function getAllCaseSlugs() {
  return CASE_STUDIES.map(c => ({ slug: c.slug }));
}
