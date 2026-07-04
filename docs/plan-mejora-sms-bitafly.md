# Plan de Mejora — Seguridad SMS (BitaFly)

Documento de control del proyecto de rediseño de la pestaña **Seguridad SMS**
(`/dashboard/safety`), para alinear la plataforma con las guías, circulares y
directivas que Aerocivil emite para explotadores UAS. Mismo espíritu que
`docs/plan-mejora-diseno-bitafly.md`: se actualiza fase a fase conforme se
ejecuta, y sirve de referencia para retomar el proyecto en cualquier momento.

**No se toca**: VOR y MOR (formularios públicos, editor de formato, gestión en
`/dashboard/vor-mor`) — ya implementados y fuera de alcance. Este plan solo
reordena su *listado* dentro del nuevo hub, sin tocar su lógica.

---

## Fuentes documentales revisadas

Todas explícitamente dirigidas a **explotadores UAS** (no aviación tripulada):

| Documento | Clave | Contenido usado en este plan |
|---|---|---|
| Circular — Implementación del SMS en explotadores UAS | MAUT-5.0-22-017 | Evaluación y gestión de riesgos (matriz, tolerabilidad, probabilidad/gravedad), instrucción y educación SMS, documentación SMS |
| Apéndice 1 — Análisis GAP del SMS para Explotador UAS | MAUT-5.0-22-017 | Catálogo de preguntas Sí/No por componente/elemento (Mejora Continua) |
| RAC 219 — Normas Generales de Implantación del SMS | RAC 219 | Marco regulatorio general (aplica a UAS vía numeral 219.005(b)) |
| Herramienta de Evaluación de SMS (PEL-OPS-AIR-ANS-AGA) | RAC 219 / MAUT-3.0-12-097 | Versión ponderada (P/S/O/E) del GAP — referencia para una fase futura opcional, no se construye ahora |
| Circular — Definición de Indicadores de desempeño (SPI) | MAUT-1.0-22-005 | Estructura de indicadores, denominador por tipo de proveedor, fórmula de tasa y líneas de alerta (± D.E.), plan de acción |
| Excel — Herramienta definición de SPIs | MAUT-1.0-12-002 | Estructura exacta de datos mensuales, líneas de alerta, tabla de planes de acción (defensa/causa raíz/desencadenante/documento/tiempo) |
| Directiva 02-24 — Reporte de Eventos de Seguridad Operacional | MAUT-1.0-22-004 | Definición MOR/VOR (ya implementado), taxonomía, plazo de 5 días hábiles para radicar MOR en IRIS |
| Directiva — Aceptación de los SMS | MAUT-1.0-22-006 | Referencia de aceptación formal del SMS por Aerocivil |
| Directiva — Asuntos Complementarios para Implementación de SMS | MAUT-1.0-22-007 | Complementos al proceso de implementación |
| Circular — Guía para obtener el Certificado de Explotador UAS | MAUT-5.0-22-011 | Contexto general del certificado (no genera trabajo directo en este plan) |

---

## Decisiones de alcance confirmadas con el usuario

Confirmadas vía `AskUserQuestion` antes de tocar código:

