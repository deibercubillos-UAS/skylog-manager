# BitaFly — Manual Funcional

| | |
|---|---|
| **Versión** | 1.0 |
| **Fecha** | 2026-07-09 |
| **Fuente de verdad** | `src/lib/roles.js` (matriz `PERMISSIONS`) + `src/app/dashboard/layout.js` (`navLinks`) — este manual describe el comportamiento real del código, no una intención de diseño |
| **Documento relacionado** | `docs/documento-tecnico-bitafly.md` (arquitectura), `docs/bitafly-product-brief.md` (descripción comercial) |

> Manual dividido en fases, una por cada pestaña real del menú. Cada fase indica: qué es,
> qué se puede hacer ahí, **quién la ve** (roles con acceso al link de navegación) y
> **quién puede gestionar/editar** frente a quién solo consulta, más las limitantes de plan o
> de estado de cuenta que aplican.

---

## Fase 0 — Estructura general y roles del sistema

### Roles

| Rol (valor en BD) | Nombre visible | Quién es |
|---|---|---|
| `superadmin` | SuperAdmin | Equipo interno de BitaFly. Acceso total a la plataforma y al panel Master. Nunca se muestra en UI pública. |
| `admin` | Gerente General | Dueño/representante legal de la organización. Acceso operativo total dentro de su org. |
| `gerente_sms` | Gerente SMS | Responsable del Sistema de Gestión de Seguridad Operacional. |
| `jefe_pilotos` | Jefe de Pilotos | Responsable operativo: flota, misiones, programación, tripulación. |
| `piloto` | Piloto | Operador de campo: despacha sus vuelos asignados, gestiona su propio expediente. |

**Piloto Independiente**: no es un rol distinto — es una cuenta con `role='admin'` y
`subscription_plan='piloto'` (organización unipersonal). Conserva todos los permisos de
`admin`, pero el sidebar le **oculta por completo el grupo "Documentación"** (Fases 10-17 de
este manual) sin importar el permiso individual de cada pestaña — es una decisión de producto
explícita, no una limitación de permisos.

### Organización del menú

El sidebar se agrupa en 3 secciones visuales — **Operación**, **Flota & Equipo**,
**Documentación** — más un menú de cuenta aparte (avatar, no en el sidebar principal) con
Perfil / Organización / Suscripción. Cada pestaña define de forma independiente qué roles la
ven; el agrupamiento es solo de presentación.

### Limitantes transversales (aplican a cualquier pestaña)

- **Período de gracia** (cuenta con `deactivated_at` hace más de 30 días, o suscripción
  vencida sin renovar): el menú se reduce únicamente a **Dashboard** y **Bitácora** —
  ninguna otra pestaña de este manual es accesible hasta regularizar la cuenta.
- **`paidOnly`**: algunas funciones (ej. Gestión de Usuarios) requieren un plan pagado activo,
  independiente del rol.
- **Aislamiento por organización**: cada pestaña muestra únicamente datos de la organización
  activa de la cuenta (ver `docs/documento-tecnico-bitafly.md` §2.4, multi-organización).

---

## Fase 1 — Dashboard (Inicio)

**Ruta**: `/dashboard` · **Grupo**: Operación

Panel de inicio con indicadores clave (KPIs) de la organización: vuelos del mes, horas
totales, estado de la flota, alertas de vencimiento (mantenimiento, certificados médicos,
baterías cerca del umbral de retiro).

**Vista diferenciada por rol**: cuando `role==='piloto'`, se renderiza `PilotDashboard.js` en
vez del dashboard general — muestra únicamente KPIs propios (horas de vuelo, vuelos
realizados/pendientes), gráfica de horas mensuales, misiones programadas con botón Despachar,
y accesos directos a reportar VOR/MOR.

| | |
|---|---|
| **Quién la ve** | Todos los roles: SuperAdmin, Gerente General, Gerente SMS, Jefe de Pilotos, Piloto |
| **Quién gestiona/edita** | No aplica — es un panel de solo lectura para todos los roles |
| **Limitantes** | Ninguna adicional a las transversales de Fase 0 |

---

## Fase 2 — Bitácora (Logbook)

**Ruta**: `/dashboard/logbook` · **Grupo**: Operación

Registro oficial de todos los vuelos de la organización. Incluye la tabla histórica de vuelos
y 3 flujos anidados:

- **Despacho** (`/dashboard/logbook/new`): wizard de registro de un vuelo nuevo, con pasos de
  seguridad configurables (Salud, Inventario, Evaluación de Riesgos, Pre-vuelo, Briefing).
