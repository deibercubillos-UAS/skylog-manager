# Skylog V2.0 — Índice maestro

Punto de entrada único del proyecto. **Todo documento nuevo se registra aquí.**

> **Skylog V2.0** es el nombre interno de confidencialidad. Al lanzarse, el producto se
> publica como **BitaFly**. Ver [`01-reglas.md`](01-reglas.md) §7.

> **Regla de oro**: ningún archivo supera las **500 líneas**. Al llegar al límite se crea uno
> nuevo, se enlaza desde aquí y se referencia mutuamente.

---

## 0 · Gobierno del proyecto

| Doc | Contenido | Líneas | Estado |
|---|---|---|---|
| [`01-reglas.md`](01-reglas.md) | Reglas de trabajo: producción intocable, documentación, veracidad, datos, SMS, verificación, nombres, autorización de reestructuración | 146 | ✅ |
| `02-glosario.md` | Vocabulario común (entidades, siglas normativas) | — | ⬜ |

## 1 · Normativa

| Doc | Fuente | Líneas | Estado |
|---|---|---|---|
| [`10-rac219-sms.md`](10-rac219-sms.md) | **RAC 219** — Gestión de Seguridad Operacional (vigente, Res. 718/2024) | 199 | ✅ Texto primario |
| [`11-rac100-uas.md`](11-rac100-uas.md) | **RAC 100** — Operación de UAS · 15 brechas identificadas | 50 | ✅ Texto primario |
| [`12-directivas-maut.md`](12-directivas-maut.md) | **MAUT-1.0-22-006** (Aceptación, P/S/O/E) ✅ · **-004** (MOR/VOR, 12 eventos UAS) ✅ | 299 | 🔄 |
| [`13-herramientas-spi.md`](13-herramientas-spi.md) | **MAUT-1.0-22-005** v02 (SPI) — 11 indicadores oficiales UAS · 9 correcciones · **§9 fórmulas del Excel MAUT-1.0-12-002 verificadas** | 327 | ✅ |
| [`14-listas-verificacion.md`](14-listas-verificacion.md) | **MAUT-5.0-12-095** — lista de verificación del MO, 57 ítems con los que se certifica el CDO-U | 259 | ✅ |
| [`16-asuntos-complementarios.md`](16-asuntos-complementarios.md) | **MAUT-1.0-22-007** — Ejecutivo Responsable, Comité, GESO, interfases, ERP, currículo SMS | 315 | ✅ |
| [`17-implementacion-sms-uas.md`](17-implementacion-sms-uas.md) | **MAUT-5.0-22-017** — las 4 fases oficiales de implementación, Cultura Justa, plan Gantt | 213 | ✅ |
| [`18-analisis-riesgos-vuelo.md`](18-analisis-riesgos-vuelo.md) | **MAUT-5.0-12-055** — análisis de riesgos por autorización de vuelo · matriz oficial fija · 24 peligros | 243 | ✅ |
| `15-evaluacion-sms.md` | MAUT-3.0-12-097 — matriz P/S/O/E. **Sube de prioridad**: es la fuente de los ítems a autoevaluar (ver `12` §1.9) | — | ⬜ |

## 2 · Diagnóstico del sistema actual

| Doc | Contenido | Líneas | Estado |
|---|---|---|---|
| [`20-auditoria-datos.md`](20-auditoria-datos.md) | Modelo de datos: 84 tablas, 20 vacías, duplicación `profiles`/`pilots` divergente en producción | 217 | ✅ |
| [`21-auditoria-sms.md`](21-auditoria-sms.md) | Cobertura SMS elemento por elemento · 99 % autodeclarado con cero evidencia | 415 | ✅ |
| [`22-infraestructura.md`](22-infraestructura.md) | Proveedores, costos, velocidad de carga | 155 | ✅ |

## 3 · Diseño de Skylog V2.0

