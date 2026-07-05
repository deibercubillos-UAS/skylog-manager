-- El análisis SORA debe realizarse cada vez que se programa un vuelo (Programación).
-- Nullable para no romper misiones históricas creadas antes de este requisito.
-- Ver docs/plan-mejora-sms-bitafly.md y CLAUDE.md.
alter table public.flight_authorizations
  add column if not exists sora_assessment_id uuid references public.sora_assessments(id) on delete set null;

create index if not exists idx_flight_authorizations_sora_assessment_id
  on public.flight_authorizations (sora_assessment_id);
