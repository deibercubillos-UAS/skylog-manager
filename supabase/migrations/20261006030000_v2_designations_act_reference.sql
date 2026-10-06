-- Skylog V2.0 — designaciones con acta (RAC 100 §100.535(14)(15)(16)): Jefe de Pilotos y Ejecutivo
-- Responsable. Un rol en un desplegable no es evidencia; el acta con número y fecha sí.
alter table designations add column act_reference text, add column act_date date;
comment on column designations.act_reference is 'N.º/descripción del acta o resolución que nombra a la persona (RAC 100 §100.535(14)(15)(16)).';
comment on column designations.act_date is 'Fecha del acta de designación.';
