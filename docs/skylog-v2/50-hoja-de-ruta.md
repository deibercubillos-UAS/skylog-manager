# Hoja de ruta

[← Índice maestro](00-INDICE.md) · [Reglas](01-reglas.md)

> Migrado desde `../plan-bitafly-v2.md` el 2026-08-22 al partir ese documento por la regla de 500 líneas (D1).

---

## 0. Restricción dura y modo de trabajo

El usuario fijó una restricción no negociable:

> "no quiero tocar la rama main ni las funciones de producción de ningún programa, todo debe
> trabajarse en desarrollo y no tocar ninguna interfaz que funciona actualmente."

Esto no es un detalle de proceso — condiciona la arquitectura completa. BitaFly hoy es un SaaS
**en vivo, con pagos reales de ePayco y 17 organizaciones clientes**. Un rediseño de este tamaño
sobre la misma rama y la misma base de datos rompería producción con certeza, no con
probabilidad.

### 0.1 Aislamiento en 4 capas

| Capa | Producción (intocable) | Desarrollo v2 |
|---|---|---|
| **Git** | `main` | Rama larga `develop-v2`, nunca mergeada hasta sign-off explícito |
| **Base de datos** | Proyecto Supabase actual | **Supabase branch** dedicado (`supabase branches`) — copia del esquema, datos de prueba propios |
| **Deploy** | Proyecto Vercel `skylog-manager` → `bitafly.com` | Proyecto Vercel separado (`bitafly-v2`) apuntando al Supabase branch |
| **Código** | `src/app/dashboard/**` actual | Route group nuevo `src/app/(v2)/**` — rutas que en producción **no existen** porque la rama no se mergea |

**Regla operativa #1**: ninguna migración SQL se aplica al proyecto Supabase de producción
durante toda la fase v2. Todas van al branch. El día del merge se replican en orden, con
respaldo previo.

**Regla operativa #2**: ningún archivo bajo `src/app/dashboard/`, `src/app/api/` o
`src/components/` que hoy sirva una pantalla en funcionamiento se **modifica**. Si v2 necesita
una variante, se crea un archivo nuevo. La única excepción admisible son adiciones puramente
aditivas y opcionales (una columna nullable, un campo nuevo en una respuesta JSON que nadie lee
todavía) — y aun esas se difieren al final.

**Regla operativa #3**: cuando llegue el merge, no se hace "de golpe". Se activa por
organización con un feature flag (`organizations.feature_flags jsonb`), empezando por la
organización de pruebas de QA que ya existe en producción
(`BitaFly QA - Organización de Prueba`, ver `docs/plan-qa-completa-bitafly.md`).

### 0.2 Por qué una rama larga y no fases mergeadas a main

El patrón habitual del proyecto (fase corta → PR → merge a `main`) fue correcto para el refactor
multi-organización, porque ahí cada fase era compatible hacia atrás y verificable en producción.
Aquí no aplica: el rediseño de frontend y el módulo C2 no tienen un estado intermedio
"funciona igual que antes pero mejor". Se mergea cuando está completo y probado, o no se mergea.

---

---

## 2. Los cinco frentes de trabajo

Los cuatro que pidió el usuario, más uno que la norma impone.

| Frente | Origen | Riesgo técnico | Valor regulatorio |
|---|---|---|---|
| **F1 — Rediseño de frontend y distribución** | Usuario | Bajo | Indirecto |
| **F2-a — Comando y Control, vía RC + Pilot 2** | Usuario + B6/B7/B8 | **Medio** — bajó tras validar que la integración con Pilot 2 es una página web, no una app nativa (§4.2) | Muy alto (habilita categoría específica) |
| **F2-b — C2 con Docks en FlightHub 2** | Usuario | ⏸ **Diferida** — sin verificación posible hoy (§4.5, V2) | Alto, pero no bloquea cumplimiento |
| **F3 — SMS fácil de integrar y aplicar** | Usuario + B3 | Medio | Alto |
| **F4 — Autorizaciones Aerocivil automáticas** | Usuario + B9/B10 | **Alto** (dependencia externa) | Alto |
| **F5 — Tiempos de servicio, vuelo y descanso** | **Norma (B1/B2)** | Bajo | **Crítico — hoy incumplido** |

