-- Skylog V2.0 — constancia del envío anual de indicadores SPI a la Aerocivil (plazo: antes del 30 de marzo de cada
-- vigencia). Apaga el recordatorio de `/api/cron/regulatory-reminders` y deja rastro de quién y cuándo. Una fila por
-- (organización, vigencia). Mismo patrón y permisos que `sms_monthly_reports`.
create table if not exists public.sms_indicator_submissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  year integer not null check (year between 2000 and 2100),
  sent_at timestamptz not null default now(),
  sent_by uuid references public.people(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  constraint sms_indicator_submissions_org_year_key unique (organization_id, year)
);
create index if not exists sms_indicator_submissions_org_idx on public.sms_indicator_submissions (organization_id);
create trigger sms_indicator_submissions_retention before delete on public.sms_indicator_submissions
  for each row execute function public.v2_enforce_retention('created_at');
alter table public.sms_indicator_submissions enable row level security;
create policy sms_indicator_submissions_select on public.sms_indicator_submissions as permissive for select to public
  using (organization_id in (select public.v2_current_organization_ids()));
create policy sms_indicator_submissions_insert on public.sms_indicator_submissions as permissive for insert to public
  with check (public.v2_is_duty_manager(organization_id));
create policy sms_indicator_submissions_update on public.sms_indicator_submissions as permissive for update to public
  using (public.v2_is_duty_manager(organization_id)) with check (public.v2_is_duty_manager(organization_id));
revoke all on table public.sms_indicator_submissions from anon, authenticated, service_role;
grant select, insert, update on table public.sms_indicator_submissions to authenticated;
grant all on table public.sms_indicator_submissions to service_role;
