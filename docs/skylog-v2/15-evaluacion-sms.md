# MAUT-3.0-12-097 — Herramienta de evaluación del SMS

> Fuente primaria: libro `219 - MAUT-3.0-12-097 - FO - Herramienta de Evaluación de SMS
> (PEL-OPS-AIR-ANS-AGA)`, versión 01, aprobada **12/08/2024**; ejemplar del **17/07/2026**.
> Índice: [`00-INDICE.md`](00-INDICE.md) · Reglas: [`01-reglas.md`](01-reglas.md)

Es **el instrumento con el que la Aerocivil califica un SMS**. La directiva de aceptación
([`12-directivas-maut.md`](12-directivas-maut.md)) explica la escala P/S/O/E; este libro trae los
**47 indicadores concretos**, su peso, la orientación de qué buscar y los descriptores de cada
nivel de madurez.

Es la pieza que convierte una autoevaluación binaria de "sí/no" en algo que **predice el
resultado de la inspección**. Todo lo que el módulo de Mejora Continua debería medir está aquí.

---

## 1 · Cómo está construido el libro

Trece hojas. Las que importan:

| Hoja | Función |
|---|---|
| `Inicio` | Carátula: proveedor, NIT, código CDO/CDF, fecha de la última revisión del SMS, inspector(es), dependencia AAC, alcance y fecha de la evaluación |
| `SMS Evaluation tool (2)` | **La matriz**: 47 ítems con peso, orientación y descriptores P/S/O/E, en español |
| `SMS Evaliation tool` | La misma matriz con la disposición original de OACI (cuatro columnas numéricas P·S·O·E) |
| `Listas` / `guias` | Catálogos: puntos por nivel y valores del desplegable |
| `Comparación de Componentes` · `por Elemento` · `de Totalidades` · `GRAFICO DE COMPARACION` | Tablas dinámicas que consolidan el resultado |

### Columnas de la matriz

`Item` · `Componente` · `Elemento` · `Sec` · **`Reglamentos Aeronáuticos de Colombia y
Directiva(s)`** · **`Indicadores de cumplimiento y rendimiento`** · `Eficacia` · **`Peso`** ·
`Resultado` · `%` · `¿Cómo se logra?` · `Comentarios` · **`Que buscar`** ·
`Presente (P)` · `Adecuado (S)` · `Operativo (O)` · `Eficaz (E)`

Las cuatro últimas **no son casillas de respuesta**: contienen el **descriptor de qué significa
alcanzar ese nivel** para ese indicador concreto. Es la definición operativa de la madurez, ítem
por ítem.

---

## 2 · El sistema de puntuación, verificado

Hoja `Listas` — puntos por nivel:

| Nivel | Puntos |
|---|---|
| Presente (P) | 1 |
| Adecuado / Suitable (S) | 2 |
| Operativo (O) | 3 |
| Eficaz (E) | 4 |
| No iniciado | 0 |

**Fórmula reconstruida y comprobada** sobre cuatro filas del ejemplar:

```
Resultado(ítem) = Peso × (P + S + O + E)
```

donde cada casilla vale los puntos de su nivel si está satisfecho, y `0` si no.

| Ítem | P | S | O | E | Peso | Resultado esperado | Resultado en el archivo |
|---|---|---|---|---|---|---|---|
| 1 | 0 | 2 | 3 | — | 2 | (0+2+3)×2 = **10** | 10 ✓ |
| 12 | 0 | — | — | — | 2 | 0×2 = **0** | 0 ✓ |
| 13 | 1 | 2 | 3 | — | 2 | (1+2+3)×2 = **12** | 12 ✓ |
| 14 | 1 | 2 | 3 | — | 1.5 | 6×1.5 = **9** | 9 ✓ |

Máximo por ítem = `10 × Peso`. Suma de pesos = **61,5** → **máximo total = 615 puntos**.

> **Observación**: el ítem 1 del ejemplar tiene `P = 0` con `S = 2` y `O = 3` — es decir, los
> niveles se marcan de forma **independiente**, no acumulativa, al menos en la mecánica de la
> hoja. Que en la práctica no se pueda ser "Operativo" sin ser "Presente" es una regla normativa
> ([`12-directivas-maut.md`](12-directivas-maut.md)), no una restricción del archivo.

