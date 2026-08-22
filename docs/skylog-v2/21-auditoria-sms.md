# Auditoría del módulo SMS actual

[← Índice maestro](00-INDICE.md) · [Reglas](01-reglas.md) · Normativa: [`10-rac219-sms.md`](10-rac219-sms.md)

> Migrado desde `../investigacion-sms-rac219-bitafly.md` el 2026-08-22.
>
> ⚠️ **Corregido tras leer el texto primario del RAC 219** (ver [`10-rac219-sms.md`](10-rac219-sms.md)):
> el §0 de este documento declaraba que no se pudo acceder al RAC 219 — **ya se accedió**,
> vía el Drive del usuario. Las afirmaciones marcadas `⚠️ VERIFICAR` en el §6 quedaron así:
>
> | Afirmación original | Veredicto contra texto primario |
> |---|---|
> | Comité de Seguridad Operacional / GESO exigidos | ❌ **Incorrecta.** No aparecen en el RAC 219 vigente. Venían de la versión 2016 y de fuentes secundarias |
> | Ejecutivo Responsable exigido | ✅ Confirmado — `219.105(a)(2)(i)` |
> | Plan de respuesta ante emergencias exigido | ✅ Confirmado — `219.105(a)(4)` |
> | Gestión del cambio exigida | ✅ Confirmado — `219.105(c)(2)` |
> | SPT exigidos | ⏳ No aparece en 219.105. Pendiente en las directivas MAUT |
>
> **Y lo más importante**: la captura automática de eventos, que aquí se propone como
> diseño, resultó ser **requisito normativo** — `219.110(f)`. Ver `10-rac219-sms.md` §3.

---

Documento de insumo para el rediseño del módulo SMS en la versión 2.0. Su objeto es
responder tres preguntas: **qué exige la norma**, **qué cubre BitaFly hoy**, y **cómo
estructurar el módulo para que el cliente pueda realmente aplicarlo** — tanto en recolección
de datos como en análisis.

---

## 0. Fuentes y limitación honesta del entorno

**Lo que sí pude verificar de primera mano:**

| Fuente | Cómo se verificó |
|---|---|
| **RAC 100 actualizado** (resolución de modificación integral) | Documento completo aportado por el usuario, leído íntegro (7.638 líneas) |
| **Catálogo GAP oficial del Apéndice 1 (MAUT-5.0-22-017)** | **Consultado directamente en la base de datos de producción** — las 100 preguntas están transcritas literalmente del documento oficial, con sus 4 componentes y 12 elementos. Es la fuente más autoritativa disponible y no depende de la red |
| **Datos reales de uso del módulo SMS** | Consultas directas a producción (conteos, respuestas GAP, datos de indicadores) |
| **`docs/plan-mejora-sms-bitafly.md`** | Documento de control del proyecto SMS ejecutado en julio 2026, que revisó **10 documentos oficiales** de Aerocivil y dejó registrada la trazabilidad de cada decisión contra su fuente |

**Limitación real, declarada:** la política de red de este entorno **bloquea el acceso a
`aerocivil.gov.co`**, a los repositorios de normativa (`ramajudicial.gov.co`, `udi.edu.co`,
`aaaes.fac.mil.co`) y a `icao.int`. **No pude leer el texto primario del RAC 219.** Lo que
aquí se afirma sobre RAC 219 proviene de (a) las referencias explícitas que le hace el RAC 100
—que sí leí completo—, (b) el catálogo GAP oficial que está en la base, y (c) búsquedas web
cuyo contenido marco explícitamente como **pendiente de verificar contra el texto primario**.

Todo lo marcado con ⚠️ **VERIFICAR** debe contrastarse con el PDF oficial antes de construir
sobre ello.

**Documentos oficiales que el proyecto ya revisó** (según el plan de julio 2026):

| Documento | Clave |
|---|---|
| Circular — Implementación del SMS en explotadores UAS | MAUT-5.0-22-017 |
| Apéndice 1 — Análisis GAP del SMS para Explotador UAS | MAUT-5.0-22-017 |
| RAC 219 — Normas Generales de Implantación del SMS | RAC 219 |
| Herramienta de Evaluación de SMS (PEL-OPS-AIR-ANS-AGA) | MAUT-3.0-12-097 |
| Circular — Definición de Indicadores de desempeño (SPI) | MAUT-1.0-22-005 |
| Excel — Herramienta definición de SPIs | MAUT-1.0-12-002 |
| Directiva 02-24 — Reporte de Eventos de Seguridad Operacional | MAUT-1.0-22-004 |
| Directiva — Aceptación de los SMS | MAUT-1.0-22-006 |
| Directiva — Asuntos Complementarios para Implementación de SMS | MAUT-1.0-22-007 |
| Circular — Guía para obtener el Certificado de Explotador UAS | MAUT-5.0-22-011 |

