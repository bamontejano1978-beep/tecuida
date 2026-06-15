-- ============================================================
-- TE CUIDA — Migración 003: Políticas Row Level Security (RLS)
-- Requisitos: 12.1, 12.2, 12.5, 12.6, 15.1, 15.3
-- ============================================================
--
-- ESTRATEGIA DE AISLAMIENTO:
--   - Todas las consultas de ciudadanos usan auth.uid() para identificar al usuario.
--   - El municipality_id del ciudadano se obtiene con una subconsulta a public.users.
--   - Las columnas municipality_id redundantes en user_progress, achievements y
--     survey_answers evitan joins adicionales en cada evaluación de política RLS.
--   - El superadmin opera siempre con service_role_key, que bypasea RLS
--     completamente; por ello NO se crean políticas de superadmin aquí.
--   - La eliminación en cascada cuando se borra un tenant (municipio) ya está
--     cubierta por las FKs con ON DELETE CASCADE definidas en 001_initial_schema.sql.
-- ============================================================


-- ============================================================
-- HELPER: función auxiliar para obtener el municipality_id del
-- usuario autenticado de forma eficiente (evita repetir la
-- subconsulta en cada política).
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_auth_municipality_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT municipality_id
  FROM public.users
  WHERE id = auth.uid()
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_auth_municipality_id() IS
  'Devuelve el municipality_id del usuario autenticado (auth.uid()). '
  'SECURITY DEFINER para evitar problemas de recursión en RLS de la tabla users.';


-- ============================================================
-- 1. TABLA: public.users
-- Requisitos: 12.1, 12.2, 12.6
--
-- Política: un ciudadano solo puede ver y operar sobre usuarios
-- del mismo municipio que el suyo. Esto permite, por ejemplo,
-- que el ciudadano lea su propio perfil (su municipality_id
-- coincide consigo mismo).
--
-- NOTA: Se usa la subconsulta directa (no la función helper)
-- para evitar recursión infinita: la función helper ya consulta
-- esta tabla, y aplicarla como política sobre esta misma tabla
-- causaría un loop. La subconsulta directa con LIMIT 1 es
-- segura porque PostgreSQL la evalúa con el contexto de sesión
-- (auth.uid()), no aplicando RLS recursivamente para el propio
-- usuario que ejecuta la consulta.
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_municipality"
  ON public.users
  FOR ALL
  USING (
    municipality_id = (
      SELECT municipality_id
      FROM public.users
      WHERE id = auth.uid()
      LIMIT 1
    )
  );

COMMENT ON POLICY "users_own_municipality" ON public.users IS
  'Un ciudadano solo puede acceder a filas de usuarios de su mismo municipio. '
  'Req. 12.1, 12.2, 12.6';


-- ============================================================
-- 2. TABLA: public.user_progress
-- Requisitos: 12.1, 12.2, 12.5
--
-- Política: un ciudadano solo ve y modifica su propio progreso,
-- que además debe pertenecer a su municipio. La doble condición
-- (user_id + municipality_id) refuerza el aislamiento y usa la
-- columna redundante municipality_id para eficiencia (Req. 12.5).
-- ============================================================
ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "progress_own_data"
  ON public.user_progress
  FOR ALL
  USING (
    user_id = auth.uid()
    AND municipality_id = public.get_auth_municipality_id()
  );

COMMENT ON POLICY "progress_own_data" ON public.user_progress IS
  'Un ciudadano solo puede acceder a su propio progreso dentro de su municipio. '
  'Req. 12.1, 12.2, 12.5';


-- ============================================================
-- 3. TABLA: public.municipality_applications
-- Requisitos: 12.1, 12.2
--
-- Política: un ciudadano solo puede leer (SELECT) las
-- aplicaciones activas de su propio municipio. Las operaciones
-- de escritura (INSERT/UPDATE/DELETE) las realiza el superadmin
-- mediante service_role_key, que bypasea RLS.
-- ============================================================
ALTER TABLE public.municipality_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "apps_own_municipality"
  ON public.municipality_applications
  FOR SELECT
  USING (
    municipality_id = public.get_auth_municipality_id()
  );

