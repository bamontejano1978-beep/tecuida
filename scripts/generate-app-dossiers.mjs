// ============================================================================
// Dossieres profesionales por aplicación — VCA TE CUIDA
// Uso:  node scripts/generate-app-dossiers.mjs
// Salida: ../dossiers/*.html y ../dossiers/*.pdf
// ============================================================================
import { chromium } from 'playwright-core'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const OUT = path.join(ROOT, 'dossiers')
if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true })

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const PUBLIC = path.join(ROOT, 'public')
const APPS_ROOT = path.resolve(ROOT, '..') // raíz del monorepo (contiene apps/)
const iconUrl = (p) => {
  if (!p) return null
  const full = path.join(PUBLIC, p)
  return dataUri(full) || 'file:///' + full.replace(/\\/g, '/')
}
const fileUrl = (p) => 'file:///' + p.replace(/\\/g, '/')

// Incrusta un fichero como data URI (base64) para que el HTML sea autocontenido
const dataUri = (p) => {
  try {
    const buf = fs.readFileSync(p)
    const mime = p.endsWith('.svg') ? 'image/svg+xml' : 'image/png'
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch {
    return null
  }
}

const FECHA = 'Septiembre 2026'
const MUNI = 'Villafranca de los Barros'
const PORTAL = 'villafranca-de-los-barros.tecuida.group'

// ============================================================================
// CONTENIDOS (extraídos de las migraciones 026/028/055/057/062-066 y del
// código real de las aplicaciones)
// ============================================================================
const APPS = [
  {
    file: 'Dossier_Reto30',
    shots: 'reto30',
    nombre: 'Reto30',
    tagline: 'Transforma tu mente en 30 días: reflexión, actividad y relaciones, a diario.',
    categoria: 'Programa guiado de bienestar',
    brand: '#14b8a6',
    dark: '#0f172a',
    icon: iconUrl('reto30-icon-512.png'),
    monogram: 'R30',
    objetivo:
      'Reto30 es el programa estrella de VCA TE CUIDA: un itinerario de 30 días que entrena el bienestar emocional con tres pilares diarios — reflexión para ordenar el pensamiento, actividad para conectar con el cuerpo y relaciones para nutrir los vínculos. Cada día combina una idea fuerza, una práctica guiada breve y una invitación a aplicarla en la vida real, con un diseño envolvente en tema oscuro y celebración al completar cada jornada. Está pensado para población adulta sin experiencia previa en mindfulness: no exige saber meditar, solo constancia y unos 15 minutos al día.',
    ficha: [
      ['Tipo', 'Programa guiado · 30 días'],
      ['Estructura', '30 días × 3 tareas diarias (reflexión, actividad y relaciones)'],
      ['Dedicación', 'En torno a 15 minutos al día'],
      ['Público', 'Público general y personas adultas'],
      ['Tecnología', 'App nativa de TE CUIDA (PWA)'],
      ['Acceso', 'Portal municipal → /apps/reto30'],
      ['Datos', 'Progreso guardado en el dispositivo'],
    ],
    features: [
      ['🧠', 'Pilar Reflexión', 'Un entrenamiento diario del pensamiento: filtros mentales, catastrofismos, etiquetas, “deberías” y pensamiento dicotómico.'],
      ['☀️', 'Pilar Actividad', 'Micro-activaciones para el cuerpo que anclan la práctica del día y rompen el piloto automático.'],
      ['❤️', 'Pilar Relaciones', 'Ejercicios para cuidar vínculos: no personalizar, escucha, límites sanos y comunicación.'],
      ['📅', 'Itinerario con hitos', 'Días señalados para sostener la motivación: revisión semanal (día 7), ecuador del reto (día 15) y celebración final (día 30).'],
      ['🌙', 'Diseño envolvente', 'Tema oscuro con glassmorphism, frases inspiradoras diarias y celebración al completar cada día.'],
      ['📈', 'Progreso sin fricción', 'Cada día completado queda registrado en el dispositivo: vuelves justo donde lo dejaste.'],
    ],
    experiencia: [
      'El ciudadano accede desde su área privada en el portal municipal y abre Reto30.',
      'Cada día presenta los tres pilares con textos breves y cercanos, sin tecnicismos.',
      'Completa la práctica guiada del día (respiración, atención, movimiento).',
      'Anota su experiencia en un par de frases y marca el día como completado.',
      'Los hitos de los días 7, 15 y 30 invitan a revisar el cambio acumulado.',
    ],
    contenidos: {
      intro: '30 días × 3 tareas (una por pilar). Muestra del itinerario:',
      items: [
        'Día 1 — Cazando Pensamientos · Pequeños Placeres · Conexión Consciente',
        'Día 2 — Realidad vs. Pensamiento · Movimiento Suave · Escucha Activa',
        'Día 3 — El Filtro Mental · Desconexión Digital · Decir que No',
        'Día 4 — Catastrofismo · Nutrición Consciente · Pedir Ayuda',
        'Día 5 — Etiquetas Negativas · Entorno Ordenado · Cumplido Sincero',
        'Día 7 — Revisión Semanal',
        'Día 9 — Los “Debería” · Disculpa Sincera',
        'Día 15 — Ecuador del Reto',
        'Día 24 — Comparación Social · Respetar el Silencio',
        'Día 27 — Tener Razón · Risa Terapéutica',
        'Día 30 — Repaso de Logros · Celebración del Éxito · Celebrar Juntos',
        'Cada tarea incluye una acción concreta para aplicar ese mismo día',
      ],
    },
    privacidad:
      'El progreso del programa se guarda en el dispositivo del usuario y no viaja a la plataforma. La cuenta ciudadana gobierna únicamente el acceso desde el portal municipal; ningún dato personal se comparte con terceros.',
  },
  {
    file: 'Dossier_Mindful30_Adolescentes',
    shots: 'm30-adolescentes',
    nombre: 'Mindful30 Adolescentes',
    tagline: '30 días de calma y foco para afrontar el instituto, las emociones y las redes.',
    categoria: 'Programa guiado · 12 a 17 años',
    brand: '#7c3aed',
    dark: '#12071f',
    icon: null,
    monogram: 'M30',
    objetivo:
      'Mindful30 Adolescentes adapta el entrenamiento de mindfulness al lenguaje y a las preocupaciones reales de chavales de 12 a 17 años: el estrés del instituto, las emociones intensas, la comparación constante y la presión de las redes sociales. Durante 30 días, cada jornada propone una lectura corta y honesta, una práctica guiada de 3 a 10 minutos y un reto para aplicar en el día a día. El tono es cercano y sin sermones — “sin juicios, sin prisas, a tu ritmo” — lo que lo hace idóneo para desplegarse con institutos, servicios de juventud y familias.',
    ficha: [
      ['Tipo', 'Programa guiado · 30 días'],
      ['Estructura', '5 módulos × 6 lecciones'],
      ['Dedicación', '12–15 minutos al día'],
      ['Público', 'Adolescentes de 12 a 17 años'],
      ['Tecnología', 'App nativa de TE CUIDA (PWA)'],
      ['Acceso', 'Portal municipal → /apps/mindful30-adolescentes'],
      ['Datos', 'Progreso guardado en el dispositivo'],
    ],
    features: [
      ['🫁', 'Respiración consciente', 'Prácticas guiadas desde 3 minutos para regular la activación física del estrés.'],
      ['📱', 'Bienestar digital', 'Herramientas concretas para la presión de redes: piloto automático, comparación y desconexión.'],
      ['🎛️', 'Gestión emocional', 'Etiquetar juicios, nombrar emociones y crear espacio entre estímulo y reacción.'],
      ['🛡️', 'Autoestima protegida', 'Trabajo de voz interior, autocompasión y relaciones que suman frente a las que restan.'],
      ['🎧', 'Lecturas del día a día', 'Textos escritos “en su idioma”: exámenes, quedadas, TikTok, tutoría.'],
      ['✅', 'Reto diario aplicado', 'Cada lección termina con una acción concreta y realizable ese mismo día.'],
    ],
    experiencia: [
      'El adolescente accede desde el portal municipal con su cuenta o código del programa.',
      'Cada día: una lectura corta con ejemplos de su vida real (insti, móvil, amistades).',
      'Práctica guiada de 3 a 10 minutos para entrenar la atención y la calma.',
      'Reto aplicado del día y registro de progreso en su itinerario de 30 días.',
      'Al completar cada módulo, el itinerario de 30 días avanza y queda guardado en su dispositivo.',
    ],
    contenidos: {
      intro: '5 módulos con 6 lecciones cada uno:',
      items: [
        'M1 — Tu mente y tú: primeras herramientas',
        'M2 — El cuerpo habla: estrés y calma física',
        'M3 — Emociones, pantallas y presión social',
        'M4 — Autoestima y relaciones que suman',
        'M5 — Tu estilo de vida consciente',
        'Día 1 — ¿Qué es eso del mindfulness?',
        'Día 2 — ¿Piloto automático? Yo no… espera, sí',
        'Día 3 — El juicio automático (sí, también lo haces)',
        '+ 27 lecciones guiadas hasta el día 30',
      ],
    },
    privacidad:
      'El acceso se realiza con la cuenta municipal (códigos del programa) y el progreso de la práctica se guarda en el dispositivo, sin enviarse a la plataforma. El contenido no recopila datos sensibles de menores.',
  },
  {
    file: 'Dossier_Mindful30_Cuidadores',
    shots: 'm30-cuidadores',
    nombre: 'Mindful30 Cuidadores',
    tagline: '30 días de autocuidado para quienes cuidan: menos carga, más apoyo.',
    categoria: 'Programa guiado · personas cuidadoras',
    brand: '#7c3aed',
    dark: '#12071f',
    icon: iconUrl('mindful30-caregivers-icon-512.png'),
    monogram: 'M30',
    objetivo:
      'Mindful30 Cuidadores está dedicado a un colectivo con una demanda social enorme y muy poco tiempo para sí mismo: las personas que cuidan — de hijos, de mayores o de personas dependientes. Durante 30 días propone prácticas breves y realistas para gestionar la carga mental, poner límites sin culpa, recuperarse del desgaste y fortalecer el apoyo del entorno y del equipo. Cada sesión cabe en los huecos reales del cuidado: entre 5 y 15 minutos, sin necesidad de desplazarse ni de condiciones especiales.',
    ficha: [
      ['Tipo', 'Programa guiado · 30 días'],
      ['Estructura', 'Itinerario diario con prácticas breves'],
      ['Dedicación', '5–15 minutos al día'],
      ['Público', 'Familias cuidadoras y profesionales del cuidado'],
      ['Tecnología', 'App nativa de TE CUIDA (PWA)'],
      ['Acceso', 'Portal municipal → /apps/mindful30-cuidadores'],
      ['Datos', 'Progreso en el dispositivo; sin datos de la persona cuidada'],
    ],
    features: [
      ['🧘', 'Pausas conscientes', 'Escáner corporal, pausa antes de reaccionar y saludo consciente para el arranque del día.'],
      ['🗺️', 'Inventario de situaciones', 'Mapa de los momentos de mayor carga para anticipar y preparar respuestas.'],
      ['🔍', 'Detective de pensamientos', 'Identificar y reformular la autocrítica constante (“no doy abasto”, “debo más”).'],
      ['⛔', 'Límites sin culpa', 'Prácticas para decir no, delegar y sostener límites en el cuidado diario.'],
      ['🔋', 'Recuperación', 'Micro-descansos y rutinas de reposición energética en jornadas fragmentadas.'],
      ['🤝', 'Apoyo del equipo', 'Fortalecer la red familiar y profesional: pedir ayuda y coordinar el cuidado.'],
    ],
    experiencia: [
      'La persona cuidadora accede desde el portal municipal en cualquier hueco del día.',
      'Sesión breve con práctica guiada: escáner, pausa consciente o reformulación.',
      'Registro simple: cómo estoy hoy y qué necesito (sin cuestionarios pesados).',
      'El itinerario avanza a su ritmo: sesiones recuperables, sin presión.',
      'Progreso guardado en el dispositivo para retomar el itinerario donde lo dejó.',
    ],
    contenidos: {
      intro: 'Muestra de sesiones reales del programa:',
      items: [
        'Escáner corporal antes de empezar',
        'La primera pausa consciente',
        'Saludo consciente',
        'Inventario de situaciones',
        'La pausa antes de reaccionar',
        '¿Cómo estás realmente?',
        'Detective de pensamientos',
        'Reformulación breve',
        '+ 22 sesiones más hasta el día 30',
      ],
    },
    privacidad:
      'El progreso se guarda en el dispositivo del usuario. El programa no exige ningún dato sobre la persona cuidada: únicamente el itinerario de autocuidado.',
  },
  {
    file: 'Dossier_Mindful30_Infancia',
    shots: 'm30-infancia',
    nombre: 'Mindful30 Infancia',
    tagline: '30 días para familias con niños: calma, vínculo y juego consciente.',
    categoria: 'Programa guiado · familias con infancia',
    brand: '#0090ff',
    dark: '#04182b',
    icon: iconUrl('mindful30-infancia-icon-512.png'),
    monogram: 'M30',
    objetivo:
      'Mindful30 Infancia acompaña a las familias con hijos pequeños en el día a día de la crianza. Durante 30 días, las familias practican juntos herramientas sencillas: momentos de calma compartidos, escucha activa, límites puestos con cariño, juego consciente y fortalecimiento del vínculo positivo. Cada práctica está diseñada para hacerse en casa, en pocos minutos y sin material especial, convirtiendo rutinas cotidianas (la comida, el baño, la hora de dormir) en oportunidades de conexión y regulación emocional.',
    ficha: [
      ['Tipo', 'Programa guiado · 30 días'],
      ['Estructura', 'Prácticas diarias para hacer en familia'],
      ['Dedicación', '5–10 minutos al día'],
      ['Público', 'Familias con hijos en etapa de infancia'],
      ['Tecnología', 'PWA integrada en el gateway municipal'],
      ['Acceso', 'Portal municipal → /apps/mindful30-infancia'],
      ['Datos', 'Local-first: sin cuentas para los menores'],
    ],
    features: [
      ['😌', 'Calma compartida', 'Rutinas breves de respiración y relajación que niños y adultos hacen juntos.'],
      ['👂', 'Escucha activa', 'Micro-prácticas para sostener la atención plena en lo que el niño cuenta.'],
      ['🧸', 'Límites con cariño', 'Formulaciones prácticas para poner normas sin gritos ni culpas.'],
      ['🎲', 'Juego consciente', 'Juegos de atención y conexión para convertir minutos cotidianos en vínculo.'],
      ['🪢', 'Vínculo positivo', 'Rituales diarios de reconocimiento y afecto que consolidan la relación.'],
      ['🏠', 'En casa y sin material', 'Todo se practica con lo que hay en cualquier hogar, en 5–10 minutos.'],
    ],
    experiencia: [
      'La familia accede desde el portal municipal y abre el programa.',
      'Cada día propone una práctica para hacer juntos: calma, juego o escucha.',
      'El adulto guía; el niño participa con su lenguaje y su ritmo.',
      'Las rutinas se integran en momentos que ya existen (comida, baño, sueño).',
      'El progreso se guarda en el dispositivo: sin cuentas ni datos de menores.',
    ],
    contenidos: {
      intro: 'Los 5 ámbitos de práctica del programa:',
      items: [
        'Calma y regulación compartida',
        'Escucha activa en familia',
        'Límites con cariño',
        'Juego consciente',
        'Vínculo positivo diario',
        '30 días de prácticas acumulativas',
        'Guías breves para la persona adulta',
        'Rituales para momentos clave del día',
      ],
    },
    privacidad:
      'La aplicación es local-first: el progreso se guarda en el dispositivo y no se registran datos personales de menores. El acceso desde el portal se realiza mediante el gateway municipal, sin alta adicional.',
  },
  {
    file: 'Dossier_Economia_Familiar',
    shots: 'familia',
    nombre: 'Economía Familiar',
    tagline: 'Convierte los hábitos y tareas del hogar en misiones con recompensas.',
    categoria: 'Herramienta de gamificación familiar',
    brand: '#8b5cf6',
    dark: '#150a29',
    icon: iconUrl('family-gamification-icon-512.png'),
    monogram: 'EF',
    objetivo:
      'Economía Familiar es la herramienta de TE CUIDA para organizar la convivencia en casa con game design: las tareas y hábitos se convierten en misiones, las misiones otorgan monedas, las monedas se canjean por recompensas acordadas en familia y toda validación pasa por una persona adulta. El resultado es un sistema claro y motivador que reduce los conflictos cotidianos (“haz la cama”, “guarda la mesa”) porque las reglas son visibles, justas y negociadas. Navegación pensada para toda la familia: Inicio, Misiones, Premios y Familia.',
    ficha: [
      ['Tipo', 'Herramienta de gamificación familiar'],
      ['Estructura', 'Misiones · monedas · niveles · premios'],
      ['Dedicación', 'Uso libre, ritmo familiar'],
      ['Público', 'Familias con hijos de 4 a 14 años'],
      ['Tecnología', 'App nativa de TE CUIDA (PWA local-first)'],
      ['Acceso', 'Portal municipal → /apps/family-gamification'],
      ['Datos', 'Progreso guardado en el dispositivo'],
    ],
    features: [
      ['🎯', 'Misiones configurables', 'La familia crea sus misiones: “Hacer la cama”, “Preparar mochila”, “Gesto amable”… con su valor en monedas.'],
      ['🪙', 'Monedas y niveles', 'Cada misión completada suma monedas; los niveles dan sentido al esfuerzo sostenido.'],
      ['🎁', 'Premios acordados', 'Recompensas definidas por la familia: “Tiempo extra de juego”, “Plan especial”… canjeables con monedas.'],
      ['✅', 'Validación adulta', 'Las misiones requieren confirmación de una persona adulta: confianza con supervisión.'],
      ['👥', 'Espacio Familia', 'Vista global de hijos, misiones activas y economía familiar en un solo panel.'],
      ['📴', 'Sin fricción de entrada', 'Local-first: el progreso se guarda en el dispositivo y la app funciona sin registros.'],
    ],
    experiencia: [
      'La familia configura hijos, misiones y premios en cinco minutos.',
      'Los niños consultan sus misiones del día desde Inicio o Misiones.',
      'Al completar una misión, un adulto la valida y el niño recibe monedas.',
      'Las monedas se canjean en Premios por las recompensas acordadas.',
      'Todo el historial queda en el dispositivo, siempre a un toque.',
    ],
    contenidos: {
      intro: 'Las cuatro pantallas de la herramienta:',
      items: [
        'Inicio — resumen del día y estado familiar',
        'Misiones — catálogo configurable por la familia',
        'Premios — recompensas y coste en monedas',
        'Familia — perfiles, niveles y validaciones',
        'Ejemplos de misión: hacer la cama, preparar la mochila, un gesto amable',
        'Ejemplos de premio: tiempo extra de juego, plan especial',
      ],
    },
    privacidad:
      'Aplicación local-first: los datos se guardan en el dispositivo del usuario para reducir fricción de entrada y preservar la intimidad familiar. No se registran datos de menores en servidores.',
  },
  {
    file: 'Dossier_Focus_Family',
    shots: 'focus',
    nombre: 'Focus Family (Organizatron)',
    tagline: 'Organización familiar con Pomodoro, planificador, pactos y feedback semanal.',
    categoria: 'Herramienta de organización familiar',
    brand: '#7c3aed',
    dark: '#12071f',
    icon: iconUrl('organizatron-icon-512.png'),
    monogram: 'FF',
    objetivo:
      'Focus Family es la herramienta de organización para hogares con adolescentes: estudio con técnica Pomodoro, planificador de tareas y compromisos, sistema de recompensas, pactos familiares y un feedback semanal estructurado. Todo funciona sin cuentas ni registros: los datos viven en el dispositivo y el intercambio entre miembros de la familia es siempre voluntario, mediante un código QR o un archivo JSON. Es la compañera ideal del programa Mindful30 Adolescentes: entrena la constancia y la autorresponsabilidad con un método visual y dialogado.',
    ficha: [
      ['Tipo', 'Herramienta de organización y estudio'],
      ['Estructura', 'Pomodoro · planificador · pactos · feedback'],
      ['Dedicación', 'Uso libre, ritmo propio'],
      ['Público', 'Adolescentes y sus familias'],
      ['Tecnología', 'Aplicación web local-first (PWA)'],
      ['Acceso', 'Portal municipal → /apps/organizatron'],
      ['Datos', 'En el dispositivo; intercambio voluntario QR/JSON'],
    ],
    features: [
      ['⏱️', 'Pomodoro integrado', 'Sesiones de estudio con ciclos de foco y descanso, adaptadas al ritmo escolar.'],
      ['🗓️', 'Planificador', 'Tareas, compromisos y recordatorios con vista clara de la semana.'],
      ['🏆', 'Recompensas', 'Sistema sencillo de metas cumplidas y reconocimiento acordado en casa.'],
      ['📜', 'Pactos familiares', 'Acuerdos por escrito entre adolescentes y adultos: reglas visibles y revisables.'],
      ['📊', 'Feedback semanal', 'Balance compartido de cómo fue la semana, pensado para dialogar sin sermonear.'],
      ['🔐', 'Sin cuentas', 'Nada que registrar: los datos se guardan en el dispositivo y se comparten solo si se quiere.'],
    ],
    experiencia: [
      'El adolescente abre la herramienta desde el portal municipal, sin registro.',
      'Planifica la semana y lanza sus sesiones Pomodoro de estudio.',
      'Marca tareas cumplidas y revisa sus metas y recompensas.',
      'En familia, cierra pactos y hace el balance semanal con el feedback guiado.',
      'Si quieren sincronizarse, comparten su estado por QR o archivo JSON.',
    ],
    contenidos: {
      intro: 'Qué incluye la herramienta:',
      items: [
        'Temporizador Pomodoro configurable',
        'Planificador semanal de tareas',
        'Sistema de recompensas familiares',
        'Pactos familiares con revisión',
        'Feedback semanal estructurado',
        'Intercambio por QR o archivo JSON',
        'Modo sin cuentas (local-first)',
        'PWA instalable en móvil y ordenador',
      ],
    },
    privacidad:
      'Local-first por diseño: sin cuentas, sin servidores de datos personales. El intercambio familiar de información es voluntario y se realiza mediante QR o archivo JSON controlado por el propio usuario.',
  },
  {
    file: 'Dossier_Salud_Adolescente',
    shots: 'salud',
    nombre: 'Salud Adolescente',
    tagline: 'Retos de 30 días: autoconocimiento, presión social y hábitos saludables.',
    categoria: 'Programa de retos · salud y bienestar',
    brand: '#0ea5e9',
    dark: '#090d16',
    icon: iconUrl('salud-adolescentes-icon-512.png'),
    monogram: 'SA',
    objetivo:
      'Salud Adolescente es un programa de 30 días con retos interactivos pensados para la etapa más delicada de la adolescencia: autoconocimiento, asertividad ante la presión social, motivación, bienestar digital y manejo del estrés. Cada reto es una pequeña experiencia guiada que dura minutos y deja una idea accionable, de modo que el chaval o la chica acumula, día a día, herramientas reales para decidir mejor, decir que no sin perder amistades y cuidar su descanso y su atención. Es local-first: las notas y el progreso quedan en el dispositivo, preservando la privacidad.',
    ficha: [
      ['Tipo', 'Programa de retos · 30 días'],
      ['Estructura', 'Retos interactivos en 5 ejes temáticos'],
      ['Dedicación', '10 minutos al día'],
      ['Público', 'Adolescentes de 12 a 17 años'],
      ['Tecnología', 'Aplicación web local-first (PWA)'],
      ['Acceso', 'Portal municipal → /apps/salud-adolescentes'],
      ['Datos', 'Progreso y notas en el dispositivo'],
    ],
    features: [
      ['🪞', 'Autoconocimiento', 'Retos para identificar valores, señales personales y formas propias de decidir.'],
      ['🚦', 'Presión social', 'Entrenar el “no” asertivo y detectar señales de riesgo en grupo y online.'],
      ['🔥', 'Motivación', 'Micro-herramientas de metas, hábitos y constancia con refuerzo diario.'],
      ['📵', 'Bienestar digital', 'Límites de pantalla conscientes y manejo de la comparación en redes.'],
      ['🧯', 'Manejo del estrés', 'Técnicas rápidas de regulación para exámenes y momentos de tensión.'],
      ['🔒', 'Privado por diseño', 'Notas y progreso en el dispositivo: nadie más los ve.'],
    ],
    experiencia: [
      'El adolescente abre el programa desde el portal municipal, sin registro.',
      'Cada día recibe un reto interactivo de uno de los cinco ejes.',
      'Completa la experiencia en unos 10 minutos y anota su reflexión.',
      'El progreso del itinerario de 30 días se guarda en su dispositivo.',
      'Puede retomarlo cuando quiera: nada caduca, nada se comparte.',
    ],
    contenidos: {
      intro: 'Los 5 ejes de retos del programa:',
      items: [
        'Autoconocimiento',
        'Asertividad ante la presión social',
        'Motivación y hábitos',
        'Bienestar digital',
        'Manejo del estrés',
        '30 retos interactivos acumulativos',
        'Reflexiones personales privadas',
        'Itinerario con progreso visual',
      ],
    },
    privacidad:
      'Aplicación externa local-first: el progreso y las notas personales se guardan en el dispositivo para reducir fricción y preservar la privacidad del adolescente.',
  },
  {
    file: 'Dossier_Level_Up_Juntos',
    shots: 'levelup',
    nombre: 'Level Up Juntos',
    tagline: 'Reto de 30 días para la igualdad: relaciones sanas, cero mitos.',
    categoria: 'Programa de retos · igualdad y convivencia',
    brand: '#7c3aed',
    dark: '#12071f',
    icon: dataUri(path.join(APPS_ROOT, 'apps', 'retoigualdad', 'public', 'pwa-icon.svg')) || fileUrl(path.join(APPS_ROOT, 'apps', 'retoigualdad', 'public', 'pwa-icon.svg')),
    monogram: 'LUP',
    objetivo:
      'Level Up Juntos es el reto de 30 días del ecosistema TE CUIDA para trabajar la igualdad y las relaciones saludables en la adolescencia y la juventud. A través de experiencias diarias — desmontar mitos románticos, detectar señales de alerta, poner límites digitales, practicar el “no”, construir una comunicación sin etiquetas — el programa entrena habilidades concretas de convivencia igualitaria. Su formato de juego con progresión (“level up”) y check-ins semanales lo hace atractivo para desplegarse en institutos y espacios de juventud.',
    ficha: [
      ['Tipo', 'Programa de retos · 30 días'],
      ['Estructura', 'Experiencias diarias + check-in semanal'],
      ['Dedicación', '10–15 minutos al día'],
      ['Público', 'Adolescentes y jóvenes'],
      ['Tecnología', 'PWA del ecosistema TE CUIDA'],
      ['Acceso', 'Despliegue independiente del programa'],
      ['Datos', 'Progreso en el dispositivo (local-first)'],
    ],
    features: [
      ['🃏', 'Cazadores de mitos', 'Desmontaje activo de mitos románticos y roles impuestos.'],
      ['🚨', '¿Señales o ruido?', 'Detección temprana de señales de alerta en las relaciones.'],
      ['📵', 'Límites digitales', 'Privacidad, control y respeto en la comunicación online.'],
      ['🙅', 'El poder del NO', 'Práctica del “no” asertivo sin culpa ni pérdida de vínculo.'],
      ['💬', 'Palabras que construyen', 'Comunicación sin etiquetas, con escucha radical y acuerdos claros.'],
      ['📈', 'Check-in semanal', 'Termómetro y balance para ver la evolución semana a semana.'],
    ],
    experiencia: [
      'El participante inicia el reto de 30 días desde su móvil, sin registro.',
      'Cada día vive una experiencia breve: un mito, una señal, un límite.',
      'El check-in semanal mide el clima personal y relacional (“El Termómetro”).',
      'La progresión tipo juego sostiene la motivación hasta el día 30.',
      'Todo el progreso permanece en el dispositivo del participante.',
    ],
    contenidos: {
      intro: 'Muestra de experiencias reales del reto:',
      items: [
        'El Punto de Partida',
        'Cazadores de Mitos',
        '¿Señales o Ruido?',
        'El Termómetro',
        'Límites Digitales',
        'Amistades Vitamina',
        'Check-in Semanal',
        'El Poder del NO',
        'Palabras que Construyen',
        'Fuera Etiquetas',
        'Escucha Radical',
        'Acuerdos Claros',
        'El Semáforo',
        'Balance Semanal',
        'Ojos Abiertos',
      ],
    },
    privacidad:
      'El progreso se guarda en el dispositivo del participante (local-first). El programa no recopila datos personales ni requiere cuenta.',
  },
]

// ============================================================================
// PLANTILLA
// ============================================================================
const esc = (s) => s // el contenido es de confianza (escrito por el generador)

function page(cls, inner) {
  return `<section class="page ${cls}">${inner}</section>`
}

function head(app, title) {
  return `<div class="sec-head"><div class="sec-bar" style="background:${app.brand}"></div><h2>${title}</h2></div>`
}

function cover(app) {
  return page('cover', `
    <div class="cover-band" style="background:linear-gradient(135deg, ${app.dark} 0%, ${app.dark} 62%, ${app.brand} 165%)">
      <div class="cover-top">
        <div class="cover-brand">VCA&nbsp;TE&nbsp;CUIDA</div>
        <div class="cover-sub">Dossier de aplicación</div>
      </div>
      <div class="cover-center">
        ${app.icon
          ? `<img class="cover-icon" src="${app.icon}" alt="">`
          : `<div class="cover-monogram" style="background:${app.brand}">${app.monogram}</div>`}
        <div class="cover-cat" style="color:${lighten(app.brand)}">${esc(app.categoria)}</div>
        <h1 class="cover-title">${esc(app.nombre)}</h1>
        <p class="cover-tagline">${esc(app.tagline)}</p>
      </div>
      <div class="cover-bottom">
        <div class="cover-meta">
          <span>VCA TE CUIDA · ${esc(MUNI)}</span>
          <span>${esc(FECHA)}</span>
        </div>
        <div class="cover-url">${esc(PORTAL)}</div>
      </div>
    </div>`)
}

function lighten(hex) {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.min(255, ((n >> 16) & 255) + 90)
  const g = Math.min(255, ((n >> 8) & 255) + 90)
  const b = Math.min(255, (n & 255) + 90)
  return `rgb(${r},${g},${b})`
}

function contentPages(app) {
  const p1 = page('', `
    <header class="chead">
      <div class="chead-left">
        ${app.icon
          ? `<img class="chead-icon" src="${app.icon}" alt="">`
          : `<div class="chead-mono" style="background:${app.brand}">${app.monogram}</div>`}
        <div><div class="chead-name">${esc(app.nombre)}</div><div class="chead-cat">${esc(app.categoria)}</div></div>
      </div>
      <div class="chead-brand">VCA TE CUIDA</div>
    </header>
    ${head(app, '1 · Objetivo de la aplicación')}
    <p class="lead">${esc(app.objetivo)}</p>
    ${head(app, '2 · Ficha técnica')}
    <table class="ficha">
      ${app.ficha.map(([k, v]) => `<tr><td class="fk">${k}</td><td class="fv">${esc(v)}</td></tr>`).join('')}
    </table>
    <footer class="foot"><span>${esc(app.nombre)} · Dossier de aplicación</span><span>VCA TE CUIDA · ${esc(MUNI)}</span></footer>`)

  const p2 = page('', `
    <header class="chead">
      <div class="chead-left">
        ${app.icon
          ? `<img class="chead-icon" src="${app.icon}" alt="">`
          : `<div class="chead-mono" style="background:${app.brand}">${app.monogram}</div>`}
        <div><div class="chead-name">${esc(app.nombre)}</div><div class="chead-cat">${esc(app.categoria)}</div></div>
      </div>
      <div class="chead-brand">VCA TE CUIDA</div>
    </header>
    ${head(app, '3 · Funcionalidades principales')}
    <div class="grid2">
      ${app.features.map(([ic, t, d]) => `
        <div class="feat">
          <div class="feat-icon" style="background:${app.brand}1a; border:1px solid ${app.brand}44">${ic}</div>
          <div><div class="feat-t">${esc(t)}</div><div class="feat-d">${esc(d)}</div></div>
        </div>`).join('')}
    </div>
    ${head(app, '4 · Experiencia de uso')}
    <ol class="steps">
      ${app.experiencia.map((s) => `<li><span class="step-n" style="background:${app.brand}"></span><span>${esc(s)}</span></li>`).join('')}
    </ol>
    <footer class="foot"><span>${esc(app.nombre)} · Dossier de aplicación</span><span>VCA TE CUIDA · ${esc(MUNI)}</span></footer>`)

  const p3 = page('', `
    <header class="chead">
      <div class="chead-left">
        ${app.icon
          ? `<img class="chead-icon" src="${app.icon}" alt="">`
          : `<div class="chead-mono" style="background:${app.brand}">${app.monogram}</div>`}
        <div><div class="chead-name">${esc(app.nombre)}</div><div class="chead-cat">${esc(app.categoria)}</div></div>
      </div>
      <div class="chead-brand">VCA TE CUIDA</div>
    </header>
    ${head(app, '6 · Contenidos y estructura')}
    <p class="muted">${esc(app.contenidos.intro)}</p>
    <ul class="modlist" style="--brand:${app.brand}">
      ${app.contenidos.items.map((m) => `<li>${esc(m)}</li>`).join('')}
    </ul>
    ${head(app, '7 · Acceso desde la plataforma')}
    <p class="lead-sm">La aplicación se entrega a la ciudadanía a través del portal municipal <b>${esc(PORTAL)}</b>:</p>
    <ol class="steps">
      <li><span class="step-n" style="background:${app.brand}"></span><span>La persona se registra en el portal con su correo (o accede con el código del programa municipal).</span></li>
      <li><span class="step-n" style="background:${app.brand}"></span><span>En su área privada ve las aplicaciones activadas por el Ayuntamiento; pulsa la tarjeta de ${esc(app.nombre)}.</span></li>
      <li><span class="step-n" style="background:${app.brand}"></span><span>La plataforma abre la aplicación de forma segura (nativa o mediante el gateway municipal).</span></li>
      <li><span class="step-n" style="background:${app.brand}"></span><span>El equipo municipal gestiona quién accede desde el panel de gestión, con visibilidad de estado de cada concesión.</span></li>
    </ol>
    <div class="privacy" style="border-left:4px solid ${app.brand}">
      <b>Privacidad y protección de datos.</b> ${esc(app.privacidad)}
    </div>
    <footer class="foot"><span>${esc(app.nombre)} · Dossier de aplicación</span><span>VCA TE CUIDA · ${esc(MUNI)}</span></footer>`)

  return p1 + p2 + shotsPage(app) + p3
}

// ---- Página de capturas reales (escritorio + móvil) ----
function shotsPage(app) {
  if (!app.shots) return ''
  const dir = path.join(ROOT, 'dossiers', 'shots')
  const desktop = dataUri(path.join(dir, app.shots + '-desktop.png'))
  const mobile = dataUri(path.join(dir, app.shots + '-mobile.png'))
  if (!desktop || !mobile) {
    console.warn(`  ⚠ capturas no encontradas para ${app.nombre} (${app.shots}); dossier sin página de imágenes`)
    return ''
  }
  return page('', `
    <header class="chead">
      <div class="chead-left">
        ${app.icon
          ? `<img class="chead-icon" src="${app.icon}" alt="">`
          : `<div class="chead-mono" style="background:${app.brand}">${app.monogram}</div>`}
        <div><div class="chead-name">${esc(app.nombre)}</div><div class="chead-cat">${esc(app.categoria)}</div></div>
      </div>
      <div class="chead-brand">VCA TE CUIDA</div>
    </header>
    ${head(app, '5 · La aplicación en imágenes')}
    <p class="muted" style="padding:0 16mm">Vistas reales de la aplicación tal y como la usa la ciudadanía, en escritorio y en móvil.</p>
    <div class="shot-block">
      <img class="shot-d" src="${desktop}" alt="${esc(app.nombre)} en escritorio">
      <div class="shot-cap">Vista de escritorio — acceso desde el portal municipal</div>
    </div>
    <div class="mobile-row">
      <div class="shot-block"><img class="shot-m" src="${mobile}" alt="${esc(app.nombre)} en móvil"></div>
    </div>
    <div class="shot-cap" style="text-align:center; margin-top:1.5mm">Vista móvil — aplicación instalable como app (PWA)</div>
    <footer class="foot"><span>${esc(app.nombre)} · Dossier de aplicación</span><span>VCA TE CUIDA · ${esc(MUNI)}</span></footer>`)
}

function dossierHtml(app) {
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Dossier ${esc(app.nombre)} — VCA TE CUIDA</title>
<style>${CSS}</style></head>
<body>
${cover(app)}
${contentPages(app)}
</body></html>`
}

// ---- Dossier maestro de la plataforma ----
function masterHtml() {
  const brand = '#14b8a6'
  const dark = '#0f172a'
  const rows = APPS.map((a) => `
    <tr>
      <td class="mt-app"><span class="mt-dot" style="background:${a.brand}"></span>${esc(a.nombre)}</td>
      <td>${esc(a.categoria)}</td>
      <td>${esc(a.ficha[2][1])}</td>
      <td class="muted">${esc(a.ficha.find(([k]) => k === 'Público')[1])}</td>
    </tr>`).join('')

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>Dossier de la plataforma — VCA TE CUIDA</title>
<style>${CSS}</style></head>
<body>
${page('cover', `
  <div class="cover-band" style="background:linear-gradient(135deg, ${dark} 0%, ${dark} 58%, ${brand} 150%)">
    <div class="cover-top">
      <div class="cover-brand">VCA&nbsp;TE&nbsp;CUIDA</div>
      <div class="cover-sub">Dossier de la plataforma</div>
    </div>
    <div class="cover-center">
      <div class="cover-kicker" style="color:${lighten(brand)}">Catálogo de aplicaciones · ${esc(FECHA)}</div>
      <h1 class="cover-title" style="font-size:54px">Las aplicaciones<br>de VCA TE CUIDA</h1>
      <p class="cover-tagline">Ocho recursos digitales de bienestar, igualdad y convivencia familiar al servicio de la ciudadanía de ${esc(MUNI)}.</p>
    </div>
    <div class="cover-bottom">
      <div class="cover-meta"><span>Ayuntamiento de ${esc(MUNI)}</span><span>${esc(PORTAL)}</span></div>
      <div class="cover-url">Agenda 2030 · Participación · Retorno útil</div>
    </div>
  </div>`)}
${page('', `
  <header class="chead">
    <div class="chead-left"><div class="chead-mono" style="background:${brand}">TC</div>
      <div><div class="chead-name">VCA TE CUIDA</div><div class="chead-cat">Catálogo de aplicaciones</div></div></div>
    <div class="chead-brand">VCA TE CUIDA</div>
  </header>
  <div class="sec-head"><div class="sec-bar" style="background:${brand}"></div><h2>La plataforma en una página</h2></div>
  <p class="lead">VCA TE CUIDA es la plataforma municipal de bienestar digital de ${esc(MUNI)}, vinculada a la Agenda 2030, la participación ciudadana y el retorno útil a la ciudadanía. Reúne programas guiados de mindfulness y salud emocional, herramientas de organización y gamificación familiar, y programas de igualdad y convivencia, todo accesible con una sola cuenta ciudadana desde el portal municipal.</p>
  <div class="grid3">
    <div class="kpi"><div class="kpi-n" style="color:${brand}">8</div><div class="kpi-l">aplicaciones en catálogo</div></div>
    <div class="kpi"><div class="kpi-n" style="color:${brand}">1</div><div class="kpi-l">cuenta ciudadana para todo</div></div>
    <div class="kpi"><div class="kpi-n" style="color:${brand}">30</div><div class="kpi-l">días por programa guiado</div></div>
  </div>
  <div class="sec-head"><div class="sec-bar" style="background:${brand}"></div><h2>Catálogo</h2></div>
  <table class="ficha mt">
    <tr class="mth"><td>Aplicación</td><td>Categoría</td><td>Dedicación</td><td>Público</td></tr>
    ${rows}
  </table>
  <footer class="foot"><span>Dossier de la plataforma</span><span>VCA TE CUIDA · ${esc(MUNI)}</span></footer>`)}
${page('', `
  <header class="chead">
    <div class="chead-left"><div class="chead-mono" style="background:${brand}">TC</div>
      <div><div class="chead-name">VCA TE CUIDA</div><div class="chead-cat">Modelo de acceso</div></div></div>
    <div class="chead-brand">VCA TE CUIDA</div>
  </header>
  <div class="sec-head"><div class="sec-bar" style="background:${brand}"></div><h2>Modelo de acceso municipal</h2></div>
  <p class="lead">Cada aplicación cuenta con un <b>dossier individual</b> (documento adjunto a este dosser de plataforma) con su objetivo, funcionalidades, contenidos y experiencia de uso en detalle. Este documento resume el modelo común de acceso:</p>
  <ol class="steps">
    <li><span class="step-n" style="background:${brand}"></span><span><b>Códigos de acceso municipales.</b> El Ayuntamiento genera lotes de códigos individuales de un solo uso, con caducidad y trazabilidad completa.</span></li>
    <li><span class="step-n" style="background:${brand}"></span><span><b>Participación y retorno.</b> Dentro del programa ODS, la ciudadanía participa con una idea para mejorar el municipio y recibe por correo un código personal: <i>“Una idea para mejorar Villafranca. Un recurso para cuidarte a ti.”</i></span></li>
    <li><span class="step-n" style="background:${brand}"></span><span><b>Activación por aplicación.</b> Al registrarse, la persona activa su código y elige la aplicación que quiere usar. Una activación nueva por semana, siempre de una aplicación distinta: el acceso se acumula.</span></li>
    <li><span class="step-n" style="background:${brand}"></span><span><b>Control municipal.</b> El equipo municipal ve el estado de cada código (disponible, enviado, activado, caducado, revocado), puede revocar y fija la caducidad de cada lote.</span></li>
    <li><span class="step-n" style="background:${brand}"></span><span><b>Privacidad por diseño.</b> Registro con el mínimo de datos, correos de destino cifrados en base de datos, políticas de acceso por fila (RLS) y apps locales que no envían datos personales.</span></li>
  </ol>
  <div class="privacy" style="border-left:4px solid ${brand}">
    <b>Dossieres individuales incluidos en esta entrega:</b>
    <div class="modlist" style="--brand:${brand}; margin-top:10px">
      ${APPS.map((a) => `<li>${esc(a.nombre)}</li>`).join('')}
    </div>
  </div>
  <footer class="foot"><span>Dossier de la plataforma</span><span>VCA TE CUIDA · ${esc(MUNI)}</span></footer>`)}
</body></html>`
}

// ============================================================================
// CSS (imprimible A4, sin dependencias externas)
// ============================================================================
const CSS = `
@page { size: A4; margin: 0; }
* { margin:0; padding:0; box-sizing:border-box; }
html,body { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
body { font-family:'Segoe UI','Helvetica Neue',Arial,sans-serif; color:#1e293b; font-size:10.5pt; line-height:1.5; }
.page { width:210mm; height:297mm; page-break-after:always; position:relative; overflow:hidden; background:#fff; display:flex; flex-direction:column; }
.page:last-child { page-break-after:auto; }

/* ---- Portada ---- */
.cover-band { flex:1; color:#fff; display:flex; flex-direction:column; padding:16mm 16mm 12mm; }
.cover-top { display:flex; justify-content:space-between; align-items:baseline; }
.cover-brand { font-weight:800; letter-spacing:3px; font-size:14pt; }
.cover-sub { font-size:9.5pt; opacity:.75; letter-spacing:2px; text-transform:uppercase; }
.cover-center { flex:1; display:flex; flex-direction:column; justify-content:center; align-items:center; text-align:center; gap:6mm; }
.cover-icon { width:34mm; height:34mm; border-radius:8mm; box-shadow:0 10px 40px rgba(0,0,0,.45); background:#fff; object-fit:contain; }
.cover-monogram { width:34mm; height:34mm; border-radius:8mm; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:16pt; color:#fff; box-shadow:0 10px 40px rgba(0,0,0,.45); }
.cover-kicker { font-size:10pt; letter-spacing:2px; text-transform:uppercase; }
.cover-cat { font-size:10.5pt; letter-spacing:1.6px; text-transform:uppercase; font-weight:600; }
.cover-title { font-size:40pt; line-height:1.05; font-weight:800; letter-spacing:-1px; }
.cover-tagline { font-size:13pt; opacity:.85; max-width:150mm; line-height:1.45; }
.cover-bottom { border-top:1px solid rgba(255,255,255,.22); padding-top:5mm; display:flex; justify-content:space-between; align-items:center; }
.cover-meta { display:flex; flex-direction:column; gap:1.5mm; font-size:9.5pt; opacity:.8; }
.cover-url { font-size:10.5pt; font-weight:600; letter-spacing:.5px; }

/* ---- Cabecera de página de contenido ---- */
.chead { display:flex; justify-content:space-between; align-items:center; padding:12mm 16mm 0; }
.chead-left { display:flex; gap:4mm; align-items:center; }
.chead-icon { width:11mm; height:11mm; border-radius:3mm; object-fit:contain; background:#fff; border:1px solid #e2e8f0; }
.chead-mono { width:11mm; height:11mm; border-radius:3mm; color:#fff; font-weight:800; display:flex; align-items:center; justify-content:center; font-size:10pt; }
.chead-name { font-weight:700; font-size:12pt; }
.chead-cat { font-size:8.5pt; color:#64748b; text-transform:uppercase; letter-spacing:1px; }
.chead-brand { font-size:9pt; font-weight:800; letter-spacing:2.5px; color:#94a3b8; }

/* ---- Secciones ---- */
.sec-head { display:flex; align-items:center; gap:3.5mm; padding:8mm 16mm 3mm; }
.sec-bar { width:4.5mm; height:7mm; border-radius:1.5mm; }
.sec-head h2 { font-size:15pt; color:#0f172a; letter-spacing:-.3px; }
.lead, .lead-sm { padding:0 16mm; margin-top:2.5mm; }
.lead { font-size:11pt; line-height:1.65; }
.lead-sm { font-size:10.5pt; line-height:1.6; }
.muted { color:#64748b; font-size:10pt; }
.chead + .sec-head { padding-top:10mm; }

/* ---- Ficha técnica ---- */
.ficha { width:178mm; margin:4mm 16mm 0; border-collapse:collapse; }
.ficha td { padding:2.6mm 4mm; border-bottom:1px solid #e2e8f0; font-size:10pt; vertical-align:top; }
.fk { width:38mm; color:#475569; font-weight:600; }
.fv { color:#0f172a; }
.mth td { background:#f1f5f9; font-weight:700; color:#334155; font-size:9.5pt; text-transform:uppercase; letter-spacing:.6px; }
.mt-app { font-weight:700; color:#0f172a; white-space:nowrap; }
.mt-dot { display:inline-block; width:3.2mm; height:3.2mm; border-radius:1mm; margin-right:2.6mm; }

/* ---- Funcionalidades ---- */
.grid2 { display:grid; grid-template-columns:1fr 1fr; gap:4mm 6mm; padding:2mm 16mm 0; }
.feat { display:flex; gap:3.5mm; align-items:flex-start; background:#f8fafc; border:1px solid #e2e8f0; border-radius:3mm; padding:3.5mm 4mm; }
.feat-icon { width:9mm; height:9mm; min-width:9mm; border-radius:2.5mm; display:flex; align-items:center; justify-content:center; font-size:13pt; }
.feat-t { font-weight:700; font-size:10pt; color:#0f172a; }
.feat-d { font-size:8.8pt; color:#475569; line-height:1.45; margin-top:.8mm; }
.grid3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:5mm; padding:3mm 16mm 0; }
.kpi { background:#f8fafc; border:1px solid #e2e8f0; border-radius:3mm; padding:5mm; text-align:center; }
.kpi-n { font-size:26pt; font-weight:800; }
.kpi-l { font-size:9pt; color:#64748b; margin-top:1mm; }

/* ---- Capturas ---- */
.shot-block { padding:3mm 16mm 0; }
.shot-d { width:178mm; display:block; border-radius:2.5mm; border:1px solid #e2e8f0; box-shadow:0 2px 10px rgba(15,23,42,.08); }
.shot-cap { font-size:8.8pt; color:#64748b; padding:1.5mm 16mm 0; }
.mobile-row { display:flex; justify-content:center; padding-top:3mm; }
.shot-m { height:92mm; display:block; border-radius:4mm; border:1px solid #e2e8f0; box-shadow:0 2px 10px rgba(15,23,42,.08); }

/* ---- Pasos ---- */
.steps { list-style:none; padding:3mm 16mm 0; display:flex; flex-direction:column; gap:3mm; }
.steps li { display:flex; gap:4mm; align-items:flex-start; font-size:10.2pt; line-height:1.5; }
.step-n { width:6.5mm; height:6.5mm; min-width:6.5mm; border-radius:50%; color:#fff; font-size:9pt; font-weight:700; display:flex; align-items:center; justify-content:center; margin-top:.6mm; }
.step-n::before { counter-increment:step; content:counter(step); }
ol.steps { counter-reset:step; }

/* ---- Contenidos ---- */
.modlist { columns:2; column-gap:8mm; padding:2mm 16mm 0; list-style:none; }
.modlist li { font-size:9.6pt; color:#334155; padding:1.7mm 0 1.7mm 5.5mm; position:relative; break-inside:avoid; border-bottom:1px dashed #e2e8f0; }
.modlist li::before { content:''; position:absolute; left:0; top:4.4mm; width:2.6mm; height:2.6mm; border-radius:.8mm; background:var(--brand); }

/* ---- Privacidad ---- */
.privacy { margin:6mm 16mm 0; background:#f8fafc; border-radius:2.5mm; padding:4mm 5mm; font-size:9.4pt; color:#334155; line-height:1.55; }

/* ---- Pie ---- */
.foot { margin-top:auto; padding:4mm 16mm 8mm; display:flex; justify-content:space-between; font-size:8.5pt; color:#94a3b8; border-top:1px solid #e2e8f0; }
`

// ============================================================================
// RENDER A PDF
// ============================================================================
async function renderPdf(htmlPath, pdfPath) {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true })
  try {
    const page = await browser.newPage()
    await page.goto('file:///' + htmlPath.replace(/\\/g, '/'), { waitUntil: 'load' })
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      printBackground: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    })
  } finally {
    await browser.close()
  }
}

const targets = [
  ...APPS.map((a) => ({ html: path.join(OUT, a.file + '.html'), pdf: path.join(OUT, a.file + '.pdf'), app: a })),
  { html: path.join(OUT, 'Dossier_Plataforma_TE_CUIDA.html'), pdf: path.join(OUT, 'Dossier_Plataforma_TE_CUIDA.pdf'), app: null },
]

for (const t of targets) {
  const html = t.app ? dossierHtml(t.app) : masterHtml()
  fs.writeFileSync(t.html, html, 'utf8')
  if (t.app && t.app.icon && t.app.icon.startsWith('file:///')) {
    const p = decodeURIComponent(t.app.icon.replace('file:///', ''))
    if (!fs.existsSync(p)) console.warn(`  ⚠ icono no encontrado para ${t.app.nombre}: ${p} (se usará monograma)`)
  }
  await renderPdf(t.html, t.pdf)
  const kb = Math.round(fs.statSync(t.pdf).size / 1024)
  console.log(`✓ ${path.basename(t.pdf)} (${kb} KB)`)
}

console.log(`\nListo: ${targets.length} dossieres en ${OUT}`)
