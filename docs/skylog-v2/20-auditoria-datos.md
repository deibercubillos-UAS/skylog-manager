# Auditoría del modelo de datos actual

[← Índice maestro](00-INDICE.md) · [Reglas](01-reglas.md)

> Migrado desde `../plan-bitafly-v2.md` el 2026-08-22 al partir ese documento por la regla de 500 líneas (D1).

---

## 16. Auditoría del modelo de datos y decisión de reconstruir (2026-08-22)

> Cambio de postura del proyecto, a pedido explícito del usuario:
>
> *"No tengo afán en el desarrollo, quiero que esté completamente estructurada, tanto así que si
> es necesario reescribir el código o crear las tablas de cero, lo preferiría con el fin de
> aumentar la escalabilidad, y eliminar tareas repetidas como lo es subir el logo en
> organización y luego volver a subirlo en reportes, o repetir datos innecesarios. Ya que este
> BitaFly que está en línea se fue alimentando según las necesidades más no con un soporte
> sólido de todas las funciones que tiene hoy en día."*

Esto **cambia el plan de raíz**. Las secciones 0–15 se escribieron bajo la premisa de "evolución
aditiva, no tocar nada de lo que funciona". La premisa nueva es: **rediseñar el modelo de datos
desde cero y migrar**. Lo que sigue es la auditoría que hice antes de aceptar ese cambio, con
datos reales de producción — no con impresiones.

### 16.1 El ejemplo del logo: confirmado, y es peor de lo descrito

`src/app/dashboard/reports/page.js:680` contiene un `<FileUpload path="org/logos" label="Actualizar logo" />`
que escribe en `organizations.logo_url` — **exactamente la misma columna** que escribe el hero de
`dashboard/settings/page.js`.

No es que el dato se guarde dos veces: es que **hay dos pantallas distintas pidiendo lo mismo**,
sin que ninguna indique que ya está cargado en la otra. El usuario sube el logo, llega a
Reportes, ve "Actualizar logo" vacío y lo sube otra vez, creyendo que son cosas distintas. Es un
defecto de arquitectura de información, y es sintomático de todo lo demás.

### 16.2 El dato que decide todo: la plataforma es diminuta

| Tabla | Filas reales |
|---|---|
| `flights` | **50** |
| `organizations` | 22 |
| `profiles` | 25 |
| `pilots` | 20 |
| `aircraft` | 16 |
| `batteries` | 14 |
| `maintenance_logs` | 6 |
| `flight_authorizations` | 11 |

**Toda la data operacional real de BitaFly cabe en unos cientos de filas.**

Esto es lo que convierte "reescribir el esquema" de temerario en obviamente correcto. No es una
migración de millones de registros con ventana de mantenimiento y plan de reversión: es un ETL
pequeño, verificable fila por fila, que se puede correr, comparar y volver a correr las veces
que haga falta.

**Y cuanto más se espere, más caro será.** Hoy son 50 vuelos. El costo de esta decisión crece
con cada cliente que entra.

### 16.3 Funcionalidad construida que nunca se usó

De las 84 tablas, estas están en **cero filas** pese a tener interfaz, API y documentación:

`mission_types` · `pilot_endorsements` · **`battery_logs`** · `mission_inventory_logs` ·
`aerocivil_requests` · `aerocivil_submissions` · `automation_jobs` · `maintenance_components` ·
`billing_history` · `aerocivil_monthly_reports` · `training_evaluations` ·
`training_exam_attempts` · `safety_indicator_monthly` · `safety_indicator_actions` ·
`safety_indicator_submissions` · `sms_training_sessions` · `sms_training_attendance` ·
`referrals` · `referral_commissions` · `addon_subscriptions`

**20 tablas vacías. Casi una cuarta parte del esquema.** Dos consecuencias concretas:

- **`battery_logs` vacía rompe una función documentada**: la página de Flota deriva de ahí los
  "chips de batería por aeronave" y Baterías su columna "última aeronave". Ambas muestran vacío
  siempre, y nadie lo ha reportado — señal de que la función no se usa.
- **`safety_indicators` tiene 12 definiciones y `safety_indicator_monthly` tiene 0 filas**: el
  módulo SPI está configurado pero jamás se le han cargado datos mensuales. Es exactamente el
  problema que F3 pretende resolver (§5.1): el SMS no está incompleto, está desconectado.

Esto valida el diagnóstico del usuario mejor que cualquier argumento: se construyó según lo que
se iba necesitando, y buena parte nunca llegó a usarse.

### 16.4 Duplicación de identidad: `profiles` vs `pilots` — **ya divergió en producción**

