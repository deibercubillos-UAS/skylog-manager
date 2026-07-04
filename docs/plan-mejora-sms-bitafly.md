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

1. **Mejora Continua**: se construye primero el **checklist simple Sí/No** (Apéndice 1, 9 componentes) — la herramienta ponderada PEL-OPS-AIR-ANS-AGA (229 filas, puntaje P/S/O/E) queda como fase futura opcional, no se construye ahora.
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

### Fase 2 — Evaluación y Gestión de Riesgos (matriz base)
Del apartado *"ii. Evaluación y gestión de riesgos de seguridad operacional"*
de MAUT-5.0-22-017 (Ilustraciones 4/5, Tablas 2/3 — la matriz 5×5 que
compartió el usuario). Es el "Componente 2" del SMS y otras fases se apoyan
en él (Mejora Continua, Indicadores), por eso va antes.

- **`safety_risk_matrix_config`** (por org, personalizable — requisito
  textual del documento: *"el explotador UAS ha de personalizar estos
  criterios..."*): 5 niveles de **Probabilidad** (Frecuente / Ocasional /
  Remoto / Improbable / Extremadamente improbable) con criterio numérico
  editable (ej. "10 eventos por cada 100 vuelos"), y 5 niveles de
  **Gravedad** — escala única, no por categoría de impacto (Catastrófico /
  Peligroso / Mayor / Menor / Insignificante) con descripción editable.
  Semilla con los valores estándar OACI Doc 9859 (los de la imagen de
  referencia), editable por organización.
- **`safety_risk_tolerability`** (por org): mapeo de las 25 celdas (5A…1E) a
  una zona — Inaceptable / Tolerable / Aceptable — con color, también
  editable (la Ilustración 5 es un ejemplo, cada explotador la ajusta).
- **`safety_hazards`** (registro de peligros): descripción, origen (manual /
  hallazgo GAP / evento SPI / caso VOR-MOR), probabilidad+gravedad
  **inicial** → índice+tolerabilidad calculados, **mitigación como texto
  libre** (sin FK obligatoria a `safety_barriers` — quien registra el
  peligro describe la barrera aplicada directamente, sin depender de que ya
  exista formalizada en el catálogo), probabilidad+gravedad **residual**
  (post-mitigación) → índice+tolerabilidad residual, responsable, plazo de
  gestión.
- UI: editor visual de la matriz 5×5 (con colores, igual a la referencia)
  para configurar probabilidad/gravedad/tolerabilidad, y un registro de
  peligros con selectores que calculan el índice automáticamente.

### Fase 3 — Indicadores (SPI)
De MAUT-1.0-22-005 + Excel MAUT-1.0-12-002:

- `safety_indicators` (catálogo por org): nombre, denominador — **selector
  de lista fija** con las 6 categorías de la circular (ciclos de vuelo /
  horas de vuelo / horas-hombre / número de operaciones, según tipo de
  proveedor; para un explotador UAS lo habitual es "Horas de vuelo"), no
  texto libre — preserva la consistencia que exige la circular. Además,
  mejora esperada % (la meta).
- `safety_indicator_monthly`: mes, valor del denominador, N° de eventos →
  tasa por 1000 **calculada**, no capturada a mano.
- Líneas de alerta calculadas automáticamente (promedio ± 1/2/3 desviaciones
  estándar del año anterior) — misma fórmula del Excel oficial.
- Gráfica por indicador (línea del año + 3 líneas de alerta).
- Defensa (T/R/E) + causa raíz + desencadenante + plan de acción + documento
  + tiempo de ejecución → alimentan el tablero de Acciones Correctivas
  (Fase 5), no se duplican como tabla propia.
- Reporte descargable (Excel, mismo patrón que el Reporte Operacional
  Mensual) para el envío anual a Aerocivil (vence 30 de marzo) + recordatorio
  cron, mismo patrón que `aerocivil-report-reminder`.

### Fase 4 — Mejora Continua (GAP simple)
Del Apéndice 1 (checklist Sí/No, 9 componentes):

- Catálogo fijo `sms_gap_questions` — transcrito literal del documento
  oficial (no inventado), por componente/elemento.
- `sms_gap_assessments` (evaluación fechada) + `sms_gap_responses` (Sí/No +
  evidencia/fecha).
- Comparativo entre evaluaciones (este año vs. anterior).
- Cada "No" genera automáticamente una fila en Acciones Correctivas (Fase 5,
  `source_type='gap'`) y opcionalmente un peligro en `safety_hazards`
  (Fase 2) si el usuario decide calificarlo con la matriz de riesgo.

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
| 2 — Evaluación y Gestión de Riesgos | Pendiente |
| 3 — Indicadores (SPI) | Pendiente |
| 4 — Mejora Continua (GAP simple) | Pendiente |
| 5 — Acciones Correctivas (consolidado) | Pendiente |
| 6 — Reportes de Seg. Operacional (plazos) | Pendiente |
| 7 — Plan de Capacitación del SMS | Pendiente |
| 8 — Reportes transversales + QA | Pendiente |

Todas las decisiones de alcance quedaron confirmadas (ver sección anterior) —
no hay preguntas pendientes para arrancar la Fase 0.
