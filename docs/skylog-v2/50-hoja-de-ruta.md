# Hoja de ruta y ciclo de trabajo

[← Índice maestro](00-INDICE.md) · [Reglas](01-reglas.md)

> Reorganizado el 2026-08-22 alrededor del **ciclo de proyecto**. La versión anterior heredaba
> la numeración del documento monolítico del que se partió (§0, §2, §12, §13) y ya no se leía
> como un plan ejecutable.

---

## 1 · La restricción que condiciona todo

> *"no quiero tocar la rama main ni las funciones de producción de ningún programa, todo debe
> trabajarse en desarrollo y no tocar ninguna interfaz que funciona actualmente."*

BitaFly es un SaaS **en vivo, con pagos reales y 17 organizaciones clientes**. No es una
preferencia de proceso: un rediseño de este tamaño sobre la misma rama y la misma base de datos
rompe producción con certeza, no con probabilidad.

### Aislamiento en cuatro capas

| Capa | Producción (intocable) | Desarrollo v2 |
|---|---|---|
| **Git** | `main` | Rama larga `develop-v2`, nunca mergeada hasta sign-off explícito |
| **Base de datos** | Proyecto Supabase actual | **Supabase branch** dedicado — copia del esquema, datos de prueba propios |
| **Deploy** | Proyecto Vercel `skylog-manager` → `bitafly.com` | Proyecto Vercel separado apuntando al Supabase branch |
| **Código** | `src/app/dashboard/**` actual | Route group nuevo `src/app/(v2)/**` — rutas que en producción **no existen** |

**O1** · Ninguna migración SQL toca el proyecto Supabase de producción durante toda la fase v2.
Todas van al branch. El día del merge se replican en orden, con respaldo previo.

**O2** · Ningún archivo que hoy sirva una pantalla en funcionamiento se **modifica**. Si v2
necesita una variante, se crea un archivo nuevo.

**O3** · El merge no se hace "de golpe": se activa por organización con un feature flag,
empezando por `BitaFly QA - Organización de Prueba`, que ya existe en producción.

**Por qué una rama larga y no fases mergeadas.** El patrón habitual del proyecto (fase corta →
PR → merge) funcionó para el refactor multi-organización porque cada fase era compatible hacia
atrás. Aquí no aplica: el rediseño de frontend y el módulo C2 no tienen un estado intermedio
"funciona igual que antes pero mejor". Se mergea completo y probado, o no se mergea.

---

## 2 · El principio transversal: la norma es el punto de partida, no la camisa de fuerza

Decisión del usuario, 2026-08-22:

> *"recuerda que el usuario debe poder configurar todo según lo tengan en sus manuales"*
> · *"Se ajusta según necesidades del cliente"*

Es la regla de diseño más importante de todo el proyecto y **la propia norma la respalda**. La
circular MAUT-5.0-22-017, al presentar el análisis GAP del Apéndice 1, dice literalmente que
*"puede utilizarse como modelo… y puede ser **personalizado** por el explotador UAS"*.

Consecuencia concreta para todo lo que se construya:

| Se modela como | No se modela como |
|---|---|
| **Plantilla oficial precargada**, que el cliente adopta tal cual o edita | Catálogo fijo, incrustado en el código |
| **Recomendación** con explicación de por qué | Obligación que el sistema impone |
| Estructura del formato oficial (lo que se **radica** ante la autoridad) — eso sí es fijo | Contenido del procedimiento interno del cliente |

La línea divisoria es limpia: **lo que sale hacia la Aerocivil conserva su formato exacto**
(el Excel de SPI, el análisis de riesgos por autorización, el reporte operacional mensual);
**lo que vive dentro de la organización es del cliente** y él lo configura según su manual.

Las listas de verificación oficiales ([`14-listas-verificacion.md`](14-listas-verificacion.md),
[`15-evaluacion-sms.md`](15-evaluacion-sms.md)) se leen bajo esta regla: nos dicen **qué ítems
son trascendentes** y qué evidencia pide un inspector. No se convierten en una rúbrica rígida
que el cliente deba obedecer.

---

## 3 · El ciclo de trabajo de cada frente

Todo frente recorre las mismas seis etapas. El ciclo es el mismo para F1…F5, cambia el contenido.

```
 ①  Entidades      ②  Diseño        ③  Construcción    ④  Verificación   ⑤  Documentación   ⑥  Puerta
    qué existe        cómo se           en la rama          contra el         se cierra el       criterios
    en el negocio     modela            aislada             branch            documento          escritos
                                                                              del frente         de antemano
```

| Etapa | Qué produce | Dónde queda |
|---|---|---|
| **① Entidades** | Inventario de las entidades reales que el frente toca, con sus reglas | [`30-entidades.md`](30-entidades.md) |
| **② Diseño** | Esquema de datos, RLS, contratos de API, pantallas | `31`, `33`, `34`, `35` y el doc del módulo (`40`–`43`) |
| **③ Construcción** | Código en `develop-v2`, migraciones en el Supabase branch | Rama aislada |
| **④ Verificación** | Pruebas sobre la capa de dominio + recorrido manual en el preview | Registro en el doc del frente |
| **⑤ Documentación** | El documento del módulo pasa de 🔄/⬜ a ✅ | `00-INDICE.md` |
| **⑥ Puerta** | Sign-off contra criterios escritos **antes** de construir | [`51-bitacora.md`](51-bitacora.md) |

