-- Registro de operador UAS ante AeroCivil: número de operador, vigencia del
-- registro y tipos de operación autorizados. Antes solo existía dan_number
-- (N° Explotador), que se conserva sin cambios.
alter table public.organizations
  add column if not exists operator_number text,
  add column if not exists registration_expiry date,
  add column if not exists authorized_operations jsonb not null default '[]'::jsonb;