---

## 1. Qué exige el RAC 100 en materia de SMS (verificado, texto primario)

`100.535(a)(18)` obliga a **implementar y mantener un SMS conforme a la norma RAC 219**, y
detalla cinco obligaciones concretas:

1. Proveer los recursos necesarios para el adecuado mantenimiento del SMS;
2. **Identificar los peligros y gestionar los riesgos** asociados a las actividades de su operación;
3. **Recopilar, analizar y proteger, así como compartir e intercambiar datos e información sobre
   seguridad operacional a la Aerocivil**;
4. Aplicar los principios para la protección de datos e información sobre seguridad operacional;
5. Emitir y mantener actualizado el **Manual del SMS (MSMS)** de acuerdo con el RAC 219.

> **Nota del propio RAC 100**: conforme a la Directiva Vinculante **MAUT-1.0-22-006**, la
> Aerocivil emite una **comunicación oficial de aceptación del SMS** una vez finalizada la fase
> de inspección y demostración del proceso de certificación como explotador UAS.

El punto 3 es el más relevante para el diseño: la norma no pide *tener* datos, pide
**recopilar, analizar, proteger y compartir**. Son cuatro verbos distintos, y BitaFly hoy solo
soporta bien el primero.

Otras exigencias del RAC 100 con impacto directo en el SMS:

- `100.535(a)(25)` — análisis de riesgos **por cada operación**, con identificación y
  priorización de peligros, evaluación y estrategias de mitigación. *(BitaFly lo cubre: SORA
  obligatorio al programar + evaluación de riesgos en el despacho.)*
- `100.535(a)(26)` — reportar en los **primeros 5 días hábiles de cada mes** la información
  estadística de operaciones, **indicadores SPI** y **reportes MOR** al Grupo Estadísticas y
  Análisis Sectorial.
- `100.545(d)` — el **Gerente de Seguridad Operacional** debe: hacer parte de la planta, sin
  conflicto de intereses, con formación acreditada en el sector aeronáutico, curso avanzado en
  gestión de la seguridad operacional y ≥1 año de experiencia administrativa en aviación
  tripulada. Sus funciones incluyen **administrar el plan de implantación del SMS**, dirigir la
  identificación de peligros, **monitorear las acciones correctivas**, **proveer reportes
  periódicos de desempeño**, conservar la documentación y planificar el entrenamiento.
- `100.545(b)` — **exclusividad**: JP y GSMS no pueden estar vinculados a otro explotador.
- `100.550(b)` — el MSMS se desarrolla en los términos del RAC 219 y de la directiva
  **MAUT-1.0-22-007**.

---

## 2. El marco: 4 componentes y 12 elementos (verificado, literal)

Estructura oficial del Apéndice 1, consultada directamente en la base. **La columna de peso
—cuántas preguntas dedica el evaluador oficial a cada elemento— es la señal más clara de qué
le importa a la autoridad**, y no se había analizado hasta ahora:

| Comp. | Componente | Elem. | Elemento | Preguntas |
|---|---|---|---|---|
| 1 | Política y objetivos de seguridad operacional | 1.1 | Responsabilidad y compromiso de la administración | 12 |
| 1 | | 1.2 | Responsabilidades respecto de la seguridad operacional | 9 |
| 1 | | 1.3 | Designación del personal clave de seguridad operacional | 3 |
| 1 | | 1.4 | Coordinación del plan de respuesta ante emergencias | 3 |
| 1 | | 1.5 | **Documentación SMS** | **16** |
| 2 | Gestión de riesgos de seguridad operacional | 2.1 | **Identificación de peligros** | **16** |
| 2 | | 2.2 | Evaluación y mitigación de riesgos | 5 |
| 3 | Garantía de la seguridad operacional | 3.1 | **Supervisión y medición de la eficacia** | **17** |
| 3 | | 3.2 | Gestión del cambio | 4 |
| 3 | | 3.3 | Mejora continua del SMS | 5 |
| 4 | Promoción de la seguridad operacional | 4.1 | Instrucción y educación | 5 |
| 4 | | 4.2 | Comunicación de la seguridad operacional | 5 |
| | | | **Total** | **100** |

