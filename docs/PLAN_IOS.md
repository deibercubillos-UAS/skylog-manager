# BitaFly — Plan iOS (Etapa 4)

> Estado: **En preparación** · Última actualización: 2026-06-23
> Este documento es la continuación de `PLAN_APP_MOVIL.md` Etapa 4.
> Todo el trabajo de iOS se hace en **Mac con Xcode** — no es posible en Windows.

---

## Requisitos previos (verificar antes de empezar)

| Requisito | Detalle | OK? |
|---|---|---|
| Mac con macOS 14+ | Sonoma o superior recomendado | ⬜ |
| Xcode 16+ | Descargar desde Mac App Store | ⬜ |
| Xcode CLI tools | `xcode-select --install` | ⬜ |
| Cuenta Apple Developer | 99 USD/año — `developer.apple.com` | ⬜ |
| CocoaPods | `sudo gem install cocoapods` | ⬜ |
| Node.js 20+ | `node --version` | ⬜ |
| Repositorio clonado | `git clone https://github.com/deibercubillos-UAS/skylog-manager.git` | ⬜ |
| `npm install` ejecutado | en la raíz del proyecto | ⬜ |

---

## Datos del proyecto (para no buscarlos)

```
App ID:       com.bitafly.app
App Name:     BitaFly
Bundle ID:    com.bitafly.app
Remote URL:   https://bitafly.com
Capacitor:    v8.4.0
Android ref:  versionCode 2, versionName 1.1.0 (ya en prod)
Repo:         https://github.com/deibercubillos-UAS/skylog-manager.git
```

---

## Fase F4.1 — Generar proyecto `ios/`

### Pasos

```bash
# 1. Clonar e instalar dependencias
git clone https://github.com/deibercubillos-UAS/skylog-manager.git
cd skylog-manager
npm install

# 2. Agregar plataforma iOS (genera la carpeta ios/)
npx cap add ios

# 3. Hacer un build web vacío si no existe mobile/www
mkdir -p mobile/www && echo "<html><body>loading...</body></html>" > mobile/www/index.html

# 4. Sincronizar Capacitor con el proyecto iOS
npx cap sync ios

# 5. Abrir en Xcode
npx cap open ios
```

### Resultado esperado
- Carpeta `ios/` generada con `App/App.xcworkspace`
- Xcode abre el workspace automáticamente
- La app carga `https://bitafly.com` en el simulador

### Verificación F4.1
- [ ] `npx cap sync ios` termina sin errores
- [ ] Xcode compila sin errores en simulador iPhone 16
- [ ] El WebView muestra bitafly.com correctamente
- [ ] El login funciona (cookies/sesión persisten)

---

## Fase F4.2 — Paridad WebView + Universal Links

### Configuración del Info.plist

Abrir `ios/App/App/Info.plist` en Xcode y verificar/agregar:

```xml
<!-- Permitir carga de bitafly.com -->
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key>
  <false/>
</dict>

<!-- Orientación para tablets/iPads -->
<key>UISupportedInterfaceOrientations</key>
<array>
  <string>UIInterfaceOrientationPortrait</string>
  <string>UIInterfaceOrientationLandscapeLeft</string>
  <string>UIInterfaceOrientationLandscapeRight</string>
</array>
<key>UISupportedInterfaceOrientations~ipad</key>
<array>
  <string>UIInterfaceOrientationPortrait</string>
  <string>UIInterfaceOrientationLandscapeLeft</string>
  <string>UIInterfaceOrientationLandscapeRight</string>
</array>
```

### Universal Links (apple-app-site-association)

Esto permite que `https://bitafly.com/dashboard` abra la app directamente.

**Pasos:**
1. En Xcode → Target `App` → Signing & Capabilities → `+` → **Associated Domains**
2. Agregar: `applinks:bitafly.com`
3. Crear/verificar `public/.well-known/apple-app-site-association`:

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "TEAM_ID.com.bitafly.app",
        "paths": ["*"]
      }
    ]
  }
}
```

> ⚠️ Reemplazar `TEAM_ID` con el Team ID real de la cuenta Apple Developer
> (se encuentra en developer.apple.com → Membership)

4. El archivo debe estar en `https://bitafly.com/.well-known/apple-app-site-association`
   (ya está en `public/.well-known/` si existe en Android — verificar)

### Verificación F4.2
- [ ] La app abre en dispositivo físico sin errores de ATS
- [ ] Un link `https://bitafly.com/dashboard` abre la app (no el navegador)
- [ ] Rotación landscape funciona en iPad

---

## Fase F4.3 — Datos de vuelo en iOS (Share Sheet)

### Diferencia fundamental con Android

