# Esquema de datos

[← Índice maestro](00-INDICE.md) · [Reglas](01-reglas.md) ·
Base: [`30-entidades.md`](30-entidades.md) · Registros: [`19-registros-obligatorios.md`](19-registros-obligatorios.md)

> **Rehecho 2026-08-22** sobre el mapa de entidades. La versión anterior organizaba las tablas
> por "frente" (F2/F4/F5) bajo la premisa de evolución aditiva, e incluía una sección de
> Comando y Control que ya no aplica (decisión 20). Esta versión organiza las tablas por
> **entidad de negocio**, siguiendo `30-entidades.md` §1–§7.

---

## 0 · Convenciones (heredadas, se mantienen)

- `organization_id` + RLS en toda tabla que lo requiera, política escrita en la misma migración
  (regla **E4**).
- RLS con `private.user_org_id()` / `private.user_is_manager()`, políticas envueltas en
  `(SELECT ...)` (optimización InitPlan).
- **Sin columnas derivadas leídas por cálculo redundante** salvo el patrón ya probado de
  contador mantenido por RPC (`increment_aircraft_hours`) — un dato de clase **② derivado**
  puede *almacenarse*, nunca *tecklearse*; se actualiza desde el evento que lo origina, no desde
  un formulario.
- Un dato de clase **④ evento** es **append-only**: se corrige insertando un evento nuevo, nunca
  con `UPDATE` sobre el original salvo los campos administrativos explícitos (ej. cerrar un caso).
- Toda migración vive en el repo (regla **E6**). Cero esquema creado a mano.

---

## 1 · Identidad y organización — `30-entidades.md` §2

| Tabla | Clase | Columnas clave | Nota |
|---|---|---|---|
| `people` | ①③ | `full_name`, `document_type`, `document_number`, `phone`, `email`, `license_number` (CIPU), `medical_cert_expiry`, `medical_cert_doc_id` | **Reemplaza la superposición `profiles`/`pilots`.** Existe con o sin cuenta de acceso — un observador puede estar aquí sin `auth.users` |
| `accounts` | ① | `person_id` FK, vínculo 1:1 opcional con `auth.users` | Credencial. Una Persona puede no tener cuenta |
| `memberships` | ①③ | `person_id`, `organization_id`, `role`, `status` (`activa`/`cerrada`), `started_at`, `ended_at` | El **rol vive aquí**, no en la Persona — resuelve el caso Jefe de Pilotos en una org / piloto en otra |
| `designations` | ①③④ | `organization_id`, `person_id`, `role_type` (`jefe_pilotos`/`gerente_sms`/`ejecutivo_responsable`), `started_at`, `ended_at`, `resume_doc_id`, `act_doc_id` | Acta con vigencia, no un campo de rol. `100.535(14)(15)(16)` |
| `organization_certifications` | ①③ | `organization_id`, `cdo_number`, `cdo_issued_at`, `allowed_operation_types jsonb`, `allowed_visual_contact jsonb`, `opspecs_doc_id`, `expires_at` | Gobierna qué puede programarse — si BVLOS no está en `allowed_operation_types`, el sistema no debe dejar programarlo |

`people.medical_cert_expiry` es el campo que **hoy diverge en producción** (2 de 10 casos) por
vivir en dos tablas. Con una sola tabla el problema desaparece por construcción, no por
disciplina.

---

## 2 · Flota — `30-entidades.md` §3

