-- ============================================================
-- TE CUIDA — Migración 010: RPC atómica para asignar plan
-- Resuelve el issue de atomicidad: el PUT actual hace DELETE
-- antes de UPDATE en transacciones separadas, lo que puede
-- dejar apps manuales borradas si el UPDATE falla.
-- ============================================================
-- Esta RPC ejecuta los 2 pasos en una sola transacción SQL,
-- con rollback automático ante cualquier error.
-- ============================================================

-- ============================================================
-- FUNCIÓN: public.assign_municipality_plan
-- Asigna un plan a un municipio de forma atómica, eliminando
-- opcionalmente las apps manuales que no estén en el plan
-- (modo 'strict' / 'reset').
--
-- El trigger sync_municipality_apps_from_plan (migración 009)
-- se encarga de añadir las apps del plan tras el UPDATE.
--
-- Parámetros:
--   p_municipality_id  uuid   — ID del municipio (requerido)
--   p_plan_id          uuid   — ID del plan (NULL = quitar plan)
--   p_sync_mode        text   — 'preserve_extras' (default) | 'strict' | 'reset'
--
-- Retorna: jsonb con
--   municipality_id, plan_id, sync_mode, apps_count, deleted_count
--
-- Seguridad:
--   - SECURITY DEFINER para bypasear RLS (necesario para que
--     service_role_key pueda ejecutar las operaciones).
--   - Valida FKs antes de tocar nada.
--   - Lanza excepciones claras para que la API las traduzca.
-- ============================================================

CREATE OR REPLACE FUNCTION public.assign_municipality_plan(
  p_municipality_id uuid,
  p_plan_id         uuid DEFAULT NULL,
  p_sync_mode       text  DEFAULT 'preserve_extras'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mun_slug              text;
  v_plan_exists           boolean;
  v_deleted_count         integer := 0;
  v_apps_count            integer := 0;
  v_result                jsonb;
BEGIN
  -- ── 1. Validar municipio ─────────────────────────────────
  SELECT slug INTO v_mun_slug
  FROM public.municipalities
  WHERE id = p_municipality_id;

  IF v_mun_slug IS NULL THEN
    RAISE EXCEPTION 'Municipio no encontrado: %', p_municipality_id
      USING ERRCODE = 'P0002';
  END IF;

  -- ── 2. Validar plan si se está asignando ────────────────
  IF p_plan_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.subscription_plans WHERE id = p_plan_id
    ) INTO v_plan_exists;

    IF NOT v_plan_exists THEN
      RAISE EXCEPTION 'Plan no encontrado: %', p_plan_id
        USING ERRCODE = 'P0002';
    END IF;
  END IF;

  -- ── 3. Validar sync_mode ────────────────────────────────
  IF p_sync_mode NOT IN ('preserve_extras', 'strict', 'reset') THEN
    RAISE EXCEPTION 'sync_mode inválido: % (esperado: preserve_extras, strict, reset)', p_sync_mode
      USING ERRCODE = '22023';
  END IF;

  -- ── 4. Si sync_mode es 'strict' o 'reset': eliminar apps
  --       manuales que no estén en el plan nuevo ───────────
  -- Todo lo que viene a partir de aquí está dentro de la
  -- misma transacción; si algo falla, todo hace rollback.
  IF p_plan_id IS NOT NULL AND p_sync_mode IN ('strict', 'reset') THEN
    WITH deleted AS (
      DELETE FROM public.municipality_applications
      WHERE municipality_id = p_municipality_id
        AND application_id NOT IN (
          SELECT application_id
          FROM public.plan_applications
          WHERE plan_id = p_plan_id
        )
      RETURNING 1
    )
    SELECT COUNT(*) INTO v_deleted_count FROM deleted;
  END IF;

  -- ── 5. Actualizar plan_id (dispara el trigger de sync
  --       que añade las apps del plan automáticamente) ─────
  UPDATE public.municipalities
  SET plan_id = p_plan_id
  WHERE id = p_municipality_id;

  -- Si 0 filas afectadas, el municipio desapareció entre
  -- el SELECT inicial y el UPDATE (race condition extrema).
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Municipio eliminado durante la operación: %', p_municipality_id
      USING ERRCODE = 'P0002';
  END IF;

  -- ── 6. Contar apps resultantes ──────────────────────────
  SELECT COUNT(*) INTO v_apps_count
  FROM public.municipality_applications
  WHERE municipality_id = p_municipality_id
    AND activa = true;

  -- ── 7. Construir resultado ──────────────────────────────
  v_result := jsonb_build_object(
    'municipality_id', p_municipality_id,
    'plan_id',         p_plan_id,
    'sync_mode',       p_sync_mode,
    'apps_count',      v_apps_count,
    'deleted_count',   v_deleted_count
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.assign_municipality_plan(uuid, uuid, text) IS
  'Asigna un plan a un municipio de forma atómica. Si sync_mode es strict/reset, elimina las apps manuales que no estén en el nuevo plan. El trigger sync_municipality_apps_from_plan añade las apps del plan tras el UPDATE.';

-- ============================================================
-- Permisos: el service_role_key puede ejecutar la RPC
-- (bypasea RLS por SECURITY DEFINER).
-- Los usuarios autenticados NO deberían poder ejecutarla
-- directamente — solo el panel admin (que usa service_role_key).
-- ============================================================
REVOKE ALL ON FUNCTION public.assign_municipality_plan(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_municipality_plan(uuid, uuid, text) TO service_role;
