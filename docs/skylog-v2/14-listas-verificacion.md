# MAUT-5.0-12-095 — Lista de verificación del Manual de Operaciones

> Fuente primaria: `MAUT-5.0-12-095` — *Instrucciones de diligenciamiento de la Lista de
> Verificación para revisar el Manual de Operaciones MO*.
> Índice: [`00-INDICE.md`](00-INDICE.md) · Reglas: [`01-reglas.md`](01-reglas.md)

Es el documento con el que un **Inspector de Seguridad Operacional** revisa el Manual de
Operaciones de un explotador UAS dentro del proceso de certificación del **CDO-U**. No es una
guía de buenas prácticas: es la rúbrica con la que se aprueba o se rechaza.

Su valor para Skylog V2.0 es directo — **enumera, ítem por ítem, qué evidencia tiene que poder
producir un explotador.** Todo lo que aquí aparece como "evidencia válida" es un dato o un
documento que el sistema debería poder generar sin que nadie lo transcriba a mano.

---

## 1 · Estructura del formulario

15 casillas. Las cuatro que importan para el diseño:

| Casilla | Contenido |
|---|---|
| 6 | Ítem — numeración del requisito (1 a 57) |
| 7 | Norma de referencia (RAC 100 / RAC 219 / directiva) |
| 8 | **Pregunta del requisito** |
| 9 | Respuesta `Sí` / `No` |
| 10 | **Orientación para la evaluación** — lo que el inspector debe encontrar |
| 11 | Estado de implementación: `Satisfactorio` · `No satisfactorio` · `No aplicable` |
| 12 | Pruebas presentadas por el solicitante |
| 13 | Observaciones |

**Regla dura de la casilla 10**: *"El Inspector debe examinar cada una de las orientaciones de la
casilla 10, para que la respuesta a la pregunta de la casilla 8 pueda ser considerada como
satisfactoria. **Una sola orientación** no satisfecha…"* — la evaluación es **conjuntiva**: basta
que falte un sub-punto para que el ítem completo caiga.

> Mismo patrón que la escala P/S/O/E de [`12-directivas-maut.md`](12-directivas-maut.md): la
> autoridad evalúa por el eslabón más débil, no por el promedio. Un tablero de cumplimiento que
> muestre "93 % completo" está describiendo mal la realidad regulatoria.

`No satisfactorio` significa *"cumple sólo en forma parcial **o** no cumple"* — no hay estado
intermedio. Un módulo de autoevaluación que ofrezca "parcial" está inventando una categoría que
el inspector no tiene.

---

## 2 · Los 57 ítems por bloque

| Bloque | Ítems | Qué evalúa |
|---|---|---|
| Generalidades | 1–16 | Estructura del MO, organigrama, personal, instalaciones |
| Aspectos de la operación | 17–22 | Tipos de operación, contacto visual, flota, ETA, software |
| **Evaluación del enlace C2** | 23 | Contra la Directiva Vinculante MAUT-5.0-22-016 |
| **Evaluación de dronpuertos** | 24 | Contra la Directiva Vinculante MAUT-5.0-22-014 |
| Procedimientos | 25–31 | Libro de vuelo, bitácora, planificación, reportes, emergencias |
| Entrenamiento continuo | 32 | Programa, recurrencia, registros |
| Factores humanos | 33 | Fatiga, sustancias, entorno no punitivo |
| Control documental | 34 | Repositorio, custodia, preservación de registros |
| **Revisión del Manual SMS** | 35–57 | Los cuatro componentes del RAC 219 |

Los ítems 35–57 se subdividen exactamente en los cuatro componentes del SMS:
gestión de riesgos (35–38) · aseguramiento (39–44) · políticas y objetivos (45–54) ·
promoción (55–57).

---

## 3 · Tres directivas vinculantes que no teníamos

El listado de "norma de referencia" trae tres documentos que no estaban en el inventario del
proyecto y que **son vinculantes**, no informativos:

