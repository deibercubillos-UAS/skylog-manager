# BitaFly — Product Brief
> Documento de referencia para generación de documentación de producto.  
> Versión: julio 2026. Público destino: redactores técnicos, IA generativa, equipo de marketing.

---

## 1. ¿Qué es BitaFly?

**BitaFly** es una plataforma SaaS colombiana de gestión de operaciones con drones (UAS — Unmanned Aircraft Systems). Centraliza todo el ciclo de vida de una operación de vuelo: planear, autorizar, despachar, registrar, reportar y auditar — todo dentro de un único sistema web y app Android, diseñado específicamente para cumplir con la normativa colombiana **RAC 100** de la Aeronáutica Civil (Aerocivil / UAEAC).

### Problema que resuelve

Los operadores de drones en Colombia (empresas, escuelas de formación UAS, pilotos independientes) deben cumplir con un marco regulatorio exigente: bitácoras de vuelo, órdenes de trabajo, reportes SMS (Safety Management System), evaluaciones SORA, checklists de pre-vuelo, expedientes de pilotos con documentos vigentes, manuales corporativos con acuse de lectura, seguros RCE y reportes de ocurrencias (VOR/MOR). Antes de BitaFly, todo esto se gestionaba con hojas de cálculo, carpetas físicas y procesos manuales dispersos.

BitaFly unifica ese flujo en una plataforma digital accesible desde computador y desde los **controladores DJI RC Plus** en campo.

### Mercado objetivo

- **Empresas de operaciones con drones** en Colombia: topografía, agricultura de precisión, inspección de infraestructura, filmación, seguridad, delivery.
- **Escuelas de formación UAS** que certifican pilotos bajo RAC 100.
- **Pilotos independientes** que operan como unipersonales o freelance.

---

## 2. Cómo accede el usuario

### Web
URL principal: **https://bitafly.com**  
Dashboard en: **https://bitafly.com/dashboard**

### App Android (DJI RC Plus)
BitaFly tiene una aplicación nativa Android construida con **Capacitor** que se instala directamente en los controladores DJI RC Plus (sin Google Play). La app carga la misma interfaz web en modo pantalla completa, optimizada para la pantalla de 7" del RC Plus (1920×1080 px en landscape). Las actualizaciones de la app se distribuyen via sistema OTA propio — el usuario recibe una notificación dentro de la app y acepta la instalación sin necesitar Play Store ni conexión a un PC.

---

## 3. Planes y precios

BitaFly opera con suscripción mensual o anual procesada por **ePayco** (pasarela colombiana). Existen cuatro planes:

| Plan | Perfil | Drones | Pilotos operativos | Baterías | Tech/Payloads |
|---|---|---|---|---|---|
| **Piloto** | Piloto autónomo / unipersonal | 1 | 1 | 3 | 3 |
| **Escuadrilla** | Empresa pequeña | 3 | 4 | Ilimitadas | Ilimitados |
| **Flota** | Empresa mediana | 15 | 15 | Ilimitadas | Ilimitados |
| **Enterprise** | Empresa grande / escuela UAS | Ilimitados | Ilimitados | Ilimitadas | Ilimitados |

> **Nota sobre conteo de pilotos**: el Gerente General y el Gerente SMS no cuentan contra el límite del plan porque son roles administrativos, no tripulación operativa.

### Recursos adicionales (add-ons)
Sin importar el plan contratado, la organización puede ampliar sus cupos comprando unidades
adicionales: **Piloto adicional $30.000 COP/mes** y **Dron adicional $25.000 COP/mes**. Hoy se
gestionan desde el panel Master (registro manual de la venta); el checkout self-service vía
ePayco queda pendiente de habilitar.

### Período de gracia
Las escuelas socias y asesores registrados en el programa de socios de BitaFly pueden regalar períodos de uso gratuito (por defecto 90 días) a pilotos nuevos antes de que contraten un plan.

---

## 4. Roles de usuario

Cada usuario tiene un rol que determina qué puede ver y hacer dentro de la plataforma. Los roles están vinculados a la organización (empresa/unipersonal) a la que pertenece el usuario.

| Rol | Nombre visible | Quién es |
|---|---|---|
| `admin` | Gerente General (GG) | Dueño / representante legal de la organización. Acceso total. |
| `jefe_pilotos` | Jefe de Pilotos (JP) | Responsable operativo. Gestiona flota, misiones y tripulación. |
| `gerente_sms` | Gerente SMS (GSMS) | Responsable del Sistema de Gestión de Seguridad. |
| `piloto` | Piloto / Tripulante | Opera drones, despacha sus vuelos asignados, gestiona su expediente. |

