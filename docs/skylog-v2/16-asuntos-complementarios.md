# MAUT-1.0-22-007 — Asuntos complementarios para implementación de SMS

[← Índice maestro](00-INDICE.md) · [Reglas](01-reglas.md) · [RAC 219](10-rac219-sms.md) · [Directivas](12-directivas-maut.md)

**Versión 01, aprobada 27/06/2024. Instrumento vinculante.** Complementa el RAC 219 publicado
en el Diario Oficial 52.737 del 24 de abril de 2024.

> Es **la pieza que faltaba**: desarrolla en detalle lo que el RAC 219 enuncia en una línea.
> Documento propio por extensión (regla D5: un documento, un tema).

---

## 1 · ⚠️ Corrección: el Comité y el GESO SÍ son exigibles

**Me equivoqué, y hay que decirlo claro.** En [`10-rac219-sms.md`](10-rac219-sms.md) §2 afirmé:

> *"Comité de Seguridad Operacional / GESO — **NO aparece** en el texto vigente… no es exigible
> por el RAC 219 vigente."*

**Es incorrecto.** No aparecen *nominalmente* en el articulado del RAC 219, pero esta directiva
—**vinculante**— los deriva de `219.105(a)(2)(iii, iv, v)` y los desarrolla en sus secciones
**7.3** y **7.4**.

La conclusión correcta:

| | |
|---|---|
| ¿Exigibles? | **Sí**, vía directiva vinculante |
| ¿Para todos? | **No.** *"La existencia de este Comité se ajustará a la **dimensión** del proveedor de servicios y a la **complejidad** de sus productos o servicios"* |

**Son escalables.** Un piloto independiente no necesita comité; una escuela con 40 aeronaves
sí. Esto encaja con el criterio "S = Adecuado según tamaño y complejidad" de la directiva de
aceptación ([`12-directivas-maut.md`](12-directivas-maut.md) §1.7).

> **Lección de método**: al leer el RAC 219 di por cerrado un punto que en realidad se
> desarrolla en una directiva vinculante aparte. **El articulado no agota la obligación.** Antes
> de declarar que algo "no es exigible", hay que revisar las directivas que lo desarrollan.

---

## 2 · Ejecutivo Responsable (§7.1) — perfil completo

> *"persona **única e identificable** dentro de cada organización, quien asumirá la
> **responsabilidad total** sobre el cumplimiento de los RAC… tiene la responsabilidad final
> del funcionamiento seguro… debe tener **autoridad para tomar decisiones** en nombre de la
> organización, **controlar todos los recursos**… y ser responsable de **responder ante
> accidentes e incidentes**."*

Aplica aunque la organización tenga **varias certificaciones**: un solo Ejecutivo Responsable.

> **Decisión de alcance (2026-08-22): no se construye acto de aceptación.** La aceptación
> expresa del rol y la comprensión de los once deberes **ya viven en el manual del cliente**;
> el sistema no las vuelve a pedir ni las registra como flujo propio. Lo que sí queda es el
> **nombramiento** — quién es, desde cuándo — porque el resto del sistema lo necesita para
> saber a quién dirigir aprobaciones y notificaciones.

### Los once deberes (§7.1.2)

1. Garantizar recursos humanos, financieros y demás medios
2. Asegurar que todo el personal cumpla el SMS y el RAC 219
3. Establecer, desarrollar y apoyar la **política y los objetivos** de seguridad operacional
4. Asegurar que la política sea **comprendida, implementada y mantenida en todos los niveles**
5. Demostrar conocimiento básico de los RAC
6. Responsabilidad directa en la conducta de los asuntos de la organización
7. **Responsabilidad final y rendición de cuentas** por la implementación y mantenimiento del SMS
8. Ser el **contacto directo con la Autoridad Aeronáutica**
9. **Ser aceptado por la Autoridad Aeronáutica**
10. Designar personas competentes para funciones de control y administración
11. Establecer criterios para la **revisión periódica** de la política y los objetivos

**El punto 9 es notable**: la designación **la valida la autoridad** (§7.1.3, durante la
vigilancia). No es un campo que la organización llena y ya.

Y §7.1.1 exige que *"esa persona **comprenda a cabalidad y acepte expresamente** los roles y
responsabilidades"* → hay un **acto de aceptación** que registrar.

---

## 3 · Gerente de Seguridad Operacional (§7.2)

**Nominado por el Ejecutivo Responsable** (§7.1.4). Puede ser empleado directo **o contratado**
(§7.2.2).

