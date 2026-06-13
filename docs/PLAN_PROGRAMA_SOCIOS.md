# Plan: Programa de Escuelas, Asesores y Referidos

> Documento de control. Se actualiza al cerrar cada fase. Mantener < 500 líneas.
> Última actualización: 2026-06-13 · Estado: DISEÑO (sin ejecutar)

## Objetivo

Permitir que **escuelas** y **asesores de venta** promuevan BitaFly:
- Regalando **perfiles gratis temporales** (plan piloto independiente) a estudiantes.
- Ganando **comisión recurrente** por cada plan pagado que vendan con su código.
- Con **panel propio** para autogestión y **control total desde el Máster**.

La web operativa actual (operadores UAS) no se ve afectada: todo lo nuevo vive en
entidades y vistas separadas.

## Convención de estado

⬜ Pendiente · 🔄 En progreso · ✅ Completada · ⏭️ Omitida · ⚠️ Bloqueada

## Reglas de trabajo

- Cada fase (Px) = un commit pequeño, verificable y reversible. `npm run build` OK antes de commit.
- No modificar la web operativa en masa. Áreas sensibles (webhook ePayco, checkout) con cuidado extra.
- Actualizar este archivo al cerrar cada fase.

---

## Decisiones de negocio (cerradas)

1. **Comisión**: solo por **venta de plan pagado**.
2. **% de comisión**: BitaFly fija un **% por escuela/asesor** (configurable en Máster).
   La escuela **organiza internamente** cómo reparte entre sus asesores (fuera del sistema).
3. **Comisión recurrente**: se genera **mientras el cliente siga pagando** (cada ciclo de pago),
   no solo en la primera compra.
4. **Perfiles gratis**: **ilimitados** (o con cupo si el Máster lo define), plan **piloto
   independiente**, **temporales** (`free_days` configurable).
5. **1 perfil gratis por correo, NO renovable**: `free_grants.email` es UNIQUE global.
6. **Código de venta opcional**: el cliente puede llegar orgánicamente (sin código).
7. **Regalo por correo**: el socio ingresa el email del beneficiario y el sistema envía la invitación.
8. **Escuela con varios asesores**: jerarquía escuela → asesores, cada asesor con su propio código.
9. **Al expirar el perfil gratis**: se **degrada a solo lectura**, los datos se **conservan 3 meses**,
   y si el cliente no activa un plan se le **informa que la información será eliminada**.
10. **Descuentos en planes pagados**: al final (depende de ePayco).

---

## Modelo de datos (tablas nuevas)

```
partners                  -- escuela O asesor independiente
  id, type ('escuela'|'asesor'), name, status ('activo'|'inactivo')
  parent_partner_id -> partners.id   (NULL = escuela o asesor independiente)
  commission_pct          -- % fijo que BitaFly paga a este socio (Máster)
  free_seats_limit        -- NULL = ilimitado; o número de cupos
  free_seats_used         -- contador
  free_days               -- duración del perfil gratis (ej. 90)
  created_by, created_at

partner_codes             -- código(s) de referido/venta
  id, partner_id, code (UNIQUE), active

partner_members           -- quién entra al panel del socio
  id, partner_id, profile_id, role ('owner'|'asesor')

free_grants               -- perfiles gratis regalados
  id, partner_id, advisor_member_id, email (UNIQUE),
  status ('enviado'|'activado'|'expirado'|'degradado'),
  token, granted_at, expires_at, redeemed_org_id

referrals                 -- relación cliente <-> socio (atribución de venta)
  id, partner_id, advisor_member_id, code, org_id (UNIQUE), plan, billing,
  status ('activa'|'cancelada'), created_at

referral_commissions      -- comisión por cada ciclo de pago (recurrente)
  id, referral_id, period (ej. 2026-06), sale_amount,
  commission_pct, commission_amount,
  status ('pendiente'|'liquidada'|'anulada'), ref_payco, created_at, paid_at
```

