# Bitafly — Especificación de App Nativa (Android + iOS)
**Documento de arquitectura y plan de ejecución**
Versión 1.0 · Junio 2026 · Autor del proyecto: Deiber Cubillos

> Objetivo del documento: definir cómo construir una app nativa de Bitafly, desde cero,
> que se comunique en tiempo real con la web (lo que pasa en la app se ve en la web y
> viceversa), con capacidad de crecer de Android a iOS, evaluando los riesgos y
> garantizando que **el código web actual que funciona no se toca**.

---

## 1. Objetivo y alcance

### 1.1 Qué queremos
- Una **app instalable** (APK en Android, IPA en iOS) de Bitafly.
- **Sincronización total y en tiempo real** con la web: una sola fuente de verdad; cualquier cambio en un lado aparece en el otro sin recargar.
- **Auto-upload de los logs DJI** sin que el usuario navegue la ruta cada vez, en **ambas plataformas**: en Android con servicio en segundo plano continuo; en iOS configurando la carpeta de DJI Fly una sola vez y luego automático al abrir. Aplica especialmente al caso de **control sin pantalla** donde el celular guarda los vuelos.
- Base que permita **expandir a iOS** reutilizando casi todo el trabajo.

### 1.2 Qué NO es este proyecto
- No es reescribir Bitafly. Reutilizamos la web React/Next.js actual.
- No reemplaza la web; la complementa.
- No toca el backend existente (Supabase, API routes): la app **consume** lo que ya hay.

---

## 2. Decisión de arquitectura: Capacitor

Evaluamos cuatro caminos:

| Opción | Reutiliza tu web | Android auto-DJI | iOS | Esfuerzo |
|---|---|---|---|---|
| PWA (actual) | ✅ Total | ❌ | ✅ | Ya hecho |
| TWA (Bubblewrap) | ✅ Total | ❌ | ❌ | Bajo |
| **Capacitor** | ✅ Total | ✅ (plugin FS) | ✅ | **Medio** |
| Nativo puro (Kotlin + Swift) | ❌ | ✅ | ✅ | Alto (x2) |

**Elección: Capacitor.**

**Por qué:**
- Reutiliza el 95% de tu UI React/Next.js existente. No reescribes pantallas.
- Genera **un APK y un IPA reales** desde la misma base de código.
- Da acceso a APIs nativas (filesystem, notificaciones, background) vía plugins.
- Android e iOS comparten la misma capa web; solo el código nativo (poco) se diferencia.
- Tiene un ecosistema maduro y comunidad grande (lo mantiene Ionic).

**Cómo se ve la estructura:**
```
Bitafly (rama mobile-app)
├── src/                 ← tu web ACTUAL, sin cambios
├── capacitor.config.ts  ← config nueva (aditiva)
├── android/             ← proyecto Android generado (aislado)
├── ios/                 ← proyecto iOS generado (aislado, fase posterior)
└── mobile/              ← plugins y código puente nativo (aislado)
```

La regla de oro: **todo lo nativo vive en carpetas nuevas** (`android/`, `ios/`, `mobile/`, `capacitor.config.ts`). El directorio `src/` que hoy funciona permanece intacto.

---

## 3. El modelo de sincronización "total"

Tu requisito —"comunicación y actualización total"— **ya es viable con tu stack actual**, porque la clave no es sincronizar dos apps entre sí, sino que ambas hablen con el mismo backend.

### 3.1 Una sola fuente de verdad: Supabase
Ni la web ni la app guardan estado propio de negocio. Ambas leen y escriben a la **misma base de datos Supabase**. Por construcción, "lo de la app" y "lo de la web" son el mismo dato.

```
   ┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
   │   Web app   │ ◄─────► │  Supabase        │ ◄─────► │  App nativa │
   │ (navegador) │         │  (Postgres +     │         │ (Android/iOS)│
   └─────────────┘         │   Realtime +     │         └─────────────┘
                           │   Auth + Storage)│
                           └──────────────────┘
```

