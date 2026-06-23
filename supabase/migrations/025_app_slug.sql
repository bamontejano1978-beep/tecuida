-- ============================================================
-- TE CUIDA — 025: Añadir app_slug a applications
-- ============================================================
-- app_slug identifica el subdominio de cada app (ej. "mindful30")
-- → mindful30.tecuida.group sirve la PWA de esa aplicación.
-- ============================================================

ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS app_slug text;

COMMENT ON COLUMN public.applications.app_slug IS
  'Slug único para el subdominio de la app (ej. "mindful30" → mindful30.tecuida.group). NULL = sin subdominio.';

-- Índice único para búsqueda rápida por slug desde el middleware
CREATE UNIQUE INDEX IF NOT EXISTS idx_applications_app_slug
  ON public.applications (app_slug)
  WHERE app_slug IS NOT NULL;
