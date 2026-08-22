# Plan SEO Bitafly — Ranking Colombia

> Objetivo: aparecer en las primeras posiciones para búsquedas de bitácora de vuelo UAS,
> bitácora drones, sistema de gestión de seguridad operacional (SMS), revisión/análisis de
> vuelos, mantenimiento de drones, gestión de flota y términos relacionados.
> Actualizar métricas cada 2 semanas desde Google Search Console.

---

## Reenfoque de estrategia (2026-08)

**Decisión**: dejar de competir por "RAC 100" como término principal/de cabecera. Es un
término dominado por dominios gubernamentales (AeroCivil/UAEAC) — competir de frente contra
una página `.gov.co` por esa keyword exacta es una batalla perdida de antemano para un sitio
comercial.

**Nuevo enfoque**: liderar con términos de producto/funcionalidad, donde Bitafly compite
contra otro software (competencia real y ganable), no contra el gobierno:
- **Bitácora de vuelo UAS / bitácora digital drones** — término de producto, no regulatorio.
- **Sistema de gestión de seguridad operacional (SMS) / SMS drones** — mismo criterio.
- **Revisión de vuelos / análisis de vuelo / replay GPS** — ángulo de "revisa tus vuelos",
  ya bien cubierto por `/replay-gps-drones`.
- **Mantenimiento de drones y baterías** / **gestión de flota de drones** — ya bien
  posicionados, sin cambios grandes necesarios.

**RAC 100 no desaparece**: sigue siendo contenido real y valioso (es la razón de cumplimiento
que trae a muchos usuarios) — se mantiene como **detalle secundario/de apoyo** en cada
página ("también cumple con la RAC 100"), nunca como el título, H1 o frase de apertura. Las
2 páginas dedicadas exclusivamente al tema (`/rac-100`, `/rac-100-compliance`) se dejan
intactas — tiene sentido que existan para quien busca ese término exacto, solo dejan de ser
la punta de lanza de la estrategia general del sitio.

**Páginas ya actualizadas (2026-08)**: Home (`/`), `/bitacora-digital`, `/sms-aeronautico`,
`/drone-logbook-colombia` (título/descripción/H1 reescritos para liderar con el término de
producto, RAC 100 movido a frase de cierre). `/replay-gps-drones`, `/mantenimiento-drones`,
`/gestion-flota-drones`, `/gestion-pilotos`, `/plan-vuelo-drones`, `/operadores-uas`
revisadas — ya lideraban con el término de producto, sin cambios necesarios.

---

## Estado actual del sitio

| Métrica | Valor | Fuente |
|---|---|---|
| SEO técnico Lighthouse | 100/100 | Lighthouse Jun 2026 |
| Performance móvil | 88/100 | Lighthouse Jun 2026 |
| Schema.org implementado | Organization + WebSite + FAQ + Article + BreadcrumbList | Código |
| Sitemap | ✅ `/sitemap.xml` | Next.js |
| Robots.txt | ✅ | Next.js |
| Search Console | ✅ Verificado | Google |

---

## Keywords objetivo — Seguimiento mensual

Actualizar posición cada 2 semanas en Search Console → Rendimiento → Consultas.

