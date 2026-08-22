# Directivas MAUT · análisis

[← Índice maestro](00-INDICE.md) · [Reglas](01-reglas.md) · [RAC 219](10-rac219-sms.md)

Análisis de las directivas y circulares vinculantes de Aerocivil sobre SMS.
La circular de indicadores (MAUT-1.0-22-005) tiene documento propio por extensión:
[`13-herramientas-spi.md`](13-herramientas-spi.md).

| Documento | Estado |
|---|---|
| **MAUT-1.0-22-006** — Aceptación de los SMS | ✅ Analizado (§1) |
| **MAUT-1.0-22-004** — Directiva 02-24, Reporte de eventos (MOR/VOR) | ✅ Analizado (§2) |
| **MAUT-1.0-22-007** — Asuntos complementarios | ✅ [Documento propio](16-asuntos-complementarios.md) |
| **MAUT-5.0-22-017** — Implementación SMS en explotadores UAS | ✅ [Documento propio](17-implementacion-sms-uas.md) |
| MAUT-1.0-22-005 — Definición de SPI | ✅ [Documento propio](13-herramientas-spi.md) |

---

## 1 · MAUT-1.0-22-006 — Aceptación de los SMS

**Versión 01, aprobada 17/05/2024. Carácter vinculante** (Decreto 1294 de 2021, art. 19 num. 19).

Define **cómo la Aerocivil decide si acepta o rechaza el SMS** de un explotador. Es, en la
práctica, el examen final del módulo — y hasta ahora el proyecto no lo había modelado.

### 1.1 La escala de madurez P·S·O·E

Cuatro niveles, en orden ascendente. **P es el mínimo, E el máximo.**

| Nivel | Definición literal |
|---|---|
| **P** — Presente | *"hay evidencia de que el ítem evaluado es claramente visible y se encuentra en la **documentación** del SMS"* |
| **S** — Adecuado *(Suitable)* | *"el ítem es **adecuado según el tamaño, la naturaleza, la complejidad y el riesgo inherente** en la actividad"* |
| **O** — Operativo | *"hay evidencia de que el ítem **está en uso y se está produciendo una salida (resultado)**, es decir, está funcionando como se diseñó"* |
| **E** — Efectivo | *"hay evidencia de que el ítem **está logrando efectivamente el resultado deseado** y tiene un impacto positivo en la seguridad operacional"* |

### 1.2 La regla de aceptación

> *"se revisará que la totalidad de ítems haya obtenido por lo menos la calificación «S»…
> **Si la organización obtiene al menos uno de los ítems en Presente «P», el SMS no puede ser
> aceptado**."*

| Condición | Resultado |
|---|---|
| **Todos** los ítems en **S o superior** | ✅ SMS **aceptado** |
| **Al menos uno** en **P** | ❌ SMS **rechazado** |

Es una regla de mínimo, no de promedio. Un solo ítem flojo tumba la aceptación completa.

### 1.3 Por qué esto reconfigura el módulo

En [`21-auditoria-sms.md`](21-auditoria-sms.md) se documentó que las autoevaluaciones GAP
reales declaran **99 respuestas afirmativas de 102**, mientras `safety_indicator_monthly` y
`sms_training_attendance` tienen **cero filas**.

Con esta directiva ese hallazgo deja de ser una observación de diseño y se vuelve un
**pronóstico concreto**:

> Un módulo SPI con 12 indicadores definidos y **cero datos mensuales** está, por definición
> de la propia directiva, en **"P"** — existe en la documentación, pero **no está "produciendo
> una salida"**. Y con un solo ítem en P, **el SMS no se acepta**.
>
> **Esa organización, con su 99 % autodeclarado, tendría el SMS rechazado.** No por falta de
> voluntad, sino porque el sistema le permitió declarar sin producir evidencia.

### 1.4 El GAP binario no sirve para predecir la aceptación

| | Hoy | Lo que evalúa la autoridad |
|---|---|---|
| Escala | **Sí / No** | **P · S · O · E** |
| Criterio | % de "Sí" | **Todos ≥ S**, o rechazo |
| Base | Declaración | **Evidencia**, escalada por nivel |

