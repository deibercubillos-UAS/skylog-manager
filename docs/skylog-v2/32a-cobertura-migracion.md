# Cobertura de la migración — ¿llega TODO lo de v1 a las tablas de V2?

[← Migración](32-migracion.md) · [Índice maestro](00-INDICE.md) · [Esquema v2](31-esquema-datos.md)

> **Verificación del 2026-10-06**, pedida por el usuario antes de cerrar el plan:
> *"que antes de commit se pase toda la información de las tablas de la versión 1 a las tablas de
> la versión 2, con el fin de dejar un solo proyecto en main en Supabase"*.
>
> **Método**: se leyó, **solo en lectura**, el esquema real de producción (`information_schema`) y
> los **conteos de filas y de columnas con dato** — **no se leyó contenido de ninguna fila** y no se
> escribió nada. Se cruzó columna por columna contra el esquema real de V2 con un script
> (`coverage.py`, 41 tablas con destino). Las cifras son de hoy y **crecen**: se repiten el día del ensayo.

## 0 · Estado tras la aprobación del usuario (2026-10-06, decisión 180)

El usuario aprobó **agregar a V2 todo lo marcado «Agregar»** (§4) y resolvió las tres decisiones de §3.2:
**credenciales de la Aerocivil → que el usuario las vuelva a registrar**, **ruta del APK → se corrige** y
**catálogo de municipios → se copia**. Quedó **construido en el branch de V2** (migraciones
`20261006080000_v2_migration_coverage.sql` y `20261006090000_v2_dispatch_close_coverage.sql`, ya aplicadas):

| Hueco | Qué se hizo |
|---|---|
| Vuelos: lugar, notas, N.° de misión, alertas, origen, reglas de vuelo | Columnas `location`, `notes`, `external_ref`, `alerts`, `source`, `flight_rules` en `flights`; la Bitácora las captura (lugar y novedades) y muestra el lugar; el **cierre de vuelo** guarda lugar (la zona de la misión), novedades y origen `despacho` |
| Organización: representante, teléfono, correo, tipo de identificación | Columnas en `organizations` + campos en `/organizacion` |
| Registro ante la Aerocivil (DAN, N.° de operador, vigencia) | Columnas en `organization_certifications` + campos en `/organizacion` + **alerta de vencimiento** en el Centro de Control |
| Persona: foto y contacto de emergencia | `people.avatar_path`, `emergency_contact_*`; foto y contacto en `/perfil` |
| Expediente (cédula, curso, examen teórico, certificado médico) | Tabla `person_documents` + `/api/personal/documents` + sección «Foto y expediente» en `/perfil` (la propia persona o un gestor; 4 MB; URL firmada) |
| Nombre de componente | `aircraft_components.name` (formulario y tabla de Baterías y Componentes) |
| Foto de aeronave | `aircraft.image_path` + `/api/flota/aircraft/[id]/image` + espacio en la edición de la aeronave |
| Adjunto de mantenimiento | `maintenance_events.document_path` + `/api/flota/maintenance/events/[id]/document` + archivo opcional al registrar |
| Contactos de emergencia de la organización | Tabla `organization_emergency_contacts` + sección en `/organizacion` (los ve todo miembro, los edita un gestor) |
| **Credenciales del portal Aerocivil** (`aerocivil_credentials`) | **No se migran.** La contraseña está cifrada con la llave de v1 y no debe copiarse. La organización afectada (1) **las vuelve a registrar** cuando se retome la radicación asistida (F4b); se le avisa en el corte |
| **Versión del APK** (`app_releases`) | Tabla `app_releases` en V2 con la política de lectura pública de la fila vigente. La ruta pública `GET /api/app/version` **no cambia** (lee la misma tabla) y la fila vigente se copia en el ETL. Como V2 no tiene panel de superadmin, la publicación de nuevas versiones es `POST /api/app/releases` con la llave de administración (`ADMIN_SECRET`, header `x-admin-key`), que además exige `versionCode` mayor al vigente |
| **Catálogo de municipios** (`colombia_geo`, 1122) | Tabla `colombia_geo` en V2 con columnas limpias (`code`, `department`, `municipality`); **el ETL la copia tal cual** y verifica 1122 = 1122 (es referencia pública, no se transforma) |

**Lo que sigue en `legacy_v1`** (decisión propuesta en §2, no se construye hasta el ETL): resultados de checklists por
vuelo, bitácora de auditoría y notificaciones, SORA, configuración VOR/MOR, planeaciones guardadas, inventario y
existencias, programa de capacitación viejo, estados transitorios de pago/registro, valores por defecto de
mantenimiento y los campos sin uso real (cargo, `flight_prefix`, `incidents`…).

## 1 · Resultado en una frase

