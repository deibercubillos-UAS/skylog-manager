# Skylog V2.0 — Reglas de trabajo

Reglas que gobiernan todo el proyecto. **Si algo en otro documento las contradice, mandan
estas.** Volver aquí antes de tomar cualquier decisión estructural.

[← Índice maestro](00-INDICE.md)

---

## 1 · Regla intocable: producción no se toca

> *"No deberá tocar nada de lo que funciona hoy de BitaFly. Si se requiere crear un panel de
> desarrollo y posterior migrar información de los clientes, se hará, pero no afectaremos la
> página principal nunca."*

**BitaFly en línea es un SaaS vivo, con pagos reales y clientes reales.** Skylog V2.0 se
construye completamente aparte.

| # | Regla | Consecuencia práctica |
|---|---|---|
| **R1** | **Nunca se hace merge a `main`** hasta que exista una decisión explícita del usuario | El trabajo vive en una rama larga propia |
| **R2** | **Cero migraciones SQL contra la base de producción** | Todo va a un **Supabase branch** dedicado |
| **R3** | **Ningún archivo que hoy sirve una pantalla en funcionamiento se modifica** | Si V2 necesita una variante, se crea un archivo nuevo |
| **R4** | **Panel de desarrollo separado** | Deploy propio, base propia, dominio propio. `bitafly.com` no se toca |
| **R5** | **La migración de clientes es un acto explícito y posterior** | Nunca automática, nunca silenciosa, siempre reversible |
| **R6** | Un bug encontrado en producción **se documenta, no se arregla aquí** | Si amerita arreglo, va en un PR aparte que el usuario aprueba por separado |

**Excepción única a R3**: adiciones puramente aditivas y opcionales (una columna nullable que
nadie lee todavía). Aun esas se difieren al final y se aprueban una por una.

---

## 2 · Reglas de documentación

| # | Regla |
|---|---|
| **D1** | **Ningún archivo `.md` supera las 500 líneas.** Al acercarse, se parte |
| **D2** | Al partir un documento: el nuevo se **registra en `00-INDICE.md`** y ambos se enlazan mutuamente |
| **D3** | Todo documento abre con un enlace de vuelta al índice |
| **D4** | Numeración por bloques: `0x` gobierno · `1x` normativa · `2x` diagnóstico · `3x` diseño · `4x` módulos · `5x` ejecución |
| **D5** | Un documento tiene **un solo tema**. Si empieza a mezclar, se parte aunque no llegue a 500 líneas |
| **D6** | Las decisiones se registran con **fecha y motivo**, no solo el resultado |

### Verificación del límite

```bash
find docs/skylog-v2 -name '*.md' -exec wc -l {} + | sort -rn | head
```

---

## 3 · Reglas de veracidad

Heredadas del proyecto y **no negociables** — son la razón por la que la plataforma es
defendible ante una auditoría.

| # | Regla |
|---|---|
| **V1** | **Nunca se fabrican datos operacionales.** Definiciones y plantillas sí; datos de vuelo, horas o eventos jamás |
| **V2** | Toda afirmación normativa cita **sección y documento**. Si viene de fuente secundaria, se marca `⚠️ VERIFICAR` |
| **V3** | Si un dato no existe, la interfaz **no lo inventa**: muestra que no existe |
| **V4** | Nada de **columnas derivadas**: los cálculos se hacen al leer |
| **V5** | Las limitaciones de verificación se **declaran explícitamente**, no se omiten |

---

## 4 · Reglas de diseño de datos

Nacen de la auditoría del modelo actual (`../plan-bitafly-v2.md` §16), donde se comprobó que
`profiles` y `pilots` comparten 12 columnas y **ya divergieron en producción** — 5 de 10
pilotos con teléfono distinto, 2 con vencimiento de certificado médico distinto.

| # | Regla |
|---|---|
| **E1** | **Un dato vive en un solo lugar.** Si dos tablas necesitan el mismo campo, una lo referencia |
| **E2** | **Una acción se pide una sola vez.** El logo se sube en Organización, y en ningún otro sitio |
| **E3** | Patrones repetidos se consolidan: un checklist genérico, un equipo con subtipos, un ciclo de vida de vuelo, un registro de eventos |
| **E4** | Toda tabla nace con RLS, `organization_id` y su política escrita en la misma migración |
| **E5** | **Función sin uso real no carga esquema.** De las 84 tablas actuales, 20 están vacías |
| **E6** | Toda migración vive en el repositorio. **Cero esquema creado a mano** en la consola |

---

## 5 · Reglas del SMS

Del RAC 219 `219.110`, que exige un sistema que **capte, almacene, agregue y permita el
análisis** de datos de seguridad operacional. Ver [`10-rac219-sms.md`](10-rac219-sms.md).

