'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import type { Lesson, ProgramModule } from '@/types'
import { dailyQuotes as reto30Quotes } from './reto30-quotes'
import { dailyQuotes as caregiverQuotes } from './mindful30-caregivers-quotes'
import './reto30.css'

type AreaKey = 'thoughts' | 'activities' | 'relationships'
type ViewKey = 'today' | 'map' | 'resources' | 'journal'

interface Reto30Day {
  module: ProgramModule
  lessons: Lesson[]
}

interface TaskItem {
  id: string
  day: number
  lesson: Lesson
  area: AreaKey
  areaName: string
  icon: string
  color: string
  title: string
  body: string
  actionItem: string
  resource?: Reto30Resource
}

interface Reto30Resource {
  id: string
  type: 'guide' | 'cbt' | 'social' | 'tool'
  title: string
  content: {
    prompt?: string
    guide?: string
    steps?: string[]
    script?: string
    advice?: string
    description?: string
  }
}

interface Reto30ProgramClientProps {
  modules: ProgramModule[]
  programId: string
  appBrandColor: string
  variant?: 'reto30' | 'mindful30' | 'caregivers' | 'adolescents'
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const AREA_META: Record<AreaKey, { name: string; icon: string; color: string; className: string }> = {
  thoughts: {
    name: 'Reflexion',
    icon: 'M12 3.75a6.75 6.75 0 0 0-4.66 11.63v1.87A1.75 1.75 0 0 0 9.1 19h5.8a1.75 1.75 0 0 0 1.75-1.75v-1.87A6.75 6.75 0 0 0 12 3.75Zm-2.25 17h4.5',
    color: '#a78bfa',
    className: 'pillar-thoughts',
  },
  activities: {
    name: 'Actividad',
    icon: 'M12 3v2.5m0 13V21m9-9h-2.5M5.5 12H3m15.36-6.36-1.77 1.77M7.41 16.59l-1.77 1.77m12.72 0-1.77-1.77M7.41 7.41 5.64 5.64M12 8.25A3.75 3.75 0 1 0 12 15.75 3.75 3.75 0 0 0 12 8.25Z',
    color: '#fbbf24',
    className: 'pillar-activities',
  },
  relationships: {
    name: 'Relaciones',
    icon: 'M20.25 8.75c0 5.25-8.25 10-8.25 10s-8.25-4.75-8.25-10A4.5 4.5 0 0 1 12 6a4.5 4.5 0 0 1 8.25 2.75Z',
    color: '#f472b6',
    className: 'pillar-relationships',
  },
}

const AREAS: AreaKey[] = ['thoughts', 'activities', 'relationships']

function getStorageKey(programId: string, key: string) {
  return `reto30:${programId}:${key}`
}

function getTodayKey() {
  return new Date().toISOString().split('T')[0] || ''
}

function getTodayMidnight() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function getUnlockedDay(startDateStr: string | null, totalDays: number) {
  if (!startDateStr) return 1
  const start = new Date(startDateStr)
  start.setHours(0, 0, 0, 0)
  const diffDays = Math.floor(
    (getTodayMidnight().getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  )
  return Math.min(Math.max(diffDays + 1, 1), totalDays + 1)
}

function maybeRepairMojibake(value: string | null | undefined) {
  if (!value) return ''
  try {
    const decoded = decodeURIComponent(escape(value))
    const score = (text: string) => (text.match(/Ã|Â|â|ð/g) || []).length
    return score(decoded) < score(value) ? decoded : value
  } catch {
    return value
  }
}

function stripLeadingMarks(value: string) {
  return value
    .replace(/^[^\p{L}\p{N}"'¿¡]+/u, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function titleForLesson(lesson: Lesson) {
  return stripLeadingMarks(maybeRepairMojibake(lesson.titulo))
}

function bodyForLesson(lesson: Lesson) {
  return maybeRepairMojibake(lesson.contenido_texto || '')
}

function actionForLesson(lesson: Lesson) {
  return maybeRepairMojibake(lesson.ejercicio?.instrucciones || '')
}

function resourceForLesson(lesson: Lesson) {
  return (lesson as Lesson & { reto30Resource?: Reto30Resource }).reto30Resource
}

function cleanResource(resource: Reto30Resource | undefined) {
  if (!resource) return undefined
  return {
    ...resource,
    title: maybeRepairMojibake(resource.title),
    content: {
      ...resource.content,
      prompt: maybeRepairMojibake(resource.content.prompt),
      guide: maybeRepairMojibake(resource.content.guide),
      script: maybeRepairMojibake(resource.content.script),
      advice: maybeRepairMojibake(resource.content.advice),
      description: maybeRepairMojibake(resource.content.description),
      steps: resource.content.steps?.map((step) => maybeRepairMojibake(step)),
    },
  }
}

function splitIntoSteps(text: string) {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (!clean) return ['Lee el ejercicio con calma.', 'Hazlo a tu ritmo.', 'Guarda una nota sobre como te has sentido.']
  const parts = clean
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
  return parts.length >= 3 ? parts.slice(0, 4) : [clean, 'Dedica unos minutos sin distracciones.', 'Marca la tarea cuando la hayas completado.']
}

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function saveJson<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}

function hexToRgb(hex: string) {
  const normalized = hex.replace('#', '')
  if (normalized.length !== 6) return { r: 20, g: 184, b: 166 }
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  }
}

function launchConfetti(canvas: HTMLCanvasElement | null, brandColor: string) {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  canvas.width = window.innerWidth
  canvas.height = window.innerHeight

  const rgb = hexToRgb(brandColor)
  const colors = [
    brandColor,
    `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, .75)`,
    '#a78bfa',
    '#fbbf24',
    '#f472b6',
    '#ffffff',
  ]

  const particles = Array.from({ length: 90 }, () => ({
    x: Math.random() * canvas.width,
    y: -20 - Math.random() * 100,
    vx: (Math.random() - 0.5) * 7,
    vy: Math.random() * 3 + 2,
    size: Math.random() * 8 + 4,
    color: colors[Math.floor(Math.random() * colors.length)] || brandColor,
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 10,
    life: 1,
  }))

  let frame = 0
  let animId = 0

  function animate() {
    if (!ctx || !canvas) return
    frame += 1
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    particles.forEach((p) => {
      p.x += p.vx
      p.vy += 0.1
      p.y += p.vy
      p.rotation += p.rotationSpeed
      p.life -= 0.008
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate((p.rotation * Math.PI) / 180)
      ctx.globalAlpha = Math.max(0, p.life)
      ctx.fillStyle = p.color
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
      ctx.restore()
    })
    if (frame < 100) {
      animId = requestAnimationFrame(animate)
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      canvas.width = 0
      canvas.height = 0
      cancelAnimationFrame(animId)
    }
  }

  animId = requestAnimationFrame(animate)
}

function IconPath({ path }: { path: string }) {
  return (
    <svg aria-hidden="true" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
  )
}

export default function Reto30ProgramClient({
  modules,
  programId,
  appBrandColor,
  variant = 'reto30',
}: Reto30ProgramClientProps) {
  const isCaregivers = variant === 'caregivers'
  const isAdolescents = variant === 'adolescents'
  const isMindful30 = variant === 'mindful30'
  const appName = isCaregivers
    ? 'Mindful30 Cuidadores'
    : isAdolescents
      ? 'Mindful30 Adolescentes'
      : isMindful30
        ? 'Mindful30'
        : 'Reto30'
  const appShortName = isCaregivers
    ? 'Cuidadores'
    : isAdolescents
      ? 'Adolescentes'
      : isMindful30
        ? 'Mindful30'
        : 'Reto30'
  const appIcon = isCaregivers
    ? '/mindful30-caregivers-icon-192.png'
    : isMindful30 || isAdolescents
      ? '/mindful30-icon-192.png'
      : '/reto30-icon-192.png'
  const startKey = getStorageKey(programId, 'start-date')
  const completedKey = getStorageKey(programId, 'completed')
  const notesKey = getStorageKey(programId, 'notes')
  const welcomeKey = getStorageKey(programId, 'welcome-last-seen')
  const moodKey = getStorageKey(programId, 'mood')

  const days: Reto30Day[] = useMemo(
    () =>
      [...modules]
        .sort((a, b) => a.numero - b.numero)
        .slice(0, 30)
        .map((module) => ({
          module: {
            ...module,
            nombre: maybeRepairMojibake(module.nombre),
            descripcion: maybeRepairMojibake(module.descripcion),
          },
          lessons: [...module.lessons].sort((a, b) => a.orden - b.orden).slice(0, 3),
        })),
    [modules],
  )

  const totalDays = days.length || 30
  const [hydrated, setHydrated] = useState(false)
  const [startDate, setStartDate] = useState<string | null>(null)
  const [completed, setCompleted] = useState<Record<string, boolean>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [moods, setMoods] = useState<Record<string, string>>({})
  const [currentDay, setCurrentDay] = useState(1)
  const [view, setView] = useState<ViewKey>('today')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [showWelcome, setShowWelcome] = useState(false)
  const [copied, setCopied] = useState(false)
  const [breathingActive, setBreathingActive] = useState(false)
  const [breathingTick, setBreathingTick] = useState(0)
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [showInstallHelp, setShowInstallHelp] = useState(false)
  const confettiRef = useRef<HTMLCanvasElement>(null)

  const unlockedDay = getUnlockedDay(startDate, totalDays)
  const activeDay = days[currentDay - 1] || days[0]

  const tasks = useMemo<TaskItem[]>(() => {
    if (!activeDay) return []
    return activeDay.lessons.map((lesson, index) => {
      const area = AREAS[index] || 'thoughts'
      const meta = AREA_META[area]
      return {
        id: lesson.id,
        day: activeDay.module.numero,
        lesson,
        area,
        areaName: meta.name,
        icon: meta.icon,
        color: meta.color,
        title: titleForLesson(lesson),
        body: bodyForLesson(lesson),
        actionItem: actionForLesson(lesson),
        resource: cleanResource(resourceForLesson(lesson)),
      }
    })
  }, [activeDay])

  const allTasks = useMemo<TaskItem[]>(
    () =>
      days.flatMap((day) =>
        day.lessons.map((lesson, index) => {
          const area = AREAS[index] || 'thoughts'
          const meta = AREA_META[area]
          return {
            id: lesson.id,
            day: day.module.numero,
            lesson,
            area,
            areaName: meta.name,
            icon: meta.icon,
            color: meta.color,
            title: titleForLesson(lesson),
            body: bodyForLesson(lesson),
            actionItem: actionForLesson(lesson),
            resource: cleanResource(resourceForLesson(lesson)),
          }
        }),
      ),
    [days],
  )

  const selectedTask = useMemo(
    () => allTasks.find((task) => task.id === selectedTaskId) || tasks[0] || null,
    [allTasks, selectedTaskId, tasks],
  )

  const completedCount = allTasks.filter((task) => completed[task.id]).length
  const totalTasks = allTasks.length || totalDays * 3
  const dayCompletedCount = tasks.filter((task) => completed[task.id]).length
  const dayIsComplete = tasks.length > 0 && dayCompletedCount === tasks.length
  const progressPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0

  useEffect(() => {
    const savedStart = localStorage.getItem(startKey) || getTodayKey()
    if (!localStorage.getItem(startKey)) localStorage.setItem(startKey, savedStart)

    setStartDate(savedStart)
    setCompleted(loadJson<Record<string, boolean>>(completedKey, {}))
    setNotes(loadJson<Record<string, string>>(notesKey, {}))
    setMoods(loadJson<Record<string, string>>(moodKey, {}))

    const unlocked = getUnlockedDay(savedStart, totalDays)
    setCurrentDay(Math.min(unlocked, totalDays))
    setShowWelcome(localStorage.getItem(welcomeKey) !== getTodayKey())
    setHydrated(true)
  }, [completedKey, moodKey, notesKey, startKey, totalDays, welcomeKey])

  useEffect(() => {
    if (!breathingActive) return
    const timer = window.setInterval(() => setBreathingTick((tick) => tick + 1), 1000)
    return () => window.clearInterval(timer)
  }, [breathingActive])

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)')
    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean }
    const updateStandalone = () => {
      setIsStandalone(standalone.matches || navigatorWithStandalone.standalone === true)
    }
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as BeforeInstallPromptEvent)
    }
    const handleInstalled = () => {
      setInstallPrompt(null)
      setIsStandalone(true)
      setShowInstallHelp(false)
    }

    updateStandalone()
    standalone.addEventListener('change', updateStandalone)
    window.addEventListener('beforeinstallprompt', handleInstallPrompt)
    window.addEventListener('appinstalled', handleInstalled)

    return () => {
      standalone.removeEventListener('change', updateStandalone)
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  const saveCompleted = useCallback(
    (next: Record<string, boolean>) => {
      setCompleted(next)
      saveJson(completedKey, next)
    },
    [completedKey],
  )

  const toggleTask = useCallback(
    (taskId: string) => {
      const next = { ...completed, [taskId]: !completed[taskId] }
      saveCompleted(next)
      if (!completed[taskId]) launchConfetti(confettiRef.current, appBrandColor)
    },
    [appBrandColor, completed, saveCompleted],
  )

  const saveNote = useCallback(
    (taskId: string, value: string) => {
      const next = { ...notes, [taskId]: value }
      setNotes(next)
      saveJson(notesKey, next)
    },
    [notes, notesKey],
  )

  const saveMood = useCallback(
    (day: number, value: string) => {
      const next = { ...moods, [String(day)]: value }
      setMoods(next)
      saveJson(moodKey, next)
    },
    [moodKey, moods],
  )

  const goToDay = useCallback(
    (day: number) => {
      if (day < 1 || day > totalDays || day > unlockedDay) return
      setCurrentDay(day)
      setSelectedTaskId(null)
      setView('today')
      window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
    },
    [totalDays, unlockedDay],
  )

  const closeWelcome = () => {
    localStorage.setItem(welcomeKey, getTodayKey())
    setShowWelcome(false)
  }

  const resetProgress = () => {
    if (!window.confirm(`Reiniciar ${appName} en este dispositivo?`)) return
    localStorage.removeItem(startKey)
    localStorage.removeItem(completedKey)
    localStorage.removeItem(notesKey)
    localStorage.removeItem(moodKey)
    setStartDate(getTodayKey())
    localStorage.setItem(startKey, getTodayKey())
    setCompleted({})
    setNotes({})
    setMoods({})
    setCurrentDay(1)
    setView('today')
    setSelectedTaskId(null)
  }

  const completeDay = () => {
    if (!dayIsComplete) return
    if (currentDay >= totalDays) {
      launchConfetti(confettiRef.current, appBrandColor)
      return
    }
    if (currentDay < unlockedDay) {
      goToDay(currentDay + 1)
      return
    }
    window.alert('Dia completado. El siguiente se desbloquea manana para mantener el ritmo diario del reto.')
  }

  const copyScript = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  const installApp = async () => {
    if (!installPrompt) {
      setShowInstallHelp(true)
      return
    }

    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    if (choice.outcome === 'accepted') setIsStandalone(true)
    setInstallPrompt(null)
  }

  if (!hydrated) {
    return (
      <div className="reto30 min-h-[420px] bg-[var(--r30-bg)] text-[var(--r30-muted)]">
        <div className="grid min-h-[420px] place-items-center text-sm">Cargando {appName}...</div>
      </div>
    )
  }

  if (!activeDay) {
    return (
      <div className="reto30 rounded-2xl bg-[var(--r30-bg)] p-8 text-[var(--r30-text)]">
        No hay contenido disponible para {appName}.
      </div>
    )
  }

  const currentMood = moods[String(currentDay)] || ''
  const quotes = isCaregivers ? caregiverQuotes : reto30Quotes
  const quote = maybeRepairMojibake(quotes[Math.min(currentDay, 30)] || quotes[1])
  const tabItems: Array<{ key: ViewKey; label: string; path: string }> = [
    {
      key: 'today',
      label: 'Inicio',
      path: 'M3.75 12 12 4.5 20.25 12M5.25 10.5v8.25h13.5V10.5',
    },
    {
      key: 'map',
      label: 'Mapa',
      path: 'M9 18.75 3.75 21V5.25L9 3m0 15.75 6 2.25m-6-2.25V3m6 18 5.25-2.25V3L15 5.25m0 15.75V5.25M9 3l6 2.25',
    },
    {
      key: 'resources',
      label: 'Recursos',
      path: 'M12 6.75v11.25m0-11.25c-1.2-1.08-2.83-1.5-4.5-1.5S4.2 5.67 3 6.75v11.25c1.2-1.08 2.83-1.5 4.5-1.5s3.3.42 4.5 1.5m0-11.25c1.2-1.08 2.83-1.5 4.5-1.5s3.3.42 4.5 1.5v11.25c-1.2-1.08-2.83-1.5-4.5-1.5s-3.3.42-4.5 1.5',
    },
    {
      key: 'journal',
      label: 'Diario',
      path: 'M7.5 4.5h9A1.5 1.5 0 0 1 18 6v12a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 6 18V6a1.5 1.5 0 0 1 1.5-1.5Zm2.25 4.5h4.5m-4.5 3h4.5m-4.5 3h2.25',
    },
  ]

  return (
    <div className={`reto30 ${isCaregivers ? 'caregivers30' : ''} ${isAdolescents ? 'adolescents30' : ''} r30-shell min-h-screen text-[var(--r30-text)]`}>
      <canvas ref={confettiRef} className="confetti-canvas" aria-hidden="true" />

      {showWelcome && (
        <div className="r30-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="reto30-welcome-title">
          <div className="glass-card r30-welcome animate-reto30-in">
            <div className="r30-spark" aria-hidden="true">30</div>
            <h2 id="reto30-welcome-title">Bienvenido/a a tu dia {currentDay}</h2>
            <p>
              {isCaregivers
                ? 'Una pausa diaria para cuidarte mientras cuidas. Acceso completo, sin codigo de activacion, dentro de TE CUIDA.'
                : isAdolescents
                  ? 'Un espacio diario para entrenar calma, autoestima y relacion sana con pantallas. Acceso completo dentro de TE CUIDA.'
                : isMindful30
                  ? 'Tu programa de bienestar diario. Acceso completo, sin codigo de activacion, dentro de TE CUIDA.'
                  : 'Una practica breve para mente, cuerpo y relaciones. Sin codigo de activacion, sin pagos, dentro de TE CUIDA.'}
            </p>
            <blockquote>{quote}</blockquote>
            <button className="r30-primary" onClick={closeWelcome} style={{ background: appBrandColor }}>
              Comenzar
            </button>
          </div>
        </div>
      )}

      {showInstallHelp && (
        <div className="r30-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="reto30-install-title">
          <div className="glass-card r30-install-sheet animate-reto30-in">
            <Image src={appIcon} alt="" width={64} height={64} priority />
            <h2 id="reto30-install-title">Instalar {appName}</h2>
            <p>
              Abre el menu de tu navegador y elige <strong>Instalar aplicacion</strong> o
              <strong> Anadir a pantalla de inicio</strong>.
            </p>
            <button className="r30-primary" onClick={() => setShowInstallHelp(false)} style={{ background: appBrandColor }}>
              Entendido
            </button>
          </div>
        </div>
      )}

      <div className="r30-app">
        <div className="r30-appbar">
          <a href="/" className="r30-back" aria-label="Volver a TE CUIDA">
            <IconPath path="M15.75 19.5 8.25 12l7.5-7.5" />
          </a>
          <div className="r30-brand">
            <Image src={appIcon} alt="" width={40} height={40} priority />
            <div>
              <strong>{appName}</strong>
              <span>{isCaregivers ? 'AUTOCUIDADO PROFESIONAL' : isAdolescents ? 'BIENESTAR ADOLESCENTE' : isMindful30 ? 'BIENESTAR DIARIO' : 'TE CUIDA'}</span>
            </div>
          </div>
          {!isStandalone && (
            <button type="button" className="r30-install" onClick={installApp} aria-label={`Instalar ${appName}`}>
              <IconPath path="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5M4.5 17.25v1.5A2.25 2.25 0 0 0 6.75 21h10.5a2.25 2.25 0 0 0 2.25-2.25v-1.5" />
              <span>Instalar</span>
            </button>
          )}
        </div>

        <header className="r30-topbar">
          <div>
            <p className="r30-kicker">{appShortName}</p>
            <h2>Dia {currentDay}</h2>
            <p>{stripLeadingMarks(activeDay.module.nombre) || 'Tu practica diaria'}</p>
          </div>
          <div className="r30-score" style={{ borderColor: `${appBrandColor}55` }}>
            <strong>{progressPercent}%</strong>
            <span>{completedCount}/{totalTasks}</span>
          </div>
        </header>

        <div className="r30-progress">
          <span style={{ width: `${progressPercent}%`, background: appBrandColor }} />
        </div>

        <nav className="r30-tabs" aria-label={`Secciones de ${appName}`}>
          {tabItems.map((item) => (
            <button
              key={item.key}
              className={view === item.key ? 'active' : ''}
              onClick={() => setView(item.key)}
              type="button"
            >
              <IconPath path={item.path} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {view === 'today' && (
          <main className="r30-grid r30-dashboard">
            <section className="r30-main">
              <div className="r30-day-nav">
                <button onClick={() => goToDay(currentDay - 1)} disabled={currentDay === 1} aria-label="Dia anterior">
                  <span aria-hidden="true">&lt;</span>
                </button>
                <div>
                  <strong>{currentDay}</strong>
                  <span>de {totalDays}</span>
                </div>
                <button onClick={() => goToDay(currentDay + 1)} disabled={currentDay >= unlockedDay || currentDay >= totalDays} aria-label="Dia siguiente">
                  <span aria-hidden="true">{currentDay >= unlockedDay ? 'lock' : '>'}</span>
                </button>
              </div>

              <div className="r30-quote glass-card">
                <span>Frase del dia</span>
                <p>{quote}</p>
              </div>

              <div className="r30-task-list">
                {tasks.map((task) => {
                  const done = !!completed[task.id]
                  return (
                    <button
                      key={task.id}
                      type="button"
                      className={`glass-card r30-task ${AREA_META[task.area].className} ${done ? 'completed' : ''}`}
                      onClick={() => setSelectedTaskId(task.id)}
                    >
                      <span className="r30-task-icon" style={{ color: task.color }}>
                        <IconPath path={task.icon} />
                      </span>
                      <span className="r30-task-copy">
                        <small>{task.areaName}</small>
                        <strong>{task.title}</strong>
                        <span>{task.body}</span>
                      </span>
                      <span className={done ? 'r30-check done' : 'r30-check'}>{done ? 'OK' : ''}</span>
                    </button>
                  )
                })}
              </div>

              <button
                type="button"
                className="r30-primary r30-complete-day"
                disabled={!dayIsComplete}
                onClick={completeDay}
                style={{ background: dayIsComplete ? appBrandColor : undefined }}
              >
                {dayIsComplete ? 'Dia completado' : `${dayCompletedCount}/3 tareas completadas`}
              </button>
            </section>

          </main>
        )}

        {view === 'map' && (
          <main className="glass-card r30-map-panel animate-reto30-in">
            <div className="r30-section-head">
              <div>
                <span>Mapa del reto</span>
                <h3>30 dias de practica</h3>
              </div>
              <button type="button" onClick={() => goToDay(Math.min(unlockedDay, totalDays))}>Ir a hoy</button>
            </div>
            <div className="r30-day-map">
              {days.map((day) => {
                const locked = day.module.numero > unlockedDay
                const dayDone = day.lessons.length > 0 && day.lessons.every((lesson) => completed[lesson.id])
                return (
                  <button
                    key={day.module.id}
                    type="button"
                    className={`${currentDay === day.module.numero ? 'current' : ''} ${dayDone ? 'done' : ''} ${locked ? 'locked' : ''}`}
                    disabled={locked}
                    onClick={() => goToDay(day.module.numero)}
                  >
                    <strong>{day.module.numero}</strong>
                    <span>{locked ? 'Bloqueado' : dayDone ? 'Hecho' : 'Abierto'}</span>
                  </button>
                )
              })}
            </div>
          </main>
        )}

        {view === 'resources' && (
          <main className="r30-resources animate-reto30-in">
            {allTasks
              .filter((task) => task.day <= unlockedDay)
              .map((task) => (
                <button
                  key={task.id}
                  type="button"
                  className="glass-card r30-resource"
                  onClick={() => {
                    setCurrentDay(task.day)
                    setSelectedTaskId(task.id)
                    setView('today')
                  }}
                >
                  <span style={{ color: task.color }}>
                    <IconPath path={task.icon} />
                  </span>
                  <span>
                    <small>Dia {task.day} · {task.areaName}</small>
                    <strong>{task.title}</strong>
                  </span>
                </button>
              ))}
          </main>
        )}

        {view === 'journal' && (
          <main className="glass-card r30-journal animate-reto30-in">
            <div className="r30-section-head">
              <div>
                <span>Diario</span>
                <h3>Como llegas hoy?</h3>
              </div>
            </div>

            <div className="r30-moods" role="group" aria-label="Estado de animo">
              {['Sereno/a', 'Cansado/a', 'Inquieto/a', 'Motivado/a'].map((mood) => (
                <button
                  key={mood}
                  type="button"
                  className={currentMood === mood ? 'active' : ''}
                  onClick={() => saveMood(currentDay, mood)}
                >
                  {mood}
                </button>
              ))}
            </div>

            <div className="r30-journal-list">
              {tasks.map((task) => (
                <label key={task.id}>
                  <span>{task.areaName}: {task.title}</span>
                  <textarea
                    value={notes[task.id] || ''}
                    onChange={(event) => saveNote(task.id, event.target.value)}
                    placeholder="Escribe una nota breve sobre esta practica..."
                  />
                </label>
              ))}
            </div>
          </main>
        )}

        <footer className="r30-footer">
          <span>Progreso guardado en este dispositivo.</span>
          <button type="button" onClick={resetProgress}>Reiniciar progreso</button>
        </footer>
      </div>

      {selectedTaskId && selectedTask && view === 'today' && (
        <div className="r30-task-sheet" role="dialog" aria-modal="true" aria-labelledby="reto30-task-title">
          <button
            type="button"
            className="r30-sheet-backdrop"
            aria-label="Cerrar detalle"
            onClick={() => setSelectedTaskId(null)}
          />
          <div className="r30-sheet-panel animate-reto30-in">
            <button
              type="button"
              className="r30-sheet-close"
              aria-label="Cerrar detalle"
              onClick={() => setSelectedTaskId(null)}
            >
              <IconPath path="M6 18 18 6M6 6l12 12" />
            </button>
            <TaskDetail
              task={selectedTask}
              isCompleted={!!completed[selectedTask.id]}
              note={notes[selectedTask.id] || ''}
              copied={copied}
              breathingActive={breathingActive}
              breathingTick={breathingTick}
              titleId="reto30-task-title"
              onToggle={() => toggleTask(selectedTask.id)}
              onNoteChange={(value) => saveNote(selectedTask.id, value)}
              onCopyScript={copyScript}
              onToggleBreathing={() => setBreathingActive((value) => !value)}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function TaskDetail({
  task,
  isCompleted,
  note,
  copied,
  breathingActive,
  breathingTick,
  onToggle,
  onNoteChange,
  onCopyScript,
  onToggleBreathing,
  titleId,
}: {
  task: TaskItem | null
  isCompleted: boolean
  note: string
  copied: boolean
  breathingActive: boolean
  breathingTick: number
  onToggle: () => void
  onNoteChange: (value: string) => void
  onCopyScript: (text: string) => void
  onToggleBreathing: () => void
  titleId?: string
}) {
  if (!task) {
    return <aside className="glass-card r30-detail">Selecciona una practica para verla en detalle.</aside>
  }

  const phaseIndex = Math.floor(breathingTick / 4) % 3
  const phase = ['Inhala', 'Mantente', 'Exhala'][phaseIndex] || 'Inhala'
  const seconds = 4 - (breathingTick % 4)
  const resource = task.resource
  const resourceSteps = resource?.content.steps?.filter(Boolean)
  const steps = resourceSteps?.length
    ? resourceSteps
    : splitIntoSteps(task.actionItem || task.body)
  const script = resource?.content.script || `Hola, queria compartir contigo algo concreto: ${task.actionItem || task.body}`

  return (
    <aside className={`glass-card r30-detail ${AREA_META[task.area].className}`}>
      <div className="r30-detail-head">
        <span className="r30-task-icon" style={{ color: task.color }}>
          <IconPath path={task.icon} />
        </span>
        <div>
          <small>Dia {task.day} · {task.areaName}</small>
          <h3 id={titleId}>{task.title}</h3>
        </div>
      </div>

      <p className="r30-detail-body">{task.body}</p>

      {task.actionItem && (
        <div className="r30-action-item">
          <span>Accion de hoy</span>
          <p>{task.actionItem}</p>
        </div>
      )}

      {resource?.type === 'cbt' && (
        <div className="r30-script">
          <span>{resource.title}</span>
          {resource.content.prompt && <p>{resource.content.prompt}</p>}
          {resource.content.guide && <small>{resource.content.guide}</small>}
        </div>
      )}

      {task.area === 'activities' && (
        <div className="r30-breathing">
          <div className={breathingActive ? 'active' : ''}>
            <strong>{phase}</strong>
            <span>{seconds}</span>
          </div>
          <button type="button" onClick={onToggleBreathing}>
            {breathingActive ? 'Pausar respiracion' : 'Iniciar respiracion'}
          </button>
        </div>
      )}

      {task.area === 'relationships' && (
        <div className="r30-script">
          <span>{resource?.title || 'Guion sugerido'}</span>
          <p>{script}</p>
          {resource?.content.advice && <small>{resource.content.advice}</small>}
          <button type="button" onClick={() => onCopyScript(script)}>
            {copied ? 'Copiado' : 'Copiar guion'}
          </button>
        </div>
      )}

      {resource?.type === 'tool' && resource.content.description && (
        <div className="r30-script">
          <span>{resource.title}</span>
          <p>{resource.content.description}</p>
        </div>
      )}

      <div className="r30-steps">
        {steps.map((step, index) => (
          <div key={`${task.id}-${index}`}>
            <strong>{index + 1}</strong>
            <span>{step}</span>
          </div>
        ))}
      </div>

      <label className="r30-note">
        <span>Tu nota privada</span>
        <textarea
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          placeholder="Que has observado? Que quieres recordar manana?"
        />
      </label>

      <button type="button" className={isCompleted ? 'r30-done-button done' : 'r30-done-button'} onClick={onToggle}>
        {isCompleted ? 'Tarea completada' : 'Marcar como hecha'}
      </button>
    </aside>
  )
}
