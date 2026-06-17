# Guía: acceso al proyecto desde cualquier PC via OneDrive + GitHub

> Propósito: trabajar en BitaFly desde cualquier computador sin depender de este PC.  
> **No ejecutar nada aquí** — este documento es solo la guía paso a paso.

---

## Diagnóstico: qué va dónde

El proyecto tiene tres categorías de archivos con destinos distintos:

| Categoría | Ejemplos | Destino |
|---|---|---|
| **Código fuente** | `src/`, `android/app/src/`, `CLAUDE.md`, `package.json` | ✅ Ya está en GitHub |
| **Secretos y archivos sensibles** | `.env.local`, `android/bitafly-upload.keystore`, `android/keystore.properties` | 🔒 OneDrive (carpeta privada) |
| **Artefactos generados** | `node_modules/`, `.next/`, `android/build/`, `android/.gradle/` | 🗑 No mover a ningún lado — se regeneran |

**Conclusión**: OneDrive no reemplaza a GitHub ni contiene el proyecto completo. OneDrive solo guarda los archivos que no pueden estar en git por motivos de seguridad.

---

## Parte 1 — Guardar los secretos en OneDrive (hacer UNA sola vez en este PC)

### Paso 1.1 — Crear la carpeta de secretos en OneDrive

En el Explorador de Windows, ir a:
```
OneDrive/
└── BitaFly-Secrets/        ← crear esta carpeta
    ├── env/                ← variables de entorno
    └── android-signing/    ← firma del APK
```

No poner esta carpeta dentro del proyecto — debe estar separada.

### Paso 1.2 — Copiar el archivo de variables de entorno

Copiar (NO mover) el archivo:
```
Origen:  C:\Users\PC\Documents\skylog-manager\.env.local
Destino: OneDrive\BitaFly-Secrets\env\.env.local
```

