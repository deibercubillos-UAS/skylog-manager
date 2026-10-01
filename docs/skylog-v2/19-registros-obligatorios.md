# Los registros que el explotador UAS debe llevar

[← Índice maestro](00-INDICE.md) · [Reglas](01-reglas.md)

> **Corrección de enfoque (2026-08-22).** Los documentos normativos analizados en la sección 1
> del índice describen **qué debe contener el manual de un explotador**. Se estaban leyendo mal:
> como si fuéramos a construir un asistente para redactar manuales. **No lo somos.**
>
> Los usamos como **inventario de lo mínimo que un explotador tiene que llevar registrado** para
> satisfacer a la Aerocivil. El manual lo escribe el cliente; **nosotros somos el sistema donde
> viven los registros** que ese manual declara.

---

## 1 · La fuente canónica: RAC 100 §100.535

`100.535 Obligaciones y responsabilidades del explotador UAS` enumera **29 obligaciones**. Es la
lista más directa de lo que hay que llevar — más precisa, para nuestro propósito, que cualquier
lista de verificación, porque no describe un documento sino una conducta permanente.

| # | Obligación (resumida) | Registro que implica | ¿Existe hoy? |
|---|---|---|---|
| 1 | Demostrar propiedad o derecho de uso de cada UAS | Documento de propiedad por aeronave | ❌ |
| 2 | Operar con UAS aptos para el vuelo | Estado de aeronavegabilidad | ⚠️ parcial |
| 3 | Programa de mantenimiento **por cada modelo** | Programa por modelo, no por aeronave | ⚠️ hoy es por aeronave |
| 4 | **Libro de vuelo y libro de mantenimiento de cada UA** | Dos libros distintos, por aeronave | ⚠️ uno solo |
| 5, 6 | Documentar trabajos de mantenimiento con **quién los ejecutó** e histórico | Orden de trabajo con responsable | ✅ |
| 7 | **Firmware al día + copia de la última versión que funcionó** | Registro de firmware por aeronave | ❌ |
| 8 | Personal competente: repaso, entrenamiento, verificaciones | Registros de instrucción | ✅ |
| 9 | Aptitud psicofísica del personal | Certificado médico vigente | ✅ |
| 10, 11 | **Tiempos de servicio, vuelo, descanso y asignaciones** por piloto | Registro diario por piloto | ❌ |
| 12 | **Certificar a cada piloto su tiempo acumulado, ≥1 vez por año calendario** | Certificado anual firmado | ❌ |
| 13 | Datos al día en el sistema de información operacional aprobado | — | ⚠️ |
| 14, 15, 16 | Designar Jefe de Pilotos, Gerente SMS y ejecutivo responsable | Acta de designación con vigencia | ⚠️ solo el rol |
| 18 | Implementar y mantener el **SMS** (RAC 219) | Módulo completo | ⚠️ inerte |
| 19, 20 | Mantener actualizados **MO** y **MCM** | Repositorio con versiones y acuses | ⚠️ solo MO |
| 21, 22 | Registro ante Aerocivil al día (aeronaves, personal) | RUAS, RETA, personal | ⚠️ parcial |
| 23 | Ejecutar según el MO y los manuales del fabricante | Checklists por fase de vuelo | ⚠️ |
| 24 | Tramitar las autorizaciones de vuelo | Expediente por autorización | ⚠️ |
| 25 | **Análisis de riesgos por cada operación** | `MAUT-5.0-12-055` por autorización | ⚠️ matriz propia |
| 26 | **Reporte mensual dentro de los 5 primeros días hábiles**: estadística, SPI y MOR | Paquete mensual con acuse | ⚠️ solo estadística |
| 27 | Pólizas vigentes | Vigencias con alerta | ✅ |
| 29 | **Conservar los registros operacionales 5 años** | Retención + custodia por suceso | ❌ |

**Lectura del cuadro**: de 29 obligaciones, la plataforma actual cubre bien 4, cubre a medias 13
y **no cubre 6**. Las tres ausencias más graves son los **tiempos de servicio y descanso** (10-12),
el **registro de firmware** (7) y la **retención de cinco años** (29).

---

## 2 · Lo que agregan los demás documentos

### 2.1 Ficha técnica de aeronave — RAC 100 Apéndice 1, Parte B

**26 atributos por cada UAS**, no cuatro: marca · modelo · RUAS · peso real · **PMBO** · tipo de
carga útil · dimensiones (largo, ancho, diagonal con hélices extendidas) · caracterización (ala
fija / rotatoria / mixta) · tipo de despegue y aterrizaje (VTOL/CTOL/STOL/HTOL/lanzamiento/
catapulta) · velocidades máximas de ascenso, descenso y vuelo · componente máxima de viento ·
techo de servicio · autonomía · alcance · rango de temperatura · batería o sistema equivalente ·
GNSS soportados · certificación IP · **características del enlace C2** (arquitectura, topología,
frecuencias, redundancia, cobertura, latencia, encriptación, proveedores externos C2CSP) ·
limitaciones del enlace · detección de obstáculos · sistema de emergencia · estación de control ·
**autorización de la ANE** cuando se usa banda licenciada.