### 3.2 Tiempo real: Supabase Realtime
Supabase incluye **Realtime** (websockets sobre Postgres). Web y app se **suscriben** a cambios de las tablas (`flights`, `aircraft`, `batteries`, `flight_authorizations`, etc.). Cuando un lado escribe, el otro recibe el cambio y actualiza la UI **sin polling, sin recargar**.

Ejemplo de flujo:
1. En el control (app) se importa un vuelo DJI → INSERT en `flights`.
2. Supabase emite el evento Realtime.
3. La web del gerente, abierta en la oficina, recibe el INSERT y muestra el vuelo nuevo al instante.

Y al revés: el gerente edita el PIC de un vuelo en la web → la app lo refleja.

### 3.3 Resolución de conflictos
Si web y app editan el mismo registro casi a la vez:
- Estrategia simple y suficiente: **"última escritura gana"** usando `updated_at` (timestamp del servidor).
- Para casos críticos (raros aquí), se puede añadir versionado optimista más adelante.

### 3.4 Modo offline (importante para campo)
Los operadores vuelan donde no hay señal. La app debe:
- Guardar en una **cola local** (SQLite/IndexedDB nativo) lo que no se pudo subir.
- Sincronizar automáticamente al recuperar conexión.
- Supabase + una cola local cubren esto sin backend adicional.

---

## 4. Estrategia Android → iOS

La gran ventaja de Capacitor: **la mayoría del trabajo se comparte**. Lo que cambia entre plataformas es acotado.

| Capa | Android | iOS | ¿Compartido? |
|---|---|---|---|
| UI (React/Next.js) | ✅ | ✅ | **100% compartido** |
| Lógica de negocio | ✅ | ✅ | **100% compartido** |
| Auth Supabase | ✅ | ✅ | **100% compartido** |
| Realtime / sincronización | ✅ | ✅ | **100% compartido** |
| Notificaciones push | Plugin | Plugin | Compartido (config distinta) |
| **Auto-upload DJI** | ✅ Servicio continuo en segundo plano | ✅ Al abrir la app + background oportunista | **Ambos lo logran — ver 4.1** |

### 4.1 Auto-upload de DJI en Android y en iOS (corregido)

El objetivo —subir los vuelos DJI sin que el usuario navegue la ruta cada vez— **es alcanzable en ambas plataformas**. La diferencia está en *cuán* automático puede ser el segundo plano, no en si funciona.

**Escenario clave (el que aplica a iOS):** un **control sin pantalla** (ej. DJI RC-N1) se conecta a un **celular** que corre DJI Fly. Los logs `FlightRecord` quedan guardados **en el celular**. La app de Bitafly corre en ese mismo celular.

**Android:**
- Con permiso de almacenamiento, la app lee la carpeta `FlightRecord` directamente.
- Puede correr un **servicio en segundo plano continuo** (foreground service) que vigila la carpeta y sube los vuelos nuevos **aunque la app esté cerrada**. Auto-upload casi total.

**iOS (sí es posible, con un matiz de fondo):**
- DJI Fly en iOS **expone su carpeta `FlightRecord`** a través de la app Archivos / selector de documentos (la misma ruta `En mi iPhone → DJI Fly → FlightRecord` que ya usa la web móvil).
- Bitafly pide acceso a esa carpeta **una sola vez** (selector de documentos). iOS emite un **security-scoped bookmark** (marcador con permiso persistente) — es el equivalente iOS al "handle recordado" del Nivel 1 web.
- A partir de ahí, la app **re-lee la carpeta y sube los vuelos nuevos automáticamente cada vez que se abre**, más **refresco en segundo plano oportunista** (`BGTaskScheduler`).
- Resultado: el usuario **no vuelve a navegar la ruta**. Configura una vez y luego es automático.

**La única diferencia real entre plataformas:**

| | Android | iOS |
|---|---|---|
| Configuración inicial | Conceder permiso 1 vez | Elegir carpeta DJI Fly 1 vez |
| Al abrir la app | Auto | Auto |
| Con la app cerrada | **Continuo** (servicio en segundo plano) | **Oportunista** (iOS decide cuándo correr el background fetch) |

En la práctica, para un operador que abre Bitafly tras volar, **ambas plataformas suben los vuelos solas**. La ventaja de Android es solo el segundo plano 100% continuo; iOS hace lo mismo al abrir + cuando el sistema lo permite.

