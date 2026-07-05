-- Permite registrar barreras voluntarias cuando la evaluación inicial es
-- "Tolerable" (no obligatorio, decisión del piloto) — distinto de
-- mitigation_required (obligatorio, solo cuando la zona inicial es
-- "Inaceptable"). Ver docs/plan-mejora-sms-bitafly.md y CLAUDE.md.
alter table public.results_risk_assessment
  add column if not exists mitigation_voluntary boolean not null default false;
