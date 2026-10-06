-- Skylog V2.0 — cobertura de la migración v1 → v2 (docs/skylog-v2/32a-cobertura-migracion.md).
-- Columnas y tablas que V2 no tenía y que la versión actual SÍ llena (con el peso real de cada dato):
-- lugar y notas de los vuelos, nombre de los componentes, expediente de pilotos, contacto/registro de la
-- organización, contactos de emergencia, versiones del APK y catálogo de municipios. Todo aditivo y nullable.

-- ── Vuelos: lugar (54/58), notas (48/58), N.° de misión (13/58), alertas DJI (9/58), origen (44 importados),
--    reglas de vuelo VMC/IMC/NIGHT (58/58; la columna visual_condition de V2 es la línea de vista).
alter table flights
  add column location text,
  add column notes text,
  add column external_ref text,
  add column alerts jsonb,
  add column source text check (source is null or source in ('manual', 'importado', 'despacho')),
  add column flight_rules text check (flight_rules is null or flight_rules in ('VMC', 'IMC', 'NIGHT'));

-- ── Organización: contacto del explotador y tipo de identificación.
alter table organizations
  add column legal_rep text,
  add column phone text,
  add column contact_email text,
  add column nit_type text;

-- ── Registro ante la Aerocivil (decisión E): N.° de explotador (DAN), N.° de operador UAS, vigencia.
alter table organization_certifications
  add column dan_number text,
  add column operator_number text,
  add column registration_expiry date;

-- ── Persona: foto y contacto de emergencia (decisión E).
alter table people
  add column avatar_path text,
  add column emergency_contact_name text,
  add column emergency_contact_phone text;

-- ── Expediente documental de la persona (cédula, curso, examen teórico, certificado médico).
create table person_documents (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id) on delete cascade,
  doc_type text not null check (doc_type in ('cedula', 'curso_piloto', 'examen_teorico', 'certificado_medico', 'otro')),
  document_path text not null,
  uploaded_by uuid references people(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (person_id, doc_type)
);
comment on table person_documents is 'Documentos del expediente de una persona (RAC 100 §100.535(8)). El archivo vive en el bucket privado `documents`; la ruta no sale del servidor.';
alter table person_documents enable row level security;
create policy person_documents_select on person_documents
  for select using (
    person_id = v2_current_person_id()
    or exists (select 1 from memberships m where m.person_id = person_documents.person_id and m.status = 'activa' and v2_is_duty_manager(m.organization_id))
  );
create policy person_documents_write on person_documents
  for all using (
    person_id = v2_current_person_id()
    or exists (select 1 from memberships m where m.person_id = person_documents.person_id and m.status = 'activa' and v2_is_duty_manager(m.organization_id))
  ) with check (
    person_id = v2_current_person_id()
    or exists (select 1 from memberships m where m.person_id = person_documents.person_id and m.status = 'activa' and v2_is_duty_manager(m.organization_id))
  );

-- ── Aeronave: foto; componente: nombre; mantenimiento: adjunto.
alter table aircraft add column image_path text;
alter table aircraft_components add column name text;
alter table maintenance_events add column document_path text;

-- ── Contactos de emergencia de la ORGANIZACIÓN (plan de respuesta).
create table organization_emergency_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  role text,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now()
);
alter table organization_emergency_contacts enable row level security;
create policy org_emergency_contacts_select on organization_emergency_contacts
  for select using (organization_id in (select v2_current_organization_ids()));
create policy org_emergency_contacts_write on organization_emergency_contacts
  for all using (v2_is_duty_manager(organization_id)) with check (v2_is_duty_manager(organization_id));

-- ── Versiones del APK de Android (actualización OTA). Es una tabla de la APLICACIÓN, no de una organización:
--    la ruta pública GET /api/app/version la lee con la llave anónima y solo la fila vigente.
create table app_releases (
  id uuid primary key default gen_random_uuid(),
  version_name text not null,
  version_code integer not null,
  apk_url text not null,
  release_notes text,
  force_update boolean not null default false,
  is_current boolean not null default true,
  created_at timestamptz not null default now()
);
alter table app_releases enable row level security;
create policy public_read_current_version on app_releases for select using (is_current = true);

-- ── Catálogo de departamentos y municipios (DANE). Referencia pública: se copia tal cual en el ETL.
create table colombia_geo (
  code text primary key,
  department text not null,
  municipality text not null
);
comment on table colombia_geo is 'Catálogo DIVIPOLA: código de municipio, departamento y municipio. Copia directa de v1 (`colombia_geo`, columnas con tildes).';
alter table colombia_geo enable row level security;
create policy colombia_geo_select on colombia_geo for select using (auth.uid() is not null);
