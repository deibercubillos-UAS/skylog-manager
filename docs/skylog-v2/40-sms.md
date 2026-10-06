# Módulo SMS

[← Índice maestro](00-INDICE.md) · [Reglas](01-reglas.md)

> Migrado desde `../plan-bitafly-v2.md` el 2026-08-22 al partir ese documento por la regla de 500 líneas (D1).

---

## 5. F3 — SMS fácil de integrar y aplicar

> 📄 **Investigación completa en `docs/investigacion-sms-rac219-bitafly.md`** (2026-08-22):
> marco de 4 componentes / 12 elementos verificado literal contra el catálogo oficial, cobertura
> real de BitaFly elemento por elemento, y el hallazgo central — la autoevaluación GAP declara
> **99 % de cumplimiento** mientras la tabla de datos mensuales de indicadores tiene **cero
> filas**. Ese documento manda sobre lo que sigue en esta sección.

### 5.1 Diagnóstico honesto

El SMS de BitaFly **no está incompleto — está desconectado**. Tiene 9 pestañas, matriz de riesgo
5×5, SPI con fórmula oficial, GAP de 100 preguntas, acciones correctivas de 3 fuentes, VOR/MOR
con línea de tiempo, capacitación. Es más completo que el de muchos competidores.

El problema es que **exige que alguien ya sepa hacer SMS**. Una organización que arranca ve 9
pestañas vacías y no sabe por dónde empezar. Y los datos operacionales que la app ya tiene
(alertas del import DJI, mantenimientos vencidos, exámenes reprobados) **no alimentan el SMS
automáticamente** — un humano tiene que darse cuenta y transcribir.

"Fácil de integrar y aplicar" = resolver esas dos cosas.

### 5.2 Asistente de implantación por fases

Un wizard que lleva a la organización de cero a "SMS aceptado por la Aerocivil", alineado con
RAC 219 y las directivas MAUT-1.0-22-006 (aceptación del SMS) y MAUT-1.0-22-007.

Fases con % de avance visible, cada una desbloqueando la siguiente:
1. **Política y objetivos** — designar Gerente de Seguridad Operacional (valida 100.545(d):
   formación acreditada, curso avanzado, ≥1 año de experiencia), política firmada, alcance.
2. **Gestión del riesgo** — matriz + tolerabilidad (hoy se siembra OACI Doc 9859, se conserva) +
   **catálogo de peligros precargado por tipo de operación**.
3. **Aseguramiento** — ≥3 SPI activos con datos de al menos 3 meses, primera autoevaluación GAP.
4. **Promoción** — cronograma de capacitación SMS con asistencia registrada, MSMS publicado.
5. **Listo para aceptación** — expediente descargable con toda la evidencia.

> ⚠️ **Corrección de rumbo (2026-09-30), sin renumerar esta sección por los cross-links ya
> escritos en `51-bitacora.md` (decisiones 52, 54, 58)**: esta secuencia de 5 fases
> (política/riesgo/aseguramiento/promoción/aceptación) **se inventó** antes de leer la circular
> MAUT-5.0-22-017 completa. Esa circular —ver [`17-implementacion-sms-uas.md`](17-implementacion-sms-uas.md)—
> **define la estructura oficial del plan de implantación que se radica ante la Aerocivil**: 4
> fases (Planificación / Procesos Reactivos / Procesos Proactivos y Predictivos / Garantía de la
> Seguridad Operacional), con responsable + recursos por tarea, horizonte de 12-24 meses, formato
> tipo Gantt. No son intercambiables con las 5 inventadas aquí. El plan de reconstrucción del
> asistente sobre la secuencia oficial, con el mapeo exacto de lo ya construido, vive en
> **§5.9** más abajo — se decidió documentar la corrección en vez de borrar silenciosamente esta
> sección, que sigue siendo la referencia de lo que realmente existe hoy en código.

### 5.3 Plantillas reales, no ejemplos vacíos

Hoy existe `EXAMPLE_INDICATORS` (6 indicadores tipo). Se extiende a **paquetes por tipo de
operación** (las 10 categorías oficiales de `lib/missionTypes.js`): peligros típicos, barreras
sugeridas, SPI recomendados y umbrales de referencia. El usuario los adopta, edita o descarta —
**nunca se fabrican datos operacionales**, solo definiciones, exactamente como se hizo con
`EXAMPLE_INDICATORS`.

### 5.4 SMS alimentado por la operación (el cambio de fondo)

