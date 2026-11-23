# 40a — SMS: comités SRB y SAG (plan de implementación por fases)

> Subsección de [`40-sms.md`](40-sms.md). Añade al módulo SMS dos comités de
> seguridad operacional —**SRB** (Comité de Revisión de Seguridad Operacional)
> y **SAG** (Grupo de Acción de Seguridad Operacional)— con integrantes por
> correo, acceso restringido a su sección y actas de reunión.
>
> Creado: 2026-11-23. Estado: **plan aprobado, sin construir**.

## 1. Fundamento normativo (de dónde sale el modelo)

El modelo **no se inventa**: se toma del Manual SMS de un cliente real (WEST
ARMY SECURITY — *MANUAL DE OPERACIONES WAS*, §**11.12.7 «Comités de seguridad
operacional»**, pág. 277; supervisión en §11.12.8, pág. 278; rendición de
cuentas §11.12.9, pág. 279; consolidación de SPI §11.11, pág. 271). Es la
estructura estándar RAC 219 / OACI, así que sirve de base configurable para
cualquier organización.

| Aspecto | **SRB** (Safety Review Board) | **SAG** (Safety Action Group) |
|---|---|---|
| Nivel | Estratégico | Operativo / táctico |
| Integrantes | Ejecutivo Responsable (**preside**), Gerente de Seguridad Operacional (**secretaría técnica**), Jefe de Pilotos; asesores invitados | Gerente de Seguridad Operacional (**coordina**), Jefe de Pilotos, pilotos u observadores designados; proveedor de mantenimiento invitado |
| Funciones | Controlar la eficacia del SMS; revisar desempeño vs. objetivos y metas; asignar recursos; decidir sobre riesgos inaceptables y aceptar tolerables; aprobar cambios/enmiendas; revisar auditorías, investigaciones y políticas | Supervisar el rendimiento; gestionar riesgos específicos; coordinar e implementar medidas de control y acciones correctivas; evaluar cambios operacionales/tecnológicos; seguimiento a compromisos |
| Frecuencia | Ordinaria **semestral**; extraordinaria ante riesgo inaceptable, accidente/incidente grave o cambio significativo | **Mensual**; extraordinaria a solicitud del GSO |
| Registro (acta) | Acta firmada por los participantes, con **decisiones**, responsables y plazos | Acta firmada por los participantes, con **acciones**, responsables y plazos |

### 1.1 Correspondencia con los roles de BitaFly

| Manual (cargo) | Rol de membresía en BitaFly |
|---|---|
| Ejecutivo Responsable | `admin` (Gerente General) |
| Gerente de Seguridad Operacional | `gerente_sms` |
| Jefe de Pilotos | `jefe_pilotos` |
| Pilotos / observadores designados | `piloto` |
| Asesor / proveedor / integrante externo | **`comite`** (nuevo — solo-comité) |

**Consecuencia de diseño:** la mayoría de integrantes ya tienen un rol operativo
en la empresa; para ellos el comité es solo una **pertenencia adicional** y su
rol no cambia. Los integrantes que *solo* son del comité (asesores, proveedor,
observadores externos) entran con el rol nuevo **`comite`**, que:
- **no cuenta** contra el límite de pilotos del plan;
- tiene permisos en `none` para todo el sistema (menú vacío);
- solo ve la sección del comité al que pertenece.

Esto cumple el requisito del usuario: *«solo podrán ingresar a la sección que
les corresponda SRB o SAG, y no sumarán como pilotos, a menos que tengan cargo
de pilotos»*.

## 2. Decisiones confirmadas (AskUserQuestion, 2026-11-22)

1. **Acceso:** login restringido a su sección.
2. **Alcance:** integrantes + actas de reunión.
3. **Administran:** Gerente SMS (`gerente_sms`) y Gerente General (`admin`).

## 3. Modelo de datos (migración nueva)

Toda tabla nueva lleva `organization_id`, RLS y política en la **misma**
migración (regla del proyecto). Primero se aplica a **desarrollo**
(`bqimtkwzayewwubgsaji`) y solo al final a **producción**
(`ilozajejhecskmhwxkui`).

