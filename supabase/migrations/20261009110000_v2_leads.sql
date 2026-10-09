-- Skylog V2.0 — captación de correos del sitio público (boletín, checklist, blog). `POST /api/leads` la escribe con la
-- llave de servicio; nadie la lee desde el navegador (RLS activa y sin políticas). Idempotente por (correo, fuente).
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  source text not null default 'newsletter',
  utm jsonb,
  referrer text,
  landing_path text,
  created_at timestamptz not null default now(),
  constraint leads_email_source_key unique (email, source)
);
alter table public.leads enable row level security;
revoke all on table public.leads from anon, authenticated;
grant all on table public.leads to service_role;
