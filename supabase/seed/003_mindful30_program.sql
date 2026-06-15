-- ============================================================
-- TE CUIDA — Seed: Programa Mindful30 Adultos (estructura completa)
-- Requisitos: 7.1
-- ============================================================
-- Dependencias:
--   002_applications.sql → application_id de "Mindful30 Adultos"
--     = '22222222-0000-0000-0000-000000000001'
--
-- Estructura:
--   1 programa  → 5 módulos → 6 lecciones/módulo = 30 lecciones
--
-- UUIDs fijos para referencias cruzadas.
-- Idempotente: ON CONFLICT (id) DO NOTHING.
-- ============================================================

-- ============================================================
-- 1. PROGRAM — Mindful30 Adultos
-- ============================================================
INSERT INTO public.programs (id, application_id, nombre, descripcion, total_sesiones, duracion_dias)
VALUES (
  '33333333-0000-0000-0000-000000000001',
  '22222222-0000-0000-0000-000000000001',
  'Mindful30 Adultos',
  'Programa de 30 días de mindfulness y atención plena para adultos. Cada día dedicas 15 minutos a una práctica guiada que combina texto reflexivo, ejercicios de respiración y momentos de introspección. Avanza a tu ritmo y construye el hábito de la atención plena.',
  30,
  30
)
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 2. MÓDULOS (5 módulos de 6 lecciones cada uno)
-- ============================================================
INSERT INTO public.program_modules (id, program_id, numero, nombre)
VALUES
  (
    '44444444-0001-0000-0000-000000000000',
    '33333333-0000-0000-0000-000000000001',
    1,
    'Fundamentos de la atención plena'
  ),
  (
    '44444444-0002-0000-0000-000000000000',
    '33333333-0000-0000-0000-000000000001',
    2,
    'El cuerpo y la respiración'
  ),
  (
    '44444444-0003-0000-0000-000000000000',
    '33333333-0000-0000-0000-000000000001',
    3,
    'Emociones y pensamientos'
  ),
  (
    '44444444-0004-0000-0000-000000000000',
    '33333333-0000-0000-0000-000000000001',
    4,
    'Relaciones y compasión'
  ),
  (
    '44444444-0005-0000-0000-000000000000',
    '33333333-0000-0000-0000-000000000001',
    5,
    'Integración en la vida cotidiana'
  )
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 3. LECCIONES
--    Módulo 1 — Fundamentos de la atención plena (lecciones 1-6)
-- ============================================================
INSERT INTO public.lessons (id, module_id, titulo, tipo, contenido_texto, duracion_minutos, orden)
VALUES
  (
    '55555555-0001-0001-0000-000000000000',
    '44444444-0001-0000-0000-000000000000',
    'Día 1 — ¿Qué es el mindfulness?',
    'combinado',
    'Descubre qué significa estar plenamente presente. Explorarás la diferencia entre el piloto automático mental y la atención consciente, y realizarás tu primera práctica de observación del momento presente durante 5 minutos.',
    15,
    1
  ),
  (
    '55555555-0001-0002-0000-000000000000',
    '44444444-0001-0000-0000-000000000000',
    'Día 2 — La mente de principiante',
    'combinado',
    'Aprende a observar tu experiencia como si fuera la primera vez, sin juicios ni etiquetas. El ejercicio de la uva pasa (o un objeto cotidiano) te introducirá en la observación sensorial consciente.',
    15,
    2
  ),
  (
    '55555555-0001-0003-0000-000000000000',
    '44444444-0001-0000-0000-000000000000',
    'Día 3 — Observar sin juzgar',
    'combinado',
    'La mente juzga constantemente: bueno, malo, aburrido, interesante. Hoy practicarás notar esos juicios sin identificarte con ellos, usando la técnica del "etiquetado mental" durante una breve meditación sentada.',
    15,
    3
  ),
  (
    '55555555-0001-0004-0000-000000000000',
    '44444444-0001-0000-0000-000000000000',
    'Día 4 — La impermanencia',
    'combinado',
    'Todo cambia. Las sensaciones, los pensamientos y las emociones aparecen y desaparecen como nubes en el cielo. Reflexionarás sobre la impermanencia y practicarás observar cómo los estados mentales se transforman.',
    15,
    4
  ),
  (
    '55555555-0001-0005-0000-000000000000',
    '44444444-0001-0000-0000-000000000000',
    'Día 5 — Piloto automático',
    'combinado',
    'Identificarás en qué momentos del día tu mente "desconecta" y actúas sin consciencia. Aprenderás a insertar pequeñas pausas de atención plena en las rutinas automáticas (comer, ducharse, caminar).',
    15,
    5
  ),
  (
    '55555555-0001-0006-0000-000000000000',
    '44444444-0001-0000-0000-000000000000',
    'Día 6 — Revisión y consolidación del módulo 1',
    'combinado',
    'Repasa los cinco principios aprendidos esta semana: presencia, mente de principiante, no juicio, impermanencia y consciencia de los automatismos. Completa el diario de reflexión del módulo.',
    15,
    6
  ),

  -- ──────────────────────────────────────────────────────────
  -- Módulo 2 — El cuerpo y la respiración (lecciones 7-12)
  -- ──────────────────────────────────────────────────────────
  (
    '55555555-0002-0001-0000-000000000000',
    '44444444-0002-0000-0000-000000000000',
    'Día 7 — La respiración como ancla',
    'combinado',
    'La respiración siempre está contigo y siempre ocurre en el presente. Aprenderás a usarla como ancla de atención cuando la mente divague. Practica la respiración consciente 4-4-4 durante 10 minutos.',
    15,
    1
  ),
  (
    '55555555-0002-0002-0000-000000000000',
    '44444444-0002-0000-0000-000000000000',
    'Día 8 — Respiración abdominal',
    'combinado',
    'La mayoría respiramos de forma superficial y torácica. Hoy aprenderás la respiración diafragmática, más lenta y profunda, que activa el sistema nervioso parasimpático y reduce la activación del estrés.',
    15,
    2
  ),
  (
    '55555555-0002-0003-0000-000000000000',
    '44444444-0002-0000-0000-000000000000',
    'Día 9 — Escáner corporal',
    'combinado',
    'El body scan o escáner corporal es una práctica central del mindfulness. Recorrerás mentalmente todo tu cuerpo de los pies a la cabeza, observando sensaciones sin intentar cambiarlas.',
    15,
    3
  ),
  (
    '55555555-0002-0004-0000-000000000000',
    '44444444-0002-0000-0000-000000000000',
    'Día 10 — Tensión y relajación',
    'combinado',
    'Aprenderás a distinguir entre tensión muscular y relajación consciente. El ejercicio de relajación progresiva de Jacobson, simplificado, te ayudará a liberar la tensión acumulada en el cuerpo.',
    15,
    4
  ),
  (
    '55555555-0002-0005-0000-000000000000',
    '44444444-0002-0000-0000-000000000000',
    'Día 11 — El cuerpo en movimiento',
    'combinado',
    'El mindfulness no se limita a estar quieto. Practicarás la marcha consciente o mindful walking: caminar prestando atención plena a cada paso, al contacto del pie con el suelo y al ritmo del movimiento.',
    15,
    5
  ),
  (
    '55555555-0002-0006-0000-000000000000',
    '44444444-0002-0000-0000-000000000000',
    'Día 12 — Señales del cuerpo',
    'combinado',
    'Tu cuerpo te envía señales constantemente: hambre, cansancio, tensión, bienestar. Hoy aprenderás a escucharlas antes de que se conviertan en malestar, y a responder con consciencia en lugar de reaccionar automáticamente.',
    15,
    6
  ),

  -- ──────────────────────────────────────────────────────────
  -- Módulo 3 — Emociones y pensamientos (lecciones 13-18)
  -- ──────────────────────────────────────────────────────────
  (
    '55555555-0003-0001-0000-000000000000',
    '44444444-0003-0000-0000-000000000000',
    'Día 13 — Los pensamientos no son hechos',
    'combinado',
    'Tendemos a creer todo lo que pensamos. Hoy aprenderás a observar tus pensamientos como eventos mentales pasajeros, no como verdades absolutas, usando la metáfora de los pensamientos como hojas flotando en un río.',
    15,
    1
  ),
  (
    '55555555-0003-0002-0000-000000000000',
    '44444444-0003-0000-0000-000000000000',
    'Día 14 — Defusión cognitiva',
    'combinado',
    'La defusión cognitiva te ayuda a tomar distancia de los pensamientos repetitivos o negativos. Practicarás técnicas como nombrar el pensamiento ("Estoy teniendo el pensamiento de que...") para reducir su impacto emocional.',
    15,
    2
  ),
  (
    '55555555-0003-0003-0000-000000000000',
    '44444444-0003-0000-0000-000000000000',
    'Día 15 — Reconocer las emociones',
    'combinado',
    'El primer paso para gestionar una emoción es reconocerla y nombrarla. Explorarás la rueda de las emociones y practicarás identificar qué sientes en diferentes momentos del día con precisión emocional.',
    15,
    3
  ),
  (
    '55555555-0003-0004-0000-000000000000',
    '44444444-0003-0000-0000-000000000000',
    'Día 16 — Surfear las emociones difíciles',
    'combinado',
    'Las emociones incómodas como la ansiedad o la tristeza tienen un ciclo natural: suben, alcanzan un pico y bajan. Aprenderás a "surfearlas" sin luchar contra ellas ni huir, observándolas con ecuanimidad.',
    15,
    4
  ),
  (
    '55555555-0003-0005-0000-000000000000',
    '44444444-0003-0000-0000-000000000000',
    'Día 17 — La ventana de tolerancia',
    'combinado',
    'Conocerás el concepto de ventana de tolerancia: el estado óptimo en que podemos procesar experiencias sin sentirnos desbordados (hiperactivación) ni desconectados (hipoactivación). Aprenderás a regularte cuando te salgas de esa ventana.',
    15,
    5
  ),
  (
    '55555555-0003-0006-0000-000000000000',
    '44444444-0003-0000-0000-000000000000',
    'Día 18 — Gratitud y emociones positivas',
    'combinado',
    'La atención plena no solo trabaja lo difícil; también entrena la capacidad de saborear lo bueno. Practicarás el ejercicio de los "tres buenos momentos" para ampliar las emociones positivas y la gratitud cotidiana.',
    15,
    6
  ),

  -- ──────────────────────────────────────────────────────────
  -- Módulo 4 — Relaciones y compasión (lecciones 19-24)
  -- ──────────────────────────────────────────────────────────
  (
    '55555555-0004-0001-0000-000000000000',
    '44444444-0004-0000-0000-000000000000',
    'Día 19 — Escucha activa y presencia',
    'combinado',
    'Estar presente de verdad con otra persona es un regalo. Hoy explorarás los obstáculos a la escucha auténtica (juicios, respuestas automáticas, distracción) y practicarás la escucha plena en una conversación real.',
    15,
    1
  ),
  (
    '55555555-0004-0002-0000-000000000000',
    '44444444-0004-0000-0000-000000000000',
    'Día 20 — Comunicación consciente',
    'combinado',
    'Las palabras tienen peso. Aprenderás a hacer una pausa antes de responder, a hablar desde el "yo" en lugar de atacar, y a expresar necesidades sin generar defensividad en los demás.',
    15,
    2
  ),
  (
    '55555555-0004-0003-0000-000000000000',
    '44444444-0004-0000-0000-000000000000',
    'Día 21 — Autocompasión',
    'combinado',
    'Tratar a los demás con amabilidad es más fácil que tratarse así a uno mismo. Hoy explorarás la autocompasión de Kristin Neff: humanidad compartida, mindfulness y amabilidad hacia uno mismo, especialmente en los momentos difíciles.',
    15,
    3
  ),
  (
    '55555555-0004-0004-0000-000000000000',
    '44444444-0004-0000-0000-000000000000',
    'Día 22 — Lovingkindness (Metta)',
    'combinado',
    'La meditación Metta o de amor bondadoso cultiva sentimientos de benevolencia hacia uno mismo y hacia los demás, incluidas personas difíciles. Practicarás una versión adaptada de 10 minutos.',
    15,
    4
  ),
  (
    '55555555-0004-0005-0000-000000000000',
    '44444444-0004-0000-0000-000000000000',
    'Día 23 — Gestión del conflicto con mindfulness',
    'combinado',
    'Los conflictos son inevitables; el sufrimiento innecesario no. Aprenderás a aplicar el método STOP (Stop, Take a breath, Observe, Proceed) antes de reaccionar en situaciones de tensión interpersonal.',
    15,
    5
  ),
  (
    '55555555-0004-0006-0000-000000000000',
    '44444444-0004-0000-0000-000000000000',
    'Día 24 — Conexión social y bienestar',
    'combinado',
    'Las relaciones de calidad son uno de los factores de bienestar más poderosos. Reflexionarás sobre tus vínculos más importantes y diseñarás una pequeña acción de conexión consciente para esta semana.',
    15,
    6
  ),

  -- ──────────────────────────────────────────────────────────
  -- Módulo 5 — Integración en la vida cotidiana (lecciones 25-30)
  -- ──────────────────────────────────────────────────────────
  (
    '55555555-0005-0001-0000-000000000000',
    '44444444-0005-0000-0000-000000000000',
    'Día 25 — Micro-prácticas diarias',
    'combinado',
    'No siempre se dispone de 20 minutos para meditar. Aprenderás micro-prácticas de 1 a 3 minutos que puedes insertar en cualquier momento del día: la pausa del semáforo, el minuto de consciencia y el check-in corporal.',
    15,
    1
  ),
  (
    '55555555-0005-0002-0000-000000000000',
    '44444444-0005-0000-0000-000000000000',
    'Día 26 — Mindfulness en el trabajo',
    'combinado',
    'La atención plena transforma cómo te relacionas con las tareas, los compañeros y el estrés laboral. Explorarás estrategias para trabajar con foco, gestionar las interrupciones y recuperarte de las jornadas intensas.',
    15,
    2
  ),
  (
    '55555555-0005-0003-0000-000000000000',
    '44444444-0005-0000-0000-000000000000',
    'Día 27 — Alimentación consciente',
    'combinado',
    'Comer con atención plena es mucho más que una práctica dietética: es reconectar con el placer, la saciedad real y el agradecimiento. Practicarás el "desayuno consciente" prestando atención a sabores, texturas y sensaciones.',
    15,
    3
  ),
  (
    '55555555-0005-0004-0000-000000000000',
    '44444444-0005-0000-0000-000000000000',
    'Día 28 — Tecnología y presencia',
    'combinado',
    'Las pantallas fragmentan nuestra atención de forma sistemática. Hoy diseñarás tu "protocolo personal de uso consciente de la tecnología": momentos sin pantallas, notificaciones, y zonas de descanso digital.',
    15,
    4
  ),
  (
    '55555555-0005-0005-0000-000000000000',
    '44444444-0005-0000-0000-000000000000',
    'Día 29 — Construir el hábito de por vida',
    'combinado',
    'El verdadero reto del mindfulness no es aprenderlo, sino mantenerlo. Explorarás los principios del cambio de hábitos (señal, rutina, recompensa) y diseñarás tu práctica sostenible de mindfulness para después del programa.',
    15,
    5
  ),
  (
    '55555555-0005-0006-0000-000000000000',
    '44444444-0005-0000-0000-000000000000',
    'Día 30 — Celebración y camino adelante',
    'combinado',
    '¡Has completado 30 días de práctica! Hoy celebras el camino recorrido y reflexionas sobre los cambios que has notado en tu vida. Recibirás una carta de cierre y un manifiesto personal de atención plena para seguir avanzando.',
    15,
    6
  )

ON CONFLICT (id) DO NOTHING;
