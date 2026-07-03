-- Fase 5.d — Historial de facturación (comprobante informativo, NO fiscal)
-- Registra cada pago exitoso recibido por el webhook de ePayco. El comprobante
-- que se genera desde aquí es informativo — NO es una factura electrónica con
-- validez fiscal DIAN.
--
-- ⚠️ Migración aditiva: crear esta tabla NO afecta el webhook ni la activación
-- de planes. La escritura desde el webhook es fire-and-forget (nunca rompe la
-- activación), y el listado degrada a vacío si la tabla aún no existe.

create table if not exists public.billing_history (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid references public.organizations(id) on delete set null,
  user_id          uuid references auth.users(id) on delete set null,
  ref_payco        text unique,             -- idempotencia por referencia de ePayco
  plan_key         text,
  billing          text,                    -- 'monthly' | 'annual'
  amount           numeric,
  currency         text default 'COP',
  status           text default 'pagada',
  created_at       timestamptz not null default now()
);

create index if not exists idx_billing_history_user_created
  on public.billing_history (user_id, created_at desc);

alter table public.billing_history enable row level security;

-- SELECT: cada usuario ve solo su propio historial de facturación.
drop policy if exists billing_history_select_own on public.billing_history;
create policy billing_history_select_own on public.billing_history
  for select
  using (user_id = auth.uid());

-- Sin política de INSERT → solo el service role (webhook) escribe.
