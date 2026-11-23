-- Skylog V2.0 — SMS formularios (40b). Amplía la escritura a admin (Gerente General) además de gerente_sms y
-- superadmin: el GG ya administra hoy el enlace público de reporte, así que también configura el formulario.
-- Recrea las políticas de escritura de F0 (no se pueden ALTERar en Postgres) con el conjunto de roles mayor.

drop policy if exists sms_report_form_fields_insert on sms_report_form_fields;
drop policy if exists sms_report_form_fields_update on sms_report_form_fields;
drop policy if exists sms_report_form_fields_delete on sms_report_form_fields;
create policy sms_report_form_fields_insert on sms_report_form_fields
  for insert with check (v2_has_org_role(organization_id, '{gerente_sms,admin,superadmin}'));
create policy sms_report_form_fields_update on sms_report_form_fields
  for update using (v2_has_org_role(organization_id, '{gerente_sms,admin,superadmin}'))
  with check (v2_has_org_role(organization_id, '{gerente_sms,admin,superadmin}'));
create policy sms_report_form_fields_delete on sms_report_form_fields
  for delete using (v2_has_org_role(organization_id, '{gerente_sms,admin,superadmin}'));

drop policy if exists sms_report_public_links_select on sms_report_public_links;
drop policy if exists sms_report_public_links_insert on sms_report_public_links;
drop policy if exists sms_report_public_links_update on sms_report_public_links;
drop policy if exists sms_report_public_links_delete on sms_report_public_links;
create policy sms_report_public_links_select on sms_report_public_links
  for select using (v2_has_org_role(organization_id, '{gerente_sms,admin,superadmin}'));
create policy sms_report_public_links_insert on sms_report_public_links
  for insert with check (v2_has_org_role(organization_id, '{gerente_sms,admin,superadmin}'));
create policy sms_report_public_links_update on sms_report_public_links
  for update using (v2_has_org_role(organization_id, '{gerente_sms,admin,superadmin}'))
  with check (v2_has_org_role(organization_id, '{gerente_sms,admin,superadmin}'));
create policy sms_report_public_links_delete on sms_report_public_links
  for delete using (v2_has_org_role(organization_id, '{gerente_sms,admin,superadmin}'));