**Dependencia a confirmar:** que DJI Fly exponga `FlightRecord` como ubicación navegable en la app Archivos del iPhone de prueba (lo asumimos porque la web ya documenta esa ruta, pero se valida en dispositivo real).

### 4.2 Plan de expansión
- **Android primero** (Fases A–E): se valida el flujo completo, incluido el auto-upload con servicio en segundo plano.
- **iOS después** (Fase F): se "enciende" reutilizando toda la base. El trabajo extra de iOS es: proyecto Xcode, permisos, certificados Apple, y la importación DJI vía selector de documentos + security-scoped bookmark (auto al abrir).
- **Alcance de dispositivos:** la app nativa es para **celulares (iOS y Android)**. **Tablets y computadores siguen usando la web** — no necesitan app.

---

## 5. Estrategia de aislamiento: trabajar sin romper lo que funciona

Este es el punto que más te importa. Cómo construir esto **sin tocar el código web en producción**.

### 5.1 Rama dedicada
- Toda la app nativa se desarrolla en una rama **`mobile-app`** creada desde `main`.
- `main` (lo que está en bitafly.com) **no se toca** hasta que la app esté probada.
- Se hace `merge` de `main` → `mobile-app` periódicamente para no quedar desactualizado, nunca al revés hasta el final.

### 5.2 La decisión clave: ¿el APK carga la web desplegada o un bundle propio?

**Opción recomendada para empezar — apuntar a la web desplegada (cero cambios en el build web):**
- El APK es un contenedor que carga `https://bitafly.com` (o un subdominio).
- **No se modifica `next.config.js` ni el build web en absoluto.** El riesgo sobre la web actual es **nulo**.
- Desventaja: requiere conexión para la UI (aunque la data se cachea). Suficiente para la PoC y la mayoría de uso.

**Opción avanzada (más adelante) — bundle web empaquetado:**
- Capacitor empaqueta el HTML/JS dentro del APK (UI funciona offline).
- Requiere `output: 'export'` u otra configuración en Next.js → **esto sí toca el build web**, por eso se deja para después y detrás de la rama.

**Plan:** empezar con la opción "apuntar a la web" (riesgo cero sobre producción), y solo evaluar el bundle empaquetado cuando el resto esté validado.

### 5.3 Código compartido con guardas de entorno
Si en algún momento la web necesita saber "¿estoy corriendo dentro de la app nativa?", se usa un helper aditivo:
```js
// lib/platform.js  (NUEVO archivo, no modifica nada existente)
export const isNativeApp = () =>
  typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.();
```
Cualquier comportamiento específico de la app se mete detrás de `if (isNativeApp())`, de modo que la web sigue idéntica para los usuarios de navegador.

### 5.4 El backend NO cambia
- La app consume las **mismas API routes** (`/api/logbook/import-dji`, etc.) y el mismo Supabase.
- No se crean endpoints nuevos salvo que algo lo exija; si se necesitan, se añaden **sin modificar los existentes**.

### 5.5 Resumen de garantías de no-ruptura
| Garantía | Cómo |
|---|---|
| Producción web intacta | Todo en rama `mobile-app`; `main` no se toca |
| Build web sin cambios | APK apunta a la web desplegada (Fase A) |
| `src/` sin modificar | Código nativo en carpetas nuevas; cambios web detrás de `isNativeApp()` |
| Backend sin cambios | La app reutiliza API y Supabase actuales |
| Reversible | Si algo falla, se descarta la rama sin afectar nada |

---

## 6. Fases de ejecución

### Fase A — Cimientos Capacitor (Android)
- Crear rama `mobile-app`. Integrar Capacitor (config aditiva).
- Generar el primer APK que carga la web de Bitafly.
- Login Supabase funcionando dentro del APK.
- **Entregable:** APK instalable = tu web, con sesión nativa. Riesgo sobre producción: nulo.

### Fase B — Realtime bidireccional (por etapas)
La sincronización se enciende **por tablas, no todo de una**, para validar con bajo riesgo.

