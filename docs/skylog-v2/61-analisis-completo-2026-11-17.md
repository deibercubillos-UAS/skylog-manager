# Análisis completo de la aplicación — 2026-11-17 (con estado al 2026-11-19)

> Pedido del dueño: *«haz un análisis completo de toda la aplicación y dime qué ves, qué falencias de funcionamiento y seguridad tenemos, qué tenemos a medias y qué debemos mejorar»*.
> El diagnóstico se entregó por chat el 2026-11-17 y **no se había guardado como documento**; este archivo lo deja por escrito con el estado de cada hallazgo.
> Basado en lectura del código y en lo reportado por el dueño; no se probó contra producción. Las decisiones están en `51-bitacora.md` (números entre paréntesis).

## 1. Fallas de funcionamiento
| # | Hallazgo | Estado | Decisión |
|---|---|---|---|
| F1 | Los vuelos cargados por Bitácora (log o a mano) se guardaban 5 h antes (la hora de Colombia sin zona se tomaba como UTC). | **Corregido**; el único vuelo afectado en producción se reparó por SQL. | 220 |
| F2 | Un vuelo mal cargado no se podía editar ni anular. | **Hecho**: editar, anular, cambiar el piloto, con motivo y registro; avisos de §100.540 al editar. | 221, 227 |
| F3 | Los reportes (libro de vuelo, Libro de UAS, informe mensual SMS) se cortaban en 1.000 filas sin avisar. | **Corregido** con lectura por páginas. | 222 |
| F4 | La Bitácora mostraba solo los últimos 200 vuelos y sus tarjetas se calculaban con ellos. | **Corregido**: «Cargar más» y totales reales. | 222 |
| F5 | Un despacho abierto de un piloto retirado quedaba abierto para siempre (la API decía «pide a un gestor» sin que existiera cómo). | **Hecho**: cierre por gestor con vuelo o sin vuelo. | 226 |

## 2. Seguridad
| # | Hallazgo | Estado | Decisión |
|---|---|---|---|
| S1 | CI en rojo hacía días (`npm audit`: dompurify crítico). | **Corregido**, 0 vulnerabilidades; Next en 15.5.28. | 220 |
| S2 | 272 respuestas con `error.message` de la base en 133 rutas (filtraba tablas, columnas y políticas). | **Corregido** en 188 + 8 sitios con `dbError`; quedan a propósito los mensajes de validación propios, los cron y dos archivos internos. | 223 |
| S3 | Limitador de peticiones en memoria (por instancia; no frena de forma global). | **Hecho (2026-11-19).** Almacén compartido en Postgres (tabla `rate_limits` + función atómica `check_rate_limit`, migración `v2_rate_limits_shared`); `lib/rateLimiter.js` ahora es async con fallback en memoria si la base falla. Cron diario de poda (`/api/cron/prune-rate-limits`). Probado: atómico bajo concurrencia. | — |
| S4 | Sin monitoreo de errores externo; registros de Vercel Hobby duran 1 hora. | **Decidido por el dueño: no usar Sentry.** Queda el riesgo de perder rastro de errores nocturnos. | — |
| S5 | Pendientes del dueño: activar la inscripción de segundo factor (TOTP) en Supabase; confirmar `BACKUP_ENCRYPTION_KEY`; borrar `ADMIN_SECRET` de Vercel; aplicar migraciones `20261118120000` y `20261118130000`. | **Migraciones hechas (2026-11-19):** su esquema ya estaba en producción (se había aplicado **a mano en la consola**, contra la regla de `CLAUDE.md`), así que las features F2/F5 nunca estuvieron rotas; se registraron en el ledger para reconciliar repo↔prod (SQL idempotente, sin tocar datos). **Siguen abiertos (consola, del dueño):** TOTP en Supabase, confirmar `BACKUP_ENCRYPTION_KEY`, borrar `ADMIN_SECRET`. | — |
| S6 | Vercel en plan Hobby (cuerpo 4,5 MB, cron diario, 1 h de registros). | **Nota**; sube de plan cuando el dueño decida. | — |