| Keyword | Vol. estimado | Competencia | Landing | Posición actual | Meta |
|---|---|---|---|---|---|
| bitácora de vuelo UAS | Medio | Baja | `/bitacora-digital` | — | Top 3 |
| bitácora digital drones colombia | Medio | Baja | `/bitacora-digital` | — | Top 3 |
| sistema de gestión de seguridad operacional | Bajo | Baja | `/sms-aeronautico` | — | Top 3 |
| SMS drones colombia | Bajo | Muy baja | `/sms-aeronautico` | — | Top 1 |
| revisa tus vuelos / análisis de vuelo drone | Bajo | Muy baja | `/replay-gps-drones` | — | Top 3 |
| replay GPS drone colombia | Bajo | Muy baja | `/replay-gps-drones` | — | Top 1 |
| mantenimiento drones colombia | Bajo | Baja | `/mantenimiento-drones` | — | Top 5 |
| gestión flota drones colombia | Bajo | Muy baja | `/gestion-flota-drones` | — | Top 3 |
| software drones colombia | Medio | Baja | `/` | — | Top 3 |
| software gestión de drones | Medio | Baja | `/` | — | Top 3 |
| operadores UAS colombia | Medio | Media | `/operadores-uas` | — | Top 5 |
| gestión de pilotos de drones | Bajo | Baja | `/gestion-pilotos` | — | Top 5 |
| planeación de vuelo drones | Bajo | Baja | `/plan-vuelo-drones` | — | Top 5 |
| autorizaciones aerocivil drones | Bajo | Baja | `/autorizaciones-aerocivil` | — | Top 3 |
| alternativa airdata colombia | Muy bajo | Muy baja | `/comparativa-bitafly-airdata` | — | Top 1 |
| RAC 100 drones colombia *(secundario)* | Medio | Alta (dominios .gov) | `/rac-100` | — | Top 10 |
| software RAC 100 drones *(secundario)* | Bajo | Muy baja | `/rac-100-compliance` | — | Top 3 |
| CDO certificado explotador UAS | Bajo | Muy baja | Blog CDO | — | Top 3 |
| certificado piloto remoto colombia | Bajo | Baja | Blog CPR | — | Top 3 |

---

## Inventario de contenido

### Landing pages SEO (✅ = publicada | 🔴 = pendiente)

URLs verificadas contra las rutas reales del código (`src/app/*/page.js`) el 2026-08 — el
inventario anterior tenía 3 URLs incorrectas, corregidas aquí.

| Landing | URL | Estado |
|---|---|---|
| Home | `/` | ✅ |
| Bitácora de vuelo UAS | `/bitacora-digital` | ✅ |
| SMS Aeronáutico | `/sms-aeronautico` | ✅ *(antes documentada como `/aeronautico`, incorrecta)* |
| Mantenimiento drones | `/mantenimiento-drones` | ✅ |
| Gestión flota drones | `/gestion-flota-drones` | ✅ |
| Gestión de pilotos | `/gestion-pilotos` | ✅ |
| Planeación de vuelo | `/plan-vuelo-drones` | ✅ |
| Replay GPS Drones | `/replay-gps-drones` | ✅ |
| Autorizaciones AeroCivil | `/autorizaciones-aerocivil` | ✅ |
| Operadores UAS | `/operadores-uas` | ✅ |
| Drone Logbook Colombia (EN) | `/drone-logbook-colombia` | ✅ |
| RAC 100 *(secundaria)* | `/rac-100` | ✅ |
| RAC 100 Compliance *(secundaria)* | `/rac-100-compliance` | ✅ |
| Comparativa AirData | `/comparativa-bitafly-airdata` | ✅ |
| Comparativa Dronedesk | `/comparativa-bitafly-dronedesk` | ✅ |
| Comparativa GeoDrone | `/comparativa-bitafly-geodrone` | ✅ |
| Comparativa UAV Forecast | `/comparativa-bitafly-uav-forecast` | ✅ |
| Reportes Auditoría | `/reportes-auditoria` | ✅ |
| Tutoriales en video | `/tutoriales` | ✅ |

**Eliminadas del inventario (no existen como ruta real)**: `/certificacion/explotador-uas`
(nunca existió en el código) y `/como-registrar-drone-aerocivil` como landing dedicada —
ese tema solo vive como artículo de blog (`como-registrar-drone-uaeac-colombia-2025`, ver
abajo), no como landing independiente. Si se quiere una landing propia, es trabajo nuevo,
no algo "pendiente" de una landing que ya se había empezado.

### Blog (14 artículos publicados)

