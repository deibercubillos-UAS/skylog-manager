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
| [`01-reglas.md`](01-reglas.md) | Reglas de trabajo: producción intocable, documentación, veracidad, datos, SMS, **configurabilidad (C1–C5)**, verificación, nombres, reestructuración | 165 | ✅ |
| `02-glosario.md` | Vocabulario común (entidades, siglas normativas) | — | ⬜ |

## 1 · Normativa

| Doc | Fuente | Líneas | Estado |
|---|---|---|---|
| [`10-rac219-sms.md`](10-rac219-sms.md) | **RAC 219** — Gestión de Seguridad Operacional (vigente, Res. 718/2024) | 199 | ✅ Texto primario |
| [`11-rac100-uas.md`](11-rac100-uas.md) | **RAC 100** — 15 brechas · **los 4 apéndices siguen sin analizar (Apéndice 1 = contenido obligatorio del MO)** | 109 | ✅ Texto primario |
| [`12-directivas-maut.md`](12-directivas-maut.md) | **MAUT-1.0-22-006** (Aceptación, P/S/O/E) ✅ · **-004** (MOR/VOR, 12 eventos UAS) ✅ — referencias a C2/RAC 114 marcadas ⏸/diferidas | 314 | ✅ |
| [`13-herramientas-spi.md`](13-herramientas-spi.md) | **MAUT-1.0-22-005** v02 (SPI) — 11 indicadores oficiales UAS · 9 correcciones · **§9 fórmulas del Excel MAUT-1.0-12-002 verificadas** | 349 | ✅ |
| [`14-listas-verificacion.md`](14-listas-verificacion.md) | **MAUT-5.0-12-095** — lista de verificación del MO, 57 ítems con los que se certifica el CDO-U | 275 | ✅ |
| [`15-evaluacion-sms.md`](15-evaluacion-sms.md) | **MAUT-3.0-12-097** — el instrumento con que la autoridad califica el SMS: 47 ítems, pesos, descriptores P/S/O/E, puntaje sobre 615 | 297 | ✅ |
| [`16-asuntos-complementarios.md`](16-asuntos-complementarios.md) | **MAUT-1.0-22-007** — Ejecutivo Responsable, Comité, GESO, interfases, ERP, currículo SMS | 343 | ✅ |
| [`17-implementacion-sms-uas.md`](17-implementacion-sms-uas.md) | **MAUT-5.0-22-017** — las 4 fases oficiales de implementación, Cultura Justa, plan Gantt | 233 | ✅ |
| [`18-analisis-riesgos-vuelo.md`](18-analisis-riesgos-vuelo.md) | **MAUT-5.0-12-055** — análisis de riesgos por autorización de vuelo · matriz oficial fija · 24 peligros | 243 | ✅ |
| [`19-registros-obligatorios.md`](19-registros-obligatorios.md) | **Qué debe llevar registrado el explotador** — las 29 obligaciones de `100.535` + `MAUT-5.0-22-011`, `-12-090`, `-12-174`, RAC 5 | 149 | ✅ |

## 2 · Diagnóstico del sistema actual

| Doc | Contenido | Líneas | Estado |
|---|---|---|---|
| [`20-auditoria-datos.md`](20-auditoria-datos.md) | Modelo de datos: 84 tablas, 20 vacías, duplicación `profiles`/`pilots` divergente en producción | 217 | ✅ |
| [`21-auditoria-sms.md`](21-auditoria-sms.md) | Cobertura SMS elemento por elemento · 99 % autodeclarado con cero evidencia | 433 | ✅ |
| [`22-infraestructura.md`](22-infraestructura.md) | Proveedores, costos, velocidad de carga | 155 | ✅ |

## 3 · Diseño de Skylog V2.0

| Doc | Contenido | Líneas | Estado |
|---|---|---|---|
| [`30-entidades.md`](30-entidades.md) | **Mapa de entidades reales del negocio** — 7 separaciones estructurales · clasificación declarado/derivado/vigente/evento | 231 | ✅ |
| [`31-esquema-datos.md`](31-esquema-datos.md) | **Esquema de datos** — tablas por entidad, sobre `30-entidades.md`. C2 dormido, sin tocar | 158 | ✅ |
| [`32-migracion.md`](32-migracion.md) | **Reglas de precedencia** para el ETL — corte por organización, conflictos de alto/bajo riesgo | 157 | ✅ |
| [`33-arquitectura.md`](33-arquitectura.md) | **npm workspaces real** (no pnpm/Turbo) · `packages/domain` con Vitest verificado en verde | 104 | ✅ |
| [`34-seguridad.md`](34-seguridad.md) | RLS sobre el esquema nuevo · **protección de datos SMS resuelta** (`219.115-140`) · custodia legal · deuda de seguridad | 87 | ✅ |
| [`35-frontend.md`](35-frontend.md) | Espacios por momento operacional, reconciliados con `36-sitemap.md` | 107 | ✅ |
| [`36-sitemap.md`](36-sitemap.md) | **Sitemap** — 6 espacios + complementos, todo activable · replay multimarca · análisis forense | 183 | ✅ |

