-- El mockup "Editar formato VOR/MOR" pide que el reportante pueda indicar
-- una severidad percibida y enlazar una barrera de seguridad existente al
-- enviar el reporte. Se guardan en columnas separadas de `severity`
-- (clasificación oficial RAC 100 que asigna el equipo SMS después de
-- revisar el caso) para no conflar la autoevaluación del reportante con
-- la clasificación regulatoria.
alter table public.vor_mor_submissions
  add column if not exists reported_severity text
    check (reported_severity in ('incidente','incidente_grave','accidente')),
  add column if not exists related_barrier_id uuid
    references public.safety_barriers(id) on delete set null;
