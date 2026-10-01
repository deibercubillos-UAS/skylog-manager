# Mapa de entidades del negocio

[← Índice maestro](00-INDICE.md) · [Reglas](01-reglas.md)
Fuentes: [`19-registros-obligatorios.md`](19-registros-obligatorios.md) ·
[`36-sitemap.md`](36-sitemap.md) · [`20-auditoria-datos.md`](20-auditoria-datos.md)

**Esto no es un esquema de base de datos.** Es el inventario de las cosas que existen en el
negocio, con sus reglas propias. El esquema sale después, en
[`31-esquema-datos.md`](31-esquema-datos.md), y sale bien solo si esto está bien.

Es la etapa ① del ciclo ([`50`](50-hoja-de-ruta.md) §3): **ningún frente se diseña sin sus
entidades inventariadas.** Es justamente lo que faltó en la plataforma actual.

---

## 1 · Cómo se clasifica cada dato

Clasificación fijada por el usuario. Determina dónde vive el dato y quién lo mantiene:

| Clase | Qué significa | Ejemplo |
|---|---|---|
| **① Declarado** | Se captura **una vez** y cambia rara vez, por decisión de la organización | Razón social, política de seguridad, declaración de compromiso |
| **② Derivado** | Lo **produce la operación**; nadie lo teclea dos veces | Horas de vuelo, ciclos de batería, tiempo de servicio acumulado |
| **③ Vigente** | Tiene **fecha de vencimiento** y exige alerta | Póliza, certificado médico, licencia, registro AeroCivil |
| **④ Evento** | Ocurrió en un instante y **no se edita**; se corrige con otro evento | Vuelo, intervención de mantenimiento, reporte, cambio de componente |

> Regla que sale de aquí: **un dato ② nunca se pide en un formulario**, y un dato ④ nunca se
> actualiza en sitio. La plataforma actual viola ambas — por eso hay horas que se editan a mano y
> registros históricos que se sobreescriben.

---

## 2 · Identidad y organización

### 2.1 El error que hay que no repetir

Hoy `profiles` y `pilots` comparten **doce columnas**, y en producción **divergen**: 5 de 10
perfiles tienen teléfono distinto entre las dos tablas, 5 de 10 licencia distinta, y **2 de 10
vencimiento de certificado médico distinto** — este último con consecuencia regulatoria, porque
los avisos de vigencia leen de una tabla y el expediente de la otra.

La causa no es descuido: es que **una sola tabla intentó ser tres cosas a la vez**.

### 2.2 Las tres entidades separadas

| Entidad | Qué es | Clase | Regla |
|---|---|---|---|
| **Cuenta** | Credencial de acceso. Un correo, una contraseña | ① | Es de la **persona**, no de la organización. Sobrevive a cambiar de empleador |
| **Persona** | Un ser humano. Nombre, documento, contacto, licencia, certificado médico | ①③ | **Existe aunque no tenga cuenta**: un observador o un técnico pueden estar registrados sin usar el sistema |
| **Membresía** | El vínculo `Persona ↔ Organización` con un rol y una vigencia | ①③ | Una persona puede tener varias, en organizaciones distintas, con roles distintos |

Tres consecuencias inmediatas:

1. **El certificado médico es de la Persona**, no de la membresía ni del perfil. Se registra una
   vez y lo ve toda organización donde esa persona esté vinculada.
2. **El rol es de la Membresía.** El mismo humano puede ser Jefe de Pilotos en una empresa y
   piloto en otra — que es exactamente el caso real que rompió la plataforma actual.
3. **Dar de baja a alguien no borra su historia.** La membresía se cierra; la persona y sus
   vuelos siguen existiendo, como exige la retención de cinco años.

### 2.3 Organización y sus atributos formales

| Entidad | Qué es | Clase |
|---|---|---|
| **Organización** | El explotador UAS. Razón social, NIT, domicilio | ① |
| **Certificación** | CDO-U + OpSpecs: qué tipos de operación y qué contacto visual están aprobados | ①③ |
| **Designación** | Acta que nombra a alguien como Jefe de Pilotos, Gerente SMS o Ejecutivo Responsable, con vigencia | ①③④ |

> **La Designación es entidad propia, no un campo de rol.** `100.535(14)(15)(16)` exige designar;
> `MAUT-5.0-22-011` exige presentar sus hojas de vida. Un rol en un desplegable no es evidencia de
> designación: el acta con fecha sí. Y explica por qué el expediente del Gerente SMS necesita
> carga de archivos (decisión 14).

