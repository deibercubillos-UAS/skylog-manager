-- ARDIS: schema aislado, completamente separado de "public" y "auth".
-- Ver ARDIS.md (raíz del repo) para la especificación completa.

create schema if not exists ardis;

create table ardis.projects (
  id uuid primary key default gen_random_uuid(),
  area text,                         -- SKY | WAS | BIT | PER
  name text not null,
  start_date date, due_date date,
  status text default 'active',      -- active | paused | done
  created_at timestamptz default now()
);

create table ardis.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references ardis.projects(id) on delete cascade,
  area text,
  title text not null,
  start_date date, due_at timestamptz,
  priority int default 2,            -- 1 alta · 2 media · 3 baja
  status text default 'inbox',       -- inbox | todo | waiting | done
  waiting_for text,
  recurrence text,                   -- weekly:MO | monthly:1
  depends_on uuid references ardis.tasks(id),
  done_at timestamptz,
  created_at timestamptz default now()
);

create table ardis.learned_phrases (
  pattern text primary key,
  action jsonb not null,
  hits int default 1
);

create table ardis.conversation (
  id int primary key default 1,
  summary text,                      -- resumen corto
  last jsonb                         -- últimos 4 mensajes
);

create table ardis.push_subscriptions (
  endpoint text primary key,
  keys jsonb not null,
  device text
);

-- Sin acceso para anon ni authenticated: solo el servidor (service_role)
alter table ardis.projects enable row level security;
alter table ardis.tasks enable row level security;
alter table ardis.learned_phrases enable row level security;
alter table ardis.conversation enable row level security;
alter table ardis.push_subscriptions enable row level security;
revoke all on schema ardis from anon, authenticated;
grant usage on schema ardis to service_role;
grant all on all tables in schema ardis to service_role;
