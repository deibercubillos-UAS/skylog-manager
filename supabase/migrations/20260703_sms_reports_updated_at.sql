-- sms_reports no tenía updated_at — necesario para calcular el tiempo
-- promedio de cierre de casos en el hub de Seguridad SMS (Reportes SMS).
alter table public.sms_reports
  add column if not exists updated_at timestamptz not null default now();

-- Reutiliza la misma función set_updated_at() que ya usa vor_mor_submissions.
create trigger sms_reports_updated_at
  before update on public.sms_reports
  for each row execute function set_updated_at();
