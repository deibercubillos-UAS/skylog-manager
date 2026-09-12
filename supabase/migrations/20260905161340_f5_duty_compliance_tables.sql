-- F5 — tiempos de servicio, vuelo y descanso (RAC 100 §100.540)
-- docs/skylog-v2/31-esquema-datos.md §3.1 · docs/skylog-v2/41-tiempos-servicio.md §1
--
-- person_id/organization_id son uuid SIN foreign key todavía: el modelo de
-- identidad de v2 (people/accounts/memberships, 30-entidades.md §2) aún no
-- existe en esta base de desarrollo — las FK se agregan cuando esas tablas
-- se creen. RLS queda habilitado SIN políticas (deny-all por defecto) hasta
-- entonces: más seguro no exponer nada que inventar una política de acceso
-- sin el modelo de organización real detrás.
--
-- Rescatada al repositorio el 2026-09-06 (decisión 31, 51-bitacora.md):
-- se había aplicado directo contra el Supabase branch `develop-v2` sin
-- comitearse, violando la regla E6 (01-reglas.md). Contenido idéntico al
-- ya aplicado — verificado contra supabase_migrations.schema_migrations.

create table duty_periods (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  person_id uuid not null,
  type text not null check (type in ('servicio','descanso','disponibilidad','entrenamiento')),
  started_at timestamptz not null,
  ended_at timestamptz,
  source text not null default 'manual' check (source in ('manual','auto_dispatch','auto_close')),
  created_at timestamptz not null default now(),
  constraint duty_periods_ended_after_started check (ended_at is null or ended_at > started_at)
);

comment on table duty_periods is 'F5 §100.540 — periodos de servicio/descanso/disponibilidad/entrenamiento de un piloto. No es la duración del vuelo: incluye preparación, monitoreo activo y espera. Ver docs/skylog-v2/31-esquema-datos.md §3.1.';

create index duty_periods_person_started_idx on duty_periods (person_id, started_at);
create index duty_periods_org_idx on duty_periods (organization_id);

create table duty_exceptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  duty_period_id uuid not null references duty_periods(id) on delete cascade,
  reason text not null,
  authorized_by uuid not null,
  evidence_doc_id uuid,
  created_at timestamptz not null default now()
);

comment on table duty_exceptions is 'F5 — excepción documentada y autorizada por el Jefe de Pilotos a un límite de §100.540 cuando la norma lo permite. Ver docs/skylog-v2/41-tiempos-servicio.md §1.2.';

create index duty_exceptions_period_idx on duty_exceptions (duty_period_id);

create table duty_annual_certifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null,
  person_id uuid not null,
  year integer not null,
  total_hours numeric(8,2) not null,
  certified_by uuid not null,
  certified_at timestamptz not null default now(),
  document_path text,
  unique (person_id, year)
);

comment on table duty_annual_certifications is 'F5 §100.535(12) — certificación anual del tiempo de vuelo acumulado por piloto, firmada por el Jefe de Pilotos. Ver docs/skylog-v2/41-tiempos-servicio.md §1.2.';

alter table duty_periods enable row level security;
alter table duty_exceptions enable row level security;
alter table duty_annual_certifications enable row level security;
