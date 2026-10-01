# Infraestructura, costos y velocidad de carga

[← Índice maestro](00-INDICE.md) · [Reglas](01-reglas.md)

> Migrado desde `../plan-bitafly-v2.md` el 2026-08-22 al partir ese documento por la regla de 500 líneas (D1).

---

## 15. Infraestructura — ¿se puede simplificar? (2026-08-22)

Pregunta del usuario: *"verifica si es viable mantener todas esas cuentas, o puedo suprimir
Cloudflare y migrar todo a Amazon (evalúa siempre costos), o si puedo optimizar velocidades de
carga suprimiendo algo."*

### 15.1 Migrar de Cloudflare R2 a AWS S3 — **no conviene, por un margen muy amplio**

La diferencia decisiva es una sola línea de la tabla de precios: **R2 no cobra egress. S3 sí.**

| | Cloudflare R2 | AWS S3 + CloudFront |
|---|---|---|
| Almacenamiento | $0,015 / GB-mes | $0,023 / GB-mes |
| **Egress** | **$0 — gratis, sin límite** | **~$0,085–0,09 / GB** |
| Nivel gratuito | 10 GB-mes + 1 M Class A + 10 M Class B | 100 GB egress/mes |

Escenario conservador para BitaFly (100 GB almacenados, 500 GB de egress al mes entre imágenes
de flota por CDN, manuales de hasta 25 MB, APKs de hasta 100 MB, documentos y replays):

| | Costo mensual |
|---|---|
| **R2** | (100 − 10) × $0,015 = **$1,35** · egress **$0** → **≈ $1,35** |
| **S3 + CloudFront** | 100 × $0,023 = $2,30 · egress (500 − 100) × $0,085 = $34 → **≈ $36** |

**≈ 27× más caro, y la brecha crece linealmente con el tráfico.** BitaFly es una aplicación que
sirve archivos: cuanto más crece, peor es la migración.

A eso se suma un argumento no económico: **la migración a R2 ya se hizo y funciona.** La fase F8
(junio 2026) movió los 7 buckets, resolvió las políticas CORS por bucket, el *gotcha* del
checksum CRC32 del AWS SDK y montó 3 dominios CDN (`cdn`, `logos`, `releases`). Deshacer eso es
tirar trabajo terminado y reintroducir problemas ya resueltos.

**Veredicto: Cloudflare se queda. Es el proveedor que más dinero ahorra de todo el stack.**

### 15.2 Corrección: tampoco hace falta abrir cuenta en AWS

En §4.11 recomendé **Amazon IVS** para el servidor de medios, priorizando estabilidad sobre un
sobrecosto de $20–50/mes. Con la restricción nueva que planteas —minimizar cuentas— **esa
recomendación cambia**, y los argumentos que la sostenían pierden fuerza:

| Argumento original a favor de IVS | Por qué ya no pesa igual |
|---|---|
| "Evita operar un servidor de medios" | **Ya vamos a operar un servicio siempre encendido igual** (`c2-gateway`, para MQTT). MediaMTX es un binario Go / contenedor que corre **en el mismo despliegue**. No es un servidor nuevo: es un contenedor más en algo que ya existe |
| "MediaMTX es un punto único de falla" | `c2-gateway` **ya es** punto único de falla para C2. Si cae, la telemetría cae igual. Poner el video en el mismo dominio de falla no agrega un modo de falla nuevo — hace que C2 falle como una unidad, más simple de monitorear |
| "IVS trae CDN global" | Los espectadores están **en Colombia, en la misma organización que el piloto**, con 1–3 concurrentes. La ventaja de una CDN global es marginal aquí |
| Costo | IVS ≈ **$69/mes y creciendo con las horas de vuelo**. MediaMTX ≈ **$0 adicional** (mismo runtime que ya se paga) |

**Recomendación corregida: MediaMTX co-ubicado con `c2-gateway`.** Y sigue siendo reversible: si
la flota crece hasta hacer pesada la operación, migrar a IVS es cambiar la cadena de la URL que
se envía por MQTT (§4.11). IVS queda documentado como salida, no como punto de partida.

### 15.3 Cuentas resultantes — cero nuevas

| Servicio | Rol | Veredicto |
|---|---|---|
| **Vercel** | Hosting Next.js, funciones serverless | Se queda |
| **Supabase** | Postgres, Auth, RLS, Realtime, pg_cron | Se queda |
| **Cloudflare** | R2 (7 buckets) + DNS + 3 dominios CDN | **Se queda** — el que más ahorra (§15.1) |
| **Resend** | Correo transaccional | Se queda |
| **ePayco** | Pagos (obligatorio en Colombia) | Se queda |
| **Railway** | Hoy `railway-robot`. Pasaría a alojar además `c2-gateway` + MediaMTX + `aerocivil-agent` | Se **consolida**: 1 cuenta, 3 servicios |
| ~~**AWS**~~ | — | **No se abre** (§15.2) |