Cada uno de estos eventos, que la app **ya detecta hoy y solo notifica**, pasa a generar un
**borrador de reporte SMS** con su peligro sugerido, pendiente de que el gerente SMS lo confirme
o descarte:

| Evento ya detectado | Origen actual | Peligro sugerido |
|---|---|---|
| Alertas en log DJI (`hasAlerts`) | `import-dji` | Falla de sistema en vuelo |
| Batería sobre umbral de retiro (200 ciclos) | Escáner del dashboard | Falla de energía |
| Mantenimiento mayor/menor vencido | Cron diario | Aeronavegabilidad |
| Examen de capacitación reprobado/vencido | `training-exam-reminder` | Competencia del personal |
| **Geocerca violada** (nuevo, F2) | `c2-gateway` | Incursión en espacio aéreo |
| **Pérdida/degradación de enlace C2** (nuevo, F2) | `c2-gateway` | Pérdida de mando y control |
| **Exceso de tiempo de servicio** (nuevo, F5) | Motor de tiempos | Fatiga del piloto |

Esto convierte el SMS de "formulario que alguien debe recordar llenar" en "bandeja de entrada de
lo que realmente pasó". Es el mayor salto de valor de todo el frente.

> Nota de diseño: el borrador **nunca** se convierte en reporte automáticamente. Un reporte de
> seguridad operacional con consecuencias regulatorias siempre lo confirma una persona. El
> sistema solo evita que se pierda.

### 5.5 Reporte mensual consolidado (cierra B3)

`100.535(a)(26)` exige un único envío mensual, en los primeros 5 días hábiles, con estadística
de operaciones + indicadores SPI + reportes MOR. Hoy son tres cosas separadas. Se unifica en un
**paquete mensual** con acuse de envío (reutilizando el patrón ya probado de
`aerocivil_monthly_reports` + su cron recordatorio).

### 5.6 MSMS como documento vivo

Hoy el MSMS es un archivo que alguien sube a Manuales. Propuesta: generarlo desde la
configuración real (política, matriz vigente, SPI activos, estructura de cargos, cronograma de
capacitación), versionado, con el histórico de acuses que Manuales ya maneja. El archivo subido
sigue siendo válido para quien lo prefiera — se añade una vía, no se quita ninguna.

---

## 5.7 Quién reporta y quién analiza (decisión 2026-08-22)

> *"El MOR y VOR debe ser diligenciado por cualquier persona, pero el asignado para análisis y
> toma de datos es el Gerente SMS."*

Separa dos cosas que hoy se confunden en la plataforma actual, donde el mismo permiso
(`canManageSMS`) gobierna todo el ciclo:

| Etapa | Quién | Nota |
|---|---|---|
| **Diligenciar** el reporte | **Cualquier persona** — tripulante, personal de tierra, contratista, tercero | Los formularios públicos por organización ya lo permiten sin cuenta. No se restringe |
| **Analizar** y tomar los datos | **Gerente SMS**, como responsable asignado | Es el rol que clasifica severidad, investiga, decide acciones y cierra el caso |

Consecuencias de diseño:

1. **La entrada es abierta por diseño, no por descuido.** Restringir quién puede reportar
   contradice el propio descriptor de madurez del ítem 1.1.1 de
   [`15-evaluacion-sms.md`](15-evaluacion-sms.md), que en nivel *Eficaz* pide que **terceros —
   socios, proveedores y contratistas— puedan notificar**.
2. **El análisis tiene dueño nominal.** No es "quien tenga el permiso": es el Gerente SMS
   designado, la misma persona cuyo expediente se construye
   ([`16-asuntos-complementarios.md`](16-asuntos-complementarios.md) §3). Un caso sin analista
   asignado es un caso sin dueño.
3. **La confidencialidad se define en el borde entre las dos etapas.** Quien reporta puede
   pedir confidencialidad; quien analiza necesita ver el contenido. Es ahí donde se aplica la
   protección de `219.115`–`219.140` (regla **S4**), no en el formulario de entrada.
4. El Gerente SMS puede delegar la ejecución de acciones correctivas, pero **la toma de datos y
   el análisis quedan asignados a él** — es lo que la decisión fija.

---

## 5.8 Estado real en V2, verificado código por código (2026-09-30)

Antes de actualizar el plan se releyó el código real de `src/app/(v2)/sms/**` y
`src/app/(v2)/api/sms/**` — no se asumió nada desde la documentación anterior, que quedó
desactualizada apenas se construyó más de lo que describía.

