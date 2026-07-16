-- ============================================================
-- TE CUIDA — Migration 045: layout_variant en public.municipalities
-- ============================================================
-- Objetivo: permitir que un municipio concreto (hoy solo
-- villafranca-de-los-barros) active un layout alternativo de su
-- landing page (ej. rediseño "editorial" Villafranca) sin
-- necesidad de tocar el código de los demás municipios.
--
-- Diseño:
--   * Columna text NOT NULL DEFAULT 'classic'              -> operativa
--     O(1) en Postgres 11+ (sólo actualiza el catálogo, no
--     reescribe la tabla). Las 6+ filas existentes heredan
--     'classic' sin requerir UPDATE explícito.
--   * CHECK constraint -> evita valores no documentados.
--   * UPDATE explícito solo para Villafranca.
--
-- Decisión de no usar ENUM: un ENUM exige ALTER TYPE cada vez
-- que añadamos un layout, y bloquea migraciones por orden de
-- aplicación si dos devs añaden variantes distintas. text+CHECK
-- escala mejor y mantiene la migración puramente aditiva.
--
-- Idempotencia:
--   * ADD COLUMN IF NOT EXISTS  -> soporta re-ejecución segura
--     en entornos donde la migración pudiera aplicarse dos veces.
--   * DO block para el CHECK que solo lo crea si no existe.
--   * UPDATE idempotente por slugs concretos (mismo valor).
-- ============================================================

ALTER TABLE public.municipalities
  ADD COLUMN IF NOT EXISTS layout_variant text NOT NULL DEFAULT 'classic';

-- Constraint CHECK (no IF NOT EXISTS en Postgres <16 no relacional;
--  lo envolvemos en un DO block para re-ejecuciones seguras).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'municipalities_layout_variant_check'
       AND conrelid = 'public.municipalities'::regclass
  ) THEN
    ALTER TABLE public.municipalities
      ADD CONSTRAINT municipalities_layout_variant_check
      CHECK (layout_variant IN ('classic', 'editorial'));
  END IF;
END $$;

-- Sembrar Villafranca como editorial. Idempotente (mismo valor).
UPDATE public.municipalities
   SET layout_variant = 'editorial'
 WHERE slug = 'villafranca-de-los-barros'
   AND layout_variant <> 'editorial';

-- Comentario en la columna para futuros lectores.
COMMENT ON COLUMN public.municipalities.layout_variant IS
  'Variante de layout de la landing page. Valores: ''classic'' (actual) o ''editorial'' (Villafranca, screenshot de rediseño). Añadir nuevas variantes requiere migración + entrada en CHECK.';
