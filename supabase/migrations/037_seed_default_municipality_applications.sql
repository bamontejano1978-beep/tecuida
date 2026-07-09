-- ============================================================================
-- Migration 037: Seed default `municipality_applications` for Extremadura
--
-- Branch 2 del bug "apps no aparecen en landings" — aplicar SOLO si los
-- diagnostic logs muestran `apps_raw=0` después de deployar el fix de filter
-- en `src/app/page.tsx` (filter relaxed: ya NO descarta apps por
-- `applications.activa` global).
--
-- Hipótesis que esta migration resuelve:
--   El admin ha estado "asignando" apps desde el panel, pero las INSERT en
--   `municipality_applications` no llegaron a la DB (RLS silencioso, error
--   mapeado a 200, o cualquier regression en el endpoint admin PUT). El
--   discriminante `apps_raw=0` en el log `[landing-diagnostics]` confirma
--   que `_fetchMunicipalityApps(municipalityId)` no encuentra NINGUNA
--   asignación para el tenant.
--
-- Este script hace el sembrado defensivo:
--   · Para cada municipio extremeño de la seed (m.estado_suscripcion activo)
--   · Asignar TODAS las `applications.activa=true` globales.
--   · Idempotente via ON CONFLICT — re-ejecución no rompe nada.
--
-- CÓMO EJECUTAR (elegir una):
--   1. Supabase Studio → SQL editor → pegar este archivo → "Run".
--   2. CLI:
--        npx supabase db execute --linked --file supabase/migrations/037_seed_default_municipality_applications.sql
--   3. psql (con DATABASE_URL del `.env`):
--        psql "$DATABASE_URL" -f supabase/migrations/037_seed_default_municipality_applications.sql
--
-- POSTCONDICIÓN: tras aplicar, una request a https://<slug>.tecuida.group/
-- debería mostrar `apps_raw > 0` y `inactivas_globales_mostradas >= 0`
-- en [landing-diagnostics] (ver `vercel logs <deployment> | grep landing-diagnostics`).
-- Si aún muestra 0, ejecutar flush del cache de la landing:
--   bash scripts/flush-landing-cache.sh
-- ============================================================================

-- 1. Si no existe el unique constraint sobre (municipality_id, application_id),
--    añadirlo (el constraint permite que ON CONFLICT funcione).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'municipality_applications_municipality_id_application_id_key'
  ) THEN
    ALTER TABLE municipality_applications
      ADD CONSTRAINT municipality_applications_municipality_id_application_id_key
      UNIQUE (municipality_id, application_id);
  END IF;
END $$;

-- 2. Sembrar assignments: una fila por (municipio extremeño activo, app global activa).
--    Idempotente: si la fila ya existe, refresca `activa=true` y metadatos.
INSERT INTO municipality_applications (municipality_id, application_id, activa, created_at, updated_at)
SELECT
    m.id                    AS municipality_id,
    a.id                    AS application_id,
    TRUE                    AS activa,
    COALESCE(m.created_at, NOW()) AS created_at,
    NOW()                   AS updated_at
  FROM municipalities m
  CROSS JOIN applications a
 WHERE a.activa = TRUE
   -- Solo municipios extremeños sembrados por 008_seed_extremadura_municipalities.sql.
   -- El filtro `estado_suscripcion IN ('activa', 'prueba')` cubre los que NO estén
   -- suspendidos/cancelados (esos ya redirigen a /suspendido en el middleware).
   AND m.estado_suscripcion IN ('activa', 'prueba')
   AND m.oculto_admin = FALSE
ON CONFLICT (municipality_id, application_id)
DO UPDATE SET
    activa    = EXCLUDED.activa,
    updated_at = EXCLUDED.updated_at;

-- 3. Reporte operacional en psql (no afecta datos, solo informativo):
DO $$
DECLARE
    total_assignments   INTEGER;
    apps_per_tenant_min INTEGER;
    apps_per_tenant_max INTEGER;
    tenants_touched     INTEGER;
BEGIN
    SELECT count(*)                        INTO total_assignments
      FROM municipality_applications
     WHERE activa = TRUE;

    SELECT count(DISTINCT municipality_id) INTO tenants_touched
      FROM municipality_applications
     WHERE activa = TRUE;

    SELECT min(c), max(c)
      INTO apps_per_tenant_min, apps_per_tenant_max
      FROM (
        SELECT count(*) AS c
          FROM municipality_applications
         WHERE activa = TRUE
         GROUP BY municipality_id
      ) per_tenant;

    RAISE NOTICE 'Migration 037 report:';
    RAISE NOTICE '  · Total activas:                % assignments', total_assignments;
    RAISE NOTICE '  · Municipios con assignments:  % tenants',   tenants_touched;
    RAISE NOTICE '  · Apps per tenant (min–max):    % — %',
        COALESCE(apps_per_tenant_min, 0),
        COALESCE(apps_per_tenant_max, 0);
END $$;
