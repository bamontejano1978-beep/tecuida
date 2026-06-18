-- ============================================================
-- TE CUIDA — Seed 004: Planes de suscripción
-- Requisitos: 16.1, 16.2
-- ============================================================
-- Crea 3 planes configurables con apps preasignadas.
-- Idempotente: ON CONFLICT (slug/id) DO NOTHING para los planes.
-- ON CONFLICT DO NOTHING para las asignaciones plan-application.
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- Plan: Básico
-- ──────────────────────────────────────────────────────────
INSERT INTO public.subscription_plans
  (id, slug, nombre, descripcion, precio_mensual, max_ciudadanos, activo, orden)
VALUES
  (
    '33333333-0000-0000-0000-000000000001',
    'basico',
    'Plan Básico',
    'Acceso a las aplicaciones esenciales de bienestar emocional y salud comunitaria. Ideal para municipios pequeños que quieren empezar.',
    49.00,
    500,
    true,
    1
  )
ON CONFLICT (id) DO NOTHING;

-- Apps del Plan Básico (6 apps)
INSERT INTO public.plan_applications (plan_id, application_id)
SELECT
  '33333333-0000-0000-0000-000000000001'::uuid,
  a
FROM unnest(ARRAY[
  '22222222-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000005',
  '22222222-0000-0000-0000-000000000006',
  '22222222-0000-0000-0000-000000000020',
  '22222222-0000-0000-0000-000000000024',
  '22222222-0000-0000-0000-000000000025'
]::uuid[]) AS a
ON CONFLICT (plan_id, application_id) DO NOTHING;


-- ──────────────────────────────────────────────────────────
-- Plan: Estándar
-- ──────────────────────────────────────────────────────────
INSERT INTO public.subscription_plans
  (id, slug, nombre, descripcion, precio_mensual, max_ciudadanos, activo, orden)
VALUES
  (
    '33333333-0000-0000-0000-000000000002',
    'estandar',
    'Plan Estándar',
    'Incluye todo el Plan Básico más programas de familia, educación, juventud y mayores. Para municipios medianos con necesidades diversas.',
    149.00,
    5000,
    true,
    2
  )
ON CONFLICT (id) DO NOTHING;

-- Apps del Plan Estándar (16 apps = 6 básico + 10 adicionales)
INSERT INTO public.plan_applications (plan_id, application_id)
SELECT
  '33333333-0000-0000-0000-000000000002'::uuid,
  a
FROM unnest(ARRAY[
  -- Las 6 del básico
  '22222222-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000005',
  '22222222-0000-0000-0000-000000000006',
  '22222222-0000-0000-0000-000000000020',
  '22222222-0000-0000-0000-000000000024',
  '22222222-0000-0000-0000-000000000025',
  -- + Familia y crianza
  '22222222-0000-0000-0000-000000000007',
  '22222222-0000-0000-0000-000000000008',
  '22222222-0000-0000-0000-000000000010',
  -- + Educación y juventud
  '22222222-0000-0000-0000-000000000011',
  '22222222-0000-0000-0000-000000000012',
  '22222222-0000-0000-0000-000000000014',
  -- + Mayores
  '22222222-0000-0000-0000-000000000015',
  '22222222-0000-0000-0000-000000000016',
  '22222222-0000-0000-0000-000000000018',
  -- + Salud comunitaria
  '22222222-0000-0000-0000-000000000021',
  '22222222-0000-0000-0000-000000000022'
]::uuid[]) AS a
ON CONFLICT (plan_id, application_id) DO NOTHING;


-- ──────────────────────────────────────────────────────────
-- Plan: Premium
-- ──────────────────────────────────────────────────────────
INSERT INTO public.subscription_plans
  (id, slug, nombre, descripcion, precio_mensual, max_ciudadanos, activo, orden)
VALUES
  (
    '33333333-0000-0000-0000-000000000003',
    'premium',
    'Plan Premium',
    'Acceso completo a todas las aplicaciones sin límite de usuarios. Incluye herramientas avanzadas de estudios sociales, prevención y mediación.',
    399.00,
    NULL, -- ilimitado
    true,
    3
  )
ON CONFLICT (id) DO NOTHING;

-- Apps del Plan Premium (todas las 26 apps)
INSERT INTO public.plan_applications (plan_id, application_id)
SELECT
  '33333333-0000-0000-0000-000000000003'::uuid,
  a
FROM unnest(ARRAY[
  '22222222-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000002',
  '22222222-0000-0000-0000-000000000003',
  '22222222-0000-0000-0000-000000000004',
  '22222222-0000-0000-0000-000000000005',
  '22222222-0000-0000-0000-000000000006',
  '22222222-0000-0000-0000-000000000007',
  '22222222-0000-0000-0000-000000000008',
  '22222222-0000-0000-0000-000000000009',
  '22222222-0000-0000-0000-000000000010',
  '22222222-0000-0000-0000-000000000011',
  '22222222-0000-0000-0000-000000000012',
  '22222222-0000-0000-0000-000000000013',
  '22222222-0000-0000-0000-000000000014',
  '22222222-0000-0000-0000-000000000015',
  '22222222-0000-0000-0000-000000000016',
  '22222222-0000-0000-0000-000000000017',
  '22222222-0000-0000-0000-000000000018',
  '22222222-0000-0000-0000-000000000019',
  '22222222-0000-0000-0000-000000000020',
  '22222222-0000-0000-0000-000000000021',
  '22222222-0000-0000-0000-000000000022',
  '22222222-0000-0000-0000-000000000023',
  '22222222-0000-0000-0000-000000000024',
  '22222222-0000-0000-0000-000000000025',
  '22222222-0000-0000-0000-000000000026'
]::uuid[]) AS a
ON CONFLICT (plan_id, application_id) DO NOTHING;


-- ──────────────────────────────────────────────────────────
-- Asignar Plan Básico a los 6 municipios extremeños existentes
-- (por defecto, hasta que el superadmin los cambie)
-- ──────────────────────────────────────────────────────────
UPDATE public.municipalities
SET plan_id = '33333333-0000-0000-0000-000000000001'::uuid
WHERE slug IN (
    'fuente-del-maestre',
    'jerez-de-los-caballeros',
    'llerena',
    'los-santos-de-maimona',
    'villafranca-de-los-barros',
    'zafra'
  )
  AND plan_id IS NULL;
