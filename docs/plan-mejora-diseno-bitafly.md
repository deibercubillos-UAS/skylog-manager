# Plan: Mejora de Diseño BitaFly (Claude Design → Producción)

> Documento de control. Se actualiza al cerrar cada fase. Mantener < 500 líneas.
> Origen: proyecto Claude Design `0e64e44f-c239-441d-9559-9a7a0ebf68f7`, exportado como
> ZIP (`Mejora_de_diseño_Bitafly_1.zip`) el 2026-07-01. Contiene 22 pantallas de dashboard
> (`.dc.html`), sistema de diseño (`_ds/`), 40 screenshots y 10 landing pages + assets de marca.
> Última actualización: 2026-07-01 · Estado: DISEÑO (sin ejecutar — en revisión del usuario)
>
> **Decisión de alcance confirmada**: Fase 5 entra completa **excepto (f) Mapas de
> restricción**, que queda fuera de este proyecto por alcance indefinido. Falta confirmar
> el orden/arranque de ejecución de las Fases 0-4 — no se ha tocado código todavía.

## Convención de estado

⬜ Pendiente · 🔄 En progreso · ✅ Completada · ⏭️ Omitida · ⚠️ Bloqueada / requiere decisión

---

## 0. Hallazgo principal

**Esto NO es un rebrand.** Los tokens del sistema de diseño (`--color-primary: #ec5b13`,
`--color-navy: #1A202C`) son **exactamente** los que ya existen en `tailwind.config.mjs`.
El diseño es un **refinamiento de UI** sobre la misma identidad: agrupación de navegación,
un patrón de "hero banner" navy por página, tiras de KPI reutilizadas en todos los módulos,
y tablas/tarjetas más limpias. La mayoría del trabajo es **frontend puro** (JSX/Tailwind),
reutilizando datos y endpoints que ya existen.

Sin embargo, **6 pantallas del mockup insinúan funcionalidad que hoy no existe** (no es
restyle, es feature nueva con backend/Supabase real). Están aisladas en la Fase 5 y
**no se deben ejecutar sin confirmación explícita de alcance**, porque cada una es su
propio mini-proyecto.

---

## Principios de ejecución (no afectar producción)

1. **Fases 0–4 = solo estructura/estilo.** Ningún cambio de lógica de negocio, queries,
   RLS o permisos — mismos `href`, mismos `roles`, mismos datos. Riesgo bajo.
2. **Un PR pequeño por módulo/pantalla**, no un PR gigante de 22 pantallas. Cada uno debe
   poder revisarse y revertirse solo.
3. **Deploy preview de Vercel por PR** — QA visual + funcional (crear/editar/eliminar sigue
   funcionando) antes de merge a main. Usar el skill `/verify` o `/run` para probar en
   navegador antes de dar por cerrada cada tarea.
4. **No tocar la lógica de roles/planes** (`PERMISSIONS`, `navLinks.roles`, `pilotHidden`,
   `pilotOnly`) al reagrupar el sidebar — solo el layout visual del `<nav>`.
5. **Fase 5 = features nuevas**, cada una con su propio PR, su propia migración (si aplica)
   y su propio QA — no se agrupan con el restyle.

---

## Fase 0 — Preparación (sin cambios visibles) ⬜

- [ ] 0.1 Confirmar que no hace falta migrar `tailwind.config.mjs` (colores ya coinciden).
      Extender solo si se usan variantes nuevas de radio (28px en `.card` del sistema vs.
      `rounded-3xl`/`rounded-[2rem]` actuales — son casi iguales, verificar caso a caso).
- [ ] 0.2 Confirmar el set de iconos: el diseño usa Material Symbols Outlined (mismo que
      ya usa la app vía `<span class="material-symbols-outlined">`). Revisar si aparecen
      iconos nuevos no cargados en el `<link>`/CDN actual (ej. `partly_cloudy_day` para
      Meteorología) y añadirlos al subset cargado.
