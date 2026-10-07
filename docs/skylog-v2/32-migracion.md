# Migración v1 → v2 — ETL, precedencia y corte

[← Índice maestro](00-INDICE.md) · [Reglas](01-reglas.md) · [Esquema v2](31-esquema-datos.md) · [Auditoría de datos v1](20-auditoria-datos.md)

> **Estado: borrador de diseño con las siete decisiones del usuario ya tomadas (2026-10-06, decisiones 178 y 179).** Se escribe ahora porque el esquema de V2
> quedó cerrado (decisión 177) — la condición que puso el usuario para empezar. **Nada de esto se ha
> ejecutado.** No se tocó la base de producción: este documento se apoya en la auditoría de
> [`20-auditoria-datos.md`](20-auditoria-datos.md) y en el código/esquema de ambos lados. Todo lo
> marcado **«verificar en el ensayo»** es una suposición razonable que solo un ensayo contra una
> **copia** de producción puede confirmar.

---

## 1 · Premisas

1. **Producción no se toca** hasta el corte (regla del proyecto). Todo ensayo corre contra una **copia
   de solo lectura** de la base v1 y escribe solo en el *branch* de V2.
2. **Es un ETL pequeño**: la auditoría contó 50 vuelos, 22 organizaciones, 25 perfiles, 20 pilotos,
   16 aeronaves, 14 baterías, 6 mantenimientos, 11 autorizaciones. Cabe en minutos y se puede
   **ensayar, comparar y repetir** las veces que haga falta. Los números hay que **re-contarlos el día
   del ensayo**: crecen con cada cliente nuevo.
3. **Nada se resuelve en silencio.** Cada valor descartado por una regla de precedencia, cada fila
   que no se migra y cada campo sin destino queda en un **informe** que revisa una persona.
4. **Idempotente y re-ejecutable**: el script lleva una tabla de correspondencia `etl_id_map
   (entidad, id_v1, id_v2)`; correrlo dos veces no duplica.
5. **Las 20 tablas vacías de v1 no se migran** (`20` §16.3) — se verifican vacías el día del ensayo; si
   alguna ya tiene filas, se decide caso por caso.
6. **Retención de 5 años (RAC 100 §100.535(29))**: un registro operacional de v1 no puede
   desaparecer por la migración. Ver §7: la base v1 se conserva congelada y los registros migrados
   entran a V2 con su fecha original (la retención cuenta desde la fecha del hecho, no de la carga).

---

## 2 · Qué se migra, qué se transforma y qué no

> **Verificación de cobertura (2026-10-06)**: [`32a-cobertura-migracion.md`](32a-cobertura-migracion.md) cruzó
> columna por columna el esquema real de v1 contra el de V2, con el peso real de cada dato. Concluye que **hoy
> no llega todo** (lugar y notas de casi todos los vuelos, nombre de componentes, documentos del expediente de
> pilotos…) y propone cerrarlo con columnas aditivas y un esquema `legacy_v1` — pendiente de aprobación.

### 2.1 Mapa entidad por entidad

