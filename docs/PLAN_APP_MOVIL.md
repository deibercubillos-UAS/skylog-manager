# Plan: BitaFly Web → App móvil (PWA → Google Play → App Store)

> Documento de control. Se actualiza al cerrar cada fase. Mantener < 500 líneas.
> Última actualización: 2026-06-13

## Objetivo

Convertir la web BitaFly en app instalable, publicable en Google Play y App Store,
**manteniendo la web como única fuente de verdad** (el usuario ve lo mismo en web y app).
La app además traerá **datos de vuelo automáticos** (lectura nativa de logs DJI), algo
que la web pura no puede hacer.

## Arquitectura elegida

- **Capacitor en modo "remote URL"**: el shell nativo carga `https://bitafly.com` en un
  WebView → misma experiencia que la web, se actualiza al desplegar (sin recompilar).
- **Plugins nativos** para lo que la web no puede: lectura de archivos/USB DJI, background sync.
- Regla transversal: lo nativo solo *añade* capacidades detrás de una capa de detección
  (`lib/platform.js`); si algo nativo falla, cae al flujo web actual. Nada rompe la web.
- Alternativa descartada como base: **TWA** (rápido a Play pero sin acceso a archivos USB → no
  cumple "datos automáticos" ni sirve para iOS).

## Convención de estado

- ⬜ Pendiente · 🔄 En progreso · ✅ Completada · ⏭️ Omitida · ⚠️ Bloqueada

## Reglas de trabajo

- Cada fase (Fx.y) = un commit pequeño, verificable y reversible.
- Verificar `npm run build` OK antes de cada commit.
- No modificar código en masa; siempre mantener el control.
- Actualizar este archivo al cerrar cada fase (estado + nota breve).

---

## ETAPA 1 — PWA instalable sólida (web)

Objetivo: instalación limpia en escritorio, Android y RC. Sin tocar lógica de negocio.

| Fase | Descripción | Estado |
|------|-------------|--------|
| F1.1 | Auditoría PWA (Lighthouse, manifest, SW, archivos) — solo diagnóstico | ✅ |
| F1.2 | Unificar el manifest en una sola fuente (borrar duplicado de `public/`) | ✅ |
| F1.3 | UX de instalación: `beforeinstallprompt` + banner iOS "Agregar a inicio" | ✅ |
| F1.4 | apple-touch-icon 180px ✅ · screenshot `narrow` pendiente (captura con sesión) | 🔄 |
| F1.5 | SW: páginas network-first (anti-stale) + CACHE_VERSION v2 | ✅ |

## ETAPA 2 — Capa de plataforma (bridge), sin romper la web

Objetivo: preparar terreno nativo sin cambiar el comportamiento web.

| Fase | Descripción | Estado |
|------|-------------|--------|
| F2.1 | `lib/platform.js`: detectar entorno (web / android / ios), API única | ✅ |
| F2.2 | Encapsular importación DJI detrás del bridge (web igual; native delega) | ✅ |

## ETAPA 3 — App Android → APK + Google Play

Objetivo: APK instalable y app en Play con datos de vuelo automáticos.

| Fase | Descripción | Estado |
|------|-------------|--------|
| F3.0 | Prerrequisito: instalar Android Studio + JDK 17 en el PC | ✅ |
| F3.1 | Instalar Capacitor + `npx cap add android` (genera `android/`) | ✅ |
| F3.2 | Verificar paridad: el WebView carga el sitio idéntico a la web | ✅ |
| F3.3 | Build primer **APK debug** e instalar en RC/teléfono (hito instalable) | ✅ |
| F3.4 | Digital Asset Links (deep links abren la app) | ⬜ |
| F3.5 | Íconos / splash nativos | ⬜ |
| F3.6 | Plugin de archivos: leer carpeta `FlightRecord` (SAF/scoped storage) | ⬜ |
| F3.7 | Auto-import nativo: `.txt` nuevos → `POST /api/logbook/import-dji` | ⬜ |
| F3.8 | Auto-sync en segundo plano (WorkManager) — diferenciador | ⬜ |
| F3.9 | APK release firmado (.aab) → Play Console (testing → producción) | ⬜ |

## ETAPA 4 — App iOS → App Store

Objetivo: paridad en iOS. Requiere Mac + Xcode + cuenta Apple Developer.

| Fase | Descripción | Estado |
|------|-------------|--------|
| F4.1 | Generar proyecto `ios/` (Capacitor) | ⬜ |
| F4.2 | Paridad WebView + Universal Links | ⬜ |
| F4.3 | Datos de vuelo en iOS (Files/Share Sheet; DJI MSDK fuera de alcance inicial) | ⬜ |
| F4.4 | App Store Connect → TestFlight → revisión | ⬜ |

## ETAPA 5 — Comunicación continua y extras