## 3. Lo que estaba a medias
| Tema | Estado |
|---|---|
| Importación por «Compartir» (ACTION_SEND) | **Hecho (2026-11-19, en producción + APK).** El piloto envía los `.txt` de FlightRecord desde DJI Fly / el gestor de archivos → «Compartir» → BitaFly, y confirma cada vuelo en la Bitácora (mismo análisis que la carga manual, sin credenciales de DJI ni acceso a carpetas). Es el método vigente de Airdata. Plugin `FlightFiles.getSharedFlightFiles` + `src/lib/flightShare.js` + intent-filters del manifiesto. |
| Sincronización automática en segundo plano | **Parqueada.** El worker (`FlightSyncWorker`) apuntaba a `/api/logbook/import-dji` (ruta v1 inexistente) con el campo `file`; se corrigió a `/api/flights/import-dji` + `files`, pero se dejó en early-return porque esa ruta **solo parsea, no inserta** (notificar «sincronizado» sería falso) y además nadie llama `enableBackgroundSync`. Reactivarla exige un endpoint de auto-guardado y decidir confirmar-cada-uno vs guardar-directo. Plan de la nube de DJI (descartado por términos/seguridad): `46-…`, `46a-…`. |
| Importación por carpeta (SAF, app nativa Android) | **Hecho + validado en emulador (2026-11-21).** El plugin `FlightFiles` ya exponía elegir carpeta (SAF)/listar/leer `.txt` pero sin consumidor JS (el `flightImportBridge.js` que decía usar no existía); se creó ese puente y se cableó en la Bitácora (`FolderImportCard`): el piloto elige una vez la carpeta FlightRecord, BitaFly lista los logs y sube en lote los marcados al mismo `import-dji` + confirmación §100.540. Sirve sobre todo a DJI Pilot 2 (Matrice, almacenamiento público); reutiliza el descifrado ya vivo en prod. No reactiva el auto-sync. **Probado en emulador** (AVD API 37, headless, vía CDP con un log real): `pickFlightFolder` persiste el tree URI `content://…/DJI/dji.go.v5/FlightRecord`, `listFlightFiles` lista por DocumentFile (rutas `content://`) y `readFlightFile` devuelve los 26.581 bytes exactos. Falta solo la cadena final con sesión (login + `import-dji`), que reusa piezas ya vivas en prod. |
| Modelo de aeronave en logs nuevos | **Hecho (2026-11-21).** El Mini 5 Pro reporta `productType` numérico (139) que la librería no mapea → `modelo_aeronave` quedaba null; ahora cae a `aircraftName` del propio log. Verificado con un log real v14. |
| Importación de logs desde RC 2 | Guía de 4 pasos por USB agregada a la pantalla (234); falta confirmar la ruta con un control real. |
| Replay del vuelo | Rehecho con satélites, señal, palancas, clima, alertas y zoom (230–233); falta validarlo con un log real. |
| Centro de Control | Sin terminar. |
| Simulador 3D de capacitación | Fase 0 hecha (`45-…`); faltan pruebas en 3 dispositivos y sesión con el jefe de pilotos. |
| Flujo RAC 114 | Sin terminar. |
| Segundo factor para todos los usuarios | Sin terminar (hoy solo superadmin). |
| Recorrido de bienvenida por perfil | Sin terminar. |
| Tope de 4 MB por log DJI | Límite vigente (`DJI_IMPORT_LIMITS`); logs más grandes se rechazan. |
| `CLAUDE.md` desactualizado | **Corregido** (guía actualizada con convenciones y pendientes). |

## 4. Hallazgos posteriores (2026-11-18/19)
- **DJI respondió por escrito:** no hay vía oficial para que un tercero lea los registros de DJI Fly en la nube (sin OAuth, sin API pública, sin programa de socios); solo el dueño los ve en la app. Airdata usa credenciales DJI, pero DJI está **cerrando** ese sync por nube (EE. UU. desde jun-2024). Por eso se descartó pedir/guardar credenciales de DJI y se construyó la vía por «Compartir». Para el RC 2 la única ruta es USB o «Compartir»; es el límite real, igual que Airdata.
- El inicio de sesión con Google no funciona dentro de la app de Android (WebView): se ocultó ahí (229).
- El RC 2 no admite apps de terceros ni tiene SDK de DJI: no hay datos en vivo; video solo por RTMP de DJI Fly (hasta 720p). Ver `46-…` §7 y la decisión 224.
- Esri no tiene imagen satelital a todos los niveles de zoom en todas las zonas: el replay ajusta el nivel y lo avisa (233).

## 5. Orden de trabajo que se recomendó y cómo va
1. ✅ Hora de los vuelos + reparar datos (F1). 2. ✅ CI en verde (S1). 3. ✅ Editar y anular vuelos (F2). 4. ✅ Paginar reportes y Bitácora (F3, F4).
5. ✅ No mostrar errores técnicos (S2). 6. ⛔ Monitoreo de errores (descartado por el dueño). 7. ✅ Despacho huérfano (F5). 8. ✅ Actualizar `CLAUDE.md`.
9. ✅ Importación de logs por «Compartir» (§3, 2026-11-19).
10. ✅ Limitador de peticiones compartido (S3, 2026-11-19): almacén en Postgres + cron de poda; migración aplicada en prod.
11. ✅ Reconciliadas en el ledger las migraciones S5 `v2_flights_void_edit` y `v2_dispatch_manager_close` (su esquema ya estaba en prod por aplicación manual).
12. ✅ Segundo factor (TOTP) para todos los roles, opt-in (2026-11-19). 13. ✅ Importación por carpeta (SAF) en la app nativa + fix de modelo en logs nuevos, **validada en emulador** (§3, 2026-11-21).
Siguiente candidato: cadena final de importación por carpeta con sesión real (login + `import-dji` + descifrado) en un dispositivo/APK; reactivar el auto-sync en segundo plano (§3) sigue aparcado por decisión del dueño (solo asistido).
Pendientes del dueño en consola (S5): activar TOTP en Supabase, confirmar `BACKUP_ENCRYPTION_KEY`, borrar `ADMIN_SECRET` de Vercel.
