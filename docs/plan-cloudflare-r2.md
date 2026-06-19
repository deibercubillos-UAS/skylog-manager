# Plan: Migración de archivos a Cloudflare R2

> Estado: **PLAN (no implementado)**. Objetivo: mover el almacenamiento de archivos
> grandes (vuelos, documentos, manuales, imágenes, APK) de Supabase Storage a
> **Cloudflare R2** para reducir costo (egress $0) y mejorar la velocidad, **sin
> cambiar la experiencia del frontend** y **sin dejar la página inhabilitada en
> ningún momento**.
> Última actualización: 2026-06-19.

---

## 1. Decisiones confirmadas (2026-06-19)

1. **Dominio CDN**: usar el dominio propio **`bitafly.com`** → subdominio **`cdn.bitafly.com`** para los archivos públicos servidos por R2.
2. **Migración progresiva**: bucket por bucket, no big-bang.
3. **Backfill total**: se copia **todo lo histórico** a R2 (no solo lo nuevo).
4. **Aceptado el matiz**: los 3 componentes de subida cliente-directo cambian **solo por dentro** (mismos props y mismo contrato `onUploadSuccess`); la experiencia no cambia.
5. **Cero downtime**: cada paso es pequeño, reversible por flag, y siempre con lectura de respaldo. La app nunca queda offline.

---

## 2. Principios de cero-downtime (reglas que rigen todas las fases)

1. **Flag por bucket** (env var): cada bucket tiene un modo — `supabase` (actual) → `dual` (escribe R2, lee R2 con fallback a Supabase) → `r2` (solo R2). El cambio es **una variable**, reversible al instante.
2. **Lectura con respaldo** durante la transición: si el objeto no está en R2, se sirve desde Supabase. Ningún enlace se rompe mientras corre el backfill.
3. **Deploys aditivos**: el código nuevo viaja **dormido** detrás del flag. Hacer deploy no cambia comportamiento hasta que se voltea el flag.
4. **Un bucket a la vez**: se migra, se verifica y solo entonces se pasa al siguiente. Si algo falla, se vuelve el flag a `supabase`.
5. **Backfill en segundo plano**: copiar lo histórico no bloquea la operación; los archivos nuevos ya van a R2 mientras tanto.
6. **Sin tocar Supabase Auth/DB**: solo migra Storage.

---

## 3. Arquitectura objetivo

- **R2 vía API S3-compatible**: `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`. Endpoint `https://<accountid>.r2.cloudflarestorage.com`.
- **Capa de abstracción** `lib/storage/` con interfaz única (`put`, `getDownloadUrl`, `getUploadUrl`, `delete`, `publicUrl`) y un **proveedor seleccionable por bucket** mediante el flag. Todo el backend pasa por esta capa.
- **Subidas grandes**: **URL prefirmada PUT** → el navegador sube **directo a R2** (sin pasar por el serverless de Vercel; evita el límite de 4.5 MB y gana velocidad).
- **Servido público**: bucket R2 público atado a **`cdn.bitafly.com`** con CDN de Cloudflare en el borde.
- **Servido privado**: **URL prefirmada GET** (1h) — misma forma de respuesta que las signed URLs actuales.

---

## 4. Orden de migración (de menor a mayor riesgo)

| # | Bucket | Riesgo | Por qué ese orden |
|---|---|---|---|
| 1 | `flight-replays` | Bajo | Regenerables, privados, suben server-side → piloto ideal |
| 2 | `maintenance-docs` | Bajo-medio | Volumen bajo, subida cliente-directo (estrena `sign-upload`) |
| 3 | `company-manuals` | Medio | Subida server-side, archivos grandes |
| 4 | `documents` | **Alto** | Datos sensibles (cédulas, certificados) — máxima verificación |
| 5 | `fleet-images` | Medio | Público → estrena `cdn.bitafly.com` + resolver |
| 6 | `partner-logos` | Bajo | Público, poco volumen |
| 7 | `app-releases` | Medio | Público; **cuidado**: el endpoint OTA lee `apk_url` de la BD |

---

## 5. Micro-pasos por cada bucket (receta repetible)

Cada bucket se migra con esta secuencia (todos pasos pequeños y reversibles):

