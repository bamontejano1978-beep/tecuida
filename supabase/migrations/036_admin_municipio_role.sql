-- ============================================================================
-- TE CUIDA — 036: Rol admin_municipio para gestores de ayuntamiento
-- ============================================================================
-- Añade el rol 'admin_municipio' al CHECK constraint de users.rol.
--
-- Un admin_municipio:
--   - Pertenece a un municipio real (municipality_id != platform)
--   - Puede ver SOLO las estadísticas de su municipio en /municipio/estadisticas
--   - NO tiene acceso al panel /admin (solo superadmin)
--   - Se crea manualmente por el superadmin (no hay registro público)
--
-- La migración:
--   A) Elimina el CHECK constraint anónimo de users.rol
--   B) Crea uno nuevo incluyendo 'admin_municipio'
-- ============================================================================

BEGIN;

-- A) Encontrar y eliminar el constraint CHECK anónimo de rol
--    PostgreSQL genera nombres automáticos como users_rol_check
--    Usamos DO block para manejar el caso de que el nombre varíe
DO $$
DECLARE
  constraint_name text;
BEGIN
  SELECT con.conname INTO constraint_name
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  WHERE rel.relname = 'users'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) LIKE '%rol%';

  IF constraint_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.users DROP CONSTRAINT %I', constraint_name);
    RAISE NOTICE '[036_admin_municipio] ✅ Eliminado constraint: %', constraint_name;
  ELSE
    RAISE NOTICE '[036_admin_municipio] ⚠️ No se encontró constraint CHECK para rol';
  END IF;
END $$;

-- B) Crear nuevo constraint con admin_municipio incluido
ALTER TABLE public.users
  ADD CONSTRAINT users_rol_check
  CHECK (rol IN ('ciudadano', 'superadmin', 'admin_municipio'));

COMMENT ON CONSTRAINT users_rol_check ON public.users IS
  'Roles válidos: ciudadano (registro público), superadmin (plataforma), admin_municipio (gestor de ayuntamiento).';

-- C) Log informativo
DO $$
BEGIN
  RAISE NOTICE '[036_admin_municipio] ✅ Rol admin_municipio añadido al CHECK constraint de users.rol.';
END $$;

COMMIT;
