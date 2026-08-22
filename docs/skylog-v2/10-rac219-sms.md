# RAC 219 — Gestión de Seguridad Operacional · análisis

[← Índice maestro](00-INDICE.md) · Reglas aplicables: [`01-reglas.md`](01-reglas.md) §5

**Fuente**: `RAC_219_Gestion_De_Seguridad_Operacional.md` (Google Drive), texto primario
leído directamente. Adoptado por Resolución 02737 de 2016, **enmendado por la Resolución
00718 del 23 de abril de 2024** (Diario Oficial 52.737).

> **Cierra la verificación V-SMS-1** que quedó abierta en
> `../investigacion-sms-rac219-bitafly.md`: todo lo que allí estaba marcado `⚠️ VERIFICAR`
> se contrasta aquí contra el texto primario.

---

## 1 · Hallazgo estructural: la enmienda de 2024 redujo el RAC 219 a 11 secciones

| Versión | Secciones |
|---|---|
| 2016 (`RAC 219 - Implementación del Sistema SMS`) | **50** (219.001 → 219.315) |
| **Vigente** (`RAC 219 - Gestión de Seguridad Operacional`) | **11** |

Comparación de ambos textos: las 39 secciones que existían solo en 2016 desaparecieron. **El
título cambió** de *"Normas Generales de Implantación del SMS"* a *"Gestión de Seguridad
Operacional"*.

**Estructura vigente:**

| Capítulo | Sección | Título |
|---|---|---|
| **A** | 219.001 | Definiciones y abreviaturas |
| A | 219.005 | Aplicabilidad |
| **B** | 219.100 | Normas Generales |
| B | **219.105** | **Estructura de un SMS** |
| B | **219.110** | **Sistema de recopilación y procesamiento de datos sobre seguridad operacional** |
| B | 219.115 | Protección de datos e información sobre seguridad operacional |
| B | 219.120 | Deber de protección de la información |
| B | 219.125 | Principios de protección de la información |
| B | 219.130 | Principio de excepción de la protección |
| B | 219.135 | Divulgación al público y responsabilidad del custodio |
| B | 219.140 | Protección de datos registrados |

**Dato que cambia el diseño: 6 de las 11 secciones (219.115 → 219.140) tratan sobre
protección y no divulgación de la información de seguridad operacional.** Más de la mitad de
la norma vigente. BitaFly **no tiene nada** de esto implementado.

---

## 2 · 219.105 — Estructura de un SMS (verbatim)

Confirma los **4 componentes y 12 elementos**, idénticos al catálogo GAP del Apéndice 1 que
ya está transcrito en la base de datos:

**(a) Política y objetivos de seguridad operacional**
1. Compromiso de la dirección — *"deberá definir su política de seguridad operacional…"*
2. Obligación de rendición de cuentas y responsabilidades — *"Identificar al directivo o
   ejecutivo que, independientemente de sus otras funciones…"* · *"Definir los niveles de
   gestión con atribuciones para tomar decisiones sobre la [seguridad operacional]"*
3. Designación del personal clave — *"deberá designar un gerente de seguridad operacional"*
4. Coordinación de la planificación de respuestas ante emergencias — *"debe garantizar que el
   plan de respuesta ante [emergencias]…"*
5. Documentación SMS — *"deberá preparar y mantener un manual de SMS"*

**(b) Gestión de riesgos de seguridad operacional**
1. Identificación de peligros — *"deberá definir y mantener un proceso y procedimientos…"*
2. Evaluación y mitigación de riesgos — *"deberá definir y mantener un proceso que garantice…"*

**(c) Aseguramiento de la seguridad operacional**
1. Observación y medición del rendimiento — *"deberá desarrollar y mantener los medios…"*
2. **Gestión del cambio** — *"deberá definir y mantener un proceso…"*
3. Mejora continua del SMS — *"deberá observar y evaluar sus procesos SMS…"*

**(d) Promoción de la seguridad operacional**
1. Instrucción y educación — *"deberá crear y mantener un programa de instrucción…"*
2. Comunicación — *"deberá crear y mantener un medio oficial de comunicación"*

### Confirmaciones y correcciones respecto de la investigación previa

| Punto | Estado |
|---|---|
| 4 componentes / 12 elementos | ✅ **Confirmado en texto primario** |
| Ejecutivo Responsable (219.105(a)(2)(i)) | ✅ **Confirmado como requisito.** Sin implementación en BitaFly |
| Gerente de Seguridad Operacional (219.105(a)(3)(i)) | ✅ Confirmado. Existe parcialmente |
| Plan de respuesta ante emergencias (219.105(a)(4)) | ✅ **Confirmado como requisito.** Sin implementación |
| Manual de SMS (219.105(a)(5)(i)) | ✅ Confirmado. Solo como repositorio de archivos |
| **Gestión del cambio (219.105(c)(2))** | ✅ **Confirmado como requisito.** Sin implementación |
| **Comité de Seguridad Operacional / GESO** | ⚠️➡️✅ **CORREGIDO 2026-08-22.** No aparecen nominalmente en el articulado, pero la directiva **vinculante** MAUT-1.0-22-007 §7.3 y §7.4 los deriva de `219.105(a)(2)(iii,iv,v)` y los desarrolla. **Sí son exigibles**, y son **escalables según dimensión y complejidad**. Ver [`16-asuntos-complementarios.md`](16-asuntos-complementarios.md) §1 |
| SPT (metas) como entidad exigida | ⚠️ No aparece explícito en 219.105. Pendiente de revisar en MAUT-1.0-22-001/005 |

