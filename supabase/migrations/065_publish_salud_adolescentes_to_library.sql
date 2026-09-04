-- TE CUIDA - 065: Entregar Salud Adolescente a la biblioteca municipal
--
-- PWA estatica local-first para adolescentes, con retos de 30 dias sobre
-- autoconocimiento, presion social, motivacion, bienestar digital y habitos
-- saludables. Se registra en el gateway de TE CUIDA como
-- /apps/salud-adolescentes y queda disponible para gestores municipales sin
-- publicarse automaticamente en sus landings.

BEGIN;

DO $$
DECLARE
  canonical_id uuid := '22222222-0000-0000-0000-000000000065';
  wellbeing_category_id uuid;
BEGIN
  SELECT id
    INTO wellbeing_category_id
    FROM public.categories
   ORDER BY orden NULLS LAST, nombre, id
   LIMIT 1;

  IF wellbeing_category_id IS NULL THEN
    RAISE EXCEPTION 'No se encontro ninguna categoria para Salud Adolescente';
  END IF;

  UPDATE public.applications
     SET activa = false,
         app_slug = NULL,
         app_provider = 'tecuida',
         launch_mode = 'landing'
   WHERE id <> canonical_id
     AND (
       app_slug IN ('salud-adolescentes', 'mindful30-habitos-saludables')
       OR lower(trim(nombre)) IN (
         'salud adolescente',
         'salud adolescentes',
         'mindful30 habitos saludables',
         'mindful30: habitos saludables',
         'mindful30: hábitos saludables'
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
    'Salud Adolescente',
    'Programa de 30 dias con retos interactivos para adolescentes: autoconocimiento, asertividad ante la presion social, motivacion, bienestar digital y manejo del estres.',
    '/salud-adolescentes-icon-512.png',
    'programa',
    true,
    'salud-adolescentes',
    '#090d16',
    'https://salud-adolescentes.vercel.app',
    'Aplicacion externa local-first. El progreso y las notas personales se guardan en el dispositivo para reducir friccion y preservar privacidad.',
    'external',
    'redirect'
  )
  ON CONFLICT (id) DO UPDATE SET
    category_id = COALESCE(public.applications.category_id, EXCLUDED.category_id),
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    thumbnail_url = EXCLUDED.thumbnail_url,
    tipo = 'programa',
    activa = true,
    app_slug = 'salud-adolescentes',
    brand_color = '#090d16',
    url_acceso = 'https://salud-adolescentes.vercel.app',
    instrucciones = EXCLUDED.instrucciones,
    app_provider = 'external',
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
       legacy.app_slug IN ('salud-adolescentes', 'mindful30-habitos-saludables')
       OR lower(trim(legacy.nombre)) IN (
         'salud adolescente',
         'salud adolescentes',
         'mindful30 habitos saludables',
         'mindful30: habitos saludables',
         'mindful30: hábitos saludables'
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