| Android | iOS |
|---|---|
| SAF (Storage Access Framework) — acceso directo a carpeta | No hay acceso directo al sistema de archivos de otras apps |
| Leer `FlightRecord/*.txt` desde DJI Fly | El usuario debe **compartir** los .txt desde Archivos/DJI Fly |
| WorkManager para sync en background | Background App Refresh (limitado en iOS) |

### Estrategia iOS: Share Extension + Share Sheet

La forma nativa y aprobada por Apple:
1. El usuario abre DJI Fly en el iPhone
2. En el historial de vuelos, toca "Exportar" o "Compartir archivo .txt"  
3. Aparece el Share Sheet del sistema
4. El usuario elige "BitaFly" → los archivos van directamente a la app

**Implementación (Swift — `ios/App/App/`):**

Crear `FlightImportPlugin.swift`:

```swift
import Foundation
import Capacitor

@objc(FlightImportPlugin)
public class FlightImportPlugin: CAPPlugin {
    
    // Llamado desde JS: requestFlightFiles()
    @objc func requestFlightFiles(_ call: CAPPluginCall) {
        // Abrir el document picker para que el usuario elija .txt
        DispatchQueue.main.async {
            let picker = UIDocumentPickerViewController(
                forOpeningContentTypes: [.plainText],
                asCopy: true
            )
            picker.allowsMultipleSelection = true
            picker.delegate = self
            self.bridge?.viewController?.present(picker, animated: true)
        }
        // El resultado se entrega en el delegate
        call.keepAlive = true
        self.currentCall = call
    }
    
    private var currentCall: CAPPluginCall?
}

extension FlightImportPlugin: UIDocumentPickerDelegate {
    public func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        guard let call = currentCall else { return }
        
        var files: [[String: Any]] = []
        for url in urls {
            if let data = try? Data(contentsOf: url) {
                files.append([
                    "name": url.lastPathComponent,
                    "content": data.base64EncodedString(),
                    "size": data.count
                ])
            }
        }
        
        call.resolve(["files": files])
        currentCall = nil
    }
    
    public func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        currentCall?.resolve(["files": []])
        currentCall = nil
    }
}
```

Registrar en `AppDelegate.swift`:

```swift
// En application(_:didFinishLaunchingWithOptions:)
// Los plugins de Capacitor se auto-registran — no se necesita código adicional
// si el plugin hereda de CAPPlugin con @objc
```

Crear `FlightImportPlugin.m` (bridge Objective-C):

```objc
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(FlightImportPlugin, "FlightImport",
    CAP_PLUGIN_METHOD(requestFlightFiles, CAPPluginReturnPromise);
)
```

### Integración con el bridge JS existente

En `src/lib/flightImportBridge.js` (o el archivo equivalente), el plugin iOS ya es compatible
con la misma interfaz que Android, porque `lib/platform.js` detecta la plataforma:

```js
// Ya existe en lib/platform.js — no modificar
import { Capacitor } from '@capacitor/core';
export const isIos = () => Capacitor.getPlatform() === 'ios';
```

El componente `DjiRcSync.js` ya maneja el caso iOS (`<input multiple>` de archivos)
en modo web — en iOS nativo usará el Document Picker via el plugin.

### Verificación F4.3
- [ ] El Document Picker aparece al tocar "Sincronizar" en iOS
- [ ] Se pueden seleccionar múltiples .txt
- [ ] Los vuelos se importan correctamente (mismo flujo que web)
- [ ] Los archivos de DJI Fly son accesibles desde el picker

---

## Fase F4.4 — Build, TestFlight y App Store

### Firmar la app

1. En Xcode → Target `App` → Signing & Capabilities
2. Team: seleccionar la cuenta Apple Developer
3. Bundle Identifier: `com.bitafly.app`
4. Provisioning Profile: dejar en "Automatic" (Xcode lo gestiona)

### Versioning

Mantener paridad con Android:
- CFBundleShortVersionString: `1.1.0` (= versionName Android)
- CFBundleVersion: `2` (= versionCode Android)

### Build para TestFlight

```bash
# Desde Xcode:
# Product → Archive
# Organizer abre automáticamente
# Distribute App → App Store Connect → Upload
```

O con `xcodebuild` desde terminal:

```bash
cd ios
xcodebuild -workspace App/App.xcworkspace \
  -scheme App \
  -configuration Release \
  -archivePath build/BitaFly.xcarchive \
  archive

xcodebuild -exportArchive \
  -archivePath build/BitaFly.xcarchive \
  -exportOptionsPlist exportOptions.plist \
  -exportPath build/ipa/
```

`exportOptions.plist`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>app-store</string>
  <key>teamID</key>
  <string>TEAM_ID</string>
