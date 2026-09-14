# Marca, motion y reglas de oro de frontend

[← Índice maestro](00-INDICE.md) · [Reglas](01-reglas.md) ·
Complementa: [`35-frontend.md`](35-frontend.md) (navegación) · [`36-sitemap.md`](36-sitemap.md) (pantallas)

> **Creado 2026-09-06**, a partir de una guía de frontend aportada por el usuario
> (`FRONTEND_GUIDE.md` externo). Se reconcilió punto por punto contra lo que ya existe —
> `docs/bitafly-brand-visual-brief.md`, `CLAUDE.md`, y el código real — antes de adoptar nada.
> **Alcance decidido con el usuario**: aplica solo a v2 (F1, en `develop-v2`). No toca
> producción ni `main`.

---

## 1 · Identidad de marca

### 1.1 Nombre — decisión real, pendiente de convergencia

**Decisión del usuario (2026-09-06): la marca se escribe "Bitafly"** (una palabra, sin
mayúscula intermedia) **de aquí en adelante para todo lo nuevo de v2** — documentación, copy,
componentes, comentarios de código dentro de `src/app/(v2)/` y `packages/`.

**Lo que esto NO resuelve todavía, a propósito**:
- **Producción sigue diciendo "BitaFly"** (B y F mayúsculas) en código, correos, dominio y
  UI — no se toca (regla de oro: no tocamos `main`). Habrá un período de **dos grafías
  conviviendo** (v2 = "Bitafly", v1 = "BitaFly") hasta el corte real.
- **La razón social legal es "BitaFly S.A.S."** (`docs/estatutos-bitafly-sas.md`). Cambiar el
  nombre legal de una sociedad ya constituida es un trámite societario/notarial real, no un
  cambio de código — **queda fuera de este documento y de todo lo que se puede resolver desde
  aquí**. Si el usuario quiere renombrar la sociedad también, es una decisión y un proceso
  aparte, con su propio abogado/contador — no se asume ni se ejecuta desde este plan.
- El dominio `bitafly.com` y los correos `@bitafly.com` **no cambian por esto** — un dominio es
  insensible a mayúsculas, "Bitafly" y "BitaFly" resuelven al mismo dominio sin ningún cambio
  técnico.
- `docs/bitafly-brand-visual-brief.md` (el brief de marca para IA generativa, ya existente)
  sigue usando "BitaFly" — se actualiza a "Bitafly" cuando se retome ese documento
  específicamente, no como efecto colateral de este.

> **Pendiente explícito**: en qué momento (y si) la razón social y producción convergen a
> "Bitafly" es una decisión de negocio del usuario, no técnica. No se ejecuta sin que la pida
> de forma explícita y separada.

### 1.2 Paleta y tipografía — ya correctas, sin cambios

Verificado contra `docs/bitafly-brand-visual-brief.md` y el código real — coinciden exactos,
no hace falta ningún ajuste:

| Elemento | Valor | Uso |
|---|---|---|
| Acento primario | `#EC5B13` (naranja) | CTA principal, alertas de prioridad |
| Base | `#1A202C` (navy) | Fondos de contraste, sidebar, superficies "premium" |
| Tipografía cuerpo | Public Sans | Toda la UI operativa |
| Tipografía headlines | Lexend | Solo landing/marketing, **nunca en la app operativa** — ya era así, se reafirma |
| Iconografía | Material Symbols Outlined | Trazo fino, nunca *filled* ni emoji |

**Regla del acento único, matizada para no romper lo que ya funciona**: la guía nueva pide el
naranja *exclusivamente* en CTA primario/alertas. Aplicado en piezas de **marketing** (landing,
campañas, creativos) es correcto y ya es la práctica documentada. Aplicado a **la app
operativa** de forma estricta (auditar los ~87 componentes actuales para que el naranja no
aparezca en ningún botón secundario, badge o widget) sería un rediseño visual completo, no una
regla de oro puntual — **eso queda para cuando F1 se construya de verdad**, no se hace como
efecto colateral de este documento.

### 1.3 Marco regulatorio y tono

Sin cambios — RAC 100/Aerocivil siempre, nunca EASA/SORA sin aclarar el contraste; tono
directo, técnico-pero-claro, español de Colombia. Ya documentado en
`docs/bitafly-brand-visual-brief.md` §6.

---

## 2 · Principios de neuromarketing/UX — para cuando F1 se diseñe

