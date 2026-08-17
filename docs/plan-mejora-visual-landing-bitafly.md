# Plan de Mejora Visual — Landing y Sitio Público — BitaFly

## Objetivo

El landing y las 28 páginas públicas (todo lo que un visitante ve **antes** de crear
cuenta) transmiten un aspecto "genérico / generado por IA": casi no hay fotografía
real, el mockup del dashboard en el Hero está dibujado a mano con `<div>`/SVG en vez de
ser un screenshot real del producto, los "Casos de Éxito" son empresas ficticias con un
ícono genérico de persona, y todo el sitio repite el mismo patrón visual (gradiente
navy/naranja + ícono de Material Symbols + dot-grid decorativo) sección tras sección.
Este plan reemplaza ese material sintético por evidencia real del producto y de
clientes reales, y expande el sistema de diseño para que no todas las secciones se
vean idénticas entre sí.

**Cómo se ejecuta este documento**: cada fase es independiente y verificable por
separado. No se avanza a la siguiente fase hasta que el usuario lo pida explícitamente
("sigue con la Fase X"). Cada fase termina con `next lint` + `npm run build` limpios y
una nota de qué se cambió, siguiendo la misma convención de los demás `docs/plan-*.md`
del proyecto.

**Estado de cada fase**: `[ ] Pendiente` · `[~] En progreso` · `[x] Hecha`

---

## Diagnóstico (auditoría real del código, 2026-08-17)

- **Cero fotografía propia real**: el único `next/image` con foto en toda la landing
  (`components/landing/Hero.js`) carga una foto de stock de Unsplash genérica desde una
  URL externa — no es un dron ni una operación real de BitaFly, y ni siquiera está
  auto-hospedada/optimizada.
- **`components/landing/DashboardMockup.js`** (141 líneas) es una recreación falsa del
  dashboard dibujada a mano en HTML/CSS/SVG, con datos inventados (pilotos ficticios,
  formatos inventados) — no un screenshot real del producto.
- **`components/landing/Decor.js`** (144 líneas) es, por diseño explícito en su propio
  comentario, "100% vectorial, cero imágenes raster" — auras de gradiente + dot-grid +
  líneas topográficas repetidas en cada sección.
- **`components/landing/Illustrations.js`** (546 líneas) es una biblioteca de
  ilustraciones SVG hechas a mano, no fotografía.
- **`lib/caseStudies.js`** (consumido por `app/casos/[slug]/page.js`) contiene 3
  empresas ficticias ("Sky Motion UAS", "AeroVisual Colombia", "AgroDrone del Valle")
  con testimonios inventados; la UI usa el ícono genérico `person` de Material Symbols
  en vez de una foto — confirma que no hay ni un solo cliente real hoy.
- **Sistema de diseño mínimo**: `tailwind.config.mjs` solo declara 2 colores de marca
  (`primary: '#ec5b13'`, `navy: '#1A202C'`) — el resto del sitio usa la escala genérica
  de Tailwind (`slate-*`, `orange-*`) sin tonos propios, lo que aplana visualmente
  cualquier intento de variar una sección de otra.
- **28 páginas públicas** en total (home, precios, registro, 8 SEO por módulo, 5 SEO
  temáticas, 4 comparativas vs. competencia, blog, casos, documentación, tutoriales, 4
  legales) — todas heredan el mismo lenguaje visual repetitivo.
- Material real reutilizable hoy: prácticamente ninguno más allá del logo
  (`public/logo.png`) y `public/og-dashboard.png` (verificar en Fase 0 si es un
  screenshot real aprovechable). `public/next.svg`/`public/vercel.svg` son boilerplate
  sin usar — se eliminan en la fase de limpieza final.

**Confirmado con el usuario antes de escribir este plan**: no hay fotos/video reales de
operaciones/drones/equipo todavía, pero sí hay acceso a una cuenta con datos reales de
producto (screenshots del dashboard) y **1-2 clientes reales** dispuestos a dar
testimonio + foto para Casos de Éxito. Alcance elegido: **rediseño integral** de las 28
páginas públicas, no solo Home/Precios/Registro.

---

## Fase 0 — Banco de screenshots reales del producto

**Objetivo**: reemplazar todo mockup/ilustración falsa del dashboard por capturas
reales, en alta resolución, de los módulos más vendibles del producto.

- Usar la organización de prueba ya existente en producción (`BitaFly QA -
  Organización de Prueba`, con datos de fixture reutilizables — ver auditoría QA
  2026-07-25/26 documentada en `CLAUDE.md`) para capturar, vía navegador, screenshots
  limpios de: Dashboard principal, Bitácora, Replay GPS (el diferenciador más fuerte
  del producto), Flota, Mantenimiento, Seguridad SMS, Reportes PDF, Meteorología.
