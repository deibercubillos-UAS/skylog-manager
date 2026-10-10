-- Skylog V2.0 — historial de pagos de la suscripción (informativo; no es factura fiscal). Se escribe desde
-- `activateSubscription` (webhook, verificación manual y cobro recurrente) con la llave de servicio; se lee solo por
-- `GET /api/suscripcion/historial` (Gerente General). Sin políticas: RLS activa y nadie lo toca desde el navegador.
-- Idempotente por transacción de Wompi.
create table if not exists public.billing_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  provider text not null default 'wompi',
  transaction_id text not null,
  reference text,
  plan text not null,
  billing text not null check (billing in ('monthly', 'annual')),
  amount_cop numeric(14,2) not null,
  currency text not null default 'COP',
  status text not null default 'aprobado',
  paid_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint billing_history_transaction_key unique (provider, transaction_id)
);
create index if not exists billing_history_org_idx on public.billing_history (organization_id, paid_at desc);
alter table public.billing_history enable row level security;
revoke all on table public.billing_history from anon, authenticated, service_role;
grant all on table public.billing_history to service_role;
