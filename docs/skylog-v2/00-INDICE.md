# Skylog V2.0 — Índice maestro

Punto de entrada único del proyecto. **Todo documento nuevo se registra aquí.**

> **Regla de oro**: ningún archivo supera las **500 líneas**. Al llegar al límite se crea
> uno nuevo, se enlaza desde aquí y se referencia mutuamente. Ver `01-reglas.md`.

---

## 0 · Gobierno del proyecto

| Doc | Contenido | Estado |
|---|---|---|
| [`01-reglas.md`](01-reglas.md) | Reglas de trabajo, aislamiento respecto de producción, convenciones de documentación | ✅ Vigente |
| `02-glosario.md` | Vocabulario común (entidades del negocio, siglas normativas) | ⬜ Pendiente |

## 1 · Normativa (análisis de fuentes oficiales)

| Doc | Fuente | Estado |
|---|---|---|
| [`10-rac219-sms.md`](10-rac219-sms.md) | RAC 219 — Gestión de Seguridad Operacional (vigente, enmendado por Res. 718/2024) | ✅ Analizado |
| `11-rac100-uas.md` | RAC 100 — Operación de UAS (modificación integral) | 🔄 Analizado en `../plan-bitafly-v2.md` §1 — pendiente de migrar aquí |
| `12-directivas-maut.md` | MAUT-1.0-22-001/004/006/007, MAUT-5.0-22-017 | ⬜ Pendiente |
| `13-herramientas-spi.md` | MAUT-1.0-12-002 (SPI), MAUT-3.0-12-097 (evaluación SMS ponderada) | ⬜ Pendiente |
| `14-listas-verificacion.md` | MAUT-5.0-12-055 (MO), MAUT-5.0-12-095 | ⬜ Pendiente |

## 2 · Diagnóstico del sistema actual

| Doc | Contenido | Estado |
|---|---|---|
| `20-auditoria-datos.md` | Auditoría del modelo de datos actual | 🔄 En `../plan-bitafly-v2.md` §16 — pendiente de migrar |
| `21-auditoria-sms.md` | Cobertura real del módulo SMS por elemento | 🔄 En `../investigacion-sms-rac219-bitafly.md` — pendiente de migrar |
| `22-infraestructura.md` | Proveedores, costos, velocidad de carga | 🔄 En `../plan-bitafly-v2.md` §15 — pendiente de migrar |

## 3 · Diseño de Skylog V2.0

| Doc | Contenido | Estado |
|---|---|---|
| `30-entidades.md` | Mapa de entidades reales del negocio | ⬜ Pendiente |
| `31-esquema-datos.md` | Esquema objetivo, tabla por tabla | ⬜ Pendiente |
| `32-migracion.md` | ETL desde la base actual, reglas de precedencia | ⬜ Pendiente |
| `33-arquitectura.md` | Monorepo, servicios, capa de dominio | ⬜ Pendiente |
| `34-seguridad.md` | RLS, multi-tenant, protección de datos SMS | ⬜ Pendiente |
| `35-frontend.md` | Espacios de trabajo, sistema de diseño, modo campo | ⬜ Pendiente |

## 4 · Módulos

| Doc | Módulo | Estado |
|---|---|---|
| `40-sms.md` | SMS orientado a evidencia | ⬜ Pendiente |
| `41-tiempos-servicio.md` | Tiempos de servicio, vuelo y descanso (RAC 100 100.540) | ⬜ Pendiente |
| `42-comando-control.md` | C2 en vivo (telemetría + video) | ⬜ Pendiente |
| `43-aerocivil.md` | Expediente y radicación de autorizaciones | ⬜ Pendiente |

## 5 · Ejecución

| Doc | Contenido | Estado |
|---|---|---|
| `50-hoja-de-ruta.md` | Fases, orden, puertas de verificación | ⬜ Pendiente |
| `51-bitacora.md` | Registro cronológico de decisiones | ⬜ Pendiente |

---

## Documentos previos (anteriores a esta estructura)

Se conservan y se migrarán progresivamente. **Superan las 500 líneas** — su división es
parte del trabajo pendiente:

- `../plan-bitafly-v2.md` (~1.150 líneas) — plan general, 16 secciones
- `../investigacion-sms-rac219-bitafly.md` (~394 líneas) — investigación SMS

---

*Actualizado: 2026-08-22*
