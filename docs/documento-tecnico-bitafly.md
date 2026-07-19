# BitaFly — Documento Técnico del Software

| | |
|---|---|
| **Versión del documento** | 1.0 |
| **Fecha** | 2026-07-09 |
| **Estado del software** | Producción — release v1.0 |
| **Commit de referencia** | `66d69234` (rama `main`) |
| **Repositorio** | `deibercubillos-uas/skylog-manager` |
| **Público destino** | Equipo técnico, auditores, inversionistas técnicos, nuevos desarrolladores |

> Este documento describe la arquitectura, el modelo de datos, los módulos funcionales y las
> decisiones de ingeniería de BitaFly a la fecha de la versión 1.0. Es un documento técnico —
> para la descripción comercial/funcional orientada a marketing ver
> `docs/bitafly-product-brief.md`; para el registro vivo de decisiones de ingeniería (más
> detallado, actualizado en cada cambio) ver `CLAUDE.md` en la raíz del repositorio, que sigue
> siendo la fuente de verdad operativa del equipo de desarrollo.

---

## 1. Resumen ejecutivo

**BitaFly** es una plataforma SaaS multi-tenant para la gestión integral de operaciones con
drones (UAS — *Unmanned Aircraft Systems*) en Colombia, construida para cumplir con el marco
regulatorio **RAC 100** de la Aeronáutica Civil (UAEAC/Aerocivil). Cubre todo el ciclo de vida
de una operación: planeación, autorización, despacho, bitácora, mantenimiento, gestión de
tripulación, Sistema de Gestión de Seguridad Operacional (SMS), evaluación de riesgo (SORA),
auditoría documental y generación de reportes regulatorios — accesible desde navegador web y
desde una aplicación Android nativa instalada en los controladores DJI RC Plus.

A la fecha de este documento, la plataforma está en **producción con pagos reales** (ePayco),
opera bajo un modelo de suscripción por planes (Piloto / Escuadrilla / Flota / Enterprise), y
da soporte tanto a operadores individuales (pilotos independientes) como a organizaciones con
equipos completos y a un programa de socios B2B (escuelas de formación UAS y asesores).

**Cifras de referencia del sistema (base de datos de producción, 2026-07-09):**

| Métrica | Valor |
|---|---|
| Tablas en el esquema (`public`) | 84 |
| Tablas con Row-Level Security habilitado | 84 (100%) |
| Migraciones SQL aplicadas | 66 |
| Rutas de API (`route.js`) | 178 |
| Componentes React reutilizables | 82 |
| Commits en el historial de `main` | 206 |

---

## 2. Arquitectura general

### 2.1 Stack tecnológico

| Capa | Tecnología | Versión (package.json) |
|---|---|---|
| Framework web | Next.js (App Router) | 14.2.35 |
| Librería UI | React | 18.3.1 |
| Estilos | Tailwind CSS | 3.4.3 |
| Backend / Base de datos | Supabase (PostgreSQL + Auth + Realtime) | `@supabase/supabase-js` 2.104, `@supabase/ssr` 0.10.2 |
| Almacenamiento de objetos | Cloudflare R2 (compatible S3) | `@aws-sdk/client-s3` 3.1073 |
| Pagos | ePayco (pasarela colombiana) | REST/webhook propio |
| Correo transaccional | Resend | 6.12.2 |
| App móvil | Capacitor (Android) | 8.4.0 |
| Mapas | Leaflet / React-Leaflet | 1.9.4 / 4.2.1 |
| Generación de documentos | jsPDF + jspdf-autotable, ExcelJS, docx | 2.5.1, 4.4.0, 9.7.1 |
| Parser de logs DJI | `dji-log-parser-js` (WASM) | 0.5.7 |
| Meteorología | Open-Meteo (modelos globales) + NOAA Space Weather (Kp) | APIs públicas, sin costo |
| Geocodificación | Nominatim (OpenStreetMap) | API pública, sin costo |
| Analítica | Vercel Analytics + Speed Insights | 2.0.1 / 2.0.0 |

