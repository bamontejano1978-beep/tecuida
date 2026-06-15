-- ============================================================
-- TE CUIDA — Seed: Categorías base del catálogo
-- Requisitos: 6.2
-- ============================================================
-- UUIDs fijos para referencias cruzadas en otros seeds.
-- Idempotente: ON CONFLICT DO NOTHING permite re-ejecución.
-- ============================================================

INSERT INTO public.categories (id, nombre, descripcion, icono_url, orden)
VALUES
  (
    '11111111-0000-0000-0000-000000000001',
    'Bienestar emocional',
    'Programas y herramientas para el cuidado de la salud mental y el equilibrio emocional.',
    NULL,
    1
  ),
  (
    '11111111-0000-0000-0000-000000000002',
    'Familia y crianza',
    'Recursos de apoyo para familias, padres y madres en la crianza y educación de los hijos.',
    NULL,
    2
  ),
  (
    '11111111-0000-0000-0000-000000000003',
    'Educación y juventud',
    'Programas orientados a jóvenes y estudiantes para su desarrollo personal y académico.',
    NULL,
    3
  ),
  (
    '11111111-0000-0000-0000-000000000004',
    'Mayores y envejecimiento activo',
    'Herramientas de estimulación cognitiva, actividad física y bienestar para personas mayores.',
    NULL,
    4
  ),
  (
    '11111111-0000-0000-0000-000000000005',
    'Salud comunitaria',
    'Programas de promoción de hábitos saludables y prevención de enfermedades para toda la ciudadanía.',
    NULL,
    5
  ),
  (
    '11111111-0000-0000-0000-000000000006',
    'Participación ciudadana',
    'Encuestas, cuestionarios y estudios para conocer las necesidades y el bienestar de la comunidad.',
    NULL,
    6
  )
ON CONFLICT (id) DO NOTHING;
