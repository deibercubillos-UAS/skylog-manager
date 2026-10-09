# Auditoría del código de V2 — 2026-10-07

[← Índice maestro](00-INDICE.md) · [Hoja de ruta](50-hoja-de-ruta.md) · [Bitácora](51-bitacora.md)

> **Veredicto.** El código **nuevo** de V2 es sólido: compila, pasa lint, tiene una capa de reglas de negocio bien probada
> y una base de datos con seguridad por filas en el 100 % de las tablas. Lo que **impide promoverlo hoy** no es su calidad,
> sino tres cosas de *empaquetado*: (1) **el esquema de la base no se puede reconstruir desde el repositorio**,
> (2) **la rama todavía lleva ~68 000 líneas de v1** que apuntan a tablas que no existen, y (3) **hay dependencias con
> vulnerabilidades críticas**. Después vienen las pruebas automáticas de las rutas y la paridad con v1.

## 1 · Método y alcance

**Qué se hizo** (todo con evidencia, nada de memoria): medición del código; cruce de **cada** `.from('tabla')` contra el esquema real del
branch; revisión estática de las 143 rutas API (sesión, rol, rate limit, *mass-assignment*, uso de la llave de servicio);
estado de RLS y políticas de las 90 tablas; *advisors* de seguridad y rendimiento de Supabase; comparación de las 76 migraciones
aplicadas en el branch contra los archivos del repositorio; `npm audit`; revisión de `vercel.json` y de los *crons*; lectura de las
rutas más sensibles (replay, cierre de despacho, webhooks); **recorrido en navegador de las 40 páginas** con una organización real
(errores de consola, respuestas 4xx/5xx, desbordes, caídas); y verificación de la paridad de funciones contra v1.

**Qué NO se auditó** (para no dar una falsa tranquilidad): la lógica fina de cada una de las 143 rutas ni el texto de cada política RLS
(solo su **cobertura**); comportamiento bajo carga; accesibilidad con lector de pantalla; entrega real de correos; **subidas a R2**
(no hay credenciales aquí); **cobros reales de Wompi**; **inicio de sesión con Google**; la aplicación Android; ni el contenido
de los datos reales de v1 (no se leyeron).

## 2 · Cifras

| | |
|---|---|
| Código de V2 en la app | **30 654 líneas** en 222 archivos: **41 páginas**, **143 rutas API** |
| Reglas de negocio (`@skylog/domain`) | 6 300 líneas, 85 archivos, **494 pruebas** en 42 archivos (todo archivo de dominio tiene su prueba) |
| Librerías V2 (`src/lib/v2`) | 2 363 líneas · ETL `scripts/etl`: 1 142 líneas (59 verificaciones propias) |
| Base de datos del branch | **90 tablas, todas con RLS activada**; 76 migraciones aplicadas |
| **v1 todavía en la rama** | `src/app/api` 18 459 · `dashboard` 19 458 · `components` 19 334 · `lib` (no v2) 10 432 → **≈ 67 700 líneas**, 184 rutas API |
| Calidad estática | Lint: 0 errores (3 avisos antiguos) · Build: OK · 0 `dangerouslySetInnerHTML`, 0 secretos en código, 0 `eval`, 0 `<img>` sin `alt`, 0 TODO reales |

## 3 · Lo que está bien

1. **Seguridad de datos por diseño.** RLS en 90/90 tablas; las rutas con llave de servicio (31) validan rol y pertenencia
   a la organización (o firma/token, en las públicas). Ninguna ruta de V2 queda sin control de sesión salvo las 6 públicas a propósito
   (`alta*`, regalo, reporte público, *webhook*), todas con límite de uso o firma. Cero asignación masiva (`insert({...body})`).
2. **Funciones de base seguras.** Los *helpers* de RLS y las funciones que suman horas/ciclos (`increment_aircraft_hours`…)
   verifican la membresía antes de escribir; las funciones de alta, unión, invitación y borrado de cuenta están revocadas a usuarios y solo las llama el servidor.