Next.js se eligió como framework único para servir tanto la landing pública (SEO-first, más
de 20 páginas satélite indexables) como la aplicación autenticada (`/dashboard`), el panel
administrativo (`/admin/master`) y el panel de socios (`/socio`) — todo en el mismo
despliegue y el mismo repositorio, evitando la complejidad operativa de mantener frontends
separados.

### 2.2 Modelo de despliegue

```
┌─────────────────────┐        ┌──────────────────────┐
│   Cliente (browser   │◄──────►│   Vercel (Next.js)    │
│   o app Android)      │  HTTPS │   - SSR / App Router   │
└─────────────────────┘        │   - API routes (178)   │
                                 │   - Middleware (auth)  │
                                 └──────┬───────┬────────┘
                                        │       │
                          ┌─────────────▼──┐  ┌─▼──────────────────┐
                          │   Supabase      │  │  Cloudflare R2     │
                          │  - Postgres     │  │  - Buckets privados │
                          │  - Auth         │  │  - Buckets públicos  │
                          │  - Realtime     │  │  (CDN por bucket)    │
                          │  - RLS (84 tbl) │  └────────────────────┘
                          └────────┬────────┘
                                   │
                    ┌──────────────┼───────────────┐
                    ▼              ▼               ▼
              ePayco (pagos)  Resend (correo)  APIs externas
                                                (Open-Meteo, NOAA,
                                                 Nominatim)
```

- **Vercel**: hosting, CDN de edge, funciones serverless (API routes) y funciones cron
  (recordatorios, purga de datos, verificación de vencimientos).
- **Supabase**: base de datos Postgres administrada, autenticación (email + contraseña,
  recuperación de contraseña), Realtime (usado por la campana de notificaciones vía
  `postgres_changes`), y Storage de respaldo para un flujo puntual (adjuntos VOR/MOR).
- **Cloudflare R2**: almacenamiento de objetos S3-compatible para todos los demás buckets
  (documentos, fotos de flota, adjuntos de mantenimiento, replays GPS, manuales, releases del
  APK). Elegido sobre Supabase Storage por costo y por control fino de CORS/CDN por bucket.

### 2.3 Multi-tenancy y aislamiento de datos

El aislamiento entre organizaciones (tenants) se implementa en dos capas independientes que se
refuerzan mutuamente:

1. **Row-Level Security (RLS) de Postgres** — capa de defensa primaria. Las 84 tablas del
   esquema tienen RLS habilitado; las políticas resuelven la organización del usuario
   autenticado a través de un conjunto de funciones `SECURITY DEFINER` en el esquema
   `private` (`user_org_id()`, `user_role()`, `has_role()`, `can_manage_ops()`,
   `user_is_manager()`, etc.), de forma que ninguna consulta —incluso con errores de
   aplicación— puede devolver filas de otra organización.
2. **Filtrado explícito por `organization_id` en cada API route** — capa de defensa en
   profundidad. Todas las rutas de API resuelven el contexto de organización del usuario vía
   `getOrgContext()` (`lib/apiAuth.js`) antes de construir cualquier consulta, y los conteos
   sensibles a límites de plan usan el patrón documentado como "Regla de conteo"
   (`createAdminClient()` + `.select('id')` + `.length`, evitando `count:'exact',head:true`,
   que PostgREST puede evaluar ignorando el filtro de RLS bajo ciertas condiciones).

### 2.4 Multi-organización por cuenta

A partir de julio de 2026 (ver sección 12), una misma cuenta de usuario puede pertenecer a
**varias organizaciones simultáneamente**. Esto se implementó como un refactor arquitectónico
ejecutado en 9 fases incrementales sobre un sistema en producción, sin downtime y sin migrar
"de un golpe":

- **`organization_members`**: tabla de membresías (`user_id`, `organization_id`, `role`,
  `subscription_plan`, campos de ePayco, `is_active`) — fuente de verdad real del rol/plan de
  una cuenta *para una organización específica*.