1. **Crear** el bucket en R2 (privado o público según corresponda) + CORS.
2. **Flag → `dual`**: el código empieza a **escribir en R2** y **leer R2 con fallback a Supabase**. (Los archivos nuevos ya viven en R2; los viejos siguen sirviéndose de Supabase.)
3. Si el bucket es de **subida cliente-directo**, activar la ruta `sign-upload` para ese bucket y cambiar el interior del componente correspondiente.
4. **Backfill** del histórico de ese bucket (script copia objetos Supabase → R2, mismas keys).
5. **Verificar**: subir, descargar y abrir muestras (incluye un objeto viejo y uno nuevo).
6. **Flag → `r2`**: se desactiva el fallback (todo el bucket vive en R2).
7. **Decomisionar** ese bucket en Supabase (al final, tras confirmar estabilidad).

> En cualquier punto, volver el flag a `supabase`/`dual` restablece el estado anterior sin downtime.

---

## 6. Fases del proyecto (pasos pequeños, sin dejar la página inhabilitada)

### Fase 0 — Preparación (cero impacto en runtime)
- Crear buckets en R2 y el dominio público **`cdn.bitafly.com`** (custom domain de R2).
- Configurar **CORS** de R2 para `PUT`/`GET` desde `https://bitafly.com`.
- Agregar env vars (ver §8). Instalar `@aws-sdk/client-s3` + `s3-request-presigner`.
- **Resultado**: nada cambia en producción (flags en `supabase`).

### Fase 1 — Capa de abstracción detrás de flags (sin cambio visible) ✅ HECHA
- ✅ `lib/storage/index.js`: fachada única (`storagePut`, `storageSignedUrl`, `storageUploadUrl`, `storagePublicUrl`, `storageRemove`, `storageDownload`) con modo por bucket (`supabase`/`dual`/`r2`) + lógica de fallback. SDK `@aws-sdk/client-s3` + `s3-request-presigner` instalado.
- ✅ Ruta `POST /api/storage/sign-upload` (dormida; valida sesión + prefijo `orgId/`; responde 409 si el bucket está en modo `supabase`).
- ✅ Cableados a la fachada **solo los puntos del bucket piloto `flight-replays`** (replay route, import-dji, logbook/[id]). **Los demás buckets se cablean en su propia fase** (decisión de seguridad: cada cambio pequeño y verificable, nunca un megacambio).
- **Resultado**: app idéntica (todos los flags en `supabase`); build OK. Deploy seguro.

> Nota: el refactor de los puntos de cada bucket NO se hace todo de golpe. Se realiza **dentro de la fase de ese bucket**, justo antes de voltear su flag — para minimizar el radio de impacto.

### Fase 2 — Piloto: `flight-replays` (bucket 1)
- Flag `flight-replays = dual`. Backfill de replays. Verificar GET/POST.
- Flag `flight-replays = r2`. (Replays son regenerables → riesgo mínimo.)
- **Resultado**: validamos toda la mecánica R2 con el bucket más seguro.

### Fase 3 — `maintenance-docs` (bucket 2) + estreno de subida prefirmada
- Activar `sign-upload` para este bucket; actualizar el **interior** de `AddMaintenancePanel.js` (mismos props).
- Flag `dual` → backfill → verificar → `r2`.

### Fase 4 — `company-manuals` (bucket 3)
- Subida server-side (`manualStorage.js`) → `storage.put`. Download → prefirmada R2.
- Flag `dual` → backfill → verificar → `r2`.

### Fase 5 — `documents` (bucket 4) — máxima verificación
- `FileUpload.js` por dentro usa `sign-upload`. `documents/open` presigna en R2.
- Flag `dual` → backfill → **verificación reforzada** (aislamiento por org, acceso denegado cruzado) → `r2`.

### Fase 6 — `fleet-images` (bucket 5) — estrena CDN público
- `FleetImageUpload.js` por dentro sube a R2 y devuelve URL `cdn.bitafly.com`.
- `AircraftCard.resolveImg` reconoce URLs de R2 **y** las legacy de Supabase.
- Backfill → (opcional) reescribir URLs en BD a `cdn.bitafly.com` → verificar.