> ⚠️ **Esta sección contenía un error, corregido el 2026-08-22.** Se afirmó aquí que el Comité
> y el GESO *"no son exigibles por el RAC 219 vigente"* por no aparecer en el articulado. **Es
> incorrecto**: la directiva vinculante MAUT-1.0-22-007 los desarrolla en detalle a partir de
> `219.105(a)(2)`. Ver [`16-asuntos-complementarios.md`](16-asuntos-complementarios.md) §1.
>
> **Lección de método**: el articulado del RAC no agota la obligación — las directivas
> vinculantes lo desarrollan. Nunca declarar "no exigible" sin revisarlas.

---

## 3 · 219.110 — El SDCPS: el hallazgo que redefine el módulo

Sección **modificada por la Resolución 718 de 2024** — la misma que trajo el SMS de los
explotadores UAS a este reglamento. Es el corazón de lo que el módulo debe hacer.

> *"el proveedor de servicios debe contar con sistemas de recopilación y procesamiento de
> datos sobre seguridad operacional para **captar, almacenar, agregar y permitir el análisis**
> de datos e información sobre seguridad operacional."*

Cuatro verbos, cuatro obligaciones distintas. Y enumera **seis fuentes que el sistema debe
incluir**:

| | Fuente exigida | BitaFly hoy |
|---|---|---|
| a) | Datos relativos a **investigaciones de accidentes e incidentes** | ❌ No existe |
| b) | Datos relativos a **investigaciones de seguridad operacional efectuadas por el propio proveedor** | ❌ No existe |
| c) | **Sistemas de notificación obligatoria** | ✅ MOR |
| d) | **Sistemas de notificación voluntaria** | ✅ VOR |
| e) | **Indicadores de rendimiento en materia de seguridad operacional** | ⚠️ Definidos, **cero datos** |
| f) | **Sistemas de auto notificación, incluidos los sistemas automáticos de captura de datos** | ❌ **No existe** |

### Por qué el literal (f) es decisivo

La investigación previa proponía conectar los eventos que la operación ya produce (alertas
DJI, mantenimientos vencidos, geocercas violadas, exámenes reprobados) para alimentar el SMS.
Eso se planteó como *buena idea de producto*.

**No lo es: es un requisito normativo literal.** `219.110(f)` exige que el SDCPS incluya
**"sistemas automáticos de captura de datos"**. La captura automática no es una mejora
opcional — es una de las seis fuentes que la norma enumera.

Esto **eleva la prioridad** de ese diseño de "conveniencia para el cliente" a "cumplimiento".

### Además: la autoridad puede pedir los datos

> *"La UAEAC requerirá a los proveedores de servicios a la aviación datos e información sobre
> seguridad operacional."*

El SDCPS debe poder **entregar** su contenido a la autoridad cuando esta lo pida. Es un
requisito de exportabilidad, no solo de almacenamiento.

---

## 4 · 219.115 → 219.140 — Protección de la información (6 secciones)

**El bloque más extenso de la norma vigente, y la brecha más grande de BitaFly.**

Títulos verificados: Protección de datos e información (219.115) · Deber de protección
(219.120) · Principios de protección (219.125) · Principio de excepción (219.130) ·
Divulgación al público y responsabilidad del custodio (219.135) · Protección de datos
registrados (219.140).

Elementos ya identificados en el texto:

- **219.130** — establece que existe **una única persona autorizada para divulgar** la
  información, y que ciertas divulgaciones requieren **autorización previa de la UAEAC**.
- **219.135** — define la figura del **custodio de los datos** y su responsabilidad.

### Implicación directa para Skylog V2.0

Esto no se resuelve con RLS por organización. Exige:

1. **Custodio designado** por organización, como rol formal con trazabilidad.
2. **Clasificación de la información**: qué es dato protegido de seguridad operacional y qué no.
3. **Control de divulgación**: quién puede exportar, a quién, con qué autorización, y registro
   de cada divulgación.
4. **Régimen de excepción** (219.130) modelado explícitamente, no como permiso genérico.
5. **Protección de datos registrados** (219.140) — incluye los datos capturados
   automáticamente, es decir **la telemetría y el video del C2**.

> ⚠️ **Pendiente de lectura detallada**: el contenido íntegro de 219.115–219.140 no se ha
> transcrito aún. Se hará en un documento propio cuando se diseñe el módulo de seguridad
> (`34-seguridad.md`), por el volumen que ocupa.

---

## 5 · Qué cambia respecto del plan anterior

| Tema | Antes | Ahora |
|---|---|---|
| Comité / GESO | Brecha normativa | ✅ **Exigibles**, vía MAUT-1.0-22-007, y **escalables** por tamaño |
| Captura automática de eventos | Mejora de producto | **Requisito**, `219.110(f)` |
| Protección de datos SMS | Mencionado de pasada | **6 de 11 secciones de la norma.** Módulo propio |
| Investigaciones internas | No contemplado | **Requisito**, `219.110(a)(b)` |
| Exportación a la autoridad | No contemplado | **Requisito**, `219.110` final |
| Gestión del cambio | Brecha (fuente secundaria) | ✅ **Confirmado** en texto primario, `219.105(c)(2)` |

---

## 6 · Pendientes de este documento

| # | Pendiente |
|---|---|
| P-219-1 | Transcribir y analizar 219.115 → 219.140 en detalle → `34-seguridad.md` |
| P-219-2 | Leer 219.001 (definiciones) y 219.005 (aplicabilidad) — confirmar cómo aplica a explotadores UAS |
| P-219-3 | Leer 219.100 (normas generales) |
| P-219-4 | Confirmar si SPT es exigible, en MAUT-1.0-22-001 y MAUT-1.0-22-005 → `12-directivas-maut.md` |

---

*Analizado 2026-08-22 contra el texto primario.*
