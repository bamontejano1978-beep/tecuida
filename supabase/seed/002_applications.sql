-- ============================================================
-- TE CUIDA — Seed: Catálogo de aplicaciones
-- Requisitos: 6.2, 7.1
-- ============================================================
-- UUIDs fijos para referencias cruzadas en otros seeds.
-- Idempotente: ON CONFLICT (id) DO NOTHING.
--
-- Referencias a categories (001_categories.sql):
--   Bienestar emocional          → 11111111-0000-0000-0000-000000000001
--   Familia y crianza            → 11111111-0000-0000-0000-000000000002
--   Educación y juventud         → 11111111-0000-0000-0000-000000000003
--   Mayores y envejecimiento     → 11111111-0000-0000-0000-000000000004
--   Salud comunitaria            → 11111111-0000-0000-0000-000000000005
--   Participación ciudadana      → 11111111-0000-0000-0000-000000000006
-- ============================================================

INSERT INTO public.applications (id, category_id, nombre, descripcion, thumbnail_url, tipo, nivel_suscripcion, activa)
VALUES

  -- ──────────────────────────────────────────────────────────
  -- Categoría: Bienestar emocional
  -- ──────────────────────────────────────────────────────────
  (
    '22222222-0000-0000-0000-000000000001',
    '11111111-0000-0000-0000-000000000001',
    'Mindful30 Adultos',
    'Programa de 30 días de mindfulness y atención plena para adultos. Mejora el bienestar emocional mediante técnicas de respiración, meditación y reflexión guiada.',
    NULL,
    'programa',
    'basico',
    true
  ),
  (
    '22222222-0000-0000-0000-000000000002',
    '11111111-0000-0000-0000-000000000001',
    'Mindful30 Jóvenes',
    'Programa de 30 días de mindfulness adaptado a jóvenes de 14 a 25 años. Incorpora dinámicas y lenguaje cercano para gestionar el estrés académico y social.',
    NULL,
    'programa',
    'basico',
    true
  ),
  (
    '22222222-0000-0000-0000-000000000003',
    '11111111-0000-0000-0000-000000000001',
    'Mindful30 Infantil',
    'Programa de atención plena para niños de 6 a 12 años. Actividades lúdicas y cuentos guiados para desarrollar la concentración y la regulación emocional desde la infancia.',
    NULL,
    'programa',
    'basico',
    true
  ),
  (
    '22222222-0000-0000-0000-000000000004',
    '11111111-0000-0000-0000-000000000001',
    'Mindful30 Mayores',
    'Programa de mindfulness diseñado para personas mayores de 60 años. Sesiones breves, ritmo pausado y ejercicios adaptados para la mejora del bienestar y la calma interior.',
    NULL,
    'programa',
    'basico',
    true
  ),
  (
    '22222222-0000-0000-0000-000000000005',
    '11111111-0000-0000-0000-000000000001',
    'Gestión del estrés',
    'Herramienta práctica con técnicas contrastadas para identificar, comprender y reducir el estrés cotidiano. Incluye ejercicios de respiración, relajación progresiva y planificación del tiempo.',
    NULL,
    'programa',
    'basico',
    true
  ),
  (
    '22222222-0000-0000-0000-000000000006',
    '11111111-0000-0000-0000-000000000001',
    'Sueño saludable',
    'Programa para mejorar la higiene del sueño y combatir el insomnio. Combina psicoeducación, rutinas nocturnas y técnicas de relajación para lograr un descanso reparador.',
    NULL,
    'programa',
    'basico',
    true
  ),

  -- ──────────────────────────────────────────────────────────
  -- Categoría: Familia y crianza
  -- ──────────────────────────────────────────────────────────
  (
    '22222222-0000-0000-0000-000000000007',
    '11111111-0000-0000-0000-000000000002',
    'Escuela de familias',
    'Programa formativo para padres y madres con talleres sobre comunicación familiar, establecimiento de límites y acompañamiento emocional a los hijos.',
    NULL,
    'programa',
    'basico',
    true
  ),
  (
    '22222222-0000-0000-0000-000000000008',
    '11111111-0000-0000-0000-000000000002',
    'Crianza positiva',
    'Herramienta de apoyo basada en la disciplina positiva para fomentar el vínculo afectivo sano entre progenitores e hijos y reducir los conflictos en el hogar.',
    NULL,
    'herramienta',
    'basico',
    true
  ),
  (
    '22222222-0000-0000-0000-000000000009',
    '11111111-0000-0000-0000-000000000002',
    'Gestión de conflictos familiares',
    'Programa de mediación y comunicación no violenta orientado a familias. Ofrece estrategias para resolver disputas cotidianas de forma constructiva y respetuosa.',
    NULL,
    'programa',
    'estandar',
    true
  ),
  (
    '22222222-0000-0000-0000-000000000010',
    '11111111-0000-0000-0000-000000000002',
    'Recursos por edades',
    'Biblioteca de recursos digitales organizados por etapa evolutiva del hijo (0-3, 4-6, 7-12, adolescencia) para orientar a las familias en cada fase del desarrollo.',
    NULL,
    'recurso',
    'basico',
    true
  ),

  -- ──────────────────────────────────────────────────────────
  -- Categoría: Educación y juventud
  -- ──────────────────────────────────────────────────────────
  (
    '22222222-0000-0000-0000-000000000011',
    '11111111-0000-0000-0000-000000000003',
    'Técnicas de estudio',
    'Programa para estudiantes de secundaria y universidad con metodologías contrastadas: mapas conceptuales, técnica Pomodoro, repaso espaciado y comprensión lectora avanzada.',
    NULL,
    'programa',
    'basico',
    true
  ),
  (
    '22222222-0000-0000-0000-000000000012',
    '11111111-0000-0000-0000-000000000003',
    'Gestión emocional adolescente',
    'Herramienta de inteligencia emocional dirigida a adolescentes de 12 a 18 años. Trabaja el autoconocimiento, la regulación emocional y las habilidades sociales.',
    NULL,
    'herramienta',
    'basico',
    true
  ),
  (
    '22222222-0000-0000-0000-000000000013',
    '11111111-0000-0000-0000-000000000003',
    'Prevención del acoso',
    'Programa de sensibilización y prevención del acoso escolar (bullying y ciberbullying) para centros educativos. Incluye guías para docentes, alumnado y familias.',
    NULL,
    'programa',
    'estandar',
    true
  ),
  (
    '22222222-0000-0000-0000-000000000014',
    '11111111-0000-0000-0000-000000000003',
    'Uso saludable de pantallas',
    'Programa de educación digital para jóvenes y familias sobre el uso responsable de smartphones, redes sociales y videojuegos. Incluye retos semanales y reflexiones guiadas.',
    NULL,
    'programa',
    'basico',
    true
  ),

  -- ──────────────────────────────────────────────────────────
  -- Categoría: Mayores y envejecimiento activo
  -- ──────────────────────────────────────────────────────────
  (
    '22222222-0000-0000-0000-000000000015',
    '11111111-0000-0000-0000-000000000004',
    'Memoria activa',
    'Programa de ejercicios cognitivos para el mantenimiento y la mejora de la memoria en personas mayores. Combina juegos de memoria, asociación y atención sostenida.',
    NULL,
    'programa',
    'basico',
    true
  ),
  (
    '22222222-0000-0000-0000-000000000016',
    '11111111-0000-0000-0000-000000000004',
    'Ejercicio adaptado',
    'Rutinas de actividad física diseñadas para personas mayores con ejercicios de bajo impacto, movilidad articular y equilibrio para mantener la autonomía funcional.',
    NULL,
    'programa',
    'basico',
    true
  ),
  (
    '22222222-0000-0000-0000-000000000017',
    '11111111-0000-0000-0000-000000000004',
    'Estimulación cognitiva',
    'Herramienta de estimulación multidimensional para personas mayores. Incluye actividades de lenguaje, cálculo, orientación y praxias para preservar las funciones cognitivas.',
    NULL,
    'herramienta',
    'estandar',
    true
  ),
  (
    '22222222-0000-0000-0000-000000000018',
    '11111111-0000-0000-0000-000000000004',
    'Alfabetización digital',
    'Programa paso a paso para que personas mayores puedan usar smartphones, videollamadas, administración electrónica y servicios digitales del día a día con autonomía y confianza.',
    NULL,
    'programa',
    'basico',
    true
  ),
  (
    '22222222-0000-0000-0000-000000000019',
    '11111111-0000-0000-0000-000000000004',
    'Prevención de la soledad',
    'Programa comunitario para detectar y reducir el aislamiento social en personas mayores. Combina recursos de autoayuda con conexión a redes de voluntariado municipal.',
    NULL,
    'programa',
    'estandar',
    true
  ),

  -- ──────────────────────────────────────────────────────────
  -- Categoría: Salud comunitaria
  -- ──────────────────────────────────────────────────────────
  (
    '22222222-0000-0000-0000-000000000020',
    '11111111-0000-0000-0000-000000000005',
    'Vida saludable',
    'Programa integral de promoción de la salud que integra nutrición, actividad física, descanso y gestión emocional para el bienestar global de la ciudadanía.',
    NULL,
    'programa',
    'basico',
    true
  ),
  (
    '22222222-0000-0000-0000-000000000021',
    '11111111-0000-0000-0000-000000000005',
    'Alimentación equilibrada',
    'Herramienta de educación nutricional con planes de alimentación, recetas saludables y consejos para adaptar la dieta mediterránea a la vida cotidiana.',
    NULL,
    'herramienta',
    'basico',
    true
  ),
  (
    '22222222-0000-0000-0000-000000000022',
    '11111111-0000-0000-0000-000000000005',
    'Actividad física',
    'Programa de fomento del ejercicio regular adaptado a todos los niveles. Incluye rutinas para casa, para exteriores y retos comunitarios por municipio.',
    NULL,
    'programa',
    'basico',
    true
  ),
  (
    '22222222-0000-0000-0000-000000000023',
    '11111111-0000-0000-0000-000000000005',
    'Prevención de enfermedades',
    'Recursos de educación sanitaria para la prevención de enfermedades crónicas, cardiovasculares y metabólicas. Incluye guías de cribado y hábitos preventivos.',
    NULL,
    'recurso',
    'estandar',
    true
  ),

  -- ──────────────────────────────────────────────────────────
  -- Categoría: Participación ciudadana
  -- ──────────────────────────────────────────────────────────
  (
    '22222222-0000-0000-0000-000000000024',
    '11111111-0000-0000-0000-000000000006',
    'Encuestas de bienestar',
    'Herramienta de encuestas periódicas para medir el nivel de bienestar percibido de la ciudadanía. Los resultados se agregan por municipio y están disponibles para el superadmin.',
    NULL,
    'encuesta',
    'basico',
    true
  ),
  (
    '22222222-0000-0000-0000-000000000025',
    '11111111-0000-0000-0000-000000000006',
    'Cuestionarios',
    'Plataforma de cuestionarios personalizables para que los municipios recaben información sobre salud, satisfacción con los servicios y necesidades concretas de sus vecinos.',
    NULL,
    'encuesta',
    'basico',
    true
  ),
  (
    '22222222-0000-0000-0000-000000000026',
    '11111111-0000-0000-0000-000000000006',
    'Estudios de necesidades ciudadanas',
    'Herramienta de investigación social para que los ayuntamientos realicen estudios estructurados sobre las necesidades y demandas de su población, exportables en formato informe.',
    NULL,
    'encuesta',
    'premium',
    true
  )

ON CONFLICT (id) DO NOTHING;