Tabla de la guía aportada, conectada con lo que el proyecto ya exige:

| Principio | Aplicación en Bitafly | Ya lo exige |
|---|---|---|
| Fluidez cognitiva | Un mensaje de valor por pantalla, jerarquía máx. 3 niveles | — nuevo |
| Von Restorff | El naranja puro no compite consigo mismo en la misma vista | Brief de marca §2, ya existente |
| Escaneo en Z | Logo → CTA secundario → propuesta de valor → CTA primario | — nuevo, solo marketing |
| Anclaje de autoridad | Cifra real y verificable, nunca un adjetivo vago | **Regla de veracidad, `01-reglas.md` §3** — coincide exacto |
| Bento grid | Máx. 2 bloques héroe por sección | — nuevo, solo marketing |
| Reducción de fricción | CTA con expectativa de tiempo explícita | — nuevo |

**Cero dato fabricado**: cualquier cifra de "anclaje de autoridad" (autorizaciones tramitadas,
pilotos certificados, etc.) debe salir de una consulta real a producción en el momento de
escribir el copy — igual que ya exige `01-reglas.md` para todo el proyecto. No se inventa un
número "creíble".

---

## 3 · Stack de animación — árbol de decisión, sin instalar todavía

```
¿Solo aparecer/desvanecer al hacer scroll?
├── Sí  → CSS nativo (Scroll-Driven Animations / View Transitions API)
└── No  → ¿Secuencia narrativa de marketing (Hero, storytelling)?
          ├── Sí → GSAP + ScrollTrigger
          └── No → ¿Estado de UI dentro de la app (dashboard, modales)?
                    └── Sí → Framer Motion
```

**Regla de convivencia**: GSAP vive en marketing (landing/Home), Framer Motion vive en la app
autenticada — no se mezclan.

**Regla de rendimiento (no negociable)**: solo se anima `transform`/`opacity`/`filter` — nunca
`width`/`height`/`margin`. Se respeta `prefers-reduced-motion`. Ninguna animación bloquea el
LCP.

**Estado real**: ni `gsap` ni `framer-motion` están en `package.json` hoy — verificado. Se
instalan **cuando F1 los necesite de verdad**, no antes (misma regla E5 ya aplicada a `zod` en
[`33-arquitectura.md`](33-arquitectura.md) §4: sin uso real no carga dependencia).

---

## 4 · Herramientas y skills — qué es real y disponible, qué no

Verificado antes de adoptar nada de la lista de la guía aportada:

| Herramienta | Estado real |
|---|---|
| Impeccable, Design Motion, Animate (Emil Kowalski), GSAP Skills | No instaladas, no verificadas en este entorno — se evalúan cuando se empiece a construir F1, no se asumen disponibles |
| `anthropic/frontend-design` (plugin) | No está en el set de skills de esta sesión |
| **Figma Dev Mode MCP** | **No se puede usar desde una sesión remota** — requiere Figma corriendo en local (`127.0.0.1:3845`) en la máquina del usuario. Si el usuario trabaja con Figma, la verificación contra tokens de diseño tiene que hacerse en una sesión local de Claude Code, no aquí |
| Chrome DevTools MCP, Context7 MCP | No conectados en esta sesión |
| GitHub MCP, Vercel MCP | **Ya disponibles y en uso** en este proyecto |
| Playwright | Disponible (Chromium preinstalado) — **ya se usó antes en este mismo proyecto** para capturas reales contra `next dev` (ver `CLAUDE.md`, Sistema de Diseño 2026-07-02, Páginas legales 2026-07-13) — es la vía real de verificación visual aquí, no Figma |
| "Plugin Ponytail" (YAGNI-first) | **No encontrado en el repo ni en la configuración del proyecto** — no verificado, no se adopta como referencia real hasta que el usuario confirme qué es |
| `bitafly-home-redesign.md` (documento previo referenciado por la guía) | No existe en este repo — si el usuario lo tiene, hace falta compartirlo para usar el detalle de arquitectura del Home que referencia |

---

## 5 · Checklist de reglas de oro — adaptado a lo verificable en este entorno

Antes de dar por cerrada cualquier sección de frontend de v2:

1. **Marca**: ¿"Bitafly" escrito correctamente en todo el copy/código nuevo de v2? ¿el naranja
   puro no compite consigo mismo en la misma composición?
