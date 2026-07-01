# BitaFly — Brief de Marca y Producto para IA Generativa
> Documento de referencia para alimentar a otra IA (generación de imágenes, diseño de pauta publicitaria, creativos de campaña).
> Complementa a [`bitafly-product-brief.md`](./bitafly-product-brief.md) (funcionamiento detallado) — este documento se enfoca en **identidad visual + resumen funcional + tono**, todo lo necesario para que una IA de imágenes/diseño produzca piezas coherentes con la marca sin acceso al código.
> Versión: julio 2026.

---

## 1. Resumen ejecutivo (para dar contexto rápido a una IA)

**BitaFly** es un SaaS colombiano B2B que digitaliza la operación de drones bajo la norma **RAC 100** (Aerocivil/UAEAC): planeación de vuelo, autorización de misiones, bitácora, mantenimiento de flota, expedientes de pilotos, reportes de seguridad (SMS/SORA/VOR/MOR) y manuales corporativos — todo en una sola plataforma web + app Android nativa para el controlador **DJI RC Plus**.

- **Categoría**: SaaS B2B de gestión operativa (vertical: aviación no tripulada / drones).
- **Mercado**: Colombia. Empresas operadoras de drones (topografía, agro, inspección, filmación, seguridad), escuelas de formación UAS certificadas, pilotos independientes.
- **Personalidad de marca**: seria pero no burocrática. Confiable, técnica, precisa — pero moderna y ágil, no "gobierno/trámite". Es la herramienta que reemplaza el Excel y el papel de un operador de drones profesional.
- **Diferenciador clave**: cumplimiento normativo RAC 100 nativo (no genérico ni importado de otro país) + integración directa con el hardware que ya usa el piloto (controlador DJI, logs de vuelo).

---

## 2. Paleta de colores (valores exactos del código en producción)

| Rol | Hex | Uso |
|---|---|---|
| **Primario / marca** | `#EC5B13` (naranja) | Logo, CTA principal, acentos de marca, elemento de máximo impacto. **Un solo acento naranja por composición** — no repartirlo en múltiples elementos secundarios. |
| **Hover del primario** | `#EA580C` / `#C2410C` | Estados de interacción, no para composición estática. |
| **Secundario oscuro** | `#1A202C` (slate/navy casi negro) | Fondos de contraste, sidebar, superficies "premium"/oscuras, texto de alto contraste. |
| **Fondo neutro** | `#F8F6F6` / `#F7F8FA` | Fondo general de la app — casi blanco, cálido, no blanco puro. |
| **Superficie card** | `#FFFFFF` | Tarjetas y paneles sobre el fondo neutro. |
| **Texto secundario** | Slate `#64748B` / `#94A3B8` | Labels, metadatos, texto de apoyo. |
| **Éxito / positivo** | Esmeralda `#10B981` / `#059669` | Estados "OK", tendencias positivas, aprobado. |
| **Alerta / crítico** | Rojo `#EF4444` / Ámbar `#F59E0B` | Alertas de mantenimiento, vencimientos, advertencias — nunca decorativo. |

**Gradiente de marca** (usado en detalles puntuales, no como fondo masivo):
`linear-gradient(90deg, #EC5B13 0%, #F97316 40%, #EC5B13 60%, #C2410C 100%)`

**Regla de uso para creativos**: el naranja es el "hero" — debe usarse en el elemento que debe atraer la mirada primero (logo, CTA, un solo dato destacado). El resto de la composición vive en slate oscuro (`#1A202C`) sobre fondo claro (`#F8F6F6`), con blanco para las superficies. Evitar mezclar el naranja de marca con otros colores vibrantes/saturados — la paleta es intencionalmente acotada (naranja + slate + neutros + semánticos de estado).

---

## 3. Tipografía

| Uso | Fuente | Notas |
|---|---|---|
| **Cuerpo / UI general** | **Public Sans** (Google Fonts) | Fuente por defecto de toda la interfaz. Humanista, geométrica, muy legible en pantalla — sensación "gobierno digital moderno" (es la fuente del US Web Design System), encaja con el carácter regulatorio/técnico del producto sin ser fría. |
| **Headings landing / marketing** | **Lexend** | Solo se usa debajo del pliegue en landing, pricing, features — nunca en la app operativa. Da un toque más "producto/marca" a piezas de marketing. |
| **Iconografía** | **Material Symbols Outlined** (auto-alojada) | Estilo de línea, no relleno. Todos los íconos de la UI son de esta familia — para creativos que necesiten íconos, mantener el estilo *outline*, nunca *filled* ni emoji. |

**Peso y tratamiento tipográfico en la UI real**: la interfaz actual usa `font-black` (900) + `uppercase` + `tracking-widest` de forma extendida (labels, botones, badges). Para piezas de marketing/campaña **no replicar ese extremo** — funciona en UI densa de dashboard pero en un anuncio se ve "gritado". Para creativos externos, usar como referencia una jerarquía más moderada: un solo elemento en peso muy alto (titular/hero number) y el resto en peso regular/medio.

---

## 4. Lenguaje visual de la interfaz (para mantener coherencia si el anuncio muestra "screenshots" del producto)

- **Radios de esquina**: entre `12px` y `24px` (cards grandes hasta `2.5rem`/40px en paneles hero). Todo redondeado, nunca esquinas vivas.
- **Sombras**: sutiles (`shadow-sm`), profundidad discreta — no flat total, pero tampoco skeumórfico/neumórfico pesado.
- **Superficie oscura como "hero"**: los paneles de mayor jerarquía (KPI principal, compliance) usan fondo `#1A202C` sólido con texto blanco y un acento naranja — este contraste oscuro-sobre-claro es el recurso visual más reconocible del producto.
- **Estilo de iconografía UI**: Material Symbols Outlined, trazo fino, nunca ilustraciones 3D ni emoji.
- **Contexto de uso real**: la app se usa en computador de oficina Y en la pantalla táctil de 7" de un **controlador DJI RC Plus** en campo — es válido mostrar el producto en ese contexto (dron + controlador con pantalla) para comunicar "hecho para pilotos reales, no solo oficina".

