# MAUT-5.0-12-055 — Análisis de riesgos para la operación aérea UA

> Fuente primaria: libro Excel `MAUT-5.0-12-055`, versión 01, aprobado 07/11/2023.
> Secretaría de Autoridad Aeronáutica · Dirección de Autoridad a los Servicios Aéreos ·
> **Grupo Drones y Movilidad Urbana Aérea**.
> Índice: [`00-INDICE.md`](00-INDICE.md) · Reglas: [`01-reglas.md`](01-reglas.md)

**Advertencia sobre el nombre del archivo.** El documento llegó rotulado como
*"Lista_Verificacion_MO"*. No lo es. Su título interno es
**`100 - ANÁLISIS DE RIESGOS PARA LA OPERACIÓN AÉREA UA`** y su función es completamente
distinta: es el formato que el explotador diligencia **cada vez que solicita una autorización de
vuelo**. La lista de verificación del MO es `MAUT-5.0-12-095` →
[`14-listas-verificacion.md`](14-listas-verificacion.md).

---

## 1 · Qué es y cuándo aplica

> *"El presente formato aplica para todas las partes interesadas en la operación de sistemas de
> aeronaves no tripuladas UAS de que trata la norma RAC 100; **cada vez que requieran solicitar
> una autorización de vuelo**."*

No es un ejercicio anual de SMS ni un checklist de despacho: es un **anexo de la solicitud de
autorización**, con alcance de campaña (fecha de inicio, fecha de fin, número total de vuelos) y
**firmado por el Jefe de Pilotos UAS o quien haga sus veces**.

Fuentes declaradas: **Doc 9859 OACI** y **RAC 100**.

### Encabezado del formato

| Campo | Nota |
|---|---|
| Nombre del solicitante | Persona natural o jurídica responsable de la ejecución |
| Lugar de la operación UA | Municipio, ciudad, departamento y/o dirección del **polígono de vuelo** |
| Condiciones de la operación UA | Contacto visual, tipo de vuelo especial, meteorología esperada |
| Tipo de operación aérea UA | Según *"tipos de operación UA"* del RAC 100 |
| Fecha en que se realiza el análisis | Con advertencia expresa de que las condiciones pueden cambiar entre análisis y vuelo |
| Fecha de inicio / fin de la operación | *"la póliza RCE debe estar vigente durante todo el periodo solicitado"* |
| Número total de vuelos | Total requerido para cumplir el objetivo de la autorización |

> La advertencia sobre el desfase entre la fecha del análisis y la del vuelo es una invitación
> directa a que el sistema **revalide** las condiciones computables el día de la operación en vez
> de dejar el análisis congelado.

---

## 2 · Las cuatro etapas del formato

| Etapa | Columnas |
|---|---|
| **1. Identificación de peligros** | Tipo de peligro · Ítem · Pregunta · Respuesta `Sí`/`No` |
| **2. Evaluación del riesgo** | ¿Por qué se presenta esa condición? (Causa) · ¿A qué riesgo está expuesta? (Consecuencia) · Probabilidad · Severidad · Índice · Tolerabilidad |
| **3. Mitigación del riesgo** | Estrategia de mitigación · Descripción de las estrategias |
| **4. Control del riesgo** | Probabilidad · Severidad · Índice · Tolerabilidad **residuales** · Acción por riesgo residual |

Reglas de diligenciamiento en el propio formato:

- Las etapas 2–4 se llenan **solo para las preguntas respondidas `Sí`**.
- *"Si el nivel de riesgo es diferente a **Aceptable**, justifique las defensas implementadas."*
- *"Si el nivel de riesgo residual es diferente a **Aceptable**, justifique las acciones
  adicionales para aumentar sus defensas."*
- *"Este formato tiene celdas formuladas… se recomienda no modificar las celdas con fórmulas o
  listas de selección."*

> **Nota de contraste con lo implementado hoy.** El paso de Evaluación de Riesgos del despacho
> actual solo exige mitigar cuando la zona es la peor de las tres, y trata la intermedia como
> aceptable sin justificación. El formato oficial es más exigente: **todo lo que no sea
> `Aceptable` — incluido `Tolerable` — exige justificar defensas por escrito**, y otra vez si el
> residual sigue sin ser `Aceptable`.

---

## 3 · Los 24 peligros del catálogo fijo

### (i) Personal operativo
1. ¿La operación será realizada por menos de dos personas?

### (ii) Personal ajeno
2. ¿Vuela sobre personas que no hacen parte de la operación?
3. ¿Habrá presencia de público espectador de la operación aérea UAS?
4. ¿El vuelo captura información que vulnere la intimidad o privacidad de alguna persona?

