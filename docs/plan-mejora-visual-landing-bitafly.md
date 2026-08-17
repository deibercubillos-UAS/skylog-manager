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

## Fase 4 — Registro (`src/app/registro/`) `[x] Hecha (2026-08-17)`

- Rediseño visual del formulario de alta (primera pantalla de "producto" real que ve
  alguien a punto de pagar) — layout a dos columnas con imagen/screenshot real al lado
  del formulario en vez de fondo genérico. ✅ El layout de 2 columnas ya existía vía
  `components/AuthSidePanel.js` (compartido con `/login`) — el panel era 100% texto
  (lista de beneficios + un **testimonio ficticio** "Carlos M."). Se agregó el
  screenshot real correspondiente (Reportes para registro — coincide con el mensaje
  "Cumplimiento RAC 100"; Dashboard para login — "Tu flota, bajo control") y se
  **eliminó el testimonio inventado** (no estaba en el alcance original de esta fase,
  pero es el mismo tipo de contenido fabricado que el resto del plan viene corrigiendo
  — dejarlo habría sido inconsistente).
- **Verificado visualmente** con `next dev` en ambos modos (`/login` y `/registro`).

## Fase 5 — Casos de Éxito reales (`lib/caseStudies.js` + `app/casos/`) `[~] Parcial (2026-08-17)`

- Reemplazar 1-2 de las 3 empresas ficticias por los clientes reales confirmados por el
  usuario (nombre real, foto real, testimonio real, con su autorización). **Diferido**
  — el usuario no tenía los datos listos en esta sesión ("omítelos mientras tanto"); se
  retoma cuando los aporte (plantilla de datos necesarios ya solicitada en el chat).
- El/los caso(s) ficticio(s) que queden mientras se consiguen más testimonios reales se
  re-etiquetan honestamente (ej. "Caso ilustrativo") en vez de presentarse como reales
  — no dejar ambigüedad entre lo real y lo ilustrativo. ✅ **Hecho**: los 3 casos de
  `caseStudies.js` ganan `illustrative: true`, mostrado como badge "Caso ilustrativo" en
  `/casos` y "Ilustrativo" + nota aclaratoria en `/casos/[slug]`; copy del hero de
  `/casos` ajustado para no decir "historias reales" mientras no lo sean.
- **Hallazgo adicional corregido, mismo problema de fondo**: la sección "Testimonios"
  del Home (`page.js`) tenía 3 citas atribuidas a un "Cliente Bitafly" genérico (ícono
  de persona + rol/ciudad inventados + 5 estrellas) — ni siquiera venían de
  `caseStudies.js`, eran reseñas fabricadas aparte. Se reemplazó por una sección "Por
  qué Bitafly" con las mismas 3 ideas reformuladas como beneficios de la plataforma, sin
  fingir ser una reseña de un cliente que no existe.
- **Acción pendiente del usuario para completar esta fase**: nombre de la empresa,
  nombre y cargo de la persona, foto (o autorización para tomarla de LinkedIn/redes
  públicas del cliente), testimonio en texto, reto/solución/resultados y autorización
  explícita — para 1-2 de los 3 casos.
- **Verificado**: `next lint` + `npm run build` limpios; verificación visual real con
  `next dev` en `/casos` y en la sección corregida del Home.

## Fase 6 — Páginas SEO satélite `[x] Hecha (2026-08-17, alcance ajustado)`

- Aplicar el sistema de diseño de la Fase 1 y, donde exista un screenshot real
  relevante de la Fase 0, reemplazar la ilustración genérica actual.
- Se agrupan porque comparten la misma estructura de componentes — se ejecutan en lote,
  no una por una.

**Resultado real**: de las 19 páginas públicas que usan `Decor`/`FeatureSpotlight`
(más que las ~17 estimadas al escribir el plan), **14 usan `FeatureSpotlight` con una
sola ilustración SVG** (`components/landing/Illustrations.js`) en un punto de inserción
limpio y uniforme — se procesaron en lote con un script, no una por una:

- **12 páginas con screenshot real que sí coincide con el tema** (`decor="minimal"`
  agregado a cada `FeatureSpotlight`, import no usado de `Illustrations` limpiado):
  `bitacora-digital`, `drone-logbook-colombia` → `bitacora.jpg` · `gestion-flota-drones`
  → `flota.jpg` · `mantenimiento-drones` → `mantenimiento.jpg` · `sms-aeronautico` →
  `seguridad-sms.jpg` · `clima-drones` → `meteorologia.jpg` · `plan-vuelo-drones`,
  `autorizaciones-aerocivil` → `programacion.jpg` (calendario de misiones) ·
  `rac-100`, `reportes-auditoria` → `reportes.jpg` · `replay-gps-drones` →
  `replay-gps-upload.jpg` (limitación ya documentada en la Fase 0: es el modal de
  carga, no el mapa animado) · `operadores-uas` → `dashboard-home.jpg`.
- **2 páginas sin screenshot real disponible — se dejaron con su ilustración SVG
  intacta, a propósito**: `sora` (el wizard SORA no se capturó en la Fase 0) y
  `gestion-pilotos` (la página de Tripulación tampoco se capturó). No se fuerza un
  screenshot que no corresponde al tema solo por completar la lista.
- **5 páginas fuera de este lote, diferidas a propósito**: los 4 `comparativa-bitafly-*`
  y `rac-100-compliance` no usan `FeatureSpotlight` — son páginas de tabla comparativa
  sin un punto de inserción de imagen ya existente; agregar un screenshot ahí requiere
  diseñar una sección nueva por página, no un swap de 1 línea como en las 12 anteriores.
  Queda como trabajo futuro si se pide explícitamente.
- **Verificado**: `next lint` + `npm run build` limpios (mismos 3 warnings
  preexistentes) tras el lote completo; verificación visual real con `next dev` en 3
  páginas representativas (`bitacora-digital`, `mantenimiento-drones`,
  `sms-aeronautico`) — las 9 restantes no se inspeccionaron una por una en navegador
  por ser el mismo cambio mecánico ya verificado, pero si algo se ve mal, avisar.

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
