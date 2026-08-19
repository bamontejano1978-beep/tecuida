-- TE CUIDA - 059: Workflow de publicacion municipal de aplicaciones
--
-- Separa "app entregada al municipio" de "app visible en la landing".
-- Las filas existentes se conservan como publicadas para no ocultar contenido
-- ya visible en produccion. Las nuevas asignaciones pueden quedar disponibles
-- hasta que el gestor municipal decida publicarlas.

ALTER TABLE public.municipality_applications
  ADD COLUMN IF NOT EXISTS publication_status text NOT NULL DEFAULT 'publicada',
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS hidden_at timestamptz,
  ADD COLUMN IF NOT EXISTS publication_updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS publication_updated_by uuid;

ALTER TABLE public.municipality_applications
  DROP CONSTRAINT IF EXISTS municipality_applications_publication_status_check,
  ADD CONSTRAINT municipality_applications_publication_status_check
    CHECK (publication_status IN ('disponible', 'publicada', 'oculta'));

UPDATE public.municipality_applications
SET
  publication_status = 'publicada',
  published_at = COALESCE(published_at, fecha_activacion, now()),
  hidden_at = NULL,
  publication_updated_at = COALESCE(publication_updated_at, now())
WHERE activa = true
  AND publication_status = 'publicada';

UPDATE public.municipality_applications
SET
  publication_status = 'oculta',
  hidden_at = COALESCE(hidden_at, now()),
  publication_updated_at = COALESCE(publication_updated_at, now())
WHERE activa = false
  AND publication_status = 'publicada';

CREATE INDEX IF NOT EXISTS idx_municipality_applications_publication
  ON public.municipality_applications (municipality_id, publication_status, activa);

COMMENT ON COLUMN public.municipality_applications.publication_status IS
  'Estado editorial de la app dentro del municipio: disponible=entregada pero no visible, publicada=visible en landing/catalogo, oculta=retirada por el gestor municipal.';

COMMENT ON COLUMN public.municipality_applications.published_at IS
  'Fecha en la que el gestor municipal publico la app en la landing municipal.';

COMMENT ON COLUMN public.municipality_applications.hidden_at IS
  'Fecha en la que el gestor municipal oculto la app de la landing municipal.';
