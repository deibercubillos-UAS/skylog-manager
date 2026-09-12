-- F5 — políticas RLS reales sobre duty_periods/duty_exceptions/duty_annual_certifications.
-- Ahora sí es seguro escribirlas: dependen de `memberships` (identidad V2), que no existía
-- cuando se creó la migración f5_duty_compliance_tables (RLS quedó deny-all a propósito).
-- Ver docs/skylog-v2/31-esquema-datos.md §3.1 · 34-seguridad.md.
--
-- Roles de gestión de tiempos de servicio: quien despacha/programa vuelos hoy en
-- producción (admin, jefe_pilotos, gerente_sms — CLAUDE.md PERMISSIONS.canManageOps).
-- No se crea una tabla de permisos aparte todavía (regla E5) — el conjunto de roles
-- vive inline aquí y en el motor de dominio, mismo criterio que planLimits.js hoy.

create or replace function v2_is_duty_manager(p_organization_id uuid)
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
      and m.role in ('admin', 'jefe_pilotos', 'gerente_sms', 'superadmin')
  );
$$;

comment on function v2_is_duty_manager is 'RLS helper F5 — true si la sesión actual gestiona tiempos de servicio en esa organización (admin/jefe_pilotos/gerente_sms/superadmin).';

create or replace function v2_current_person_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select a.person_id from accounts a where a.auth_user_id = auth.uid();
$$;

comment on function v2_current_person_id is 'RLS helper — person_id de la sesión autenticada actual, vía accounts.auth_user_id.';

-- duty_periods: la persona ve y crea sus propios períodos; un gestor ve y gestiona
-- los de toda su organización (necesario para auto_dispatch/auto_close disparados por
-- otros flujos, y para cerrar un período que el piloto olvidó cerrar).
create policy duty_periods_select on duty_periods
  for select using (
    person_id = v2_current_person_id()
    or v2_is_duty_manager(organization_id)
  );

create policy duty_periods_insert on duty_periods
  for insert with check (
    person_id = v2_current_person_id()
    or v2_is_duty_manager(organization_id)
  );

-- UPDATE solo para cerrar un período abierto (poner ended_at), nunca para reescribir uno
-- ya cerrado — clase ④ evento: no se edita, se corrige con otro evento (30-entidades.md §1).
create policy duty_periods_update_close_only on duty_periods
  for update using (
    ended_at is null
    and (person_id = v2_current_person_id() or v2_is_duty_manager(organization_id))
  )
  with check (
    person_id = v2_current_person_id()
    or v2_is_duty_manager(organization_id)
  );

-- duty_exceptions: solo un gestor (Jefe de Pilotos u otro rol de gestión) puede
-- autorizar una excepción — 100.540 exige que la autorice el JP, no el propio piloto.
create policy duty_exceptions_select on duty_exceptions
  for select using (
    v2_is_duty_manager(organization_id)
    or duty_period_id in (
      select id from duty_periods where person_id = v2_current_person_id()
    )
  );

create policy duty_exceptions_insert on duty_exceptions
  for insert with check (v2_is_duty_manager(organization_id));

-- duty_annual_certifications: la persona ve la suya; solo un gestor certifica
-- (100.535(12) exige firma del Jefe de Pilotos).
create policy duty_annual_certifications_select on duty_annual_certifications
  for select using (
    person_id = v2_current_person_id()
    or v2_is_duty_manager(organization_id)
  );

create policy duty_annual_certifications_insert on duty_annual_certifications
  for insert with check (v2_is_duty_manager(organization_id));