El `.env.local` contiene todas las variables necesarias para que la app funcione:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DJI_API_KEY`
- `RESEND_API_KEY`
- `EPAYCO_P_KEY`
- etc.

### Paso 1.3 — Copiar el keystore de firma Android

Copiar:
```
Origen:  C:\Users\PC\Documents\skylog-manager\android\bitafly-upload.keystore
Destino: OneDrive\BitaFly-Secrets\android-signing\bitafly-upload.keystore
```

### Paso 1.4 — Guardar las credenciales del keystore en un archivo de texto

Crear el archivo `OneDrive\BitaFly-Secrets\android-signing\keystore-info.txt` con:
```
Archivo:    bitafly-upload.keystore
Alias:      bitafly
Store pass: Bf_uPl0ad_9kQ2xR7m
Key pass:   Bf_uPl0ad_9kQ2xR7m
```

> ⚠️ Este archivo es extremadamente sensible. OneDrive tiene cifrado en reposo, pero considera también proteger la carpeta con una contraseña o usar OneDrive Personal Vault (Cámara Acorazada) para máxima seguridad.

### Paso 1.5 — Copiar el archivo keystore.properties

Copiar:
```
Origen:  C:\Users\PC\Documents\skylog-manager\android\keystore.properties
Destino: OneDrive\BitaFly-Secrets\android-signing\keystore.properties
```

### Paso 1.6 — Verificar que OneDrive sincronizó los archivos

En el Explorador de Windows, los archivos en OneDrive deben mostrar un ✅ verde (sincronizado). Esperar hasta que todos los iconos sean verdes antes de continuar.

---

## Parte 2 — Configurar un PC nuevo

Cuando se quiera trabajar desde otro computador, seguir estos pasos en orden.

### Paso 2.1 — Instalar las herramientas de desarrollo

Instalar en orden:

1. **Node.js 20 LTS** — https://nodejs.org/en/download  
   (verificar con `node --version` en PowerShell — debe decir v20.x.x)

2. **Git** — https://git-scm.com/download/win  
   (verificar con `git --version`)

3. **VS Code** (opcional pero recomendado) — https://code.visualstudio.com

4. **Java JDK 17** (solo si se va a compilar el APK Android)  
   Descargar de: https://adoptium.net/temurin/releases/?version=17  
   Elegir: Windows x64, JDK, `.msi`

5. **Android Studio** (solo si se va a compilar el APK Android)  
   https://developer.android.com/studio  
   Durante la instalación, aceptar la instalación del Android SDK.

### Paso 2.2 — Clonar el repositorio desde GitHub

Abrir PowerShell y ejecutar:
```powershell
cd C:\Users\<TuUsuario>\Documents
git clone https://github.com/deibercubillos-UAS/skylog-manager.git
cd skylog-manager
```

Esto descarga todo el código fuente actualizado.

### Paso 2.3 — Restaurar el archivo de variables de entorno

Desde OneDrive, copiar el archivo de secretos al proyecto:
```
Origen:  OneDrive\BitaFly-Secrets\env\.env.local
Destino: C:\Users\<TuUsuario>\Documents\skylog-manager\.env.local
```

En PowerShell también se puede hacer:
```powershell
Copy-Item "$env:OneDrive\BitaFly-Secrets\env\.env.local" -Destination ".\."
```

### Paso 2.4 — Instalar dependencias de Node

```powershell
# Dentro de la carpeta skylog-manager
npm install
```

Esto descarga `node_modules/` (puede tardar 1-3 minutos según la velocidad de internet).

### Paso 2.5 — Verificar que todo funciona

```powershell
npm run dev
```

Abrir en el navegador: http://localhost:3000  
Debe cargar la landing page de BitaFly sin errores.

### Paso 2.6 — Configurar Git con el usuario correcto

```powershell
git config user.name "Deiber Cubillos"
git config user.email "deibercubillos@gmail.com"
```

Para no tener que ingresar la contraseña de GitHub en cada push:
```powershell
git config --global credential.helper manager
```
(La primera vez que se haga push, pide login en el navegador con GitHub — luego queda guardado.)

---

## Parte 3 — Restaurar capacidad de compilar Android (solo si se necesita generar APK)

Solo seguir esta parte si en ese PC se necesita compilar una nueva versión del APK.

### Paso 3.1 — Restaurar el keystore

```
Origen:  OneDrive\BitaFly-Secrets\android-signing\bitafly-upload.keystore
Destino: C:\Users\<TuUsuario>\Documents\skylog-manager\android\bitafly-upload.keystore
```

### Paso 3.2 — Restaurar keystore.properties

```
Origen:  OneDrive\BitaFly-Secrets\android-signing\keystore.properties
Destino: C:\Users\<TuUsuario>\Documents\skylog-manager\android\keystore.properties
```

### Paso 3.3 — Configurar variables de entorno del sistema para Android

En PowerShell (como Administrador) o en las Variables de Entorno del sistema:

```
JAVA_HOME  = C:\Program Files\Eclipse Adoptium\jdk-17.x.x.x-hotspot
ANDROID_HOME = C:\Users\<TuUsuario>\AppData\Local\Android\Sdk
```

Y agregar al PATH:
```
%JAVA_HOME%\bin
%ANDROID_HOME%\platform-tools
%ANDROID_HOME%\build-tools\35.0.0
```

> Las rutas exactas de JAVA_HOME dependen de la versión instalada en ese PC. Verificar en `C:\Program Files\Eclipse Adoptium\`.

### Paso 3.4 — Sincronizar Capacitor antes de compilar

```powershell
npm run build
npx cap sync android
```

### Paso 3.5 — Compilar el APK firmado

```powershell
cd android
.\gradlew assembleRelease
```

El APK queda en:
```
android\app\build\outputs\apk\release\app-release.apk
```

---

## Flujo de trabajo diario (una vez configurado)

### Al empezar a trabajar en un PC configurado

```powershell
cd C:\Users\<TuUsuario>\Documents\skylog-manager
git pull          # bajar los últimos cambios
npm run dev       # iniciar el servidor de desarrollo
```

### Al terminar el día

```powershell
git add .
git commit -m "descripción del trabajo"
git push
```

El código queda en GitHub y disponible desde cualquier otro PC.

---

## Resumen de qué está dónde

```
GitHub (github.com/deibercubillos-UAS/skylog-manager)
└── Todo el código fuente
    - src/, android/app/src/, public/, supabase/
    - CLAUDE.md, package.json, next.config.js
    - docs/, .gitignore, vercel.json
    ❌ NO contiene: .env.local, keystore, node_modules

OneDrive/BitaFly-Secrets/
├── env/
│   └── .env.local              ← variables de entorno
└── android-signing/
    ├── bitafly-upload.keystore  ← firma del APK
    ├── keystore.properties      ← config de firma
    └── keystore-info.txt        ← credenciales del keystore

PC local (se regenera con npm install)
└── node_modules/   ← ~500 MB, nunca mover
└── .next/          ← build cache, nunca mover
└── android/build/  ← APKs compilados, nunca mover
```

---

## Checklist antes de abandonar este PC

- [ ] Verificar que `git push` está al día (`git status` dice "nothing to commit")
- [ ] `.env.local` copiado a `OneDrive\BitaFly-Secrets\env\`
- [ ] `bitafly-upload.keystore` copiado a `OneDrive\BitaFly-Secrets\android-signing\`
- [ ] `keystore.properties` copiado a `OneDrive\BitaFly-Secrets\android-signing\`
- [ ] Credenciales del keystore guardadas en `keystore-info.txt`
- [ ] OneDrive muestra ✅ verde en todos los archivos de `BitaFly-Secrets/`
- [ ] Verificar que otro PC puede clonar y ejecutar `npm run dev` sin errores
