# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Usuario principal para decisiones de diseño**: el Gerente General / dueño de la operación —
quien contrata la plataforma, ve el panorama completo (flota, cumplimiento, finanzas) y decide
adoptarla. Cuando haya tensión entre roles, el diseño prioriza a este usuario.

Otros roles reales, con necesidades distintas entre sí (no descartados, solo no priorizados
por defecto):
- **Jefe de Pilotos** — programación, despacho, disponibilidad de tripulación.
- **Gerente SMS** — responde ante Aerocivil por el sistema de gestión de seguridad operacional;
  usuario principal implícito de los frentes F3 (SMS) y F5 (tiempos de servicio) de esta
  reconstrucción, donde el valor regulatorio es crítico.
- **Piloto en campo** — usa la app en el momento operativo (despacho, cierre de vuelo,
  checklists); prioriza velocidad y claridad sobre paneles analíticos. Necesita un "modo
  campo" (ver `docs/skylog-v2/35-frontend.md`).
- **Socio (escuela/asesor)** — programa de referidos B2B, panel propio (`/socio`). Fuera del
  alcance de esta reconstrucción por ahora (ver `docs/skylog-v2/50-hoja-de-ruta.md` §7).

Situación operativa: explotadores UAS colombianos certificados o en proceso de certificación
ante la Aerocivil (RAC 100 / RAC 219), operando drones para trabajos aéreos especiales
(inspección, agricultura, mapeo, seguridad, etc.), con obligación de demostrar cumplimiento
normativo verificable ante auditoría.

## Product Purpose

**Skylog V2.0** es el nombre interno (confidencial) de la reconstrucción completa de
**BitaFly** — un SaaS de gestión de operaciones con drones para Colombia. El producto en
producción hoy (bitafly.com) sigue operando sin cambios; V2.0 se construye completamente
aparte, en la rama `develop-v2`, con Supabase branch propio, hasta un sign-off explícito del
usuario (`docs/skylog-v2/01-reglas.md` §1, §7).

Qué existe (heredado de v1, sujeto a reconstrucción bajo el mismo problema de negocio):
gestión de flota y baterías, tripulación, bitácora de vuelo, mantenimiento, programación y
despacho, meteorología, replay GPS, evaluación de riesgos SORA, reportes regulatorios en PDF/
Excel, suscripciones (ePayco), multi-organización.

Qué se agrega o rehace en V2.0 (los 5 frentes del plan, `docs/skylog-v2/50-hoja-de-ruta.md`
§4):
- **F5 — Tiempos de servicio, vuelo y descanso** (RAC 100 §100.540): incumplimiento actual de
  norma vigente. Primer frente construido, en progreso.
- **F4 — Autorizaciones Aerocivil**: expediente listo para radicar (F4a) y radicación asistida
  (F4b).
- **F3 — SMS fácil de integrar y aplicar**: sistema orientado a evidencia, no a declaración.
- **F1 — Rediseño de frontend y distribución**: al final del plan, a propósito, para que
  incluya ya el mapa completo de módulos nuevos.
- **F2 — Comando y Control**: omitido por ahora (decisión del usuario, 2026-08-22).

Éxito para esta reconstrucción no es "lo mismo mejor ordenado": es que el sistema **escale sin
que cada campo nuevo cueste tres tablas** (`docs/skylog-v2/01-reglas.md` §8, regla A5).

## Positioning

Plataforma de gestión de operaciones UAS **construida sobre la normativa colombiana vigente**
(RAC 100, RAC 219, directivas MAUT de la Aerocivil), no una plantilla genérica de gestión de
flotas de drones adaptada al mercado local. La diferencia frente a competidores genéricos
(AirData, DroneDesk, GeoDrone, UAV Forecast — ver páginas de comparativa en producción) es que
el sistema **demuestra cumplimiento con evidencia**, no le pide al cliente que lo declare
(`docs/skylog-v2/01-reglas.md` §5, regla S1).

Segunda diferencia estructural, propia de V2.0: la norma se **precarga como plantilla
editable**, nunca se impone como catálogo fijo en el código — el cliente configura sus propios
checklists, currículos e indicadores según su manual, salvo lo que se **radica ante la
autoridad**, que conserva formato exacto (reglas C1–C5, `docs/skylog-v2/01-reglas.md` §5b).

## Operating Context

- Explotadores UAS con **flotas reales** (drones DJI, con integración de importación de logs
  de vuelo) operando bajo autorización RAC 100 — VLOS, EVLOS y, en menor medida, BVLOS.
- Ciclo operativo real: programar misión → evaluar riesgo (SORA) → despachar (checklists de
  salud/inventario/pre-vuelo/briefing) → volar → cerrar vuelo → mantenimiento/reportes.
- Obligación de reportar mensualmente a la Aerocivil (estadística + SPI + MOR) y de conservar
  registros operacionales 5 años, con custodia especial por suceso.
- Multi-organización: una misma cuenta puede pertenecer a más de una organización (refactor
  `organization_members` ya vigente en producción).
- 17 organizaciones clientes reales en producción hoy, con pagos reales vía ePayco —
  restricción dura para cualquier decisión de migración (`docs/skylog-v2/01-reglas.md` §1).

## Capabilities and Constraints

