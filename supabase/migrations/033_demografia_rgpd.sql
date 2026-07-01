-- ============================================================================
-- TE CUIDA — 033: Datos estadísticos anónimos (RGPD-compliant)
-- ============================================================================
-- Contexto: Para medir el impacto de los programas necesitamos poder segmentar
-- por demografía (género y edad). RGPD permite recolectar estos datos si:
--   (a) Son opcionales (el usuario elige compartirlos)
--   (b) Tienen un propósito claro y legítimo (análisis de impacto)
--   (c) Se anonimizan en los agregados (nunca se muestra PII individual)
--
-- Diseño RGPD-safe:
--   · genero: texto con CHECK IN — opciones inclusivas. NULL = "prefiero no responder"
--   · anio_nacimiento: integer (solo año, no fecha completa) — menos
--     identificable que una fecha exacta, suficiente para franjas etarias
--   · Ambos son NULLABLE — el ciudadano puede omitirlos completamente
--   · Los usuarios legacy conservan su fecha_nacimiento exacta si la tenían
-- ============================================================================

BEGIN;

-- A) Género (opcional, inclusivo, propósito estadístico)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS genero text;

-- CHECK constraint separado para poder re-ejecutar la migración
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_genero_check'
    AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_genero_check
      CHECK (
        genero IS NULL
        OR genero IN ('hombre', 'mujer', 'no_binario')
      );
  END IF;
END $$;

COMMENT ON COLUMN public.users.genero IS
  'Género auto-declarado (opcional). RGPD: propósito estadístico anónimo de impacto. Opciones: hombre, mujer, no_binario. NULL = prefiero no responder.';

-- B) Año de nacimiento (opcional, solo año, no fecha completa)
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS anio_nacimiento integer;

COMMENT ON COLUMN public.users.anio_nacimiento IS
  'Año de nacimiento (opcional). RGPD-safe: solo año, no fecha completa. Se usa para calcular franjas etarias anónimas en métricas de impacto.';

-- C) Log informativo
DO $$
BEGIN
  RAISE NOTICE '[033_demografia] ✅ Columnas genero y anio_nacimiento añadidas (ambas opcionales, RGPD-compliant).';
END $$;

COMMIT;