- **`profiles.active_organization_id`**: cuál organización está activa para la cuenta en un
  momento dado. Un endpoint dedicado (`POST /api/org/switch-active`) proyecta la membresía
  elegida de vuelta a los campos legacy de `profiles` (`organization_id`, `role`,
  `subscription_plan`, etc.), lo que permite que las ~88 lecturas directas de esas columnas
  legacy en el código (aún no migradas en su totalidad, ver sección 12.3) sigan funcionando
  correctamente sin que cada una tenga que reescribirse en el mismo cambio.
- Las 106 políticas RLS originales se actualizaron reescribiendo únicamente las funciones
  centrales de las que dependen (mismo OID, sin downtime), en vez de tocar cada política
  individualmente.

---

## 3. Modelo de datos

### 3.1 Dominios principales

El esquema de 84 tablas se organiza en los siguientes dominios funcionales:

| Dominio | Tablas representativas |
|---|---|
| Identidad y organización | `profiles`, `organizations`, `organization_members`, `invitations` |
| Flota y mantenimiento | `aircraft`, `batteries`, `battery_logs`, `maintenance_logs`, `maintenance_components`, `aircraft_components`, `inventory_items`, `equipment_stock` |
| Tripulación | `pilots`, `pilot_endorsements`, `emergency_contacts` |
| Operación / vuelos | `flights`, `flight_plans`, `flight_authorizations`, `mission_types`, `mission_inventory_logs` |
| Seguridad operacional (SMS) | `sms_reports`, `sms_case_actions`, `sms_case_events`, `safety_barriers`, `safety_hazards`, `safety_risk_scales`, `safety_risk_tolerability`, `safety_indicators`, `safety_indicator_monthly`, `safety_indicator_actions`, `safety_indicator_submissions`, `sms_gap_questions`, `sms_gap_assessments`, `sms_gap_responses`, `sms_gap_question_visibility`, `sms_training_sessions`, `sms_training_attendance` |
| VOR/MOR (ocurrencias) | `vor_mor_definitions`, `vor_mor_submissions` |
| SORA | `sora_assessments` |
| Checklists de despacho | `form_definitions`, `results_health`, `results_preflight`, `results_briefing`, `results_inventory`, `results_risk_assessment`, `daily_health_checks` |
| Capacitación | `training_programs`, `training_sessions`, `training_exams`, `training_exam_questions`, `training_exam_attempts`, `training_evaluations` |
| Proveedores | `suppliers`, `supplier_audit_criteria`, `supplier_audits` |
| Manuales corporativos | `company_manuals`, `manual_versions`, `manual_acknowledgments` |
| Auditoría y notificaciones | `audit_log`, `notifications` |
| Pagos y suscripciones | `epayco_plan_config`, `pending_subscriptions`, `pending_registrations`, `processed_webhook_refs`, `billing_history`, `addon_subscriptions` |
| Programa de socios | `partners`, `partner_codes`, `partner_members`, `partner_invitations`, `free_grants`, `referrals`, `referral_commissions` |
| Regulatorio / AeroCivil | `aerocivil_credentials`, `aerocivil_requests`, `aerocivil_submissions`, `aerocivil_monthly_reports`, `colombia_geo` |
| Aplicación móvil | `app_releases` |
| Otros | `leads`, `insurance_policies`, `protocols`, `automation_jobs` |

### 3.2 Convenciones de esquema

- **Conteo de horas de aeronave**: nunca se actualiza con patrón *read-calculate-write*; se
  usa la función RPC `increment_aircraft_hours(p_id, p_hours)`, atómica.
- **Mantenimiento mayor vs. menor**: contadores completamente independientes en `aircraft`
  (`maintenance_interval_hours/_days` vs. `minor_maintenance_interval_hours/_days`), ambos
  capaces de bloquear el despacho de una aeronave de forma independiente.
- **Auditoría append-only**: `audit_log` no permite `UPDATE`/`DELETE` desde la aplicación —
  solo `INSERT` vía service role, con purga automática por antigüedad (cron).
