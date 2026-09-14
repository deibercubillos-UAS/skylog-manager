-- El regalo de Master (free_grants, partner_id IS NULL) permite activar un
-- plan real sin pago — hoy el registro siempre aplicaba 'piloto' sin importar
-- el plan elegido en el formulario de invitación. Esta columna guarda el
-- plan real seleccionado; NOT NULL DEFAULT 'piloto' respalda también las
-- filas existentes (regalos de socios y de Master previos), que siempre
-- fueron y siguen siendo 'piloto' — sin cambio de comportamiento para ellas.
alter table free_grants
  add column plan text not null default 'piloto'
  check (plan in ('piloto', 'escuadrilla', 'flota', 'enterprise'));

comment on column free_grants.plan is
  'Plan a activar al canjear el regalo. Los de socio (partner_id no nulo) siempre quedan en piloto por regla de negocio (#9) — solo Master puede otorgar otro plan.';
