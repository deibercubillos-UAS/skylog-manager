-- Fix: POST /api/public/vor/[orgCode] y .../mor/[orgCode] devolvían 404
-- "Formulario no disponible para esta organización" para CUALQUIER envío,
-- porque exigían una fila en vor_mor_definitions que solo se crea si un
-- admin visitó el editor de formato y guardó al menos una vez. Verificado
-- contra producción: de las 17 organizaciones reales, ninguna tenía esa
-- fila — el formulario público se veía y se llenaba bien, pero el envío
-- final siempre fallaba. Encontrado en Fase 9 del plan de QA (2026-07-26).
--
-- El fix de código (POST crea la definición por defecto de forma perezosa
-- si no existe) ya cubre cualquier organización nueva hacia adelante. Este
-- backfill solo evita depender de que alguien intente enviar un reporte
-- primero para las organizaciones que ya existen hoy.
insert into vor_mor_definitions (organization_id, type, title, is_active)
select o.id, t.type,
  case t.type when 'VOR' then 'Reporte Voluntario de Ocurrencia (VOR)' else 'Reporte Obligatorio de Ocurrencia (MOR)' end,
  true
from organizations o
cross join (select unnest(array['VOR','MOR']) as type) t
where not exists (
  select 1 from vor_mor_definitions d
  where d.organization_id = o.id and d.type = t.type and d.is_active
);
