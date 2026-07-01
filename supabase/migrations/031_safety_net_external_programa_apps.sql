-- ============================================================================
-- TE CUIDA — 031: Safety-net para apps de "URL externa" huérfanas
-- ============================================================================
-- Contexto histórico (migración 029 ya saneó los datos generales):
--
--   029: UPDATE applications SET tipo='herramienta' WHERE tipo='programa'
--        AND NOT EXISTS (programs.application_id = applications.id)
--        → cubre TODAS las apps huérfanas tipo='programa'.
--
-- Esta 031 NO es una duplicación — añade una salvaguarda específica para
-- apps que cumplen DOS condiciones simultáneamente:
--   (a) tipo='programa'        → bug latente: 404 al click en /app/<id>
--   (b) url_acceso IS NOT NULL → indica intención clara: era "URL externa"
--
-- Triple utilidad:
--   1. Si 029 nunca llegó a aplicarse en algún entorno (o quedó pendiente),
--      031 deja la BD consistente y deja trazas en el log con RAISE NOTICE.
--   2. Si alguien insertó una fila tipo='programa' con url_acceso
--      directamente vía SQL (bypassing el create-form) tras 029, 030
--      sólo avisa pero no corrige — esta migración sí corrige.
--   3. Es 100% idempotente: la cláusula WHERE garantiza que la segunda
--      ejecución es no-op (las filas afectadas en run 1 ya tienen
--      tipo='herramienta' y la nueva WHERE las excluye).
--
-- No tocamos filas que SÍ tengan registro en `programs` — esas son
-- programas legítimos y deben seguir siéndolo aunque tengan url_acceso
-- (caso PWA con fallback).
-- ============================================================================

BEGIN;

-- DRY RUN: muestra las filas candidatas ANTES del UPDATE
-- (queda en el log de la migración y permite auditoría rápida).
-- Nota: evitamos meta-comandos psql (\echo etc.) porque el runner de
-- migraciones de Supabase (libpq/RPC puro) no los soporta — en la
-- primera ejecución obtuvimos SQLSTATE 42601 hasta que lo eliminamos.
-- Tampoco referenciamos columns que no existen: la tabla applications
-- no tiene updated_at (sólo created_at NO existe en esta tabla;
-- trigger automatico sólo existe en municipalities), así que el UPDATE
-- sólo toca `tipo` y no mantiene un campo de auditoría propio.
SELECT
  a.id,
  a.nombre,
  a.tipo                              AS tipo_actual,
  'herramienta'::text                 AS tipo_nuevo,
  a.url_acceso                        AS url_externa,
  a.activa
FROM public.applications a
WHERE a.tipo = 'programa'
  AND a.url_acceso IS NOT NULL
  AND btrim(a.url_acceso) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.programs p
    WHERE p.application_id = a.id
  )
ORDER BY a.nombre;

-- ── APLICAR FIX ──────────────────────────────────────────────────────────
-- Criterios intencionalmente idénticos al DRY RUN de arriba:
--   · tipo='programa'
--   · url_acceso presente (no nulo, no vacío tras trim)
--   · sin fila correspondiente en programs
UPDATE public.applications a
SET tipo = 'herramienta'
WHERE a.tipo = 'programa'
  AND a.url_acceso IS NOT NULL
  AND btrim(a.url_acceso) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.programs p
    WHERE p.application_id = a.id
  );

-- ── LOG INFORMATIVO ──────────────────────────────────────────────────────
DO $$
DECLARE
  affected INTEGER;
BEGIN
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected > 0 THEN
    RAISE NOTICE '[031_safety_net_external] ✅ Apps sanadas (programa → herramienta): %', affected;
  ELSE
    RAISE NOTICE '[031_safety_net_external] ℹ️  Sin apps huérfanas — la BD ya estaba consistente.';
  END IF;
END $$;

COMMIT;
