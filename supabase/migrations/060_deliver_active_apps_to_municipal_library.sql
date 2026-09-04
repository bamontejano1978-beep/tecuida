-- TE CUIDA - 060: Limpiar catalogo y entregar apps reales a gestores
--
-- Cada gestor municipal ve en /municipio/aplicaciones las filas activas de
-- municipality_applications. Esta migracion retira de esa biblioteca las fichas
-- semilla que no tienen aplicacion desarrollada y entrega solo las aplicaciones
-- reales que falten, dejandolas como "disponible" para que el gestor decida
-- cuando publicarlas en la landing.
--
-- Las asignaciones existentes no se modifican: si una app ya estaba publicada,
-- oculta o pendiente y sigue siendo una aplicacion real, conserva su estado
-- editorial. No se borran filas de applications.

BEGIN;

UPDATE public.applications AS application
SET
  activa = false,
  app_slug = CASE
    WHEN application.app_slug IN (
      'reto30',
      'mindful30',
      'mindful30-cuidadores',
      'mindful30-adolescentes'
    ) THEN application.app_slug
    ELSE NULL
  END
WHERE application.activa = true
  AND NOT (
    application.app_slug IN (
      'reto30',
      'mindful30',
      'mindful30-cuidadores',
      'mindful30-adolescentes'
    )
    OR (
      application.url_acceso IS NOT NULL
      AND btrim(application.url_acceso) <> ''
    )
  );

UPDATE public.municipality_applications AS assignment
SET
  activa = false,
  publication_status = 'oculta',
  hidden_at = COALESCE(assignment.hidden_at, now()),
  publication_updated_at = now()
FROM public.applications AS application
WHERE assignment.application_id = application.id
  AND assignment.activa = true
  AND NOT (
    application.app_slug IN (
      'reto30',
      'mindful30',
      'mindful30-cuidadores',
      'mindful30-adolescentes'
    )
    OR (
      application.url_acceso IS NOT NULL
      AND btrim(application.url_acceso) <> ''
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
  application.id,
  true,
  now(),
  'disponible',
  NULL,
  NULL,
  now()
FROM public.municipalities AS municipality
CROSS JOIN public.applications AS application
WHERE application.activa = true
  AND COALESCE(municipality.oculto_admin, false) = false
  AND municipality.estado_suscripcion IN ('activa', 'prueba')
  AND (
    application.app_slug IN (
      'reto30',
      'mindful30',
      'mindful30-cuidadores',
      'mindful30-adolescentes'
    )
    OR (
      application.url_acceso IS NOT NULL
      AND btrim(application.url_acceso) <> ''
    )
  )
ON CONFLICT (municipality_id, application_id)
DO UPDATE SET
  activa = true,
  fecha_activacion = COALESCE(
    public.municipality_applications.fecha_activacion,
    EXCLUDED.fecha_activacion
  ),
  publication_status = COALESCE(
    public.municipality_applications.publication_status,
    EXCLUDED.publication_status
  ),
  published_at = public.municipality_applications.published_at,
  hidden_at = public.municipality_applications.hidden_at,
  publication_updated_at = now()
WHERE public.municipality_applications.activa = false;

COMMIT;
