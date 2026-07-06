-- Fase 1 del refactor multi-organización: las funciones RLS centrales pasan
-- a resolver vía organization_members + profiles.active_organization_id en
-- vez de profiles.organization_id/role directo. CREATE OR REPLACE preserva
-- el OID de cada función, así que las 106 políticas RLS existentes (39
-- tablas) se actualizan solas, sin editar ninguna política individual.
--
-- Alcance real: solo 5 funciones necesitan cambiar. has_role() y todo lo que
-- delega en ella (can_manage_ops/can_view_audit/can_view_finance/
-- can_close_any_flight/can_change_roles) ya se resuelven vía user_role(), así
-- que heredan el comportamiento correcto sin tocarlas.
--
-- Justo después del backfill de la Fase 0, el comportamiento debe ser
-- idéntico al de antes para todas las cuentas existentes (active_organization_id
-- = organization_id para todos). Verificado: 12/12 perfiles reales con
-- role_matches=true y org_matches=true.

create or replace function private.user_org_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  select active_organization_id from profiles where id = auth.uid();
$$;

create or replace function private.get_my_org_id()
returns uuid
language sql
security definer
set search_path = public
as $$
  select active_organization_id from profiles where id = auth.uid();
$$;

create or replace function private.get_my_org()
returns uuid
language sql
security definer
set search_path = public
as $$
  select active_organization_id from profiles where id = auth.uid();
$$;

-- Antes leía profiles.role directo; ahora resuelve el rol de la membresía
-- correspondiente a la organización activa. Mismo fallback ('piloto') que
-- antes si no hay membresía o no hay organización activa.
create or replace function private.user_role()
returns text
language sql
security definer
set search_path = public
as $$
  select case
    when private.is_superadmin() then 'superadmin'
    else coalesce(
      (select om.role
       from organization_members om
       join profiles p on p.active_organization_id = om.organization_id
       where om.user_id = auth.uid() and p.id = auth.uid()),
      'piloto')
  end;
$$;

-- Antes leía profiles.role directo (inconsistente con user_role(), que sí
-- aplica el override de superadmin) — ahora delega en user_role() para que
-- ambas funciones tengan siempre la misma noción de "mi rol", y de paso
-- queda multi-org-aware automáticamente.
create or replace function private.user_is_manager()
returns boolean
language sql
security definer
set search_path = public
as $$
  select private.user_role() in ('admin', 'superadmin', 'gerente_sms', 'jefe_pilotos');
$$;
