-- Límites del plan ajustados por el superadmin para una organización puntual (acuerdos comerciales, cortesías).
-- Llaves posibles: pilots, aircraft, batteries. Un número = ese límite; null = ilimitado; si la llave no está, rige el
-- límite del plan (src/lib/v2/planLimits.js, `effectiveLimits`). Solo lo escribe el servidor (llave de servicio):
-- `subscriptions` no tiene políticas de escritura para usuarios (migración 20261016120000).
alter table public.subscriptions
  add column if not exists limits_override jsonb
  check (limits_override is null or jsonb_typeof(limits_override) = 'object');

comment on column public.subscriptions.limits_override is
  'Ajuste de límites por organización: {"pilots": 8, "aircraft": null} — número = límite, null = ilimitado, llave ausente = el del plan.';
