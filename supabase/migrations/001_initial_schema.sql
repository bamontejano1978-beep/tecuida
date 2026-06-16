-- ============================================================
-- TE CUIDA — Migración inicial: Esquema de tablas principales
-- Requisitos: 12.1, 12.5, 15.3
-- ============================================================

-- Habilitar extensión para generación de UUIDs (fallback; gen_random_uuid()
-- ya está disponible en PostgreSQL 13+ sin extensión, pero la incluimos
-- para compatibilidad con versiones anteriores de Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. MUNICIPALITIES — Tenants del sistema
-- ============================================================
CREATE TABLE IF NOT EXISTS public.municipalities (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                     text        NOT NULL,
  nombre_municipio         text        NOT NULL,
  nombre_ayuntamiento      text        NOT NULL,
  dominio                  text        NOT NULL,
  colores_corporativos     jsonb       NOT NULL DEFAULT '{}',
  textos_institucionales   jsonb       NOT NULL DEFAULT '{}',
  escudo_url               text,
  logo_url                 text,
  imagenes_municipio       text[]      NOT NULL DEFAULT '{}',
  modulos_activos          text[]      NOT NULL DEFAULT '{}',
  tipo_suscripcion         text        NOT NULL DEFAULT 'basico'
                             CHECK (tipo_suscripcion IN ('basico', 'estandar', 'premium')),
  estado_suscripcion       text        NOT NULL DEFAULT 'prueba'
                             CHECK (estado_suscripcion IN ('activa', 'suspendida', 'cancelada', 'prueba')),
  fecha_inicio_suscripcion timestamptz,
  fecha_fin_suscripcion    timestamptz,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT municipalities_slug_unique UNIQUE (slug)
);

COMMENT ON TABLE public.municipalities IS 'Tenants del sistema TE CUIDA. Cada fila representa un municipio/ayuntamiento.';
COMMENT ON COLUMN public.municipalities.slug IS 'Identificador único del municipio; forma el subdominio <slug>.tecuida.group';

-- ============================================================
-- 2. USERS — Ciudadanos registrados por municipio
-- ============================================================
-- La columna id referencia auth.users de Supabase Auth.
-- CASCADE en municipality_id garantiza eliminación RGPD al borrar el tenant.
CREATE TABLE IF NOT EXISTS public.users (
  id               uuid        PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  municipality_id  uuid        NOT NULL REFERENCES public.municipalities (id) ON DELETE CASCADE,
  email            text        NOT NULL,
  nombre           text        NOT NULL,
  apellidos        text        NOT NULL,
  telefono         text,
  fecha_nacimiento date,
  rol              text        NOT NULL DEFAULT 'ciudadano'
                     CHECK (rol IN ('ciudadano', 'superadmin')),
  avatar_url       text,
  created_at       timestamptz NOT NULL DEFAULT now(),

  -- Requisito 12.5: email único dentro del mismo municipio (multi-tenant)
  CONSTRAINT users_municipality_email_unique UNIQUE (municipality_id, email)
);

COMMENT ON TABLE public.users IS 'Perfiles de ciudadanos. El id coincide con auth.users de Supabase.';
COMMENT ON COLUMN public.users.municipality_id IS 'Tenant al que pertenece el ciudadano; inmutable tras el registro.';

-- ============================================================
-- 3. CATEGORIES — Categorías de aplicaciones
-- ============================================================
CREATE TABLE IF NOT EXISTS public.categories (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre      text    NOT NULL,
  descripcion text,
  icono_url   text,
  orden       integer NOT NULL DEFAULT 0
);

COMMENT ON TABLE public.categories IS 'Categorías temáticas del catálogo de aplicaciones.';

-- ============================================================
-- 4. APPLICATIONS — Aplicaciones del catálogo global
-- ============================================================
CREATE TABLE IF NOT EXISTS public.applications (
  id                uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id       uuid    REFERENCES public.categories (id) ON DELETE SET NULL,
  nombre            text    NOT NULL,
  descripcion       text,
  thumbnail_url     text,
  tipo              text    NOT NULL
                      CHECK (tipo IN ('programa', 'herramienta', 'encuesta', 'recurso')),
  nivel_suscripcion text    NOT NULL DEFAULT 'basico'
                      CHECK (nivel_suscripcion IN ('basico', 'estandar', 'premium')),
  activa            boolean NOT NULL DEFAULT true
);

COMMENT ON TABLE public.applications IS 'Catálogo global de aplicaciones gestionado por el superadmin.';

-- ============================================================
-- 5. MUNICIPALITY_APPLICATIONS — Aplicaciones activas por municipio
-- ============================================================
CREATE TABLE IF NOT EXISTS public.municipality_applications (
  municipality_id  uuid        NOT NULL REFERENCES public.municipalities (id) ON DELETE CASCADE,
  application_id   uuid        NOT NULL REFERENCES public.applications (id) ON DELETE CASCADE,
  activa           boolean     NOT NULL DEFAULT true,
  fecha_activacion timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT municipality_applications_pk PRIMARY KEY (municipality_id, application_id)
);

COMMENT ON TABLE public.municipality_applications IS 'Relación entre municipios y las aplicaciones que tienen activadas.';

-- ============================================================
-- 6. PROGRAMS — Programas dentro de una aplicación
-- ============================================================
CREATE TABLE IF NOT EXISTS public.programs (
  id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  uuid    NOT NULL REFERENCES public.applications (id) ON DELETE CASCADE,
  nombre          text    NOT NULL,
  descripcion     text,
  total_sesiones  integer NOT NULL DEFAULT 0,
  duracion_dias   integer NOT NULL DEFAULT 0
);

COMMENT ON TABLE public.programs IS 'Programas de bienestar asociados a una aplicación (ej. Mindful30).';

-- ============================================================
-- 7. PROGRAM_MODULES — Módulos dentro de un programa
-- ============================================================
CREATE TABLE IF NOT EXISTS public.program_modules (
  id          uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id  uuid    NOT NULL REFERENCES public.programs (id) ON DELETE CASCADE,
  numero      integer NOT NULL,
  nombre      text    NOT NULL
);

COMMENT ON TABLE public.program_modules IS 'Módulos que componen un programa, numerados ordinalmente.';

-- ============================================================
-- 8. LESSONS — Lecciones dentro de un módulo
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lessons (
  id                  uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id           uuid    NOT NULL REFERENCES public.program_modules (id) ON DELETE CASCADE,
  titulo              text    NOT NULL,
  tipo                text    NOT NULL
                        CHECK (tipo IN ('texto', 'audio', 'video', 'ejercicio', 'combinado')),
  contenido_texto     text,
  audio_url           text,
  video_url           text,
  ejercicio           jsonb,
  duracion_minutos    integer NOT NULL DEFAULT 0,
  orden               integer NOT NULL DEFAULT 0
);

COMMENT ON TABLE public.lessons IS 'Lecciones individuales de un módulo. El campo orden determina la secuencia.';

-- ============================================================
-- 9. USER_PROGRESS — Progreso individual del ciudadano por lección
-- Requisito 12.5: municipality_id redundante para eficiencia de RLS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.user_progress (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid        NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  program_id               uuid        NOT NULL REFERENCES public.programs (id) ON DELETE CASCADE,
  lesson_id                uuid        NOT NULL REFERENCES public.lessons (id) ON DELETE CASCADE,
  -- municipality_id redundante: evita joins en políticas RLS (Req. 12.5)
  municipality_id          uuid        NOT NULL REFERENCES public.municipalities (id) ON DELETE CASCADE,
  completada               boolean     NOT NULL DEFAULT false,
  porcentaje_completado    integer     NOT NULL DEFAULT 0
                             CHECK (porcentaje_completado BETWEEN 0 AND 100),
  fecha_inicio             timestamptz NOT NULL DEFAULT now(),
  fecha_completado         timestamptz,
  tiempo_dedicado_segundos integer     NOT NULL DEFAULT 0
);

COMMENT ON TABLE public.user_progress IS 'Registro de progreso de cada ciudadano en cada lección de cada programa.';
COMMENT ON COLUMN public.user_progress.municipality_id IS 'Columna redundante para que RLS opere sin joins adicionales.';

-- ============================================================
-- 10. ACHIEVEMENTS — Logros obtenidos por el ciudadano
-- Requisito 12.5: municipality_id redundante para eficiencia de RLS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.achievements (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  -- municipality_id redundante: evita joins en políticas RLS (Req. 12.5)
  municipality_id uuid        NOT NULL REFERENCES public.municipalities (id) ON DELETE CASCADE,
  tipo            text        NOT NULL,
  descripcion     text,
  metadata        jsonb       NOT NULL DEFAULT '{}',
  fecha_obtenido  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.achievements IS 'Logros obtenidos por ciudadanos al alcanzar hitos en los programas.';
COMMENT ON COLUMN public.achievements.municipality_id IS 'Columna redundante para que RLS opere sin joins adicionales.';

-- ============================================================
-- 11. SURVEYS — Encuestas asociadas a una aplicación
-- ============================================================
CREATE TABLE IF NOT EXISTS public.surveys (
  id             uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid    NOT NULL REFERENCES public.applications (id) ON DELETE CASCADE,
  titulo         text    NOT NULL,
  descripcion    text,
  activa         boolean NOT NULL DEFAULT true
);

COMMENT ON TABLE public.surveys IS 'Encuestas vinculadas a aplicaciones del catálogo.';

-- ============================================================
-- 12. SURVEY_QUESTIONS — Preguntas de una encuesta
-- ============================================================
CREATE TABLE IF NOT EXISTS public.survey_questions (
  id        uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid    NOT NULL REFERENCES public.surveys (id) ON DELETE CASCADE,
  pregunta  text    NOT NULL,
  tipo      text    NOT NULL
              CHECK (tipo IN ('texto_libre', 'opcion_multiple', 'escala', 'si_no')),
  opciones  jsonb   NOT NULL DEFAULT '[]',
  orden     integer NOT NULL DEFAULT 0
);

COMMENT ON TABLE public.survey_questions IS 'Preguntas que conforman una encuesta.';

-- ============================================================
-- 13. SURVEY_ANSWERS — Respuestas de ciudadanos a encuestas
-- Requisito 12.5: municipality_id redundante para eficiencia de RLS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.survey_answers (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id   uuid        NOT NULL REFERENCES public.surveys (id) ON DELETE CASCADE,
  question_id uuid        NOT NULL REFERENCES public.survey_questions (id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  -- municipality_id redundante: evita joins en políticas RLS (Req. 12.5)
  municipality_id uuid    NOT NULL REFERENCES public.municipalities (id) ON DELETE CASCADE,
  respuesta   jsonb       NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.survey_answers IS 'Respuestas de ciudadanos a preguntas de encuestas.';
COMMENT ON COLUMN public.survey_answers.municipality_id IS 'Columna redundante para que RLS opere sin joins adicionales.';

-- ============================================================
-- 14. ANALYTICS_EVENTS — Registro de eventos de comportamiento
-- ============================================================
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_id uuid        NOT NULL REFERENCES public.municipalities (id) ON DELETE CASCADE,
  -- user_id es nullable: algunos eventos son anónimos (pre-login)
  user_id         uuid        REFERENCES public.users (id) ON DELETE SET NULL,
  evento          text        NOT NULL,
  payload         jsonb       NOT NULL DEFAULT '{}',
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.analytics_events IS 'Registro de eventos de uso y comportamiento para estadísticas por municipio.';

-- ============================================================
-- Trigger: updated_at automático en municipalities
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER municipalities_updated_at
  BEFORE UPDATE ON public.municipalities
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