| Pieza | API | UI | Nota |
|---|---|---|---|
| Política SMS (`sms_policies`) | ✅ `api/sms/governance/policy` | ✅ `/sms/gobernanza` (SMS-A, 2026-09-30) | — |
| Designación del GSO (`designations`, role `gerente_sms`) | ✅ `api/sms/governance/gso`, valida 100.545(d) + MAUT §7.2.3 vía `validateGsoProfile()` | ✅ `/sms/gobernanza` (SMS-A, 2026-09-30) | — |
| Matriz de riesgo interna + tolerabilidad | ✅ `api/sms/risk-matrix` | ✅ `/sms/riesgos` | Configurable por org (regla C3), sin semilla OACI hardcodeada (decisión 52 — fuente no verificada) |
| Catálogo de peligros | ✅ `api/sms/hazards` | ✅ `/sms/riesgos` | — |
| Barreras | ✅ `api/sms/barriers` | ✅ `/sms/riesgos` | — |
| Evaluaciones de riesgo internas | ✅ `api/sms/risk-assessments` | ✅ `/sms/riesgos` | `initial_zone`/`residual_zone` siempre server-side |
| Indicadores SPI (catálogo, ciclos, mensual, análisis, siembra oficial, planes de acción) | ✅ 6 rutas bajo `api/sms/indicators/*` | ✅ `/sms/indicadores` | Más completo que lo que documentaba esta sección hasta hoy |
| Reportes + casos (VOR/MOR/SMS consolidados) + acciones correctivas | ✅ `api/sms/reports`, `api/sms/reports/analyze`, `api/sms/reports/file`, `api/sms/cases`, `api/sms/cases/actions` | ✅ `/sms/reportes` | Diligenciar/analizar ya separados por rol (§5.7) |
| Confidencialidad del notificador | ✅ `redactReporterIdentity()` (SMS-H, 2026-09-30) | ✅ checkbox al reportar + redacción en listas/reporte mensual | `sms_reports.confidentiality_level` ya existía pero no se exponía en la UI y nada controlaba quién ve la identidad — ambos huecos cerrados |
| Capacitación SMS (cronograma + asistencia) | ✅ `api/sms/training/sessions`, `api/sms/training/attendance` | ✅ `/sms/capacitacion` (SMS-B, 2026-09-30) | — |
| Asistente de implantación (`/sms/asistente`) | ✅ `api/sms/implementation-plan` + `api/sms/implementation-plan/tasks` (SMS-C, 2026-09-30) | ✅ | **Reconstruido sobre las 4 fases oficiales** (`smsOfficialImplementationPlan.js`, 17 elementos reales) con plan tipo Gantt (responsable/recursos/fechas por elemento + tareas personalizadas, horizonte 12-24 meses, export CSV). El agregador viejo de 5 fases (`api/sms/implementation-progress`) se deja intacto, sin consumidor en la UI desde ahora — ver corrección en §5.2 |
| Autoevaluación GAP (Mejora Continua, Apéndice 1) | ✅ `api/sms/gap/*` (SMS-D, 2026-09-30) | ✅ `/sms/mejora-continua` | Catálogo de 100 preguntas porteado **verbatim** desde la base real de v1 (consultada directamente, mismo criterio ya documentado en `21-auditoria-sms.md`) |
| Gestión del cambio (`sms_changes`) | ✅ `api/sms/changes` (decisión 168, 2026-10-06) | ✅ `/sms/cambios` | Identificado → evaluado → implementado/descartado; si impacta la seguridad exige peligro con evaluación de riesgo y factores humanos por escrito. Alimenta el asistente |
| Mapas (zonas restringidas) | ❌ | ❌ | No portado de v1 todavía |
| MSMS como documento vivo | ✅ `generateMsmsDocumentBlob()` (SMS-I, 2026-09-30) | ✅ `/sms/msms` | Genera el PDF desde política/GSO/objetivos/riesgo/SPI/capacitación reales y lo publica en `/manuales` (categoría SMS) — versionado + acuses de lectura gratis |
| Reporte mensual consolidado (estadística + SPI + MOR) | ✅ `api/sms/monthly-report*` (SMS-G, 2026-09-30) | ✅ `/sms/reporte-mensual` | Agregado en vivo (nunca snapshot) + `sms_monthly_reports` como rastro real de envío, mismo patrón ya probado en v1 (`aerocivil_monthly_reports`) |
| BSC (política ↔ objetivos ↔ SPI) | ✅ `api/sms/objectives` (SMS-F, 2026-09-30) | ✅ `/sms/objetivos` | `sms_objectives` + `sms_objective_indicators` (N:M) — un objetivo SMART vinculado a 1+ indicadores, con su último dato mensual real mostrado (sin inferir "mejora/empeora": no hay un flag de sentido por indicador en el esquema) |
| Perfil de organización escalable | ✅ `resolveOrganizationSmsProfile()` (SMS-J, 2026-09-30) | ✅ nota en `/sms/gobernanza` | Acotado al único umbral verificable (`100.545(a)`, ≤2 UAS combina JP+GSO) — "tipo de operación"/"complejidad" no se modelan, sin fuente normativa que fije su umbral |
| SMS alimentado por la operación (tabla §5.4) | ⚠️ 3 de 7 (SMS-E, 2026-09-30) | — | `POST /api/duty/exceptions` (decisión 50), `POST /api/flota/unexpected-events` y `POST /api/capacitacion/exam` (examen reprobado) generan borrador automático. Quedan sin conectar: alertas DJI (import-dji no las detecta todavía en V2), batería sobre umbral (V2 no tiene esa regla de negocio construida, solo incrementa `cycles`), mantenimiento vencido (se calcula en vivo al consultar, no hay un evento de escritura al que enganchar sin un cron nuevo), geocerca/enlace C2 (F2, omitido) |

