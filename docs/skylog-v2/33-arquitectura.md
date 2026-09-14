# Arquitectura y organización del código

[← Índice maestro](00-INDICE.md) · [Reglas](01-reglas.md) ·
Estado real: [`51-bitacora.md`](51-bitacora.md) §11.5

> **Rehecho 2026-08-22.** La versión anterior proponía un monorepo `apps/`+`packages/` con
> pnpm+Turborepo y un `c2-gateway` siempre encendido — escrita antes de que C2 se omitiera
> (decisión 20) y antes de tocar código real. Lo que sigue **ya está construido y verificado**
> en la rama `develop-v2`, no es una propuesta.

---

## 1 · Monorepo real — más liviano de lo que se había propuesto

No hubo reorganización de `src/app/` ni migración a `apps/web/`. La app de Next.js **se queda
donde está**; lo único nuevo son dos paquetes hermanos:

```
skylog-manager/                  ← raíz, sin cambios de ubicación
  src/app/                       ← Next.js actual, intocado
  src/app/(v2)/                  ← route group nuevo, aún vacío — aquí nace cada frente
  packages/
    domain/                      ← reglas de negocio puras, con Vitest real
    ui/                          ← sistema de diseño, esqueleto — crece con cada frente
  package.json                   ← "workspaces": ["packages/*"]
```

**Herramienta: npm workspaces.** No pnpm, no Turborepo — se descartaron porque el proyecto ya
es 100 % npm (`package-lock.json`) y añadir un segundo gestor de paquetes o un orquestador de
build no compraba nada a este tamaño. `npm install` en la raíz resuelve los tres paquetes.

**`c2-gateway` y `aerocivil-agent` no forman parte de esta estructura hoy.** El primero está
dormido con C2 (decisión 20, ver [`42`](42-comando-control.md)); el segundo es condicional a
F4b, el frente de menor prioridad del orden actual ([`50`](50-hoja-de-ruta.md) §4). Cuando
alguno se active, entra como servicio propio — no cambia esta estructura, la extiende.

**`demo-enterprise/` y `railway-robot/`** siguen sueltos del repo, sin tooling que declare la
relación — deuda ya documentada en la limpieza de 2026-08-01. No se resuelve aquí: no bloquea
ningún frente activo, y forzarlo dentro de este monorepo sin necesidad real sería la misma
sobre-ingeniería que ya se descartó para pnpm+Turborepo.

---

## 2 · Capa de dominio pura — verificada, no solo diseñada

`packages/domain` existe, con Vitest **corrido y en verde**:

```
packages/domain/
  src/index.js        ← placeholder de Fase 0
  src/index.test.js    ← prueba real, pasa
  vitest.config.js
  package.json         ← "test": "vitest run"
```

Las reglas de negocio que hoy viven mezcladas en route handlers y componentes de producción
(`planLimits`, `trainingCompliance`, `safetyIndicatorStats`, `soraEngine`) **no se tocan en
producción** — se **reescriben** aquí como funciones puras cuando cada frente las necesite,
según la regla A3 de [`01-reglas.md`](01-reglas.md): se conserva la lógica ya probada, se
traslada a una capa pura, se le agregan pruebas.

**El primer módulo real es `dutyCompliance`** (F5, tiempos de servicio —
[`31-esquema-datos.md`](31-esquema-datos.md) §3.1), sobre los límites exactos de `100.540`.

---

## 3 · Tests — el mínimo ya no es cero

El resto del proyecto sigue sin ninguna prueba automatizada — toda la verificación histórica ha
sido `lint` + `build` + revisión de código + QA manual, y **eso no cambia para el código de
producción existente**. Para `packages/domain` sí cambia, y ya cambió: hay Vitest corriendo.

**Mínimo no negociable, reafirmado**: `dutyCompliance` necesita cobertura real de los cuatro
límites de `§100.540` y sus casos borde (90 h/mes, 6 h BVLOS u 8 h VLOS/EVLOS por 24 h, 2 h
continuas + 30 min) — un error ahí bloquea vuelos legítimos o autoriza vuelos ilegales, y un
humano no puede verificar esas reglas de memoria en cada revisión.

**Sigue sin proponerse** testear la UI ni las 181 rutas API de producción — sería un proyecto
aparte, no el de este plan.

---

## 4 · Validación en los bordes — recomendación, aún sin instalar

El proyecto es JavaScript sin TypeScript; migrarlo completo no es realista ni fue pedido.
Sigue en pie la propuesta: **zod** en los bordes de las rutas API nuevas de `src/app/(v2)/`, y
JSDoc en `packages/domain`. Cierra el riesgo de mass-assignment por construcción, en línea con
la convención ya existente de producción (campos explícitos, nunca `insert([{...body}])`).

**Estado real**: `zod` **no está instalado todavía** — se agrega cuando el primer route handler
de v2 lo necesite, no antes (regla E5 — sin uso real no carga dependencia).

---

## 5 · Verificado antes de aceptar este documento

- `npm install` en la raíz, limpio, con `workspaces` agregado.
- `npm run test:domain` → Vitest en verde.
- `next lint` sobre `develop-v2` → mismos 3 warnings preexistentes de siempre, confirma que
  nada de producción se rompió al introducir workspaces.

---

*Actualizado: 2026-08-22.*