**Hoy NO llega todo.** De las **84 tablas** de v1, **64 tienen datos** y 20 están vacías. Para **la mayoría de los datos
de negocio** hay destino; pero hay **huecos reales** — información que V2 hoy no tiene dónde guardar —
y **tablas con datos sin equivalente**. Este documento los lista con su **peso real** (cuántas filas
tienen ese dato) para decidir uno por uno, y propone cómo cerrarlos **sin perder nada**.

## 2 · Cómo se garantiza «toda la información» (cuatro mecanismos, en este orden)

| # | Mecanismo | Cuándo se usa |
|---|---|---|
| 1 | **Columna/tabla de V2 existente** | Hay equivalente directo |
| 2 | **Agregar a V2** (columna o tabla nueva, migración aditiva) | El dato tiene uso real en V2 o ya está en muchas filas |
| 3 | **Plegar en un texto libre con etiqueta** (`description`, `notes`, `contact`…) | Texto de poco volumen que V2 guarda en un solo campo (p. ej. daños y acciones inmediatas de un reporte, correo y teléfono de un proveedor) — no se pierde, solo cambia de forma |
| 4 | **Esquema `legacy_v1` dentro del mismo proyecto nuevo** (copia fiel de la tabla, sin pantalla) | Lo demás: histórico que nadie edita pero que **no debe desaparecer** (resultados de checklists por vuelo, bitácora de auditoría, SORA, plantillas). Es lo que cumple «un solo proyecto»: **todo** vive en el proyecto final, y el proyecto viejo se puede retirar tras los 12 meses de solo lectura |

> El mecanismo 4 es la respuesta a «un solo proyecto en main»: el proyecto de Supabase final contiene
> las tablas de V2 **más** `legacy_v1` (solo lectura, con RLS que solo ve un administrador). Así no hace
> falta mantener dos proyectos vivos, y tampoco forzar en V2 columnas que nadie usa.

## 3 · Tablas de v1 con datos → destino

### 3.1 Cubiertas (con destino en V2 y sin pérdida)

| v1 (filas) | → V2 | Nota |
|---|---|---|
| `organizations` (26) | `organizations` + `organization_certifications` | Ver huecos §4 |
| `profiles` (29) + `pilots` (24) | `people` + `accounts` | Reglas de precedencia de `32` §3 |
| `organization_members` (32) | `memberships` + `subscriptions` | Plan/vencimiento a `subscriptions` |
| `aircraft` (25) | `aircraft_models` + `aircraft` | `brand` ya viene separado (24 de 25): no hay que adivinarlo |
| `aircraft_components` (75) | `aircraft_components` | Directa (`name` se pierde: V2 solo tiene tipo+serie → §4) |
| `batteries` (18) | `batteries` | Directa |
| `flights` (58) | `flights` | **Huecos §4** |
| `flight_authorizations` (11) | `missions` (+ `authorization_requests`) | `plan_data` → `zone_geo`, `altitude_agl_m`, nombre y notas |
| `maintenance_logs` (6) | `maintenance_events` | Adjuntos §4 |
| `insurance_policies` (2) | `insurance_policies` + `insurance_policy_aircraft` | Directa |
| `company_manuals` (2), `manual_versions` (3), `manual_acknowledgments` (1) | `manuales`, `manual_versions`, `manual_acknowledgments` | Copiar archivos en R2 |
| `suppliers` (2), `supplier_audit_criteria` (2), `supplier_audits` (1) | igual en V2 | Contacto/dirección se pliegan (mecanismo 3) |
| `sms_reports` (1) + `vor_mor_submissions` (1) | `sms_reports` (+ `sms_cases`) | Daños, partes, acciones inmediatas se pliegan en `description` |
| `sms_case_actions` (1), `sms_case_events` (4) | `sms_case_actions`, `sms_case_events` | Enlazar al caso |
| `safety_hazards` (2), `safety_barriers` (1), `safety_indicators` (18) | `hazards`+`risk_assessments`, `barriers`, `safety_indicators` | Estado/responsable de peligros se pliega |
| `safety_risk_scales` (20) + `safety_risk_tolerability` (50) | `risk_matrices` (jsonb) | 70 filas → 1 fila por organización |
| `sms_gap_assessments` (3), `sms_gap_responses` (102), `sms_gap_question_visibility` (1) | igual en V2 | Se enlazan por número de pregunta (catálogo ya sembrado) |
| `sms_gap_questions` (100) | `sms_gap_questions` | Son las 100 preguntas oficiales, que V2 ya tiene sembradas: **no se copian**; solo se migran las que sean **personalizadas** de una organización (verificar `organization_id` no nulo en el ensayo) |
| `training_exams` (2), `training_exam_questions` (1) | `training_exams`, `training_exam_questions` | Pierde `title` (§4) |
| `training_sessions` (1) | `sms_training_sessions` | |
| `protocols` (1) + `form_definitions` (231) | `checklists` | 231 filas → pocas listas (los slots se agrupan) |