| Documento | Naturaleza | Materia |
|---|---|---|
| **MAUT-5.0-22-016** "01-23" | Directiva **Vinculante** | *Criterios de aceptación del enlace **C2** para explotadores UAS* |
| **MAUT-5.0-22-014 DI** "03-23" | Directiva **Vinculante** | *Condiciones técnicas para **dronpuertos** en operaciones UAS* |
| **MAUT-5.0-22-011** | Circular Informativa | *Guía para obtener el certificado de explotador UAS* — citada en 50 de los 57 ítems |

**MAUT-5.0-22-016 es la más importante que falta.** El módulo de Comando y Control
([`42-comando-control.md`](42-comando-control.md)) se diseñó a partir de la documentación técnica
de DJI y del RAC 100, sin conocer que existe una directiva vinculante que fija los **criterios de
aceptación del enlace C2**. Hasta leerla, cualquier afirmación sobre qué debe registrar o mostrar
el módulo C2 para ser aceptable ante la autoridad es una suposición. Queda como pendiente P-LV-1,
con prioridad alta.

---

## 4 · Ítems que se traducen en requisitos de producto

Solo se listan aquellos donde la orientación de la casilla 10 describe un dato concreto.

### 4.1 Ítem 15 — Pilotos y observadores

Evidencia exigida: relación de pilotos UAS vinculados · **Certificado de Idoneidad de cada uno**
· **las adiciones con las que cuenta cada uno** · relación de observadores vinculados.

El observador es una figura **enumerable y vinculada**, no un rol accesorio. Y las *adiciones*
son parte de la evidencia de certificación, no un adorno del perfil.

### 4.2 Ítem 19 — Flota: 18 especificaciones técnicas mínimas

*"Las especificaciones técnicas deben contener como mínimo:"*

| | | |
|---|---|---|
| MTOW | Dimensiones físicas de la UA | Clasificación de la UA |
| Tipo de despegue y aterrizaje | Velocidad máxima de ascenso | Velocidad máxima de descenso |
| Velocidad máxima de vuelo (por modo) | Techo máximo de operación | Autonomía |
| Alcance / radio máximo de acción | Resistencia máxima al viento | Rango de temperatura operativo |
| GNSS soportados | Nivel de certificación IP (si aplica) | **Frecuencias de operación (enlace C2)** |
| Sistemas de comunicación | Marca · Modelo · Serie | Capacidades y limitaciones operativas |

Más: *"Toda la flota debe estar registrada bajo RAC 100"* y *"definición clara sobre el uso de la
flota, de acuerdo con la(s) operación(es) solicitada(s)"* — es decir, **la aeronave se asocia a
los tipos de operación que puede ejecutar**, no es una ficha suelta.

> Esto es una **ficha técnica de aeronave**, no cuatro campos. Y explica por qué el MO se escribe
> a mano hoy: los datos no viven en ninguna parte estructurada. Si la ficha existe como dato, el
> capítulo de flota del MO se **genera**.

### 4.3 Ítem 21 — Equipos Tecnológicos Asociados (ETA)

Mismos campos que la flota (marca, modelo, especificaciones, capacidades, limitaciones, serie) y
la misma exigencia: *"Todos los ETA deben estar **registrados bajo RAC 100**"* y con uso definido
por tipo de operación. El ETA es una entidad registrable con matrícula, no un accesorio de
inventario.

### 4.4 Ítems 25 y 26 — Son **dos** libros distintos

| Ítem | Documento | Cardinalidad exigida |
|---|---|---|
| 25 | **Libro de vuelo** | *"Un libro de vuelo para cada uno de los UAS que posea"* — **uno por aeronave** |
| 26 | **Bitácora de vuelo del piloto** | *"una bitácora de vuelo para cada uno de los pilotos UAS vinculados"* — **uno por piloto** |

