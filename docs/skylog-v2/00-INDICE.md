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
| [`12-directivas-maut.md`](12-directivas-maut.md) | **MAUT-1.0-22-006** (Aceptación, P/S/O/E) ✅ · **-004** (MOR/VOR, 12 eventos UAS) ✅ | 299 | 🔄 |
| [`13-herramientas-spi.md`](13-herramientas-spi.md) | **MAUT-1.0-22-005** v02 (SPI) — 11 indicadores oficiales UAS · 9 correcciones · **§9 fórmulas del Excel MAUT-1.0-12-002 verificadas** | 349 | ✅ |
| [`14-listas-verificacion.md`](14-listas-verificacion.md) | **MAUT-5.0-12-095** — lista de verificación del MO, 57 ítems con los que se certifica el CDO-U | 275 | ✅ |
| [`15-evaluacion-sms.md`](15-evaluacion-sms.md) | **MAUT-3.0-12-097** — el instrumento con que la autoridad califica el SMS: 47 ítems, pesos, descriptores P/S/O/E, puntaje sobre 615 | 297 | ✅ |
| [`16-asuntos-complementarios.md`](16-asuntos-complementarios.md) | **MAUT-1.0-22-007** — Ejecutivo Responsable, Comité, GESO, interfases, ERP, currículo SMS | 343 | ✅ |
| [`17-implementacion-sms-uas.md`](17-implementacion-sms-uas.md) | **MAUT-5.0-22-017** — las 4 fases oficiales de implementación, Cultura Justa, plan Gantt | 233 | ✅ |
| [`18-analisis-riesgos-vuelo.md`](18-analisis-riesgos-vuelo.md) | **MAUT-5.0-12-055** — análisis de riesgos por autorización de vuelo · matriz oficial fija · 24 peligros | 243 | ✅ |
| [`19-registros-obligatorios.md`](19-registros-obligatorios.md) | **Qué debe llevar registrado el explotador** — las 29 obligaciones de `100.535` + `MAUT-5.0-22-011`, `-12-090`, `-12-174`, RAC 5. **Tabla de estado actualizada 2026-09-27 (decisión 129) para reflejar V2, no v1** | 152 | ✅ |

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
| [`31-esquema-datos.md`](31-esquema-datos.md) | **Esquema de datos** — tablas por entidad, sobre `30-entidades.md`. C2 dormido, sin tocar | 155 | ✅ |
| `32-migracion.md` | ETL desde la base actual, reglas de precedencia | — | ⬜ |
| [`33-arquitectura.md`](33-arquitectura.md) | Monorepo, servicios, capa de dominio, pruebas | 57 | 🔄 |
| [`34-seguridad.md`](34-seguridad.md) | RLS, multi-tenant, C2 · **falta protección de datos SMS (RAC 219 §219.115-140)** | 89 | 🔄 |
| [`35-frontend.md`](35-frontend.md) | Sistema de diseño, distribución del sidebar, modo campo — **F1 ✅ completo, salvo Aerocivil** (2026-10-01): sidebar réplica de v1 (4 grupos: Operación/Flota & Equipo/SMS/Documentación) + `_components/SectionHero.js` (lenguaje visual moderno, capa 2 sobre `@skylog/ui`) en **todas** las páginas del árbol. Operación ✅, Flota & Equipo ✅, Documentación ✅ (Capacitación, Proveedores, Listas de Chequeo, Reportes, Manuales), **SMS ✅** (las 11 páginas, incluido el restyle de riesgos/indicadores/reportes-y-casos). Único pendiente deliberado: **Expediente Aerocivil (`/aerocivil`, F4a) sigue como utilitario**, excluido a propósito de este cierre. **§3.2 (4 espacios por momento operacional) se construyó y se abandonó** — ver decisiones 98-153 en `51-bitacora.md` | 180 | ✅ |
| [`36-sitemap.md`](36-sitemap.md) | **Sitemap** — 6 espacios + complementos, todo activable · replay multimarca · análisis forense | 183 | ✅ |

## 4 · Módulos

| Doc | Módulo | Líneas | Estado |
|---|---|---|---|
| [`40-sms.md`](40-sms.md) | SMS orientado a evidencia — **F3 completo**: los 11 sub-frentes de §5.9 construidos (gobernanza, objetivos BSC, riesgo/SPI, GAP, SMS alimentado por eventos, reporte mensual, confidencialidad real, MSMS vivo, perfil escalable, mapas) — ver decisiones 137-148 en `51-bitacora.md` | 213 | ✅ |
| [`41-tiempos-servicio.md`](41-tiempos-servicio.md) | Tiempos de servicio, vuelo y descanso (100.540) — **F5 construido y verificado** (motor + esquema/RLS + API + bloqueo real + certificación + planificación), ver decisiones 34-42 en `51-bitacora.md` | 50 | ✅ |
| [`42-comando-control.md`](42-comando-control.md) | C2 en vivo — telemetría + video · **reabierto 2026-10-01** (decisión 156): esquema + `c2-gateway/` + página H5 + panel "Drones en línea" escritos, **nada desplegado ni validado contra hardware real** | 307 | 🔄 |
| [`43-aerocivil.md`](43-aerocivil.md) | Expediente y radicación de autorizaciones — **F4a en construcción**: dominio del análisis de riesgos (MAUT-5.0-12-055) + esquema/RLS + API, ver decisiones 44-45 en `51-bitacora.md` | 77 | 🔄 |

