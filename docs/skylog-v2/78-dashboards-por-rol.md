# 78 · Dashboards por rol (`/inicio` role-aware)

**Estado:** 🔄 En construcción · Inicio 2026-11-25
**Regla de trabajo:** se construye e itera **en local**; **no se sube a `main`** hasta que
el usuario apruebe los dashboards de **todos** los roles (decisión del 2026-11-25).

## 1 · Objetivo

Que `/inicio` muestre un panel **distinto según el rol** de la persona en la organización
activa, enfocado en lo que ese rol debe ver y accionar. Hoy `/inicio` es casi igual para
todos (solo oculta los casos SMS a quien no es Gerente SMS).

## 2 · Decisión de arquitectura

- **Una sola ruta `/inicio`**, no cuatro. La página lee el `role` del contexto de sesión
  (`/api/duty/context`) y **compone** un layout por rol desde una **librería de widgets**
  compartida. Rol nuevo = nueva "receta" (mapa rol→widgets), no una página nueva.
- **Sin duplicar seguridad:** cada bloque respeta la matriz de permisos (`70-matriz-de-permisos.md`)
  y la RLS. No se muestra un KPI/alerta de algo que el rol no puede accionar.
- **Una sola petición liviana:** `/api/inicio/resumen` se vuelve **por rol** — devuelve solo
  los bloques del rol (mantiene la medida de rendimiento ya documentada en `CLAUDE.md`).

## 3 · Principio de diseño (igual para todos los roles)

Cada dashboard responde tres preguntas, en este orden:

1. **¿Cómo vamos?** → fila de 3–4 *StatCards* (KPIs del rol).
2. **¿Qué requiere mi atención hoy?** → **alertas accionables** (cada una enlaza a resolverla).
3. **¿Qué hago ahora?** → **acciones rápidas** + 1–2 paneles (lista o gráfica).

## 4 · Mapa rol → contenido

Roles (de `CLAUDE.md` / matriz): `piloto`, `jefe_pilotos`, `gerente_sms`, `admin` (Gerente General).
`superadmin` es interno (sin dashboard público). `comite` ya tiene su propia "casa" (sección del comité).

### 4.1 · Piloto — *mi operación y mi cumplimiento*
- **KPIs:** Mis horas (90 días) · Mi tiempo de servicio hoy (y si estoy dentro de límites/descanso) · Mis próximas misiones asignadas · Mis certificaciones/capacitaciones por vencer.
- **Atención:** servicio cerca del límite · misión de hoy sin prevuelo/despacho · licencia o capacitación por vencer · reporte SMS sin terminar.
- **Acciones rápidas:** Prevuelo/Despacho · Registrar vuelo · Reportar MOR/VOR · Meteorología de mi zona.
- **Paneles:** mis últimos vuelos · mi semana (misiones).
- **NO ve:** casos SMS de otros · finanzas/plan · KPIs de toda la flota.

### 4.2 · Jefe de Pilotos — *operación de flota y tripulación*
- **KPIs:** Vuelos del mes (+tendencia) · Misiones de la semana/próxima · Aeronaves operativas vs. en mantenimiento · Pilotos en servicio.
- **Atención:** misiones sin PIC · despachos por autorizar · mantenimiento vencido (aeronave/batería) · pilotos excediendo tiempos de servicio · certificaciones de tripulación por vencer.
- **Acciones rápidas:** Programar misión · Autorizar despacho · Asignar PIC · Tiempos de servicio.
- **Paneles:** calendario semanal · estado de flota (aeronaves + baterías) · tabla de tiempos de servicio.

### 4.3 · Gerente SMS — *seguridad operacional (RAC 219)*
- **KPIs:** Reportes abiertos (MOR/VOR) · Casos abiertos · MOR con plazo de radicación IRIS · SPI fuera de meta.
- **Atención:** MOR por radicar (plazo) · reportes sin analizar · acciones correctivas vencidas · objetivos sin avance · comité SRB/SAG pendiente.
- **Acciones rápidas:** Analizar reporte · Abrir caso · Registrar SPI · Nuevo objetivo.
- **Paneles:** bandeja de reportes/casos · SPI vs. meta · plazos críticos.

### 4.4 · Gerente General (`admin`) — *dirección + administración*
- **KPIs:** Vuelos del mes · Cumplimiento global (al día/pendiente) · Flota operativa · Plan (días restantes / uso vs. límite de pilotos).
- **Atención:** suscripción por vencer o pago · límite de pilotos alcanzado · hallazgos críticos (MOR/mantenimiento vencidos) · solicitudes de ingreso por aprobar.
- **Acciones rápidas:** Invitar/gestionar personas · Suscripción · Compliance/Reportes · Organización.
- **Paneles:** salud de la organización (operación+seguridad+flota) · actividad reciente · uso del plan.
- Único rol con **finanzas/plan** y **gestión de miembros**.

