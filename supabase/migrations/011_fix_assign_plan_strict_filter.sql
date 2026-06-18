-- ============================================================
-- TE CUIDA — Migración 011: Fix DELETE filter en RPC
-- Resuelve Issue #1 del code review: la RPC
-- assign_municipality_plan borraba apps activas E inactivas
-- en strict/reset, cuando el comportamiento original
-- (TypeScript route.ts) solo borraba apps activas.
-- ============================================================
-- Cambio: añadir `AND activa = true` al WHERE del DELETE.
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
  --       ACTIVAS que no estén en el plan nuevo.
  --       Se preservan las apps con activa=false (desactivadas
  --       manualmente) para no perder ese estado.
  IF p_plan_id IS NOT NULL AND p_sync_mode IN ('strict', 'reset') THEN
    WITH deleted AS (
      DELETE FROM public.municipality_applications
      WHERE municipality_id = p_municipality_id
        AND activa = true
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
  'Asigna un plan a un municipio de forma atómica. Si sync_mode es strict/reset, elimina las apps ACTIVAS (activa=true) que no estén en el nuevo plan. Preserva apps desactivadas manualmente. El trigger sync_municipality_apps_from_plan añade las apps del plan tras el UPDATE. Errcodes emitidos: P0002 (municipio/plan no encontrado), 22023 (sync_mode inválido).';