| Entidad v1 (tabla) | Destino V2 | Transformación / regla | Riesgo |
|---|---|---|---|
| `auth.users` | `accounts` (+ `auth.users` del proyecto nuevo) | Importar con hash de contraseña (§6-A) | **Alto** |
| `profiles` + `pilots` | `people` (+ `accounts`) | **Un humano = una persona.** Reglas §3 | **Alto** |
| `organization_members` (fuente de verdad desde la Fase 7 multi-org) | `memberships` | `role` y estado de la membresía; **no** se lee `profiles.role` (legacy) | Medio |
| `organizations` | `organizations` + `organization_certifications` | `company_name`, `nit`, `address`→`domicile`, `logo_url`; CDO-U/OpSpecs a certificaciones. Campos sin destino: §2.2 | Medio |
| `aircraft` | `aircraft_models` + `aircraft` | El `model` de v1 es texto libre: se **deduplica a modelos** (marca+modelo). Lo que no calce con el catálogo se lista para decisión manual (nunca se inventa la marca) | Medio |
| `aircraft.total_hours` | `aircraft.total_hours` | Se copia **tal cual** (odómetro), y se verifica contra la suma de horas de sus vuelos | Medio |
| `batteries` | `batteries` | Directa (`serial_number`, `brand`, `model`, `cycles`, `health_status`, `status`) | Bajo |
| `inventory_items` (tech/payloads) | — | **No migra** (V2 no tiene ese catálogo): se archiva. Ver §2.2 | Bajo |
| `aircraft_components` | `aircraft_components` | Reloj de uso: `installed_at_aircraft_hours` se conserva | Medio |
| `maintenance_logs` (+ `maintenance_components`) | `maintenance_events` | `maintenance_type`→`type`; sin `task_id` (v1 no tenía tareas por modelo); `return_checklist` y adjuntos: ver §2.2 | Medio |
| `flights` | `flights` | **Ver §4 (fecha/hora y `visual_condition`)** | **Alto** |
| `flight_authorizations` | `missions` (+ `authorization_requests` si tiene N.° AeroCivil) | Estados y `plan_data` → `zone_geo`, `line_of_sight`, `altitude_agl_m`. Las canceladas no se migran como misiones activas | Medio |
| `flight_plans` | — | Plantillas de planeación del piloto independiente: no migran (se archivan) | Bajo |
| `results_health/preflight/briefing/inventory` | **histórico: archivo** | V2 guarda resultados **ligados a un despacho** (`dispatch_checklist_items`); un vuelo de v1 no tiene despacho. Se archivan en el export congelado (§7), no se fabrican despachos | Medio |
| `form_definitions` (6 tipos) | `checklists` | Solo los **vigentes** de cada organización (Prevuelo/otros), convertidos a lista libre; los slots vacíos se descartan | Medio |
| `protocols` | `checklists` | Biblioteca libre → listas de chequeo | Bajo |
| `insurance_policies` | `insurance_policies` + `insurance_policy_aircraft` | `covers_all_fleet` y vigencias directas | Bajo |
| `suppliers`, `supplier_audit_criteria`, `supplier_audits` | igual nombre en V2 | Directa (las respuestas `jsonb` se conservan por `criterion_id`) | Bajo |
| `company_manuals`, `manual_versions`, `manual_acknowledgments` | `manuales`, `manual_versions`, `manual_acknowledgments` | **Los archivos se copian a la nueva clave** (§5.3) | Medio |
| `sms_reports` + `vor_mor_submissions` | `sms_reports` (+ `sms_cases`) | `route` según tipo; severidad con el vocabulario RAC; casos y acciones asociados | Medio |
| `sms_case_actions/events` | `sms_case_actions/events` | Se enlazan al caso migrado | Medio |
| `safety_indicators*`, `safety_hazards`, `safety_risk_*` | `safety_indicators*`, `hazards`, `risk_matrices`… | Solo si tienen datos reales; **12 indicadores y 0 datos mensuales** según la auditoría: se migra la definición | Bajo |
| `sms_gap_*`, `sms_training_*` | igual en V2 | Directa; el catálogo GAP oficial ya está sembrado en V2 (**no** se copia: se enlazan las respuestas por número de pregunta) | Medio |
| `sora_assessments` | — | **Modelo distinto**: V2 usa el análisis de riesgos oficial MAUT-5.0-12-055 por autorización. No migra (se archiva); ver §2.2 | Bajo |
| `epayco_*`, planes, `pending_*`, `billing_history` | `subscriptions` | Plan y vencimiento se conservan (§6-C); la recurrencia se re-crea en Wompi (§6-B) | **Alto** |
| `audit_log`, `notifications` | — | No migran; `audit_log` se archiva (§7) | Bajo |
| Programa de socios (`partners*`, `referrals`, `free_grants`, `addon_subscriptions`) | **(por construir)** | Se construye en V2 antes del corte (§6-D); se migra con él | **Alto** (negocio) |
| `invitations`, `partner_invitations` | — | Pendientes caducan: se **reemiten** tras el corte | Bajo |

### 2.2 Campos y funciones de v1 **sin destino** en V2 (lista explícita, `20` §16.9)