- Framing consistente: mismo navegador/viewport, mismo tema, recortes a la misma
  relación de aspecto para que encajen en los mismos huecos de layout en distintas
  páginas.
- Guardar en `public/screenshots/` (nuevo), nombrados por módulo
  (`dashboard-home.png`, `replay-gps.png`, etc.), optimizados (WebP donde aplique) para
  no inflar el peso de página.
- **Verificación**: cada screenshot se revisa a ojo antes de usarse (que no muestre
  datos sensibles reales de ninguna organización real — la QA org es sintética a
  propósito para esto).

## Fase 1 — Sistema de diseño: menos repetición, más variación intencional

**Objetivo**: que las 28 páginas dejen de sentirse "cortadas con el mismo molde".

- Ampliar `tailwind.config.mjs` con tonos derivados de los 2 colores de marca (navy más
  claro/oscuro, naranja con variantes de saturación) en vez de recurrir siempre a la
  escala genérica `slate-*`/`orange-*`.
- Definir 2-3 "familias" de composición de sección (no todas con glow+dot-grid+ícono):
  ej. secciones con screenshot real a pantalla completa sin decoración, secciones con
  ícono+texto minimalista, secciones con cita/testimonio real.
- Auditar `Decor.js` y reducir su uso a puntos específicos (hero, algún CTA de cierre)
  en vez de repetirse en cada sección de cada una de las 28 páginas.

## Fase 2 — Home (`src/app/page.js` + `components/landing/*`)

- **Hero**: reemplazar la foto de stock de Unsplash por un screenshot real (Fase 0) o,
  si el usuario aporta una foto real de operación más adelante, esa tiene prioridad.
- **`DashboardMockup.js`**: reemplazar la recreación dibujada a mano por el screenshot
  real del dashboard dentro de un frame de navegador simple (mismo efecto visual, dato
  real detrás).
- **`Features.js`**: alternar tarjetas de ícono+texto con 2-3 bloques que muestren un
  screenshot real del módulo correspondiente (Replay GPS, Reportes, Seguridad SMS).
- Reducir densidad de `Decor.js` en la página según lo definido en Fase 1.

## Fase 3 — Precios (`src/app/precios/`)

- Reforzar credibilidad con elementos reales (captura real de la pantalla de
  Suscripción, badges de cumplimiento RAC 100 ya existentes) en vez de solo texto.

## Fase 4 — Registro (`src/app/registro/`)

- Rediseño visual del formulario de alta (primera pantalla de "producto" real que ve
  alguien a punto de pagar) — layout a dos columnas con imagen/screenshot real al lado
  del formulario en vez de fondo genérico.

## Fase 5 — Casos de Éxito reales (`lib/caseStudies.js` + `app/casos/`)

- Reemplazar 1-2 de las 3 empresas ficticias por los clientes reales confirmados por el
  usuario (nombre real, foto real, testimonio real, con su autorización).
- El/los caso(s) ficticio(s) que queden mientras se consiguen más testimonios reales se
  re-etiquetan honestamente (ej. "Caso ilustrativo") en vez de presentarse como reales
  — no dejar ambigüedad entre lo real y lo ilustrativo.
- **Acción del usuario para esta fase**: nombre de la empresa, nombre y cargo de la
  persona, foto (o autorización para tomarla de LinkedIn/redes públicas del cliente), y
  el testimonio en texto.

## Fase 6 — Páginas SEO satélite (17 páginas: 8 módulo + 5 temáticas + 4 comparativas)

- Aplicar el sistema de diseño de la Fase 1 y, donde exista un screenshot real
  relevante de la Fase 0 (ej. la página de "Replay GPS" usa el screenshot real de
  replay), reemplazar la ilustración genérica actual.
- Se agrupan porque comparten la misma estructura de componentes — se ejecutan en lote,
  no una por una.

## Fase 7 — Limpieza final

- Eliminar `public/next.svg`/`public/vercel.svg` (boilerplate sin usar).
- Confirmar que ninguna imagen externa (Unsplash u otra) sigue cargándose desde fuera
  del propio dominio — todo auto-hospedado vía `next/image`.
- Auditoría final de peso de página (Lighthouse/Core Web Vitals) tras agregar
  screenshots reales, para no sacrificar performance por las nuevas imágenes.

---

## Próximo paso

Antes de tocar código: **Fase 0** requiere que confirmes acceso a la organización QA
(ya existe en producción, solo hace falta que autorices que la use para las capturas)
y, si tienes ya una foto/video real de operación que prefieras usar en el Hero en vez
de un screenshot, compártela para usarla en la Fase 2 en lugar de la foto de stock.
Para la Fase 5, cuando quieras avanzar ahí, necesito los datos del/los cliente(s) real(es)
(nombre, foto, testimonio, autorización).
