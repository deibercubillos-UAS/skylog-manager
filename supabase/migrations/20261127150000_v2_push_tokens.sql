-- Skylog V2.0 — tokens de dispositivo para notificaciones push nativas (FCM).
-- Cada fila es un dispositivo de una persona (el token que entrega Firebase al registrarse
-- la app móvil). El servidor los usa para enviar la notificación del sistema operativo
-- cuando se crea un aviso en la campana (lib/v2/push.js, mejor esfuerzo).
--
-- A diferencia de las tablas de datos operacionales, esto NO se comparte en la organización:
-- es del propio usuario, así que la RLS se ancla a la persona (v2_current_person_id()), más
-- estricto que organization_id. `organization_id` se guarda solo como contexto (la org activa
-- al registrarse) y puede ser nulo.
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id) on delete cascade,
  organization_id uuid references organizations(id) on delete set null,
  token text not null,
  platform text not null default 'android' check (platform in ('android', 'ios', 'web')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (person_id, token)
);

create index if not exists push_tokens_person_idx on public.push_tokens (person_id);

alter table public.push_tokens enable row level security;

-- Solo el dueño del dispositivo gestiona sus tokens. El envío desde el servidor usa la llave
-- de servicio (salta RLS), como el resto de notificaciones.
create policy push_tokens_select_own on public.push_tokens
  for select to authenticated using (person_id = (select public.v2_current_person_id()));
create policy push_tokens_insert_own on public.push_tokens
  for insert to authenticated with check (person_id = (select public.v2_current_person_id()));
create policy push_tokens_update_own on public.push_tokens
  for update to authenticated using (person_id = (select public.v2_current_person_id())) with check (person_id = (select public.v2_current_person_id()));
create policy push_tokens_delete_own on public.push_tokens
  for delete to authenticated using (person_id = (select public.v2_current_person_id()));