Ambos exigen, además: responsable designado · procedimiento de diligenciamiento · **formato
válido definido** · almacenamiento.

> No son dos tablas: son **dos vistas y dos reportes del mismo evento de vuelo**, cada uno con su
> responsable y su procedimiento. Lo que el sistema debe garantizar es que ambos se puedan emitir
> completos y por separado, con el formato declarado en el MO.

### 4.5 Ítem 30 — Listas de chequeo por **fase de vuelo**

*"Listas de chequeo que contenga como mínimo las siguientes fases de vuelo"*:

`Pre-vuelo` → `Encendido de motores` → `Despegue` → `Ascenso` → `Crucero` →
`Cumplimiento del tipo de operación` → `Aproximación` → `Descenso` → `Aterrizaje` → `Apagado` →
`Post-vuelo`

**Once fases**, y **por cada tipo de UAS**. Además deben incorporar *"instrucciones y
recomendaciones que el fabricante considera en los manuales del usuario de cada UAS"*.

> Es un modelo de checklist distinto al de "antes de despachar": son listas **durante** el vuelo,
> ancladas a una fase. Cualquier diseño de checklists que asuma "una lista antes de volar" no
> cubre este ítem.

### 4.6 Ítem 31 — Los 16 escenarios de emergencia mínimos

*"como mínimo y sin limitarse a"*:

1. Falla en la estación en tierra y/o GCS
2. Falla en la UA
3. Falla en los ETA
4. **Pérdida o degradación del enlace C2**
5. Incapacidad física y/o psicológica del piloto UAS o del personal
6. Incendio y/o presencia de humo
7. **Exceso en el índice Kp** o altos niveles de interferencia electromagnética
8. Presencia de aeronaves tripuladas en cercanías
9. Presencia de aves o fauna en cercanías
10. **Extralimitación de las geo-cercas o geo-vallas**
11. Pérdida definitiva de control de la operación normal
12. Pérdida, degradación o falla de las funciones de la UA
13. Pérdida o disminución de sistemas adicionales requeridos para mayor nivel de seguridad,
    **incluyendo servicios tercerizados**
14. Pérdida, degradación o falla del sistema de propulsión
15. Degradación de las condiciones meteorológicas en cualquier fase del vuelo

Tres de estos escenarios (4, 7, 10) son **condiciones que la telemetría puede detectar sola**.
El índice Kp ya se consume en la plataforma actual para decidir aptitud de vuelo; aquí aparece
como disparador de un procedimiento de emergencia documentado. Es la misma variable con dos
usos, y hoy solo se le da uno.

### 4.7 Ítem 34 — Custodia de registros ante un suceso

El texto que más consecuencias tiene de toda la lista:

> *"Descripción del procedimiento definido por el solicitante para la **preservación y custodia de
> los registros de vuelo (logs de vuelo), grabaciones de audio y video**, ante la ocurrencia de un
> incidente, accidente y/o suceso operacional."*

**Corrige una decisión ya tomada en este proyecto.** Se había fijado que la retención de cinco
años aplica a registros operacionales y que *"los replay y videos se mantienen como están, ya que
la retención es documental y no de replay"*. Eso es cierto **en operación normal**. No lo es
cuando ocurre un suceso: ahí el log de vuelo y las grabaciones de audio y video pasan a ser
material bajo custodia.

Consecuencia de diseño: la purga por cuota de plan necesita una **excepción por retención legal**.
Al abrirse un caso (MOR, VOR, accidente), el material asociado a ese vuelo queda congelado y deja
de ser elegible para borrado automático, con registro de quién lo liberaría y cuándo. Se detalla
en [`34-seguridad.md`](34-seguridad.md) cuando se rehaga.

### 4.8 Ítem 33 — Factores humanos

Capítulo obligatorio del MO. Contenido mínimo: política de sustancias psicoactivas y alcohol ·
**política de descanso y control de fatiga** · declaración escrita de oportunidades para discutir
errores humanos **en un entorno NO punitivo** · procedimiento para identificar, tratar y corregir
errores humanos · evaluación, seguimiento y control de acciones en el tiempo.

