-- ============================================================
-- TE CUIDA — Migración 035: Campos de contacto del municipio
-- ============================================================
-- Añade email_contacto y telefono_contacto a la tabla municipalities
-- para que el admin pueda personalizar los datos de contacto en el
-- footer de la landing page de cada municipio.
-- ============================================================

ALTER TABLE public.municipalities
  ADD COLUMN IF NOT EXISTS email_contacto text,
  ADD COLUMN IF NOT EXISTS telefono_contacto text;

COMMENT ON COLUMN public.municipalities.email_contacto IS 'Email de contacto público del ayuntamiento (footer landing page)';
COMMENT ON COLUMN public.municipalities.telefono_contacto IS 'Teléfono de contacto público del ayuntamiento (footer landing page)';