## 5 · Librería de widgets

| Widget | Estado | Nota |
|---|---|---|
| `StatCard` | ✅ existe | Reusar (icono, color, label, valor, sub). |
| Gráfica de 6 meses de vuelos | ✅ existe | Reusar para roles operativos. |
| Panel de actividad reciente | ✅ existe | Reusar. |
| `AlertList` | ⬜ crear | Lista de alertas accionables (icono, severidad, texto, enlace). |
| `QuickActions` | ⬜ crear | Rejilla de atajos del rol (icono + etiqueta + href). |
| `MiniPanel` | ⬜ crear | Contenedor de lista/tabla corta (flota, tiempos, bandeja). |

## 6 · Datos / API por rol

`/api/inicio/resumen?organizationId=…` pasa a devolver un objeto `{ role, blocks: {…} }`
con **solo** los bloques del rol. Fuentes por bloque (todas ya existen en el dominio/APIs):

- Piloto: `flights` (propias, `pilot_person_id = yo`), motor de tiempos de servicio (`lib/v2/duty.js`), `missions` asignadas a mí, capacitación/certificaciones (por vencer).
- Jefe de Pilotos: `flights`/`missions` de la org, `dispatches` pendientes, `aircraft`/`batteries` (mantenimiento), `duty_periods` de la tripulación.
- Gerente SMS: `sms_reports`, `sms_cases`, plazos MOR, SPI (`sms_indicators`), objetivos.
- Gerente General: resumen operativo + `subscriptions` (plan/límite) + solicitudes de ingreso + hallazgos de cumplimiento.

## 7 · Plan por fases (puertas de aprobación)

| Fase | Rol | Entregable | Estado |
|---|---|---|---|
| **F0** | Piloto (org) + Piloto independiente | Role-aware + layouts + bloques de API, cableados a `/inicio` | 🔄 Cableado (datos reales), falta QA con login |
| **F1** | Jefe de Pilotos | Layout + bloques, cableado a `/inicio` | 🔄 Cableado (datos reales), falta QA con login |
| **F2** | Gerente SMS | Layout + bloques, cableado a `/inicio` | 🔄 Cableado (datos reales), falta QA con login |
| **F3** | Gerente General | Layout + bloques, cableado a `/inicio` | 🔄 Cableado (datos reales) |
| **F4** | Cierre | QA por rol con cuentas QA, pulido, y **recién entonces** `main` | 🔄 QA de consultas hecho; falta QA con login real + borrar previews |

Cada fase se **muestra en local** y se **aprueba** antes de pasar a la siguiente. No se sube
a `main` hasta terminar **F4** (todos los roles aprobados).

## 8 · Trazabilidad

