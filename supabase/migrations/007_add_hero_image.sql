-- ============================================================
-- TE CUIDA — Migración 004: Añadir hero_image_url
-- ============================================================
-- Añade un campo para la imagen de fondo del hero en la landing
-- de cada municipio. Si es NULL, se usa un fondo verde sólido.
-- ============================================================

ALTER TABLE public.municipalities
  ADD COLUMN IF NOT EXISTS hero_image_url text;

COMMENT ON COLUMN public.municipalities.hero_image_url IS
  'URL de la imagen de fondo del hero en la landing page del municipio. NULL = fondo verde sólido.';
