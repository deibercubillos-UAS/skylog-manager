# MAUT-5.0-22-017 — Implementación del SMS en explotadores UAS

[← Índice maestro](00-INDICE.md) · [Reglas](01-reglas.md) · [RAC 219](10-rac219-sms.md) · [Complementarios](16-asuntos-complementarios.md)

**Circular Informativa, versión 01, aprobada 07/12/2023.** 45 páginas, específica para
explotadores UAS.

> ⚠️ **Anterior al RAC 219 enmendado (abril 2024) y a la modificación integral del RAC 100.**
> Contiene referencias a numeración antigua — cita `RAC 100.520` para el Gerente de Seguridad
> Operacional, que en el RAC 100 vigente es **`100.545`**. Su contenido metodológico sigue
> siendo válido; las referencias cruzadas hay que verificarlas contra las normas vigentes.

**Lectura**: se leyeron completos el §7.3 (implementación) y sus subsecciones. **No se
transcribieron** el §7.1 (importancia) ni el §7.2 (estructura del SMS, que replica los 4
componentes ya verificados), ni los anexos con el catálogo GAP —este último ya está transcrito
literal en la base de datos, ver [`21-auditoria-sms.md`](21-auditoria-sms.md).

---

## 1 · El hallazgo principal: las 4 fases oficiales de implementación

La circular **define la estructura del plan de implantación** que el explotador debe presentar.
Esto reemplaza el asistente por fases que yo había propuesto inventando la secuencia.

| Fase | Nombre | Elementos que cubre |
|---|---|---|
| **1** | **Planificación del SMS** | Compromiso de la dirección · Rendición de cuentas y responsabilidades · Designación del personal clave · Coordinación del plan de respuesta ante emergencias · Documentación (MSMS) |
| **2** | **Implementación de los Procesos Reactivos** | Identificación de peligros (reactiva) · Evaluación y gestión de riesgos |
| **3** | **Implementación de los Procesos Proactivos y Predictivos** | Identificación de peligros (proactiva y predictiva) · Evaluación y gestión de riesgos |
| **4** | **Implementación de la Garantía de la Seguridad Operacional** | Compromiso de la dirección · **Observación y medición del rendimiento** · **Gestión del cambio** · Mejora continua · Actualización del MSMS · **Instrucción y educación** · **Comunicación** · **Registros** |

### Plazo y forma del plan

> *"proponer mediante un plan razonable, **tipo Gantt**, la puesta en marcha, ejecución y
> documentación de todo lo definido en un tiempo **máximo entre 12 y 24 meses**, que dé espacio
> para la observación y medición del rendimiento…"*

Y §7.3.5: *"Se recomienda dentro del plan tipo Gantt asignar los **responsables** y la
**proyección de los recursos** requeridos."*

**La Aerocivil aprueba el plan** considerando el tamaño de la organización, el tipo y las
condiciones de operación, y solo entonces programa las inspecciones de vigilancia y aprobación
del SMS.

### Qué significa para Skylog V2.0

El asistente de implantación deja de ser un diseño propio y pasa a ser **la reproducción de la
estructura oficial**:

- **4 fases**, con sus elementos exactos.
- Cada tarea con **responsable** y **recursos proyectados**.
- **Cronograma tipo Gantt** exportable — es lo que la organización presenta a la Aerocivil.
- Horizonte de **12 a 24 meses**, con el avance medido contra el plan aprobado.

> El entregable del módulo no es una barra de progreso interna: es **el plan de implementación
> que se radica ante la autoridad**, y luego el seguimiento contra ese plan. §7.11.2 de
> [`16`](16-asuntos-complementarios.md) confirma que las organizaciones en certificación reciben
> *"vigilancia al plan de implementación"*.

---

## 2 · Reactivo, proactivo y predictivo — y por qué importa para la captura automática

Las fases 2 y 3 separan deliberadamente **procesos reactivos** de **proactivos y predictivos**.
Es la misma distinción que el Anexo 19 exige combinar: *"una combinación de métodos reactivos,
proactivos y predictivos de recolección de datos"* (citado en la Directiva 02-24).

| Tipo | Qué es | Fuente en Skylog V2.0 |
|---|---|---|
| **Reactivo** | Aprender de lo que **ya ocurrió** | Reportes MOR/VOR · eventos del C2 · alertas del log DJI · fallas registradas |
| **Proactivo** | Buscar activamente peligros **antes** del evento | Ítems de checklist marcados "No" de forma recurrente · mantenimientos por vencer · exámenes próximos a caducar · tiempos de servicio cerca del límite |
| **Predictivo** | Analizar **tendencias** para anticipar | Tendencia de los SPI · concentración de eventos por aeronave o piloto · degradación progresiva del enlace C2 · deterioro de baterías |