</dict>
</plist>
```

### Checklist App Store Connect

- [ ] Crear app en App Store Connect (`com.bitafly.app`)
- [ ] Screenshots iPhone 6.9" + iPad 13" (obligatorios para App Store)
- [ ] Descripción en español (Colombia)
- [ ] Categoría: Negocios / Productividad
- [ ] Subir build via TestFlight primero
- [ ] Probar con al menos 3 testers internos
- [ ] Enviar a revisión Apple (típicamente 1-3 días hábiles)

### App Store Privacy Manifest (requerido desde mayo 2024)

Crear `ios/App/App/PrivacyInfo.xcprivacy`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSPrivacyAccessedAPITypes</key>
  <array>
    <!-- UserDefaults — usado por Capacitor internamente -->
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <string>CA92.1</string>
      </array>
    </dict>
  </array>
  <key>NSPrivacyCollectedDataTypes</key>
  <array/>
  <key>NSPrivacyTracking</key>
  <false/>
</dict>
</plist>
```

### Verificación F4.4
- [ ] Build sin errores con `xcodebuild` o Xcode GUI
- [ ] Firma válida (no "untrusted developer")
- [ ] App sube a App Store Connect sin errores
- [ ] TestFlight instalable en iPhone real
- [ ] Login funciona en dispositivo físico
- [ ] Vuelos se importan correctamente
- [ ] No hay crashes en Crashlytics/Xcode Organizer

---

## Plugins nativos Android vs iOS — comparativa

| Funcionalidad | Android (Java) | iOS (Swift) | Estado iOS |
|---|---|---|---|
| OTA Update (AppUpdatePlugin) | ✅ Descarga + instala APK | N/A — App Store gestiona updates | No necesario |
| Leer logs DJI (FlightFilesPlugin) | ✅ SAF + MANAGE_EXTERNAL_STORAGE | Document Picker (UIDocumentPicker) | ⬜ F4.3 |
| Background sync (FlightSyncWorker) | ✅ WorkManager | BGAppRefreshTask (muy limitado en iOS) | ⬜ Alcance reducido |

> **Nota sobre background sync en iOS:** Apple restringe fuertemente el background processing.
> La estrategia recomendada es que el usuario abra la app después de volar para sincronizar,
> o usar el Share Sheet desde DJI Fly. No es posible replicar el WorkManager de Android.

---

## Diferencias de permisos iOS vs Android

| Permiso | Android | iOS |
|---|---|---|
| Internet | `INTERNET` en Manifest | Automático |
| Archivos | `MANAGE_EXTERNAL_STORAGE` | Entitlement `com.apple.security.files.user-selected.read-only` |
| Notificaciones | `POST_NOTIFICATIONS` | `UNUserNotificationCenter.requestAuthorization` |
| Instalar apps | `REQUEST_INSTALL_PACKAGES` | No aplicable |

Agregar en `ios/App/App.entitlements`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.developer.associated-domains</key>
  <array>
    <string>applinks:bitafly.com</string>
  </array>
</dict>
</plist>
```

---

## Comandos de referencia rápida

```bash
# En el Mac — desde la raíz del proyecto
git clone https://github.com/deibercubillos-UAS/skylog-manager.git
cd skylog-manager
npm install

# Si ya existe ios/ (segundo clone o actualización):
npx cap sync ios
npx cap open ios

# Si ios/ NO existe aún (primer setup):
npx cap add ios
npx cap sync ios
npx cap open ios

# Ver qué versión de Capacitor hay
npx cap --version

# Abrir simulador desde terminal
xcrun simctl list devices
npx cap run ios --target "iPhone 16"
```

---

## Estado de las fases

| Fase | Descripción | Estado |
|---|---|---|
| F4.1 | Generar proyecto `ios/` | ⬜ |
| F4.2 | Paridad WebView + Universal Links | ⬜ |
| F4.3 | Document Picker para logs DJI | ⬜ |
| F4.4 | Build + TestFlight + App Store | ⬜ |

---

## Notas importantes

1. **No hay que modificar `src/`** para ninguna de estas fases. Todo el código web funciona igual.
2. **`capacitor.config.ts` ya está configurado** con `server.url: https://bitafly.com` — el iOS WebView cargará directamente la web en producción.
3. **`@capacitor/ios` no está instalado aún** — `npx cap add ios` lo instala automáticamente como parte del comando.
4. **Plugins nativos Android (`AppUpdatePlugin`, `FlightFilesPlugin`, `FlightSyncWorker`)** no necesitan versión iOS equivalente para el MVP: OTA no aplica (App Store) y el background sync está fuera del alcance inicial de iOS.
5. **Team ID de Apple Developer** es necesario para F4.2 y F4.4 — está disponible en `developer.apple.com/account/` → Membership Details.
