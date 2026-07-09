-- ============================================================================
-- Migration 038: Seed default `municipality_applications` for Extremadura
--                  (FIXED — schema-correct version of 037)
-- ============================================================================
--
-- Branch 2 del fix "apps no aparecen en landings" — aplicar esta migration
-- (NO migration 037, que tiene columnas incorrectas) si los diagnostic logs
-- muestran `apps_raw=0` después de deployar el filter relax en
-- `src/app/page.tsx` (ya NO descarta apps por `applications.activa` global).
--
-- Por qué una migration 038 y no usar 037:
--   Migration 037 fue escrita asumiendo columnas `created_at` y `updated_at`
--   en `municipality_applications`. El schema real (producción + sandbox a
--   fecha de hoy) usa solamente 4 columnas:
--     - municipality_id     uuid NOT NULL
--     - application_id      uuid NOT NULL
--     - activa              boolean NOT NULL
--     - fecha_activacion    timestamptz NOT NULL
--   Si se ejecuta 037 tal cual, falla con:
--     "column 'created_at' of relation 'municipality_applications' does not exist".
--
-- Esta migration 038 reproduce la misma intención que 037 pero alineada al
-- schema real: usa `fecha_activacion` como único campo temporal.
--
-- Hipótesis operativa:
--   El admin ha estado "asignando" apps desde el panel, pero las INSERT en
--   `municipality_applications` no llegaron de forma consistente (RLS
--   silencioso, error mapeado a 200, regresión en el endpoint admin PUT, o
--   cualquier combinación). El discriminante `apps_raw=0` en
--   `[landing-diagnostics]` confirma que el helper
--   `_fetchMunicipalityApps(municipalityId)` no encuentra asignaciones.
--
-- Este script hace el sembrado defensivo:
--   · Para cada municipio extremeño sembrado por 008 (estado_suscripcion
--     activo/prueba, oculto_admin = false)
--   · Asignar TODAS las `applications.activa=true` globales.
--   · Idempotente via ON CONFLICT — re-ejecución no rompe nada.
--
-- CÓMO EJECUTAR (elegir una):
--   1. Supabase Studio → SQL editor → pegar este archivo → "Run".
--   2. CLI:
--        npx supabase db query --linked --file supabase/migrations/038_seed_municipality_applications_FIXED.sql
--   3. psql (con DATABASE_URL del `.env`):
--        psql "$DATABASE_URL" -f supabase/migrations/038_seed_municipality_applications_FIXED.sql
--
-- POSTCONDICIÓN: tras aplicar, una request a https://<slug>.tecuida.group/
-- debería mostrar `apps_raw ~ 32` por tenant extremeño activo y
-- `inactivas_globales_mostradas >= 0` en
-- `[landing-diagnostics]` (ver `vercel logs <deployment> | grep landing-diagnostics`).
-- Si aún muestra 0 para algún tenant, ejecutar flush del cache:
--   bash scripts/flush-landing-cache.sh
-- ============================================================================

BEGIN;

-- 1. Si no existe el unique constraint sobre (municipality_id, application_id),
--    añadirlo (permite que ON CONFLICT funcione).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'municipality_applications_municipality_id_application_id_key'
  ) THEN
    ALTER TABLE municipality_applications
      ADD CONSTRAINT municipality_applications_municipality_id_application_id_key
      UNIQUE (municipality_id, application_id);
    RAISE NOTICE '[038] Añadido UNIQUE constraint (municipality_id, application_id).';
  ELSE
    RAISE NOTICE '[038] UNIQUE constraint ya existía — no-op.';
  END IF;
END $$;

-- 2. Sembrar assignments: una fila por (municipio extremeño activo, app global activa).
--    Idempotente: si la fila ya existe, refresca `activa=true` y `fecha_activacion`.
INSERT INTO municipality_applications (municipality_id, application_id, activa, fecha_activacion)
SELECT
    m.id  AS municipality_id,
    a.id  AS application_id,
    TRUE  AS activa,
    NOW() AS fecha_activacion
  FROM municipalities m
  CROSS JOIN applications a
 WHERE a.activa = TRUE
   -- Solo municipios extremeños sembrados por 008_seed_extremadura_municipalities.sql.
   -- El filtro `estado_suscripcion IN ('activa', 'prueba')` excluye suspendidos/
   -- cancelados (esos ya redirigen a /suspendido via middleware).
   AND m.estado_suscripcion IN ('activa', 'prueba')
   AND m.oculto_admin = FALSE
ON CONFLICT (municipality_id, application_id)
DO UPDATE SET
    activa           = EXCLUDED.activa,
    fecha_activacion = EXCLUDED.fecha_activacion;

-- 3. Reporte operacional (no afecta datos, solo informativo).
DO $$
DECLARE
    total_assignments   INTEGER;
    apps_per_tenant_min INTEGER;
    apps_per_tenant_max INTEGER;
    tenants_touched     INTEGER;
    tenants_sin_apps    INTEGER;
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

    -- Tenants extremeños seed que NO tienen ni una asignación activa (señal
    -- de que el filtro `estado_suscripcion IN ('activa','prueba')` no
    -- detectó correctamente alguna fila — útil para detectar bugs futuros).
    SELECT count(*)
      INTO tenants_sin_apps
      FROM municipalities m
     WHERE m.estado_suscripcion IN ('activa', 'prueba')
       AND m.oculto_admin = FALSE
       AND NOT EXISTS (
         SELECT 1
           FROM municipality_applications ma
          WHERE ma.municipality_id = m.id
            AND ma.activa = TRUE
       );

    RAISE NOTICE '========================================';
    RAISE NOTICE '[038] Migration report:';
    RAISE NOTICE '  · Total assignments activas:     %',     total_assignments;
    RAISE NOTICE '  · Tenants con assignments:       %',     tenants_touched;
    RAISE NOTICE '  · Apps per tenant (min–max):     % — %',
        COALESCE(apps_per_tenant_min, 0),
        COALESCE(apps_per_tenant_max, 0);
    RAISE NOTICE '  · Tenants seed sin apps (alerta): %',    tenants_sin_apps;
    RAISE NOTICE '========================================';
END $$;

COMMIT;
