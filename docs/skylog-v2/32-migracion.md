# Migración desde la base actual

[← Índice maestro](00-INDICE.md) · [Reglas](01-reglas.md)
Base: [`31-esquema-datos.md`](31-esquema-datos.md) · Auditoría: [`20-auditoria-datos.md`](20-auditoria-datos.md) §16.4

> **Confirmado con el usuario (2026-08-22): no bloquea Fase 0.** Aún no hay clientes reales en
> v2, así que este documento se verifica y se afina contra datos reales más adelante, antes del
> corte real de cada organización. Lo que sigue son las **reglas** — se prueban cuando haya algo
> real que migrar, no antes.

---

## 1 · El problema real, con números reales

`profiles` y `pilots` comparten 12 columnas y **ya divergieron en producción**
([`20-auditoria-datos.md`](20-auditoria-datos.md) §16.4, medido sobre los 10 pilotos vinculados
a un perfil):

| Campo | Filas divergentes |
|---|---|
| `phone` | 5 de 10 |
| `license_number` | 5 de 10 |
| `emergency_contact_phone` | 5 de 10 |
| `medical_expiry` | **2 de 10** — el grave: hoy Mi Perfil y Tripulación pueden mostrar estados de vigencia contradictorios para la misma persona |

Migrar no es copiar columnas — es **decidir, campo por campo, cuál de las dos versiones es la
verdad**, y hacerlo sin inventar certeza donde no la hay.

---

## 2 · El corte es por organización, no de una vez

Ya está decidido en [`50-hoja-de-ruta.md`](50-hoja-de-ruta.md) §1 — regla operativa O3: la
activación es **por organización**, con feature flag, empezando por `BitaFly QA - Organización
de Prueba`. Este documento asume ese modelo: cada organización se migra en un momento propio,
no hay un "día del corte" global.

**Consecuencia para las reglas de precedencia**: como cada organización se migra sola y en un
momento que su propio administrador puede acompañar, **los conflictos no tienen que resolverse
a ciegas**. Donde el riesgo regulatorio lo justifica, la regla correcta es **preguntarle al
administrador de esa organización**, no adivinar programáticamente cuál valor es el correcto.

---

## 3 · Clasificación de conflictos — y por qué no todos se resuelven igual

Dos categorías, según la clase del dato en [`30-entidades.md`](30-entidades.md) §1:

| Categoría | Ejemplos | Regla |
|---|---|---|
| **Bajo riesgo** | `phone`, `emergency_contact_phone` | Se resuelve **automáticamente** con una regla determinística, documentada aquí. Un teléfono desactualizado se corrige después sin consecuencia regulatoria |
| **Alto riesgo — clase ③ vigente** | `license_number`, `medical_expiry` | **Nunca se resuelve en silencio.** Se migra marcado como *"pendiente de confirmar"* y bloquea el corte de esa organización hasta que su administrador confirme el valor correcto en una pantalla de revisión |

Esta distinción es la aplicación directa de la regla **V1** (veracidad — el sistema no inventa
certeza) al problema concreto de la migración.

---

## 4 · Mapeo de tablas — origen → destino

| Origen (hoy) | Destino ([`31`](31-esquema-datos.md)) | Nota |
|---|---|---|
| `profiles` + `pilots` | `people` + `accounts` | Fusión — ver §5 |
| `organization_members` | `memberships` | Ya tiene la forma correcta (Fase 0-7 del refactor multi-org) — copia casi directa |
| — (no existe) | `designations` | Se **reconstruye**, no se migra: hoy el rol vive en `organization_members.role`, sin acta ni vigencia. Cada organización designa de nuevo a su Jefe de Pilotos / Gerente SMS al migrar |
| `aircraft` (columnas técnicas planas) | `aircraft_models` + `aircraft` | Se **infiere** un modelo por cada combinación única de marca+modelo ya presente en `aircraft`; los 26 atributos que faltan quedan vacíos, a completar por el cliente — no se inventan |
| `batteries`, `aircraft_components` | Igual, sin cambio de forma | Migración directa |
| `flight_plans` → `flight_authorizations` → `flights` | `authorization_requests` + `missions` + `flights` | El caso más costoso — ver §6 |
| `results_health`, `results_preflight`, `results_briefing`, `results_inventory` | `checklist_results` | Cuatro tablas idénticas se funden en una con columna `step` |
| `sms_reports` + `vor_mor_submissions` | `reports` + `cases` | Separa lo que hoy vive junto — ver §7 |
| `maintenance_logs` + `aircraft.maintenance_interval_*` | `maintenance_programs` + `maintenance_tasks` + `maintenance_events` | El programa por aeronave se **eleva** a programa por modelo — si dos aeronaves del mismo modelo tienen intervalos distintos hoy, es otro conflicto de clase alto riesgo (afecta cumplimiento de `100.535(3)`) |
| `company_manuals` + `manual_versions` | `manuals` + `manual_versions` | Sin cambio de forma |
| `audit_log`, `notifications`, `sms_case_events` | Quedan igual por ahora | Consolidarlas es una mejora de F1, no del corte de datos |

---

## 5 · Reglas de precedencia — `people` (el caso medido)

