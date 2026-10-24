-- Mantenimiento: ID consecutivo por organización (MNT-0001…), proveedor que lo realizó y enlace al informe del proveedor.
-- `supplier_id`: proveedor inscrito en Proveedores (opcional). `document_url`: enlace http(s) al informe; el PDF/imagen
-- sigue yendo por el adjunto (`document_path`).
alter table public.maintenance_events
  add column if not exists supplier_id uuid references public.suppliers(id) on delete set null,
  add column if not exists document_url text,
  add column if not exists sequence_number integer;

create index if not exists idx_maintenance_events_supplier on public.maintenance_events (supplier_id);

-- Eventos existentes: numerados por organización en el orden en que se registraron.
update public.maintenance_events m
   set sequence_number = n.rn
  from (select id, row_number() over (partition by organization_id order by created_at, id) rn from public.maintenance_events) n
 where m.id = n.id and m.sequence_number is null;

create unique index if not exists maintenance_events_org_sequence_key on public.maintenance_events (organization_id, sequence_number);

-- Numeración consecutiva por organización; el bloqueo asesor evita dos eventos simultáneos con el mismo número.
create or replace function public.maintenance_events_assign_sequence()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.sequence_number is null then
    perform pg_advisory_xact_lock(hashtext('maintenance_events:' || new.organization_id::text));
    select coalesce(max(sequence_number), 0) + 1 into new.sequence_number
      from public.maintenance_events where organization_id = new.organization_id;
  end if;
  return new;
end;
$$;

drop trigger if exists maintenance_events_assign_sequence on public.maintenance_events;
create trigger maintenance_events_assign_sequence
  before insert on public.maintenance_events
  for each row execute function public.maintenance_events_assign_sequence();