- **Idempotencia de webhooks**: `processed_webhook_refs` (clave primaria = referencia de
  ePayco) evita procesar un mismo pago dos veces; el registro se inserta **después** de
  activar el plan con éxito, no antes, para no bloquear reintentos legítimos ante un fallo.
- **Snapshots vs. datos derivados**: los resultados de checklists de despacho
  (`results_*`) y las evaluaciones de riesgo (`results_risk_assessment`) son snapshots
  inmutables del momento del vuelo — no se recalculan si la configuración de la organización
  cambia después, por ser evidencia histórica/regulatoria.

---

## 4. Autenticación, autorización y seguridad

### 4.1 Autenticación

Supabase Auth (email + contraseña) con recuperación de contraseña vía enlace firmado. Las
rutas de API validan la sesión con `getUser()` (validación contra el servidor de Supabase,
no solo decodificación local del JWT) antes de cualquier operación autenticada.

### 4.2 Roles del sistema

| Rol | Alcance |
|---|---|
| `superadmin` | Operación interna de BitaFly (panel Master). Nunca expuesto en UI pública. |
| `admin` (Gerente General) | Dueño/representante legal de una organización. Acceso total dentro de su org. |
| `jefe_pilotos` | Gestión operativa: flota, misiones, tripulación. |
| `gerente_sms` | Gestión del Sistema de Gestión de Seguridad Operacional. |
| `piloto` | Despacho de vuelos asignados, expediente propio, reportes VOR/MOR. |

El **piloto independiente** (operador unipersonal) es un caso especial: siempre tiene
`role='admin'` en base de datos (nunca `'piloto'`), porque las políticas RLS de operación
(`aircraft`, `batteries`, `maintenance_logs`, etc.) requieren rol de manager — se detecta a
nivel de aplicación como `subscription_plan==='piloto' && role==='admin'`, distinguiéndolo así
de un Gerente General de una organización con equipo.

### 4.3 Row-Level Security

Cada tabla multi-tenant tiene políticas RLS que resuelven el `organization_id` del usuario
autenticado mediante un pequeño conjunto de funciones centrales `SECURITY DEFINER` (evitan
recursión de RLS al leerse a sí mismas). El principio de diseño, mantenido de forma consistente
en todo el esquema: **el gate de negocio va en la API (rol/plan/permiso), el gate de tenant va
en RLS** — nunca se confía únicamente en el filtro de la API para aislar datos entre
organizaciones.

### 4.4 Rate limiting y endpoints públicos

Todo endpoint público sin autenticación (formularios VOR/MOR públicos, registro con pago,
contacto, verificación de pago) pasa por `checkRateLimit()` (`lib/rateLimiter.js`, limitador en
memoria por IP) antes de ejecutar cualquier lógica de negocio.

### 4.5 Almacenamiento de archivos

- **Buckets privados** (Cloudflare R2): documentos sensibles de tripulación, adjuntos de
  mantenimiento, replays GPS, manuales corporativos. Servidos por streaming desde el servidor
  (`storageDownload`) en vez de URLs prefirmadas redirigidas al navegador, para no depender de
  que el navegador del cliente no bloquee la petición cross-origin (extensiones, CORS).
- **Buckets públicos**: fotos de flota, logos de socios, releases del APK — cada uno con su
  propio subdominio CDN.
- **Subida server-side por defecto** (`POST /api/storage/upload`, multipart, mismo origen):
  evita el preflight CORS y los bloqueos de extensiones de navegador que sí afectan a la
  subida directa navegador→R2 con URL prefirmada (usada solo para archivos grandes).

---

## 5. Módulos funcionales

### 5.1 Operación

- **Flota**: inventario de aeronaves, baterías (con conteo de ciclos) y equipo técnico/payload.
  Mantenimiento mayor (por técnico, con bloqueo automático de despacho al superar umbrales de
  horas/días) y mantenimiento menor (chequeo ligero del propio piloto, contadores
  independientes). Trazabilidad de componentes individuales (hélices, motores, ESC) con horas
  de uso derivadas del odómetro de la aeronave.
