-- Skylog V2.0 — adiciones de la licencia del piloto (CIPU) y requisito por misión.
-- RAC 100 §100.810(d): el PIC debe tener las adiciones que la operación exige (BVLOS, nocturno,
-- aspersión, etc.). Antes V2 solo guardaba el número de licencia; aquí se registran las adiciones
-- con su vigencia opcional y la misión puede declarar cuáles exige. Es informativo: avisa, no bloquea.

create table person_additions (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references people(id) on delete cascade,
  addition text not null,
  valid_until date,
  created_by uuid references people(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (person_id, addition)
);
comment on table person_additions is 'Adiciones vigentes de la licencia/CIPU de una persona (lista de packages/domain/src/pilotQualifications.js). valid_until nulo = sin vencimiento registrado.';

alter table person_additions enable row level security;

-- Ve las adiciones: la propia persona y quien comparta organización con ella (igual que `people`).
create policy person_additions_select on person_additions
  for select using (
    person_id = v2_current_person_id()
    or person_id in (
      select m.person_id from memberships m
      where m.organization_id in (select v2_current_organization_ids())
    )
  );

-- Escribe: la propia persona (como su certificado médico) o un gestor de una organización donde participa.
create policy person_additions_write on person_additions
  for all using (
    person_id = v2_current_person_id()
    or exists (
      select 1 from memberships m
      where m.person_id = person_additions.person_id and m.status = 'activa' and v2_is_duty_manager(m.organization_id)
    )
  ) with check (
    person_id = v2_current_person_id()
    or exists (
      select 1 from memberships m
      where m.person_id = person_additions.person_id and m.status = 'activa' and v2_is_duty_manager(m.organization_id)
    )
  );

-- Adiciones que exige la misión (lista vacía = ninguna). El servidor valida contra el catálogo.
alter table missions add column required_additions text[] not null default '{}';
comment on column missions.required_additions is 'Adiciones de licencia que el PIC debe tener para esta misión (§100.810(d)). Informativo.';