> El rol **Piloto Independiente** es una variante especial: un piloto que tiene su propia organización unipersonal (plan Piloto) y actúa como GG de sí mismo. En la base de datos su rol siempre es `admin` (nunca `piloto`) — es lo que le da acceso de gestión total sobre su propia flota unipersonal. No tiene acceso al grupo de navegación "Documentación" (SMS, SORA, Auditoría, Reportes, Protocolos, Proveedores, Capacitación, Manuales) — esos módulos aplican solo a organizaciones con equipo.

> **Una cuenta puede pertenecer a varias organizaciones** — ver sección 7 "Multi-organización por cuenta".

---

## 5. Módulos y funcionalidades

### 5.1 Flota

Inventario completo de los activos aéreos de la organización.

**Aeronaves (Drones)**
- Registro con número de serie, modelo, fabricante, foto y estado operativo.
- Seguimiento de horas de vuelo totales (acumuladas automáticamente al importar logs DJI).
- **Configuración de mantenimiento mayor**: el usuario define cada cuántas horas de vuelo y cada cuántos días calendario el drone requiere mantenimiento mayor (con técnico). El sistema cambia automáticamente el estado a "En mantenimiento" cuando se alcanzan los umbrales, envía notificación al GG y al Jefe de Pilotos, y **bloquea el despacho** de ese drone hasta que se registre el mantenimiento.
- **Mantenimiento Menor (piloto)**: chequeo periódico ligero que realiza el propio piloto (no un técnico), con contadores de horas/días 100% independientes del mantenimiento mayor — cada organización decide su periodicidad por aeronave. También bloquea el despacho de esa aeronave hasta diligenciar el checklist correspondiente.
- Registro de mantenimiento con adjuntos (PDF, imágenes de inspección), recibo post-mantenimiento y trazabilidad de componentes cambiados (hélices, motores, ESC) con horas de uso individuales.

**Baterías**
- Registro de baterías con serial, capacidad, drone asignado y conteo de ciclos de carga.
- El conteo de ciclos se actualiza automáticamente al importar logs DJI.

**Tech / Payloads**
- Registro de cámaras, sensores, gimbales y otros accesorios.

---

### 5.2 Tripulación

Gestión del equipo humano de la organización.

- Registro de pilotos con datos personales, número de licencia RAC 100, rol operativo y foto.
- **Expediente digital por piloto**: el piloto puede subir desde su propio perfil sus documentos vigentes — cédula de ciudadanía, diploma UAS, examen teórico, certificado médico (con fecha de vencimiento), CIPU y contacto de emergencia. Al actualizar, el sistema notifica al GG, JP y GSMS.
- **Invitación de tripulantes**: el GG o JP puede invitar a un tripulante por correo electrónico. Si el tripulante ya tiene cuenta BitaFly, ve un banner de invitación en su dashboard; si no la tiene, recibe un enlace para registrarse directamente en la organización.
- Onboarding masivo vía plantilla Excel (ver sección 5.9).
- El Gerente General no aparece en la lista de tripulación (es propietario, no tripulación operativa).

---

### 5.3 Planeación de Vuelo

Herramienta cartográfica para definir y guardar zonas de operación antes del vuelo.

- Mapa interactivo donde el usuario dibuja la zona de operación (polígono, círculo o punto).
- Configuración de altitud de vuelo, tipo de operación (RAC 100: categoría, subcategoría), departamento y municipio de Colombia.
- **Descarga KMZ** (para importar en Google Earth / DJI Fly) y **PDF del plan de vuelo** (documento formal para la operación).
- Las planeaciones se guardan y pueden reutilizarse en múltiples misiones.
- **Exclusivo del Piloto Independiente**: un piloto miembro de una organización (rol `piloto`) ya no tiene acceso a Planeación de Vuelo — solo despacha lo que el GG/JP ya le programó (ver 5.4 y "Mis Vuelos"). Solo el Piloto Independiente (dueño de su propia organización unipersonal) puede crear planeaciones libres.
- **Condiciones meteorológicas integradas**: al seleccionar el municipio de operación, se muestra automáticamente un widget de clima que indica si las condiciones son aptas para volar (score 0-100, basado en viento, ráfagas, visibilidad, precipitación y actividad geomagnética NOAA Kp).

---

### 5.4 Programación de Misiones (Órdenes de Vuelo)

Módulo para crear y autorizar misiones antes de que los pilotos puedan despachar.

- El GG o Jefe de Pilotos crea una **orden de vuelo** con: nombre de la operación, piloto en comando (PIC), drone asignado, tipo de operación RAC 100, fecha y hora, zona geográfica y notas.
- También disponible la forma del **Apéndice 13** (formato oficial Aerocivil).
- Al crear la misión, el sistema notifica al JP y GG (para seguimiento) y al piloto asignado (en su sección "Mis Vuelos").
- Cada misión puede descargarse como **KMZ** o **PDF** en cualquier momento desde la sección "Programación Activa".
- El widget de clima aparece al programar la misión, mostrando las condiciones del lugar de operación en el momento de planear.