2. **Regulación**: ¿toda mención normativa es RAC 100/Aerocivil, sin mezclar con EASA/SORA sin
   aclarar el contraste?
3. **Jerarquía**: ¿máximo 2 bloques héroe por sección de bento grid (en piezas de marketing)?
4. **Movimiento**: ¿se decidió la intención antes de elegir CSS/GSAP/Framer? ¿solo se anima
   `transform`/`opacity`/`filter`? ¿se respeta `prefers-reduced-motion`?
5. **Verificación visual**: ¿se capturó con Playwright contra `next dev` real? (reemplaza el
   paso de Figma Dev Mode MCP, no disponible aquí)
6. **Veracidad**: ¿todo dato/cifra mostrado es real, consultado en el momento, nunca inventado?
7. **Producción**: ¿este cambio vive en `develop-v2`/`src/app/(v2)/`, sin tocar `main`?

Se quitaron del checklist original los dos puntos que dependen de herramientas no disponibles
aquí (`/impeccable audit`/`polish`, comparación directa contra Figma) — se documentan como
pendientes de una sesión local si el usuario quiere cumplirlos literalmente.

---

## 6 · Interfaces separadas por rol — decisión tomada (2026-09-06)

**Decisión del usuario**: rutas separadas de verdad por rol, no solo componentes distintos en
la misma ruta. Reemplaza/precisa lo que `35-frontend.md` §3.2 dejaba abierto ("el espacio por
defecto depende del rol").

- **Motivo**: cada rol carga solo su propio código — más rápido de verdad, no solo más
  ordenado. Ya hay un precedente parcial en producción (`PilotDashboard.js`, un componente
  aparte para `role==='piloto'` dentro de la misma ruta) — v2 lleva esa idea a nivel de **árbol
  de rutas**, no solo de componente.
- **Forma propuesta** (a definir en detalle cuando F1 se construya, no ahora — sigue siendo el
  último frente del orden):
  ```
  src/app/(v2)/
    piloto/            ← independiente y de organización comparten shell si sus pantallas coinciden
    jefe-pilotos/
    gerente-sms/
    gerente-general/
  ```
  Cada árbol monta solo los componentes/queries que su rol necesita — sin el peso muerto de
  código de otros roles que hoy carga cualquier página de `/dashboard/*` gateada por
  `PERMISSIONS`.
- **Lo que no cambia**: la fuente de permisos sigue siendo `PERMISSIONS`/RLS — las rutas
  separadas son una consecuencia de organización y rendimiento, no un mecanismo de seguridad
  nuevo ni paralelo. La seguridad real sigue viviendo en RLS + `getOrgContext()`, igual que hoy.
- **Pendiente real**: definir qué pantallas son genuinamente exclusivas de un rol (van solo en
  su árbol) vs. compartidas entre roles (¿se duplican, o vive en un árbol común importado por
  los demás?) — se resuelve mapeando `36-sitemap.md` contra los roles reales al construir F1,
  no aquí.

---

## 7 · Assets reales — fotografía y video de dron

La guía aportada trae una tabla exacta de qué fotografiar, formato, nombre de archivo y
carpeta destino (Hero en video/foto, piloto+consola, detalle técnico, casos de uso,
certificación física). **Se adopta tal cual cuando el usuario aporte el material real** — no se
genera contenido "real" por IA, sería exactamente lo que la propia guía busca evitar (sesgo de
autenticidad falso). Carpetas propuestas dentro de `public/media/` (`hero/`, `authority/`,
`showcase/`), mismos nombres de archivo exactos que trae la guía, para no tener que
renombrarlos al integrarlos.

**Pendiente**: el usuario aporta las fotos/video reales cuando los tenga — no bloquea nada del
avance actual de F5/backend.

---

## 8 · Pendientes

| # | Pendiente |
|---|---|
| P-FM-1 | Confirmar si/cuándo la razón social y producción convergen a "Bitafly" — decisión de negocio, no técnica |
| P-FM-2 | Conseguir `bitafly-home-redesign.md` si el usuario lo tiene, para el detalle completo de arquitectura del Home |
| P-FM-3 | Verificar qué es el "plugin Ponytail" antes de tratarlo como referencia real |
| P-FM-4 | Mapear cada pantalla de `36-sitemap.md` a un árbol de rutas por rol, al construir F1 |
| P-FM-5 | Aportar fotos/video reales de dron cuando estén disponibles |

---

*Creado 2026-09-06.*
