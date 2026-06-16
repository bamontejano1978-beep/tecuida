-- ============================================================
-- TE CUIDA — Migration 014: Seed Calamonte (municipio extremeño 7)
-- ============================================================
-- NOTA: La primera versión de esta migration insertó Calamonte con
-- hero_image_url = '' (cadena vacía). Migration 015 aplica un UPDATE
-- correctivo para alinear el row live con el contrato del schema
-- (007_add_hero_image.sql: NULL = fondo verde sólido). En fresh DB
-- clones esta migration ya aplica el valor correcto (NULL).
-- ============================================================
-- Añade Calamonte a public.municipalities como migration incremental:
-- 008_seed_extremadura_municipalities.sql ya está aplicada en remoto
-- y no se re-aplica en supabase db push, así que es necesario un
-- archivo independiente para que el push propague la nueva fila.
--
-- Idempotente: ON CONFLICT (id) DO UPDATE garantiza que re-ejecutar
-- la migration actualiza en lugar de duplicar.
--
-- Defaults: hero_image_url = '' (fondo verde sólido, conforme al
-- comentario de la columna); oculto_admin = false (visible en admin).
-- ============================================================

INSERT INTO public.municipalities (
  id, slug, nombre_municipio, nombre_ayuntamiento, dominio,
  colores_corporativos, textos_institucionales,
  escudo_url, logo_url, hero_image_url,
  imagenes_municipio, modulos_activos,
  tipo_suscripcion, estado_suscripcion,
  oculto_admin
) VALUES
(
  'e0000001-0000-0000-0000-000000000007',
  'calamonte',
  'Calamonte',
  'Ayuntamiento de Calamonte',
  'calamonte.tecuida.group',
  '{"primary": "#142c19", "secondary": "#38633e", "accent": "#d79a35", "background": "#f7f1e7", "text": "#20231f"}',
  '{"bienvenida": "Programas y recursos para cuidar de las personas, fortalecer nuestra comunidad y construir juntos un Calamonte más saludable y solidario.", "descripcion": "Portal de bienestar del Ayuntamiento de Calamonte.", "pie_pagina": "© Ayuntamiento de Calamonte — TE CUIDA"}',
  '', '',
  NULL,
  '{}', '{}',
  'premium', 'activa',
  false
)
ON CONFLICT (id) DO UPDATE SET
  slug = EXCLUDED.slug,
  nombre_municipio = EXCLUDED.nombre_municipio,
  nombre_ayuntamiento = EXCLUDED.nombre_ayuntamiento,
  dominio = EXCLUDED.dominio,
  colores_corporativos = EXCLUDED.colores_corporativos,
  textos_institucionales = EXCLUDED.textos_institucionales,
  hero_image_url = EXCLUDED.hero_image_url,
  tipo_suscripcion = EXCLUDED.tipo_suscripcion,
  estado_suscripcion = EXCLUDED.estado_suscripcion,
  oculto_admin = EXCLUDED.oculto_admin;