| Campo | Regla | Justificación |
|---|---|---|
| `full_name` | `profiles.full_name` → si es nulo, `pilots.name` → si ambos, concatenar `first_name + last_name` de `profiles` | `profiles.full_name` es el campo que la propia persona mantiene en Mi Perfil |
| `phone` | **El más reciente por `updated_at`** entre las dos filas · si no hay `updated_at` confiable, gana `profiles.phone` | Bajo riesgo (§3). Sin evidencia de cuál es más nueva, se prefiere la que edita la propia persona |
| `emergency_contact_phone` / `_name` | Igual regla que `phone` | Mismo razonamiento |
| `license_number` | **Alto riesgo.** Si coinciden, se migra sin más. Si divergen, queda `pending_review: true` y **ambos valores visibles** en la pantalla de revisión de esa organización | Es un identificador de certificación — un valor incorrecto es un defecto de cumplimiento, no un dato cosmético |
| `medical_expiry` | **Alto riesgo**, misma regla que `license_number` | Es el hallazgo grave de §1. Ver además `medical_cert_doc_id` — si alguna de las dos filas tiene el certificado adjunto, ese es indicio (no prueba) de cuál se actualizó de verdad, se muestra como ayuda en la pantalla de revisión, nunca se usa para decidir sola |
| `avatar_url` | `profiles.avatar_url` | Identidad de cuenta, no de expediente operativo |
| `email` | `profiles.email` (vinculado a `auth.users`) | Es el identificador de acceso — no hay ambigüedad posible |
| `id_type` / `document_number` | Igual regla que `license_number` si divergen (documento de identidad, alto riesgo) | |
| `medical_url` (`pilots`) | **No se migra.** 0 filas con valor — resto muerto (regla **E5**) | Confirmado en la auditoría, no se re-verifica por organización |
| `medical_cert_url` (`pilots`) | Se migra como `documents` con `role='medical_cert'`, `owner_type='person'` | Resuelve el patrón de E2 — el certificado vive en un solo lugar |

**Fusión de identidad**: cuando `pilots.profile_id` (o `owner_id`) ya vincula una fila `pilots`
con una fila `profiles`, ambas producen **una sola** fila `people` — nunca dos. Un `pilots` sin
vínculo (observador sin cuenta) produce una fila `people` sin `accounts` asociada, tal como
prevé [`30-entidades.md`](30-entidades.md) §2.

---

## 6 · `flight_plans` → `flight_authorizations` → `flights`

Hoy son tres tablas que representan el mismo vuelo en tres momentos, copiando datos a mano en
cada transición (`plan_data jsonb` existe justo para eso). La migración:

- **`flight_authorizations` completas y no canceladas** → una fila en `authorization_requests`
  (la solicitud) más una fila en `missions` (lo programado) por cada una.
- **`flight_plans` sin autorización asociada** (el piloto independiente que planea sin PIC
  asignado) → una fila en `missions` sin `authorization_id`, tal como prevé
  [`31`](31-esquema-datos.md) §3, pendiente **P-ES-2**.
- **`flights`** → una fila en la nueva `flights`, con `mission_id` resuelto por el emparejamiento
  ya existente en `import-dji` (fecha + `aircraft_id`).
- El `plan_data jsonb` **no se migra tal cual** — se descompone en las columnas reales de
  `missions`/`authorization_requests` que ya existían para eso; es exactamente el problema que
  este rediseño resuelve, no algo que deba sobrevivir.

Sin conflictos de precedencia aquí — es una sola fuente por vuelo, el problema es estructural
(tres tablas → tres entidades bien separadas), no de datos divergentes.

---

## 7 · `sms_reports` + `vor_mor_submissions` → `reports` + `cases`

Cada fila de ambas tablas produce **dos** filas nuevas: un `report` (lo que se reportó) y un
`case` (su seguimiento) — reflejando la separación de la decisión 10
([`40-sms.md`](40-sms.md) §5.7). El `assigned_to` del caso se resuelve al Gerente SMS **activo**
de esa organización al momento del corte — si no hay uno designado, el caso queda sin asignar y
aparece en el panel de revisión, no se le asigna a alguien al azar.

---

## 8 · Qué no se migra

Aplicación directa de la regla **E5** (función sin uso real no carga esquema), sobre lo ya
encontrado en [`20-auditoria-datos.md`](20-auditoria-datos.md):

- `pilots.medical_url` (0 filas).
- Las **20 de 84 tablas vacías** de la auditoría — se recrean solo si un frente futuro las
  necesita, con su forma nueva, no con la vieja.
- Las columnas legacy de `profiles` (`organization_id`, `role`, `subscription_plan`, campos de
  ePayco) — ya resueltas por `organization_members`/`memberships` desde la Fase 0-7 del refactor
  multi-organización. No hace falta esperar a la Fase 9 pendiente de ese refactor: el esquema
  nuevo simplemente no las tiene.

---

## 9 · Pendientes

| # | Pendiente |
|---|---|
| P-MIG-1 | **Mecanismo exacto del corte por organización**: ¿exportación única al activar el flag, o sincronización de un periodo de convivencia? No decidido — depende de cuánto tiempo quiera cada cliente operar en paralelo, algo que no se sabe hasta tener el primer cliente real migrando |
| P-MIG-2 | Diseñar la **pantalla de revisión** de conflictos de alto riesgo (§3) — quién la ve, qué organización, qué pasa si nadie responde |
| P-MIG-3 | Verificar si `updated_at` de `profiles`/`pilots` es confiable para la regla de "más reciente gana" (§5) — puede estar contaminado por procesos batch que tocan la fila sin que la persona haya editado nada |
| P-MIG-4 | Confirmar el tratamiento de `maintenance_interval_*` divergente entre aeronaves del mismo modelo (§4) — mismo patrón de alto riesgo que `medical_expiry`, sin medir aún cuántos casos reales existen |
| P-MIG-5 | Reglas de precedencia para `form_definitions` (231 filas, 6 tipos en una tabla-navaja-suiza, §16.6 de la auditoría) — fuera de alcance de este documento, se resuelve al diseñar el esquema de checklists configurables |

---

*Creado 2026-08-22. No bloquea Fase 0 — se verifica contra datos reales antes del primer corte.*