Las dos tablas comparten **12 columnas**: `avatar_url`, `email`, `emergency_contact_name`,
`emergency_contact_phone`, `id_type`, `license_number`, `medical_expiry`, `organization_id`,
`phone`, más `id`/`created_at`/`updated_at`.

No es duplicación teórica. De los **10 pilotos vinculados a un perfil**:

| Campo duplicado | Filas con valor **divergente** |
|---|---|
| `phone` | **5 de 10** |
| `license_number` | **5 de 10** |
| `emergency_contact_phone` | **5 de 10** |
| `medical_expiry` | **2 de 10** |

**El `medical_expiry` divergente es el hallazgo grave.** BitaFly muestra badges de
"Certificado médico: Vigente / Vence / Vencida" en Tripulación, en Mi Perfil y en el Expediente
de Tripulante en PDF — y no todas leen de la misma tabla (Mi Perfil lee `profiles`, Tripulación
lee `pilots`). Con dos fechas distintas para el mismo piloto, **dos pantallas del mismo sistema
pueden mostrar estados de cumplimiento contradictorios**, y el PDF que se entrega en una
auditoría puede no coincidir con lo que ve el gerente en pantalla.

Es un defecto de cumplimiento regulatorio causado **exclusivamente** por duplicación de esquema.
Ninguna cantidad de corrección de código lo arregla mientras existan las dos columnas.

Además, `pilots` tiene **`medical_url` y `medical_cert_url`** — dos columnas para el mismo
documento. `medical_url` está en **0 filas**: es un resto muerto que nunca se limpió.

Y el nombre de una persona se guarda de **tres formas** entre las dos tablas:
`profiles.first_name` + `profiles.last_name` + `profiles.full_name` + `pilots.name`.

### 16.5 Patrones repetidos que deberían ser uno solo

Auditoría cruzada de columnas sobre las 84 tablas:

| Patrón | Tablas que lo repiten | Debería ser |
|---|---|---|
| `flight_id` + `checks jsonb` | `results_health`, `results_preflight`, `results_briefing`, `results_inventory` — **4 tablas de forma idéntica** | **Una** tabla `flight_checklist_results` con columna `type` |
| `serial_number` + `brand` + `model` | `aircraft`, `batteries`, `inventory_items` | Un concepto **Equipo** con subtipos, no 3 tablas paralelas |
| `recurrence` + `recurrence_days` + `start_date` | `training_sessions`, `sms_training_sessions`, `training_exams` | **Un** motor de recurrencia compartido |
| `token` + `expires_at` + estado | `invitations`, `partner_invitations`, `free_grants` | **Un** modelo de invitación con `kind` |
| `actor_id` + evento + timestamp | `audit_log`, `notifications`, `sms_case_events` | **Un** registro de eventos, con proyecciones distintas |
| Campos de ePayco | `profiles`, `organization_members`, `addon_subscriptions` | **Una** entidad de suscripción |
| `location` en un vuelo | `flight_plans`, `flight_authorizations`, `flights` | **Un** ciclo de vida de vuelo con estados, no 3 tablas que se copian datos |
| `line_of_sight` | `flight_plans`, `flight_authorizations`, `flights` | ídem |
| Intervalos de mantenimiento | `aircraft`: `maintenance_interval_hours/_days` **y** `minor_maintenance_interval_hours/_days`, con sus 4 contadores paralelos | **Una** tabla de programas de mantenimiento por aeronave, con N tipos |

El caso de **`flight_plans` → `flight_authorizations` → `flights`** es el más costoso de todos:
son tres tablas que representan **el mismo vuelo en tres momentos**, y el sistema copia datos de
una a otra a mano en cada transición (el `plan_data jsonb` existe precisamente para arrastrar la
planeación entre ellas). Cada campo nuevo del vuelo hay que agregarlo tres veces — como pasó
literalmente con `line_of_sight` en el reporte mensual UAS.

### 16.6 Otros hallazgos estructurales

- **`organizations` guarda códigos de formato como columnas**: `form_code_master`,
  `form_code_batteries`, `form_code_pilots` — las 22 organizaciones los tienen. Pero hoy hay
  **más de 20 formatos de reporte**, y solo esos 3 persisten; los demás son locales a la
  pantalla y se pierden al recargar (documentado en §Reportes de `CLAUDE.md`). Debería ser una
  tabla `report_formats`, no columnas.
- **`form_definitions` está sobrecargada**: 231 filas sirviendo **6 tipos distintos** de
  formulario (`health`, `preflight`, `briefing`, `maintenance_return`, `inventory`,
  `minor_maintenance`, `sora`), con `aircraft_model` como texto libre para discriminar. Es una
  tabla-navaja-suiza.
- **`sora_assessments` no tiene migración en el repositorio** — se creó directo en Supabase.
  El esquema real y el versionado ya divergen. Un rediseño desde cero cierra ese hueco.
