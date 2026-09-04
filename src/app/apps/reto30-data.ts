export type ChallengeArea = 'thoughts' | 'activities' | 'relationships';

export interface Activity {
    area: ChallengeArea;
    title: string;
    description: string;
    actionItem: string;
    resourceId?: string;
}

export interface DailyChallenge {
    day: number;
    tasks: {
        thoughts: Activity;
        activities: Activity;
        relationships: Activity;
    }
}

export const challenges: DailyChallenge[] = [
    {
        day: 1,
        tasks: {
            thoughts: { area: 'thoughts', title: 'Cazando Pensamientos', description: 'El primer paso para cambiar es darnos cuenta de lo que pasa por nuestra mente.', actionItem: 'Anota 3 pensamientos negativos automáticos que tengas hoy.', resourceId: 'thoughts-1' },
            activities: { area: 'activities', title: 'Pequeños Placeres', description: 'Reconectar con actividades que disfrutamos mejora el estado de ánimo.', actionItem: 'Dedica 15 minutos a una actividad que disfrutes (leer, escuchar música, caminar).', resourceId: 'activities-1' },
            relationships: { area: 'relationships', title: 'Conexión Consciente', description: 'Nuestras relaciones son fundamentales para el bienestar.', actionItem: 'Envía un mensaje de gratitud a alguien importante para ti.', resourceId: 'relationships-1' }
        }
    },
    {
        day: 2,
        tasks: {
            thoughts: { area: 'thoughts', title: 'Realidad vs. Pensamiento', description: 'Aprende a distinguir entre lo que ocurre y lo que tu mente interpreta.', actionItem: 'Elige un pensamiento de ayer y busca 2 pruebas objetivas de que sea cierto y 2 de que no.', resourceId: 'thoughts-2' },
            activities: { area: 'activities', title: 'Movimiento Suave', description: 'El ejercicio ligero libera endorfinas y reduce el cortisol.', actionItem: 'Realiza 10 minutos de estiramientos o yoga suave al despertar o antes de dormir.', resourceId: 'activities-2' },
            relationships: { area: 'relationships', title: 'Escucha Activa', description: 'Escuchar profundamente fortalece los vínculos.', actionItem: 'En tu próxima conversación, escucha sin interrumpir y resume lo que la otra persona dijo antes de responder.', resourceId: 'relationships-2' }
        }
    },
    {
        day: 3,
        tasks: {
            thoughts: { area: 'thoughts', title: 'El Filtro Mental', description: 'A veces solo vemos lo negativo, ignorando lo positivo que sucede.', actionItem: 'Anota 3 cosas buenas que hayan pasado hoy, por pequeñas que parezcan.', resourceId: 'thoughts-3' },
            activities: { area: 'activities', title: 'Desconexión Digital', description: 'La sobreestimulación digital agota nuestros recursos mentales.', actionItem: 'Pasa una hora completa sin consultar el teléfono o redes sociales.', resourceId: 'activities-3' },
            relationships: { area: 'relationships', title: 'Decir que No', description: 'Poner límites es una forma de autocuidado.', actionItem: 'Identifica una petición a la que querrías decir "no" y ensaya el guion de asertividad.', resourceId: 'relationships-3' }
        }
    },
    {
        day: 4,
        tasks: {
            thoughts: { area: 'thoughts', title: 'Catastrofismo', description: 'Nuestra mente a veces se adelanta al peor escenario posible.', actionItem: 'Si te preocupa algo, pregúntate: "¿Qué es lo peor que podría pasar? ¿Qué tan probable es?"', resourceId: 'thoughts-4' },
            activities: { area: 'activities', title: 'Nutrición Consciente', description: 'Lo que comemos influye en cómo nos sentimos.', actionItem: 'Realiza una comida hoy sin distracciones (TV, móvil), enfocándote solo en los sabores.', resourceId: 'activities-4' },
            relationships: { area: 'relationships', title: 'Pedir Ayuda', description: 'Reconocer que necesitamos a otros nos hace humanos y nos une.', actionItem: 'Pide ayuda hoy para algo pequeño, incluso si podrías hacerlo solo.', resourceId: 'relationships-4' }
        }
    },
    {
        day: 5,
        tasks: {
            thoughts: { area: 'thoughts', title: 'Etiquetas Negativas', description: 'Las etiquetas que nos ponemos suelen ser injustas y limitantes.', actionItem: 'Cambia un "Soy un desastre" por "He cometido un error en esta tarea específica".', resourceId: 'thoughts-5' },
            activities: { area: 'activities', title: 'Entorno Ordenado', description: 'El orden exterior ayuda a promover el orden interior.', actionItem: 'Ordena durante 10 minutos un cajón o rincón que tengas descuidado.', resourceId: 'activities-5' },
            relationships: { area: 'relationships', title: 'Cumplido Sincero', description: 'Reconocer lo bueno en los demás genera una espiral positiva.', actionItem: 'Hazle un cumplido sincero a un compañero de trabajo o amigo.', resourceId: 'relationships-5' }
        }
    },
    {
        day: 6,
        tasks: {
            thoughts: { area: 'thoughts', title: 'Razonamiento Emocional', description: '"Si me siento mal, es porque algo va mal". Sentir no es razonar.', actionItem: 'Identifica un momento hoy donde tus emociones guiaron tu juicio y trata de ver los hechos.', resourceId: 'thoughts-6' },
            activities: { area: 'activities', title: 'Creatividad Libre', description: 'Expresarnos creativamente es una vía de escape para el estrés.', actionItem: 'Dibuja, escribe o cocina algo nuevo hoy, sin buscar la perfección.', resourceId: 'activities-6' },
            relationships: { area: 'relationships', title: 'Tiempo de Calidad', description: 'Lo importante no es el tiempo, sino la presencia.', actionItem: 'Llama a un familiar o amigo cercano y dedica 15 minutos de presencia plena.', resourceId: 'relationships-6' }
        }
    },
    {
        day: 7,
        tasks: {
            thoughts: { area: 'thoughts', title: 'Revisión Semanal', description: 'Observa tus patrones de pensamiento de esta semana.', actionItem: '¿Qué distorsión ha sido la más frecuente en tus registros de pensamientos?', resourceId: 'thoughts-7' },
            activities: { area: 'activities', title: 'Baño Relajante', description: 'El agua templada ayuda a relajar la tensión muscular acumulada.', actionItem: 'Toma una ducha o baño consciente, prestando atención a la sensación del agua.', resourceId: 'activities-7' },
            relationships: { area: 'relationships', title: 'Círculo de Confianza', description: 'Refuerza tu red de apoyo.', actionItem: 'Anota quiénes son las 3 personas en las que más confías y por qué.', resourceId: 'relationships-7' }
        }
    },
    {
        day: 8,
        tasks: {
            thoughts: { area: 'thoughts', title: 'Personalización', description: 'No todo lo que ocurre a tu alrededor es por tu culpa o sobre ti.', actionItem: 'Si alguien está de mal humor, busca 3 razones externas que no tengan que ver contigo.', resourceId: 'thoughts-8' },
            activities: { area: 'activities', title: 'Nueva Ruta', description: 'La novedad estimula la neuroplasticidad del cerebro.', actionItem: 'Camina o conduce por un camino diferente al habitual para ir a un lugar común.', resourceId: 'activities-8' },
            relationships: { area: 'relationships', title: 'Límites Digitales', description: 'Nuestra disponibilidad constante puede ser agotadora.', actionItem: 'Informa que no responderás mensajes de trabajo o compromiso después de cierta hora.', resourceId: 'relationships-8' }
        }
    },
    {
        day: 9,
        tasks: {
            thoughts: { area: 'thoughts', title: 'Los "Debería"', description: 'Las exigencias rígidas ("debería hacer...", "debería ser...") generan culpa.', actionItem: 'Cambia un "Debo" por un "Me gustaría" o "Elijo hacerlo".', resourceId: 'thoughts-9' },
            activities: { area: 'activities', title: 'Música para el Ánimo', description: 'La música tiene el poder de cambiar nuestra química cerebral.', actionItem: 'Crea una lista de reproducción con 5 canciones que siempre te suban el ánimo.', resourceId: 'activities-9' },
            relationships: { area: 'relationships', title: 'Disculpa Sincera', description: 'Pedir perdón libera carga emocional y repara vínculos.', actionItem: 'Si tienes algo pendiente, pide disculpas sinceramente por un pequeño error pasado.', resourceId: 'relationships-9' }
        }
    },
    {
        day: 10,
        tasks: {
            thoughts: { area: 'thoughts', title: 'Visión de Túnel', description: 'Cuando estamos mal, solo vemos el problema, ignorando soluciones.', actionItem: 'Para un problema actual, escribe 3 posibles soluciones, aunque parezcan difíciles.', resourceId: 'thoughts-10' },
            activities: { area: 'activities', title: 'Lectura Inspiradora', description: 'Sumergirnos en otras historias nos da perspectiva.', actionItem: 'Lee 10 páginas de ese libro que tienes pendiente en tu mesilla.', resourceId: 'activities-10' },
            relationships: { area: 'relationships', title: 'Contacto Visual', description: 'El contacto visual fomenta la empatía y la conexión.', actionItem: 'Practica mantener el contacto visual un poco más de lo habitual hoy.', resourceId: 'relationships-10' }
        }
    },
    {
        day: 11,
        tasks: {
            thoughts: { area: 'thoughts', title: 'Lectura de Pensamiento', description: 'Creemos saber qué piensan los demás de nosotros, y solemos ser negativos.', actionItem: 'Escribe un pensamiento sobre lo que crees que alguien piensa de ti y busca una explicación alternativa.', resourceId: 'thoughts-11' },
            activities: { area: 'activities', title: 'Autocuidado Físico', description: 'Cuidar el cuerpo es una señal de respeto hacia uno mismo.', actionItem: 'Dedica tiempo extra a tu rutina de cuidado personal (crema, afeitado, etc.).', resourceId: 'activities-11' },
            relationships: { area: 'relationships', title: 'Expresar Necesidades', description: 'Los demás no pueden adivinar lo que necesitamos.', actionItem: 'Usa el guion: "Me siento [emoción] y necesitaría [petición]" con alguien cercano.', resourceId: 'relationships-11' }
        }
    },
    {
        day: 12,
        tasks: {
            thoughts: { area: 'thoughts', title: 'Polarización', description: 'Vemos el mundo en blanco o negro, olvidando los matices grises.', actionItem: 'Para una situación que evalúes como "desastre", busca 2 elementos que no sean tan malos.', resourceId: 'thoughts-12' },
            activities: { area: 'activities', title: 'Infusión y Pausa', description: 'El calor de una bebida reconforta el sistema nervioso.', actionItem: 'Prepara tu té o café favorito y bébelo despacio, sin hacer nada más.', resourceId: 'activities-12' },
            relationships: { area: 'relationships', title: 'Reencuentro', description: 'Retomar el contacto con personas valiosas aumenta el bienestar.', actionItem: 'Contacta con ese amigo con el que hace tiempo que no hablas.', resourceId: 'relationships-12' }
        }
    },
    {
        day: 13,
        tasks: {
            thoughts: { area: 'thoughts', title: 'Generalización Excesiva', description: 'Un fallo puntual no significa que "siempre" falles.', actionItem: 'Identifica el uso de palabras como "siempre", "nunca", "todos" en tus pensamientos hoy.', resourceId: 'thoughts-13' },
            activities: { area: 'activities', title: 'Canto o Baile', description: 'Expresar alegría corporalmente engaña al cerebro para sentirse mejor.', actionItem: 'Canta una canción o baila un tema completo en la privacidad de tu casa.', resourceId: 'activities-13' },
            relationships: { area: 'relationships', title: 'Evitar el Cotilleo', description: 'Hablar mal de otros genera un ambiente de desconfianza.', actionItem: 'Hoy, si surge un comentario negativo sobre alguien, intenta cambiar de tema o decir algo neutro.', resourceId: 'relationships-13' }
        }
    },
    {
        day: 14,
        tasks: {
            thoughts: { area: 'thoughts', title: 'Falacia de Control', description: 'No podemos controlarlo todo, y no somos responsables de todo.', actionItem: 'Dibuja dos círculos: uno con lo que puedes controlar hoy y otro con lo que no.', resourceId: 'thoughts-14' },
            activities: { area: 'activities', title: 'Naturaleza Cercana', description: 'El verde de las plantas y el aire libre reducen la ansiedad.', actionItem: 'Ve a un parque o jardín y siéntate 10 minutos simplemente a observar.', resourceId: 'activities-14' },
            relationships: { area: 'relationships', title: 'Pequeño Detalle', description: 'La generosidad sin motivo fortalece las relaciones.', actionItem: 'Ten un detalle con alguien (un post-it con un mensaje, un dulce, un café).', resourceId: 'relationships-14' }
        }
    },
    {
        day: 15,
        tasks: {
            thoughts: { area: 'thoughts', title: 'Ecuador del Reto', description: 'Momento de reflexionar sobre los cambios logrados.', actionItem: 'Escribe una carta breve a tu "yo" del día 1 animándole a seguir.', resourceId: 'thoughts-15' },
            activities: { area: 'activities', title: 'Siesta Reparadora', description: 'Un descanso breve reinicia la capacidad cognitiva.', actionItem: 'Si puedes, toma una siesta de máximo 20 minutos durante el día.', resourceId: 'activities-15' },
            relationships: { area: 'relationships', title: 'Diálogo Interior', description: 'Cómo te hablas a ti mismo influye en cómo te relacionas.', actionItem: 'Hoy, trátate con la misma amabilidad con la que tratarías a tu mejor amigo.', resourceId: 'relationships-15' }
        }
    },
    {
        day: 16,
        tasks: {
            thoughts: { area: 'thoughts', title: 'Magnificación', description: 'A veces hacemos de un grano de arena una montaña.', actionItem: 'Pregúntate: "¿Esto que me preocupa será importante dentro de un año?"', resourceId: 'thoughts-16' },
            activities: { area: 'activities', title: 'Cocina con Amor', description: 'Alimentarnos bien es un acto de amor propio.', actionItem: 'Prepara una receta saludable que te guste especialmente.', resourceId: 'activities-16' },
            relationships: { area: 'relationships', title: 'Validación Emocional', description: 'Validar las emociones de otros los hace sentir escuchados.', actionItem: 'Cuando alguien te cuente algo, dile: "Entiendo que te sientas así, es normal".', resourceId: 'relationships-16' }
        }
    },
    {
        day: 17,
        tasks: {
            thoughts: { area: 'thoughts', title: 'Minimización', description: 'Quitarle importancia a tus logros te impide sentirte capaz.', actionItem: 'Anota un pequeño logro de hoy y permítete sentir orgullo por haberlo hecho.', resourceId: 'thoughts-17' },
            activities: { area: 'activities', title: 'Puzzles o Juegos', description: 'Concentrarnos en un reto lúdico descansa la mente de preocupaciones.', actionItem: 'Haz un crucigrama, un sudoku o juega a un juego de mesa 15 minutos.', resourceId: 'activities-17' },
            relationships: { area: 'relationships', title: 'Pregunta Abierta', description: 'Las preguntas abiertas invitan a compartir más profundamente.', actionItem: 'En lugar de "¿Qué tal?", pregunta "¿Qué ha sido lo más interesante de tu día?".', resourceId: 'relationships-17' }
        }
    },
    {
        day: 18,
        tasks: {
            thoughts: { area: 'thoughts', title: 'Inferencia Arbitraria', description: 'Llegamos a conclusiones sin tener pruebas.', actionItem: 'Cuestiona una conclusión que hayas sacado hoy sobre un evento ambiguo.', resourceId: 'thoughts-18' },
            activities: { area: 'activities', title: 'Visitar un Museo o Expo', description: 'El arte inspira y nos saca de nuestra rutina mental.', actionItem: 'Busca una exposición online o física y dedica un tiempo a contemplar.', resourceId: 'activities-18' },
            relationships: { area: 'relationships', title: 'Evitar el Conflicto', description: 'Afrontar los desacuerdos con calma es mejor que evitarlos.', actionItem: 'Si algo te molesta hoy, no lo evites; exprésalo usando un mensaje "Yo".', resourceId: 'relationships-18' }
        }
    },
    {
        day: 19,
        tasks: {
            thoughts: { area: 'thoughts', title: 'Abstracción Selectiva', description: 'Centrarse solo en el detalle negativo de una situación amplia.', actionItem: 'Para un evento de hoy, busca 3 detalles positivos que hayan pasado desapercibidos.', resourceId: 'thoughts-19' },
            activities: { area: 'activities', title: 'Aroma-terapia', description: 'Los olores conectan directamente con el sistema límbico (emociones).', actionItem: 'Enciende una vela aromática o usa un aceite esencial que te relaje.', resourceId: 'activities-19' },
            relationships: { area: 'relationships', title: 'Reconocer el Esfuerzo', description: 'Agradecer el esfuerzo de otros mejora el clima relacional.', actionItem: 'Agradece a alguien un esfuerzo que suele pasar desapercibido.', resourceId: 'relationships-19' }
        }
    },
    {
        day: 20,
        tasks: {
            thoughts: { area: 'thoughts', title: 'Atribución Errónea', description: 'Asignar causas equivocadas a tus sentimientos.', actionItem: 'Si estás cansado, no pienses que "tu vida es un desastre"; piensa "estoy cansado".', resourceId: 'thoughts-20' },
            activities: { area: 'activities', title: 'Limpieza Digital', description: 'El desorden digital también genera estrés.', actionItem: 'Borra fotos o archivos innecesarios de tu móvil durante 10 minutos.', resourceId: 'activities-20' },
            relationships: { area: 'relationships', title: 'Abrazo Largo', description: 'El contacto físico seguro libera oxitocina, la hormona del vínculo.', actionItem: 'Da un abrazo de más de 10 segundos a alguien con quien tengas confianza.', resourceId: 'relationships-20' }
        }
    },
    {
        day: 21,
        tasks: {
            thoughts: { area: 'thoughts', title: 'Perfeccionismo', description: 'Buscar la perfection es la receta para la insatisfacción.', actionItem: 'Haz algo hoy y déjalo "suficientemente bien" en lugar de "perfecto".', resourceId: 'thoughts-21' },
            activities: { area: 'activities', title: 'Podcast o Audio-libro', description: 'Escuchar nuevas ideas nos ayuda a salir de nuestro bucle mental.', actionItem: 'Escucha un episodio de un podcast que te interese mientras haces otra cosa.', resourceId: 'activities-21' },
            relationships: { area: 'relationships', title: 'Decir lo que te Gusta', description: 'A menudo solo hablamos de lo que no nos gusta de los demás.', actionItem: 'Dile a alguien algo específico que aprecias de su personalidad.', resourceId: 'relationships-21' }
        }
    },
    {
        day: 22,
        tasks: {
            thoughts: { area: 'thoughts', title: 'Descalificación de lo Positivo', description: '"Lo he hecho bien, pero ha sido suerte". No te quites mérito.', actionItem: 'Hoy, cuando te pase algo bueno, di en voz alta: "Me lo merezco" o "Lo he logrado yo".', resourceId: 'thoughts-22' },
            activities: { area: 'activities', title: 'Manualidades', description: 'Usar las manos nos ancla en el presente.', actionItem: 'Haz algo manual: tejer, arreglar algo roto, montar un mueble.', resourceId: 'activities-22' },
            relationships: { area: 'relationships', title: 'Sonrisa Consciente', description: 'La sonrisa es contagiosa y relaja el ambiente.', actionItem: 'Sonríe conscientemente al saludar a las personas con las que interactúes hoy.', resourceId: 'relationships-22' }
        }
    },
    {
        day: 23,
        tasks: {
            thoughts: { area: 'thoughts', title: 'Fantasía de Recompensa', description: 'Esperar que los demás cambien o nos premien por ser "buenos".', actionItem: 'Haz algo bueno hoy por ti, sin esperar que nadie más se dé cuenta o te lo agradezca.', resourceId: 'thoughts-23' },
            activities: { area: 'activities', title: 'Paseo en Soledad', description: 'Estar con uno mismo nos ayuda a conocernos mejor.', actionItem: 'Pasea 15 minutos a solas, disfrutando de tu propia compañía.', resourceId: 'activities-23' },
            relationships: { area: 'relationships', title: 'Interés Genuino', description: 'La curiosidad por otros es la base de la amistad.', actionItem: 'Pregunta a alguien sobre un hobby o tema que sepas que le apasiona.', resourceId: 'relationships-23' }
        }
    },
    {
        day: 24,
        tasks: {
            thoughts: { area: 'thoughts', title: 'Comparación Social', description: 'Comparar tu interior con el exterior de los demás es injusto.', actionItem: 'Si te comparas hoy, recuerda: "Solo veo su mejor versión, no su realidad completa".', resourceId: 'thoughts-24' },
            activities: { area: 'activities', title: 'Escritura Libre', description: 'Poner palabras al caos mental lo ordena.', actionItem: 'Escribe durante 5 minutos todo lo que pase por tu cabeza, sin filtros.', resourceId: 'activities-24' },
            relationships: { area: 'relationships', title: 'Respetar el Silencio', description: 'Estar cómodos en silencio es señal de una relación profunda.', actionItem: 'No te sientas obligado a llenar todos los silencios en tus conversaciones de hoy.', resourceId: 'relationships-24' }
        }
    },
    {
        day: 25,
        tasks: {
            thoughts: { area: 'thoughts', title: 'Sesgo de Confirmación', description: 'Solo buscamos lo que confirma lo que ya creemos.', actionItem: 'Busca una prueba de algo positivo sobre ti que contradiga una creencia negativa antigua.', resourceId: 'thoughts-25' },
            activities: { area: 'activities', title: 'Mirar las Estrellas o el Cielo', description: 'Contemplar la inmensidad reduce la importancia de nuestros problemas.', actionItem: 'Pasa unos minutos mirando el cielo, las nubes o las estrellas.', resourceId: 'activities-25' },
            relationships: { area: 'relationships', title: 'Gratitud Social', description: 'Agradecer a la comunidad nos hace sentir parte de algo.', actionItem: 'Da las gracias de forma especial al cajero, conductor o camarero que te atienda.', resourceId: 'relationships-25' }
        }
    },
    {
        day: 26,
        tasks: {
            thoughts: { area: 'thoughts', title: 'La Falacia de Cambio', description: 'Esperar que los demás cambien para que nosotros podamos ser felices.', actionItem: 'Identifica algo que te molesta de alguien y busca cómo puedes tú manejarlo mejor sin que el otro cambie.', resourceId: 'thoughts-26' },
            activities: { area: 'activities', title: 'Cuidar una Planta', description: 'Cuidar de otro ser vivo fomenta la responsabilidad y la calma.', actionItem: 'Riega tus plantas o quita las hojas secas, haciéndolo con plena atención.', resourceId: 'activities-26' },
            relationships: { area: 'relationships', title: 'No Juzgar', description: 'Aceptar a los demás como son reduce nuestra propia tensión.', actionItem: 'Hoy, ante una conducta ajena que suelas juzgar, repítete: "No conozco su historia completa".', resourceId: 'relationships-26' }
        }
    },
    {
        day: 27,
        tasks: {
            thoughts: { area: 'thoughts', title: 'Tener Razón', description: 'La necesidad obsesiva de demostrar que tenemos razón agota y aleja a los demás.', actionItem: 'En tu próxima discusión, elige "ser amable" en lugar de "tener razón".', resourceId: 'thoughts-27' },
            activities: { area: 'activities', title: 'Risa Terapéutica', description: 'Reír libera tensiones de forma inmediata.', actionItem: 'Mira un vídeo cómico o llama a esa persona que siempre te hace reír.', resourceId: 'activities-27' },
            relationships: { area: 'relationships', title: 'Planes de Futuro', description: 'Tener algo que esperar juntos fortalece el vínculo.', actionItem: 'Propón un plan agradable para la próxima semana a un amigo o pareja.', resourceId: 'relationships-27' }
        }
    },
    {
        day: 28,
        tasks: {
            thoughts: { area: 'thoughts', title: 'Culpabilidad', description: 'La culpa nos ancla en el pasado. La responsabilidad nos mueve al futuro.', actionItem: 'Si te sientes culpable por algo, pregúntate: "¿Qué puedo aprender y cómo puedo repararlo?"', resourceId: 'thoughts-28' },
            activities: { area: 'activities', title: 'Pausa de "No Hacer"', description: 'Aprender a estar en silencio y quietud sin sentir que perdemos el tiempo.', actionItem: 'Siéntate 5 minutos sin móvil, sin música, sin hacer nada, solo existiendo.', resourceId: 'activities-28' },
            relationships: { area: 'relationships', title: 'Ayuda Inesperada', description: 'Ser útil a los demás da sentido a nuestra vida.', actionItem: 'Ayuda a alguien hoy en algo que no te haya pedido pero que sepas que necesita.', resourceId: 'relationships-28' }
        }
    },
    {
        day: 29,
        tasks: {
            thoughts: { area: 'thoughts', title: 'Mente Sabia', description: 'El equilibrio entre tu mente racional y tu mente emocional.', actionItem: 'Ante una decisión hoy, pregúntate: "¿Qué dice mi lógica? ¿Qué dice mi corazón? ¿Qué dice mi sabiduría?"', resourceId: 'thoughts-29' },
            activities: { area: 'activities', title: 'Repaso de Logros', description: 'Celebrar el camino recorrido refuerza el hábito.', actionItem: 'Dedica 10 minutos a releer tus notas de estos 29 días.', resourceId: 'activities-29' },
            relationships: { area: 'relationships', title: 'Gratitud Extensa', description: 'Agradecer a quienes nos rodean por su presencia en nuestra vida.', actionItem: 'Dile a tus personas más cercanas cuánto valoras haber compartido este mes con ellas.', resourceId: 'relationships-29' }
        }
    },
    {
        day: 30,
        tasks: {
            thoughts: { area: 'thoughts', title: 'Compromiso Futuro', description: 'El bienestar es un camino, no una meta.', actionItem: 'Escribe 3 hábitos que hayas practicado este mes y que quieras mantener siempre.', resourceId: 'thoughts-30' },
            activities: { area: 'activities', title: 'Celebración del Éxito', description: 'Has completado 30 días de cuidado consciente. ¡Enhorabuena!', actionItem: 'Haz algo especial hoy para celebrar tu constancia y tu progreso.', resourceId: 'activities-30' },
            relationships: { area: 'relationships', title: 'Celebrar Juntos', description: 'Compartir los logros los hace más reales y duraderos.', actionItem: 'Comparte tu alegría por haber terminado el reto con alguien que te aprecie.', resourceId: 'relationships-30' }
        }
    }
];

export const getChallengeByDay = (day: number) => challenges.find(c => c.day === day);