- **Cierre de Vuelo** (`/dashboard/logbook/finalize`): completa hora de aterrizaje,
  observaciones y reporte de seguridad de un vuelo ya despachado.
- **Replay GPS**: reproducción animada de la trayectoria de un vuelo importado desde DJI.

| | |
|---|---|
| **Quién ve la tabla de bitácora** | Todos los roles |
| **Quién puede despachar un vuelo** (`canFly`) | SuperAdmin, Gerente General, Jefe de Pilotos, Piloto — **Gerente SMS no despacha vuelos** |
| **Quién edita PIC/N° de misión inline** (`canEditPilotPic`) | SuperAdmin, Gerente General, Jefe de Pilotos |
| **Quién puede editar un registro ya cerrado** (`canEditLogbook`) | SuperAdmin, Jefe de Pilotos — ni el Gerente General ni el Gerente SMS pueden editar un vuelo cerrado |
| **Quién puede eliminar un registro** (`canDeleteLogbook`) | SuperAdmin, Jefe de Pilotos |
| **Quién puede importar logs DJI** (`canImportFlights`) | SuperAdmin, Gerente General, Jefe de Pilotos — el Piloto de organización no importa logs directamente (los sube quien tiene este permiso); el Piloto Independiente sí, porque su rol real es `admin` |
| **Quién puede ver el Replay GPS** (`canViewFlightReplay`) | SuperAdmin, Gerente General, Gerente SMS, Jefe de Pilotos — **el Piloto no tiene acceso al replay de sus propios vuelos** |
| **Limitantes** | Piloto de organización: en el wizard de Despacho, solo ve las misiones donde es el PIC asignado **y** programadas para la fecha de hoy (no puede adelantar ni atrasar el despacho). Replay GPS: retención y cantidad de vuelos disponibles limitadas por plan (Piloto: 30 días/10 vuelos · Escuadrilla: 90 días/50 · Flota: 180 días/200 · Enterprise: ilimitado). Bloqueo de despacho si: mantenimiento mayor o menor vencido de la aeronave, examen de Capacitación de Operaciones no aprobado, o riesgo "Inaceptable" sin mitigar en el paso de Evaluación de Riesgos. |

---

## Fase 3 — Programación

**Ruta**: `/dashboard/authorizations` · **Grupo**: Operación

Creación y gestión de órdenes de vuelo (misiones) antes de que un piloto pueda despachar.
Incluye el calendario de **Programación Activa** incrustado en la misma página (sin entrada
propia en el sidebar) con vista semanal/lista, KPIs de la semana y descarga KMZ/PDF por
misión. La evaluación SORA es obligatoria para autorizar cualquier misión nueva.

Dos vistas complementarias, con su propia entrada de menú:

- **Mis Vuelos** (`/dashboard/mis-vuelos`): vista de solo lectura de las misiones programadas
  para el Piloto — reutiliza el mismo calendario en modo `readOnly`.
- **Planear Vuelo** (`/dashboard/plan-vuelo`): herramienta de planeación libre (mapa, zona,
  KMZ/PDF) **exclusiva del Piloto Independiente** — un piloto miembro de una organización ya
  no tiene acceso a este flujo (quitado 2026-07-07): solo despacha lo que le programaron.

| | |
|---|---|
| **Quién ve "Programación"** | SuperAdmin, Gerente General, Jefe de Pilotos — oculto para el Piloto Independiente |
| **Quién ve "Mis Vuelos"** | Solo el rol Piloto (de organización) |
| **Quién ve "Planear Vuelo"** | Solo el Piloto Independiente (organización unipersonal, plan Piloto) |
| **Gerente SMS** | No tiene ninguna de las 3 entradas en su menú |
| **Limitantes** | Toda misión nueva exige seleccionar (o crear al vuelo) una evaluación SORA completa antes de poder autorizarla. El conflicto de agenda del PIC se detecta por día calendario (no por franja horaria) y solo advierte, no bloquea la creación. |

---

## Fase 4 — Meteorología

**Ruta**: `/dashboard/weather` · **Grupo**: Operación

Condiciones meteorológicas actuales y pronóstico horario del día para decisión de vuelo:
score de aptitud 0-100 (viento, ráfagas, visibilidad, precipitación, índice geomagnético Kp),
6 tarjetas de condiciones, pronóstico de 8 horas y clima de las zonas con misión programada
para hoy.