| # | Regla |
|---|---|
| **S1** | **Evidencia, no declaración.** El sistema demuestra el cumplimiento, no le pide al cliente que lo declare |
| **S2** | Lo que el sistema puede calcular, **no se le pide al usuario** |
| **S3** | **Ningún evento se convierte en reporte automáticamente.** El sistema propone, una persona confirma |
| **S4** | Los datos de seguridad operacional están **protegidos por norma** (`219.115`–`219.140`): acceso restringido, custodio identificado, divulgación reglada |

---

## 5b · Reglas de configurabilidad

Decisión del usuario (2026-08-22): *"el usuario debe poder configurar todo según lo tengan en
sus manuales"* · *"Se ajusta según necesidades del cliente"*. La propia norma lo respalda: la
circular MAUT-5.0-22-017 presenta su análisis GAP como un modelo que *"puede ser **personalizado**
por el explotador UAS"*.

| # | Regla |
|---|---|
| **C1** | **La norma se precarga, no se impone.** Todo catálogo normativo (indicadores, checklists, criterios, currículos) entra como **plantilla editable**, nunca incrustado en el código |
| **C2** | **Lo que se radica ante la autoridad conserva su formato exacto.** Ahí no hay configuración: el Excel de SPI, el análisis de riesgos por autorización y el reporte mensual salen como los pide la Aerocivil |
| **C3** | **Lo que vive dentro de la organización es del cliente.** Sus procedimientos, sus listas, su currículo, su plan de emergencias — el sistema los estructura, no los dicta |
| **C4** | Cuando la norma sugiere un contenido, se ofrece como **recomendación explicada**. El usuario decide si la adopta |
| **C5** | Un catálogo oficial siempre admite **entradas propias del cliente** junto a las precargadas, distinguibles entre sí |

> C2 y C3 son la misma línea vista desde los dos lados: **hacia afuera, formato fijo; hacia
> adentro, del cliente.** Confundirlas produce o un formato que la autoridad rechaza, o un
> sistema que le impone al cliente un procedimiento que no es el suyo.

## 6 · Reglas de verificación

| # | Regla |
|---|---|
| **Q1** | Cada fase cierra con una **puerta de verificación** y criterios escritos **antes** de construir |
| **Q2** | La lógica de negocio va en una capa pura **con pruebas**. Los límites numéricos de la norma no se verifican de memoria |
| **Q3** | `lint` + `build` limpios no son verificación suficiente para lógica regulatoria |
| **Q4** | Lo que no se pudo probar **se dice**, no se da por bueno |

---

## 7 · Nombres y confidencialidad

| | |
|---|---|
| **Nombre del proyecto** | **Skylog V2.0** — nombre interno, **de confidencialidad** |
| **Nombre del producto al salir** | **BitaFly.** La versión 2.0 se publica bajo la marca BitaFly |
| **Producto en producción hoy** | BitaFly. No se renombra nada |

**Regla N1**: mientras dure el desarrollo, toda referencia externa (repositorio, deploys de
prueba, documentación compartida) usa **Skylog V2.0**. La marca BitaFly no se asocia
públicamente a esta reconstrucción hasta el lanzamiento.

**Regla N2**: en el código, nada de nombres de marca acoplados. Módulos, tablas y rutas se
nombran por lo que **hacen**, no por la marca — para que el cambio de nombre sea de
configuración, no de refactor.

---

## 8 · Autorización de reestructuración total

> *"De ser necesario puedes reestructurar toda la página, recuerda que queremos mejorar, y la
> base de hoy en día presenta desorden, y la idea es crear una base sólida libre de escalar."*
> — 2026-08-22

**Autorización explícita del usuario.** Levanta la restricción de conservar la estructura
actual **dentro de Skylog V2.0**. No levanta ninguna regla del §1: producción sigue intocable.

| # | Regla |
|---|---|
| **A1** | Skylog V2.0 **no hereda** la estructura actual. Se diseña desde el problema, no desde lo que existe |
| **A2** | Nada se conserva por inercia. Cada tabla, ruta y pantalla debe justificar su existencia |
| **A3** | **Sí se conserva la lógica de negocio ya probada** (límites de plan, motor SORA, estadística SPI, cumplimiento de capacitación, matriz de riesgo): se traslada a una capa pura y se le agregan pruebas. Reestructurar no es reinventar las reglas |
| **A4** | Lo que se elimina se **registra con su motivo** en `51-bitacora.md`. Nada desaparece en silencio |
| **A5** | El criterio de éxito no es "hace lo mismo mejor ordenado", es **"escala sin que cada campo nuevo cueste tres tablas"** |

---

*Creado 2026-08-22. Modificar solo con acuerdo explícito del usuario.*