Notas del modelo:
- **Comisión recurrente (#3)**: `referrals` guarda la relación cliente↔socio una sola vez;
  `referral_commissions` agrega **una fila por ciclo de pago** detectado en el webhook.
  Idempotencia por `ref_payco` (igual patrón que `processed_webhook_refs`).
- **% por escuela (#2)**: `commission_pct` vive en `partners`. El asesor hereda el de su escuela
  (la escuela reparte internamente, sin lógica en el sistema).
- **RLS**: cada socio solo ve sus filas; el Máster (service role) ve todo.

---

## Identidad y acceso (panel propio)

- Rol de sistema **`partner`** (oculto del UI operativo, como `superadmin`).
- Miembro de socio inicia sesión normal → ve **panel `/socio`** en vez del dashboard UAS.
- Escuela = `owner` (gestiona asesores + ve todo). Asesor = `asesor` (ve lo suyo).

---

## Flujos

**A. Regalar perfil gratis (#4, #5, #7)**
1. Panel socio → "Regalar perfil" → ingresa correo del beneficiario.
2. Valida cupo (si aplica) y unicidad del correo en `free_grants` (rechaza si ya existe, en cualquier estado).
3. Crea `free_grant` (token, `expires_at = hoy + free_days`) y envía invitación (Resend + escHtml).
4. Beneficiario abre enlace → registro → plan **piloto** con `subscription_expires_at = expires_at`.
   `free_grant.status='activado'`, `redeemed_org_id` ligado.

**B. Venta con código (#1, #6)**
1. Al comprar plan pagado, el cliente **puede** escribir el código (opcional → orgánico permitido).
2. El código viaja con el intent (`pending_subscriptions`).
3. Webhook ePayco activa plan pagado → si hay código válido → crea/asegura `referrals` (1 por org)
   y agrega `referral_commissions` del ciclo.

**C. Comisión recurrente (#3)**
- Cada confirmación de pago del webhook para una org con `referral` activo → nueva fila
  `referral_commissions` del periodo, idempotente por `ref_payco`.
- Si el cliente cancela/expira → `referrals.status='cancelada'`, deja de generar comisión.

**D. Expiración del perfil gratis (#9)**
- Cron diario: perfiles gratis vencidos → **degradar a solo lectura** (reusa `gracePeriod`),
  `free_grant.status='degradado'`, marcar inicio de retención de 3 meses.
- A los **3 meses sin plan**: avisar al cliente (correo) que la información será eliminada.
- Eliminación efectiva: paso manual/confirmado (no auto-borrado silencioso).

---

## Control total desde Máster

Pestaña `/admin/master` → **Socios**:
- Crear/activar/desactivar escuelas y asesores.
- Editar **% de comisión**, **cupos** (`free_seats_limit`) y **tiempo gratis** (`free_days`).
- Generar/revocar **códigos**.
- Tablero de **referidos** y **comisiones por periodo** + marcar **liquidadas**.
- Ver perfiles regalados por socio y su estado.

---

## Fases (cortas y controladas)

| Fase | Descripción | Estado | Riesgo |
|------|-------------|--------|--------|
| P1  | Migración BD: tablas + RLS (partners, codes, members, free_grants, referrals, commissions) | ✅ | Bajo |
| P2  | Máster: CRUD de socios (%, cupos, free_days, activar) + generar códigos | ✅ | Bajo |
| P3  | Rol `partner` + panel `/socio` base (login, guard, layout) | ✅ | Medio |
| P4  | Regalar perfil gratis: form de correo + `free_grant` (unicidad) + envío de invitación | ✅ | Medio |
| P5  | Activación del perfil gratis al registrarse (plan piloto + expiry) | ✅ | Medio |
| P6  | Captura del código en la compra (campo opcional) + guardar en el intent | ⬜ | Medio |
| P7  | Webhook: crear `referral` + `referral_commissions` del ciclo (idempotente) | ⬜ | Alto* |
| P8  | Comisión recurrente: nueva fila por cada ciclo de pago confirmado | ⬜ | Alto* |
| P9  | Cron de expiración: degradar a lectura + retención 3 meses + aviso | ⬜ | Medio |
| P10 | Asesores dentro de la escuela (owner invita asesores, código por asesor) | ⬜ | Medio |
| P11 | Panel socio: reportes de ventas y comisiones (escuela ve a sus asesores) | ⬜ | Medio |
| P12 | Máster: liquidación de comisiones por periodo | ⬜ | Bajo |
| P13 | (Opcional, último) Códigos de descuento en planes pagados (ePayco) | ⬜ | Alto |

\* P7/P8 tocan el webhook de ePayco — área sensible; se harán con cuidado extra y pruebas.

---

## Reglas garantizadas (checklist)
- ✅ Comisión solo por plan pagado, **recurrente** mientras el cliente pague.
- ✅ % **fijo por escuela** (Máster); reparto interno a cargo de la escuela.
- ✅ Perfiles gratis ilimitados/cupo, plan piloto, **temporales**.
- ✅ **1 perfil gratis por correo, no renovable** (UNIQUE).
- ✅ Código de venta **opcional** (orgánico permitido).
- ✅ Escuela con **múltiples asesores**, cada uno con código y métricas.
- ✅ Al expirar: **solo lectura**, retención **3 meses**, aviso de eliminación.
- ✅ Máster controla habilitar, %, cupos y tiempo gratis.

---

## Detalles resueltos
- Aviso de eliminación: **correo + campana de notificaciones**.
- Eliminación a los 3 meses: **automática** (`free_grants.purge_after` + cron).
- Código: **autogenerado con las iniciales de la escuela** (ej. `ESC-AB12`).

---

## Bitácora de avance

<!-- Plantilla:
### Px — Título ✅/🔄 (fecha)
- Qué se hizo:
- Archivos/migraciones tocadas:
- Verificación (build/test):
- Notas / pendientes:
-->
### P1 — Migración BD ✅ (2026-06-13)

- Qué se hizo: 6 tablas (`partners`, `partner_codes`, `partner_members`, `free_grants`,
  `referrals`, `referral_commissions`) + índices + RLS habilitada con política de lectura
  por miembro de socio. Helper `private.user_partner_ids()` (propios + asesores hijos si owner).
  Escritura solo vía service role (Máster). Idempotencia de comisión por `ref_payco` (índice único).
  `free_grants.email` UNIQUE (1 por correo) y `purge_after` para el borrado automático a 3 meses.
- Migración: `supabase/migrations/20260613_partners_program.sql` (aplicada en Supabase).
- Verificación: 6 tablas con `rls=true` y 1 policy cada una. No toca tablas existentes.

### P2 — Máster: CRUD de socios ✅ (2026-06-13)

- API `/api/admin/master/partners` (guard superadmin, service role): GET (lista + códigos +
  nº miembros), POST (crear socio + código, o `action:'add_code'`), PATCH (nombre/%/cupos/días/
  estado), DELETE (soft → inactivo).
- Código con **iniciales del nombre** + sufijo aleatorio sin chars ambiguos (ej. `EAC-XB12`),
  unicidad verificada en BD.
- UI: pestaña **Socios** (`_SociosTab.js`) en `/admin/master`: crear escuela/asesor, jerarquía
  asesor→escuela, editar inline, activar/desactivar, copiar y agregar códigos.
- Archivos: `api/admin/master/partners/route.js`, `_SociosTab.js`, `admin/master/page.js`.
- Verificación: `npm run build` OK.

### P3 — Panel del socio base ✅ (2026-06-13)

- Identidad: ser "socio" = tener fila en `partner_members` (no se usa rol nuevo en profiles).
- `/api/socio/me`: contexto del socio (principal, códigos, KPIs: regalados/activos, referidos/
  activos, comisión pendiente/liquidada). 403 si no es socio. Owner ve también a sus asesores.
- Panel `/socio`: `layout.js` (guard client) + `page.js` (KPIs + códigos + placeholders).
- Máster: gestión de **miembros** por socio (vincular por correo Admin/Asesor, quitar) —
  acciones `add_member`/`remove_member` + UI en `_SociosTab`.
- Archivos: `api/socio/me/route.js`, `socio/layout.js`, `socio/page.js`,
  `api/admin/master/partners/route.js`, `_SociosTab.js`.
- Verificación: `npm run build` OK.

### P4 — Regalar perfil gratis ✅ (2026-06-13)

- API `/api/socio/grants`: GET (lista de regalos del socio) + POST (regalar a un correo).
  Validaciones: socio activo, **cupo** (NULL=∞), **1 por correo no renovable** (rechaza si el
  correo ya está en `free_grants` en cualquier estado), y rechaza correos con cuenta existente.
- Crea `free_grant` (token, `expires_at = now + free_days`, `purge_after = expires_at + 3 meses`),
  incrementa `free_seats_used`, y envía correo de invitación con enlace
  `/registro?email=...&grant=<token>` (Resend + escHtml, chequeo de `{error}`).
- UI: formulario "Regalar perfil gratis" + lista de regalos con estado en `/socio`.
- Archivos: `api/socio/grants/route.js`, `socio/page.js`.
- Verificación: `npm run build` OK. La activación del plan al registrarse va en P5.

### P5 — Activación del perfil gratis ✅ (2026-06-13)

- `registro`: el enlace `?grant=<token>` abre modo "crear" con plan piloto y envía el token a
  `/api/auth/register`. (piloto NO es `paid` → usa el flujo de registro libre.)
- `/api/auth/register`: si llega `grant` válido (existe, mismo correo, no activado) →
  setea `profiles.subscription_expires_at = free_grant.expires_at` y marca el grant
  `status='activado'` + `redeemed_org_id`. Idempotente (no re-activa).
- Archivos: `api/auth/register/route.js`, `registro/page.js`.
- Verificación: `npm run build` OK. La expiración/degradado va en P9.
