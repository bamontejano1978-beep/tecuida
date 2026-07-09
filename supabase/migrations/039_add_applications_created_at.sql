-- ============================================================================
-- Migration 039: Añadir `created_at` a public.applications + backfill
-- ============================================================================
--
-- CIERRA el badge "app NUEVO > últimos 7 días" en `src/app/page.tsx`
-- (`recentCategoryIds`). La columna nunca existió en el schema inicial
-- (migration 001 la omitió) ni en las 023/025 que añadieron instrucciones+
-- url_acceso+app_slug, así que el helper `_fetchMunicipalityApps` no podía
-- proyectarla y la landing pública degradaba la feature a no-op silencioso.
--
-- DECISIÓN DE BACKFILL: se usa `MIN(fecha_activacion)` por `application_id`,
-- no MAX. Justificación:
--   • `created_at` hace referencia semántica a "cuándo se añadió el app
--     al catálogo global" (lo que un ciudadano entiende como "NUEVO").
--   • Una app no puede asignarse a un municipio ANTES de existir en el
--     catálogo. Por tanto la primera asignación (MIN) es el límite
--     conservador más antiguo posible — refleja "lo más temprano que
--     pudimos saber sobre esta app".
--   • Si usáramos MAX, un app de hace 2 años recién asignada a un
--     ayuntamiento que se unió ayer volvería a etiquetarse como
--     "NUEVO" — incorrecto para los vecinos que ya la conocen.
--
-- IDEMPOTENCIA:
--   • `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` (Postgres 9.6+) blinda
--     re-aplicaciones: si la columna ya existe, el ALTER es no-op silente.
--   • El UPDATE subsiguiente es naturalmente idempotente: MIN re-computado
--     sobre los mismos datos da el mismo valor. Re-run no rompe nada.
--
-- POSTCONDICIÓN: tras deploy, `recentCategoryIds` en page.tsx volverá
-- a calcular apps "NUEVO" correctamente:
--   • Apps antiguas (fecha_activacion < hace 7 días) → no marcadas.
--   • Apps nuevas recién añadidas al catálogo → marcadas como NUEVO
--     durante 7 días desde su `created_at`.
--   • Apps en catálogo sin assignments nunca → DEFAULT NOW() las
--     etiqueta como "recién creadas"; coherente con su ausencia de
--     asignaciones.
-- ============================================================================

BEGIN;

-- 1. ALTER directo con IF NOT EXISTS. Apps huérfanas (sin assignments) y
--    nuevas inserts vía admin/create-form toman NOW() automáticamente.
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 2. Backfill desde municipality_applications.
--    CTE agrupa por application_id (un app puede estar asignada a
--    múltiples municipios con fechas DIFERENTES). MIN selecciona
--    la fecha más antigua — la primera vez que se activó.
--    Apps sin assignments caen al DEFAULT NOW() del ALTER.
WITH earliest_activations AS (
    SELECT application_id, MIN(fecha_activacion) AS primera_activacion
      FROM public.municipality_applications
     GROUP BY application_id
)
UPDATE public.applications a
   SET created_at = ea.primera_activacion
  FROM earliest_activations ea
 WHERE a.id = ea.application_id;

-- 3. COMMENT ON COLUMN documenta la decisión semántica para futuros devs.
COMMENT ON COLUMN public.applications.created_at IS
  'Cuándo se añadió esta app al catálogo global. Post-migration 039: backfilled desde MIN(fecha_activacion) en municipality_applications para apps pre-existentes; apps nuevas reciben NOW() por DEFAULT. Consumido por el filtro recentCategoryIds en src/app/page.tsx (badge NUEVO > últimos 7 días).';

COMMIT;
