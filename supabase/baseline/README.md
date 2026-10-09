# Migración base de Skylog V2.0

Esquema `public` completo de V2, generado del esquema real de la rama `develop-v2` el 2026-10-09
(hallazgo **C1** de `docs/skylog-v2/60-auditoria-codigo.md`: ~27 de las 76 migraciones aplicadas
en la rama no tenían archivo y tablas núcleo no tenían `CREATE TABLE` en el repo).

| Archivo | Contenido |
|---|---|
| `00_v2_baseline.sql` | 28 funciones, 91 tablas, restricciones, índices, 32 disparadores, RLS, 213 políticas, permisos de tablas/columnas/funciones y la publicación Realtime |
| `10_seed_sms_gap_questions.sql` | Catálogo oficial GAP del SMS (100 preguntas globales) |
| `tools/dump_schema.sql` | Función que genera el volcado por secciones (se instala y se borra a mano) |
| `tools/verify_baseline.sql` | Bloque que aplica la base sobre un esquema vacío **dentro de una transacción que se revierte** y compara sección por sección con el esquema original |

## Cómo se usa

**Proyecto nuevo y vacío (decisión A):** en el editor SQL o con la CLI, aplicar en orden
`00_v2_baseline.sql` → `10_seed_sms_gap_questions.sql` → cualquier migración posterior a
2026-10-09 en `supabase/migrations/`. Luego configurar Auth (Google, URLs de redirección,
contraseñas filtradas, MFA del superadmin) y los buckets de R2.
No aplicar sobre la rama ni sobre producción: ya tienen este esquema.

**Qué NO incluye (a propósito):** el esquema `auth`/`storage`/`realtime` (los pone Supabase),
las filas de negocio (las trae el ETL, `scripts/etl/`) y `colombia_geo` (V2 no la usa; la copia el ETL
si hace falta).

## Verificación hecha (2026-10-09)

Sobre la rama: se renombró `public`, se creó uno vacío, se ejecutó `00_v2_baseline.sql` y se comparó
con el original: **rls, índices, políticas, disparadores, publicaciones y secuencias idénticos; tablas,
restricciones, funciones y permisos idénticos salvo los dos objetos auxiliares de la propia verificación**
(`_baseline_txt`, `_v2_dump`). Todo se revirtió.

## Regenerar

Si el esquema cambia antes del corte: instalar `tools/dump_schema.sql`, llamar `select public._v2_dump()`,
reensamblar las secciones en el orden de la cabecera de `00_v2_baseline.sql`, correr `tools/verify_baseline.sql`
y borrar las funciones auxiliares.