**Cuatro elementos concentran 61 de las 100 preguntas**: Supervisión y medición (17),
Documentación SMS (16), Identificación de peligros (16) y Responsabilidad y compromiso (12).

---

## 3. Cobertura real de BitaFly, elemento por elemento

| Elem. | Elemento | Peso | Cobertura hoy | Qué existe / qué falta |
|---|---|---|---|---|
| 1.1 | Responsabilidad y compromiso | 12 | ❌ **Nula** | No existe la figura de **Ejecutivo Responsable**, ni la **política de seguridad** como artefacto firmado y difundido. `grep` en `src/`: 0 archivos |
| 1.2 | Responsabilidades SMS | 9 | ⚠️ Parcial | Hay roles del sistema, pero no un mapa documentado de responsabilidades de seguridad por cargo |
| 1.3 | Personal clave | 3 | ⚠️ Parcial | Existe el rol Gerente SMS, pero **sin validar las cualificaciones de `100.545(d)`** ni la exclusividad de `100.545(b)` |
| 1.4 | Plan de respuesta ante emergencias (ERP) | 3 | ❌ **Nula** | `emergency_contacts` es una lista de teléfonos (3 filas), no un ERP con procedimientos, roles y activación |
| 1.5 | **Documentación SMS** | **16** | ⚠️ Parcial | Manuales existe como **repositorio de archivos** con versionado y acuse. El **MSMS no se genera ni se estructura** desde la configuración real |
| 2.1 | **Identificación de peligros** | **16** | ⚠️ Parcial | `safety_hazards` existe (**2 filas**) y se llena a mano. **No hay recolección sistemática** desde lo que la operación ya produce |
| 2.2 | Evaluación y mitigación | 5 | ✅ **Buena** | Matriz 5×5 personalizable, tolerabilidad, evaluación obligatoria en el despacho con barreras y riesgo residual |
| 3.1 | **Supervisión y medición** | **17** | ❌ **Inerte** | 12 indicadores definidos y **`safety_indicator_monthly` con CERO filas**. El módulo existe y nunca se ha usado |
| 3.2 | Gestión del cambio | 4 | ❌ **Nula** | No existe ningún proceso de gestión del cambio. `grep`: 0 archivos |
| 3.3 | Mejora continua | 5 | ✅ Buena | GAP de 100 preguntas con comparativo entre evaluaciones |
| 4.1 | Instrucción y educación | 5 | ⚠️ Parcial | Cronograma existe; **`sms_training_attendance` con CERO filas** |
| 4.2 | Comunicación | 5 | ⚠️ Parcial | Campana y anuncios existen; no hay boletín ni comunicación de seguridad como artefacto |

**El patrón es inequívoco: BitaFly cubre bien los elementos de menor peso (2.2, 3.3, 4.1 — 5
preguntas cada uno) y mal o nada los tres de mayor peso (3.1 con 17, 1.5 con 16, 2.1 con 16).**

No es casualidad: los elementos livianos son los que se resuelven con una pantalla de
configuración. Los pesados exigen que el sistema **recopile y analice datos de forma
continua** — que es exactamente lo que no hace.

---

## 4. El hallazgo central: el SMS declara cumplimiento en vez de demostrarlo

Datos reales de producción, de las autoevaluaciones GAP ya realizadas:

| Métrica | Valor |
|---|---|
| Preguntas respondidas | 102 |
| Respuestas **"Sí"** | **99** |
| Respuestas "No" | **1** |
| Cumplimiento autodeclarado | **~99 %** |

Y simultáneamente, en la misma base de datos:

| Tabla | Filas |
|---|---|
| `safety_indicator_monthly` (datos mensuales de indicadores) | **0** |
| `sms_training_attendance` (asistencia a capacitación SMS) | **0** |
| `safety_indicator_actions` (planes de acción SPI) | **0** |
| `safety_hazards` (peligros identificados) | 2 |

**El elemento 3.1 — "Supervisión y medición de la eficacia de la seguridad operacional" — está
respondido "Sí" en sus 17 preguntas, mientras la plataforma no tiene un solo dato mensual de
indicadores.** Lo mismo con 4.1 "Instrucción y educación": todo "Sí", cero asistencias
registradas.

