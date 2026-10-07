# ETL v1 → V2

Plan y reglas: [`docs/skylog-v2/32-migracion.md`](../../docs/skylog-v2/32-migracion.md). **Nada de esto toca producción**: el
origen se lee en SOLO LECTURA y el destino es el proyecto de V2.

```bash
# 0 · Autoprueba con datos sintéticos (sin base de datos)
node scripts/etl/selftest.mjs

# 1 · Ensayo: calcula e informa, NO escribe (por defecto)
node scripts/etl/fixtures/synthetic-v1.mjs ./etl-datos          # o un export de v1 con un <tabla>.json por tabla
node scripts/etl/run.mjs --source-dir ./etl-datos

# 2 · Contra la COPIA de v1, con un usuario de solo lectura
V1_DATABASE_URL='postgres://solo_lectura:…@…/postgres' node scripts/etl/run.mjs --from-db

# 3 · Escribir en V2 (idempotente: se puede repetir). Destino = variables del proyecto de V2
node --env-file=.env.local scripts/etl/run.mjs --from-db --commit
```

Cada corrida deja `informes/etl-AAAAMMDDhhmm/`: `INFORME.md`, `conteos.csv`, `identidad.csv` (qué valor ganó y cuál se
descartó), `omitidas.csv`, `avisos.csv`, `revision-manual.csv`, `suscripciones-a-confirmar.csv` y `horas-aeronaves.csv`.

**Criterio de éxito** (`32` §5.2): `v1 = migradas + omitidas` en todas las entidades; 0 pendientes en `revision-manual.csv`
(o resueltos a mano); las 22 suscripciones confirmadas una por una; dos corridas seguidas sin diferencias.

## Qué cubre
**Migra a las tablas de V2**: organizaciones y certificaciones · personas (reglas de identidad) · cuentas **con su contraseña
cifrada** · membresías y adiciones de la licencia · modelos, aeronaves, baterías y componentes · misiones y vuelos (hora de
Colombia) · eventos de mantenimiento · contactos de emergencia · pólizas · proveedores, criterios y auditorías · manuales,
versiones y confirmaciones de lectura · listas de chequeo (de `form_definitions` y `protocols`) · reportes SMS y VOR/MOR con su
caso, acciones y línea de tiempo · peligros y barreras · suscripciones (plan y vencimiento) · programa de socios · APK
vigente · municipios.

**Archiva sin transformar** (`legacy_v1_rows`, JSONB, sin contraseñas): **todas** las tablas de v1, para que lo que V2 no
modela (SORA, resultados de listas, bitácora de acciones, indicadores/GAP/escalas de ejemplo…) se conserve y pueda entregarse
a un inspector.

## Archivos de R2
`--commit` deja `archivos-a-copiar.csv` (bucket y clave de v1 → bucket y clave nueva). Después:

```bash
node --env-file=.env.local scripts/etl/copy-files.mjs informes/etl-…/archivos-a-copiar.csv            # solo comprueba (HEAD)
node --env-file=.env.local scripts/etl/copy-files.mjs informes/etl-…/archivos-a-copiar.csv --commit   # copia R2→R2 y verifica tamaños
```
No borra nada de v1. Necesita `R2_ENDPOINT`, `R2_ACCESS_KEY_ID` y `R2_SECRET_ACCESS_KEY`. Una referencia a una URL antigua del
almacenamiento anterior no tiene objeto en R2: sale en el manifiesto como «sin objeto» para volver a subirla a mano.

## Pendiente de decisión
- **Replays GPS**: V2 los guarda **dentro de la fila** (`flights.replay_track`, decimados), no como archivo. Hoy v1 tiene **0**
  vuelos con replay; si aparecieran antes del corte, hay que convertir el `.json.gz`.
- **Grabaciones de VOR/MOR** (`attachments`) y firmas: se conservan en el archivo de v1.