**B1 — Tablas básicas (prueba de concepto):**
- Activar Realtime en `flights` (la tabla más activa y la del flujo DJI). Opcionalmente `aircraft`.
- Suscripción en web y app: importar/editar un vuelo en un lado se ve en el otro al instante.
- **Entregable:** demo verificable de sincronización en tiempo real sobre vuelos.

**B2 — Resto de tablas:**
- Extender Realtime a `flight_authorizations`, `batteries`, `maintenance_logs`, `pilots`, `flight_plans` y demás.
- **Entregable:** sincronización total en todos los módulos.

### Fase C — Auto-upload DJI nativo (Android)
- Plugin de filesystem + permiso de almacenamiento.
- Leer `FlightRecord` directo y subir vía `/api/logbook/import-dji` (ya existe).
- **Entregable:** abrir la app en el celular/control → sube vuelos nuevos sin navegar la ruta.

### Fase D — Background sync + offline (Android)
- Servicio en segundo plano que vigila la carpeta.
- Cola offline con reintento al reconectar.
- **Entregable:** cero toques, resistente a cortes de red.

### Fase E — Empaquetado y distribución directa (APK) ← *empezamos por aquí en distribución*
- Firma del APK y **distribución directa** (instalable en los celulares/controles), **sin tienda todavía**.
- Actualizaciones OTA del bundle web sin reinstalar.
- **Entregable:** app Android distribuible y actualizable por fuera de las tiendas.

### Fase F — Expansión a iOS
- Generar proyecto iOS, certificados Apple, permisos.
- Auto-upload DJI vía selector de documentos + **security-scoped bookmark** (configurar 1 vez → auto al abrir) + background fetch oportunista.
- **Nota de distribución:** iOS no permite instalar IPA "directo" como el APK; la distribución temprana es vía **TestFlight**, y la pública vía App Store (Fase G).
- **Entregable:** app iOS con la misma sincronización y auto-upload DJI.

### Fase G — Publicación en tiendas (Play Store + App Store) ← *adecuación posterior*
- Adecuar requisitos de cada tienda: permisos justificados (especialmente almacenamiento en Android), política de privacidad, assets, formularios de datos.
- Publicar en Google Play y Apple App Store.
- **Entregable:** app disponible en ambas tiendas.

---

## 7. Riesgos y mitigación

| # | Riesgo | Prob. | Impacto | Mitigación |
|---|---|---|---|---|
| R1 | `MANAGE_EXTERNAL_STORAGE` rechazado por Play Store | Media | Alto | Distribuir APK directo a los controles Enterprise (no requiere Play Store); o justificar el permiso con video-demo a Google |
| R2 | DJI Fly no expone `FlightRecord` en la app Archivos del iPhone | Media | Medio | Validar en iPhone real; la web ya usa esa ruta, así que se asume disponible. Respaldo: importación manual vía selector |
| R2b | Background en iOS no es continuo (el sistema decide cuándo) | **Alta (cierto)** | Bajo | Auto-upload al abrir la app cubre el caso real; el background es un extra oportunista, no la vía principal |
| R3 | Ruta de logs de DJI Pilot 2 Enterprise distinta a la conocida | Media | Medio | Confirmar la ruta real en el control antes de Fase C; búsqueda recursiva como respaldo |
| R4 | Conflictos de edición simultánea web/app | Baja | Bajo | "Última escritura gana" con `updated_at`; versionado optimista si escala |
| R5 | Empaquetar bundle web rompe el build (output export) | Media | Alto | **Evitado en Fase A** apuntando a la web desplegada; solo se evalúa empaquetado al final |
| R6 | Certificados/cuenta de Apple (costo y burocracia) | Media | Medio | Apple Developer son USD 99/año; planificar antes de Fase F |
| R7 | Mantener dos plataformas duplica soporte | Media | Medio | Capacitor minimiza la divergencia; el 95% del código es compartido |
| R8 | Sesión/Auth nativa difiere del navegador (cookies vs token) | Media | Medio | Usar tokens de Supabase (no cookies) en la app; el SDK lo maneja |
| R9 | Background sync agota batería del control | Baja | Medio | Vigilancia con intervalos razonables; subir solo al detectar archivos nuevos |
| R10 | Desincronización rama `mobile-app` vs `main` | Media | Bajo | Merge frecuente de `main` hacia la rama; la rama nunca diverge en `src/` |