Para que nadie los eche de menos sin saber por qué. La decisión E ya los resolvió: lo marcado **→ V2**
se agrega al esquema; el resto se **archiva** (solo en el export congelado) o se **descarta**.

| Dato v1 | Dónde estaba | Propuesta |
|---|---|---|
| `dan_number`, `operator_number`, `registration_expiry`, `authorized_operations` | `organizations` | **→ V2** (E): a `organization_certifications` |
| `enable_health_check/preflight/briefing/inventory_checklist` | `organizations` | Descartar: en V2 cada organización define sus listas y no hay interruptores |
| `form_code_master/batteries/pilots` | `organizations` | Descartar (los códigos de formato viven en el generador de reportes) |
| `visual_condition` (VMC/IMC/NIGHT) | `flights` | **→ V2**: `flights.flight_rules` (la columna `visual_condition` de V2 es la línea de vista). Ver §4 |
| `mission_id` (N.° de misión, texto) | `flights` | **→ V2** (E): `flights.external_ref` |
| `aerocivil_auth_number` | `flight_authorizations` | → `authorization_requests.radicado_number` cuando exista la autorización |
| `notes`, `alert_*`, `safety_report` | `flights` | Archivar; `safety_report` solo se refleja si hubo un `sms_report` real |
| `avatar_url`, contacto de emergencia | `profiles`/`pilots` | **→ V2** (E): a `people` (foto y contacto de emergencia) |
| Documentos del piloto (cédula, diploma, médico, CIPU, `*_url`) | `pilots` | Archivar los archivos; el vencimiento médico sí migra (§3) |
| `inventory_items`, `equipment_stock` | Flota/Inventario | Archivar (V2 no los tiene) |
| Meteorología histórica, `replay_path` | `flights` | El replay (R2) **sí** puede migrar: se copia el objeto y se re-apunta `replay_path` — ver §5.3 |

---

## 3 · Identidad: `profiles` + `pilots` → `people` — reglas de precedencia (P-ES-3)

**Hallazgo** (`20` §16.4): de 10 pilotos vinculados a un perfil, divergen `phone` 5, `license_number` 5,
`emergency_contact_phone` 5 y **`medical_expiry` 2**. El vencimiento médico divergente es un riesgo de
cumplimiento: dos pantallas mostraban estados contradictorios.

### 3.1 Quién es una persona

1. Se parte de `pilots` ∪ `profiles`. Un `pilots` se enlaza a un `profiles` por `pilots.profile_id`.
2. Las filas **sin ese enlace** se unen solo si coincide el **correo** (sin distinguir mayúsculas) o el
   **documento de identidad** (`id_type`+`id_number`). Si hay duda (coincide uno y el otro difiere), **no
   se une**: se reporta para decisión manual. Unir dos humanos distintos es peor que dejar un duplicado.
3. Una persona con varias organizaciones (`organization_members`) es **una** `people` con **varias**
   `memberships`.
4. Un `pilots` sin cuenta (tripulante invitado que nunca se registró) es una `people` **sin** `accounts`.

### 3.2 Qué valor gana cuando divergen

| Campo | Regla | Por qué |
|---|---|---|
| `full_name` | `profiles.full_name` si no está vacío; si no `first_name`+`last_name`; si no `pilots.name` | Lo escribe la propia persona al registrarse |
| `medical_cert_expiry` | **La fecha más temprana** de las dos | **Criterio conservador de seguridad**: fingir una vigencia que no existe es peor que pedir que se confirme. La otra fecha se registra como descartada y la persona/organización **confirma en V2** |
| `license_number` | El de la fila con `updated_at` **más reciente**; si una está vacía gana la otra | Dato libre sin fuente de verdad; lo más reciente es lo más probable |
| `phone`, `email` | Igual: más reciente, no vacío | ídem |
| `document_type/number` | `pilots` (lo cargó un gestor con soporte) sobre `profiles` | El expediente lo carga la organización |
| Contacto de emergencia | Más reciente | Sin destino todavía (§2.2) |

**Salida obligatoria**: `etl-informe-identidad.csv` con *persona, campo, valor ganador, valor descartado,
regla aplicada*. Los **cuatro casos de vencimiento médico** divergentes se resuelven **a mano** antes del
corte, no por regla.

