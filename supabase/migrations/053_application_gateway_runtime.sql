-- ============================================================
-- 053_application_gateway_runtime.sql
--
-- Centraliza como se ejecuta cada aplicacion desde /apps/<slug-o-id>.
-- El codigo real puede vivir en TE CUIDA, Firebase u otro proveedor,
-- pero el acceso publico permanece estable en el Application Gateway.
-- ============================================================

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS app_provider text NOT NULL DEFAULT 'tecuida',
  ADD COLUMN IF NOT EXISTS launch_mode text NOT NULL DEFAULT 'landing';

ALTER TABLE public.applications
  DROP CONSTRAINT IF EXISTS applications_app_provider_check,
  ADD CONSTRAINT applications_app_provider_check
    CHECK (app_provider IN ('tecuida', 'firebase', 'external')),
  DROP CONSTRAINT IF EXISTS applications_launch_mode_check,
  ADD CONSTRAINT applications_launch_mode_check
    CHECK (launch_mode IN ('native', 'landing', 'redirect', 'embed'));

UPDATE public.applications
SET launch_mode = 'native'
WHERE tipo = 'programa'
  AND EXISTS (
    SELECT 1
    FROM public.programs p
    WHERE p.application_id = applications.id
  );

COMMENT ON COLUMN public.applications.app_provider IS
  'Proveedor tecnico donde vive la aplicacion: tecuida, firebase o external.';

COMMENT ON COLUMN public.applications.launch_mode IS
  'Modo de lanzamiento desde /apps/<slug-o-id>: native, landing, redirect o embed.';
