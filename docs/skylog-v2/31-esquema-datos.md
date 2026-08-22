# Esquema de datos — punto de partida

[← Índice maestro](00-INDICE.md) · [Reglas](01-reglas.md)

> Migrado desde `../plan-bitafly-v2.md` el 2026-08-22 al partir ese documento por la regla de 500 líneas (D1).

---

## 8. Modelo de datos

Todas las tablas nuevas siguen las convenciones ya establecidas: `organization_id`, RLS con
`private.user_org_id()` / `private.user_is_manager()`, políticas envueltas en `(SELECT ...)`
(optimización InitPlan de la auditoría 2026-07-14), y **nada de columnas derivadas** — los
cálculos se hacen al leer, como ya se hace con SPI, zonas de riesgo y % de cumplimiento.

### 8.1 F2 — Comando y Control

| Tabla | Propósito | Notas |
|---|---|---|
| `c2_devices` | Vincula una `aircraft` con su fuente de telemetría | `device_sn`, `gateway_sn` (RC o Dock — la aeronave nunca conecta directo), `source` (`dji_pilot2`/`dji_flighthub2`), `bound_at`, `status`. Credenciales **nunca** aquí — en el gestor de secretos |
| `c2_sessions` | Una sesión de vuelo en vivo | FK a `aircraft`, `pilots`, `flight_authorizations`, `flights`. `started_at`, `ended_at`, `link_quality_min/avg`, `replay_path` (R2) |
| `c2_telemetry` | Muestras a **0,5 Hz** (frecuencia real de la Cloud API, §4.8) | Particionada por mes. Retención en Postgres: 12 meses; la traza completa vive en R2 |
| `c2_events` | Eventos críticos | `type` (`link_lost`/`link_degraded`/`geofence_breach`/`low_battery`/`rth_triggered`/`altitude_exceeded`), severidad, `sms_report_id` nullable |
| `c2_geofences` | Geocercas de la sesión | Derivadas de `plan_data.points` + techo. `breach_count` |
| `c2_stream_keys` | Claves de publicación de video | Rotables, TTL corto, una por sesión, revocables |

### 8.2 F5 — Tiempos de servicio

| Tabla | Propósito |
|---|---|
| `duty_periods` | `pilot_id`, `type` (`servicio`/`descanso`/`disponibilidad`/`entrenamiento`), `started_at`, `ended_at`, `source` (`manual`/`auto_dispatch`/`auto_close`) |
| `duty_exceptions` | Excepción autorizada: motivo, quién autoriza (JP), evidencia |
| `duty_annual_certifications` | Certificación anual 100.535(a)(12): `pilot_id`, `year`, `total_hours`, `certified_by`, `certified_at`, `document_path` |

El **motor de cumplimiento** es una función pura compartida cliente/servidor
(`lib/dutyCompliance.js`), mismo patrón exacto que `lib/trainingCompliance.js` y
`lib/safetyIndicatorStats.js` — probada con tests, sin estado, sin columna derivada.

### 8.3 F4 — Autorizaciones Aerocivil

| Tabla | Propósito |
|---|---|
| `aerocivil_authorization_requests` | Expediente por misión: estado (`borrador`/`listo`/`radicado`/`en_revision`/`autorizada`/`negada`), `submitted_at`, `radicado_number`, `response_document_path` |
| `aerocivil_request_documents` | Adjuntos del expediente (KML, matriz, póliza, ZNVD) con checksum |
| `aerocivil_credentials` | **Solo si se aprueba 4b.** Credenciales cifradas, `consent_at`, `consent_by`, `revoked_at`, `last_used_at` |

### 8.4 Adiciones a tablas existentes (aditivas, todas nullable)

| Tabla | Columna | Motivo |
|---|---|---|
| `aircraft` | `firmware_version`, `firmware_previous_version`, `firmware_backup_path`, `firmware_updated_at` | B5 — 100.535(a)(7) |
| `aircraft` | `c2_link_type`, `c2_link_notes` | Apéndice 2 (a)(4) |
| `flight_authorizations` | `bvlos_class` (I–V), `airspace_type`, `requires_pcuas` | B12, B10 |
| `flight_authorizations` | `observers jsonb` (posiciones fijas de observadores EVLOS) | B11 — 100.215(b) |
| `pilots` | `certified_hours`, `sms_training_hours`, `exclusive_operator` | B13 — 100.545(c) |
| `organizations` | `feature_flags jsonb` | Activación gradual de v2 |

### 8.5 Retención (B4 — 5 años)

`100.535(a)(29)` exige conservar **registros operacionales** 5 años. Hay que distinguir:

- **Registro operacional** (bitácora, mantenimiento, autorizaciones, reportes SMS, tiempos de
  servicio): retención **5 años mínimo, en todos los planes**. Esto es cumplimiento, no una
  característica de plan. *No hay hoy ninguna purga que los borre — se confirma y se documenta.*
- **Replay GPS y video C2**: son **evidencia complementaria**, no el registro operacional en sí.
  La retención por plan puede mantenerse — pero debe quedar **explícito en la política y en la
  interfaz**, para que ningún explotador crea que su obligación de 5 años está cubierta por un
  replay de 30 días. Se propone además una **exportación de archivo** para que el cliente
  conserve por su cuenta lo que vaya a expirar.

> ✅ **Confirmado (2026-08-22)**: la obligación de conservar 5 años es **documental**, no de
> replay. Los registros operacionales (bitácora, mantenimiento, autorizaciones, reportes SMS,
> tiempos de servicio) se conservan 5 años **en todos los planes, sin excepción**. El replay GPS
> y el video de C2 **mantienen su retención por plan tal como está hoy** — son evidencia
> complementaria, no el registro obligatorio.
>
> Consecuencia de diseño: esa distinción tiene que quedar **explícita en la interfaz**, no solo
> en este documento. Un explotador no debe poder creer que su obligación de 5 años está cubierta
> por un replay de 30 días.

---

### 8.6 Habilitación de C2 por plan

Decisión confirmada: C2 solo para **Flota y Enterprise**. Se implementa donde ya vive la
lógica de planes, sin inventar un mecanismo paralelo:

- `PLAN_CONFIG` (`lib/planLimits.js`) gana la capacidad `commandAndControl: true` solo en
  `flota` y `enterprise` — mismo patrón que las demás `features` del plan.
- El nav del espacio **OPERAR** oculta la entrada de C2 cuando el plan no la incluye.
- **Gate de rol y de plan también en la API**, no solo en la interfaz — convención ya
  establecida en el proyecto y reforzada tras la auditoría de reportes del 2026-07-22: el
  `c2-gateway` rechaza el registro de un dispositivo cuyo plan de organización no incluya C2,
  y los endpoints de sesión/telemetría verifican lo mismo.
- El plan efectivo se resuelve con `getOrgPlan()` (membresía del admin), igual que el resto de
  límites — no se lee `profiles.subscription_plan` directo.

---