### (iii) Tierra
5. ¿Va a sobrevolar propiedades, edificaciones o infraestructura?
6. ¿Le falta identificar alguno de los obstáculos en la trayectoria del vuelo BVLOS o autónomo?
7. ¿La UA es cautiva?
8. ¿El vuelo se realizará en un espacio cerrado, confinado o bajo techo?
9. ¿El punto de despegue o aterrizaje se ubica sobre un vehículo, embarcación o aeronave en movimiento?
10. ¿Desde la posición del piloto u observador se está expuesto a perder el contacto visual del UA en un radio de 750 m horizontalmente?

### (iv) Aire
11. ¿Realizará su vuelo posterior a que se oculta el sol?
12. ¿Es necesario que el UA exceda alguna de las limitantes establecidas por el fabricante?
13. ¿La operación incluye transporte de carga que pueda afectar la dinámica del vuelo?
14. ¿La operación es autónoma y supera los 750 m horizontales desde el punto de despegue?
15. ¿Ha identificado la operación de otros UAS en mi zona de vuelo?
16. **¿Han pasado más de 60 días después del último mantenimiento su UAS?**
17. ¿Ha identificado condiciones en la operación en las que se pueda perder o intervenir el **enlace C2**?
18. ¿El vuelo es de tipo FPV?
19. ¿Desconoce las condiciones meteorológicas del sitio y durante las fechas de operación?

### (v) Estratégico
20. ¿Vuela en espacio aéreo controlado por ATC?
21. ¿La altura de vuelo será mayor a 400 metros AGL?
22. ¿En las cartas aéreas identificó rutas aéreas que crucen sobre su zona de vuelo UA?
23. ¿El vuelo se realizará a menos de 5 km del **ARP** de un aeródromo?
24. ¿El vuelo se realizará a menos de 2 km del **ARH** de un helipuerto?

Debajo, filas libres numeradas para *"otros peligros propios de la operación"*, con las mismas
columnas de evaluación, mitigación y control.

> **Punto a verificar (P-AR-3)**: la pregunta 21 usa **400 metros AGL** como umbral. Conviene
> contrastarlo contra el límite de altura del RAC 100 antes de codificarlo — se transcribe aquí
> tal como aparece en el formato oficial, sin corregirlo.

### Catálogo de tipos de peligro: son siete, no cinco

La hoja `Data` define **siete** tipos, pero las preguntas fijas solo cubren los cinco primeros:

| | Tipo | ¿Tiene preguntas fijas? |
|---|---|---|
| (i) | Peligros al personal operativo | Sí (1) |
| (ii) | Peligros al personal ajeno a la operación | Sí (2–4) |
| (iii) | Peligros en tierra (obstáculos naturales y artificiales) | Sí (5–10) |
| (iv) | Peligros en el aire (por fallas en la operación) | Sí (11–19) |
| (v) | Peligros estratégicos (interacción con aeronaves tripuladas) | Sí (20–24) |
| **(vi)** | **Peligros por cambios de la normatividad vigente aplicable** | **No** |
| **(vii)** | **Peligros por gestión del cambio** | **No** |

Los tipos (vi) y (vii) existen en la taxonomía pero **no tienen ninguna pregunta prellenada**:
solo pueden aparecer en las filas de "otros peligros". Enlaza con la gestión del cambio del
RAC 219 — un cambio normativo o interno es un peligro clasificable en la misma taxonomía.

---

## 4 · La matriz oficial de riesgo

**No es configurable.** A diferencia de la matriz interna del SMS de la organización, esta viene
fija en el formato que recibe la autoridad.

### Probabilidad

| | Nivel | Criterio |
|---|---|---|
| 5 | Frecuente | Es probable que suceda muchas veces (ha ocurrido frecuentemente) |
| 4 | Ocasional | Es probable que ocurra algunas veces (ha ocurrido con muy poca frecuencia) |
| 3 | Remoto | Es poco probable que ocurra, pero no imposible (rara vez ha ocurrido) |
| 2 | Improbable | Es muy poco probable que ocurra (no se sabe que haya ocurrido) |
| 1 | Sumamente improbable | Es casi inconcebible que el suceso ocurra |

### Severidad

| | Nivel | Criterio |
|---|---|---|
| A | Catastrófico | Aeronave o equipo destruidos · varias muertes |
| B | Peligroso | Gran reducción de márgenes de seguridad · lesiones graves · daños importantes al equipo |
| C | Grave | Reducción importante de márgenes · **incidente grave** · lesiones a personas |
| D | Leve | Molestias · limitaciones operacionales · uso de procedimientos de emergencia · incidente leve |
| E | Insignificante | Pocas consecuencias |

### Tolerabilidad — las 25 combinaciones

| Zona | Índices |
|---|---|
| **INTOLERABLE** | `5A` `5B` `5C` `4A` `4B` `3A` |
| **TOLERABLE** | `5D` `5E` `4C` `4D` `4E` `3B` `3C` `3D` `2A` `2B` `2C` `1A` |
| **ACEPTABLE** | `3E` `2D` `2E` `1B` `1C` `1D` `1E` |

Cubre las 25 celdas sin solapamiento (6 + 12 + 7). Vale notar la asimetría: `1A` —
*sumamente improbable* pero *catastrófico* — es **Tolerable**, no Aceptable. La severidad pesa
más que la probabilidad en el extremo alto.

