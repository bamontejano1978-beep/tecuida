-- TE CUIDA - 066: Retirar Mindful30 duplicado de la biblioteca municipal
--
-- Reto30 es la ficha canonica del programa principal de 30 dias. La ficha
-- antigua Mindful30/Mindful30 Adultos queda retirada para evitar duplicados en
-- la biblioteca municipal, manteniendo la compatibilidad tecnica de enlaces
-- antiguos mediante el alias /apps/mindful30 -> /apps/reto30 en codigo.

BEGIN;

DO $$
DECLARE
  reto30_id uuid := '22222222-0000-0000-0000-000000000028';
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM public.applications
     WHERE id = reto30_id
  ) THEN
    RAISE EXCEPTION 'No se encontro la aplicacion canonica Reto30';
  END IF;

  UPDATE public.applications
     SET nombre = 'Reto30',
         descripcion = 'Transforma tu mente en 30 dias. Un viaje de bienestar con 3 pilares diarios: reflexion, actividad y relaciones.',
         tipo = 'programa',
         activa = true,
         app_slug = 'reto30',
         brand_color = COALESCE(brand_color, '#14b8a6'),
         url_acceso = NULL,
         instrucciones = NULL,
         app_provider = 'tecuida',
         launch_mode = 'native'
   WHERE id = reto30_id;

  INSERT INTO public.municipality_applications (
    municipality_id,
    application_id,
    activa,
    fecha_activacion,
    publication_status,
    published_at,
    hidden_at,
    publication_updated_at
  )
  SELECT
    municipality.id,
    reto30_id,
    true,
    now(),
    'disponible',
    NULL,
    NULL,
    now()
  FROM public.municipalities AS municipality
  WHERE COALESCE(municipality.oculto_admin, false) = false
    AND municipality.estado_suscripcion IN ('activa', 'prueba')
  ON CONFLICT (municipality_id, application_id)
  DO UPDATE SET
    activa = true,
    fecha_activacion = COALESCE(
      public.municipality_applications.fecha_activacion,
      EXCLUDED.fecha_activacion
    ),
    publication_status = CASE
      WHEN public.municipality_applications.publication_status IN ('publicada', 'oculta')
        THEN public.municipality_applications.publication_status
      ELSE 'disponible'
    END,
    published_at = public.municipality_applications.published_at,
    hidden_at = CASE
      WHEN public.municipality_applications.publication_status = 'oculta'
        THEN public.municipality_applications.hidden_at
      ELSE NULL
    END,
    publication_updated_at = now();

  UPDATE public.municipality_applications AS assignment
     SET activa = false,
         publication_status = 'oculta',
         hidden_at = COALESCE(assignment.hidden_at, now()),
         publication_updated_at = now()
    FROM public.applications AS duplicate
   WHERE assignment.application_id = duplicate.id
     AND duplicate.id <> reto30_id
     AND assignment.activa = true
     AND (
       duplicate.app_slug IN ('mindful30', 'mindful30-adultos')
       OR lower(trim(duplicate.nombre)) IN ('mindful30', 'mindful30 adultos')
     );

  UPDATE public.applications AS duplicate
     SET activa = false,
         app_slug = NULL,
         url_acceso = NULL,
         app_provider = 'tecuida',
         launch_mode = 'landing',
         instrucciones = COALESCE(
           duplicate.instrucciones,
           'Retirada de la biblioteca municipal por duplicidad. La ficha canonica es Reto30.'
         )
   WHERE duplicate.id <> reto30_id
     AND (
       duplicate.app_slug IN ('mindful30', 'mindful30-adultos')
       OR lower(trim(duplicate.nombre)) IN ('mindful30', 'mindful30 adultos')
     );
END $$;

COMMIT;