- **Planeación de vuelo**: mapa interactivo (zona de operación, altitud, tipo RAC 100),
  exportación KMZ/PDF, integración de clima en el punto de operación. Exclusiva del piloto
  independiente desde julio de 2026 (el piloto de organización solo despacha lo programado).
- **Programación de misiones**: creación de órdenes de vuelo con PIC, aeronave, zona y
  horario; evaluación SORA obligatoria antes de autorizar; vista calendario semanal con
  detección de conflictos de agenda del PIC.
- **Despacho (bitácora)**: wizard de pasos de seguridad configurables (Salud, Inventario de
  Operación, Evaluación de Riesgos, Pre-vuelo, Briefing) con indicador de progreso; bloqueo
  real de despacho por mantenimiento vencido, capacitación no aprobada o riesgo inaceptable sin
  mitigar. Importación automática de logs DJI con auto-sincronización de carpeta.
- **Replay GPS**: reproducción animada de la trayectoria de vuelo (parser WASM de logs DJI),
  con retención y cuota de vuelos según el plan contratado.
- **Meteorología UAV**: score de aptitud de vuelo 0-100 (viento, ráfagas, visibilidad,
  precipitación, índice geomagnético Kp de NOAA), integrado en programación, despacho y replay.

### 5.2 Cumplimiento normativo y seguridad operacional (SMS)

Hub con 9 pestañas: SORA, Evaluación de Riesgos (matriz 5×5 configurable), Indicadores de
Desempeño en Seguridad Operacional (SPI, con líneas de alerta calculadas
estadísticamente), Mejora Continua (autoevaluación GAP de 100 preguntas), Acciones
Correctivas (agregador de 3 fuentes), Reportes de Seguimiento (plazos regulatorios VOR/MOR),
Barreras de Seguridad, Mapas de restricción y Capacitación SMS.

- **VOR/MOR**: formularios públicos personalizables por organización, con seguimiento de
  casos (checklist de acciones correctivas + línea de tiempo de eventos reales).
- **Auditoría**: log append-only de acciones de usuario, distinto del panel de
  aeronavegabilidad/vigencia documental.
- **Protocolos**: biblioteca de procedimientos organizados en 4 grupos (Prevuelo, Reportes,
  Seguridad Operacional, Mantenimiento), que integra tanto los checklists fijos del sistema
  como procedimientos de texto libre.
- **Reportes**: más de 20 formatos descargables (PDF/Excel) agrupados por categoría, incluido
  el Reporte Operacional Mensual UAS exigido por Aerocivil.

### 5.3 Tripulación y capacitación

- **Expediente digital**: documentos con vencimiento (cédula, diploma UAS, examen teórico,
  certificado médico, CIPU), gestionado tanto por el piloto (self-service) como por
  managers.
- **Capacitación**: programas de Operaciones y Mantenimiento con cronograma recurrente y
  **examen interno calificado** (banco de preguntas, nota mínima, intentos por ciclo) que
  bloquea el despacho si el piloto no está al día. Capacitación SMS (asistencia, sin examen).

### 5.4 Proveedores

Registro de proveedores con checklist de auditoría personalizable por organización
(criterios tri-estado: cumple/no cumple/no aplica), cálculo de % de cumplimiento en cliente,
reportes por auditoría individual, por proveedor o consolidados.

### 5.5 Manuales corporativos

Repositorio versionado (nunca se borra una versión anterior) con acuse de lectura obligatorio
por versión, seguimiento de quién ha leído/pendiente, y generación de acta de divulgación en
PDF como evidencia para auditorías.

### 5.6 Notificaciones

Sistema in-app en tiempo real (Supabase Realtime sobre `postgres_changes`), con polling como
red de seguridad. Fan-out por rol (`createNotifications()`), limpieza automática por
antigüedad vía cron.

### 5.7 Pagos y suscripciones