---

### 5.5 Bitácora de Vuelo (Logbook)

Registro oficial de todos los vuelos realizados por la organización.

**Despacho manual**
- El piloto selecciona la orden de vuelo asignada, confirma el drone, hora de despegue y aterrizaje, y registra el vuelo.
- Los pilotos solo ven las misiones en las que están asignados como PIC.
- El GG y JP pueden ver y gestionar todas las misiones.

**Piloto independiente (plan Piloto)**
- Flujo simplificado sin necesidad de orden de vuelo previa: selecciona el drone, tipo de misión y hora de despegue.

**Importación DJI (sincronización automática de logs)**
- Conectar el controlador DJI RC Plus al computador → copiar la carpeta de logs → BitaFly los importa automáticamente.
- Los logs `.txt` del drone se procesan y cada vuelo queda registrado con: fecha, duración exacta, horas de vuelo, ubicación GPS, alertas del sistema del drone.
- Si el número de serie del drone no existe en la organización, el sistema ofrece crearlo en ese momento.
- El sistema detecta automáticamente a qué misión programada corresponde cada vuelo (por fecha y drone) y lo vincula.
- **Auto-sincronización en escritorio**: el usuario elige la carpeta de logs una sola vez; BitaFly la vigila cada 20 segundos y sube automáticamente cualquier vuelo nuevo sin intervención manual.
- Los vuelos de 0 minutos (aterrizajes de emergencia, pruebas en tierra) se omiten automáticamente.

**Edición posterior**
- El GG y Jefe de Pilotos pueden editar el Piloto en Comando y el número de misión de cualquier vuelo registrado, directamente desde la tabla de la bitácora.

**Wizard de despacho — pasos de seguridad**
Antes de aprobar el vuelo, el piloto recorre una serie de pasos de seguridad configurables por la organización (indicador de progreso visible en pantalla):
- **Salud del piloto** — autoevaluación de aptitud física/mental antes de volar.
- **Inventario de Operación** — checklist de equipo/insumos requeridos (baterías cargadas, botiquín, extintor, chalecos, etc.), con existencias reales de equipo visibles junto a cada ítem.
- **Evaluación de Riesgos** — el piloto clasifica Probabilidad × Gravedad de la operación contra la matriz de riesgo configurada por el Gerente SMS; si el resultado es "Inaceptable" debe describir barreras/mitigaciones y volver a evaluar un riesgo residual antes de continuar; si es "Tolerable" puede documentar mitigaciones de forma voluntaria.
- **Pre-vuelo** — checklist configurable por modelo de aeronave.
- **Briefing de misión** — checklist final antes de despegar.
- **Bloqueo por capacitación**: si la organización configuró un examen interno obligatorio de Operaciones, el piloto que no lo haya aprobado (o cuyo plazo venció) no puede despachar — ver sección 5.13 Capacitación.

Todos estos pasos son configurables (activar/desactivar) desde Protocolos, salvo la Evaluación de Riesgos, que se omite automáticamente si la organización no ha configurado su matriz de riesgo todavía.

---

### 5.6 Replay de Vuelo GPS

Reproducción animada de la trayectoria GPS de cualquier vuelo importado desde DJI.

- El usuario abre el vuelo en la bitácora y hace clic en "Replay".
- El mapa muestra la trayectoria del drone punto a punto, animada en tiempo real con la velocidad del vuelo original.
- Se muestra el widget de clima con las condiciones históricas exactas del momento del vuelo (temperatura, viento, visibilidad, lluvia, Kp).
- El acceso y la retención histórica dependen del plan:

| Plan | Retención | Máx. vuelos con replay |
|---|---|---|
| Piloto | 30 días | 10 vuelos |
| Escuadrilla | 90 días | 50 vuelos |
| Flota | 180 días | 200 vuelos |
| Enterprise | Permanente | Ilimitados |

---

### 5.7 Clima UAV

Módulo meteorológico especializado para decisión de vuelo, integrado en todos los puntos clave del flujo operativo.

**¿Apto para volar?**
BitaFly calcula un **score de aptitud de vuelo (0–100)** combinando:
- Velocidad del viento (30% del score)
- Ráfagas de viento (22%)
- Visibilidad horizontal (22%)
- Precipitación (16%)
- Probabilidad de lluvia (5%)
- Índice Kp geomagnético NOAA — tormentas solares que afectan GPS (5%)

Un score ≥ 70 = **APTO**. Por debajo = **NO APTO**, con detalle de qué condición lo impide.