> **Decisión de alcance (2026-08-22): el perfil del Gerente SMS sí se construye, con carga de
> archivos.** *"SE DEBEN CARGAR LOS ARCHIVOS PARA TENER EL REGISTRO COMPLETO."* Es un expediente
> con documentos adjuntos —hoja de vida, certificados de formación en SMS, acta de nominación—,
> no solo un campo con un nombre. Reutiliza el patrón de expediente de tripulante y de manuales
> corporativos que ya existe.

### Perfil (§7.2.3) — ⚠️ difiere del RAC 100

| MAUT-1.0-22-007 §7.2.3 | RAC 100 §100.545(d) |
|---|---|
| Formación acreditada en áreas del sector aeronáutico | Formación acreditada en áreas del sector aeronáutico |
| Experiencia operacional acreditada **respecto de las funciones y naturaleza de la organización** | ≥1 año de experiencia administrativa **en aviación tripulada** |
| **Curso aprobado y certificado, específico en SMS** | **Curso avanzado** en gestión de la seguridad operacional |
| **Formación en gestión o gerencia de proyectos** | — |

**No son idénticos.** Un explotador UAS debe cumplir **ambos** — el RAC 100 le aplica por ser
explotador UAS, y esta directiva por estar sujeto al RAC 219. La validación de perfil en Skylog
debe contemplar la unión de los dos, no uno solo.

### Dedicación exclusiva, escalable

> §7.2.5.2 — *"De acuerdo con el **tamaño y complejidad** de la Organización, deberá tener como
> **único cargo** el de Gerente de Seguridad Operacional, a fin de mantener **independencia y
> objetividad**."*

Cruza con `100.545(a)`, que permite a un explotador con **hasta 2 UAS** designar una sola
persona para Jefe de Pilotos y Gerente SMS. Otra regla escalable por tamaño.

### Siete funciones (§7.2.4)

Administrar el plan de implantación · dirigir la identificación de peligros y gestión de
riesgos · **monitorear que se lleven a cabo las acciones correctivas** · **proveer reportes
periódicos de desempeño** · mantener la documentación · planificar el entrenamiento · proveer
**asesoramiento independiente**.

---

## 4 · Comité de Seguridad Operacional (§7.3) — nivel estratégico

| | |
|---|---|
| **Preside** | El **Ejecutivo Responsable** |
| **Integran** | Los gerentes de las áreas funcionales |
| **Obligatorio en él** | El Gerente de Seguridad Operacional |
| **Carácter** | **Estratégico** — políticas, asignación de recursos, supervisión del desempeño |

**Funciones**: monitorear el desempeño frente a la política y objetivos · la eficacia del SMS ·
la correcta gestión de riesgos · **la efectividad de las operaciones y servicios
subcontratados** · que las medidas correctivas se adopten oportunamente. Asegurar recursos.
**Impartir directivas estratégicas al GESO.**

---

## 5 · Grupo Ejecutor de Seguridad Operacional (§7.4) — nivel táctico

| | |
|---|---|
| **Preside** | El **Gerente de Seguridad Operacional** |
| **Integran** | Gerentes de áreas o sus designados **+ representantes del personal operativo** |
| **Carácter** | **Táctico** — implementación y funcionamiento, para satisfacer las directivas del Comité |

**Siete funciones**, entre ellas: asegurar que existan *"arreglos satisfactorios para la
**recolección de datos** de seguridad operacional y la **retroinformación de los empleados**"* ·
**evaluar el impacto de los cambios operacionales** · **examinar la efectividad de las
recomendaciones previamente aplicadas**.

### §7.4.3 — Cómo se mide su resultado

Los resultados del GESO *"se verán reflejadas en"*:

- El desempeño de la seguridad, **"a través de evidencias tales como el comportamiento de los SPI"**
- La eficacia del plan de implantación del SMS
- La gestión eficaz del riesgo
- **La correcta definición y mejora de los indicadores**
- La eficacia de la supervisión de las **operaciones subcontratadas**
- La definición y alimentación de **listas de problemas de seguridad operacional importantes**

> El desempeño del órgano se mide **con los SPI**. Refuerza que el tablero de indicadores es el
> instrumento de gobierno del SMS, no un reporte más.

---

## 6 · Interfases del SMS (§7.8) — el hallazgo que conecta Proveedores con el SMS

No estaba en ningún análisis previo.

