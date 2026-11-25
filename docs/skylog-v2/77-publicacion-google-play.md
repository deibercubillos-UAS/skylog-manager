# 77 · Publicación en Google Play

Ficha de la tienda, formulario de Seguridad de los Datos y pasos para subir BitaFly a Google Play.
El proceso de compilación y firma está en [`../../android/README.md`](../../android/README.md).

## Datos base

- **Nombre del paquete (Application ID):** `com.bitafly.app` — permanente una vez publicado.
- **Artefacto a subir:** AAB firmado del sabor `play`
  (`android/app/build/outputs/bundle/playRelease/app-play-release.aab`).
- **Firma:** clave de carga propia (`bitafly-upload.keystore`, no versionada) + **Play App Signing** (clave final la custodia Google).
- Versión: `versionName 1.2.1`, `versionCode 4` (ver `android/app/build.gradle`).

## Ficha de la tienda

### Título (máx. 30 caracteres)
```
BitaFly: operaciones drone
```

### Descripción corta (máx. 80 caracteres)
```
Bitácoras, SMS y manuales para operar drones en Colombia según el RAC.
```

### Descripción larga (máx. 4000 caracteres)
```
BitaFly es la plataforma de gestión de operaciones con drones (UAS) hecha para Colombia. Reúne en un solo lugar la bitácora de vuelo, el Sistema de Gestión de la Seguridad Operacional (SMS), los manuales y las listas de chequeo que tu operación necesita para cumplir con el Reglamento Aeronáutico de Colombia (RAC 100 y RAC 219) ante la Aerocivil.

Diseñada para pilotos, jefes de pilotos y gerentes SMS, BitaFly reemplaza las hojas de cálculo y los formatos sueltos por un flujo ordenado, trazable y listo para auditoría.

QUÉ PUEDES HACER CON BITAFLY

• Bitácora de vuelo digital: registra cada vuelo de cada aeronave y descarga el Libro de Vuelo en PDF cuando lo necesites.
• Gestión de la seguridad (SMS): reportes voluntarios (VOR) y obligatorios (MOR), indicadores, comités SRB/SAG y seguimiento de hallazgos.
• Manuales de la organización: carga, versiona y clasifica tus manuales (operacional, SMS, mantenimiento y más); un mismo documento puede cumplir varias categorías.
• Listas de chequeo: prevuelo y las que tu organización defina, siempre a la mano.
• Tiempos de servicio y de vuelo de los pilotos, con alertas de límites.
• Reportes y formatos en PDF listos para presentar.
• Enlaces públicos de reporte para que cualquiera reporte un evento sin tener cuenta.

PENSADA PARA EL RAC COLOMBIANO

BitaFly se construyó siguiendo los requisitos del RAC 100 y del RAC 219 (SMS). Lo que se radica ante la Aerocivil conserva su formato; lo interno lo configura cada organización a su medida.

PLANES PARA CADA OPERACIÓN

Desde el piloto independiente hasta flotas y empresas: elige el plan que se ajuste al tamaño de tu operación.

BitaFly es una herramienta de apoyo a la gestión. No sustituye el criterio del piloto ni las responsabilidades que el operador tiene ante la autoridad aeronáutica. El permiso de operación lo otorga la Aerocivil.
```

## Formulario de Seguridad de los Datos (Data Safety)

Debe ser veraz y coincidir con lo que la app realmente hace. Estado actual de la app:

**¿Recopila o comparte datos?** → Sí, recopila.

| Tipo de dato | ¿Recopila? | ¿Vinculado al usuario? | Propósito |
|---|---|---|---|
| Correo electrónico / datos de cuenta | Sí | Sí | Autenticación y gestión de la cuenta |
| Nombre | Sí | Sí | Funcionalidad de la app |
| Contenido de la operación (bitácoras, reportes, manuales) | Sí | Sí | Funcionalidad de la app |
| **Ubicación (precisa)** | Sí | Sí | Funcionalidad de la app — el botón "usar mi ubicación" de meteorología trae el clima del punto actual (ver nota) |

**Prácticas de seguridad a marcar:**
- Los datos se cifran **en tránsito** (todo por HTTPS).
- El usuario puede **solicitar la eliminación** de sus datos.
- **No** se comparten datos para publicidad.
- La app se apoya en proveedores de infraestructura (Supabase, Cloudflare R2, Vercel) que actúan como **procesadores**, no como "compartir con terceros".

**Nota sobre Ubicación:** desde 2026-11-24 la app pide `ACCESS_FINE/COARSE_LOCATION` en runtime
(`MainActivity`) para que el WebView pueda usar `navigator.geolocation` en meteorología. El resto de
campos de "Lugar" (bitácora, reportes) son **texto libre** que el usuario escribe, no ubicación del
dispositivo. Como se declara el permiso, en el formulario hay que justificar su uso (clima por ubicación).
La posición no se almacena como dato propio: se envía al servicio de clima para la consulta puntual.

## Pasos en Play Console

1. **Cuenta de desarrollador:** play.google.com/console — pago único 25 USD + verificación de identidad (puede tardar 1–2 días).
2. **Crear app:** nombre "BitaFly", idioma principal español, tipo App, gratuita.
3. **Subir el AAB:** Production → Create new release → arrastrar `app-play-release.aab`. Aceptar **Play App Signing**.
4. **Completar fichas obligatorias:** ficha de la tienda (textos + capturas), clasificación de contenido, público objetivo, Seguridad de los Datos, permiso de ubicación justificado.
5. **Enviar a revisión** (primera revisión: unos días a ~1 semana).

## Pendiente tras la primera subida

Al activar Play App Signing, Google muestra el **SHA-256 de su clave de firma**. Hay que agregarlo a
`public/.well-known/assetlinks.json` y redesplegar, para que la app abra bitafly.com sin la barra del
navegador (Digital Asset Links).

## Verificación pendiente en dispositivo

La geolocalización se cableó y compila, pero **no se ha probado en un Android físico**: falta confirmar
que, tras conceder el permiso, el botón "usar mi ubicación" de meteorología obtiene posición dentro de la
app (no solo en el navegador). Probar antes de depender de esa función.