**Conclusión**: F3 tiene más construido de lo que el resto de este documento describía — gobernanza, riesgo, SPI y reportes/casos están reales y con datos, no solo diseñados. Lo que falta no es "construir SMS desde cero", es: (a) ponerle pantalla a lo que ya tiene API, (b) corregir la secuencia del asistente contra la norma oficial, y (c) construir las piezas que de verdad no existen (GAP, MSMS, reporte mensual, BSC, confidencialidad real, perfil escalable, mapas).

## 5.9 Plan de construcción actualizado — alineado a las 4 fases oficiales

Mapeo de lo ya construido (§5.8) contra las 4 fases reales de
[`17-implementacion-sms-uas.md §1`](17-implementacion-sms-uas.md):

| Fase oficial | Elementos que cubre | Lo que ya existe en V2 | Lo que falta |
|---|---|---|---|
| **1 — Planificación** | Compromiso de la dirección · rendición de cuentas · designación del personal clave · plan de emergencia · MSMS | Política (`sms_policies`) y GSO (`designations`) con API real | UI de ambos · plan de respuesta ante emergencias · MSMS vivo |
| **2 — Procesos Reactivos** | Identificación de peligros reactiva + evaluación/gestión de riesgo | Reportes/casos VOR/MOR/SMS (`/sms/reportes`) · matriz+barreras+peligros (`/sms/riesgos`) | Confidencialidad real del notificador |
| **3 — Procesos Proactivos y Predictivos** | Identificación de peligros proactiva/predictiva + evaluación/gestión de riesgo | SPI (`/sms/indicadores`, parcial-predictivo vía tendencias) | **Autoevaluación GAP** (proactivo) · **SMS alimentado por eventos ya detectados** (proactivo real) · BSC política↔objetivo↔SPI |
| **4 — Garantía de la Seguridad Operacional** | Medición de rendimiento · gestión del cambio · mejora continua · instrucción/educación · comunicación · registros | Capacitación SMS con API (sin UI) · Manuales (`/manuales`, decisión 135) como superficie de comunicación/registros | UI de capacitación SMS · comparativo GAP entre evaluaciones · gestión del cambio (✅ construida, decisión 168) |

**Sub-frentes ordenados** (menor riesgo/dependencia primero — mismo ciclo de 6 etapas de
[`50-hoja-de-ruta.md §3`](50-hoja-de-ruta.md)):

1. ✅ **SMS-A — Gobernanza con pantalla real** (Política + GSO) — **construido 2026-09-30**,
   `/sms/gobernanza`. Riesgo bajo, cierra la Fase 1 de verdad.
2. ✅ **SMS-B — Capacitación SMS con pantalla real** (cronograma + asistencia) — **construido
   2026-09-30**, `/sms/capacitacion`. Cierra parte de la Fase 4.