Modelo de 4 planes (Piloto, Escuadrilla, Flota, Enterprise) con precios y días de prueba
configurables en base de datos (`epayco_plan_config`, no hardcodeados). Flujo de pago mediante
apertura de ePayco en nueva pestaña + polling del perfil (no depende de redirect) + webhook
como fuente de verdad de la activación. Cualquier organización puede además ampliar cupos de
dron/piloto mediante **recursos adicionales** (add-ons mensuales, hoy activados manualmente
desde el panel Master mientras se habilita el checkout self-service).

### 5.8 Programa de socios

Sistema de referidos B2B para escuelas de formación UAS y asesores independientes: regalo de
períodos de prueba, comisiones recurrentes por venta, jerarquía escuela→asesor, panel
dedicado (`/socio`) separado del dashboard operativo.

### 5.9 Panel administrativo (Master)

Herramienta interna (`/admin/master`, solo `superadmin`) para gestión de usuarios/roles/planes,
suscripciones ePayco, socios, comisiones, invitaciones de venta, recursos adicionales,
releases de la app Android y activación manual de accesos especiales (certificación
Fase 0 ante AeroCivil, conversión a piloto independiente, eliminación de cuentas).

---

## 6. Integraciones externas

| Integración | Uso | Notas técnicas |
|---|---|---|
| **ePayco** | Suscripciones recurrentes en COP | Webhook con verificación de firma SHA-256 (6 campos), body JSON (no form-urlencoded), resolución de plan/usuario en cascada (extras validados → `pending_subscriptions` → email) |
| **Resend** | Correos transaccionales | Dominio verificado `bitafly.com`; el SDK no lanza excepción en fallos — se verifica `{ error }` explícitamente en cada envío |
| **Cloudflare R2** | Almacenamiento de objetos | `S3Client` con `requestChecksumCalculation: 'WHEN_REQUIRED'` (evita que el SDK agregue un checksum CRC32 que rompe las URLs prefirmadas con R2) |
| **Open-Meteo** | Clima actual, histórico y pronóstico 7 días | Sin API key, gratuito |
| **NOAA Space Weather** | Índice geomagnético Kp | Formato de respuesta con dos variantes históricas manejadas explícitamente |
| **Nominatim (OSM)** | Geocodificación de municipio → coordenadas | Sin API key |
| **DJI Log Parser (WASM)** | Extracción de datos de vuelo desde logs `.txt` del RC | Procesamiento server-side, requiere `DJI_API_KEY` |

---

## 7. Aplicación móvil (Android)

App nativa construida con **Capacitor**, distribuida fuera de Google Play mediante un sistema
**OTA (Over-The-Air) propio**: la app corre en modo *remote URL* (carga `https://bitafly.com`
dentro de un WebView nativo), por lo que **todo cambio de UI/Next.js se refleja
automáticamente** sin necesidad de generar ni distribuir un nuevo APK. Solo los cambios de
código nativo (plugins Java, permisos del manifiesto) requieren compilar un nuevo APK y
publicarlo mediante el flujo OTA (tabla `app_releases`, bucket público `app-releases`,
comparación de `versionCode`, opción de actualización forzada para cambios críticos).

Plugin nativo propio (`AppUpdatePlugin.java`) para descarga e instalación del APK con
progreso, usando `PackageManager` (no `BuildConfig`, no accesible desde plugins en este setup)
para leer la versión instalada.

---

## 8. API — estructura y convenciones

- **178 rutas de API**, todas bajo `src/app/api/`, siguiendo el patrón App Router de Next.js
  (`route.js` por endpoint, con handlers `GET`/`POST`/`PATCH`/`DELETE` exportados).
- **Patrón estándar de cada ruta**: `createClientSSR()` (cliente Supabase con contexto de
  sesión) + `getOrgContext()` (resuelve usuario/organización/rol/plan) → guard de
  autenticación (`if (!user) return 401`) → guard de permiso explícito con
  `PERMISSIONS.canXxx` (nunca arrays de roles hardcodeados inline) → operación con campos
  explícitos (nunca *mass-assignment* de todo el body recibido).
- **Rutas públicas** (sin sesión: formularios VOR/MOR, checkout, webhook, contacto) siempre
  pasan por `checkRateLimit()`.
