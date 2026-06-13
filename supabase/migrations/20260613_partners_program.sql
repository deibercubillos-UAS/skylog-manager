-- Programa de Escuelas/Asesores/Referidos — P1: estructura de datos.
-- Solo crea tablas/índices/RLS nuevas. No modifica tablas existentes.

-- ── partners: escuela o asesor independiente ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.partners (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type               text NOT NULL CHECK (type IN ('escuela','asesor')),
  name               text NOT NULL,
  status             text NOT NULL DEFAULT 'activo' CHECK (status IN ('activo','inactivo')),
  parent_partner_id  uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  commission_pct     numeric(5,2) NOT NULL DEFAULT 0,   -- % fijo que paga BitaFly
  free_seats_limit   int,                                -- NULL = ilimitado
  free_seats_used    int NOT NULL DEFAULT 0,
  free_days          int NOT NULL DEFAULT 90,
  created_by         uuid,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_partners_parent ON public.partners(parent_partner_id);

-- ── partner_codes: códigos de referido/venta ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.partner_codes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id  uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  code        text NOT NULL UNIQUE,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_partner_codes_partner ON public.partner_codes(partner_id);

-- ── partner_members: quién accede al panel del socio ────────────────────────
CREATE TABLE IF NOT EXISTS public.partner_members (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id  uuid NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
  profile_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'asesor' CHECK (role IN ('owner','asesor')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (partner_id, profile_id)
);
CREATE INDEX IF NOT EXISTS idx_partner_members_partner ON public.partner_members(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_members_profile ON public.partner_members(profile_id);

-- ── free_grants: perfiles gratis regalados (1 por correo, no renovable) ──────
CREATE TABLE IF NOT EXISTS public.free_grants (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id         uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  advisor_member_id  uuid REFERENCES public.partner_members(id) ON DELETE SET NULL,
  email              text NOT NULL UNIQUE,        -- regla: 1 por correo, no renovable
  status             text NOT NULL DEFAULT 'enviado'
                       CHECK (status IN ('enviado','activado','expirado','degradado')),
  token              text UNIQUE,
  granted_at         timestamptz NOT NULL DEFAULT now(),
  expires_at         timestamptz,
  purge_after        timestamptz,                  -- granted/expiry + 3 meses (borrado auto)
  redeemed_org_id    uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_free_grants_partner ON public.free_grants(partner_id);
CREATE INDEX IF NOT EXISTS idx_free_grants_status  ON public.free_grants(status);

-- ── referrals: relación cliente <-> socio (atribución de venta) ──────────────
CREATE TABLE IF NOT EXISTS public.referrals (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id         uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  advisor_member_id  uuid REFERENCES public.partner_members(id) ON DELETE SET NULL,
  code               text,
  org_id             uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan               text,
  billing            text,
  status             text NOT NULL DEFAULT 'activa' CHECK (status IN ('activa','cancelada')),
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_referrals_partner ON public.referrals(partner_id);

-- ── referral_commissions: una fila por ciclo de pago (comisión recurrente) ──
CREATE TABLE IF NOT EXISTS public.referral_commissions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id        uuid NOT NULL REFERENCES public.referrals(id) ON DELETE CASCADE,
  period             text,                          -- ej. '2026-06'
  sale_amount        numeric(12,2),
  commission_pct     numeric(5,2),
  commission_amount  numeric(12,2),
  status             text NOT NULL DEFAULT 'pendiente'
                       CHECK (status IN ('pendiente','liquidada','anulada')),
  ref_payco          text,                          -- idempotencia del webhook
  created_at         timestamptz NOT NULL DEFAULT now(),
  paid_at            timestamptz
);
CREATE INDEX IF NOT EXISTS idx_refcom_referral ON public.referral_commissions(referral_id);
-- Idempotencia: no duplicar comisión por el mismo pago
CREATE UNIQUE INDEX IF NOT EXISTS uq_refcom_ref_payco
  ON public.referral_commissions(ref_payco) WHERE ref_payco IS NOT NULL;

-- ── Helper: partner_ids visibles para el usuario actual ─────────────────────
-- Propios + (si es owner de una escuela) los asesores hijos de esa escuela.
CREATE OR REPLACE FUNCTION private.user_partner_ids()
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT pm.partner_id
    FROM public.partner_members pm
   WHERE pm.profile_id = auth.uid()
  UNION
  SELECT child.id
    FROM public.partners child
    JOIN public.partner_members pm ON pm.partner_id = child.parent_partner_id
   WHERE pm.profile_id = auth.uid() AND pm.role = 'owner';
$$;

-- ── RLS: lectura para miembros del socio; escritura solo service role ────────
-- (El Máster usa createAdminClient = service role, que ignora RLS.)
ALTER TABLE public.partners              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_codes         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_grants           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_commissions  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS partners_select ON public.partners;
CREATE POLICY partners_select ON public.partners FOR SELECT TO authenticated
  USING (id IN (SELECT private.user_partner_ids()));

DROP POLICY IF EXISTS partner_codes_select ON public.partner_codes;
CREATE POLICY partner_codes_select ON public.partner_codes FOR SELECT TO authenticated
  USING (partner_id IN (SELECT private.user_partner_ids()));

DROP POLICY IF EXISTS partner_members_select ON public.partner_members;
CREATE POLICY partner_members_select ON public.partner_members FOR SELECT TO authenticated
  USING (partner_id IN (SELECT private.user_partner_ids()));

DROP POLICY IF EXISTS free_grants_select ON public.free_grants;
CREATE POLICY free_grants_select ON public.free_grants FOR SELECT TO authenticated
  USING (partner_id IN (SELECT private.user_partner_ids()));

DROP POLICY IF EXISTS referrals_select ON public.referrals;
CREATE POLICY referrals_select ON public.referrals FOR SELECT TO authenticated
  USING (partner_id IN (SELECT private.user_partner_ids()));

DROP POLICY IF EXISTS referral_commissions_select ON public.referral_commissions;
CREATE POLICY referral_commissions_select ON public.referral_commissions FOR SELECT TO authenticated
  USING (referral_id IN (
    SELECT r.id FROM public.referrals r
     WHERE r.partner_id IN (SELECT private.user_partner_ids())
  ));