Esto **no es culpa del cliente**. Es la consecuencia directa de un diseño donde la
autoevaluación es un formulario de casillas desconectado de la evidencia que el propio sistema
custodia. Se le pide al usuario que *declare* lo que el sistema podría *demostrar*.

Y tiene una consecuencia práctica seria: si un inspector de la Aerocivil pide la evidencia
detrás de ese 99 %, no existe. El GAP en su forma actual es un riesgo, no un respaldo.

---

## 5. Por qué el módulo de indicadores está vacío — y por qué es el problema más fácil de resolver

`safety_indicator_monthly` tiene cero filas porque **exige captura manual, mes a mes, de dos
números que el sistema ya conoce**:

- **Denominador** (horas de vuelo del mes) → es una suma sobre `flights`.
- **Numerador** (número de eventos del tipo del indicador) → es un conteo sobre reportes ya
  clasificados.

Comprobación real, ejecutada contra producción:

| Periodo | Vuelos | Horas de vuelo (denominador SPI) |
|---|---|---|
| 2026-08 | 8 | 4,60 |
| 2026-07 | 11 | 19,41 |
| 2026-06 | 4 | 0,61 |
| 2026-03 | 5 | **0,00** |
| 2026-01 | 11 | **0,19** |
| 2025-12 | 9 | **0,00** |

El denominador **se calcula en una consulta**. Pedirle al gerente SMS que lo teclee cada mes
es la razón por la que nunca lo hace.

> **Hallazgo secundario, de calidad de datos**: varios meses tienen vuelos registrados con
> **0,00 horas** — `flights.total_time` viene nulo o cero en importaciones por Excel y en
> cierres sin hora de aterrizaje. Un SPI construido sobre eso daría tasas infladas o
> división por cero. El esquema v2 debe **tratar la duración como dato obligatorio derivado**,
> no como campo opcional.

---

## 6. Brechas de RAC 219 sin ninguna implementación

Verificado por `grep` sobre todo `src/` — cero coincidencias:

| Concepto | Archivos en el código |
|---|---|
| Ejecutivo Responsable | **0** |
| Comité de Seguridad Operacional / GESO | **0** |
| Política de seguridad (como artefacto gestionado) | **0** |
| Plan de implementación del SMS | **0** |
| SPT / metas de seguridad operacional | **0** |
| Gestión del cambio | **0** |

⚠️ **VERIFICAR contra el texto primario del RAC 219** — según fuentes secundarias, la norma
exige explícitamente:

- Un **Ejecutivo Responsable** que **firma la política de seguridad** y responde por la
  implantación y mantenimiento de un SMS eficaz.
- Un **Comité de Seguridad Operacional** y un **GESO** (Grupo Ejecutor de Seguridad
  Operacional), integrado por personal con alta experiencia, encargado de que el **plan de
  implementación** se ejecute.
- **Objetivos de seguridad operacional** definidos por el proveedor, que constituyen la base
  para la verificación y medición del desempeño — es decir, **SPT**, no solo SPI.
- Un **MSMS breve y conciso**, con lo que cambia periódicamente en apéndices.
- Que una organización con varias certificaciones Aerocivil puede tener **un solo SMS**, con un
  ejecutivo responsable y un gerente de seguridad, pero **un grupo de gestión por cada
  certificación**.

Ese último punto es notable: encaja de forma natural con la arquitectura **multi-organización**
que BitaFly ya construyó, y hoy no se aprovecha.

**BitaFly implementa hoy SPI (indicadores) pero no SPT (metas).** Existe
`expected_improvement_pct` y una "meta sugerida" calculada, pero no una meta declarada,
aprobada y seguida como exige el marco.

---

## 7. Materia prima que BitaFly ya tiene y no usa para el SMS

Esta es la respuesta a "recopilación de datos". El sistema ya registra todo esto, y **ninguno
alimenta el SMS hoy**:

