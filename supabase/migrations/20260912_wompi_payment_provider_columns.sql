-- Migración aditiva para la migración de pagos ePayco → Wompi.
-- No renombra ni borra columnas existentes (epayco_subscription_id, epayco_ref,
-- epayco_customer_id se siguen usando, ahora provider-agnostic: guardan el ID
-- de transacción/referencia del proveedor activo, sea cual sea).
--
-- payment_provider: deja rastro de qué proveedor originó la fila ('epayco' para
-- histórico, 'wompi' para nuevas activaciones) — permite filtrar en la Fase 9
-- de retiro de código legacy sin adivinar.
-- wompi_payment_source_id: token de tarjeta reutilizable de Wompi, usado por
-- el cron de recurrencia para cobrar sin que el cliente vuelva a entrar.

alter table public.profiles
  add column if not exists payment_provider text,
  add column if not exists wompi_payment_source_id text;

alter table public.organization_members
  add column if not exists payment_provider text,
  add column if not exists wompi_payment_source_id text;

comment on column public.profiles.payment_provider is 'Proveedor de pago que activó/renovó el plan actual: epayco (histórico) | wompi';
comment on column public.profiles.wompi_payment_source_id is 'Fuente de pago tokenizada en Wompi (payment_source_id) para cobro recurrente automático';
comment on column public.organization_members.payment_provider is 'Proveedor de pago que activó/renovó el plan actual: epayco (histórico) | wompi';
comment on column public.organization_members.wompi_payment_source_id is 'Fuente de pago tokenizada en Wompi (payment_source_id) para cobro recurrente automático';