## 5 · Ejecución

| Doc | Contenido | Líneas | Estado |
|---|---|---|---|
| [`50-hoja-de-ruta.md`](50-hoja-de-ruta.md) | **Ciclo de trabajo de seis etapas**, aislamiento, frentes y orden, decisiones cerradas, no-objetivos | 289 | ✅ |
| [`51-bitacora.md`](51-bitacora.md) | **170 decisiones cerradas**, correcciones propias y fuentes consultadas | 268 | ✅ |

**Leyenda**: ✅ completo · 🔄 migrado, pendiente de rehacer bajo el enfoque de reconstrucción · ⬜ no iniciado · ⏸ omitido por ahora

---

## Estado

- **25 documentos**, todos bajo el límite de 500 líneas. El mayor: `21-auditoria-sms.md` (433).
- `plan-bitafly-v2.md` e `investigacion-sms-rac219-bitafly.md` **se eliminaron**: su contenido
  vive repartido aquí. No hay duplicados (regla E1).
- Los marcados 🔄 se escribieron bajo la premisa anterior de *evolución aditiva*. Con la
  autorización de reestructuración total ([`01-reglas.md`](01-reglas.md) §8) deben rehacerse
  desde el problema, no desde lo que existe.

### Documentos normativos pendientes de conseguir

| Documento | Naturaleza | Por qué importa | Prioridad |
|---|---|---|---|
| MAUT-5.0-22-016 "01-23" | Directiva **vinculante** | Criterios de aceptación del **enlace C2** — deja de ser urgente al omitirse C2 (decisión 20); necesario el día que se retome | ⏸ |
| ~~MAUT-5.0-22-014 DI~~ | Directiva vinculante | Dronpuertos — **ya no se necesita** (decisión 28) | — |
| **MIU** | Manual del Inspector UAS | Procedimiento con el que se aplica la lista de verificación | Baja |
| ~~RAC 114~~ | Reglamento | Accidentes e incidentes graves — **el usuario decidió no tocarlo por ahora** (decisión 11) | — |

## Próximos pasos

**Fase 0 cerrada** (decisión 32). **F5 completo** ✅. **F4a** y **F3** construidos como
utilitarios funcionales (F4a sin rediseño visual todavía, a propósito). **F1 ✅ completo,
salvo Aerocivil** (2026-10-01): Operación, Flota & Equipo, Documentación y SMS — las 4
secciones del sidebar — ya usan el mismo lenguaje visual (`SectionHero`/`StatCard`). Ver
[`35-frontend.md §3.7-3.8`](35-frontend.md) para el detalle.

1. **Expediente Aerocivil (`/aerocivil`, F4a)** — único pendiente visual, excluido a
   propósito del cierre de F1 por decisión del usuario. Sigue funcional con el estilo
   mínimo de construcción original.
2. `32-migracion.md` (ETL desde la base de producción, con las reglas de precedencia de
   `people` donde `profiles`/`pilots` ya divergen, P-ES-3) sigue sin escribirse — no bloquea a
   F1, pero es necesario antes de cualquier plan de merge real a `main`.
3. Rehacer `33-arquitectura.md`/`34-seguridad.md` — siguen 🔄, bajo la premisa superada de
   antes de Fase 0.
4. **Backlog más amplio, fuera de F1** (detectado en auditoría 2026-10-01, no bloquea este
   cierre): Replay GPS, Centro de Control, Auditoría de acciones, Vigencias consolidadas,
   ficha de aeronave de 26 atributos, separación Libro de vuelo/Bitácora del piloto,
   Auditoría interna SMS, Calibración/Inventario de existencias y C2 en vivo (⏸ omitido,
   decisión 20) — ninguno estaba en el alcance de F1 (rediseño visual), son brechas de
   contenido de `50-hoja-de-ruta.md §8` y del sitemap (`36-sitemap.md`), pendientes de
   priorizar como frentes propios.

---

*Actualizado: 2026-10-01 (F1 completo salvo Aerocivil — las 4 secciones del sidebar en el mismo lenguaje visual)*
