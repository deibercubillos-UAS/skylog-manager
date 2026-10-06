-- Skylog V2.0 — el ciclo de la misión (programada → despachada → cerrada) lo mueven SOLO el
-- Despacho y el Cierre (RPC del servidor), no un UPDATE directo. Solo branch `develop-v2` (regla O1).
--
-- Hallazgo de la prueba de RLS del Despacho: la política `missions_update` deja a un gestor
-- actualizar misiones, así que por PostgREST podía devolver una misión `despachada` a `programada`
-- o cambiarle PIC/aeronave después del despacho, contradiciendo la constancia. La API ya lo
-- rechaza (PATCH /api/missions/[id]), pero una regla que solo vive en la API se salta llamando a la
-- base directo — por eso va también aquí.
--
-- Solo aplica a usuarios finales (`authenticated`/`anon`). Dentro de las RPC `SECURITY DEFINER`
-- `current_user` es el dueño de la función, y el service role tampoco es un usuario final: ambos
-- siguen pudiendo mover el ciclo. Los gestores conservan programada ⇄ cancelada.
create or replace function v2_missions_lifecycle_guard()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if old.status in ('despachada', 'cerrada') then
    raise exception using
      errcode = '23001',
      message = format('La misión está %s: ya tiene constancia de despacho y no se puede modificar ni cancelar.', old.status);
  end if;

  if new.status in ('despachada', 'cerrada') then
    raise exception using
      errcode = '23001',
      message = 'Una misión solo pasa a despachada o cerrada mediante el Despacho y el Cierre de vuelo.';
  end if;

  return new;
end;
$$;

create trigger missions_lifecycle_guard before update on missions for each row execute function v2_missions_lifecycle_guard();

revoke execute on function v2_missions_lifecycle_guard() from public, anon, authenticated;
