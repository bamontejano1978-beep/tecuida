-- ============================================================
-- TE CUIDA — 028: Reto30 (PWA original migrada al monorepo)
-- ============================================================
-- Migra la PWA "Reto30" (mindful30-pwa) desde su codebase
-- original (React + Vite + Firebase) al monorepo Te Cuida.
--
-- Estructura: 30 módulos (días) × 3 lecciones (pilares)
--   🧠 Reflexión  — thoughts
--   ☀️ Actividad  — activities
--   ❤️ Relaciones — relationships
--
-- Diseño: dark theme + glassmorphism
--   brand_color: #14b8a6 (teal, ≈ HSL 174/60%/50% del original)
--   app_slug: reto30 → https://reto30.tecuida.group
--
-- Idempotente: ON CONFLICT (id) DO NOTHING.
-- ============================================================

-- ============================================================
-- 1. APPLICATION
-- ============================================================
INSERT INTO public.applications (id, category_id, nombre, descripcion, thumbnail_url, tipo, activa, app_slug, brand_color)
VALUES (
  '22222222-0000-0000-0000-000000000028',
  '11111111-0000-0000-0000-000000000001',
  'Reto30',
  'Transforma tu mente en 30 días. Un viaje de mindfulness con 3 pilares diarios: reflexión para entrenar tu pensamiento, actividad para conectar con tu cuerpo, y relaciones para nutrir tus vínculos. Diseño envolvente con tema oscuro, frases inspiradoras y celebración al completar cada día.',
  NULL,
  'programa',
  true,
  'reto30',
  '#14b8a6'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. PROGRAM
-- ============================================================
INSERT INTO public.programs (id, application_id, nombre, descripcion, total_sesiones, duracion_dias)
VALUES (
  '33333333-0000-0000-0000-000000000003',
  '22222222-0000-0000-0000-000000000028',
  'Reto30 — Transforma tu mente',
  'Bienvenido/a a Reto30. Durante 30 días trabajarás tres áreas clave de tu bienestar: la mente (reflexión), el cuerpo (actividad) y el corazón (relaciones). Cada día te propone un ejercicio de cada pilar. Sin prisas, sin juicios. Solo tú, tu compromiso y 30 días para transformar tu mirada.',
  30,
  30
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. MODULES — 30 días
-- ============================================================
INSERT INTO public.program_modules (id, program_id, numero, nombre)
VALUES
  ('44444444-0001-0000-0000-000000000000', '33333333-0000-0000-0000-000000000003', 1, 'Día 1 — El comienzo'),
  ('44444444-0002-0000-0000-000000000000', '33333333-0000-0000-0000-000000000003', 2, 'Día 2 — Realidad vs. pensamiento'),
  ('44444444-0003-0000-0000-000000000000', '33333333-0000-0000-0000-000000000003', 3, 'Día 3 — El filtro mental'),
  ('44444444-0004-0000-0000-000000000000', '33333333-0000-0000-0000-000000000003', 4, 'Día 4 — Sin catastrofismos'),
  ('44444444-0005-0000-0000-000000000000', '33333333-0000-0000-0000-000000000003', 5, 'Día 5 — Etiquetas que liberan'),
  ('44444444-0006-0000-0000-000000000000', '33333333-0000-0000-0000-000000000003', 6, 'Día 6 — Sentir no es razonar'),
  ('44444444-0007-0000-0000-000000000000', '33333333-0000-0000-0000-000000000003', 7, 'Día 7 — Revisión semanal'),
  ('44444444-0008-0000-0000-000000000000', '33333333-0000-0000-0000-000000000003', 8, 'Día 8 — No es personal'),
  ('44444444-0009-0000-0000-000000000000', '33333333-0000-0000-0000-000000000003', 9, 'Día 9 — Los "debería"'),
  ('44444444-0010-0000-0000-000000000000', '33333333-0000-0000-0000-000000000003', 10, 'Día 10 — Visión ampliada'),
  ('44444444-0011-0000-0000-000000000000', '33333333-0000-0000-0000-000000000003', 11, 'Día 11 — Lo que los demás piensan'),
  ('44444444-0012-0000-0000-000000000000', '33333333-0000-0000-0000-000000000003', 12, 'Día 12 — Más allá del blanco y negro'),
  ('44444444-0013-0000-0000-000000000000', '33333333-0000-0000-0000-000000000003', 13, 'Día 13 — Ni siempre ni nunca'),
  ('44444444-0014-0000-0000-000000000000', '33333333-0000-0000-0000-000000000003', 14, 'Día 14 — Lo que controlas'),
  ('44444444-0015-0000-0000-000000000000', '33333333-0000-0000-0000-000000000003', 15, 'Día 15 — Ecuador del reto'),
  ('44444444-0016-0000-0000-000000000000', '33333333-0000-0000-0000-000000000003', 16, 'Día 16 — Perspectiva temporal'),
  ('44444444-0017-0000-0000-000000000000', '33333333-0000-0000-0000-000000000003', 17, 'Día 17 — Pequeños logros'),
  ('44444444-0018-0000-0000-000000000000', '33333333-0000-0000-0000-000000000003', 18, 'Día 18 — Sin saltar a conclusiones'),
  ('44444444-0019-0000-0000-000000000000', '33333333-0000-0000-0000-000000000003', 19, 'Día 19 — Encontrar lo positivo'),
  ('44444444-0020-0000-0000-000000000000', '33333333-0000-0000-0000-000000000003', 20, 'Día 20 — Causa y estado'),
  ('44444444-0021-0000-0000-000000000000', '33333333-0000-0000-0000-000000000003', 21, 'Día 21 — Suficientemente bien'),
  ('44444444-0022-0000-0000-000000000000', '33333333-0000-0000-0000-000000000003', 22, 'Día 22 — Lo que mereces'),
  ('44444444-0023-0000-0000-000000000000', '33333333-0000-0000-0000-000000000003', 23, 'Día 23 — Sin esperar recompensa'),
  ('44444444-0024-0000-0000-000000000000', '33333333-0000-0000-0000-000000000003', 24, 'Día 24 — Más allá de la comparación'),
  ('44444444-0025-0000-0000-000000000000', '33333333-0000-0000-0000-000000000003', 25, 'Día 25 — Cuestiona tus creencias'),
  ('44444444-0026-0000-0000-000000000000', '33333333-0000-0000-0000-000000000003', 26, 'Día 26 — Tu reacción importa'),
  ('44444444-0027-0000-0000-000000000000', '33333333-0000-0000-0000-000000000003', 27, 'Día 27 — Amable > tener razón'),
  ('44444444-0028-0000-0000-000000000000', '33333333-0000-0000-0000-000000000003', 28, 'Día 28 — Aprender y reparar'),
  ('44444444-0029-0000-0000-000000000000', '33333333-0000-0000-0000-000000000003', 29, 'Día 29 — Mente sabia'),
  ('44444444-0030-0000-0000-000000000000', '33333333-0000-0000-0000-000000000003', 30, 'Día 30 — El cierre')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. LESSONS — 3 pilares × 30 días = 90 lecciones
--    Pilar 1 = reflexión (orden 1)
--    Pilar 2 = actividad  (orden 2)
--    Pilar 3 = relaciones (orden 3)
--    UUIDs: 55555555-00DD-000P-0000-000000000000
--           DD = día (01-30), P = pilar (1-3)
-- ============================================================

-- ─── DÍA 1 ───
INSERT INTO public.lessons (id, module_id, titulo, tipo, contenido_texto, duracion_minutos, orden) VALUES
('55555555-0001-0001-0000-000000000000', '44444444-0001-0000-0000-000000000000', '🧠 Cazando pensamientos', 'ejercicio', 'Anota 3 pensamientos negativos automáticos que hayas tenido hoy. No los juzgues, solo obsérvalos como un científico curioso. ¿De dónde vienen? ¿Son hechos o interpretaciones?', 10, 1),
('55555555-0001-0002-0000-000000000000', '44444444-0001-0000-0000-000000000000', '☀️ Pequeños placeres', 'ejercicio', 'Dedica 15 minutos a una actividad que disfrutes de verdad. Sin móvil, sin prisas, sin objetivo productivo. Solo disfrutar.', 15, 2),
('55555555-0001-0003-0000-000000000000', '44444444-0001-0000-0000-000000000000', '❤️ Conexión consciente', 'ejercicio', 'Envía un mensaje de gratitud a alguien importante en tu vida. Dile algo concreto que valores de esa persona, no un "gracias por todo" genérico.', 10, 3),

-- ─── DÍA 2 ───
('55555555-0002-0001-0000-000000000000', '44444444-0002-0000-0000-000000000000', '🧠 Realidad vs. pensamiento', 'ejercicio', 'Elige un pensamiento que te preocupe. Busca 2 pruebas de que es cierto y 2 pruebas de que no lo es. ¿Qué pesa más? ¿Es realmente un hecho o una historia que te cuentas?', 10, 1),
('55555555-0002-0002-0000-000000000000', '44444444-0002-0000-0000-000000000000', '☀️ Movimiento suave', 'ejercicio', '10 minutos de estiramientos o yoga suave. Sin objetivo de rendimiento. Concéntrate en cómo se siente tu cuerpo al moverse, no en cómo se ve.', 10, 2),
('55555555-0002-0003-0000-000000000000', '44444444-0002-0000-0000-000000000000', '❤️ Escucha activa', 'ejercicio', 'En tu próxima conversación, escucha sin interrumpir. Cuando la otra persona termine, resume lo que has entendido antes de responder. Nota la diferencia.', 10, 3),

-- ─── DÍA 3 ───
('55555555-0003-0001-0000-000000000000', '44444444-0003-0000-0000-000000000000', '🧠 El filtro mental', 'ejercicio', 'Tu cerebro tiende a filtrar lo negativo. Hoy contrarresta ese sesgo: anota 3 cosas buenas que hayan pasado, por pequeñas que sean. El café estaba rico. Hizo sol. Alguien te sonrió.', 10, 1),
('55555555-0003-0002-0000-000000000000', '44444444-0003-0000-0000-000000000000', '☀️ Desconexión digital', 'ejercicio', '1 hora entera sin teléfono ni redes sociales. Sin excusas. Dedica ese tiempo a algo que no implique pantallas: leer, dibujar, cocinar, caminar, hablar con alguien cara a cara.', 10, 2),
('55555555-0003-0003-0000-000000000000', '44444444-0003-0000-0000-000000000000', '❤️ Decir que no', 'ejercicio', 'Ensaya un guion para decir que no de forma asertiva: "Gracias por pensar en mí, pero esta vez no puedo". No hace falta dar explicaciones. Practícalo en voz alta.', 10, 3),

-- ─── DÍA 4 ───
('55555555-0004-0001-0000-000000000000', '44444444-0004-0000-0000-000000000000', '🧠 Sin catastrofismos', 'ejercicio', 'Cuando tu mente vaya al peor escenario posible, pregúntate: ¿qué es lo peor que podría pasar realmente? ¿Qué probabilidad real hay de que ocurra? ¿Y si ocurriera, qué harías?', 10, 1),
('55555555-0004-0002-0000-000000000000', '44444444-0004-0000-0000-000000000000', '☀️ Nutrición consciente', 'ejercicio', 'Haz una comida completa sin distracciones. Sin tele, sin móvil, sin leer. Mira la comida, huélela, mastica despacio. Nota texturas, sabores, temperaturas. Date cuenta de cuando estás lleno/a.', 10, 2),
('55555555-0004-0003-0000-000000000000', '44444444-0004-0000-0000-000000000000', '❤️ Pedir ayuda', 'ejercicio', 'Pide ayuda para algo pequeño hoy. Puede ser que te sujeten la puerta, que te expliquen algo, que te acompañen a un recado. Pedir ayuda no es debilidad, es humano.', 10, 3),

-- ─── DÍA 5 ───
('55555555-0005-0001-0000-000000000000', '44444444-0005-0000-0000-000000000000', '🧠 Etiquetas que liberan', 'ejercicio', 'Cambia una etiqueta limitante que te pones ("soy vago/a", "soy torpe") por hechos específicos: "Hoy me costó arrancar, pero hice X". Las etiquetas encasillan; los hechos describen.', 10, 1),
('55555555-0005-0002-0000-000000000000', '44444444-0005-0000-0000-000000000000', '☀️ Entorno ordenado', 'ejercicio', 'Ordena durante 10 minutos un espacio que tengas descuidado. Un cajón, la mesa, la mochila. El orden externo ayuda a calmar el interno.', 10, 2),
('55555555-0005-0003-0000-000000000000', '44444444-0005-0000-0000-000000000000', '❤️ Cumplido sincero', 'ejercicio', 'Hazle un cumplido genuino a alguien hoy. Algo concreto que admires o valores de esa persona. Dilo mirando a los ojos.', 5, 3),

-- ─── DÍA 6 ───
('55555555-0006-0001-0000-000000000000', '44444444-0006-0000-0000-000000000000', '🧠 Sentir no es razonar', 'ejercicio', '"Me siento un fracaso" ≠ "soy un fracaso". Diferencia entre emoción y hecho. Hoy, cuando sientas algo intenso, di: "Siento X, pero eso no significa que X sea verdad".', 10, 1),
('55555555-0006-0002-0000-000000000000', '44444444-0006-0000-0000-000000000000', '☀️ Creatividad libre', 'ejercicio', 'Crea algo sin buscar la perfección: un dibujo, una foto, un texto, una canción. El objetivo no es el resultado, es el proceso de crear sin juzgarte.', 10, 2),
('55555555-0006-0003-0000-000000000000', '44444444-0006-0000-0000-000000000000', '❤️ Tiempo de calidad', 'ejercicio', 'Dedica 15 minutos de presencia plena con alguien. Sin móvil, sin tele de fondo, sin prisa. Solo estar. Pregúntale cómo está de verdad.', 15, 3),

-- ─── DÍA 7 ───
('55555555-0007-0001-0000-000000000000', '44444444-0007-0000-0000-000000000000', '🧠 Revisión semanal', 'ejercicio', 'Revisa la semana: ¿qué distorsión de pensamiento te ha visitado más? ¿Catastrofismo, filtro mental, etiquetas? Identificar el patrón es el primer paso para cambiarlo.', 10, 1),
('55555555-0007-0002-0000-000000000000', '44444444-0007-0000-0000-000000000000', '☀️ Baño relajante', 'ejercicio', 'Date una ducha o baño consciente. Nota la temperatura del agua, la textura del jabón, el sonido. Sin prisa. Es tu momento de autocuidado.', 15, 2),
('55555555-0007-0003-0000-000000000000', '44444444-0007-0000-0000-000000000000', '❤️ Círculo de confianza', 'ejercicio', 'Anota 3 personas en las que confías de verdad. Personas con las que puedes ser tú mismo/a sin filtros. Si hace tiempo que no hablas con alguna, escríbele.', 10, 3),

-- ─── DÍA 8 ───
('55555555-0008-0001-0000-000000000000', '44444444-0008-0000-0000-000000000000', '🧠 No es personal', 'ejercicio', 'Cuando alguien esté de mal humor, busca 3 causas externas posibles: durmió mal, tuvo un problema, está estresado/a. No todo tiene que ver contigo.', 10, 1),
('55555555-0008-0002-0000-000000000000', '44444444-0008-0000-0000-000000000000', '☀️ Nueva ruta', 'ejercicio', 'Cambia tu ruta habitual hoy. Ve por otra calle, usa otro transporte, siéntate en otro sitio. Romper la rutina despierta la atención plena.', 10, 2),
('55555555-0008-0003-0000-000000000000', '44444444-0008-0000-0000-000000000000', '❤️ Límites digitales', 'ejercicio', 'Informa a tus contactos cercanos que vas a estar desconectado/a fuera de cierto horario. Establecer límites es cuidar tu salud mental y tus relaciones.', 5, 3),

-- ─── DÍA 9 ───
('55555555-0009-0001-0000-000000000000', '44444444-0009-0000-0000-000000000000', '🧠 Los "debería"', 'ejercicio', 'Cada "debo" es una exigencia que te autoimpones. Hoy cambia cada "debo hacer X" por "me gustaría hacer X" o "elijo hacer X". Nota cómo cambia la sensación.', 10, 1),
('55555555-0009-0002-0000-000000000000', '44444444-0009-0000-0000-000000000000', '☀️ Música para el ánimo', 'ejercicio', 'Crea una playlist con canciones que te suban el ánimo. Música que te haga mover la cabeza, sonreír o bailar. Escúchala mientras haces algo cotidiano.', 10, 2),
('55555555-0009-0003-0000-000000000000', '44444444-0009-0000-0000-000000000000', '❤️ Disculpa sincera', 'ejercicio', 'Pide disculpas por algo pequeño del pasado que aún te ronda. Una disculpa sincera libera a quien la da tanto como a quien la recibe.', 10, 3),

-- ─── DÍA 10 ───
('55555555-0010-0001-0000-000000000000', '44444444-0010-0000-0000-000000000000', '🧠 Visión ampliada', 'ejercicio', 'Elige un problema actual. En lugar de buscar LA solución perfecta, escribe 3 soluciones posibles, aunque te parezcan imperfectas. Ampliar opciones reduce la ansiedad.', 10, 1),
('55555555-0010-0002-0000-000000000000', '44444444-0010-0000-0000-000000000000', '☀️ Lectura inspiradora', 'ejercicio', 'Lee 10 páginas de un libro que tengas pendiente. Sin presión de acabarlo. Solo por el placer de leer. Si no tienes uno, empieza cualquiera que te llame la atención.', 15, 2),
('55555555-0010-0003-0000-000000000000', '44444444-0010-0000-0000-000000000000', '❤️ Contacto visual', 'ejercicio', 'Hoy mantén el contacto visual un segundo más de lo habitual al hablar con alguien. Nota cómo cambia la conexión. Es incómodo al principio, pero crea intimidad real.', 5, 3),

-- ─── DÍA 11 ───
('55555555-0011-0001-0000-000000000000', '44444444-0011-0000-0000-000000000000', '🧠 Lo que los demás piensan', 'ejercicio', 'Cuando creas que alguien piensa algo negativo de ti, pregúntate: ¿tengo pruebas reales? ¿O es mi interpretación? Escribe una alternativa neutral a lo que crees que piensan.', 10, 1),
('55555555-0011-0002-0000-000000000000', '44444444-0011-0000-0000-000000000000', '☀️ Autocuidado físico', 'ejercicio', 'Hoy dedica tiempo extra a tu rutina de cuidado personal. Una crema, un masaje en las manos, cuidar tu piel. Tu cuerpo te lo agradecerá.', 10, 2),
('55555555-0011-0003-0000-000000000000', '44444444-0011-0000-0000-000000000000', '❤️ Expresar necesidades', 'ejercicio', 'Usa la fórmula: "Me siento [emoción] cuando [situación] y necesitaría [petición concreta]". Practícalo hoy con alguien. Pedir lo que necesitas no es egoísta, es honesto.', 10, 3),

-- ─── DÍA 12 ───
('55555555-0012-0001-0000-000000000000', '44444444-0012-0000-0000-000000000000', '🧠 Más allá del blanco y negro', 'ejercicio', 'Busca 2 elementos neutros o positivos en algo que hayas etiquetado como "desastre". La vida rara vez es blanco o negro; casi siempre es un degradado de grises.', 10, 1),
('55555555-0012-0002-0000-000000000000', '44444444-0012-0000-0000-000000000000', '☀️ Infusión y pausa', 'ejercicio', 'Prepárate una infusión, té o café. Siéntate y bébelo despacio, sin hacer nada más. Sin móvil, sin leer, sin prisa. Solo tú y la bebida caliente. 10 minutos de pausa real.', 10, 2),
('55555555-0012-0003-0000-000000000000', '44444444-0012-0000-0000-000000000000', '❤️ Reencuentro', 'ejercicio', 'Contacta a un amigo o amiga con quien hace tiempo que no hablas. Un simple "Hola, me acordé de ti" puede alegraros el día a los dos.', 10, 3),

-- ─── DÍA 13 ───
('55555555-0013-0001-0000-000000000000', '44444444-0013-0000-0000-000000000000', '🧠 Ni siempre ni nunca', 'ejercicio', 'Detecta hoy las palabras "siempre", "nunca", "todo", "nada" en tu diálogo interior. "Siempre meto la pata" → "Esta vez no salió como quería". Sé preciso/a.', 10, 1),
('55555555-0013-0002-0000-000000000000', '44444444-0013-0000-0000-000000000000', '☀️ Canto o baile', 'ejercicio', 'Canta o baila en privado, sin vergüenza. Pon tu canción favorita y muévete como si nadie te viera. El movimiento libre libera tensiones acumuladas.', 10, 2),
('55555555-0013-0003-0000-000000000000', '44444444-0013-0000-0000-000000000000', '❤️ Evitar el cotilleo', 'ejercicio', 'Hoy, cuando surja un cotilleo o crítica sobre alguien que no está presente, cambia de tema o mantente neutral. "No conozco su situación" es una respuesta digna.', 5, 3),

-- ─── DÍA 14 ───
('55555555-0014-0001-0000-000000000000', '44444444-0014-0000-0000-000000000000', '🧠 Lo que controlas', 'ejercicio', 'Haz dos listas: "Lo que depende de mí hoy" y "Lo que no depende de mí". Suelta la segunda. Invierte tu energía solo en la primera. La serenidad está en aceptar esa diferencia.', 10, 1),
('55555555-0014-0002-0000-000000000000', '44444444-0014-0000-0000-000000000000', '☀️ Naturaleza cercana', 'ejercicio', 'Pasa 10 minutos en un parque, jardín o mirando por la ventana. Observa la luz, las hojas, los pájaros, las nubes. La naturaleza es el ansiolítico más antiguo y gratuito.', 10, 2),
('55555555-0014-0003-0000-000000000000', '44444444-0014-0000-0000-000000000000', '❤️ Pequeño detalle', 'ejercicio', 'Ten un detalle con alguien: traerle un café, dejarle una nota, recoger algo que no es tuyo. Los pequeños gestos construyen relaciones grandes.', 10, 3),

-- ─── DÍA 15 ───
('55555555-0015-0001-0000-000000000000', '44444444-0015-0000-0000-000000000000', '🧠 Ecuador del reto', 'ejercicio', '¡Día 15! Escribe una carta a tu "yo" del día 1. Cuéntale qué has aprendido, qué te ha costado, de qué te sientes orgulloso/a. Guarda esta carta para el día 30.', 15, 1),
('55555555-0015-0002-0000-000000000000', '44444444-0015-0000-0000-000000000000', '☀️ Siesta reparadora', 'ejercicio', 'Date una siesta de máximo 20 minutos. Programa la alarma. La siesta corta recarga la energía sin dejarte aturdido/a. Si no puedes dormir, solo tumbarte y cerrar los ojos cuenta.', 20, 2),
('55555555-0015-0003-0000-000000000000', '44444444-0015-0000-0000-000000000000', '❤️ Diálogo interior', 'ejercicio', 'Háblate hoy como le hablarías a tu mejor amigo/a. Con cariño, sin juicio, reconociendo tu esfuerzo. "Estás haciendo un gran trabajo. Estoy orgulloso/a de ti".', 5, 3),

-- ─── DÍA 16 ───
('55555555-0016-0001-0000-000000000000', '44444444-0016-0000-0000-000000000000', '🧠 Perspectiva temporal', 'ejercicio', 'Cuando algo te preocupe mucho, pregúntate: ¿esto será importante dentro de un año? ¿Y dentro de 5? La perspectiva temporal relativiza los problemas.', 10, 1),
('55555555-0016-0002-0000-000000000000', '44444444-0016-0000-0000-000000000000', '☀️ Cocina con amor', 'ejercicio', 'Prepara una receta saludable, por sencilla que sea. Cocinar es un acto de autocuidado. Pon atención a los colores, olores y texturas mientras cocinas.', 20, 2),
('55555555-0016-0003-0000-000000000000', '44444444-0016-0000-0000-000000000000', '❤️ Validación emocional', 'ejercicio', 'Cuando alguien te cuente un problema, antes de dar consejos di: "Entiendo que te sientas así". Validar no es estar de acuerdo, es reconocer el derecho a sentir.', 5, 3),

-- ─── DÍA 17 ───
('55555555-0017-0001-0000-000000000000', '44444444-0017-0000-0000-000000000000', '🧠 Pequeños logros', 'ejercicio', 'Anota un logro de hoy, por pequeño que sea, y siéntete orgulloso/a. ¿Te levantaste a la primera? ¿Llegaste puntual? ¿Ayudaste a alguien? Los pequeños logros construyen la autoestima.', 10, 1),
('55555555-0017-0002-0000-000000000000', '44444444-0017-0000-0000-000000000000', '☀️ Puzzles o juegos', 'ejercicio', '15 minutos de juegos de mesa, puzzle, sudoku o crucigrama. El juego ejercita la mente sin presión y es una forma de meditación activa.', 15, 2),
('55555555-0017-0003-0000-000000000000', '44444444-0017-0000-0000-000000000000', '❤️ Pregunta abierta', 'ejercicio', 'Pregunta a alguien: "¿Qué fue lo más interesante de tu día?" Las preguntas abiertas invitan a compartir de verdad, más allá del "bien" automático.', 5, 3),

-- ─── DÍA 18 ───
('55555555-0018-0001-0000-000000000000', '44444444-0018-0000-0000-000000000000', '🧠 Sin saltar a conclusiones', 'ejercicio', 'Cuando ocurra algo ambiguo (un mensaje sin responder, una mirada, un silencio), no interpretes automáticamente. Pregunta o espera. Las conclusiones precipitadas son fábrica de ansiedad.', 10, 1),
('55555555-0018-0002-0000-000000000000', '44444444-0018-0000-0000-000000000000', '☀️ Visitar un museo o expo', 'ejercicio', 'Dedica tiempo a contemplar arte hoy. Un museo, una galería, o simplemente mira obras online con atención. El arte nos saca de nosotros mismos.', 20, 2),
('55555555-0018-0003-0000-000000000000', '44444444-0018-0000-0000-000000000000', '❤️ Evitar el conflicto', 'ejercicio', 'Si surge una molestia hoy, exprésala usando mensajes "Yo": "Me sentí incómodo cuando...". Sin acusar, sin atacar. Expresar, no reprochar.', 10, 3),

-- ─── DÍA 19 ───
('55555555-0019-0001-0000-000000000000', '44444444-0019-0000-0000-000000000000', '🧠 Encontrar lo positivo', 'ejercicio', 'Busca 3 detalles positivos en tu día que normalmente pasarías por alto. El olor a café, una conversación breve, el sol en la ventana. Entrenar la mirada positiva cambia el cerebro.', 10, 1),
('55555555-0019-0002-0000-000000000000', '44444444-0019-0000-0000-000000000000', '☀️ Aromaterapia', 'ejercicio', 'Usa un aroma que te relaje: una vela, aceite esencial, incienso o simplemente huele una fruta. El olfato conecta directamente con las emociones.', 10, 2),
('55555555-0019-0003-0000-000000000000', '44444444-0019-0000-0000-000000000000', '❤️ Reconocer el esfuerzo', 'ejercicio', 'Agradece a alguien un esfuerzo que normalmente pasa desapercibido: "Gracias por preparar la cena", "Gracias por estar siempre ahí".', 5, 3),

-- ─── DÍA 20 ───
('55555555-0020-0001-0000-000000000000', '44444444-0020-0000-0000-000000000000', '🧠 Causa y estado', 'ejercicio', 'Cuando te sientas mal, pregúntate: ¿es cansancio, hambre, estrés puntual? No confundas un estado pasajero con "así es mi vida". A veces solo necesitas dormir o comer.', 10, 1),
('55555555-0020-0002-0000-000000000000', '44444444-0020-0000-0000-000000000000', '☀️ Limpieza digital', 'ejercicio', '10 minutos borrando archivos, fotos repetidas, apps que no usas. El desorden digital también pesa. Sentirás ligereza al terminar.', 10, 2),
('55555555-0020-0003-0000-000000000000', '44444444-0020-0000-0000-000000000000', '❤️ Abrazo largo', 'ejercicio', 'Dale un abrazo de más de 10 segundos a alguien de confianza. Los abrazos largos liberan oxitocina, la hormona del vínculo. Si no hay nadie disponible, abrázate a ti mismo/a.', 5, 3),

-- ─── DÍA 21 ───
('55555555-0021-0001-0000-000000000000', '44444444-0021-0000-0000-000000000000', '🧠 Suficientemente bien', 'ejercicio', 'Deja algo "suficientemente bien" en lugar de perfecto. Un mensaje, una tarea, la cena. El perfeccionismo paraliza; lo suficientemente bien te hace avanzar.', 10, 1),
('55555555-0021-0002-0000-000000000000', '44444444-0021-0000-0000-000000000000', '☀️ Podcast o audiolibro', 'ejercicio', 'Escucha un episodio de un podcast o audiolibro sobre un tema que te interese mientras caminas u ordenas. Aprender nutre la mente.', 15, 2),
('55555555-0021-0003-0000-000000000000', '44444444-0021-0000-0000-000000000000', '❤️ Decir lo que te gusta', 'ejercicio', 'Dile a alguien algo concreto que aprecies de él o ella. "Me gusta cómo me haces reír", "Admiro tu paciencia". Decir lo bueno en voz alta fortalece los vínculos.', 5, 3),

-- ─── DÍA 22 ───
('55555555-0022-0001-0000-000000000000', '44444444-0022-0000-0000-000000000000', '🧠 Lo que mereces', 'ejercicio', 'Cuando te cueste aceptar un cumplido o algo bueno, di en voz alta: "Me lo merezco". No minimices tus logros ni tu valor. Aceptar lo bueno también se entrena.', 10, 1),
('55555555-0022-0002-0000-000000000000', '44444444-0022-0000-0000-000000000000', '☀️ Manualidades', 'ejercicio', 'Haz algo manual: tejer, reparar algo roto, montar un mueble, dibujar, hacer origami. Las manos ocupadas calman la mente. El resultado es secundario.', 15, 2),
('55555555-0022-0003-0000-000000000000', '44444444-0022-0000-0000-000000000000', '❤️ Sonrisa consciente', 'ejercicio', 'Hoy sonríe al saludar a cada persona. Una sonrisa genuina activa neuronas espejo: tu sonrisa literalmente alegra el cerebro de quien la recibe.', 5, 3),

-- ─── DÍA 23 ───
('55555555-0023-0001-0000-000000000000', '44444444-0023-0000-0000-000000000000', '🧠 Sin esperar recompensa', 'ejercicio', 'Haz algo bueno por ti mismo/a sin esperar reconocimiento ni agradecimiento. El gesto es solo para ti. La validación externa es un extra, no el objetivo.', 10, 1),
('55555555-0023-0002-0000-000000000000', '44444444-0023-0000-0000-000000000000', '☀️ Paseo en soledad', 'ejercicio', '15 minutos caminando solo/a, disfrutando tu propia compañía. Sin música, sin podcast, sin compañía. Escucha tus pasos, tu respiración, tus pensamientos.', 15, 2),
('55555555-0023-0003-0000-000000000000', '44444444-0023-0000-0000-000000000000', '❤️ Interés genuino', 'ejercicio', 'Pregúntale a alguien sobre un hobby o pasión suya que no compartas. Escucha con curiosidad real. Conectar con los intereses ajenos abre mundos nuevos.', 10, 3),

-- ─── DÍA 24 ───
('55555555-0024-0001-0000-000000000000', '44444444-0024-0000-0000-000000000000', '🧠 Más allá de la comparación', 'ejercicio', 'Las redes sociales solo muestran la mejor versión externa de los demás. Hoy recuerda: estás comparando tus entrañas con el escaparate de otros. No es una comparación justa.', 10, 1),
('55555555-0024-0002-0000-000000000000', '44444444-0024-0000-0000-000000000000', '☀️ Escritura libre', 'ejercicio', '5 minutos de escritura sin filtros. Lo que salga. Sin corregir, sin juzgar, sin objetivo. Solo vaciar la mente en el papel. Es sorprendentemente liberador.', 5, 2),
('55555555-0024-0003-0000-000000000000', '44444444-0024-0000-0000-000000000000', '❤️ Respetar el silencio', 'ejercicio', 'Hoy no te fuerces a llenar los silencios en las conversaciones. El silencio compartido también es conexión. Deja espacio para que el otro piense y respire.', 5, 3),

-- ─── DÍA 25 ───
('55555555-0025-0001-0000-000000000000', '44444444-0025-0000-0000-000000000000', '🧠 Cuestiona tus creencias', 'ejercicio', 'Elige una creencia negativa antigua sobre ti ("no se me dan bien los números", "soy aburrido/a"). Busca una prueba que la contradiga. Las creencias se actualizan con evidencia.', 10, 1),
('55555555-0025-0002-0000-000000000000', '44444444-0025-0000-0000-000000000000', '☀️ Mirar el cielo', 'ejercicio', 'Observa las nubes o las estrellas durante 10 minutos. Sin prisa, sin objetivo. Solo mirar el cielo, el espectáculo más antiguo y gratuito de la humanidad.', 10, 2),
('55555555-0025-0003-0000-000000000000', '44444444-0025-0000-0000-000000000000', '❤️ Gratitud social', 'ejercicio', 'Agradece de forma especial a un trabajador de servicios: camarero/a, conductor/a, cajero/a. Un "gracias de verdad, que tengas buen día" puede cambiarles la jornada.', 5, 3),

-- ─── DÍA 26 ───
('55555555-0026-0001-0000-000000000000', '44444444-0026-0000-0000-000000000000', '🧠 Tu reacción importa', 'ejercicio', 'No puedes controlar lo que otros hacen, pero sí cómo reaccionas. Hoy practica la pausa de 3 segundos antes de reaccionar a algo que te moleste. En esa pausa está tu poder.', 10, 1),
('55555555-0026-0002-0000-000000000000', '44444444-0026-0000-0000-000000000000', '☀️ Cuidar una planta', 'ejercicio', 'Riega o cuida una planta con plena atención. Nota la tierra, las hojas, el agua. Si no tienes planta, observa cualquier ser vivo con curiosidad.', 10, 2),
('55555555-0026-0003-0000-000000000000', '44444444-0026-0000-0000-000000000000', '❤️ No juzgar', 'ejercicio', 'Hoy, cuando surja un juicio sobre alguien, repítete: "No conozco su historia completa". Todos están librando una batalla que no ves.', 5, 3),

-- ─── DÍA 27 ───
('55555555-0027-0001-0000-000000000000', '44444444-0027-0000-0000-000000000000', '🧠 Amable > tener razón', 'ejercicio', 'En una conversación tensa, elige ser amable antes que tener razón. Pregúntate: ¿prefiero tener razón o prefiero estar en paz? La amabilidad no es debilidad, es sabiduría.', 10, 1),
('55555555-0027-0002-0000-000000000000', '44444444-0027-0000-0000-000000000000', '☀️ Risa terapéutica', 'ejercicio', 'Mira un vídeo cómico o llama a alguien que siempre te hace reír. La risa libera endorfinas de forma inmediata. Es la medicina más barata y efectiva.', 10, 2),
('55555555-0027-0003-0000-000000000000', '44444444-0027-0000-0000-000000000000', '❤️ Planes de futuro', 'ejercicio', 'Propón un plan agradable a futuro con alguien: un café, un paseo, una peli. Tener algo que esperar es uno de los mayores predictores de bienestar.', 5, 3),

-- ─── DÍA 28 ───
('55555555-0028-0001-0000-000000000000', '44444444-0028-0000-0000-000000000000', '🧠 Aprender y reparar', 'ejercicio', 'En lugar de culparte por un error, pregúntate: "¿Qué puedo aprender de esto y cómo puedo repararlo si es necesario?". La culpa paraliza; el aprendizaje te mueve.', 10, 1),
('55555555-0028-0002-0000-000000000000', '44444444-0028-0000-0000-000000000000', '☀️ Pausa de no hacer', 'ejercicio', '5 minutos sin hacer absolutamente nada. Ni móvil, ni libro, ni música. Solo existir. Sentarte o tumbarte y observar lo que pasa dentro y fuera sin intervenir.', 5, 2),
('55555555-0028-0003-0000-000000000000', '44444444-0028-0000-0000-000000000000', '❤️ Ayuda inesperada', 'ejercicio', 'Ayuda a alguien en algo que no te ha pedido pero que sabes que necesita. Sin esperar nada a cambio. La generosidad anónima es una de las fuentes más puras de satisfacción.', 10, 3),

-- ─── DÍA 29 ───
('55555555-0029-0001-0000-000000000000', '44444444-0029-0000-0000-000000000000', '🧠 Mente sabia', 'ejercicio', 'La mente sabia equilibra tres voces: la lógica (hechos), la emoción (corazón) y la sabiduría (experiencia). Ante una decisión hoy, escucha las tres antes de actuar.', 10, 1),
('55555555-0029-0002-0000-000000000000', '44444444-0029-0000-0000-000000000000', '☀️ Repaso de logros', 'ejercicio', 'Relee tus notas de los 29 días. Mira todo lo que has hecho, pensado, sentido. Date cuenta del camino recorrido. No es poco. Es muchísimo.', 15, 2),
('55555555-0029-0003-0000-000000000000', '44444444-0029-0000-0000-000000000000', '❤️ Gratitud extensa', 'ejercicio', 'Dile a 3 personas cercanas algo concreto que valores de su presencia en tu vida. No un "gracias por todo", sino algo específico que te hayan aportado.', 15, 3),

-- ─── DÍA 30 ───
('55555555-0030-0001-0000-000000000000', '44444444-0030-0000-0000-000000000000', '🧠 Compromiso futuro', 'ejercicio', 'Escribe 3 hábitos de estos 30 días que quieres mantener para siempre. No necesitas hacerlos todos cada día, pero sí tenerlos presentes como herramientas para toda la vida.', 10, 1),
('55555555-0030-0002-0000-000000000000', '44444444-0030-0000-0000-000000000000', '☀️ Celebración del éxito', 'ejercicio', '¡Lo has conseguido! Haz algo especial hoy para celebrarlo. Lo que te apetezca: tu comida favorita, una llamada, un paseo, un regalo para ti. 30 días de compromiso merecen celebración.', 15, 2),
('55555555-0030-0003-0000-000000000000', '44444444-0030-0000-0000-000000000000', '❤️ Celebrar juntos', 'ejercicio', 'Comparte tu alegría por haber terminado el reto. Cuéntaselo a alguien, publícalo si quieres, o simplemente sonríe para tus adentros. Lo has hecho. Y has crecido.', 10, 3)

ON CONFLICT (id) DO NOTHING;