> *"Cuando un proveedor de servicios con SMS **contrata una organización no sujeta a un SMS**,
> los peligros y riesgos de seguridad operacional que podrían introducirse por el contratista
> **son tratados por el SMS del proveedor de servicios**. Esto impone responsabilidades SRM
> adicionales."*

**Interfases internas** (entre operaciones y mantenimiento, o con finanzas, RR.HH., jurídica) y
**externas** (otro Estado, otros proveedores, servicios contratados). Se definen *"como parte
de la **descripción del sistema**, documentado en el SMSM"*.

Exigencia de §7.8.3: definir las responsabilidades de identificación de peligros y gestión de
riesgos *"en la totalidad de la cadena de servicios dentro del sistema, **sin brechas ni
superposiciones**"*.

### Qué significa para Skylog V2.0

**BitaFly ya tiene el módulo Proveedores** (listado + checklist de auditoría), hoy aislado del
SMS. Según §7.8, un proveedor contratado es una **interfase** cuyos riesgos entran al SMS del
explotador — así que existía la tentación de fusionar ambos módulos.

> **Decisión del usuario (2026-08-22): no se hace.** *"No agregaremos proveedores de SMS,
> dejaremos proveedores como está."* El módulo de Proveedores conserva su alcance actual —
> listado y auditoría de back-office— y **no se convierte en el registro de interfases del SMS**.

La gestión de interfases sigue siendo una obligación del explotador, pero se atiende **donde ya
corresponde**: la interfase se declara en la descripción del sistema dentro del Manual del SMS,
que es del cliente (regla **C3**), y cualquier peligro que surja de un contratista entra al
registro de peligros por la vía normal de identificación, igual que cualquier otro peligro. No
hace falta un puente automático entre dos módulos para que eso ocurra.

Los cinco criterios de §7.8.4 quedan documentados como referencia de qué revisar por interfase
—temas críticos y peligros identificados · incidentes notificados y abordados · controles
aplicados y revisados regularmente · interfases revisadas periódicamente · sesiones de
instrucción con las organizaciones externas— **sin convertirse en un checklist del sistema**.

---

## 7 · Manual del SMS (§7.6)

> §7.6.1 — *"El Manual de SMS **no es objeto de aprobación** por parte de la Autoridad
> Aeronáutica, pues es el **Sistema** el que es objeto de verificación."*

Pero §7.6.2: *"es uno de los componentes expresos… que será **parte del proceso de
aceptación**"*.

**Contenido mínimo (§7.6.3)** — seis bloques, y el quinto son procedimientos:

1. Alcance del SMS
2. Política y objetivos
3. Responsabilidades (rendición de cuentas)
4. Personal clave
5. **Procedimientos** para cada ítem del RAC 219:
   - Identificación de peligros y gestión de riesgos
   - Supervisión de la eficacia
   - **Auditorías a la gestión de seguridad operacional** ← no modelado hoy
   - **Gestión del cambio** ← no modelado hoy
   - Promoción de la seguridad operacional
   - **Control de las actividades contratadas** ← conecta con §7.8
6. *(la descripción del sistema y sus interfases, por §7.8.2)*

Refuerza el diseño ya propuesto: **el MSMS se genera desde la configuración real**, porque su
contenido *"debe ser completamente coherente y consistente con el funcionamiento del sistema"*.

---

## 8 · Plan de respuesta ante emergencias (§7.5)

Ocho requisitos concretos — deja de ser un vacío difuso:

1. **Transición ordenada y eficiente** de operaciones normales a operaciones de emergencia
2. Designación de, o coordinación con, **la autoridad que lidera** la emergencia
3. **Asignación de responsabilidades** de la emergencia
4. Coordinación de esfuerzos
5. Continuidad segura de las operaciones, o **regreso a la normalidad** lo antes posible
6. **Compatibilidad con los planes de otras organizaciones**
7. Que las operaciones durante el plan se realicen **dentro de un nivel de riesgo aceptable**
8. *(para OMA, lo dispuesto en RAC 219 Apéndice 1, 1(c))*

Con esto, el ERP es diseñable: procedimientos, roles, autoridad líder, activación y criterios
de retorno. Muy distinto de los 3 teléfonos que hay hoy en `emergency_contacts`.

> **Decisión del usuario (2026-08-22): diseñable **y editable por el cliente**.** Los ocho
> requisitos son la **estructura** que el sistema garantiza que esté cubierta; el **contenido**
> de cada procedimiento lo escribe la organización según su manual (regla **C3**). El sistema
> precarga un esqueleto con los ocho puntos y el cliente lo llena, lo reordena y lo amplía.
> También se conecta con los dieciséis escenarios de emergencia del ítem 31 de
> [`14-listas-verificacion.md`](14-listas-verificacion.md), precargados bajo la misma regla.