- [ ] 0.3 Crear rama de trabajo (ej. `design/bitafly-refresh`), commits pequeños por tarea.
- [ ] 0.4 Capturar screenshots "antes" de cada página actual con Playwright (ya preinstalado
      en este entorno) para comparación QA por módulo.

---

## Fase 1 — Shell compartido: Sidebar + Header ⬜

Mayor impacto visual, menor riesgo funcional — un solo archivo (`src/app/dashboard/layout.js`).

- [ ] 1.1 Reagrupar `navLinks` visualmente en 4 secciones con encabezado uppercase:
      **Operación** (Dashboard, Bitácora, Programación, Meteorología) ·
      **Flota & Equipo** (Flota, Baterías, Mantenimiento, Tripulación) ·
      **Cumplimiento** (Seguridad SMS, Auditoría, Reportes, Protocolos) ·
      **Cuenta** (Mi Perfil, Organización, Suscripción).
      ⚠️ Solo agrupación visual — el array `navLinks` y su filtrado por `role`/`plan`
      (`filteredLinks`) no cambian de comportamiento, solo se renderiza por grupos.
- [ ] 1.2 Reemplazar el "BLOQUE DE ESTATUS" (Plan/NIT) por: tarjeta de usuario al pie
      (avatar + nombre + rol, ya existe la data en `data.profile`) + widget
      "Plan {plan} / Mejorar" que enlaza a `/dashboard/subscription` (ocultar si ya es
      Enterprise).
- [ ] 1.3 Header: agregar input de búsqueda visual (`Buscar misión, aeronave, piloto...`)
      **sin funcionalidad todavía** — placeholder estático. La funcionalidad real es 5.e.
- [ ] 1.4 QA con los 5 roles (admin, jefe_pilotos, gerente_sms, piloto, piloto
      independiente) + período de gracia: el menú filtrado debe verse igual en contenido,
      solo cambia la agrupación visual.

---

## Fase 2 — Componentes compartidos nuevos ⬜

- [ ] 2.1 Crear `components/PageHero.js`: banner navy redondeado con overline (módulo),
      título, descripción, y slot derecho para métrica rápida + botón CTA primario.
      Props: `{ eyebrow, title, description, metric, cta }`. Reemplaza los `<header>`
      simples que hoy tiene cada página.
- [ ] 2.2 Promover el patrón `KPICard` de `DashboardClient.js` a `components/KPIStrip.js`
      reutilizable (icon, label, value, trend opcional) — hoy solo vive en el dashboard
      home, el diseño lo repite en Flota, Bitácora, Programación, Baterías, Mantenimiento,
      Tripulación, Seguridad SMS, Auditoría.
- [ ] 2.3 Ajustar radios/paddings de `AircraftCard`, `BatteryCard`, tarjetas de piloto al
      patrón `icon-tile` (64px, radio 18px, fondo `orange-50`) del sistema de diseño.

---

## Fase 3 — Restyle módulo por módulo (bajo riesgo) ⬜

Para cada ítem: envolver con `PageHero` + `KPIStrip` (Fase 2) y ajustar tablas/tarjetas al
nuevo look. **Sin tocar queries, endpoints ni validaciones.** Un PR por ítem.

- [ ] 3.1 Dashboard (home) — `DashboardClient.js`
- [ ] 3.2 Mi Flota — `dashboard/fleet/page.js`
- [ ] 3.3 Bitácora — `dashboard/logbook/`
- [ ] 3.4 Tripulación — `dashboard/pilots/`
- [ ] 3.5 Mantenimiento — `dashboard/maintenance/`
- [ ] 3.6 Seguridad SMS / SORA / VOR-MOR — `dashboard/safety/`, `dashboard/sora/`
- [ ] 3.7 Reportes — `dashboard/reports/`
- [ ] 3.8 Protocolos (Listas de Chequeo) — `dashboard/settings/forms/`
- [ ] 3.9 Mi Perfil — `dashboard/settings/profile/`
- [ ] 3.10 Organización — `dashboard/settings/`
- [ ] 3.11 Suscripción (solo visual — sin historial de facturación, eso es 5.d) —
      `dashboard/subscription/page.js`