```sql
-- committee: 'srb' | 'sag'
-- role_in_committee: 'presidente' | 'secretario' | 'coordinador' | 'miembro' | 'invitado'

create table sms_committee_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  committee text not null check (committee in ('srb','sag')),
  person_id uuid not null references people(id) on delete cascade,
  role_in_committee text not null default 'miembro'
    check (role_in_committee in ('presidente','secretario','coordinador','miembro','invitado')),
  added_by uuid references people(id),
  created_at timestamptz not null default now(),
  unique (organization_id, committee, person_id)
);

create table sms_committee_meetings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  committee text not null check (committee in ('srb','sag')),
  meeting_date date not null,
  meeting_type text not null default 'ordinaria'
    check (meeting_type in ('ordinaria','extraordinaria')),
  title text not null,
  agenda text default '',
  decisions text default '',          -- SRB: decisiones · SAG: acciones
  commitments jsonb default '[]'::jsonb, -- [{texto, responsable_person_id, plazo}]
  attendees jsonb default '[]'::jsonb,   -- [{person_id|nombre, firma?}]
  created_by uuid references people(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

**RLS (ambas tablas):** `SELECT` para miembros activos de la organización que
sean gestores (`admin`/`gerente_sms`) **o** integrantes del comité; `INSERT/
UPDATE/DELETE` solo para `admin`/`gerente_sms` de la organización. Se reutiliza
el patrón de las demás tablas SMS (función `v2_is_duty_manager` / pertenencia).
La autorización fina **también** se comprueba en cada API (convención del
proyecto: el rol se valida en el servidor, no solo en RLS ni en la UI).

> **Nota sobre el rol `comite`:** no hay CHECK sobre `memberships.role` en el
> esquema actual, así que no requiere migración de constraint. Sí se documenta
> como valor válido y se añade a todos los lugares que enumeran roles.

## 4. Puntos de enganche en el código (verificados)

| Qué | Archivo | Cambio |
|---|---|---|
| Excluir del cupo de pilotos | `src/lib/v2/planLimits.js` → `crewCountsForLimit(role)` | añadir `&& role !== 'comite'` |
| Permisos por rol | `packages/domain/src/permissionsMatrix.js` | filas nuevas **V7** (SRB) y **V8** (SAG); `comite` sin columna ⇒ ya devuelve todo `none` (verificar) |
| Acceso al comité | `packages/domain/src/permissionsMatrix.js` | helper `canAccessCommittee({ role, committees, committee })` = gestor **o** pertenece |
| Contexto de sesión | `src/app/(v2)/api/duty/context/route.js` | cada `organizations[i]` devuelve `committees: ['srb'|'sag']` |
| Navegación + gating | `src/app/(v2)/layout.js` | ítems SRB/SAG; `linkVisible`/`screenBlocked` consideran `committees`; redirección de `comite`-only a su sección |
| Invitar por correo | `src/app/(v2)/api/invitaciones/route.js` + dominio `canInviteRole` | nuevo endpoint de comité (ver Fase 2) reutiliza `newInvitationToken`/`sendInvitationEmail` |
| Ruta protegida | `src/middleware.js` | `/sms` ya es `APP_PREFIX` ⇒ `/sms/srb` y `/sms/sag` ya exigen sesión; **sin cambios** |

Códigos de permiso libres confirmados: **V7** y **V8** (la matriz llega hasta
`V6`). V7/V8: `SA=S, GG=S, JP=S, GS=S, P=N, PI=N` (los gestores entran por rol;
cualquier otro entra por pertenencia al comité).

## 5. Fases (cada una con su verificación antes de seguir)

### Fase 0 — Esquema + dominio (sin UI)
1. Escribir la migración (§3) en `supabase/migrations/`.
2. Aplicarla a **desarrollo** (`bqimtkwzayewwubgsaji`) vía MCP `apply_migration`.
3. Dominio: `crewCountsForLimit` excluye `comite`; añadir filas V7/V8; helper
   `canAccessCommittee`.
4. Pruebas de dominio nuevas: `crewCountsForLimit('comite') === false`,
   `permissionsForRole('comite')` todo `none`, `canAccessCommittee` (gestor,
   integrante, ajeno).

**Verificación Fase 0 (gate):**
- [ ] `npm run test:domain` verde (incluidas las nuevas).
- [ ] `list_tables` en desarrollo muestra las 2 tablas con RLS activa.
- [ ] `get_advisors` (security) sin hallazgos nuevos por estas tablas.

### Fase 1 — Contexto + navegación (acceso restringido)
1. `/api/duty/context`: consultar `sms_committee_members` del `personId` y
   devolver `committees` por organización.
2. `layout.js`: ítems `SRB` (`/sms/srb`, perm `V7`) y `SAG` (`/sms/sag`, perm
   `V8`) en el grupo SMS; `linkVisible`/`screenBlocked` muestran la sección si
   el rol tiene el permiso **o** `committees` incluye ese comité; un `comite`-
   only se redirige a su sección al entrar a `/inicio`.

**Verificación Fase 1 (gate) — local (`npm run dev`):**
- [ ] Gestor (`admin`/`gerente_sms`): ve SRB y SAG en el menú.
- [ ] `piloto` sin comité: no ve ni SRB ni SAG.
- [ ] Integrante de SRB (simulado): ve **solo** SRB; `/sms/sag` y el resto, bloqueado.

### Fase 2 — Backend de integrantes
1. `src/app/(v2)/api/sms/committees/[committee]/members/route.js` — `GET`
   (lista), `POST` (agregar por correo), `DELETE` (quitar). Solo `admin`/
   `gerente_sms`.
2. Agregar por correo: si la persona ya tiene membresía en la org, solo se crea
   la fila en `sms_committee_members` (su rol **no** cambia); si no existe, se
   crea invitación con rol `comite` + metadato de comité, reutilizando el flujo
   de `api/invitaciones`. La aceptación crea `membership(comite)` +
   `sms_committee_members`.

**Verificación Fase 2 (gate):**
- [ ] Agregar un piloto existente al SAG → aparece como integrante y **sigue
      contando** como piloto (tiene rol piloto).
- [ ] Invitar un correo nuevo como integrante → llega el correo; al aceptar,
      entra como `comite` y **no** suma al cupo de pilotos.
- [ ] Un no-gestor recibe 403 al intentar agregar/quitar.

### Fase 3 — Backend de actas
1. `src/app/(v2)/api/sms/committees/[committee]/meetings/route.js` — `GET`,
   `POST`, `PATCH`, `DELETE`. Campos de §3. Solo `admin`/`gerente_sms` escriben;
   integrantes del comité pueden **ver**.
2. Registrar en `auditLog` (crear/editar acta) como el resto del SMS.

**Verificación Fase 3 (gate):**
- [ ] Crear, editar y listar un acta de SRB y una de SAG.
- [ ] Integrante `comite` ve las actas de su comité, no las del otro.

### Fase 4 — UI
1. `src/app/(v2)/sms/srb/page.js` y `sms/sag/page.js` sobre un componente
   compartido parametrizado por comité, con `SectionHero`/`SectionCard` y
   `Panel` (mismo lenguaje visual que `sms/gobernanza`). Dos bloques:
   **Integrantes** (agregar por correo, lista con cargo, quitar) y **Actas**
   (listar, crear, ver/editar), con el recordatorio de frecuencia (SRB
   semestral / SAG mensual).

**Verificación Fase 4 (gate) — local:**
- [ ] Flujo completo en pantalla: agregar integrante, crear acta, ver como
      integrante `comite`.
- [ ] Captura de pantalla de ambas secciones para el usuario.

### Fase 5 — Docs + verificación final + despliegue
1. Registrar V7/V8 en [`70-matriz-de-permisos.md`](70-matriz-de-permisos.md);
   decisión y estado en [`51-bitacora.md`](51-bitacora.md); este doc en
   [`00-INDICE.md`](00-INDICE.md).
2. Aplicar la migración a **producción** (`ilozajejhecskmhwxkui`).
3. `npm run lint && npm run build && npm run test:domain` limpios.
4. `git push origin main`.

**Verificación Fase 5 (gate):**
- [ ] Lint + build + test:domain verdes.
- [ ] Migración en producción confirmada (`list_migrations`).
- [ ] Prueba de humo en bitafly.com tras el despliegue (crear integrante + acta).

## 6. Riesgos y notas

- **Orden migración → código:** el `/api/duty/context` consulta la tabla nueva;
  por eso la migración de producción debe ir **antes** del push (o en el mismo
  despliegue). Si la tabla no existe, la consulta se degrada a `committees: []`
  (envolver en try/catch para no romper el contexto de sesión).
- **Un integrante en los dos comités:** permitido (dos filas en
  `sms_committee_members`); el menú muestra ambas secciones.
- **Quitar el último gestor de un comité:** no aplica — los gestores entran por
  rol, no por pertenencia; el comité nunca queda sin administrador.
- **Lo regulatorio no se prueba solo con lint/build** (regla Q3): las fases 2–4
  se verifican con flujo real; lo que no se pueda probar se declara.
