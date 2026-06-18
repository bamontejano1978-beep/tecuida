-- ============================================================
-- TE CUIDA — Migration 020: RLS para public.municipality_assets
-- ============================================================
-- Habilita Row Level Security con política SELECT pública
-- para cerrar el vector de phishing detectado en el code review
-- de 019 (nit crítico #1):
--
--   Sin RLS, un atacante con anon_key podía INSERT/UPDATE rows
--   en public.municipality_assets seteando local_path a una URL
--   en su propio dominio. El componente MunicipalityHero consume
--   `escudo_url` y `hero_image_url` desde municipalities.* y un
--   futuro consumidor de locality_path desde esta tabla lo
--   habría renderizado tal cual — entregando una superficie
--   para phishing visual en cada render de landing municipal.
--
-- Esta tabla tiene un riesgo mayor que public.municipalities o
-- public.applications porque su contenido (URLs externas cacheadas
-- + atribución) es de alto impacto visual. RLS es la respuesta
-- mínima y proporcional.
--
-- Estrategia:
--   * SELECT USING (true): lectura abierta desde anon/key
--     pública. Necesario para que el componente renderice la
--     línea de atribución bajo cada asset (requisito legal de
--     CC-BY-SA y similares) y para que las landing públicas
--     resuelvan los assets sin requerir sesión autenticada.
--   * INSERT / UPDATE / DELETE: NO se crean políticas. service_role
--     bypasa RLS completamente, así que los scripts de discovery
--     y la futura migración que vuelque URLs a municipalities.*
--     pueden escribir sin fricción. anon/key pública NO puede
--     escribir porque no hay política explícita que lo permita.
--
-- Idempotencia:
--   * ALTER TABLE ... ENABLE ROW LEVEL SECURITY es no-op si ya
--     está habilitado (Postgres no lanza error al re-ejecutar).
--   * DROP POLICY IF EXISTS + CREATE POLICY permite re-aplicar
--     sin errores en CI / re-push de la migration.
-- ============================================================

ALTER TABLE public.municipality_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS municipality_assets_select_all
  ON public.municipality_assets;

CREATE POLICY municipality_assets_select_all
  ON public.municipality_assets
  FOR SELECT
  USING (true);

COMMENT ON POLICY municipality_assets_select_all
  ON public.municipality_assets IS
  'Lectura abierta desde anon/key pública para que el componente '
  'MunicipalityHero pueda renderizar las líneas de atribución '
  '(CC-BY-SA, dominio público, Unsplash License, etc.) bajo cada '
  'asset en la landing del municipio. INSERT/UPDATE/DELETE NO tienen '
  'política — solo service_role puede escribir (bypasea RLS). Esto '
  'cierra el vector de phishing donde un atacante con anon_key '
  'inyectaba un local_path malicioso en un row recién creado '
  '(nit crítico #1 del code review de 019_municipality_assets.sql).';
