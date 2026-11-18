# Sincronización de vuelos desde la nube de DJI (controles RC 2)

> Estado: **plan, sin código** (2026-11-18). Decisión del dueño: obtener los datos de vuelo de los modelos que usan RC 2 «por la nube de DJI», como Airdata,
> **informando los riesgos al piloto antes de pedirle la contraseña**. Aquí quedan lo investigado, el diseño seguro, el texto de consentimiento y lo que falta.

## 1. Por qué existe
El RC 2 no admite apps de terceros ni tiene soporte del SDK de DJI (ver conversación de 2026-11-18): no hay datos en vivo. Los datos de vuelo salen **después**,
del log que DJI Fly guarda en el control. Hoy el piloto debe sacar el archivo y subirlo a mano (`/operacion/bitacora` → Importar). La nube de DJI evitaría ese paso.

## 2. Qué se encontró (búsqueda web, fuentes de terceros; nada probado)
- **Airdata** pide las credenciales DJI del piloto y trae los vuelos desde los servidores de DJI. Los vuelos deben haberse subido antes a la nube de DJI desde DJI Fly
  (opt-in del piloto). Revisa vuelos nuevos al primer ingreso del día o semanalmente.
- **DroneDesk** dice usar las credenciales DJI **una sola vez** para obtener un token de acceso; es el modelo a copiar.
- **No hay inicio de sesión oficial de DJI («Login with DJI»/OAuth) ni API pública de DJI para leer registros de vuelo de consumo.** Lo más cercano son las
  interfaces de parseo del SDK y la Cloud API (otro producto, para Pilot 2/Dock). La política de DJI de «flight record» limita el uso de su API a fines autorizados
  por escrito y DJI puede revocar llaves en cualquier momento.
- **DJI desactivó la sincronización en EE. UU.** (2024); Airdata indicó que fuera de EE. UU. seguía funcionando. Puede haber cambiado: **hay que comprobarlo en Colombia**.
- Los usuarios en foros desconfían de dar la contraseña DJI a terceros; en Airdata hay reportes de fallas de sincronización con RC 2 + Mini 4 Pro durante meses.

## 3. Riesgos que se le informan al piloto (texto de consentimiento)
Se muestra **antes** de pedir nada y exige marcar la casilla «Entiendo y autorizo». Texto propuesto:

> **Conectar tu cuenta DJI con BitaFly**
> Para traer tus vuelos automáticamente necesitamos entrar a tu cuenta DJI. Antes de continuar, ten claro:
> 1. **Compartes el acceso a tu cuenta DJI.** Tu contraseña viaja cifrada a nuestro servidor **una sola vez**, solo para obtener una llave de acceso. **No guardamos tu
>    contraseña.** Guardamos únicamente esa llave, cifrada, y solo se usa para leer tus registros de vuelo.
> 2. **DJI no ofrece una autorización oficial para esto.** BitaFly no es un producto de DJI ni está avalado por DJI. DJI puede cambiar o bloquear este acceso en
>    cualquier momento, y no podemos garantizar que no te pida verificar tu cuenta o te la limite. Si pasa, podrás seguir subiendo tus logs a mano.
> 3. **Se leen datos personales:** fecha, hora, lugar (GPS) y aeronave de tus vuelos. Los usamos solo para tu bitácora y los de tu organización, según nuestra política de
>    tratamiento de datos.
> 4. **Recomendamos** una contraseña de DJI exclusiva y verificación en dos pasos activada. Si tu cuenta la tiene, te pediremos el código.
> 5. **Puedes desconectar cuando quieras** desde tu perfil: borramos la llave de inmediato. Cambiar tu contraseña en DJI también corta el acceso.
> 6. Cada vuelo importado te lo mostramos para que **lo revises y lo confirmes**; nada se guarda en tu bitácora sin tu confirmación.
> [ ] Entiendo estos riesgos y autorizo a BitaFly a acceder a mis registros de vuelo en DJI.

(Revisar el texto con asesoría jurídica: autorización de tratamiento de datos personales —Ley 1581 de 2012— y términos de uso de DJI.)

## 4. Diseño seguro
- **Contraseña**: se recibe por HTTPS en una ruta propia, vive solo en memoria durante el intercambio, **nunca** se guarda, registra ni audita (ni en `console`, ni en `audit_log`).
- **Llave de acceso (token)**: tabla nueva `dji_account_links` (por persona; `person_id`, `region`, `token_cipher`, `status`, `created_at`, `last_sync_at`, `revoked_at`),
  RLS solo servidor (como las tablas de identidad), cifrada con AES-256-GCM y una variable nueva `DJI_LINK_ENCRYPTION_KEY` (distinta de las demás).
- **Desconectar** borra la llave y deja el evento en el registro de acciones. Si DJI responde que la llave venció, el vínculo pasa a `error` y se avisa al piloto.
- **Sincronizar**: botón «Sincronizar ahora» y revisión periódica (en Vercel Hobby los cron son como mucho diarios). Los logs se leen con el **mismo lector** de
  `src/lib/djiParser.js` y entran como filas pendientes de confirmar en Bitácora (flujo actual, con firma `importToken`); se evita duplicar por piloto + despegue.
- **Límites**: `checkRateLimit()` en las rutas, un vínculo por persona, tope de vuelos por sincronización, sin guardar el archivo original más allá de lo que ya hace la importación.
- **Si DJI pide verificación (código/captcha)**: se informa al piloto y se ofrece el camino manual; no se intenta eludir ninguna verificación de DJI.

## 5. Lo que falta para poder construirlo (bloqueos)
1. **Comprobar que funciona** para cuentas de Colombia y qué pide DJI (token, verificación en dos pasos). Esta sesión no tiene acceso a internet hacia DJI y no se
   inventan endpoints: hace falta una **prueba de factibilidad** en un entorno con red, con una **cuenta DJI de prueba exclusiva** (nunca la personal de nadie).
2. **Consultar a DJI** (soporte para desarrolladores) si existe una autorización oficial; sería la vía sin riesgo de términos.
3. **Revisión de términos de DJI y de la autorización de datos** por asesoría jurídica antes de publicar.
4. Que el piloto tenga activa en DJI Fly la subida de registros a la nube (opt-in) y el RC 2 con internet.

## 6. Fases
| Fase | Contenido | Depende de |
|---|---|---|
| S0 | Prueba de factibilidad (iniciar sesión, listar y bajar un log, ver el formato) con cuenta de prueba | §5.1 |
| S1 | Migración `dji_account_links`, pantalla de consentimiento, conectar/desconectar | S0 |
| S2 | Sincronización + filas pendientes de confirmar | S1 |
| S3 | Endurecimiento: avisos de error, límites, pruebas, registro de acciones | S2 |

Alternativa siempre disponible (y respaldo si DJI bloquea): subida manual del log, con guía dentro de BitaFly sobre cómo sacarlo del RC 2.
