# Indicadores SPI — circular MAUT-1.0-22-005 · análisis

[← Índice maestro](00-INDICE.md) · [Reglas](01-reglas.md) · [RAC 219](10-rac219-sms.md)

**Fuente**: `MAUT-1.0-22-001_Definicion_SPI.md` (Drive). ⚠️ El archivo se llama `-001` pero su
**clave real es MAUT-1.0-22-005**, *Circular Informativa — Definición de Indicadores de
Desempeño en materia de Seguridad Operacional (SPI)*, **versión 02, aprobada 20-03-2026**.

> **Es una versión más reciente que la usada en julio de 2026** para construir el módulo SPI
> actual. Contiene una lista oficial de indicadores para explotadores UAS que antes no existía,
> y **corrige un error de fondo** en lo implementado.

---

## 1 · ⚠️ Error confirmado: el denominador de un explotador UAS son CICLOS, no horas

Texto literal de la circular, sección **b. Denominador de la tasa**:

> *"**Explotadores UAS: ciclos de Vuelo** (se define como ciclo de vuelo un despegue hasta su
> aterrizaje)."*

| | |
|---|---|
| **Lo implementado hoy** | El módulo SPI ofrece 4 unidades y la documentación del proyecto afirma: *"para un explotador UAS lo habitual es «Horas de vuelo»"* |
| **Lo que dice la norma** | **Ciclos de vuelo.** Horas de vuelo corresponde a taxi aéreo, trabajos aéreos especiales y centros de instrucción — **no a UAS** |
| **Veredicto** | ❌ **Incorrecto en producción.** Todo SPI calculado con horas tiene el denominador equivocado |

