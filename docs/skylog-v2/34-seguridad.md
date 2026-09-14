# Seguridad

[← Índice maestro](00-INDICE.md) · [Reglas](01-reglas.md) ·
Esquema: [`31-esquema-datos.md`](31-esquema-datos.md)

> **Rehecho 2026-08-22.** La versión anterior giraba casi entera en torno a C2 (autenticación
> de dispositivos, MQTT, video) — coherente cuando C2 era el frente 4º en el orden. Con C2
> omitido (decisión 20), esa sección se conserva marcada como dormida en
> [`42-comando-control.md`](42-comando-control.md) y **no se repite aquí**. Este documento pasa
> a cubrir lo que sí aplica a los frentes activos: RLS multi-tenant sobre el esquema nuevo,
> protección de datos SMS, retención/custodia legal, y la deuda de seguridad ya conocida.

---

## 1 · RLS sobre el esquema nuevo — mismo patrón, tablas distintas

Convención heredada de la auditoría 2026-07-14 (optimización InitPlan) y confirmada en
[`31-esquema-datos.md`](31-esquema-datos.md) §0: toda tabla nueva nace con `organization_id`,
RLS y su política **en la misma migración** (regla **E4**), con las funciones envueltas en
`(SELECT ...)`.

Dos casos particulares del esquema nuevo que no existían antes:

| Tabla | Particularidad de RLS |
|---|---|
| `people` | **No siempre tiene `organization_id` directo** — una Persona puede no tener cuenta ni pertenecer aún a ninguna organización (observador registrado por otro). El acceso se resuelve vía `memberships`, no vía una columna propia |
| `documents` | `owner_type`/`owner_id` polimórfico — la política de RLS no puede ser una sola condición fija; se resuelve por `owner_type` (organización, persona, aeronave, modelo) con una función que despacha al chequeo correcto según el tipo |

---

## 2 · Protección de datos de seguridad operacional (`RAC 219 §219.115-140`)

**Brecha que quedaba señalada sin resolver** desde la versión anterior. Aplica a `reports`,
`cases`, `hazards` y `risk_assessments` (§4 de [`30-entidades.md`](30-entidades.md)):

| Requisito de la norma | Cómo se traduce en RLS |
|---|---|
| Acceso restringido a datos de seguridad operacional | Ningún rol distinto de gerencia/Gerente SMS lee `cases`/`hazards` directo — regla **S1**, evidencia no declaración, ya vale también para el control de acceso |
| Custodio identificado | `cases.assigned_to` (decisión 10) **es** el custodio — la política de `UPDATE` sobre `cases` exige `assigned_to = auth.uid()` o rol de gerencia, no basta pertenecer a la organización |
| Confidencialidad del notificante | `reports.confidentiality_level` (§4 de [`31`](31-esquema-datos.md)) — cuando es alto, el campo `reported_by` se **oculta** incluso a quien tiene permiso de leer el reporte, salvo al custodio del caso |
| Divulgación reglada | Ninguna consulta cruza organizaciones — mismo aislamiento multi-tenant de siempre, sin excepción para SMS |

Reafirma la regla **S4** ya fijada en [`01-reglas.md`](01-reglas.md) §5, ahora con tabla y
columna concretas, no como principio abstracto.

---

## 3 · Retención legal por suceso

El ítem 34 de `MAUT-5.0-12-095` exige que el Manual de Operaciones describa el procedimiento de
**preservación y custodia de los registros de vuelo (logs), grabaciones de audio y video ante la
ocurrencia de un incidente, accidente o suceso operacional**. `legal_holds`
([`31-esquema-datos.md`](31-esquema-datos.md) §6) es el mecanismo:

| Requisito | Efecto |
|---|---|
| **Congelamiento** | Al abrirse un `case`, el `replay_path`, el video y la meteorología archivada de ese vuelo dejan de ser elegibles para purga por cuota de plan |
| **Custodia** | `legal_holds.opened_by`/`released_by` — queda registro de quién puede liberar el material y bajo qué condición; no se libera solo por vencimiento de cuota |
| **Trazabilidad** | Cada acceso a material bajo custodia se audita — es evidencia potencial de una investigación |
| **Alcance** | El congelamiento lo dispara la **apertura** del caso, no el cierre. Un caso abierto tarde no debe encontrar el material ya borrado |

Interacción con §2: el material bajo custodia sigue sujeto a las restricciones de acceso de
datos de seguridad operacional — preservarlo no lo vuelve de libre consulta interna.

Ver [`14-listas-verificacion.md`](14-listas-verificacion.md) §4.7 y la decisión 5, corregida en
[`51-bitacora.md`](51-bitacora.md).

---

## 4 · Deuda de seguridad conocida, independiente de C2

De la auditoría del 2026-07-14 — sigue en pie, no depende de qué frente esté activo:

- `next` 14.2.x → 15.x (DoS pendientes).
- `jspdf` 2.x → 5.x (ReDoS; exige re-probar los ~14 generadores de PDF de producción).
- Habilitar `auth_leaked_password_protection` en Supabase — pendiente desde hace meses, es un
  interruptor.
- Evaluar hacer el repositorio privado — hoy es público y expone la arquitectura de seguridad
  interna descrita en `CLAUDE.md`.

Ninguno de los cuatro es parte de este plan de reconstrucción — son deuda de **producción**, y
tocarla está fuera de alcance mientras no se decida abordarla aparte (regla R1,
[`01-reglas.md`](01-reglas.md) §1).

---

*Actualizado: 2026-08-22.*