Un GAP al 99 % de "Sí" **no dice nada** sobre si el SMS será aceptado. Son escalas distintas.

### 1.5 La definición de "Evidencia" es el plano del módulo

> *"Incluye documentación, informes, registro de las entrevistas y reuniones… para que un
> indicador esté **presente** la evidencia es probable que esté **solamente documentada**,
> mientras que para evaluar si está **operativo** pueden ser necesarios **registros de
> evaluación**, reuniones con personal y/o sondeos."*

Se lee directamente como especificación:

| Para alcanzar | Hace falta |
|---|---|
| **P** | Que el artefacto **exista y esté documentado** |
| **S** | Que sea **proporcional** al tamaño y complejidad de la organización |
| **O** | Que **haya registros de uso** — datos capturados, sesiones realizadas, reportes procesados |
| **E** | Que haya **evidencia de resultado**: el evento medido bajó, la barrera funcionó |

**Skylog V2.0 puede calcular P/S/O/E automáticamente** para buena parte de los ítems, porque
sabe si un artefacto existe (P), si hay registros de uso (O) y si la tendencia mejoró (E).

Ese es el producto: no *"responde 100 preguntas"*, sino **"tu SMS está en P en 3 ítems, y con
uno solo en P no te lo aceptan. Esto es lo que falta"**.

### 1.6 Degradación — la aceptación no es permanente

> *"podría ocurrir que un SMS que en una evaluación haya sido aceptado… **se degrade y caiga al
> estado «P»**, razón que motivará que el inspector… genere la respectiva comunicación dirigida
> al **Ejecutivo Responsable**, como parte de plan de vigilancia basada en riesgos."*

El nivel se **vigila de forma continua**. Implicación: el estado P/S/O/E debe ser un valor
vivo, recalculado, con alerta cuando un ítem retrocede — no una foto de la última evaluación.

### 1.7 Escalabilidad como criterio normativo

La directiva define **escalabilidad** y la incorpora al criterio "S":

> *"Debe tenerse en cuenta el **tamaño, la naturaleza, la escalabilidad y la complejidad** de la
> organización al realizar la evaluación."*

Un piloto independiente y una escuela con 40 aeronaves **no se evalúan con la misma vara**. El
módulo debe ajustar qué se considera "adecuado" según el perfil de la organización — no aplicar
un checklist único.

### 1.8 Formalización

Carta de aceptación dirigida al **Ejecutivo Responsable**, con copia al **Gerente de SMS**, y
**copia en PDF de la matriz de evaluación**. Se emite al cerrar la fase de inspección y
demostración del proceso de certificación.

Tercera aparición del Ejecutivo Responsable como destinatario formal (las otras dos, en
[`13-herramientas-spi.md`](13-herramientas-spi.md) §6). **Confirma que es entidad de primera
clase con flujo de aprobación y notificación.**

### 1.9 La herramienta de evaluación es MAUT-3.0-12-097

La matriz P/S/O/E con sus ítems, orientación y columnas es el archivo de 1 MB que está en el
Drive. **Sube de prioridad**: deja de ser "referencia opcional al final" y pasa a ser la
**fuente de los ítems que Skylog V2.0 debe poder autoevaluar**.

Columnas de la matriz: `Ítem · Componente · Elemento · Indicadores de cumplimiento y
rendimiento · Eficacia · ¿Cómo se logra? · Comentarios`, con orientación *"Qué buscar"* por
nivel.

> **Nota de orden**: en el plan aprobado, MAUT-3.0-12-097 iba al final por su tamaño. Con este
> hallazgo debería adelantarse — **pero no lo reordeno sin tu visto bueno**.

---

## 2 · MAUT-1.0-22-004 — Directiva 02-24, Reporte de eventos de seguridad operacional

**Versión 01, aprobada 08/05/2024.** Deroga en su totalidad la Circular Reglamentaria
5000-082-002 V2. Aplica a las organizaciones del `219.005(b)` — **incluye explotadores UAS**.

Es la fuente que la circular de SPI señala como principal: *"será importante utilizar los
eventos registrados en el listado MOR para la definición de los indicadores"*.