- **Stack confirmado**: Next.js 14 (App Router), Supabase (Postgres + Auth + RLS), Tailwind
  CSS, JavaScript sin TypeScript (no se migra completo). Monorepo en formación: `packages/ui`
  (sistema de diseño, hoy solo tokens placeholder) y `packages/domain` (reglas de negocio
  puras, con Vitest — primer módulo real: `dutyCompliance`, F5).
- **Restricción dura de proceso**: cero migraciones SQL contra producción, ningún archivo que
  sirva una pantalla en funcionamiento se modifica, deploy y dominio separados hasta sign-off.
- **Sin superficie visual propia todavía**: V2.0 no tiene ninguna pantalla construida — F1
  (rediseño) es deliberadamente el último frente. Hoy la autoridad visual incumbente es la UI
  de producción v1 (navy `#1A202C` / naranja `#ec5b13`, componentes `PageHero`/`KPIStrip`/
  `IconTile` ya establecidos — ver `CLAUDE.md` §"Sistema de Diseño").
- **Sin tests de UI ni de las ~181 rutas API** — decisión explícita, fuera de alcance
  (`docs/skylog-v2/50-hoja-de-ruta.md` §7). El mínimo no negociable es Vitest sobre
  `packages/domain`.
- **Terminología normativa** que cualquier superficie debe respetar literalmente: RAC 100,
  RAC 219, SMS (Sistema de Gestión de Seguridad Operacional), SORA, SPI, MOR/VOR, Gerente SMS,
  Jefe de Pilotos, Ejecutivo Responsable.
- **Undecided a propósito**: forma final de la navegación/IA de V2.0 (depende de F1, al final
  del plan); si habrá "modo campo" como tema visual distinto o solo un layout distinto
  (mencionado en `docs/skylog-v2/35-frontend.md`, aún 🔄).

## Brand Commitments

- **Nombre del producto al lanzar**: BitaFly. **Nombre interno de este proyecto, mientras dura
  el desarrollo**: Skylog V2.0 — no se asocia públicamente a BitaFly hasta el lanzamiento
  (`docs/skylog-v2/01-reglas.md` §7, reglas N1/N2). En código, nada de nombres de marca
  acoplados — módulos y rutas se nombran por lo que hacen.
- **Identidad visual heredada de v1** (no es un rebrand, es la base real): naranja `#ec5b13` /
  navy `#1A202C`, tipografía `font-lexend` (headings del landing) y Public Sans (`font-sans`,
  resto). Escalas tonales completas ya definidas en `tailwind.config.mjs`.
- **Guardarraíl de identidad visual activo**: skill `impeccable` instalada para evitar los
  "tells" típicos de interfaz generada por IA (gradiente violeta-azul, Inter por defecto,
  tarjetas anidadas, easing "bounce") que pisarían esta identidad ya definida.

## Evidence on Hand

- `CLAUDE.md` (raíz del repo) — documentación exhaustiva y viva de BitaFly v1 en producción:
  arquitectura, base de datos, cada módulo, cada bug corregido con su causa raíz.
- `docs/skylog-v2/` — 25 documentos de gobierno del propio proyecto V2.0: normativa primaria
  (RAC 100/219, 9 directivas MAUT), auditoría del modelo de datos actual, diseño de entidades,
  hoja de ruta y bitácora de 30+ decisiones cerradas con fecha y motivo.
- Capturas de pantalla reales de la UI de producción (extraídas al construir el grafo de
  conocimiento del repo): dashboard, flota, bitácora, mantenimiento, meteorología, reportes,
  seguridad SMS, suscripción, replay GPS.
- **Ausencia declarada** (regla V1/V3 — no se fabrica): no existe todavía ninguna maqueta,
  wireframe ni decisión visual para V2.0 — cualquier trabajo de diseño nuevo parte de cero
  sobre la identidad heredada, no de un mockup ya aprobado.

## Product Principles

1. **Evidencia, no declaración.** El sistema demuestra cumplimiento normativo; no le pide al
   usuario que lo declare (regla S1).
2. **La norma se precarga, no se impone.** Todo catálogo normativo es plantilla editable,
   nunca texto incrustado en código (regla C1). Lo que se radica ante la autoridad conserva
   formato exacto; lo que vive dentro de la organización es del cliente (reglas C2/C3).
3. **Nada se inventa.** Ni datos operacionales (regla V1) ni una funcionalidad sin evidencia
   real detrás (regla V3) — si algo no existe, la interfaz lo muestra, no lo simula.
4. **Un dato vive en un solo lugar; una acción se pide una sola vez** (reglas E1/E2) — el
   desorden actual de `profiles`/`pilots` divergiendo en producción es la lección fundadora de
   este principio.
5. **Producción nunca se arriesga por diseño.** Ninguna decisión visual o de reestructuración
   toca `main`, la base de datos real ni una pantalla que hoy funciona, hasta sign-off
   explícito del usuario (regla R1–R6).

## Accessibility & Inclusion

Sin estándar de accesibilidad específico establecido formalmente para V2.0 todavía. Contexto
real a tener en cuenta cuando se diseñe (no un requisito confirmado, solo evidencia operativa):
uso en campo, posiblemente bajo luz solar directa, por personal no necesariamente técnico —
razón detrás del "modo campo" ya mencionado en `docs/skylog-v2/35-frontend.md`.