> **La Certificación gobierna qué se puede hacer.** Si las OpSpecs no incluyen BVLOS, el sistema
> no debería dejar programar BVLOS. Hoy no existe esa relación.

---

## 3 · Flota

### 3.1 Modelo y Aeronave son entidades distintas

Es la segunda separación estructural que falta hoy.

| Entidad | Qué es | Clase | Qué cuelga de aquí |
|---|---|---|---|
| **Modelo de UAS** | Marca + modelo. El tipo, no la unidad | ① | La **ficha técnica de 26 atributos** y el **programa de mantenimiento** |
| **Aeronave** | La unidad física: serie, RUAS, propiedad, horas acumuladas | ①②③ | Su historia: vuelos, intervenciones, componentes, firmware |

`100.535(3)` lo dice literal: *"disponer de un programa de mantenimiento **para cada modelo** de
aeronave no tripulada (UA) que componga su flota"*. Hoy el intervalo se configura por aeronave —
lo que significa que una flota de seis Matrice 350 se configura seis veces, y puede quedar
inconsistente consigo misma.

Lo mismo la ficha de 26 atributos: velocidad máxima de ascenso, techo, autonomía, GNSS soportados
o arquitectura del enlace C2 son del **modelo**. Solo serie, RUAS, propiedad y horas son de la
**aeronave**.

### 3.2 El resto de la flota

| Entidad | Qué es | Clase | Nota |
|---|---|---|---|
| **ETA** | Equipo tecnológico asociado, con **número RETA** | ①③ | Se registra ante AeroCivil igual que una aeronave |
| **Batería** | Unidad con serie, ciclos y salud | ②③ | Los ciclos son ② — se derivan del uso, no se teclean |
| **Componente** | Instancia instalada: hélices, motores, ESC | ②④ | Su reloj arranca al instalarse y se congela al retirarse |
| **Firmware** | Versión vigente **+ copia de la última que funcionó** | ①④ | `100.535(7)`. No existe hoy |
| **Documento de propiedad** | Título o derecho de uso de cada UAS | ① | `100.535(1)`. No existe hoy |

---

## 4 · Operación

### 4.1 El Vuelo es un evento, y produce dos libros

| Entidad | Qué es | Clase |
|---|---|---|
| **Autorización** | Lo que se pide a la AeroCivil: alcance, fechas, zona, número de vuelos | ①④ |
| **Análisis de riesgos** | El formato oficial por autorización, firmado por el Jefe de Pilotos | ①④ |
| **Misión** | Lo que se programa: PIC, aeronave, zona, hora | ①④ |
| **Vuelo** | Lo que **ocurrió**: despegue, aterrizaje, duración, condición | ④ |
| **Traza** | La reconstrucción del vuelo desde el log del fabricante | ④ |
| **Observación meteorológica** | Condiciones **archivadas junto al vuelo** | ④ |
| **Resultado de checklist** | Qué se verificó, quién y cuándo | ④ |

> **Libro de vuelo y bitácora del piloto no son dos entidades**: son **dos vistas y dos reportes
> del mismo Vuelo**, uno agrupado por aeronave y otro por piloto. `100.535(4)` exige ambos; el
> dato es uno solo. Duplicarlo sería repetir el error de `profiles`/`pilots`.

> **La meteorología archivada es un evento, no una consulta.** Si el clima se consulta en vivo y
> no se guarda, no hay evidencia de en qué condiciones se decidió volar — que es justo lo que se
> necesita en un análisis forense.

### 4.2 Tiempos de servicio — la entidad que no existe

| Entidad | Qué es | Clase |
|---|---|---|
| **Período de servicio** | Franja en que la persona está asignada a funciones operacionales | ④ |
| **Período de descanso** | Franja en que está relevada de todo servicio | ④ |
| **Certificación anual de horas** | Constancia firmada, ≥1 vez por año calendario | ④ |

El tiempo de servicio **no es la duración del vuelo**: `100.540` incluye preparación previa,
monitoreo activo, espera en disponibilidad, entrenamiento programado y actividades posteriores.
Por eso es una entidad propia y no un campo derivado del Vuelo.

Los límites (90 h/mes, 6 h BVLOS u 8 h VLOS/EVLOS por 24 h, 2 h continuas + 30 min) se calculan
sobre estas franjas — son ② puro, y el sistema debe **bloquear** una asignación que los rompa,
no reportarla después.

---

## 5 · Mantenimiento

