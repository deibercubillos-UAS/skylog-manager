-- Skylog V2.0 — agregar vuelos a una custodia activa es su propio evento de bitácora,
-- no una "apertura". Solo branch `develop-v2` (regla O1).
alter table legal_hold_events drop constraint if exists legal_hold_events_event_type_check;
alter table legal_hold_events
  add constraint legal_hold_events_event_type_check
  check (event_type in ('opened', 'flights_added', 'released', 'accessed'));