| Doc | Contenido | Líneas | Estado |
|---|---|---|---|
| `30-entidades.md` | Mapa de entidades reales del negocio | — | ⬜ |
| [`31-esquema-datos.md`](31-esquema-datos.md) | Esquema objetivo — **punto de partida, se rehará** tras `30-entidades.md` | 98 | 🔄 |
| `32-migracion.md` | ETL desde la base actual, reglas de precedencia | — | ⬜ |
| [`33-arquitectura.md`](33-arquitectura.md) | Monorepo, servicios, capa de dominio, pruebas | 57 | 🔄 |
| [`34-seguridad.md`](34-seguridad.md) | RLS, multi-tenant, C2 · **falta protección de datos SMS (RAC 219 §219.115-140)** | 63 | 🔄 |
| [`35-frontend.md`](35-frontend.md) | Espacios de trabajo, sistema de diseño, modo campo | 71 | 🔄 |

## 4 · Módulos

| Doc | Módulo | Líneas | Estado |
|---|---|---|---|
| [`40-sms.md`](40-sms.md) | SMS orientado a evidencia | 89 | 🔄 |
| [`41-tiempos-servicio.md`](41-tiempos-servicio.md) | Tiempos de servicio, vuelo y descanso (100.540) | 50 | 🔄 |
| [`42-comando-control.md`](42-comando-control.md) | C2 en vivo — telemetría + video | 280 | ✅ |
| [`43-aerocivil.md`](43-aerocivil.md) | Expediente y radicación de autorizaciones | 77 | 🔄 |

## 5 · Ejecución

| Doc | Contenido | Líneas | Estado |
|---|---|---|---|
| [`50-hoja-de-ruta.md`](50-hoja-de-ruta.md) | Aislamiento, frentes, orden recomendado, no-objetivos | 165 | 🔄 |
| [`51-bitacora.md`](51-bitacora.md) | Decisiones cerradas y fuentes consultadas | 82 | 🔄 |

**Leyenda**: ✅ completo · 🔄 migrado, pendiente de rehacer bajo el enfoque de reconstrucción · ⬜ no iniciado · 🔜 siguiente

---

## Estado

- **21 documentos**, todos bajo el límite de 500 líneas. El mayor: `21-auditoria-sms.md` (415).
- `plan-bitafly-v2.md` e `investigacion-sms-rac219-bitafly.md` **se eliminaron**: su contenido
  vive repartido aquí. No hay duplicados (regla E1).
- Los marcados 🔄 se escribieron bajo la premisa anterior de *evolución aditiva*. Con la
  autorización de reestructuración total ([`01-reglas.md`](01-reglas.md) §8) deben rehacerse
  desde el problema, no desde lo que existe.

### Documentos normativos pendientes de conseguir

| Documento | Naturaleza | Por qué importa | Prioridad |
|---|---|---|---|
| **MAUT-5.0-22-016 "01-23"** | Directiva **vinculante** | Criterios de aceptación del **enlace C2**. Sin ella, [`42-comando-control.md`](42-comando-control.md) está diseñado a ciegas frente a la autoridad | **Alta** |
| **RAC 114** | Reglamento | Accidentes e incidentes graves — no van por MOR; falta la bifurcación | **Alta** |
| **MAUT-5.0-22-011** | Circular informativa | Guía del CDO-U, citada en 50 de los 57 ítems del MO | Media |
| **MAUT-5.0-22-014 DI "03-23"** | Directiva **vinculante** | Condiciones técnicas para dronpuertos | Media |
| **MIU** | Manual del Inspector UAS | Procedimiento con el que se aplica la lista de verificación | Baja |

## Próximos pasos

1. `15-evaluacion-sms.md` — matriz P/S/O/E de **MAUT-3.0-12-097** (el archivo ya está disponible)
2. `30-entidades.md` — mapa de entidades, base de todo el diseño
3. Rehacer los 🔄 sobre esa base

---

*Actualizado: 2026-08-22*
