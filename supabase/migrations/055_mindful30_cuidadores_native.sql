-- Mindful30 Cuidadores pasa a ejecutarse como aplicacion interna de TE CUIDA.
-- Conserva las asignaciones municipales de cualquier ficha anterior.

BEGIN;

DO $$
DECLARE
  canonical_id uuid;
BEGIN
  SELECT id
    INTO canonical_id
    FROM public.applications
   WHERE app_slug IN ('mindful30-cuidadores', 'mindful30-caregivers')
      OR lower(trim(nombre)) IN ('mindful30 cuidadores', 'mindful30 para cuidadores')
   ORDER BY (app_slug = 'mindful30-cuidadores') DESC, activa DESC, id
   LIMIT 1;

  IF canonical_id IS NULL THEN
    canonical_id := '22222222-0000-0000-0000-000000000055';

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
      canonical_id,
      '11111111-0000-0000-0000-000000000001',
      'Mindful30 Cuidadores',
      '30 dias de autocuidado para quienes cuidan. Practicas breves para gestionar la carga, poner limites, recuperarse y fortalecer el apoyo del equipo.',
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

  -- Mantener las asignaciones activas de versiones anteriores.
  INSERT INTO public.municipality_applications (
    municipality_id,
    application_id,
    activa,
    fecha_activacion
  )
  SELECT DISTINCT ma.municipality_id, canonical_id, true, now()
    FROM public.municipality_applications ma
    JOIN public.applications legacy ON legacy.id = ma.application_id
   WHERE ma.activa = true
     AND (
       legacy.id = canonical_id
       OR legacy.app_slug IN ('mindful30-cuidadores', 'mindful30-caregivers')
       OR lower(trim(legacy.nombre)) IN ('mindful30 cuidadores', 'mindful30 para cuidadores')
     )
  ON CONFLICT (municipality_id, application_id)
  DO UPDATE SET activa = true;

  -- Retirar duplicados antiguos antes de fijar el slug unico.
  UPDATE public.applications
     SET activa = false,
         app_slug = NULL,
         url_acceso = NULL,
         app_provider = 'tecuida',
         launch_mode = 'landing'
   WHERE id <> canonical_id
     AND (
       app_slug IN ('mindful30-cuidadores', 'mindful30-caregivers')
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
   WHERE id = canonical_id;

  UPDATE public.municipality_applications ma
     SET activa = false
    FROM public.applications legacy
   WHERE ma.application_id = legacy.id
     AND legacy.id <> canonical_id
     AND (
       lower(trim(legacy.nombre)) IN ('mindful30 cuidadores', 'mindful30 para cuidadores')
       OR legacy.app_slug IN ('mindful30-cuidadores', 'mindful30-caregivers')
     );
END $$;

COMMIT;
