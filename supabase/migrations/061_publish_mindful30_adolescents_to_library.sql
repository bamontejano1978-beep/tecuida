-- TE CUIDA - 061: Entregar Mindful30 Adolescentes a la biblioteca municipal
--
-- El programa completo ya fue cargado en 026. Esta migracion asegura que la
-- ficha publica sea canonica, ejecutable como app nativa de TE CUIDA y quede
-- disponible para todos los gestores municipales sin publicar automaticamente
-- en sus landings.

BEGIN;

DO $$
DECLARE
  canonical_id uuid := '22222222-0000-0000-0000-000000000027';
  wellbeing_category_id uuid;
BEGIN
  SELECT id
    INTO wellbeing_category_id
    FROM public.categories
   ORDER BY orden NULLS LAST, nombre, id
   LIMIT 1;

  IF wellbeing_category_id IS NULL THEN
    RAISE EXCEPTION 'No se encontro ninguna categoria para Mindful30 Adolescentes';
  END IF;

  UPDATE public.applications
     SET activa = false,
         app_slug = NULL,
         url_acceso = NULL,
         app_provider = 'tecuida',
         launch_mode = 'landing'
   WHERE id <> canonical_id
     AND (
       app_slug IN ('mindful30-adolescentes', 'mindful30-adolescentes-12-17')
       OR lower(trim(nombre)) IN (
         'mindful30 adolescentes',
         'mindful30 para adolescentes'
       )
     );

  INSERT INTO public.applications (
    id,
    category_id,
    nombre,
    descripcion,
    thumbnail_url,
    tipo,
    activa,
    app_slug,
    brand_color,
    url_acceso,
    instrucciones,
    app_provider,
    launch_mode
  ) VALUES (
    canonical_id,
    wellbeing_category_id,
    'Mindful30 Adolescentes',
    'Programa de 30 dias de mindfulness para adolescentes de 12 a 17 anos, con practicas breves para manejar estres, emociones intensas, autoestima, presion social y uso de pantallas.',
    NULL,
    'programa',
    true,
    'mindful30-adolescentes',
    '#7c3aed',
    NULL,
    NULL,
    'tecuida',
    'native'
  )
  ON CONFLICT (id) DO UPDATE SET
    category_id = COALESCE(public.applications.category_id, EXCLUDED.category_id),
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    tipo = 'programa',
    activa = true,
    app_slug = 'mindful30-adolescentes',
    brand_color = '#7c3aed',
    url_acceso = NULL,
    instrucciones = NULL,
    app_provider = 'tecuida',
    launch_mode = 'native';

  UPDATE public.municipality_applications AS assignment
     SET activa = false,
         publication_status = 'oculta',
         hidden_at = COALESCE(assignment.hidden_at, now()),
         publication_updated_at = now()
    FROM public.applications AS legacy
   WHERE assignment.application_id = legacy.id
     AND legacy.id <> canonical_id
     AND assignment.activa = true
     AND (
       legacy.app_slug IN ('mindful30-adolescentes', 'mindful30-adolescentes-12-17')
       OR lower(trim(legacy.nombre)) IN (
         'mindful30 adolescentes',
         'mindful30 para adolescentes'
       )
     );

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
    canonical_id,
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
END $$;

COMMIT;
