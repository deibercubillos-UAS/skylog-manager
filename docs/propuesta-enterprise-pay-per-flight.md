# Propuesta — Enterprise "Pago por Vuelo" + Pilotos Patrocinados

> Estado: **PROPUESTA (no implementada)**. Documento de diseño para revisión.
> Cliente oculto dentro del plan Enterprise. No aparece en precios, registro ni selector de planes.
> Última actualización: 2026-06-18.

---

## 1. Resumen ejecutivo

Una organización cliente (oculta, dentro de Enterprise) opera con un modelo de **créditos prepago**: paga **1.000 COP por cada vuelo cargado (> 0 min)** que provenga de las misiones que ella programa. Los vuelos los ejecutan **pilotos patrocinados**: cuentas independientes de Bitafly que aceptan vincularse a la organización, pierden autonomía y solo vuelan/cargan las misiones que la empresa les asigna. La empresa consume sus datos por un **dashboard personalizado** y por **API**.

Dos monetizaciones complementarias:
1. **Empresa** → créditos prepago mensuales (mín. 500 créditos/mes = 500.000 COP/mes).
2. **Piloto** → si quiere autonomía (programar, exportar, volar fuera de la organización), paga el **plan Piloto Independiente** normal.

---

## 1.5 Resumen para la organización — cómo funcionará y qué tendrá

### Cómo funcionará (en lenguaje simple)
1. La organización **compra créditos** por adelantado (mínimo 500/mes; 1 crédito = 1 vuelo = 1.000 COP). Los créditos se renuevan cada mes y los no usados vencen.
2. Desde su panel, la organización **agrega el correo** de cada piloto. El piloto (que ya tiene su cuenta Bitafly) recibe una invitación y, al **aceptar**, se vuelve un **piloto patrocinado** de la organización.
3. La organización **programa misiones** y se las asigna a sus pilotos. Una misión puede tener **varios vuelos**.
4. El piloto **vuela y carga** los vuelos de esas misiones (por control, RC, RC 2, Android o iPhone). Cada vuelo de más de 0 minutos **descuenta 1 crédito**.
5. La organización **ve todos esos vuelos** —con datos completos, incluido GPS/replay— en su **dashboard** y los puede **consumir por API** para integrarlos a sus propios sistemas.
6. Cuando los créditos se agotan, la carga se **bloquea** y un **letrero flotante** avisa que debe recargar; antes de llegar a 0 recibe alertas en 100, 50, 25, 10 y 5 créditos.

### Qué tendrá la organización
- ✅ **Dashboard personalizado oculto** (white-label, con su logo) — invisible para el resto de Bitafly.
- ✅ **Gestión de pilotos patrocinados** — alta por correo, estados (pendiente/activo/revocado), reasignación de misiones.
- ✅ **Programación de misiones** asignadas a sus pilotos (incluye reasignar a otro piloto si el primero no ejecuta).
- ✅ **Medidor de créditos** en vivo + recarga (solo admin y usuarios con permiso) + alertas y letrero de saldo.
- ✅ **Vuelos con datos completos** (resumen + GPS/replay) por dashboard y por **API `/api/v1/*`** con su propia API key.
- ✅ **Documentación de la API** integrada (página interna + PDF descargable).
- ✅ **Propiedad de los datos:** si un piloto revoca el vínculo, la organización **conserva** todos los vuelos ya recibidos.

### Qué NO tendrá / límites
- ❌ No paga por pilotos ni por asientos — **solo paga por vuelo cargado**.
- ❌ El modelo aplica a **una sola organización** (no multi-compañía por ahora).
- ❌ Créditos **no acumulables** entre meses (vencen y se renuevan).
- ❌ Si se queda sin créditos, sus pilotos **no podrán cargar** vuelos hasta recargar (rechazo duro).

---

## 2. Actores