### 3.2 Con datos pero **sin tabla equivalente en V2** → decidir

| v1 (filas) | Qué es | Propuesta |
|---|---|---|
| `results_health` (8), `results_briefing` (8), `results_inventory` (7), `results_preflight` (8), `results_risk_assessment` (2) | Resultados de checklists y riesgo **por vuelo** | `legacy_v1` (V2 los liga a un despacho que el vuelo antiguo no tiene) |
| `daily_health_checks` (2) | Aptitud del piloto por día | `legacy_v1` |
| `emergency_contacts` (3) | Contactos de emergencia **de la organización** | **Agregar a V2** (tabla chica; es dato operativo) |
| `equipment_stock` (2), `inventory_items` (2) | Existencias e inventario de equipo | `legacy_v1` |
| `flight_plans` (1) | Planeaciones guardadas del piloto independiente | `legacy_v1` |
| `sora_assessments` (2) | Evaluaciones SORA (modelo distinto al MAUT-055 de V2) | `legacy_v1` |
| `training_programs` (1) | Programa de capacitación (reemplazado por el cronograma) | `legacy_v1` |
| `vor_mor_definitions` (34) | Configuración del formulario VOR/MOR por organización (V2 usa un formulario fijo) | `legacy_v1` |
| `mission_types` (1) | Tipos de misión personalizados | `legacy_v1` |
| `audit_log` (22), `notifications` (790) | Bitácora de acciones y campana | `legacy_v1` (la campana de V2 empieza vacía) |
| `invitations` (12), `partner_invitations` (20), `pending_registrations` (6), `pending_subscriptions` (5), `processed_webhook_refs` (2) | Estados transitorios de registro/pago/invitación | **No migran** (caducan o se reemiten); se archivan en `legacy_v1` |
| `epayco_plan_config` (6) | Precios y planes de ePayco | `legacy_v1` (V2 usa los planes de Wompi) |
| `aerocivil_credentials` (1) | **Usuario y contraseña cifrada** del portal AeroCivil de una organización | ⚠️ **Decidir**: la contraseña cifrada con la llave de v1 **no debe copiarse en claro ni dejarse accesible**; solo tiene sentido si F4b (radicación asistida) se retoma. Propuesta: **no migrar** y pedir a esa organización que la vuelva a registrar |
| `colombia_geo` (1122) | Catálogo de departamentos y municipios | **Decidir**: V2 geocodifica por texto; si se quiere el selector, se copia como catálogo |
| `app_releases` (1) | Versión del APK Android (actualización OTA) | ⚠️ **Decidir**: la app Android consulta `/api/app/version`. Si el dominio cambia a V2, esa ruta debe existir en V2 con su tabla |
| `free_grants` (11), `partners` (3), `partner_codes` (4), `partner_members` (2) | Programa de socios | Se migran **con el programa construido en V2** (decisión D) |

### 3.3 Vacías (0 filas): no se migran
`addon_subscriptions`, `aerocivil_monthly_reports`, `aerocivil_requests`, `aerocivil_submissions`,
`automation_jobs`, `battery_logs`, `billing_history`, `leads`, `maintenance_components`,
`mission_inventory_logs`, `pilot_endorsements`, `referral_commissions`, `referrals`,
`safety_indicator_actions`, `safety_indicator_monthly`, `safety_indicator_submissions`,
`sms_training_attendance`, `sms_training_sessions` (v1), `training_evaluations`,
`training_exam_attempts` — **se vuelven a contar el día del ensayo**.

## 4 · Huecos de columnas — datos que V2 hoy no puede guardar (con peso real)

Cifras: *filas con dato / total*.

### 4.1 `flights` (58 vuelos) — **el hueco más importante**

| Campo v1 | Con dato | Tiene destino en V2 | Propuesta |
|---|---|---|---|
| `location` (lugar) | **54 / 58** | ❌ | **Agregar** `flights.location` |
| `notes` | **48 / 58** | ❌ | **Agregar** `flights.notes` |
| `mission_id` (N.° de misión) | 13 / 58 | ❌ | **Agregar** `flights.external_ref` (decisión E ya tomada) |
| `has_alerts` + `alerts_json` | 9 / 58 | ❌ | **Agregar** `flights.alerts jsonb` (alertas del log DJI) |
| `imported` | 44 / 58 | ❌ | **Agregar** `flights.source` (importado/manual) — evidencia de cómo entró el vuelo |
| `auth_id` (autorización vinculada) | 7 / 58 | parcial | Se enlaza a la misión migrada por el mapa de IDs |
| `safety_report` | 2 / 58 | parcial | Se refleja en el `sms_report` si existe |
| `visual_condition` (VMC/IMC/NIGHT) | 58 / 58 | ❌ (la columna V2 es otra cosa) | **Agregar** `flights.flight_rules` o plegar en `notes` — **hoy se perdería en los 58** |
| `incidents`, `sora_total_score`, `flight_number`, `checklist_details`, `health_checked`, `battery_id` (0), `payload_id` (0), `observer_id` (0), `plan_id` (0) | ≈ 0 o por defecto | ❌ | `legacy_v1` |

