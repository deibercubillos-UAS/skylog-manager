-- Reorganiza las categorías de la biblioteca libre de Protocolos en los 4
-- grupos establecidos por el usuario (Prevuelo/Reportes/Seguridad
-- Operacional/Mantenimiento), unificando el criterio de agrupación con el
-- resto de la página de Protocolos (checklists fijos + formatos VOR/MOR).
-- Ver CLAUDE.md "Protocolos — reorganización en 4 grupos".
--
-- Remapeo de las 5 categorías anteriores (sin equivalente 1-a-1 exacto para
-- 'En vuelo'/'Post-vuelo'/'Emergencia', decisión confirmada con el usuario):
--   Pre-vuelo      -> Prevuelo
--   En vuelo       -> Seguridad Operacional
--   Post-vuelo     -> Seguridad Operacional
--   Emergencia     -> Seguridad Operacional
--   Mantenimiento  -> Mantenimiento (sin cambio)

alter table public.protocols drop constraint if exists protocols_category_check;

update public.protocols set category = 'Prevuelo' where category = 'Pre-vuelo';
update public.protocols set category = 'Seguridad Operacional' where category in ('En vuelo', 'Post-vuelo', 'Emergencia');

alter table public.protocols
  add constraint protocols_category_check
  check (category in ('Prevuelo', 'Reportes', 'Seguridad Operacional', 'Mantenimiento'));
