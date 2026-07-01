-- ============================================================================
-- TE CUIDA — 032: Registro mínimo RGPD
-- ============================================================================
-- Contexto RGPD (art. 5.1.c — minimización de datos):
--   El registro anterior recolectaba nombre real, apellidos, teléfono y
--   fecha de nacimiento. Para cumplir el principio de minimización, el
--   nuevo registro solo pide email + contraseña + un alias opcional
--   (pseudónimo no identificable).
--
-- Cambios:
--   A) Nueva columna `alias` (text, nullable) — pseudónimo RGPD-safe.
--   B) `nombre` y `apellidos` pasan a ser NULLABLE (los usuarios
--      existentes conservan sus datos; los nuevos no los rellenan).
--   C) `telefono` y `fecha_nacimiento` ya eran nullable — sin cambios.
--
-- Las métricas de impacto NO se ven afectadas: analytics_events ya usa
-- user_id (UUID anónimo) + municipality_id, sin necesidad de PII.
-- ============================================================================

BEGIN;

-- A) Nueva columna alias (pseudónimo opcional, RGPD-compliant)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS alias text;

COMMENT ON COLUMN public.users.alias IS
  'Pseudónimo opcional elegido por el ciudadano. No es un dato personal identificable. Cumple RGPD art. 5.1.c (minimización).';

-- B) Hacer nullable nombre y apellidos para nuevos registros mínimos
--    Los usuarios existentes conservan sus valores (no se pierden datos).
ALTER TABLE public.users
  ALTER COLUMN nombre DROP NOT NULL;

ALTER TABLE public.users
  ALTER COLUMN apellidos DROP NOT NULL;

-- C) Log informativo
DO $$
BEGIN
  RAISE NOTICE '[032_rgpd_minimal] ✅ Columna alias añadida. nombre y apellidos ahora son nullable.';
END $$;

COMMIT;
