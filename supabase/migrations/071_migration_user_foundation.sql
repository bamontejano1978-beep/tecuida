-- ============================================================
-- TE CUIDA — Migration 071: fundación para la migración de usuarios
-- ============================================================
-- El proyecto original de Supabase (dxxxhocqfuygngtxpuae) es inaccesible:
-- su cuenta propietaria está perdida y se ha creado el proyecto nuevo
-- te-cuida-prod (gdcvrwlffwzwrojorysw). Esta migración prepara la
-- importación de usuarios heredados conservando sus UUID, para que las
-- FK de grants, códigos e inscripciones sigan apuntando bien.
--
-- La tabla migration_users NO forma parte del esquema de la app: es un
-- auxiliar de la migración y se eliminará tras completarla.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.migration_users (
  id uuid PRIMARY KEY,
  email text NOT NULL,
  alias text,
  genero text,
  anio_nacimiento int,
  imported_at timestamptz NOT NULL DEFAULT now()
);

-- Sin políticas: inaccesible por la Data API; solo service_role (bypassa RLS).
ALTER TABLE public.migration_users ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.import_legacy_user(
  p_id uuid,
  p_email text,
  p_alias text DEFAULT NULL,
  p_genero text DEFAULT NULL,
  p_anio_nacimiento int DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count int;
BEGIN
  SELECT count(*) INTO v_count FROM auth.users WHERE id = p_id;
  IF v_count > 0 THEN
    RETURN 'already_exists';
  END IF;

  INSERT INTO public.migration_users (id, email, alias, genero, anio_nacimiento)
  VALUES (p_id, p_email, p_alias, p_genero, p_anio_nacimiento)
  ON CONFLICT (id) DO NOTHING;

  RETURN 'inserted';
END;
$$;

REVOKE ALL ON FUNCTION public.import_legacy_user(uuid, text, text, text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.import_legacy_user(uuid, text, text, text, int) TO service_role;

GRANT SELECT, INSERT, UPDATE ON TABLE public.migration_users TO service_role;

COMMIT;