**Fuentes de datos**
- Condiciones actuales y pronóstico 7 días: **Open-Meteo** (modelo meteorológico de alta resolución, sin costo).
- Actividad geomagnética: **NOAA Space Weather** (índice Kp en tiempo real y forecast 24h).

**Dónde aparece el clima en la app**
- Al programar una misión: clima actual del municipio de operación.
- Al despachar: badge compacto APTO/NO APTO con viento y temperatura.
- En el replay de vuelo: condiciones históricas exactas del momento del vuelo.

---

### 5.8 Seguridad SMS y Cumplimiento Normativo

Hub "Seguridad SMS" con varias pestañas en vivo, alineado con las circulares de Aerocivil para explotadores UAS:

**SORA (Specific Operations Risk Assessment)**
- Wizard de evaluación de riesgo (GRC/ARC/SAIL) para operaciones en categoría específica bajo RAC 100. Visible para todos los roles incluyendo el piloto.
- **Obligatorio al programar una misión**: desde 2026-07, toda misión creada en Programación exige seleccionar (o crear al vuelo) una evaluación SORA completa antes de poder autorizarla.

**Evaluación de Riesgos (matriz de la organización)**
- Matriz 5×5 de Probabilidad × Gravedad personalizable por organización (semilla de la OACI Doc 9859), con tabla de tolerabilidad (Inaceptable / Tolerable / Aceptable) editable celda por celda.
- Registro de Peligros (hazards) con mitigación en texto libre.
- Esta misma matriz alimenta el paso de Evaluación de Riesgos del wizard de Despacho (ver 5.5).

**Indicadores de Desempeño en Seguridad Operacional (SPI)**
- Catálogo de indicadores (activaciones RTH por batería crítica, pérdida de enlace, aterrizajes de emergencia, incursión en espacio restringido, reportes VOR/MOR, etc.), captura de datos mensuales, línea base y líneas de alerta calculadas automáticamente, planes de acción por indicador con defensa/causa raíz/desencadenante, y rastro de envío anual (recordatorio antes del 30 de marzo).

**Mejora Continua (autoevaluación GAP del SMS)**
- Catálogo oficial de 100 preguntas (4 componentes / 12 elementos del Apéndice 1 de la circular) con checklist Sí/No, hallazgos con responsable/plazo/estado, y comparativo automático entre evaluaciones sucesivas.
- Cada organización puede ocultar preguntas que no le apliquen y agregar sus propias preguntas personalizadas.

**Acciones Correctivas**
- Tablero consolidado de todas las acciones abiertas provenientes de 3 fuentes: casos SMS/VOR/MOR, planes de acción de Indicadores SPI, y hallazgos de la autoevaluación GAP.

**Barreras de Seguridad**
- Catálogo real de barreras/mitigaciones (categoría, riesgo que mitiga, responsable, estado), enlazable a evaluaciones SORA y seleccionable por el reportante en los formularios públicos VOR/MOR.

**Seguimiento de casos SMS/VOR/MOR**
- Cada reporte SMS o VOR/MOR abre una página de seguimiento con checklist de acciones correctivas, línea de tiempo de eventos reales (creación, cambios de estado, notificación a AeroCivil) y cierre formal del caso.
- Severidad clasificada con el mismo vocabulario RAC 100 (incidente / incidente grave / accidente) tanto para SMS como para VOR/MOR.

**Reportes de Seguimiento de plazos (VOR/MOR)**
- Seguimiento del cumplimiento del plazo regulatorio de radicación en IRIS: 5 días hábiles para MOR (Directiva 02-24), plazo interno sugerido para VOR. Recordatorio automático antes de vencer.

**VOR / MOR (Voluntary / Mandatory Occurrence Reporting)**
- Formularios públicos accesibles desde `/vor/{organización}` y `/mor/{organización}`, personalizables por la organización (campos propios, severidad autoevaluada por el reportante, barrera relacionada).
- El piloto puede enviarlos directamente desde su dashboard con un botón dedicado, y también al cerrar un vuelo con reporte de seguridad marcado.
- Incluye impresión de código QR para colgar en el hangar.

**Protocolos** — biblioteca de procedimientos
- Los checklists operativos fijos (Salud, Inventario, Pre-vuelo por modelo, Briefing, Recibo de Mantenimiento, Mantenimiento Menor) y una biblioteca libre de protocolos/procedimientos (nombre, ícono, pasos) conviven organizados en 4 grupos: **Prevuelo, Reportes, Seguridad Operacional, Mantenimiento**. Los formatos VOR/MOR también se editan desde aquí.

**Auditoría (registro de acciones)**
- Log append-only de acciones relevantes de usuarios (creación de aeronaves, pilotos, autorizaciones de vuelo) con usuario, fecha, módulo y detalle — evidencia para auditorías internas o de Aerocivil.