### 2.1 ⚠️ MOR y VOR no se distinguen por ser obligatorio u opcional

Esta es una corrección de fondo a cómo lo modela BitaFly hoy.

| | **MOR** | **VOR** |
|---|---|---|
| Quién reporta | **El Gerente de SMS** | **Una persona distinta del Gerente de SMS** |
| Análisis previo | **Sí, obligatorio**: *"debe ser presentado una vez el Gerente de SMS haya realizado el respectivo filtraje y análisis inicial"* | **No se espera**: *"tampoco se espera que realice análisis sobre el evento que reporta"* |
| Plazo | **5 días hábiles** desde la ocurrencia | No se fija plazo |
| Plataforma | **IRIS** — `iris.aerocivil.gov.co/Iris/Mor` | **El mismo formulario** |
| Lista de eventos | La del §7.2 de la directiva | **La misma lista** |

**La diferencia real es el rol del notificador y si hubo análisis previo — no la
obligatoriedad.** Ambos usan el mismo formulario, la misma plataforma y la misma lista.

> Confirma la **regla S3** (`01-reglas.md`): *el sistema propone, una persona confirma*. La
> norma **exige** que el Gerente de SMS filtre y analice antes de radicar un MOR. Un evento
> capturado automáticamente **no puede convertirse en MOR sin ese paso humano**.

### 2.2 Los 12 eventos UAS de obligatorio reporte

La directiva trae una tabla propia: *"Eventos de Obligatorio Reporte referidos a Aeronaves No
Tripuladas (Drones, UAS y RPAS)"*.

| Taxonomía | Evento |
|---|---|
| `UA-CTOL` | Colisión con obstáculo(s) durante el despegue o el aterrizaje |
| `UA-SCF-NP` | Falla o mal funcionamiento de **transmisión desde el suelo** |
| `UA-SCF-NP` | Falla o mal funcionamiento de sistemas/componentes de **comunicaciones a bordo** |
| `UA-SCF-NP` | Falla o mal funcionamiento de sistemas/componentes de **datalink** |
| `UA-LOC-I` | **Pérdida de control en vuelo** |
| `UA-GCOL` | Cuasi colisión con RPA |
| `UA-SEC` | Operación de RPA **sin autorización** |
| `UA-SEC` | **Ingreso a espacio aéreo sin autorización** |
| `UA-SEC` | Excursión de los límites del Mando Operativo Aeroespacial (MOA) |
| `UA-ATM` | Comunicaciones incorrectas, confusas, incompletas o ausentes del RPA con el ATC |
| `UA-ATM` | Coordinación deficiente relacionada con la operación de un RPA |
| `UA-NAV` | **Reporte incorrecto de posición** de un RPA |

**Los ~300 eventos de la lista general también aplican** cuando corresponden a la operación
(meteorología `WSTRW`, fatiga `MED`, fauna `WILD`, procedimientos `PROC`…). La tabla UAS es
adicional, no sustitutiva.

### 2.3 El círculo se cierra: detección → reporte → indicador

Tres normas distintas apuntan al mismo dato. Con el módulo C2, esto queda encadenado de punta
a punta:

| Norma | Qué exige |
|---|---|
| **RAC 219 `219.110(f)`** | El SDCPS debe incluir **sistemas automáticos de captura de datos** |
| **Directiva 02-24** | `UA-SCF-NP` datalink es de **obligatorio reporte en 5 días hábiles** |
| **Circular SPI** | `U-SCF-NP(2)` **Pérdida del enlace C2** es indicador oficial |

Y el C2 lo detecta solo, vía `wireless_link.sdr_quality` y `mode_code_reason`.

> **Una degradación del enlace C2 es, simultáneamente**: un dato que el SDCPS debe capturar
> automáticamente, un evento de reporte obligatorio con plazo de 5 días hábiles, y el numerador
> de un indicador oficial. **El mismo hecho alimenta tres obligaciones distintas.**
>
> Hoy en BitaFly no se detecta ninguna de las tres. Con C2 se detectan las tres de un solo
> evento — con la confirmación humana que exige §2.1 antes de radicar.

