-- P6: código de socio/asesor opcional en el intent de compra.
ALTER TABLE public.pending_subscriptions ADD COLUMN IF NOT EXISTS partner_code text;
-- (pending_registrations guarda el código dentro de reg_data jsonb)
