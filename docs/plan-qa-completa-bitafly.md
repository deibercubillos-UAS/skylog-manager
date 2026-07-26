# Plan de QA Completa — BitaFly

## Objetivo

Verificar el funcionamiento completo de la plataforma (landing pages + app) en
producción — sin bugs, sin demoras de carga, fluido — en PC, tablet y celular
(Android e iOS), módulo por módulo, hasta cubrir cada rincón real de la
aplicación. A pedido explícito del usuario: **fases cortas**, sin importar la
cantidad, para que cada sesión de ejecución quepa en una sola conversación sin
llenar el contexto — este archivo es la memoria persistente entre sesiones.

## Cómo se ejecuta este plan

- Cada fase se ejecuta en su propia conversación (o tramo de conversación),
  nunca varias fases pesadas en la misma sesión.
- Al terminar una fase: se documenta acá mismo (marcar checklist, agregar un
  resumen de qué se encontró/corrigió, igual que `plan-mobile-ux-bitafly.md`),
  se hace commit de cualquier fix real, y se actualiza **Próximo paso** al
  final del archivo para que la siguiente sesión sepa exactamente por dónde
  seguir sin tener que releer todo el historial de chat.
- Un bug real encontrado en cualquier fase se corrige de inmediato (mismo
  criterio ya aplicado: branch → commit → PR → merge → verificar en vivo
  tras el deploy), no se acumula para el final.
- "Completo" para una fase significa: cargó sin errores de consola reales
  (se ignora el ruido conocido de extensiones de Chrome), sin layout roto en
  los 4 viewports de referencia, datos mostrados correctos contra la base de
  datos real cuando aplica, y las acciones interactivas (crear/editar/subir/
  descargar) probadas de verdad, no solo el layout estático.

## Metodología y herramientas

- **Navegador real** vía la extensión de Claude en Chrome (`claude-in-chrome`),
  nunca solo lectura de código — este plan es sobre comportamiento real en
  producción (`bitafly.com`), no sobre revisión estática.
- **4 viewports de referencia** en cada módulo que lo amerite:
  - 375×667 — iPhone SE / Android compacto (el más restrictivo de iOS)
  - 412×915 — Android grande (Pixel/Galaxy típico)
  - 768×1024 — iPad / tablet
  - 1440×900 — Desktop
  - `resize_window` no emula un dispositivo real (no cambia userAgent/DPR),
    pero sí fuerza el mismo reflow responsive que el usuario final ve —
    suficiente para detectar bugs de layout/contenido, no para bugs
    exclusivos de un motor de renderizado móvil real (Safari iOS vs Chrome
    Android) — esa distinción se documenta como limitación, no se inventa
    cobertura que no existe.
- **`read_console_messages`** con `onlyErrors` tras cada carga — se descarta
  el ruido ya identificado (`"A listener indicated an asynchronous response
  by returning true..."`, error genérico de mensajería de extensiones de
  Chrome, no del sitio).
- **`read_network_requests`** cuando haya sospecha de datos desactualizados
  o llamadas fallidas (fue así como se encontró el bug de precios en
  `/registro`).
- **Supabase MCP** para verificar contra la base de datos real que lo que
  se ve en pantalla corresponde a lo que hay guardado — no confiar solo en
  el screenshot.
- **Usuarios de prueba ya creados** (org `BitaFly QA - Organización de
  Prueba`, plan Flota, + org propia de piloto independiente) — contraseña
  común `BitaflyQA2026!`:
  - `qa.gerente@bitafly-test.local` — Gerente General
  - `qa.jefepilotos@bitafly-test.local` — Jefe de Pilotos
  - `qa.sms@bitafly-test.local` — Gerente SMS
  - `qa.piloto@bitafly-test.local` — Piloto de organización
  - `qa.independiente@bitafly-test.local` — Piloto Independiente
  - La org de prueba ya tiene: 1 aeronave (Matrice 350 RTK), 1 batería, 3
    pilotos con invitación pendiente, 1 misión programada con SORA (SAIL I),
    1 vuelo cerrado (0.58h), 1 registro de mantenimiento con PDF adjunto, 1
    manual publicado (V1.0) — no partir de cero en las fases siguientes,
    reutilizar y ampliar estos datos.
- **Deploys de Vercel tardan ~40-60s en propagar** tras un merge a `main` —
  esperar antes de verificar un fix en vivo, no dar un falso negativo por
  probar demasiado pronto (ya pasó 3 veces en la sesión que originó este
  plan).
- **Al final de cada fase, dejar el navegador con la sesión cerrada**
  (`/login`) — mismo hábito ya seguido en las fases anteriores.

## Convención de reporte por fase

Cada fase cerrada agrega su propia subsección con:
1. Qué se verificó (lista concreta de pantallas/acciones, no solo el nombre
   del módulo).
2. Bugs reales encontrados — con causa raíz y si se corrigieron (número de PR)
   o quedaron documentados para después.
