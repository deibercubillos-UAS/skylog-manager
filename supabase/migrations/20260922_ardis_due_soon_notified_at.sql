-- Evita spam de avisos: el cron de "vencimientos en menos de 24h" corre cada
-- hora, pero solo debe avisar UNA vez por tarea al cruzar la ventana de 24h.
alter table ardis.tasks add column if not exists due_soon_notified_at timestamptz;