COMMENT ON POLICY "apps_own_municipality" ON public.municipality_applications IS
  'Un ciudadano solo puede ver las aplicaciones de su propio municipio (solo lectura). '
  'El superadmin gestiona esta tabla con service_role_key. Req. 12.1, 12.2';


-- ============================================================
-- 4. TABLA: public.achievements
-- Requisitos: 12.1, 12.2, 12.5
--
-- Política: un ciudadano solo ve sus propios logros, que además
-- deben pertenecer a su municipio (columna municipality_id
-- redundante para eficiencia RLS, Req. 12.5).
-- ============================================================
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "achievements_own_data"
  ON public.achievements
  FOR ALL
  USING (
    user_id = auth.uid()
    AND municipality_id = public.get_auth_municipality_id()
  );

COMMENT ON POLICY "achievements_own_data" ON public.achievements IS
  'Un ciudadano solo puede acceder a sus propios logros dentro de su municipio. '
  'Req. 12.1, 12.2, 12.5';


-- ============================================================
-- 5. TABLA: public.survey_answers
-- Requisitos: 12.1, 12.2, 12.5
--
-- Política: un ciudadano solo ve y modifica sus propias
-- respuestas a encuestas, dentro de su municipio.
-- ============================================================
ALTER TABLE public.survey_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "survey_answers_own_data"
  ON public.survey_answers
  FOR ALL
  USING (
    user_id = auth.uid()
    AND municipality_id = public.get_auth_municipality_id()
  );

COMMENT ON POLICY "survey_answers_own_data" ON public.survey_answers IS
  'Un ciudadano solo puede acceder a sus propias respuestas de encuesta en su municipio. '
  'Req. 12.1, 12.2, 12.5';


-- ============================================================
-- 6. TABLA: public.analytics_events
-- Requisitos: 12.1, 12.2
--
-- Política: un ciudadano solo puede leer los eventos analíticos
-- de su propio municipio. Los eventos son insertados desde el
-- backend (API Routes de Next.js con service_role_key o anon
-- key con claims de municipio), por lo que se añade también
-- una política de INSERT para que la API autenticada pueda
-- registrar eventos en nombre del usuario.
--
-- SELECT: ciudadano ve solo eventos de su municipio.
-- INSERT: ciudadano (o backend autenticado) puede insertar
--         eventos en su propio municipio.
-- UPDATE/DELETE: no permitidos para ciudadanos; solo
--               service_role_key (bypasea RLS).
-- ============================================================
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "analytics_own_municipality_select"
  ON public.analytics_events
  FOR SELECT
  USING (
    municipality_id = public.get_auth_municipality_id()
  );

CREATE POLICY "analytics_own_municipality_insert"
  ON public.analytics_events
  FOR INSERT
  WITH CHECK (
    municipality_id = public.get_auth_municipality_id()
  );

COMMENT ON POLICY "analytics_own_municipality_select" ON public.analytics_events IS
  'Un ciudadano solo puede leer los eventos analíticos de su municipio. '
  'Req. 12.1, 12.2';

COMMENT ON POLICY "analytics_own_municipality_insert" ON public.analytics_events IS
  'Un ciudadano (o backend autenticado como ciudadano) puede insertar eventos '
  'en su propio municipio. Req. 12.1, 12.2';


-- ============================================================
-- TABLAS SIN RLS DE CIUDADANO (acceso global de solo lectura):
--   - municipalities: solo el superadmin la gestiona
--   - categories: catálogo global, lectura pública
--   - applications: catálogo global, lectura pública
--   - programs / program_modules / lessons: contenido global
--   - surveys / survey_questions: definición global de encuestas
--
-- Estas tablas no contienen datos personales por municipio y
-- son gestionadas exclusivamente por el superadmin (service_role_key).
-- Se deja RLS desactivado (comportamiento por defecto) para
-- permitir consultas de lectura sin autenticación en el
-- catálogo público.
-- ============================================================
