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

## Qué cubre hoy (fase 1) y qué falta
**Cubre**: organizaciones y certificaciones · personas (reglas de identidad) · cuentas **con su contraseña cifrada** ·
membresías y adiciones de la licencia · modelos, aeronaves, baterías y componentes · misiones y vuelos (hora de Colombia) ·
pólizas · suscripciones (plan y vencimiento) · programa de socios · APK vigente · municipios.

**Falta (fase 2)**, en este orden: eventos de mantenimiento · SMS (reportes, casos, acciones, indicadores, GAP, capacitación) ·
proveedores y auditorías · manuales (+ archivos) · listas de chequeo (`form_definitions`, `protocols`) · **archivos de R2**
(foto de perfil/aeronave, documentos del expediente, replays, adjuntos: copiar a la clave nueva y re-apuntar) · contactos de
emergencia de la organización · documentos del expediente de pilotos · esquema `legacy_v1`.