3. **Retención y custodia legal impuestas por la base**, no por la pantalla: ni la API ni una cascada pueden borrar un registro
   operacional antes de 5 años o bajo custodia (probado: el borrado de organizaciones/cuentas se rechaza con la fecha).
4. **Reglas de negocio puras y probadas**, compartidas por servidor y pantalla (misma función valida en ambos lados).
5. **Todas las tablas que usa el código existen** (84 tablas referenciadas, 0 inexistentes) y **las 40 páginas cargan limpias**:
   0 caídas, 0 desbordes, 0 errores de consola, 0 respuestas de error (salvo las 2 pantallas de superadmin vistas por un usuario normal, 403 correcto).
6. **Rutas sensibles bien resueltas**: el replay **falla cerrado** si no puede dejar constancia de la custodia; el *webhook* de Wompi valida firma e idempotencia;
   el cierre de despacho solo lo hace el piloto que despachó.
7. **Cobertura de migración verificable**: ETL idempotente con informe, archivo fiel de v1 (`legacy_v1_rows`, sin contraseñas) y prueba de que
   la contraseña cifrada importa.
8. **Disciplina de documentación**: 190 decisiones fechadas, con lo no probado declarado como tal.

## 4 · Lo que está mal o en riesgo

### 🔴 Crítico — bloquea promover la rama o cortar

| # | Hallazgo | Evidencia | Qué hacer |
|---|---|---|---|
| **C1** | ✅ **RESUELTO 2026-10-09 (decisión 192): `supabase/baseline/`.** ~~El esquema de V2 no se puede reconstruir desde el repo.~~ De las 76 migraciones aplicadas en el branch, **~27 no tienen archivo** (flota fases 1-4, capacitación, proveedores, listas de chequeo, suscripciones, Wompi, manuales, SMS-GAP/BSC/plan oficial/informe mensual, misiones…). Tablas núcleo como `aircraft`, `batteries`, `aircraft_models`, `maintenance_events`, `checklists`, `subscriptions`, `manuales` **no tienen `CREATE TABLE` en el repositorio**. | Comparación nombre a nombre; `grep` de `CREATE TABLE` por tabla | Con la decisión A («proyecto nuevo») esto es **el** bloqueante: generar una **migración base** desde el esquema real del branch (volcado) y verificar que, aplicada en un proyecto vacío, deja el mismo esquema (comparación de tablas/columnas/políticas/funciones). |
| **C2** | ✅ **RESUELTO 2026-10-09 (decisión 193).** ~~v1 convive con V2 en la misma rama.~~ 184 rutas API, `/dashboard`, `/admin/master`, `/socio`(parcial) y 19 000 líneas de componentes consultan **44 tablas que no existen** (`profiles`, `pilots`, `organization_members`, `flight_authorizations`…). Cualquier llamada devuelve error; son superficie inútil y confusa. **4 de los 8 *crons*** de `vercel.json` son de v1 y **fallarán cada día** (`aerocivil-report-reminder`, `training-exam-reminder`, `spi-annual-reminder`, `vormor-deadline-reminder`). Hay una **ruta duplicada** (`/api/flights/[id]/replay`). | Cruce de tablas; revisión de `vercel.json`; aviso de Next | Retirar lo que ya no aplica (conservando las páginas públicas de marketing/legales, `/api/app/version` y los endpoints que V2 sí usa) y reemplazar los 4 *crons* por equivalentes V2 o quitarlos. |
| **C3** | **Dependencias con vulnerabilidades: 12 (3 críticas, 6 altas).** `next` (DoS; salto mayor a 15), `jspdf` y `jspdf-autotable` (ReDoS; salto a 5.x, afecta ~10 PDF), `@capacitor/android`, `sharp`, `exceljs`→`uuid`, `postcss`, `nanoid`, `brace-expansion`, `source-map-js`, `dompurify`. | `npm audit --omit=dev` | Subir en este orden: parches no mayores (`npm audit fix`) → `next` 15 con regresión → `jspdf` 5 probando los PDF uno a uno. |

