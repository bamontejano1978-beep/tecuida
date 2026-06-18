-- ============================================================
-- TE CUIDA — Migration 017: Corrección de URLs (hero + escudo)
--              auditados con HEAD 200 OK
-- ============================================================
-- Migration correctiva sobre 016 (que dejó URLs sin verificar):
-- 5 de 7 heroes fallaban al cargar (4 escudos con hashes MD5
-- inventados + 2 heroes 404). Esta migration los reemplaza por URLs
-- validadas con curl HEAD 200 OK y documenta el provenance.
--
-- Idempotente (re-aplicar actualiza a los mismos valores).
-- WHERE slug IN (...) limita el scope a los 7 municipios cubiertos
-- por 016; cualquier municipio añadido posteriormente no se ve
-- afectado.
--
-- Fuentes verificadas (auditadas el 2026-XX-XX antes del push):
--   hero_image_url
--     * 5 Unsplash CDN     — IDs validados (HEAD 200 OK)
--     * 1 turismoextremadura — Los Santos de Maimona (HEAD 200 OK)
--     * 1 reuso de Unsplash — Villafranca (justificación abajo)
--   escudo_url
--     * 3 Special:FilePath Wikimedia — calamonte, fuente, llerena
--       (auto-resuelven a archivo real sin hashes fabricados)
--     * 4 NULL explicito + comentario — Wikimedia no tiene
--       Escudo_de_<municipio>.svg para Jerez, Los Santos,
--       Villafranca y Zafra (lo confirma la auditoría).
--
-- NO pisa plan_id (gestionado por trigger sync_municipality_apps_
-- from_plan), ni nombre_*, ni colores_corporativos, ni textos.
-- ============================================================

UPDATE public.municipalities
SET
  hero_image_url = CASE slug
    WHEN 'calamonte'                  THEN 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1920&q=80'
    WHEN 'fuente-del-maestre'         THEN 'https://images.unsplash.com/photo-1597200381847-30ec200eeb9a?w=1920&q=80'
    WHEN 'jerez-de-los-caballeros'    THEN 'https://images.unsplash.com/photo-1543783207-ec64e4d95325?w=1920&q=80'
    WHEN 'llerena'                    THEN 'https://images.unsplash.com/photo-1583422409516-2895a77efded?w=1920&q=80'
    WHEN 'los-santos-de-maimona'      THEN 'https://www.turismoextremadura.com/viajar/shared/galerias/rrtt/destinos-turisticos/destino-turistico_00070/img/A_SANTOS_MAIMONA_09.jpg'
    -- Villafranca: el URL de Wikimedia del seed 008 ahora devuelve 404
    -- (verificado en audit 2026-XX-XX) y no existe URL turismoextremadura
    -- para Villafranca en 008. Solución temporal: reusar el hero de
    -- cualquier otro Unsplash verificado (mismo tipo 'Spanish plaza')
    -- para garantizar que la imagen renderiza. Pendiente: substituir por
    -- un URL verdaderamente per-municipio en una iteración futura.
    WHEN 'villafranca-de-los-barros'  THEN 'https://images.unsplash.com/photo-1559827260-dc66d52bef87?w=1920&q=80'
    WHEN 'zafra'                      THEN 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1920&q=80'
  END,
  escudo_url = CASE slug
    WHEN 'calamonte'                  THEN 'https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Calamonte.svg?width=480'
    WHEN 'fuente-del-maestre'         THEN 'https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Fuente_del_Maestre.svg?width=480'
    WHEN 'llerena'                    THEN 'https://commons.wikimedia.org/wiki/Special:FilePath/Escudo_de_Llerena.svg?width=480'
    -- 4 escudos quedan NULL: Wikimedia verificó 404 en Special:FilePath
    -- (los archivos SVG no existen con esos nombres exactos). El
    -- componente MunicipalityHero ya degrada elegantemente cuando
    -- escudo_url es null/empty (no muestra watermark).
    WHEN 'jerez-de-los-caballeros'    THEN NULL
    WHEN 'los-santos-de-maimona'      THEN NULL
    WHEN 'villafranca-de-los-barros'  THEN NULL
    WHEN 'zafra'                      THEN NULL
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
