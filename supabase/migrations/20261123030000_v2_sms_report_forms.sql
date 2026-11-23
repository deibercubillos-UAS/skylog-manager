-- Skylog V2.0 — SMS: formularios MOR/VOR configurables + enlaces públicos por tipo (40b-sms-formularios-mor-vor.md).
-- F0 (esquema). Aditivo: no cambia los reportes existentes ni el enlace público actual (se sigue usando
-- organizations.sms_public_token hasta la F4; aquí solo se copian los tokens al nuevo modelo por tipo).
-- Cada tabla nueva lleva organization_id + RLS + permisiva v2 de escritura (no repetir el fallo de
-- safety_indicators: una compuerta restrictiva sin permisiva deja 0 filas en UPDATE/DELETE).

-- Definición del formulario por organización y tipo: campos estándar (ocultar/obligar/ordenar/renombrar) y
-- preguntas propias de la organización.
create table sms_report_form_fields (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  report_type text not null check (report_type in ('mor', 'vor')),
  kind text not null default 'custom' check (kind in ('standard', 'custom')),
  field_key text,                                  -- estándar: clave fija (event, severity, …); propio: null
  label text not null,
  input_type text not null check (input_type in ('text', 'textarea', 'select', 'date', 'number', 'boolean')),
  options jsonb not null default '[]'::jsonb,       -- para input_type = 'select'
  required boolean not null default false,
  visible boolean not null default true,
  locked boolean not null default false,           -- mínimo regulatorio: no se oculta ni se vuelve opcional
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, report_type, field_key) -- field_key NULL no colisiona: varias preguntas propias por tipo
);
create index sms_report_form_fields_org_type_idx on sms_report_form_fields (organization_id, report_type, sort_order);

-- Respuestas a las preguntas propias; los campos estándar siguen en sus columnas. No afecta lo ya guardado.
alter table sms_reports add column custom_fields jsonb not null default '{}'::jsonb;

-- Un enlace público por tipo (el token elige si el envío es MOR o VOR).
create table sms_report_public_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  report_type text not null check (report_type in ('mor', 'vor')),
  token text not null unique,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, report_type)
);
create index sms_report_public_links_org_idx on sms_report_public_links (organization_id);

-- Migrar el token público único actual al enlace VOR (el modelo viejo sigue vivo hasta la F4).
insert into sms_report_public_links (organization_id, report_type, token, enabled)
select id, 'vor', sms_public_token, true from organizations where sms_public_token is not null
on conflict (organization_id, report_type) do nothing;

alter table sms_report_form_fields enable row level security;
alter table sms_report_public_links enable row level security;

-- La definición la VEN los miembros de la organización (para renderizar el formulario); la EDITA el Gerente SMS.
create policy sms_report_form_fields_select on sms_report_form_fields
  for select using (organization_id in (select v2_current_organization_ids()));
create policy sms_report_form_fields_insert on sms_report_form_fields
  for insert with check (v2_has_org_role(organization_id, '{gerente_sms,superadmin}'));
create policy sms_report_form_fields_update on sms_report_form_fields
  for update using (v2_has_org_role(organization_id, '{gerente_sms,superadmin}'))
  with check (v2_has_org_role(organization_id, '{gerente_sms,superadmin}'));
create policy sms_report_form_fields_delete on sms_report_form_fields
  for delete using (v2_has_org_role(organization_id, '{gerente_sms,superadmin}'));

-- Los enlaces (tokens sensibles) solo los ve/gestiona el Gerente SMS; el endpoint público los lee con service role.
create policy sms_report_public_links_select on sms_report_public_links
  for select using (v2_has_org_role(organization_id, '{gerente_sms,superadmin}'));
create policy sms_report_public_links_insert on sms_report_public_links
  for insert with check (v2_has_org_role(organization_id, '{gerente_sms,superadmin}'));
create policy sms_report_public_links_update on sms_report_public_links
  for update using (v2_has_org_role(organization_id, '{gerente_sms,superadmin}'))
  with check (v2_has_org_role(organization_id, '{gerente_sms,superadmin}'));
create policy sms_report_public_links_delete on sms_report_public_links
  for delete using (v2_has_org_role(organization_id, '{gerente_sms,superadmin}'));