**Reportes descargables**
Hub "Reportes" con más de 20 formatos agrupados por categoría (Operación, Tripulación, Documentación, Seguridad SMS, Proveedores), todos con logo/versión/fecha/nota de trazabilidad y firmas, incluyendo: Libro de Vuelo, Mantenimiento, Flota, Baterías, Bitácora de Piloto, Expediente de Tripulante, Trazabilidad de Componentes, Indicadores SPI (anual), Autoevaluación GAP, Cronograma y Asistencia de Capacitación SMS, Acciones Correctivas, Listado VOR/MOR, Publicación y Confirmación de Lectura de Manuales, Auditoría de Proveedores, y el **Reporte Operacional Mensual UAS** exigido por Aerocivil (Excel con las 8 columnas oficiales, con rastro de "marcado como enviado" y recordatorio automático los primeros 5 días de cada mes).

**Pólizas RCE y Contactos de Emergencia**
- Registro de pólizas de Responsabilidad Civil Extracontractual con número, vigencia y aseguradora.
- Directorio de contactos de emergencia de la organización.

---

### 5.13 Capacitación

Dos programas de formación independientes, **Operaciones** y **Mantenimiento**, cada uno con:
- **Cronograma con recurrencia** (semanal/quincenal/mensual/personalizado) de sesiones/temas de capacitación.
- **Examen interno calificado** (banco de preguntas de opción múltiple, nota mínima y número de intentos configurables por la organización). El examen de Operaciones **bloquea el despacho** del piloto que no lo aprobó o cuyo plazo venció; el de Mantenimiento es informativo.
- Alertas automáticas por campana y correo antes de que venza el plazo del examen.
- Toda evaluación (interna o vía examen) queda registrada en el expediente digital del tripulante con fecha y resultado Aprobado/No aprobado.

Una tercera pestaña, **Capacitación SMS**, cubre cronograma + asistencia de todo el personal (no solo pilotos) a sesiones de sensibilización SMS, sin examen calificado.

---

### 5.14 Proveedores

Listado de proveedores de la organización (nombre, categoría, NIT, contacto, estado) con un **checklist de auditoría personalizable** (criterios definidos por cada organización). Cada auditoría realizada registra respuesta tri-estado (cumple/no cumple/no aplica) + observaciones por criterio, con % de cumplimiento calculado automáticamente. Reportes descargables por auditoría individual, por proveedor o consolidado de todos los proveedores.

---

### 5.15 Inventario de Operación

Checklist de equipo/insumos requeridos antes de volar (baterías cargadas, botiquín, extintor, chalecos, etc.), diligenciado en el Despacho justo antes del checklist de Pre-vuelo. Incluye un catálogo de **existencias de equipo** (tipo, cantidad, notas) que puede enlazarse opcionalmente a cada ítem del checklist para mostrar cuántas unidades hay disponibles al configurarlo y al diligenciarlo — es solo informativo, nunca descuenta inventario automáticamente por vuelo.

---

### 5.9 Onboarding Express (Plantilla Excel)

Para organizaciones nuevas o en proceso de digitalización, BitaFly ofrece una **plantilla Excel descargable** que permite cargar toda la información inicial en un solo archivo:

- Datos de la organización
- Tripulación (nombre, cédula, email, rol, licencias)
- Flota de drones (serial, modelo)
- Baterías
- Pólizas RCE
- Contactos de emergencia
- Bitácora histórica de vuelos

Al importar el Excel, el sistema:
1. Crea todos los registros automáticamente.
2. **Envía invitaciones por correo** a cada tripulante listado para que cree su cuenta y se una a la organización.
3. Es idempotente: subir el mismo archivo dos veces no genera duplicados.

---

### 5.10 Manuales de la Empresa

Repositorio digital de manuales corporativos con control de versiones y trazabilidad de lectura. Disponible solo para organizaciones (no para el plan Piloto individual).

**¿Qué manuales se pueden gestionar?**
- Manual de Operaciones (MO)
- Manual SMS
- Manual de Mantenimiento
- Manual de Organización
- SOP (Procedimientos Operativos Estándar)
- Otros documentos corporativos

**Funcionalidades**
- Carga de manuales en PDF, Word o Excel (hasta 25 MB por archivo).
- Historial completo de versiones — nunca se borra una versión anterior.
- Al publicar una nueva versión, todos los miembros de la organización reciben una notificación y deben volver a confirmar lectura.
- **Acuse de lectura**: cada miembro confirma que leyó la versión vigente con un clic ("He leído esta versión").
- **Seguimiento de lectura**: el GG, JP y GSMS ven quién ha leído y quién no, con fecha de confirmación.
- **Acta de lectura PDF**: genera automáticamente un acta formal de divulgación con todos los datos del manual, resumen de lecturas y tabla de miembros — evidencia válida para auditorías RAC 100 y SMS.

