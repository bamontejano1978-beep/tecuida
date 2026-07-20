-- TE CUIDA — 050: icono personalizado por municipio y aplicación
-- El valor NULL mantiene la miniatura global de public.applications.

BEGIN;

ALTER TABLE public.municipality_applications
  ADD COLUMN IF NOT EXISTS thumbnail_url_override text;

COMMENT ON COLUMN public.municipality_applications.thumbnail_url_override IS
  'Icono opcional usado solo en la landing y el catálogo de este municipio; NULL hereda applications.thumbnail_url.';

COMMIT;
