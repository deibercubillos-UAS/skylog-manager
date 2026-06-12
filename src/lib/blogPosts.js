/**
 * blogPosts.js — Fuente de verdad de artículos del blog de Bitafly.
 * Cada post es un objeto JS con metadatos + body HTML.
 * Para agregar un artículo: añade un objeto al array y redespliega.
 */

export const BLOG_POSTS = [
  // ─── 1. RAC 100 ──────────────────────────────────────────────────────────
  {
    slug:            'rac-100-colombia-operadores-drones',
    title:           '¿Qué es la RAC 100 y cómo cumplirla siendo operador de drones en Colombia?',
    metaTitle:       'RAC 100 Colombia: Guía para Operadores de Drones | Bitafly',
    metaDescription: 'Todo lo que necesitas saber sobre la RAC 100 de la AeroCivil: qué exige, cómo cumplirla y qué documentos debes llevar como operador UAS en Colombia.',
    publishedAt:     '2025-03-10',
    updatedAt:       '2026-06-07',
    readingTime:     7,
    category:        'Normativa',
    keywords:        ['RAC 100', 'AeroCivil drones', 'operadores UAS Colombia', 'normativa RPAS Colombia'],
    excerpt:         'La RAC 100 es el reglamento aeronáutico colombiano que regula todas las operaciones con sistemas de aeronaves no tripuladas (RPAS/UAS). Si operas drones comercialmente, cumplirla no es opcional.',
    coverAlt:        'Normativa RAC 100 Colombia para operadores de drones',
    body: `
<p>La <strong>RAC 100</strong> (Reglamento Aeronáutico de Colombia, Parte 100) es la norma emitida por la <strong>UAEAC (Unidad Administrativa Especial de Aeronáutica Civil)</strong> que establece los requisitos técnicos, operacionales y administrativos para quienes operan sistemas de aeronaves remotamente pilotadas (RPAS) en Colombia.</p>

<p>Si usas un dron con fines comerciales —inspección, topografía, filmación, agricultura, vigilancia— estás obligado a cumplirla. No cumplirla puede implicar suspensión de operaciones, multas y responsabilidad civil o penal en caso de accidente.</p>

<div class="stats-row">
  <div class="stat-item"><div class="num">250 g</div><div class="lbl">Peso mínimo para registrar el RPAS</div></div>
  <div class="stat-item"><div class="num">7</div><div class="lbl">Obligaciones principales del operador</div></div>
  <div class="stat-item"><div class="num">2 años</div><div class="lbl">Conservar registros de vuelo</div></div>
</div>

<h2>¿A quién aplica la RAC 100?</h2>
<p>La norma aplica a cualquier persona natural o jurídica que opere un RPAS con fines distintos al recreo dentro del espacio aéreo colombiano. Específicamente cubre:</p>
<ul>
  <li>Operadores comerciales (empresas y freelancers que prestan servicios con drones)</li>
  <li>Pilotos remotos certificados (PRC)</li>
  <li>Fabricantes e importadores de RPAS</li>
  <li>Operaciones especiales (BVLOS, vuelos nocturnos, sobre aglomeraciones)</li>
</ul>
<p>Los vuelos recreativos con drones de menos de 2 kg en zonas no restringidas tienen requisitos más simples, pero igualmente deben registrarse.</p>

<h2>Principales obligaciones del operador UAS bajo la RAC 100</h2>

<h3>1. Registro del RPAS ante la UAEAC</h3>
<p>Todo RPAS con peso de despegue superior a 250 gramos debe matricularse en el <strong>Portal SIRAC</strong> de la AeroCivil. El proceso es digital y requiere datos técnicos de la aeronave, datos del propietario y pago de la tasa correspondiente.</p>

<h3>2. Certificación del piloto remoto</h3>
<p>El operador debe contar con pilotos que tengan el <strong>Certificado de Piloto Remoto (CPR)</strong> emitido por una Organización de Entrenamiento Aprobada (OEA). La RAC 100 define los niveles de competencia según el tipo de operación.</p>

<h3>3. Manual de Operaciones</h3>
<p>El operador debe elaborar y mantener actualizado un <strong>Manual de Operaciones (MO)</strong> que describa procedimientos normales, de emergencia, gestión de riesgos, responsabilidades y protocolos de comunicación. La AeroCivil puede auditarlo en cualquier momento.</p>

<h3>4. Bitácora digital de vuelo (F-OPS-002)</h3>
<p>Cada vuelo debe quedar registrado en la <strong>Bitácora de Vuelo</strong>. La RAC 100 no impone un código de formato oficial: cada operador define su propia nomenclatura en su manual de operaciones (en Bitafly se identifica por defecto como <strong>F-OPS-002</strong>, y lo puedes personalizar). Este documento debe incluir: fecha, piloto, aeronave (matrícula y serial), condiciones meteorológicas, horas de vuelo, incidentes y firma del jefe de pilotos.</p>
<p>Bitafly genera automáticamente el F-OPS-002 en PDF con todos los campos requeridos, desde cualquier dispositivo móvil. <a href="/bitacora-digital">Conoce la bitácora digital →</a></p>

<h3>5. Sistema de Gestión de Seguridad (SMS)</h3>
<p>Los operadores con flota de más de tres aeronaves o que realicen operaciones de mayor complejidad deben implementar un <strong>SMS aeronáutico</strong>: un sistema formal de identificación, análisis y mitigación de riesgos operacionales.</p>
<p><a href="/sms-aeronautico">Conoce el módulo SMS de Bitafly →</a></p>

<h3>6. Seguro de responsabilidad civil</h3>
<p>Es obligatorio contar con un seguro de responsabilidad civil extracontractual que cubra daños a terceros durante las operaciones. El valor mínimo varía según el peso del RPAS.</p>

<h3>7. Autorizaciones de vuelo</h3>
<p>Ciertas operaciones requieren autorización previa ante la AeroCivil: vuelos en zonas de control (CTR), zonas restringidas, sobre aglomeraciones o por fuera de la línea de visión visual (BVLOS). El proceso se realiza a través del portal AeroCivil con documentación específica, incluyendo archivos KML del área de operación.</p>
<p><a href="/autorizaciones-aerocivil">Gestiona tus autorizaciones con Bitafly →</a></p>

<h2>¿Qué pasa si no cumplo la RAC 100?</h2>
<p>La UAEAC puede imponer las siguientes medidas:</p>
<ul>
  <li><strong>Suspensión de la certificación</strong> del operador o el piloto</li>
  <li><strong>Multas</strong> proporcionales a la gravedad de la infracción</li>
  <li><strong>Inmovilización</strong> de la aeronave</li>
  <li>Responsabilidad civil o penal en caso de accidente por negligencia operacional</li>
</ul>

<div class="callout important">
  <svg class="callout-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
  <div class="callout-body"><strong>Importante</strong> La UAEAC puede suspender la certificación del operador y las matrículas de aeronaves sin previo aviso ante infracción grave. Las sanciones aplican aunque el vuelo no haya causado daños: el incumplimiento documental es suficiente.</div>
</div>

<h2>¿Cómo gestionar el cumplimiento RAC 100 eficientemente?</h2>
<p>El mayor desafío para los operadores no es entender la norma, sino <em>mantener el cumplimiento activo</em> operación tras operación: bitácoras al día, certificaciones vigentes, seguros actualizados, autorizaciones obtenidas a tiempo.</p>
<p><strong>Bitafly</strong> centraliza todo esto en una plataforma diseñada específicamente para la RAC 100 colombiana: bitácora digital automática, alertas de vencimiento, gestión de pilotos y aeronaves, módulo SMS y generación de documentos AeroCivil en un clic.</p>
<p><a href="/registro">Comienza gratis — sin tarjeta de crédito →</a></p>
`,
  },

  // ─── 2. Bitácora F-OPS-002 ────────────────────────────────────────────────
  {
    slug:            'bitacora-digital-drone-f-ops-002',
    title:           'Bitácora digital de vuelo para drones: guía completa del formato F-OPS-002',
    metaTitle:       'Bitácora Digital Drone F-OPS-002 Colombia | Guía 2026 | Bitafly',
    metaDescription: 'Aprende qué campos debe contener la bitácora de vuelo según la RAC 100, por qué la bitácora digital agiliza el cumplimiento y cómo generarla con tu propio código de formato (F-OPS-002 por defecto) en Bitafly.',
    publishedAt:     '2025-03-18',
    updatedAt:       '2026-06-07',
    readingTime:     6,
    category:        'Operaciones',
    keywords:        ['bitácora digital drones', 'F-OPS-002', 'bitácora vuelo RAC 100', 'registro vuelos AeroCivil'],
    excerpt:         'La bitácora de vuelo es un registro exigido por la RAC 100 para operadores RPAS en Colombia. Su código de formato no es oficial: lo define cada operador (F-OPS-002 por defecto en Bitafly). Aquí te explicamos cada campo y cómo automatizarla.',
    coverAlt:        'Bitácora digital de vuelo para drones F-OPS-002 Colombia',
    body: `
<p>La <strong>bitácora de vuelo</strong> es uno de los documentos más importantes para un operador RPAS en Colombia. No es opcional: la <strong>RAC 100</strong> exige que cada vuelo comercial quede documentado, con firma del jefe de pilotos. Lo que la norma <em>no</em> impone es un código de formato: cada operador define su propia nomenclatura en su manual de operaciones.</p>

<p>En este artículo te explicamos exactamente qué campos contiene la bitácora, por qué la bitácora digital es la forma más inteligente de cumplir este requisito y cómo Bitafly te genera el PDF en segundos.</p>

<h2>¿Qué es el F-OPS-002?</h2>
<p><strong>F-OPS-002</strong> es el código con el que Bitafly identifica por defecto la bitácora de vuelo (Maestro de Vuelo). No es un formato oficial de la UAEAC: es un código de control documental que tú puedes cambiar para que coincida con el de tu manual de operaciones. La RAC 100 exige llevar este registro y conservarlo disponible para auditoría durante al menos dos años, sin imponer su nomenclatura.</p>

<h2>Campos obligatorios de la bitácora</h2>
<p>La RAC 100 exige registrar, como mínimo, los siguientes datos por vuelo:</p>
<ul>
  <li><strong>Fecha y hora de despegue y aterrizaje</strong></li>
  <li><strong>Ubicación de la operación</strong> (coordenadas o descripción del área)</li>
  <li><strong>Aeronave utilizada</strong>: matrícula UAEAC, número de serie, modelo</li>
  <li><strong>Piloto remoto</strong>: nombre, número de CPR, vencimiento</li>
  <li><strong>Tipo de misión</strong>: inspección, cartografía, filmación, agricultura, etc.</li>
  <li><strong>Condición visual</strong>: VMC (Visual Meteorological Conditions) o IMC</li>
  <li><strong>Estado de la batería</strong> al inicio y fin del vuelo (% o voltaje)</li>
  <li><strong>Incidentes o anomalías</strong> detectados durante la operación</li>
  <li><strong>Horas de vuelo acumuladas</strong> de la aeronave (contador Hobbs)</li>
  <li><strong>Firma del jefe de pilotos</strong></li>
</ul>

<h2>Bitácora en papel vs. bitácora digital</h2>
<p>Durante años, los operadores llenaban el F-OPS-002 a mano. El problema:</p>
<ul>
  <li>Errores de escritura que invalidan el documento</li>
  <li>Hojas perdidas o deterioradas</li>
  <li>Tiempo invertido en sumar horas de vuelo manualmente</li>
  <li>Imposibilidad de buscar vuelos históricos rápidamente</li>
  <li>No se integra con el reporte de mantenimiento</li>
</ul>
<p>La <strong>bitácora digital</strong> resuelve todos estos puntos: el operador registra el vuelo desde el celular en campo, el sistema calcula automáticamente las horas acumuladas, y el PDF con todos los campos del F-OPS-002 está disponible en segundos para descarga o auditoría.</p>

<div class="callout tip">
  <svg class="callout-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
  <div class="callout-body"><strong>Tip operacional</strong> Registra el vuelo <em>antes de salir del sitio de operación</em>. Los datos de hora, batería y condición meteorológica son más precisos en campo que horas después. En Bitafly el formulario está optimizado para celular y tarda menos de 2 minutos.</div>
</div>

<h2>Cómo funciona la bitácora digital de Bitafly</h2>
<ol>
  <li><strong>Selecciona la aeronave</strong> — el sistema carga automáticamente matrícula, serial y modelo</li>
  <li><strong>Asigna el piloto</strong> — verifica CPR vigente y alerta si está por vencer</li>
  <li><strong>Registra los datos del vuelo</strong> — formulario optimizado para móvil, con selección de tipo de misión y condición meteorológica</li>
  <li><strong>El sistema suma las horas</strong> — el contador Hobbs se actualiza automáticamente</li>
  <li><strong>Descarga la bitácora en PDF</strong> — con tu código de formato (F-OPS-002 por defecto), logo corporativo, firma digital y todos los campos que pide la AeroCivil</li>
</ol>
<p>Además, puedes importar automáticamente datos de vuelo desde los registros de tu controlador DJI RC o RC 2, sin digitar nada manualmente.</p>

<h2>¿Cuántos vuelos puedo registrar?</h2>
<p>En Bitafly, la bitácora es <strong>ilimitada en todos los planes</strong>, incluyendo el plan gratuito. Puedes registrar todos los vuelos de tu operación sin restricciones de volumen.</p>

<h2>¿Qué pasa si no llevo la bitácora al día?</h2>
<p>La AeroCivil puede solicitar los registros de vuelo en cualquier inspección o auditoría. No tenerlos actualizados es una infracción directa a la RAC 100 y puede resultar en suspensión de la certificación del operador.</p>
<p>Con Bitafly, el registro es tan rápido que no hay excusa para dejarlos pendientes. <a href="/bitacora-digital">Ver todos los detalles de la bitácora digital →</a></p>
<p><a href="/registro">Comienza gratis hoy →</a></p>
`,
  },

  // ─── 3. Registro UAEAC ────────────────────────────────────────────────────
  {
    slug:            'como-registrar-drone-uaeac-colombia-2025',
    title:           'Cómo registrar tu dron ante la UAEAC en Colombia: paso a paso 2026',
    metaTitle:       'Cómo Registrar tu Drone en Colombia UAEAC 2026 | Paso a Paso',
    metaDescription: 'Guía completa para matricular tu drone ante la AeroCivil de Colombia en 2026. Documentos necesarios, costos, plazos y errores comunes a evitar.',
    publishedAt:     '2025-04-02',
    updatedAt:       '2026-06-07',
    readingTime:     5,
    category:        'Trámites',
    keywords:        ['registrar drone Colombia', 'matrícula RPAS UAEAC', 'SIRAC AeroCivil', 'registro drone AeroCivil 2026'],
    excerpt:         'Todo operador debe matricular su RPAS ante la UAEAC antes de operar comercialmente. Te explicamos el proceso completo, los documentos que necesitas y cuánto demora.',
    coverAlt:        'Registro de drones ante la UAEAC AeroCivil Colombia',
    body: `
<p>Antes de realizar cualquier operación comercial con tu dron en Colombia, debes <strong>matricular la aeronave ante la UAEAC</strong> a través del portal SIRAC. Sin este registro, el vuelo es ilegal y estás expuesto a sanciones.</p>

<p>En esta guía te explicamos el proceso actualizado para 2026, los documentos que necesitas y los errores más comunes que cometen los operadores nuevos.</p>

<h2>¿Qué drones deben registrarse?</h2>
<p>Según la RAC 100, deben matricularse ante la UAEAC todos los RPAS con <strong>peso de despegue superior a 250 gramos</strong> que se usen con fines comerciales o que operen en espacio aéreo no segregado. Los drones de uso recreativo menor a 250 g tienen un proceso simplificado.</p>

<div class="callout info">
  <svg class="callout-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
  <div class="callout-body"><strong>¿Qué drones aplican?</strong> La obligación de matrícula aplica a RPAS con <strong>peso de despegue superior a 250 g</strong> usados comercialmente. Los menores de 250 g tienen proceso simplificado, pero igualmente deben estar registrados si operan en espacio aéreo no segregado.</div>
</div>

<h2>Documentos necesarios para el registro</h2>
<ul>
  <li><strong>Cédula de ciudadanía o RUT</strong> (persona natural o jurídica)</li>
  <li><strong>Factura de compra o prueba de propiedad</strong> del RPAS</li>
  <li><strong>Número de serie</strong> del fabricante (airframe S/N)</li>
  <li><strong>Ficha técnica del fabricante</strong> con peso de despegue máximo y características técnicas</li>
  <li><strong>Seguro de responsabilidad civil</strong> vigente</li>
  <li><strong>Pago de la tasa aeronáutica</strong> correspondiente</li>
</ul>

<h2>Paso a paso: cómo registrar tu dron en SIRAC</h2>
<ol>
  <li><strong>Crea una cuenta en el portal SIRAC</strong>: ingresa a <em>sirac.aerocivil.gov.co</em> y regístrate como operador UAS.</li>
  <li><strong>Completa el formulario de matrícula</strong>: ingresa los datos técnicos del RPAS, datos del propietario y los documentos requeridos.</li>
  <li><strong>Carga los documentos digitalizados</strong>: la factura, ficha técnica y seguro deben subirse en PDF.</li>
  <li><strong>Paga la tasa aeronáutica</strong>: el valor varía según el peso de la aeronave. El pago se realiza en línea.</li>
  <li><strong>Espera la aprobación</strong>: el proceso puede tomar entre 5 y 15 días hábiles.</li>
  <li><strong>Recibe el certificado de matrícula</strong>: una vez aprobado, recibirás el número de matrícula que debe exhibirse en la aeronave.</li>
</ol>

<h2>Marcación física de la aeronave</h2>
<p>Una vez obtenida la matrícula, debes <strong>marcar físicamente el dron</strong> con el número asignado, de forma legible y en lugar visible. El tamaño mínimo de los caracteres es de 6 mm. Puedes usar stickers, grabado láser o marcación con pintura permanente.</p>

<h2>¿Cuánto vale la matrícula?</h2>
<p>La tasa aeronáutica para registro de RPAS en Colombia depende del peso de la aeronave y se actualiza anualmente. Para el año 2026, consulta los valores vigentes directamente en el portal SIRAC o contáctanos para orientarte.</p>

<h2>Errores comunes que retrasan el trámite</h2>
<ul>
  <li>Subir documentos en baja resolución o con información ilegible</li>
  <li>No coincidir el número de serie entre la factura y la ficha técnica</li>
  <li>Seguro de RC vencido al momento de radicar</li>
  <li>Peso de despegue mal declarado (siempre usar el MTOW, no el peso sin batería)</li>
</ul>

<div class="callout warning">
  <svg class="callout-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
  <div class="callout-body"><strong>Error frecuente</strong> Usar el peso del dron <em>sin batería</em> como MTOW (Maximum Take-Off Weight) es una de las causas más comunes de rechazo. La AeroCivil requiere el peso <strong>con batería y carga completa</strong>. Para un DJI Mavic 3, el MTOW es 895 g, no 673 g.</div>
</div>

<h2>¿Y si tengo varios drones?</h2>
<p>Cada aeronave requiere su propio trámite de matrícula. En Bitafly puedes gestionar toda tu flota desde un solo lugar: matrículas, vencimientos, historial de mantenimiento y horas de vuelo de cada aeronave. <a href="/gestion-flota-drones">Conoce el módulo de flota →</a></p>
<p><a href="/registro">Crea tu cuenta gratis →</a></p>
`,
  },

  // ─── 4. SMS Aeronáutico ───────────────────────────────────────────────────
  {
    slug:            'sms-aeronautico-operadores-rpas-colombia',
    title:           'SMS aeronáutico para operadores RPAS: qué es y cómo implementarlo en Colombia',
    metaTitle:       'SMS Aeronáutico para Operadores RPAS Colombia | Guía Práctica',
    metaDescription: 'El Sistema de Gestión de Seguridad (SMS) es obligatorio para operadores RPAS en Colombia. Aprende qué componentes incluye y cómo implementarlo sin morir en el intento.',
    publishedAt:     '2025-04-15',
    updatedAt:       '2026-06-07',
    readingTime:     7,
    category:        'Seguridad',
    keywords:        ['SMS aeronáutico RPAS', 'sistema gestión seguridad drones', 'SMS UAS Colombia', 'seguridad operacional drones'],
    excerpt:         'El SMS (Safety Management System) es el marco formal de gestión de riesgos que la RAC 100 exige a los operadores UAS en Colombia. No es papeleo: es la diferencia entre operar con control real o a ciegas.',
    coverAlt:        'Sistema de Gestión de Seguridad SMS para operadores RPAS Colombia',
    body: `
<p>El <strong>Sistema de Gestión de Seguridad (SMS)</strong> es uno de los pilares de la aviación moderna y, desde la entrada en vigor de la RAC 100, también aplica a los operadores de sistemas remotamente pilotados (RPAS) en Colombia.</p>

<p>Muchos operadores lo ven como burocracia. En realidad, un SMS bien implementado es la herramienta que te permite identificar riesgos antes de que se conviertan en accidentes, protegerte legalmente y mejorar la eficiencia de tus operaciones.</p>

<h2>¿Qué es el SMS aeronáutico?</h2>
<p>El SMS (Safety Management System) es un enfoque sistemático para gestionar la seguridad operacional. Se basa en cuatro componentes fundamentales definidos por la OACI:</p>
<ol>
  <li><strong>Política y objetivos de seguridad</strong>: define el compromiso de la organización con la seguridad y las responsabilidades de cada rol</li>
  <li><strong>Gestión de riesgos</strong>: identificación de peligros, evaluación y mitigación de riesgos operacionales</li>
  <li><strong>Aseguramiento de la seguridad</strong>: monitoreo continuo, auditorías y análisis de tendencias</li>
  <li><strong>Promoción de la seguridad</strong>: formación, comunicación y cultura organizacional</li>
</ol>

<h2>¿Quién está obligado a tener SMS bajo la RAC 100?</h2>
<p>La RAC 100 exige la implementación de SMS a operadores que cumplan alguna de estas condiciones:</p>
<ul>
  <li>Flota de <strong>tres o más aeronaves</strong></li>
  <li>Operaciones de <strong>mayor complejidad</strong> (BVLOS, vuelos nocturnos, sobre aglomeraciones)</li>
  <li>Operadores que obtienen <strong>autorización de operación especial</strong> de la AeroCivil</li>
</ul>
<p>Incluso si no estás en esta categoría, implementar un SMS voluntario es una práctica que diferencia a los operadores profesionales.</p>

<div class="callout important">
  <svg class="callout-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
  <div class="callout-body"><strong>No esperes a necesitarlo</strong> La AeroCivil evalúa si el SMS existe y si funciona en la práctica. Un manual guardado en un cajón sin evidencia de uso no pasa una auditoría. El SMS debe demostrar actividad: reportes, acciones correctivas, auditorías internas documentadas.</div>
</div>

<h2>Componentes prácticos del SMS para operadores RPAS</h2>

<h3>1. Política de seguridad</h3>
<p>Documento firmado por la dirección que establece el compromiso con la seguridad, los objetivos medibles y las responsabilidades del equipo. No necesita ser extenso; necesita ser claro y aplicarse de verdad.</p>

<h3>2. Identificación y reporte de peligros</h3>
<p>Mecanismo formal para que pilotos y personal de tierra reporten condiciones inseguras, casi-accidentes o comportamientos de riesgo sin miedo a represalias. La cultura de reporte es el corazón del SMS.</p>

<h3>3. Evaluación de riesgos (SORA)</h3>
<p>Para operaciones RPAS, la herramienta estándar de evaluación de riesgo es el <strong>SORA (Specific Operations Risk Assessment)</strong>, un método desarrollado por JARUS que clasifica operaciones en categorías de riesgo y determina medidas de mitigación. <a href="/sora">Conoce el módulo SORA de Bitafly →</a></p>

<h3>4. Investigación de incidentes</h3>
<p>Proceso documentado para analizar todo evento que podría haber resultado en daño. El objetivo es encontrar causas raíz, no culpables, y establecer acciones correctivas.</p>

<h3>5. Auditorías internas</h3>
<p>Revisiones periódicas del cumplimiento de procedimientos, estado de certificaciones, bitácoras y equipos. En Bitafly, el módulo de auditoría genera reportes automáticos del estado de cumplimiento de tu operación.</p>

<h2>Implementación del SMS paso a paso</h2>
<ol>
  <li>Designa un <strong>gestor de seguridad</strong> dentro de tu organización</li>
  <li>Documenta tus <strong>procesos operacionales</strong> actuales (lista de verificación, procedimientos de emergencia)</li>
  <li>Implementa un <strong>sistema de reporte de peligros</strong> accesible para todo el equipo</li>
  <li>Realiza la <strong>evaluación SORA</strong> de tu tipo de operación habitual</li>
  <li>Establece un <strong>calendario de auditorías internas</strong> (mínimo semestral)</li>
  <li>Documenta todo: la AeroCivil puede pedir evidencias del SMS en cualquier momento</li>
</ol>

<h2>SMS digital: el enfoque moderno</h2>
<p>El módulo SMS de Bitafly digitaliza todos estos procesos: formularios de reporte de peligros accesibles desde el celular, registro automático de incidentes, evaluación de riesgos SORA asistida y generación de reportes para auditorías AeroCivil.</p>
<p><a href="/sms-aeronautico">Ver el módulo SMS de Bitafly →</a></p>
<p><a href="/registro">Comienza gratis →</a></p>
`,
  },

  // ─── 5. Análisis SORA ────────────────────────────────────────────────────
  {
    slug:            'analisis-sora-operaciones-drones-colombia',
    title:           'Análisis SORA para operaciones de drones: qué es y por qué lo necesitas',
    metaTitle:       'Análisis SORA Drones Colombia: Guía JARUS v2 | Bitafly',
    metaDescription: 'El SORA (Specific Operations Risk Assessment) es el estándar internacional para evaluar riesgos en operaciones RPAS. Aprende cómo aplicarlo a tus vuelos en Colombia.',
    publishedAt:     '2025-04-28',
    updatedAt:       '2026-06-07',
    readingTime:     8,
    category:        'Seguridad',
    keywords:        ['análisis SORA drones', 'SORA JARUS Colombia', 'evaluación riesgo RPAS', 'BVLOS Colombia'],
    excerpt:         'SORA es el método estándar para evaluar si una operación de drones es segura y qué medidas de mitigación necesitas. Cada vez más requerido por la AeroCivil en autorizaciones especiales.',
    coverAlt:        'Análisis de riesgo SORA para operaciones RPAS en Colombia',
    body: `
<p>El <strong>SORA</strong> (Specific Operations Risk Assessment) es la metodología desarrollada por <strong>JARUS</strong> (Joint Authorities for Rulemaking on Unmanned Systems) para evaluar de forma sistemática el riesgo de operaciones de aeronaves no tripuladas. Es el estándar adoptado por las autoridades aeronáuticas de más de 50 países, incluyendo Colombia a través de la RAC 100.</p>

<p>Si planeas operaciones fuera de la línea de visión visual (BVLOS), vuelos nocturnos o sobre áreas habitadas, la AeroCivil puede exigirte una evaluación SORA como parte del proceso de autorización especial.</p>

<h2>¿Qué evalúa el SORA?</h2>
<p>El SORA analiza el riesgo desde dos dimensiones:</p>

<h3>Riesgo en tierra (Ground Risk)</h3>
<p>¿Qué probabilidad hay de que la aeronave impacte a personas en tierra en caso de pérdida de control? Depende de:</p>
<ul>
  <li>Área de operación: despoblada, poblada, con concentración de personas</li>
  <li>Tipo de operación: VLOS (línea de visión), BVLOS, sobre aglomeraciones</li>
  <li>Energía cinética de la aeronave (peso × velocidad)</li>
</ul>

<h3>Riesgo en aire (Air Risk)</h3>
<p>¿Qué probabilidad hay de colisión con aeronaves tripuladas? Depende de:</p>
<ul>
  <li>Densidad de tráfico aéreo en el área</li>
  <li>Altitud de operación</li>
  <li>Capacidad de separación y coordinación con ATC</li>
</ul>

<h2>Las categorías de riesgo SORA</h2>
<p>El resultado del SORA se expresa en un <strong>SAIL</strong> (Specific Assurance and Integrity Level) del 1 al 6:</p>
<ul>
  <li><strong>SAIL I-II</strong>: Operaciones de bajo riesgo (VLOS en área despoblada, dron &lt;4 kg). Requisitos mínimos de competencia y equipo.</li>
  <li><strong>SAIL III-IV</strong>: Operaciones de riesgo medio (VLOS en área habitada, BVLOS en área despoblada). Requiere SMS, procedimientos robustos y posiblemente certificación del equipo.</li>
  <li><strong>SAIL V-VI</strong>: Operaciones de alto riesgo (BVLOS sobre áreas habitadas). Requiere certificación formal del RPAS y demostración de redundancias técnicas.</li>
</ul>

<div class="callout info">
  <svg class="callout-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
  <div class="callout-body"><strong>La mayoría de operaciones VLOS comunes quedan en SAIL I-II</strong> Una inspección de infraestructura VLOS en área rural con un drone de 2 kg típicamente resulta en SAIL I o II: requisitos manejables sin certificación especial del equipo. Las operaciones sobre zonas urbanas o BVLOS pueden escalar rápidamente a SAIL III-IV.</div>
</div>

<h2>Pasos para hacer un análisis SORA</h2>
<ol>
  <li><strong>Define el concepto de operación (CONOPS)</strong>: área, altitud, tipo de vuelo, aeronave</li>
  <li><strong>Determina el GRC</strong> (Ground Risk Class) basado en densidad poblacional y tipo de vuelo</li>
  <li><strong>Determina el ARC</strong> (Air Risk Class) basado en el entorno aéreo</li>
  <li><strong>Aplica mitigaciones</strong> para reducir el GRC y ARC</li>
  <li><strong>Determina el SAIL</strong> combinando GRC y ARC mitigados</li>
  <li><strong>Define las OSO</strong> (Operational Safety Objectives) requeridas para ese SAIL</li>
</ol>

<h2>¿Cuándo lo exige la AeroCivil?</h2>
<p>Actualmente, la AeroCivil solicita evidencia de evaluación de riesgo tipo SORA principalmente para:</p>
<ul>
  <li>Solicitudes de autorización de vuelo BVLOS</li>
  <li>Operaciones en áreas controladas (CTR, TMA)</li>
  <li>Vuelos sobre aglomeraciones de personas</li>
  <li>Operaciones nocturnas</li>
</ul>

<h2>SORA en Bitafly</h2>
<p>El módulo SORA de Bitafly guía al operador a través de cada paso del análisis con formularios estructurados, calcula automáticamente el GRC, ARC y SAIL, y genera el documento de evaluación listo para adjuntar a tu solicitud de autorización AeroCivil.</p>
<p>No necesitas ser experto en aviación para completarlo: el sistema explica cada pregunta y sugiere las mitigaciones más comunes para cada escenario.</p>
<p><a href="/registro">Prueba el módulo SORA gratis →</a></p>
`,
  },

  // ─── 6. Software drones Colombia ─────────────────────────────────────────
  {
    slug:            'software-gestion-operadores-drones-colombia-2025',
    title:           'Software para operadores de drones en Colombia: qué necesitas realmente en 2026',
    metaTitle:       'Software Operadores Drones Colombia 2026 | Comparativo | Bitafly',
    metaDescription: 'Qué funcionalidades debe tener un software de gestión para operadores RPAS en Colombia: RAC 100, bitácora, SMS, autorizaciones AeroCivil. Guía 2026.',
    publishedAt:     '2025-05-10',
    updatedAt:       '2026-06-07',
    readingTime:     6,
    category:        'Herramientas',
    keywords:        ['software drones Colombia', 'software gestión UAS', 'plataforma operadores RPAS', 'herramientas operadores drones 2026'],
    excerpt:         'No todo software de drones sirve para el mercado colombiano. La RAC 100 tiene exigencias específicas que la mayoría de plataformas globales no cubren. Te explicamos qué buscar.',
    coverAlt:        'Software de gestión para operadores de drones en Colombia 2026',
    body: `
<p>El mercado de software para operadores de drones creció exponencialmente en los últimos cinco años. Hay plataformas de planificación de vuelo, análisis fotogramétrico, gestión de flotas y cumplimiento normativo. Pero si operas en Colombia, no cualquier herramienta te sirve.</p>

<blockquote class="pullquote">No todo software de gestión de drones sirve para Colombia. La RAC 100 tiene exigencias muy específicas que las plataformas globales simplemente no contemplan.</blockquote>

<p>La <strong>RAC 100</strong> tiene exigencias específicas que la mayoría de plataformas globales simplemente no contemplan: la bitácora de vuelo con todos sus campos, los requisitos del SMS para el mercado colombiano, la integración con los procesos de la AeroCivil y la generación de documentos en español con la nomenclatura de control documental que defina tu manual de operaciones.</p>

<h2>Las 7 funcionalidades que sí necesitas</h2>

<h3>1. Bitácora digital con todos los campos de la RAC 100</h3>
<p>El software debe generar una bitácora con todos los campos que exige la AeroCivil, no una genérica, y permitirte usar el código de formato de tu manual (F-OPS-002 por defecto en Bitafly). Esto incluye: campos de matrícula UAEAC, CPR del piloto, horas de vuelo acumuladas, condición VMC/IMC y firma del jefe de pilotos.</p>

<h3>2. Gestión de certificaciones con alertas de vencimiento</h3>
<p>Los certificados de los pilotos (CPR), seguros de RC y matrículas de aeronaves tienen fechas de vencimiento. Un buen software te alerta antes de que expiren, no después.</p>

<h3>3. Módulo de mantenimiento por horas de vuelo</h3>
<p>El mantenimiento preventivo de RPAS debe programarse por horas de vuelo o ciclos de batería, no por calendario. El software debe sumar horas automáticamente y generar alertas de intervención.</p>

<h3>4. SMS aeronáutico integrado</h3>
<p>El sistema de gestión de seguridad no puede ser un documento Word aislado. Debe estar integrado con las operaciones: formularios de reporte de peligros, registro de incidentes, evaluaciones de riesgo.</p>

<h3>5. Generación de archivos KML para AeroCivil</h3>
<p>Las solicitudes de autorización ante la AeroCivil requieren el área de operación en formato KML (Google Earth). El software debe permitir dibujar el área en un mapa y exportar el archivo directamente.</p>

<h3>6. Reportes listos para auditoría</h3>
<p>Cuando llegue una inspección de la AeroCivil, necesitas poder mostrar todos los registros organizados en minutos, no buscar en carpetas de Drive durante una hora.</p>

<h3>7. Acceso móvil desde el sitio de operación</h3>
<p>Los pilotos registran vuelos desde campo. El software debe funcionar perfectamente desde un celular, sin instalar apps, sin depender de señal perfecta.</p>

<h2>Lo que no necesitas (pero muchos venden)</h2>
<ul>
  <li><strong>Planificación de misiones 3D</strong> — útil para drones de cartografía, pero no para el cumplimiento normativo</li>
  <li><strong>Análisis fotogramétrico</strong> — eso es para el software de procesamiento, no para la gestión operacional</li>
  <li><strong>Integración con drones de terceros en tiempo real</strong> — bonito, pero no requerido por la RAC 100</li>
</ul>

<h2>¿Por qué una plataforma global no es suficiente?</h2>
<p>Herramientas como Airdata UAV o DJI FlightHub 2 son excelentes para lo que hacen, pero no generan el F-OPS-002, no tienen el flujo de autorizaciones de la AeroCivil colombiana, no están en español colombiano y no contemplan los roles específicos de la RAC 100 (jefe de pilotos, gerente SMS, observador).</p>

<h2>Bitafly: diseñado para Colombia desde el primer día</h2>
<p>Bitafly es la única plataforma construida específicamente para la RAC 100. No es una adaptación de un producto global: es una plataforma que nació del contacto directo con operadores UAS colombianos y con los requisitos reales de la AeroCivil.</p>
<p>Incluye todos los módulos descritos arriba, funciona desde cualquier celular o computador, y tiene un plan gratuito sin límite de vuelos para que lo pruebes sin comprometerte.</p>
<p><a href="/precios">Ver planes y precios →</a></p>
<p><a href="/registro">Comenzar gratis — sin tarjeta →</a></p>
`,
  },

  // ─── 7. Formatos AeroCivil ────────────────────────────────────────────────
  {
    slug:            'formatos-aerocivil-drones-colombia',
    title:           'Formatos de control documental RAC 100 para drones: F-OPS-001, F-OPS-002, F-MNT-003 y F-HUM-005',
    metaTitle:       'Formatos Drones RAC 100: F-OPS-001, F-OPS-002, F-MNT-003, F-HUM-005 | Bitafly',
    metaDescription: 'Guía de los registros que exige la RAC 100 a operadores de drones en Colombia. Los códigos de formato no son oficiales: cada operador los define en su manual. Bitafly los genera con tu nomenclatura.',
    publishedAt:     '2025-05-28',
    updatedAt:       '2026-06-07',
    readingTime:     7,
    category:        'Normativa',
    keywords:        ['formato F-OPS-001 aerocivil', 'formato F-OPS-002 aerocivil', 'F-MNT-003 drones', 'F-HUM-005 aerocivil', 'formatos drones Colombia', 'documentos RAC 100'],
    excerpt:         'La RAC 100 exige llevar cuatro registros clave a los operadores UAS en Colombia. La AeroCivil no fija sus códigos de formato: cada operador los define en su manual. Aquí te explicamos qué es cada uno y qué campos debe contener.',
    coverAlt:        'Formatos de control documental RAC 100 para operadores de drones Colombia',
    body: `
<p>Si operas drones comercialmente en Colombia bajo la <strong>RAC 100</strong>, debes conocer cuatro registros clave de tu sistema de gestión documental. No son opcionales: cada auditoría o inspección de la <strong>UAEAC (AeroCivil)</strong> puede solicitarlos, y tenerlos incompletos o desactualizados es una infracción directa.</p>

<div class="callout important">
  <svg class="callout-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
  <div class="callout-body"><strong>Los códigos F-OPS-001, F-OPS-002, F-MNT-003 y F-HUM-005 no son nombres oficiales de la AeroCivil</strong> — son los identificadores que Bitafly usa por defecto en su sistema de control documental. Cada organización puede y debe asignar sus propios códigos en su Manual de Operaciones. Lo que la RAC 100 exige es llevar los registros, no usar nombres específicos.</div>
</div>

<p><strong>Aclaración importante:</strong> los códigos <em>F-OPS-001</em>, <em>F-OPS-002</em>, <em>F-MNT-003</em> y <em>F-HUM-005</em> <strong>no son formatos oficiales de la AeroCivil</strong>. La RAC 100 exige llevar los registros, pero no impone una nomenclatura: cada empresa crea sus propios códigos de control interno en su manual de operaciones. Los códigos que verás aquí son los que Bitafly trae por defecto, y <strong>cada organización puede personalizarlos</strong> para alinearlos con sus manuales.</p>

<p>La buena noticia: Bitafly genera todos estos documentos en PDF con un clic, con los datos de tu operación ya cargados y con el código de formato que tú definas. Aquí te explicamos qué es cada uno.</p>

<h2>F-OPS-001 — Solicitud de Autorización de Vuelo</h2>

<h3>¿Para qué sirve?</h3>
<p>El <strong>F-OPS-001</strong> es el formulario de solicitud de autorización de vuelo que debes presentar ante la AeroCivil antes de realizar operaciones en zonas controladas, áreas restringidas o con cualquier característica especial (BVLOS, nocturnas, sobre aglomeraciones).</p>

<h3>¿Cuándo se requiere?</h3>
<ul>
  <li>Vuelos dentro de zonas de control de tráfico aéreo (CTR o TMA)</li>
  <li>Operaciones en áreas restringidas o zonas de peligro</li>
  <li>Vuelos a más de 400 pies AGL</li>
  <li>Operaciones fuera de la línea de visión visual (BVLOS)</li>
  <li>Vuelos nocturnos o sobre concentraciones de personas</li>
</ul>

<h3>Campos obligatorios del F-OPS-001</h3>
<ul>
  <li>Datos del operador certificado (ESUAS): nombre, NIT, número de certificación</li>
  <li>Aeronave: matrícula UAEAC, número de serie, modelo y fabricante</li>
  <li>Piloto responsable: nombre, número de CPR vigente</li>
  <li>Observador (si aplica): nombre y función</li>
  <li>Área de operación: coordenadas geográficas (WGS-84) o archivo KML</li>
  <li>Altitud máxima de operación (metros AGL)</li>
  <li>Fecha, hora y duración estimada</li>
  <li>Objetivo de la misión</li>
  <li>Póliza de responsabilidad civil: número y vigencia</li>
  <li>Firma del responsable de la operación</li>
</ul>

<p>Bitafly genera el F-OPS-001 pre-llenado con los datos de tu aeronave, piloto y póliza registrados. El área de operación se define en el mapa interactivo y se exporta como KML directamente adjuntable a la solicitud. <a href="/autorizaciones-aerocivil">Ver módulo de autorizaciones →</a></p>

<h2>F-OPS-002 — Maestro de Vuelo (Bitácora)</h2>

<h3>¿Para qué sirve?</h3>
<p>El <strong>F-OPS-002</strong> (código por defecto en Bitafly, editable) es el registro de cada vuelo realizado. Es el documento más consultado en inspecciones: la AeroCivil puede pedir los últimos 12 meses de bitácora en cualquier momento.</p>

<h3>¿Cuándo se diligencia?</h3>
<p>Debe completarse por cada vuelo comercial realizado, sin excepción. No hay plazo mínimo de horas: si el vuelo fue de 10 minutos, debe registrarse igual.</p>

<h3>Campos obligatorios del F-OPS-002</h3>
<ul>
  <li>Fecha, hora de despegue y hora de aterrizaje</li>
  <li>Duración total del vuelo</li>
  <li>Aeronave: matrícula y número de serie</li>
  <li>Horas de vuelo acumuladas (contador Hobbs actualizado)</li>
  <li>Piloto remoto: nombre y número de CPR</li>
  <li>Observador (si aplica)</li>
  <li>Tipo de misión (inspección, cartografía, audiovisual, agricultura, etc.)</li>
  <li>Condición visual: VMC o IMC</li>
  <li>Ubicación de la operación (municipio y coordenadas)</li>
  <li>Estado de la batería al inicio y fin (% o voltaje)</li>
  <li>Incidentes o anomalías detectadas</li>
  <li>Firma del jefe de pilotos</li>
</ul>

<p>Bitafly suma automáticamente las horas acumuladas y genera el PDF del F-OPS-002 en segundos, con el logo de tu empresa y todos los campos requeridos. <a href="/bitacora-digital">Ver bitácora digital →</a></p>

<h2>F-MNT-003 — Registro de Baterías</h2>

<h3>¿Para qué sirve?</h3>
<p>El <strong>F-MNT-003</strong> es el historial de mantenimiento y ciclos de cada batería LiPo de la flota. Permite demostrar que las baterías están dentro de los límites de uso seguros y que reciben mantenimiento preventivo.</p>

<h3>¿Qué se registra?</h3>
<ul>
  <li>Número de serie de cada batería</li>
  <li>Capacidad nominal (mAh) y capacidad actual</li>
  <li>Número de ciclos de carga/descarga acumulados</li>
  <li>Estado: Operativa / En revisión / Retirada de servicio</li>
  <li>Fecha de cada intervención de mantenimiento</li>
  <li>Observaciones por ciclo (inflamación, celdas débiles, etc.)</li>
  <li>Umbral de ciclos para retiro (configurable, habitualmente 200)</li>
</ul>

<p>Bitafly registra los ciclos automáticamente con cada vuelo de la bitácora y alerta cuando una batería se acerca al límite configurado. El PDF del F-MNT-003 se genera al instante. <a href="/mantenimiento-drones">Ver módulo de mantenimiento →</a></p>

<h2>F-HUM-005 — Bitácora de Piloto (Expediente de Tripulante)</h2>

<h3>¿Para qué sirve?</h3>
<p>El <strong>F-HUM-005</strong> es el registro individual de horas de vuelo acumuladas por cada piloto remoto. Sirve para demostrar experiencia, habilitar ascensos de categoría y cumplir los requisitos de renovación del CPR.</p>

<h3>¿Qué contiene?</h3>
<ul>
  <li>Datos del piloto: nombre, número de CPR, fecha de emisión y vencimiento</li>
  <li>Horas de vuelo totales acumuladas</li>
  <li>Desglose por aeronave y tipo de misión</li>
  <li>Historial de entrenamientos y habilitaciones</li>
  <li>Certificaciones adicionales (si aplica)</li>
</ul>

<p>Bitafly mantiene actualizado el F-HUM-005 de cada piloto automáticamente. Cada vuelo registrado en la bitácora suma al totalizador individual del piloto. <a href="/gestion-pilotos">Ver gestión de pilotos →</a></p>

<h2>¿Cómo organizarlos para una auditoría?</h2>
<p>La AeroCivil puede solicitar cualquiera de estos documentos durante una inspección, para un período específico (generalmente los últimos 12 meses). Tenerlos en papel significa buscar en carpetas físicas bajo presión. En Bitafly:</p>
<ol>
  <li>Seleccionas el período</li>
  <li>Eliges el formato (F-OPS-002, F-MNT-003 o F-HUM-005)</li>
  <li>Descargas el PDF con logo corporativo, código de formato y versión</li>
</ol>
<p>En menos de dos minutos tienes el expediente completo listo para presentar.</p>
<p><a href="/reportes-auditoria">Ver módulo de reportes →</a></p>
<p><a href="/registro">Comienza gratis y genera tus primeros formatos →</a></p>
`,
  },

  // ─── 8. Comparativa Bitafly vs AirData ───────────────────────────────────
  {
    slug:            'bitafly-vs-airdata-uav-colombia',
    title:           'Bitafly vs AirData UAV: ¿cuál elegir para operar drones en Colombia?',
    metaTitle:       'Bitafly vs AirData UAV Colombia 2026: Comparativa Completa',
    metaDescription: 'Comparativa directa: Bitafly vs AirData UAV para operadores de drones en Colombia. RAC 100, idioma, precios, bitácora digital y soporte. ¿Cuál cumple la normativa colombiana?',
    publishedAt:     '2025-06-01',
    updatedAt:       '2026-06-07',
    readingTime:     6,
    category:        'Herramientas',
    keywords:        ['bitafly vs airdata', 'alternativa airdata colombia', 'software drones colombia comparativa', 'airdata uav colombia', 'mejor software drones colombia'],
    excerpt:         'AirData es el líder global en gestión de drones — pero fue diseñado para el mercado anglosajón. Comparamos ambas plataformas punto a punto para operadores que deben cumplir la RAC 100 colombiana.',
    coverAlt:        'Comparativa Bitafly vs AirData UAV para operadores de drones en Colombia',
    body: `
<p>Si buscas software para gestionar tu operación de drones en Colombia, es probable que hayas encontrado <strong>AirData UAV</strong>. Es la plataforma líder global, usada por miles de operadores en todo el mundo. Pero ¿es la mejor opción si operas bajo la <strong>RAC 100</strong> colombiana?</p>

<p>En esta comparativa directa analizamos ambas plataformas en los criterios que más importan para operadores en Colombia.</p>

<h2>Resumen rápido</h2>

<div class="callout tip">
  <svg class="callout-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
  <div class="callout-body"><strong>TL;DR</strong> Si operas bajo la RAC 100, necesitas Bitafly para el cumplimiento normativo. AirData es complementario — excelente para análisis avanzado de telemetría pero no reemplaza los formatos colombianos ni la gestión de CPR. Muchos operadores serios usan <em>ambos</em>.</div>
</div>

<p>Si necesitas cumplir la RAC 100 de la AeroCivil, gestionar pilotos con CPR colombiano, generar el F-OPS-002 y el F-MNT-003, y operar todo en español colombiano: <strong>Bitafly es la única opción que cubre todos estos requisitos</strong>. AirData es excelente para análisis de vuelo y telemetría, pero no fue diseñado para la normativa colombiana.</p>

<h2>Comparativa detallada</h2>

<h3>Idioma y localización</h3>
<p><strong>AirData UAV</strong> está completamente en inglés. La interfaz, los reportes, el soporte y la documentación son en inglés (con algunas traducciones automáticas en la app móvil). Para equipos colombianos que no dominan el inglés técnico, esto es una barrera real.</p>
<p><strong>Bitafly</strong> está diseñado para Colombia: interfaz, reportes, soporte y documentación en español colombiano. Los formatos PDF usan la terminología exacta de la AeroCivil (RPAS, ESUAS, CPR, VMC, etc.).</p>

<h3>Cumplimiento RAC 100</h3>
<p><strong>AirData UAV</strong>: No tiene ningún módulo específico para la normativa colombiana. No genera el F-OPS-002, el F-MNT-003 ni el F-HUM-005. No contempla el rol de Jefe de Pilotos, el CPR colombiano ni las autorizaciones de la UAEAC.</p>
<p><strong>Bitafly</strong>: Construido exclusivamente sobre la RAC 100. Genera en PDF los 4 reportes que exige la norma (bitácora, baterías, libro de piloto y solicitud de autorización) con el código de formato que defina tu manual, gestiona CPR con alertas de vencimiento, y tiene roles específicos de la normativa colombiana (Gerente SMS, Jefe de Pilotos, Observador).</p>

<h3>Bitácora de vuelo</h3>
<p><strong>AirData UAV</strong>: Tiene un flight log viewer excelente para analizar telemetría. Puede importar logs de DJI, Autel, Skydio. Pero la "bitácora" es un repositorio de datos de vuelo, no el documento regulatorio colombiano.</p>
<p><strong>Bitafly</strong>: Bitácora digital que genera el F-OPS-002 en PDF con todos los campos de la AeroCivil. También puede importar logs de DJI RC/RC 2 automáticamente. Suma horas acumuladas al contador Hobbs de cada aeronave.</p>

<h3>Gestión de flota</h3>
<p><strong>AirData UAV</strong>: Gestión de múltiples aeronaves con historial de vuelos, alertas de batería y estadísticas. Muy buena para análisis de rendimiento.</p>
<p><strong>Bitafly</strong>: Gestión de flota con matrícula UAEAC, serial, estado operativo, horas de vuelo acumuladas y mantenimiento programado (alertas a 200 h o 6 meses). Genera el F-MNT-003 para las baterías.</p>

<h3>SMS aeronáutico</h3>
<p><strong>AirData UAV</strong>: No tiene módulo de SMS aeronáutico. No hay gestión de incidentes, clasificación RAC 100, ni reportes de seguridad operacional.</p>
<p><strong>Bitafly</strong>: Módulo SMS completo con clasificación de incidentes (Incidente / Incidente Grave / Accidente), narrativa, acciones correctivas y generación de reportes para auditoría AeroCivil.</p>

<h3>Autorizaciones de vuelo</h3>
<p><strong>AirData UAV</strong>: Tiene integración con airspace providers (Aloft, DroneZone en EE.UU.). Sin integración con el portal de la AeroCivil colombiana.</p>
<p><strong>Bitafly</strong>: Genera el F-OPS-001 (Solicitud de Autorización) con mapa interactivo para definir el área KML, exporta el archivo para adjuntar al portal AeroCivil.</p>

<h3>Precio</h3>
<p><strong>AirData UAV</strong>: Plan gratuito limitado. Plan Pro desde $11,99 USD/mes. Business desde $27,99 USD/mes. Cobrado en dólares, sin opción en pesos colombianos.</p>
<p><strong>Bitafly</strong>: Plan Piloto desde $19.900 COP/mes. Cobrado a través de ePayco en pesos colombianos. Acepta PSE y tarjetas nacionales.</p>

<h3>Soporte</h3>
<p><strong>AirData UAV</strong>: Soporte en inglés vía email y comunidad. Respuesta en horas o días hábiles según el plan.</p>
<p><strong>Bitafly</strong>: Soporte en español por WhatsApp y email. Equipo en Colombia, zona horaria local (UTC-5).</p>

<h2>¿Cuándo usar cada uno?</h2>

<h3>Elige AirData si:</h3>
<ul>
  <li>Tu operación es internacional o en el mercado anglosajón</li>
  <li>Necesitas análisis avanzado de telemetría y logs de vuelo</li>
  <li>No tienes obligación de cumplir la RAC 100 colombiana</li>
  <li>Tu equipo trabaja cómodamente en inglés</li>
</ul>

<h3>Elige Bitafly si:</h3>
<ul>
  <li>Operas comercialmente en Colombia bajo la RAC 100</li>
  <li>Necesitas el F-OPS-002, F-MNT-003, F-HUM-005 y F-OPS-001 en PDF</li>
  <li>Quieres gestión de CPR, SMS aeronáutico y autorizaciones AeroCivil</li>
  <li>Prefieres soporte en español y pago en pesos colombianos</li>
</ul>

<p><strong>Nota:</strong> Algunas operaciones usan ambas plataformas complementariamente — AirData para análisis de telemetría y Bitafly para el cumplimiento regulatorio colombiano.</p>
<p><a href="/precios">Ver planes de Bitafly →</a></p>
<p><a href="/registro">Comenzar gratis — sin tarjeta →</a></p>
`,
  },

  // ─── 9. Checklist de vuelo RAC 100 ───────────────────────────────────────
  {
    slug:            'checklist-vuelo-drones-rac-100-colombia',
    title:           'Checklist de vuelo para drones RAC 100: todo lo que debes verificar antes de despegar',
    metaTitle:       'Checklist Vuelo Drones RAC 100 Colombia 2026 | Bitafly',
    metaDescription: 'Checklist completo de pre-vuelo para operadores de drones en Colombia bajo la RAC 100: documentos, aeronave, batería, espacio aéreo y tripulación. Descargable.',
    publishedAt:     '2025-06-01',
    updatedAt:       '2026-06-07',
    readingTime:     5,
    category:        'Operaciones',
    keywords:        ['checklist vuelo drones colombia', 'pre-vuelo drones RAC 100', 'lista verificación drones colombia', 'checklist RPAS aerocivil', 'pre-flight drones colombia'],
    excerpt:         'Un checklist de pre-vuelo completo es la diferencia entre una operación segura y un incidente reportable. Aquí está la lista que todo operador RAC 100 debe revisar antes de cada misión.',
    coverAlt:        'Checklist de pre-vuelo para drones RAC 100 Colombia',
    body: `
<p>La <strong>RAC 100</strong> exige que cada operación de drones siga procedimientos documentados de pre-vuelo. Un checklist no es solo un requisito normativo — es la herramienta que previene accidentes, protege tu certificación y demuestra profesionalismo ante clientes y autoridades.</p>

<p>Esta lista cubre todos los puntos críticos que debe verificar un operador antes de despegar en Colombia.</p>

<div class="callout warning">
  <svg class="callout-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
  <div class="callout-body"><strong>El checklist no es opcional</strong> En caso de accidente o incidente, la AeroCivil revisará si se ejecutó un protocolo de pre-vuelo documentado. Si no hay evidencia de la verificación, la responsabilidad del operador aumenta significativamente. Bitafly registra cada ítem del checklist junto con la bitácora del vuelo.</div>
</div>

<h2>1. Documentación obligatoria</h2>
<p>Antes de salir al campo, confirma que tienes disponibles o accesibles:</p>
<ul>
  <li>✅ <strong>Matrícula UAEAC</strong> de la aeronave (digital o física en el RPAS)</li>
  <li>✅ <strong>Certificado del Piloto Remoto (CPR)</strong> vigente — verificar fecha de vencimiento</li>
  <li>✅ <strong>Póliza de responsabilidad civil</strong> vigente — verificar cobertura mínima según peso del RPAS</li>
  <li>✅ <strong>Autorización de vuelo F-OPS-001</strong> (si aplica para la zona o tipo de operación)</li>
  <li>✅ <strong>Manual de Operaciones</strong> del ESUAS (debe estar disponible durante la operación)</li>
  <li>✅ <strong>Bitácora de vuelo</strong> (Bitafly abierto y listo para registrar)</li>
</ul>

<h2>2. Verificación del espacio aéreo</h2>
<ul>
  <li>✅ Consultar <strong>NOTAMs activos</strong> en la zona (portal AIS Colombia)</li>
  <li>✅ Verificar si la zona está dentro de un <strong>CTR, TMA o área restringida</strong></li>
  <li>✅ Confirmar <strong>altitud máxima permitida</strong> (400 pies AGL salvo autorización)</li>
  <li>✅ Verificar <strong>actividad de aeronaves tripuladas</strong> en la zona (avisos a ATC si aplica)</li>
  <li>✅ Revisar <strong>pronóstico meteorológico</strong> — vientos, visibilidad, precipitación</li>
</ul>

<h2>3. Condiciones meteorológicas en sitio</h2>
<ul>
  <li>✅ Velocidad del viento &lt; límite del fabricante (normalmente 12 m/s para drones DJI)</li>
  <li>✅ Visibilidad &gt; 3 km para operación VLOS</li>
  <li>✅ Sin precipitación activa ni amenaza en los próximos 30 minutos</li>
  <li>✅ Temperatura dentro del rango operativo de la aeronave y las baterías</li>
  <li>✅ Anotar condición meteorológica: VMC o IMC para la bitácora</li>
</ul>

<h2>4. Aeronave — inspección física</h2>
<ul>
  <li>✅ <strong>Hélices</strong>: sin grietas, chips ni deformaciones — montar correctamente (CW/CCW en los motores correctos)</li>
  <li>✅ <strong>Motores</strong>: girar manualmente — deben moverse suave y sin ruido</li>
  <li>✅ <strong>Brazos y estructura</strong>: sin daños visibles, tornillos ajustados</li>
  <li>✅ <strong>Cámara / gimbal</strong>: libre de movimiento, lente sin suciedad</li>
  <li>✅ <strong>GPS / antenas</strong>: sin obstrucciones, conectores seguros</li>
  <li>✅ <strong>Matrícula UAEAC</strong> visible y legible en la aeronave</li>
</ul>

<h2>5. Batería</h2>
<ul>
  <li>✅ <strong>Nivel de carga &gt; 90%</strong> para vuelos de duración normal</li>
  <li>✅ Sin daños físicos, sin inflamación, sin calor excesivo al tacto</li>
  <li>✅ Ciclos de carga <strong>dentro del límite configurado</strong> (normalmente &lt; 200 ciclos)</li>
  <li>✅ Temperatura de la batería &gt; 15°C antes del despegue (baterías LiPo pierden capacidad en frío)</li>
  <li>✅ Registrar nivel inicial en la bitácora (% o voltaje por celda)</li>
</ul>

<h2>6. Controlador remoto (RC)</h2>
<ul>
  <li>✅ Batería del RC cargada (&gt; 50% mínimo)</li>
  <li>✅ Señal de video y telemetría estable antes de armar</li>
  <li>✅ Modos de vuelo configurados correctamente (GPS, ATTI, Sport según necesidad)</li>
  <li>✅ Return to Home (RTH) configurado — altitud segura para el entorno</li>
  <li>✅ Verificar enlace de control: sin interferencias, señal &gt; -70 dBm</li>
</ul>

<h2>7. Área de operación</h2>
<ul>
  <li>✅ <strong>Punto de despegue seguro</strong>: superficie nivelada, sin obstáculos en radio de 5 m</li>
  <li>✅ <strong>Perímetro seguro</strong>: personas no autorizadas fuera del área de operación</li>
  <li>✅ <strong>Obstáculos identificados</strong>: cables, antenas, árboles, edificios dentro del radio de vuelo</li>
  <li>✅ <strong>Señalización</strong> (si aplica para operaciones en zonas públicas)</li>
  <li>✅ <strong>Coordinar con el observador</strong> (si la operación requiere uno)</li>
</ul>

<h2>8. Verificación final antes de armar</h2>
<ul>
  <li>✅ Calibración de brújula (si el sitio es nuevo o hay interferencias magnéticas)</li>
  <li>✅ <strong>Satélites GPS &gt; 8</strong> (DJI recomienda mínimo 8 para vuelo seguro)</li>
  <li>✅ Modo de vuelo confirmado en la app del RC</li>
  <li>✅ Área de operación despejada — confirmación verbal con el observador si aplica</li>
  <li>✅ <strong>Hora de despegue registrada</strong> en la bitácora</li>
</ul>

<h2>Post-vuelo: no olvides</h2>
<ul>
  <li>✅ Registrar <strong>hora de aterrizaje</strong> y duración total del vuelo</li>
  <li>✅ Nivel de batería al final</li>
  <li>✅ Incidentes o anomalías observadas (reportar al SMS si aplica)</li>
  <li>✅ Estado de la aeronave al finalizar (daños, desgaste de hélices)</li>
  <li>✅ <strong>Generar el F-OPS-002</strong> antes de salir del sitio</li>
</ul>

<h2>Usa Bitafly para automatizar el checklist</h2>
<p>Bitafly tiene el checklist de pre-vuelo integrado en el flujo de registro de vuelo. Marca cada ítem directamente desde el celular antes de armar la aeronave, y el sistema guarda el registro junto con la bitácora del vuelo. Al terminar, genera el F-OPS-002 con todos los datos del vuelo en PDF.</p>
<p><a href="/bitacora-digital">Ver bitácora digital →</a></p>
<p><a href="/registro">Comenzar gratis →</a></p>
`,
  },

  // ─── 10. Gestión de flota de drones Colombia ──────────────────────────────
  {
    slug:            'gestion-flota-drones-colombia',
    title:           'Cómo gestionar una flota de drones en Colombia: guía para operadores profesionales',
    metaTitle:       'Gestión de Flota de Drones Colombia | Guía para Operadores UAS | Bitafly',
    metaDescription: 'Guía completa para gestionar una flota de drones en Colombia: matrículas UAEAC, mantenimiento programado, horas de vuelo y cumplimiento RAC 100. Para ESUAS certificados.',
    publishedAt:     '2025-06-01',
    updatedAt:       '2026-06-07',
    readingTime:     6,
    category:        'Operaciones',
    keywords:        ['gestión flota drones colombia', 'administración flota RPAS', 'mantenimiento flota drones colombia', 'software flota UAS colombia', 'ESUAS flota drones'],
    excerpt:         'Gestionar más de un drone en Colombia implica mucho más que tener varios equipos: matrículas individuales, mantenimiento por horas, certificaciones de pilotos y cumplimiento RAC 100 para cada aeronave.',
    coverAlt:        'Gestión de flota de drones en Colombia para operadores UAS',
    body: `
<p>Pasar de operar un solo drone a gestionar una flota es un salto operacional significativo. Cada aeronave adicional multiplica las obligaciones: matrícula propia, contador de horas independiente, mantenimiento diferenciado, seguro específico. Y todo debe quedar documentado según la <strong>RAC 100</strong> para cualquier auditoría de la AeroCivil.</p>

<div class="stats-row">
  <div class="stat-item"><div class="num">200 h</div><div class="lbl">Límite mantenimiento preventivo mayor</div></div>
  <div class="stat-item"><div class="num">6 meses</div><div class="lbl">Límite por calendario (lo primero)</div></div>
  <div class="stat-item"><div class="num">200</div><div class="lbl">Ciclos típicos de retiro de baterías</div></div>
</div>

<p>Esta guía está dirigida a <strong>Explotadores de Sistemas UAS (ESUAS)</strong> certificados o en proceso de certificación que operan múltiples aeronaves en Colombia.</p>

<h2>¿Qué implica tener una flota de drones en Colombia?</h2>
<p>Desde el punto de vista normativo, cada aeronave de la flota debe tener:</p>
<ul>
  <li><strong>Matrícula UAEAC individual</strong>: número único asignado por la AeroCivil al registrar el RPAS en SIRAC</li>
  <li><strong>Historial de horas de vuelo</strong>: contador independiente por aeronave (Hobbs)</li>
  <li><strong>Registro de mantenimiento</strong>: intervenciones preventivas y correctivas documentadas (F-MNT-003 para baterías)</li>
  <li><strong>Seguro de RC propio</strong>: la póliza de responsabilidad civil debe cubrir cada aeronave operada</li>
</ul>

<h2>Los 5 pilares de una gestión de flota profesional</h2>

<h3>1. Inventario centralizado</h3>
<p>El primer problema de una flota sin software es el inventario disperso: cada aeronave en una hoja diferente, baterías sin identificar, seriales en fotos de WhatsApp. Esto crea confusión, dificulta las auditorías y genera errores en la bitácora.</p>
<p>Un inventario centralizado por aeronave debe incluir: matrícula UAEAC, número de serie del fabricante, modelo, fabricante, fecha de adquisición, peso de despegue, estado operativo y observaciones de mantenimiento.</p>

<h3>2. Control de horas de vuelo por aeronave</h3>
<p>La RAC 100 exige que el mantenimiento preventivo se realice cada 200 horas de vuelo acumuladas o cada 6 meses, lo que ocurra primero. Para calcular esto correctamente, cada vuelo debe registrarse en la bitácora y sumarse al contador de cada aeronave específica.</p>
<p>Un error común: usar el contador de horas del controlador DJI, que no es un documento válido para la AeroCivil y puede ser reseteado involuntariamente.</p>

<h3>3. Mantenimiento programado</h3>
<p>Las aeronaves de una flota profesional deben tener un calendario de mantenimiento que considere:</p>
<ul>
  <li><strong>Preventivo mayor</strong>: cada 200 h de vuelo — revisión de motores, ESC, estructura, firmware</li>
  <li><strong>Preventivo menor</strong>: cada 50 h — hélices, contactos de batería, calibraciones</li>
  <li><strong>Por eventos</strong>: después de un impacto, aterrizaje de emergencia o anomalía registrada</li>
  <li><strong>Baterías</strong>: ciclos de carga acumulados (umbral configurable, típicamente 200 ciclos)</li>
</ul>

<h3>4. Gestión de baterías por ciclos</h3>
<p>Las baterías LiPo son el componente más crítico y de menor vida útil de la flota. Una batería degradada puede causar pérdidas de potencia inesperadas. La gestión correcta implica:</p>
<ul>
  <li>Número de serie identificado en cada batería (sticker o grabado)</li>
  <li>Registro de ciclos de carga/descarga acumulados (F-MNT-003)</li>
  <li>Control de capacidad nominal vs. capacidad actual</li>
  <li>Criterio claro de retiro de servicio (ciclos o degradación de capacidad)</li>
</ul>

<h3>5. Asignación de aeronaves a operaciones</h3>
<p>En flotas con múltiples aeronaves y múltiples pilotos, la asignación debe ser explícita: qué aeronave vuela qué piloto en qué operación. Esto evita errores en la bitácora y permite trazabilidad completa para auditorías.</p>

<h2>Errores comunes en la gestión de flotas</h2>

<h3>Confundir los contadores de horas</h3>
<p>Si tienes tres drones del mismo modelo, es fácil anotar las horas de uno en la bitácora de otro. Con un sistema digital, la aeronave se selecciona al inicio del vuelo y las horas suman automáticamente al contador correcto.</p>

<h3>Baterías sin identificar</h3>
<p>Las baterías de un mismo modelo son intercambiables físicamente, pero sus ciclos son individuales. Sin identificación única y registro individual, es imposible saber cuándo debe retirarse cada una.</p>

<h3>Mantenimiento basado en calendario, no en horas</h3>
<p>Una aeronave que vuela 5 horas al mes necesita mantenimiento cada 40 meses por horas — pero la RAC 100 exige también el límite de 6 meses por calendario. El criterio correcto es "lo que ocurra primero", no solo uno de los dos.</p>

<div class="callout warning">
  <svg class="callout-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
  <div class="callout-body"><strong>Error crítico en flotas</strong> No confundas el contador de horas de la app del controlador DJI con el contador de horas de la AeroCivil. El contador DJI puede resetearse y no es el documento oficial. El contador válido es el que lleva la bitácora de vuelo acumulada por aeronave — que Bitafly mantiene automáticamente.</div>
</div>

<h2>Software de gestión de flota para Colombia</h2>
<p>Bitafly centraliza el inventario de tu flota, suma horas de vuelo automáticamente por aeronave con cada registro en la bitácora, alerta cuando se acerca el umbral de mantenimiento (200 h o 6 meses), y genera el F-MNT-003 de baterías en PDF.</p>
<p>El módulo de flota es ilimitado en número de aeronaves en el plan Flota y Enterprise. En el plan Escuadrilla soporta hasta 3 aeronaves.</p>
<p><a href="/gestion-flota-drones">Ver módulo de flota →</a></p>
<p><a href="/mantenimiento-drones">Ver módulo de mantenimiento →</a></p>
<p><a href="/registro">Comenzar gratis →</a></p>
`,
  },

  // ─── 11. Replay GPS de vuelo ──────────────────────────────────────────────
  {
    slug:            'replay-gps-analizar-vuelos-drone',
    title:           'Cómo analizar tus vuelos con el replay GPS: reproduce la operación cuadro a cuadro',
    metaTitle:       'Replay GPS de Vuelo para Drones: Analiza tus Operaciones | Bitafly',
    metaDescription: 'Aprende a reproducir tus vuelos de drone cuadro a cuadro con el replay GPS: ruta, altitud, velocidad, batería y joysticks del DJI RC/RC 2. Para análisis, capacitación e investigación de incidentes.',
    publishedAt:     '2026-06-08',
    updatedAt:       '2026-06-08',
    readingTime:     6,
    category:        'Operaciones',
    keywords:        ['replay GPS drones', 'análisis de vuelo drone', 'telemetría DJI', 'reproducción de vuelo', 'investigación de incidentes UAS', 'capacitación pilotos drone'],
    excerpt:         'El replay GPS reconstruye tu vuelo sobre el mapa con toda la telemetría sincronizada. Es una de las herramientas más potentes para analizar la operación, capacitar pilotos e investigar incidentes. Aquí te mostramos cómo aprovecharla.',
    coverAlt:        'Replay GPS de vuelo de drone sobre el mapa con telemetría',
    body: `
<p>Registrar un vuelo en la bitácora te dice <em>qué</em> voló: aeronave, piloto, duración, batería. Pero no te dice <em>cómo</em> voló. Para eso existe el <strong>replay GPS</strong>: la reproducción animada de la operación, dibujada sobre el mapa con toda la telemetría sincronizada en el tiempo.</p>

<p>Es, posiblemente, la herramienta que más rápido convence a un operador de que el papel se quedó corto. En este artículo te explicamos qué reconstruye, cómo generarlo desde tu control DJI y para qué lo usan los operadores serios en Colombia.</p>

<h2>¿Qué es el replay GPS de vuelo?</h2>
<p>El replay toma el registro de telemetría que tu dron y tu control guardan durante el vuelo y lo convierte en una reproducción navegable. Puedes avanzar, pausar y retroceder la operación cuadro a cuadro y ver, en cada instante:</p>
<ul>
  <li><strong>La ruta GPS</strong> sobre el mapa, con el punto de despegue y la posición del dron en movimiento</li>
  <li><strong>La altitud</strong> a la que volaba en ese momento</li>
  <li><strong>La velocidad</strong> horizontal y la <strong>distancia</strong> acumulada</li>
  <li><strong>El nivel de batería</strong> sincronizado con la ruta</li>
  <li><strong>Los joysticks del control</strong> (DJI RC/RC 2): qué movimientos hizo el piloto en cada maniobra</li>
</ul>
<p>No es un mapa estático ni una captura: es el vuelo entero, reproducible. <a href="/replay-gps-drones">Conoce el módulo de replay GPS →</a></p>

<div class="callout tip">
  <svg class="callout-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
  <div class="callout-body"><strong>Compatible con DJI RC y RC 2</strong> El replay de Bitafly reconstruye los joysticks del piloto cuando el log proviene de un <strong>DJI RC o RC 2</strong> (los controladores con pantalla integrada). Los logs de la app DJI Fly desde smartphone no incluyen los movimientos del joystick pero sí toda la telemetría de la aeronave.</div>
</div>

<h2>Cómo generar el replay desde tu control DJI</h2>
<p>En Bitafly el replay se reconstruye a partir del archivo <code>.txt</code> que tu controlador DJI guarda en la carpeta <strong>FlightRecord</strong>. El procesamiento ocurre en tu propio navegador, así que no necesitas instalar ningún software de escritorio.</p>
<ol>
  <li><strong>Copia el registro del control.</strong> Conecta tu DJI RC o RC 2 al computador y copia la carpeta <em>FlightRecord</em> (o el archivo <code>.txt</code> del vuelo).</li>
  <li><strong>Súbelo desde la bitácora.</strong> En el vuelo ya registrado, pulsa el botón de <em>Replay</em> y arrastra el archivo. Bitafly lo procesa en segundos.</li>
  <li><strong>Reproduce y analiza.</strong> Usa la línea de tiempo para recorrer el vuelo y revisar cada variable en el momento exacto.</li>
</ol>
<p>El replay queda vinculado a su vuelo en la bitácora, de modo que tu expediente operacional —registro + reconstrucción— vive en un solo lugar.</p>

<h2>Cuatro formas de sacarle provecho</h2>

<h3>1. Investigación de incidentes</h3>
<p>Cuando algo sale mal, los recuerdos del piloto no bastan. El replay reconstruye objetivamente la altura, la velocidad, el consumo de batería y las maniobras justo antes del evento. Es la base ideal para un reporte de tu <a href="/sms-aeronautico">SMS aeronáutico</a>: documentas lo que <em>realmente</em> pasó, no lo que se supone que pasó.</p>

<h3>2. Capacitación de pilotos</h3>
<p>Revisar los vuelos con el equipo, viendo los movimientos de los joysticks sobre la trayectoria real, convierte cada operación en material de entrenamiento. Se corrige técnica sobre evidencia, no sobre opiniones.</p>

<h3>3. Verificación de cumplimiento</h3>
<p>¿La operación se mantuvo dentro de la zona y la altitud autorizadas? El replay lo muestra. Antes de reportar a la AeroCivil o de cerrar un trabajo, puedes confirmar que el vuelo respetó los límites de la autorización.</p>

<h3>4. Reporte al cliente</h3>
<p>Mostrar el área efectivamente cubierta y la ejecución del vuelo con una reproducción visual transmite profesionalismo. Es un diferenciador comercial que pocas operaciones ofrecen.</p>

<h2>¿Cuánto tiempo se guardan los replays?</h2>
<p>Los replays se almacenan cifrados en la nube y se sirven con enlaces firmados temporales. La cantidad y el tiempo de retención dependen del plan:</p>
<ul>
  <li><strong>Piloto:</strong> 10 replays · 30 días</li>
  <li><strong>Escuadrilla:</strong> 50 replays · 90 días</li>
  <li><strong>Flota:</strong> 200 replays · 180 días</li>
  <li><strong>Enterprise:</strong> ilimitados · permanente</li>
</ul>
<p>La limpieza de los replays vencidos es automática, así no acumulas archivos que ya no necesitas.</p>

<h2>El replay empieza en la bitácora</h2>
<p>Como el replay se vincula al vuelo registrado, todo arranca con una buena <a href="/bitacora-digital">bitácora digital</a>: registras la operación, importas el log del DJI y obtienes la reconstrucción. Registro y análisis, en el mismo flujo.</p>
<p><a href="/replay-gps-drones">Ver el módulo de replay GPS →</a></p>
<p><a href="/registro">Comienza gratis y reproduce tu primer vuelo →</a></p>
`,
  },

  // ─── 12. CDO Certificado Explotador UAS ──────────────────────────────────
  {
    slug:            'cdo-certificado-explotador-uas-colombia',
    title:           'CDO: qué es el Certificado de Explotador UAS y cómo obtenerlo en Colombia',
    metaTitle:       'CDO Certificado Explotador UAS Colombia 2026 | Guía AeroCivil | Bitafly',
    metaDescription: 'Todo sobre el Certificado de Explotador UAS (CDO) exigido por AeroCivil desde mayo 2025. Requisitos, pasos, documentos y cuánto tarda el proceso en Colombia.',
    publishedAt:     '2026-06-10',
    updatedAt:       '2026-06-10',
    readingTime:     8,
    category:        'Trámites',
    keywords:        ['CDO aerocivil drones', 'certificado explotador UAS colombia', 'habilitacion operador drones aerocivil', 'RAC 100 certificacion empresa drones', 'ESUAS colombia'],
    excerpt:         'Desde mayo de 2025, operar drones comercialmente en Colombia sin el CDO (Certificado de Explotador UAS) es ilegal. Te explicamos qué es, quién lo necesita y cómo tramitarlo ante AeroCivil paso a paso.',
    coverAlt:        'Certificado de Explotador UAS CDO AeroCivil Colombia RAC 100',
    body: `
<p>Desde el <strong>1 de mayo de 2025</strong>, la <strong>UAEAC (AeroCivil)</strong> exige que todos los operadores de drones comerciales en Colombia en la <em>categoría específica</em> cuenten con el <strong>CDO: Certificado de Explotador UAS</strong>. Sin este certificado, cualquier operación comercial es irregular y puede resultar en multas, suspensión o inmovilización de equipos.</p>

<div class="callout important">
  <svg class="callout-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
  <div class="callout-body"><strong>Obligatorio desde el 1 de mayo de 2025</strong> Si operas drones comercialmente sin el CDO, tu operación es irregular ante la AeroCivil. Esto no solo expone al operador a sanciones: también invalida tu seguro de RC en caso de accidente, ya que la operación fue ilegal desde el inicio.</div>
</div>

<p>Si tienes una empresa que usa drones para inspección, topografía, agricultura, filmación u otro servicio, esto te aplica directamente. Aquí te explicamos todo lo que necesitas saber.</p>

<!-- IMAGEN: Diagrama proceso CDO -->
<figure style="margin:2rem 0;text-align:center;">
<svg viewBox="0 0 760 220" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;border-radius:16px;background:#f8fafc;">
  <defs>
    <marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
      <path d="M0,0 L0,6 L8,3 z" fill="#94a3b8"/>
    </marker>
  </defs>
  <!-- Paso 1 -->
  <rect x="20" y="70" width="120" height="80" rx="12" fill="#fff7ed" stroke="#ec5b13" stroke-width="1.5"/>
  <text x="80" y="100" text-anchor="middle" font-size="11" font-weight="700" fill="#ec5b13">PASO 1</text>
  <text x="80" y="116" text-anchor="middle" font-size="10" fill="#475569">Reúne</text>
  <text x="80" y="130" text-anchor="middle" font-size="10" fill="#475569">documentos</text>
  <!-- Flecha -->
  <line x1="140" y1="110" x2="168" y2="110" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#arr)"/>
  <!-- Paso 2 -->
  <rect x="170" y="70" width="120" height="80" rx="12" fill="#fff7ed" stroke="#ec5b13" stroke-width="1.5"/>
  <text x="230" y="100" text-anchor="middle" font-size="11" font-weight="700" fill="#ec5b13">PASO 2</text>
  <text x="230" y="116" text-anchor="middle" font-size="10" fill="#475569">Solicitud</text>
  <text x="230" y="130" text-anchor="middle" font-size="10" fill="#475569">SGDEA</text>
  <!-- Flecha -->
  <line x1="290" y1="110" x2="318" y2="110" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#arr)"/>
  <!-- Paso 3 -->
  <rect x="320" y="70" width="120" height="80" rx="12" fill="#fff7ed" stroke="#ec5b13" stroke-width="1.5"/>
  <text x="380" y="100" text-anchor="middle" font-size="11" font-weight="700" fill="#ec5b13">PASO 3</text>
  <text x="380" y="116" text-anchor="middle" font-size="10" fill="#475569">Inspección</text>
  <text x="380" y="130" text-anchor="middle" font-size="10" fill="#475569">AeroCivil</text>
  <!-- Flecha -->
  <line x1="440" y1="110" x2="468" y2="110" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#arr)"/>
  <!-- Paso 4 -->
  <rect x="470" y="70" width="120" height="80" rx="12" fill="#fff7ed" stroke="#ec5b13" stroke-width="1.5"/>
  <text x="530" y="100" text-anchor="middle" font-size="11" font-weight="700" fill="#ec5b13">PASO 4</text>
  <text x="530" y="116" text-anchor="middle" font-size="10" fill="#475569">Emisión</text>
  <text x="530" y="130" text-anchor="middle" font-size="10" fill="#475569">CDO (5 años)</text>
  <!-- Flecha -->
  <line x1="590" y1="110" x2="618" y2="110" stroke="#94a3b8" stroke-width="1.5" marker-end="url(#arr)"/>
  <!-- Paso 5 -->
  <rect x="620" y="70" width="120" height="80" rx="12" fill="#f0fdf4" stroke="#22c55e" stroke-width="1.5"/>
  <text x="680" y="100" text-anchor="middle" font-size="11" font-weight="700" fill="#16a34a">LISTO</text>
  <text x="680" y="116" text-anchor="middle" font-size="10" fill="#475569">Operar</text>
  <text x="680" y="130" text-anchor="middle" font-size="10" fill="#475569">legalmente ✅</text>
  <!-- Título -->
  <text x="380" y="30" text-anchor="middle" font-size="13" font-weight="800" fill="#1A202C">Proceso para obtener el CDO ante AeroCivil</text>
  <text x="380" y="48" text-anchor="middle" font-size="10" fill="#94a3b8">Categoría Específica — RAC 100 Colombia</text>
</svg>
<figcaption style="font-size:12px;color:#94a3b8;margin-top:8px;">Proceso simplificado para obtener el Certificado de Explotador UAS (CDO) ante la UAEAC.</figcaption>
</figure>

<h2>¿Qué es el CDO?</h2>
<p>El <strong>CDO (Certificado de Explotador UAS)</strong> es el documento oficial emitido por la <strong>UAEAC</strong> que acredita que una organización o persona natural cumple con todos los requisitos técnicos, operacionales y de seguridad para explotar sistemas de aeronaves no tripuladas en la <em>categoría específica</em> de la RAC 100.</p>

<p>Antes del RAC 100, el sistema era más informal: bastaba con registrarse como explotador ante AeroCivil. Con el nuevo reglamento, la habilitación implica una evaluación real de tus capacidades operacionales, tu manual de operaciones y tu sistema de gestión de seguridad.</p>

<p>El CDO tiene una <strong>vigencia de 5 años</strong> y debe renovarse antes de su vencimiento.</p>

<h2>¿Quién necesita el CDO?</h2>
<p>Debes tramitar el CDO si:</p>
<ul>
  <li>Operas drones con fines <strong>comerciales o industriales</strong> (inspección, cartografía, filmación, agricultura, seguridad)</li>
  <li>Tu RPAS tiene un <strong>peso de despegue superior a los límites de la categoría abierta</strong> (generalmente más de 25 kg o con características especiales)</li>
  <li>Realizas operaciones <strong>fuera de la línea visual (BVLOS)</strong>, nocturnas o sobre aglomeraciones</li>
  <li>Eres una empresa que presta <strong>servicios UAS a terceros</strong></li>
</ul>

<p>No necesitas CDO si solo operas en la <em>categoría abierta</em> (vuelos recreativos o comerciales de bajo riesgo con drones ligeros en zonas no restringidas), aunque sí debes registrar el RPAS.</p>

<h2>Requisitos para obtener el CDO</h2>

<h3>1. Manual de Operaciones (MO)</h3>
<p>Documento que describe cómo opera tu organización: procedimientos normales y de emergencia, gestión de riesgos, responsabilidades, protocolos de comunicación y lista de personal. AeroCivil lo revisa en detalle.</p>

<h3>2. Pilotos certificados con CPR vigente</h3>
<p>Debes contar con al menos un <strong>Piloto Remoto Certificado (CPR)</strong> emitido por una Organización de Entrenamiento Aprobada (OEA) reconocida por la UAEAC.</p>

<h3>3. Aeronaves registradas con matrícula UAEAC</h3>
<p>Cada RPAS que operes debe estar matriculado en el <strong>portal SIRAC</strong> con sus datos técnicos, número de serie y datos del propietario.</p>

<h3>4. Sistema de Gestión de Seguridad (SMS)</h3>
<p>Para operaciones de mayor complejidad, debes tener implementado un SMS aeronáutico: identificación de peligros, análisis de riesgos, acciones correctivas y registros de incidentes. <a href="/aeronautico">El módulo SMS de Bitafly te ayuda a implementarlo →</a></p>

<h3>5. Seguro de responsabilidad civil extracontractual</h3>
<p>Póliza vigente que cubra daños a terceros durante las operaciones. El monto mínimo varía según el peso máximo de despegue del RPAS.</p>

<h3>6. Bitácora de vuelo al día</h3>
<p>Demostrar que llevas registro de todos tus vuelos. <a href="/bitacora-digital">Bitafly genera la bitácora RAC 100 automáticamente →</a></p>

<!-- IMAGEN: Tabla de documentos -->
<figure style="margin:2rem 0;">
<svg viewBox="0 0 700 280" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;border-radius:16px;background:#fff;border:1.5px solid #f1f5f9;">
  <text x="350" y="30" text-anchor="middle" font-size="13" font-weight="800" fill="#1A202C">Documentos requeridos para el CDO</text>
  <!-- Filas -->
  <rect x="20" y="45" width="660" height="36" rx="8" fill="#f8fafc"/>
  <text x="44" y="68" font-size="11" fill="#ec5b13" font-weight="700">📄</text>
  <text x="64" y="68" font-size="11" fill="#1A202C" font-weight="600">Manual de Operaciones (MO)</text>
  <text x="500" y="68" font-size="10" fill="#22c55e" font-weight="700">Obligatorio</text>

  <rect x="20" y="85" width="660" height="36" rx="8" fill="#fff"/>
  <text x="44" y="108" font-size="11" fill="#ec5b13" font-weight="700">👤</text>
  <text x="64" y="108" font-size="11" fill="#1A202C" font-weight="600">Certificados CPR de pilotos vigentes</text>
  <text x="500" y="108" font-size="10" fill="#22c55e" font-weight="700">Obligatorio</text>

  <rect x="20" y="125" width="660" height="36" rx="8" fill="#f8fafc"/>
  <text x="44" y="148" font-size="11" fill="#ec5b13" font-weight="700">✈️</text>
  <text x="64" y="148" font-size="11" fill="#1A202C" font-weight="600">Matrículas UAEAC de cada RPAS</text>
  <text x="500" y="148" font-size="10" fill="#22c55e" font-weight="700">Obligatorio</text>

  <rect x="20" y="165" width="660" height="36" rx="8" fill="#fff"/>
  <text x="44" y="188" font-size="11" fill="#ec5b13" font-weight="700">🛡️</text>
  <text x="64" y="188" font-size="11" fill="#1A202C" font-weight="600">Seguro de responsabilidad civil vigente</text>
  <text x="500" y="188" font-size="10" fill="#22c55e" font-weight="700">Obligatorio</text>

  <rect x="20" y="205" width="660" height="36" rx="8" fill="#f8fafc"/>
  <text x="44" y="228" font-size="11" fill="#ec5b13" font-weight="700">📋</text>
  <text x="64" y="228" font-size="11" fill="#1A202C" font-weight="600">Sistema de Gestión de Seguridad (SMS)</text>
  <text x="500" y="228" font-size="10" fill="#d97706" font-weight="700">Según complejidad</text>

  <rect x="20" y="245" width="660" height="28" rx="8" fill="#fff"/>
  <text x="44" y="264" font-size="11" fill="#ec5b13" font-weight="700">📒</text>
  <text x="64" y="264" font-size="11" fill="#1A202C" font-weight="600">Registro de vuelos (bitácora)</text>
  <text x="500" y="264" font-size="10" fill="#22c55e" font-weight="700">Obligatorio</text>
</svg>
<figcaption style="font-size:12px;color:#94a3b8;margin-top:8px;">Lista de documentos exigidos por AeroCivil para la emisión del CDO.</figcaption>
</figure>

<h2>Paso a paso: cómo tramitar el CDO</h2>

<h3>Paso 1 — Prepara tu documentación</h3>
<p>Elabora o actualiza tu Manual de Operaciones. Si no tienes uno, Bitafly puede generarte la estructura base con todos los apartados que AeroCivil revisa. Reúne los CPR de tus pilotos, matrículas de aeronaves y póliza de seguro vigente.</p>

<h3>Paso 2 — Radica la solicitud en SGDEA</h3>
<p>Ingresa al sistema <strong>SGDEA (Sistema de Gestión Documental Electrónico de Aerocivil)</strong> con la opción <em>"comunicación oficial UAS - Drones - Explotadores UAS"</em>. Adjunta todos los documentos en PDF y espera el número de radicado.</p>

<h3>Paso 3 — Inspección y evaluación</h3>
<p>AeroCivil asignará un inspector que revisará tu Manual de Operaciones y puede solicitar una visita de verificación para evaluar tus instalaciones y procedimientos en campo.</p>

<h3>Paso 4 — Emisión del CDO</h3>
<p>Si todo está en orden, AeroCivil emite el <strong>CDO con vigencia de 5 años</strong>. El certificado incluye: número de registro, nombre del explotador, tipo de operaciones autorizadas, aeronaves inscritas y fecha de vencimiento.</p>

<h2>¿Cuánto tiempo tarda?</h2>
<p>El proceso completo puede tomar entre <strong>4 y 12 semanas</strong>, dependiendo de la carga de trabajo de AeroCivil y la completitud de tu documentación. La causa más común de demora es el Manual de Operaciones incompleto.</p>

<h2>¿Qué pasa si opero sin CDO?</h2>
<ul>
  <li>Multas económicas proporcionales a la infracción</li>
  <li>Suspensión de operaciones hasta obtener la certificación</li>
  <li>Inmovilización de aeronaves</li>
  <li>Responsabilidad civil agravada en caso de accidente</li>
</ul>

<h2>Cómo Bitafly te ayuda a mantener el CDO vigente</h2>
<p>Obtener el CDO es solo el primer paso. Mantenerlo requiere: bitácora al día, SMS documentado, pilotos con CPR vigente y aeronaves con mantenimiento al día.</p>
<p>Bitafly centraliza todo esto en una plataforma diseñada para la RAC 100: alertas de vencimiento de CPR y pólizas, generación automática de la bitácora, módulo SMS completo y reportes de auditoría en un clic.</p>
<p><a href="/certificacion/explotador-uas">Ver cómo Bitafly te prepara para el CDO →</a></p>
<p><a href="/registro">Comenzar gratis — sin tarjeta de crédito →</a></p>
`,
  },

  // ─── 13. Mantenimiento preventivo drones RAC 100 ──────────────────────────
  {
    slug:            'mantenimiento-preventivo-drones-rac-100',
    title:           'Mantenimiento preventivo de drones bajo la RAC 100: guía completa para operadores en Colombia',
    metaTitle:       'Mantenimiento Preventivo Drones RAC 100 Colombia 2026 | Bitafly',
    metaDescription: 'Guía completa de mantenimiento preventivo de drones para operadores RAC 100 en Colombia. Intervalos, registros F-MNT-003, baterías y alertas automáticas con Bitafly.',
    publishedAt:     '2026-06-10',
    updatedAt:       '2026-06-10',
    readingTime:     7,
    category:        'Operaciones',
    keywords:        ['mantenimiento drones colombia', 'mantenimiento preventivo RPAS', 'F-MNT-003 drones', 'registro mantenimiento drone RAC 100', 'horas vuelo drone mantenimiento'],
    excerpt:         'La RAC 100 exige registrar cada intervención técnica sobre tus aeronaves. Un programa de mantenimiento preventivo no solo cumple la norma: extiende la vida útil de tus equipos y previene accidentes costosos.',
    coverAlt:        'Mantenimiento preventivo de drones RAC 100 Colombia operadores UAS',
    body: `
<p>El <strong>mantenimiento preventivo</strong> es uno de los pilares del cumplimiento RAC 100 en Colombia. La norma no solo exige operar de forma segura: exige <em>demostrar</em> que tus aeronaves están en condiciones de vuelo con registros documentados de cada intervención técnica.</p>

<div class="callout info">
  <svg class="callout-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
  <div class="callout-body"><strong>La regla base: 200 horas o 6 meses</strong> La RAC 100 establece el mantenimiento preventivo mayor cada <strong>200 horas de vuelo acumuladas</strong> o cada <strong>6 meses calendario</strong>, lo que ocurra primero. Para baterías LiPo, el umbral típico es <strong>200 ciclos de carga/descarga</strong>, aunque puede variar según el fabricante.</div>
</div>

<p>Un programa de mantenimiento bien implementado tiene además un beneficio económico directo: los drones profesionales tienen un costo de reposición entre $15 y $150 millones de pesos. Un motor quemado por falta de inspección puede ser más costoso que un año de mantenimiento preventivo.</p>

<!-- IMAGEN: Dashboard de mantenimiento -->
<figure style="margin:2rem 0;text-align:center;">
<svg viewBox="0 0 700 260" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;border-radius:16px;background:#0f172a;">
  <text x="350" y="28" text-anchor="middle" font-size="13" font-weight="800" fill="#f8fafc">Panel de Mantenimiento — Bitafly</text>

  <!-- Aeronave 1 -->
  <rect x="20" y="45" width="200" height="100" rx="12" fill="#1e293b" stroke="#ec5b13" stroke-width="1.5"/>
  <text x="36" y="70" font-size="10" font-weight="700" fill="#ec5b13">DJI M350 RTK</text>
  <text x="36" y="84" font-size="9" fill="#94a3b8">MAT350-CO-0041</text>
  <text x="36" y="104" font-size="20" font-weight="900" fill="#ec5b13">89.5h</text>
  <text x="36" y="118" font-size="9" fill="#94a3b8">Próximo mant: 200h</text>
  <rect x="36" y="126" width="164" height="6" rx="3" fill="#334155"/>
  <rect x="36" y="126" width="73" height="6" rx="3" fill="#ec5b13"/>
  <text x="220" y="136" font-size="8" fill="#ec5b13" text-anchor="end">44%</text>

  <!-- Aeronave 2 - en alerta -->
  <rect x="240" y="45" width="200" height="100" rx="12" fill="#1e293b" stroke="#f59e0b" stroke-width="2"/>
  <text x="256" y="70" font-size="10" font-weight="700" fill="#f59e0b">⚠️ Autel EVO II</text>
  <text x="256" y="84" font-size="9" fill="#94a3b8">AUT-EVO-0008</text>
  <text x="256" y="104" font-size="20" font-weight="900" fill="#f59e0b">198.2h</text>
  <text x="256" y="118" font-size="9" fill="#f59e0b">¡Mant. próximo! &lt;2h</text>
  <rect x="256" y="126" width="164" height="6" rx="3" fill="#334155"/>
  <rect x="256" y="126" width="160" height="6" rx="3" fill="#f59e0b"/>
  <text x="440" y="136" font-size="8" fill="#f59e0b" text-anchor="end">99%</text>

  <!-- Aeronave 3 -->
  <rect x="460" y="45" width="220" height="100" rx="12" fill="#1e293b" stroke="#22c55e" stroke-width="1.5"/>
  <text x="476" y="70" font-size="10" font-weight="700" fill="#22c55e">DJI Mavic 3E</text>
  <text x="476" y="84" font-size="9" fill="#94a3b8">MAV3E-CO-0021</text>
  <text x="476" y="104" font-size="20" font-weight="900" fill="#22c55e">67.1h</text>
  <text x="476" y="118" font-size="9" fill="#94a3b8">Próximo mant: 200h</text>
  <rect x="476" y="126" width="184" height="6" rx="3" fill="#334155"/>
  <rect x="476" y="126" width="62" height="6" rx="3" fill="#22c55e"/>
  <text x="660" y="136" font-size="8" fill="#22c55e" text-anchor="end">33%</text>

  <!-- Historial -->
  <rect x="20" y="160" width="660" height="80" rx="12" fill="#1e293b"/>
  <text x="36" y="180" font-size="10" font-weight="700" fill="#f8fafc">Últimas intervenciones</text>
  <text x="36" y="198" font-size="9" fill="#94a3b8">05 Jun 2026</text>
  <text x="120" y="198" font-size="9" fill="#f8fafc">Revisión de hélices y motores</text>
  <text x="560" y="198" font-size="9" fill="#22c55e">DJI M350</text>
  <text x="36" y="214" font-size="9" fill="#94a3b8">28 May 2026</text>
  <text x="120" y="214" font-size="9" fill="#f8fafc">Cambio de baterías (ciclo 180)</text>
  <text x="560" y="214" font-size="9" fill="#f59e0b">Autel EVO II</text>
  <text x="36" y="230" font-size="9" fill="#94a3b8">15 May 2026</text>
  <text x="120" y="230" font-size="9" fill="#f8fafc">Calibración IMU y gimbal</text>
  <text x="560" y="230" font-size="9" fill="#22c55e">Mavic 3E</text>
</svg>
<figcaption style="font-size:12px;color:#94a3b8;margin-top:8px;">El panel de mantenimiento de Bitafly muestra el estado de cada aeronave y alerta antes de llegar al intervalo crítico.</figcaption>
</figure>

<h2>Lo que exige la RAC 100 en materia de mantenimiento</h2>
<p>La RAC 100 establece que el operador debe:</p>
<ul>
  <li>Llevar un <strong>registro de mantenimiento</strong> por cada aeronave, con fecha, tipo de intervención, técnico responsable y horas de vuelo al momento de la intervención</li>
  <li>Definir en su <strong>Manual de Operaciones</strong> los intervalos de mantenimiento preventivo y los criterios de aeronavegabilidad</li>
  <li>No operar una aeronave que haya superado su intervalo de mantenimiento sin la inspección correspondiente</li>
  <li>Conservar los registros disponibles para auditoría por al menos <strong>2 años</strong></li>
</ul>

<p>El código documental que identifica el registro de mantenimiento se denomina <strong>F-MNT-003</strong> en Bitafly por defecto, pero cada operador puede definir su propia nomenclatura en su manual.</p>

<h2>Intervalos de mantenimiento recomendados</h2>
<p>La RAC 100 no fija intervalos universales: el fabricante y el manual de operaciones los definen. Sin embargo, estas son las prácticas estándar de la industria:</p>

<h3>Mantenimiento por horas de vuelo</h3>
<ul>
  <li><strong>Cada 50 horas</strong>: inspección visual de hélices, motores, estructura y conectores. Limpieza general.</li>
  <li><strong>Cada 100 horas</strong>: revisión de motores brushless (resistencia y continuidad), calibración de IMU y compás, verificación de firmware.</li>
  <li><strong>Cada 200 horas</strong>: revisión completa del sistema de vuelo, inspección de rodamientos, prueba de todos los actuadores.</li>
  <li><strong>Cada 400 horas</strong>: mantenimiento mayor — reemplazo preventivo de motores y ESC según historial.</li>
</ul>

<h3>Mantenimiento por tiempo (calendario)</h3>
<ul>
  <li><strong>Mensual</strong>: inspección visual post-vuelo, verificación de propelas y batería.</li>
  <li><strong>Semestral</strong>: revisión completa independientemente de las horas acumuladas.</li>
  <li><strong>Anual</strong>: inspección certificada si el fabricante lo exige.</li>
</ul>

<h2>Mantenimiento de baterías LiPo/LiHV</h2>
<p>Las baterías son el componente de mayor desgaste y mayor riesgo en los drones. La RAC 100 exige registrar los ciclos de cada batería:</p>

<!-- IMAGEN: Tabla ciclos de batería -->
<figure style="margin:2rem 0;">
<svg viewBox="0 0 700 200" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;border-radius:16px;background:#fff;border:1.5px solid #f1f5f9;">
  <text x="350" y="26" text-anchor="middle" font-size="12" font-weight="800" fill="#1A202C">Ciclos de vida útil por tipo de batería</text>
  <!-- Encabezados -->
  <rect x="20" y="35" width="660" height="28" rx="6" fill="#f8fafc"/>
  <text x="100" y="54" font-size="10" font-weight="700" fill="#475569" text-anchor="middle">Tipo batería</text>
  <text x="260" y="54" font-size="10" font-weight="700" fill="#475569" text-anchor="middle">Ciclos típicos</text>
  <text x="420" y="54" font-size="10" font-weight="700" fill="#475569" text-anchor="middle">Retirar si capacidad &lt;</text>
  <text x="590" y="54" font-size="10" font-weight="700" fill="#475569" text-anchor="middle">Acción</text>
  <!-- Fila 1 -->
  <text x="100" y="86" font-size="10" fill="#1A202C" text-anchor="middle">DJI Intelligent Battery</text>
  <text x="260" y="86" font-size="10" fill="#1A202C" text-anchor="middle">200 – 400</text>
  <text x="420" y="86" font-size="10" fill="#d97706" text-anchor="middle">80% capacidad original</text>
  <text x="590" y="86" font-size="10" fill="#dc2626" text-anchor="middle">Baja de servicio</text>
  <!-- Fila 2 -->
  <rect x="20" y="95" width="660" height="28" rx="0" fill="#f8fafc"/>
  <text x="100" y="114" font-size="10" fill="#1A202C" text-anchor="middle">LiHV aftermarket</text>
  <text x="260" y="114" font-size="10" fill="#1A202C" text-anchor="middle">150 – 300</text>
  <text x="420" y="114" font-size="10" fill="#d97706" text-anchor="middle">75% capacidad original</text>
  <text x="590" y="114" font-size="10" fill="#dc2626" text-anchor="middle">Reemplazar</text>
  <!-- Fila 3 -->
  <text x="100" y="142" font-size="10" fill="#1A202C" text-anchor="middle">LiPo agrícola (alta cap.)</text>
  <text x="260" y="142" font-size="10" fill="#1A202C" text-anchor="middle">100 – 200</text>
  <text x="420" y="142" font-size="10" fill="#d97706" text-anchor="middle">70% capacidad original</text>
  <text x="590" y="142" font-size="10" fill="#dc2626" text-anchor="middle">Reemplazar</text>
  <!-- Fila 4 -->
  <rect x="20" y="151" width="660" height="28" rx="0" fill="#f8fafc"/>
  <text x="100" y="170" font-size="10" fill="#1A202C" text-anchor="middle">Batería hidrógeno/fuel cell</text>
  <text x="260" y="170" font-size="10" fill="#1A202C" text-anchor="middle">Per fabricante</text>
  <text x="420" y="170" font-size="10" fill="#1A202C" text-anchor="middle">Según datasheet</text>
  <text x="590" y="170" font-size="10" fill="#1A202C" text-anchor="middle">Mantenimiento OEM</text>
</svg>
<figcaption style="font-size:12px;color:#94a3b8;margin-top:8px;">Referencia de ciclos de vida útil por tipo de batería. Bitafly registra los ciclos automáticamente al importar logs DJI.</figcaption>
</figure>

<ul>
  <li>Registra el número de ciclos de cada batería en el F-MNT-003</li>
  <li>Almacena las baterías LiPo al <strong>50-60% de carga</strong> si no se usarán por más de 3 días</li>
  <li>Nunca cargues una batería hinchada (swollen) — es señal de celda dañada y riesgo de incendio</li>
  <li>Bitafly registra los ciclos automáticamente al importar los logs DJI desde el control remoto</li>
</ul>

<h2>El registro F-MNT-003: qué debe incluir</h2>
<p>Cada intervención de mantenimiento debe quedar documentada con:</p>
<ul>
  <li>Fecha de la intervención</li>
  <li>Aeronave: modelo, serial, matrícula UAEAC</li>
  <li>Horas de vuelo acumuladas al momento del mantenimiento</li>
  <li>Tipo de mantenimiento: preventivo, correctivo o post-incidente</li>
  <li>Descripción de la intervención realizada</li>
  <li>Piezas reemplazadas (número de parte, lote)</li>
  <li>Técnico responsable: nombre y firma</li>
  <li>Próxima fecha o horas de mantenimiento programado</li>
</ul>

<h2>Errores comunes que llevan a infracciones RAC 100</h2>
<ol>
  <li><strong>No documentar</strong> las revisiones rutinarias por considerarlas menores</li>
  <li><strong>Superar el intervalo</strong> de mantenimiento por carga operativa</li>
  <li><strong>No registrar</strong> el reemplazo de hélices tras un accidente menor</li>
  <li><strong>Usar baterías</strong> con ciclos vencidos sin registro de baja</li>
  <li><strong>No actualizar</strong> el firmware de la aeronave después de una intervención</li>
</ol>

<h2>Cómo Bitafly automatiza el mantenimiento</h2>
<p>Bitafly suma automáticamente las horas de cada vuelo al totalizador de la aeronave. Cuando se acerca el umbral de mantenimiento (configurable, por defecto 200 horas o 6 meses), el sistema envía una <strong>alerta automática</strong> al administrador y bloquea el despacho de esa aeronave hasta que se registre el mantenimiento.</p>
<p>El registro genera el <strong>F-MNT-003 en PDF</strong> con todos los campos de la RAC 100, listo para adjuntar en caso de auditoría.</p>
<p><a href="/mantenimiento-drones">Ver el módulo de mantenimiento de Bitafly →</a></p>
<p><a href="/registro">Comenzar gratis — sin tarjeta de crédito →</a></p>
`,
  },

  // ─── 14. Certificado Piloto Remoto CPR ────────────────────────────────────
  {
    slug:            'certificado-piloto-remoto-drones-colombia',
    title:           'Certificado de Piloto Remoto (CPR): cómo obtenerlo para volar drones en Colombia',
    metaTitle:       'Certificado Piloto Remoto CPR Drones Colombia 2026 | Guía Completa | Bitafly',
    metaDescription: 'Guía completa para obtener el Certificado de Piloto Remoto (CPR) en Colombia bajo la RAC 100. Requisitos, OEAs autorizadas, examen teórico y costo del trámite.',
    publishedAt:     '2026-06-10',
    updatedAt:       '2026-06-10',
    readingTime:     7,
    category:        'Trámites',
    keywords:        ['certificado piloto remoto colombia', 'CPR drones colombia', 'licencia piloto drone colombia', 'OEA drones colombia', 'curso piloto drone aerocivil'],
    excerpt:         'El Certificado de Piloto Remoto (CPR) es el documento que acredita que estás habilitado para volar drones comercialmente en Colombia. Sin él, cualquier operación en categoría específica es irregular. Aquí te decimos cómo obtenerlo.',
    coverAlt:        'Certificado de Piloto Remoto CPR drones Colombia AeroCivil RAC 100',
    body: `
<p>Si quieres volar drones con fines comerciales en Colombia, necesitas el <strong>Certificado de Piloto Remoto (CPR)</strong>. Este documento, emitido por la <strong>UAEAC (AeroCivil)</strong>, acredita que has recibido entrenamiento aeronáutico formal y que estás habilitado para operar sistemas RPAS en la <em>categoría específica</em> de la RAC 100.</p>

<p>No confundas el CPR con un curso genérico de drones: el CPR es un certificado oficial aeronáutico, expedido únicamente por organizaciones autorizadas por AeroCivil, y tiene validez legal ante cualquier inspección.</p>

<!-- IMAGEN: Ruta para obtener el CPR -->
<figure style="margin:2rem 0;text-align:center;">
<svg viewBox="0 0 700 240" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;border-radius:16px;background:#f8fafc;">
  <text x="350" y="28" text-anchor="middle" font-size="13" font-weight="800" fill="#1A202C">Ruta para obtener el CPR en Colombia</text>

  <!-- Círculos numerados -->
  <circle cx="80" cy="130" r="36" fill="#fff7ed" stroke="#ec5b13" stroke-width="2"/>
  <text x="80" y="122" text-anchor="middle" font-size="20" font-weight="900" fill="#ec5b13">1</text>
  <text x="80" y="138" text-anchor="middle" font-size="9" fill="#475569">Elegir</text>
  <text x="80" y="150" text-anchor="middle" font-size="9" fill="#475569">una OEA</text>

  <line x1="116" y1="130" x2="154" y2="130" stroke="#ec5b13" stroke-width="2" stroke-dasharray="4"/>

  <circle cx="190" cy="130" r="36" fill="#fff7ed" stroke="#ec5b13" stroke-width="2"/>
  <text x="190" y="122" text-anchor="middle" font-size="20" font-weight="900" fill="#ec5b13">2</text>
  <text x="190" y="138" text-anchor="middle" font-size="9" fill="#475569">Curso</text>
  <text x="190" y="150" text-anchor="middle" font-size="9" fill="#475569">teórico</text>

  <line x1="226" y1="130" x2="264" y2="130" stroke="#ec5b13" stroke-width="2" stroke-dasharray="4"/>

  <circle cx="300" cy="130" r="36" fill="#fff7ed" stroke="#ec5b13" stroke-width="2"/>
  <text x="300" y="122" text-anchor="middle" font-size="20" font-weight="900" fill="#ec5b13">3</text>
  <text x="300" y="138" text-anchor="middle" font-size="9" fill="#475569">Vuelos</text>
  <text x="300" y="150" text-anchor="middle" font-size="9" fill="#475569">prácticos</text>

  <line x1="336" y1="130" x2="374" y2="130" stroke="#ec5b13" stroke-width="2" stroke-dasharray="4"/>

  <circle cx="410" cy="130" r="36" fill="#fff7ed" stroke="#ec5b13" stroke-width="2"/>
  <text x="410" y="122" text-anchor="middle" font-size="20" font-weight="900" fill="#ec5b13">4</text>
  <text x="410" y="138" text-anchor="middle" font-size="9" fill="#475569">Examen</text>
  <text x="410" y="150" text-anchor="middle" font-size="9" fill="#475569">AeroCivil</text>

  <line x1="446" y1="130" x2="484" y2="130" stroke="#ec5b13" stroke-width="2" stroke-dasharray="4"/>

  <circle cx="520" cy="130" r="36" fill="#fff7ed" stroke="#ec5b13" stroke-width="2"/>
  <text x="520" y="122" text-anchor="middle" font-size="20" font-weight="900" fill="#ec5b13">5</text>
  <text x="520" y="138" text-anchor="middle" font-size="9" fill="#475569">Trámite</text>
  <text x="520" y="150" text-anchor="middle" font-size="9" fill="#475569">en SGDEA</text>

  <line x1="556" y1="130" x2="594" y2="130" stroke="#22c55e" stroke-width="2" stroke-dasharray="4"/>

  <circle cx="630" cy="130" r="36" fill="#f0fdf4" stroke="#22c55e" stroke-width="2"/>
  <text x="630" y="125" text-anchor="middle" font-size="16" fill="#22c55e">✅</text>
  <text x="630" y="142" text-anchor="middle" font-size="9" fill="#16a34a" font-weight="700">CPR</text>
  <text x="630" y="154" text-anchor="middle" font-size="9" fill="#16a34a">emitido</text>

  <text x="350" y="210" text-anchor="middle" font-size="10" fill="#94a3b8">Duración total estimada: 4 a 12 semanas según la OEA elegida</text>
</svg>
<figcaption style="font-size:12px;color:#94a3b8;margin-top:8px;">Ruta completa para obtener el Certificado de Piloto Remoto (CPR) en Colombia.</figcaption>
</figure>

<h2>¿Quién necesita el CPR?</h2>
<p>El CPR es obligatorio para cualquier persona que:</p>
<ul>
  <li>Opere drones con fines <strong>comerciales</strong> (inspección, cartografía, publicidad, agricultura, seguridad)</li>
  <li>Sea el <strong>Piloto en Comando (PIC)</strong> de cualquier vuelo en categoría específica</li>
  <li>Quiera ser <strong>contratado como piloto de drones</strong> por una empresa certificada</li>
</ul>
<p>Los vuelos recreativos de bajo riesgo en categoría abierta no requieren CPR, pero sí el registro del RPAS si pesa más de 250 g.</p>

<h2>Paso a paso para obtener el CPR</h2>

<h3>Paso 1 — Elegir una OEA (Organización de Entrenamiento Aprobada)</h3>
<p>Solo las organizaciones con <strong>Certificado de Instrucción para Aviación Civil (CIAC RAC 141)</strong> emitido por AeroCivil pueden entrenar pilotos de drones. No cualquier academia de drones es una OEA válida.</p>
<p>Verifica que la OEA que eliges tenga el CIAC vigente antes de inscribirte. AeroCivil tiene disponible el listado de OEAs autorizadas en su portal oficial.</p>

<h3>Paso 2 — Curso teórico</h3>
<p>El programa de entrenamiento incluye, como mínimo:</p>
<ul>
  <li><strong>Regulación aeronáutica</strong>: RAC 100, espacio aéreo colombiano, zonas restringidas</li>
  <li><strong>Meteorología</strong>: lectura de condiciones meteorológicas para operaciones UAS</li>
  <li><strong>Navegación</strong>: coordenadas, mapas, planificación de ruta</li>
  <li><strong>Sistemas UAS</strong>: funcionamiento del RPAS, sensores, baterías, comunicaciones</li>
  <li><strong>Procedimientos de emergencia</strong>: protocolos ante fallo de motor, pérdida de señal, viento extremo</li>
  <li><strong>Gestión de riesgos</strong>: metodología SORA básica</li>
</ul>
<p>La duración varía entre OEAs: típicamente entre 40 y 80 horas de instrucción teórica.</p>

<h3>Paso 3 — Horas de vuelo práctico</h3>
<p>El candidato debe completar un mínimo de <strong>horas de vuelo supervisado</strong> en campo con instructor. Las horas mínimas las define la OEA según el tipo de operación para el que se certifica el piloto.</p>

<h3>Paso 4 — Examen de idoneidad</h3>
<p>Desde el <strong>1 de mayo de 2025</strong>, AeroCivil exige un <strong>Certificado de Idoneidad</strong> para todos los pilotos que soliciten el CPR. Este examen es administrado directamente por la UAEAC o por entidades autorizadas y evalúa los conocimientos teóricos del candidato.</p>

<div class="callout warning">
  <svg class="callout-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
  <div class="callout-body"><strong>Requisito vigente desde mayo 2025</strong> Sin el <strong>Certificado de Idoneidad</strong>, AeroCivil NO emite el CPR. Este examen es independiente del aval de tu OEA — debes agendarlo por separado con la UAEAC antes de radicar el trámite en SGDEA. Muchos candidatos pierden semanas por no anticipar este paso.</div>
</div>

<p>Sin el certificado de idoneidad, AeroCivil no emite el CPR.</p>

<h3>Paso 5 — Tramitar el CPR en SGDEA</h3>
<p>Con el aval de la OEA y el certificado de idoneidad, radicas la solicitud del CPR en el <strong>SGDEA de AeroCivil</strong>. El trámite incluye el pago de la tasa aeronáutica correspondiente y puede tardar entre 2 y 6 semanas.</p>

<!-- IMAGEN: Requisitos CPR -->
<figure style="margin:2rem 0;">
<svg viewBox="0 0 700 220" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;border-radius:16px;background:#fff;border:1.5px solid #f1f5f9;">
  <text x="350" y="26" text-anchor="middle" font-size="12" font-weight="800" fill="#1A202C">Requisitos para tramitar el CPR ante AeroCivil</text>
  <rect x="20" y="40" width="660" height="30" rx="6" fill="#f8fafc"/>
  <text x="44" y="60" font-size="11" fill="#22c55e" font-weight="700">✅</text>
  <text x="64" y="60" font-size="11" fill="#1A202C">Certificado de finalización del curso emitido por la OEA (CIAC RAC 141)</text>

  <text x="44" y="92" font-size="11" fill="#22c55e" font-weight="700">✅</text>
  <text x="64" y="92" font-size="11" fill="#1A202C">Certificado de Idoneidad (examen teórico AeroCivil — obligatorio desde mayo 2025)</text>

  <rect x="20" y="104" width="660" height="30" rx="6" fill="#f8fafc"/>
  <text x="44" y="124" font-size="11" fill="#22c55e" font-weight="700">✅</text>
  <text x="64" y="124" font-size="11" fill="#1A202C">Cédula de ciudadanía o documento de identidad vigente</text>

  <text x="44" y="156" font-size="11" fill="#22c55e" font-weight="700">✅</text>
  <text x="64" y="156" font-size="11" fill="#1A202C">Certificado médico aeronáutico (Clase II o equivalente según OEA)</text>

  <rect x="20" y="168" width="660" height="30" rx="6" fill="#f8fafc"/>
  <text x="44" y="188" font-size="11" fill="#22c55e" font-weight="700">✅</text>
  <text x="64" y="188" font-size="11" fill="#1A202C">Pago de tasa aeronáutica UAEAC</text>
</svg>
<figcaption style="font-size:12px;color:#94a3b8;margin-top:8px;">Lista de documentos requeridos por AeroCivil para la emisión del CPR.</figcaption>
</figure>

<h2>¿Cuánto cuesta obtener el CPR?</h2>
<p>El costo total varía según la OEA y la ciudad:</p>
<ul>
  <li><strong>Curso en OEA</strong>: entre $1.500.000 y $4.000.000 COP según duración y modalidad</li>
  <li><strong>Tasa aeronáutica UAEAC</strong>: según tarifa vigente de AeroCivil (consultar portal oficial)</li>
  <li><strong>Certificado médico</strong>: entre $150.000 y $400.000 COP según el médico examinador</li>
</ul>
<p>Costo total estimado: entre <strong>$2.000.000 y $5.000.000 COP</strong> dependiendo de la OEA.</p>

<h2>Vigencia y renovación del CPR</h2>
<ul>
  <li>El CPR tiene una <strong>vigencia de 2 años</strong></li>
  <li>Para renovarlo se requiere demostrar horas de vuelo recientes y certificado médico vigente</li>
  <li>Bitafly te alerta cuando el CPR de tus pilotos está próximo a vencer</li>
</ul>

<h2>CPR vs. otros certificados: diferencias clave</h2>
<ul>
  <li><strong>CPR</strong>: habilita al piloto individual para volar. Lo necesita cada piloto.</li>
  <li><strong>CDO</strong>: habilita a la empresa/organización para operar. Lo necesita el explotador.</li>
  <li><strong>Matrícula UAEAC</strong>: registro de la aeronave. Lo necesita cada RPAS.</li>
</ul>
<p>Para operar legalmente bajo RAC 100, una empresa necesita los tres: CDO, pilotos con CPR y aeronaves con matrícula.</p>

<h2>Gestiona los CPR de tu equipo con Bitafly</h2>
<p>Bitafly registra la fecha de vencimiento del CPR de cada piloto en tu organización y te envía alertas automáticas antes de que expire. Así evitas despachar a un piloto con certificación vencida, lo que constituye infracción directa a la RAC 100.</p>
<p><a href="/gestion-flota-drones">Ver gestión de tripulación en Bitafly →</a></p>
<p><a href="/registro">Comenzar gratis — sin tarjeta de crédito →</a></p>
`,
  },

  // ─── 12. Clima y meteorología para drones ────────────────────────────────
  {
    slug:            'como-leer-clima-antes-volar-dron-colombia',
    title:           'Cómo leer las condiciones meteorológicas antes de volar un dron en Colombia',
    metaTitle:       'Clima para Volar Drones Colombia: Viento, Kp y Score de Aptitud | Bitafly',
    metaDescription: 'Guía práctica para interpretar viento, ráfagas, visibilidad, lluvia e índice Kp antes de cada vuelo de dron en Colombia. Con los umbrales reales de la RAC 100.',
    publishedAt:     '2026-06-12',
    readingTime:     8,
    category:        'Operaciones',
    keywords:        ['clima drones colombia', 'meteorología UAS', 'viento drones vuelo', 'índice Kp GPS drones', 'condiciones vuelo drones', 'weather drones colombia'],
    excerpt:         'El clima es el factor operacional más subestimado por los pilotos de drones. Viento en calma en tierra puede ser turbulencia severa a 80 metros. Te explicamos las 6 variables que determinan si puedes volar y qué valores son el límite.',
    coverAlt:        'Condiciones meteorológicas para volar drones en Colombia — viento, ráfagas e índice Kp',
    body: `
<p>El clima es el factor operacional más subestimado por los pilotos de drones. Un día aparentemente tranquilo en tierra puede tener vientos a 80 metros que superan los límites del fabricante. Una mañana despejada puede esconder actividad geomagnética que degrade el GPS hasta hacer el vuelo inseguro.</p>

<p>En este artículo te explicamos las <strong>6 variables meteorológicas</strong> que todo piloto de drones debe verificar antes de despegar en Colombia, los umbrales de referencia y cómo interpretar cada dato.</p>

<div class="stats-row">
  <div class="stat-item"><div class="num">6</div><div class="lbl">Variables que afectan la seguridad del vuelo</div></div>
  <div class="stat-item"><div class="num">25 km/h</div><div class="lbl">Umbral de viento para operar con precaución</div></div>
  <div class="stat-item"><div class="num">5 km</div><div class="lbl">Visibilidad mínima recomendada para VLOS</div></div>
</div>

<h2>¿Por qué la meteorología importa más en drones que en aviación tripulada?</h2>

<p>Los drones tienen tres desventajas frente a las aeronaves tripuladas que los hacen mucho más vulnerables al clima:</p>

<ul>
  <li><strong>Menor masa</strong>: un dron de 900 g es arrastrado por una ráfaga que apenas movería un Cessna. La relación entre área frontal y masa penaliza a los RPAS pequeños.</li>
  <li><strong>Sin piloto a bordo</strong>: el piloto en tierra no "siente" el avión. La telemetría llega con latencia y puede fallar. La percepción situacional es radicalmente inferior.</li>
  <li><strong>Dependencia del GPS</strong>: la mayoría de los drones DJI en modo GPS dependen de una señal satelital precisa. La actividad geomagnética (índice Kp) puede reducir esa precisión o causar derivas peligrosas.</li>
</ul>

<blockquote class="pullquote">El viento en tierra es solo una referencia. A 80 metros de altura, en una zona con relieve o vegetación alta, la velocidad puede ser 2x o 3x mayor.</blockquote>

<h2>Las 6 variables que debes verificar (y su peso en la decisión de volar)</h2>

<p>Bitafly evalúa 6 factores para calcular el <strong>score de aptitud de vuelo</strong> (0–100). Cada variable tiene un peso diferente basado en su impacto real en la seguridad operacional:</p>

<!-- IMAGEN: Score weights diagram -->
<figure style="margin:2rem 0;">
<svg viewBox="0 0 700 260" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;border-radius:16px;background:#f8fafc;border:1.5px solid #e2e8f0;">
  <text x="350" y="28" text-anchor="middle" font-size="13" font-weight="800" fill="#1A202C">Ponderación del score de aptitud de vuelo</text>

  <!-- Variable rows -->
  <!-- Viento -->
  <rect x="20" y="45" width="660" height="30" rx="6" fill="#fff" stroke="#f1f5f9" stroke-width="1"/>
  <text x="36" y="65" font-size="11" fill="#1A202C" font-weight="600">Velocidad del viento (10 m)</text>
  <rect x="280" y="51" width="180" height="16" rx="8" fill="#dbeafe"/>
  <rect x="280" y="51" width="54" height="16" rx="8" fill="#3b82f6"/>
  <text x="470" y="64" font-size="11" fill="#3b82f6" font-weight="700">30%</text>
  <text x="600" y="64" font-size="10" fill="#64748b">Límite: 25 km/h</text>

  <!-- Ráfagas -->
  <rect x="20" y="82" width="660" height="30" rx="6" fill="#f8fafc" stroke="#f1f5f9" stroke-width="1"/>
  <text x="36" y="102" font-size="11" fill="#1A202C" font-weight="600">Ráfagas de viento</text>
  <rect x="280" y="88" width="180" height="16" rx="8" fill="#dbeafe"/>
  <rect x="280" y="88" width="39.6" height="16" rx="8" fill="#6366f1"/>
  <text x="470" y="101" font-size="11" fill="#6366f1" font-weight="700">22%</text>
  <text x="600" y="101" font-size="10" fill="#64748b">Límite: 35 km/h</text>

  <!-- Visibilidad -->
  <rect x="20" y="119" width="660" height="30" rx="6" fill="#fff" stroke="#f1f5f9" stroke-width="1"/>
  <text x="36" y="139" font-size="11" fill="#1A202C" font-weight="600">Visibilidad horizontal</text>
  <rect x="280" y="125" width="180" height="16" rx="8" fill="#dbeafe"/>
  <rect x="280" y="125" width="39.6" height="16" rx="8" fill="#0ea5e9"/>
  <text x="470" y="138" font-size="11" fill="#0ea5e9" font-weight="700">22%</text>
  <text x="600" y="138" font-size="10" fill="#64748b">Límite: 5.000 m</text>

  <!-- Precipitación -->
  <rect x="20" y="156" width="660" height="30" rx="6" fill="#f8fafc" stroke="#f1f5f9" stroke-width="1"/>
  <text x="36" y="176" font-size="11" fill="#1A202C" font-weight="600">Precipitación (mm/h)</text>
  <rect x="280" y="162" width="180" height="16" rx="8" fill="#dbeafe"/>
  <rect x="280" y="162" width="28.8" height="16" rx="8" fill="#22c55e"/>
  <text x="470" y="175" font-size="11" fill="#22c55e" font-weight="700">16%</text>
  <text x="600" y="175" font-size="10" fill="#64748b">Límite: 0.1 mm/h</text>

  <!-- Prob lluvia -->
  <rect x="20" y="193" width="660" height="30" rx="6" fill="#fff" stroke="#f1f5f9" stroke-width="1"/>
  <text x="36" y="213" font-size="11" fill="#1A202C" font-weight="600">Probabilidad de lluvia (%)</text>
  <rect x="280" y="199" width="180" height="16" rx="8" fill="#dbeafe"/>
  <rect x="280" y="199" width="9" height="16" rx="8" fill="#f59e0b"/>
  <text x="470" y="212" font-size="11" fill="#f59e0b" font-weight="700">5%</text>
  <text x="600" y="212" font-size="10" fill="#64748b">Variable</text>

  <!-- Kp -->
  <rect x="20" y="230" width="660" height="25" rx="6" fill="#f8fafc" stroke="#f1f5f9" stroke-width="1"/>
  <text x="36" y="247" font-size="11" fill="#1A202C" font-weight="600">Índice Kp (actividad geomagnética)</text>
  <rect x="280" y="236" width="180" height="13" rx="6" fill="#dbeafe"/>
  <rect x="280" y="236" width="9" height="13" rx="6" fill="#ec5b13"/>
  <text x="470" y="247" font-size="11" fill="#ec5b13" font-weight="700">5%</text>
  <text x="600" y="247" font-size="10" fill="#64748b">Kp ≤ 4: normal</text>
</svg>
<figcaption style="font-size:12px;color:#94a3b8;margin-top:8px;">Pesos exactos del modelo de score de aptitud de vuelo de Bitafly. Fuente: <code>calcScore()</code> en la API del módulo de clima.</figcaption>
</figure>

<h2>Variable 1: Velocidad del viento (peso: 30%)</h2>

<p>La velocidad del viento en superficie es el factor más determinante. La fuente de Bitafly —<strong>Open-Meteo</strong>— reporta el viento a <strong>10 metros de altura</strong>, que es la altura estándar meteorológica. En la práctica, el viento a la altitud de vuelo del dron (30–120 m) puede ser significativamente mayor.</p>

<p><strong>Umbrales de referencia:</strong></p>
<ul>
  <li><strong>&lt; 15 km/h</strong>: condiciones excelentes. Vuelo estable, sin correcciones significativas del autopiloto.</li>
  <li><strong>15–25 km/h</strong>: condiciones aceptables. El autopiloto compensa bien, pero el tiempo de vuelo se reduce por mayor consumo de batería.</li>
  <li><strong>25–35 km/h</strong>: zona de precaución. La mayoría de drones DJI operan, pero cerca de su límite. No recomendado para drones pequeños (&lt;250 g) ni para filmación de precisión.</li>
  <li><strong>&gt; 35 km/h</strong>: no volar. Por encima de este umbral, el dron puede perder estabilidad y no recuperar posición.</li>
</ul>

<div class="callout warning">
  <svg class="callout-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
  <div class="callout-body"><strong>El viento a 10 m no es el viento a 80 m</strong> En zonas con edificios, vegetación alta o relieve complejo, el perfil de viento vertical puede triplicar la velocidad entre el suelo y la altitud de vuelo. Si el pronóstico dice 15 km/h pero hay árboles que se mueven visiblemente, sube el doble como referencia interna.</div>
</div>

<h2>Variable 2: Ráfagas (peso: 22%)</h2>

<p>Las ráfagas son picos de viento cortos (segundos) que pueden superar en 50–100% la velocidad media. Son especialmente peligrosas porque el autopiloto del dron puede no alcanzar a compensar antes de que la aeronave se desplace significativamente.</p>

<p>El umbral de 35 km/h en ráfagas es conservador por diseño: incluso un dron con clasificación de viento de 12 m/s (~43 km/h) puede ser destabilizado momentáneamente por una ráfaga que supere esa velocidad durante 1–2 segundos.</p>

<h2>Variable 3: Visibilidad horizontal (peso: 22%)</h2>

<p>La <strong>RAC 100</strong> exige que las operaciones VLOS (Visual Line of Sight) se realicen en condiciones que permitan mantener contacto visual directo con el RPAS en todo momento. Si no puedes ver el dron, no puedes operar en categoría VLOS.</p>

<p>La visibilidad puede reducirse por:</p>
<ul>
  <li><strong>Niebla</strong>: frecuente en las madrugadas y mañanas en zonas altas de Colombia (Bogotá, Manizales, Pasto)</li>
  <li><strong>Lluvia intensa</strong>: reduce la visibilidad y además daña la electrónica del dron</li>
  <li><strong>Neblina / calima</strong>: común en temporadas de quema en los llanos o valles</li>
  <li><strong>Humo industrial o de incendios</strong>: puede aparecer sin previo aviso</li>
</ul>

<p>El umbral de 5.000 metros de visibilidad es el mínimo recomendado para operación VLOS segura. Por debajo de 3.000 metros, la operación es de alto riesgo a menos que el dron esté dentro del alcance visual directo del piloto en todo momento.</p>

<h2>Variable 4: Precipitación (peso: 16%)</h2>

<p>Cualquier cantidad de lluvia activa es una señal de no volar. Los drones comerciales estándar (DJI Mavic, Air, Mini) <strong>NO son resistentes al agua</strong> — solo el Matrice 350, Agras y algunos modelos industriales tienen clasificación IP real para lluvia.</p>

<p>El umbral de 0.1 mm/h es deliberadamente estricto: incluso una llovizna muy fina puede penetrar en motores y circuitos, y la electrónica dañada por agua no siempre falla inmediatamente — puede fallar en el siguiente vuelo, sin aviso.</p>

<div class="callout important">
  <svg class="callout-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
  <div class="callout-body"><strong>La humedad acumulada también cuenta</strong> Volar justo después de una lluvia intensa, con vegetación empapada y alta humedad relativa, puede ser tan dañino como volar durante la lluvia. Espera al menos 30 minutos tras una lluvia significativa antes de despegar.</div>
</div>

<h2>Variable 5: Probabilidad de lluvia (peso: 5%)</h2>

<p>Este dato no mide la lluvia actual, sino la probabilidad de que llueva en la hora del pronóstico. Es un indicador de riesgo futuro: si la probabilidad supera el 60–70%, planea que la operación puede interrumpirse y ten siempre un protocolo de aterrizaje de emergencia activo.</p>

<p>En Colombia, especialmente en las regiones Andina, Pacífica y Amazónica, la probabilidad de lluvia puede pasar de 10% a 80% en menos de una hora. Los modelos meteorológicos tienen menor precisión en regiones montañosas complejas como la cordillera Colombiana.</p>

<h2>Variable 6: Índice Kp — la variable que nadie enseña (peso: 5%)</h2>

<p>El <strong>índice Kp</strong> (Planetary K-index) mide la actividad geomagnética global causada por tormentas solares. Es una escala de 0 a 9: valores normales son 0–3; valores de 5+ indican tormenta geomagnética.</p>

<p>¿Por qué importa para los drones? Porque <strong>los drones en modo GPS dependen de señales satelitales</strong> que se degradan durante actividad geomagnética elevada:</p>

<ul>
  <li><strong>Kp 0–3</strong>: GPS óptimo, sin impacto operacional</li>
  <li><strong>Kp 4</strong>: degradación leve. La precisión del GPS puede reducirse. Aumenta el riesgo de deriva en modo posición.</li>
  <li><strong>Kp 5–6</strong>: tormenta moderada. El modo GPS puede ser poco confiable. No volar BVLOS ni en zonas sin espacio de aterrizaje de emergencia.</li>
  <li><strong>Kp 7+</strong>: tormenta fuerte. El GPS puede perder Fix o tener errores de posición de decenas de metros. Alto riesgo de pérdida de control.</li>
</ul>

<!-- IMAGEN: Escala Kp -->
<figure style="margin:2rem 0;">
<svg viewBox="0 0 700 90" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;border-radius:12px;background:#fff;border:1.5px solid #f1f5f9;padding:8px;">
  <text x="350" y="20" text-anchor="middle" font-size="11" font-weight="800" fill="#1A202C">Escala del índice Kp y su impacto en operaciones de drones</text>

  <!-- Kp 0-3 -->
  <rect x="20" y="30" width="145" height="48" rx="10" fill="#f0fdf4" stroke="#22c55e" stroke-width="1.5"/>
  <text x="92" y="52" text-anchor="middle" font-size="18" font-weight="900" fill="#16a34a">Kp 0–3</text>
  <text x="92" y="70" text-anchor="middle" font-size="9" fill="#15803d" font-weight="600">GPS óptimo · APTO</text>

  <!-- Kp 4 -->
  <rect x="175" y="30" width="145" height="48" rx="10" fill="#fefce8" stroke="#ca8a04" stroke-width="1.5"/>
  <text x="247" y="52" text-anchor="middle" font-size="18" font-weight="900" fill="#a16207">Kp 4</text>
  <text x="247" y="70" text-anchor="middle" font-size="9" fill="#a16207" font-weight="600">Degradación leve · PRECAUCIÓN</text>

  <!-- Kp 5-6 -->
  <rect x="330" y="30" width="145" height="48" rx="10" fill="#fff7ed" stroke="#ea580c" stroke-width="1.5"/>
  <text x="402" y="52" text-anchor="middle" font-size="18" font-weight="900" fill="#c2410c">Kp 5–6</text>
  <text x="402" y="70" text-anchor="middle" font-size="9" fill="#c2410c" font-weight="600">Tormenta moderada · NO BVLOS</text>

  <!-- Kp 7+ -->
  <rect x="485" y="30" width="200" height="48" rx="10" fill="#fef2f2" stroke="#dc2626" stroke-width="1.5"/>
  <text x="585" y="52" text-anchor="middle" font-size="18" font-weight="900" fill="#dc2626">Kp 7+</text>
  <text x="585" y="70" text-anchor="middle" font-size="9" fill="#dc2626" font-weight="600">Tormenta fuerte · NO VOLAR</text>
</svg>
<figcaption style="font-size:12px;color:#94a3b8;margin-top:8px;">Clasificación del índice Kp y su impacto en la seguridad de operaciones RPAS. Datos: NOAA Space Weather Prediction Center.</figcaption>
</figure>

<p>Colombia está en latitudes ecuatoriales, lo que normalmente la protege de los efectos más severos de las tormentas geomagnéticas. Sin embargo, eventos extremos (Kp 7+) como la tormenta de mayo de 2024 afectaron el GPS en toda Latinoamérica.</p>

<h2>¿Cómo interpretar el score de aptitud 0–100?</h2>

<p>Bitafly combina las 6 variables en un score único:</p>

<ul>
  <li><strong>80–100</strong>: Condiciones excelentes. Verde. Vuela con confianza.</li>
  <li><strong>60–79</strong>: Condiciones aceptables. Verde claro. Monitorea el viento y el Kp.</li>
  <li><strong>40–59</strong>: Precaución. Naranja. Una o más variables están cerca del límite. Evalúa si la misión puede esperar.</li>
  <li><strong>0–39</strong>: No volar. Rojo. Al menos una variable supera los umbrales de seguridad.</li>
</ul>

<div class="callout tip">
  <svg class="callout-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
  <div class="callout-body"><strong>El score es un guía, no un reemplazante del juicio del piloto</strong> Los modelos meteorológicos tienen una resolución espacial de ~10 km. En Colombia, con relieve complejo, las condiciones pueden variar dramáticamente en distancias menores. Siempre verifica las condiciones en sitio antes de armar la aeronave.</div>
</div>

<h2>Colombia tiene algunas particularidades meteorológicas</h2>

<p>El clima colombiano es especialmente complejo para las operaciones de drones:</p>

<ul>
  <li><strong>Régimen bimodal de lluvias</strong>: en la zona Andina hay dos temporadas de lluvia (marzo–mayo y septiembre–noviembre). La variabilidad diaria es alta: mañanas despejadas, tardes lluviosas.</li>
  <li><strong>Vientos alisios</strong>: en la Orinoquia y el Caribe, los vientos alisios pueden superar 20–25 km/h en temporadas secas (diciembre–marzo).</li>
  <li><strong>Microclimas de valle</strong>: ciudades como Cali, Medellín o Bucaramanga tienen microclimas creados por los valles que generan variaciones de viento muy localizadas y difíciles de predecir con modelos globales.</li>
  <li><strong>Altitud</strong>: en Bogotá (2.600 m), la densidad del aire es ~23% menor que al nivel del mar. Esto reduce la eficiencia de las hélices y la velocidad aerodinámica efectiva.</li>
</ul>

<h2>Cómo verificar el clima antes de volar con Bitafly</h2>

<p>El módulo de clima de Bitafly está integrado directamente en el flujo operacional, no es una herramienta separada:</p>

<ol>
  <li><strong>Al programar una misión</strong> (Programación → Misión Básica): al seleccionar el municipio, aparece el widget de clima completo con el score de aptitud, las 6 métricas y el índice Kp para ese punto geográfico.</li>
  <li><strong>Al despachar</strong> (Bitácora → Nuevo vuelo): al seleccionar la orden de vuelo autorizada, aparece un badge compacto APTO / NO APTO con viento y temperatura actuales.</li>
  <li><strong>En el Replay GPS</strong>: al revisar un vuelo pasado, el widget muestra las condiciones históricas al momento exacto del vuelo — para análisis de incidentes o auditorías SMS.</li>
</ol>

<p>La fuente de datos es <strong>Open-Meteo</strong> (actualización cada 30 minutos) con el índice Kp de <strong>NOAA SWPC</strong> (actualización cada 15 minutos). No requiere API key ni suscripción adicional.</p>

<p><a href="/clima-drones">Conoce el módulo completo de clima y meteorología UAV →</a></p>
<p><a href="/registro">Comienza gratis — verifica el clima antes de tu próximo vuelo →</a></p>
`,
  },
];

/** Retorna un post por slug, o undefined si no existe */
export function getPostBySlug(slug) {
  return BLOG_POSTS.find(p => p.slug === slug);
}

/** Retorna todos los slugs (para generateStaticParams) */
export function getAllSlugs() {
  return BLOG_POSTS.map(p => ({ slug: p.slug }));
}
