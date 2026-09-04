-- TE CUIDA - 062: Entregar Mindful30 Infancia a la biblioteca municipal
--
-- La app vive en Firebase Hosting y se lanza desde el gateway estable de
-- TE CUIDA: /apps/mindful30-infancia. Queda entregada a los gestores como
-- "disponible" para que cada municipio decida si publicarla en su landing.

BEGIN;

DO $$
DECLARE
  canonical_id uuid := '22222222-0000-0000-0000-000000000062';
  wellbeing_category_id uuid;
BEGIN
  SELECT id
    INTO wellbeing_category_id
    FROM public.categories
   ORDER BY orden NULLS LAST, nombre, id
   LIMIT 1;

  IF wellbeing_category_id IS NULL THEN
    RAISE EXCEPTION 'No se encontro ninguna categoria para Mindful30 Infancia';
  END IF;

  UPDATE public.applications
     SET activa = false,
         app_slug = NULL,
         app_provider = 'tecuida',
         launch_mode = 'landing'
   WHERE id <> canonical_id
     AND (
       app_slug IN ('mindful30-infancia', 'mindful30-familias')
       OR lower(trim(nombre)) IN (
         'mindful30 infancia',
         'mindful30 familias',
         'mindful30 crianza'
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
    'Mindful30 Infancia',
    'Programa de 30 dias para familias con infancia: practicas breves de calma, escucha activa, limites con carino, juego consciente y vinculo positivo.',
    '/mindful30-infancia-icon-512.png',
    'programa',
    true,
    'mindful30-infancia',
    '#0090ff',
    'https://mindful30-infancia.web.app/app',
    'Aplicacion externa publicada en Firebase Hosting e integrada en TE CUIDA mediante el gateway municipal.',
    'firebase',
    'redirect'
  )
  ON CONFLICT (id) DO UPDATE SET
    category_id = COALESCE(public.applications.category_id, EXCLUDED.category_id),
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    thumbnail_url = EXCLUDED.thumbnail_url,
    tipo = 'programa',
    activa = true,
    app_slug = 'mindful30-infancia',
    brand_color = '#0090ff',
    url_acceso = 'https://mindful30-infancia.web.app/app',
    instrucciones = EXCLUDED.instrucciones,
    app_provider = 'firebase',
    launch_mode = 'redirect';

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
       legacy.app_slug IN ('mindful30-infancia', 'mindful30-familias')
       OR lower(trim(legacy.nombre)) IN (
         'mindful30 infancia',
         'mindful30 familias',
         'mindful30 crianza'
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
