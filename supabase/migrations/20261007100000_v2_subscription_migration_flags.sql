-- Skylog V2.0 — clientes que vienen de ePayco (docs/skylog-v2/32-migracion.md decisiones B y C). El ETL marca la
-- suscripción migrada y guarda el id de la recurrencia de ePayco que hay que CANCELAR el día del corte (y, mientras el
-- cliente no registre su tarjeta con Wompi, se le muestra el aviso de activación). `migration_notice_sent_at` evita
-- repetir el correo de aviso.
alter table public.subscriptions
  add column if not exists migrated_from_v1 boolean not null default false,
  add column if not exists legacy_epayco_subscription_id text,
  add column if not exists migration_notice_sent_at timestamptz;