- [ ] 3.12 Programación (vista lista actual, restyle únicamente — el calendario semanal
      es 5.c) — `dashboard/authorizations/`

Checklist QA por tarea: la página carga, filtros/búsqueda existentes siguen funcionando,
crear/editar/eliminar sigue funcionando, responsive mobile no se rompe (bottom nav).

---

## Fase 4 — Nuevas rutas de primer nivel (extracción, sin lógica nueva) ⬜

- [ ] 4.1 **Baterías como ruta propia** `/dashboard/batteries` (hoy vive embebida en
      `/dashboard/fleet`). Nuevo ítem de sidebar bajo "Flota & Equipo".
      - Backend: la columna "Aeronave asignada" del mockup **no es un campo nuevo** —
        el propio diseño lo aclara ("se infiere automáticamente del último vuelo cargado
        en la Bitácora"). Extender `GET` de baterías para incluir, por batería, la
        aeronave del `battery_logs` más reciente (subquery/`DISTINCT ON` por
        `battery_sn`, no requiere migración de esquema).
- [ ] 4.2 **Meteorología como página propia** `/dashboard/weather` (hoy es solo un widget
      contextual embebido). Reutiliza `/api/weather/current` y `WeatherWidget` ya
      existentes — sin backend nuevo. Nuevo ítem de sidebar bajo "Operación".

---

## Fase 5 — Funcionalidades nuevas ⚠️ (requieren decisión de alcance antes de empezar)

Estas 6 pantallas del mockup describen comportamiento que **no existe hoy en el código**.
No son "mejorar el aspecto" — son productos nuevos. Decide cuáles entran y cuáles se
descartan/posponen antes de que las implemente.

### a) Auditoría real (registro de acciones) ⚠️ mayor esfuerzo
La página actual `/dashboard/audit` es un **dashboard de cumplimiento** (aeronavegabilidad
de flota + vigencia de documentos de tripulación) — ver `src/app/dashboard/audit/page.js`.
El mockup nuevo pide una tabla **"Usuario / Acción / Módulo / Fecha y hora / Tipo"** con
export CSV — un log de auditoría de acciones de usuario, que **no existe en ninguna tabla
actual** (no hay `audit_log` en las migraciones).
- Backend: nueva tabla `audit_log` (Supabase) + helper `logAudit()` centralizado +
  instrumentación en las API routes relevantes (fleet, pilots, flights, maintenance,
  protocolos...). RLS: solo managers leen.
- Decisión pendiente: ¿reemplaza la página actual de cumplimiento, o convive como pestaña
  aparte? ¿Qué acciones se registran y con qué retención?
- Estimado: 3–5 días.

### b) Conflictos de horario en "Nueva Misión" ⬜ esfuerzo bajo-medio
El mockup valida en vivo si un piloto ya tiene misión asignada en el mismo horario.
- Backend: query adicional contra `flight_authorizations` por `pic_id` + solape de fecha/hora,
  en `POST /api/flights/authorize` (y/o validación en vivo al seleccionar piloto en el form).
  No requiere migración.
- Estimado: 0.5–1 día.

### c) Vista calendario (semana/mes) en Programación ⬜ esfuerzo medio, solo frontend
Hoy `MissionControlClient.js` es una vista simple; el mockup usa una grilla semanal tipo
calendario (pestañas Semana/Mes/Lista). Los datos ya existen en `flight_authorizations` —
es un componente de calendario nuevo, no trivial, pero sin backend nuevo.
- Estimado: 1–2 días.

### d) Historial de facturación en Suscripción ⚠️ implica decisión legal/fiscal
No existe hoy tabla ni endpoint de historial de pagos/facturas.
- Backend: registrar cada pago exitoso del webhook de ePayco en una tabla local
  `billing_history` (`ref_payco`, monto, fecha, estado) y generar el comprobante en PDF
  (el proyecto ya genera PDFs para otros módulos).
- ⚠️ Definir si es una "factura" con validez fiscal (implicación DIAN/facturación
  electrónica) o un comprobante informativo — esto cambia el esfuerzo significativamente.
- Estimado: 1–2 días (comprobante informativo) · mucho mayor si debe ser factura electrónica real.

### e) Búsqueda global en el header ⬜ esfuerzo bajo-medio
"Buscar misión, aeronave, piloto..." visible en el header de todas las pantallas del mockup.
- Backend: nuevo endpoint `GET /api/search?q=` con `getOrgContext()`, `ilike` sobre
  `flights`/`aircraft`/`pilots` acotado a `organization_id`. Sin migración.
- Estimado: ~1 día.

### f) "Mapas de restricción" en Seguridad SMS ⏭️ FUERA DE ALCANCE (confirmado)
No existe ninguna funcionalidad de zonas restringidas/geofencing en el proyecto hoy.
- Antes de estimar hace falta definir el alcance: ¿zonas propias del operador dibujadas en
  mapa, restricciones oficiales de AeroCivil, o ambas? ¿Se cruza con el módulo de
  Planeación de Vuelo existente (`FlightPlanner.js`)?
- Recomendación: tratar como iniciativa aparte, fuera de este proyecto de mejora visual,
  hasta tener claridad de producto.

---

## Fase 6 — Landing pages y assets de marca (opcional, fuera del dashboard) ⬜

El bundle también trae 10 landing pages nuevas (`landing-pages/*.html`: home, RAC 100,
bitácora digital, mantenimiento, SMS, autorizaciones AeroCivil, gestión de flota,
operadores UAS, reportes de auditoría, precios), más "Certificado DJI", "Cotización
Oficial", "Hoja Membretada" y "Plantilla de Cursos". Esto vive en `src/app/page.js` y
material de marketing/ventas, **no en el dashboard operativo**. No lo incluyo en el plan
de ejecución salvo que se pida explícitamente — es un proyecto independiente con su propio
alcance (SEO, copy, potencialmente nuevas rutas públicas).

---

## Tabla resumen — ¿qué requiere qué?

| Cambio | Frontend | Backend/API | Supabase (schema) | Cloudflare R2 |
|---|---|---|---|---|
| Sidebar agrupado + widgets (F1) | ✅ | – | – | – |
| PageHero + KPIStrip (F2) | ✅ | – | – | – |
| Restyle cards/tablas por módulo (F3) | ✅ | – | – | – |
| Baterías como ruta propia (F4.1) | ✅ | ✅ query derivada | – | – |
| Meteorología standalone (F4.2) | ✅ | reutiliza existente | – | – |
| Auditoría real (F5.a) | ✅ | ✅ | ✅ tabla nueva + RLS | – |
| Conflictos de horario (F5.b) | ✅ | ✅ | – | – |
| Calendario Programación (F5.c) | ✅ | – | – | – |
| Historial de facturación (F5.d) | ✅ | ✅ | ✅ tabla nueva | posible (PDFs) |
| Búsqueda global (F5.e) | ✅ | ✅ endpoint nuevo | – | – |
| Mapas de restricción (F5.f) | ❓ | ❓ | ❓ | ❓ |
| Landing pages (F6) | ✅ | – | – | – |

**Nada de esto requiere cambios en Cloudflare** (buckets R2 actuales) salvo si se decide
generar/almacenar PDFs de factura (5.d), que reutilizarían el patrón existente de
`maintenance-docs`/`company-manuals`.

---

## Próximos pasos

1. Confirmar si Fases 0–4 (restyle, ~4 semanas de trabajo incremental en PRs pequeños)
   se ejecutan tal cual, en ese orden.
2. Decidir, ítem por ítem, cuáles de la Fase 5 (a–f) entran en alcance ahora, cuáles se
   posponen y cuáles se descartan.
3. Decidir si Fase 6 (landing pages) es un proyecto aparte o se agenda después.
