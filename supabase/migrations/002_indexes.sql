-- ============================================================
-- TE CUIDA — Migración 002: Índices de rendimiento
-- Requisitos: 14.3
-- ============================================================
-- Nota: municipalities(slug) y users(municipality_id, email) ya disponen
-- de índices implícitos creados por sus constraints UNIQUE en 001.
-- Se añaden índices explícitos adicionales para documentar la intención
-- y para cubrir las consultas frecuentes no protegidas por constraints.
-- ============================================================

-- 1. municipalities(slug)
-- El constraint UNIQUE ya crea un índice implícito.
-- Índice explícito para dejar constancia y facilitar EXPLAIN ANALYZE.
CREATE INDEX IF NOT EXISTS idx_municipalities_slug
  ON public.municipalities (slug);

-- 2. users(municipality_id, email)
-- El constraint UNIQUE ya crea un índice implícito en (municipality_id, email).
-- Índice explícito adicional para búsquedas por municipio que no filtran
-- por email (consultas parciales sobre municipality_id solo).
CREATE INDEX IF NOT EXISTS idx_users_municipality_id_email
  ON public.users (municipality_id, email);

-- 3. user_progress(user_id, program_id)
-- Cubre las consultas frecuentes de progreso de un ciudadano en un programa
-- concreto (usadas por getProgramProgress y getLessonProgress).
CREATE INDEX IF NOT EXISTS idx_user_progress_user_program
  ON public.user_progress (user_id, program_id);

-- 4. analytics_events(municipality_id, created_at)
-- Cubre las consultas de estadísticas filtradas por municipio y rango
-- de fechas (usadas por getMunicipalityStats y getGlobalStats).
CREATE INDEX IF NOT EXISTS idx_analytics_events_municipality_created
  ON public.analytics_events (municipality_id, created_at);
