-- ============================================================
-- TE CUIDA — 029: Saneo de apps tipo='programa' sin programa asociado
-- ============================================================
-- Bug origin: El formulario de creación tenía `tipo='programa'` como
-- default. Si un admin creaba una app con la opción "URL externa" o
-- "Subir ZIP" sin cambiar el tipo manualmente, la app quedaba registrada
-- como `programa` pero sin fila correspondiente en `programs`.
--
-- Consecuencia: al hacer click desde el dashboard, /app/[id]/page.tsx
-- consultaba `programs` con .single() → PGRST116 → notFound() → 404.
--
-- Esta migración sanea los datos huérfanos cambiando el tipo a
-- 'herramienta' para esas apps. Combinada con:
--   - el fix de UX en create-form.tsx (defensa en profundidad)
--   - el fix de página en /app/[id]/page.tsx y /apps/[appSlug]/page.tsx
--     (fallback a GenericLanding)
-- garantiza que los ciudadanos siempre verán contenido útil.
--
-- Idempotente: la WHERE del UPDATE solo afecta apps huérfanas, así
-- que ejecutar la migración dos veces es no-op la segunda.
-- ============================================================

BEGIN;

-- ============================================================
-- SECCIÓN A — DRY RUN
-- ============================================================
-- Lista las apps afectadas ANTES del UPDATE. Como va dentro del
-- BEGIN/COMMIT, el output aparece en los logs al aplicar la
-- migración y permite revisarlo antes del COMMIT (en psql; otros
-- clientes como Supabase Studio aplican BEGIN/COMMIT de manera no
-- interactiva sin pausa de revisión).
--
-- Quien quiera revisar de verdad antes de tocar la BD, puede
-- ejecutar solo este SELECT contra un snapshot/read-replica:
--
-- \echo '--- DRY RUN: apps tipo=programa sin programa asociado ---'
-- SELECT a.id, a.nombre, a.tipo, a.url_acceso, a.activa, a.created_at
-- FROM applications a
-- WHERE a.tipo = 'programa'
--   AND NOT EXISTS (SELECT 1 FROM programs p WHERE p.application_id = a.id)
-- ORDER BY a.created_at;
-- -----------------------------------------------------------------
-- (La tabla public.applications no tiene columna created_at: ordenamos por nombre)
SELECT
  a.id,
  a.nombre,
  a.tipo                                AS tipo_actual,
  'herramienta' :: text                 AS tipo_nuevo,
  a.url_acceso                          AS url_externa,
  a.activa
FROM public.applications a
WHERE a.tipo = 'programa'
  AND NOT EXISTS (
    SELECT 1
    FROM public.programs p
    WHERE p.application_id = a.id
  )
ORDER BY a.nombre;

-- Conteo agregado (útil para el resumen post-migración)
SELECT
  COUNT(*) AS orphan_apps_count
FROM public.applications a
WHERE a.tipo = 'programa'
  AND NOT EXISTS (
    SELECT 1
    FROM public.programs p
    WHERE p.application_id = a.id
  );

-- ============================================================
-- SECCIÓN B — APLICAR FIX
-- ============================================================
-- Solo afecta apps que coincidan con los mismos criterios del DRY
-- RUN: tipo='programa' SIN registro asociado en `programs`.
-- Excluimos apps con programa (relación 1:1 válida) y apps que ya
-- tengan tipo distinto a 'programa'.
-- -----------------------------------------------------------------
UPDATE public.applications
SET tipo = 'herramienta'
WHERE tipo = 'programa'
  AND NOT EXISTS (
    SELECT 1
    FROM public.programs p
    WHERE p.application_id = applications.id
  );

-- Mensaje informativo al log de migración (psql / Supabase Studio)
DO $$
DECLARE
  affected INTEGER;
BEGIN
  GET DIAGNOSTICS affected = ROW_COUNT;
  RAISE NOTICE '✅ [migración 029] Apps saneadas: tipo programa → herramienta. Filas afectadas: %', affected;
END $$;

COMMIT;