### Riesgo transversal: alcance
El mayor riesgo no es técnico sino de **alcance**. La tentación es construir todo de una. Mitigación: cada fase entrega algo usable y se valida antes de seguir. Se puede parar en cualquier fase con valor real ya entregado (ej. parar en Fase B ya da sincronización en tiempo real).

---

## 8. Requisitos técnicos y herramientas

| Herramienta | Para qué | Costo |
|---|---|---|
| Node.js + Capacitor CLI | Construir la app | Gratis |
| Android Studio | Compilar/firmar APK, emulador | Gratis |
| Xcode (Mac obligatorio) | Compilar IPA iOS | Gratis (requiere Mac) |
| Cuenta Google Play Console | Publicar en Play Store (opcional) | USD 25 único |
| Cuenta Apple Developer | Publicar en App Store | USD 99/año |
| Supabase (actual) | Backend + Realtime | Plan actual |

**Nota dura sobre iOS:** compilar para iOS **requiere una Mac**. Sin Mac, Android avanza solo; iOS queda bloqueado hasta tener acceso a macOS (físico o en la nube tipo MacStadium).

---

## 9. Estimación de esfuerzo (orientativa)

| Fase | Esfuerzo aprox. |
|---|---|
| A — Cimientos Capacitor | 3–5 días |
| B1 — Realtime básico (`flights`) | 3–5 días |
| B2 — Realtime resto de tablas | 4–6 días |
| C — Auto-DJI Android | 1–2 semanas |
| D — Background + offline (Android) | 2–3 semanas |
| E — APK directo | 3–5 días |
| F — Expansión iOS | 1–2 semanas (sobre la base ya hecha) |
| G — Publicación en tiendas | 3–5 días por tienda + tiempos de revisión |

Total Android usable y distribuible (A–C + E): ~1 mes de trabajo enfocado. iOS suma ~2 semanas. Tiendas, después.

---

## 10. Decisiones tomadas y pendientes

### Resueltas
1. **Distribución:** empezar por **APK directo** instalable (Fase E); adecuar a Play Store y App Store después (Fase G).
2. **Alcance de dispositivos:** la app es para **celulares iOS y Android**. **Tablets y computadores siguen en la web** (no necesitan app). Nota logística: compilar iOS requiere una **Mac** como máquina de build (Android no la necesita y puede arrancar de inmediato); confirmar acceso a una Mac antes de la Fase F.
3. **Subdominio:** se prioriza **estabilidad** → en la Fase A el APK **apunta a la web ya desplegada** (sin tocar el build, riesgo nulo). Si conviene aislar el tráfico de la app, se usa un subdominio dedicado (ej. `app.bitafly.com`) apuntando al mismo despliegue. Decisión final en la Fase A según pruebas.
4. **Realtime por fases:** **B1** = `flights` (+ opcional `aircraft`) para pruebas; **B2** = el resto de tablas.

### Pendiente
5. **Ruta de logs de DJI Pilot 2 Enterprise:** ⏳ *Deiber la confirmará en el control real.*
   - DJI Fly (referencia conocida): `Android/data/dji.go.v5/files/FlightRecord`
   - **DJI Pilot 2 Enterprise (Android):** `________________________________` ← *(a completar)*
   - iOS (DJI Fly): `En mi iPhone → DJI Fly → FlightRecord` ← *(validar en iPhone real)*

---

## 11. Recomendación de arranque

**Proof of Concept de Fase A + B1** en la rama `mobile-app`:
- Capacitor cargando tu web desplegada + Realtime básico en la tabla `flights`.
- Valida que todo encaja en tu stack **con riesgo cero sobre producción** (el build web no se toca).
- Si la PoC convence, se sigue fase por fase; si no, se descarta la rama sin consecuencias.

---

*Documento vivo — actualizar a medida que se validen supuestos (ruta DJI, disponibilidad de Mac, política de distribución).*
