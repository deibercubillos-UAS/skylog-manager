-- Wompi no tiene un "plan_uid" remoto que guardar aquí (a diferencia de ePayco) —
-- se vuelve nullable para que /api/wompi/checkout pueda insertar sin ese dato.
-- Los inserts existentes de /api/epayco/checkout siguen enviando epayco_id sin
-- cambio de comportamiento.
alter table public.pending_subscriptions alter column epayco_id drop not null;
