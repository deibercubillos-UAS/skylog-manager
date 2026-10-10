# Corte en el mismo proyecto de Supabase (opción C)

Decisión 201: la V2 se instala **en el mismo proyecto que hoy aloja la v1**. La v1 queda congelada en el esquema `legacy_v1`
(sin acceso por la API) y los usuarios de `auth.users` conservan id y contraseña. Un solo proyecto → un solo costo, y se puede
bajar al plan gratuito (con respaldo diario a R2: `/api/cron/backup-r2`).

## Secuencia (fin de semana de corte)
1. **v1 en solo lectura** (bloqueo de escrituras) y aviso a los clientes.
2. **Respaldo previo (sin depender del plan de Supabase)**: `V1_DATABASE_URL=… node scripts/cutover/respaldo-v1.mjs` deja en `respaldos/` un JSON comprimido por tabla y los usuarios con su contraseña cifrada (carpeta ignorada por git; copiarla además fuera de línea).
3. SQL Editor: **`01_congelar_v1.sql`** (una transacción). Luego **`02_verificar_congelado.sql`**: todo en `true`.
4. `node scripts/cutover/build-sql.mjs` → `informes/cutover-v2.sql` (base V2 + semilla + migraciones posteriores). Ejecutarlo en el SQL Editor.
5. ETL en el lugar: `V1_DATABASE_URL=… ETL_IN_PLACE_CONFIRMO=si node --env-file=.env.local scripts/etl/run.mjs --from-db --in-place` (en seco) y luego con `--commit`.
   Exige que `public.profiles` ya no exista y `public.people` sí; no vuelve a crear usuarios ni duplica el archivo de v1.
6. Variables de entorno y dominios de producción → pruebas con las cuentas `qa.*` → abrir al público.

## Reversa
`99_revertir.sql` devuelve la base a la v1 (tablas y funciones a `public`, disparador de `auth.users`, trabajos de pg_cron y Realtime).
Solo si V2 **no** aceptó escrituras (aborta si hay despachos); se puede forzar con `set app.forzar_reversa = 'si';`. Después de abrir al público,
la reversa es la **restauración del respaldo**.

## Qué NO se puede hacer en este modelo
- La v1 **no sigue funcionando** en paralelo (sus tablas ya no están en `public`): no hay «v1 en solo lectura» como aplicación; sus datos quedan en `legacy_v1`.
- No repetir `--commit` después de abrir al público (reescribe `subscriptions`).

## Ensayo (si hay plan de pago)
En una **restauración de la v1 a un proyecto nuevo** (Supabase → Database → Backups → *Restore to new project*, función de planes de pago): ejecutar los
pasos 3-5 allí, probar el inicio de sesión de las cuentas `qa.*` y la reversa. Borrar ese proyecto al terminar.