| | |
|---|---|
| **Quién la ve** | Todos los roles |
| **Quién gestiona/edita** | No aplica — módulo de solo consulta |
| **Limitantes** | Ninguna adicional a las transversales de Fase 0 |

---

## Fase 5 — Flota

**Ruta**: `/dashboard/fleet` · **Grupo**: Flota & Equipo

Inventario de aeronaves de la organización: registro, foto, estado operativo, horas totales,
configuración de mantenimiento mayor y menor, trazabilidad de componentes (hélices, motores,
ESC), enlaces a Baterías.

| | |
|---|---|
| **Quién ve el listado** | Todos los roles |
| **Quién crea/edita/da de baja/transfiere aeronaves** (`canManageFleet`) | SuperAdmin, Gerente General, Jefe de Pilotos |
| **Quién cambia el estado operativo manualmente** (`canManageAircraftStatus`) | SuperAdmin, Gerente General únicamente |
| **Piloto de organización** | **Solo lectura** — no ve botones de editar/dar de baja/transferir |
| **Piloto Independiente** | Gestión completa (su rol real es `admin`) |
| **Limitantes** | Cantidad de aeronaves registrables limitada por plan (Piloto: 1 · Escuadrilla: 3 · Flota: 15 · Enterprise: ilimitado), ampliable comprando drones adicionales sin importar el plan. |

---

## Fase 6 — Baterías

**Ruta**: `/dashboard/batteries` · **Grupo**: Flota & Equipo

Registro de baterías con serial, ciclos de carga (actualizados automáticamente al importar
logs DJI), estado de salud y última aeronave asociada.

| | |
|---|---|
| **Quién ve el listado** | Todos los roles |
| **Quién crea/edita/da de baja** (`canManageFleet`) | SuperAdmin, Gerente General, Jefe de Pilotos |
| **Piloto de organización** | Solo lectura |
| **Piloto Independiente** | Gestión completa |
| **Limitantes** | Cantidad de baterías por plan (Piloto: 3 · el resto de planes: ilimitadas). Umbral de retiro sugerido: 200 ciclos. |

---

## Fase 7 — Mantenimiento

**Ruta**: `/dashboard/maintenance` · **Grupo**: Flota & Equipo

Registro y seguimiento de mantenimiento **mayor** (con técnico, umbral por horas/días,
bloquea despacho) y **menor** (chequeo ligero del propio piloto, contadores independientes,
también bloquea despacho). Incluye recibo post-mantenimiento, checklist de recibo y
trazabilidad de componentes cambiados.

| | |
|---|---|
| **Quién ve la página completa** (`canManageOps`, gatea toda la ruta) | SuperAdmin, Gerente General, Jefe de Pilotos, Piloto |
| **Quién registra/diligencia mantenimiento (mayor o menor)** | Los mismos 4 roles anteriores — **incluye al Piloto**, a diferencia de Flota/Baterías |
| **Quién edita el checklist de "Recibo Mtto." y "Mantenimiento Menor"** (`canViewFinance`, vía Protocolos) | SuperAdmin, Gerente General, Gerente SMS — **Jefe de Pilotos no puede editar estos checklists**, solo diligenciarlos |
| **Gerente SMS** | No aparece en el menú de Mantenimiento (no está en `canManageOps`) — solo accede a configurar los 2 checklists desde Protocolos |
| **Limitantes** | Una aeronave con mantenimiento mayor o menor vencido queda bloqueada para despacho hasta regularizarse. |

---

## Fase 8 — Tripulación

**Ruta**: `/dashboard/pilots` · **Grupo**: Flota & Equipo

Gestión del equipo humano: datos personales, licencia RAC 100, expediente digital
(documentos con vencimiento), invitación de nuevos tripulantes por correo, estado de
certificación médica. El Gerente General no aparece en esta lista (es propietario, no
tripulación operativa).

| | |
|---|---|
| **Quién ve el listado** | Todos los roles excepto el Piloto Independiente (oculta, `pilotHidden` — no tiene tripulación que gestionar) |
| **Quién crea/edita/invita/da de baja tripulantes** | SuperAdmin, Gerente General, Jefe de Pilotos |
| **Gerente SMS y Piloto** | Solo lectura del listado |
| **Cualquier piloto** | Puede editar su **propio** expediente (documentos, contacto de emergencia) desde Mi Perfil, no desde esta pestaña |
| **Limitantes** | Cantidad de tripulantes contra el límite de plan excluye a Gerente General y Gerente SMS (`crewCountsForLimit`) — solo cuentan Piloto, Jefe de Pilotos y Observador. Ampliable comprando pilotos adicionales sin importar el plan. |

