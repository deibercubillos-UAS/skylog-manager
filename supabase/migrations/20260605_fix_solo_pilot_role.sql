-- ══════════════════════════════════════════════════════════════════
-- MIGRACIÓN: Corregir rol de pilotos independientes
-- Fecha: 2026-06-05
-- ══════════════════════════════════════════════════════════════════

-- Un "piloto independiente" (type='solo' en /registro) es el único
-- miembro de su propia organización → debe tener role='admin' para
-- que las políticas RLS de aircraft, batteries, maintenance, etc.
-- le permitan gestionar su flota sin restricciones.
--
-- El bug: register/route.js forzaba normalizedRole='piloto' para
-- type='solo', pero private.can_manage_ops() solo permite
-- ['superadmin', 'admin', 'jefe_pilotos'].
--
-- Fix en código: register/route.js ahora asigna role='admin' para
-- type='solo' (piloto independiente = admin de su propia org).
--
-- Fix en BD: corrección one-time de perfiles ya creados con el bug.

SET session_replication_role = replica;

UPDATE public.profiles p
SET role = 'admin'
WHERE p.role = 'piloto'
  AND p.subscription_plan = 'piloto'
  AND (
    SELECT COUNT(*) FROM public.profiles p2
    WHERE p2.organization_id = p.organization_id
  ) = 1;

SET session_replication_role = DEFAULT;
