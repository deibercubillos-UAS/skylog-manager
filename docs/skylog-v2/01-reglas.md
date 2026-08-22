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

## 6 · Reglas de verificación

| # | Regla |
|---|---|
| **Q1** | Cada fase cierra con una **puerta de verificación** y criterios escritos **antes** de construir |
| **Q2** | La lógica de negocio va en una capa pura **con pruebas**. Los límites numéricos de la norma no se verifican de memoria |
| **Q3** | `lint` + `build` limpios no son verificación suficiente para lógica regulatoria |
| **Q4** | Lo que no se pudo probar **se dice**, no se da por bueno |

---

## 7 · Nombres

- El proyecto se llama **Skylog V2.0**.
- El producto en producción sigue siendo **BitaFly**. No se renombra nada en producción.
- La decisión de qué nombre lleva el producto al salir a público **está abierta** — no se
  asume que sea uno u otro.

---

*Creado 2026-08-22. Modificar solo con acuerdo explícito del usuario.*
