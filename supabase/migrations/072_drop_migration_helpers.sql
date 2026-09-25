-- ============================================================
-- TE CUIDA — Migration 072: cierre de la migración de usuarios
-- ============================================================
-- La migración de datos al proyecto nuevo (te-cuida-prod) ha concluido:
-- todos los usuarios heredados se recrearon vía Admin API con sus UUID
-- originales y la tabla auxiliar ya no es necesaria.
-- ============================================================

DROP TABLE IF EXISTS public.migration_users;
DROP FUNCTION IF EXISTS public.import_legacy_user(uuid, text, text, text, int);
