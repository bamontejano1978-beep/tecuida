-- TE CUIDA — 049: estadísticas agregadas y soporte operativo
-- Evita descargar miles de filas al servidor web para calcular métricas.

BEGIN;

CREATE OR REPLACE FUNCTION public.get_municipality_stats(
  p_municipality_id uuid
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH municipality AS (
    SELECT id, nombre_municipio
      FROM public.municipalities
     WHERE id = p_municipality_id
       AND oculto_admin = false
  ),
  app_usage AS (
    SELECT
      ma.application_id,
      a.nombre AS application_nombre,
      a.tipo AS application_tipo,
      count(DISTINCT up.user_id)::int AS usuarios_unicos,
      count(*) FILTER (WHERE up.completada)::int AS lecciones_completadas
    FROM public.municipality_applications ma
    JOIN public.applications a ON a.id = ma.application_id
    LEFT JOIN public.programs p ON p.application_id = a.id
    LEFT JOIN public.user_progress up
      ON up.program_id = p.id
     AND up.municipality_id = ma.municipality_id
    WHERE ma.municipality_id = p_municipality_id
      AND ma.activa = true
    GROUP BY ma.application_id, a.nombre, a.tipo
  ),
  months AS (
    SELECT generate_series(
      date_trunc('month', now()) - interval '5 months',
      date_trunc('month', now()),
      interval '1 month'
    ) AS month_start
  ),
  monthly AS (
    SELECT
      to_char(month_start, 'YYYY-MM') AS mes,
      (SELECT count(*)::int FROM public.users u
        WHERE u.municipality_id = p_municipality_id
          AND u.created_at >= month_start
          AND u.created_at < month_start + interval '1 month') AS nuevos_registros,
      (SELECT count(*)::int FROM public.user_progress up
        WHERE up.municipality_id = p_municipality_id
          AND up.completada = true
          AND up.fecha_completado >= month_start
          AND up.fecha_completado < month_start + interval '1 month') AS lecciones_completadas
    FROM months
  )
  SELECT jsonb_build_object(
    'municipioId', m.id,
    'municipioNombre', m.nombre_municipio,
    'totalCiudadanos', (SELECT count(*) FROM public.users WHERE municipality_id = m.id),
    'ciudadanosActivos', (SELECT count(DISTINCT user_id) FROM public.user_progress WHERE municipality_id = m.id AND fecha_inicio >= now() - interval '30 days'),
    'appsActivas', (SELECT count(*) FROM public.municipality_applications WHERE municipality_id = m.id AND activa = true),
    'leccionesCompletadas', (SELECT count(*) FROM public.user_progress WHERE municipality_id = m.id AND completada = true),
    'appsUsage', COALESCE((SELECT jsonb_agg(to_jsonb(app_usage) ORDER BY usuarios_unicos DESC) FROM app_usage), '[]'::jsonb),
    'monthlyActivity', COALESCE((SELECT jsonb_agg(to_jsonb(monthly) ORDER BY mes) FROM monthly), '[]'::jsonb)
  )
  FROM municipality m;
$$;

REVOKE ALL ON FUNCTION public.get_municipality_stats(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_municipality_stats(uuid) TO service_role;

COMMENT ON FUNCTION public.get_municipality_stats(uuid) IS
  'Métricas municipales agregadas en PostgreSQL, sin exponer filas individuales.';

COMMIT;