### 3.3 Adiciones de la licencia

`pilots.aerocivil_additions` (jsonb) → `person_additions`. **Es el mismo catálogo de 15 adiciones**
(`PILOT_ADDITIONS`), así que el mapeo es directo; un valor que no esté en el catálogo se lista, no se
descarta. Sin vigencia (v1 no la guardaba): `valid_until = null`.

---

## 4 · Vuelos: lo que más puede salir mal

1. **Fecha y hora**: v1 guarda `flight_date` (date) + `takeoff_time`/`landing_time` (hora sin zona);
   V2 guarda `takeoff_at`/`landing_at` (`timestamptz`). Se interpretan como **hora de Colombia (UTC−5,
   sin horario de verano)** — la misma convención de todo V2. Un vuelo que cruza medianoche suma un día
   al aterrizaje. Verificar en el ensayo: `landing_at − takeoff_at` ≈ `total_time` (±1 min).
2. **`total_time`** (horas) se copia **tal cual**; no se recalcula (puede venir de la importación DJI).
3. **`visual_condition`**: en v1 son reglas de vuelo (VMC/IMC/NIGHT) y la línea de vista vive en
   `line_of_sight`; en V2 `flights.visual_condition` **es la línea de vista**. Se migra `line_of_sight`
   → `visual_condition`; el VMC/IMC/NIGHT original va a **`flights.flight_rules`** (columna nueva): no se fuerza el valor viejo en una columna que ahora significa otra cosa. Además se copian `location`→`location`, `notes`→`notes`, `mission_id`→`external_ref`, `alerts_json`→`alerts` y `imported`→`source`.
4. **`pilot_id`** (→ `pilots.id`) se traduce a `pilot_person_id` por `etl_id_map`. Un vuelo con piloto
   sin asignar o ya borrado: `pilot_person_id` es obligatorio en V2 → se asigna a la persona genérica **«Sin asignar (migrado)»** (F) y se reporta; no se inserta en silencio.
5. **Horas de la aeronave**: **no** se llama a `increment_aircraft_hours` por cada vuelo migrado (sumaría
   dos veces). Se carga `aircraft.total_hours` de v1 y se **compara** con la suma de los vuelos; la
   diferencia (vuelos importados antes de que existiera el seguimiento) se **informa**.
6. **Retención**: el trigger `BEFORE DELETE` de 5 años cuenta desde `takeoff_at` — un vuelo migrado conserva
   su fecha original. Los scripts de ensayo que necesiten borrar lo migrado deben hacerlo con el
   `drop`/`recreate` del branch, no con `DELETE`.
7. **Duplicados**: v1 tenía `UNIQUE(organization_id, aircraft_id, flight_date, takeoff_time)`. V2 no lo
   exige; la deduplicación del ETL usa esa misma clave.

---

## 5 · Mecánica del ETL

### 5.1 Pasos (orden por dependencias)

1. Organizaciones → certificaciones.
2. Personas (identidad §3) → cuentas → membresías → adiciones.
3. Modelos de aeronave → aeronaves → baterías → componentes.
4. Pólizas, proveedores, manuales (+ copia de archivos §5.3).
5. Misiones/autorizaciones → vuelos (§4) → eventos de mantenimiento.
6. SMS: reportes, casos, acciones, indicadores.
7. Suscripciones (§6).
8. Verificaciones (§5.2) → informe.

### 5.2 Verificaciones y criterio de éxito

El ETL **no se da por bueno** hasta que el informe cumple todo:

| Verificación | Criterio |
|---|---|
| Conteos por entidad (v1 vs V2 + las filas reportadas como no migradas) | Cuadra **exacto**: `v1 = migradas + omitidas con motivo` |
| Muestra completa campo a campo (el volumen lo permite) de personas, aeronaves, vuelos | 0 diferencias no explicadas por una regla |
| `aircraft.total_hours` vs suma de vuelos | Diferencias listadas y aceptadas |
| Vencimientos médicos | Los divergentes, resueltos a mano |
| Vuelos: `landing − takeoff ≈ total_time` | 0 fuera de ±1 min, o listados |
| Integridad (FK, RLS, advisors de seguridad) | `get_advisors` limpio, mismos hallazgos preexistentes |
| Cumplimiento §100.540 | El panorama de Tiempos de servicio de una organización real coincide con el cálculo manual |
| Archivos | Cada archivo referenciado existe y abre (§5.3) |