| Actor | Qué es | Cómo se detecta |
|---|---|---|
| **Org Enterprise (cliente)** | Tenant Enterprise con facturación por uso habilitada | Flag `org_flight_credits.enabled = true` (solo superadmin lo activa) |
| **Piloto patrocinado** | Cuenta independiente (role=admin, org propia) vinculada y sin plan pago | Vínculo `org_pilot_shares` activo + sin `subscription_plan` pago |
| **Piloto patrocinado-pago** | Igual, pero pagó el plan Piloto → recupera autonomía | Vínculo activo + `subscription_plan='piloto'` pago |

---

## 3. Modelo del piloto patrocinado (lo que puede y no puede)

### Patrocinado ACTIVO (gratis, sin autonomía)
✅ **Puede:**
- Registrar/cargar **aeronaves** (drones)
- Registrar/cargar **baterías**
- **Cargar y controlar la bitácora** de las misiones que le asigna la organización
- Volar **solo las misiones programadas por la organización** (una misión puede tener **varios vuelos**)
- Carga de vuelos por cualquier vía: automática desde el control, RC, RC 2, Android, iPhone

❌ **No puede (hasta pagar plan Piloto):**
- **Descargar/exportar** la bitácora (PDF/reportes)
- **Programar/planear vuelos** propios (`/plan-vuelo`, `/authorizations`)
- Volar misiones fuera de las asignadas por la organización

### Patrocinado-PAGO (paga plan Piloto Independiente)
✅ Todo lo de una cuenta Piloto Independiente normal **+** las misiones de la organización.

### Bloqueado (tras revocación, ver §9)
👁 Solo lectura hasta que pague el plan Piloto. Retención 3 meses → aviso de posible eliminación.

---

## 4. Flujo principal

```
1. El piloto se registra solo en Bitafly (piloto independiente, flujo actual).
2. La empresa, en su panel oculto, agrega el CORREO del piloto.
   → se crea org_pilot_shares en estado 'pendiente' + notifica al piloto (in-app + correo).
3. El piloto ACEPTA.
   → estado 'activo'. Pierde autonomía. Pasa a modo patrocinado restringido.
4. La empresa PROGRAMA misiones y se las asigna al piloto (cross-tenant).
5. El piloto vuela la misión y CARGA los vuelos (1 o varios por misión).
   → por cada vuelo > 0 min ligado a la misión: -1 crédito, fila en flight_share_ledger.
   → en la bitácora del piloto el vuelo lleva badge "Asignado a [Organización]".
6. La empresa ve los vuelos (datos COMPLETOS) en su dashboard y por API.
```

---

## 5. Modelo de datos (tablas nuevas)

| Tabla | Propósito | Campos clave |
|---|---|---|
| `org_pilot_shares` | Vínculo piloto↔empresa | `enterprise_org_id`, `pilot_profile_id`, `pilot_org_id`, `invited_email`, `status` (`pendiente/activo/revocado`), `accepted_at`, `revoked_at` |
| `org_flight_credits` | Saldo prepago de la empresa | `enterprise_org_id` (UNIQUE), `enabled`, `balance`, `price_per_flight` (1000), `monthly_pack` (≥500), `cycle_expires_at`, `updated_at` |
| `flight_share_ledger` | Inmutable: 1 fila por vuelo cobrado | `flight_id`, `mission_id`, `enterprise_org_id`, `pilot_profile_id`, `charged_at`, `price_snapshot`, `billing_status` |
| `api_keys` | Auth externa de la empresa | `enterprise_org_id`, `key_hash` (SHA-256), `prefix`, `scopes`, `last_used_at`, `revoked_at` |

**Sobre `flight_share_ledger`:** sirve doble propósito — (a) registro de cobro y (b) índice de **qué vuelos puede ver la empresa**. La API y el dashboard leen vuelos a través de este ledger (vía service role), sin romper el RLS multi-tenant.

