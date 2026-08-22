# Sitemap de Skylog V2.0

[← Índice maestro](00-INDICE.md) · [Reglas](01-reglas.md) ·
Catálogo de registros: [`19-registros-obligatorios.md`](19-registros-obligatorios.md)

**Premisa**: la plataforma es donde el explotador **lleva sus registros**, no donde escribe sus
manuales. Cada área existe porque hay una obligación de `RAC 100 §100.535` detrás, y cada una es
**activable y configurable** por el cliente (reglas **C1–C5**).

---

## 1 · Los seis espacios

```
① OPERACIÓN        ② FLOTA Y EQUIPO    ③ TRIPULACIÓN
④ SEGURIDAD (SMS)  ⑤ CUMPLIMIENTO      ⑥ ADMINISTRACIÓN
```

Un séptimo bloque, **Complementos**, agrupa lo que se activa aparte o se cobra aparte.

---

## 2 · Mapa

### ① Operación

| Pantalla | Qué guarda | Obligación |
|---|---|---|
| **Tablero** | Estado del día: misiones, alertas, vencimientos | — |
| **Centro de control** | Vista viva de la jornada: qué se vuela hoy, quién, dónde, con qué clima y qué falta por cerrar | — |
| **Programación de misiones** | Misión + PIC + aeronave + zona + **análisis de riesgos por operación** | 100.535(25) |
| **Autorizaciones** | Expediente por solicitud: KMZ, análisis de riesgos, N.º de autorización | 100.535(24) |
| **Despacho** | Checklists **por fase de vuelo** (11 fases), salud, inventario, briefing | 100.535(23) |
| **Cierre de vuelo** | Horas reales, novedades, disparo de reporte si hubo suceso | — |
| **Libro de vuelo** | **Uno por aeronave** | 100.535(4) |
| **Bitácora del piloto** | **Una por piloto**, con certificación anual de horas | 100.535(4)(12) |
| **Meteorología** | Condiciones consultadas al planear, al despachar y **archivadas con el vuelo** | evidencia |
| **Replay** | Traza GPS y telemetría del vuelo | evidencia |

> **Libro de vuelo y bitácora del piloto son dos documentos distintos** que hoy la plataforma
> resuelve con una sola tabla. Se conservan como dos vistas y dos reportes del mismo evento.

### ② Flota y equipo

| Pantalla | Qué guarda | Obligación |
|---|---|---|
| **Aeronaves** | **Ficha de 26 atributos** + propiedad + RUAS | Apéndice 1 · 100.535(1)(21) |
| **ETA** | Equipos tecnológicos asociados con **número RETA** | 100.535(21) |
| **Baterías** | Ciclos, salud, trazabilidad por vuelo | — |
| **Firmware** | Versión vigente **y copia de la última que funcionó** | 100.535(7) |
| **Componentes** | Roster vivo con horas y días de uso | 100.535(6) |
| **Mantenimiento** | Programa **por modelo** · intervalos por ciclos/horas/calendario · tolerancias · órdenes con responsable · retorno al servicio | 100.535(3)(5)(6) |
| **Calibración de equipos** | Patrón, incertidumbre, periodo, certificado | `MAUT-5.0-12-090` |
| **Eventos inesperados** | Evaluación tras aterrizaje fuerte, impacto con aves, FOD, pérdida de hélice | `MAUT-5.0-12-090` |
| **Inventario** | Existencias y verificación previa a la operación | — |
| **Dronpuertos** | Áreas de despegue y aterrizaje con sus condiciones técnicas | Apéndice 3 · opcional |

### ③ Tripulación

| Pantalla | Qué guarda | Obligación |
|---|---|---|
| **Personal** | Expediente por persona: identidad, cargo, vinculación | 100.535(21) |
| **Licencias y adiciones** | CIPU y adiciones vigentes por piloto | 100.535(8) |
| **Aptitud psicofísica** | Certificado médico con vigencia y alerta | 100.535(9) |
| **Tiempos de servicio, vuelo y descanso** | Registro diario con los límites de §100.540 | **100.535(10)(11)** |
| **Certificación anual de horas** | Constancia firmada, ≥1 vez por año calendario | **100.535(12)** |
| **Capacitación y PEP** | Programa, sesiones, asistencia, evaluación, certificados | 100.535(8) |
| **Designaciones** | Actas de Jefe de Pilotos, Gerente SMS y ejecutivo responsable, con vigencia | 100.535(14)(15)(16) |

### ④ Seguridad operacional (SMS)

| Pantalla | Qué guarda |
|---|---|
| **Política y objetivos** | Documento del cliente + objetivos con sus indicadores |
| **Peligros y riesgos** | Registro de peligros, matriz, mitigaciones, riesgo residual |
| **Reportes** | VOR · MOR · **NSMP** — los diligencia **cualquiera**; el **Gerente SMS analiza** |
| **Seguimiento de casos** | Acciones correctivas, línea de tiempo, plazo de radicación en IRIS |
| **Indicadores (SPI)** | **11 oficiales precargados + los propios del cliente** |
| **Barreras** | Controles y defensas declarados |
| **Auditoría interna** | Programa, hallazgos, análisis causal, acciones |
| **Mejora continua** | Autoevaluación contra los **47 ítems** del instrumento oficial |
| **Plan de emergencias (ERP)** | Estructura garantizada, contenido del cliente |
| **Capacitación SMS** | Cronograma y asistencia de todo el personal |

