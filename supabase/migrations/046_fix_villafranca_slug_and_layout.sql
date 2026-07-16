-- ============================================================
-- TE CUIDA — Migration 046: fix Villafranca slug + apply editorial
-- ============================================================
-- Problemas encontrados tras deploy de #045:
--
-- 1. SLUG MISMATCH — La fila de Villafranca está almacenada como
--    'villafrancadelosbarros' (sin guiones), mientras que todo el
--    código del proyecto usa el slug canónico con guiones:
--      - subdominio:     villafranca-de-los-barros.tecuida.group
--      - extractor middleware: parts[0].toLowerCase() sobre hostname
--      - script de assets: scripts/discover-municipality-assets.ts:95
--      - migraciones hero/escudo: 016, 017, 018, 021
--    La consecuencia operativa es que el middleware hace
--    `WHERE slug = 'villafranca-de-los-barros'` y no encuentra nada,
--    por lo que el tenant devuelve 404 en lugar de la landing
--    editorial. El slug sin guiones sólo puede proceder de inserciones
--    manuales vía Supabase Studio o admin UI sin validación de patrón.
--
-- 2. MIGRATION 045 INCOMPLETA — El UPDATE de #045 usaba
--    slug='villafranca-de-los-barros' y por tanto hizo match de 0
--    filas; Villafranca permanece en layout_variant='classic'.
--
-- Esta migración hace tres cosas idempotentes:
--   a) Renombra el slug 'villafrancadelosbarros' a la forma canónica
--      con guiones (no-op si ya está corregido).
--   b) Activa layout_variant='editorial' para Villafranca
--      (cubre tanto el camino de pre-normalización como el de post-
--      normalización para idempotencia).
--   c) Añade un CHECK de formato de slug para evitar drift futura:
--      sólo letras minúsculas, dígitos y guiones.
--
-- Idempotencia: cada UPDATE lleva un WHERE guarda. Re-aplicable
-- sin efectos colaterales. El CHECK va en DO block para el mismo
-- motivo que en #045.
-- ============================================================

-- (a) Normalizar slug (sólo si no está canónico)
UPDATE public.municipalities
   SET slug = 'villafranca-de-los-barros'
 WHERE slug = 'villafrancadelosbarros';

-- (b) Aplicar editorial (idempotente vía guard de igualdad)
UPDATE public.municipalities
   SET layout_variant = 'editorial'
 WHERE slug = 'villafranca-de-los-barros'
   AND layout_variant <> 'editorial';

-- (c) Defensa: CHECK sobre el formato del slug para prevenir
--     regresiones como el drift detectado en esta auditoría.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint
     WHERE conname = 'municipalities_slug_format_check'
       AND conrelid = 'public.municipalities'::regclass
  ) THEN
    ALTER TABLE public.municipalities
      ADD CONSTRAINT municipalities_slug_format_check
      CHECK (slug ~ '^[a-z0-9-]+$');
  END IF;
END $$;

COMMENT ON CONSTRAINT municipalities_slug_format_check ON public.municipalities IS
  'Slug sólo letras minúsculas, dígitos y guiones. Caso real: villafrancadelosbarros migrado a villafranca-de-los-barros en #046.';