| Entidad | Qué es | Clase | Nota |
|---|---|---|---|
| **Programa de mantenimiento** | Conjunto de tareas e intervalos **por modelo** | ① | Intervalos por **ciclos, horas y calendario** — los tres |
| **Tarea** | Una actividad con su intervalo y su **tolerancia** | ① | La tolerancia se liga a la criticidad |
| **Intervención** | Lo que se ejecutó: quién, cuándo, qué encontró | ④ | Con firma y retorno al servicio |
| **Evento inesperado** | Aterrizaje fuerte, impacto con aves, FOD, pérdida de hélice | ④ | Dispara evaluación obligatoria |
| **Equipo de medición** | Herramienta sujeta a calibración | ①③ | Patrón, incertidumbre, periodo, certificado |

> El **Evento inesperado** es la entidad puente entre operación y mantenimiento: nace en el
> cierre de un vuelo y obliga a una evaluación antes del siguiente. Hoy no existe ese puente.

---

## 6 · Seguridad operacional

| Entidad | Qué es | Clase |
|---|---|---|
| **Peligro** | Condición que podría causar daño | ①④ |
| **Evaluación de riesgo** | Probabilidad × gravedad, con mitigación y residual | ④ |
| **Barrera** | Control o defensa declarada | ① |
| **Reporte** | VOR · MOR · NSMP · reporte interno | ④ |
| **Caso** | El seguimiento de un reporte: análisis, acciones, cierre | ④ |
| **Acción correctiva** | Compromiso con responsable y plazo | ④ |
| **Indicador (SPI)** | Definición: qué mide, denominador, meta | ① |
| **Dato mensual de indicador** | Numerador y denominador de un mes | ④ |
| **Evaluación del SMS** | Autoevaluación contra los 47 ítems oficiales | ④ |

Dos precisiones que salen del análisis normativo:

- **Reporte y Caso son entidades distintas.** El reporte lo crea **cualquiera**; el caso lo
  gestiona el **Gerente SMS** (decisión 10). Fundirlos obliga a dar permisos de gestión a quien
  solo debía poder reportar.
- **Definición de indicador y dato mensual son distintos.** La definición es ①, el dato es ④. Las
  líneas de alerta se **congelan al cerrar el año** y se guardan como valores, no se recalculan.

---

## 7 · Documental — la entidad transversal

| Entidad | Qué es | Clase |
|---|---|---|
| **Documento** | Un archivo con nombre, tipo, vigencia, custodio y política de retención | ①③④ |
| **Manual** | Documento del cliente con versiones y acuse de lectura | ①④ |
| **Envío a la autoridad** | Constancia de qué se radicó, cuándo y quién | ④ |
| **Custodia legal** | Marca que congela material asociado a un caso | ④ |

> **Documento como entidad de primera clase resuelve el problema que originó todo este
> proyecto**: *"subir el logo en organización y luego volver a subirlo en reportes"*. Si el logo
> es un Documento con un rol declarado, se sube una vez y lo usa quien lo necesite. Lo mismo la
> póliza, la cédula del piloto o el certificado de calibración.

---

## 8 · Lo que este mapa deja claro

| # | Separación | Qué arregla |
|---|---|---|
| E1 | **Cuenta / Persona / Membresía** | La divergencia real de datos entre `profiles` y `pilots` |
| E2 | **Modelo / Aeronave** | El programa de mantenimiento por modelo que exige `100.535(3)` |
| E3 | **Vuelo único, dos vistas** | Libro de vuelo y bitácora del piloto sin duplicar el dato |
| E4 | **Período de servicio ≠ Vuelo** | El incumplimiento actual de `100.540` |
| E5 | **Reporte / Caso** | Que reportar sea abierto y analizar sea del Gerente SMS |
| E6 | **Documento transversal** | Subir cada archivo una sola vez |
| E7 | **Designación / Certificación** | Que el sistema sepa qué está autorizado a hacer la organización |

---

## 9 · Pendientes

| # | Pendiente |
|---|---|
| P-EN-1 | Decidir si **Observador** es una Persona con rol o una entidad propia (tiene geometría y distancias propias en EVLOS) |
| P-EN-2 | Modelar cómo una **enmienda** al MO se relaciona con los datos que cambian (flota, personal) |
| P-EN-3 | Definir el ciclo de vida de **Custodia legal**: quién la abre, quién la libera |

---

*Creado 2026-08-22. Es la base de [`31-esquema-datos.md`](31-esquema-datos.md), que se rehará
sobre esto.*
