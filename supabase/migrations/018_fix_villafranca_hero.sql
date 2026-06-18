-- ============================================================
-- TE CUIDA — Migration 018: NULL hero para Villafranca de los Barros
-- ============================================================
-- Migration correctiva sobre 017 (que introdujo un Unsplash photo-ID
-- fabrication para Villafranca = URL que devuelve 404 silencioso en
-- el hero). Esta migration pone hero_image_url = NULL, alineándose
-- con el contrato documentado en 007_add_hero_image.sql:
--   "NULL = fondo verde sólido".
--
-- El componente MunicipalityHero degrada elegantemente cuando
-- hero_image_url es NULL (omitimos la capa de background-image y
-- aplicamos el degradado diagonal sobre el color corporativo
-- primario — exactamente el mismo render que Calamonte tuvo
-- entre las migrations 015 y 016 antes de ser poblado).
--
-- Idempotente: WHERE slug = 'villafranca-de-los-barros' AND
-- hero_image_url LIKE 'https://images.unsplash.com/%' captura
-- exactamente el Unsplash photo-ID injection de 017 sin afectar a:
--   - otros 5 municipios con Unsplash verificado (calamonte,
--     fuente, jerez-de-los-caballeros, llerena, zafra)
--   - Los Santos, cuyo hero viene de turismoextremadura (no de
--     Unsplash), asi que el LIKE no matchea
--   - cualquier valor futuro (URL per-municipio propia, Wikimedia
--     Special:FilePath de una plaza concreta, etc.) — el LIKE lo
--     respeta y el UPDATE no actua.
--
-- Proposito explicito: NUNCA volver a meter un Unsplash photo-ID
-- sin verificar primero con curl HEAD. El NULL es preferible a
-- un 404 silencioso que degrada la experiencia del visitante del
-- subdominio villafranca.tecuida.group.
-- ============================================================

UPDATE public.municipalities
SET hero_image_url = NULL
WHERE slug = 'villafranca-de-los-barros'
  AND hero_image_url LIKE 'https://images.unsplash.com/%';