1. **Mejora Continua**: se construye primero el **checklist simple Sí/No** (Apéndice 1, 4 componentes/12 elementos/100 preguntas — corregido de "9 componentes" tras releer el documento completo) — la herramienta ponderada PEL-OPS-AIR-ANS-AGA (229 filas, puntaje P/S/O/E) queda como fase futura opcional, no se construye ahora.
2. **Acciones Correctivas**: **tablero consolidado de solo-agregación** sobre 3 fuentes (casos VOR/MOR/SMS ya existentes, planes de acción de indicadores SPI, hallazgos GAP) — la edición de cada acción se hace desde su pantalla de origen, no se duplica lógica de edición ni se crea una tabla unificada nueva.
3. **Plan de Capacitación del SMS**: **solo asistencia/roster** (quién asistió a cada sesión, con fecha) — sin examen calificado, porque el documento no lo exige (a diferencia del módulo "Capacitación" ya construido para Operaciones/Mantenimiento, que sí es examen).
4. **Plazos de reportes**: el control de 5 días hábiles aplica formalmente solo a **MOR** (requisito regulatorio de la Directiva 02-24); para **VOR** se usa el mismo mecanismo pero como plazo **interno sugerido**, dejando documentado que no es una obligación legal — para no dar a entender que VOR tiene un plazo regulatorio que no tiene.
5. **Barreras en el registro de peligros**: la mitigación se captura como **texto libre** directamente en `safety_hazards`, escrita por quien registra el peligro — no exige seleccionar (ni existir previamente) una fila del catálogo `safety_barriers`. Evita bloquear el registro rápido de un peligro recién identificado por falta de una barrera ya formalizada.
6. **Gravedad del riesgo**: **escala única de 5 niveles** (Catastrófico/Peligroso/Mayor/Menor/Insignificante), igual a la Tabla 3 e Ilustración 4 de referencia — no se construye la variante de 4 escalas por categoría (Matriz RAM de Personas/Económico/Ambiental/Imagen) mencionada como referencia opcional en el documento.
7. **Denominador de Indicadores SPI**: **lista fija de las 6 categorías** que define la circular (Ciclos de vuelo / Horas de vuelo / Horas-hombre / Número de operaciones, según tipo de proveedor) — no texto libre, para preservar la consistencia que exige la circular ("el mismo denominador para todos los indicadores del mismo tipo de proveedor").
8. **Roster de Capacitación del SMS**: basado en **todos los `profiles` de la organización** (GG, GSMS, JP, pilotos, etc.), no solo en `pilots` — coincide con "formación para todo el personal y en todos los niveles" del documento; a diferencia del roster de `pilots` que usa el módulo de Capacitación (Operaciones/Mantenimiento) ya existente.
9. **Permisos**: no se crea ningún permiso nuevo — todo el hub Seguridad SMS (incluido el nuevo tab Capacitación SMS) sigue gateado con `canViewFinance` (lectura) y `canManageSMS` (escritura), igual que hoy. Confirmado con el usuario que, por ahora, jefe_pilotos/piloto no tienen vista propia de su asistencia — la administra GG/GSMS.

---

## Cómo queda la pestaña Seguridad SMS

Hoy (`dashboard/safety/page.js`) tiene 4 tabs: `Análisis SORA`, `Barreras de
Seguridad`, `Reportes SMS` (VOR+MOR+SMS consolidado), `Mapas`.

Pasa a:

```
SORA · Evaluación de Riesgos · Indicadores (SPI) · Mejora Continua ·
Acciones Correctivas · Reportes de Seg. Operacional · Reportes SMS (VOR/MOR, intacto) ·
Barreras · Mapas · Capacitación SMS
```

"Reportes SMS" (VOR/MOR consolidado) se mantiene tal cual — solo cambia de
posición en la barra de tabs, sin tocar su lógica ni sus datos.

---

## Fases

### Fase 0 — Preparación ✅ Completada

