-- ============================================================
-- TE CUIDA — Migration 015: Calamonte hero_image_url → NULL
-- ============================================================
-- Aplica el contrato documentado en 007_add_hero_image.sql:
-- "NULL = fondo verde sólido". La migration 014 insertó Calamonte
-- con hero_image_url = '' (cadena vacía); este archivo convierte
-- el valor del row live a NULL para alinearlo con la semántica
-- documentada por el schema.
--
-- Idempotente: WHERE slug = 'calamonte' AND hero_image_url = ''
-- captura exactamente la fila objetivo y no afecta a otros
-- municipios que sí tienen URL real.
-- ============================================================

UPDATE public.municipalities
SET hero_image_url = NULL
WHERE slug = 'calamonte'
  AND hero_image_url = '';
