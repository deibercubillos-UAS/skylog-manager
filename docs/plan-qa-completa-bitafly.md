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

División sugerida en 2 sub-fases por volumen (mismo criterio ya usado en la
auditoría móvil — "son bastantes, divídela" si al ejecutar resulta pesado):

- [ ] **6a — Operación y Tripulación**: Libro de Vuelo, Reporte de
      Mantenimiento, Registro de Baterías, Reporte de Flota, Reporte
      Operacional UAS (Excel), Trazabilidad de Componentes, Bitácora de
      Piloto, Expediente de Tripulante, Evaluación de Capacitación,
      Cronograma de Capacitación
- [ ] **6b — Documentación y SMS**: Publicación de Manuales, Confirmación
      de Lectura de Manuales, Indicadores SPI (Excel), Seguimiento de
      Indicadores, Autoevaluación GAP, Mejora Continua (histórico GAP),
      Plan de Capacitación SMS, Cronograma Capacitación SMS, Acciones
      Correctivas del SMS, Listado de Reportes MOR y VOR, Auditoría de
      Proveedores
- [ ] Para cada uno: generar el PDF/Excel real (no solo abrir el panel),
      confirmar que descarga sin error de consola y que el logo/datos no
      salen en blanco (bug histórico ya documentado y corregido — verificar
      que sigue corregido)

---

## Fase 7 — Dashboard: Protocolos + Proveedores + Capacitación + Manuales

- [ ] Protocolos: los 4 grupos (Prevuelo, Reportes, Seguridad Operacional,
      Mantenimiento), editar un checklist fijo (ej. Salud), crear un
      protocolo libre nuevo en "Seguridad Operacional"
- [ ] Proveedores: crear un proveedor, configurar el checklist de
      auditoría, realizar una auditoría completa, generar el PDF individual
- [ ] Capacitación: las 3 pestañas (Operaciones, Mantenimiento, Capacitación
      SMS), configurar un examen interno, agregar una pregunta
- [ ] Manuales: publicar una segunda versión del manual ya creado en Fase 0,
      confirmar que el acuse de lectura se resetea, generar el Acta PDF

---

## Fase 8 — Organización, Suscripción, Gestión de Usuarios, Perfil

- [ ] Organización: completar Registro AeroCivil (N° operador, vigencia,
      autorizaciones), subir el logo (PDF/imagen), Onboarding Express
      (descargar plantilla .xlsx, no hace falta subir una llena)
- [ ] Suscripción: verificar medidores de uso reales tras los datos creados
      en fases anteriores, historial de facturación vacío correcto
- [ ] Gestión de Usuarios: cambiar el rol de uno de los pilotos de prueba
      (ej. `qa.piloto` → Jefe de Pilotos temporalmente) y confirmar que el
      cambio se refleja al volver a iniciar sesión con esa cuenta
- [ ] Mi Perfil: completar Licencia RPAS + Documentos del Piloto (subir los
      4 PDF/JPG), confirmar la notificación

---

## Fase 9 — Roles no-GG a fondo (más allá del nav ya verificado)

El recorrido anterior solo verificó navegación/permisos por rol. Esta fase
hace acciones reales con cada rol:

- [ ] Jefe de Pilotos: despachar un vuelo real (flujo con orden de vuelo),
      cerrar el vuelo
- [ ] Gerente SMS: crear un reporte SMS, gestionar un caso (seguimiento con
      acciones correctivas)
- [ ] Piloto de organización: ver "Mis Vuelos", despachar la misión que le
      asignaron, reportar un VOR desde su dashboard
- [ ] Piloto Independiente: despacho simplificado completo (crear aeronave
      propia primero si no tiene), cerrar vuelo, confirmar que su plan
      Piloto respeta los límites (1 dron, 1 usuario)

---

## Fase 10 — Panel Master (superadmin) y Panel Socio

Fuera del alcance de los usuarios QA ya creados (requieren la cuenta
superadmin real o crear un socio de prueba) — confirmar con el usuario
antes de tocar `/admin/master` con la cuenta real, dado que ese panel
gestiona datos de clientes reales (comisiones, suscripciones reales).

- [ ] `/admin/master` — tabs Usuarios, Suscripciones, Socios, Comisiones,
      Invitaciones, App Releases (solo lectura/navegación, sin acciones
      destructivas sobre datos reales sin confirmación explícita)
- [ ] `/socio` — requiere crear un socio de prueba primero (decisión a
      confirmar con el usuario: ¿crear un socio QA igual que se crearon los
      5 usuarios?)

---

## Fase 11 — Pasada responsive final cruzada

Con todos los módulos ya funcionalmente probados en Fases 3-9, esta fase es
puramente visual: recorrer los módulos con más densidad de datos (ahora que
tienen datos reales de las fases anteriores, no estados vacíos) en los 4
viewports, buscando overflow/recorte que solo aparece con contenido real
(tablas anchas, chips largos, nombres largos).

- [ ] Bitácora, Programación, Reportes, Seguridad SMS — con datos reales
- [ ] Confirmar que ningún cambio de las fases anteriores rompió algo ya
      verificado en la auditoría móvil de código (Fases 0-6 de
      `plan-mobile-ux-bitafly.md`)

---

## Fase 12 — Performance y fluidez

- [ ] Tiempos de carga percibidos (no Lighthouse formal, pero sí
      `read_network_requests` para detectar llamadas lentas/duplicadas) en
      Dashboard, Bitácora, Reportes
- [ ] Confirmar que no hay llamadas repetidas innecesarias a la misma API
      (ej. polling excesivo, refetch en cada render)
- [ ] Revisar si algún módulo tarda notoriamente más que el resto al cargar

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
parcial. Esperando indicación del usuario sobre con qué fase continuar
— recomendado: **Fase 6** (Dashboard: Reportes, los ~20 formatos),
sigue el orden natural del plan.