### 🟠 Alto

| # | Hallazgo | Detalle | Qué hacer |
|---|---|---|---|
| **A1** | **Sin pruebas automáticas de rutas ni pantallas.** 143 rutas y 41 páginas se probaron a mano (bien, y documentado) pero **no son repetibles**: un cambio futuro puede romper una sin que nada avise. | Solo existen pruebas de `@skylog/domain` y el autotest del ETL | Una batería mínima de **integración contra el branch** (alta, invitación, despacho→cierre, pago/webhook, borrado con retención) y un **humo de navegador** (el recorrido de 40 páginas de esta auditoría, convertido en script). |
| **A2** | **Límite de uso en memoria.** `checkRateLimit` vive en la instancia; en Vercel, un atacante que cae en otra instancia no queda bloqueado. Afecta los endpoints públicos: alta, alta/regalo, alta/organizacion (consulta de NIT), reporte público, invitaciones. | El propio archivo lo documenta | Moverlo a Upstash/Redis (reemplazo directo) o a una tabla con ventana; mientras tanto el límite de Supabase Auth cubre parte del alta. |
| **A3** | **Las páginas de V2 no se protegen en el servidor.** `/inicio` sin sesión responde 200 con «Cargando panel…»; el *middleware* no cubre las rutas de V2 y la redirección al login ocurre en el cliente. No hay fuga (las APIs exigen sesión) pero es frágil y mala experiencia. **Tampoco hay CSP** (sí HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy). | `curl` sin sesión; `next.config.mjs` | Extender el *middleware* a las rutas de V2 y agregar una CSP con *report-only* primero. |
| **A4** | **Paridad con v1 incompleta.** Sin equivalente en V2 (**notificaciones in-app ✅ resueltas el 2026-10-09, decisión 191**): **bitácora de acciones de usuario** (`audit_log`), **importación Excel / Onboarding Express** para clientes nuevos, **existencias de equipo**, **cancelar suscripción**, **historial de facturación**, **add-ons** de piloto/dron extra, **eliminar mi cuenta** (Ley 1581), recordatorios por *cron* de **examen de capacitación**, **SPI anual** y **reporte mensual a la Aerocivil**, y el **banner de actualización del APK** (`AppUpdateBanner`). | Verificado una a una contra rutas y tablas de V2 | Decidir cuáles son imprescindibles **antes del corte** y cuáles se difieren (ver §6). Para la Ley 1581, «eliminar mi cuenta» y «exportar mis datos» no son opcionales en un SaaS con datos personales. |
| **A5** | **Decisiones abiertas que condicionan el corte**: qué se puede purgar de los regalos vencidos; las **5 suscripciones vencidas pero activas** (verán «venció» al entrar); si se migran los add-ons. | Decisiones 186, 189, 190 | Resolverlas con el usuario. |

### 🟡 Medio

