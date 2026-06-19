-- ============================================================
-- 022_remove_plans.sql
--
-- Elimina el sistema de planes de suscripción.
--   - Borra tablas: subscription_plans, plan_applications
--   - Borra columnas: municipalities.plan_id, municipalities.tipo_suscripcion
--   - Borra columna: applications.nivel_suscripcion
--   - Borra funciones y triggers asociados
-- ============================================================

BEGIN;

-- 1. Eliminar triggers y funciones asociadas a planes
DROP TRIGGER IF EXISTS municipalities_sync_plan_apps ON public.municipalities;
DROP FUNCTION IF EXISTS public.sync_municipality_apps_from_plan();
DROP FUNCTION IF EXISTS public.assign_municipality_plan(uuid, uuid, text);

-- 2. Eliminar columnas de la tabla municipalities
ALTER TABLE public.municipalities DROP COLUMN IF EXISTS plan_id;
ALTER TABLE public.municipalities DROP COLUMN IF EXISTS tipo_suscripcion;

-- 3. Eliminar tablas de planes (orden correcto: FK en plan_applications → subscription_plans)
DROP TABLE IF EXISTS public.plan_applications CASCADE;
DROP TABLE IF EXISTS public.subscription_plans CASCADE;

-- 4. Eliminar columna de nivel en aplicaciones
ALTER TABLE public.applications DROP COLUMN IF EXISTS nivel_suscripcion;

COMMIT;
