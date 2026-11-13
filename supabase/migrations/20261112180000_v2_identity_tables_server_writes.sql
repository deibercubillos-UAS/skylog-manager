-- Auditoría de seguridad 2026-11-12 — K5 (cambio de roles) y tablas de identidad: defensa en profundidad.
-- Las tablas que definen quién es quién y qué rol tiene (`memberships`, `people`, `accounts`, `organizations`,
-- `subscriptions`, `invitations`) solo las escribe el servidor (llave de servicio) tras comprobar la matriz. Hoy RLS ya
-- bloquea cualquier escritura con la sesión del usuario porque solo tienen política de SELECT, pero `anon` y
-- `authenticated` conservan INSERT/UPDATE/DELETE/TRUNCATE: bastaría una política permisiva futura (o un error al
-- crear una) para que un Jefe de Pilotos se ascendiera a Gerente General por PostgREST. Se quitan los permisos de
-- escritura: ni con una política olvidada se puede escribir. La lectura no cambia. Ninguna ruta escribe estas tablas con
-- la sesión del usuario (todas usan `createAdminClient()`), así que no cambia ningún comportamiento.
-- Reversible: grant insert, update, delete, truncate on table ... to anon, authenticated;
revoke insert, update, delete, truncate on table public.memberships from anon, authenticated;
revoke insert, update, delete, truncate on table public.people from anon, authenticated;
revoke insert, update, delete, truncate on table public.accounts from anon, authenticated;
revoke insert, update, delete, truncate on table public.organizations from anon, authenticated;
revoke insert, update, delete, truncate on table public.subscriptions from anon, authenticated;
revoke insert, update, delete, truncate on table public.invitations from anon, authenticated;
