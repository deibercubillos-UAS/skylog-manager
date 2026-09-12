# Arquitectura y organización del código

[← Índice maestro](00-INDICE.md) · [Reglas](01-reglas.md)

> Migrado desde `../plan-bitafly-v2.md` el 2026-08-22 al partir ese documento por la regla de 500 líneas (D1).

---

## 9. Arquitectura y organización del código

### 9.1 Monorepo real

Hoy `demo-enterprise/` y `railway-robot/` cuelgan del repo sin ningún tooling que declare la
relación — ya documentado como deuda en la limpieza del 2026-08-01. Con dos servicios nuevos
(`c2-gateway`, `aerocivil-agent`) esto deja de ser incómodo y pasa a ser insostenible.

**Estado real (decisión 30, `51-bitacora.md`)**: solo se movió `railway-robot/` — autocontenido
(`package.json`/deps propio, sin imports cruzados con `src/`) y ya vive en `apps/`.
**`demo-enterprise/` se deja intacto donde está**, a pedido explícito del usuario (2026-08-22):
tiene su propio proyecto Vercel con *Root Directory* apuntando a `demo-enterprise/` — moverlo
exige antes actualizar ese ajuste externo, y el usuario prefirió no tocarlo por ahora. El
Next.js principal (`src/`, `android/`, `public/`, configs) **sigue en la raíz**, sin mover a
`apps/web` — es la operación de mayor riesgo (cientos de imports, `vercel.json` de producción,
Capacitor) y no tiene beneficio real todavía con un solo servicio activo. Se retoma cuando
exista un segundo servicio real (`aerocivil-agent` en F4b, o si se retoma F2/`c2-gateway`).

```
apps/
  railway-robot/     ← ✅ movido (2026-08-22)
  web/               ← ⬜ pendiente — el Next.js actual, movido sin cambios funcionales
  c2-gateway/        ← ⬜ pendiente, nuevo, siempre encendido (Railway/Fly) — condicional a retomar F2
  aerocivil-agent/   ← ⬜ pendiente, nuevo — condicional a F4b
demo-enterprise/     ← se queda en la raíz, a propósito (Root Directory de Vercel apunta ahí)
packages/
  ui/                ← sistema de diseño extraído
  domain/            ← reglas de negocio puras y testeadas
  db/                ← tipos y migraciones
```

Herramienta: **pnpm workspaces + Turborepo**. La migración del árbol se hace en la rama v2 y solo
se mergea con todo lo demás.

### 9.2 Capa de dominio pura

Las reglas de negocio que hoy viven mezcladas en route handlers y componentes se extraen a
`packages/domain`: `planLimits`, `trainingCompliance`, `safetyIndicatorStats`, `soraEngine`,
y las nuevas `dutyCompliance` y `c2Rules`. Funciones puras, sin Supabase, testeables.

### 9.3 Tests — hoy son cero

El proyecto no tiene ninguna prueba automatizada. Toda la verificación histórica ha sido
`lint` + `build` + revisión de código + QA manual. Para v2 eso no alcanza: el motor de tiempos de
servicio tiene reglas numéricas que un humano no puede verificar de memoria, y un error ahí
**bloquea vuelos legítimos o autoriza vuelos ilegales**.

Mínimo no negociable: **Vitest sobre `packages/domain`**, con cobertura real de
`dutyCompliance` (todos los límites de 100.540 y sus casos borde), `planLimits`,
`trainingCompliance` y las reglas de geocerca. No se propone testear la UI ni las 181 rutas API
— sería un proyecto aparte.

### 9.4 Validación en los bordes

El proyecto es JavaScript sin TypeScript, y migrarlo completo no es realista ni fue pedido.
Propuesta pragmática: **zod** en los bordes de API nuevos (`c2-gateway`, rutas v2) para validar
entradas, y JSDoc en `packages/domain`. Cierra el riesgo de mass-assignment por construcción, en
línea con la convención ya existente de campos explícitos.

---