**Corrección de mi propio análisis anterior**: en [`21-auditoria-sms.md`](21-auditoria-sms.md)
propuse derivar el denominador como *"horas de vuelo del mes, suma sobre `flights`"`. **También
estaba mal.** El denominador correcto es el **conteo de vuelos del mes** — un `count(*)`.

Y eso **resuelve de paso** el problema de calidad de datos que detecté: varios meses tienen
vuelos con `total_time = 0.00`. Contando ciclos, esos vuelos **sí cuentan**, porque un ciclo es
un despegue y un aterrizaje, exista o no la duración registrada.

**Regla adicional de la circular**: el denominador debe ser **exactamente el mismo valor
mensual para todos los SPI** del mismo proveedor. Es un dato único por periodo, no uno por
indicador — lo que refuerza que se calcule y no se capture.

---

## 2 · Los 11 indicadores oficiales para explotadores UAS

La circular trae, como adjunto, la **lista concertada en 2025 por subsector**. Para
explotadores UAS son estos once, con su taxonomía oficial:

| # | Indicador | Taxonomía |
|---|---|---|
| 1 | Aterrizaje en ubicación no planeada / emergencia (la aeronave no llega al punto autorizado) | `U-ARC` |
| 2 | Cuasi colisión con **aeronave tripulada** | `U-MAC-1` |
| 3 | Cuasi colisión con **fauna** | `U-WILD` |
| 4 | Cuasi colisión con **obstáculo / infraestructura** | `U-CFIT-1` |
| 5 | Cuasi colisión con **otro UA** | `U-MAC-2` |
| 6 | **Fallas en baterías** (descargas abruptas, voltajes anómalos, degradación) | `U-SCF-NP(1)` |
| 7 | Lesiones o golpes/impactos a **terceros** | `U-GTI` |
| 8 | Pérdida de separación entre dos aeronaves | `U-MAC-3` |
| 9 | **Pérdida de control** (riesgo severo) | `U-LOC-I` |
| 10 | Pérdida de control **con colisión contra el terreno** | `U-CFIT-2` |
| 11 | **Pérdida del enlace C2** (monitoreo del deterioro antes de la pérdida total) | `U-SCF-NP(2)` |

**`U-MAC-3` es de medición obligatoria** aunque no se haya concertado con todos los
subsectores: la circular lo exige para *"los subsectores que desarrollan operaciones de vuelo"*,
por ser un evento de alta severidad potencial.

### Consecuencia directa

`lib/safetyIndicatorStats.js` tiene hoy **`EXAMPLE_INDICATORS` con 6 indicadores redactados
por el proyecto**. Existe una lista oficial de 11 con taxonomía asignada. En Skylog V2.0 los
precargados deben ser **estos**, con su código de taxonomía — no una redacción propia.

### Y la conexión con el resto de la plataforma ya estaba escrita en la norma

Tres de los once indicadores oficiales son **detectables automáticamente** por módulos que ya
existen o están planificados:

| Indicador oficial | Fuente automática |
|---|---|
| `U-SCF-NP(1)` Fallas en baterías | Ciclos y salud de batería · alertas del log DJI |
| `U-SCF-NP(2)` **Pérdida del enlace C2** | `wireless_link.sdr_quality` + `mode_code_reason` del C2 |
| `U-LOC-I` / `U-CFIT-2` Pérdida de control | `mode_code_reason` (aterrizaje forzoso, RTH, obstáculo) |

Esto ya no es una propuesta de producto: es la lista oficial de la autoridad coincidiendo con
lo que `219.110(f)` exige capturar automáticamente.

---

## 3 · Reglas de cálculo — verificadas contra el texto

### 3.1 Tasa
Siempre **por 1000**, para todo indicador de todo tipo de proveedor. Sin excepción.

### 3.2 Líneas de alerta y ⚠️ la regla de activación que falta implementar

Las tres líneas se calculan con el **promedio y la desviación estándar del año anterior**
(promedio + 1·DE, + 2·DE, + 3·DE). Eso ya está bien implementado.

**Lo que no está**: la circular define **tres condiciones de activación**, y basta que se cumpla
cualquiera durante el periodo de evaluación:

| Condición | Umbral |
|---|---|
| **Cualquier punto único** por encima de la **3ª** línea | promedio + 3·DE |
| **Dos puntos consecutivos** por encima de la **2ª** línea | promedio + 2·DE |
| **Tres puntos consecutivos** por encima de la **1ª** línea | promedio + 1·DE |

> ❌ **Hoy BitaFly marca "en alerta" si algún mes supera la 1ª línea.** No es la regla oficial:
> un solo punto sobre la 1ª línea **no activa alerta**. Se necesitan **tres consecutivos**.
> El sistema actual produce falsos positivos.

Es análisis de rachas, no de umbral simple. Va a `packages/domain` con pruebas (regla Q2).

### 3.3 Meta — el SPT sí existe, y así se expresa

Cierra el pendiente que dejó el RAC 219. La circular cita `219.105(c)(1)(ii)`:

> *"El rendimiento… se verificará en referencia a los **indicadores y las metas** de rendimiento
> en materia de seguridad operacional del SMS"*

La meta se deriva de la **"Mejora esperada en %"**, que pondera: análisis estadístico del
historial, nivel de criticidad, e impacto de los planes de acción. **La organización tiene
libertad** de fijar el valor según su capacidad — equilibrio de las dos P (Protección y
Producción).

✅ `expected_improvement_pct` en el esquema actual **está correcto conceptualmente**.

**Excepción**: si el indicador nunca se midió o tiene **cero eventos en toda su historia**, *"no
es necesario que se establezca una meta, ni que se desarrollen planes de acción"*.

**Pero sí hay que presentarlo**: *"Es necesario monitorear y presentar aquellos indicadores que
se han establecido, aun cuando se encuentren en ceros o lleven más de 3 años sin ocurrir."*

---

## 4 · Planes de acción — criterios de validez explícitos

La circular define qué es y qué **no** es un plan de acción válido. Son reglas verificables en
la interfaz, no orientación difusa.

**Defensas TRE** — cada plan se etiqueta con la inicial:

| | Tipo |
|---|---|
| **T** | Tecnología |
| **R** | Reglamentación interna |
| **E** | Entrenamiento |

✅ **Válidos**: los que presenten *"mejoras, cambios, adecuaciones en las defensas (TRE)"*.

❌ **NO válidos** — cuatro categorías, literales:

1. Actividades como **verificar, auditar, examinar, supervisar** — *"o cualquier otra actividad
   que denote revisar algo que ya se ha evidenciado que no funciona como debiera"*.
2. Los que **transfieran la responsabilidad** o la solicitud de solución a otra organización.
3. Los que impliquen **describir o realizar algo que ya está implícito en las funciones**.
4. Los que consistan en **dar cumplimiento a un procedimiento o entrenamiento ya establecido**
   que, por la ocurrencia de eventos, se evidencia fallando o insuficiente.

> **Oportunidad de producto**: se puede advertir al usuario en el momento de escribir el plan
> si empieza por un verbo de la lista prohibida. Convierte una regla enterrada en una circular
> en una ayuda concreta — exactamente lo que pediste al hablar de "facilitarle al cliente".

**Campos exigidos por plan de acción**: defensa (T/R/E) · causa raíz · desencadenante bajo
gobernabilidad · plan · documento oficial donde se registra su implementación · **tiempo de
ejecución en días calendario**.

El **desencadenante bajo gobernabilidad** es distinto de la causa raíz: es el factor sobre el
cual la organización *puede tomar acciones directas*. La circular lo llama *"fundamental para la
selección de las defensas"*. Hoy el esquema los tiene ambos — correcto.

---

## 5 · Qué NO es un indicador de seguridad operacional

Lista explícita de exclusiones. Son validables al crear un indicador:

- Indicadores del **sistema de gestión de calidad**
- Indicadores de **Seguridad y Salud en el Trabajo**
- **Cantidad de reportes recibidos o gestionados**
- Indicadores que midan **actividades administrativas**
- *"Por ahora"*, los que presenten el **cumplimiento de planes de acción**

> Nota: *"cantidad de reportes recibidos"* es una trampa frecuente — parece un indicador de
> seguridad y no lo es. El SPI mide **la ocurrencia del evento**, no cuántos reportes llegaron.

---

## 6 · Envío anual y formato

| Punto | Requisito |
|---|---|
| **Plazo** | Antes del **30 de marzo** de cada vigencia |
| **Formato** | Excel oficial **MAUT-1.0-12-002**, descargable de Aerocivil |
| **Nombre del archivo** | `UAS-NIT-SPI-MES-AÑO` — ej. `UAS-901234567-SPI-MAR-2026` |
| **Una hoja por indicador** | Con datos del año anterior, año vigente, gráfico y planes de acción |
| **Histórico** | Datos **desde 2015** hasta el mes anterior, al pie de la misma hoja |
| **No modificar fórmulas** | *"el proveedor no cambie ninguna fórmula y solo digite mes a mes los parámetros"* |
| **Solo celdas azules** | Únicamente se diligencia lo sombreado en azul |
| **Multi-servicio** | Un archivo por cada tipo de servicio aprobado |

**Aprobación del Ejecutivo Responsable** — aparece **dos veces**: los planes de acción deben ser
*"conocidos y aprobados por el Ejecutivo Responsable"*, y *"cada indicador debe ser conocido y
aprobado por el Ejecutivo Responsable"*.

> Refuerza lo del RAC 219: el **Ejecutivo Responsable es entidad de primera clase con flujo de
> aprobación**, no un campo de texto. Hoy no existe en BitaFly.

**Ficha técnica obligatoria por indicador**: *"debe ser parte integral de la definición"*. No
existe hoy.

**Formato numérico**: todos los campos excepto la meta deben ser numéricos con decimales.
La circular advierte que usar `hh:mm` *"podrá generar desviaciones para los cálculos"*.

---

## 7 · Resumen de correcciones a lo implementado

| # | Punto | Estado |
|---|---|---|
| 1 | **Denominador UAS = ciclos de vuelo**, no horas | ❌ Incorrecto hoy |
| 2 | **Regla de activación de alerta** (rachas 1/2/3 puntos) | ❌ Incorrecta hoy — falsos positivos |
| 3 | **11 indicadores oficiales** con taxonomía | ❌ Hoy hay 6 inventados |
| 4 | Validación de planes de acción (TRE, verbos prohibidos) | ❌ No existe |
| 5 | Exclusiones de lo que no es SPI | ❌ No se valida |
| 6 | Ficha técnica por indicador | ❌ No existe |
| 7 | Aprobación del Ejecutivo Responsable | ❌ No existe |
| 8 | Histórico desde 2015 | ❌ No contemplado |
| 9 | Nombre de archivo estandarizado | ❌ No implementado |
| 10 | Tasa por 1000 · promedio y DE del año anterior | ✅ Correcto |
| 11 | `expected_improvement_pct` como fuente de la meta | ✅ Correcto |
| 12 | Defensas T/R/E · causa raíz · desencadenante | ✅ Correcto |
| 13 | Plazo 30 de marzo con recordatorio | ✅ Correcto |

**Nueve correcciones sobre trece puntos.** El módulo SPI actual tiene la estructura bien y los
detalles normativos mal — coherente con el diagnóstico general del proyecto.

---

## 9 · Estructura real del Excel MAUT-1.0-12-002 (P-SPI-1 resuelto)

Analizado sobre el archivo oficial `MAUT-1.0-12-002 Herramienta definición de SPIs`
(versión 01, aprobado 22/12/2023), hoja de ejemplo *"Aterrizaje fuerte (Hard Landing)"*.
Las fórmulas no vienen expuestas como texto, así que **se reprodujeron numéricamente** contra
los datos del ejemplo hasta reventar cada hipótesis. Lo que sigue está verificado, no supuesto.

### 9.1 Disposición de la hoja

Una hoja por indicador, dividida en cinco bloques:

| Bloque | Contenido |
|---|---|
| **Encabezado** | Clave `MAUT-1.0-12-002` · Versión · Fecha de aprobación · nombre del indicador |
| **Año anterior** | Mes · Ciclos de Vuelo · Evento · Tasa de eventos · Promedio año |
| **Año presente** | Mes · Ciclos de Vuelo · Evento · Tasa de eventos · 1.ª / 2.ª / 3.ª alerta · Meta |
| **Criterios y meta** | Prom+1DE · Prom+2DE · Prom+3DE · % de mejora esperada · meta sugerida |
| **Planes de acción** | 9 filas: Defensa (T/R/E) · Causa raíz · Desencadenante · Plan · Documento · Tiempo |
| **Histórico** | `Mon-YY` · Ciclos · Eventos · Tasa · columna auxiliar *"datos sin div 0"* |

### 9.2 Fórmulas reconstruidas y verificadas

| Cálculo | Fórmula | Verificación sobre el ejemplo |
|---|---|---|
| Tasa mensual | `eventos / ciclos × 1000` | ene: 2 / 1 842 × 1000 = 1,0858 → **1,09** ✓ |
| Promedio del año | media aritmética de las 12 tasas | 3,04 / 12 = 0,2533 → **0,25** ✓ |
| Desviación estándar | **poblacional** (÷ n), no muestral | σ = 0,318 → **0,32** ✓ · s muestral = 0,332 ✗ |
| Líneas de alerta | `promedio_año_anterior + {1,2,3} × σ_año_anterior` | 0,57 / 0,89 / 1,21 ✓ |
| Meta | `promedio_año_anterior × (1 − mejora_esperada)` | 0,25 × 0,90 = 0,228 → **0,23** ✓ |

La desviación **poblacional** queda confirmada: la muestral da 0,33 y el archivo dice 0,32. Es
la única de las dos que reproduce el número oficial.

### 9.3 Tres reglas que el archivo hace explícitas y no estaban en la circular

1. **Las tres líneas de alerta son constantes durante todo el año presente.** Se calculan una
   sola vez con el cierre del año anterior y se repiten idénticas en los doce meses — no son
   una ventana móvil que se recalcula cada mes. Lo mismo la meta, que se dibuja como línea
   horizontal. *(Coincide con lo implementado hoy — se confirma correcto.)*
2. **El histórico es una rejilla fija de 144 meses: `Jan-15` … `Dec-26`.** No es "desde 2015
   hacia adelante": el formato oficial vigente **se queda sin filas en diciembre de 2026**.
3. **Columna auxiliar `datos sin div 0`.** Duplica la tasa en precisión completa y neutraliza
   la división por cero de los meses sin operación. Es el dato que alimenta la gráfica, no la
   columna redondeada a dos decimales.

### 9.4 Nota de interpretación incluida en el propio archivo

> *"Sobre el comportamiento histórico es necesario analizar tendencia. Al revisar pendiente y si
> hay comportamiento con frecuentes picos y valles que evidencian alta «inestabilidad» o
> comportamiento caótico, denota que los planes de acción (barreras) no están siendo útiles o no
> están siendo aplicados."*

Es un criterio de evaluación, no un adorno: **la varianza alta del histórico se lee como prueba
de que las barreras no funcionan.** Un módulo que solo grafica la serie deja al cliente sin esa
lectura. Calcular pendiente y volatilidad del histórico y decirlo en palabras es trabajo que el
software puede hacer y hoy nadie hace.

### 9.5 Consecuencias de diseño

| # | Consecuencia |
|---|---|
| D1 | El generador debe emitir el `.xlsx` **con la disposición oficial exacta**, no una tabla propia. Aerocivil recibe este formato. |
| D2 | Meses con **cero ciclos** no son un error: se guardan y se neutralizan como el archivo oficial. Prohibido `NULL` silencioso. |
| D3 | Guardar la tasa **sin redondear**; el redondeo a dos decimales es de presentación. |
| D4 | El histórico exige serie mensual desde `Jan-15`. Para un operador nuevo se envía vacío — no se inventa relleno. |
| D5 | Alertas y meta se **congelan al cerrar el año** y se guardan como valores, no se recalculan al vuelo. Si se corrige un mes del año anterior, es una reapertura explícita y auditable. |
| D6 | El archivo oficial caduca en `Dec-26`. Habrá versión nueva; el generador no puede asumir esta rejilla como eterna. |

### 9.6 Lo que quedó sin ver

La extracción devolvió **una sola hoja**, nombrada `O-Taxonomia`. El nombre delata que el libro
trae además una hoja de **taxonomía de ocurrencias** que no se obtuvo. No cambia las fórmulas —
sí puede fijar el vocabulario exacto de categorías de evento. Queda como pendiente P-SPI-5.

---

## 8 · Pendientes

| # | Pendiente |
|---|---|
| ~~P-SPI-1~~ | ~~Analizar el Excel MAUT-1.0-12-002~~ → **resuelto en §9** |
| P-SPI-2 | Confirmar la definición operativa de cada uno de los 11 indicadores (qué cuenta como "cuasi colisión") |
| P-SPI-3 | Obtener el modelo de **ficha técnica** del Plan Colombiano de Seguridad Operacional |
| P-SPI-4 | Revisar la taxonomía MOR completa → [`12-directivas-maut.md`](12-directivas-maut.md) |
| P-SPI-5 | Obtener la hoja `O-Taxonomia` del libro oficial (categorías de ocurrencia) |

---

*Analizado 2026-08-22 contra el texto primario (circular v02 del 20-03-2026) y contra el
libro Excel oficial MAUT-1.0-12-002 v01 (§9).*