---

### 5.11 Notificaciones In-App

Sistema de campana de notificaciones en tiempo real en el header del dashboard.

Los usuarios reciben notificaciones automáticas ante los siguientes eventos:

| Evento | Quién recibe |
|---|---|
| Manual cargado o nueva versión publicada | Todos los miembros de la org |
| Vuelo programado / misión creada | JP + GG (para seguimiento) + Piloto asignado (para ejecutar) |
| Alerta de dron al importar logs DJI | JP + GG + GSMS |
| Drone en umbral de mantenimiento | JP + GG |
| Invitación de tripulante aceptada o rechazada | GG + JP |
| Expediente de piloto actualizado | GG + JP + GSMS |
| Anuncio de la organización | Roles seleccionados por quien anuncia |

Los managers (GG, JP, GSMS) pueden enviar **anuncios** a toda la organización o a roles específicos desde la misma campana.

Las notificaciones son en tiempo real (sin necesidad de recargar la página) gracias a la suscripción a cambios en la base de datos.

---

### 5.12 App Android (DJI RC Plus)

BitaFly cuenta con una aplicación Android nativa diseñada para los **controladores DJI RC Plus**, los dispositivos Android que usan los pilotos en campo. La interfaz está optimizada para la pantalla táctil de 7 pulgadas en orientación horizontal.

**Qué se puede hacer desde el RC Plus:**
- Acceder a todas las funciones del dashboard web (bitácora, misiones, clima, etc.)
- Sincronizar logs de vuelo DJI directamente desde el controlador (sin pasar por PC)
- Despachar vuelos
- Consultar condiciones meteorológicas del lugar de operación

**Actualizaciones OTA (Over The Air)**
Cuando hay una nueva versión de la app disponible, el piloto ve un banner en el dashboard con las notas de la versión y un botón "Actualizar". La app se descarga e instala automáticamente sin necesitar Google Play ni conectar el controlador a un PC. El administrador (desde el panel Master) controla qué versión está activa y puede marcar una actualización como **forzada** (el piloto no puede ignorarla).

---

## 6. Programa de Socios

Sistema de alianzas B2B para escuelas de formación UAS y asesores independientes.

### Tipos de socios

| Tipo | Quién es | Qué puede hacer |
|---|---|---|
| **Escuela** | Academia de formación UAS certificada | Regalar períodos de prueba a sus estudiantes, tener asesores a cargo, recibir comisiones |
| **Asesor** | Consultor independiente o empleado de escuela | Vender planes de BitaFly con un código de descuento/referido |

### Beneficios para socios

**Regalos de período de prueba**
- La escuela o asesor puede regalar perfiles gratuitos por un período determinado (configurable, por defecto 90 días) a pilotos nuevos, sin que estos tengan que pagar desde el primer día.
- Cada regalo es único por email — no se puede repetir si ya fue canjeado.
- Si el regalo se anula antes de vencer, el perfil beneficiado vuelve al plan base automáticamente.

**Comisiones recurrentes**
- Cada vez que un cliente adquirido a través de un código de socio renueva su suscripción, el socio recibe una comisión.
- Las comisiones se liquidan manualmente desde el panel de administración Master de BitaFly.
- Cada socio puede tener varios códigos de venta únicos, gestionados/generados desde el panel Master.

### Panel de Socio (`/socio`)
Los socios tienen acceso a un panel dedicado (separado del dashboard operativo) con:
- Estadísticas de referidos activos
- Lista de perfiles gratuitos regalados y su estado
- Reporte de comisiones por período y por asesor
- Gestión de asesores (solo dueños de escuela)
- Subida de logotipo (aparece en los correos branded que se envían a sus clientes)

### Dueños de escuela → Plan Enterprise
El dueño registrado de una escuela socia recibe automáticamente el plan **Enterprise** de forma permanente mientras la escuela esté activa.

---

## 7. Registro y acceso

### Registro de organización nueva
1. El representante legal entra a `https://bitafly.com/registro`.
2. Elige el tipo: **Empresa** (organización con empleados) o **Piloto** (independiente).
3. Ingresa datos de la empresa (NIT, razón social) o datos personales.
4. Selecciona el plan y realiza el pago a través de ePayco.
5. Se crea la organización y puede ingresar inmediatamente al dashboard.

### Registro como empleado de una organización existente
1. El representante legal de la empresa ya registrada invita al empleado desde la sección de Tripulación.
2. El empleado recibe un correo con un enlace de invitación y se registra con sus propios datos.
3. Queda automáticamente vinculado a la organización con el rol asignado.

