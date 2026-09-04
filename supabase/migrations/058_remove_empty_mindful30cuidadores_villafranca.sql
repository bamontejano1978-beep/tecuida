-- Retira de Villafranca la ficha rota "mindful30cuidadores" que abre una
-- pagina vacia, manteniendo la app funcional mindful30-cuidadores.

BEGIN;

DO $$
DECLARE
  villafranca_id uuid;
  valid_caregivers_id uuid;
BEGIN
  SELECT id
    INTO villafranca_id
    FROM public.municipalities
   WHERE slug IN ('villafranca-de-los-barros', 'villafrancadelosbarros')
      OR lower(nombre_municipio) = 'villafranca de los barros'
   LIMIT 1;

  IF villafranca_id IS NULL THEN
    RAISE EXCEPTION 'No se encontro el municipio Villafranca de los Barros';
  END IF;

  SELECT id
    INTO valid_caregivers_id
    FROM public.applications
   WHERE app_slug = 'mindful30-cuidadores'
     AND activa = true
   ORDER BY id
   LIMIT 1;

  IF valid_caregivers_id IS NULL THEN
    RAISE EXCEPTION 'No se encontro la app valida mindful30-cuidadores';
  END IF;

  -- Desactivar la ficha rota que aparecia en Villafranca y abria pagina vacia.
  UPDATE public.municipality_applications
     SET activa = false
   WHERE municipality_id = villafranca_id
     AND application_id = '79015b0e-f830-4098-b50d-d5cbca460b3e';

  UPDATE public.applications
     SET activa = false,
         app_slug = NULL,
         url_acceso = NULL,
         app_provider = 'tecuida',
         launch_mode = 'landing'
   WHERE id = '79015b0e-f830-4098-b50d-d5cbca460b3e'
     AND id <> valid_caregivers_id;

  INSERT INTO public.municipality_applications (
    municipality_id,
    application_id,
    activa,
    fecha_activacion
  )
  VALUES (villafranca_id, valid_caregivers_id, true, now())
  ON CONFLICT (municipality_id, application_id)
  DO UPDATE SET activa = true;
END $$;

COMMIT;
