-- Skylog V2.0 — SMS Matriz de peligros: cada avance de un control
-- (`hazard_control_updates`) pasa de UNA evidencia (columna `evidence_path`, que
-- se conserva para los registros ya existentes) a VARIOS adjuntos tipados
-- (fotos, PDF/presentación, lista de asistencia) + una lista de asistencia en
-- línea (miembros de la organización o invitados externos, sin firma).
--
-- Regla del proyecto: tabla nueva = RLS + organization_id + política en la misma
-- migración. Lectura: cualquier miembro (transparencia del SMS, igual que
-- hazard_controls). Escritura: solo gestores (v2_is_duty_manager).

-- Adjuntos del avance — archivo en R2 (bucket privado `documents`), path nunca expuesto.
create table hazard_control_update_attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  update_id uuid not null references hazard_control_updates(id) on delete cascade,
  kind text not null check (kind in ('foto', 'documento', 'lista_asistencia')),
  storage_path text not null,
  file_name text,
  content_type text,
  created_by uuid references people(id),
  created_at timestamptz not null default now()
);
comment on table hazard_control_update_attachments is 'SMS — adjuntos tipados de un avance de control (foto/documento/lista de asistencia), archivo en R2.';
create index hazard_control_update_attachments_org_idx on hazard_control_update_attachments (organization_id);
create index hazard_control_update_attachments_update_idx on hazard_control_update_attachments (update_id);

-- Lista de asistencia en línea — una fila por asistente (miembro con person_id, o invitado por nombre libre).
create table hazard_control_update_attendees (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  update_id uuid not null references hazard_control_updates(id) on delete cascade,
  person_id uuid references people(id),
  full_name text not null,
  document text,
  role text,
  created_by uuid references people(id),
  created_at timestamptz not null default now()
);
comment on table hazard_control_update_attendees is 'SMS — lista de asistencia en línea de un avance de control (miembro o invitado, sin firma).';
create index hazard_control_update_attendees_org_idx on hazard_control_update_attendees (organization_id);
create index hazard_control_update_attendees_update_idx on hazard_control_update_attendees (update_id);

alter table hazard_control_update_attachments enable row level security;
alter table hazard_control_update_attendees enable row level security;

create policy hcu_attachments_select on hazard_control_update_attachments
  for select using (organization_id in (select v2_current_organization_ids()));
create policy hcu_attachments_insert on hazard_control_update_attachments
  for insert with check (v2_is_duty_manager(organization_id));
create policy hcu_attachments_update on hazard_control_update_attachments
  for update using (v2_is_duty_manager(organization_id)) with check (v2_is_duty_manager(organization_id));
create policy hcu_attachments_delete on hazard_control_update_attachments
  for delete using (v2_is_duty_manager(organization_id));

create policy hcu_attendees_select on hazard_control_update_attendees
  for select using (organization_id in (select v2_current_organization_ids()));
create policy hcu_attendees_insert on hazard_control_update_attendees
  for insert with check (v2_is_duty_manager(organization_id));
create policy hcu_attendees_update on hazard_control_update_attendees
  for update using (v2_is_duty_manager(organization_id)) with check (v2_is_duty_manager(organization_id));
create policy hcu_attendees_delete on hazard_control_update_attendees
  for delete using (v2_is_duty_manager(organization_id));