- **113 de 178 rutas** consumen directamente `getOrgContext()` como único punto de resolución
  de organización — el resto son rutas públicas, de servicio (webhooks, cron) o utilitarias
  que no requieren ese contexto.

---

## 9. Convenciones de ingeniería

- **Sin TypeScript**: el proyecto usa JavaScript (`.js`) en todo el codebase, por decisión de
  velocidad de iteración temprana — no es una limitación técnica de Next.js, es una elección
  del proyecto.
- **ESLint v8** (`.eslintrc.json`), no el flat config v9 (`eslint.config.mjs`), por
  compatibilidad con el resto de la configuración del proyecto.
- **`npx next lint` + `npm run build` limpios antes de cada commit** — estándar de calidad
  aplicado de forma consistente en todo el historial del proyecto; a la fecha de este
  documento el build solo tiene 3 warnings preexistentes conocidos y documentados (2 usos de
  `<img>` sin `next/image` en el panel de socios, 1 dependencia de hook faltante en la
  sincronización DJI), ninguno bloqueante.
- **Sin suite de pruebas automatizadas formal**: la verificación de cada cambio se apoya en
  lint + build + revisión de código + (cuando aplica) verificación de datos reales contra
  Supabase antes/después del cambio. Es una limitación real y documentada, no oculta — ver
  sección 12.4.
- **Migraciones SQL versionadas** en `supabase/migrations/`, aplicadas vía Supabase MCP y
  verificadas con `get_advisors` (seguridad) después de cada cambio de esquema.

---

## 10. Cumplimiento normativo (RAC 100)

| Requisito RAC 100 | Cómo lo cubre BitaFly |
|---|---|
| Bitácora de vuelo | Registro automático por vuelo, con todos los campos exigidos |
| Orden de trabajo / misión autorizada | Módulo de Programación con exportación KMZ y PDF |
| Expediente del piloto | Documentos vigentes con alertas de vencimiento |
| Manual de Operaciones vigente | Versionado, acuse de lectura, acta PDF |
| Reportes de ocurrencias (VOR/MOR) | Formularios públicos + seguimiento de casos |
| Evaluación SORA | Wizard de 6 pasos (GRC/ARC/SAIL), obligatorio al programar una misión |
| SMS | Módulo completo (matriz de riesgo, SPI, GAP, acciones correctivas) |
| Seguro RCE vigente | Registro de pólizas con vigencia |
| Reporte mensual a Aerocivil | Excel con las 8 columnas oficiales de la circular vigente |

---

## 11. Infraestructura y variables de entorno críticas

Variables de entorno requeridas para operación completa (ver `CLAUDE.md` para el listado
exhaustivo y su estado actual de configuración en Vercel): credenciales de Supabase (URL,
anon key, service role key), credenciales de ePayco (llave privada de firma de webhook),
credenciales de Resend, credenciales de Cloudflare R2 (endpoint, access key, secret, URLs
públicas por bucket), `DJI_API_KEY` para el parser WASM, `CRON_SECRET` para proteger los
endpoints de cron, y `AEROCIVIL_SALT` para un endpoint de hashing específico (sin fallback
inseguro — el endpoint falla explícitamente si la variable no está configurada, en vez de
degradar silenciosamente la seguridad).

---

## 12. Estado del proyecto — Versión 1.0

### 12.1 Qué incluye esta versión

La versión 1.0 congela el estado del software descrito en este documento: los 84 tablas del
esquema, los módulos funcionales completos de la sección 5, la app Android en modo OTA
funcional, el sistema de pagos con ePayco en producción, y el refactor de multi-organización
por cuenta completado hasta su Fase 8 (ver 12.3).

### 12.2 Limitaciones conocidas (documentadas a propósito, no deuda oculta)

- **Checkout self-service de recursos adicionales** (piloto/dron extra): pendiente de crear
  los productos recurrentes reales en el merchant de ePayco; hoy la venta se registra
  manualmente desde el panel Master.
