-- Skylog V2.0 — Etapa E3: el código de un socio que el cliente escribe al pagar viaja con la suscripción pendiente
-- para atribuir la comisión cuando Wompi confirme el pago.
alter table public.pending_subscriptions add column if not exists partner_code text;