### Dos formas de calificar conviviendo

La hoja en español usa una **sola columna `Eficacia`** con desplegable
`P · S · O · E · NO INICIADO`; la hoja de disposición OACI usa **cuatro columnas numéricas**.
Producen resultados distintos: el desplegable solo permite un nivel; las cuatro columnas permiten
combinaciones como la del ítem 1. Al implementarlo hay que elegir una y declararla, no arrastrar
la ambigüedad del libro.

### Lo que no se pudo confirmar

Las tablas dinámicas del ejemplar traen datos de demostración que **no cuadran** con el contenido
actual de la matriz: la `Cuenta de Eficacia` reporta 5 ítems en `P` y 42 en `S` (47 en total),
pero el `GRAFICO DE COMPARACION` muestra porcentajes con `O` y `E` distintos de cero, y
`Comparación de Totalidades` suma 291,25 puntos, que no se reconstruye con esos mismos 47 ítems y
sus pesos. Son pivotes sin refrescar sobre un estado anterior. **El denominador exacto del
`% Implementación` queda como pendiente P-EV-1** — no se infiere aquí para no inventar una
fórmula.

---

## 3 · Los cinco componentes y su peso real

| # | Componente | Ítems | Peso acumulado |
|---|---|---|---|
| 1 | Gestión de riesgos de la seguridad operacional (C2) | 11 | 19,5 |
| 2 | Aseguramiento de la seguridad operacional (C3) | 10 | 15,5 |
| 3 | Políticas y objetivos de la seguridad operacional (C1) | 19 | 17,5 |
| 4 | Promoción de la seguridad operacional (C4) | 6 | 7,0 |
| 5 | **Gestión de la interfaz** (MAUT-1.0-22-007 §7.8) | 1 | 2,0 |
|  | **Total** | **47** | **61,5** |

Dos cosas que no son obvias:

- **El componente con más ítems no es el que más pesa.** Políticas y objetivos tiene 19 ítems
  (40 % del total) y suma 17,5 de peso — **0,92 por ítem**. Gestión de riesgos tiene 11 ítems y
  pesa 19,5 — **1,77 por ítem**, casi el doble. La evaluación está deliberadamente inclinada
  hacia **lo que el SMS hace**, no hacia lo que declara.
- **Existe un quinto componente que no es de OACI.** *Gestión de la interfaz* viene de la
  directiva vinculante MAUT-1.0-22-007 §7.8 y pesa **2,0** — el peso máximo de la escala, igual
  que el sistema de notificación confidencial. Ver
  [`16-asuntos-complementarios.md`](16-asuntos-complementarios.md).

### Doce elementos

`E1.1` Compromiso de gestión (9 ítems) · `E1.2` Obligaciones de rendición de cuentas (3) ·
`E1.3` Nombramiento de personal clave (3) · `E1.4` Respuesta ante emergencias (2) ·
`E1.5` Documentación del SMS (2) · `E2.1` Identificación de peligros (7) ·
`E2.2` Evaluación y mitigación de riesgos (4) · `E3.1` Observación y medición del rendimiento (7) ·
`E3.2` Gestión del cambio (2) · `E3.3` Mejora continua del SMS (1) ·
`E4.1` Instrucción y educación (5) · `E4.2` Comunicación (1) · más `Gestión de la interfaz` (1).

Los tres elementos de mayor peso son **E2.1 Identificación de peligros (12,5)**, **E3.1 Observación y medición del rendimiento (12,0)** y **E2.2 Evaluación y mitigación de riesgos (7,0)**. Juntos son el **51 %** del puntaje posible, y los tres dependen de datos operacionales, no de documentos.

---

## 4 · Los 47 indicadores de cumplimiento y rendimiento

Peso entre paréntesis. Texto abreviado; el literal completo está en el libro.