| Tabla | Clase | Columnas clave | Nota |
|---|---|---|---|
| `aircraft_models` | ① | Marca, modelo, MTOW, **PMBO**, dimensiones (largo/ancho/diagonal con hélices), categoría (ala fija/rotatoria/mixta), tipo de despegue/aterrizaje, velocidades máx. (ascenso/descenso/vuelo), componente máx. de viento, techo, autonomía, alcance, rango de temperatura, batería/sistema equivalente, `gnss_supported jsonb`, certificación IP, `c2_link jsonb` (arquitectura, topología, frecuencias, redundancia, cobertura, latencia, encriptación, C2CSP), `c2_limitations`, detección de obstáculos, sistema de emergencia, estación de control, `ane_authorization_doc_id` | **Los 26 atributos del Apéndice 1**, Parte B. Uno por modelo, no por unidad |
| `aircraft` | ①②③ | `model_id` FK, `organization_id`, `serial_number`, `ruas_number`, `ownership_doc_id`, `total_hours` (② vía RPC), `operational_status`, `firmware_version`, `firmware_previous_version`, `firmware_backup_path`, `firmware_updated_at` | La unidad física. `100.535(1)(7)` |
| `eta_items` | ①③ | `organization_id`, `brand`, `model`, `reta_number`, `description` | Registrado ante AeroCivil igual que una aeronave |
| `batteries` | ②③ | Serial, `cycles` (② vía RPC desde `battery_logs`), salud, estado | Sin cambio de forma respecto a hoy |
| `aircraft_components` | ②④ | Roster vivo, reloj de uso desde `installed_at_aircraft_hours` | Patrón ya probado, se conserva |
| `maintenance_programs` | ① | `model_id` FK (no `aircraft_id`) | `100.535(3)` — **por modelo**, corrige el diseño actual |
| `maintenance_tasks` | ① | `program_id` FK, `system_category`, `interval_cycles`, `interval_hours`, `interval_calendar_days`, `tolerance_value`, `tolerance_unit` | Tres tipos de intervalo simultáneos, más tolerancia ligada a criticidad |
| `maintenance_events` | ④ | `aircraft_id`, `task_id` nullable, `type` (`programado`/`correctivo`/`menor`), `performed_at`, `performed_by`, `findings`, `return_to_service`, `doc_id` | |
| `unexpected_events` | ④ | `aircraft_id`, `flight_id` nullable, `type` (`aterrizaje_fuerte`/`impacto_aves`/`fod`/`perdida_helice`), `evaluated_by`, `evaluation_doc_id` | Dispara evaluación obligatoria, `MAUT-5.0-12-090` ítem 19 |
| `calibration_equipment` | ①③ | `standard`, `uncertainty`, `period_days`, `last_calibrated_at`, `certificate_doc_id` | `MAUT-5.0-12-090` ítem 22 |

---

## 3 · Operación — `30-entidades.md` §4

| Tabla | Clase | Columnas clave | Nota |
|---|---|---|---|
| `authorization_requests` | ①④ | `organization_id`, `scope_start`, `scope_end`, `total_flights_planned`, `status`, `zone`, `submitted_at`, `radicado_number`, `response_doc_id` | La solicitud a AeroCivil — campaña, no vuelo individual |
| `risk_analyses` | ④ | `authorization_id` FK, `hazards jsonb` (24 fijos + libres, cada uno con causa/consecuencia/probabilidad/severidad/índice/tolerabilidad/mitigación/residual), `signed_by` (Jefe de Pilotos), `signed_at` | Emite el **formato oficial exacto** `MAUT-5.0-12-055` (regla **C2**) |
| `missions` | ①④ | `authorization_id` nullable, `pic_person_id`, `aircraft_id`, `zone`, `scheduled_at` | Lo programado |
| `flights` | ④ | `mission_id` nullable, `aircraft_id`, `pilot_person_id`, `takeoff_at`, `landing_at`, `total_time`, `visual_condition` (VLOS/EVLOS/BVLOS), `mission_type`, `weather_observation_id` FK, `replay_path` | **El evento único.** Libro de vuelo y bitácora del piloto son *vistas* sobre esta tabla, no tablas separadas |
| `weather_observations` | ④ | `lat`, `lon`, `observed_at`, `source`, `payload jsonb` | Se archiva **junto al vuelo**, no se descarta tras consultarla |
| `checklist_results` | ④ | `flight_id`, `step` (`salud`/`inventario`/`prevuelo`/`riesgo`/`briefing`), `payload jsonb`, `completed_by`, `completed_at` | Sin cambio de forma respecto a hoy |

### 3.1 Tiempos de servicio (F5) — la pieza sin cubrir

| Tabla | Clase | Columnas clave | Nota |
|---|---|---|---|
| `duty_periods` | ④ | `person_id`, `type` (`servicio`/`descanso`/`disponibilidad`/`entrenamiento`), `started_at`, `ended_at`, `source` (`manual`/`auto_dispatch`/`auto_close`) | No es la duración del vuelo — incluye preparación, monitoreo activo, espera |
| `duty_exceptions` | ④ | Motivo, `authorized_by` (JP), `evidence_doc_id` | |
| `duty_annual_certifications` | ④ | `person_id`, `year`, `total_hours`, `certified_by`, `certified_at`, `document_path` | `100.535(12)` |

El **motor de cumplimiento** es una función pura compartida cliente/servidor
(`lib/dutyCompliance.js`), mismo patrón que `lib/trainingCompliance.js` y
`lib/safetyIndicatorStats.js` — sin estado, sin columna derivada, con tests. Evalúa los límites
de `§100.540` (90 h/mes · 6 h BVLOS u 8 h VLOS/EVLOS por 24 h · 2 h continuas + 30 min) y
**bloquea** la asignación que los rompe, no la reporta después.

---

## 4 · Seguridad operacional (SMS) — `30-entidades.md` §6

