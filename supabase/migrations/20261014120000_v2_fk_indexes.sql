-- Índices en las llaves foráneas de uso frecuente (filtros por organización/persona/aeronave/vuelo y las reglas de acceso).
-- Las tablas aún son pequeñas: el costo de escritura es despreciable y evitan lecturas completas cuando crezcan.
create index if not exists idx_c2_sessions_aircraft_id on public.c2_sessions (aircraft_id);
create index if not exists idx_capacitacion_evaluation_attempts_organization_id on public.capacitacion_evaluation_attempts (organization_id);
create index if not exists idx_capacitacion_evaluation_attempts_person_id on public.capacitacion_evaluation_attempts (person_id);
create index if not exists idx_dispatches_aircraft_id on public.dispatches (aircraft_id);
create index if not exists idx_flights_aircraft_id on public.flights (aircraft_id);
create index if not exists idx_invitations_person_id on public.invitations (person_id);
create index if not exists idx_legal_hold_events_flight_id on public.legal_hold_events (flight_id);
create index if not exists idx_manual_acknowledgments_organization_id on public.manual_acknowledgments (organization_id);
create index if not exists idx_manual_acknowledgments_person_id on public.manual_acknowledgments (person_id);
create index if not exists idx_manual_versions_organization_id on public.manual_versions (organization_id);
create index if not exists idx_missions_aircraft_id on public.missions (aircraft_id);
create index if not exists idx_organization_emergency_contacts_organization_id on public.organization_emergency_contacts (organization_id);
create index if not exists idx_pending_subscriptions_organization_id on public.pending_subscriptions (organization_id);
create index if not exists idx_safety_indicator_action_plans_organization_id on public.safety_indicator_action_plans (organization_id);
create index if not exists idx_sms_case_actions_organization_id on public.sms_case_actions (organization_id);
create index if not exists idx_sms_case_events_organization_id on public.sms_case_events (organization_id);
create index if not exists idx_sms_gap_responses_organization_id on public.sms_gap_responses (organization_id);
create index if not exists idx_sms_report_attachments_organization_id on public.sms_report_attachments (organization_id);
create index if not exists idx_sms_reports_aircraft_id on public.sms_reports (aircraft_id);
create index if not exists idx_sms_training_attendance_person_id on public.sms_training_attendance (person_id);
create index if not exists idx_supplier_audits_organization_id on public.supplier_audits (organization_id);
create index if not exists idx_unexpected_events_flight_id on public.unexpected_events (flight_id);