Y aparte, el **ETA** con marca, modelo, **número RETA** y descripción funcional.

> Esto no es "llenar el manual": es la **ficha de la aeronave**, que hoy tiene cuatro campos. Si
> el dato vive aquí, el capítulo del manual sale solo — pero el objetivo es el dato, no el
> capítulo.

### 2.2 Mantenimiento — `MAUT-5.0-12-090` (22 ítems)

Lo que hoy no se registra: **intervalos por ciclos, horas o calendario** (los tres, no uno) ·
**intervalo de tolerancia** por componente, ligado a su criticidad · **calibración de equipos**
con patrón, incertidumbre, periodo y certificado · procedimientos por sistema (propulsión,
estructural, control y navegación, **enlace C2**, eléctrico, aterrizaje, carga útil, redundancia,
recuperación) · **evaluación tras eventos inesperados**: aterrizaje fuerte, impacto con aves,
FOD, pérdida de hélice en vuelo · retorno al servicio con responsable y formato.

### 2.3 Tiempos de servicio y descanso — RAC 100 §100.540

Números concretos, hoy sin ningún control en la plataforma:

| Límite | Valor |
|---|---|
| Tiempo de vuelo efectivo mensual | **90 h** por mes calendario |
| Tiempo máximo diario (24 h) | **6 h** en BVLOS · **8 h** en VLOS y EVLOS |
| Operación continua | máximo **2 h**, seguidas de **30 min** de descanso |

El *tiempo de servicio* incluye preparación previa, ejecución, **monitoreo activo**, espera en
disponibilidad, entrenamiento programado y actividades posteriores — no solo el vuelo.

### 2.4 Mercancías peligrosas — `MAUT-5.0-12-174` (37 ítems)

**Ojo con un detalle que cambia la decisión de "activar o no" el módulo**: el ítem 24 dice que
*"todos los explotadores, **incluyendo aquellos que no transportan** mercancías peligrosas,
deberán tener capacitación sobre las políticas y procedimientos propios"*, y el ítem 7 exige una
**declaración expresa** de si se transportan o no, coherente con las OpSpecs.

> Es decir: apagar el módulo **no puede significar que desaparezca todo**. Un explotador que no
> transporta sigue necesitando la declaración y la capacitación. Lo que se apaga es el aparato
> completo (clasificación, marcas y etiquetas, NOTOC, diagramas de ubicación); lo mínimo se
> queda. Ver [`36-sitemap.md`](36-sitemap.md) §5.

Los reportes de sucesos con mercancías peligrosas (**NSMP**) se radican por **IRIS**, el mismo
portal que MOR/VOR. Los registros de instrucción se conservan **36 meses** como mínimo.

### 2.5 Certificación — `MAUT-5.0-22-011`

Documentos que el explotador debe tener listos (17 en total). Los que la plataforma puede
custodiar: RUAS · RETA · hojas de vida de Jefe de Pilotos y Gerente SMS · lista de cumplimiento ·
MO · MSMS · MCM · MMP · OpSpecs · CDO vigente · pólizas.

**Cuatro fases con duración oficial**: Solicitud (2 semanas) → Evaluación documental (3 meses) →
**Inspección y demostración** (2 semanas) → Emisión (2 meses). En la fase III el inspector
*"verificará que el sitio de trabajo disponga de los equipos, documentos y soportes necesarios"* —
ese es el momento en que un sistema que tiene todo en línea vale lo que cuesta.

### 2.6 RAC 5 — una segunda vía que no estaba en el radar

`RAC 5 — Servicios Aéreos Comerciales` fue enmendado (Resolución 00998 del 08/05/2025) para
incorporar los UAS como equipo de vuelo de **trabajos aéreos especiales**. Implica que un
explotador comercial necesita, además del CDO-U, un **permiso de operación como empresa de
servicios aéreos comerciales**, con obligaciones propias:

- **Mínimo dos aeronaves** UAS y sus ETA para conformar el equipo de vuelo.
- Cauciones y pólizas ante la UAEAC por responsabilidad civil frente a terceros.
- No aplica certificación de aeronavegabilidad a los UAS, *"a menos que la Autoridad lo
  determine de otro modo"*.

> **Decisión 27 (2026-08-22): RAC 5 NO entra al alcance.** Es **solo informativo**, para tener
> presente el contexto regulatorio completo del cliente. No genera ninguna pantalla, ninguna
> entidad ni ningún registro en la plataforma. Se documenta aquí y no vuelve a aparecer en el
> plan.

---

## 3 · Consecuencia de todo esto

El sistema no produce manuales: **produce y custodia los registros que el manual declara**. La
diferencia práctica es que el cliente escribe en su manual *"el libro de vuelo se lleva en
formato digital en la plataforma X"*, y cuando el inspector lo pide, está ahí completo.

Ver el mapa de cómo se organiza en [`36-sitemap.md`](36-sitemap.md).

---

*Analizado 2026-08-22 contra RAC 100 (articulado y Apéndice 1), RAC 5 enmendado,
`MAUT-5.0-22-011`, `MAUT-5.0-12-090` y `MAUT-5.0-12-174`.*