| Fase | Descripción | Estado |
|------|-------------|--------|
| F5.1 | Versionado / forzar refresco (ya hay manejo de `ChunkLoadError`) | ⬜ |
| F5.2 | Push nativo (FCM/APNs) conectado a la campana existente | ⬜ |
| F5.3 | Telemetría por plataforma | ⬜ |

---

## Requisitos / costos

- **Google Play Console**: pago único ~25 USD.
- **Apple Developer**: ~99 USD/año + **Mac con Xcode** (obligatorio para iOS).
- Dominio HTTPS: ✅ ya disponible (bitafly.com).
- Android Studio + JDK 17 en el PC (para compilar el APK — Ruta A).

---

## Bitácora de avance

### F1.1 — Auditoría PWA ✅ (2026-06-13)

Solo diagnóstico, sin cambios en el código.

**Bien:**
- Íconos 192/512 + maskable presentes.
- SW robusto: APIs network-only, `_next/static` cache-first, páginas SWR, fallback offline.
- Archivos del precache existen (offline.html, fuente woff2, og-dashboard.png) → install no falla.
- SW solo en producción; en dev se desregistra. Criterios de instalabilidad cumplidos.

**Hallazgo principal (→ F1.2): manifest duplicado.**
- `src/app/manifest.js` (generado, gana en build) y `public/manifest.webmanifest` (estático)
  apuntan a `/manifest.webmanifest` con valores distintos (orientation, background_color,
  screenshots, shortcuts). Resolver dejando una sola fuente (recomendado: `src/app/manifest.js`).

**Menores:**
- apple-touch-icon usa 192px; iOS prefiere 180px (→ F1.4).
- SW versión estática `v1` (→ F1.5).
- Falta screenshot `narrow` para diálogo Android (→ F1.4).
- Lighthouse runtime pendiente (opcional; requiere server + navegador).

**Veredicto:** base PWA sólida y ya instalable. Único punto real: manifest duplicado.

### F1.2 — Unificar manifest ✅ (2026-06-13)

- Qué se hizo: una sola fuente de manifest. Borrado `public/manifest.webmanifest`;
  se conserva `src/app/manifest.js` (genera `/manifest.webmanifest`).
- Fusionado lo mejor de ambos: `orientation: 'any'` (tablet/RC landscape), shortcut
  "Importar DJI" añadido, screenshot `wide` (og-dashboard) activado.
- Archivos tocados: `src/app/manifest.js` (editado), `public/manifest.webmanifest` (borrado).
- Verificación: `npm run build` OK; `/manifest.webmanifest` sigue en la tabla de rutas;
  única referencia restante es `layout.js → manifest: '/manifest.webmanifest'` (correcta).
- Notas: screenshot `narrow` (móvil) y apple-touch-icon 180px quedan para F1.4.

### F1.3 — UX de instalación ✅ (2026-06-13)

- Qué se hizo: `components/InstallAppPrompt.js` — banner de instalación.
  - Android/Chrome escritorio: captura `beforeinstallprompt` → botón "Instalar app".
  - iOS Safari: instrucciones "Compartir → Agregar a pantalla de inicio".
  - Oculto si ya está instalada (standalone) o si el usuario lo descartó (localStorage).
  - Se oculta al `appinstalled`.
- Montado en `dashboard/layout.js` vía `dynamic(..., { ssr:false })` (no afecta bundle inicial).
- Archivos tocados: `components/InstallAppPrompt.js` (nuevo), `dashboard/layout.js`.
- Verificación: `npm run build` OK.
- Notas: probar diálogo real en navegador/preview es opcional (requiere sesión).

### F1.4 — Íconos Apple + screenshots 🔄 (2026-06-13)

- Hecho: generado `public/icons/apple-touch-icon-180.png` (180×180 desde icon-512 con sharp);
  `layout.js` apunta a él (apple + other rel apple-touch-icon).
- Pendiente: screenshot `narrow` (móvil) para el manifest — requiere captura con sesión
  iniciada (se hará en preview). Es polish opcional del diálogo de instalación Android.
- Verificación: `npm run build` OK; archivo 180px presente.

### F1.5 — Estrategia de caché del SW ✅ (2026-06-13)

- Qué se hizo: páginas del dashboard pasan de stale-while-revalidate a **network-first**
  (siempre fresco tras deploy; caché solo respaldo offline) → elimina ChunkLoadError por
  HTML viejo y garantiza que el app nativo refleje la web. `CACHE_VERSION` v1 → v2 (purga
  cachés previas en el `activate`).
- Archivos tocados: `public/sw.js`.
- Verificación: `npm run build` OK.
- Nota: el sello de build dinámico no fue necesario; network-first resuelve el objetivo.

**Etapa 1 (PWA instalable) COMPLETA** salvo screenshot `narrow` (F1.4, polish opcional).

### F2.1 — Capa de plataforma ✅ (2026-06-13)

