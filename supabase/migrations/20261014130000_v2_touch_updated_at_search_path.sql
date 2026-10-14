-- Fija el search_path de la función de disparador (aviso del asesor de seguridad de Supabase).
alter function public.v2_touch_updated_at() set search_path = public;
