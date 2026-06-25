-- Seguridad: seed_standard_components() es SECURITY DEFINER y solo debe ejecutarse
-- como trigger (AFTER INSERT ON aircraft). Revocar EXECUTE para que NO sea invocable
-- vía /rest/v1/rpc por anon/authenticated. El trigger sigue funcionando (se ejecuta
-- como dueño de la tabla, no depende de este grant).
REVOKE EXECUTE ON FUNCTION public.seed_standard_components() FROM PUBLIC, anon, authenticated;
