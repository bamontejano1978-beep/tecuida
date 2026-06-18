-- ============================================================
-- TE CUIDA — Migration 021: Ingesta de assets municipales
-- ============================================================
-- Ingeste los 12 assets gráficos verificados (7 heroes + 5 escudos)
-- en la tabla de provenance `public.municipality_assets` (creada en
-- 019 + RLS abierto en 020) y actualiza `public.municipalities.hero_
-- image_url` + `public.municipalities.escudo_url` con las URLs públicas
-- de Supabase Storage que serán servidas por <MunicipalityHero /> +
-- <AssetAttribution />.
--
-- Datos fuente: ./tmp/assets-archive/manifest.json (round 2 del
-- scripts/discover-municipality-assets.ts), generado por discovery +
-- download contra Wikimedia REST + Commons imageinfo, con URLs
-- verificadas y metadatos de atribución extraídos de extmetadata.
--
-- Pre-condiciones:
--   * 019_municipality_assets.sql aplicada (tabla `municipality_assets`).
--   * 020_municipality_assets_rls.sql aplicada (SELECT USING (true)).
--   * El bucket Supabase Storage `municipalities` (público) debe existir
--     con los 12 archivos ya subidos. Esa responsabilidad está fuera
--     de esta migración: se delega al script
--     `scripts/discover-municipality-assets.ts --write` (que usa
--     service_role_key con privilegios de owner) o al dashboard de
--     Supabase. Sin los archivos en el bucket, las URLs de
--     municipalities.* apuntarán a 404 pero la migración sigue siendo
--     válida estructuralmente.
--
-- Decisiones:
--   * Patrón de URL pública:
--       https://dxxxhocqfuygngtxpuae.supabase.co/storage/v1/object/public/
--       municipalities/<slug>/<kind>.<ext>
--     (project-ref tomado de supabase/.temp/project-ref).
--   * 2 escudos quedan NULL con explicación en COMMENT ON COLUMN:
--       - jerez-de-los-caballeros: Wikimedia Commons solo expone versiones
--         raster (jpg/png) con nombres no canónicos que imageinfo no
--         resuelve. Necesario crear/vincular uno nuevo.
--       - villafranca-de-los-barros: idem; el escudo no existe en la
--         categoría Coats_of_arms_of_municipalities_of_Badajoz ni en
--         variantes de filename ensayadas.
--   * Esta migration NO toca storage.buckets ni storage.objects:
--     el rol SQL de db push no es owner de esas tablas de sistema
--     (SQLSTATE 42501 confirmado), por lo que el bucket y las políticas
--     de storage se gestionan fuera de SQL — vía script --write o
--     dashboard, no vía migration. El bucket con `public=true` ya
--     provee acceso público anónimo a sus objetos sin necesidad de
--     policies adicionales en storage.objects.
-- ============================================================


-- ----------------------------------------------------------------------------
-- 3. UPSERT 12 filas en `public.municipality_assets` con datos del manifest
-- ----------------------------------------------------------------------------
-- CTE `m` resuelve municipality_id desde slug (evita hardcodear UUIDs).
-- CTE `v` enumera los 12 assets verificados con todos los metadatos de
-- atribución necesarios para CC-BY-SA / dominio público.
-- INSERT ... ON CONFLICT (municipality_id, kind) DO UPDATE: idempotente —
--   si re-aplicamos la migración o llega un nuevo asset del mismo kind,
--   actualiza los campos en lugar de duplicar.
WITH m AS (
  SELECT id, slug
  FROM public.municipalities
  WHERE slug IN (
    'calamonte',
    'fuente-del-maestre',
    'jerez-de-los-caballeros',
    'llerena',
    'los-santos-de-maimona',
    'villafranca-de-los-barros',
    'zafra'
  )
)
INSERT INTO public.municipality_assets (
  municipality_id, kind, local_path, source_url,
  author, license, attribution_line, fetched_at
)
SELECT
  m.id,
  v.kind,
  v.local_path,
  v.source_url,
  v.author,
  v.license,
  v.attribution_line,
  v.fetched_at::timestamptz
