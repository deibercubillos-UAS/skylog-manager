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
| F1.3 | UX de instalación: `beforeinstallprompt` + banner iOS "Agregar a inicio" | ⬜ |
| F1.4 | Screenshots `narrow` en manifest + apple-touch-icon 180px | ⬜ |
| F1.5 | Versionar el SW (sello de build) + revisar estrategia de caché | ⬜ |

## ETAPA 2 — Capa de plataforma (bridge), sin romper la web

Objetivo: preparar terreno nativo sin cambiar el comportamiento web.

| Fase | Descripción | Estado |
|------|-------------|--------|
| F2.1 | `lib/platform.js`: detectar entorno (web / android / ios), API única | ⬜ |
| F2.2 | Encapsular importación DJI detrás del bridge (web igual; native delega) | ⬜ |

## ETAPA 3 — App Android → APK + Google Play

Objetivo: APK instalable y app en Play con datos de vuelo automáticos.

| Fase | Descripción | Estado |
|------|-------------|--------|
| F3.0 | Prerrequisito: instalar Android Studio + JDK 17 en el PC | ⬜ |
| F3.1 | Instalar Capacitor + `npx cap add android` (genera `android/`) | ⬜ |
| F3.2 | Verificar paridad: el WebView carga el sitio idéntico a la web | ⬜ |
| F3.3 | Build primer **APK debug** e instalar en RC/teléfono (hito instalable) | ⬜ |
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

<!-- Plantilla para próximas fases:
### Fx.y — Título ✅/🔄 (fecha)
- Qué se hizo:
- Archivos tocados:
- Verificación (build/test):
- Notas / pendientes:
-->
