BEGIN;

CREATE TABLE public.user_application_state (
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  application_id uuid NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  favorite boolean NOT NULL DEFAULT false,
  last_opened_at timestamptz,
  PRIMARY KEY (user_id, application_id)
);
ALTER TABLE public.user_application_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_launcher_read ON public.user_application_state FOR SELECT TO authenticated
  USING (user_id = auth.uid());
GRANT SELECT ON public.user_application_state TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_application_state FROM anon, authenticated;
GRANT ALL ON public.user_application_state TO service_role;

-- Mutations only through the authenticated server API; never accept a user ID from the browser.
CREATE FUNCTION public.record_application_open(p_user uuid, p_application uuid)
RETURNS void LANGUAGE sql SET search_path = public AS $$
  INSERT INTO public.user_application_state(user_id, application_id, last_opened_at)
  VALUES (p_user, p_application, now())
  ON CONFLICT (user_id, application_id) DO UPDATE SET last_opened_at = now();
$$;
CREATE FUNCTION public.set_application_favorite(p_user uuid, p_application uuid, p_favorite boolean)
RETURNS void LANGUAGE sql SET search_path = public AS $$
  INSERT INTO public.user_application_state(user_id, application_id, favorite)
  VALUES (p_user, p_application, p_favorite)
  ON CONFLICT (user_id, application_id) DO UPDATE SET favorite = p_favorite;
$$;
REVOKE ALL ON FUNCTION public.record_application_open(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_application_favorite(uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_application_open(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_application_favorite(uuid, uuid, boolean) TO service_role;

CREATE TABLE public.application_quality_checks (
  application_id uuid PRIMARY KEY REFERENCES public.applications(id) ON DELETE CASCADE,
  checked_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL CHECK (status IN ('ok', 'warning', 'error')),
  issues jsonb NOT NULL DEFAULT '[]'::jsonb,
  checked_by uuid REFERENCES public.users(id) ON DELETE SET NULL
);
ALTER TABLE public.application_quality_checks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.application_quality_checks FROM anon, authenticated;
GRANT ALL ON public.application_quality_checks TO service_role;

-- Counts only. Small authenticated cohorts are suppressed before leaving PostgreSQL.
CREATE FUNCTION public.municipality_application_journey(p_municipality uuid)
RETURNS TABLE(application_id uuid, nombre text, views bigint, launches bigint, active_users bigint, visits_without_launch bigint)
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT a.id, a.nombre,
    CASE WHEN count(DISTINCT e.user_id) >= 5 THEN count(*) FILTER (WHERE e.evento = 'app_view') ELSE NULL END,
    CASE WHEN count(DISTINCT e.user_id) >= 5 THEN count(*) FILTER (WHERE e.evento = 'app_launch') ELSE NULL END,
    CASE WHEN count(DISTINCT e.user_id) >= 5 THEN count(DISTINCT e.user_id) ELSE NULL END,
    CASE WHEN count(DISTINCT e.user_id) >= 5 THEN (
      SELECT count(DISTINCT v.payload->>'journey_id') FROM public.analytics_events v
      WHERE v.municipality_id = p_municipality AND v.payload->>'application_id' = a.id::text
        AND v.evento = 'app_view' AND v.payload->>'journey_id' IS NOT NULL
        AND v.created_at >= now() - interval '30 days' AND v.created_at < now() - interval '24 hours'
        AND NOT EXISTS (
          SELECT 1 FROM public.analytics_events l WHERE l.municipality_id = v.municipality_id
            AND l.payload->>'application_id' = a.id::text AND l.evento = 'app_launch'
            AND l.payload->>'journey_id' = v.payload->>'journey_id'
            AND l.created_at >= v.created_at AND l.created_at < v.created_at + interval '24 hours'
        )
    ) ELSE NULL END
  FROM public.municipality_applications ma
  JOIN public.applications a ON a.id = ma.application_id
  LEFT JOIN public.analytics_events e ON e.municipality_id = ma.municipality_id
    AND e.payload->>'application_id' = a.id::text
    AND e.evento IN ('app_view', 'app_launch')
    AND e.created_at >= now() - interval '30 days'
  WHERE ma.municipality_id = p_municipality AND ma.activa AND a.activa
  GROUP BY a.id, a.nombre ORDER BY a.nombre;
$$;
REVOKE ALL ON FUNCTION public.municipality_application_journey(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.municipality_application_journey(uuid) TO service_role;
COMMIT;