### 5.3 Archivos (Cloudflare R2)

Las claves de v1 (`orgs/{org}/…`) **no** son las de V2 (`v2-orgs/{org}/…`, y la descarga valida ese
prefijo). Se **copia** cada objeto a su clave nueva (R2→R2, sin descargar), se actualiza la ruta en la
fila y se verifica por tamaño. Los objetos de v1 **no se borran** (§7). Buckets afectados: `documents`,
`maintenance-docs`, `company-manuals`, `flight-replays`, `fleet-images`.

### 5.4 Cómo se ejecuta

- Script `scripts/etl/` (Node), con `--dry-run` (calcula e informa sin escribir) y `--commit`.
- Lee la **copia** de v1 con una cadena de solo lectura; escribe en el branch con la llave de servicio.
- Cada corrida produce una carpeta `informes/etl-AAAA-MM-DD-hhmm/` con: conteos, identidad, descartes,
  omitidas, archivos y las diferencias de horas.
- **Ensayos**: uno por cada vez que cambie el esquema de V2, y **dos seguidos sin diferencias** antes de
  agendar el corte.

---

## 6 · Decisiones del usuario (cerradas el 2026-10-06, decisión 179)

| # | Decisión | Resolución | Consecuencia que ya queda escrita en este plan |
|---|---|---|---|
| **A** | Cuentas y contraseñas | **Proyecto de Supabase nuevo + importar los usuarios con su contraseña cifrada.** El usuario eligió primero «mismo proyecto», pero al mostrarle que V2 y la versión actual usan **tablas con el mismo nombre y columnas distintas** (`organizations`, `aircraft`, `flights`, `batteries`…) y que eso obligaba a un corte único sin v1 funcionando, **volvió a proyecto nuevo** | La versión actual **sigue viva y completa** en su proyecto hasta el corte; reversa fácil; v1 se queda accesible en solo lectura (G). Pendiente técnico: **verificar en un ensayo** que la API de administración de Supabase importa el hash (`password_hash`); si no, plan B = enviar a todos el enlace de restablecer contraseña |
| **B** | Pagos ePayco → Wompi | **Re-suscribir a todos los clientes de pago el día del corte** (no se esperó a que venza el ciclo) | Se combina con C: **el acceso se conserva hasta el vencimiento ya pagado**, así nadie pierde días. En el corte: (1) cada organización de pago ve un aviso para suscribirse en Wompi, (2) **las suscripciones recurrentes de ePayco se cancelan** (panel Master, ya existe) para **no cobrar dos veces**. Riesgo asumido: abandono por la fricción de volver a ingresar la tarjeta → comunicación a T−14 y seguimiento uno por uno |
| **C** | Vigencias de suscripción | **Sí**: migrar `subscription_expires_at` y el plan de cada membresía de pago, y verificarlas **una por una** (22 organizaciones) | Fila de `subscriptions` por organización con `plan`, `expires_at` y `billing`; el informe lista las 22 con su valor v1 y su valor V2 |
| **D** | Programa de socios | **Construirlo en V2 antes del corte** | **Nuevo frente que bloquea el corte** (escuelas/asesores, códigos de venta, regalos, comisiones, panel `/socio`). Hay que **acotarlo primero** (contar socios activos, regalos y comisiones pendientes reales) para no construir de más. Hasta que exista, el corte no se agenda |
| **E** | Campos sin destino | **Agregar a V2**: (1) **N.° de misión** de cada vuelo, (2) **foto de perfil y contacto de emergencia** de la persona, (3) **registro AeroCivil de la organización**. Tras la verificación de cobertura (`32a`), el usuario aprobó además agregar **todo lo que tenía datos reales**: lugar y notas de los vuelos, nombre de los componentes, expediente documental, contactos de emergencia de la organización, foto de aeronave y adjunto de mantenimiento | **Construido (decisión 180)**: migraciones `20261006080000` y `20261006090000` aplicadas en el branch, con su captura en pantalla. Lo demás se archiva en `legacy_v1` |
| **F** | Vuelos sin piloto asignado | **Persona genérica «Sin asignar (migrado)»** | El ETL la crea (una por organización, sin cuenta) y la reporta; las horas de la aeronave siguen cuadrando con la bitácora |
| **G** | Ventana de corte y conservación | **Fin de semana de baja operación** y **v1 en solo lectura ≥ 12 meses** | Como v1 vive en su propio proyecto (A), se despliega en un **subdominio de solo lectura** (escrituras bloqueadas) durante 12 meses y luego se archiva (§7.3) |

