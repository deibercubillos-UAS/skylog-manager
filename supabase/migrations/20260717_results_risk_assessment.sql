-- Evaluación de Riesgos en el Despacho: nuevo paso de seguridad "Evaluación
-- de Riesgos" entre Inventario y Pre-vuelo. El piloto evalúa
-- Probabilidad x Gravedad contra la matriz de tolerabilidad ya configurada
-- por la organización (Fase 2 del plan de mejora SMS, safety_risk_scales/
-- safety_risk_tolerability). Si la zona resultante es "inaceptable", debe
-- describir las barreras/mitigaciones aplicadas y volver a evaluar el
-- riesgo residual — solo puede continuar si el residual ya NO es
-- "inaceptable" ("tolerable"/"aceptable" sí dejan avanzar, tanto en la
-- evaluación inicial como en la residual, según el estándar SMS/OACI).
--
-- Este paso NO tiene interruptor por organización (a diferencia de
-- Inventario): siempre está disponible, pero se OMITE automáticamente en el
-- despacho si la organización todavía no ha configurado su matriz de riesgo
-- (Fase 2) — no se bloquea a nadie por una configuración que no existe.
--
-- Snapshot, no recálculo: initial_zone/residual_zone se guardan tal como se
-- calcularon en el momento del despacho (misma matriz vigente en ese
-- instante) — igual que el resto de resultados de despacho (results_health,
-- results_preflight, etc.), que son evidencia histórica de lo respondido,
-- no un valor que se recalcula después si la matriz cambia.

create table if not exists public.results_risk_assessment (
  id                        uuid primary key default gen_random_uuid(),
  flight_id                 uuid references public.flights(id) on delete cascade,
  organization_id           uuid references public.organizations(id),
  initial_probability_code  text not null,
  initial_severity_code     text not null,
  initial_zone              text not null check (initial_zone in ('inaceptable', 'tolerable', 'aceptable')),
  mitigation_required       boolean not null default false,
  barriers                  text,
  residual_probability_code text,
  residual_severity_code    text,
  residual_zone             text check (residual_zone is null or residual_zone in ('inaceptable', 'tolerable', 'aceptable')),
  created_at                timestamptz not null default now()
);

create index if not exists idx_results_risk_assessment_flight on public.results_risk_assessment (flight_id);
create index if not exists idx_results_risk_assessment_org on public.results_risk_assessment (organization_id);

alter table public.results_risk_assessment enable row level security;

create policy tenant_isolation on public.results_risk_assessment
  for all
  using (organization_id = private.get_my_org())
  with check (organization_id = private.get_my_org());