**Esto ordena el diseño de la captura automática** de `219.110(f)`. No basta con capturar
eventos ocurridos —eso es solo la Fase 2—; el sistema debe alimentar también las Fases 3 y 4.

> Y explica por qué la fase 3 es la que más cuesta a un explotador pequeño: exige **buscar**
> peligros sin que haya pasado nada. **Un sistema que ya tiene los datos puede hacer esa
> búsqueda solo.** Es el punto donde el software aporta más valor real.

---

## 3 · Cultura Justa (§7.3.3) — la definición operativa

> *"Culturizar al personal significa garantizar las **condiciones de confianza** necesarias para
> que **se elimine el temor de notificar** cualquier problema de seguridad operacional y
> **precisar los comportamientos a ser reconocidos o a ser sancionados**."*

Y el límite, explícito:

> *"fomentar la costumbre del reporte voluntario de peligros y de errores… **a tratar sin
> medidas punitivas y de forma confidencial**, pero **sin tolerar las negligencias, las
> conductas ilegales intencionadas, ni los actos destructivos**."*

### Decisión de alcance (2026-08-22): la Cultura Justa no la maneja el sistema

> *"YA ESTÁ AGREGADO EN LOS MANUALES DE ELLOS, NO LO MANEJAMOS NOSOTROS."*

**No se construye módulo de Cultura Justa**: ni la declaración de comportamientos reconocidos y
sancionados, ni la política, ni su ciclo de revisión. Vive en el manual del cliente (regla
**C3** de [`01-reglas.md`](01-reglas.md)) y esta sección queda solo como referencia normativa.

**Lo que sí permanece, por venir de otra obligación distinta:**

| Requisito | Por qué se queda |
|---|---|
| **Confidencialidad del notificador** | No es Cultura Justa: es protección de datos de seguridad operacional, `RAC 219 §219.115`–`219.140`, ya recogida como regla **S4**. Es exigible aunque la política de Cultura Justa viva íntegra en el manual del cliente |
| **Retroalimentación al reportante** | Es un descriptor de madurez del ítem 1.1.1 de [`15-evaluacion-sms.md`](15-evaluacion-sms.md): sin él, el sistema de notificación no pasa de *Adecuado* a *Operativo* |

En el modelo de datos eso significa **nivel de confidencialidad por reporte** y control de quién
ve la identidad del notificante — hoy los formularios VOR/MOR públicos no lo modelan. Los demás
requisitos de esta sección quedan documentados, no construidos.

---

## 4 · Compromiso de la dirección (Fase 1.i) — qué debe contener

> *"una **declaración escrita, firmada y publicada** que define las políticas bajo las que opera
> el SMS, la importancia de la gestión respecto a la toma de decisiones **con enfoque en la
> Cultura Justa**, de la importancia de la notificación y de la confidencialidad."*

Y los objetivos:

- Producto de la **identificación de los riesgos más importantes** de la organización.
- *"no necesariamente son exclusivos de la operación de las UA, sino que pueden ser
  **transversales** con otros procesos: logística, recursos humanos, mantenimiento…"*
- *"Las políticas y los objetivos **se alinean, tienen metas e indicadores claros**… y un plan
  de acción de cómo se alcanzarán."*

**Buena práctica recomendada por la propia circular**: una matriz **Balanced Scorecard (BSC)**
que relacione políticas ↔ objetivos ↔ indicadores ↔ metas ↔ seguimiento. Metodología **SMART**.

> Cierra el circuito con los SPI: los indicadores **no son una lista suelta**, son la medición
> de los objetivos declarados en la política. Hoy en BitaFly el catálogo de indicadores no está
> vinculado a ningún objetivo — son tablas independientes.

Y la frase que resume el criterio de evaluación:

> *"Se evidencia que la dirección está comprometida **en la medida en que se cumple lo que se
> promete**."*

Es exactamente el criterio "E = Efectivo" de la escala de aceptación.

---

## 5 · Gerente Responsable — nota terminológica

La circular usa **"Gerente Responsable"**; el RAC 219 y la directiva MAUT-1.0-22-007 usan
**"Ejecutivo Responsable"**. Es la misma figura.

> *"corresponde al **representante legal** del explotador UAS o quien ha sido delegado para
> firmar el compromiso de la dirección y que **responde frente a la Aerocivil**."*

