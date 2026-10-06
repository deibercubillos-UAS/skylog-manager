# Alta de usuarios, invitaciones y programa de socios en V2

[← Índice maestro](00-INDICE.md) · [Migración](32-migracion.md) · [Cobertura](32a-cobertura-migracion.md)

> **Estado: diseño (2026-10-06, decisión 181).** Nace de un hallazgo al preparar el corte: **V2 no puede
> dar de alta a nadie.** Este documento acota qué falta, en qué orden y qué decide el usuario. Nada de esto se
> ha construido todavía.

## 1 · El hallazgo

Se buscó en el código de V2 cómo se crea una cuenta, una organización o una invitación:

| Capacidad | En V2 hoy | En v1 hoy |
|---|---|---|
| Crear usuario (`auth.admin.createUser` / `signUp`) | **No existe** | `POST /api/auth/register` (413 líneas) + `/registro` (1036 líneas) |
| Crear organización nueva | **No existe** | dentro de `register` (escribe `profiles`, `organizations`, `organization_members`) |
| Unirse a una organización por NIT y rol | **No existe** | `register` (modo join) + `validate-join` |
| Invitar tripulantes por correo y aceptar | **No existe** (el roster crea una *persona* sin cuenta) | `invitations` + `/api/invite` + `/api/invitations/accept` |
| Iniciar sesión | ✅ `/login` (ya redirige a `/inicio`) | ✅ |
| Restablecer contraseña | páginas `/reset-password` y `/update-password` (a verificar que no dependan de tablas v1) | ✅ |
| Programa de socios (escuelas, códigos, regalos, comisiones) | **No existe** | ~15 rutas + panel `/socio` + Master |

Las rutas de v1 **escriben en tablas que V2 no tiene** (`profiles`, `organization_members`), así que **no
sirven contra el esquema de V2**. Consecuencia: **después del corte nadie nuevo podría registrarse, ni una
organización invitar a su tripulación, ni un socio regalar un perfil.** Los usuarios migrados sí entrarían
(el login existe).

> Esto no estaba en la lista de pendientes: se descubrió al acotar la decisión D de la migración. Es el
> **trabajo más grande que queda antes del corte**, más que el ETL.

## 2 · Alcance, en el orden en que dependen entre sí

### Etapa A — Alta de un explotador nuevo (registro)
`POST /api/auth/register-v2` + pantalla `/registro` reescrita sobre V2.
- Crea: usuario de autenticación → `people` + `accounts` → `organizations` (+ certificación vacía) →
  `memberships` (rol `admin`) → `subscriptions` (plan **Piloto con prueba de 15 días**, igual que hoy).
- Validaciones y límites que ya existen en v1 y se conservan: limitador por IP (5 por hora), NIT normalizado
  (sin guiones/espacios), correo único, contraseña mínima, atribución de marketing (`signup_attribution`).
- **Decisión del usuario (abajo):** v1 permite *pagar antes de crear la cuenta* (`pending_registrations`). En V2
  se propone **crear la cuenta primero con la prueba** y pagar después desde `/suscripcion` (Wompi): elimina una
  tabla y un flujo con estados huérfanos.

### Etapa B — Unirse a una organización existente
Por NIT + rol (`piloto`, `jefe_pilotos`, `gerente_sms`); roles únicos (Jefe de Pilotos y Gerente SMS solo uno
por organización); respeta el **límite de pilotos del plan** (`planLimits` de V2 ya existe y cuenta «solo el
Gerente General no cuenta»). Crea persona + cuenta + membresía; **no** crea organización.

### Etapa C — Invitación de tripulantes
Tabla `invitations` en V2 (`token` único, correo, rol, `person_id` opcional, estado, vencimiento de 7 días).
Se crea desde Tripulación; correo con Resend (con `escHtml` y revisando el `{ error }`); al aceptar: si el correo
ya tiene cuenta → membresía nueva (**sin migrar datos**, igual que la regla ya establecida); si no → registro con
el correo bloqueado. Reutiliza `rowDocument`/patrones de correo existentes.

### Etapa D — Sesión y contraseña
Verificar `/reset-password`, `/update-password` y `POST /api/auth/reset-request` contra el proyecto de V2 (que no
tengan `profiles` por dentro). Probable ajuste menor.

### Etapa E — Programa de socios **completo** (decisión D del usuario)
Alcance elegido: **igual al de la versión actual**. Datos reales hoy: 3 escuelas (1 activa), 0 asesores, 0
comisiones, 11 regalos — se construye completo de todos modos, por decisión del usuario.
1. **Esquema** (7 tablas): `partners`, `partner_codes`, `partner_members`, `partner_invitations`,
   `free_grants`, `referrals`, `referral_commissions`; RLS (miembros del socio leen; escribe solo servidor).
2. **Administración (superadmin)**: V2 no tiene panel Master. Se agrega una sección mínima `/admin/socios`
   (solo `superadmin`): crear escuela/asesor, comisión, cupos, días de regalo, **códigos personalizables**,
   miembros e invitaciones, activar/desactivar (el dueño de una escuela activa recibe plan Enterprise),
   liquidar comisiones por período.
3. **Regalos**: `POST /api/socio/grants` (cupo, correo único globalmente — la regla «1 regalo por correo» —,
   correo con logo del socio), canje en el registro (`?grant=token` → Etapa A con correo bloqueado y vencimiento
   de la suscripción = `expires_at` del regalo), **cron diario**: degradar vencidos, purgar a los 90 días y
   avisar 5 días antes (campana y correo).
4. **Códigos de venta y comisión**: el código se captura en el registro/checkout; `attributeCommission()` se
   engancha **al activarse una suscripción de Wompi** (hoy lo hace el webhook de ePayco); una fila por ciclo,
   idempotente por referencia de pago; si el vendedor es asesor de una escuela, el porcentaje es el de la escuela.
5. **Panel `/socio`** (Panel, Reportes por período, Perfil con logo y borrado de cuenta) y asesores.
6. **Migración**: las 3 escuelas, 2 dueños, 4 códigos y 11 regalos pasan con sus fechas (ver `32` §2).

### Etapa F — Superadmin mínimo para operar V2
Lo imprescindible, además de socios: ver/editar el plan y el vencimiento de una organización, publicar
versiones del APK (ya existe `POST /api/app/releases`), eliminar una cuenta/organización (con la limpieza
multi-organización que hoy hace v1). Sin esto, el soporte quedaría sin herramientas el día del corte.

## 3 · Orden propuesto

`A → B → C → D → E → F`, cada etapa con su propio ciclo (diseño → migración → API → pantalla →
pruebas → documentación). **A y B son el mínimo para que V2 pueda salir**; C es necesaria apenas una
organización quiera invitar tripulación; E y F son lo que el usuario pidió antes del corte.

## 4 · Decisiones del usuario antes de construir

| # | Decisión | Propuesta |
|---|---|---|
| 1 | Registro: ¿cuenta primero con prueba y pagar después, o pagar antes de crear la cuenta? | **Cuenta primero con prueba de 15 días** (menos estados huérfanos) |
| 2 | ¿Verificación de correo obligatoria antes del primer ingreso? | Hoy v1 **no** la exige (cuenta activa al registrarse); mantener igual |
| 3 | Superadmin de V2: ¿solo lo de §2-E/F o replicar todo el Master actual? | Solo §2-E/F; el resto del Master se evalúa cuando se eche de menos |
| 4 | ¿Mantener el modo «pagar antes de registrar» para quien llega desde un enlace de plan de pago? | No: se registra con prueba y se paga en `/suscripcion` |

*Creado 2026-10-06 — diseño, sin construir.*