| Tabla | Clase | Columnas clave | Nota |
|---|---|---|---|
| `hazards` | ①④ | Descripción, fuente, `related_barrier_id` nullable | |
| `risk_assessments` | ④ | `hazard_id`, probabilidad, severidad, mitigación, residual | Matriz **configurable** de la organización — distinta de `risk_analyses` de §3, que es la matriz fija de la autoridad |
| `barriers` | ① | Control o defensa declarada | |
| `reports` | ④ | `type` (`vor`/`mor`/`nsmp`/`interno`), `reported_by` nullable (anónimo permitido), `confidentiality_level` | Lo diligencia **cualquiera** (decisión 10) |
| `cases` | ④ | `report_id`, `assigned_to` (**Gerente SMS**), `status`, `closed_at` | El análisis, separado del reporte |
| `case_actions` | ④ | `case_id`, `responsible`, `due_date`, `done_at` | |
| `case_events` | ④ | Línea de tiempo, append-only | Patrón ya probado (`sms_case_events`) |
| `safety_indicators` | ① | `is_official` (11 precargados) vs. propios del cliente | Decisión 8 |
| `safety_indicator_monthly` | ④ | Numerador, denominador (**ciclos de vuelo**), tasa sin redondear | Alertas y meta se **congelan al cerrar el año**, se guardan como valores |
| `sms_self_assessments` | ④ | Puntaje por los **47 ítems** de `MAUT-3.0-12-097`, por componente/elemento | [`15`](15-evaluacion-sms.md) |

---

## 5 · Documental — la entidad transversal (`30-entidades.md` §7)

| Tabla | Clase | Columnas clave | Nota |
|---|---|---|---|
| `documents` | ①③④ | `owner_type` (`organization`/`person`/`aircraft`/`model`/...), `owner_id`, `role` (`logo`/`poliza`/`licencia`/...), `file_path`, `version`, `uploaded_by`, `retention_class`, `legal_hold_id` nullable | **Resuelve E2**: el logo se sube una vez y lo referencia quien lo necesite |
| `manuals` | ①④ | `organization_id`, `type` (MO/MCM/MSMS/MMP), `current_version_id` FK | Del cliente — nosotros lo custodiamos, no lo redactamos |
| `manual_versions` | ④ | Historial inmutable, `effective_date`, `file_path` | Patrón ya probado, se conserva |
| `authority_submissions` | ④ | `organization_id`, `period`, `type` (`mensual`/`spi`/`vor_mor`), `submitted_at`, `submitted_by`, `doc_id` | `100.535(26)` — paquete de tres, con acuse |
| `legal_holds` | ④ | `case_id`, `opened_at`, `opened_by`, `released_at`, `released_by`, `scope jsonb` (qué vuelos/documentos) | Ver §6 |

---

## 6 · Retención y custodia legal (100.535(29))

- **Registro operacional** (bitácora, mantenimiento, autorizaciones, reportes SMS, tiempos de
  servicio): retención **5 años mínimo, en todos los planes** — cumplimiento, no característica
  de plan.
- **Replay y video**: evidencia complementaria, retención **por plan** como hoy — declarado
  explícitamente en la interfaz para que nadie confunda un replay de 30 días con el registro
  obligatorio.
- **Custodia legal** (`legal_holds`, nuevo — ver [`14`](14-listas-verificacion.md) §4.7): al abrir
  un `case` sobre un vuelo, el material asociado (replay, video, meteorología archivada,
  checklists) **queda fuera de la purga por cuota** hasta que alguien con autoridad lo libere.
  Cada acceso al material bajo custodia se audita.

---

## 7 · Comando y Control — ⏸ dormido (decisión 20)

Las tablas `c2_devices`, `c2_sessions`, `c2_telemetry`, `c2_events`, `c2_geofences` y
`c2_stream_keys` quedaban diseñadas en la versión anterior de este documento contra la
especificación de DJI. **No se crean mientras C2 esté omitido.** El diseño íntegro sigue en
[`42-comando-control.md`](42-comando-control.md) para cuando se retome.

La habilitación por plan (`commandAndControl` en `PLAN_CONFIG`, gate también en la API) queda
igual documentada y dormida en ese mismo lugar.

---

## 8 · Pendiente

| # | Pendiente |
|---|---|
| P-ES-1 | Precisar `hazards jsonb` de `risk_analyses` — modelar como filas propias si el análisis lo justifica al construir F4a |
| P-ES-2 | Definir si `missions` y `authorization_requests` colapsan en una sola tabla para el piloto independiente, que hoy despacha sin orden de vuelo |
| P-ES-3 | Reglas de precedencia para el ETL de `people` desde `profiles`/`pilots` divergentes → [`32-migracion.md`](32-migracion.md), aún sin escribir |

---

*Actualizado: 2026-08-22.*