- Qué se hizo: `lib/platform.js` — detección de entorno sin depender de Capacitor
  (lee `window.Capacitor` en runtime). API: `getPlatform()`, `isNative()`, `isWeb()`,
  `isAndroidApp()`, `isIOSApp()`, `capabilities` (nativeFlightImport / backgroundFlightSync /
  nativePush) y `platformInfo()`.
- En web pura todo resuelve a 'web' → comportamiento sin cambios.
- Archivos tocados: `lib/platform.js` (nuevo). Sin consumidores aún.
- Verificación: `npm run build` OK.

### F2.2 — Bridge de importación DJI ✅ (2026-06-13)

- Qué se hizo: `lib/flightImportBridge.js` — punto único de subida. `postFlightFile(fileObj, name)`
  centraliza el POST a `/api/logbook/import-dji` (mismo shape `{status,data}`). Stubs nativos
  `isNativeFlightSource()` / `listNativeFlightFiles()` / `readNativeFlightFile()` para F3.6.
- `DjiRcSync.uploadFile` ahora solo resuelve el File (web: handle/fileObj) y delega el POST
  al bridge → web idéntica, POST reutilizable por el plugin nativo.
- Archivos tocados: `lib/flightImportBridge.js` (nuevo), `components/DjiRcSync.js`.
- Verificación: `npm run build` OK. Sin cambios de comportamiento web.

**Etapa 2 (capa de plataforma) COMPLETA.**

### F3.0 — Prerrequisitos del PC ✅ (2026-06-16)

- Verificado: **JDK 17** (`C:\Program Files\Java\jdk-17`, 17.0.12) y **Android Studio**
  (`C:\Program Files\Android\Android Studio`, trae JBR **JDK 21**). SDK en
  `C:\Users\PC\AppData\Local\Android\Sdk` (platform android-36.1, build-tools 36.1.0/37.0.0,
  platform-tools/adb, licencias aceptadas). Node v24 / npm 11.
- Variables de usuario establecidas: `JAVA_HOME` → **JBR (JDK 21)** (lo exige Capacitor 8),
  `ANDROID_HOME`/`ANDROID_SDK_ROOT` → SDK, PATH con platform-tools/emulator/cmdline-tools.
- Falta `cmdline-tools` (opcional, no requerido para compilar el APK debug).

### F3.1 — Capacitor + proyecto Android ✅ (2026-06-16)

- Rama dedicada **`mobile-app`** creada desde `main` (todo lo nativo vive aquí).
- Instalado **Capacitor 8.4.0** (`@capacitor/core`, `@capacitor/android`, `-D @capacitor/cli`).
- `capacitor.config.ts` (NUEVO) en modo **remote URL** → `appId: com.bitafly.app`,
  `appName: BitaFly`, `server.url: https://bitafly.com`. NO toca `next.config.js` ni `src/`.
- `mobile/www/index.html` (NUEVO) — fallback offline mínimo (webDir de respaldo).
- `npx cap add android` generó la carpeta aislada **`android/`** (namespace/applicationId
  `com.bitafly.app`; su propio `.gitignore` excluye `*.apk`/`*.aab`/build).
- Verificación: scaffold OK, appId correcto. El primer build Gradle se hace en F3.3.

### F3.2 + F3.3 — Primer APK debug en emulador ✅ (2026-06-16)

- **Toolchain del emulador** (descargado con autorización): `cmdline-tools` (sdkmanager/avdmanager),
  imagen `system-images;android-35;google_apis;x86_64`, `emulator`. Licencias SDK aceptadas.
- **AVD `bitafly_pixel`** creado (Pixel 6, Android 15). Lanzado y booteado (`boot_completed=1`).
- **Build**: `gradlew assembleDebug --no-daemon` con `JAVA_HOME`=JBR (JDK 21) →
  **BUILD SUCCESSFUL** en ~1m54s. APK: `android/app/build/outputs/apk/debug/app-debug.apk` (3.93 MB).
- **Instalación**: `adb install -r` → Success. Lanzado `com.bitafly.app/.MainActivity`.
- **Paridad (F3.2)**: logcat confirma WebView cargando `https://bitafly.com/`; captura muestra
  el login de BitaFly idéntico a la web. Evidencia: `mobile/emulator-f32.png` (no versionada).
- **Gotchas Windows**: invocar `gradlew.bat` por ruta con el operador `&` de PowerShell
  (no `cmd /c "gradlew.bat"`); capturar screenshots con `adb pull`, NO `adb exec-out > file`
  (la redirección `>` de PowerShell corrompe el binario con BOM).
- **Etapa 3 base instalable COMPLETA.** Próximo: F3.4 (deep links) / F3.5 (íconos-splash) o saltar
  a F3.6/F3.7 (plugin de archivos + auto-import DJI nativo, el diferenciador real).

<!-- Plantilla para próximas fases:
### Fx.y — Título ✅/🔄 (fecha)
- Qué se hizo:
- Archivos tocados:
- Verificación (build/test):
- Notas / pendientes:
-->
