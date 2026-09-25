-- TE CUIDA — migración 073: descripcion_override por municipio
-- ===========================================================================
-- Contexto: `applications.descripcion` es global (compartida por todos los
-- municipios). La gestora municipal solo puede personalizar lo "suyo", así
-- que la descripción editable se guarda en `municipality_applications`,
-- replicando el patrón existente de `thumbnail_url_override` (migración 037).
--
-- Reglas:
--   * NULL = usar la descripción global de `applications` (por defecto).
--   * '' (cadena vacía) = la gestora borró el texto: la app se muestra sin
--     descripción en este municipio (no hace "fallback" al global).
--   * Recorte a 1000 caracteres: el panel valida igual por UX; el CHECK
--     protege en BD ante cualquier escritura directa.
-- ===========================================================================

ALTER TABLE public.municipality_applications
  ADD COLUMN IF NOT EXISTS descripcion_override text;

-- Cohesionada con la validación del panel/API (max 1000 chars).
-- Con DROP ... (IF EXISTS implícito en `ADD CONSTRAINT IF NOT EXISTS`
-- previo); idempotente como el resto de la cadena.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'municipality_applications_descripcion_override_check'
  ) THEN
    ALTER TABLE public.municipality_applications
      ADD CONSTRAINT municipality_applications_descripcion_override_check
      CHECK (char_length(descripcion_override) <= 1000);
  END IF;
END;
$$;

COMMENT ON COLUMN public.municipality_applications.descripcion_override IS
  'Descripción específica del municipio (migración 073). NULL = usar applications.descripcion; '''' = mostrar sin descripción.';