### Fase 7 — `partner-logos` (bucket 6) y `app-releases` (bucket 7)
- Mismo patrón público. En `app-releases`: backfill del APK y **actualizar `apk_url`** en la tabla `app_releases` a la URL `cdn.bitafly.com` (el endpoint OTA seguirá devolviendo la misma forma).

### Fase 8 — Limpieza
- Quitar el fallback a Supabase y los flags. Decomisionar los buckets de Supabase Storage.

---

## 7. Seguridad (R2 no tiene RLS — el control pasa a la API)

- La RLS de Supabase aislaba por carpeta `{orgId}/`. Ahora la ruta **`sign-upload`** exige sesión y **fuerza** que la key empiece por el `orgId` del usuario, restringe content-type y tamaño en la URL prefirmada.
- Los endpoints de servido privado siguen validando que el path pertenezca a la org (igual que `documents/open` hoy).
- Las URLs prefirmadas son de **corta duración** (subida ~5 min, descarga 1h).
- **CORS** de R2 restringido al dominio de la app.

---

## 8. Variables de entorno (Vercel)

```
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
R2_PUBLIC_BASE_URL=https://cdn.bitafly.com
# Flags por bucket: supabase | dual | r2
STORAGE_MODE_FLIGHT_REPLAYS=supabase
STORAGE_MODE_MAINTENANCE_DOCS=supabase
STORAGE_MODE_COMPANY_MANUALS=supabase
STORAGE_MODE_DOCUMENTS=supabase
STORAGE_MODE_FLEET_IMAGES=supabase
STORAGE_MODE_PARTNER_LOGOS=supabase
STORAGE_MODE_APP_RELEASES=supabase
```

Supabase **Auth + DB se quedan**; solo migra Storage.

---

## 9. Cambios por archivo (referencia)

| Archivo | Qué cambia | ¿Frontend? |
|---|---|---|
| `lib/storage/*` (nuevo) | Capa R2 + selector por flag | No |
| `documents/open`, replay `GET`, manuals `download`, maintenance | Presignar en R2 (misma respuesta) | No |
| replay `POST`, `manualStorage.js`, `public/upload`, `socio/logo` | `admin.storage.upload` → `storage.put` | No |
| `POST /api/storage/sign-upload` (nuevo) | URL prefirmada PUT + valida prefijo `orgId/` | No |
| `FileUpload.js`, `FleetImageUpload.js`, `AddMaintenancePanel.js` | Interior: pedir prefirmada → `PUT` a R2 (mismos props/salida) | Solo interno |
| `docUrl.js`, `AircraftCard.resolveImg` | Reconocer también URLs R2 (mantiene legacy) | Mínimo |

---

## 10. Velocidad — por qué mejora

1. **Egress $0** en R2 (su gran ventaja de costo).
2. **CDN de Cloudflare** para públicos vía `cdn.bitafly.com` (cacheado en el borde).
3. **Subidas/descargas directas navegador↔R2** (prefirmadas), sin salto por el serverless.
4. **Sin límite de 4.5 MB** de body en Vercel → archivos de vuelo grandes sin trabas.

---

## 11. Riesgos y prerrequisitos

- **DNS en Cloudflare**: para atar `cdn.bitafly.com` como custom domain de R2, la zona `bitafly.com` debe estar gestionada en Cloudflare. Si hoy el DNS está en Vercel u otro, hay que **crear la zona en Cloudflare** o delegar el subdominio. *(No afecta a `bitafly.com` en Vercel; solo el subdominio `cdn`.)*
- **CDN puede cachear** públicos hasta su TTL — al reemplazar una imagen, usar key nueva (ya se hace con timestamp).
- **OTA**: al migrar `app-releases`, actualizar `apk_url` en BD; el endpoint `GET /api/app/version` mantiene su forma.
- **Backfill grande**: correrlo por lotes y de forma idempotente (reintenta sin duplicar).
- **HEIC** (fleet): R2 los almacena igual; el render es asunto del navegador (sin cambios).

---

## 12. Próximo paso

Cuando se autorice ejecutar, se arranca por la **Fase 0** (provisión + capa, cero impacto) y luego la **Fase 1**. La primera migración real de datos es la **Fase 2 (`flight-replays`)**, el bucket más seguro, para validar todo el flujo antes de tocar `documents`.