---

## Fase 9 — Inventario de Operación

**Ruta**: `/dashboard/inventory-checklist` · **Grupo**: Flota & Equipo

Dos secciones: **Existencias de equipo** (catálogo de tipo/cantidad de insumos — chalecos,
botiquín, extintores) y **Checklist de verificación** que se diligencia en Despacho antes del
paso de Pre-vuelo, con relación opcional a las existencias para mostrar cuánto stock hay
disponible.

| | |
|---|---|
| **Quién la ve / diligencia en Despacho** (`canViewInventoryChecklist`) | Todos los roles |
| **Quién crea/edita ítems del checklist y existencias** (`canManageInventoryChecklist`) | SuperAdmin, Gerente General, Gerente SMS, Jefe de Pilotos — **no el Piloto** |
| **Limitantes** | Desactivada por defecto en cada organización hasta que un manager la activa explícitamente. |

---

## Fase 10 — Seguridad SMS

**Ruta**: `/dashboard/safety` · **Grupo**: Documentación

Hub con 9 pestañas internas: SORA, Evaluación de Riesgos, Indicadores (SPI), Mejora Continua,
Acciones Correctivas, Reportes de Seguimiento (plazos VOR/MOR), Barreras de Seguridad, Mapas,
y Capacitación SMS.

| | |
|---|---|
| **Quién ve el hub** (`canViewFinance`) | SuperAdmin, Gerente General, Gerente SMS — **Jefe de Pilotos y Piloto no tienen esta pestaña** (llegan a SORA por una entrada directa aparte, ver Fase 11) |
| **Quién crea/edita contenido** (`canManageSMS`) | SuperAdmin, Gerente General, Gerente SMS |
| **Capacitación SMS** (sub-pestaña) | Gatea distinto del resto: solo `canManageSMS` (SuperAdmin/Gerente General/Gerente SMS) — ni siquiera Jefe de Pilotos, porque la RLS de esas tablas específicas lo excluye |
| **Piloto Independiente** | Sin acceso — todo el grupo "Documentación" está oculto para esta cuenta |
| **Limitantes** | Ninguna por plan; es funcionalidad disponible en todos los planes de organización. |

---

## Fase 11 — SORA

**Ruta**: `/dashboard/sora` · **Grupo**: Documentación

Wizard de evaluación de riesgo específico (GRC/ARC/SAIL) para operaciones bajo RAC 100. Es
el mismo componente que se abre embebido dentro de Seguridad SMS y dentro del formulario de
Programación — esta pestaña es la **entrada directa** para quien no tiene acceso al hub de
Seguridad SMS.

| | |
|---|---|
| **Quién tiene esta entrada directa** | Jefe de Pilotos, Piloto (de organización), y el Piloto Independiente |
| **SuperAdmin / Gerente General (org) / Gerente SMS** | No tienen esta entrada — llegan a SORA desde la pestaña dentro de Seguridad SMS (Fase 10) |
| **Quién crea evaluaciones** | Cualquier rol con acceso a la página (todos los anteriores) |
| **Limitantes** | Ninguna adicional. |

---

## Fase 12 — Auditoría

**Ruta**: `/dashboard/audit` · **Grupo**: Documentación

Dos pestañas: registro de acciones de usuario (`audit_log`, quién hizo qué y cuándo) y panel
de cumplimiento de aeronavegabilidad/vigencia documental de tripulación.

| | |
|---|---|
| **Quién la ve** (`canViewAudit`) | SuperAdmin, Gerente General, Gerente SMS, Jefe de Pilotos |
| **Piloto y Piloto Independiente** | Sin acceso |
| **Quién gestiona/edita** | No aplica — es un módulo de solo consulta; el log de acciones es append-only y solo lo escribe el servidor |
| **Limitantes** | Solo hay instrumentación de acciones de tipo creación (`create`) hasta la fecha — no de edición/eliminación/accesos fallidos. |

---

## Fase 13 — Reportes

**Ruta**: `/dashboard/reports` · **Grupo**: Documentación

Más de 20 formatos descargables (PDF/Excel) agrupados por categoría: Operación, Tripulación,
Documentación, Seguridad SMS, Proveedores. Incluye el Reporte Operacional Mensual UAS exigido
por Aerocivil.

