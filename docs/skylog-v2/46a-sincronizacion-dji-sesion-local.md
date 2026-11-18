# Sincronización DJI (RC 2): guía y mensaje para correr en una sesión local

> Complemento de [`46-sincronizacion-nube-dji.md`](46-sincronizacion-nube-dji.md) (2026-11-18). **No se toca ni se publica código** con esta guía: son pruebas de
> factibilidad y trámites. Todo lo de §3 está **sin comprobar contra DJI** (la sesión en la nube no tiene red hacia DJI); §2 es lo único que se verificó, y solo por búsqueda web.

## 1. Mensaje para pegar en la sesión local (copiar desde la línea siguiente hasta «FIN DEL MENSAJE»)

```
Contexto: trabajo en BitaFly (SaaS de operaciones con drones, Colombia). Los modelos con control DJI RC 2 (p. ej. Mini 5 Pro) no admiten apps de terceros ni tienen SDK,
así que no hay datos de vuelo en vivo; hoy el piloto sube el log (.txt de DJI Fly) a mano. Queremos evaluar si es viable traer los logs automáticamente desde la nube
de DJI, como hace Airdata, y probar además la transmisión de video en vivo de DJI Fly. Lee docs/skylog-v2/46-sincronizacion-nube-dji.md y
docs/skylog-v2/46a-sincronizacion-dji-sesion-local.md (§2 verificado, §3 pruebas). Haz SOLO las pruebas de §3 y entrega el informe de §4.

Reglas obligatorias:
1. NO modifiques, comitees ni publiques nada del repositorio. Trabaja en una carpeta temporal fuera del repo; si necesitas el lector de logs, copia
   src/lib/djiParser.js allí (solo lectura).
2. Usa ÚNICAMENTE la cuenta DJI de prueba que yo te indique (creada solo para esto). Nunca la cuenta personal de nadie. Nunca guardes contraseñas ni tokens en archivos,
   en el historial de comandos ni en el informe: en el informe pon [REDACTADO]. Pídeme los secretos por el canal seguro, no en el chat.
3. Si DJI pide captcha, verificación en dos pasos que no puedas resolver con la cuenta de prueba, o muestra señales de bloqueo/limitación: DETENTE y repórtalo. No intentes
   eludir ninguna verificación ni límite de DJI. Tráfico mínimo: una petición por paso, sin bucles ni automatización masiva.
4. Antes de analizar el tráfico de la cuenta, pregúntame si ya se envió la consulta oficial a DJI (§3.A) y si decido continuar sin respuesta. Sin mi "sí" explícito,
   haz solo las pruebas de video (§3.C) y de lectura de logs (§3.D).
5. No inventes endpoints, campos ni resultados: si no lo pudiste comprobar, escribe "no comprobado".
```
FIN DEL MENSAJE

## 2. Lo verificado (búsqueda web 2026-11-18; fuentes de terceros salvo indicación; ninguna prueba propia)