**Regla del ciclo**: los criterios de aceptación de la etapa ⑥ se escriben durante la etapa ②,
nunca al final. Un criterio redactado después de ver el resultado no verifica nada.

**Regla de la etapa ①**: ningún frente empieza a diseñarse sin que sus entidades estén
inventariadas. Es lo que faltó en la plataforma actual y por lo que hoy hay `profiles` y
`pilots` compartiendo doce columnas con datos divergentes
([`20-auditoria-datos.md`](20-auditoria-datos.md)).

---

## 4 · Los frentes

Los cuatro que pidió el usuario, más uno que la norma impone.

| Frente | Origen | Riesgo técnico | Valor regulatorio |
|---|---|---|---|
| **F1** — Rediseño de frontend y distribución | Usuario | Bajo | Indirecto |
| **F3** — SMS fácil de integrar y aplicar | Usuario + B3 | Medio | Alto |
| **F4** — Autorizaciones Aerocivil | Usuario + B9/B10 | Alto (dependencia externa) | Alto |
| **F5** — Tiempos de servicio, vuelo y descanso | **Norma (B1/B2)** | Bajo | **Crítico — hoy incumplido** |
| ~~**F2**~~ — Comando y Control | Usuario + B6/B7/B8 | — | ⏸ **Omitido por ahora** (decisión 20) |

> ### F2 — Comando y Control: omitido por ahora (2026-08-22)
>
> *"Omite el C2, por el momento."*
>
> Salen del plan **F2-a** (vía RC + Pilot 2) y **F2-b** (Docks / FlightHub 2). El trabajo técnico
> ya hecho **no se borra**: [`42-comando-control.md`](42-comando-control.md) queda como referencia
> lista para retomarse, con la integración DJI validada contra la documentación oficial.
>
> **Lo que se libera**: desaparece el único bloqueante del plan (conseguir `MAUT-5.0-22-016`),
> desaparece el riesgo de validar la licencia contra un RC real, y no hace falta levantar
> `c2-gateway` ni MediaMTX — la infraestructura se queda exactamente como está hoy.
>
> **Lo que queda sin cerrar, y conviene tenerlo presente**: las brechas **B6, B7 y B8** de
> [`11-rac100-uas.md`](11-rac100-uas.md) siguen abiertas. B6 (`100.415(a)(2)(iii)`) y B8
> (Apéndice 2, enlace C2) aplican a toda operación; **B7 (`100.440(a)(12)`) solo muerde si el
> cliente opera BVLOS**, porque exige un sistema de gestión de vuelo con geocercas y telemetría
> en todas las fases. Mientras la base de clientes sea VLOS/EVLOS, omitir C2 no impide operar;
> el día que alguien certifique BVLOS, B7 vuelve a ser bloqueante.

### Fase 0 — Cimientos, antes de cualquier frente

Rama `develop-v2` · Supabase branch · proyecto Vercel de preview · `packages/ui` con tokens y
primitivas · pruebas sobre `packages/domain` · **`30-entidades.md` completo**.

Sin esto cada frente reinventa el andamiaje, y el rediseño llega tarde a módulos ya construidos.

### Orden de ejecución

| # | Frente | Por qué va aquí |
|---|---|---|
| **1º** | **F5 — Tiempos de servicio** | Es un **incumplimiento actual** de norma vigente (100.540). Es además el frente más pequeño: valida los cimientos con algo acotado y de alto valor regulatorio antes de arriesgar nada grande |
| **2º** | **F4a — Expediente Aerocivil listo para radicar** | Autónomo, de valor inmediato (le ahorra trabajo manual en **cada** misión) y **F4b depende de que exista y esté rodado**. Ponerlo temprano le da a 4b su tiempo de maduración |
| **3º** | **F3 — SMS fácil de aplicar** | Alto valor, sin dependencias externas. Su pieza clave —eventos operacionales convertidos en borradores de reporte— se beneficia de que F5 ya exista: el exceso de tiempo de servicio es una fuente de evento |
| **4º** | **F1 — Rediseño y distribución** | Al final **a propósito**: para entonces el mapa de módulos ya incluye los tres nuevos. Rediseñar antes obligaría a rehacerlo.<br>**Excepción**: `packages/ui` arranca en Fase 0 y crece con cada frente, así **cada módulo nace ya con el sistema de diseño**. F1 no es "rediseñar desde cero" sino reorganizar la navegación y aplicar el sistema al resto |
| **5º** | **F4b — Radicación automática** | Último por ser el de **mayor riesgo de responsabilidad**: custodia de credenciales ante una autoridad estatal. Necesita que F4a lleve tiempo estable |
| **⏸** | **F2 — Comando y Control** | Omitido por ahora (decisión 20). Se retoma cuando el usuario lo decida |

