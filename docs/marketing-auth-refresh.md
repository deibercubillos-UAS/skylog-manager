# Rediseño de marketing y autenticación (2026-09)

Resumen acotado de este PR — cubre únicamente el rediseño visual del sitio
público y de `/login`/`/registro`. No incluye ni depende de la iniciativa
paralela de turnos/SMS/capacitación que se desarrolla en `develop-v2`
(`packages/domain`, rutas `(v2)/`, migraciones de Supabase asociadas).

## Qué cambia

- **`packages/ui`** (nuevo, npm workspace): `Button`, `Field`, `KPIStrip`,
  `PageHero`, `Panel`, iconos — base de diseño compartida para el sitio
  público. Sin dependencia de `packages/domain`.
- **`src/components/bitafly/{PublicHeader,PublicFooter,icons}.js`** (nuevo):
  header/footer compartidos del nuevo sistema visual, usados por las 23
  páginas migradas.
- **23 páginas públicas migradas** de `SEONav`/`SEOFooter` al nuevo sistema:
  12 con rebuild completo (Tailwind + scroll-reveal + fotos reales de stock
  verificadas + capturas reales de producto) y 11 con swap ligero (solo
  header/footer, contenido intacto) — más varios bugs reales corregidos en
  el proceso (enlaces rotos, offsets de layout desactualizados, título
  duplicado por meta tag).
- **`/capacitacion-drones`** (página nueva): describe el módulo real de
  Capacitación (examen calificado + bloqueo de despacho).
- **`/login`, `/registro`, `AuthSidePanel.js`**: rediseño visual completo —
  foto real de fondo, pasos de registro fusionados (Plan+Cuenta en uno),
  validación automática de NIT al unirse a una organización, precio
  reactivo a Mensual/Anual, íconos en los inputs. El backend de pago
  (ePayco) no cambió de lógica, solo el paso del formulario donde se
  dispara.
- **`/preview-bitafly`** (página nueva, no enlazada desde ningún nav de
  producción): rediseño completo del home público, incluida una sección
  "Contáctanos" real conectada a `POST /api/contact` (mismo endpoint que ya
  usa producción). Promoverla a home real es una decisión aparte, pendiente.

## Qué NO incluye este PR (a propósito)

`packages/domain`, las rutas `(v2)/` (turnos, SMS, capacitación interna,
aerocivil), sus ~25 API routes, y las migraciones de Supabase de esa
iniciativa — todo eso vive solo en `develop-v2`, sin relación de código con
este rediseño.

## Verificación

`npx next lint` limpio (mismos 3 warnings preexistentes del proyecto). Sin
migraciones de base de datos ni variables de entorno nuevas. Flujo de pago
de `/registro` verificado visualmente paso a paso con Playwright antes de
mergear — recomendado repetir una prueba end-to-end real (plan pagado) en
un entorno de staging antes de promover a producción.