| Hecho | Confianza | Fuente |
|---|---|---|
| El RC 2 estándar no admite instalar apps de terceros | Media (2025) | [Heliguy](https://www.heliguy.com/blogs/knowledge-base/does-the-dji-rc-2-support-installing-third-party-apps/) |
| DJI no ha publicado soporte del SDK móvil para el RC 2; el SDK del Mini 4 Pro funciona con el RC-N2; del Mini 5 Pro no se encontró entrada | Media | [DroneDJ](https://dronedj.com/2025/03/21/dji-mini-4-pro-msdk/), [notas SDK](https://developer.dji.com/doc/mobile-sdk-tutorial/en) |
| El SDK móvil V5 es solo Android y no trae pantalla de transmisión | Media | [foro DJI SDK](https://sdk-forum.dji.net/hc/en-us/articles/25552010279961) |
| DJI Fly transmite por RTMP; el RC 2 y RC Pro 2 hasta 720p; desde DJI Fly 1.16 piden micrófono conectado; el DJI RC básico no transmite | Baja-media (guías de terceros, 2 coinciden en 720p) | [Upstream](https://upstream.so/integrations/dji/), [Droneblog](https://www.droneblog.com/?p=1066484) |
| Airdata transmite **capturando la pantalla** del celular/tablet con cualquier app; en 2021 el GPS no aparecía en la transmisión; es un complemento del plan Enterprise | Media | [Airdata](https://airdata.com/blog/2021/live-streaming-with-any-flight-app) |
| Airdata no tiene app para el RC 2; con RC 2 los logs llegan por la nube de DJI o copiando archivos; hay reportes de fallas de sincronización con RC 2 + Mini 4 Pro | Media | [Airdata DJI Smart Controller](https://b.airdata.com/wiki/Help/DJI+Smart+Controller), [grupo Airdata](https://groups.google.com/g/airdata/c/yIotFdowxY8) |
| Airdata (y otros) piden las credenciales DJI del piloto; DroneDesk dice usarlas una sola vez para obtener un token | Baja (declaraciones de terceros) | [Airdata uploads](https://app.airdata.com/wiki/Help/AirData+Uploads+Overview), [DroneDesk](https://help.dronedesk.io/en/articles/86-how-to-sync-you-dji-flight-logs) |
| **No se encontró** inicio de sesión oficial de DJI (OAuth) ni API pública para leer registros de vuelo de consumo | Media (ausencia de evidencia) | búsquedas en developer.dji.com |
| La política de DJI de «flight record» limita el uso de su API a fines autorizados por escrito y permite revocar llaves | Media | [DJI policy](https://developer.dji.com/policies/flight_record) |
| DJI desactivó la sincronización de registros para EE. UU. (2024); Airdata indicó que fuera de EE. UU. seguía funcionando (dato de 2024) | Media, **puede haber cambiado** | [DJI](https://viewpoints.dji.com/blog/dji-to-disable-flight-record-sync-in-the-us), [Airdata](https://airdata.com/blog/2024/dji-to-disable-flight-record-sync-in-the-us-what-this-means-for-airdata-customers) |
| Para telemetría en vivo + video oficial con Matrice 4: Cloud API con RC Plus 2 + Pilot 2 (ya diseñada en `42-comando-control.md`) | Media | [Cloud API](https://developer.dji.com/doc/cloud-api-tutorial/en/feature-set/pilot-feature-set/pilot-livestream.html) |

**Del repositorio (comprobado leyendo el código):** el lector `src/lib/djiParser.js` ya lee logs de DJI Fly (con llave de DJI solo para versión ≥ 13), y la Bitácora
los confirma uno por uno con firma `importToken`; la subida manual funciona hoy.

## 3. Pruebas a realizar (en orden)

### A. Consulta oficial a DJI (no requiere código; se hace primero y en paralelo)
Enviar por el canal de soporte para desarrolladores de DJI (confirmar el correo/formulario vigente en developer.dji.com; una búsqueda lo mencionó pero no se verificó):

> Asunto: Autorización de lectura de registros de vuelo de usuarios (DJI Fly) para una plataforma de bitácora operacional — Colombia
> Somos BitaFly, plataforma de operaciones con drones para operadores certificados por la Aerocivil (RAC 100/219). Nuestros pilotos vuelan Mini 5 Pro / Mini 4 Pro con DJI RC 2,
> que no admite apps de terceros. Queremos importar sus registros de vuelo a la bitácora **con su autorización**. ¿Existe un flujo oficial de autorización del usuario
> (OAuth u otro) o una API para acceder a los registros de vuelo sincronizados en la nube de DJI? Si no, ¿qué alternativa recomiendan (p. ej. SDK, Cloud API, exportación)?
> ¿Aplican restricciones por región (Colombia) y qué condiciones de uso debemos cumplir? Podemos compartir el caso de uso y la política de tratamiento de datos.

Registrar fecha de envío, número de caso y respuesta. **Si hay vía oficial, se usa esa y §3.B no se hace.**

### B. Factibilidad de la nube de DJI con cuenta de prueba (solo con aprobación explícita del dueño y sin respuesta oficial, ver regla 4)
Requisitos: cuenta DJI **solo de prueba** con verificación en dos pasos como la tendrían los pilotos; control RC 2 con el Mini 5 Pro, conectado a internet, con la cuenta de prueba
iniciada en DJI Fly y la subida de registros a la nube activada; **un vuelo corto real** hecho con esa cuenta. Preguntas a responder, sin automatizar nada masivo:
1. ¿El vuelo aparece en la nube de DJI de esa cuenta (Colombia)? ¿En qué servidor/región? (No comprobado.)
2. ¿Cómo autentica la cuenta (usuario/clave → token)? ¿Vida del token, renovación, qué pasa con la verificación en dos pasos y si exige captcha? (No comprobado.)
3. ¿Se pueden listar los vuelos y bajar el log en el mismo formato que lee `djiParser.js`? ¿Llega completo (versión del log, cifrado)? (No comprobado.)
4. ¿Cambiar la clave de DJI invalida el token? ¿Cómo se revoca? (No comprobado.)
5. ¿Hay límites de frecuencia o señales de bloqueo? Detenerse ante cualquiera.

### C. Video en vivo con RC 2 (no usa la nube; no requiere cuenta de DJI)
Montar un receptor RTMP **local** en el computador (p. ej. MediaMTX o un servidor RTMP equivalente, en una carpeta temporal) y verlo con VLC; RC 2 y computador en la misma red Wi-Fi.
En DJI Fly: vista de cámara → menú → transmisión en vivo → RTMP → `rtmp://IP-del-computador:1935/live/prueba`. Anotar:
- ¿Transmite? ¿Pide micrófono? ¿Qué resolución y fps? ¿Latencia aproximada (cronómetro frente a la cámara)?
- ¿La imagen trae los datos de pantalla (altura, batería) o va limpia? ¿Cuánto tarda en reconectar si se corta la red?
- Repetir por hotspot de celular (datos móviles) para estimar el consumo por hora.

### D. Lectura de logs y ruta del archivo en el RC 2
Conectar el RC 2 por USB-C al computador y ubicar la carpeta de registros de DJI Fly (**la ruta exacta no está verificada**; documentarla). Copiar un log a la carpeta temporal y
leerlo con una copia de `djiParser.js` (sin tocar el repo): confirmar versión del log, si requiere llave de DJI y qué campos salen (despegue, aterrizaje, duración, batería, replay).
Resultado: guía de 5 pasos para el piloto «cómo sacar el log del RC 2» (sirve de respaldo siempre).

## 4. Informe a devolver (pegarlo en el chat de desarrollo)
1. Consulta a DJI: fecha, caso, respuesta literal.
2. Por cada prueba (B, C, D): qué se hizo, resultado, **comprobado / no comprobado**, y capturas o notas sin secretos.
3. Datos de C en tabla: resolución, fps, latencia, micrófono, datos en pantalla, reconexión, consumo de datos por hora.
4. Ruta del log en el RC 2 y versión del log leído.
5. Veredicto GO / NO-GO con la razón.

**GO** solo si: (a) hay vía oficial o el dueño aceptó por escrito el riesgo de términos, (b) la autenticación entrega un token revocable (no hay que guardar la clave),
(c) se pueden listar y bajar logs de una cuenta de Colombia, (d) `djiParser.js` los lee, y (e) no hubo señales de bloqueo. **NO-GO** en cualquier otro caso: se mantiene la
subida manual con la guía de §3.D, y el video en vivo (§3.C) sigue como servicio aparte.

## 5. Cómo lo logramos (ruta completa)
1. **Ya:** esta guía y el texto de consentimiento (`46` §3). 2. **Dueño:** crear la cuenta DJI de prueba, enviar la consulta §3.A, decidir si se avanza sin respuesta oficial.
3. **Sesión local:** pruebas §3.B–D e informe §4. 4. **Si GO:** asesoría jurídica sobre términos de DJI y autorización de datos personales (Ley 1581 de 2012); luego fases S1–S3 de `46` §6
(tabla `dji_account_links` cifrada, pantalla de consentimiento, sincronización con confirmación por vuelo) — **ahí sí habrá código**, con decisión del dueño. 5. **Si NO-GO:** guía de
subida manual dentro de BitaFly + transmisión de video por RTMP si la prueba §3.C resulta bien; datos en vivo solo para Matrice 4 con RC Plus 2 (Cloud API).