Coincide con `100.545` del RAC 100, que permite al representante legal desempeñar cargos
operativos si cumple los requisitos. **En Skylog el rol debe admitir ambos nombres** — la
organización usa el que tenga en sus manuales.

### Dedicación del Gerente de Seguridad Operacional

> *"**Dependiendo de la dimensión** del explotador UAS y la complejidad de sus productos o
> servicios… las responsabilidades pueden asignarse a una persona que desempeñe la función como
> su **única función o en combinación con otras**, siempre que esto **no ocasione conflicto**."*

Tercera regla escalable por tamaño, consistente con el Comité/GESO (§1 de
[`16`](16-asuntos-complementarios.md)) y con `100.545(a)` (hasta 2 UAS, una sola persona para
JP y GSMS).

> **Patrón confirmado**: la normativa es **escalable por diseño**. Skylog V2.0 debe tener un
> **perfil de organización** (número de UAS, tipo de operación, complejidad) que module qué se
> exige. Aplicar el mismo checklist a un piloto independiente y a una escuela grande sería
> incorrecto según la propia norma.

---

## 6 · Mejora continua (§7.3.4) — el criterio de éxito

> *"una implementación es exitosa cuando **está integrada en la actividad diaria** (y lo ha sido
> durante un tiempo), **funciona de manera consistente** y **es realmente efectiva**, es decir,
> que las acciones realizadas **han funcionado**."*

Es la escala P·S·O·E dicha en otras palabras: integrado (S) → consistente (O) → efectivo (E).

Métodos recomendados para medir: *"revisiones o auditorías o encuestas, **estadísticas del
número de reportes**…"*

> ⚠️ Ojo con la contradicción aparente: aquí se sugieren las estadísticas de reportes como
> medida de la salud del SMS, mientras la circular de SPI **prohíbe** usar *"cantidad de
> reportes recibidos o gestionados"* como indicador de seguridad operacional
> ([`13`](13-herramientas-spi.md) §5). **No se contradicen**: son buen indicador de la *cultura
> de reporte*, pero no son un SPI. Deben vivir en tableros distintos.

---

## 7 · Resumen de aportes

| # | Aporte | Estado en BitaFly |
|---|---|---|
| 1 | **Las 4 fases oficiales** de implementación | ❌ El asistente propuesto inventaba la secuencia |
| 2 | Plan **tipo Gantt** con responsables y recursos, aprobado por la Aerocivil | ❌ No existe |
| 3 | Horizonte de **12–24 meses** | ❌ No existe |
| 4 | Distinción **reactivo / proactivo / predictivo** | ❌ No modelada |
| 5 | **Cultura Justa** con comportamientos reconocidos y sancionados declarados | ❌ No existe |
| 6 | Confidencialidad del notificador | ❌ No modelada |
| 7 | **BSC**: políticas ↔ objetivos ↔ indicadores ↔ metas | ❌ Indicadores sin objetivo asociado |
| 8 | **Perfil de organización** que module la exigencia | ❌ Checklist único para todos |
| 9 | Estadísticas de reporte como medida de cultura, **separadas de los SPI** | ❌ No existe |

---

## 8 · Pendientes

| # | Pendiente |
|---|---|
| P-017-1 | Transcribir el detalle de las Fases 2, 3 y 4 (≈50.000 caracteres) al diseñar el asistente → `40-sms.md` |
| P-017-2 | Verificar las referencias cruzadas de la circular contra el RAC 100 y el RAC 219 vigentes (cita `100.520`, hoy `100.545`) |
| P-017-3 | Definir el **perfil de organización** que modula la exigencia (§5) → `30-entidades.md` |

---

> ### Verificado contra el texto completo (2026-08-22)
>
> El análisis inicial se hizo sobre una extracción parcial. Con la circular completa disponible
> (45 páginas), se confirmó: las **cuatro fases** están en §7.3.5 tal como se documentaron, el
> plan **tipo Gantt** que se presenta a la Aerocivil está en §7.3.5 y §7.3.5.1, y existe además
> un **§7.3.5.5 "Elementos transversales a todas las fases"** (formación, disponibilidad del
> personal, y actas/formatos/registros por fase) que no estaba en la extracción previa.
>
> El **Apéndice 1** trae las **100 preguntas** del análisis GAP — las mismas que la plataforma
> actual ya tiene cargadas— y dice literalmente que *"puede utilizarse como modelo… y **puede
> ser personalizado por el explotador UAS**"*. Es el respaldo normativo directo de la regla
> **C1**: la norma se precarga, no se impone.

*Analizado 2026-08-22. Leído completo el §7.3; §7.1, §7.2 y anexos no transcritos.*