| Fuente ya existente | Qué peligro/indicador podría alimentar |
|---|---|
| Alertas en logs DJI (`hasAlerts` en la importación) | Falla de sistema en vuelo · pérdida de enlace |
| `mode_code_reason` del C2 (22 causas: batería crítica, pérdida de señal del RC, RTH, obstáculo, aterrizaje forzoso…) | La taxonomía de eventos **más rica de toda la plataforma**, hoy inexistente porque C2 no está construido |
| Ciclos de batería sobre umbral de retiro | Falla de energía |
| Mantenimiento mayor/menor vencido | Aeronavegabilidad |
| Exámenes de capacitación reprobados o vencidos | Competencia del personal |
| Checklists de despacho con ítems en "No" | Condición previa al vuelo — **hoy se guardan y nunca se leen agregadamente** |
| Riesgos evaluados como "Inaceptable" en el despacho, con sus barreras | Tendencia de exposición al riesgo |
| Vuelos cerrados con reporte de seguridad marcado | Enlace directo a VOR/MOR (ya construido) |
| Excesos de tiempo de servicio (F5, por construir) | Fatiga del piloto |
| Geocercas violadas (F2, por construir) | Incursión en espacio aéreo |
| Cancelaciones de misión y sus motivos | Efectividad de la planeación |

**Los `results_*` son el caso más desperdiciado**: cada despacho guarda las respuestas de
Salud, Inventario, Pre-vuelo y Briefing, y **nadie las consulta nunca de forma agregada**. Un
ítem que se marca "No" repetidamente es, por definición, un peligro identificado por la
operación — y hoy esa señal se pierde.

---

## 8. Análisis: qué debería calcular el SMS y no calcula

| Análisis | Insumo (ya disponible) | Estado |
|---|---|---|
| Tasa mensual por indicador con líneas de alerta (μ + N·σ) | Fórmula ya implementada y verificada contra el Excel oficial | ✅ Existe, **sin datos** |
| Tendencia de peligros por categoría en el tiempo | `safety_hazards` + eventos | ❌ |
| Ítems de checklist con mayor tasa de "No" | `results_*` | ❌ |
| Aeronaves y pilotos con mayor concentración de eventos | eventos + `flights` | ❌ |
| Eficacia de las barreras (¿bajó el evento tras aplicar la mitigación?) | `safety_barriers` + eventos, antes/después | ❌ |
| Tiempo promedio de cierre de acciones correctivas | `sms_case_actions` | ⚠️ Parcial (solo casos) |
| Evolución del cumplimiento GAP entre evaluaciones | GAP | ✅ Existe |
| Cumplimiento de plazos de radicación (5 días hábiles MOR) | `vor_mor_submissions` | ✅ Existe |
| Exposición: horas voladas vs. eventos, por tipo de operación | `flights` + `mission_type` | ❌ |

**La "eficacia de las barreras" es la que más valor daría y la que nadie ofrece**: es
literalmente lo que el elemento 3.1 pide ("supervisión y medición de la eficacia"), y BitaFly
tiene los dos extremos del dato —la barrera y el evento— sin conectarlos.

---

## 9. Diseño propuesto para el SMS en v2

### 9.1 Principio rector: evidencia, no declaración

**Cada uno de los 12 elementos debe tener una fuente de evidencia automática.** La
autoevaluación GAP deja de ser un formulario en blanco y pasa a ser una **propuesta del sistema
con la evidencia adjunta**, que el gerente SMS confirma o corrige justificando.

Ejemplo concreto, elemento 3.1: en vez de preguntar *"¿supervisa y mide la eficacia de la
seguridad operacional?"* con una casilla Sí/No, el sistema responde:

> «Hay 12 indicadores definidos y **0 meses con datos**. Esta pregunta **no puede responderse
> Sí** hasta que exista al menos un periodo con datos. → *Cargar datos ahora* (con el
> denominador precalculado).»

Eso convierte un checkbox en una guía de implantación. Y hace imposible el 99 % falso.

### 9.2 Los indicadores se alimentan solos

- **Denominador automático**: horas de vuelo del periodo, derivadas de los vuelos. El usuario
  no lo teclea; puede sobrescribirlo con justificación si tiene un motivo.
- **Numerador automático**: conteo de eventos de la categoría del indicador en el periodo,
  desde el registro de eventos unificado (§9.3).
- **Cierre mensual asistido**: el sistema propone los valores del mes, el gerente SMS revisa y
  aprueba. Un clic, no un formulario.
- **SPT reales**: meta declarada y aprobada, además de la sugerida, con seguimiento de si se
  alcanzó.

### 9.3 Un registro de eventos unificado

Hoy conviven tres registros de eventos (`audit_log`, `notifications`, `sms_case_events`) y
ninguno es el registro de seguridad operacional. v2 necesita **un flujo de eventos de seguridad**
al que escriban todas las fuentes de §7, con taxonomía propia, y del que se deriven:
peligros propuestos, numeradores de indicadores, borradores de reporte, y evidencia del GAP.

