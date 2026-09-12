-- F4a — expediente Aerocivil listo para radicar: authorization_requests + risk_analyses.
-- docs/skylog-v2/31-esquema-datos.md §3 · 43-aerocivil.md §6.3 · 18-analisis-riesgos-vuelo.md.
--
-- authorization_requests: la SOLICITUD a la Aerocivil — una campaña con rango de fechas y
-- número total de vuelos planeados (100.805(a)), NO un vuelo individual ni una misión de
-- Programación. risk_analyses: el formato oficial MAUT-5.0-12-055 que se diligencia por
-- cada solicitud — matriz FIJA por la autoridad (regla C2), nunca configurable por la
-- organización — distinta de la matriz de riesgo del SMS interno (risk_assessments,
-- 31-esquema-datos.md §4, regla C3, aún sin construir).

create table authorization_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  zone text not null,
  scope_start date not null,
  scope_end date not null,
  total_flights_planned integer not null check (total_flights_planned > 0),
  status text not null default 'borrador'
    check (status in ('borrador', 'radicado', 'en_revision', 'autorizado', 'negado')),
  submitted_at timestamptz,
  radicado_number text,
  response_doc_id uuid,
  created_by uuid references people(id),
  created_at timestamptz not null default now(),
  constraint authorization_requests_scope_valid check (scope_end >= scope_start)
);

comment on table authorization_requests is '31-esquema-datos.md §3 — la solicitud de autorización de vuelo ante la Aerocivil (100.805(a)): una campaña con rango de fechas y total de vuelos planeados, no un vuelo ni una misión individual.';

create index authorization_requests_org_idx on authorization_requests (organization_id);

create table risk_analyses (
  id uuid primary key default gen_random_uuid(),
  authorization_id uuid not null references authorization_requests(id) on delete cascade,
  -- Snapshot completo del formato MAUT-5.0-12-055: un elemento por peligro evaluado en Sí
  -- (catálogo fijo de 24 + libres de las categorías vi/vii), con la forma que exige
  -- packages/domain/src/riskAnalysis.js#evaluateRiskAnalysis — probabilidad/severidad/
  -- estrategia/descripción/residual. P-ES-1 (31-esquema-datos.md): se queda en jsonb en
  -- vez de filas propias porque es un documento que se firma como unidad, no se consulta
  -- peligro por peligro fuera de su propio análisis.
  hazards jsonb not null default '[]'::jsonb,
  can_sign boolean not null default false,
  signed_by uuid references people(id),
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint risk_analyses_signed_consistent check (
    (signed_by is null and signed_at is null) or (signed_by is not null and signed_at is not null)
  )
);

comment on table risk_analyses is '31-esquema-datos.md §3 — emite el formato oficial exacto MAUT-5.0-12-055 (regla C2, no configurable). `can_sign` se recalcula server-side con evaluateRiskAnalysis() antes de aceptar una firma — nunca se confía en el valor que manda el cliente.';

create unique index risk_analyses_authorization_uidx on risk_analyses (authorization_id);

-- RLS: mismo criterio de gestión que F5 (v2_is_duty_manager, ya cubre admin/jefe_pilotos/
-- gerente_sms/superadmin) — preparar y firmar el expediente Aerocivil es una función de
-- gestión operativa, no algo que cualquier piloto de la org pueda iniciar o alterar.
alter table authorization_requests enable row level security;
alter table risk_analyses enable row level security;

create policy authorization_requests_select on authorization_requests
  for select using (organization_id in (select v2_current_organization_ids()));

create policy authorization_requests_insert on authorization_requests
  for insert with check (v2_is_duty_manager(organization_id));

create policy authorization_requests_update on authorization_requests
  for update using (v2_is_duty_manager(organization_id))
  with check (v2_is_duty_manager(organization_id));

create policy risk_analyses_select on risk_analyses
  for select using (
    authorization_id in (
      select id from authorization_requests
      where organization_id in (select v2_current_organization_ids())
    )
  );

create policy risk_analyses_insert on risk_analyses
  for insert with check (
    authorization_id in (
      select id from authorization_requests where v2_is_duty_manager(organization_id)
    )
  );

create policy risk_analyses_update on risk_analyses
  for update using (
    authorization_id in (
      select id from authorization_requests where v2_is_duty_manager(organization_id)
    )
  )
  with check (
    authorization_id in (
      select id from authorization_requests where v2_is_duty_manager(organization_id)
    )
  );
