-- ============================================================
-- TE CUIDA — Migration 019: Tabla public.municipality_assets
-- ============================================================
-- Tabla de metadatos de provenance para los assets gráficos
-- (hero y escudo) de cada municipio. Cada fila representa UN
-- asset cacheado en Supabase Storage con provenance completo:
-- ruta local, URL original upstream, autor, licencia y línea de
-- atribución derivada para cumplimiento de las licencias de
-- origen (CC-BY-SA-4.0, CC-BY-4.0, dominio público, etc.).
--
-- Esta tabla es la fuente de verdad de auditoría para los
-- enlaces que las migraciones 016-018 plantaron en
-- municipalities.hero_image_url y municipalities.escudo_url.
-- La migración 020 (futura) volcará las URLs estables de
-- Supabase Storage a municipalities.* y esta tabla quedará
-- como registro histórico y de compliance.
--
-- Decisiones de diseño (alineadas con 001_initial_schema.sql
-- y 003_rls_policies.sql):
--   * UNIQUE (municipality_id, kind): un municipio tiene a lo
--     sumo un hero "current" y un escudo "current". Reemplazos
--     requieren DELETE + INSERT (o UPSERT).
--   * kind usa CHECK (text) en lugar de CREATE TYPE ENUM para
--     alinear con el patrón de public.applications.tipo y
--     public.lessons.tipo (más fácil de migrar y extender).
--   * RLS deshabilitado intencionalmente: estos datos son
--     metadatos públicos (atribución libre y legible). Solo el
--     superadmin (service_role_key) escribe; SELECT puede venir
--     desde anon/key pública para renderizar líneas de crédito
--     bajo el asset en el componente MunicipalityHero.
--     Misma política que public.municipalities y public.applications.
--   * ON DELETE CASCADE en municipality_id: coherente con users,
--     achievements y survey_answers — borrar el tenant elimina
--     también los assets asociados (compliance RGPD).
--   * Idempotencia: CREATE TABLE IF NOT EXISTS permite reaplicar
--     la migration en entornos CI sin error.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.municipality_assets (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  -- FK al tenant; CASCADE al borrar municipio.
  municipality_id   uuid        NOT NULL REFERENCES public.municipalities (id) ON DELETE CASCADE,
  -- Tipo de asset. Patrón CHECK (text) consistente con applications.tipo.
  kind              text        NOT NULL
                      CHECK (kind IN ('hero', 'escudo')),
  -- Ruta relativa dentro del bucket Supabase Storage.
  -- P.ej.: 'municipalities/calamonte/hero.jpg' o
  --       'municipalities/zafra/escudo.svg'.
  local_path        text        NOT NULL,
  -- URL upstream original (Wikimedia Commons, Unsplash,
  -- turismoextremadura.com, etc.) — útil para re-fetch y
  -- auditoría de licencias si el archivo upstream se mueve.
  source_url        text        NOT NULL,
  -- Autor tal y como aparece en la página del archivo fuente.
  -- Cadena vacía '' solo si el autor es anónimo y el asset es
  -- dominio público (no requiere atribución por ley).
  author            text        NOT NULL DEFAULT '',
  -- Identificador corto de la licencia. Ejemplos:
  --   'CC-BY-SA-4.0', 'CC-BY-4.0', 'CC0', 'Public Domain',
  --   'Unsplash License', 'turismoextremadura.com (todos los
  --   derechos reservados — uso con permiso implícito)'.
  license           text        NOT NULL,
  -- Línea de crédito ya formateada, lista para mostrar bajo el
  -- asset. P.ej.: 'Foto: P. García, CC-BY-SA-4.0, vía Wikimedia
  -- Commons'. Pre-formateada en el script de discovery para
  -- evitar re-parseo en runtime.
  attribution_line  text        NOT NULL,
  -- Momento en que el script de discovery descargó el asset y
  -- persistió esta fila. Útil para refrescos programados.
  fetched_at        timestamptz NOT NULL DEFAULT now(),

  -- Un municipio tiene como máximo un hero y un escudo "current".
  -- Reemplazos requieren DELETE + INSERT (o UPSERT).
  CONSTRAINT municipality_assets_municipality_kind_unique
    UNIQUE (municipality_id, kind)
);

COMMENT ON TABLE public.municipality_assets IS
  'Metadatos de provenance para los assets gráficos cacheados por '
  'municipio: una fila por (municipio, kind). Mantiene ruta local en '
  'Supabase Storage, URL original, autor, licencia y línea de '
  'atribución derivada para cumplir con las licencias de origen '
  '(CC-BY-SA, dominio público, etc.). Sustituye al esquema ad-hoc '
  'de migrations 016-018 al consolidar la fuente de verdad.';

COMMENT ON COLUMN public.municipality_assets.id IS
  'Identificador único universal (UUID v4)';

COMMENT ON COLUMN public.municipality_assets.municipality_id IS
  'FK al tenant. ON DELETE CASCADE: borrar el municipio elimina '
  'también sus assets (compliance RGPD y coherencia con users, '
  'achievements y survey_answers).';

COMMENT ON COLUMN public.municipality_assets.kind IS
  'Tipo de asset: hero (foto panorámica del municipio: plaza mayor, '
  'monumento emblemático, etc.) o escudo (heráldica oficial). '
  'Restringido por CHECK a estos dos valores — consistencia con el '
  'patrón de public.applications.tipo.';

COMMENT ON COLUMN public.municipality_assets.local_path IS
  'Ruta relativa dentro del bucket Supabase Storage. P.ej.: '
  '''municipalities/calamonte/hero.jpg'' o '
  '''municipalities/zafra/escudo.svg''. El componente MunicipalityHero '
  'debe prefijar esta ruta con la URL pública del bucket para '
  'componer el src final.';

COMMENT ON COLUMN public.municipality_assets.source_url IS
  'URL original upstream (Wikimedia Commons, Unsplash, '
  'turismoextremadura.com, etc.). Útil para re-fetch si el archivo '
  'upstream cambia de ubicación y para auditoría de licencias.';

COMMENT ON COLUMN public.municipality_assets.author IS
  'Nombre del autor tal y como aparece en la página del archivo '
  'fuente. Cadena vacía '''' solo si el autor es anónimo y el asset '
  'es dominio público.';

COMMENT ON COLUMN public.municipality_assets.license IS
  'Identificador corto de la licencia. P.ej.: ''CC-BY-SA-4.0'', '
  '''CC-BY-4.0'', ''CC0'', ''Public Domain'', ''Unsplash License'', '
  '''turismoextremadura.com (todos los derechos reservados — uso con '
  'permiso implícito)''';

COMMENT ON COLUMN public.municipality_assets.attribution_line IS
  'Línea de crédito ya formateada, lista para mostrar bajo el asset '
  'bajo cumplimiento de la licencia correspondiente. P.ej.: '
  '''Foto: P. García, CC-BY-SA-4.0, vía Wikimedia Commons''. '
  'Pre-formateada en el script de discovery para evitar re-parseo '
  'en runtime del componente.';

COMMENT ON COLUMN public.municipality_assets.fetched_at IS
  'Momento en que el script de discovery descargó el asset y '
  'persistió esta fila. Útil para programar refrescos futuros '
  '(p.ej.: re-fetch anual de las URLs upstream para detectar '
  'archivos movidos en Wikimedia Commons).';