> **Efecto sobre `50-hoja-de-ruta.md` §1 (O3)**: con dos proyectos de Supabase distintos **no hay
> activación gradual por organización dentro del mismo dominio** (el login apunta a un solo
> backend). Se reemplaza por **organizaciones piloto en la URL de Preview de V2** (que ya usa su
> propio proyecto) *antes* del corte, y el corte es **único**, con reversa mientras V2 no acepte
> escrituras.

---

## 7 · Corte, reversa y conservación

### 7.1 Guion del corte (ensayable)

| Cuándo | Qué |
|---|---|
| **T−14 días** | Aviso a clientes (fecha, ventana, qué cambia, qué deben re-hacer: pago §6-B, reinvitaciones) |
| **T−7** | Ensayo final: dos corridas seguidas **sin diferencias**; V2 desplegado en una URL de prueba; recorrido de humo por rol |
| **T−1** | Respaldo completo de v1 (base + R2). Se confirma que el respaldo **se puede restaurar** |
| **T0** | v1 en **modo solo lectura** (bloqueo de escrituras) → ETL `--commit` hacia el proyecto nuevo (usuarios con su hash) → informe → **aprobación del usuario** → se apunta el dominio a V2 y v1 pasa a su subdominio de solo lectura → **se cancelan las recurrencias de ePayco** y se activa el aviso de suscripción en Wompi |
| **T0 + horas** | Recorrido de humo con cuentas reales: ingreso, Despacho, Cierre, Tiempos de servicio, SMS, pagos |
| **T+7** | Revisión: incidencias, datos reportados por clientes, informe final |

### 7.2 Reversa

- **Antes de aceptar escrituras en V2**: se vuelve al dominio de v1 y se levanta el solo lectura. Costo cero.
- **Después**: ya no hay reversa limpia (V2 tendrá datos que v1 no). Se **corrige hacia adelante**; por eso
  el ensayo y la aprobación de T0 son el control real. Si se quiere una ventana de reversa, se define
  cuánto se está dispuesto a perder y se hace una **reversa de datos** (V2→v1) solo para lo escrito en esa ventana.

### 7.3 Conservación (RAC 100 §100.535(29), 5 años)

- v1 queda **solo lectura ≥ 12 meses en su propio proyecto y subdominio**; después, un **export congelado** (base completa + objetos de R2 +
  `audit_log`, `results_*`, `sora_assessments`, plantillas y todo lo marcado «archivar») en un bucket de
  archivo con acceso restringido, con un índice de qué contiene.
- Debe poder **entregarse a un inspector** un registro de v1 anterior al corte: se documenta cómo.
- Los registros migrados conservan su **fecha original**, así su cuenta de retención en V2 es la correcta.

---

### 6.0 Conteos reales en producción (2026-10-06, solo lectura, sin contenido de filas)

Pedidos en §8 para acotar las decisiones B y D:

