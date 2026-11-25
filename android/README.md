# App móvil (Capacitor) — BitaFly

Cascarón Android (Capacitor 8) que carga **bitafly.com** por URL remota. No empaqueta la web:
abre el sitio en producción dentro de un WebView con el puente nativo de la app.

- **Application ID (nombre del paquete):** `com.bitafly.app` — permanente una vez publicado en Play.
- Configuración de Capacitor: `../capacitor.config.ts`.

## Requisitos para compilar

- **JDK 21 o superior.** Capacitor 8 compila a *release level 21*; con JDK 17 falla con
  `error: invalid source release: 21`. En este equipo se usa el JBR que trae Android Studio
  (JDK 25), que sí compila a 21:
  ```sh
  export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
  export ANDROID_HOME="$HOME/Library/Android/sdk"
  ```
- **Android SDK** (compileSdk/targetSdk 36, minSdk 24 — ver `variables.gradle`).

## Dos sabores (product flavors)

| Flavor | Salida | Para qué |
|---|---|---|
| `direct` | APK (`assembleDirectRelease`) | Descarga directa fuera de la tienda; `BuildConfig.PLAY_BUILD=false`. |
| `play`   | AAB (`bundlePlayRelease`) | Subida a Google Play; `BuildConfig.PLAY_BUILD=true`. El manifest de `src/play/` quita los permisos que Play no admite (`MANAGE_EXTERNAL_STORAGE`, `REQUEST_INSTALL_PACKAGES`). |

Compilar el bundle firmado para Play:
```sh
cd android
JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home" \
ANDROID_HOME="$HOME/Library/Android/sdk" \
./gradlew bundlePlayRelease
# salida: app/build/outputs/bundle/playRelease/app-play-release.aab
```

## Firma

`app/build.gradle` (signingConfigs.release) lee las credenciales de **`android/keystore.properties`**,
que **no se versiona** (`.gitignore`: `keystore.properties`, `*.keystore`, `*.jks`). Si el archivo no existe,
el release sale **sin firmar**. La plantilla está en `keystore.properties.example`.

Crear la clave de carga (una sola vez; guarda la contraseña en tu gestor):
```sh
cd android
keytool -genkeypair -v -keystore bitafly-upload.keystore -alias bitafly \
  -keyalg RSA -keysize 2048 -validity 10000
cp keystore.properties.example keystore.properties   # y rellena las contraseñas
```

**Play App Signing:** la clave de arriba es solo la **clave de carga** (sirve para subir el AAB).
La clave de firma final la custodia Google; si pierdes la de carga, Google permite regenerarla.

### Pendiente tras la primera subida a Play

Al activar Play App Signing, Google muestra el **SHA-256 de su clave de firma**. Hay que agregarlo a
`../public/.well-known/assetlinks.json` y volver a desplegar, para que la app abra bitafly.com sin la
barra del navegador (Digital Asset Links).
