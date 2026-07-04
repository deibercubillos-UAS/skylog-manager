-- Circular AeroCivil 2026351070026944 (Solicitud de Información Operacional UAS 2026):
-- reporte mensual a gouas@aerocivil.gov.co, primeros 5 días de cada mes vencido.
-- Ver CLAUDE.md "Reporte Operacional Mensual UAS (AeroCivil)".

-- ID Autorización: lo asigna AeroCivil por misión aprobada — se captura manualmente
-- una vez llega la aprobación, no se puede derivar de nada existente.
alter table public.flight_authorizations
  add column if not exists aerocivil_auth_number text;

-- Línea de vista: se define al planear (misión u operación libre), no existía en
-- ningún lado del esquema. Vive en las 3 tablas de la cadena planeación → vuelo,
-- mismo patrón que mission_type/visual_condition (nullable, la UI exige llenarlo
-- en formularios nuevos; los vuelos históricos quedan en blanco, no se fabrica).
alter table public.flight_authorizations
  add column if not exists line_of_sight text check (line_of_sight in ('VLOS','EVLOS','BVLOS'));
alter table public.flight_plans
  add column if not exists line_of_sight text check (line_of_sight in ('VLOS','EVLOS','BVLOS'));
alter table public.flights
  add column if not exists line_of_sight text check (line_of_sight in ('VLOS','EVLOS','BVLOS'));

-- Nuevo tipo de notificación para el recordatorio mensual (días 1-5).
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type = any (array[
    'flight_scheduled','flight_dispatched','manual_published','drone_alert',
    'maintenance_due','invitation','document_updated','vor_mor','announcement',
    'system','aerocivil_report_due'
  ]));

-- Rastro de auditoría real de envío — evita que el cron insista indefinidamente
-- una vez el Gerente SMS marca el período como enviado, y deja constancia de
-- quién y cuándo lo hizo (útil ante una eventual verificación de AeroCivil).
create table public.aerocivil_monthly_reports (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  period          text not null, -- 'YYYY-MM', mes que se está reportando
  sent_at         timestamptz,
  sent_by         uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  unique (organization_id, period)
);

alter table public.aerocivil_monthly_reports enable row level security;

-- Mismo patrón de rol que safety_barriers (superadmin/admin/gerente_sms) — el
-- Gerente General (role admin) también puede marcarlo enviado, no solo el GSMS.
create policy aerocivil_monthly_reports_all on public.aerocivil_monthly_reports
  for all using (
    organization_id in (
      select profiles.organization_id from profiles
      where profiles.id = auth.uid()
        and profiles.role = any (array['superadmin','admin','gerente_sms'])
    )
  )
  with check (
    organization_id in (
      select profiles.organization_id from profiles
      where profiles.id = auth.uid()
        and profiles.role = any (array['superadmin','admin','gerente_sms'])
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Migración de datos: mission_type pasa de las 9 categorías libres de BitaFly a
-- las 10 categorías oficiales de la circular AeroCivil (decisión confirmada con
-- el usuario: reemplazar, no mantener un segundo campo paralelo). 3 mapeos son
-- aproximaciones documentadas por no tener equivalente 1-a-1 exacto:
--   - 'Agricultura de precisión' → 'Aspersión' (el uso dominante real de este
--     servicio en el mercado colombiano es fumigación, no solo sensado NDVI).
--   - 'Recreativo' y 'Otro' → 'Captura imágenes/datos' (ninguna de las 10
--     categorías oficiales contempla vuelo recreativo o casos atípicos; se usa
--     la categoría más genérica como fallback en vez de dejar el dato vacío).
-- flight_plans no tiene columna mission_type — no aplica.
update public.flights set mission_type = case mission_type
  when 'Fotografía / Video'        then 'Captura imágenes/datos'
  when 'Inspección técnica'        then 'Captura imágenes/datos'
  when 'Mapeo / Fotogrametría'     then 'Captura imágenes/datos'
  when 'Agricultura de precisión'  then 'Aspersión'
  when 'Vigilancia / Seguridad'    then 'Captura imágenes/datos - Vigilancia y seguridad'
  when 'Búsqueda y rescate'        then 'Apoyo atención calamidad pública, desastre, emergencia (PMU''s, medios de comunicación)'
  when 'Entrenamiento / Práctica'  then 'Instrucción'
  when 'Recreativo'                then 'Captura imágenes/datos'
  when 'Otro'                      then 'Captura imágenes/datos'
  else mission_type
end
where mission_type in (
  'Fotografía / Video','Inspección técnica','Mapeo / Fotogrametría','Agricultura de precisión',
  'Vigilancia / Seguridad','Búsqueda y rescate','Entrenamiento / Práctica','Recreativo','Otro'
);

update public.flight_authorizations set mission_type = case mission_type
  when 'Fotografía / Video'        then 'Captura imágenes/datos'
  when 'Inspección técnica'        then 'Captura imágenes/datos'
  when 'Mapeo / Fotogrametría'     then 'Captura imágenes/datos'
  when 'Agricultura de precisión'  then 'Aspersión'
  when 'Vigilancia / Seguridad'    then 'Captura imágenes/datos - Vigilancia y seguridad'
  when 'Búsqueda y rescate'        then 'Apoyo atención calamidad pública, desastre, emergencia (PMU''s, medios de comunicación)'
  when 'Entrenamiento / Práctica'  then 'Instrucción'
  when 'Recreativo'                then 'Captura imágenes/datos'
  when 'Otro'                      then 'Captura imágenes/datos'
  else mission_type
end
where mission_type in (
  'Fotografía / Video','Inspección técnica','Mapeo / Fotogrametría','Agricultura de precisión',
  'Vigilancia / Seguridad','Búsqueda y rescate','Entrenamiento / Práctica','Recreativo','Otro'
);