- 2026-11-25 — Decisión: dashboard **role-aware** (un solo `/inicio`), no 4 rutas. Empezar por **Piloto**. No subir a `main` hasta aprobar todos los roles. (Este documento.)
- 2026-11-25 — **F0 cableado.** Componente presentacional `src/app/(v2)/inicio/_roles/PilotoDashboard.js`; `/inicio` bifurca por rol (si `piloto` → ese panel); `/api/inicio/resumen` devuelve `role` + bloque `piloto` (horas 90 d propias, servicio abierto de `duty_periods`, misiones propias `pic_person_id`, habilitaciones `person_additions` por vencer ≤45 d). **"Servicio hoy"** = tiempo transcurrido del período de servicio abierto; el umbral 8 h se rotula como umbral de descanso (100.540(f)), no como tope. **Pendiente de verificación (Q3):** con la dev DB caída no se pudo probar autenticado; el componente se validó con el **componente real** en `/preview-dashboard` (datos de ejemplo en el contrato real). Falta QA con cuenta de piloto real.
- 2026-11-25 — **Piloto independiente** (columna PI de la matriz): `PilotoIndependienteDashboard.js`, cableado en `/inicio` por `independentPilot`. Bloque `pilotoIndependiente` = lo del piloto + `plan` (de `subscriptions`: nombre y días restantes) + `fleet` (de `aircraft.operational_status` ∈ disponible/en_mantenimiento + conteo de `batteries`). **No lleva SMS** (la matriz PI lo tiene en `—`). No se fabrica "mantenimiento vencido/próximo" (sin fuente confiable). Esquema verificado contra prod. Pendiente QA con login.
- 2026-11-25 — **F1 Jefe de Pilotos cableado.** `JefePilotosDashboard.js` + bloque `jefePilotos` en `/api/inicio/resumen` (solo para rol `jefe_pilotos`): vuelos del mes + tendencia vs. mes anterior (`flights`), misiones de la semana (`missions`, embebe PIC y aeronave por FK), flota (`aircraft.operational_status` + `batteries`), tripulación en servicio (`duty_periods` abiertos; nombre vía mapa de `memberships` porque `duty_periods.person_id` no tiene FK), despachos sin cerrar (`dispatches.status='despachado'`), pilotos excediendo 8 h, certificaciones por vencer. **Honestidad (V/Q3):** `missions.pic_person_id` es NOT NULL → no se inventa "misión sin PIC"; `dispatches` no tiene estado "por autorizar" → se rotula "sin cerrar". Hero generalizado con `highlight` para roles gestores. Pendiente QA con login de jefe de pilotos.
- 2026-11-25 — **F2 Gerente SMS cableado.** `GerenteSmsDashboard.js` + bloque `gerenteSms` en `/api/inicio/resumen` (solo rol `gerente_sms`): reportes por analizar (`analyzed_at` null), casos abiertos (`sms_cases.status≠cerrado`), **MOR por radicar** (`route='mor'` + `filed_at` null), acciones correctivas vencidas (`sms_case_actions.done_at` null & `due_date`<hoy), bandeja de reportes (badge `route` mor/vor/rac114), SPI (`safety_indicators` activos), próximo comité (`sms_committee_meetings.committee` srb/sag + `meeting_date`). **Honestidad:** no se fabrica el plazo IRIS (se usa tiempo transcurrido) ni el veredicto de meta del SPI (vive en el cálculo mensual). Bug corregido: `daysUntil` normaliza fecha/timestamp con `.slice(0,10)`. Pendiente QA con login.
- 2026-11-25 — **F3 Gerente General cableado.** `GerenteGeneralDashboard.js` + bloque `gerenteGeneral` (solo `admin` no independiente): vuelos del mes, flota, **plan** (de `subscriptions` + límites de `planLimits`), **pilotos uso/límite** (el GG no cuenta, CLAUDE.md), **solicitudes de ingreso** (`join_requests.status='pendiente'`, se gestionan en `/flota/tripulacion`), hallazgos críticos (MOR sin radicar, mantenimiento), paneles salud/uso del plan/actividad reciente. Enlaces: Personas→`/flota/tripulacion`, Suscripción→`/suscripcion`, Reportes→`/reportes`, Organización→`/organizacion`.
- 2026-11-25 — **QA de consultas (F4, parcial).** `npm run build` limpio con los 4 roles. Consultas de cada bloque reproducidas contra la org real **BitaFly QA** (`be7bb786`, plan flota) y **QA Piloto Independiente** en prod (solo lectura, sin login): JP (vuelos mes 8/mes previo 1, misiones 3 con PIC+aeronave por FK `aircraft_models`, 1 en servicio, 1 despacho abierto), SMS (1 por analizar, 2 casos, 1 MOR por radicar, SPI/comité vacíos → estados correctos; `event_label` null → cae a "Reporte"), GG (plan flota sin `expires_at` → "Activo" sin alerta, 5/10 pilotos, 0 solicitudes). **Hallazgos:** (1) tendencia con base diminuta daba "+700%" (1 vuelo el mes previo) → se muestra solo con base ≥3 vuelos; (2) **dato, no código:** hay un período de servicio abierto desde el 16-oct (982 h) sin cerrar en la org QA → los paneles lo reflejan fielmente ("Servicio hoy 982 h", "excede 8 h"); el problema es el cierre de períodos, no el dashboard. **Pendiente real:** QA autenticado con cada rol (dev DB caída; no se escriben contraseñas en prod) y borrar los 4 `preview-*` antes de `main`.
- 2026-11-25 — **Rediseño visual** (pedido del usuario + skill ui-ux-pro-max, dirección Minimal/Swiss): widgets compartidos `_roles/widgets.js` (`Hero`, `StatCard`, `AlertList`, `QuickActions`, `Panel`). Paleta de marca BitaFly (navy + naranja `primary`), color de estado solo con significado, affordance clara en lo clickeable (acciones tipo botón con relieve + flecha, CTA naranja), textura de contorno en el hero, y densidad móvil (alertas con "ver más", 3 filas por panel).

## 9 · Relación con otros documentos

- `70-matriz-de-permisos.md` — qué puede ver/accionar cada rol (fuente de verdad para ocultar bloques).
- `35-frontend.md` — sistema de diseño y shell donde vive `/inicio`.
- `41-tiempos-servicio.md` — motor de tiempos de servicio (KPI/alerta del Piloto y del Jefe de Pilotos).
- `40b-sms-formularios-mor-vor.md` — reportes del bloque SMS.