FROM m
JOIN (
  VALUES
    -- ===== Heroes (7) =====
    ('calamonte',                'hero',   'calamonte/hero.jpg',
     'https://upload.wikimedia.org/wikipedia/commons/1/14/Calamonte_07_by-dpc.jpg',
     'David Perez',     'CC BY 4.0',     'David Perez, CC BY 4.0, vía Wikimedia Commons',
     '2026-06-16T19:45:16.744Z'),
    ('fuente-del-maestre',       'hero',   'fuente-del-maestre/hero.jpg',
     'https://upload.wikimedia.org/wikipedia/commons/2/28/Panoramica_la_fuente.jpg',
     '',                  'CC BY-SA 3.0', 'Imagen, CC BY-SA 3.0, vía Wikimedia Commons',
     '2026-06-16T19:45:23.182Z'),
    ('jerez-de-los-caballeros',  'hero',   'jerez-de-los-caballeros/hero.jpg',
     'https://upload.wikimedia.org/wikipedia/commons/f/f7/Iglesia_de_San_Juan_de_los_Caballeros%2C_Jerez_de_la_Frontera%2C_Espa%C3%B1a%2C_2015-12-07%2C_DD_30-32_HDR.JPG',
     'Diego Delso',     'CC BY-SA 4.0', 'Diego Delso, CC BY-SA 4.0, vía Wikimedia Commons',
     '2026-06-16T19:45:31.763Z'),
    ('llerena',                  'hero',   'llerena/hero.jpg',
     'https://upload.wikimedia.org/wikipedia/commons/a/a8/Llerena_-_005_%2830617160551%29.jpg',
     'Luis Rogelio HM', 'CC BY-SA 2.0', 'Luis Rogelio HM, CC BY-SA 2.0, vía Wikimedia Commons',
     '2026-06-16T19:45:50.218Z'),
    ('los-santos-de-maimona',    'hero',   'los-santos-de-maimona/hero.jpg',
     'https://upload.wikimedia.org/wikipedia/commons/c/c9/Los_Santos_de_Maimona_%28old_photo%29.jpg',
     'author unknown',    'Public domain','author unknown, Public domain, vía Wikimedia Commons',
     '2026-06-16T19:45:56.773Z'),
    ('villafranca-de-los-barros','hero',   'villafranca-de-los-barros/hero.jpg',
     'https://upload.wikimedia.org/wikipedia/commons/b/bb/Villafranca_de_los_Barros_aerial.jpg',
     'kallerna',         'CC BY-SA 4.0', 'kallerna, CC BY-SA 4.0, vía Wikimedia Commons',
     '2026-06-16T19:46:06.767Z'),
    ('zafra',                    'hero',   'zafra/hero.jpg',
     'https://upload.wikimedia.org/wikipedia/commons/a/a1/Zafra_pumila_03.jpg',
     'H. Zell',          'CC BY-SA 3.0', 'H. Zell, CC BY-SA 3.0, vía Wikimedia Commons',
     '2026-06-16T19:46:28.134Z'),

    -- ===== Escudos verificados (5) =====
    ('calamonte',                'escudo', 'calamonte/escudo.svg',
     'https://upload.wikimedia.org/wikipedia/commons/3/39/Escudo_de_Calamonte.svg',
     'SanchoPanzaXXI',  'CC BY-SA 4.0', 'SanchoPanzaXXI, CC BY-SA 4.0, vía Wikimedia Commons',
     '2026-06-16T19:45:18.652Z'),
    ('fuente-del-maestre',       'escudo', 'fuente-del-maestre/escudo.svg',
     'https://upload.wikimedia.org/wikipedia/commons/0/01/Escudo_de_Fuente_del_Maestre.svg',
     'SanchoPanzaXXI',  'CC BY-SA 4.0', 'SanchoPanzaXXI, CC BY-SA 4.0, vía Wikimedia Commons',
     '2026-06-16T19:45:25.080Z'),
    ('llerena',                  'escudo', 'llerena/escudo.svg',
     'https://upload.wikimedia.org/wikipedia/commons/e/e6/Escudo_de_Llerena.svg',
     'Gonzalo 11789',    'CC BY 4.0',    'Gonzalo 11789, CC BY 4.0, vía Wikimedia Commons',
     '2026-06-16T19:45:52.077Z'),
    ('los-santos-de-maimona',    'escudo', 'los-santos-de-maimona/escudo.png',
     'https://upload.wikimedia.org/wikipedia/commons/e/e0/Escudo_de_Los_Santos_de_Maimona.png',
     'Mojasa76',         'CC0',          'Mojasa76, CC0, vía Wikimedia Commons',
     '2026-06-16T19:46:00.370Z'),
    ('zafra',                    'escudo', 'zafra/escudo.jpg',
     'https://upload.wikimedia.org/wikipedia/commons/a/ae/Escudo_de_Zafra.jpg',
     'Ayuntamiento de Zafra',
     'CC BY-SA 4.0',    'Ayuntamiento de Zafra, CC BY-SA 4.0, vía Wikimedia Commons',
     '2026-06-16T19:46:32.937Z')
) AS v(slug, kind, local_path, source_url, author, license, attribution_line, fetched_at)
  ON m.slug = v.slug