3. Limitaciones reales de la verificación (ej. "no se probó el envío de
   correo real", "no se generó el PDF de X porque requiere...").

---

## Fase 0 — Preparación ✅ hecha (2026-07-25, sesión previa a este plan)

- [x] Usuarios y organización de prueba creados y verificados contra la DB.
- [x] Bug crítico de fuga de datos entre sesiones (`Cache-Control` sin
      `Vary`) — corregido, PR #31.
- [x] Hueco de auditoría en creación de pilotos — corregido, PR #32.
- [x] CRUD completo probado una vez cosa por cosa: aeronave, batería, piloto
      + invitación + PDF, misión con SORA, despacho, cierre de vuelo,
      mantenimiento con PDF, manual con PDF.
- [x] Landing (home, precios, registro, login) en 375/768/1440px.
- [x] Bug de precios desactualizados en `/registro` — corregido, PR #33.
- [x] Bug "Invalid Date" en "Próxima misión" del Dashboard — corregido, PR #34.
- [x] Dashboard, Despacho (kiosko), Mi Perfil y Organización verificados
      visualmente en móvil real (375px) — primera vez que los fixes de la
      auditoría móvil de código (fases anteriores) se confirman en vivo.

---

## Fase 1 — Landing: páginas SEO restantes ✅ hecha (2026-07-25)

- [x] `/rac-100` — desktop + móvil (342px real), sin errores
- [x] `/gestion-flota-drones`, `/gestion-pilotos` — desktop, sin errores
- [x] `/comparativa-bitafly-airdata`, `/-dronedesk`, `/-geodrone`,
      `/-uav-forecast` — las 4, desktop + `-airdata` también en móvil
- [x] `/documentacion` — ver hallazgo (falso positivo) abajo
- [x] `/blog` (listado, 17 artículos/5 categorías) + 1 artículo
      (`rac-100-colombia-operadores-drones`) — desktop + listado también
      en móvil
- [x] `/casos/skymotion-bogota` — desktop
- [x] Páginas legales: `/aviso-legal`, `/politica-privacidad`,
      `/politica-cookies` (desktop + móvil), `/terminos-condiciones`
- [x] `/sora`, `/rac-100-compliance`, `/reportes-auditoria`,
      `/replay-gps-drones`, `/sms-aeronautico`, `/plan-vuelo-drones`,
      `/autorizaciones-aerocivil`, `/clima-drones`,
      `/drone-logbook-colombia`, `/operadores-uas` — todas, desktop
- [x] Nav/footer consistentes en todo el recorrido — sin sorpresas.

### Bugs reales encontrados

1. **2 páginas SEO en inglés con "6 meses gratis" desactualizado**
   (`/rac-100-compliance`, `/drone-logbook-colombia`) — el trial real del
   plan Piloto es de 15 días desde el 2026-07-08; estas 2 páginas
   (`locale: 'en_US'` a propósito, variantes en inglés para SEO
   internacional — confirmado en el código, no es un bug de idioma)
   quedaron fuera de la barrida que corrigió el mismo copy en ~14
   archivos en español ese día. **Corregido, PR #36.**

### Falso positivo (documentado para no repetir la confusión)

- `/documentacion` mostró `ChunkLoadError` + `Application error` en la
  pestaña que llevaba abierta desde antes de los 3 deploys de fixes de
  esta misma sesión (PR #34, #33 antes) — es el navegador con una
  referencia a un chunk JS que ya no existe tras el redeploy, no un bug
  del sitio. Confirmado abriendo una pestaña nueva: carga perfecto.
  **Lección para las siguientes fases**: si se hace un fix y se sigue
  navegando en la misma pestaña, abrir una pestaña nueva antes de seguir
  el recorrido, no solo antes de reprobar el fix puntual.

### Limitaciones documentadas

- **Banner de consentimiento de cookies**: no se pudo verificar en
  "primera visita" porque el perfil de Chrome usado ya tenía
  `bitafly_cookie_consent` en `localStorage` de antes — no se borró el
  storage del sitio para no tocar datos del navegador real del usuario.
  Pendiente si se quiere verificar de verdad: hacerlo desde una ventana
  de incógnito o un perfil de Chrome nuevo.
- `resize_window` no siempre aplica de forma confiable a una pestaña ya
  existente — funciona bien si se llama **antes** de la primera
  navegación en una pestaña recién creada; si falla, cerrar la pestaña y
  crear una nueva en vez de insistir con el mismo tabId.

---

## Fase 2 — Autenticación completa ✅ (2026-07-25)

- [x] `/reset-password` (solicitar enlace) — formulario + estado de éxito
      confirmados
- [x] `/update-password` — bug real encontrado y corregido (ver abajo)
- [x] Flujo "Unirse a organización" completo en `/registro` (NIT real de la
      org de prueba `QATEST01`, selección de rol) — bug real encontrado y
      corregido (ver abajo)
- [x] Aceptar una invitación real de tripulante, de punta a punta, con los
      3 pilotos con invitación pendiente (`qa.nuevopiloto@`, `qa.auditfix@`,
      `qa.tercerpiloto@bitafly-test.local`) — 2 bugs reales encontrados y
      corregidos (ver abajo); verificado que el 3er intento (ya con ambos
      fixes desplegados) funcionó de punta a punta sin intervención manual:
      cuenta creada, `pilots.invitation_status='accepted'`, login exitoso,
      modal de bienvenida mostró correctamente "Has sido invitado por
      BitaFly QA - Organización de Prueba · Plan Flota"
- [x] Google OAuth — el botón "Continuar con Google" redirige correctamente
      a `accounts.google.com` con el `redirect_uri` real de Supabase
      (`.../auth/v1/callback`), sin error. No se completó el login (política
      de no usar una cuenta real ajena)
- [x] Mensajes de error reales: contraseña incorrecta, correo no registrado
      y correo mal formado — los 3 correctos (verificado en Fase 0)

### Bugs reales encontrados y corregidos

- **PR #38** — `/update-password` mostraba el error crudo de Supabase en
  inglés ("Auth session missing!") en vez de un mensaje traducido, al
  entrar sin una sesión de recuperación válida.
- **PR #39** — Editar el NIT desde Organización (con el formato estándar
  con guion, ej. "900123456-7") rompía "Unirse a organización" para
  cualquiera que intentara unirse después — `dashboard/settings/page.js`
  guardaba `tax_id` tal cual lo escribiera el usuario, sin la misma
  normalización que ya usan `validate-join`/`join-org`/`join-org-additional`
  al buscar. Requirió backfill del `tax_id` de la org QA en Supabase.
- **PR #40** — Aceptar una invitación real devolvía 400 en el navegador
  aunque la cuenta (auth user + profile + organization_members) ya se
  había creado con éxito — el bloque que vincula la fila `pilots`
  existente y marca la invitación como aceptada no tenía su propio
  try/catch, así que cualquier error ahí (encontrado: ver PR #41)
  tumbaba toda la respuesta con 400 pese a que el registro ya había
  funcionado. El usuario veía "error" pero en realidad ya tenía cuenta
  activa, con su fila de `pilots` huérfana en `invitation_status='pending'`
  para siempre. Reparados los 2 pilotos de prueba afectados
  (`qa.nuevopiloto@`, `qa.auditfix@`) en Supabase.
- **PR #41** — **El bug real detrás del 400 de arriba, de mayor alcance**:
  `profiles.active_organization_id` nunca se seteaba en ningún flujo de
  creación/migración de cuenta (solo `/api/org/switch-active` lo hace, y
  requiere que el usuario use el switcher manualmente) — pese a que
  `private.user_org_id()` (la función detrás de la mayoría de políticas
  RLS, incluida la que permite leer `organizations`) resuelve la org
  desde esa columna, no desde `organization_id`. Efecto observado: el
  header del dashboard mostraba "Organización / Individual" en vez del
  nombre real para cualquier cuenta nueva. **Confirmado que esto ya
  afectaba a 2 cuentas reales de producción** (`cubillos-95@hotmail.com`,
  `andresguerra296@gmail.com`), no solo a las de prueba de esta sesión —
  hallazgo que va más allá del alcance original de esta verificación
  puntual. Corregido en los 4 sitios que escriben `organization_id` al
  crear/migrar una cuenta (`api/auth/register`, `lib/epaycoActivation.js`,
  `api/auth/join-org`) — deliberadamente sin tocar
  `api/invitations/accept` (no debe cambiar la org activa automáticamente,
  por diseño de la Fase 5 del refactor multi-organización). Backfill
  aplicado en Supabase para las 5 cuentas afectadas.

### Metodología — lección para fases siguientes

El primer intento de probar "aceptar invitación" con `qa.auditfix@` se
hizo ~20-30s después de mergear el fix de PR #40/#41 y todavía golpeó el
deployment viejo (mismo 400 + dato huérfano) — la propagación de Vercel
tomó más de lo habitual esta vez (varios deploys en cola). Reproducido
limpiamente después vía `curl` directo contra la API (más rápido que
repetir el flujo de navegador completo) una vez confirmado
`state: "READY"` del deployment en la API de Vercel — para bugs de backend
puros, curl es más eficiente que repetir clics de UI para verificar un
fix.

---

## Fase 3 — Dashboard: Operación (Bitácora + Programación + Meteorología) ✅ (2026-07-25)

- [x] Bitácora: filtros combinados (búsqueda de texto probada, sin y con
      resultados), edición inline de PIC y N° de misión (ambas funcionan
      correctamente)
- [x] Bitácora: importación DJI — UI de `DjiRcSync` carga sin error (3
      tabs: DJI RC/Android/iPhone, instrucciones correctas). Sin archivo
      `.txt` real de un dron disponible en este entorno — documentado como
      limitación, no probado el import real
- [x] Programación: vista Semana vs Lista (ambas correctas), navegación
      entre semanas (botón "HOY" aparece/funciona), creación de misión
      completa (con Evaluación SORA obligatoria, clima en vivo integrado,
      municipio/departamento), indicador de conflicto de horario — probado
      creando una 2ª misión mismo piloto mismo día, banner de advertencia
      correcto: *"Este piloto ya tiene una misión programada ese día
      (BIT-001-Y28) — revisa la agenda antes de programar."* Edición
      inline del N° de autorización AeroCivil también verificada
- [x] Meteorología: página carga con datos reales en vivo (score GO/NO-GO,
      6 métricas, pronóstico horario), zonas de operación programadas hoy
      correctamente vacío (la misión de prueba no tenía zona/geometría
      definida — comportamiento esperado, no un bug). Geolocalización real
      del navegador no verificable en este entorno de automatización (sin
      permiso de ubicación real) — cae al fallback correctamente, sin
      error en consola
- [x] Los 4 viewports en Bitácora y Programación: mobile (375px, cards +
      nav inferior, sin overflow), tablet (768px, aún usa el layout
      mobile/día-apilado — breakpoint del grid semanal es más ancho, no es
      un bug), desktop (1440px, grid semanal de 7 columnas correcto)

### Confirmado, sin bugs nuevos encontrados en esta fase

A diferencia de las Fases 1 y 2, esta fase no encontró bugs reales — todo
el módulo de Operación (Bitácora, Programación, Meteorología) funcionó
según lo documentado, incluyendo la integración SORA obligatoria +
clima en vivo al programar una misión (ambas features de sesiones
anteriores), y el indicador de conflicto de horario.

---

## Fase 4 — Dashboard: Flota & Equipo ✅ (2026-07-25)

- [x] Flota: editar la aeronave ya creada (cambiar estado a "en
      mantenimiento" y volver a "operativo" — ambas transiciones correctas,
      hero/KPI/badge actualizados en vivo), trazabilidad de componentes
      (ESC, Hélices, Motores, auto-sembrados con 0.6h de uso desde la
      creación de la aeronave). "Dar de baja" y "transferir a otra
      organización" **no probados** — son operaciones destructivas/de
      alto impacto sobre el único dron de la org QA, que sigue en uso por
      las fases siguientes del plan; no hay una segunda org de prueba
      disponible para probar transferencia sin perder la aeronave actual
- [x] Baterías: editar, cambiar ciclos a ≥200 → estado "Por retirar" se
      deriva automáticamente y correctamente (hero/KPI actualizados),
      revertido a 0 sin problema. "Última aeronave" ya se verificó como
      "Disponible — sin uso reciente" (sin `battery_logs`, comportamiento
      esperado)
- [x] Mantenimiento: editado el registro de Fase 0 (cambio de técnico,
      guardado correcto). Mantenimiento Menor: configurada la
      periodicidad (100h) desde Flota → Editar aeronave, configurado el
      checklist desde Protocolos (plantilla básica, 9 ítems) — **paso no
      documentado explícitamente en el plan pero necesario**: el
      checklist estaba vacío ("pide a un gerente que lo configure
      primero") hasta configurarlo ahí — y diligenciado completo desde
      Mantenimiento → Diligenciar. Registro nuevo "Menor (Piloto)"
      confirmado en la tabla de intervenciones
- [x] Inventario de Operación: activado el checklist (toggle ON), agregada
      una existencia de equipo ("Chaleco de identificación", 5 unidades),
      relacionado el ítem 1 del checklist con esa existencia — guardado
      correcto en ambos casos
- [x] Tripulación: editado el expediente de uno de los pilotos de Fase 2/3
      (CIPU agregado, adición AeroCivil marcada), guardado correcto,
      reflejado en la tarjeta. Verificado que la sección "06. Capacitación"
      aparece correctamente vacía ("Sin evaluaciones de capacitación
      registradas"). **No se encontró un toggle explícito activo/inactivo
      en el panel de edición** — puede vivir en otro punto de la UI no
      explorado en esta pasada; no se documenta como bug, solo como no
      verificado

### Falso positivo real (investigado y descartado)

Al entrar por primera vez a `/dashboard/fleet` se vio "Sin aeronaves
registradas" (0 de 0) pese a que Bitácora y Programación ya mostraban el
Matrice 350 correctamente — parecía un bug real. Investigado con
`read_network_requests`: la consulta real (`aircraft?select=*...`) sí
devolvía 200 con el dato completo; una segunda captura de pantalla
inmediata después mostró la aeronave correctamente. Mismo patrón de
"artefacto de timing en la primera carga" ya documentado en Fases 1-2 —
no se reportó como bug, se verificó con una recarga limpia antes de
concluir.

---

## Fase 5 — Dashboard: Seguridad SMS + SORA + Auditoría ✅ (2026-07-25)

- [x] Las 9 pestañas del hub cargan sin error: SORA (1 evaluación de Fase
      0 visible), Evaluación de Riesgos, Indicadores (SPI), Mejora
      Continua, Acciones Correctivas, Reportes de Seg. Operacional,
      Barreras de Seguridad, Mapas de Restricción, Capacitación SMS
- [x] Evaluación de Riesgos: matriz 5×5 OACI cargada y guardada
      correctamente (colores de tolerabilidad correctos), 1 peligro
      creado ("QA - Pérdida de enlace C2 en zona montañosa", 3C ·
      Tolerable, calculado correctamente)
- [x] Indicadores (SPI): "Cargar ejemplos de indicadores" agregó 6
      indicadores reales del catálogo; agregado 1 dato mensual (enero,
      150 horas / 3 eventos) — tasa /1000 calculada correctamente (20.000)
- [x] Mejora Continua: autoevaluación GAP parcial completada (2/100
      preguntas, 1 Sí + 1 No), cumplimiento 50%, 1 hallazgo generado
- [x] 1 Barrera de Seguridad nueva creada (categoría Humana, con riesgo
      asociado en texto libre)
- [x] Acciones Correctivas: verificado que el hallazgo "No" de la
      autoevaluación GAP aparece correctamente agregado en el tablero
      (fuente "GAP", estado "Pendiente") — confirma la agregación desde
      las 3 fuentes documentada
- [x] Auditoría (`/dashboard/audit`): pestaña Cumplimiento muestra estado
      real de flota/tripulación (docs faltantes correctos para los
      pilotos de prueba); pestaña Registro de acciones muestra 5 eventos
      reales generados por las fases anteriores (creación de misión y
      pilotos), KPIs correctos (5 eventos, 1 usuario activo, 3 módulos)

### Metodología — 2 falsos positivos más, mismo patrón ya documentado

Tanto la Barrera de Seguridad como el indicador SPI y la autoevaluación
GAP mostraron brevemente "sin datos" justo después de guardar (toast de
éxito visible, pero la lista todavía vacía) — mismo artefacto de timing
de carga ya visto en Fases 1, 2 y 4. Verificado con una recarga limpia
en los 3 casos antes de concluir que no eran bugs reales.

También se repitió varias veces el error de extensión
"Cannot access a chrome-extension:// URL of different extension" al
usar clics/tipeo tras un `form_input` — resuelto cada vez navegando de
nuevo a la misma URL en la misma pestaña (no hizo falta pestaña nueva
esta vez), sin pérdida de datos ya guardados.

---

## Fase 6 — Dashboard: Reportes (los ~20 formatos)

División en 2 sub-fases por volumen (mismo criterio ya usado en la
auditoría móvil):

### 6a — Operación y Tripulación ✅ (2026-07-25)

Los 10 formatos generados y descargados con éxito, sin bugs nuevos:
Libro de Vuelo (con selector de aeronaves múltiple), Reporte de
Mantenimiento, Registro de Baterías (fecha de corte, sin selector de
periodo — snapshot correcto), Reporte de Flota (sin fecha — snapshot
correcto), Reporte Operacional UAS (Excel, mes vencido preseleccionado
correctamente, badge "Pendiente de envío"), Trazabilidad de
Componentes, Bitácora de Piloto (tripulante obligatorio, validado),
Expediente de Tripulante, Evaluación de Capacitación (selector
Operaciones/Mantenimiento), Cronograma de Capacitación. Todos los
paneles inline, sin errores de consola atribuibles a la página de
Reportes (solo ruido residual de extensión del navegador en pestañas
previas, no relacionado con la app).

**Limitación documentada**: no fue posible abrir/inspeccionar visualmente
el contenido de cada PDF/Excel descargado dentro de este entorno de
automatización (no hay lector de PDF embebido) — la verificación se
basó en: sin error de consola, el botón vuelve a su estado normal tras
generar (confirma que el proceso client-side de jsPDF/ExcelJS terminó
sin excepción), y que los datos de entrada (aeronave, piloto, período)
mostrados en el panel antes de generar eran correctos. No se pudo
confirmar visualmente que el logo no salga en blanco dentro de cada
archivo — el bug histórico de logo en blanco (2026-07-04) se corrigió a
nivel de código (`fetchLogoDataUrl()`), no se re-verificó pixel por
pixel en esta pasada.

### 6b — Documentación y SMS ✅ (2026-07-25)

Los 11 formatos restantes generados y descargados con éxito, sin bugs
nuevos: Publicación de Manuales, Confirmación de Lectura de Manuales
(snapshot, sin selector de periodo), Indicadores SPI (Excel), Seguimiento
de Indicadores, Autoevaluación GAP del SMS, Mejora Continua (histórico
GAP), Plan de Capacitación SMS (asistencia), Cronograma Capacitación SMS,
Acciones Correctivas del SMS, Listado de Reportes MOR y VOR, Auditoría de
Proveedores (alcance "todos los proveedores", selector vacío por
defecto). Todos los paneles inline con sus campos por defecto (Este mes /
snapshot según el formato), sin errores de consola nuevos atribuibles a
la página de Reportes — el listado de consola se mantuvo idéntico antes
y después de las 11 descargas (mismo ruido residual preexistente de
extensión del navegador en pestañas previas).

Con esto, la **Fase 6 completa** (6a + 6b, los 21 formatos de
`/dashboard/reports`) queda sin bugs nuevos encontrados.

**Misma limitación documentada en 6a**: no fue posible abrir/inspeccionar
visualmente el contenido de cada PDF/Excel descargado dentro de este
entorno de automatización — la verificación se basó en ausencia de error
de consola + el botón volviendo a su estado normal tras generar
(confirma que jsPDF/ExcelJS terminó sin excepción client-side).

---

## Fase 7 — Dashboard: Protocolos + Proveedores + Capacitación + Manuales ✅ (2026-07-25)

Sin bugs nuevos encontrados en las 4 secciones:

- **Protocolos**: confirmados los 4 grupos (Prevuelo, Reportes, Seguridad
  Operacional, Mantenimiento). Se editó el checklist fijo "Salud del
  piloto" (agregado 1 punto de verificación, guardado correcto —
  "1/30 campos" reflejado en la tarjeta). Se creó un protocolo libre
  nuevo ("QA Protocolo Emergencia RTH") en el grupo "Seguridad
  Operacional" (antes vacío) — quedó agrupado correctamente.
- **Proveedores**: sin proveedores previos en la org QA. Se configuró el
  checklist de auditoría (2 criterios: Documentación / Calidad), se creó
  un proveedor ("QA Repuestos y Servicios SAS") y se realizó una
  auditoría completa (ambos criterios "Cumple", 100% de cumplimiento) —
  se generó el PDF individual desde el historial de auditorías del
  proveedor. Mismo falso positivo de timing ya documentado en fases
  anteriores: el toast confirmó "Auditoría registrada" pero el panel
  seguía mostrando "sin auditorías" hasta recargar la página — al
  recargar, los KPIs (Auditorías este año: 1, Cumplimiento: 100%) y la
  tarjeta del proveedor reflejaron el dato correctamente. No es un bug
  de guardado, es el mismo patrón de refresco en caliente ya investigado
  y descartado varias veces en este plan.
- **Capacitación**: confirmadas las 3 pestañas (Operaciones,
  Mantenimiento, Capacitación SMS). Se agregó una sesión al cronograma
  de Operaciones, se guardó la configuración del examen interno
  (nota mínima 80%, 3 intentos, mensual) y se agregó 1 pregunta de
  opción múltiple con sus 4 opciones — guardado confirmado ("Banco de
  preguntas guardado").
- **Manuales**: se confirmó lectura de la v1.0 ya creada en Fase 0
  (badge Pendiente → Leído), se revisó el panel de Seguimiento (roster
  de 7 miembros de la org, 1/7 leído) y se generó el Acta PDF sin error.
  Se publicó una v2.0 (subiendo un PDF de prueba) — confirmado el
  comportamiento documentado: el acuse de lectura se resetea por
  versión, el badge volvió a "Pendiente" para el mismo usuario que ya
  había leído la v1.0.

Sin errores de consola nuevos atribuibles a ninguna de las 4 páginas en
todo el recorrido.

---

## Fase 8 — Organización, Suscripción, Gestión de Usuarios, Perfil ✅ (2026-07-25)

Sin bugs nuevos encontrados en las 4 secciones:

- **Organización**: se completó el Registro AeroCivil (N° explotador, N°
  operador UAS, vigencia a 1 año, chip de autorización "VLOS") — el
  header pasó a mostrar el badge "Registro AeroCivil Vigente · 24 de jul
  de 2027 · 365d" tras guardar. Se subió el logo corporativo (PNG de
  prueba) — toast "Logo actualizado", avatar reflejado de inmediato. Se
  descargó la plantilla .xlsx de Onboarding Express sin error.
- **Suscripción**: medidores de uso reflejan datos reales acumulados en
  fases anteriores (Aeronaves 1/10, Pilotos 3/10, Vuelos este mes 1/
  ilimitado, plan Flota $159.000/mes) — historial de facturación en
  estado vacío correcto ("Aún no hay pagos registrados").
- **Gestión de Usuarios**: se cambió el rol de QA AuditFix (Piloto →
  Jefe de Pilotos) desde la cuenta GG — modal de confirmación mostrado
  antes de aplicar. Se cerró sesión y se inició sesión como
  `qa.auditfix@bitafly-test.local`: el header reflejó correctamente
  "JEFE DE PILOTOS" de inmediato tras el login, sin necesidad de refresh
  adicional. Se confirmó además que el sistema permite más de un
  miembro con rol Jefe de Pilotos simultáneamente (no hay unicidad
  forzada para ese rol, a diferencia de Gerente General) — comportamiento
  no documentado explícitamente pero consistente con las reglas
  mostradas en pantalla ("No se puede degradar al último Gerente
  General" es la única restricción de unicidad listada). Se revirtió el
  rol a Piloto al finalizar la prueba.
- **Mi Perfil** (cuenta QA Gerente General): se completó Licencia RPAS
  (N° CIPU, vencimiento de certificado médico) y Contacto de Emergencia
  — guardado confirmado ("Expediente guardado exitosamente"), badge
  "Certificado médico Vigente" reflejado en el hero. Se subieron los 4
  documentos de "Documentos del Piloto" (Cédula, Diploma UAS, Examen
  Teórico Aerocivil, Certificado Médico) — aparecieron de inmediato en
  "Archivos cargados", y el botón "Guardar Documentos" mostró el estado
  "Guardando y notificando...". Confirmado en vivo: al iniciar sesión
  como QA AuditFix (Jefe de Pilotos), la campana de notificaciones
  mostró "QA Gerente General actualizó su expediente. Revisa sus
  documentos en la sección Tripulación." — coincide exactamente con lo
  documentado en **Notificaciones** (expediente actualizado → GG+JP+
  GSMS).

Sin errores de consola nuevos atribuibles a ninguna de las 4 páginas en
todo el recorrido (mismo ruido residual de extensión ya documentado).

---

## Fase 9 — Roles no-GG a fondo (más allá del nav ya verificado) ✅ (2026-07-26)

El recorrido anterior solo verificó navegación/permisos por rol. Esta fase
hizo acciones reales con cada rol — **2 bugs reales encontrados y
corregidos**, ambos de severidad alta:

- [x] **Jefe de Pilotos**: se creó una misión (PIC = otro piloto de la org)
      y se despachó/cerró como Jefe de Pilotos (flujo completo con orden de
      vuelo, checklists de Salud/Inventario/Pre-vuelo/Briefing). Al aprobar
      el primer intento se topó con el constraint único
      `uq_flights_org_aircraft_date_time` (misma aeronave/fecha/hora que un
      vuelo ya registrado en una fase anterior) — no es un bug, es la
      protección anti-duplicados funcionando correctamente; se reintentó
      con otra hora y el despacho + cierre se completaron sin problema
      (BIT-306-950, 30 min).
- [x] **Gerente SMS**: se creó un reporte SMS real desde `/dashboard/sms` —
      al intentar abrir su "Seguimiento de caso"
      (`/dashboard/safety/case/[id]?source=sms`) se encontró **Bug #1**:
      la ruta devolvía 404 "Caso no encontrado" para **cualquier** reporte
      SMS, porque el SELECT embebido `owner:owner_id(full_name)` requiere
      una foreign key `sms_reports.owner_id -> profiles(id)` que en
      realidad apuntaba a `auth.users(id)` (tabla sin `full_name`, fuera
      del schema de PostgREST) — bloqueaba por completo el módulo de
      seguimiento de casos SMS. Corregido (PR #50, FK redirigida a
      `profiles` con `ON DELETE SET NULL`) y reverificado en vivo: el
      caso cargó, mostró el nombre real del reportante, se agregó y
      completó una acción correctiva, y se cerró el caso — línea de
      tiempo completa.
- [x] **Piloto de organización**: se creó una misión asignada a este
      piloto para el día vigente, se confirmó que "Mis Vuelos Programados"
      solo muestra esa misión (filtro por PIC correcto), se despachó y
      cerró el vuelo (BIT-306-950 → renombrado tras colisión de horario,
      30 min), y se envió un reporte VOR real desde el botón del
      dashboard del piloto. El primer intento de envío reveló **Bug #2**,
      más grave: `POST /api/public/vor/[orgCode]` (y el equivalente MOR)
      devolvía 404 "Formulario no disponible para esta organización" para
      **cualquier** envío, porque exigía una fila en `vor_mor_definitions`
      que solo se crea si un admin visita el editor de formato y guarda
      al menos una vez. Verificado contra producción: **de las 17
      organizaciones reales, ninguna tenía esa fila** — el envío de
      reportes VOR/MOR estaba roto para el 100% de los clientes reales.
      Corregido (PR #51: ambas rutas crean la definición por defecto de
      forma perezosa si no existe, + backfill aplicado ya en producción
      para las 17 organizaciones) y reverificado en vivo: el reporte VOR
      se envió con éxito, con número de referencia de confirmación.
- [x] **Piloto Independiente**: sin aeronave propia al iniciar sesión — se
      creó una (Mini 4 Pro, plan Piloto respetó el límite de 1 dron,
      mostrado como "1/1" con candado de límite de plan). Se completó el
      despacho simplificado (sin orden de vuelo, sin batería, sin paso de
      Inventario — 4 pasos en vez de 5) y se cerró el vuelo (30 min).

Con esto, **Fase 9 completa** sin quedar pendiente ningún rol.

---

## Fase 10 — Panel Master (superadmin) y Panel Socio ✅ (2026-07-26, parcial por decisión del usuario)

Fuera del alcance de los usuarios QA ya creados (requiere la cuenta
superadmin real). Confirmado con el usuario (`AskUserQuestion`, 2
preguntas) antes de tocar `/admin/master` con la cuenta real: alcance
solo lectura/navegación (sin acciones destructivas ni ediciones sobre
datos reales), y crear un socio QA de prueba para poder probar `/socio`
de punta a punta sin tocar datos de socios reales.

- [x] `/admin/master` — recorridas **5 de 7 tabs** en modo solo lectura,
      sin bugs encontrados: **Usuarios** (20 usuarios reales, filtros por
      plan funcionando), **Invitaciones** (formulario de invitación
      cargó correctamente, sin enviar nada), **Suscripciones** (datos
      reales de ePayco, mayormente `canceled`), **Planes ePayco**
      (confirma en vivo el trial de 15 días documentado en Fase 7 de
      multi-org), **Socios** (usada además para crear el socio de
      prueba, ver abajo). **Comisiones** y **App Releases** quedaron sin
      revisar — el usuario decidió cerrar la fase así en vez de volver a
      iniciar sesión como superadmin (ver nota de sesión abajo).
- [x] `/socio` — se creó un socio de prueba real ("QA Escuela de
      Prueba", código `QATESTSOCIO01`, 20% comisión, 90 días gratis)
      desde el tab Socios de Master, y se vinculó como owner a una
      cuenta nueva (`qa.socio@bitafly-test.local`) vía el flujo de
      invitación real (`partner_invitations` → token → `/registro?
      socio_invite=`) — el formulario de registro mostró correctamente
      el banner de invitación con el correo bloqueado. Con la cuenta ya
      registrada se recorrieron las **3 pestañas de `/socio`** sin bugs:
      Panel (código de venta, KPIs en cero, "Regalar perfil gratis"
      probado de punta a punta — creó un `free_grants` real para
      `qa.regalo@bitafly-test.local`, reflejado de inmediato como
      "Perfiles regalados: 1"), Reportes (filtros de período, estado
      vacío correcto) y Perfil (datos de cuenta, subida de logo, zona de
      peligro).
- **Nota real sobre sesión de navegador**: registrar la cuenta nueva
  `qa.socio@bitafly-test.local` en una pestaña reemplazó la sesión de
  superadmin en **todo el navegador** (mismo origen, mismo storage de
  Supabase Auth compartido entre pestañas) — no es un bug de la app, es
  el comportamiento esperado de un navegador compartido entre pestañas
  del mismo sitio. Confirmado con el usuario (`AskUserQuestion`): cerrar
  la fase así, dejando **Comisiones y App Releases sin revisar** como
  pendiente explícito en vez de pedirle iniciar sesión de nuevo.

---

## Fase 11 — Pasada responsive final cruzada ✅ (2026-07-25)

Con todos los módulos ya funcionalmente probados en Fases 3-9, esta fase es
puramente visual: recorrer los módulos con más densidad de datos (ahora que
tienen datos reales de las fases anteriores, no estados vacíos) en los 4
viewports, buscando overflow/recorte que solo aparece con contenido real
(tablas anchas, chips largos, nombres largos).

- [x] Bitácora, Programación, Reportes, Seguridad SMS — con datos reales
- [x] Confirmar que ningún cambio de las fases anteriores rompió algo ya
      verificado en la auditoría móvil de código (Fases 0-6 de
      `plan-mobile-ux-bitafly.md`)

Recorridos los 4 módulos con datos reales (acumulados de las Fases 3-10:
3 vuelos, 2 misiones programadas, 1 evaluación SORA, 1 caso VOR, 1 peligro
en la matriz de riesgo, 7 eventos de auditoría) en **3 viewports** —
mobile (375px), tablet (820px) y desktop ancho (1920px). Sin bugs
encontrados:

- **Bitácora**: en mobile las tarjetas (patrón tabla-desktop/tarjetas-
  mobile) no recortan ningún dato real (misión, aeronave, piloto,
  duración); en tablet/desktop la tabla usa su contenedor con scroll
  horizontal propio sin desbordar la página.
- **Programación**: la grilla semanal de 7 días con misiones reales
  (nombre de tipo de operación + piloto) se lee completa en los 3
  anchos, con texto truncado correctamente en mobile en vez de recortado.
- **Reportes**: la barra de búsqueda, los chips "Todas/Ninguna" del
  selector de aeronaves y el panel de descarga inline (con datos reales
  de la flota QA) se ven completos en mobile sin desbordar.
- **Seguridad SMS**: la franja de 8 tabs (incluye las 2 nuevas del plan
  de mejora SMS) se comprime a una tira con scroll horizontal propio en
  mobile/tablet y cabe completa en una sola línea en desktop ancho — sin
  clip del texto. Las tablas de cada tab (SORA, matriz de riesgo 5×5,
  registro de peligros, cumplimiento VOR/MOR, acciones correctivas
  consolidadas) con los datos reales de las Fases 9-10 se leen completas
  o desbordan dentro de su propio contenedor con scroll, nunca a nivel
  de página.
- Confirma que ningún cambio de código de las Fases 3-10 (multi-org,
  SORA obligatorio, casos SMS/VOR, etc.) introdujo una regresión visual
  sobre los patrones ya establecidos en la auditoría móvil de código
  (`plan-mobile-ux-bitafly.md`).

---

## Fase 12 — Performance y fluidez ✅ (2026-07-26) — 1 bug real encontrado y corregido

- [x] Tiempos de carga percibidos (no Lighthouse formal, pero sí
      `read_network_requests` para detectar llamadas lentas/duplicadas) en
      Dashboard, Bitácora, Reportes
- [x] Confirmar que no hay llamadas repetidas innecesarias a la misma API
      (ej. polling excesivo, refetch en cada render)
- [x] Revisar si algún módulo tarda notoriamente más que el resto al cargar

**Bug real encontrado y corregido — query muerta que fallaba (503) en cada
carga del dashboard (PR #55)**: inspeccionando `read_network_requests` en
`/dashboard` y `/dashboard/logbook` se encontró que `dashboard/layout.js`
(envuelve **todas** las rutas del dashboard) ejecutaba en cada navegación
un `HEAD` `count:'exact'` sobre `aircraft` filtrado por `organization_id`
— el mismo patrón que `CLAUDE.md` ya documenta como no confiable ("Regla
de conteo"). En la org QA esa consulta devolvía **503 de forma
consistente**, y su resultado (`aircraftCount`) **nunca se leía en
ningún otro lugar del archivo** — el dato real que consume
`OnboardingBanner` viene de una fuente distinta
(`DashboardClient.js#data.stats.fleetCount`). Se eliminó la query y el
estado muerto. Verificado en vivo tras el deploy: `read_network_requests`
ya no muestra ninguna petición a `aircraft` en `/dashboard`, sin ningún
cambio visible para el usuario (el contador "Aeronaves activas 1/1" del
panel sigue viniendo de otra fuente y se ve idéntico).

**Sin más hallazgos**: el resto de llamadas de red en Dashboard, Bitácora,
Programación y Reportes son las esperadas para cada página (perfil, org,
plan efectivo, vuelo activo, membresías) — un aparente "doble llamado" a
`organization_members` (plan del admin) visto en una captura resultó ser
acumulación del buffer de red entre dos navegaciones sucesivas sin
limpiar (`clear`), no una llamada real duplicada por el código; una
segunda captura limpia por página confirmó una sola llamada por
navegación client-side. El único doble-llamado real detectado —
`getOrgPlan()` ejecutándose tanto en `dashboard/layout.js` como en
`DashboardClient.js` al aterrizar exactamente en `/dashboard` por primera
vez — es menor (una sola vez por sesión, no por cada render/navegación) y
se documenta pero no se corrige en esta pasada. Ningún módulo mostró
tiempos de carga notoriamente más lentos que el resto; el polling ya
documentado (campana de notificaciones cada 45s) es el único
intencional.

---

## Fase 13 — Cierre

- [ ] Consolidar en este archivo la lista completa de bugs encontrados en
      todas las fases (con su número de PR)
- [ ] Confirmar con el usuario si se eliminan los usuarios/organizaciones de
      prueba o se dejan
- [ ] Actualizar `CLAUDE.md` con un resumen de esta auditoría, mismo
      criterio ya usado para la auditoría móvil

---

## Próximo paso

Fases 0-5 completas (2026-07-25). Fase 1 encontró y corrigió 1 bug real
(PR #36). Fase 2 encontró y corrigió 4 bugs reales (PR #38, #39, #40,
#41) — el más significativo (PR #41, `active_organization_id` nunca
seteado al crear cuenta) resultó tener alcance de producción real, más
allá del flujo puntual que se estaba probando, y ya fue reparado +
backfillado. Fases 3 y 4 no encontraron bugs nuevos. Fase 5 (Seguridad
SMS + SORA + Auditoría) tampoco encontró bugs nuevos — las 9 pestañas
del hub, la matriz de riesgo OACI + registro de peligro, Indicadores
SPI (ejemplos + dato mensual), autoevaluación GAP parcial, una Barrera
de Seguridad nueva, la agregación de Acciones Correctivas desde 3
fuentes, y las 2 pestañas de Auditoría — todo funcionó correctamente.
2 falsos positivos más (mismo patrón de timing de carga de fases
anteriores) investigados y descartados antes de reportarlos. Quedaron
datos de prueba adicionales en la org QA: 1 misión, 1 existencia de
equipo, 1 registro de Mantenimiento Menor, 1 barrera de seguridad, 1
peligro/hazard, 6 indicadores SPI de ejemplo, 1 autoevaluación GAP
parcial. Fase 6 completa (6a + 6b, los 21 formatos de
`/dashboard/reports`) sin bugs nuevos — todos se generaron y
descargaron sin error de consola; limitación documentada: no fue
posible inspeccionar visualmente el contenido de cada PDF/Excel dentro
de este entorno de automatización. Fase 7 (Protocolos + Proveedores +
Capacitación + Manuales) completa sin bugs nuevos — se creó 1 protocolo
libre nuevo, se editó 1 checklist fijo, se creó 1 proveedor con su
checklist de auditoría y 1 auditoría completa (100%), se configuró 1
examen interno con 1 pregunta, y se publicó una v2.0 del manual QA
confirmando que el acuse de lectura se resetea correctamente por
versión. Un falso positivo más de timing de carga (mismo patrón ya
descartado varias veces) en el panel de Proveedores, investigado y
confirmado como no-bug tras recargar. Quedaron datos de prueba
adicionales en la org QA: 1 protocolo libre, 1 punto de verificación en
Salud del piloto, 1 proveedor con 1 auditoría, 1 sesión de cronograma
de Capacitación Operaciones, 1 examen interno con 1 pregunta, manual QA
en v2.0. Fase 8 (Organización, Suscripción, Gestión de Usuarios, Perfil)
completa sin bugs nuevos — Registro AeroCivil completado con badge de
vigencia reflejado en el header, logo corporativo subido, plantilla de
Onboarding Express descargada; medidores de Suscripción reales y
correctos tras los datos de fases anteriores; cambio de rol en Gestión
de Usuarios verificado con un login real de la cuenta afectada (el
rol nuevo se reflejó de inmediato); Mi Perfil completado (Licencia RPAS
+ Contacto de Emergencia + 4 documentos) con la notificación de
"expediente actualizado" confirmada en vivo en la campana de otra
cuenta (Jefe de Pilotos). Quedaron datos de prueba adicionales en la
org QA: Registro AeroCivil completo + logo en la organización, Licencia
RPAS + contacto de emergencia + 4 documentos en el perfil de QA
Gerente General. Fase 9 (Roles no-GG a fondo) completa — **2 bugs reales
de severidad alta encontrados y corregidos**: (1) PR #50, `GET
/api/safety/case?source=sms` devolvía 404 para cualquier reporte SMS por
una FK mal apuntada (`sms_reports.owner_id` a `auth.users` en vez de
`profiles`), bloqueando todo el seguimiento de casos SMS; (2) PR #51,
`POST /api/public/vor|mor/[orgCode]` devolvía 404 para cualquier envío
público porque exigía una fila de configuración que ninguna de las 17
organizaciones reales había creado — el envío de reportes VOR/MOR
regulatorios estaba roto para el 100% de los clientes en producción
hasta este fix + backfill. Ambos verificados en vivo tras el fix:
reporte SMS con acción correctiva + cierre de caso, y reporte VOR
enviado con éxito con número de referencia. Los 4 roles (Jefe de
Pilotos, Gerente SMS, Piloto de organización, Piloto Independiente)
completaron sus flujos reales de extremo a extremo (despacho + cierre
de vuelo, gestión de casos, reporte VOR, alta de aeronave propia con
límite de plan verificado). Quedaron datos de prueba adicionales en la
org QA: 2 misiones nuevas, 2 vuelos más registrados, 1 caso SMS cerrado
con 1 acción correctiva, 1 reporte VOR real, 1 aeronave propia en la
org del piloto independiente. Fase 10 (Panel Master + Panel Socio)
completa de forma parcial por decisión del usuario — confirmado el
alcance solo lectura sobre `/admin/master` con la cuenta superadmin
real: 5 de 7 tabs recorridas sin bugs (Usuarios, Invitaciones,
Suscripciones, Planes ePayco, Socios); Comisiones y App Releases
quedaron sin revisar porque registrar el socio de prueba en una
pestaña reemplazó la sesión de superadmin en todo el navegador (mismo
storage de Supabase Auth entre pestañas del mismo origen — no es un
bug, el usuario decidió cerrar la fase así en vez de reiniciar sesión).
Se creó un socio de prueba real ("QA Escuela de Prueba",
`QATESTSOCIO01`) y se probó `/socio` de punta a punta (Panel, Reportes,
Perfil, regalo de perfil gratis real) sin bugs. Quedaron datos de
prueba adicionales: 1 socio QA con 1 cuenta owner vinculada y 1 regalo
de perfil enviado. Fase 11 (pasada responsive final cruzada) completa
sin bugs: Bitácora, Programación, Reportes y Seguridad SMS recorridas
con todos los datos reales acumulados de las Fases 3-10 en 3 viewports
(375px, 820px, 1920px) — ningún desbordamiento a nivel de página en
ninguno de los 4 módulos, todo el contenido ancho (tablas, tira de 8
tabs de Seguridad SMS, calendario semanal) queda contenido en su propio
scroll horizontal cuando corresponde, sin recortar datos reales. Fase 12
(performance y fluidez) completa con **1 bug real corregido** (PR #55):
`dashboard/layout.js` ejecutaba en cada carga de cualquier página del
dashboard una query muerta (`HEAD count:'exact'` sobre `aircraft`) que
devolvía 503 de forma consistente en producción y cuyo resultado nunca
se usaba en ningún lado — eliminada, verificada en vivo tras el deploy
(la petición ya no aparece en `read_network_requests` y el contador de
flota del panel se ve idéntico, viene de otra fuente). Sin más hallazgos
de performance — un aparente doble-llamado a `organization_members` en
una captura resultó ser acumulación del buffer de red entre navegaciones
sin limpiar, no un bug real. Esperando indicación del usuario sobre con
qué fase continuar — recomendado: **Fase 13** (cierre).