3. ✅ **SMS-C — Asistente reconstruido sobre las 4 fases oficiales** — **construido
   2026-09-30**, `/sms/asistente`. Reemplaza `PHASE_META` (secuencia inventada) por las 4 fases
   reales (`smsOfficialImplementationPlan.js`, 17 elementos) con el mapeo de la tabla de arriba,
   más el plan tipo Gantt con responsable + recursos por tarea + horizonte 12-24 meses + export
   CSV — el entregable real que se radica ante la Aerocivil, no una barra de progreso interna.
4. ✅ **SMS-D — Autoevaluación GAP (Mejora Continua, Apéndice 1)** — **construido 2026-09-30**,
   `/sms/mejora-continua`. Catálogo oficial de 100 preguntas porteado verbatim desde la base real
   de v1 (consultada directamente — no la red, igual criterio que `21-auditoria-sms.md`),
   personalizable por organización (ocultar cualquier pregunta + agregar propias en componente 5),
   con comparativo automático entre evaluaciones. Era la pieza que más le faltaba a la Fase 3.
5. ✅ **SMS-E — SMS alimentado por la operación** (parcial, 2 fuentes nuevas, 2026-09-30) —
   `POST /api/flota/unexpected-events` y `POST /api/capacitacion/exam` (examen reprobado) ahora
   generan un borrador en `sms_reports` pendiente de confirmación del Gerente SMS, mismo patrón
   ya probado en la decisión 50. Alertas DJI, batería sobre umbral y mantenimiento vencido
   quedan sin conectar porque esas reglas de negocio **no existen todavía en V2** (no es un
   enganche pendiente, es funcionalidad de Flota que no se ha construido) — geocerca/C2 siguen
   fuera mientras F2 esté omitido.
6. ✅ **SMS-F — BSC** — **construido 2026-09-30**, `/sms/objetivos`. Objetivos SMART vinculados
   a 1+ indicadores SPI (N:M), con el último dato mensual real de cada uno visible junto al
   objetivo — cierra el hallazgo de `17-implementacion-sms-uas.md §4`.
7. ✅ **SMS-G — Reporte mensual consolidado** — **construido 2026-09-30**, `/sms/reporte-mensual`.
   Estadística de operaciones + SPI + MOR del período en un solo lugar (agregado en vivo, nunca
   snapshot), con acuse real de envío — mismo patrón ya probado de `aerocivil_monthly_reports`.
8. ✅ **SMS-H — Confidencialidad real del notificador** — **construido 2026-09-30**. Checkbox real
   al reportar (antes la UI no exponía `confidentialityLevel`, aunque la API ya lo aceptaba) +
   `redactReporterIdentity()` aplicada en `api/sms/reports` y `api/sms/monthly-report`: un
   reporte `confidencial` solo expone la identidad del notificante al Gerente SMS o a sí mismo —
   nunca a Jefe de Pilotos/admin, aunque pasen la RLS de fila (Postgres RLS filtra filas, no
   columnas).
9. ✅ **SMS-I — MSMS como documento vivo** — **construido 2026-09-30**, `/sms/msms`. PDF generado
   desde política + GSO + objetivos BSC + riesgo + SPI + capacitación reales, publicado como
   versión en `/manuales` (categoría SMS, decisión 135) — versionado + acuses de lectura
   gratis, en vez de un PDF suelto. `msmsPublished` del asistente (SMS-C) ya se calcula real.
10. ✅ **SMS-J — Perfil de organización escalable** — **construido 2026-09-30**. Resuelve
    `P-017-3` primero en `30-entidades.md §6` (regla del ciclo: entidades antes de diseño), con
    alcance acotado al único umbral verificable — `100.545(a)` — en vez de inventar ejes de
    "tipo de operación"/"complejidad" sin fuente normativa.
11. ✅ **SMS-K — Mapas** — **construido 2026-10-01**, `/sms/mapas`. Portado tal cual de v1
    (`dashboard/safety/mapas/page.js`): visor ArcGIS oficial Aerocivil/UAEAC + referencia de
    6 tipos de restricción + tabla de límites de altura RAC 100 + enlaces oficiales. Contenido
    100% estático, sin backend propio — solo se adaptó al lenguaje visual de V2
    (`SectionHero`/`SectionCard`). **Cierra el plan de 11 sub-frentes de F3.**

**Deliberadamente fuera de este frente** (decisiones ya cerradas en
[`50-hoja-de-ruta.md §5`](50-hoja-de-ruta.md)): Cultura Justa, acto de aceptación del Ejecutivo
Responsable, aseguramiento de contratistas en Proveedores.

---