---

---

## 12. Cómo queda el plan

Estado consolidado tras resolver las decisiones 1–4 y las verificaciones V1/V2/V3.

### 12.1 Orden recomendado

El orden **no** es el de la lista original, y cada posición tiene una razón.

#### Fase 0 — Cimientos (antes de cualquier frente)

Rama `develop-v2` · Supabase branch · proyecto Vercel de preview · `packages/ui` con tokens y
primitivas · Vitest sobre `packages/domain`. Sin esto, cada frente reinventa el andamiaje y el
rediseño llega tarde a módulos ya construidos.

#### Los frentes

| # | Frente | Por qué va aquí |
|---|---|---|
| **1º** | **F5 — Tiempos de servicio, vuelo y descanso** | Es un **incumplimiento actual** de norma vigente (100.540). Es además el frente más pequeño: valida los cimientos de la Fase 0 con algo acotado y de alto valor regulatorio, antes de arriesgar nada grande |
| **2º** | **F4a — Expediente Aerocivil listo para radicar** | Sube de posición. Es autónomo, de valor visible e inmediato para el cliente (le ahorra trabajo manual en **cada** misión), y **F4b depende de que 4a exista y esté rodado**. Ponerlo temprano le da a 4b el tiempo de maduración que necesita |
| **3º** | **F3 — SMS fácil de aplicar** | Alto valor, sin dependencias externas. Su pieza clave —"eventos operacionales → borradores de reporte SMS"— se beneficia de que F5 ya exista: el exceso de tiempo de servicio es una de las fuentes de evento (§5.4) |
| **4º** | **F2-a — Comando y Control (RC + Pilot 2)** | El diferenciador comercial. Va cuarto por una razón concreta: los tres anteriores **no tienen ningún riesgo externo**, y F2-a sí depende de validar la licencia contra un RC real (P1). Arrancarlo aquí deja resolver esa validación en paralelo sin bloquear el avance |
| **5º** | **F1 — Rediseño y distribución** | Al final **a propósito**. Para cuando llegue, el mapa de módulos ya incluirá los cuatro módulos nuevos (tiempos de servicio, expediente Aerocivil, C2, SMS reformado). Rediseñar antes obligaría a rehacerlo.<br><br>**Excepción importante**: `packages/ui` arranca en la Fase 0 y crece con cada frente, así **cada módulo nuevo nace ya con el sistema de diseño**. F1 entonces no es "rediseñar todo desde cero", es "reorganizar la navegación en los 4 espacios y aplicar el sistema al resto de la app" — mucho más barato |
| **6º** | **F4b — Radicación automática ante la Plataforma UAS Colombia** | Último por ser el de **mayor riesgo de responsabilidad** de todo el plan (custodia de credenciales ante una autoridad estatal). Necesita que F4a lleve tiempo estable y que el expediente ya sea confiable antes de automatizar su envío |
| **⏸** | **F2-b — C2 con Docks en FlightHub 2** | Sin cronograma hasta poder verificar P2 |

#### La alternativa, si la prioridad es comercial

Adelantar **F2-a al 2º lugar** es viable ahora que está validado técnicamente. El costo real de
hacerlo: (a) se asume el riesgo de P1 antes de tener los cimientos rodados, y (b) F1 tendría que
acomodar después una pantalla de C2 ya construida, en vez de que nazca con el sistema de diseño.

Es un intercambio legítimo — velocidad al mercado a cambio de algo de retrabajo. Mi
recomendación es el orden de arriba, pero si C2 es la palanca de venta que necesitas para el
salto Escuadrilla → Flota, adelantarlo no rompe nada.

### 12.2 Decisiones técnicas ya cerradas

