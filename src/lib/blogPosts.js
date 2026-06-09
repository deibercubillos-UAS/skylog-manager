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
];

/** Retorna un post por slug, o undefined si no existe */
export function getPostBySlug(slug) {
  return BLOG_POSTS.find(p => p.slug === slug);
}

/** Retorna todos los slugs (para generateStaticParams) */
export function getAllSlugs() {
  return BLOG_POSTS.map(p => ({ slug: p.slug }));
}
