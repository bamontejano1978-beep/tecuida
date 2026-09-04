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
        "day": 1,
        "tasks": {
            "thoughts": {
                "area": "thoughts",
                "title": "Escáner corporal antes de empezar",
                "description": "Antes de entrar a tu turno, haz una pausa de 3 minutos. Si puedes, siéntate. Cierra los ojos. Recorre tu cuerpo con atención: ¿dónde sientes tensión? ¿Mandíbula apretada? ¿Hombros subidos? ¿Espalda? ¿Piernas? Solo observa, sin juzgar. Ese mapa de tensión te dirá cómo estás empezando.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Escáner corporal antes de empezar).",
                "resourceId": "thoughts-1"
            },
            "activities": {
                "area": "activities",
                "title": "La primera pausa consciente",
                "description": "Hoy, en tu primer descanso (el café, el desayuno, o el momento que toque), hazlo sin mirar el móvil ni pensar en el trabajo. Solo tú y ese momento. Bebe despacio, saborea, mira a tu alrededor. Nota la diferencia entre una pausa real y una pausa con pantalla.",
                "actionItem": "Pon en práctica el ejercicio de hoy (La primera pausa consciente).",
                "resourceId": "activities-1"
            },
            "relationships": {
                "area": "relationships",
                "title": "Saludo consciente",
                "description": "Al llegar, saluda a la primera persona que veas (compañero, paciente, familiar) mirándola a los ojos, con una sonrisa genuina. No un saludo automático. Una conexión real de 2 segundos.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Saludo consciente).",
                "resourceId": "relationships-1"
            }
        }
    },
    {
        "day": 2,
        "tasks": {
            "thoughts": {
                "area": "thoughts",
                "title": "Inventario de situaciones",
                "description": "Al final del día, identifica **tres situaciones** que te hayan generado tensión. Pueden ser: un paciente difícil, una familia quejándose, una sobrecarga de trabajo, un compañero, un problema con el material, etc. Escríbelas. Solo identifica, no juzgues.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Inventario de situaciones).",
                "resourceId": "thoughts-2"
            },
            "activities": {
                "area": "activities",
                "title": "La pausa antes de reaccionar",
                "description": "La próxima vez que sientas tensión por algo, haz una pausa de **10 segundos** antes de reaccionar. Respira hondo una vez. Luego decide cómo actuar. Esos 10 segundos cambian todo.",
                "actionItem": "Pon en práctica el ejercicio de hoy (La pausa antes de reaccionar).",
                "resourceId": "activities-2"
            },
            "relationships": {
                "area": "relationships",
                "title": "¿Cómo estás realmente?",
                "description": "Pregunta a un compañero: \"¿Cómo estás realmente?\". Y escucha la respuesta sin interrumpir ni juzgar. No hace falta dar soluciones. Solo acompañar.",
                "actionItem": "Pon en práctica el ejercicio de hoy (¿Cómo estás realmente?).",
                "resourceId": "relationships-2"
            }
        }
    },
    {
        "day": 3,
        "tasks": {
            "thoughts": {
                "area": "thoughts",
                "title": "Detective de pensamientos",
                "description": "Cuando notes malestar, pregúntate: ¿Qué estoy pensando ahora mismo? Ejemplos comunes: \"no puedo con esto\", \"debería haber hecho más\", \"este paciente no mejora\", \"siempre me toca a mí\", \"esto es un caos\". Identifica el pensamiento, ponle nombre. No lo discutas, solo identifícalo.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Detective de pensamientos).",
                "resourceId": "thoughts-3"
            },
            "activities": {
                "area": "activities",
                "title": "Reformulación breve",
                "description": "Elige uno de esos pensamientos y pregúntate: ¿Es 100% cierto? ¿Hay otras formas de verlo? ¿Qué le diría a un compañero que tuviera ese pensamiento? Escribe una frase alternativa más amable.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Reformulación breve).",
                "resourceId": "activities-3"
            },
            "relationships": {
                "area": "relationships",
                "title": "Validación sin consejo",
                "description": "Hoy, si un compañero te cuenta un problema, no des consejos. Solo valida: \"Qué difícil\", \"te entiendo\", \"gracias por compartirlo\". La validación conecta más que los consejos.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Validación sin consejo).",
                "resourceId": "relationships-3"
            }
        }
    },
    {
        "day": 4,
        "tasks": {
            "thoughts": {
                "area": "thoughts",
                "title": "Mi mochila de responsabilidad",
                "description": "Imagina que llevas una mochila con todas tus responsabilidades: pacientes, familias, informes, reuniones, tareas, cuidados... ¿Cuánto pesa? ¿Qué parte de esa mochila es realmente tuya y qué parte te has puesto tú de más? Escríbelo.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Mi mochila de responsabilidad).",
                "resourceId": "thoughts-4"
            },
            "activities": {
                "area": "activities",
                "title": "Compartir una responsabilidad",
                "description": "Hoy, comparte una responsabilidad pequeña. Puede ser pedir ayuda a un compañero, delegar una tarea o simplemente no hacer algo que normalmente haces y ver qué pasa. El mundo no se detiene.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Compartir una responsabilidad).",
                "resourceId": "activities-4"
            },
            "relationships": {
                "area": "relationships",
                "title": "Reconocer la responsabilidad compartida",
                "description": "Hoy, reconoce explícitamente a alguien que te haya ayudado: \"Gracias por estar ahí cuando lo necesitaba\", \"Me ayudó mucho lo que hiciste\". Reconocer al otro aligera tu mochila y fortalece la suya.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Reconocer la responsabilidad compartida).",
                "resourceId": "relationships-4"
            }
        }
    },
    {
        "day": 5,
        "tasks": {
            "thoughts": {
                "area": "thoughts",
                "title": "El ruido de las tareas",
                "description": "Ahora mismo, escribe en un papel **todas las tareas** que tienes pendientes (profesionales y personales), sin orden ni prioridad. Solo sacarlas de la cabeza al papel. Notarás cómo la mente se despeja al externalizarlas.",
                "actionItem": "Pon en práctica el ejercicio de hoy (El ruido de las tareas).",
                "resourceId": "thoughts-5"
            },
            "activities": {
                "area": "activities",
                "title": "Una cosa ahora",
                "description": "De esa lista, elige **una sola tarea** y hazla con toda tu atención. Cuando termines, elige la siguiente. La multitarea no existe en enfermería; es solo cambiar de tarea muy rápido y desgastarse.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Una cosa ahora).",
                "resourceId": "activities-5"
            },
            "relationships": {
                "area": "relationships",
                "title": "Ofrecer ayuda sin esperar nada",
                "description": "Hoy, ofrece ayuda a alguien sin que te lo pida. Puede ser algo pequeño: cubrirle unos minutos, ofrecerte a revisar algo, preguntar si necesita algo antes de irte. Sin esperar reconocimiento.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Ofrecer ayuda sin esperar nada).",
                "resourceId": "relationships-5"
            }
        }
    },
    {
        "day": 6,
        "tasks": {
            "thoughts": {
                "area": "thoughts",
                "title": "Yo no soy solo mi profesión",
                "description": "Reflexiona: Si mañana no pudieras ejercer, ¿quién serías? ¿Qué valores, aficiones, relaciones te definen al margen de ser enfermero/a? Escribe **tres cosas**.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Yo no soy solo mi profesión).",
                "resourceId": "thoughts-6"
            },
            "activities": {
                "area": "activities",
                "title": "Ritual de transición",
                "description": "Crea un pequeño ritual para cuando termines la jornada. Puede ser: cambiarte de ropa, darte una ducha, dar un paseo de 5 minutos, escuchar una canción. Algo que marque el fin del trabajo y el inicio de ti.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Ritual de transición).",
                "resourceId": "activities-6"
            },
            "relationships": {
                "area": "relationships",
                "title": "Pregunta no profesional",
                "description": "Hoy, a un compañero, pregúntale algo que no tenga que ver con el trabajo: \"¿qué hiciste el fin de semana?\", \"¿qué te hace ilusión estos días?\", \"¿qué libro/serie recomiendas?\".",
                "actionItem": "Pon en práctica el ejercicio de hoy (Pregunta no profesional).",
                "resourceId": "relationships-6"
            }
        }
    },
    {
        "day": 7,
        "tasks": {
            "thoughts": {
                "area": "thoughts",
                "title": "Balance de la semana 1",
                "description": "Revisa los 6 días anteriores. ¿Qué ejercicios te han resultado más útiles? ¿Cuáles menos? ¿Qué has aprendido sobre ti y tu relación con la profesión? Escribe **3 ideas clave**.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Balance de la semana 1).",
                "resourceId": "thoughts-7"
            },
            "activities": {
                "area": "activities",
                "title": "Un hábito para mantener",
                "description": "Elige **un solo hábito** de esta semana que quieras mantener la próxima. Escríbelo y pon un recordatorio. Un hábito pequeño es mejor que muchos que se abandonan.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Un hábito para mantener).",
                "resourceId": "activities-7"
            },
            "relationships": {
                "area": "relationships",
                "title": "Agradecimiento profesional",
                "description": "Antes de terminar la semana, da las gracias (mentalmente o en persona) a alguien del trabajo que haya hecho esta semana más llevadera. Un mensaje, una palabra, un gesto.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Agradecimiento profesional).",
                "resourceId": "relationships-7"
            }
        }
    },
    {
        "day": 8,
        "tasks": {
            "thoughts": {
                "area": "thoughts",
                "title": "Mis creencias sobre los límites",
                "description": "Escribe las creencias que tienes sobre poner límites en tu trabajo. Ej: \"Si digo que no, pensarán que no me importa\", \"Tengo que estar siempre disponible\", \"Es mi responsabilidad solucionarlo todo\", \"Los pacientes y familias están pasando por un mal momento, no puedo quejarme\". Cuestiona una: ¿Es siempre cierta? ¿Quién te dijo eso?",
                "actionItem": "Pon en práctica el ejercicio de hoy (Mis creencias sobre los límites).",
                "resourceId": "thoughts-8"
            },
            "activities": {
                "area": "activities",
                "title": "Un límite pequeño",
                "description": "Pon un límite pequeño pero real hoy. Puede ser: no responder mensajes de familias fuera de horario, no quedarte más de 10 minutos al finalizar tu turno, o decir \"ahora no puedo, ¿hablamos más tarde?\" de forma amable pero firme.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Un límite pequeño).",
                "resourceId": "activities-8"
            },
            "relationships": {
                "area": "relationships",
                "title": "Observar límites ajenos",
                "description": "Observa hoy cómo otros compañeros ponen límites. ¿Quién lo hace bien? ¿Cómo lo hace? ¿Qué puedes aprender? No para copiar, sino para ampliar tu repertorio.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Observar límites ajenos).",
                "resourceId": "relationships-8"
            }
        }
    },
    {
        "day": 9,
        "tasks": {
            "thoughts": {
                "area": "thoughts",
                "title": "La mochila de compromisos",
                "description": "Revisa mentalmente los compromisos que has adquirido últimamente con pacientes o familias. ¿Alguno lo aceptaste por compromiso, no por convicción? ¿Qué te llevó a decir sí?",
                "actionItem": "Pon en práctica el ejercicio de hoy (La mochila de compromisos).",
                "resourceId": "thoughts-9"
            },
            "activities": {
                "area": "activities",
                "title": "Decir no amablemente",
                "description": "Hoy, di **un no** amable a algo pequeño. Puede ser a una petición de última hora, a quedarte más tiempo, a asumir una tarea extra. Fórmula: \"Entiendo que es importante, pero ahora no puedo. ¿Podemos buscar otra opción?\" o \"Ahora mismo no me es posible, ¿puede esperar un rato?\"",
                "actionItem": "Pon en práctica el ejercicio de hoy (Decir no amablemente).",
                "resourceId": "activities-9"
            },
            "relationships": {
                "area": "relationships",
                "title": "Aceptar un no ajeno",
                "description": "Cuando alguien te diga que no a algo hoy (un compañero, un paciente, una familia), acéptalo con naturalidad. No insistas, no te lo tomes como algo personal. \"Vale, gracias por decírmelo. Otra vez será.\" Normalizar el no ayuda a normalizarlo en ti.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Aceptar un no ajeno).",
                "resourceId": "relationships-9"
            }
        }
    },
    {
        "day": 10,
        "tasks": {
            "thoughts": {
                "area": "thoughts",
                "title": "El diario del tiempo",
                "description": "Al final del día, repasa cómo has empleado tu tiempo. ¿Qué tareas te han consumido más? ¿Cuáles eran realmente importantes? ¿Dónde hubo pérdidas de tiempo? En enfermería, lo urgente suele comer lo importante. ¿Dónde pasó hoy?",
                "actionItem": "Pon en práctica el ejercicio de hoy (El diario del tiempo).",
                "resourceId": "thoughts-10"
            },
            "activities": {
                "area": "activities",
                "title": "La regla de 3",
                "description": "Mañana, antes de empezar, elige **las 3 tareas más importantes** del día. Haz esas primero, aunque haya urgencias pequeñas. Lo demás puede esperar. Al final del día, revisa si has cumplido.",
                "actionItem": "Pon en práctica el ejercicio de hoy (La regla de 3).",
                "resourceId": "activities-10"
            },
            "relationships": {
                "area": "relationships",
                "title": "Respetar el tiempo ajeno",
                "description": "Hoy, sé especialmente cuidadoso con el tiempo de los demás. Empieza las reuniones puntual, termina a la hora, no alargues conversaciones innecesarias con pacientes/familias si hay otros esperando. El respeto al tiempo ajeno es una forma de cuidar.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Respetar el tiempo ajeno).",
                "resourceId": "relationships-10"
            }
        }
    },
    {
        "day": 11,
        "tasks": {
            "thoughts": {
                "area": "thoughts",
                "title": "Mi relación con las familias",
                "description": "Reflexiona: ¿Cómo te sientes cuando tienes que comunicarte con familias? ¿Te generan ansiedad? ¿Evitas ciertas conversaciones? ¿Qué creencias hay detrás?",
                "actionItem": "Pon en práctica el ejercicio de hoy (Mi relación con las familias).",
                "resourceId": "thoughts-11"
            },
            "activities": {
                "area": "activities",
                "title": "Mensaje asertivo a una familia",
                "description": "Si hoy tienes que comunicarte con una familia, practica un mensaje asertivo. Estructura: \"Entiendo su preocupación, y al mismo tiempo necesito que...\" o \"Voy a hacer todo lo posible, pero es importante que sepan que...\" o \"Lo que voy a hacer es... y lo que no voy a poder hacer es...\".",
                "actionItem": "Pon en práctica el ejercicio de hoy (Mensaje asertivo a una familia).",
                "resourceId": "activities-11"
            },
            "relationships": {
                "area": "relationships",
                "title": "Empatía con la familia",
                "description": "Antes de una conversación difícil con una familia, tómate 1 minuto para ponerte en su lugar. ¿Qué estarán sintiendo? ¿Miedo? ¿Impotencia? ¿Incertidumbre? Ese minuto de empatía cambiará tu tono y tu comunicación.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Empatía con la familia).",
                "resourceId": "relationships-11"
            }
        }
    },
    {
        "day": 12,
        "tasks": {
            "thoughts": {
                "area": "thoughts",
                "title": "Creencias sobre pedir ayuda",
                "description": "¿Qué creencias tienes sobre pedir ayuda en tu trabajo? ¿\"Si pido ayuda, muestro debilidad\"? ¿\"Es más rápido hacerlo yo\"? ¿\"No quiero molestar\"? ¿\"Se supone que tengo que poder con todo\"? Escribe una y cuestiónala.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Creencias sobre pedir ayuda).",
                "resourceId": "thoughts-12"
            },
            "activities": {
                "area": "activities",
                "title": "Pedir ayuda hoy",
                "description": "Hoy, pide ayuda para algo. Puede ser pequeño: preguntar una duda, pedir que te cubran 5 minutos, solicitar apoyo con una tarea, pedir a un compañero que revise algo. Observa qué pasa. La mayoría de las veces, la gente dice que sí.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Pedir ayuda hoy).",
                "resourceId": "activities-12"
            },
            "relationships": {
                "area": "relationships",
                "title": "Ofrecerse a ayudar sin que te lo pidan",
                "description": "Hoy, además de pedir, ofrece ayuda a alguien que sabes que está sobrecargado. \"Veo que hoy estás a tope, ¿necesitas que te eche una mano con algo?\" Creas una cultura donde pedir ayuda es normal.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Ofrecerse a ayudar sin que te lo pidan).",
                "resourceId": "relationships-12"
            }
        }
    },
    {
        "day": 13,
        "tasks": {
            "thoughts": {
                "area": "thoughts",
                "title": "El coste de las reuniones",
                "description": "Calcula mentalmente: en la última reunión que tuviste, ¿cuántas personas había? ¿Cuánto duró? Multiplica. Ese es el coste en horas de trabajo. ¿Mereció la pena? ¿Cómo podrías contribuir a que las reuniones sean mejores?",
                "actionItem": "Pon en práctica el ejercicio de hoy (El coste de las reuniones).",
                "resourceId": "thoughts-13"
            },
            "activities": {
                "area": "activities",
                "title": "Una propuesta para la próxima reunión",
                "description": "En la próxima reunión, propón algo para mejorarla: orden del día claro, tiempo límite, una ronda breve al inicio, o terminar 5 minutos antes para que la gente pueda ir a sus tareas.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Una propuesta para la próxima reunión).",
                "resourceId": "activities-13"
            },
            "relationships": {
                "area": "relationships",
                "title": "Reconocimiento en reunión",
                "description": "En la próxima reunión, reconoce explícitamente la contribución de alguien: \"Me pareció muy buena idea lo que dijo X\", \"Gracias a Y por preparar esto\". El reconocimiento público fortalece el equipo.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Reconocimiento en reunión).",
                "resourceId": "relationships-13"
            }
        }
    },
    {
        "day": 14,
        "tasks": {
            "thoughts": {
                "area": "thoughts",
                "title": "Balance de la semana 2",
                "description": "Revisa los 7 días. ¿Qué límites has puesto? ¿Cómo te has sentido? ¿Qué ha sido fácil? ¿Qué difícil? ¿Hubo consecuencias reales o solo miedos? Escribe **3 aprendizajes**.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Balance de la semana 2).",
                "resourceId": "thoughts-14"
            },
            "activities": {
                "area": "activities",
                "title": "Un límite para mantener",
                "description": "Elige **un límite** de esta semana que quieras mantener. Puede ser el horario, no asumir tareas extras, o algo similar. Escríbelo y pon un recordatorio.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Un límite para mantener).",
                "resourceId": "activities-14"
            },
            "relationships": {
                "area": "relationships",
                "title": "Agradecer a quien respeta tus límites",
                "description": "Si alguien ha respetado un límite tuyo esta semana (no te ha llamado fuera de hora, ha aceptado un no, ha entendido que no podías), agradéceselo. \"Gracias por entender que necesitaba ese tiempo\". Refuerzas la conducta.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Agradecer a quien respeta tus límites).",
                "resourceId": "relationships-14"
            }
        }
    },
    {
        "day": 15,
        "tasks": {
            "thoughts": {
                "area": "thoughts",
                "title": "Curva de energía en tu jornada",
                "description": "Dibuja mentalmente tu curva de energía a lo largo del día. ¿Cuándo tienes más? ¿Cuándo menos? ¿Cómo afecta eso a tu trabajo con pacientes? ¿Qué momentos del día son más desgastantes?",
                "actionItem": "Pon en práctica el ejercicio de hoy (Curva de energía en tu jornada).",
                "resourceId": "thoughts-15"
            },
            "activities": {
                "area": "activities",
                "title": "Programar según energía",
                "description": "Mañana, si puedes, programa las tareas que requieren más atención en tus horas de más energía. Las tareas mecánicas, en horas de baja energía. No luches contra tu biología.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Programar según energía).",
                "resourceId": "activities-15"
            },
            "relationships": {
                "area": "relationships",
                "title": "Respetar la energía ajena",
                "description": "Hoy, cuando necesites algo de un compañero, ten en cuenta su energía. Si sabes que está muy liado o agotado, ¿puede esperar? ¿Puedes preguntar \"¿es buen momento?\" antes de pedirle algo?",
                "actionItem": "Pon en práctica el ejercicio de hoy (Respetar la energía ajena).",
                "resourceId": "relationships-15"
            }
        }
    },
    {
        "day": 16,
        "tasks": {
            "thoughts": {
                "area": "thoughts",
                "title": "El mito de la productividad sin pausas",
                "description": "Reflexiona: ¿Crees que atender a más pacientes sin pausas te hace más productivo? La ciencia dice que el rendimiento cae después de 90 minutos sin descanso, y en profesiones de ayuda, el desgaste emocional acelera esa caída.",
                "actionItem": "Pon en práctica el ejercicio de hoy (El mito de la productividad sin pausas).",
                "resourceId": "thoughts-16"
            },
            "activities": {
                "area": "activities",
                "title": "Micro-pausa entre pacientes",
                "description": "Hoy, entre paciente y paciente (o entre tarea y tarea), tómate **2 minutos**. Puedes: cerrar los ojos, respirar hondo 5 veces, beber agua, mirar por la ventana, estirar el cuello. No hagas nada productivo. Solo recupera.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Micro-pausa entre pacientes).",
                "resourceId": "activities-16"
            },
            "relationships": {
                "area": "relationships",
                "title": "La pausa compartida",
                "description": "Invita a un compañero a hacer una pausa contigo. \"Voy a respirar 2 minutos, ¿te vienes?\". Normalizar la pausa ayuda a crear cultura de cuidado.",
                "actionItem": "Pon en práctica el ejercicio de hoy (La pausa compartida).",
                "resourceId": "relationships-16"
            }
        }
    },
    {
        "day": 17,
        "tasks": {
            "thoughts": {
                "area": "thoughts",
                "title": "La presencia del trabajo fuera de horario",
                "description": "¿Con qué frecuencia piensas en pacientes, familias o tareas fuera del trabajo? ¿Revisas mensajes? ¿Das vueltas a casos? Toma conciencia.",
                "actionItem": "Pon en práctica el ejercicio de hoy (La presencia del trabajo fuera de horario).",
                "resourceId": "thoughts-17"
            },
            "activities": {
                "area": "activities",
                "title": "1 hora sin trabajo",
                "description": "Hoy, elige **una hora** al llegar a casa donde el trabajo no exista. Nada de pensar en pacientes, nada de revisar nada. Haz algo físico o que te guste. Una hora de presencia real.",
                "actionItem": "Pon en práctica el ejercicio de hoy (1 hora sin trabajo).",
                "resourceId": "activities-17"
            },
            "relationships": {
                "area": "relationships",
                "title": "Conversación sin trabajo",
                "description": "Si vives con alguien, propón que durante la cena no se hable de trabajo. Si estás solo, llama a alguien y pregúntale por su vida, no por su trabajo. Cultiva la identidad fuera de la profesión.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Conversación sin trabajo).",
                "resourceId": "relationships-17"
            }
        }
    },
    {
        "day": 18,
        "tasks": {
            "thoughts": {
                "area": "thoughts",
                "title": "Rumia nocturna sobre pacientes",
                "description": "¿Te cuesta dormir porque das vueltas a pacientes o situaciones difíciles? ¿A casos que no sabes si hiciste bien? Identifica qué tipo de pensamientos aparecen. Solo identificarlos ya ayuda.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Rumia nocturna sobre pacientes).",
                "resourceId": "thoughts-18"
            },
            "activities": {
                "area": "activities",
                "title": "Cierre de jornada consciente",
                "description": "Antes de irte a casa (o antes de cenar), escribe **tres cosas** que hayas hecho bien hoy. Pueden ser pequeñas: escuché con atención, resolví una urgencia, ayudé a un compañero, sonreí a pesar del cansancio, un paciente agradeció. Termina el día reconociéndote.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Cierre de jornada consciente).",
                "resourceId": "activities-18"
            },
            "relationships": {
                "area": "relationships",
                "title": "Conexión previa al sueño",
                "description": "Antes de dormir, dedica 5 minutos a algo agradable no laboral: un momento del día que hayas disfrutado, algo que esperes con ilusión, una persona a la que quieras. Termina el día con pensamientos amables.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Conexión previa al sueño).",
                "resourceId": "relationships-18"
            }
        }
    },
    {
        "day": 19,
        "tasks": {
            "thoughts": {
                "area": "thoughts",
                "title": "Anclaje en el presente",
                "description": "Cuando notes ansiedad en medio de la jornada (una situación difícil, una sobrecarga), haz esto: mira a tu alrededor e identifica **3 cosas que veas, 3 sonidos que escuches, 3 sensaciones en tu cuerpo**. Esto te trae al presente y sale del bucle mental.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Anclaje en el presente).",
                "resourceId": "thoughts-19"
            },
            "activities": {
                "area": "activities",
                "title": "Respiración 4-7-8",
                "description": "Practica esta respiración: inhala por la nariz 4 segundos, retén 7 segundos, exhala por la boca 8 segundos. Repite 4 veces. Activa el sistema nervioso parasimpático (relajación). Puedes hacerlo en el baño, en un almacén, en cualquier lugar.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Respiración 4-7-8).",
                "resourceId": "activities-19"
            },
            "relationships": {
                "area": "relationships",
                "title": "Apoyo entre pares inmediato",
                "description": "Hoy, si tienes un momento de alta presión, busca a un compañero de confianza y dile: \"Necesito 2 minutos contigo, ¿puedes?\". No para pedir solución, solo para desahogar. Verbalizar con alguien que entiende reduce la intensidad.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Apoyo entre pares inmediato).",
                "resourceId": "relationships-19"
            }
        }
    },
    {
        "day": 20,
        "tasks": {
            "thoughts": {
                "area": "thoughts",
                "title": "Comer en piloto automático",
                "description": "¿Cómo comes habitualmente en el trabajo? ¿Delante de pantallas? ¿Rápido? ¿Sin saborear? ¿Saltándote comidas? Reflexiona sobre cómo afecta eso a tu energía y tu estado de ánimo.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Comer en piloto automático).",
                "resourceId": "thoughts-20"
            },
            "activities": {
                "area": "activities",
                "title": "Comida consciente hoy",
                "description": "Hoy, en una comida (aunque sea un bocadillo), haz esto: come sin pantallas, mastica despacio, saborea los primeros bocados. Dedica al menos 10 minutos solo a comer. Nota la diferencia.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Comida consciente hoy).",
                "resourceId": "activities-20"
            },
            "relationships": {
                "area": "relationships",
                "title": "Compartir comida",
                "description": "Si puedes, come hoy con alguien. Compartir la comida fortalece vínculos y hace la pausa más reparadora. Si no es posible, al menos saluda y sonríe a quien veas en el comedor.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Compartir comida).",
                "resourceId": "relationships-20"
            }
        }
    },
    {
        "day": 21,
        "tasks": {
            "thoughts": {
                "area": "thoughts",
                "title": "Balance de la semana 3",
                "description": "Revisa los 7 días. ¿Qué hábitos de recuperación has incorporado? ¿Micro-pausas? ¿Desconexión? ¿Mejor sueño? ¿Respiración? ¿Qué ha funcionado mejor? Escribe **3 ideas**.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Balance de la semana 3).",
                "resourceId": "thoughts-21"
            },
            "activities": {
                "area": "activities",
                "title": "Un hábito de recuperación para mantener",
                "description": "Elige **un hábito** de recuperación de esta semana que quieras mantener. Micro-pausas, respiración, cierre de jornada, comida consciente... Escríbelo y pon un recordatorio.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Un hábito de recuperación para mantener).",
                "resourceId": "activities-21"
            },
            "relationships": {
                "area": "relationships",
                "title": "Compartir lo aprendido",
                "description": "Comparte con alguien (compañero, amigo, familiar) algo de lo que has aprendido esta semana sobre recuperación. Enseñar refuerza el aprendizaje y ayuda a otros.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Compartir lo aprendido).",
                "resourceId": "relationships-21"
            }
        }
    },
    {
        "day": 22,
        "tasks": {
            "thoughts": {
                "area": "thoughts",
                "title": "Mi historia de vocación",
                "description": "Recuerda el momento en que decidiste dedicarte a enfermería. ¿Qué te llevó a elegir esta profesión? ¿Qué querías aportar? ¿Qué ilusión tenías? Escribe 3 frases de aquella vocación inicial.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Mi historia de vocación).",
                "resourceId": "thoughts-22"
            },
            "activities": {
                "area": "activities",
                "title": "Una acción con propósito hoy",
                "description": "Elige un momento del día y, mientras realizas una tarea rutinaria, recuérdate a ti mismo a qué contribuye. Por ejemplo, tomar constantes: \"estoy vigilando la vida de alguien\". Poner una medicación: \"estoy aliviando el sufrimiento\". Conecta la tarea con el propósito.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Una acción con propósito hoy).",
                "resourceId": "activities-22"
            },
            "relationships": {
                "area": "relationships",
                "title": "Pregunta de propósito a un compañero",
                "description": "Hoy, pregunta a alguien: \"¿Qué es lo que más te gusta de tu trabajo?\". Escucha su respuesta sin juzgar ni comparar. Conocer el propósito ajeno conecta y recuerda el propio.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Pregunta de propósito a un compañero).",
                "resourceId": "relationships-22"
            }
        }
    },
    {
        "day": 23,
        "tasks": {
            "thoughts": {
                "area": "thoughts",
                "title": "Mis tres valores",
                "description": "Elige **tres valores** que sean importantes para ti en tu profesión (pueden ser: compasión, excelencia, respeto, empatía, rigor, paciencia, equidad, trabajo en equipo...). Escribe una frase de cómo se refleja cada uno en tu día a día.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Mis tres valores).",
                "resourceId": "thoughts-23"
            },
            "activities": {
                "area": "activities",
                "title": "Actuar según un valor hoy",
                "description": "Hoy, elige **uno de tus valores** y busca una acción concreta para vivirlo. Si es compasión, sé especialmente amable con alguien. Si es rigor, revisa algo con más atención. Si es trabajo en equipo, ayuda a un compañero.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Actuar según un valor hoy).",
                "resourceId": "activities-23"
            },
            "relationships": {
                "area": "relationships",
                "title": "Reconocer valores en otros",
                "description": "Observa a un compañero hoy e identifica qué valores ves en él/ella. Si puedes, díselo: \"Valoro mucho cómo escuchas a los pacientes\" o \"Me gusta tu paciencia con las familias\". Reconocer valores en otros fortalece.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Reconocer valores en otros).",
                "resourceId": "relationships-23"
            }
        }
    },
    {
        "day": 24,
        "tasks": {
            "thoughts": {
                "area": "thoughts",
                "title": "Tres cosas por las que estar agradecido hoy",
                "description": "Al final del día, escribe **tres cosas** relacionadas con el trabajo por las que estés agradecido. Pueden ser muy pequeñas: un paciente que sonrió, un compañero que ayudó, un momento de calma, un problema resuelto.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Tres cosas por las que estar agradecido hoy).",
                "resourceId": "thoughts-24"
            },
            "activities": {
                "area": "activities",
                "title": "Mensaje de agradecimiento",
                "description": "Envía un mensaje (email, chat, nota) a alguien agradeciéndole algo concreto. No esperes nada a cambio. El agradecimiento expresado beneficia tanto a quien lo da como a quien lo recibe.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Mensaje de agradecimiento).",
                "resourceId": "activities-24"
            },
            "relationships": {
                "area": "relationships",
                "title": "Cadena de gratitud",
                "description": "Si alguien te agradece algo hoy, responde: \"Me alegra que lo valores. A mí también me ayudó X\". Extiende la cadena. La gratitud compartida crea cultura.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Cadena de gratitud).",
                "resourceId": "relationships-24"
            }
        }
    },
    {
        "day": 25,
        "tasks": {
            "thoughts": {
                "area": "thoughts",
                "title": "Mi red de apoyo en el trabajo",
                "description": "Identifica a **3 personas** en tu trabajo con las que puedas contar en momentos difíciles. ¿Hay alguien a quien le faltes tú? ¿Tu red es suficientemente diversa? ¿Tienes apoyo real o solo cordialidad?",
                "actionItem": "Pon en práctica el ejercicio de hoy (Mi red de apoyo en el trabajo).",
                "resourceId": "thoughts-25"
            },
            "activities": {
                "area": "activities",
                "title": "Un gesto de apoyo no pedido",
                "description": "Hoy, ofrece apoyo a alguien sin que te lo pida. Puede ser algo pequeño: \"¿Quieres que te cubra 5 minutos?\", \"Veo que hoy tienes mucho, ¿necesitas algo?\", \"¿Te apetece desahogarte un rato?\".",
                "actionItem": "Pon en práctica el ejercicio de hoy (Un gesto de apoyo no pedido).",
                "resourceId": "activities-25"
            },
            "relationships": {
                "area": "relationships",
                "title": "Comida o café con alguien",
                "description": "Hoy, tómate un café o come con alguien con quien no suelas hablar. No para hablar de trabajo, sino para conocerle un poco más. Las relaciones informales sostienen al equipo.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Comida o café con alguien).",
                "resourceId": "relationships-25"
            }
        }
    },
    {
        "day": 26,
        "tasks": {
            "thoughts": {
                "area": "thoughts",
                "title": "Liderazgo sin cargo",
                "description": "Reflexiona: ¿Qué significa liderar sin tener un cargo de jefe? ¿Influyes en otros con tu actitud? ¿Con tu ejemplo? ¿Cómo puedes ser referente aunque no mandes?",
                "actionItem": "Pon en práctica el ejercicio de hoy (Liderazgo sin cargo).",
                "resourceId": "thoughts-26"
            },
            "activities": {
                "area": "activities",
                "title": "Una acción de liderazgo hoy",
                "description": "Hoy, haz algo que inspire o facilite a otros: proponer una mejora, mediar en un conflicto, reconocer el trabajo de alguien, organizar algo que beneficie al equipo, normalizar una pausa, pedir una reunión para hablar de bienestar.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Una acción de liderazgo hoy).",
                "resourceId": "activities-26"
            },
            "relationships": {
                "area": "relationships",
                "title": "Inspirar con ejemplo",
                "description": "Elige un valor o hábito que quieras transmitir (calma, escucha, respeto, paciencia) y simplemente **practícalo** hoy. Si quieres más calma en el equipo, practica la calma. El ejemplo conecta más que las palabras.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Inspirar con ejemplo).",
                "resourceId": "relationships-26"
            }
        }
    },
    {
        "day": 27,
        "tasks": {
            "thoughts": {
                "area": "thoughts",
                "title": "El propósito de mi equipo",
                "description": "¿Cuál crees que es el propósito de tu equipo? ¿A qué contribuye en conjunto? Si no lo tienes claro, ¿dónde podrías averiguarlo o proponerlo? ¿Compartes ese propósito?",
                "actionItem": "Pon en práctica el ejercicio de hoy (El propósito de mi equipo).",
                "resourceId": "thoughts-27"
            },
            "activities": {
                "area": "activities",
                "title": "Alinear una tarea con el propósito colectivo",
                "description": "Elige una tarea de hoy y pregúntate: ¿cómo contribuye esta tarea al propósito del equipo? Aunque sea de forma pequeña, toma conciencia de ello.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Alinear una tarea con el propósito colectivo).",
                "resourceId": "activities-27"
            },
            "relationships": {
                "area": "relationships",
                "title": "Conversación sobre propósito",
                "description": "Hoy, con un compañero, pregúntale: \"¿Tú ves claro hacia dónde vamos como equipo? ¿Qué te parece?\". No hace falta resolverlo, solo conversar. Compartir visiones conecta.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Conversación sobre propósito).",
                "resourceId": "relationships-27"
            }
        }
    },
    {
        "day": 28,
        "tasks": {
            "thoughts": {
                "area": "thoughts",
                "title": "Balance de la semana 4",
                "description": "Revisa los 7 días. ¿Has conectado con el propósito? ¿Has reconocido valores? ¿Has agradecido? ¿Has fortalecido apoyos? Escribe **3 ideas clave**.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Balance de la semana 4).",
                "resourceId": "thoughts-28"
            },
            "activities": {
                "area": "activities",
                "title": "Un hábito de propósito para mantener",
                "description": "Elige **un hábito** de esta semana que quieras mantener. Puede ser la gratitud diaria, el reconocimiento a compañeros, o la conexión con el propósito. Escríbelo.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Un hábito de propósito para mantener).",
                "resourceId": "activities-28"
            },
            "relationships": {
                "area": "relationships",
                "title": "Agradecer al equipo",
                "description": "Hoy, agradece (mentalmente o en persona) a las personas que forman parte de tu equipo. Saber que no estás solo es clave.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Agradecer al equipo).",
                "resourceId": "relationships-28"
            }
        }
    },
    {
        "day": 29,
        "tasks": {
            "thoughts": {
                "area": "thoughts",
                "title": "El mapa de mis 28 días",
                "description": "Siéntate con calma. Repasa mentalmente las 4 semanas: Conciencia, Límites, Recuperación, Propósito. ¿Qué ejercicio recuerdas de cada semana? ¿Cuál te impactó más? ¿Cuál te costó más? ¿Cuál te gustaría repetir? Escribe una frase para cada semana.",
                "actionItem": "Pon en práctica el ejercicio de hoy (El mapa de mis 28 días).",
                "resourceId": "thoughts-29"
            },
            "activities": {
                "area": "activities",
                "title": "Mi top 3 de herramientas",
                "description": "De todos los ejercicios de estas 4 semanas, elige **los 3 que más útiles te han resultado**. No los que \"deberían\" ser útiles, sino los que realmente te han ayudado. Escríbelos en una frase cada uno. Por ejemplo: \"la pausa de 2 minutos entre pacientes\", \"el detector de pensamientos\", \"el ritual de cierre de jornada\".",
                "actionItem": "Pon en práctica el ejercicio de hoy (Mi top 3 de herramientas).",
                "resourceId": "activities-29"
            },
            "relationships": {
                "area": "relationships",
                "title": "Compartir lo aprendido con alguien",
                "description": "Hoy, comparte con alguien (un compañero de confianza, un amigo, tu pareja) algo de lo que has aprendido en estas 4 semanas. No hace falta que sea una charla profunda. Puede ser simplemente: \"Estas semanas he estado haciendo un programa de autocuidado y hay una cosa que me ha ayudado mucho: ...\". Verbalizar lo aprendido lo consolida.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Compartir lo aprendido con alguien).",
                "resourceId": "relationships-29"
            }
        }
    },
    {
        "day": 30,
        "tasks": {
            "thoughts": {
                "area": "thoughts",
                "title": "Carta a mi yo del día 1",
                "description": "Escribe una breve carta a la persona que empezó este programa hace 30 días. Puede ser muy sencilla. Algunas ideas: ¿Qué le dirías? ¿De qué le darías las gracias? ¿Qué le recomendarías para los próximos meses? ¿Qué ha cambiado en ti? No hace falta que sea larga. Cuando termines, guárdala. Dentro de unos meses, releerla te recordará este momento.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Carta a mi yo del día 1).",
                "resourceId": "thoughts-30"
            },
            "activities": {
                "area": "activities",
                "title": "Mi plan para los próximos 30 días",
                "description": "Vas a elegir **un solo hábito** de los 30 días para mantener durante el próximo mes. Solo uno. El que más sentido tenga para ti. Ahora concreta: ¿Cuándo lo harás? (ej. \"antes de empezar el turno\", \"en la primera pausa\", \"al llegar a casa\", \"los lunes y jueves\"). ¿Cómo te acordarás? (alarma, nota, rutina). Escríbelo con el máximo detalle. Un hábito pequeño mantenido es mejor que muchos abandonados.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Mi plan para los próximos 30 días).",
                "resourceId": "activities-30"
            },
            "relationships": {
                "area": "relationships",
                "title": "Celebración consciente",
                "description": "Has completado 30 días. Eso merece reconocimiento. Hoy, date un pequeño momento de celebración. Puede ser algo muy sencillo: un café especial que te guste, un paseo sin prisa, 10 minutos de silencio, compartir con alguien que has terminado, o simplemente decirte en voz alta: \"Lo he conseguido\". Reconoce tu esfuerzo. Te lo mereces.",
                "actionItem": "Pon en práctica el ejercicio de hoy (Celebración consciente).",
                "resourceId": "relationships-30"
            }
        }
    }
];

export const getChallengeByDay = (day: number) => challenges.find(c => c.day === day);