### 4.2 `organizations` (26)

| Campo | Con dato | Propuesta |
|---|---|---|
| `dan_number`, `operator_number`, `registration_expiry` | 1 / 26 | **Agregar** a `organization_certifications` (decisión E) |
| `legal_rep`, `phone`, `operator_email` | 2 / 26 | **Agregar** a `organizations` (datos de contacto del explotador; salen en reportes) |
| `flight_prefix` | **26 / 26** | **Decidir**: prefijo del N.° de vuelo en v1. Si V2 no numera vuelos, `legacy_v1` |
| `tax_id_type` | — | Agregar `nit_type` o plegar en `nit` |

### 4.3 Personas (`pilots` 24 + `profiles` 29)

| Campo | Con dato | Propuesta |
|---|---|---|
| Foto de perfil (`avatar_url`) | 2 / 29 | **Agregar** a `people` (decisión E) |
| Contacto de emergencia | 3 + 2 | **Agregar** a `people` (decisión E) |
| `cipu_number` | 1 / 24 | `people.license_number` ya es «licencia / CIPU»: si hay ambos se guardan juntos (mecanismo 3) |
| `position` (cargo) | **24 / 24** | **Decidir**: en V2 el cargo es el rol de la membresía; el texto libre se pliega o va a `legacy_v1` |
| **Documentos del expediente**: cédula 3, curso de piloto 2, examen teórico 2, certificado médico 2 | 9 archivos | **Agregar `person_documents`** (tipo + ruta, mismo patrón `rowDocument`) — son evidencia de personal (§100.535(8)) |
| `city`, `signup_attribution`, `company_name`, `admin_notes` | 13 / 5 / — | `legacy_v1` |

### 4.4 Aeronaves (25), baterías (18), mantenimiento (6)

| Campo | Con dato | Propuesta |
|---|---|---|
| `image_url` (foto) | 2 / 25 | **Agregar** `aircraft.image_path` (o `legacy_v1`) |
| `mtow` | 1 / 25 | → `aircraft_models.mtow_kg` (ya tiene destino) |
| Intervalos y contadores de mantenimiento (`maintenance_interval_*`, `last_*`, `minor_*`) | 25 / 25 (son valores **por defecto**) | `legacy_v1`: en V2 el programa va **por modelo** y el vencimiento se deriva de los eventos; no se copian defaults como si fueran dato |
| `baja_*`, `transferred_*`, `rce_url`, `dan_url` | 0 | no hace falta |
| `aircraft_components.name` | 75 | **Agregar** `aircraft_components.name` (hoy V2 solo guarda tipo+serie y se perdería el nombre de 75 componentes) |
| `batteries.last_charge_date`, `last_maintenance` | 0 | no hace falta |
| `maintenance_logs`: adjunto (2), checklist de mantenimiento menor (2) | 2 / 6 | **Agregar** `maintenance_events.document_path` y plegar el checklist en `findings` |

## 5 · Qué se pierde si no se hace nada (resumen)

1. Lugar y notas de **casi todos los vuelos** (54 y 48 de 58) y las reglas de vuelo (VMC/IMC/NIGHT) de **los 58**.
2. El **nombre de 75 componentes** y 2 fotos de aeronave.
3. Los **9 documentos del expediente** de pilotos.
4. Datos de registro AeroCivil de 1 organización y contacto de 2.
5. El **cargo** de los 24 pilotos.

Todo lo demás ya queda cubierto por columnas existentes, por plegado en texto o por `legacy_v1`.

## 6 · Lo que hay que decidir (y qué cambia si se aprueba)

Aprobar la propuesta implica **una migración aditiva de V2** (columnas en `flights`, `organizations`,
`organization_certifications`, `people`, `aircraft`, `aircraft_components`, `maintenance_events`; tablas
`person_documents` y `organization_emergency_contacts`), la captura/visualización mínima en pantalla, y el
esquema `legacy_v1` con RLS de solo administrador. **No se hace nada de esto sin tu aprobación.**

*Creado 2026-10-06 — verificación de solo lectura; sin cambios de código ni de esquema.*