- **`dashboard/select-plan`**: el flujo de selección de plan Piloto en el onboarding activa la
  suscripción directamente en base de datos sin pasar por el checkout de ePayco — ese camino
  específico no factura automáticamente tras el período de prueba. Requiere una decisión de
  producto, no es un bug de implementación.
- **Descarga de manuales**: `GET /api/manuals/[id]/download` sigue devolviendo una URL
  prefirmada en vez de streaming server-side (a diferencia del resto de descargas privadas de
  la plataforma), por el límite de tamaño de archivo (hasta 25 MB) frente al límite de
  respuesta de las funciones serverless de Vercel.
- **Protección de contraseñas filtradas**: la verificación contra HaveIBeenPwned de Supabase
  Auth está deshabilitada — recomendación de seguridad pendiente de activación (no requiere
  cambio de código, es un toggle de configuración de Supabase).
- **`partner_invitations`**: tiene RLS habilitado pero sin ninguna política definida —
  hallazgo conocido del linter de seguridad de Supabase, sin impacto funcional reportado
  hasta la fecha porque la tabla no se consulta directamente desde el cliente.

### 12.3 Refactor de multi-organización — estado de fases

El refactor que permite que una cuenta pertenezca a varias organizaciones se ejecutó en 9
fases. Las Fases 0 a 7 están completas y en producción (infraestructura, RLS, lecturas y
escrituras migradas). La **Fase 8** (verificación previa) encontró 2 triggers preexistentes de
base de datos que aún dependen de las columnas legacy de `profiles` y deben reescribirse antes
de poder retirarlas con seguridad. La **Fase 9** (reescribir esos triggers y retirar columnas
legacy) queda deliberadamente diferida — es un cambio de esquema difícil de revertir en una
base de datos en vivo con pagos reales, y el equipo decidió no apurarlo.

### 12.4 Verificación y pruebas

El proyecto no cuenta con una suite de pruebas automatizadas (unitarias/integración/e2e)
tradicional. La verificación de cada cambio combina: `next lint` + `npm run build` limpios,
revisión de código exhaustiva, comparación de datos reales antes/después contra la base de
datos de producción (para migraciones y refactors de lectura de datos), y —cuando aplica—
`mcp__Supabase__get_advisors` (seguridad) para detectar regresiones de RLS. Las limitaciones
de este enfoque están documentadas explícitamente en el propio registro de desarrollo
(`CLAUDE.md`) cada vez que un cambio no pudo probarse end-to-end contra una sesión de usuario
real en este entorno.

---

## 13. Glosario técnico

| Término | Definición |
|---|---|
| RLS | Row-Level Security — mecanismo de PostgreSQL para filtrar filas por política a nivel de base de datos |
| RPC | Remote Procedure Call — función de Postgres invocable desde el cliente Supabase |
| SSR | Server-Side Rendering |
| OTA | Over-The-Air — distribución de actualizaciones sin pasar por una tienda de apps |
| Multi-tenant | Arquitectura donde una sola instancia de software sirve a múltiples organizaciones aisladas entre sí |
| Webhook | Endpoint HTTP que un servicio externo (ePayco) invoca para notificar un evento |
| WASM | WebAssembly — usado para ejecutar el parser de logs DJI en Node.js server-side |
| SAIL / GRC / ARC | Niveles de la metodología SORA (Specific Operations Risk Assessment) |

---

## 14. Documentos relacionados

| Documento | Propósito |
|---|---|
| `CLAUDE.md` | Registro vivo y detallado de decisiones de ingeniería, actualizado en cada cambio — fuente de verdad operativa del equipo |
| `docs/bitafly-product-brief.md` | Descripción funcional/comercial para marketing, blogs y landing pages |
| `docs/bitafly-brand-visual-brief.md` | Lineamientos de marca e identidad visual |
| `docs/plan-mejora-sms-bitafly.md` | Detalle fase por fase del plan de mejora del módulo SMS |
| `docs/estatutos-bitafly-sas.md` | Estatutos legales de la compañía |
| `docs/PROYECCION_FINANCIERA_INVERSIONISTAS.md` | Proyección financiera para inversionistas |
