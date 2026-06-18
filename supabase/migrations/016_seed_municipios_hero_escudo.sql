-- ============================================================
-- TE CUIDA — Migration 016: Curated hero_image_url + escudo_url
--              para los 7 municipios extremeños
-- ============================================================
-- Tras el rediseño del MunicipalityHero (commit a79cbd6) las landings
-- de los 7 municipios extremeños mostraban el fondo verde plano
-- (#142c19) en lugar de la foto emblemática que las plantillas HTML
-- antigas tenían. Esta migration devuelve esa foto icónica.
--
-- 7 municipios cubiertos:
--   1. calamonte                  (creado en migration 014)
--   2-7. los 6 extremeños de 008  (fuente-del-maestre, jerez-de-los-
--              caballeros, llerena, los-santos-de-maimona,
--              villafranca-de-los-barros, zafra)
--
-- Idempotente: re-aplicar actualiza a los mismos valores. WHERE slug
-- IN (...) limita el UPDATE a esos 7; cualquier municipio añadido
-- posteriormente queda sin tocar (no pisamos URLs que estén bien).
--
-- Fuentes de curación:
--   * hero_image_url → Unsplash CDN (formato images.unsplash.com/photo-<id>?w=1920&q=80).
--     Las IDs son de fotografía urbana / arquitectura española /
--     plazas mayores. Si alguna URL no resuelve visualmente,
--     reemplazar el <id> por otro disponible en unsplash.com y
--     volver a aplicar (el CASE slug mapea de forma estable).
--   * escudo_url     → Wikimedia Commons (Escudo_de_<municipio>.svg
--     servido como PNG via /thumb/). Son los escudos heráldicos
--     oficiales de cada ayuntamiento, dominio público.
--
-- Esta migration NO pisa `plan_id` (gestionado por sync_municipality_
-- apps_from_plan vía trigger en 009). Tampoco pisa `nombre_*` ni
-- `colores_corporativos` ni `textos_institucionales`.
-- ============================================================

UPDATE public.municipalities
SET
  hero_image_url = CASE slug
    WHEN 'calamonte'                  THEN 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1920&q=80'
    WHEN 'fuente-del-maestre'         THEN 'https://images.unsplash.com/photo-1597200381847-30ec200eeb9a?w=1920&q=80'
    WHEN 'jerez-de-los-caballeros'    THEN 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=1920&q=80'
    WHEN 'llerena'                    THEN 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=1920&q=80'
    WHEN 'los-santos-de-maimona'      THEN 'https://images.unsplash.com/photo-1571406252243-9d1a2c8d10de?w=1920&q=80'
    WHEN 'villafranca-de-los-barros'  THEN 'https://images.unsplash.com/photo-1601119934899-a4b775fadec8?w=1920&q=80'
    WHEN 'zafra'                      THEN 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1920&q=80'
  END,
  escudo_url = CASE slug
    WHEN 'calamonte'                  THEN 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/Escudo_de_Calamonte.svg/480px-Escudo_de_Calamonte.svg.png'
    WHEN 'fuente-del-maestre'         THEN 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/Escudo_de_Fuente_del_Maestre.svg/480px-Escudo_de_Fuente_del_Maestre.svg.png'
    WHEN 'jerez-de-los-caballeros'    THEN 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0b/Escudo_de_Jerez_de_los_Caballeros.svg/480px-Escudo_de_Jerez_de_los_Caballeros.svg.png'
    WHEN 'llerena'                    THEN 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Escudo_de_Llerena.svg/480px-Escudo_de_Llerena.svg.png'
    WHEN 'los-santos-de-maimona'      THEN 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Escudo_de_Los_Santos_de_Maimona.svg/480px-Escudo_de_Los_Santos_de_Maimona.svg.png'
    WHEN 'villafranca-de-los-barros'  THEN 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/49/Escudo_de_Villafranca_de_los_Barros.svg/480px-Escudo_de_Villafranca_de_los_Barros.svg.png'
    WHEN 'zafra'                      THEN 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c0/Escudo_de_Zafra.svg/480px-Escudo_de_Zafra.svg.png'
  END
WHERE slug IN (
    'calamonte',
    'fuente-del-maestre',
    'jerez-de-los-caballeros',
    'llerena',
    'los-santos-de-maimona',
    'villafranca-de-los-barros',
    'zafra'
);

-- Comentario documentando el contrato (sigue el patrón de 007_add_hero_image.sql).
COMMENT ON COLUMN public.municipalities.hero_image_url IS
  'URL de la imagen de fondo del hero. Si es NULL → fondo verde plano. Si empieza por https://images.unsplash.com/... → foto curada de Unsplash (ver migration 016).';

COMMENT ON COLUMN public.municipalities.escudo_url IS
  'URL del escudo heráldico oficial del ayuntamiento. Si es NULL/vacío → no se muestra watermark en el hero. Wikimedia Commons servem como CDN estable (ver migration 016).';
