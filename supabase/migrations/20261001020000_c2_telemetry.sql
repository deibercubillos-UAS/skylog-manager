-- Skylog V2.0 — F2 reabierto (decisión 20 revertida, 2026-10-01): Comando y
-- Control en vivo. Esquema mínimo para "qué dron está en línea" + telemetría
-- + eventos, siguiendo el mapeo de 42-comando-control.md §4.4 contra
-- 100.415(a)(2)(iii). NO incluye nada de video (url_type/stream) todavía —
-- la decisión de servidor de medios (IVS vs MediaMTX) sigue sin tomarse
-- (42-comando-control.md §4.11); `video_url` queda nullable, listo para
-- cuando se decida, sin bloquear el resto.
--
-- Escritura: solo `c2-gateway` (servicio Node externo, fuera de Vercel) vía
-- service role — nunca el navegador directo, nunca Pilot 2 directo a
-- Supabase. El navegador solo LEE (polling/futuro realtime) a través de las
-- rutas Next.js (api/c2/sessions, api/c2/telemetry).

create table c2_sessions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  aircraft_id uuid references aircraft(id),
  drone_sn text not null,
  status text not null default 'offline' check (status in ('online', 'offline')),
  started_at timestamptz not null default now(),
  last_heartbeat_at timestamptz,
  ended_at timestamptz,
  video_url text,
  created_at timestamptz not null default now()
);

comment on table c2_sessions is '42-comando-control.md §4.4 — una fila por sesión de enlace C2 de un dron (vía A, RC + Pilot 2). "online" = heartbeat MQTT reciente (c2-gateway lo marca offline si no hay heartbeat en >10s, ver c2-gateway/src/index.js). video_url nullable hasta que se decida el servidor de medios (§4.11).';

create index c2_sessions_org_status_idx on c2_sessions (organization_id, status);

create table c2_telemetry (
  id bigint generated always as identity primary key,
  session_id uuid not null references c2_sessions(id) on delete cascade,
  recorded_at timestamptz not null default now(),
  latitude double precision,
  longitude double precision,
  height_m double precision,
  elevation_m double precision,
  attitude_pitch double precision,
  attitude_roll double precision,
  attitude_head double precision,
  horizontal_speed_ms double precision,
  vertical_speed_ms double precision,
  battery_pct int,
  link_quality int,
  mode_code text,
  mode_code_reason text
);

comment on table c2_telemetry is '42-comando-control.md §4.4 tabla de mapeo RAC 100 100.415(a)(2)(iii) → Cloud API. Una fila por muestra MQTT (~0,5 Hz, pushMode 0) — retención 12 meses, ver §4.8. El buffer en vivo (último valor) vive en memoria de c2-gateway, no aquí.';

create index c2_telemetry_session_recorded_idx on c2_telemetry (session_id, recorded_at desc);

create table c2_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references c2_sessions(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table c2_events is '42-comando-control.md §4.4(J)/§4.9 — mode_code_reason (HMS) y geofence_breach. Evidencia regulatoria, nunca se purga por cuota (igual que casos SMS).';

create index c2_events_org_created_idx on c2_events (organization_id, created_at desc);

alter table c2_sessions enable row level security;
alter table c2_telemetry enable row level security;
alter table c2_events enable row level security;

-- Lectura: cualquier miembro de la organización (igual que flights/missions).
-- Escritura: ninguna política de INSERT/UPDATE para authenticated/anon —
-- solo el service role (c2-gateway) escribe, mismo patrón que `notifications`.
create policy c2_sessions_select on c2_sessions
  for select using (
    exists (select 1 from memberships m where m.organization_id = c2_sessions.organization_id and m.person_id = v2_current_person_id() and m.status = 'activa')
  );

create policy c2_telemetry_select on c2_telemetry
  for select using (
    exists (
      select 1 from c2_sessions s
      join memberships m on m.organization_id = s.organization_id
      where s.id = c2_telemetry.session_id and m.person_id = v2_current_person_id() and m.status = 'activa'
    )
  );

create policy c2_events_select on c2_events
  for select using (
    exists (select 1 from memberships m where m.organization_id = c2_events.organization_id and m.person_id = v2_current_person_id() and m.status = 'activa')
  );
