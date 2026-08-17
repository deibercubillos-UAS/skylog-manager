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

## Fase 0 — Banco de screenshots reales del producto `[x] Hecha (2026-08-17)`

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

**Resultado real**: 9 capturas guardadas en `public/screenshots/` — `dashboard-home.jpg`,
`bitacora.jpg`, `flota.jpg`, `mantenimiento.jpg`, `seguridad-sms.jpg`, `meteorologia.jpg`,
`reportes.jpg`, `programacion.jpg`, `replay-gps-upload.jpg` (esta última es el modal de
subida del replay, no el mapa animado — la QA org no tiene un log `.txt` DJI real cargado
para generar la vista con mapa/telemetría; se necesitaría subir uno real para esa captura
específica).

**Limitación real encontrada, ya resuelta**: la primera pasada de capturas mostró la QA org
con datos escasos (1 aeronave, 0 vuelos del mes, calendario vacío). Se enriqueció la
organización QA con una 2ª aeronave (Mavic 3 Enterprise), 6 vuelos reales repartidos en
agosto 2026 y 3 misiones programadas en la semana en curso — y se recapturaron Dashboard,
Flota, Bitácora y Programación con ese contenido. Las 9 capturas finales en
`public/screenshots/` ya reflejan un flujo de operación creíble (2 aeronaves, 9 vuelos,
5.2h, 6 vuelos este mes, calendario con 3 misiones). Pendiente real: `replay-gps-upload.jpg`
sigue siendo el modal de subida (no el mapa animado) — falta un log `.txt` real de DJI para
generar esa vista; se retoma si el usuario aporta uno.

## Fase 1 — Sistema de diseño: menos repetición, más variación intencional `[x] Hecha (2026-08-17)`

**Objetivo**: que las 28 páginas dejen de sentirse "cortadas con el mismo molde".

- Ampliar `tailwind.config.mjs` con tonos derivados de los 2 colores de marca (navy más
  claro/oscuro, naranja con variantes de saturación) en vez de recurrir siempre a la
  escala genérica `slate-*`/`orange-*`. ✅ Escalas `primary-*`/`navy-*` (50-900) + acento
  nuevo `sky-*` (azul cielo, temática aviación) — `DEFAULT` intacto, cero cambio visual
  todavía (nadie usa los tonos nuevos hasta las Fases 2/6).
- Definir 2-3 "familias" de composición de sección (no todas con glow+dot-grid+ícono):
  ej. secciones con screenshot real a pantalla completa sin decoración, secciones con
  ícono+texto minimalista, secciones con cita/testimonio real. ✅ `Decor.js` gana 2
  variantes nuevas: `"minimal"` (aura muy tenue sin dot-grid, para secciones con
  screenshot real como protagonista) y `"accent"` (usa `sky` en vez de naranja).
- Auditar `Decor.js` y reducir su uso a puntos específicos (hero, algún CTA de cierre)
  en vez de repetirse en cada sección de cada una de las 28 páginas. **Diferido a
  propósito a las Fases 2 y 6** — reducir el uso real en cada página es un cambio de
  contenido por página, no de infraestructura; esta fase solo deja las piezas listas
  (tokens + variantes) para que las Fases 2/6 las apliquen al reconstruir cada página.

## Fase 2 — Home (`src/app/page.js` + `components/landing/*`) `[x] Hecha (2026-08-17)`

- **Hero**: ✅ el Hero real de Home nunca usaba `Hero.js`/la foto de stock (ese componente
  resultó ser código muerto sin importadores — se eliminó). El Hero real vive inline en
  `page.js` y usa `DashboardMockup`, ya corregido abajo.
- **`DashboardMockup.js`**: ✅ reemplazada la recreación dibujada a mano por el screenshot
  real del dashboard (Fase 0) dentro del mismo frame de navegador — mismo efecto visual,
  dato real detrás.
- **`Features.js`**: ✅ implementado como nueva sección "Bitafly en acción" (3 bloques
  `FeatureSpotlight` con screenshot real) insertada después de la grilla de íconos —
  se usó **Meteorología, Reportes y Seguridad SMS** en vez de Replay GPS (la captura de
  Replay GPS disponible es solo el modal de subida, no el mapa animado — ver limitación
  de la Fase 0; se reconsidera si llega un log `.txt` real).
- Reducir densidad de `Decor.js` en la página: ✅ las 3 vitrinas nuevas usan la variante
  `"minimal"` (Fase 1) en vez del `"light"` por defecto, para que la decoración no compita
  con el screenshot.
- **Verificado visualmente** con `next dev` + captura de navegador real (no solo build) —
  las 3 vitrinas y el Hero renderizan correctamente con las imágenes cargando.

## Fase 3 — Precios (`src/app/precios/`) `[x] Hecha (2026-08-17)`

- Reforzar credibilidad con elementos reales (captura real de la pantalla de
  Suscripción, badges de cumplimiento RAC 100 ya existentes) en vez de solo texto.
  ✅ Capturada `suscripcion.jpg` (Fase 0, contra la QA org) y agregada como vitrina
  nueva entre la grilla de precios y el banner ESUAS; fila de badges de confianza
  (RAC 100/2024, AeroCivil·UAEAC, Datos en Colombia, Sin tarjeta para iniciar) agregada
  bajo el toggle Mensual/Anual — mismo patrón `TRUST_BADGES` que ya existía en el
  `Hero.js` eliminado en la Fase 2, reutilizado aquí donde sí aporta.
- **Verificado visualmente** con `next dev` + captura de navegador real.

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
