-- ============================================================
-- Inspección: estado actual de usuarios y municipios
-- ============================================================

SELECT 'AUTH_USERS' AS section, id::text, email,
       raw_user_meta_data->>'municipality_slug' AS tenant_slug,
       (email_confirmed_at IS NOT NULL)::text AS confirmed
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

SELECT 'PUBLIC_SUPERADMINS' AS section, u.id::text, u.email, u.rol,
       m.slug AS tenant_slug
FROM public.users u
LEFT JOIN public.municipalities m ON u.municipality_id = m.id
WHERE u.rol = 'superadmin'
LIMIT 10;

SELECT 'MUNICIPALITIES' AS section, id::text, slug, nombre_municipio,
       estado_suscripcion
FROM public.municipalities
ORDER BY slug
LIMIT 20;

SELECT 'PLATFORM_TENANT_EXISTS' AS section, id::text, slug, nombre_municipio
FROM public.municipalities
WHERE slug IN ('platform', 'admin', 'tecuida-platform');