### Medida recomendada por zona

| Zona | Medida |
|---|---|
| INTOLERABLE | *"Tomar medidas inmediatas para mitigar el riesgo o **suspender la actividad**"*; mitigación prioritaria hasta llevarlo al rango tolerable |
| TOLERABLE | *"Puede tolerarse sobre la base de la mitigación… **Puede necesitar una decisión de gestión** para aceptar el riesgo"* |
| ACEPTABLE | *"Aceptable tal cual. No se necesita una mitigación de riesgos posterior"* |

### Estrategias de mitigación — lista cerrada de tres

| Estrategia | Definición del instructivo |
|---|---|
| **Evitar** | Se cancela la operación porque los riesgos superan los beneficios; elimina el riesgo por completo |
| **Reducir** | Se reduce la frecuencia de la operación o se adoptan medidas para reducir la magnitud de las consecuencias |
| **Segregar** | Se aíslan los efectos de las consecuencias o se introducen **capas redundantes** de protección |

---

## 5 · Consecuencias de diseño

| # | Consecuencia |
|---|---|
| R1 | **Dos matrices coexisten y no deben mezclarse.** La del SMS de la organización es personalizable (RAC 219 / Doc 9859); la de este formato es **fija por la autoridad**. Un solo modelo configurable que alimente ambas corrompe el formato oficial. Son dos entidades. |
| R2 | El vocabulario oficial es `INTOLERABLE / TOLERABLE / ACEPTABLE`. La implementación actual usa *"inaceptable"* para la zona alta — palabra distinta a la del formato que se radica. |
| R3 | El análisis se ancla a la **solicitud de autorización** (rango de fechas + número de vuelos + polígono), no al vuelo individual ni al despacho. Es una entidad propia con su propio ciclo de vida y su firma. |
| R4 | **`Tolerable` exige justificación escrita de defensas.** Solo `Aceptable` pasa sin más. Más estricto que lo implementado hoy. |
| R5 | La firma es del **Jefe de Pilotos UAS o quien haga sus veces**, con tipo y número de documento y celular. Es un rol con responsabilidad nominal y trazable, no un campo de texto. |
| R6 | Las estrategias de mitigación son una **lista cerrada de tres**, no texto libre. El texto libre es la *descripción*, no la estrategia. |
| R7 | El instructivo advierte que las condiciones pueden cambiar entre el análisis y el vuelo → **revalidación** de las respuestas computables antes de operar. |

### Preguntas que el sistema puede responder solo

De las 24, **al menos diez son computables** con datos que la plataforma ya tiene o puede tener.
Esto es el trabajo real que el software le ahorra al cliente:

| # | Pregunta | Fuente del dato |
|---|---|---|
| 10 | Contacto visual en radio de 750 m | Geometría del polígono vs. posición del piloto/observador |
| 11 | Vuelo posterior al ocaso | Hora de despegue programada vs. ocaso en las coordenadas |
| 14 | Autónoma y > 750 m horizontales | Geometría del plan de vuelo |
| **16** | **> 60 días desde el último mantenimiento** | Registro de mantenimiento de la aeronave — dato que ya existe |
| 19 | Desconoce las condiciones meteorológicas | Módulo de clima sobre el polígono y el rango de fechas |
| 20 | Espacio aéreo controlado por ATC | Capa geoespacial |
| 21 | Altura > 400 m AGL | Altitud planificada |
| 22 | Rutas aéreas cruzando la zona | Cartas aéreas |
| 23 | < 5 km del ARP de un aeródromo | Distancia a aeródromos |
| 24 | < 2 km del ARH de un helipuerto | Distancia a helipuertos |

Las restantes catorce dependen de juicio del piloto o de contexto que solo él conoce (público
espectador, carga, intimidad, espacio confinado) y deben pedirse, no adivinarse.

> El ítem 16 es el caso más claro: hoy el sistema ya sabe cuándo fue el último mantenimiento de
> cada aeronave. Que el cliente tenga que responder a mano una pregunta cuya respuesta está en la
> base de datos, en un formato que se radica ante la autoridad, es exactamente el tipo de trabajo
> repetido que motivó reconstruir la plataforma.

---

## 6 · Pendientes

| # | Pendiente |
|---|---|
| P-AR-1 | Confirmar si existe una versión posterior a la v01 del 07/11/2023 |
| P-AR-2 | Verificar cómo se radica: ¿adjunto a la solicitud de autorización, o dentro de otro formato? |
| P-AR-3 | Contrastar el umbral de **400 m AGL** de la pregunta 21 contra el límite de altura del RAC 100 |
| P-AR-4 | Confirmar si el catálogo de 24 preguntas cambia por tipo de operación |

---

*Analizado 2026-08-22 contra el libro Excel oficial MAUT-5.0-12-055 v01 (hojas Formato,
Instructivo y Data).*