| | |
|---|---|
| **Quién la ve** (`canViewAudit`) | SuperAdmin, Gerente General, Gerente SMS, Jefe de Pilotos |
| **Piloto y Piloto Independiente** | Sin acceso |
| **Excepciones más restrictivas dentro de la misma página** | El reporte de Proveedores exige `canManageSuppliers`; el reporte manual/consolidado exige `canManageFleet` — ambos más estrictos que el gate general de la página |
| **Limitantes** | Los reportes se generan 100% en el navegador al momento de la descarga — no quedan persistidos ni hay historial de "reportes generados". |

---

## Fase 14 — Protocolos

**Ruta**: `/dashboard/settings/forms` · **Grupo**: Documentación

Configuración de los checklists operativos fijos (Salud, Inventario, Pre-vuelo por modelo,
Briefing, Recibo de Mantenimiento, Mantenimiento Menor), edición de los formatos públicos
VOR/MOR, y biblioteca libre de protocolos/procedimientos organizados en 4 grupos (Prevuelo,
Reportes, Seguridad Operacional, Mantenimiento).

| | |
|---|---|
| **Quién la ve/edita** (`canViewFinance`, gate único — sin nivel de solo lectura) | SuperAdmin, Gerente General, Gerente SMS |
| **Jefe de Pilotos, Piloto, Piloto Independiente** | Sin acceso a esta pestaña (Jefe de Pilotos sí puede diligenciar los checklists resultantes desde Bitácora/Mantenimiento, solo no configurarlos aquí) |
| **Limitantes** | Ninguna por plan. |

---

## Fase 15 — Proveedores

**Ruta**: `/dashboard/suppliers` · **Grupo**: Documentación

Listado de proveedores + checklist de auditoría personalizable por organización, con reporte
individual, por proveedor o consolidado.

| | |
|---|---|
| **Quién la ve/edita** (`canManageSuppliers`, gate único) | SuperAdmin, Gerente General, Gerente SMS, Jefe de Pilotos |
| **Piloto y Piloto Independiente** | Sin acceso — **es el único módulo de "Documentación" sin ningún nivel de solo lectura para Piloto**, a diferencia de Manuales/Capacitación |
| **Limitantes** | Ninguna por plan. |

---

## Fase 16 — Capacitación

**Ruta**: `/dashboard/training` · **Grupo**: Documentación

3 pestañas: Operaciones y Mantenimiento (cronograma + examen interno calificado que puede
bloquear el despacho) y Capacitación SMS (asistencia, sin examen).

| | |
|---|---|
| **Quién consulta el programa y presenta el examen** (`canViewTraining`) | Todos los roles, incluido Piloto |
| **Quién gestiona el cronograma y configura el examen** (`canManageTraining`) | SuperAdmin, Gerente General, Gerente SMS, Jefe de Pilotos |
| **Pestaña "Capacitación SMS"** | Solo visible para `canManageSMS` (SuperAdmin, Gerente General, Gerente SMS) — ni Jefe de Pilotos ni Piloto la ven, por la misma restricción de RLS que en Fase 10 |
| **Piloto Independiente** | Sin acceso a la pestaña completa (grupo Documentación oculto) |
| **Limitantes** | El examen de Operaciones **bloquea el despacho** si el piloto no lo aprobó o venció su plazo; el de Mantenimiento es solo informativo. |

---

## Fase 17 — Manuales

**Ruta**: `/dashboard/manuales` · **Grupo**: Documentación

Repositorio de manuales corporativos versionado, con acuse de lectura obligatorio por
versión y acta de divulgación en PDF.

| | |
|---|---|
| **Quién consulta/descarga** (`canViewManuals`) | Todos los roles, incluido Piloto |
| **Quién carga/publica versiones nuevas** (`canManageManuals`) | SuperAdmin, Gerente General, Gerente SMS, Jefe de Pilotos |
| **Entrada directa en el sidebar** | Solo Jefe de Pilotos y Piloto (de organización) tienen este link — SuperAdmin/Gerente General/Gerente SMS llegan por un enlace dentro de Protocolos, ya que también tienen esa pestaña |
| **Piloto Independiente** | **Sin acceso en absoluto** — Manuales aplica solo a organizaciones con equipo |
| **Limitantes** | Archivos hasta 25 MB (PDF/Word/Excel). |

---

## Fase 18 — Cuenta (Perfil, Organización, Suscripción)

**Rutas**: `/dashboard/settings/profile`, `/dashboard/settings`, `/dashboard/subscription` ·
Acceso desde el menú de cuenta (avatar), no desde el sidebar principal

