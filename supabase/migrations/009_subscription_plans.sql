-- ============================================================
-- TE CUIDA — Migración 009: Planes de suscripción
-- Requisitos: 16.1, 16.2
-- ============================================================
-- Sistema formal de planes:
--   - subscription_plans: planes configurables (no fijos)
--   - plan_applications: qué apps incluye cada plan
--   - municipalities.plan_id: FK al plan asignado
--   - trigger: al asignar un plan, sincroniza apps automáticamente
--   - mantener municipality_applications como override de "extras"
-- ============================================================

-- ============================================================
-- 1. TABLA: subscription_plans
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text        NOT NULL UNIQUE,
  nombre          text        NOT NULL,
  descripcion     text,
  precio_mensual  numeric(10,2),
  max_ciudadanos  integer,
  activo          boolean     NOT NULL DEFAULT true,
  orden           integer     NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT subscription_plans_precio_check
    CHECK (precio_mensual IS NULL OR precio_mensual >= 0),
  CONSTRAINT subscription_plans_max_ciudadanos_check
    CHECK (max_ciudadanos IS NULL OR max_ciudadanos > 0)
);

COMMENT ON TABLE public.subscription_plans IS
  'Planes de suscripción configurables. Cada plan agrupa un conjunto de aplicaciones.';

CREATE TRIGGER subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_subscription_plans_slug
  ON public.subscription_plans (slug);

CREATE INDEX IF NOT EXISTS idx_subscription_plans_activo_orden
  ON public.subscription_plans (activo, orden);


-- ============================================================
-- 2. TABLA: plan_applications (M2M plan <-> applications)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.plan_applications (
  plan_id        uuid NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  created_at     timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT plan_applications_pk PRIMARY KEY (plan_id, application_id)
);

COMMENT ON TABLE public.plan_applications IS
  'Aplicaciones incluidas en cada plan. Al asignar un plan a un municipio, estas apps se sincronizan automáticamente en municipality_applications.';

CREATE INDEX IF NOT EXISTS idx_plan_applications_plan
  ON public.plan_applications (plan_id);

CREATE INDEX IF NOT EXISTS idx_plan_applications_app
  ON public.plan_applications (application_id);


-- ============================================================
-- 3. AÑADIR plan_id A municipalities
-- ============================================================
ALTER TABLE public.municipalities
  ADD COLUMN IF NOT EXISTS plan_id uuid
    REFERENCES public.subscription_plans(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.municipalities.plan_id IS
  'Plan de suscripción del municipio. Al cambiarlo, las apps del plan se sincronizan automáticamente. tipo_suscripcion se mantiene por compatibilidad.';

CREATE INDEX IF NOT EXISTS idx_municipalities_plan
  ON public.municipalities (plan_id);


-- ============================================================
-- 4. RLS: subscription_plans
--    - Lectura: cualquier usuario autenticado (catálogo público)
--    - Escritura: solo superadmin (service_role_key)
-- ============================================================
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plans_public_read"
  ON public.subscription_plans
  FOR SELECT
  USING (activo = true);

-- plan_applications: lectura pública
ALTER TABLE public.plan_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plan_applications_public_read"
  ON public.plan_applications
  FOR SELECT
  USING (true);


-- ============================================================
-- 5. TRIGGER: sincronizar plan → municipality_applications
--    Se activa cuando:
--      a) Se asigna un plan a un municipio (plan_id cambia de NULL a un valor)
--      b) Se asigna el mismo plan (forzar resync con flag)
--    Política: solo añade apps del plan. NO elimina apps que el admin
--    haya añadido manualmente como "extras" (preservar override).
-- ============================================================

CREATE OR REPLACE FUNCTION public.sync_municipality_apps_from_plan()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si plan_id es NULL, no hacer nada (municipio sin plan)
  IF NEW.plan_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Insertar las apps del plan que no estén ya en el municipio
  -- (preserva los extras añadidos manualmente)
  INSERT INTO public.municipality_applications
    (municipality_id, application_id, activa, fecha_activacion)
  SELECT
    NEW.id,
    pa.application_id,
    true,
    now()
  FROM public.plan_applications pa
  WHERE pa.plan_id = NEW.plan_id
  ON CONFLICT (municipality_id, application_id) DO UPDATE
    SET activa = true,
        fecha_activacion = now();

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.sync_municipality_apps_from_plan() IS
  'Trigger: al asignar un plan a un municipio (o cambiarlo), sincroniza las apps del plan en municipality_applications. Las apps manuales (no incluidas en el plan) se preservan como extras.';

-- Crear trigger para INSERT y UPDATE de plan_id
DROP TRIGGER IF EXISTS municipalities_sync_plan_apps ON public.municipalities;

CREATE TRIGGER municipalities_sync_plan_apps
  AFTER INSERT OR UPDATE OF plan_id ON public.municipalities
  FOR EACH ROW
  WHEN (NEW.plan_id IS NOT NULL)
  EXECUTE FUNCTION public.sync_municipality_apps_from_plan();