### ⑤ Cumplimiento

| Pantalla | Qué guarda | Obligación |
|---|---|---|
| **Expediente de la organización** | CDO-U, OpSpecs, cámara de comercio, RUAS, RETA, pólizas | `MAUT-5.0-22-011` |
| **Manuales** | Repositorio del **MO, MSMS, MCM y MMP del cliente**, con versiones y acuse de lectura | 100.535(19)(20) |
| **Reportes a la autoridad** | Paquete mensual (estadística + SPI + MOR) con acuse de envío | **100.535(26)** |
| **Vigencias** | Pólizas, registro AeroCivil, certificados médicos, licencias | 100.535(27) |
| **Auditoría de acciones** | Quién hizo qué y cuándo dentro de la plataforma | trazabilidad |
| **Retención y custodia** | 5 años sobre registros operacionales + **congelamiento por suceso** | **100.535(29)** |

### ⑥ Administración

Organización · usuarios y roles · plan y facturación · **configuración de módulos** ·
personalización de checklists, catálogos y formatos.

---

## 3 · Complementos

| Complemento | Qué es | Cómo se ofrece |
|---|---|---|
| **Replay** | Reconstrucción del vuelo desde el log | Por plan, con retención por plan |
| **Meteorología** | Consulta y archivo de condiciones | Incluido |
| **Centro de control** | Panorama vivo de la jornada | Por plan |
| **Análisis forense** | Ver §4 | **Pago aparte** |
| **Comando y Control (C2)** | Telemetría y video en vivo | ⏸ **omitido por ahora** (decisión 20) |

> El **Centro de control** de este sitemap es un panorama de la operación del día construido con
> datos que ya tenemos —misiones, tripulación, clima, estado de flota, pendientes—. **No es C2 en
> vivo**, que sigue omitido. Si lo que se quiere es telemetría en tiempo real desde el dron, eso
> es la decisión 20 y hay que reabrirla explícitamente.

### Replay multimarca

Hoy el replay depende de un parser específico de DJI. Para que crezca a **Autel, Parrot y otras**
sin rehacerlo, la arquitectura separa tres capas:

```
log del fabricante → parser por marca → traza canónica → visor único
```

El **visor y el almacenamiento no saben de marcas**; solo consumen la traza canónica (posición,
altura, velocidades, actitud, energía, calidad de enlace, eventos). Agregar una marca es escribir
un parser nuevo y registrarlo — **ningún cambio en el visor, el almacenamiento ni los reportes**.
Es la diferencia entre crecer y reescribir.

---

## 4 · Análisis forense (pago aparte)

Es la respuesta a una pregunta concreta: **¿qué pasó exactamente en ese vuelo?** Cuando hay un
incidente, la evidencia está repartida en seis lugares. El complemento la reúne en un expediente
único y **congelado**:

| Fuente | Aporta |
|---|---|
| Replay y telemetría | Trayectoria, altura, velocidades, energía, calidad de enlace |
| Meteorología archivada | Condiciones reales al momento del despegue y del suceso |
| Checklists del despacho | Qué se verificó y qué se omitió |
| Historial de mantenimiento | Última intervención, componentes instalados y sus horas |
| Tiempos de servicio del piloto | Si operaba dentro de los límites de §100.540 |
| Caso SMS | Reporte, clasificación, análisis y acciones |

Con dos propiedades que lo hacen defendible: **custodia** —el material queda fuera de la purga
por cuota desde que se abre el caso, según el ítem 34 de `MAUT-5.0-12-095`— y **trazabilidad**,
porque cada acceso al expediente queda auditado.

---

## 5 · Todo activable

Ninguna área es obligatoria para todos. El cliente enciende lo que su operación exige:

| Módulo | Cuándo se enciende | Nota al apagarlo |
|---|---|---|
| **Mercancías peligrosas** | Si transporta, o si sus OpSpecs lo mencionan | ⚠️ **No desaparece del todo**: aun sin transportar, el explotador debe declarar que no lo hace y capacitar a su personal (`MAUT-5.0-12-174`, ítems 7 y 24). Apagarlo oculta clasificación, marcas, NOTOC y diagramas; **conserva la declaración y la capacitación** |
| **Dronpuertos** | Si opera desde áreas declaradas | Sin efecto sobre el resto |
| **BVLOS** | Si tiene la condición aprobada | Cambia límites de tiempo (6 h) y exige monitoreo meteorológico continuo |
| **Mantenimiento menor** | Por aeronave | Ya es opt-in hoy |
| **Replay · Centro de control · Forense** | Por plan o compra | — |
| **Checklists por fase** | El cliente define cuáles usa y cómo se redactan | La norma fija el mínimo; el texto es suyo |

---

## 6 · Pendiente opcional a futuro

**Guía de referencia en manuales.** Como los registros dejan de ser formatos físicos, el cliente
necesita declarar en su MO, MCM y MSMS **que sus registros se llevan en formato digital en esta
plataforma**: qué registro, dónde vive, quién lo controla, cómo se conserva cinco años y cómo se
entrega a un inspector.

No es un generador de manuales: es **un texto de referencia y un anexo técnico** que el cliente
copia y adapta. Queda como paso futuro opcional, fuera del alcance actual.

---

*Creado 2026-08-22 sobre [`19-registros-obligatorios.md`](19-registros-obligatorios.md).*
