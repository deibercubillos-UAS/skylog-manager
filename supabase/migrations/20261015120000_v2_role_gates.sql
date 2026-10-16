-- Matriz de permisos por rol (decisión del usuario 2026-10-15; docs/skylog-v2/70-matriz-de-permisos.md).
-- Las políticas permisivas existentes dejan escribir a cualquier «gestor» (GG/JP/GSMS). Estas políticas RESTRICTIVAS
-- se aplican además (AND) y limitan la escritura al subconjunto de roles que la matriz permite:
--   · Gerente General + Jefe de Pilotos: operación y flota (el Gerente SMS pasa a solo ver).
--   · Gerente General + Gerente SMS: SMS (el Jefe de Pilotos pasa a solo ver).
--   · Solo Gerente General: contactos de emergencia de la organización.
-- Reversible: basta borrar las políticas *_rolegate y la función v2_has_org_role.

create or replace function public.v2_has_org_role(p_organization_id uuid, p_roles text[])
 returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from memberships m join accounts a on a.person_id = m.person_id
    where a.auth_user_id = auth.uid() and m.organization_id = p_organization_id and m.status = 'activa' and m.role = any (p_roles));
$$;
revoke all on function public.v2_has_org_role(uuid, text[]) from public, anon;
grant execute on function public.v2_has_org_role(uuid, text[]) to authenticated;

do $$
declare
  g record;
  t text;
  cmd text;
  roles text[];
  f text;
begin
  for g in select * from (values
    (array['admin','jefe_pilotos','superadmin'],
     array['aircraft','aircraft_components','aircraft_models','batteries','maintenance_events','maintenance_programs',
           'maintenance_tasks','eta_items','missions','insurance_policies','checklists','duty_annual_certifications','duty_exceptions']),
    (array['admin','gerente_sms','superadmin'],
     array['unexpected_events','barriers','hazards','risk_assessments','risk_matrices','safety_indicators','safety_indicator_monthly',
           'safety_indicator_action_plans','sms_changes','sms_gap_assessments','sms_gap_question_visibility','sms_gap_questions',
           'sms_gap_responses','sms_implementation_plan','sms_implementation_tasks','sms_monthly_reports','sms_objectives',
           'sms_policies','sms_training_attendance','sms_training_sessions','organization_monthly_cycles']),
    (array['admin','superadmin'], array['organization_emergency_contacts'])
  ) as v(r, tabs)
  loop
    roles := g.r;
    foreach t in array g.tabs loop
      f := format('public.v2_has_org_role(organization_id, %L::text[])', roles);
      foreach cmd in array array['insert','update','delete'] loop
        if cmd = 'insert' then
          execute format('create policy %I on public.%I as restrictive for insert to public with check (%s)', t || '_insert_rolegate', t, f);
        elsif cmd = 'update' then
          execute format('create policy %I on public.%I as restrictive for update to public using (%s) with check (%s)', t || '_update_rolegate', t, f, f);
        else
          execute format('create policy %I on public.%I as restrictive for delete to public using (%s)', t || '_delete_rolegate', t, f);
        end if;
      end loop;
    end loop;
  end loop;
end $$;

-- Tablas hijas (sin organization_id propio): la organización sale de la fila madre.
create policy insurance_policy_aircraft_insert_rolegate on public.insurance_policy_aircraft as restrictive for insert to public
  with check (exists (select 1 from public.insurance_policies p where p.id = policy_id and public.v2_has_org_role(p.organization_id, array['admin','jefe_pilotos','superadmin']::text[])));
create policy insurance_policy_aircraft_delete_rolegate on public.insurance_policy_aircraft as restrictive for delete to public
  using (exists (select 1 from public.insurance_policies p where p.id = policy_id and public.v2_has_org_role(p.organization_id, array['admin','jefe_pilotos','superadmin']::text[])));
create policy legal_hold_flights_insert_rolegate on public.legal_hold_flights as restrictive for insert to public
  with check (exists (select 1 from public.legal_holds h where h.id = hold_id and public.v2_has_org_role(h.organization_id, array['admin','jefe_pilotos','superadmin']::text[])));
create policy legal_holds_insert_rolegate on public.legal_holds as restrictive for insert to public
  with check (public.v2_has_org_role(organization_id, array['admin','jefe_pilotos','superadmin']::text[]));
create policy sms_objective_indicators_insert_rolegate on public.sms_objective_indicators as restrictive for insert to public
  with check (exists (select 1 from public.sms_objectives o where o.id = objective_id and public.v2_has_org_role(o.organization_id, array['admin','gerente_sms','superadmin']::text[])));
create policy sms_objective_indicators_delete_rolegate on public.sms_objective_indicators as restrictive for delete to public
  using (exists (select 1 from public.sms_objectives o where o.id = objective_id and public.v2_has_org_role(o.organization_id, array['admin','gerente_sms','superadmin']::text[])));
