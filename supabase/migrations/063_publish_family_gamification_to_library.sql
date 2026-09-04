-- TE CUIDA - 063: Entregar Economia Familiar a la biblioteca municipal
--
-- App nativa de TE CUIDA basada en FamilyGamification. Permite gestionar
-- hijos, misiones, monedas, recompensas y validaciones familiares desde
-- /apps/family-gamification. Queda disponible para los gestores municipales
-- sin publicarse automaticamente en sus landings.

BEGIN;

DO $$
DECLARE
  canonical_id uuid := '22222222-0000-0000-0000-000000000063';
  wellbeing_category_id uuid;
BEGIN
  SELECT id
    INTO wellbeing_category_id
    FROM public.categories
   ORDER BY orden NULLS LAST, nombre, id
   LIMIT 1;

  IF wellbeing_category_id IS NULL THEN
    RAISE EXCEPTION 'No se encontro ninguna categoria para Economia Familiar';
  END IF;

  UPDATE public.applications
     SET activa = false,
         app_slug = NULL,
         url_acceso = NULL,
         app_provider = 'tecuida',
         launch_mode = 'landing'
   WHERE id <> canonical_id
     AND (
       app_slug IN ('family-gamification', 'economia-familiar')
       OR lower(trim(nombre)) IN (
         'economia familiar',
         'economía familiar',
         'family gamification'
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
    'Economia Familiar',
    'Herramienta familiar para convertir habitos y tareas domesticas en misiones con monedas, niveles, recompensas y validacion adulta.',
    '/family-gamification-icon-512.png',
    'herramienta',
    true,
    'family-gamification',
    '#8b5cf6',
    NULL,
    'App nativa de TE CUIDA. El progreso se guarda en el dispositivo para reducir friccion de entrada.',
    'tecuida',
    'native'
  )
  ON CONFLICT (id) DO UPDATE SET
    category_id = COALESCE(public.applications.category_id, EXCLUDED.category_id),
    nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    thumbnail_url = EXCLUDED.thumbnail_url,
    tipo = 'herramienta',
    activa = true,
    app_slug = 'family-gamification',
    brand_color = '#8b5cf6',
    url_acceso = NULL,
    instrucciones = EXCLUDED.instrucciones,
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
       legacy.app_slug IN ('family-gamification', 'economia-familiar')
       OR lower(trim(legacy.nombre)) IN (
         'economia familiar',
         'economía familiar',
         'family gamification'
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
