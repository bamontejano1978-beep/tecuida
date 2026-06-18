-- ============================================================
-- TE CUIDA — Migración 012: Tenant "platform" para superadmins
-- ============================================================
-- El esquema de public.users exige municipality_id NOT NULL
-- (FK a public.municipalities), pero los superadmins no
-- pertenecen a ningún municipio ciudadano. Se crea un tenant
-- sintético "platform" que actúa como contenedor del equipo
-- de la plataforma.
--
-- Este tenant:
--   - NO aparece en el catálogo público
--   - NO se cuenta en los 6 municipios extremeños
--   - NO tiene apps activas (el panel admin gestiona planes,
--     no apps directas)
--   - Sirve solo como FK válida para los usuarios con
--     rol='superadmin'
--
-- Idempotente: si ya existe, no hace nada.
-- ============================================================

INSERT INTO public.municipalities (
  slug,
  nombre_municipio,
  nombre_ayuntamiento,
  dominio,
  colores_corporativos,
  textos_institucionales,
  tipo_suscripcion,
  estado_suscripcion
)
SELECT
  'platform',
  'Plataforma Te Cuida',
  'Equipo Plataforma Te Cuida',
  'platform.tecuida.group',
  '{"primary":"#111827","secondary":"#4b5563","accent":"#f59e0b","background":"#ffffff","text":"#111827"}'::jsonb,
  '{"bienvenida":"Panel de plataforma","descripcion":"Tenant sintético para alojar superadmins","pie_pagina":"Te Cuida · Plataforma"}'::jsonb,
  'premium',
  'activa'
WHERE NOT EXISTS (
  SELECT 1 FROM public.municipalities WHERE slug = 'platform'
);
