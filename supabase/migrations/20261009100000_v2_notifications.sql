-- Skylog V2.0 — notificaciones dentro de la app (campana). Una fila por destinatario (persona) y organización. Cada
-- persona solo ve, marca y descarta las suyas; NADIE puede insertar desde el cliente: solo el servidor (llave de servicio)
-- las crea, después de resolver a quién le corresponden (por rol o por persona, siempre dentro de la organización).
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  person_id uuid not null references public.people(id) on delete cascade,
  type text not null check (type in ('mision_programada', 'manual_publicado', 'miembro_nuevo', 'sms_reporte', 'sms_caso_asignado', 'sms_plazo', 'custodia_abierta', 'vencimiento', 'anuncio', 'sistema')),
  title text not null check (length(btrim(title)) > 0),
  body text,
  link text check (link is null or (link like '/%' and link not like '//%')), -- solo rutas internas
  actor_person_id uuid references public.people(id) on delete set null,
  dedupe_key text,
  metadata jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_person_idx on public.notifications (person_id, created_at desc);
create index if not exists notifications_person_unread_idx on public.notifications (person_id) where read_at is null;
create index if not exists notifications_org_idx on public.notifications (organization_id);
create index if not exists notifications_actor_idx on public.notifications (actor_person_id);
-- Evita repetir el mismo aviso a la misma persona (p. ej. «la póliza vence pronto» cada día).
create unique index if not exists notifications_dedupe_uidx on public.notifications (person_id, dedupe_key) where dedupe_key is not null;

alter table public.notifications enable row level security;
create policy notifications_select_own on public.notifications for select to authenticated using (person_id = (select public.v2_current_person_id()));
create policy notifications_update_own on public.notifications for update to authenticated using (person_id = (select public.v2_current_person_id())) with check (person_id = (select public.v2_current_person_id()));
create policy notifications_delete_own on public.notifications for delete to authenticated using (person_id = (select public.v2_current_person_id()));
-- Un usuario solo puede marcar como leída (no reescribir título, texto ni enlace): se limita por columnas.
revoke update on public.notifications from authenticated, anon;
grant update (read_at) on public.notifications to authenticated;

-- Tiempo real: la campana se actualiza al instante (con sondeo de respaldo en el cliente).
alter publication supabase_realtime add table public.notifications;
