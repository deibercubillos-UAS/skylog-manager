# Directivas MAUT · análisis

[← Índice maestro](00-INDICE.md) · [Reglas](01-reglas.md) · [RAC 219](10-rac219-sms.md)

Análisis de las directivas y circulares vinculantes de Aerocivil sobre SMS.
La circular de indicadores (MAUT-1.0-22-005) tiene documento propio por extensión:
[`13-herramientas-spi.md`](13-herramientas-spi.md).

| Documento | Estado |
|---|---|
| **MAUT-1.0-22-006** — Aceptación de los SMS | ✅ Analizado (§1) |
| MAUT-1.0-22-004 — Reporte de eventos (MOR) | ⬜ Pendiente |
| MAUT-1.0-22-007 — Asuntos complementarios | ⬜ Pendiente |
| MAUT-5.0-22-017 — Implementación SMS en explotadores UAS + Apéndice 1 GAP | ⬜ Pendiente · ⚠️ **no está en la carpeta nueva**, sí en la anterior del Drive |
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

## 2 · Pendientes

| # | Pendiente |
|---|---|
| P-MAUT-1 | Analizar **MAUT-1.0-22-004** (MOR): taxonomía de eventos, plazo de 5 días hábiles, IRIS |
| P-MAUT-2 | Analizar **MAUT-1.0-22-007** (asuntos complementarios) |
| P-MAUT-3 | Localizar y analizar **MAUT-5.0-22-017** + su Apéndice 1 (catálogo GAP de 100 preguntas) |
| P-MAUT-4 | Analizar **MAUT-3.0-12-097** — la matriz P/S/O/E · ver §1.9 |

---

*Analizado 2026-08-22 contra el texto primario.*