| Tema | Decisión | Fundamento |
|---|---|---|
| Integración con DJI | **Cloud API vía Pilot 2**, como página web en el portal "Open Platforms" | No requiere app nativa (§4.2) |
| Telemetría | MQTT a **0,5 Hz**; los 9 campos de 100.415(a)(2)(iii) existen todos | Mapeo campo por campo (§4.4) |
| Persistencia | 0,5 Hz → Postgres (12 meses) · traza completa → R2 comprimida · eventos → Postgres siempre | Reutiliza el patrón ya probado del Replay GPS (§4.8) |
| Servidor de medios | **MediaMTX co-ubicado con `c2-gateway`** — corregido, ver §15.2. Amazon IVS documentado como salida si la flota crece | Cloudflare Stream descartada por protocolo (§4.11); AWS no se abre, cero cuentas nuevas (§15.3) |
| Proveedores | Vercel + Supabase + Cloudflare + Resend + ePayco + Railway. **Ninguno nuevo** | Migrar R2 a S3 sería ~27× más caro en egress (§15.1) |
| Retención documental | **Registros operacionales 5 años en todos los planes.** Replay y video conservan su retención por plan | La obligación de 100.535(a)(29) es **documental**, no de replay (§8.5) |
| Dock | **No se interviene.** Sigue en FlightHub 2 | Un Dock se vincula a una sola nube a la vez (§4.5) |
| Drones de consumo | Fuera de alcance (DJI Mobile SDK no se construye) | Coherente con limitar C2 a Flota/Enterprise (§4.6) |
| Control del dron | **BitaFly nunca envía comandos de vuelo** | Decisión de producto y responsabilidad (§4.10) |
| Habilitación por plan | `commandAndControl` en `PLAN_CONFIG`, solo Flota y Enterprise, con gate también en la API | Convención ya establecida (§8.6) |

### 12.3 Lo que sigue abierto

- **Decisión 5** — retención de 5 años vs. planes (§11.2).
- **Decisión 6** — si se compromete F4b.
- **Decisión 7** — si se mantiene este orden o la prioridad comercial exige adelantar F2-a como
  diferenciador de venta. Con F2-a ya validado técnicamente, adelantarlo es viable; el costo es
  que el rediseño (F1) tendría que acomodar después una pantalla que ya existe.
- **V1 funcional** — validar `platformVerifyLicense` contra un RC real. Requiere hardware, no se
  puede hacer desde aquí.

### 12.4 Puertas de verificación

Cada frente termina en una puerta contra el **Supabase branch** y el deploy de preview, con
criterios de aceptación escritos **antes** de empezar a construir. Ninguno se mergea a `main`
hasta el sign-off final. El aislamiento de §0 se mantiene íntegro durante todo el recorrido.

---

---

## 13. Qué NO está en este plan (a propósito)

Para que el alcance sea honesto:

- **No** enviar comandos de vuelo al dron — ni por RC ni por Dock (§4.10).
- **No** intervenir el Dock ni desplazar a FlightHub 2: BitaFly se conecta aguas abajo, como consumidor de datos (§4.5).
- **No** soportar drones de consumo en C2 (DJI Mobile SDK fuera de alcance, §4.6) — consistente con limitar C2 a planes superiores a Escuadrilla.
- **No** migrar a TypeScript de forma completa (§9.4).
- **No** tests de UI ni de las 181 rutas API (§9.3).
- **No** rehacer el landing público, las páginas SEO ni el Panel Socio — funcionan y están fuera
  del "interior de la app" que se pidió mejorar.
- **No** tocar el flujo de pagos ePayco. Es lo más sensible de producción y no lo pide ninguno
  de los cinco frentes.
- **No** resolver las 4 páginas huérfanas heredadas — se decidirán durante F1, cuando el mapa
  nuevo diga si tienen lugar o se eliminan.
- **No** migrar Cloudflare R2 a AWS S3 — sería ~27× más caro en egress y desharía la fase F8 ya
  completada (§15.1).
- **No** abrir cuenta en AWS: MediaMTX se co-ubica con `c2-gateway` (§15.2).
- **No** arreglar aquí el problema de bundle de `reportGenerators.js` (§15.4 H1) — es código de
  producción y este plan es de desarrollo aislado. Se documenta para decidirlo aparte.

---