| Qué | Hallazgo | Consecuencia |
|---|---|---|
| **Suscripciones recurrentes de ePayco activas** | **1** (una membresía de plan Escuadrilla, **con la fecha de vencimiento ya vencida**). **Ninguna** con Wompi | La decisión **B** («re-suscribir a todos el día del corte») afecta en la práctica a **una sola organización**; el riesgo de abandono es mínimo. El resto de las membresías de pago no tiene cobro recurrente (pagos manuales, planes sin cobro o de la casa) |
| Membresías activas por plan | Piloto 18 · Flota 3 · Escuadrilla 5 · Enterprise 5 (entre ellas 1 superadmin) | Se migran los 22 planes con su vencimiento (C) |
| **Con vencimiento ya pasado y estado «activa»** | **5** administradores (2 Enterprise, 3 Escuadrilla) | Hay que decidir **antes del corte** si esas organizaciones siguen o se degradan: V2 sí hace cumplir `expires_at`. Se confirma una por una (C) |
| **Programa de socios** | **3** socios, **todos escuelas** (1 activo, 2 inactivos), **0 asesores**, 2 dueños, 4 códigos de venta; **0 referidos y 0 comisiones** (nunca se generó una); **11 regalos**: 4 canjeados, 5 vigentes hoy, 6 ya degradados; 20 invitaciones (4 aceptadas, 12 expiradas, 4 pendientes) | El uso real del programa es **regalar perfiles con vencimiento**. Las comisiones, los asesores y los reportes por período **nunca se han usado**: ver la propuesta de alcance mínimo de D |

### 6.1 Tres resoluciones adicionales (decisión 180)

- **Credenciales del portal de la Aerocivil** (`aerocivil_credentials`, 1 organización): **no se migran**; el usuario de esa
  organización las **vuelve a registrar** (la contraseña está cifrada con la llave de v1 y no debe copiarse).
- **APK de Android** (`app_releases`): tabla creada en V2; `GET /api/app/version` sigue igual y apunta al proyecto nuevo por
  variables de entorno; la fila vigente se copia en el ETL; nuevas versiones con `POST /api/app/releases` (llave de administración).
- **Catálogo de municipios** (`colombia_geo`, 1122): copia directa en el ETL a la tabla `colombia_geo` de V2.

### 6.2 Bloqueante nuevo descubierto: V2 no puede dar de alta usuarios

Al acotar la decisión D se encontró que **V2 no tiene registro, ni alta de organizaciones, ni invitaciones**
(las rutas de v1 escriben en `profiles`/`organization_members`, que V2 no tiene). Tras el corte, los usuarios
migrados entrarían, pero **nadie nuevo podría registrarse** ni una organización invitar a su tripulación. Es
**más grande que el propio ETL**. Diseño y orden en [`44-alta-y-socios.md`](44-alta-y-socios.md) (decisión 181).

## 8 · Qué sigue (en orden)

0. **Alta de usuarios, invitaciones y programa de socios completo en V2** (`44-alta-y-socios.md`, etapas A–F):
   es lo que más falta para poder cortar. Los conteos de §6.0 ya acotaron el programa de socios (el usuario eligió
   construirlo **completo**).
2. **Migraciones aditivas de V2 por la decisión E**: `flights.external_ref`, foto y contacto de
   emergencia en `people`, registro AeroCivil en `organization_certifications`, con su captura en pantalla.
3. **Contar en producción** (solo lectura): organizaciones con cobro vigente y sus vencimientos, filas de las
   20 tablas «vacías», vuelos con piloto sin asignar y los 4 vencimientos médicos divergentes.
4. ✅ **Prueba técnica de importación de usuarios** con contraseña cifrada (decisión A): **funciona** (decisión 188);
   el plan B (restablecer contraseña a todos) no hace falta.
5. ✅ **Flujo de suscripción en Wompi para clientes que vienen de ePayco** (decisión B): construido y probado
   (decisión 190) — aviso en el panel, correo T−14 (`aviso-migracion.mjs`) y cancelación de la recurrencia en T0
   (`epayco-pendientes.mjs --cancelar`).
6. 🟡 `scripts/etl/` **fases 1 y 2 escritas y ensayadas con datos sintéticos** (decisiones 188 y 189; uso en
   `scripts/etl/README.md`): núcleo, mantenimiento, proveedores, manuales, listas de chequeo, SMS, archivo completo de v1
   (`legacy_v1_rows`) y copia de archivos de R2. Falta el **primer ensayo sobre una copia de producción** (necesita un
   usuario de solo lectura de v1) y ejecutar la copia de archivos con las credenciales de R2.

*Creado 2026-10-06 — borrador de diseño; ninguna parte se ha ejecutado.*