Enlaza con dos frentes ya abiertos: los tiempos de servicio y descanso
([`41-tiempos-servicio.md`](41-tiempos-servicio.md)) y la Cultura Justa
([`17-implementacion-sms-uas.md`](17-implementacion-sms-uas.md)) — el "entorno no punitivo"
aparece aquí como requisito del MO, además de como principio del SMS.

---

## 5 · Los ítems 35–57 y la autoevaluación

Los 23 ítems de SMS son las mismas preguntas del RAC 219 pero formuladas como
*"¿está **escrito**…?"*. Confirman dos cosas ya sostenidas en este proyecto:

- **Ítem 52 — *"¿La organización ha establecido comité(s) de seguridad operacional?"*** con
  orientación de revisar estructura, términos de referencia, responsabilidades y **periodicidad de
  las reuniones**. Cierra la corrección registrada en [`10-rac219-sms.md`](10-rac219-sms.md): el
  comité **sí** es materia de inspección.
- **Ítem 39 — *"¿Están los SPIs relacionados con los objetivos de seguridad operacional y han
  planteado metas?"*** El vínculo SPI ↔ objetivo es lo que se revisa; un catálogo de indicadores
  sin objetivo asociado no satisface el ítem. Coincide con el Balanced Scorecard de
  [`17-implementacion-sms-uas.md`](17-implementacion-sms-uas.md).

También el ítem 35 fija los cinco parámetros del sistema de notificación: **voluntaria ·
mandatoria · retroalimentación · confidencialidad y protección de datos · almacenamiento**. La
*retroalimentación* al notificante es un parámetro inspeccionable — no un gesto opcional.

---

## 6 · Qué habilita esto en el producto

| # | Consecuencia |
|---|---|
| L1 | La lista de 57 ítems es un **checklist de preparación para certificación** que el explotador puede correr antes de que llegue el inspector, con la misma redacción y los mismos tres estados. |
| L2 | Cada ítem se puede **enlazar a la evidencia real** que ya vive en el sistema (ficha de flota, roster de pilotos con CIPU y adiciones, formato de libro de vuelo, procedimientos). El ítem deja de ser una casilla y pasa a ser un enlace. |
| L3 | El Manual de Operaciones se **genera** en su mayor parte: flota, ETA, pilotos, observadores, organigrama, instalaciones y procedimientos son datos, no prosa. Lo redactado a mano se reduce a lo que de verdad es criterio propio. |
| L4 | El estado debe ser **binario** (`Satisfactorio` / `No satisfactorio`) más `No aplicable`. Nada de porcentajes de avance por ítem. |
| L5 | La evaluación **conjuntiva** de la casilla 10 obliga a modelar los sub-puntos de orientación, no solo la pregunta. Un ítem tiene N condiciones y falla con una. |

---

## 7 · Pendientes

| # | Pendiente | Prioridad |
|---|---|---|
| P-LV-1 | Obtener **MAUT-5.0-22-016 "01-23"** — criterios de aceptación del enlace C2 (vinculante). Bloquea la validación de [`42-comando-control.md`](42-comando-control.md) | **Alta** |
| P-LV-2 | Obtener **MAUT-5.0-22-014 DI "03-23"** — condiciones técnicas para dronpuertos (vinculante) | Media |
| P-LV-3 | Obtener **MAUT-5.0-22-011** — guía para obtener el CDO-U (citada en casi todos los ítems) | Media |
| P-LV-4 | Transcribir las orientaciones completas de los 57 ítems como catálogo de sub-condiciones | Media |
| P-LV-5 | Obtener el **MIU** (Manual del Inspector UAS), citado como fuente del procedimiento | Baja |

---

*Analizado 2026-08-22 contra el texto primario de MAUT-5.0-12-095.*