**Conclusión de la verificación de permisos**: no se necesita ningún permiso
nuevo en `lib/roles.js`. Hoy `dashboard/safety/layout.js` gatea **todo** el
hub con `canViewFinance` (`superadmin/admin/gerente_sms`) y las API routes de
Seguridad SMS (barreras, casos, VOR/MOR gestión, reporte AeroCivil) usan
`canManageSMS` (mismo set de roles) para escritura — ni `jefe_pilotos` ni
`piloto` entran hoy al hub completo. Se confirmó con el usuario
(`AskUserQuestion`) que el nuevo tab **Capacitación SMS** (roster para "todo
el personal") sigue este mismo patrón: **solo GG/GSMS administran**, sin
vista de autoservicio para jefe_pilotos/piloto por ahora — evita abrir el
primer hueco en el guard existente del hub. Todos los módulos nuevos (Fases
2-7) reutilizan `canViewFinance` (lectura del hub) y `canManageSMS`
(escritura en API routes), igual que Barreras/Reportes/SORA ya lo hacen.

Sin migraciones en esta fase — cada módulo trae la suya en su propia fase.

### Fase 1 — Reordenar la IA del hub Seguridad SMS ✅ Completada
Reordenado el array `TABS` en `dashboard/safety/page.js`: de
`[sora, barreras, reportes, mapas]` a `[sora, reportes, barreras, mapas]`
(Reportes SMS y Barreras intercambian posición) — coincide con el orden
relativo del layout objetivo. Sin cambios de datos, puramente de navegación.
Se dejaron comentarios en el array marcando dónde se insertará cada tab
nuevo (Evaluación de Riesgos/Indicadores/Mejora Continua/Acciones
Correctivas antes de "Reportes SMS"; Reportes de Seg. Operacional después;
Capacitación SMS al final) para que las Fases 2-7 solo agreguen su entrada
sin tener que volver a decidir el orden. `npm run lint` y `npm run build`
verificados limpios.

### Fase 2 — Evaluación y Gestión de Riesgos (matriz base) ✅ Completada
Del apartado *"ii. Evaluación y gestión de riesgos de seguridad operacional"*
de MAUT-5.0-22-017 (Ilustraciones 4/5, Tablas 2/3 — la matriz 5×5 que
compartió el usuario). Es el "Componente 2" del SMS y otras fases se apoyan
en él (Mejora Continua, Indicadores), por eso va antes.

Migración `20260709_safety_risk_matrix.sql` (aplicada en Supabase, `get_advisors`
sin hallazgos nuevos), RLS mismo patrón que `safety_barriers` (solo
`superadmin/admin/gerente_sms`, coincide con `canManageSMS`):

- **`safety_risk_scales`** (por org, personalizable — requisito textual del
  documento: *"el explotador UAS ha de personalizar estos criterios..."*):
  una fila por nivel, `dimension` (`probabilidad`/`gravedad`) + `code` + 
  `order_index` + `label` + `description` editable. 5 niveles de
  **Probabilidad** (Frecuente…Extremadamente improbable, código '1'-'5') y 5
  de **Gravedad** — escala única (Catastrófico…Insignificante, código
  'A'-'E'). Semilla con los valores estándar OACI Doc 9859
  (`lib/safetyRiskDefaults.js`), cargable con un botón y editable después.
- **`safety_risk_tolerability`** (por org): mapeo de las 25 celdas (5A…1E) a
  una zona — `inaceptable`/`tolerable`/`aceptable` — editable celda por
  celda (clic cicla la zona). Semilla con el layout de colores exacto de la
  Ilustración 5 compartida por el usuario.
- **`safety_hazards`** (registro de peligros): descripción, `source`
  (`manual`/`gap`/`spi`/`vormor`, con `source_ref_id` sin FK — se resuelve en
  Fases 3/4), probabilidad+gravedad **inicial**, **mitigación como texto
  libre** (`mitigation`, sin FK a `safety_barriers` — decisión confirmada),
  probabilidad+gravedad **residual** opcional, responsable, `due_date`,
  `status` (`abierto`/`mitigado`/`cerrado`). El índice de riesgo (ej. "5A") y
  la zona de tolerabilidad se **calculan en el cliente** contra la
  configuración vigente (no se guardan como columnas derivadas) — mismo
  patrón de "computar, no fabricar" que `computeCompliance()`/`dueStatus()`
  en el resto de la app.
- **API**: `GET/PATCH /api/safety/risk-config` (guarda escalas + tolerabilidad
  en una sola llamada, mismo mecanismo para la carga inicial de la semilla y
  para ediciones posteriores) + `GET/POST /api/safety/hazards` +
  `PATCH/DELETE /api/safety/hazards/[id]`.
- **UI**: nuevo tab "Evaluación de Riesgos" en `dashboard/safety/page.js` —
  `components/safety/RiskMatrixEditor.js` (editor visual 5×5 con colores +
  edición de etiquetas/criterios, estado vacío con "Cargar matriz estándar
  OACI") y `components/safety/AddHazardPanel.js` (panel deslizable, mismo
  shell que `AddBarrierPanel` — selectores de probabilidad/gravedad inicial y
  residual con badge de índice+zona calculado en vivo).

### Fase 3 — Indicadores (SPI) ✅ Completada (3b resuelta en Fase 8)
De MAUT-1.0-22-005 + Excel MAUT-1.0-12-002. Migración `20260710_safety_indicators.sql`
(4 tablas, RLS mismo patrón `canManageSMS`) + `20260710_spi_notification_type.sql`
(nuevo tipo `spi_report_due`), ambas aplicadas y verificadas sin nuevos hallazgos
de seguridad.

- **`safety_indicators`** (catálogo por org): nombre, `denominator_unit` —
  **selector de lista fija** con las 4 unidades reales de la circular
  (ciclos de vuelo / horas de vuelo / horas-hombre / número de operaciones,
  según tipo de proveedor; para un explotador UAS lo habitual es "Horas de
  vuelo"), no texto libre — preserva la consistencia que exige la circular.
  Además, `expected_improvement_pct` (mejora esperada %, la meta).
- **`safety_indicator_monthly`**: `period` ('YYYY-MM'), valor del
  denominador, N° de eventos → tasa por 1000 **calculada en el cliente**
  (`lib/safetyIndicatorStats.js`), no capturada a mano ni guardada como
  columna derivada.
- **Líneas de alerta y meta** (`computeYearStats()`/`suggestedTarget()`):
  fórmulas verificadas contra el Excel oficial — promedio y desviación
  estándar **poblacional** (N=12, no N-1) de las tasas del año anterior;
  alerta N = promedio + N·D.E.; meta sugerida = promedio × (1 − mejora
  esperada). Solo se calculan si los 12 meses del año anterior están
  completos — si no, se muestra "sin línea base" en vez de fabricar una
  cifra sobre datos incompletos.
- **Gráfica por indicador** (`RateChart` en `IndicatorDetailPanel.js`): SVG
  simple con la línea de tasas del año seleccionado + las 3 líneas de
  alerta + la meta, todas calculadas desde el año anterior.
- **`safety_indicator_actions`**: defensa (T/R/E) + causa raíz +
  desencadenante + plan de acción + documento + tiempo de ejecución +
  estado — alimentarán el tablero de Acciones Correctivas (Fase 5) por
  agregación directa sobre esta tabla, sin duplicarla.
- **`safety_indicator_submissions`**: rastro de envío anual a Aerocivil
  (vence 30 de marzo), mismo patrón que `aerocivil_monthly_reports` —
  botón "Marcar como enviado" en el tab.
- **Recordatorio cron** (`GET /api/cron/spi-annual-reminder`, diario,
  `vercel.json`): recuerda a GSMS+GG dentro de los 30 días previos al plazo
  y sigue recordando (dedupe 3 días) si ya venció y sigue sin marcarse
  enviado — mismo espíritu que `training-exam-reminder`.
- **UI**: nuevo tab "Indicadores (SPI)" — catálogo de tarjetas (con
  indicador visual "en alerta" si algún mes del año actual supera la 1ª
  línea de alerta), `AddIndicatorPanel.js` (creación) e
  `IndicatorDetailPanel.js` (grilla mensual editable + gráfica + planes de
  acción, por año navegable).

**Fase 3b — resuelta en la Fase 8**: el reporte Excel descargable para el
envío anual ("Indicadores SPI (anual)", `F-SMS-010`) se construyó junto con
los demás reportes transversales — ver Fase 8 más abajo.

### Fase 4 — Mejora Continua (GAP simple) ✅ Completada
Del Apéndice 1 (checklist Sí/No — **4 componentes / 12 elementos / 100
preguntas**, no 9 componentes como se estimó antes de releer el documento
completo). Migración `20260711_sms_gap_assessment.sql` aplicada y verificada
(100 filas confirmadas por conteo: 43+21+26+10), `get_advisors` sin nuevos
hallazgos.

- **`sms_gap_questions`** — catálogo **global** (sin `organization_id`,
  intencional: es el mismo checklist oficial para todo explotador UAS, no se
  personaliza por organización), transcrito **literal** del documento
  oficial (no inventado): `component_number` (1-4), `component_name`,
  `element_number` ('1.1'…'4.2'), `element_name`, `question_text`,
  `order_index`. RLS de solo lectura para cualquier usuario autenticado (no
  expone datos de ninguna org); sin políticas de escritura — es dato de
  referencia fijo, administrado solo vía migración.
- **`sms_gap_assessments`** (evaluación fechada, por org) + **`sms_gap_responses`**
  (Sí/No + `evidence_date` + `comments`, más `responsible`/`status` — estos
  dos últimos alimentarán el tablero de Acciones Correctivas (Fase 5) por
  agregación directa sobre las respuestas `'no'`, sin duplicar una tabla de
  acciones aparte para los hallazgos GAP).
- **API**: `GET /api/safety/gap/questions` (catálogo) + `GET/POST /api/safety/gap/assessments`
  (lista con respuestas anidadas / crear) + `PATCH/DELETE /api/safety/gap/assessments/[id]`
  (guarda título+fecha+todas las respuestas cambiadas en una sola llamada,
  mismo mecanismo de guardado que `/api/safety/risk-config`).
- **UI**: nuevo tab "Mejora Continua" — `GapAssessmentPanel.js` (acordeón por
  componente/elemento, barra de progreso, Sí/No por pregunta con
  responsable/plazo/estado cuando es "No") + tabla de evaluaciones con
  % de cumplimiento (Sí) y comparativo automático (tendencia en puntos
  porcentuales vs. la evaluación anterior).

### Fase 5 — Acciones Correctivas (tablero consolidado) ✅ Completada
Vista de solo-agregación (`useMemo` en `dashboard/safety/page.js`) sobre 3
fuentes — **sin tabla unificada nueva, sin duplicar lógica de edición**:

- `sms_case_actions` (ya existía, escritura solo desde el caso — se agregó
  `GET /api/safety/case/actions`, primer endpoint de lectura de esta tabla,
  con `sms_report`/`vor_mor` anidados para mostrar contexto y clasificación).
- Planes de acción de indicadores SPI (`ind.actions`, ya cargados en el
  estado de la Fase 3 — sin fetch nuevo). Plazo mostrado: **estimado**
  (`created_at + execution_days`), no una fecha real capturada — documentado
  como estimación, igual que "próxima fecha estimada" de mantenimiento.
  Sin campo "responsable" (no existe en `safety_indicator_actions`, el Excel
  oficial tampoco lo tiene para planes de acción SPI — se muestra "—", no se
  fabrica).
- Hallazgos "No" de Mejora Continua (`assess.responses`, ya cargados en el
  estado de la Fase 4 — sin fetch nuevo), con `responsible`/`evidence_date`/`status`
  reales capturados en el panel GAP.

Filtros por fuente (Todas/Casos/SPI/GAP) y estado (Abiertas/Completadas/Todas),
KPIs (total, abiertas, vencidas, cuántas de las 3 fuentes tienen datos). Clic
en una fila lleva a su pantalla de origen: navega a `/dashboard/safety/case/[id]`
para casos, o cambia de tab y abre el panel de detalle (`IndicatorDetailPanel`/
`GapAssessmentPanel`) para SPI/GAP — sin abrir un editor propio en este tab.

### Fase 6 — Reportes de Seguridad Operacional (cumplimiento de plazos) ✅ Completada
Para MOR (plazo regulatorio, 5 días hábiles) y VOR (plazo interno sugerido,
documentado como no regulatorio) por igual — **se reutilizó el campo
existente `vor_mor_submissions.aerocivil_notified_at`** (ya construido en el
Seguimiento de casos SMS/VOR/MOR, antes limitado a `type='MOR'`) en vez de
crear una tabla nueva: `POST /api/safety/case/notify` ahora acepta también
VOR, con mensaje/evento adaptado según el tipo. `lib/vorMorCompliance.js`
calcula el plazo (`occurrence_date` + 5 días hábiles, excluyendo solo
sábado/domingo — aproximación documentada, sin calendario de festivos
colombianos) y el estado (`enviado`/`pendiente`/`vencido`).

- **UI**: nuevo tab "Reportes de Seg. Operacional" — tabla de todos los
  casos VOR/MOR con plazo calculado, estado coloreado, filtro por tipo, y
  botón "Marcar radicado" inline. El panel de detalle del caso
  (`dashboard/safety/case/[id]/page.js`) también se actualizó: la sección
  antes solo visible para MOR ("Notificado a AeroCivil") ahora aparece para
  MOR y VOR con etiqueta distinta según el tipo, y de paso se corrigió un
  bug real de color (el recuadro se pintaba rojo cuando el caso **ya**
  estaba notificado y ámbar cuando no — invertido; ahora verde=radicado,
  ámbar=pendiente, rojo=vencido, calculado con la misma función de
  cumplimiento).
- **Cron** (`GET /api/cron/vormor-deadline-reminder`, diario,
  `vercel.json`): recuerda a GSMS+GG (solo campana — mismo patrón que
  `aerocivil-report-reminder`, no el de `training-exam-reminder` que además
  envía correo; se documentó esta elección para no prometer un correo que
  no se construyó) dentro de los 3 días previos al plazo y mientras siga
  vencido sin marcarse radicado, con dedupe de 3 días. Nuevo tipo de
  notificación `vormor_deadline_due` (migración
  `20260712_vormor_deadline_notification_type.sql`, aplicada — mismo gotcha
  de sincronizar el CHECK de `notifications` y `NOTIFICATION_TYPES`).

Distinto del tab "Reportes SMS" (Fase 1, ya existente) que solo **lista** los
reportes — esta fase trackea **cumplimiento de plazo**, no el listado en sí.

### Fase 7 — Plan de Capacitación del SMS ✅ Completada
Del apartado de Instrucción y Educación (MAUT-5.0-22-017): inducción/
reinducción SMS, SORA, Factores Humanos, Cultura Justa, TEM, causa raíz, toma
de decisiones — dirigido a **todo el personal**, no solo pilotos (a
diferencia del módulo "Capacitación" ya construido, que es solo Operaciones/
Mantenimiento para pilotos).

- **Migración `20260713_sms_training.sql`** (aplicada en Supabase, advisors
  de seguridad limpios): `sms_training_sessions` (cronograma con
  recurrencia — `semanal`/`quincenal`/`mensual`/`personalizado` +
  `recurrence_days`, `start_date`, `topic`, `notes` — mismo patrón de
  cadencia que `training_sessions` del módulo de Capacitación de pilotos,
  pero tabla propia porque el público objetivo es **todo el personal**, no
  solo tripulación) y `sms_training_attendance` (roster de asistencia: quién
  asistió a qué ocurrencia — `session_id` + `profile_id` + `attended_date`,
  UNIQUE por los 3 — sin examen ni calificación, es solo registro de
  asistencia). El roster se resuelve sobre **`profiles`** de la
  organización (no `pilots`), para incluir roles administrativos (GG,
  GSMS) que hoy no necesariamente tienen fila en `pilots`. RLS en ambas
  tablas con el mismo patrón `canManageSMS` (superadmin/admin/gerente_sms)
  que el resto del módulo SMS — confirma la decisión de Fase 0 de no
  introducir permisos nuevos por fase.
- **API** (`/api/safety/training/*`): `sessions` (GET lista con
  `attendance` anidada + perfil del asistente, POST crea), `sessions/[id]`
  (PATCH/DELETE), `attendance` (POST marca asistencia — valida que
  `session_id`/`profile_id` pertenezcan a la org antes de insertar, nunca
  confía en los ids del cliente), `attendance/[id]` (DELETE quita la
  marca). `roster` (GET, nuevo) resuelve el personal de la org desde
  `profiles` — **no se reutilizó** `/api/admin/users` (ya existente) porque
  ese endpoint restringe a `MANAGER_ROLES = ['superadmin','admin']` y
  excluye a `gerente_sms`, que sí debe poder gestionar la asistencia SMS
  según la Fase 0; se construyó un endpoint separado en vez de debilitar
  el guard del endpoint existente (que también sirve a `/dashboard/users`,
  fuera de alcance de esta fase).
- **UI**: nuevo tab "Capacitación SMS" — franja de KPIs (sesiones en
  cronograma, asistencias del año, asistencias totales, personal con
  asistencia registrada) + tabla de sesiones (tema, recurrencia, próxima
  ocurrencia calculada con `nextOccurrence()` de `lib/trainingCompliance.js`
  — reutilizado tal cual del módulo de Capacitación de pilotos, ya que
  ambas tablas comparten la misma forma de recurrencia — y conteo de
  asistencias). Clic en una fila abre `SmsAttendancePanel` (selector de
  fecha + checklist del roster completo de la org, toggle asistió/no
  asistió por persona); el ícono de edición abre `AddSmsSessionPanel`
  (crear/editar tema, recurrencia, fecha de inicio, notas, con eliminar).

Distinto del módulo "Capacitación" (pilotos, con examen calificado y
bloqueo de despacho): esta fase es un registro de asistencia sin examen,
para todo el personal, alineado con el apartado de Instrucción y Educación
del SMS — no se fusionaron ambos sistemas porque tienen público objetivo y
mecanismo de cumplimiento distintos (examen con intentos/aprobación vs.
asistencia registrada).

### Fase 8 — Reportes transversales + documentación + QA ✅ Completada
Cuatro tarjetas nuevas en `/dashboard/reports`, todas con el mismo patrón
`getOrgContext()` + `logo`/versión/fecha/nota de trazabilidad que el resto de
formatos (salvo donde se indica). **Resuelve el pendiente de la Fase 3b**
(el reporte Excel de Indicadores SPI que había quedado explícitamente sin
construir).

- **"Indicadores SPI (anual)"** (`F-SMS-010`, Excel — `GET /api/reports/spi?year=`
  + `generateSpiReport()`): selector de **año a reportar** (nuevo campo
  `needsYear` en `REPORT_DEFS`, distinto de los selectores de periodo ya
  existentes — un indicador SPI se reporta por año calendario completo, no
  por rango arbitrario). Una hoja "Resumen" (indicador/denominador/tasa
  promedio del año base/alerta 1/meta sugerida/meses en alerta) + una hoja
  por indicador con su tabla mensual (12 meses), estadísticas completas
  (promedio, D.E., alertas 1-2-3, meta) y sus planes de acción vigentes —
  mismas fórmulas de `lib/safetyIndicatorStats.js` que ya usa el tab en
  vivo, sin duplicar el cálculo. Si el año base (año-1) no tiene los 12
  meses completos, se indica explícitamente "Sin línea base" en vez de
  fabricar una cifra. Nombres de hoja saneados/deduplicados (límite de 31
  caracteres de Excel).
- **"Autoevaluación GAP del SMS"** (`F-SMS-011`, PDF — `GET /api/reports/gap`
  + `generateGapReport()`): snapshot de la **última** evaluación registrada
  (sin selector — es la vigente). Trae las 100 preguntas del catálogo
  global `sms_gap_questions` mezcladas en JS con las respuestas de esa
  evaluación (si una pregunta no fue respondida aún, aparece "Sin
  responder" — no se omite del PDF), con responsable/estado solo para las
  respondidas "No". Es el artefacto de evidencia documental del checklist
  oficial completado.
- **"Cronograma Capacitación SMS"** (`F-SMS-012`, PDF, con selector de
  periodo — `GET /api/reports/sms-training-schedule?from=&to=` +
  `generateSmsTrainingScheduleReport()`): mismo cálculo de proyección de
  ocurrencias (`occurrencesInRange()`, `lib/trainingCompliance.js`) que ya
  usa el reporte de Cronograma de Capacitación de pilotos — reutilizado tal
  cual porque `sms_training_sessions` comparte la misma forma de
  recurrencia. Sin selector de tipo (a diferencia del de pilotos
  Operaciones/Mantenimiento): Capacitación SMS es un solo programa.
- **"Acciones Correctivas del SMS"** (`F-SMS-013`, PDF, snapshot —
  `GET /api/reports/corrective-actions` + `generateCorrectiveActionsReport()`):
  reconstruye **server-side** la misma agregación de 3 fuentes que el
  `useMemo` del tab en vivo (casos SMS/VOR/MOR, planes de acción SPI,
  hallazgos GAP) — sin tabla unificada nueva, mismo criterio de "fuente de
  verdad en el origen" de la Fase 5.

**QA**: `npx next lint` limpio (solo las 3 advertencias preexistentes no
relacionadas: `<img>` en `socio/layout.js`/`socio/page.js`,
`exhaustive-deps` en `DjiRcSync.js`) y `npm run build` exitoso, con las 9
rutas API nuevas del proyecto (`/api/safety/risk-config`,
`/api/safety/hazards[/[id]]`, `/api/safety/indicators[/...]`,
`/api/safety/gap/*`, `/api/safety/case/actions` GET, `/api/safety/case/notify`
extendido, `/api/safety/training/*`, `/api/cron/spi-annual-reminder`,
`/api/cron/vormor-deadline-reminder`) más las 4 de reportes transversales
confirmadas en el manifiesto de rutas de Next. **CLAUDE.md actualizado**:
nueva sección "Plan de mejora SMS" con el resumen de las 8 fases y enlace a
este documento, más las 5 tablas nuevas agregadas al listado de "Base de
datos" (`safety_risk_scales`/`safety_risk_tolerability`/`safety_hazards`,
`safety_indicators` y sus 3 tablas relacionadas, `sms_gap_*`,
`sms_training_*`).

---

## Estado

| Fase | Estado |
|---|---|
| 0 — Preparación | ✅ Completada |
| 1 — Reordenar IA del hub | ✅ Completada |
| 2 — Evaluación y Gestión de Riesgos | ✅ Completada |
| 3 — Indicadores (SPI) | ✅ Completada |
| 4 — Mejora Continua (GAP simple) | ✅ Completada |
| 5 — Acciones Correctivas (consolidado) | ✅ Completada |
| 6 — Reportes de Seg. Operacional (plazos) | ✅ Completada |
| 7 — Plan de Capacitación del SMS | ✅ Completada |
| 8 — Reportes transversales + QA | ✅ Completada |

Todas las decisiones de alcance quedaron confirmadas (ver sección anterior) —
no hay preguntas pendientes para arrancar la Fase 0.
