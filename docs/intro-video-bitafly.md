# Intro de video — BitaFly (prompts para Nano Banana)

> Documento vivo, compañero de `plan-videos-youtube-bitafly.md`. Diseño de la
> cabecera/intro que va al inicio de **todos** los videos de la serie, generada como
> secuencia de imágenes fijas con Nano Banana (Gemini 2.5 Flash Image) y animada
> después en edición (Ken Burns / parallax + transiciones + sonido).

---

## 1. Concepto creativo

**Idea central**: la cámara "vuela" — literalmente, desde la perspectiva de un dron —
sobre un mapa nocturno estilizado de Colombia, atraviesa un aro de escaneo/radar naranja,
y aterriza en la marca BitaFly con su interfaz HUD (heads-up display) característica.
Todo en la paleta real de la marca: navy `#1A202C` de fondo, naranja `#EC5B13` como acento
de energía/tecnología, blanco para texto y líneas finas.

Por qué este concepto:
- **Es honesto con el producto**: BitaFly es software de gestión de vuelo, así que la
  intro simula literalmente una pantalla de telemetría de dron (altitud, batería, GPS,
  líneas de escaneo) — no un genérico "logo que gira".
- **Reutilizable en 4 quemas fijas** que se animan en edición con movimiento de cámara
  simple (zoom/pan), sin necesitar video generativo.
- **Dexa espacio reservado** para el título de cada episodio (bloque 4), así una sola
  intro sirve para los +40 videos del plan sin regenerar nada.

**Narrativa de las 4 tomas** (pensada para ~3-4 segundos de video final cada una,
~12-15 segundos de intro total):

1. **Toma A — Establishing shot aéreo**: vista aérea nocturna estilizada de una ciudad
   colombiana (silueta genérica, no un monumento reconocible específico) vista desde un
   dron en vuelo, líneas de trayectoria de vuelo naranjas trazándose sobre el paisaje.
2. **Toma B — Aro de escaneo**: el dron (visto de cerca, silueta/render limpio, sin
   marca de fabricante) atraviesa un anillo de escaneo tipo radar naranja que se expande
   dejando destellos de HUD (coordenadas GPS, % batería, altímetro) apareciendo y
   desvaneciéndose alrededor.
3. **Toma C — Formación del logo**: las líneas de trayectoria de vuelo del dron se doblan
   y convergen para formar la "B" del isotipo de BitaFly, con un resplandor naranja en el
   trazo final.
4. **Toma D — Cartón de título**: wordmark "BITAFLY" completo centrado + tagline, con un
   bloque inferior vacío/reservado (lower-third) donde en edición se sobrepone el título
   de cada video ("¿Qué es BitaFly?", "Perfil Piloto Independiente", etc.).

---

## 2. Especificaciones técnicas (aplican a las 4 tomas)

| Parámetro | Valor |
|---|---|
| Relación de aspecto | 16:9 horizontal (video YouTube estándar) |
| Resolución sugerida al pedir | "high resolution, 4K, sharp detail" (Nano Banana no acepta px exactos, pero responde a estas señales) |
| Paleta obligatoria | Fondo navy `#1A202C` (a veces con gradiente a `#0F1420` en los bordes) · Acento naranja `#EC5B13` · Blanco `#FFFFFF` para texto/líneas finas · Gris azulado `#4A5568` como color secundario de UI |
| Estilo visual | Ilustración digital limpia estilo "tech/SaaS aeroespacial" — flat design con profundidad sutil (no fotorrealista, no 3D render pesado, no acuarela/pintura) |
| Tipografía de referencia | Geométrica sans-serif, gruesa/black weight, similar a **Lexend** o **Poppins Bold** — mencionar explícitamente "geometric sans-serif font, bold weight, similar to Lexend or Poppins" porque Nano Banana no conoce "Lexend" por nombre en todos los casos |
| Cosas a evitar (negative) | Sin logos de terceros (DJI, otras marcas), sin marcas de agua, sin texto distorsionado o con letras inventadas, sin caras humanas reconocibles, sin exceso de detalle fotorrealista que choque con el resto (flat/vector limpio) |