**Asignación de misiones cross-tenant:** las `flight_authorizations` las crea la empresa y se asignan al `pilot_profile_id` patrocinado (de otra org). El piloto las ve por endpoint con service role filtrado por su vínculo activo. Los vuelos que carga quedan en **su** org (su bitácora) con `mission_id` + referencia a la empresa.

---

## 6. Medición y cobro (trigger en BD)

**`AFTER INSERT ON flights`** — centraliza el conteo para las 4 rutas de inserción (import-dji, manual, import masivo, onboarding):

```
SI flight.total_time > 0
   Y flight.mission_id pertenece a una misión de la empresa patrocinadora
   Y el piloto (owner) tiene org_pilot_shares 'activo'
   Y org_flight_credits.balance > 0:
      → INSERT en flight_share_ledger (snapshot precio)
      → balance := balance - 1
```

- **Universal y a prueba de duplicados:** un INSERT duplicado falla por el constraint único de `flights` y nunca dispara el trigger.
- **Solo vuelos de misiones asignadas** se cobran/comparten (decisión §pregunta 4).
- **Saldo en 0 → rechazo duro:** si `balance = 0`, la carga de nuevos vuelos de misión se **rechaza** (HTTP 402) con mensaje "La organización debe recargar créditos". El piloto **no puede cargar** ese vuelo hasta que la empresa recargue; al recargar, reintenta la carga. Las alertas tempranas (100/50/25/10/5) buscan que esto nunca ocurra en campo.

---

## 7. Créditos prepago (ePayco — suscripción mensual oculta)

- **Mínimo 500 créditos/mes** (= 500.000 COP/mes), con **vencimiento y renovación mensual** (los créditos no usados **se pierden** al renovar; el balance se reinicia al tamaño del paquete).
- Encaja en el modelo de **suscripción recurrente** de ePayco (no pago único): cada cobro mensual exitoso → webhook **reinicia** `balance = monthly_pack` y `cycle_expires_at = +1 mes`.
- Es una suscripción ePayco **custom oculta** (monto negociado = paquete × 1.000), no aparece en `EPAYCO_PLANS` público.
- El webhook (`/api/epayco/webhook`) debe reconocer esta suscripción y **recargar créditos** en vez de activar un plan estándar.

### Alertas de saldo bajo (a la empresa)
- **Letrero flotante permanente** cuando `balance = 0`: "Requiere recargar créditos".
- **Avisos** (in-app + correo) al cruzar: **100, 50, 25, 10, 5** créditos restantes (dedup por umbral para no repetir).

---

## 8. API + Dashboard

### API `/api/v1/*` (auth `Authorization: Bearer <key>`)
- `GET /api/v1/flights` — vuelos compartidos (paginado, filtros fecha/aeronave/piloto/misión) — **datos completos** (incl. GPS/replay).
- `GET /api/v1/flights/[id]` — detalle completo de un vuelo.
- `GET /api/v1/missions` — misiones programadas y su estado.
- `GET /api/v1/usage` — saldo, consumo del ciclo, fecha de vencimiento.
- Solo expone vuelos presentes en `flight_share_ledger` de esa empresa. Rate limit con `checkRateLimit()`.

### Dashboard `/dashboard/panel-enterprise`
- Gateado por `org_flight_credits.enabled` (guard server-side, patrón `canViewManuals`). Nunca visible para otras orgs.
- **Medidor de saldo** + letrero flotante de recarga en 0.
- **Recarga y vista de saldo:** solo el **admin** de la org y **usuarios con permiso compartido** (gate por permiso, no por rol fijo).
- Pilotos vinculados (estado pendiente/activo/revocado) + alta por correo.
- Vuelos recibidos (datos completos) + misiones programadas.
- **Reasignación de misión:** la empresa puede reasignar una misión a otro piloto patrocinado si el primero no la ejecuta.
- White-label (Enterprise ya tiene `whiteLabel: true`).

---

## 9. Ciclo de vida del piloto y retención

