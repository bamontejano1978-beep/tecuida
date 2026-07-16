-- ===========================================================================
-- TE CUIDA — 043: Marketplace de Actividades Profesionales (Fase 1)
-- ===========================================================================
-- Permite que psicólogos, asociaciones y profesionales locales publiquen
-- talleres, eventos, charlas o cursos en el municipio. Los ciudadanos se
-- inscriben; el profesional cobra aparte (Bizum/transferencia/presencial).
--
-- Sin pasar dinero por TE CUIDA → no requiere PSD2 ni licencia de pagos.
-- Solo publica y media. Toda la gestión la hace admin_municipio/superadmin.
--
-- TABLAS:
--   1. professionals       — Psicólogos, asociaciones, centros, autónomos.
--   2. activities          — Talleres, eventos, cursos con ficha de impacto.
--   3. activity_inscriptions — Inscripciones de ciudadano (aforo atómico).
--
-- RELACIONES:
--   activities.municipality_id   → municipalities.id
--   activities.professional_id   → professionals.id
--   activities.category_id       → categories.id
--   activity_inscriptions.activity_id → activities.id
--
-- RLS:
--   - Lectura pública: profesionales activos + actividades publicadas.
--   - Inscripciones: usuario ve solo las propias; crea/cancela las propias.
--   - Escrituras admin pasan por service_role (createAdminClient).
-- ===========================================================================

BEGIN;