Con C2 fuera, el plan queda **sin ningún frente que dependa de hardware, de una API de terceros
ni de un documento normativo que aún no tenemos**. Los cinco restantes se pueden ejecutar de
principio a fin con lo que ya está en la mano — es la consecuencia más útil de esta decisión.

---

## 5 · Decisiones cerradas

### Técnicas

| Tema | Decisión | Fundamento |
|---|---|---|
| Integración con DJI | **Cloud API vía Pilot 2**, como página web en el portal "Open Platforms" | No requiere app nativa · ⏸ **dormida**: aplica solo si se retoma C2 |
| Telemetría | MQTT a **0,5 Hz**; los 9 campos de 100.415(a)(2)(iii) existen todos | Mapeo campo por campo · ⏸ dormida |
| Persistencia | 0,5 Hz → Postgres (12 meses) · traza completa → R2 comprimida · eventos → Postgres siempre | Reutiliza el patrón del Replay GPS · ⏸ dormida |
| Servidor de medios | **MediaMTX co-ubicado con `c2-gateway`** | ⏸ **No se levanta**: sin C2 no hay video que retransmitir. La infraestructura se queda como está |
| Proveedores | Vercel + Supabase + Cloudflare + Resend + ePayco + Railway. **Ninguno nuevo** | Migrar R2 a S3 sería ~27× más caro en egress |
| Retención documental | Registros operacionales **5 años**; replay y video conservan su retención por plan, **salvo custodia por suceso** | 100.535(a)(29) es documental · ítem 34 de MAUT-5.0-12-095 impone la excepción |
| Dock | **No se interviene.** Sigue en FlightHub 2 | Un Dock se vincula a una sola nube a la vez · sigue vigente |
| Drones de consumo | Fuera de alcance (DJI Mobile SDK no se construye) | ⏸ dormida |
| Control del dron | **BitaFly nunca envía comandos de vuelo** | Decisión de producto y responsabilidad · se mantiene si C2 se retoma |
| Habilitación por plan | `commandAndControl` solo Flota y Enterprise, con gate también en la API | ⏸ dormida |

### De producto (2026-08-22)

| Tema | Decisión |
|---|---|
| Indicadores SPI | Los **11 oficiales UAS precargados** + el cliente puede agregar los suyos |
| Listas de verificación oficiales | **Insumo de diseño**, no rúbrica. Dicen qué es trascendente; el cliente configura según su manual |
| MOR / VOR | Los diligencia **cualquier persona**; el **Gerente SMS** es el asignado para análisis y toma de datos |
| Módulo Proveedores | **Se queda como está**. No se le agrega el aseguramiento de contratistas del SMS |
| Ejecutivo Responsable | **No** se construye acto de aceptación — ya vive en el manual del cliente |
| Gerente SMS | **Sí** se construye el expediente con **carga de archivos**, para tener el registro completo |
| Plan de respuesta ante emergencias | Diseñable **y editable por el cliente** |
| Currículo de instrucción SMS | Se ofrece como **recomendación**; el usuario escoge |
| Cultura Justa | **No la manejamos** — ya está en los manuales del cliente |
| RAC 114 | **No se toca por ahora** |

Detalle y trazabilidad de cada una en [`51-bitacora.md`](51-bitacora.md).

---

## 6 · Lo que sigue abierto

| # | Abierto | Naturaleza |
|---|---|---|
| A1 | Conseguir **MAUT-5.0-22-014 DI** (dronpuertos) y **MAUT-5.0-22-011** (guía CDO-U) | Deseable, no bloqueante |
| A2 | Cuándo se retoma **F2 — Comando y Control** | Decisión del usuario, sin fecha |

Con C2 omitido, **ningún frente activo tiene un abierto que lo bloquee**. Lo que antes eran
A1–A3 (validar la licencia contra un RC real, el alcance de FlightHub, conseguir
`MAUT-5.0-22-016`) quedó suspendido junto con el frente que lo necesitaba.

---

## 7 · Qué NO está en este plan, a propósito

- **No** construir Comando y Control por ahora (decisión 20) — y por tanto tampoco enviar
  comandos de vuelo, intervenir el Dock, ni soportar drones de consumo.
- **No** migrar a TypeScript de forma completa.
- **No** tests de UI ni de las 181 rutas API.
- **No** rehacer el landing público, las páginas SEO ni el Panel Socio — funcionan y están fuera
  del "interior de la app" que se pidió mejorar.
- **No** tocar el flujo de pagos ePayco. Es lo más sensible de producción y no lo pide ningún frente.
- **No** resolver las 4 páginas huérfanas heredadas — se decidirán durante F1.
- **No** migrar Cloudflare R2 a AWS S3, ni abrir cuenta en AWS.
- **No** arreglar aquí el problema de bundle de `reportGenerators.js` — es código de producción
  y este plan es de desarrollo aislado. Se documenta para decidirlo aparte.
- **No** construir un módulo de Cultura Justa, ni un acto de aceptación del Ejecutivo
  Responsable, ni extender Proveedores al aseguramiento del SMS — decisiones del 2026-08-22.

---

*Actualizado: 2026-08-22.*