**Ningún evento se convierte en reporte automáticamente** — un reporte de seguridad operacional
con consecuencias regulatorias siempre lo confirma una persona. El sistema solo garantiza que
nada se pierda.

### 9.4 Los elementos que faltan, como entidades de primera clase

- **Política de seguridad**: documento versionado, firmado por el Ejecutivo Responsable, con
  acuse de lectura de todo el personal — reutiliza el mecanismo que Manuales ya tiene probado.
- **Ejecutivo Responsable** y **Comité / GESO**: designaciones con vigencia, actas de reunión
  con temas y compromisos, que a su vez alimentan Acciones Correctivas.
- **Plan de implementación del SMS**: el asistente por fases, con % de avance derivado de
  evidencia real, no autodeclarado.
- **Plan de respuesta ante emergencias (ERP)**: procedimientos, roles, activación y simulacros.
  Hoy `emergency_contacts` con 3 filas no es un ERP.
- **Gestión del cambio**: registro de cambios significativos (aeronave nueva, tipo de operación
  nuevo, cambio de personal clave) con su evaluación de riesgo asociada. Se puede disparar
  **automáticamente** desde eventos que el sistema ya detecta: alta de aeronave, cambio de rol
  de personal clave, nueva categoría de operación autorizada.
- **Cualificaciones del personal clave**: validar `100.545(c)(d)` — 100 h certificadas y 40 h
  de SMS para el JP; formación, curso avanzado y experiencia para el GSMS; exclusividad de
  ambos, verificable con la arquitectura multi-organización ya existente.

### 9.5 Reporte mensual consolidado

`100.535(a)(26)` pide **un solo envío** en los primeros 5 días hábiles con estadística de
operaciones + SPI + MOR. Hoy son tres cosas separadas. v2 lo unifica en un paquete con acuse,
reutilizando el patrón ya probado de `aerocivil_monthly_reports`.

### 9.6 MSMS generado, no solo almacenado

El MSMS se compone desde la configuración real (política, matriz vigente, indicadores activos,
estructura de cargos, cronograma de capacitación, procedimientos), versionado, con el histórico
de acuses. El archivo subido a mano sigue siendo válido para quien lo prefiera — se añade una
vía, no se quita ninguna.

---

## 10. Cómo se le facilita al cliente

Traducción de todo lo anterior a experiencia de uso:

1. **El SMS deja de empezar en blanco.** Asistente de implantación por fases, con paquetes
   precargados de peligros, barreras e indicadores por tipo de operación (las 10 categorías
   oficiales). El cliente adopta, edita o descarta — **nunca se fabrican datos operacionales**,
   solo definiciones.
2. **Los indicadores se llenan solos.** Cierre mensual de un clic con valores propuestos.
3. **Los peligros llegan a una bandeja de entrada.** No hay que acordarse de registrarlos: la
   operación los produce y el sistema los propone.
4. **La autoevaluación se responde con evidencia.** El sistema muestra qué respalda cada "Sí" y
   bloquea los que no tienen respaldo.
5. **Un solo tablero de acciones correctivas**, ya existente, ahora alimentado también por
   comité, gestión del cambio y ERP.
6. **Un solo envío mensual** en vez de tres.
7. **El expediente para la aceptación del SMS** (MAUT-1.0-22-006) se descarga completo con toda
   la evidencia — el objetivo final del explotador, hoy inexistente como entregable.

---

## 11. Lo que falta verificar antes de construir

| # | Pendiente | Por qué importa |
|---|---|---|
| V-SMS-1 | **Leer el texto primario del RAC 219** | Todo el §6 depende de fuentes secundarias. Bloqueado por la política de red de este entorno — se necesita el PDF |
| V-SMS-2 | Confirmar si RAC 219 exige **Comité/GESO a un explotador UAS pequeño** o solo a proveedores mayores | Cambia si es entidad obligatoria u opcional en el modelo de datos |
| V-SMS-3 | Confirmar las **fases y plazos de implantación** del SMS que exige la norma | Define los pasos del asistente |
| V-SMS-4 | Revisar **MAUT-1.0-22-006** (aceptación) para el contenido exacto del expediente | Define el entregable final del §10.7 |
| V-SMS-5 | Confirmar si la Aerocivil exige **SPT declarados** además de SPI | Define si la meta es entidad propia |

---

*Documento de insumo para `docs/plan-bitafly-v2.md` §F3. Creado 2026-08-22.*
