-- Permite que cada organización personalice el catálogo GAP del SMS
-- (Apéndice 1): agregar preguntas propias y ocultar (nunca borrar) preguntas
-- oficiales — a pedido del usuario, revierte la decisión original de Fase 4
-- ("catálogo global, no personalizable"). El catálogo oficial de 100
-- preguntas sigue intacto y compartido para el resto de organizaciones.

alter table public.sms_gap_questions
  add column if not exists organization_id uuid references public.organizations(id) on delete cascade,
  add column if not exists created_by uuid references public.profiles(id);

create index if not exists idx_sms_gap_questions_org on public.sms_gap_questions (organization_id);

-- Componente 5 = "Preguntas personalizadas de la organización" (las 100
-- oficiales siguen siendo componentes 1-4).
alter table public.sms_gap_questions drop constraint if exists sms_gap_questions_component_number_check;
alter table public.sms_gap_questions add constraint sms_gap_questions_component_number_check check (component_number between 1 and 5);

-- Reemplaza la política de lectura abierta: ahora también deben verse las
-- preguntas propias de cada organización (antes solo existían las globales).
drop policy if exists sms_gap_questions_select on public.sms_gap_questions;

create policy sms_gap_questions_select on public.sms_gap_questions
  for select using (
    organization_id is null
    or organization_id in (select organization_id from public.profiles where id = auth.uid())
  );

-- Escritura: solo sobre preguntas propias (organization_id = la del usuario)
-- y solo managers SMS — el catálogo oficial (organization_id null) nunca se
-- edita ni se borra desde la app, solo vía migración.
create policy sms_gap_questions_insert on public.sms_gap_questions
  for insert with check (
    organization_id is not null
    and organization_id in (
      select organization_id from public.profiles
      where id = auth.uid() and role in ('superadmin', 'admin', 'gerente_sms')
    )
  );

create policy sms_gap_questions_update on public.sms_gap_questions
  for update using (
    organization_id is not null
    and organization_id in (
      select organization_id from public.profiles
      where id = auth.uid() and role in ('superadmin', 'admin', 'gerente_sms')
    )
  ) with check (
    organization_id is not null
    and organization_id in (
      select organization_id from public.profiles
      where id = auth.uid() and role in ('superadmin', 'admin', 'gerente_sms')
    )
  );

create policy sms_gap_questions_delete on public.sms_gap_questions
  for delete using (
    organization_id is not null
    and organization_id in (
      select organization_id from public.profiles
      where id = auth.uid() and role in ('superadmin', 'admin', 'gerente_sms')
    )
  );

-- ── Visibilidad por organización (ocultar preguntas oficiales o propias
-- sin borrar el catálogo global) ──────────────────────────────────────────
create table if not exists public.sms_gap_question_visibility (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  question_id     uuid not null references public.sms_gap_questions(id) on delete cascade,
  hidden          boolean not null default true,
  created_at      timestamptz not null default now(),
  unique (organization_id, question_id)
);
create index if not exists idx_sms_gap_qvis_org on public.sms_gap_question_visibility (organization_id);

alter table public.sms_gap_question_visibility enable row level security;

create policy sms_gap_question_visibility_all on public.sms_gap_question_visibility
  for all using (
    organization_id in (
      select organization_id from public.profiles
      where id = auth.uid() and role in ('superadmin', 'admin', 'gerente_sms')
    )
  ) with check (
    organization_id in (
      select organization_id from public.profiles
      where id = auth.uid() and role in ('superadmin', 'admin', 'gerente_sms')
    )
  );

-- ── Descripción opcional por indicador SPI (para las plantillas de ejemplo
-- y para que managers documenten por qué se mide cada uno) ────────────────
alter table public.safety_indicators add column if not exists description text;