---

## 9 · Instrucción en SMS (§7.10) — currículo mínimo

Cuatro componentes obligatorios:

1. **Cursos básicos** sobre SMS
2. **Cursos de actualización** sobre SMS
3. Eventos informativos sobre **el alcance y cubrimiento de las políticas de no punitividad
   ante reportes**
4. Eventos informativos sobre **sucesos no tolerables**, incluyendo *causalidad, consecuencias
   y gestión*

**Registros permanentes** con certificados que evidencien: tipo de evento · **intensidad
horaria** · nombre · fecha · institución.

> El componente 3 es revelador: la organización debe **enseñar activamente** que reportar no es
> punitivo. Encaja con la Directiva 02-24 ([`12`](12-directivas-maut.md) §2.6) y explica por qué
> los sistemas de reporte fracasan cuando nadie lo comunica.

Hoy el módulo de Capacitación SMS registra asistencia, pero **no el currículo mínimo ni la
intensidad horaria**.

> **Decisión del usuario (2026-08-22): el currículo se ofrece como recomendación, escoge el
> usuario.** Los cuatro componentes se precargan como plan sugerido y explicado, y la
> organización arma el suyo encima (regla **C4**). Lo que **sí** se estructura sin negociación
> es el **registro**: tipo de evento, intensidad horaria, nombre, fecha e institución, porque
> son los campos del certificado que la norma exige conservar y son los que una inspección pide
> ver.

---

## 10 · Alineación con el Programa Estatal (§7.12)

> *"Los objetivos de seguridad operacional del proveedor **deberán alinearse con aquellos
> establecidos en el Programa Estatal de Seguridad Operacional (SSP)**… definiendo SPI de
> acuerdo con los objetivos definidos en la organización **incluidos aquellos concertados por
> cada subsector**."*

Cierra el argumento de [`13-herramientas-spi.md`](13-herramientas-spi.md) §2: los 11
indicadores concertados para UAS no son una sugerencia — son la vía de alineación con PEGASO.

---

## 11 · Vigilancia continua y basada en riesgos (§7.11)

- Toda organización **fuera de proceso de certificación** debe tener un **SMS aceptado y un plan
  de acción**.
- Las organizaciones **en certificación** reciben vigilancia **al plan de implementación**.
- §7.9.3 — *"los procedimientos de inspección **observarán el comportamiento de los
  indicadores**, y los podrán utilizar como componente de la **vigilancia basada en riesgos**"*.

**Los SPI son el instrumento de vigilancia del inspector.** Un indicador en alerta atrae
supervisión. Razón adicional para que las líneas de alerta se calculen bien — ver la corrección
de la regla de rachas en [`13`](13-herramientas-spi.md) §3.2.

---

## 12 · Resumen de lo nuevo que aporta esta directiva

| # | Elemento | Estado en BitaFly |
|---|---|---|
| 1 | **Comité de Seguridad Operacional** (escalable) | ❌ No existe |
| 2 | **GESO** (escalable) | ❌ No existe |
| 3 | Ejecutivo Responsable con 11 deberes y aceptación por la autoridad | ❌ No existe |
| 4 | Perfil del Gerente SMS — **unión** de esta directiva y el RAC 100 | ❌ No se valida |
| 5 | **Interfases del SMS** → conecta Proveedores con el SMS | ❌ Módulo aislado |
| 6 | ERP con 8 requisitos | ❌ Solo 3 teléfonos |
| 7 | Auditorías internas al SMS | ❌ No existe |
| 8 | Gestión del cambio | ❌ No existe |
| 9 | Control de actividades contratadas | ❌ No existe |
| 10 | Currículo mínimo de instrucción + intensidad horaria | ⚠️ Parcial |
| 11 | Alineación de objetivos con PEGASO | ❌ No existe |

---

## 13 · Pendientes

| # | Pendiente |
|---|---|
| P-007-1 | Cruzar el perfil del Gerente SMS entre esta directiva y `100.545(d)` para la validación única |
| P-007-2 | Definir el umbral de escalabilidad: ¿desde qué tamaño se exige Comité y GESO? |
| P-007-3 | RAC 219 Apéndice 1, 1(c) — referido en §7.5.2.8 |

---

*Analizado 2026-08-22 contra el texto primario.*