Lo mismo aplica a `UA-SEC` *ingreso a espacio aéreo sin autorización*, que es exactamente el
`geofence_breach` del motor de geocercas.

### 2.4 Lo que NO es MOR ni VOR

Exclusiones literales, verificables en la interfaz:

- Solicitudes, derechos de petición, quejas, reclamos
- Informes anónimos o denuncias de **actos delictivos**
- **Reportes de violaciones o incumplimientos de la norma**

### 2.5 ⚠️ Los accidentes e incidentes graves NO van por MOR

> *"esta Directiva… **no aplican para** reporte de violaciones o reporte de aquellos eventos que
> constituyan **accidentes o incidentes graves (serios)**, en cuyo caso la organización debe
> seguir los procedimientos… del **RAC 114 — Investigación de Accidentes e Incidentes**."*

**Contradice el modelo actual**: `sms_reports.severity` ofrece `incidente`, `incidente_grave` y
`accidente` sobre el mismo flujo. Pero un **accidente** o un **incidente grave** siguen una vía
distinta (RAC 114), con otros plazos y otro destinatario.

En Skylog V2.0 la clasificación de severidad debe **bifurcar el flujo**, no solo etiquetarlo:
al marcar accidente o incidente grave, el sistema debe indicar que **no se radica por IRIS/MOR**
y remitir al procedimiento del RAC 114.

> **Pendiente**: el RAC 114 no está entre los documentos revisados. Se necesita para diseñar
> esa rama.

### 2.6 No punitivo — con una condición

> *"El reporte de un evento MOR es **no punitivo** por parte de la Aerocivil, **si y solo si**
> cumple con las directrices establecidas."*

Y el reverso:

> *"si una organización… **no reporta** un evento registrado en esta Directiva y su ocurrencia
> **se evidencia desde otro componente del sistema** nacional aeronáutico u otro proveedor,
> entonces la Organización que no reporte se podrá ver avocada al proceso respectivo de
> **investigación por sanción técnica**."*

**Argumento de producto directo**: no reportar es más riesgoso que reportar. Un sistema que
detecta el evento automáticamente y recuerda el plazo de 5 días hábiles **protege al cliente de
una sanción**, no le añade trabajo.

### 2.7 El reporte no agota la obligación

> *"La presentación del reporte obligatorio **no exime** al proveedor de servicios de su
> responsabilidad de **compilar sus propios reportes, realizar análisis, investigar e
> identificar causalidad y llevar a cabo los planes de choque, planes de acción y gestión**."*

Confirma `219.110(a)(b)`: las **investigaciones internas** son obligación propia, separada del
reporte a la autoridad. Hoy BitaFly no las modela.

### 2.8 Alcance más amplio que la lista

Debe reportarse además:

- Cualquier evento que, **a juicio del notificador**, puso o pudo poner en riesgo la seguridad;
- Todo evento que **no afectó** la seguridad pero se considere **condición latente** que pueda
  crear consecuencias **si se repite**.

→ La lista es un mínimo. El formulario necesita una vía para el evento no listado.

### 2.9 Desidentificación

> *"**Desidentificación**: Eliminación, por parte de Aerocivil de los datos personales
> referentes al notificador y de los datos técnicos que se deduzcan de la notificación que
> puedan llevar a identificar al notificador, con el fin de mantener la confidencialidad."*

Es la contraparte del bloque de protección de datos del RAC 219 (`219.115`–`219.140`). Skylog
V2.0 debe poder **exportar un reporte desidentificado** — y proteger la identidad del notificador
internamente, no solo frente a la autoridad.

---

## 3 · Pendientes

| # | Pendiente |
|---|---|
| P-MAUT-1 | **RAC 114** — Investigación de Accidentes e Incidentes. No está entre los documentos del Drive; hace falta para la bifurcación de §2.5 |
| P-MAUT-3 | Localizar y analizar **MAUT-5.0-22-017** + su Apéndice 1 (catálogo GAP de 100 preguntas) |
| P-MAUT-4 | Analizar **MAUT-3.0-12-097** — la matriz P/S/O/E · ver §1.9 |

---

*Analizado 2026-08-22 contra el texto primario.*