ON CONFLICT (municipality_id, kind) DO UPDATE SET
  local_path        = EXCLUDED.local_path,
  source_url        = EXCLUDED.source_url,
  author            = EXCLUDED.author,
  license           = EXCLUDED.license,
  attribution_line  = EXCLUDED.attribution_line,
  fetched_at        = EXCLUDED.fetched_at;


-- ----------------------------------------------------------------------------
-- 4. UPDATE de public.municipalities con URLs Supabase Storage públicas
-- ----------------------------------------------------------------------------
-- Patrón:
--   https://dxxxhocqfuygngtxpuae.supabase.co/storage/v1/object/public/
--   municipalities/<slug>/<kind>.<ext>
-- 7 heroes: todos .jpg
-- 5 escudos (extension per-kind del manifest):
--   calamonte -> svg, fuente-del-maestre -> svg, llerena -> svg,
--   los-santos-de-maimona -> png, zafra -> jpg.
-- 2 escudos NULL explícito (jerez-de-los-caballeros, villafranca-de-los-barros).
-- ----------------------------------------------------------------------------
UPDATE public.municipalities
SET
  hero_image_url = CASE
    -- 7 heroes: todos .jpg
    WHEN slug IN (
      'calamonte', 'fuente-del-maestre', 'jerez-de-los-caballeros', 'llerena',
      'los-santos-de-maimona', 'villafranca-de-los-barros', 'zafra'
    ) THEN 'https://dxxxhocqfuygngtxpuae.supabase.co/storage/v1/object/public/municipalities/'
         || slug || '/hero.jpg'
    ELSE hero_image_url
  END,
  escudo_url = CASE
    -- Calamonte, Fuente del Maestre, Llerena -> SVG verificado
    WHEN slug IN ('calamonte', 'fuente-del-maestre', 'llerena')
      THEN 'https://dxxxhocqfuygngtxpuae.supabase.co/storage/v1/object/public/municipalities/'
           || slug || '/escudo.svg'
    -- Los Santos de Maimona -> PNG verificado
    WHEN slug = 'los-santos-de-maimona'
      THEN 'https://dxxxhocqfuygngtxpuae.supabase.co/storage/v1/object/public/municipalities/'
           || slug || '/escudo.png'
    -- Zafra -> JPG verificado (Escudo_de_Zafra.jpg, sin variante SVG en BD)
    WHEN slug = 'zafra'
      THEN 'https://dxxxhocqfuygngtxpuae.supabase.co/storage/v1/object/public/municipalities/'
           || slug || '/escudo.jpg'
    -- Jerez de los Caballeros y Villafranca de los Barros -> NULL
    -- (Wikimedia Commons no expone un archivo canónico resolvable vía
    --  imageinfo para estos municipios en la categoría Coats_of_arms_of_
    --  municipalities_of_Badajoz ni en variantes de filename. El componente
    --  <MunicipalityHero /> degrada elegantemente al fondo verde corporativo
    --  cuando escudo_url es NULL — coherente con el contrato documentado
    --  en 007_add_hero_image.sql.)
    WHEN slug IN ('jerez-de-los-caballeros', 'villafranca-de-los-barros')
      THEN NULL
    ELSE escudo_url
  END
WHERE slug IN (
  'calamonte', 'fuente-del-maestre', 'jerez-de-los-caballeros', 'llerena',
  'los-santos-de-maimona', 'villafranca-de-los-barros', 'zafra'
);


-- ----------------------------------------------------------------------------
-- 5. Actualizar COMMENT ON COLUMN para reflejar el nuevo contrato
-- ----------------------------------------------------------------------------
-- Tras esta migración, hero_image_url y escudo_url apuntan a URLs de
-- Supabase Storage (no URLs externas). La atribución se gestiona vía
-- public.municipality_assets (019) y se renderiza con <AssetAttribution />
-- bajo <MunicipalityHero />.
COMMENT ON COLUMN public.municipalities.hero_image_url IS
  'URL pública de Supabase Storage para el hero del municipio. Patrón: '
  'https://dxxxhocqfuygngtxpuae.supabase.co/storage/v1/object/public/'
  'municipalities/<slug>/hero.jpg. NULL = fondo verde corporativo. '
  'Atribución complementaria en public.municipality_assets (kind=''hero'').';

COMMENT ON COLUMN public.municipalities.escudo_url IS
  'URL pública de Supabase Storage para el escudo institucional del '
  'municipio (raster .jpg/.png o vector .svg). NULL = sin escudo verificado '
  '(caso de jerez-de-los-caballeros y villafranca-de-los-barros en esta '
  'migración 021; el componente MunicipalityHero degrada al fondo verde '
  'corporativo cuando es NULL). Atribución complementaria en '
  'public.municipality_assets (kind=''escudo'').';
