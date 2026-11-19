-- Skylog V2.0 — segundo factor (TOTP) opcional para todos los roles. Bandera por cuenta que marca si el usuario
-- activó un autenticador. Es solo una optimización de latencia: el contexto de sesión (`/api/duty/context`) ya lee
-- `accounts`, así que con esta columna evita llamar al servidor de Auth (`listFactors`) para el 99 % de usuarios sin
-- 2FA. La verdad última es el factor en Supabase Auth; cuando la bandera está activa y la sesión aún es aal1, el
-- contexto confirma con `listFactors` antes de exigir el código (auto-corrector, sin bucles). La mantienen: el perfil
-- al activar/desactivar y el endpoint del Gerente General al quitar el factor. Aditiva y reversible (drop de la columna).
alter table public.accounts add column if not exists mfa_enabled boolean not null default false;
comment on column public.accounts.mfa_enabled is 'El usuario activó un segundo factor (TOTP). Optimización de latencia del contexto de sesión; la verdad vive en Supabase Auth.';
