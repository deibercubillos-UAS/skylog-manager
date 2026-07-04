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

### Fase 3 — Indicadores (SPI) ✅ Núcleo completado (falta 3b, ver abajo)
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

**Fase 3b — pendiente**: el **reporte Excel descargable** para el envío
anual (mismo patrón que el Reporte Operacional Mensual, en
`dashboard/reports/page.js` + `lib/reportGenerators.js`) no se construyó en
esta pasada — el rastro de envío y el recordatorio ya funcionan, pero
todavía no hay un botón "Descargar Excel de Indicadores SPI {año}". Queda
como fast-follow explícito, no se marca como completo para no dar a entender
que ya existe.

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

### Fase 5 — Acciones Correctivas (tablero consolidado)
Vista de solo-agregación sobre 3 fuentes — **sin tabla unificada nueva, sin
duplicar lógica de edición**:

- `sms_case_actions` (ya existe — casos VOR/MOR/SMS).
- Planes de acción de indicadores SPI (Fase 3).
- Hallazgos de Mejora Continua (Fase 4).

Filtros por fuente/estado/responsable/vencimiento. Clic en una acción lleva a
su pantalla de origen para editar.

### Fase 6 — Reportes de Seguridad Operacional (cumplimiento de plazos)
Para MOR (plazo regulatorio, 5 días hábiles) y VOR (plazo interno sugerido,
documentado como no regulatorio) por igual: marcar "Enviado a IRIS" + quién +
cuándo, mismo patrón que `aerocivil_monthly_reports`. Recordatorio campana +
correo si se acerca/vence sin marcar enviado (cron diario, mismo patrón que
`training-exam-reminder`/`aerocivil-report-reminder`).

Distinto del tab "Reportes SMS" (Fase 1, ya existente) que solo **lista** los
reportes — esta fase trackea **cumplimiento de plazo**, no el listado en sí.

### Fase 7 — Plan de Capacitación del SMS
Del apartado de Instrucción y Educación (MAUT-5.0-22-017): inducción/
reinducción SMS, SORA, Factores Humanos, Cultura Justa, TEM, causa raíz, toma
de decisiones — dirigido a **todo el personal**, no solo pilotos (a
diferencia del módulo "Capacitación" ya construido, que es solo Operaciones/
Mantenimiento para pilotos).

- `sms_training_sessions` (cronograma con recurrencia, mismo patrón que
  `training_sessions` pero tabla propia — público objetivo = todo el
  personal).
- `sms_training_attendance` (roster: quién asistió, fecha) — sin examen.
  El roster se resuelve sobre **`profiles`** de la organización (no
  `pilots`), para incluir roles administrativos (GG, GSMS) que hoy no
  necesariamente tienen fila en `pilots`.

### Fase 8 — Reportes transversales + documentación + QA
Tarjetas nuevas en Reportes (SPI anual, GAP/Mejora Continua, Cronograma
Capacitación SMS, Acciones Correctivas), actualización de CLAUDE.md, lint +
build.

---

## Estado

| Fase | Estado |
|---|---|
| 0 — Preparación | ✅ Completada |
| 1 — Reordenar IA del hub | ✅ Completada |
| 2 — Evaluación y Gestión de Riesgos | ✅ Completada |
| 3 — Indicadores (SPI) | ✅ Núcleo completado (falta 3b: reporte Excel) |
| 4 — Mejora Continua (GAP simple) | ✅ Completada |
| 5 — Acciones Correctivas (consolidado) | Pendiente |
| 6 — Reportes de Seg. Operacional (plazos) | Pendiente |
| 7 — Plan de Capacitación del SMS | Pendiente |
| 8 — Reportes transversales + QA | Pendiente |

Todas las decisiones de alcance quedaron confirmadas (ver sección anterior) —
no hay preguntas pendientes para arrancar la Fase 0.