- **Las columnas legacy de `profiles`** (`organization_id`, `role`, `subscription_plan`, campos
  de ePayco) siguen ahí tras las 8 fases del refactor multi-organización, sostenidas por un
  trigger-puente. La Fase 9 quedó bloqueada por dos triggers preexistentes. **Un esquema nuevo
  las elimina de un plumazo, sin Fase 9.**

### 16.7 Decisión: F0 — Modelo de datos rediseñado desde cero

Se acepta el cambio de postura. **F0 pasa a ser el primer frente**, antes que todo lo demás.

**Alcance**
1. **Diseño del esquema objetivo** — normalizado, con los patrones de §16.5 consolidados.
   Principios: identidad de persona en **un** lugar; equipo como concepto único con subtipos;
   vuelo como **un** ciclo de vida con estados; checklists genéricos; eventos unificados;
   suscripción como entidad propia; nada de columnas derivadas (regla que el proyecto ya aplica
   bien en SPI, zonas de riesgo y % de cumplimiento).
2. **Las 20 tablas vacías no se migran**: se rediseñan bien o se eliminan del alcance. Función
   sin uso real no merece cargar esquema.
3. **ETL de migración**, ejecutado contra el Supabase branch, con informe de comparación fila
   por fila. Para los campos divergentes de §16.4 se define una regla de precedencia explícita
   y se registra qué valor se descartó — nada se resuelve en silencio.
4. **La aplicación se reescribe sobre el esquema nuevo**, no se adapta. Aquí es donde el
   rediseño de frontend (F1) deja de ser un frente aparte: **F1 y F0 se ejecutan juntos**,
   porque reescribir la capa de datos y la de presentación por separado significa escribir la
   aplicación dos veces.

**Lo que NO cambia**
- El aislamiento de §0 se mantiene **íntegro y es ahora más importante que nunca**: `main` y la
  base de producción no se tocan hasta el corte final.
- Producción sigue viva y sin cambios durante toda la construcción. Los clientes actuales no se
  enteran hasta el día del corte.
- La lógica de negocio ya probada (límites de plan, motor SORA, estadística SPI, cumplimiento
  de capacitación, matriz de riesgo) **se conserva**: se mueve a `packages/domain` y se le
  agregan pruebas. Reescribir el esquema no significa reinventar las reglas.

**El corte final** deja de ser un merge y pasa a ser una **migración con ventana**: congelar
escrituras, correr el ETL, verificar, apuntar el dominio. Con ~300 filas de datos reales es
cuestión de minutos, y ensayable tantas veces como se quiera contra el branch.

### 16.8 Orden revisado

| # | Frente | Cambio |
|---|---|---|
| **1º** | **F0 + F1 — Esquema nuevo + rediseño de frontend, juntos** | **Nuevo.** F1 sube desde el 5º puesto: separar datos y presentación obligaría a escribir la app dos veces |
| **2º** | **F5 — Tiempos de servicio** | Nace directamente en el esquema nuevo. Sigue siendo el primer módulo funcional por ser incumplimiento actual |
| **3º** | **F3 — SMS** | Sin cambio de posición |
| **4º** | **F4a — Expediente Aerocivil** | Baja un puesto: ya no hay prisa por sacarlo antes del rediseño |
| **5º** | **F2-a — Comando y Control** | Sin cambio |
| **6º** | **F4b — Radicación automática** | Sin cambio |
| **⏸** | **F2-b — Docks en FlightHub 2** | Sin cambio |

**El plazo se alarga y eso es deliberado** — el usuario fue explícito: *"no tengo afán en el
desarrollo, quiero que esté completamente estructurada"*. A cambio, desaparecen las tres deudas
más caras que arrastra la plataforma: la duplicación de identidad que ya está produciendo datos
contradictorios de cumplimiento, las columnas legacy de `profiles` que la Fase 9 no pudo
retirar, y el triple modelado del vuelo que encarece cada campo nuevo.

### 16.9 Lo que hace falta antes de diseñar el esquema

No se puede diseñar el modelo objetivo sin un inventario funcional completo — qué hace hoy cada
módulo, qué datos consume realmente y cuáles no. Ese es el primer entregable de F0, antes de
escribir una sola tabla:

- **Mapa de entidades reales del negocio** (no de tablas actuales): Organización, Persona,
  Membresía, Equipo, Vuelo, Documento, Evento, Suscripción, Programa.
- **Matriz módulo → entidades** para verificar que nada se pierde en la traducción.
- **Reglas de precedencia** para cada campo hoy duplicado (§16.4).
- **Lista explícita de funciones que NO se migran**, con su justificación — para que nadie las
  eche de menos después sin saber por qué.

---