-- ===========================================================================
-- 1. PROFESSIONALS
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.professionals (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_id uuid NOT NULL REFERENCES public.municipalities(id) ON DELETE CASCADE,
  -- Opcional: a veces un profesional ya registrado en TE CUIDA publica actividades.
  -- Si se elimina el usuario, no se elimina el profesional (podría tener actividades).
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  nombre          text NOT NULL,
  tipo            text NOT NULL
                  CHECK (tipo IN ('colegiado','asociacion','centro','profesional_autonomo','otro')),
  -- Obligatorio si tipo='colegiado' (se valida a nivel API con CHECK adicional vía trigger más adelante).
  numero_colegiado text,
  descripcion     text,
  foto_url        text,
  web_url         text,
  email           text NOT NULL,
  telefono        text,
  verificado      boolean NOT NULL DEFAULT false,
  estado          text NOT NULL DEFAULT 'activo'
                  CHECK (estado IN ('activo','inactivo')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_professionals_municipality
  ON public.professionals(municipality_id);
CREATE INDEX IF NOT EXISTS idx_professionals_user
  ON public.professionals(user_id);

COMMENT ON TABLE public.professionals IS
  'Profesionales y entidades (psicólogos colegiados, asociaciones, centros, autónomos) que ofertan actividades en TE CUIDA. Verificado marca el visto bueno municipal.';

-- ===========================================================================
-- 2. ACTIVITIES
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.activities (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  municipality_id uuid NOT NULL REFERENCES public.municipalities(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE RESTRICT,
  category_id     uuid NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  nombre          text NOT NULL,
  descripcion     text NOT NULL,
  thumbnail_url   text,
  modalidad       text NOT NULL
                  CHECK (modalidad IN ('presencial','online','mixta')),
  fecha_inicio    date NOT NULL,
  fecha_fin       date,
  horario_texto   text,                                                  -- "Martes 18–20h"
  direccion_texto text,                                                  -- para presencial
  url_reunion     text,                                                  -- para online
  aforo           integer,
  plazas_inscritas integer NOT NULL DEFAULT 0,
  precio_texto    text,                                                  -- "15 €", "Gratuito", "Aporte voluntario"
  nota_pago       text,                                                  -- Instrucciones del profesional (Bizum, transferencia...)
  -- ── Ficha de impacto (diferenciador TE CUIDA) ──
  impacto_objetivo                text,                                  -- "Reducir el aislamiento de personas mayores"
  impacto_beneficiarios_estimados integer,                               -- 120
  impacto_ambito                  text,                                  -- "Exclusivamente el municipio"
  impacto_indicadores             text,                                  -- "nº participantes, talleres realizados, etc."
  -- ── Estado y moderación ──
  estado          text NOT NULL DEFAULT 'pendiente_validacion'
                  CHECK (estado IN ('borrador','pendiente_validacion','publicada','rechazada','cancelada','finalizada')),
  destacada       boolean NOT NULL DEFAULT false,
  motivo_rechazo  text,
  motivo_cancelacion text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT check_activities_fechas CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio),
  CONSTRAINT check_activities_aforo CHECK (aforo IS NULL OR aforo > 0),
  CONSTRAINT check_activities_plazas CHECK (
    plazas_inscritas >= 0 AND (aforo IS NULL OR plazas_inscritas <= aforo)
  )
);

CREATE INDEX IF NOT EXISTS idx_activities_municipality_estado
  ON public.activities(municipality_id, estado);
CREATE INDEX IF NOT EXISTS idx_activities_professional
  ON public.activities(professional_id);
CREATE INDEX IF NOT EXISTS idx_activities_category
  ON public.activities(category_id);
CREATE INDEX IF NOT EXISTS idx_activities_fecha_inicio
  ON public.activities(fecha_inicio);
CREATE INDEX IF NOT EXISTS idx_activities_destacada
  ON public.activities(destacada) WHERE destacada = true;

COMMENT ON TABLE public.activities IS
  'Actividades marketplace: talleres, eventos, cursos publicados por profesionales/entidades del municipio. Cero pagos en plataforma (el profesional cobra aparte).';
COMMENT ON COLUMN public.activities.precio_texto IS
  'Texto libre: "15 €", "Gratuito", "Aporte voluntario". El profesional cobra aparte, NO pasa por TE CUIDA.';
COMMENT ON COLUMN public.activities.nota_pago IS
  'Instrucciones del profesional para pagar (Bizum, transferencia, presencial). Mostradas al ciudadano tras inscribirse.';

-- ===========================================================================
-- 3. ACTIVITY_INSCRIPTIONS (aforo atómico vía RPC, ver /api/activities)
-- ===========================================================================

CREATE TABLE IF NOT EXISTS public.activity_inscriptions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id     uuid NOT NULL REFERENCES public.activities(id) ON DELETE CASCADE,
  municipality_id uuid NOT NULL REFERENCES public.municipalities(id) ON DELETE CASCADE,
  user_id         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email           text NOT NULL,
  nombre          text,
  estado          text NOT NULL DEFAULT 'confirmada'
                  CHECK (estado IN ('confirmada','cancelada','asistio','no_asistio')),
  notas           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inscriptions_activity
  ON public.activity_inscriptions(activity_id);
CREATE INDEX IF NOT EXISTS idx_inscriptions_user_municipality
  ON public.activity_inscriptions(municipality_id, user_id);
CREATE INDEX IF NOT EXISTS idx_inscriptions_estado
  ON public.activity_inscriptions(estado);
-- Un usuario conserva una única fila por actividad. Las cancelaciones se
-- reactivan sobre esa misma fila para mantener un historial consistente.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_inscription_per_user
  ON public.activity_inscriptions (activity_id, user_id)
  WHERE user_id IS NOT NULL;

COMMENT ON TABLE public.activity_inscriptions IS
  'Inscripciones de ciudadano a actividad. Una activa por (user_id, activity_id). Si el usuario se elimina, queda el email para estadística.';

-- ===========================================================================
-- 4. RLS
-- ===========================================================================

ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_inscriptions ENABLE ROW LEVEL SECURITY;

-- Lectura pública: profesionales activos
DROP POLICY IF EXISTS "Profesionales activos visibles" ON public.professionals;
CREATE POLICY "Profesionales activos visibles"
  ON public.professionals
  FOR SELECT
  USING (estado = 'activo');

-- Lectura pública: actividades publicadas
DROP POLICY IF EXISTS "Actividades publicadas visibles" ON public.activities;
CREATE POLICY "Actividades publicadas visibles"
  ON public.activities
  FOR SELECT
  USING (estado = 'publicada');

-- Inscripciones: el usuario ve las propias
DROP POLICY IF EXISTS "Usuarios ven sus inscripciones" ON public.activity_inscriptions;
CREATE POLICY "Usuarios ven sus inscripciones"
  ON public.activity_inscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Las escrituras se realizan exclusivamente mediante los RPC SECURITY DEFINER
-- de la migración 044. Así no se pueden saltar aforo, email ni tenant.
DROP POLICY IF EXISTS "Usuarios pueden inscribirse" ON public.activity_inscriptions;
DROP POLICY IF EXISTS "Usuarios pueden cancelar su inscripcion" ON public.activity_inscriptions;

REVOKE INSERT, UPDATE, DELETE ON public.activity_inscriptions FROM anon, authenticated;

-- NOTA sobre escrituras de admin:
--   Las rutas /api/admin/activities y /api/admin/professionals usan
--   createAdminClient() (service_role_key) que bypasea RLS.
--   Las verificaciones de rol + tenant se hacen en el application layer
--   (verifyAdminAccess + verifyAdminMunicipalityAccess), siguiendo el
--   mismo patrón existente para /api/admin/applications.
--   Si en el futuro se quiere RLS más estricto, basta añadir políticas
--   adicionales para 'admin_municipio' en su tenant_id.

-- ===========================================================================
-- 5. TRIGGER: updated_at automático
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_professionals_updated_at ON public.professionals;
CREATE TRIGGER trg_professionals_updated_at
  BEFORE UPDATE ON public.professionals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_activities_updated_at ON public.activities;
CREATE TRIGGER trg_activities_updated_at
  BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_activity_inscriptions_updated_at ON public.activity_inscriptions;
CREATE TRIGGER trg_activity_inscriptions_updated_at
  BEFORE UPDATE ON public.activity_inscriptions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===========================================================================
-- 6. Storage bucket para fotos de profesionales + thumbnails de actividades
--    (Reutilizamos "application-thumbnails" que ya tienes, pero documentamos)
-- ===========================================================================

-- Las imágenes se suben vía la API admin que reutiliza
-- /api/admin/applications/upload-thumbnail. El bucket existente
-- es válido para ambos casos.

-- ===========================================================================
-- 7. Log informativo
-- ===========================================================================

DO $$
BEGIN
  RAISE NOTICE '[037_activities] ✅ Tablas professionals, activities, activity_inscriptions creadas.';
  RAISE NOTICE '[037_activities] ✅ RLS configurado: lectura pública para activas/publicadas, escritura vía service_role.';
  RAISE NOTICE '[037_activities] ✅ Trigger updated_at en las 3 tablas.';
  RAISE NOTICE '[037_activities] ⚠️  IMPORTANTE: recuerda apuntarte al patrón de migración (sql idempotente + DROP IF EXISTS en policies/triggers).';
END $$;

COMMIT;
