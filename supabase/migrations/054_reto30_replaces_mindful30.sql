-- ============================================================
-- 054_reto30_replaces_mindful30.sql
--
-- Reto30 pasa a ser la aplicacion nativa de la plataforma que sustituye al
-- Mindful30 principal/Firebase. El contenido de Reto30 ya fue migrado en 028.
-- Esta migracion solo ajusta runtime, asignaciones municipales y retirada de
-- la entrada antigua para evitar redirecciones externas o codigos de canje.
-- ============================================================

BEGIN;

-- 1. Asegurar que Reto30 se ejecuta dentro de TE CUIDA.
UPDATE public.applications
   SET nombre = 'Reto30',
       descripcion = 'Transforma tu mente en 30 dias. Un viaje de bienestar con 3 pilares diarios: reflexion, actividad y relaciones.',
       activa = true,
       app_slug = 'reto30',
       brand_color = COALESCE(brand_color, '#14b8a6'),
       url_acceso = NULL,
       instrucciones = NULL,
       app_provider = 'tecuida',
       launch_mode = 'native'
 WHERE id = '22222222-0000-0000-0000-000000000028';

-- 2. Copiar a Reto30 las asignaciones municipales que tuviera Mindful30.
WITH reto30 AS (
  SELECT id
    FROM public.applications
   WHERE id = '22222222-0000-0000-0000-000000000028'
),
legacy_mindful30 AS (
  SELECT id
    FROM public.applications
   WHERE id <> '22222222-0000-0000-0000-000000000028'
     AND (
       app_slug IN ('mindful30', 'mindful30-adultos')
       OR lower(nombre) IN ('mindful30', 'mindful30 adultos')
       OR (
         lower(nombre) LIKE 'mindful30%'
         AND (app_provider = 'firebase' OR url_acceso ILIKE '%firebase%')
       )
     )
),
legacy_assignments AS (
  SELECT DISTINCT ma.municipality_id
    FROM public.municipality_applications ma
    JOIN legacy_mindful30 legacy ON legacy.id = ma.application_id
   WHERE ma.activa = true
)
INSERT INTO public.municipality_applications (
  municipality_id,
  application_id,
  activa,
  fecha_activacion
)
SELECT legacy_assignments.municipality_id,
       reto30.id,
       true,
       now()
  FROM legacy_assignments
 CROSS JOIN reto30
ON CONFLICT (municipality_id, application_id)
DO UPDATE SET
  activa = true,
  fecha_activacion = LEAST(
    public.municipality_applications.fecha_activacion,
    EXCLUDED.fecha_activacion
  );

-- 3. Ocultar la entrada antigua en landings municipales.
WITH legacy_mindful30 AS (
  SELECT id
    FROM public.applications
   WHERE id <> '22222222-0000-0000-0000-000000000028'
     AND (
       app_slug IN ('mindful30', 'mindful30-adultos')
       OR lower(nombre) IN ('mindful30', 'mindful30 adultos')
       OR (
         lower(nombre) LIKE 'mindful30%'
         AND (app_provider = 'firebase' OR url_acceso ILIKE '%firebase%')
       )
     )
)
UPDATE public.municipality_applications ma
   SET activa = false
  FROM legacy_mindful30 legacy
 WHERE ma.application_id = legacy.id;

-- 4. Retirar la ficha global antigua para que /apps/mindful30 caiga al alias
--    de codigo y resuelva Reto30, en vez de abrir Firebase.
WITH legacy_mindful30 AS (
  SELECT id
    FROM public.applications
   WHERE id <> '22222222-0000-0000-0000-000000000028'
     AND (
       app_slug IN ('mindful30', 'mindful30-adultos')
       OR lower(nombre) IN ('mindful30', 'mindful30 adultos')
       OR (
         lower(nombre) LIKE 'mindful30%'
         AND (app_provider = 'firebase' OR url_acceso ILIKE '%firebase%')
       )
     )
)
UPDATE public.applications app
   SET activa = false,
       url_acceso = NULL,
       app_provider = 'tecuida',
       launch_mode = 'landing',
       instrucciones = COALESCE(
         app.instrucciones,
         'Sustituida por Reto30 dentro de TE CUIDA.'
       )
  FROM legacy_mindful30 legacy
 WHERE app.id = legacy.id;

COMMIT;
