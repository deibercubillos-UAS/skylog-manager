-- Invitaciones de socios: para vincular personas sin cuenta BitaFly al panel /socio.
CREATE TABLE IF NOT EXISTS public.partner_invitations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id  uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  email       text NOT NULL,
  role        text NOT NULL DEFAULT 'asesor' CHECK (role IN ('owner','asesor')),
  token       text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  status      text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','aceptada','expirada')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

CREATE INDEX IF NOT EXISTS idx_partner_invitations_email   ON public.partner_invitations(email);
CREATE INDEX IF NOT EXISTS idx_partner_invitations_token   ON public.partner_invitations(token);
CREATE INDEX IF NOT EXISTS idx_partner_invitations_partner ON public.partner_invitations(partner_id);