### Unirse a una organización (sin invitación) — caso especial: piloto independiente se fusiona a una empresa
Un **piloto independiente** (dueño único de su organización unipersonal) puede unirse a una empresa existente si conoce su **NIT**. Desde su perfil de Suscripción ingresa el NIT y el rol con el que desea unirse. Al aceptar, **su historial de vuelos, flota y demás datos se transfieren** a la nueva organización y su organización de origen queda marcada como migrada — este es el único flujo del sistema que sigue siendo destructivo/de fusión de datos, y aplica solo a este caso puntual (piloto independiente que se integra a una empresa).

### Registro a través de código de escuela
Si el usuario recibió un regalo de período de prueba de una escuela socia, llega a la página de registro con su correo pre-llenado y un período gratuito ya activado — sin necesidad de tarjeta de crédito.

### Multi-organización por cuenta

Una misma cuenta puede pertenecer a **varias organizaciones al mismo tiempo** — pensado tanto para tripulantes que trabajan para varias operadoras como para dueños/administradores con varias empresas.

- **Unirse a una organización adicional siempre es aditivo**: aceptar una invitación (o unirse a una segunda organización) **nunca** migra ni mezcla datos de ninguna de las organizaciones involucradas — solo agrega una membresía nueva. La única excepción destructiva es el flujo puntual descrito arriba (piloto independiente que se fusiona a una empresa por NIT).
- **Organización activa**: en cualquier momento la cuenta tiene exactamente una organización "activa" (rol, plan, datos visibles corresponden a esa organización). Un selector — disponible tanto en el nombre de la organización en la parte superior del dashboard como en el menú de cuenta del sidebar — permite cambiar de organización activa con un clic; la vista se recarga reflejando el rol, plan y datos de la organización recién seleccionada.
- El selector solo es visible para cuentas que efectivamente pertenecen a más de una organización — cero cambio para el resto de usuarios.
- **Gestión desde Master**: el equipo de BitaFly puede, desde el panel `/admin/master`, convertir cualquier cuenta en piloto independiente (crea una organización unipersonal nueva para esa cuenta sin tocar sus otras membresías) o eliminar una cuenta por completo (incluye limpiar organizaciones que quedarían sin ningún miembro real).

---

## 8. Correos electrónicos transaccionales

BitaFly envía los siguientes correos automáticos a través de **Resend** (dominio verificado: `bitafly.com`):

| Evento | Destinatario |
|---|---|
| Bienvenida y activación de cuenta | Nuevo usuario |
| Invitación a unirse a una organización | Tripulante invitado |
| Invitación al panel de socio | Nuevo miembro de escuela/asesor |
| Regalo de período de prueba | Beneficiario del regalo |
| Nueva versión de manual publicada | Todos los miembros de la org |
| Notificación de expediente actualizado | GG + JP + GSMS |
| Bienvenida como asesor | Nuevo asesor |

Los correos de socios y escuelas incluyen el **logotipo del socio** junto al logotipo de BitaFly (branding co-branded).

---

## 9. Cumplimiento normativo colombiano

BitaFly está construido alrededor de los requisitos del **RAC 100** (Reglamento Aeronáutico de Colombia — Parte 100: Sistemas de Aeronaves Pilotadas de Forma Remota), vigente y administrado por la UAEAC (Aerocivil).

### Qué cubre de RAC 100

| Requisito RAC 100 | Cómo lo cubre BitaFly |
|---|---|
| Bitácora de vuelo | Registro automático de cada vuelo con todos los campos requeridos |
| Orden de trabajo / misión autorizada | Módulo de Programación de Misiones con exportación KMZ y PDF |
| Apéndice 13 (formulario Aerocivil) | Formulario nativo en el módulo de programación |
| Expediente del piloto (licencias, documentos vigentes) | Módulo de Tripulación con carga de documentos y alertas de vencimiento |
| Manual de Operaciones vigente | Módulo de Manuales con versiones, acuse de lectura y actas PDF |
| Reportes de ocurrencias (VOR/MOR) | Formularios dedicados accesibles por todos los pilotos |
| Evaluación SORA | Módulo SORA integrado |
| SMS (Safety Management System) | Módulo SMS con reportes de seguridad |
| Seguro RCE vigente | Registro de pólizas con número y fecha de vencimiento |

---

## 10. Arquitectura general (resumen no técnico)

