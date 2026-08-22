# Seguridad

[← Índice maestro](00-INDICE.md) · [Reglas](01-reglas.md)

> Migrado desde `../plan-bitafly-v2.md` el 2026-08-22 al partir ese documento por la regla de 500 líneas (D1).

---

## 10. Seguridad

El C2 abre la primera superficie de **tiempo real, dispositivos y video** de BitaFly. Es
categóricamente distinta de todo lo anterior.

### 10.1 Autenticación de dispositivos (no de usuarios)

Un dron o dock se autentica con credenciales de máquina, no con una sesión de Supabase Auth.
Tokens por dispositivo, de vida corta, rotables y revocables, emitidos por `c2-gateway` tras
verificar la vinculación en `c2_devices`.

### 10.2 Aislamiento multi-tenant en MQTT

El error clásico: un broker MQTT con topics globales donde cualquier cliente se suscribe a
`#`. Regla: topics con espacio de nombres obligatorio `org/{orgId}/aircraft/{sn}/...` y **ACL por
token** que impide publicar o suscribirse fuera del propio `orgId`. Se prueba explícitamente con
un test de intento de cruce entre organizaciones.

### 10.3 Video

- URLs de reproducción **firmadas y de vida corta**, nunca públicas.
- Claves de publicación por sesión, rotadas al cerrar.
- **El video de una operación puede contener a terceros identificables** → aplica Ley 1581 de
  2012 y el Decreto 1377 de 2013. La Política de Privacidad actual **no contempla video en
  vivo ni su almacenamiento**: hay que actualizarla antes de lanzar, no después. Incluye
  definir retención, finalidad, y quién dentro de la organización puede verlo.

### 10.4 RLS y el camino caliente

`c2_telemetry` recibe miles de escrituras por sesión. Pasarlas por RLS por fila es un problema de
rendimiento. Patrón propuesto (consistente con lo que el proyecto ya hace en
`lib/notify.js` y los crons): `c2-gateway` escribe con **service role** y filtra por organización
**en la aplicación**, mientras que la lectura desde el navegador pasa siempre por RLS o por un
WebSocket autenticado que valida la pertenencia antes de emitir. Las tablas de baja cardinalidad
(`c2_sessions`, `c2_events`, `c2_devices`) sí llevan RLS normal.

### 10.5 Credenciales de la Plataforma UAS Colombia (si se aprueba F4b)

Custodiar credenciales de un tercero ante una autoridad estatal es el riesgo más alto de todo el
plan. Condiciones mínimas: cifrado con clave gestionada fuera de la base, consentimiento
explícito registrado, cada uso auditado en `audit_log`, revocación inmediata por el usuario, y
**modo asistido con confirmación humana** antes de cualquier envío.

### 10.6 Deuda de seguridad conocida a resolver en v2

De la auditoría del 2026-07-14, dos puntos siguen abiertos y este es el momento natural para
cerrarlos, porque implican cambios mayores que ya no hay que hacer dos veces:
- `next` 14.2.x → 15.x (DoS pendientes).
- `jspdf` 2.x → 5.x (ReDoS; exige reprobar los ~14 generadores de PDF).

Además: habilitar `auth_leaked_password_protection` en Supabase (pendiente desde hace meses,
es un interruptor) y evaluar hacer el repositorio privado — hoy es público y expone la
arquitectura de seguridad interna descrita en `CLAUDE.md`.

---