| # | Hallazgo | Qué hacer |
|---|---|---|
| M1 | **Rendimiento de la base** (aún sin carga, pero conviene): **99 claves foráneas sin índice**, 3 políticas que reevalúan `auth.uid()` por fila (`accounts`, `pending_subscriptions`, `colombia_geo`), 4 tablas con políticas permisivas duplicadas (`organization_emergency_contacts`, `person_additions`, `person_documents`, `sms_changes`) y **1 índice duplicado** en `memberships`. | Una migración de limpieza; los índices de FK de las tablas calientes primero (`flights`, `missions`, `sms_reports`, `dispatches`). |
| M2 | **Protección contra contraseñas filtradas desactivada** en Supabase Auth; **sin MFA** (ni para el superadmin, que puede borrar cuentas y organizaciones). | Activar la protección (ajuste del panel) y exigir MFA al rol `superadmin`. |
| M3 | **Diálogos nativos** `prompt()/confirm()` en 16 archivos (incluidas las acciones destructivas del superadmin): en móvil son incómodos y no son accesibles. | Reemplazar por un diálogo propio con confirmación escrita. |
| M4 | **Archivos grandes y mezcla de responsabilidades**: 6 páginas de 600-800 líneas (`programacion`, `bitacora`, `mantenimiento`, `riesgos`, `flota`) y rutas de 200+ líneas con lógica de negocio dentro (`polizas`, `flights`). | Extraer a `@skylog/domain` / subcomponentes cuando se vuelvan a tocar; no refactorizar en bloque. |
| M5 | **Sin tipos** (JavaScript puro, decisión consciente: «no migrar a TypeScript»); el riesgo se compensa con las pruebas de dominio, pero las rutas no tienen esa red. | Mantener la decisión; el A1 es la mitigación real. |
| M6 | **Lo que depende de configuración no probada**: copia de archivos R2, Google, cobro real Wompi, envío de correos, ETL contra datos reales. | Ver §6. |
| M7 | **Documentación parcialmente desactualizada**: `50-hoja-de-ruta.md` conserva un «Estado real» de 2026-09-15. | Actualizar el estado real y apuntar a esta auditoría. |

### ⚪ Bajo
- Aviso `MODULE_TYPELESS_PACKAGE_JSON` al correr los scripts (cosmético: falta `"type": "module"` o importar el catálogo de otra forma).
- Mensajes y límites de los *crons* heredados (`free-grants`, `grant-expiring-reminder`) conviven con sus equivalentes V2 por reutilizar la misma ruta; está bien, solo conviene documentarlo.

## 5 · Qué falta frente al plan (`50-hoja-de-ruta.md`)

| Frente | Estado |
|---|---|
| F5 Tiempos de servicio · F4a Expediente Aerocivil · F3 SMS · F1 Rediseño | ✅ construidos |
| F2 Comando y Control | 🟡 construido sin hardware ni *gateway* (no probado con un dron real) |
| **F4b Radicación automática** | ❌ no construido (el de mayor responsabilidad: custodia de credenciales; las credenciales de la Aerocivil se vuelven a registrar en V2) |
| Registros obligatorios R1-R12 | ✅ (R9 programa de mantenimiento por modelo con calibración, parcial) |
| R14 Mercancías peligrosas | 🟡 solo el mínimo (declaración + aviso) |
| R16 Replay multimarca · R17 Análisis forense | ❌ no construidos (previstos como complementos) |
| Alta, invitaciones, Google, socios, superadmin, ETL, flujo ePayco→Wompi | ✅ (Etapas A-F y migración) |

## 6 · Orden recomendado

1. **C1** — migración base reproducible (sin esto no hay proyecto nuevo).
2. **C2** — retirar v1 de la rama y reponer los *crons* (reduce 68 000 líneas de ruido y la superficie expuesta).
3. **C3** — parches de dependencias; luego `next` 15 y `jspdf` 5 con regresión.
4. **A1** — humo de navegador + integración mínima (el recorrido de esta auditoría ya es la base).
5. **A4/A5** — decidir paridad imprescindible (notificaciones, auditoría de acciones, onboarding Excel, eliminar/exportar mis datos) y las decisiones abiertas.
6. **A2/A3/M2** — límite de uso compartido, protección en servidor + CSP, MFA y contraseñas filtradas.
7. **Configuración y ensayo real**: usuario de solo lectura de v1 → primer ensayo del ETL; credenciales R2 → copia de archivos; Google y URLs de redirección; llaves de Wompi → un pago real de prueba.
8. **M1/M3/M4/M7** — limpieza de base, diálogos, archivos grandes y documentación.

*Auditoría realizada sin tocar producción; los datos de prueba del recorrido se crearon y se borraron en el branch de desarrollo.*