### C2 · Gestión de riesgos — E2.1 Identificación de peligros
| Sec | Peso | Indicador |
|---|---|---|
| 1.1.1 | 2 | Existe un sistema de notificación **confidencial** que captura errores, peligros y cuasicolisiones, fácil de usar y accesible a todo el personal |
| 1.1.2 | 1,5 | El sistema brinda **retroalimentación** a quien notifica sobre las medidas adoptadas (o no adoptadas) y, cuando corresponda, al resto de la organización |
| 1.1.3 | 1 | El personal **expresa confianza** en la política y los procesos de notificación |
| 1.1.4 | 2 | Existe un proceso que define cómo se identifican peligros de múltiples fuentes con métodos **reactivos y proactivos**, internos y externos |
| 1.1.5 | 2 | El proceso identifica los peligros relacionados con la **actuación humana** |
| 1.1.6 | 2 | Existe un proceso para **analizar datos e información** buscando tendencias e información de gestión utilizable |
| 1.1.7 | 2 | Las investigaciones las realiza personal capacitado para identificar **causas de fondo** (no solo qué pasó, sino por qué) |

### C2 · E2.2 Evaluación y mitigación de riesgos
| Sec | Peso | Indicador |
|---|---|---|
| 1.2.1 | 2 | Proceso de gestión de riesgos con análisis y evaluación en términos de probabilidad y gravedad |
| 1.2.2 | 1,5 | Hay **criterios de riesgo aceptable** y las clasificaciones están debidamente justificadas |
| 1.2.3 | 2 | Proceso para tomar decisiones y aplicar controles de riesgo adecuados y eficaces |
| 1.2.4 | 1,5 | La **alta gerencia tiene visibilidad** de los peligros de riesgo alto o medio y de su mitigación |

### C3 · Aseguramiento — E3.1 Observación y medición del rendimiento
| Sec | Peso | Indicador |
|---|---|---|
| 2.1.1 | 2 | Los **SPI relacionados con los objetivos** están definidos, promulgados, observados y analizados para buscar tendencias |
| 2.1.2 | 2 | Los controles y mitigaciones se **verifican/auditan** para confirmar que funcionan |
| 2.1.3 | 1,5 | El aseguramiento cubre las actividades de las **organizaciones contratadas** |
| 2.1.4 | 1,5 | Responsabilidades definidas para el cumplimiento normativo, con requisitos identificados en manuales y procedimientos |
| 2.1.5 | 1,5 | Programa de **auditoría interna** con calendario, procedimientos, notificación, seguimiento y registros |
| 2.1.6 | 1,5 | Responsable de auditoría interna con **acceso directo al ejecutivo responsable** |
| 2.1.7 | 2 | Tras una auditoría se analizan **factores causales** y se toman medidas correctivas/preventivas |

### C3 · E3.2 Gestión del cambio · E3.3 Mejora continua
| Sec | Peso | Indicador |
|---|---|---|
| 2.2.1 | 1,5 | Proceso para identificar si los cambios impactan la seguridad y gestionar los riesgos que surjan |
| 2.2.2 | 1 | Los **factores humanos** se consideran en la gestión del cambio, con normas de diseño centradas en el ser humano |
| 2.3.1 | 1 | La organización **supervisa y evalúa continuamente** sus propios procesos de SMS |

### C1 · Políticas y objetivos — E1.1 Compromiso de gestión
| Sec | Peso | Indicador |
|---|---|---|
| 3.1.1 | 0,5 | Política de seguridad **firmada por el Gerente Responsable**, con compromiso de mejora continua |
| 3.1.2 | 0,5 | La política incluye declaración de **provisión de recursos adecuados** |
| 3.1.3 | 1 | Políticas de **aptitud para el trabajo** (alcohol y drogas, fatiga) |
| 3.1.4 | 0,5 | Existe un medio para **comunicar** la política |
| 3.1.5 | 1 | El ejecutivo responsable y la alta gerencia promueven la cultura de seguridad con **participación activa y visible** |
| 3.1.6 | 1 | La política **fomenta activamente** las notificaciones |
| 3.1.7 | 1 | Política de **cultura justa** que identifica comportamientos **aceptables e inaceptables** |
| 3.1.8 | 1 | **Objetivos** coherentes con la política, comunicados a toda la organización |
| 3.1.9 | 1 | El **SSP** (programa estatal) está siendo considerado y abordado |

