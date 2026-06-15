-- ============================================================
-- TE CUIDA — Seed: 6 municipios extremeños
-- ============================================================
-- Inserta los municipios con sus datos institucionales y
-- hero_image_url extraídos de las plantillas HTML.
-- ============================================================

INSERT INTO public.municipalities (
  id, slug, nombre_municipio, nombre_ayuntamiento, dominio,
  colores_corporativos, textos_institucionales, 
  escudo_url, logo_url, hero_image_url,
  imagenes_municipio, modulos_activos,
  tipo_suscripcion, estado_suscripcion
) VALUES

-- 1. Fuente del Maestre
(
  'e0000001-0000-0000-0000-000000000001',
  'fuente-del-maestre',
  'Fuente del Maestre',
  'Ayuntamiento de Fuente del Maestre',
  'fuente-del-maestre.tecuida.group',
  '{"primary": "#142c19", "secondary": "#38633e", "accent": "#d79a35", "background": "#f7f1e7", "text": "#20231f"}',
  '{"bienvenida": "Programas y recursos para cuidar de las personas, fortalecer nuestra comunidad y construir juntos un Fuente del Maestre más saludable y solidario.", "descripcion": "Portal de bienestar del Ayuntamiento de Fuente del Maestre.", "pie_pagina": "© Ayuntamiento de Fuente del Maestre — TE CUIDA"}',
  '', '', 'https://www.turismoextremadura.com/viajar/shared/galerias/rrtt/destinos-turisticos/destino-turistico_00063/img/A_FUENTE_MAESTRE_01.jpg',
  '{}', '{}', 'premium', 'activa'
),

-- 2. Jerez de los Caballeros
(
  'e0000001-0000-0000-0000-000000000002',
  'jerez-de-los-caballeros',
  'Jerez de los Caballeros',
  'Ayuntamiento de Jerez de los Caballeros',
  'jerez-de-los-caballeros.tecuida.group',
  '{"primary": "#142c19", "secondary": "#38633e", "accent": "#d79a35", "background": "#f7f1e7", "text": "#20231f"}',
  '{"bienvenida": "Programas y recursos para cuidar de las personas, fortalecer nuestra comunidad y construir juntos una Jerez de los Caballeros más saludable y solidaria.", "descripcion": "Portal de bienestar del Ayuntamiento de Jerez de los Caballeros.", "pie_pagina": "© Ayuntamiento de Jerez de los Caballeros — TE CUIDA"}',
  '', '', 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Jerez_de_los_Caballeros_001.jpg/1280px-Jerez_de_los_Caballeros_001.jpg',
  '{}', '{}', 'premium', 'activa'
),

-- 3. Llerena
(
  'e0000001-0000-0000-0000-000000000003',
  'llerena',
  'Llerena',
  'Ayuntamiento de Llerena',
  'llerena.tecuida.group',
  '{"primary": "#142c19", "secondary": "#38633e", "accent": "#d79a35", "background": "#f7f1e7", "text": "#20231f"}',
  '{"bienvenida": "Programas y recursos para cuidar de las personas, fortalecer la comunidad y construir juntos una Llerena más saludable, cercana y solidaria.", "descripcion": "Portal de bienestar del Ayuntamiento de Llerena.", "pie_pagina": "© Ayuntamiento de Llerena — TE CUIDA"}',
  '', '', 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Llerena%2C_Iglesia_de_Nuestra_Se%C3%B1ora_de_la_Granada_34-7v.jpg/1280px-Llerena%2C_Iglesia_de_Nuestra_Se%C3%B1ora_de_la_Granada_34-7v.jpg',
  '{}', '{}', 'premium', 'activa'
),

-- 4. Los Santos de Maimona
(
  'e0000001-0000-0000-0000-000000000004',
  'los-santos-de-maimona',
  'Los Santos de Maimona',
  'Ayuntamiento de Los Santos de Maimona',
  'los-santos-de-maimona.tecuida.group',
  '{"primary": "#142c19", "secondary": "#38633e", "accent": "#d79a35", "background": "#f7f1e7", "text": "#20231f"}',
  '{"bienvenida": "Programas y recursos para cuidar de las personas, fortalecer nuestra comunidad y construir juntos unos Santos de Maimona más saludables y solidarios.", "descripcion": "Portal de bienestar del Ayuntamiento de Los Santos de Maimona.", "pie_pagina": "© Ayuntamiento de Los Santos de Maimona — TE CUIDA"}',
  '', '', 'https://www.turismoextremadura.com/viajar/shared/galerias/rrtt/destinos-turisticos/destino-turistico_00070/img/A_SANTOS_MAIMONA_09.jpg',
  '{}', '{}', 'premium', 'activa'
),

-- 5. Villafranca de los Barros
(
  'e0000001-0000-0000-0000-000000000005',
  'villafranca-de-los-barros',
  'Villafranca de los Barros',
  'Ayuntamiento de Villafranca de los Barros',
  'villafranca-de-los-barros.tecuida.group',
  '{"primary": "#142c19", "secondary": "#38633e", "accent": "#d79a35", "background": "#f7f1e7", "text": "#20231f"}',
  '{"bienvenida": "Programas y recursos para cuidar de las personas, fortalecer nuestra comunidad y construir juntos una Villafranca más saludable y solidaria.", "descripcion": "Portal de bienestar del Ayuntamiento de Villafranca de los Barros.", "pie_pagina": "© Ayuntamiento de Villafranca de los Barros — TE CUIDA"}',
  '', '', 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/Villafranca_de_los_Barros_-_Plaza_de_Espa%C3%B1a.jpg/1280px-Villafranca_de_los_Barros_-_Plaza_de_Espa%C3%B1a.jpg',
  '{}', '{}', 'premium', 'activa'
),

-- 6. Zafra
(
  'e0000001-0000-0000-0000-000000000006',
  'zafra',
  'Zafra',
  'Ayuntamiento de Zafra',
  'zafra.tecuida.group',
  '{"primary": "#142c19", "secondary": "#38633e", "accent": "#d79a35", "background": "#f7f1e7", "text": "#20231f"}',
  '{"bienvenida": "Programas y recursos para cuidar de las personas, fortalecer nuestra comunidad y construir juntos una Zafra más saludable y solidaria.", "descripcion": "Portal de bienestar del Ayuntamiento de Zafra.", "pie_pagina": "© Ayuntamiento de Zafra — TE CUIDA"}',
  '', '', 'https://www.turismobadajoz.es/wp-content/uploads/2023/03/Plaza-grande-Zafra-vista-Soportales.jpg',
  '{}', '{}', 'premium', 'activa'
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
  estado_suscripcion = EXCLUDED.estado_suscripcion;