| Artículo | Slug | Categoría | Estado |
|---|---|---|---|
| ¿Qué es la RAC 100? | `rac-100-colombia-operadores-drones` | Normativa | ✅ |
| Bitácora digital F-OPS-002 | `bitacora-digital-drone-f-ops-002` | Operaciones | ✅ |
| Cómo registrar drone UAEAC | `como-registrar-drone-uaeac-colombia-2025` | Trámites | ✅ |
| SMS Aeronáutico RPAS | `sms-aeronautico-operadores-rpas-colombia` | Seguridad | ✅ |
| Análisis SORA | `analisis-sora-operaciones-drones-colombia` | Normativa | ✅ |
| Software gestión drones 2025 | `software-gestion-operadores-drones-colombia-2025` | Herramientas | ✅ |
| Formatos AeroCivil | `formatos-aerocivil-drones-colombia` | Normativa | ✅ |
| Bitafly vs AirData | `bitafly-vs-airdata-uav-colombia` | Herramientas | ✅ |
| Checklist vuelo RAC 100 | `checklist-vuelo-drones-rac-100-colombia` | Operaciones | ✅ |
| Gestión flota drones | `gestion-flota-drones-colombia` | Operaciones | ✅ |
| Replay GPS analizar vuelos | `replay-gps-analizar-vuelos-drone` | Operaciones | ✅ |
| ¿Qué es el CDO? | `cdo-certificado-explotador-uas-colombia` | Trámites | ✅ |
| Mantenimiento preventivo drones | `mantenimiento-preventivo-drones-rac-100` | Operaciones | ✅ |
| Certificado Piloto Remoto CPR | `certificado-piloto-remoto-drones-colombia` | Trámites | ✅ |

---

## Backlinks — Seguimiento

| Fuente | Tipo | Estado | Responsable | Fecha |
|---|---|---|---|---|
| Capterra | Perfil de producto (gratuito) | 🔴 Pendiente crear | Deiber | — |
| G2.com | Perfil de producto (gratuito) | 🔴 Pendiente crear | Deiber | — |
| GetApp | Perfil de producto (gratuito) | 🔴 Pendiente crear | Deiber | — |
| APD Drones (idc.apddrones.com) | Mención en artículo | 🔴 Contactar | Deiber | — |
| Colombia Dron Club | Colaboración contenido | 🔴 Contactar | Deiber | — |
| LinkedIn artículos | Post propio con links | 🔴 Pendiente | Deiber | — |
| Geosysteming.com | Colaboración | 🔴 Contactar | Deiber | — |
| YouTube (@Bitafly) | Serie de tutoriales, ver `/tutoriales` | 🟡 En progreso | Deiber | 2026-08 |

---

## Checklist técnico SEO — Revisión mensual

- [ ] Todas las landings tienen H1 con el término de producto (no RAC 100) como frase principal
- [ ] Todas las landings tienen meta description < 160 chars
- [ ] Internal links entre landings relacionadas
- [ ] Imágenes con alt text descriptivo
- [ ] Schema FAQ en cada landing
- [ ] Velocidad móvil > 85 en Lighthouse
- [ ] Search Console: 0 errores de cobertura
- [ ] Search Console: 0 páginas excluidas por error

---

## Historial de métricas — Search Console

Actualizar cada 2 semanas.

| Fecha | Clics totales | Impresiones | CTR prom | Pos. prom | Keywords en top 10 |
|---|---|---|---|---|---|
| Jun 2026 | — | — | — | — | — |
| Jul 2026 | — | — | — | — | — |
| Ago 2026 | — | — | — | — | — |

---

## Plan de contenido — Próximos artículos

Reenfocado hacia los términos de producto (ver **Reenfoque de estrategia** arriba) — el
contenido puramente regulatorio (RAC 100) se mantiene solo como apoyo, no como prioridad.

| Prioridad | Tema | Keyword principal | Mes |
|---|---|---|---|
| Alta | Bitácora de vuelo UAS: qué es y cómo llevarla digital | bitácora de vuelo UAS | Ago 2026 |
| Alta | Sistema de gestión de seguridad operacional (SMS) para drones: guía práctica | sistema de gestión de seguridad operacional drones | Ago 2026 |
| Media | Cómo revisar y analizar tus vuelos con replay GPS | revisa tus vuelos drone | Sep 2026 |
| Media | Landing `/como-registrar-drone-aerocivil` (aún no existe como landing) | cómo registrar drone aerocivil | Sep 2026 |
| Media | BVLOS Colombia: cómo solicitar autorización | vuelo BVLOS drones colombia | Sep 2026 |
| Baja | Drones agrícolas Colombia: gestión y cumplimiento | drones agricolas colombia regulacion | Oct 2026 |
| Baja | Mejores drones para inspección en Colombia | drones inspeccion colombia | Oct 2026 |