---

## 3. Prompts — secuencia con continuidad (Nano Banana)

Nano Banana mantiene consistencia de estilo/personaje entre turnos de una misma
conversación cuando se le pide iterar sobre la imagen anterior ("misma escena, ahora
cambia X"). Por eso los 4 prompts están pensados para **pedirse en orden, en la misma
conversación**, no como 4 chats separados — así el dron, la paleta y el estilo no
varían de una toma a otra.

### Prompt 1 — Toma A (establishing shot)

```
Create a cinematic 16:9 digital illustration, flat-design tech/aerospace style
(not photorealistic, not 3D render, clean vector-like shading with subtle depth).

Scene: a stylized night-time aerial view of a generic Latin American city skyline,
seen from a drone flying above it. Deep navy background (#1A202C) fading to near-black
(#0F1420) at the edges. Thin glowing orange (#EC5B13) flight-path lines trace curved
trajectories across the sky above the skyline, like a drone's recorded flight path
overlaid on the scene. Scattered thin white grid lines suggest a HUD (heads-up display)
map overlay, very subtle, low opacity. A few small glowing dots in orange mark waypoints
along the flight path.

Mood: professional, high-tech, calm confidence — like the opening shot of a modern SaaS
product video for a drone operations platform. No text, no logos, no readable signage on
buildings, no recognizable real-world landmarks. No people, no faces. High resolution,
sharp detail, subtle lens vignette at the corners.
```

### Prompt 2 — Toma B (aro de escaneo) — continuación de la 1

```
Now, using the exact same color palette, lighting style and rendering technique as the
previous image, generate a new 16:9 scene: a close-up cinematic shot of a sleek generic
quadcopter drone silhouette (no brand markings, no logos) flying directly toward camera,
passing through an expanding orange (#EC5B13) circular radar/scan ring that glows and
leaves a soft light trail. Around the ring, small glowing HUD data readouts fade in and
out — GPS coordinates, a battery percentage icon, an altitude readout — rendered as thin
white geometric UI elements, not realistic screen text, evoking a flight telemetry
overlay. Background stays deep navy (#1A202C) with a soft radial glow of orange behind
the drone. Same flat-illustration tech style as before, high detail, sharp focus on the
drone silhouette, motion blur only on the outer edges of the scan ring to suggest speed.

No visible brand logos on the drone. No readable text in the HUD elements — abstract
UI shapes only.
```

### Prompt 3 — Toma C (formación del logo) — continuación de la 2

```
Continuing the same style, palette and universe as the previous two images: the orange
(#EC5B13) flight-path light trails from the drone now curve and converge into a single
clean geometric shape — a bold, rounded letter "B" icon, glowing softly, centered on the
deep navy (#1A202C) background. The line work should look like it is actively forming
itself, with the brightest, sharpest glow concentrated at the final stroke where the
shape completes. Faint white grid/HUD lines fade into the background, mostly dissolved.
Minimal, elegant, high-end tech branding aesthetic — similar to a modern SaaS startup's
animated logo reveal. No other text or wording anywhere in the image. No drone visible in
this frame, only the light-trail-formed icon.
```

### Prompt 4 — Toma D (cartón de título final) — continuación de la 3

```
Final frame of the same sequence, same palette and style: a clean brand title card on a
deep navy (#1A202C) background. Centered, the wordmark "BITAFLY" in a bold, geometric
sans-serif font (similar to Lexend or Poppins Bold), white color, with the letter
treatment feeling modern and confident — large and centered in the upper-middle area of
the frame. Directly below it, in a smaller, lighter-weight version of the same font, the
tagline "Gestión de operaciones con drones · RAC 100" in a muted orange (#EC5B13) or
soft gray-blue (#4A5568). The glowing "B" icon from the previous image sits just above
or beside the wordmark, fully formed, as the finished logo mark.

Leave the lower third of the frame (bottom 25-30% of the image) clean and empty — a
subtle darker gradient band with no text or graphic elements — reserved as empty space
where a video-specific title will be overlaid later in video editing. Do not put any
text in that lower band.

High resolution, sharp typography edges, no blur on the text itself, subtle soft glow
around the wordmark only.
```

---

## 4. Instructivo paso a paso

1. **Genera en orden, en una sola conversación** con Nano Banana: pega el Prompt 1,
   espera el resultado, revisa que la paleta/estilo te convenza — si no, pide un ajuste
   ("hazlo más oscuro", "quita el grid de fondo") **antes** de pasar al Prompt 2. Recién
   ahí pega el Prompt 2 en el mismo hilo (así hereda el estilo ya aprobado), y así
   sucesivamente con el 3 y el 4.
2. **Guarda las 4 imágenes** en máxima resolución que entregue la herramienta.
3. **Verifica el bloque inferior vacío** de la Toma D (cartón de título) — es donde vas a
   sobreponer el nombre de cada video en edición; si Nano Banana metió texto ahí, pide
   "regenera solo esta imagen, mismo estilo, pero deja el tercio inferior completamente
   vacío, sin ningún elemento gráfico".
4. **Animación en edición** (Premiere / CapCut / DaVinci / Adobe Express, lo que uses):
   - Toma A: zoom-in lento (Ken Burns) + pan lateral leve, ~3 seg.
   - Toma B: zoom-in rápido hacia el aro de escaneo, con un efecto de "flash" naranja
     breve en el instante en que el dron cruza el aro, ~2-3 seg.
   - Toma C: cross-dissolve desde la Toma B, con un leve "glow pulse" (aumento y
     disminución sutil del brillo del ícono) mientras se forma, ~2 seg.
   - Toma D: fade-in del cartón completo, y ahí insertas una capa de texto editable
     (mismo estilo tipográfico) en el tercio inferior vacío con el título del video
     específico — esta es la única parte que cambia video a video, todo lo demás (tomas
     A-C + el cartón base) se reutiliza intacto en los +40 videos de la serie.
5. **Sonido**: un "whoosh" corto sincronizado con el cruce del aro de escaneo (Toma B) +
   un sting/acorde corto y limpio (no genérico de stock) al aparecer el cartón de título
   (Toma D). Evitar música con letra o muy "gamer" — el tono de marca es profesional y
   cercano, no genérico de canal de entretenimiento.
6. **Duración total objetivo**: 10-15 segundos — coherente con que los videos de
   introducción son cortos (3-5 min) y no se puede "gastar" mucho tiempo en la cabecera;
   para los videos más largos (casos de uso con drones reales) la misma intro sirve sin
   alargarla.

---

## 5. Variante de respaldo (si el concepto principal no convence)

Si al probar el concepto "vuelo + radar + logo" el resultado no queda bien o Nano Banana
tiene dificultad para mantener consistencia entre tomas, alternativa más simple de 2
tomas únicamente:

- **Toma única A'**: pantalla de "tablero de vuelo" (dashboard HUD) estilo interfaz de
  software real — un mockup estilizado (no captura real de la app) de una pantalla de
  telemetría con mapa, gráficas de barras pequeñas y el ícono BitaFly en una esquina,
  como si la cámara "entrara" a la plataforma.
- **Toma única B'**: el mismo cartón de título de la Toma D descrita arriba (se reutiliza
  tal cual, no cambia).

Esta variante es más fácil de lograr en un solo intento porque depende menos de mantener
un dron/personaje consistente entre imágenes — es la opción de menor riesgo si el tiempo
apremia.

---

## Próximo paso

Generar las 4 imágenes con los prompts de la sección 3, revisar aquí qué tan bien
salieron, y decidir si se ajustan los prompts o se pasa directo a animarlas en edición.