## 4 · Módulos

| Doc | Módulo | Líneas | Estado |
|---|---|---|---|
| [`40-sms.md`](40-sms.md) | SMS orientado a evidencia · eventos C2 marcados dormidos · quién reporta/analiza (decisión 10) | 127 | ✅ |
| [`41-tiempos-servicio.md`](41-tiempos-servicio.md) | Tiempos de servicio, vuelo y descanso (100.540) — **1er frente**, esquema listo | 72 | ✅ |
| [`42-comando-control.md`](42-comando-control.md) | C2 en vivo — telemetría + video · **omitido por ahora** (decisión 20) | 307 | ⏸ |
| [`43-aerocivil.md`](43-aerocivil.md) | Expediente y radicación · **matriz de riesgos = formato oficial ya obtenido** (`MAUT-5.0-12-055`) | 87 | ✅ |

## 5 · Ejecución

| Doc | Contenido | Líneas | Estado |
|---|---|---|---|
| [`50-hoja-de-ruta.md`](50-hoja-de-ruta.md) | **Ciclo de trabajo de seis etapas**, aislamiento, frentes y orden, decisiones cerradas, no-objetivos | 289 | ✅ |
| [`51-bitacora.md`](51-bitacora.md) | **19 decisiones cerradas**, correcciones propias y fuentes consultadas | 306 | ✅ |

**Leyenda**: ✅ completo · 🔄 migrado, pendiente de rehacer bajo el enfoque de reconstrucción · ⬜ no iniciado · ⏸ omitido por ahora

---

## Estado

- **28 documentos**, todos bajo el límite de 500 líneas. El mayor: `21-auditoria-sms.md` (433).
- `plan-bitafly-v2.md` e `investigacion-sms-rac219-bitafly.md` **se eliminaron**: su contenido
  vive repartido aquí. No hay duplicados (regla E1).
- **Ningún documento queda marcado 🔄**: los siete que se escribieron bajo la premisa anterior
  de *evolución aditiva* (`33`, `34`, `35`, `40`, `41`, `43`, `12`) ya se rehicieron desde el
  problema, sobre el mapa de entidades ([`30`](30-entidades.md)/[`31`](31-esquema-datos.md)) y
  el sitemap ([`36`](36-sitemap.md)), con la autorización de reestructuración total
  ([`01-reglas.md`](01-reglas.md) §8).

### Documentos normativos pendientes de conseguir

| Documento | Naturaleza | Por qué importa | Prioridad |
|---|---|---|---|
| MAUT-5.0-22-016 "01-23" | Directiva **vinculante** | Criterios de aceptación del **enlace C2** — deja de ser urgente al omitirse C2 (decisión 20); necesario el día que se retome | ⏸ |
| ~~MAUT-5.0-22-014 DI~~ | Directiva vinculante | Dronpuertos — **ya no se necesita** (decisión 28) | — |
| **MIU** | Manual del Inspector UAS | Procedimiento con el que se aplica la lista de verificación | Baja |
| ~~RAC 114~~ | Reglamento | Accidentes e incidentes graves — **el usuario decidió no tocarlo por ahora** (decisión 11) | — |

## Próximos pasos

Etapas ①② del ciclo cerradas, `32-migracion.md` escrito, y **los siete documentos de diseño
rehechos** (`33`, `34`, `35`, `40`, `41`, `43`, `12`) — todo sobre el mapa de entidades y el
sitemap. **Cero documentos en 🔄**: la premisa de evolución aditiva quedó cerrada por completo.

**Supabase Pro comprado + branch `develop-v2` creado (2026-09-05, [`51`](51-bitacora.md)
§11.10)** — cierra §11.6. `project_ref` `bqimtkwzayewwubgsaji`, `FUNCTIONS_DEPLOYED`/
`ACTIVE_HEALTHY`, URL y `anon` key ya obtenidas. **Único pendiente de infraestructura que
queda abierto: §11.7** — configurar en Vercel, scope Preview + branch `develop-v2`, las 3
variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY` — esta última a copiar a mano del panel de Supabase, nunca
expuesta por API). Hallazgo sin resolver y sin bloquear nada: el branch `main` (producción)
muestra `MIGRATIONS_FAILED` desde el 22 de agosto — revisar en el panel cuando haya
oportunidad.

**`dutyCompliance` ya está construido** (F5, `packages/domain` en `develop-v2`, commit
`ec04dcd`, [`51`](51-bitacora.md) §11.9): las 8 reglas de `100.540` de
[`41-tiempos-servicio.md`](41-tiempos-servicio.md) §1.1 como funciones puras, 23 pruebas en
verde. Con la base de datos de desarrollo ya creada, el siguiente paso natural es cablear
este módulo contra `duty_periods`/`flights` reales en cuanto se resuelva §11.7 — o seguir
adelantando módulos de dominio puro mientras tanto (certificación anual de F5,
`duty_annual_certifications`, `100.535(12)`; o el modelo de `risk_analyses`, F4a).

---

*Actualizado: 2026-09-05*