```
[registro normal] → [pendiente] → (acepta) → [patrocinado activo]
                                                  │
                          (paga plan Piloto) → [patrocinado-pago]  (autonomía + misiones)
                                                  │
                              (revocación)        ▼
   ┌──────────────────────────────────────────────────────────┐
   │ Si NO pagó → [bloqueado solo-lectura]                      │
   │   retención 3 meses → aviso "puede ser eliminado"          │
   │ Si SÍ pagó → vuelve a Piloto Independiente normal          │
   │   (conserva cuenta, pierde misiones de la organización)    │
   └──────────────────────────────────────────────────────────┘
```

- **Revocación:** la empresa **conserva** los vuelos ya compartidos/cobrados (ledger + datos intactos) y deja de recibir nuevos.
- **Patrón reutilizable:** la degradación + retención + purga se modela como el cron de `free-grants` existente (degradar → notificar → purgar tras N días).

---

## 10. Fases de implementación (PRODUCCIÓN — solo tras firmar contrato)

> ⚠️ Estas fases tocan el código principal y la BD de producción. **No se ejecutan hasta tener contrato firmado.** Antes va el **demo aislado** (ver §14).

1. **F1 — Datos (DB):** migración con `org_pilot_shares`, `org_flight_credits`, `flight_share_ledger`, `api_keys` + trigger de medición + RLS. *(Sin deploy de código.)*
2. **F2 — Estado del piloto patrocinado:** helper `isSponsoredRestricted()` + gates (ocultar/​bloquear export, plan-vuelo, programación) en UI y rutas API.
3. **F3 — Vínculo y asignación:** alta por correo desde el panel empresa → invitación/notificación → aceptación; asignación de misiones cross-tenant + visibilidad para el piloto.
4. **F4 — Medición y bloqueo:** validar trigger por las 4 rutas, bloqueo en saldo 0, badge "Asignado a Organización" en bitácora.
5. **F5 — Créditos ePayco:** suscripción mensual custom oculta + webhook que recarga/reinicia balance + alertas 100/50/25/10/5 + letrero flotante.
6. **F6 — API externa:** generación/revocación de keys + endpoints `/api/v1/*` + docs para el cliente.
7. **F7 — Dashboard:** `/dashboard/panel-enterprise` gateado + medidor + pilotos + vuelos + misiones.
8. **F8 — Retención/revocación:** bloqueo solo-lectura + cron de retención 3 meses + aviso de eliminación.

---

## 11. Riesgos y consideraciones

- **Bloqueo mid-operación (decidido: rechazo duro):** si el saldo llega a 0 mientras un piloto está en campo, no podrá cargar el vuelo hasta que la empresa recargue. Mitigación: avisos tempranos en 100/50/25/10/5 + letrero flotante. Responsabilidad operativa de la empresa mantener saldo.
- **Cross-tenant:** la empresa programa misiones para pilotos de otras orgs y lee sus vuelos. Todo ese acceso va por **service role filtrado por vínculo**, nunca por RLS directo, para no abrir fugas multi-tenant.
- **Pérdida de autonomía:** al aceptar, el piloto queda restringido. Debe quedar **muy claro en el correo/UI de aceptación** qué pierde y que pagando el plan Piloto lo recupera.
- **Créditos que vencen:** el modelo "se pierden al renovar" puede generar fricción; documentarlo claramente al cliente.
- **Un solo cliente:** el diseño asume **una empresa** (un piloto comparte con una sola organización). Escalar a multi-empresa requeriría rediseñar el ledger y el conteo.

---

## 12. Decisiones confirmadas por el cliente (2026-06-18)

