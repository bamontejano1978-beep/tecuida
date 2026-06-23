export type ResourceType = 'guide' | 'cbt' | 'social' | 'tool';

export interface Resource {
    id: string;
    type: ResourceType;
    title: string;
    content: any; // Flexible content based on type
}

export const resources: Record<string, Resource> = {
    // --- DAY 1 ---
    'thoughts-1': { id: 'thoughts-1', type: 'cbt', title: 'Cazando Pensamientos', content: { prompt: 'Anota 3 pensamientos negativos que hayas tenido hoy.', guide: 'Los pensamientos automáticos suelen ser rápidos y pasar desapercibidos. ¡Detente y obsérvalos!' } },
    'activities-1': { id: 'activities-1', type: 'guide', title: 'Pequeños Placeres', content: { steps: ["Elige algo de menos de 15 min.", "Elimina distracciones.", "Enfócate en los sentidos.", "Nota tu cambio de ánimo."] } },
    'relationships-1': { id: 'relationships-1', type: 'social', title: 'Mensaje de Gratitud', content: { script: ' "Hola [Nombre], quería agradecerte por [razón]. Me hace sentir muy bien contar contigo."', advice: 'No esperes respuesta, el objetivo es dar.' } },

    // --- DAY 2 ---
    'thoughts-2': { id: 'thoughts-2', type: 'cbt', title: 'Pruebas de Realidad', content: { prompt: 'Busca 2 pruebas a favor y 2 en contra de un pensamiento negativo.', guide: 'Actúa como un juez imparcial con tu propia mente.' } },
    'activities-2': { id: 'activities-2', type: 'tool', title: 'Movimiento Suave', content: { description: 'Ejercicios ligeros para liberar tensión.' } },
    'relationships-2': { id: 'relationships-2', type: 'social', title: 'Escucha Activa', content: { script: '"Entiendo lo que dices. Entonces, desde tu punto de vista, ¿lo que pasó fue [resumen]? No me había dado cuenta de eso."', advice: 'Parafrasear valida al otro y demuestra que realmente estás escuchando.' } },

    // --- DAY 3 ---
    'thoughts-3': { id: 'thoughts-3', type: 'cbt', title: 'Filtro Mental', content: { prompt: 'Anota 3 cosas buenas de hoy que tu mente esté ignorando.', guide: 'El filtro mental solo deja pasar lo gris. ¡Limpia tus gafas!' } },
    'activities-3': { id: 'activities-3', type: 'guide', title: 'Desconexión Digital', content: { steps: ["Móvil en otra sala.", "Modo No Molestar.", "Observa la urgencia y déjala pasar.", "Disfruta del silencio."] } },
    'relationships-3': { id: 'relationships-3', type: 'social', title: 'Decir que No', content: { script: '"Gracias por pensar en mí, pero ahora mismo no puedo comprometerme."', advice: 'Decir no a otros es decir sí a ti.' } },

    // --- DAY 4 ---
    'thoughts-4': { id: 'thoughts-4', type: 'cbt', title: 'Catastrofismo', content: { prompt: 'Escribe el peor, mejor y más probable escenario.', guide: 'Solemos saltar al abismo sin mirar el camino seguro.' } },
    'activities-4': { id: 'activities-4', type: 'guide', title: 'Nutrición Consciente', content: { steps: ["Observa colores.", "Huele antes de comer.", "Mastica 20 veces.", "Nota la saciedad."] } },
    'relationships-4': { id: 'relationships-4', type: 'social', title: 'Pedir Ayuda', content: { script: '"¿Me echarías una mano con [tema]? Me vendría genial tu ayuda."', advice: 'Pedir ayuda es un acto de conexión.' } },

    // --- DAY 5 ---
    'thoughts-5': { id: 'thoughts-5', type: 'cbt', title: 'Etiquetas', content: { prompt: 'Describe un fallo sin usar adjetivos negativos sobre ti.', guide: 'Tú no eres tus errores, tú cometes errores.' } },
    'activities-5': { id: 'activities-5', type: 'guide', title: 'Entorno Ordenado', content: { steps: ["Elige un rincón pequeño.", "Vacía y limpia.", "Organiza con calma.", "Disfruta de la vista."] } },
    'relationships-5': { id: 'relationships-5', type: 'social', title: 'Cumplido Sincero', content: { script: '"Admiro mucho cómo has [acción]. Tienes mucho talento para esto."', advice: 'Sé específico para que sea creíble.' } },

    // --- DAY 6 ---
    'thoughts-6': { id: 'thoughts-6', type: 'cbt', title: 'Razonamiento Emocional', content: { prompt: '¿Qué hechos lógicos contradicen cómo te sientes ahora?', guide: 'Sentir no es razonar. Las emociones son nubes, no la montaña.' } },
    'activities-6': { id: 'activities-6', type: 'guide', title: 'Creatividad Libre', content: { steps: ["Material a mano.", "Juega, no produzcas.", "Silencia al crítico interno.", "Disfruta el caos."] } },
    'relationships-6': { id: 'relationships-6', type: 'social', title: 'Presencia en la Charla', content: { script: '"Cuéntame más sobre eso, me interesa mucho tu perspectiva sobre [tema]."', advice: 'Hacer preguntas abiertas invita a una conexión más profunda.' } },

    // --- DAY 7 ---
    'thoughts-7': { id: 'thoughts-7', type: 'cbt', title: 'Revisión Semanal', content: { prompt: '¿Qué distorsión ha sido tu "estrella" esta semana?', guide: 'Conocer tu patrón es el primer paso para romperlo.' } },
    'activities-7': { id: 'activities-7', type: 'tool', title: 'Respiración Cuadrada', content: { description: 'Inhala, mantén y exhala en tiempos de 4 segundos.' } },
    'relationships-7': { id: 'relationships-7', type: 'cbt', title: 'Red de Apoyo', content: { prompt: 'Mapea a las 3 personas que más te cuidan.', guide: 'Sentirse sostenido reduce el cortisol inmediatamente.' } },

    // --- DAY 8 ---
    'thoughts-8': { id: 'thoughts-8', type: 'cbt', title: 'Personalización', content: { prompt: 'Anota 3 razones externas para el mal humor de alguien.', guide: 'No todo es sobre ti. Los demás también tienen sus batallas.' } },
    'activities-8': { id: 'activities-8', type: 'guide', title: 'Nueva Ruta', content: { steps: ["Cambia el camino usual.", "Mira los detalles nuevos.", "Siente la curiosidad.", "Despierta a tu cerebro."] } },
    'relationships-8': { id: 'relationships-8', type: 'social', title: 'Límites Digitales', content: { script: '"Estaré desconectado a partir de las [hora]. Hablamos mañana."', advice: 'Tu disponibilidad no es un derecho ajeno.' } },

    // --- DAY 9 ---
    'thoughts-9': { id: 'thoughts-9', type: 'cbt', title: 'Los "Debería"', content: { prompt: 'Cambia tus obligaciones por deseos.', guide: 'La rigidez rompe, la flexibilidad sana.' } },
    'activities-9': { id: 'activities-9', type: 'guide', title: 'Música para el Ánimo', content: { steps: ["Busca temas alegres.", "Cierra los ojos.", "Nota la vibración.", "Déjate llevar."] } },
    'relationships-9': { id: 'relationships-9', type: 'social', title: 'Disculpa Sincera', content: { script: '"Lo siento, me equivoqué al [acción]. Gracias por entenderlo."', advice: 'Pedir perdón limpia el aire entre dos personas.' } },

    // --- DAY 10 ---
    'thoughts-10': { id: 'thoughts-10', type: 'cbt', title: 'Visión de Túnel', content: { prompt: 'Para un problema, busca 3 soluciones "locas".', guide: 'Ampliar la mirada te da libertad de elección.' } },
    'activities-10': { id: 'activities-10', type: 'guide', title: 'Lectura Inspiradora', content: { steps: ["Sin ruidos externos.", "Lee con calma.", "Visualiza la historia.", "Reflexiona al final."] } },
    'relationships-10': { id: 'relationships-10', type: 'social', title: 'Sintonía Visual', content: { script: '"Hacía tiempo que no hablábamos así, me gusta mucho poder compartir este momento contigo."', advice: 'El contacto visual sumado a una frase cálida multiplica la sensación de seguridad.' } },

    // --- DAY 11 ---
    'thoughts-11': { id: 'thoughts-11', type: 'cbt', title: 'Lectura de Mente', content: { prompt: '¿Qué otra cosa podría estar pensando esa persona?', guide: 'No somos adivinos, solo proyectamos nuestros miedos.' } },
    'activities-11': { id: 'activities-11', type: 'guide', title: 'Ritual de Cuidado', content: { steps: ["Música suave.", "Atención al tacto.", "Lentitud.", "Gratitud al cuerpo."] } },
    'relationships-11': { id: 'relationships-11', type: 'social', title: 'Expresar Necesidades', content: { script: '"Me siento [emoción] y me ayudaría que [acción]."', advice: 'Ser claro es ser amable con el otro.' } },

    // --- DAY 12 ---
    'thoughts-12': { id: 'thoughts-12', type: 'cbt', title: 'Polarización', content: { prompt: 'Encuentra 2 matices grises en un conflicto.', guide: 'La vida no es blanco o negro, es un arcoiris complejo.' } },
    'activities-12': { id: 'activities-12', type: 'guide', title: 'Meditación del Té', content: { steps: ["Nota el calor.", "Huele el aroma.", "Sabor minucioso.", "Presencia total."] } },
    'relationships-12': { id: 'relationships-12', type: 'social', title: 'Reencuentro', content: { script: '"¡Hola! Me he acordado mucho de ti. ¿Hablamos un rato?"', advice: 'El afecto no necesita excusas para manifestarse.' } },

    // --- DAY 13 ---
    'thoughts-13': { id: 'thoughts-13', type: 'cbt', title: 'Palabras Absolutas', content: { prompt: 'Cambia un "siempre" por un "a veces".', guide: 'Tus palabras diseñan tu mundo emocional. Elige bien.' } },
    'activities-13': { id: 'activities-13', type: 'guide', title: 'Libera tu Cuerpo', content: { steps: ["Canción con ritmo.", "Muévete libremente.", "Sin espejos.", "Nota la alegría."] } },
    'relationships-13': { id: 'relationships-13', type: 'social', title: 'Frenar el Cotilleo', content: { script: '"Bueno, prefiero no hablar de eso si no está presente. Por cierto, ¿viste lo que logró [Nombre] ayer? Fue impresionante."', advice: 'Cambiar el tema hacia un logro positivo es la forma más elegante de evitar la negatividad.' } },

    // --- DAY 14 ---
    'thoughts-14': { id: 'thoughts-14', type: 'tool', title: 'Círculo de Control', content: { steps: ["Escribe qué controlas.", "Identifica qué no.", "Suelta lo ajeno.", "Acciona lo propio."] } },
    'activities-14': { id: 'activities-14', type: 'guide', title: 'Baño de Bosque', content: { steps: ["Aire libre.", "Caminata lenta.", "Sonidos naturales.", "Conexión tierra."] } },
    'relationships-14': { id: 'relationships-14', type: 'social', title: 'Pequeño Detalle', content: { script: 'Un post-it: "¡Eres genial, gracias por estar aquí!"', advice: 'Lo pequeño es grande en el corazón.' } },

    // --- DAY 15 ---
    'thoughts-15': { id: 'thoughts-15', type: 'cbt', title: 'Carta al Futuro', content: { prompt: '3 lecciones de tus primeros 15 días.', guide: 'Eres más capaz de lo que eras hace dos semanas.' } },
    'activities-15': { id: 'activities-15', type: 'guide', title: 'Siesta Reparadora', content: { steps: ["Oscuridad.", "20 minutos.", "Respiración.", "Hidratación final."] } },
    'relationships-15': { id: 'relationships-15', type: 'cbt', title: 'Auto-bondad', content: { prompt: '¿Qué le dirías a alguien que amas en tu situación?', guide: 'Tú también mereces tu propio amor.' } },

    // --- DAY 16 ---
    'thoughts-16': { id: 'thoughts-16', type: 'cbt', title: 'Zoom de Tiempo', content: { prompt: '¿Esto será importante en 1 año?', guide: 'La urgencia del ahora nubla la perspectiva real.' } },
    'activities-16': { id: 'activities-16', type: 'guide', title: 'Cocina con Amor', content: { steps: ["Lava con atención.", "Corta con ritmo.", "Huele especias.", "Saborea el éxito."] } },
    'relationships-16': { id: 'relationships-16', type: 'social', title: 'Validar a Otros', content: { script: '"Entiendo que te sientas así, es muy normal."', advice: 'Escuchar es el mejor regalo que puedes dar.' } },

    // --- DAY 17 ---
    'thoughts-17': { id: 'thoughts-17', type: 'cbt', title: 'Reclama Logros', content: { prompt: 'Anota un éxito hoy y siéntelo tuyo.', guide: 'No es suerte, es tu esfuerzo diario.' } },
    'activities-17': { id: 'activities-17', type: 'guide', title: 'Estado de Flow', content: { steps: ["Reto medio.", "Tarea fija.", "Olvida el reloj.", "Disfruta el hacer."] } },
    'relationships-17': { id: 'relationships-17', type: 'social', title: 'Preguntas con Sentido', content: { script: '"¿Qué ha sido lo mejor de tu día hoy?"', advice: 'Busca la historia detrás de la persona.' } },

    // --- DAY 18 ---
    'thoughts-18': { id: 'thoughts-18', type: 'cbt', title: 'Pruebas Judiciales', content: { prompt: '¿Qué evidencias reales tiene tu miedo?', guide: 'Tu mente miente a veces. Pide pruebas.' } },
    'activities-18': { id: 'activities-18', type: 'guide', title: 'Inspiración Artística', content: { steps: ["Obra visual.", "2 min de pausa.", "Nota emociones.", "Investiga autor."] } },
    'relationships-18': { id: 'relationships-18', type: 'social', title: 'Hablar con Calma', content: { script: '"Me gustaría charlar sobre [tema]. Siento que..."', advice: 'La paz viene de la comunicación, no del silencio.' } },

    // --- DAY 19 ---
    'thoughts-19': { id: 'thoughts-19', type: 'cbt', title: 'Foco Positivo', content: { prompt: 'Busca 3 detalles buenos ocultos en lo malo.', guide: 'Donde pones la atención, pones tu vida.' } },
    'activities-19': { id: 'activities-19', type: 'guide', title: 'Mundo de Aromas', content: { steps: ["Elegir aroma.", "Inhalar.", "Identificar recuerdos.", "Presencia total."] } },
    'relationships-19': { id: 'relationships-19', type: 'social', title: 'Reconocer Esfuerzo', content: { script: '"Valoro mucho el esfuerzo que has puesto en [esto]."', advice: 'Agradecer el proceso es más potente que el resultado.' } },

    // --- DAY 20 ---
    'thoughts-20': { id: 'thoughts-20', type: 'cbt', title: 'Causa Real', content: { prompt: '¿Es el problema o es tu cansancio?', guide: 'Asegúrate de haber dormido y comido antes de juzgar tu vida.' } },
    'activities-20': { id: 'activities-20', type: 'guide', title: 'Limpieza Digital', content: { steps: ["Fotos viejas.", "Borrar.", "Libertad visual.", "Repetir."] } },
    'relationships-20': { id: 'relationships-20', type: 'social', title: 'Pedir un Abrazo', content: { script: '"He tenido un día un poco intenso, ¿me das un abrazo de esos largos? Realmente lo necesito ahora."', advice: 'Ser vulnerable con personas seguras fortalece el vínculo de confianza.' } },

    // --- DAY 21 ---
    'thoughts-21': { id: 'thoughts-21', type: 'cbt', title: 'Basta de Perfección', content: { prompt: 'Deja algo al 80% y siéntete libre.', guide: 'Lo perfecto es enemigo de lo que te hace feliz.' } },
    'activities-21': { id: 'activities-21', type: 'guide', title: 'Nuevas Ideas', content: { steps: ["Podcast nuevo.", "Escucha total.", "Aprende un punto.", "Reflexiona."] } },
    'relationships-21': { id: 'relationships-21', type: 'social', title: 'Dilo en Voz Alta', content: { script: '"Me encanta tu forma de [cualidad]. Es inspirador."', advice: 'No guardes las palabras bonitas, suéltalas.' } },

    // --- DAY 22 ---
    'thoughts-22': { id: 'thoughts-22', type: 'cbt', title: 'Aceptar el Éxito', content: { prompt: 'Di "He sido yo" ante un logro hoy.', guide: 'Eres el arquitecto de tu bienestar.' } },
    'activities-22': { id: 'activities-22', type: 'guide', title: 'Manos a la Obra', content: { steps: ["Tarea manual.", "Atención al tacto.", "Sin pantallas.", "Orgullo final."] } },
    'relationships-22': { id: 'relationships-22', type: 'social', title: 'Saludar con Sonrisa', content: { script: '"¡Buenos días! Qué alegría verte hoy. ¿Cómo va todo?"', advice: 'Una sonrisa y una frase amable al inicio del día cambian la química del ambiente.' } },

    // --- DAY 23 ---
    'thoughts-23': { id: 'thoughts-23', type: 'cbt', title: 'Secreto de Amor Propio', content: { prompt: 'Haz algo bueno por ti que nadie sepa.', guide: 'Tu propia aprobación es la única que necesitas.' } },
    'activities-23': { id: 'activities-23', type: 'guide', title: 'Cita Contigo', content: { steps: ["Sitio agradable.", "Solo tú.", "Sin móvil.", "Disfruta de ti."] } },
    'relationships-23': { id: 'relationships-23', type: 'social', title: 'Curiosidad Genuina', content: { script: '"¿Qué es lo que más te apasiona de [hobby]?"', advice: 'Mostrar interés es amar al otro.' } },

    // --- DAY 24 ---
    'thoughts-24': { id: 'thoughts-24', type: 'cbt', title: 'Cero Comparación', content: { prompt: 'Encuentra tu mejora del día 1 a hoy.', guide: 'Tu rival es tu sombra de ayer, nadie más.' } },
    'activities-24': { id: 'activities-24', type: 'guide', title: 'Vuelca tu Mente', content: { steps: ["Escribir sin parar.", "Sin filtros.", "5 minutos.", "Libera espacio."] } },
    'relationships-24': { id: 'relationships-24', type: 'social', title: 'Compañía en Silencio', content: { script: '"No hace falta que hablemos si no te apetece, me gusta simplemente estar aquí contigo."', advice: 'Validar el silencio quita presión y crea un espacio de aceptación total.' } },

    // --- DAY 25 ---
    'thoughts-25': { id: 'thoughts-25', type: 'cbt', title: 'Prueba Positiva', content: { prompt: '¿Qué ha salido MEJOR hoy de lo esperado?', guide: 'Tu cerebro busca errores. Ayúdale a ver aciertos.' } },
    'activities-25': { id: 'activities-25', type: 'guide', title: 'Mirada al Cielo', content: { steps: ["Mirar arriba.", "Inmensidad.", "Sentir proporción.", "Paz estelar."] } },
    'relationships-25': { id: 'relationships-25', type: 'social', title: 'Gratitud Social', content: { script: '"¡Muchas gracias! Me has dado un servicio excelente."', advice: 'Ser amable es gratis y lo cambia todo.' } },

    // --- DAY 26 ---
    'thoughts-26': { id: 'thoughts-26', type: 'cbt', title: 'Adaptabilidad', content: { prompt: '¿Cómo puedes fluir con este cambio hoy?', guide: 'La rigidez te hace infeliz, la fluidez te hace libre.' } },
    'activities-26': { id: 'activities-26', type: 'guide', title: 'Cuidado de Vida', content: { steps: ["Plantas.", "Tocar hojas.", "Agua con calma.", "Oxígeno y vida."] } },
    'relationships-26': { id: 'relationships-26', type: 'social', title: 'Respuesta sin Juicio', content: { script: '"Es una situación difícil, entiendo que hagas lo que creas mejor. Aquí estoy si necesitas hablar."', advice: 'Aceptar al otro sin intentar corregirlo es el mayor acto de amor.' } },

    // --- DAY 27 ---
    'thoughts-27': { id: 'thoughts-27', type: 'cbt', title: 'Refugio Interior', content: { prompt: 'Dite algo tierno hoy.', guide: 'Tienes una casa dentro de ti, cuídala.' } },
    'activities-27': { id: 'activities-27', type: 'tool', title: 'Terapia de la Risa', content: { description: 'Libera endorfinas a través de la risa.' } },
    'relationships-27': { id: 'relationships-27', type: 'social', title: 'Futuro Juntos', content: { script: '"¿Hacemos algo divertido el sábado que viene?"', advice: 'Las promesas de ocio alimentan el alma.' } },

    // --- DAY 28 ---
    'thoughts-28': { id: 'thoughts-28', type: 'cbt', title: 'Logro Final', content: { prompt: '¿Cómo ha cambiado tu voz interna?', guide: 'Eres el resultado de 28 días de amor propio.' } },
    'activities-28': { id: 'activities-28', type: 'guide', title: 'Pausa Absoluta', content: { steps: ["No hacer NADA.", "5 min.", "Observar mente.", "Sentir centro."] } },
    'relationships-28': { id: 'relationships-28', type: 'social', title: 'Ayuda Oculta', content: { script: '"He visto que tenías [tarea] pendiente y me he tomado la libertad de adelantarte un poco. ¡Espero que te sirva!"', advice: 'La ayuda inesperada genera un sentimiento de gratitud recíproca.' } },

    // --- DAY 29 ---
    'thoughts-29': { id: 'thoughts-29', type: 'cbt', title: 'Mente Sabia', content: { prompt: 'Busca el equilibrio entre lógica y emoción.', guide: 'La sabiduría es el abrazo de tus dos mitades.' } },
    'activities-29': { id: 'activities-29', type: 'guide', title: 'Repaso de Camino', content: { steps: ["Volver atrás.", "Releer notas.", "Ver cambios.", "Orgullo total."] } },
    'relationships-29': { id: 'relationships-29', type: 'social', title: 'Gratitud Final', content: { script: '"Gracias por compartir este mes de bienestar conmigo."', advice: 'Celebrar unidos es más valioso.' } },

    // --- DAY 30 ---
    'thoughts-30': { id: 'thoughts-30', type: 'cbt', title: 'Compromiso Eterno', content: { prompt: '¿Qué hábito te llevas para siempre?', guide: 'Hoy termina el reto, pero empieza tu nueva vida.' } },
    'activities-30': { id: 'activities-30', type: 'guide', title: 'Gran Fiesta Propia', content: { steps: ["Hacer lo que más ames.", "Presencia total.", "Celebrar.", "Respirar paz."] } },
    'relationships-30': { id: 'relationships-30', type: 'social', title: 'Celebrar Unidos', content: { script: '"¡Lo hemos conseguido! Brindo por nosotros."', advice: 'Inspirar a otros es tu nueva misión.' } }
};

export const getResourceById = (id: string) => resources[id];