| Pestaña | Quién la ve |
|---|---|
| **Mi Perfil** | Todos los roles — cada usuario edita sus propios datos, documentos y contacto de emergencia |
| **Configurar Organización** (`canEditOrg`) | Solo SuperAdmin y Gerente General |
| **Gestión de Usuarios** (roles/plan, `paidOnly`) | Solo SuperAdmin y Gerente General, y solo con un plan pagado activo |
| **Suscripción** | Solo SuperAdmin y Gerente General — pago, cancelación, historial de facturación, recursos adicionales |

**Limitantes**: la cancelación de suscripción degrada el plan al nivel base (Piloto) sin
borrar datos históricos. El acceso gratuito por certificación (Fase 0 ante AeroCivil, otorga
el plan Escuadrilla, máximo 6 meses) se activa manualmente desde el panel Master, no desde
esta pestaña.

---

## Fase 19 — Panel Master

**Ruta**: `/admin/master` · Fuera del dashboard operativo

Herramienta interna de BitaFly: gestión de usuarios/roles/planes de cualquier organización,
suscripciones ePayco, programa de socios, comisiones, invitaciones de venta, recursos
adicionales, releases de la app Android, activación manual de acceso gratuito por
certificación, conversión de una cuenta a Piloto Independiente, eliminación de cuentas.

| | |
|---|---|
| **Quién accede** (`canAccessMaster`) | Únicamente SuperAdmin |
| **Limitantes** | No es un rol visible en ninguna UI pública ni en la documentación orientada al cliente. |

---

## Fase 20 — Panel Socio

**Ruta**: `/socio` · Fuera del dashboard operativo, sistema de permisos independiente

Panel para escuelas de formación UAS y asesores del programa de referidos: regalo de períodos
de prueba, gestión de asesores, reportes de comisiones, subida de logo co-branded.

| | |
|---|---|
| **Quién accede** | No depende del rol operativo (`profiles.role`) — depende de tener una fila en `partner_members` para la cuenta, con `role` propio de ese sistema: `owner` (crea asesores, ve todo) o `asesor` (solo sus datos) |
| **Acceso desde el dashboard** | Botón "Panel Socio" visible solo si la cuenta tiene esa fila en `partner_members` |
| **Limitantes** | Es un sistema paralelo al de roles de organización — una misma cuenta puede ser, por ejemplo, Gerente General de su propia organización operativa **y además** dueño de una escuela socia, sin relación entre ambos roles. |

---

## Resumen — matriz rápida por rol

| Pestaña | SuperAdmin | Gerente General | Gerente SMS | Jefe de Pilotos | Piloto (org) | Piloto Independiente |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ (vista propia) | ✅ |
| Bitácora | ✅ | ✅ | ✅ (sin despachar) | ✅ | ✅ (solo sus misiones de hoy) | ✅ |
| Programación | ✅ | ✅ | ❌ | ✅ | ❌ (ve "Mis Vuelos") | ❌ (ve "Planear Vuelo") |
| Meteorología | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Flota / Baterías | ✅ gestiona | ✅ gestiona | ✅ lee | ✅ gestiona | 👁️ solo lectura | ✅ gestiona |
| Mantenimiento | ✅ | ✅ | ❌ (solo configura checklists) | ✅ | ✅ (diligencia) | ✅ |
| Tripulación | ✅ gestiona | ✅ gestiona | 👁️ solo lectura | ✅ gestiona | 👁️ solo lectura | ❌ (oculta) |
| Inventario | ✅ | ✅ | ✅ | ✅ | 👁️ diligencia, no edita | ❌ (grupo oculto) |
| Seguridad SMS / SORA / Auditoría / Reportes / Protocolos / Proveedores / Manuales | ✅* | ✅* | ✅* | parcial** | parcial** | ❌ (grupo oculto) |
| Capacitación | ✅ | ✅ | ✅ | ✅ | 👁️ consulta y examen | ❌ (grupo oculto) |
| Cuenta → Organización / Suscripción | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Panel Master | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

\* Con matices por pestaña — ver el detalle exacto en cada fase (10-17); no todas son
idénticas para estos 3 roles.
\*\* Jefe de Pilotos y Piloto tienen acceso solo a las pestañas puntuales indicadas en cada
fase (SORA directo, Auditoría/Reportes para Jefe de Pilotos, Manuales y Capacitación para
ambos) — no al hub completo de Documentación.