**Todo v2 se construye sin abrir una sola cuenta nueva.** El único cambio es que Railway pasa de
alojar un servicio a alojar tres.

### 15.4 Optimización de velocidad de carga — hallazgos reales

#### ⚠️ H1 — Un problema de rendimiento real, verificado, en producción

`src/lib/reportGenerators.js` importa **estáticamente** en sus tres primeras líneas:

```js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
```

Y **dos archivos de cliente lo importan estáticamente**:

- `src/app/dashboard/logbook/page.js:9` → **la Bitácora**, una de las páginas más usadas de toda
  la aplicación.
- `src/components/suppliers/SupplierDetailPanel.js:4`

Consecuencia: esas pantallas envían al navegador **exceljs (925 KB minificado) + jsPDF +
jspdf-autotable** en la carga inicial, aunque el usuario nunca pida un reporte. Más de **1 MB de
JavaScript inútil** en la ruta crítica.

Lo revelador es que **el patrón correcto ya existe en el proyecto**: los otros cinco sitios que
usan estas librerías lo hacen bien, con `await import(...)` —
`dashboard/reports/page.js`, `dashboard/maintenance/page.js`, `ExportActions.js`,
`FlightPlanner.js`, `AerocivilForm.js`, `flightPlanDocs.js`, `manualActaPdf.js`. Estos dos son
la excepción, no la regla.

Arreglo: convertir esas dos importaciones al mismo patrón dinámico. Es un cambio de dos líneas
con impacto medible en la página más transitada del producto.

> **No se aplica ahora**: es código de producción y estamos en planeación (§0, regla operativa
> #2). Queda documentado para que lo decidas — es de los pocos casos donde el arreglo es tan
> pequeño y el beneficio tan claro que podría justificar un PR aparte, fuera de v2.

#### ⚠️ H2 — Cloudflare parece estar delante de Vercel (doble CDN)

Evidencia documental: el incidente de precios desactualizados de agosto 2026 registró **ambas**
cabeceras — `cf-cache-status: DYNAMIC` **y** `x-vercel-cache: MISS`. Eso solo ocurre si
Cloudflare proxea (nube naranja) delante de Vercel.

Vercel **ya tiene su propia CDN global**. Ponerle Cloudflare delante añade un salto de red y
crea una segunda capa de caché — que es exactamente lo que hizo tan difícil diagnosticar aquel
incidente: hubo que descartar caché del navegador, de Cloudflare y de Vercel, una por una.

Evaluar poner `bitafly.com` en modo **solo DNS** (nube gris), **manteniendo Cloudflare para R2 y
los tres subdominios CDN**, que sí aportan valor real y gratuito. No se puede confirmar desde
este entorno (la política de red bloquea `bitafly.com`) → **pendiente P3**.

#### H3 — `demo-bitafly-enterprise` duplica el tiempo de CI

Cada push construye **dos** proyectos de Vercel, incluso cuando el cambio es solo documentación
(visible en este mismo PR). Si el demo no cambia, sacarlo del repositorio o desactivar sus
builds automáticos reduce a la mitad el tiempo de CI de cada push. Coincide con la deuda de
monorepo ya documentada en la limpieza de agosto 2026.

#### H4 — Un bucket todavía fuera de R2

`vor-mor-attachments` sigue en Supabase Storage (decisión consciente de julio 2026, los adjuntos
pesan poco). Consolidarlo en R2 elimina un sistema de almacenamiento del stack. Impacto bajo,
pero es simplificación real y encaja bien con F1.

#### H5 — Cuatro sistemas de analítica conviviendo

Vercel Analytics + Vercel Speed Insights + Google Tag Manager/Analytics + Microsoft Clarity.
GTM/GA/Clarity ya están correctamente detrás del consentimiento de cookies; Vercel Analytics y
Speed Insights cargan siempre y se solapan parcialmente con GA. Evaluar quedarse con uno de los
dos conjuntos.

#### ✅ H6 — Un pendiente antiguo que ya está resuelto

La auditoría de julio 2026 dejó abierto **M5**: subir el runtime a Node ≥22 antes de enero 2027,
porque el AWS SDK lo exigiría. Ya está hecho — `package.json` declara `"node": "22.x"` y el
proyecto de Vercel reporta `nodeVersion: 22.x`. Se puede tachar de la lista de pendientes.

---

*Documento vivo. Se actualiza al cerrar cada decisión de §11 y al completar cada frente.*
*Última actualización: 2026-08-22 — auditoría del modelo de datos (§16) y cambio de postura a reconstrucción del esquema desde cero.*

---
