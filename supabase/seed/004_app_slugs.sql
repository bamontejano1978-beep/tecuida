-- ============================================================
-- TE CUIDA — Seed 004: Asignar app_slug a apps existentes
-- ============================================================
-- Asigna slugs a las aplicaciones que tendrán subdominio propio.
-- Idempotente: ON CONFLICT no aplica (es UPDATE).
-- ============================================================

UPDATE public.applications
SET app_slug = 'mindful30-adultos'
WHERE id = '22222222-0000-0000-0000-000000000001'
  AND app_slug IS NULL;

UPDATE public.applications
SET app_slug = 'gestor-estres'
WHERE id = '22222222-0000-0000-0000-000000000005'
  AND app_slug IS NULL;

UPDATE public.applications
SET app_slug = 'vida-saludable'
WHERE id = '22222222-0000-0000-0000-000000000020'
  AND app_slug IS NULL;

UPDATE public.applications
SET app_slug = 'mindful30-adolescentes'
WHERE id = '22222222-0000-0000-0000-000000000027'
  AND app_slug IS NULL;