1. Piloto = **patrocinado** (gratis): carga drones/baterías/bitácora, **no** exporta ni programa, solo vuela misiones asignadas. Pagando plan Piloto → autonomía total + misiones. *(Una misión = varios vuelos.)*
2. Saldo 0 → **bloquea** + letrero flotante a la empresa. Avisos en **100, 50, 25, 10, 5**.
3. Al aceptar, la empresa le programa los vuelos y **pierde autonomía** (recuperable pagando).
4. Solo cuentan/comparten los vuelos **de las misiones asignadas**.
5. **Una sola empresa** por ahora (no multi-compañía).
6. Mínimo **500 créditos mensuales**, con **vencimiento y renovación mensual**.
7. La empresa recibe datos **completos** de cada vuelo.
8. Revocación → la empresa **conserva** los vuelos; el piloto queda **solo-lectura** hasta pagar plan Piloto; cuenta retenida **3 meses**, luego aviso de eliminación.

## 13. Decisiones de detalle confirmadas (2026-06-18)

1. **Saldo 0 → rechazo duro:** la carga del vuelo se rechaza (HTTP 402) hasta que la empresa recargue.
2. **Recarga / vista de saldo:** solo el **admin** de la org y **usuarios con permiso compartido**.
3. **Reasignación de misión:** **sí**, la empresa puede reasignar una misión a otro piloto patrocinado.
4. **Documentación de API:** **página interna** (dentro del panel) **+ PDF** descargable.

---

## 14. Demo pre-contrato (prototipo clickable, aislado)

> Objetivo: mostrarle al cliente **cómo funcionaría** sin tocar el código principal ni la BD de producción, antes de firmar contrato.

### Características
- **Tipo:** prototipo clickable con **datos simulados** (Opción 2). Todo el estado vive en el navegador; **cero** conexión a Supabase, ePayco o al código real.
- **Ubicación:** carpeta **`demo-enterprise/`** — app **Next.js independiente** con su **propio `package.json`** y `node_modules`. No importa nada de `src/`; el build principal no la compila. `demo-enterprise/node_modules` va al `.gitignore`.
- **Despliegue:** **proyecto Vercel separado** apuntando a la subcarpeta `demo-enterprise/` (Root Directory) → **URL propia compartible** (ej. `demo-bitafly-enterprise.vercel.app`). Opcional: contraseña básica para que solo el cliente entre.
- **Reutilizable:** los componentes de UI del demo se **portan luego** a la F7 (dashboard real) — el trabajo no se bota.

### Qué mostrará (2 vistas)
- **Vista Empresa:** dashboard white-label con medidor de créditos, lista de pilotos (alta por correo + estados), misiones programadas, vuelos recibidos con datos completos (mapa/GPS mock), letrero flotante de recarga + alertas 100/50/25/10/5, pestaña de API (JSON de ejemplo + docs).
- **Vista Piloto:** recibe invitación por correo → acepta → ve misión asignada → botón "Cargar vuelo" que **descuenta 1 crédito en vivo** y aparece en el dashboard de la empresa.

### Fases del demo (D1–D6)

| Fase | Entrega |
|---|---|
| **D1 — Scaffold** | App Next.js standalone en `demo-enterprise/` (package.json propio), tema white-label, layout base, `.gitignore` de su `node_modules` |
| **D2 — Datos mock** | `mock-data.js` (pilotos, misiones, vuelos, saldo/créditos) + estado en memoria (React context) + controles de simulación |
| **D3 — Vista Empresa** | Dashboard: medidor de créditos, pilotos, misiones, vuelos con datos completos (mapa/GPS mock), letrero flotante + alertas de umbral |
| **D4 — Vista Piloto** | Invitación → aceptación → misión asignada → "Cargar vuelo" que descuenta crédito y refleja en la vista empresa |
| **D5 — API + Docs** | Pestaña API con JSON de ejemplo + página de documentación interna (y muestra de PDF) |
| **D6 — Deploy** | Proyecto Vercel separado → URL compartible (+ gate de contraseña opcional) |

### Límites del demo (importante decirlo al cliente)
- Es una **simulación**: no hay pagos reales, ni base de datos, ni API funcional. Los números y vuelos son de muestra.
- Sirve para **validar el flujo y la experiencia**, no para operar.
- La versión real se construye en las fases **F1–F8** una vez firmado el contrato.