### C1 · E1.2 Rendición de cuentas · E1.3 Personal clave
| Sec | Peso | Indicador |
|---|---|---|
| 3.2.1 | 1 | **Ejecutivo responsable nombrado**, con plena responsabilidad sobre el SMS |
| 3.2.2 | 1 | El ejecutivo responsable **es consciente** de sus funciones respecto al SMS |
| 3.2.3 | 0,5 | Rendición de cuentas, autoridades y responsabilidades **documentadas** y comprendidas por el personal |
| 3.3.1 | 1 | **Gerente de seguridad operacional competente**, que depende directamente del ejecutivo responsable |
| 3.3.2 | 2 | **Recursos suficientes** asignados: personal competente para investigación, análisis, auditoría y promoción |
| 3.3.3 | 1,5 | **Comité(s) de seguridad operacional** que debaten y resuelven riesgos, con el ejecutivo responsable y los jefes funcionales |

### C1 · E1.4 Emergencias · E1.5 Documentación
| Sec | Peso | Indicador |
|---|---|---|
| 3.4.1 | 1 | **ERP** desarrollado y distribuido, con procedimientos, roles, responsabilidades y acciones |
| 3.4.2 | 0,5 | La idoneidad del ERP se **comprueba periódicamente** y los resultados se examinan |
| 3.5.1 | 1 | Documentación del SMS **disponible para todo el personal pertinente** |
| 3.5.2 | 0,5 | Documentación y registros revisados y actualizados con **control de versiones** |

### C4 · Promoción — E4.1 Instrucción · E4.2 Comunicación
| Sec | Peso | Indicador |
|---|---|---|
| 4.1.1 | 2 | Programa de instrucción SMS **inicial y recurrente**, que cubre tareas individuales y cómo funciona el SMS |
| 4.1.2 | 1,5 | Proceso para **medir la eficacia de la instrucción** y mejorar la siguiente |
| 4.1.3 | 1 | La instrucción incluye factores humanos y organizacionales, cultura justa y **habilidades no técnicas** |
| 4.1.4 | 1 | Proceso que **evalúa la competencia** del individuo y toma medidas correctivas |
| 4.1.5 | 1 | Se define y evalúa la **competencia de los instructores** |
| 4.2.1 | 0,5 | Proceso para determinar qué **información crítica** se comunica y cómo, incluido el personal contratado |

### C5 · Gestión de la interfaz
| Sec | Peso | Indicador |
|---|---|---|
| 5.1.1 | 2 | La organización ha **identificado y documentado las interfaces internas y externas** relevantes y su naturaleza crítica |

---

## 5 · Los descriptores P/S/O/E — y su cobertura real

Ejemplo del ítem 1.1.1 (sistema de notificación confidencial), tal como está en el libro:

| Nivel | Descriptores |
|---|---|
| **Presente** | Existe un sistema de notificación confidencial para sucesos obligatorios y voluntarios, con retroalimentación, **almacenado en una base de datos** · El proceso define cómo se actúa sobre las notificaciones y **aborda cronogramas** |
| **Adecuado** | El sistema es accesible y fácil de usar para todo el personal · Responsabilidades, cronogramas y **formato de retroalimentación** bien definidos · Protección y confidencialidad garantizadas |
| **Operativo** | El sistema **está siendo utilizado** por todo el personal · Se retroalimenta a quien notifica · Las notificaciones se evalúan, procesan, analizan y almacenan · El personal conoce y cumple sus responsabilidades · Las notificaciones **se procesan dentro de los cronogramas definidos** |
| **Eficaz** | Sistema **saludable** según volumen y calidad de notificaciones · Atención **a tiempo** · El personal expresa confianza · Se usa para **mejores decisiones de gestión** y mejora continua · **Terceros** (socios, proveedores, contratistas) pueden notificar |

El salto de *Adecuado* a *Operativo* es el salto de **"está definido"** a **"se está usando y se
cierra en plazo"**. Y *Eficaz* introduce medidas que solo existen si hay datos históricos:
volumen, calidad, tiempo de atención, tasa de cierre.

> Aquí está el argumento entero del módulo SMS de la plataforma. *Presente* y *Adecuado* se
> demuestran con documentos. **Operativo y Eficaz solo se demuestran con datos de uso**: quién
> notificó, cuándo se le respondió, cuánto tardó el cierre, cómo evolucionó el volumen. Un
> sistema que solo guarda el manual llega a *Adecuado* y se detiene ahí.

