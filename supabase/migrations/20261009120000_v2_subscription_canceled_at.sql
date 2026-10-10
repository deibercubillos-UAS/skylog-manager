-- Skylog V2.0 — cancelar la renovación automática: marca cuándo el Gerente General retiró el cobro recurrente.
-- El plan y `expires_at` no cambian (el acceso sigue hasta el vencimiento); la tarjeta tokenizada se borra.
alter table public.subscriptions add column if not exists canceled_at timestamptz;
