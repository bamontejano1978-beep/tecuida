-- ============================================================
-- TE CUIDA — 026: Mindful30 Adolescentes (programa completo)
-- ============================================================
-- Crea la application, el programa, 5 módulos y 30 lecciones
-- para Mindful30 Adolescentes (12-17 años).
--
-- app_slug: mindful30-adolescentes
--   → https://mindful30-adolescentes.tecuida.group
--
-- Idempotente: ON CONFLICT (id) DO NOTHING en todas las tablas.
-- ============================================================

-- ============================================================
-- 1. APPLICATION
-- ============================================================
INSERT INTO public.applications (id, category_id, nombre, descripcion, thumbnail_url, tipo, activa, app_slug, brand_color)
VALUES (
  '22222222-0000-0000-0000-000000000027',
  '11111111-0000-0000-0000-000000000001',
  'Mindful30 Adolescentes',
  'Programa de 30 días de mindfulness diseñado para adolescentes de 12 a 17 años. Técnicas de respiración, gestión emocional y ejercicios prácticos para afrontar el estrés del instituto, la presión social y las redes sociales con más calma y confianza.',
  NULL,
  'programa',
  true,
  'mindful30-adolescentes',
  '#7c3aed'
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 2. PROGRAM
-- ============================================================
INSERT INTO public.programs (id, application_id, nombre, descripcion, total_sesiones, duracion_dias)
VALUES (
  '33333333-0000-0000-0000-000000000002',
  '22222222-0000-0000-0000-000000000027',
  'Mindful30 Adolescentes',
  'Bienvenido/a a tu espacio de calma. Durante 30 días vas a descubrir herramientas para manejar el estrés del insti, las emociones intensas y la presión de las redes sociales. Cada día son solo 12-15 minutos: una lectura corta, una práctica guiada y un reto para aplicar lo aprendido en tu día a día. Sin juicios, sin prisas, a tu ritmo.',
  30,
  30
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 3. MODULES (5 módulos × 6 lecciones = 30 lecciones)
-- ============================================================
INSERT INTO public.program_modules (id, program_id, numero, nombre)
VALUES
  (
    '44444444-0011-0000-0000-000000000000',
    '33333333-0000-0000-0000-000000000002',
    1,
    'Tu mente y tú: primeras herramientas'
  ),
  (
    '44444444-0012-0000-0000-000000000000',
    '33333333-0000-0000-0000-000000000002',
    2,
    'El cuerpo habla: estrés y calma física'
  ),
  (
    '44444444-0013-0000-0000-000000000000',
    '33333333-0000-0000-0000-000000000002',
    3,
    'Emociones, pantallas y presión social'
  ),
  (
    '44444444-0014-0000-0000-000000000000',
    '33333333-0000-0000-0000-000000000002',
    4,
    'Autoestima y relaciones que suman'
  ),
  (
    '44444444-0015-0000-0000-000000000000',
    '33333333-0000-0000-0000-000000000002',
    5,
    'Tu estilo de vida consciente'
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. LESSONS
--    Módulo 1 — Tu mente y tú: primeras herramientas (1-6)
-- ============================================================
INSERT INTO public.lessons (id, module_id, titulo, tipo, contenido_texto, duracion_minutos, orden)
VALUES
  (
    '55555555-0011-0001-0000-000000000000',
    '44444444-0011-0000-0000-000000000000',
    'Día 1 — ¿Qué es eso del mindfulness?',
    'combinado',
    'Seguro que has oído la palabra "mindfulness" en TikTok o en clase de tutoría. No es magia ni es poner la mente en blanco (spoiler: eso es imposible). Es entrenar tu atención para estar en el presente sin juzgarte. Hoy vas a probar tu primera práctica: 3 minutos de respiración consciente. Solo observar sin intentar cambiar nada. Descubrirás cuántas veces tu mente se va al futuro (exámenes, quedadas) o al pasado (algún corte que soltaste). Bienvenido/a al gimnasio de la mente.',
    12,
    1
  ),
  (
    '55555555-0011-0002-0000-000000000000',
    '44444444-0011-0000-0000-000000000000',
    'Día 2 — ¿Piloto automático? Yo no… espera, sí',
    'combinado',
    '¿Alguna vez has llegado a clase y no recuerdas el camino? ¿Has estado 40 minutos en TikTok sin darte cuenta? Eso es el piloto automático. Tu cuerpo hace cosas mientras tu mente está en otro sitio. Hoy te proponemos un experimento: elige una actividad rutinaria (lavarte los dientes, caminar al insti, merendar) y hazla prestando atención real a cada detalle. Nota la textura, el sabor, el sonido, sin el móvil cerca. Al final del día apunta: ¿qué notaste que normalmente ignoras?',
    12,
    2
  ),
  (
    '55555555-0011-0003-0000-000000000000',
    '44444444-0011-0000-0000-000000000000',
    'Día 3 — El juicio automático (sí, también lo haces)',
    'combinado',
    '"Qué mal me ha salido el examen", "Soy un desastre", "Esta gente es más guay que yo". Nuestra mente emite juicios constantes. No es malo: es un atajo que usa el cerebro. El problema es cuando nos los creemos todos. Hoy practicarás la técnica del "etiquetado": cuando aparezca un pensamiento de juicio, solo di mentalmente "juicio" y déjalo pasar, como un mensaje de WhatsApp que no necesitas responder. Sin enfadarte contigo mismo/a. Solo observar.',
    12,
    3
  ),
  (
    '55555555-0011-0004-0000-000000000000',
    '44444444-0011-0000-0000-000000000000',
    'Día 4 — Las nubes en el cielo de tu cabeza',
    'combinado',
    'Imagina que tu mente es un cielo enorme. Tus pensamientos y emociones son nubes: algunas blancas y ligeras, otras grises y cargadas. Pero ninguna es el cielo entero. Tú eres el cielo, no las nubes. Hoy practicarás la meditación de las nubes: cierra los ojos, imagina ese cielo azul enorme, y cada vez que aparezca un pensamiento, colócalo en una nube y míralo flotar hasta que desaparezca. No luches contra los pensamientos: solo déjalos pasar.',
    12,
    4
  ),
  (
    '55555555-0011-0005-0000-000000000000',
    '44444444-0011-0000-0000-000000000000',
    'Día 5 — Respira que no pasa nada',
    'combinado',
    'La respiración es un súper poder infravalorado. Es lo único que funciona tanto de forma automática como voluntaria, y es tu ancla al presente. Hoy aprendes la respiración 4-4-4-4 (también llamada "respiración cuadrada"): inspira en 4 segundos, mantén el aire 4 segundos, expulsa en 4 segundos, espera 4 segundos antes de la siguiente. Repite 5 ciclos cuando estés tranquilo/a, y otros 5 cuando notes nervios. ¿Notas la diferencia entre un momento y otro?',
    12,
    5
  ),
  (
    '55555555-0011-0006-0000-000000000000',
    '44444444-0011-0000-0000-000000000000',
    'Día 6 — Tu kit de herramientas del Módulo 1',
    'combinado',
    '¡Primera semana completada! Repasa lo que has aprendido: atención al presente, detectar el piloto automático, observar sin juzgar, la metáfora del cielo y las nubes, y la respiración cuadrada. Hoy no hay práctica nueva: elige la que más te haya gustado de esta semana y repítela. Escribe en tu cuaderno o notas del móvil: ¿qué práctica te ha sido más útil? ¿En qué momento del día te has sorprendido aplicándola sin darte cuenta?',
    12,
    6
  ),

  -- ──────────────────────────────────────────────────────────
  -- Módulo 2 — El cuerpo habla: estrés y calma física (7-12)
  -- ──────────────────────────────────────────────────────────
  (
    '55555555-0012-0001-0000-000000000000',
    '44444444-0012-0000-0000-000000000000',
    'Día 7 — ¿Dónde sientes el estrés en tu cuerpo?',
    'combinado',
    'Cuando tienes un examen importante o una conversación tensa, ¿te duele la tripa? ¿Se te tensan los hombros? ¿Te sudan las manos? El cuerpo es el primer avisador del estrés, pero normalmente lo ignoramos hasta que duele. Hoy vas a hacer un "escáner corporal exprés": túmbate o siéntate cómodo, cierra los ojos y recorre mentalmente tu cuerpo de los pies a la cabeza. No intentes relajar nada, solo observa dónde hay tensión y ponle nombre: "tensión en la mandíbula", "hombros subidos".',
    12,
    1
  ),
  (
    '55555555-0012-0002-0000-000000000000',
    '44444444-0012-0000-0000-000000000000',
    'Día 8 — Respiración abdominal: tu botón de pausa',
    'combinado',
    '¿Sabías que la mayoría respiramos "mal"? Respiramos de forma superficial, con el pecho, como si estuviéramos siempre en modo alerta. La respiración abdominal (hinchar la tripa al inspirar, deshinchar al soltar) activa el sistema nervioso que te calma. Pon una mano en el pecho y otra en la tripa. Respira lento: que se mueva solo la mano de la tripa. Practícalo 5 minutos antes de dormir. Para muchos adolescentes este ejercicio es un antes y un después para conciliar el sueño.',
    12,
    2
  ),
  (
    '55555555-0012-0003-0000-000000000000',
    '44444444-0012-0000-0000-000000000000',
    'Día 9 — Relajación muscular: suelta lo que no necesitas',
    'combinado',
    'Tensar para relajar. Suena raro, pero funciona. Hoy practicas la relajación muscular progresiva versión teen: vas a tensar cada grupo muscular durante 5 segundos y luego soltar de golpe notando la diferencia. Puños, brazos, hombros (súbelos hasta las orejas), cara (pon cara de haber mordido un limón), tripa, piernas, pies. El contraste entre tensión y relajación le enseña a tu cerebro a reconocer cuándo estás tenso/a sin necesitarlo. Ideal después de un día intenso de exámenes.',
    12,
    3
  ),
  (
    '55555555-0012-0004-0000-000000000000',
    '44444444-0012-0000-0000-000000000000',
    'Día 10 — El deporte es mindfulness sin que te des cuenta',
    'combinado',
    'Cuando estás jugando al fútbol, bailando, corriendo o patinando y de repente se te olvida todo lo demás... eso ya es mindfulness. El cuerpo en movimiento enfoca la mente de forma natural. Hoy te toca moverte 20 minutos haciendo lo que te guste, pero con una regla: sin música, sin podcast, sin móvil. Solo tú, el movimiento y las sensaciones de tu cuerpo. Nota el ritmo, el sudor, la respiración, el contacto con el suelo. Al terminar, escribe qué has sentido.',
    15,
    4
  ),
  (
    '55555555-0012-0005-0000-000000000000',
    '44444444-0012-0000-0000-000000000000',
    'Día 11 — El móvil en modo avión (tú también)',
    'combinado',
    'Las notificaciones activan tu sistema de alerta constantemente. Cada "ding" es una micro-descarga de cortisol (la hormona del estrés). Hoy te proponemos "la hora sin pantallas": 60 minutos seguidos (pueden ser antes de cenar o antes de dormir) con el móvil en modo avión y en otra habitación. Durante esa hora haz algo que no implique pantallas: dibujar, leer, cocinar, hablar con alguien en persona, ordenar tu cuarto escuchando tu respiración. Al terminar, evalúa del 1 al 10 cómo te sientes.',
    12,
    5
  ),
  (
    '55555555-0012-0006-0000-000000000000',
    '44444444-0012-0000-0000-000000000000',
    'Día 12 — Tu mapa corporal de la calma',
    'combinado',
    'Cada persona tiene una "receta corporal" distinta para calmarse. A algunos les funciona tumbarse, a otros mover las manos, a otros estirar la espalda. Hoy haces tu mapa personal: repasa los ejercicios de esta semana (escáner corporal, respiración abdominal, relajación muscular, movimiento consciente, hora sin pantallas) y puntúa cada uno del 1 al 10 según cómo te sentó. Los que saquen más de 7 son tus herramientas de emergencia para momentos de estrés.',
    12,
    6
  ),

  -- ──────────────────────────────────────────────────────────
  -- Módulo 3 — Emociones, pantallas y presión social (13-18)
  -- ──────────────────────────────────────────────────────────
  (
    '55555555-0013-0001-0000-000000000000',
    '44444444-0013-0000-0000-000000000000',
    'Día 13 — El detector de emociones',
    'combinado',
    'A veces sientes algo intenso y no sabes ni cómo se llama: ¿es enfado, tristeza, frustración, vergüenza? Ponerle nombre a lo que sientes es el primer paso para manejarlo. Los psicólogos lo llaman "granularidad emocional" y está comprobado que quienes mejor identifican sus emociones sufren menos ansiedad. Hoy durante el día pon 3 alarmas en el móvil. Cada vez que suene, para 30 segundos y apunta en una palabra lo que sientes en ese momento exacto. Sin filtros ni juicios.',
    12,
    1
  ),
  (
    '55555555-0013-0002-0000-000000000000',
    '44444444-0013-0000-0000-000000000000',
    'Día 14 — Instagram no es la vida real (y tú lo sabes)',
    'combinado',
    'Ves stories de gente en playas paradisíacas, con cuerpos perfectos, vidas emocionantes... y tú estás en tu cuarto un martes cualquiera. Las redes sociales son un escaparate de highlights, no la vida real. Pero tu cerebro emocional no siempre lo distingue. La comparación social es uno de los mayores generadores de malestar adolescente. Hoy tras cada sesión de redes, pregúntate: ¿me siento mejor o peor que antes de abrir la app? Si la respuesta es "peor" dos veces seguidas, cierra la app y haz 2 minutos de respiración cuadrada.',
    12,
    2
  ),
  (
    '55555555-0013-0003-0000-000000000000',
    '44444444-0013-0000-0000-000000000000',
    'Día 15 — Ansiedad de examen: el monstruo bajo la cama',
    'combinado',
    'Mariposas en el estómago, mente en blanco, no poder dormir la noche anterior... La ansiedad de examen es real y le pasa a casi todo el mundo. Pero tiene solución. Hoy aprendes la técnica 5-4-3-2-1 para antes de un examen: nombra 5 cosas que ves, 4 que puedes tocar, 3 que oyes, 2 que hueles y 1 que saboreas. Esto ancla tu atención al presente y corta el bucle de pensamientos catastróficos. Practícala hoy aunque no tengas examen, para tenerla lista cuando la necesites.',
    12,
    3
  ),
  (
    '55555555-0013-0004-0000-000000000000',
    '44444444-0013-0000-0000-000000000000',
    'Día 16 — Cuando todo el mundo opina: presión de grupo',
    'combinado',
    '"¿No bebes?", "¿No te apuntas?", "Qué aburrido/a eres". Decir que no cuando todos dicen que sí es de las cosas más difíciles de la adolescencia. Pero cada vez que cedes a algo que no querías hacer, te traicionas un poquito. La presión de grupo se maneja mejor con una pausa de 3 segundos antes de responder. Respira hondo y pregúntate: ¿quiero hacer esto yo, o solo quiero encajar? No pasa nada si la respuesta es "quiero encajar". Pero al menos que sea una decisión consciente, no un piloto automático.',
    12,
    4
  ),
  (
    '55555555-0013-0005-0000-000000000000',
    '44444444-0013-0000-0000-000000000000',
    'Día 17 — FOMO: el miedo a perderse algo',
    'combinado',
    'FOMO = Fear Of Missing Out. Ese malestar que sientes cuando ves que tus amigos han quedado sin ti, o que hay una fiesta a la que no fuiste. Es una emoción normal, pero las redes sociales la multiplican por mil. Hoy practicas JOMO (Joy Of Missing Out): el placer de perderte cosas. Esta noche, en lugar de mirar qué hacen los demás, haz algo que te guste de verdad. Sin contarlo en redes. Sin foto. Sin like. Solo para ti. Al terminar, compara la sensación con la de una noche típica de scroll.',
    12,
    5
  ),
  (
    '55555555-0013-0006-0000-000000000000',
    '44444444-0013-0000-0000-000000000000',
    'Día 18 — Tres buenas cosas (el algoritmo de la gratitud)',
    'combinado',
    'Tu cerebro tiene un sesgo negativo: recuerda mucho más lo malo que lo bueno. Es un mecanismo de supervivencia, pero en el siglo XXI te sabotea. La gratitud es como un algoritmo que reentrena tu cerebro para detectar lo positivo. Esta noche, antes de dormir, escribe 3 cosas buenas que hayan pasado hoy, por pequeñas que sean: "mi madre me ha preparado el desayuno", "he sacado un 7 en mates", "me he reído con un meme". No vale repetir las mismas cada día. Hazlo toda esta semana.',
    12,
    6
  ),

  -- ──────────────────────────────────────────────────────────
  -- Módulo 4 — Autoestima y relaciones que suman (19-24)
  -- ──────────────────────────────────────────────────────────
  (
    '55555555-0014-0001-0000-000000000000',
    '44444444-0014-0000-0000-000000000000',
    'Día 19 — Tu voz interior: ¿aliada o enemiga?',
    'combinado',
    '"No puedo", "soy un desastre", "no le gusto a nadie", "no valgo para esto". Esa voz interior que te critica sin piedad se llama "crítico interno" y a veces es más dura que cualquier persona real. Hoy te pido que cada vez que te pilles hablándote mal, te preguntes: ¿le diría esto mismo a mi mejor amigo/a? Si la respuesta es no, reformula la frase como se la dirías a esa persona que te importa. Ejemplo: "Soy idiota por suspender" → "Esta vez no salió bien, pero puedo prepararme mejor".',
    12,
    1
  ),
  (
    '55555555-0014-0002-0000-000000000000',
    '44444444-0014-0000-0000-000000000000',
    'Día 20 — Autocompasión: tratarte como tratas a tu gente',
    'combinado',
    'Cuando un amigo te cuenta que lo está pasando mal, ¿le dices "eres un flojo, espabila"? No, ¿verdad? Le escuchas, le apoyas, le dices algo amable. ¿Por qué contigo mismo/a no? La autocompasión no es autocompasión de "pobrecito yo". Es tratarte con la misma amabilidad con la que tratas a quien quieres. Hoy, cuando te equivoques en algo, párate y di en voz alta (o mental): "Es normal equivocarse. Otra persona en mi lugar sentiría lo mismo. Voy a ser amable conmigo ahora".',
    12,
    2
  ),
  (
    '55555555-0014-0003-0000-000000000000',
    '44444444-0014-0000-0000-000000000000',
    'Día 21 — Personas vitamina y personas tóxicas',
    'combinado',
    'Hay gente que después de estar con ella te sientes ligero/a, motivado/a, contento/a. Y hay gente que te deja agotado/a, pequeño/a, inseguro/a. La psicología los llama "personas vitamina" y "personas tóxico". No se trata de culpar a nadie, sino de elegir conscientemente con quién pasas más tiempo. Hoy haz dos listas en tu cuaderno: en la izquierda, nombres de personas vitamina. En la derecha, personas tóxico. Comprométete esta semana a pasar más tiempo con alguien de la izquierda.',
    12,
    3
  ),
  (
    '55555555-0014-0004-0000-000000000000',
    '44444444-0014-0000-0000-000000000000',
    'Día 22 — Escuchar de verdad (sin pensar en qué vas a responder)',
    'combinado',
    '¿Cuántas veces mientras alguien te habla ya estás pensando en lo que vas a decir? Eso no es escuchar, es esperar tu turno. Escuchar de verdad es un superpoder social. Hoy practica la "escucha plena" en una conversación: mira a los ojos, no mires el móvil, no interrumpas, y cuando la otra persona termine, hazle una pregunta sobre lo que ha dicho antes de contar tu parte. Notarás que la conversación se vuelve diferente, más real. La otra persona también lo notará.',
    12,
    4
  ),
  (
    '55555555-0014-0005-0000-000000000000',
    '44444444-0014-0000-0000-000000000000',
    'Día 23 — Decir lo que necesitas sin atacar',
    'combinado',
    '"Es que nunca me escuchas", "siempre haces lo mismo", "eres un egoísta". Frases que empiezan con "tú siempre" o "tú nunca" activan la defensa automática del otro y la conversación se convierte en guerra. Hoy aprendes a usar los "mensajes yo": "Me siento ignorado/a cuando...", "Me gustaría que...", "Necesito...". Practícalo en una situación real: expresa lo que necesitas sin señalar al otro. No garantiza que te den lo que pides, pero multiplica las probabilidades y reduce el conflicto.',
    12,
    5
  ),
  (
    '55555555-0014-0006-0000-000000000000',
    '44444444-0014-0000-0000-000000000000',
    'Día 24 — Amistad consciente: calidad sobre cantidad',
    'combinado',
    'En la adolescencia parece que necesitas mil amigos, cientos de seguidores y quedar con todo el mundo. Pero los estudios dicen que el bienestar real depende de 2-3 relaciones profundas, no de 200 contactos. Hoy dedica tiempo de calidad a una persona importante para ti. Sin móvil de por medio. Puede ser una conversación larga, un paseo, hacer algo juntos. Concéntrate en esa persona como si fuera la única del mundo durante ese rato. Luego escribe cómo te has sentido.',
    12,
    6
  ),

  -- ──────────────────────────────────────────────────────────
  -- Módulo 5 — Tu estilo de vida consciente (25-30)
  -- ──────────────────────────────────────────────────────────
  (
    '55555555-0015-0001-0000-000000000000',
    '44444444-0015-0000-0000-000000000000',
    'Día 25 — Micro-pausas: mindfulness en 60 segundos',
    'combinado',
    'No siempre tienes 15 minutos para meditar. Pero siempre tienes 60 segundos. Hoy aprendes tres micro-pausas que puedes meter en cualquier momento del día: 1) La pausa del móvil: antes de desbloquear la pantalla, respira hondo una vez y pregúntate "¿para qué voy a mirar el móvil ahora?". 2) La pausa del pasillo: entre clase y clase, camina 30 segundos prestando atención solo a tus pasos. 3) La pausa del enfado: cuando notes que vas a soltar algo de lo que te arrepientas, respira 3 veces antes de hablar.',
    12,
    1
  ),
  (
    '55555555-0015-0002-0000-000000000000',
    '44444444-0015-0000-0000-000000000000',
    'Día 26 — Dormir es parte del programa (en serio)',
    'combinado',
    'Dormir poco es casi una competición en la adolescencia: "yo me acosté a las 3", "pues yo a las 4". Pero la falta de sueño multiplica la ansiedad, te hace más impulsivo/a, empeora tu memoria y tu piel, y encima te pone de mal humor. Hoy implementas una "rutina de desconexión" 45 minutos antes de dormir: móvil fuera de la habitación, luz tenue, haz algo tranquilo (leer, escribir, estiramientos suaves). Si te cuesta dormir, usa la respiración abdominal que aprendiste en el día 8. Apunta mañana cómo te has despertado comparado con otros días.',
    12,
    2
  ),
  (
    '55555555-0015-0003-0000-000000000000',
    '44444444-0015-0000-0000-000000000000',
    'Día 27 — Comer sin pantalla (el reto más difícil)',
    'combinado',
    'Comer viendo TikTok, YouTube o Netflix es el pan de cada día. Pero tu cerebro no registra bien lo que comes si está distraído, y acabas comiendo más y disfrutando menos. Hoy te retamos a hacer UNA comida sin pantallas. Da igual si es el desayuno, la merienda o la cena. Siéntate, mira la comida, huélela, mastica despacio, nota los sabores. Si estás con tu familia, habla con ellos. Si estás solo/a, simplemente observa la experiencia de comer. Es más difícil de lo que parece, pero mola.',
    12,
    3
  ),
  (
    '55555555-0015-0004-0000-000000000000',
    '44444444-0015-0000-0000-000000000000',
    'Día 28 — Tu relación con el móvil: ¿quién controla a quién?',
    'combinado',
    'Hoy toca un poco de autoconocimiento digital. Mira el tiempo de pantalla de tu móvil (ajustes → bienestar digital). ¿Cuántas horas al día? ¿Cuántos desbloqueos? ¿Qué app encabeza la lista? Sin juzgarte, solo observa. Ahora pregúntate: ¿hay algo que te gustaría reducir? Elige UNA app y proponte reducir su uso a la mitad mañana. Puedes usar el temporizador de la propia app o ponerte un límite manual. Compensa el tiempo libre con algo del módulo 2 (deporte, respiración, lectura).',
    12,
    4
  ),
  (
    '55555555-0015-0005-0000-000000000000',
    '44444444-0015-0000-0000-000000000000',
    'Día 29 — Tu plan de bienestar personalizado',
    'combinado',
    'Durante 29 días has probado muchas herramientas. Algunas te habrán gustado más, otras menos. Hoy diseñas tu "plan de bienestar" personal: elige 5 prácticas de todo el programa que te hayan funcionado. Escríbelas en un papel o en notas del móvil con este formato: "Cuando me sienta [emoción], voy a [práctica] durante [minutos]". Por ejemplo: "Cuando me sienta agobiado/a por exámenes, voy a hacer respiración cuadrada durante 2 minutos". Ya tienes un botiquín emocional portátil para siempre.',
    12,
    5
  ),
  (
    '55555555-0015-0006-0000-000000000000',
    '44444444-0015-0000-0000-000000000000',
    'Día 30 — Esto no se acaba aquí',
    'combinado',
    '¡Lo has hecho! 30 días de práctica constante. Para un adolescente con la vida que llevas (insti, exámenes, redes, amigos, familia, hormonas, cambios), dedicar 15 minutos al día a tu bienestar mental tiene un mérito enorme. Hoy no hay práctica nueva. Lee tu plan de bienestar del día 29. Comprométete a hacer al menos una de esas prácticas 3 veces por semana durante el próximo mes. La calma no es un destino, es un camino. Y tú ya sabes andarlo. Bienvenido/a a tu nueva etapa.',
    12,
    6
  )

ON CONFLICT (id) DO NOTHING;
