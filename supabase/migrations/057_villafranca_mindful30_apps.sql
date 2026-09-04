-- Garantiza que Villafranca de los Barros tenga funcionales Mindful30 y
-- Mindful30 Cuidadores como aplicaciones internas de TE CUIDA.

BEGIN;

DO $$
DECLARE
  villafranca_id uuid;
  mindful30_id uuid;
  caregivers_id uuid;
  wellbeing_category_id uuid;
BEGIN
  SELECT id
    INTO villafranca_id
    FROM public.municipalities
   WHERE slug IN ('villafranca-de-los-barros', 'villafrancadelosbarros')
      OR lower(nombre_municipio) = 'villafranca de los barros'
   ORDER BY (slug = 'villafranca-de-los-barros') DESC
   LIMIT 1;

  IF villafranca_id IS NULL THEN
    RAISE EXCEPTION 'No se encontro el municipio Villafranca de los Barros';
  END IF;

  SELECT id
    INTO wellbeing_category_id
    FROM public.categories
   ORDER BY orden NULLS LAST, nombre, id
   LIMIT 1;

  IF wellbeing_category_id IS NULL THEN
    RAISE EXCEPTION 'No se encontro ninguna categoria para asociar las aplicaciones';
  END IF;

  SELECT id
    INTO mindful30_id
    FROM public.applications
   WHERE app_slug = 'mindful30'
      OR lower(trim(nombre)) IN ('mindful30', 'mindful30 adultos')
   ORDER BY (app_slug = 'mindful30') DESC, activa DESC, id
   LIMIT 1;

  IF mindful30_id IS NULL THEN
    mindful30_id := gen_random_uuid();

    INSERT INTO public.applications (
      id,
      category_id,
      nombre,
      descripcion,
      thumbnail_url,
      tipo,
      nivel_suscripcion,
      activa,
      app_slug,
      brand_color,
      url_acceso,
      instrucciones,
      app_provider,
      launch_mode
    ) VALUES (
      mindful30_id,
      wellbeing_category_id,
      'Mindful30',
      '30 dias de bienestar diario con practicas breves para mente, actividad y relaciones.',
      NULL,
      'programa',
      'basico',
      true,
      'mindful30',
      '#0f172a',
      NULL,
      NULL,
      'tecuida',
      'native'
    );
  END IF;

  UPDATE public.applications
     SET app_slug = NULL,
         activa = false
   WHERE id <> mindful30_id
     AND (
       app_slug = 'mindful30'
       OR lower(trim(nombre)) IN ('mindful30', 'mindful30 adultos')
     );

  UPDATE public.applications
     SET nombre = 'Mindful30',
         descripcion = '30 dias de bienestar diario con practicas breves para mente, actividad y relaciones.',
         tipo = 'programa',
         activa = true,
         app_slug = 'mindful30',
         brand_color = '#0f172a',
         url_acceso = NULL,
         instrucciones = NULL,
         app_provider = 'tecuida',
         launch_mode = 'native'
   WHERE id = mindful30_id;

  SELECT id
    INTO caregivers_id
    FROM public.applications
   WHERE app_slug = 'mindful30-cuidadores'
      OR lower(trim(nombre)) IN ('mindful30 cuidadores', 'mindful30 para cuidadores')
   ORDER BY (app_slug = 'mindful30-cuidadores') DESC, activa DESC, id
   LIMIT 1;

  IF caregivers_id IS NULL THEN
    caregivers_id := gen_random_uuid();

    INSERT INTO public.applications (
      id,
      category_id,
      nombre,
      descripcion,
      thumbnail_url,
      tipo,
      nivel_suscripcion,
      activa,
      app_slug,
      brand_color,
      url_acceso,
      instrucciones,
      app_provider,
      launch_mode
    ) VALUES (
      caregivers_id,
      wellbeing_category_id,
      'Mindful30 Cuidadores',
      '30 dias de autocuidado para quienes cuidan.',
      NULL,
      'programa',
      'basico',
      true,
      'mindful30-cuidadores',
      '#7c3aed',
      NULL,
      NULL,
      'tecuida',
      'native'
    );
  END IF;

  UPDATE public.applications
     SET app_slug = NULL,
         activa = false
   WHERE id <> caregivers_id
     AND (
       app_slug = 'mindful30-cuidadores'
       OR lower(trim(nombre)) IN ('mindful30 cuidadores', 'mindful30 para cuidadores')
     );

  UPDATE public.applications
     SET nombre = 'Mindful30 Cuidadores',
         descripcion = '30 dias de autocuidado para quienes cuidan. Practicas breves para gestionar la carga, poner limites, recuperarse y fortalecer el apoyo del equipo.',
         tipo = 'programa',
         activa = true,
         app_slug = 'mindful30-cuidadores',
         brand_color = '#7c3aed',
         url_acceso = NULL,
         instrucciones = NULL,
         app_provider = 'tecuida',
         launch_mode = 'native'
   WHERE id = caregivers_id;

  INSERT INTO public.municipality_applications (
    municipality_id,
    application_id,
    activa,
    fecha_activacion
  )
  VALUES
    (villafranca_id, mindful30_id, true, now()),
    (villafranca_id, caregivers_id, true, now())
  ON CONFLICT (municipality_id, application_id)
  DO UPDATE SET
    activa = true,
    fecha_activacion = COALESCE(public.municipality_applications.fecha_activacion, EXCLUDED.fecha_activacion);
END $$;

COMMIT;