**Cobertura de los descriptores**: de los 47 ítems, **24 traen `Que buscar` y descriptores
P/S/O/E; los otros 23 los tienen vacíos** — verificado en las dos hojas del libro, que coinciden
exactamente en cuáles. Los 24 con descriptores son los del instrumento original de OACI; los 23
restantes son indicadores que la Aerocivil añadió sin publicar sus descriptores. En total el
libro trae **187 puntos de "qué buscar" y 190 descriptores de nivel** (31 P · 67 S · 44 O · 48 E).

Consecuencia práctica: para 23 de 47 ítems **no hay criterio publicado de qué constituye cada
nivel**. Una autoevaluación honesta debe decirlo, no rellenar el hueco con un criterio inventado.
Queda como pendiente P-EV-2 confirmar si existe una versión posterior que los complete.

---

## 6 · Contraste con lo implementado hoy

La autoevaluación GAP actual usa un catálogo propio de 100 preguntas con respuesta **Sí/No**.
Frente a este instrumento:

| Dimensión | Autoevaluación actual | MAUT-3.0-12-097 |
|---|---|---|
| Escala | Binaria Sí/No | Cinco niveles con puntos (0·1·2·3·4) |
| Peso | Todas las preguntas valen igual | **0,5 · 1 · 1,5 · 2** según el ítem |
| Referencia normativa | No se guarda por pregunta | Artículo del RAC 219 o directiva, por ítem |
| Evidencia | No se exige | `Que buscar` define qué debe encontrar el inspector |
| Resultado | % de "sí" | Puntaje ponderado sobre 615, más pivotes por componente y elemento |
| Predice la inspección | No | **Sí — es el mismo instrumento** |

El resultado ya documentado —99 de 102 preguntas en "Sí" con cero indicadores mensuales
cargados ([`21-auditoria-sms.md`](21-auditoria-sms.md))— se explica solo con esta tabla: con una
escala binaria, "existe el procedimiento" y "el procedimiento funciona y es eficaz" son la misma
respuesta. Con la escala de la autoridad, son un 1 y un 10.

### Qué habilita en el producto

| # | Consecuencia |
|---|---|
| E1 | La autoevaluación debe usar **el instrumento de la autoridad**, con sus 47 ítems, sus pesos y sus cinco niveles — no un catálogo paralelo. |
| E2 | Cada ítem se ancla a su **artículo del RAC 219**, lo que permite navegar de la norma a la evidencia y de vuelta. |
| E3 | Los descriptores de *Operativo* y *Eficaz* son, casi todos, **métricas que el sistema puede calcular solo** (uso real, tiempos de cierre, volumen, cobertura de instrucción). Ahí está el valor: la plataforma no solo guarda el SMS, **lo puntúa con datos**. |
| E4 | El puntaje debe reportarse **por componente y por elemento**, no solo como total — es como lo consolida el libro y como lo lee el inspector. |
| E5 | Los 23 ítems sin descriptor publicado se marcan como **juicio del inspector**, sin puntaje sugerido automático. |
| E6 | El quinto componente (**gestión de la interfaz**) pesa tanto como el sistema de notificación y hoy no existe en ninguna parte del producto. |

---

## 7 · Pendientes

| # | Pendiente |
|---|---|
| P-EV-1 | Confirmar el denominador del `% Implementación`; los pivotes del ejemplar traen datos de demostración sin refrescar |
| P-EV-2 | Confirmar si existe versión posterior a la v01 (12/08/2024) que complete los descriptores de los 23 ítems vacíos |
| P-EV-3 | Confirmar cuál de las dos mecánicas de calificación rige: desplegable único `Eficacia` o cuatro columnas numéricas |
| P-EV-4 | Confirmar si el instrumento se aplica igual a explotadores UAS o si hay una variante propia (el título cubre PEL-OPS-AIR-ANS-AGA) |

---

*Analizado 2026-08-22 contra el libro Excel oficial MAUT-3.0-12-097 v01, ejemplar 17/07/2026
(hojas Inicio, SMS Evaluation tool (2), SMS Evaliation tool, Listas, guias y las cuatro de
comparación).*