---

## 5. Dirección fotográfica / imaginería sugerida

**Sí mostrar:**
- Drones profesionales/comerciales en operación real (DJI Matrice, Mavic, Air, Inspire — modelos de uso profesional, no drones de juguete/consumo).
- Pilotos con equipo de protección/uniforme operativo, controlador DJI RC Plus en mano, en exteriores (campo, ciudad, infraestructura, cultivos) — contextos colombianos (paisaje andino, cultivos, obra civil, zonas urbanas).
- Escenas de trabajo técnico real: inspección de torres/infraestructura, agricultura de precisión, topografía, seguridad — nunca "stock genérico de dron de hobby volando en playa al atardecer".
- Interfaces del producto mostradas en dispositivos reales (laptop, tablet/RC Plus) integradas naturalmente en la escena, no como mockup flotante genérico.
- Paletas de foto con tonos cálidos/tierra (coherentes con el naranja de marca) o cielos despejados donde el naranja de marca pueda superponerse como acento gráfico.

**Evitar:**
- Drones de consumo/juguete, o dron genérico de stock sin marca reconocible de uso profesional.
- Estética "startup genérica de Silicon Valley" (oficinas open-space con gente sonriendo a una laptop sin contexto de la operación real).
- Colores vibrantes fuera de la paleta (neón, pasteles, multicolor) — rompe la seriedad técnica del producto.
- Iconografía 3D, ilustraciones cartoon, o emoji como elementos gráficos.
- Cualquier imagen que sugiera uso recreativo/hobby del drone — el producto es para **operación profesional regulada**.

---

## 6. Tono de voz y mensajes clave

- **Tono**: directo, técnico-pero-claro, en español de Colombia. Confiado sin ser arrogante. Habla como un colega que conoce la norma RAC 100 de memoria, no como un vendedor.
- **Evitar**: anglicismos innecesarios, superlativos vacíos ("la mejor plataforma del mundo"), jerga de startup genérica ("revoluciona tu negocio").
- **Mensajes clave que funcionan como titulares de campaña**:
  - "Tu operación de drones, cumpliendo RAC 100 sin hojas de cálculo."
  - "De la bitácora en papel al reporte que le sirve a la Aerocivil."
  - "Todo lo que exige la UAEAC, en una sola plataforma."
  - "Hecho para el piloto que vuela en campo, no solo para quien firma en la oficina."
  - "Tu flota, tu tripulación, tu cumplimiento normativo — en un solo lugar."
- **Prueba social relevante**: escuelas de formación UAS certificadas ya usan la plataforma para sus estudiantes (programa de socios); esto es útil como ángulo de "avalado por quienes forman pilotos".

---

## 7. Público objetivo por segmento (para segmentar creativos/pauta)

| Segmento | Dolor principal | Ángulo de mensaje |
|---|---|---|
| **Empresa operadora** (topografía, agro, inspección, filmación, seguridad) | Gestión dispersa en Excel/papel, riesgo de auditoría RAC 100 fallida | Control centralizado, evidencia lista para auditoría |
| **Escuela de formación UAS** | Necesita dar seguimiento a decenas de estudiantes/pilotos en formación | Panel de socio, regalo de períodos de prueba, comisiones |
| **Piloto independiente/freelance** | No tiene sistema formal, factura por vuelo, quiere verse profesional ante clientes | Plan gratuito/económico, bitácora profesional desde el celular/RC Plus |

---

## 8. Ejemplos de prompt para IA generativa de imágenes

> Usar estos como punto de partida, ajustando el ángulo/segmento según la pieza:

```
Professional drone pilot in the Colombian countryside, operating a DJI drone
with a handheld RC Plus controller, warm natural daylight, agricultural
landscape in the background, focused and professional expression, wearing
practical field gear (no toy/hobby drone aesthetic). Color grading: warm
earth tones with a single orange accent (#EC5B13) visible on equipment or
UI overlay. Photorealistic, editorial commercial photography style, shallow
depth of field. No text, no logos.
```

```
Close-up of a DJI RC Plus controller screen showing a clean, modern dark
navy (#1A202C) dashboard interface with a bold orange (#EC5B13) accent
highlight on a single key metric, minimal white UI cards, outline-style
icons, generous whitespace. Shot at a slight angle, shallow depth of field,
soft studio lighting, product photography style. No visible brand logos.
```

```
Aerial industrial inspection scene: a professional quadcopter drone
hovering near infrastructure (transmission tower / bridge / large
warehouse roof) in Colombia, overcast but bright sky, sense of scale and
precision work, documentary commercial photography, muted natural colors
with orange (#EC5B13) as the only accent color in the composition
(e.g. drone marking, safety vest, small UI overlay).
```

---

## 9. Checklist rápido antes de aprobar un creativo

- [ ] El naranja `#EC5B13` aparece una sola vez como acento dominante (no disperso).
- [ ] El resto de la paleta se mantiene en slate `#1A202C` + neutros — sin colores vibrantes ajenos.
- [ ] El drone/equipo mostrado es de uso profesional, no de consumo/hobby.
- [ ] Si hay texto simulado de UI, usa mayúsculas/peso alto con moderación — no todo el texto en negrita extrema.
- [ ] El contexto es colombiano y de operación real (campo, infraestructura, agro) — no oficina genérica de startup.
- [ ] El mensaje no suena a "revolucionario" vacío — es concreto y habla de cumplimiento/control real.