| Componente | Descripción |
|---|---|
| **Plataforma web** | Aplicación Next.js 14 desplegada en Vercel. Accesible desde cualquier navegador moderno. |
| **App Android** | App Capacitor para DJI RC Plus. Carga la plataforma web en modo nativo. |
| **Base de datos** | PostgreSQL gestionada en Supabase. Multi-tenant: cada organización ve solo sus propios datos. |
| **Autenticación** | Supabase Auth (email + contraseña, con recuperación de contraseña). |
| **Pagos** | ePayco — suscripciones recurrentes en COP (pesos colombianos). |
| **Correos** | Resend — transaccionales, con branding BitaFly y co-branding de socios. |
| **Mapas** | Mapbox / Leaflet — para planeación de zonas y replay de vuelo. |
| **Procesamiento de logs DJI** | Librería DJI Log Parser (WASM, procesamiento en servidor). |
| **Meteorología** | Open-Meteo (modelos globales) + NOAA Space Weather (Kp geomagnético). |
| **Almacenamiento de archivos** | Supabase Storage. Documentos sensibles en bucket privado; fotos de flota y logos en bucket público. |

---

## 11. Glosario

| Término | Definición |
|---|---|
| **RAC 100** | Reglamento Aeronáutico de Colombia Parte 100 — norma que regula las operaciones con drones (RPAS). |
| **UAEAC / Aerocivil** | Unidad Administrativa Especial de Aeronáutica Civil de Colombia — entidad reguladora. |
| **UAS** | Unmanned Aircraft System — sistema de aeronave no tripulada (drone + controlador + software). |
| **RPAS** | Remotely Piloted Aircraft System — sinónimo de UAS en la terminología RAC. |
| **PIC** | Pilot in Command — piloto en comando; responsable legal del vuelo. |
| **SORA** | Specific Operations Risk Assessment — metodología de evaluación de riesgo para operaciones en categoría específica. |
| **SMS** | Safety Management System — sistema de gestión de seguridad operacional. |
| **VOR** | Voluntary Occurrence Report — reporte voluntario de ocurrencia. |
| **MOR** | Mandatory Occurrence Report — reporte obligatorio de ocurrencia. |
| **RCE** | Responsabilidad Civil Extracontractual — seguro obligatorio para operadores de drones. |
| **CIPU** | Certificado de Inscripción en el Programa UAS — licencia de piloto de drones en Colombia. |
| **KMZ** | Formato de archivo geoespacial compatible con Google Earth y sistemas de navegación DJI. |
| **Apéndice 13** | Formulario oficial de la Aerocivil para solicitud de autorización de operaciones especiales. |
| **RC Plus** | Controlador DJI RC Plus — tablet Android de 7 pulgadas usada para pilotar drones DJI de alta gama. |
| **Despacho** | Acto formal de registrar el inicio de un vuelo, vinculándolo a una orden de trabajo autorizada. |
| **GG** | Gerente General — rol admin de la organización en BitaFly. |
| **JP** | Jefe de Pilotos — rol operativo de supervisión en BitaFly. |
| **GSMS** | Gerente SMS — rol de gestión de seguridad en BitaFly. |
| **OTA** | Over The Air — actualización de software distribuida de forma inalámbrica, sin necesidad de instalar desde PC. |
| **ePayco** | Pasarela de pagos colombiana para tarjetas crédito/débito y PSE. |
| **Resend** | Servicio de envío de correos transaccionales usado por BitaFly. |

---

## 12. Preguntas frecuentes (FAQ base)

**¿BitaFly reemplaza el papel completamente?**  
Sí, en la práctica operativa. La plataforma genera todos los documentos requeridos por la Aerocivil en formato digital (PDF, KMZ). Los documentos generados tienen valor como evidencia en auditorías RAC 100/SMS.

**¿Se necesita internet para volar con BitaFly?**  
El dashboard requiere conexión a internet. Para el uso en campo con el DJI RC Plus, el controlador debe tener conectividad (WiFi o datos móviles) para sincronizar datos.

**¿Qué pasa si cancelo mi suscripción?**  
Los datos se conservan. El plan vuelve al nivel base (Piloto). Funcionalidades avanzadas quedan deshabilitadas pero no se eliminan datos históricos.

**¿Cuántos usuarios puede tener una organización?**  
Depende del plan. El plan Piloto es para 1 usuario. Escuadrilla hasta 4 pilotos operativos (más GG y GSMS sin contar contra el límite). Flota hasta 15. Enterprise sin límite.

**¿Los datos de vuelo quedan en Colombia?**  
La base de datos está alojada en Supabase (us-east-1, AWS). El deploy web está en Vercel (CDN global). BitaFly cumple con las políticas de privacidad y seguridad de datos aplicables.

**¿Puedo importar mis datos históricos?**  
Sí, a través de la plantilla Excel de onboarding que acepta registros históricos de bitácora.

**¿BitaFly funciona en iOS?**  
El dashboard web funciona en Safari iOS. La app nativa es solo para Android (DJI RC Plus).

**¿Qué drones son compatibles para la importación automática de logs?**  
Todos los drones DJI que generan archivos de log `.txt` en formato estándar DJI (Mavic, Air, Mini, Matrice, Avata, Inspire). La importación requiere acceso a los archivos de log del controlador o del drone.
