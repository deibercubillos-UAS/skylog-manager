-- Skylog V2.0 — Seguimiento de sucesos VOR/MOR (docs/skylog-v2/40-sms.md §5.7, 12-directivas-maut.md §2).
-- Solo para el Supabase branch `develop-v2` (regla O1): NUNCA se aplica a producción.
--
-- 1) El reporte guarda CUÁNDO, DÓNDE y CON QUÉ ocurrió el suceso — sin la fecha de ocurrencia no se puede
--    calcular el plazo del MOR (5 días hábiles desde la ocurrencia, Directiva 02-24).
-- 2) Evidencias adjuntas, análisis del caso (resumen, factores, peligro asociado) y referencia de radicación.
-- 3) Enlace público por organización para que terceros y contratistas reporten sin cuenta.
-- 4) VISIBILIDAD: el detalle del caso (análisis, acciones, línea de tiempo) lo ve SOLO el Gerente SMS
--    (decisión del usuario, 2026-10-06). Antes lo veía cualquier gestor.

-- 1) Datos del suceso ------------------------------------------------------------------------------------
alter table sms_reports
  add column if not exists occurred_at timestamptz,
  add column if not exists location text,
  add column if not exists aircraft_id uuid references aircraft(id),
  add column if not exists flight_id uuid references flights(id),
  add column if not exists event_label text,
  add column if not exists reporter_contact text,
  add column if not exists iris_reference text;

comment on column sms_reports.occurred_at is 'Cuándo OCURRIÓ el suceso (no cuándo se registró): base del plazo del MOR (5 días hábiles).';
comment on column sms_reports.event_label is 'Evento elegido de la lista oficial de 12 eventos UAS (event_code guarda el código OACI) o texto libre si es "otro".';
comment on column sms_reports.reporter_contact is 'Contacto opcional que deja quien reporta SIN cuenta (enlace público). Es identidad del notificante: se redacta igual que reported_by si el reporte es confidencial.';
comment on column sms_reports.iris_reference is 'Número/referencia de radicación en IRIS, lo registra el Gerente SMS al radicar.';

alter table sms_reports drop constraint if exists sms_reports_source_check;
alter table sms_reports
  add constraint sms_reports_source_check
  check (source in ('manual', 'public', 'auto_duty_exception', 'auto_unexpected_event', 'auto_training_exam_failed'));

-- Mismo criterio que 20261002000000: RLS decide FILAS, los privilegios por columna deciden COLUMNAS.
-- Al radicar, el Gerente SMS puede anotar la referencia de IRIS junto con filed_at; nada más se edita.
grant update (iris_reference) on sms_reports to authenticated;

create index if not exists sms_reports_org_occurred_idx on sms_reports (organization_id, occurred_at desc);
create index if not exists sms_reports_flight_idx on sms_reports (flight_id) where flight_id is not null;

-- 2) Evidencias ------------------------------------------------------------------------------------------
create table if not exists sms_report_attachments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references sms_reports(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  storage_key text not null,
  file_name text not null,
  content_type text not null,
  size_bytes integer not null check (size_bytes > 0),
  uploaded_by uuid references people(id),
  created_at timestamptz not null default now()
);
comment on table sms_report_attachments is 'Evidencias (fotos, PDF) de un reporte. Las escribe SOLO el servidor (service role) tras validar tipo y tamaño; se leen con el mismo alcance que el reporte.';
create index if not exists sms_report_attachments_report_idx on sms_report_attachments (report_id);

alter table sms_report_attachments enable row level security;
-- Visibles para quien ve el reporte (el notificante y los gestores, vía la RLS de sms_reports).
create policy sms_report_attachments_select on sms_report_attachments
  for select using (exists (select 1 from sms_reports r where r.id = report_id));

create trigger sms_report_attachments_retention before delete on sms_report_attachments
  for each row execute function v2_enforce_retention('created_at');

-- 3) Análisis del caso -----------------------------------------------------------------------------------
alter table sms_cases
  add column if not exists investigation_summary text,
  add column if not exists contributing_factors text,
  add column if not exists hazard_id uuid references hazards(id);
comment on column sms_cases.hazard_id is 'Peligro del catálogo SMS (hazards) que este caso identificó o confirmó: cierra el ciclo reporte → peligro → riesgo.';

-- 4) Enlace público por organización ---------------------------------------------------------------------
alter table organizations add column if not exists sms_public_token text unique;
comment on column organizations.sms_public_token is 'Token del enlace público de reporte (/reportar/<token>). NULL = enlace desactivado. Lo genera/revoca el servidor; es un identificador no adivinable, no una contraseña.';

-- 5) Visibilidad del caso: SOLO el Gerente SMS -----------------------------------------------------------
create or replace function v2_is_sms_analyst(p_organization_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from memberships m
    join accounts a on a.person_id = m.person_id
    where a.auth_user_id = auth.uid()
      and m.organization_id = p_organization_id
      and m.status = 'activa'
      and m.role in ('gerente_sms', 'superadmin')
  );
$$;
comment on function v2_is_sms_analyst is 'RLS helper — true si la sesión actual es Gerente SMS (o superadmin) activo en esa organización: el único rol que ve el detalle de un caso SMS.';
revoke execute on function v2_is_sms_analyst(uuid) from public, anon;
grant execute on function v2_is_sms_analyst(uuid) to authenticated;

drop policy if exists sms_cases_select on sms_cases;
drop policy if exists sms_cases_insert on sms_cases;
drop policy if exists sms_cases_update on sms_cases;
create policy sms_cases_select on sms_cases for select using (v2_is_sms_analyst(organization_id));
create policy sms_cases_insert on sms_cases for insert with check (v2_is_sms_analyst(organization_id));
create policy sms_cases_update on sms_cases for update using (v2_is_sms_analyst(organization_id)) with check (v2_is_sms_analyst(organization_id));

drop policy if exists sms_case_actions_select on sms_case_actions;
drop policy if exists sms_case_actions_insert on sms_case_actions;
drop policy if exists sms_case_actions_update on sms_case_actions;
create policy sms_case_actions_select on sms_case_actions for select using (v2_is_sms_analyst(organization_id));
create policy sms_case_actions_insert on sms_case_actions for insert with check (v2_is_sms_analyst(organization_id));
create policy sms_case_actions_update on sms_case_actions for update using (v2_is_sms_analyst(organization_id)) with check (v2_is_sms_analyst(organization_id));

drop policy if exists sms_case_events_select on sms_case_events;
drop policy if exists sms_case_events_insert on sms_case_events;
create policy sms_case_events_select on sms_case_events for select using (v2_is_sms_analyst(organization_id));
create policy sms_case_events_insert on sms_case_events for insert with check (v2_is_sms_analyst(organization_id));
