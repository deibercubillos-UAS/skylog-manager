-- Skylog V2.0 — corrige la deduplicación de notificaciones. `notifications_dedupe_uidx` era un índice ÚNICO PARCIAL
-- (`where dedupe_key is not null`) y PostgREST no puede enviar el predicado en `ON CONFLICT`, así que
-- `upsert(..., { onConflict: 'person_id,dedupe_key' })` no lo infería. Un índice único completo sirve igual: en Postgres
-- los NULL nunca chocan entre sí, así que las notificaciones sin clave siguen sin restricción.
create unique index if not exists notifications_person_dedupe_key on public.notifications (person_id, dedupe_key);
-- Pendiente (a mano, cuando se quiera): el índice parcial anterior queda redundante.
--   drop index if exists public.notifications_dedupe_uidx;
