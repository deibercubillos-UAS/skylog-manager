-- Membresías de la persona autenticada con la marca de «piloto independiente» en UNA sola consulta
-- (matriz de permisos, columna PI): Gerente General + plan «piloto» + único integrante activo.
create or replace function public.v2_my_memberships(p_person_id uuid)
 returns table (organization_id uuid, role text, independent boolean)
 language sql stable security definer set search_path to 'public' as $$
  select m.organization_id, m.role,
    (m.role = 'admin'
      and coalesce((select s.plan from subscriptions s where s.organization_id = m.organization_id), 'piloto') = 'piloto'
      and (select count(*) from memberships x where x.organization_id = m.organization_id and x.status = 'activa') <= 1) as independent
  from memberships m
  where m.person_id = p_person_id and m.status = 'activa' and p_person_id = public.v2_current_person_id();
$$;
revoke all on function public.v2_my_memberships(uuid) from public, anon;
grant execute on function public.v2_my_memberships(uuid) to authenticated;
