/**
 * Reto30ProgramClient — Experiencia fiel al PWA original
 *
 * Flujo UX replicado del original (React + Vite + Firebase):
 *   1. Modal de bienvenida con quote del día (1 vez por día)
 *   2. Día central focal con flechas ← → y candado 🔒 en días futuros
 *   3. 3 tarjetas de micro-tareas (🧠 Reflexión, ☀️ Actividad, ❤️ Relaciones)
 *      cada una completable individualmente con confetti
 *   4. Barra de progreso X/30
 *   5. Bloqueo diario real: solo puedes ver hasta el día desbloqueado
 *      (calculado desde START_DATE en localStorage)
 *   6. Demo mode: días 1-2 gratis, a partir del 3 se muestra aviso
 *      de registro (adaptado al ecosistema Te Cuida)
 *   7. Día 31: pantalla de celebración con corona animada
 *
 * Persistencia: localStorage para START_DATE y tareas completadas.
 * Sin backend necesario — el PWA público funciona offline.
 *
 * Client Component — 'use client'.
 */

'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { ProgramModule, Lesson } from '@/types'
import './reto30.css'

// ---------------------------------------------------------------------------
// Quotes diarias (original quotes.ts del reto30-pwa)
// ---------------------------------------------------------------------------

const DAILY_QUOTES: Record<number, string> = {
  1: 'El viaje de mil kilómetros comienza con un solo paso. — Lao Tzu',
  2: 'No puedes detener las olas, pero puedes aprender a surfear. — Jon Kabat-Zinn',
  3: 'La mente es todo. En lo que piensas, te conviertes. — Buddha',
  4: 'No es lo que te sucede, sino cómo reaccionas lo que importa. — Epicteto',
  5: 'Entre estímulo y respuesta hay un espacio. En ese espacio está nuestro poder para elegir. — Viktor Frankl',
  6: 'La felicidad no es algo ya hecho. Viene de tus propias acciones. — Dalai Lama',
  7: 'Cada día es una nueva oportunidad para cambiar tu vida.',
  8: 'No te creas todo lo que piensas.',
  9: 'La calma no es la ausencia de tormenta, sino la paz en medio de ella.',
  10: 'El presente es el único momento que realmente tenemos.',
  11: 'Lo que los demás piensen de ti no es asunto tuyo.',
  12: 'Las pequeñas acciones diarias crean grandes transformaciones.',
  13: 'Respira. Todo está bien. Estás vivo/a. Eso ya es un milagro.',
  14: 'Suelta lo que no puedes controlar. Abraza lo que sí.',
  15: 'Has llegado a la mitad del camino. Lo mejor está por venir.',
  16: 'Dentro de un año, ¿importará esto? Respira y relativiza.',
  17: 'No minimices tus logros. Cada paso cuenta.',
  18: 'No saques conclusiones precipitadas. La realidad suele ser más amable.',
  19: 'Busca lo bueno. Siempre hay algo bueno, por pequeño que sea.',
  20: 'No confundas cansancio con derrota.',
  21: 'Lo suficientemente bien es mejor que perfecto e inexistente.',
  22: 'Acepta los cumplidos. Te mereces lo bueno que te llega.',
  23: 'Haz el bien sin esperar nada a cambio. Esa es la libertad.',
  24: 'No te compares. Solo ves la portada del libro de los demás.',
  25: 'Cuestiona tus creencias limitantes. Muchas son heredadas, no reales.',
  26: 'No puedes controlar a otros, pero sí cómo respondes tú.',
  27: 'Prefiere ser amable a tener razón.',
  28: 'Los errores son lecciones, no fracasos.',
  29: 'La mente sabia escucha la lógica, el corazón y la experiencia.',
  30: 'El final es solo un nuevo comienzo. Lo has conseguido.',
}

// ---------------------------------------------------------------------------
// Tipos locales
// ---------------------------------------------------------------------------

interface Reto30Day {
  module: ProgramModule
  lessons: Lesson[] // [0] = reflexión, [1] = actividad, [2] = relaciones
}

interface Reto30ProgramClientProps {
  modules: ProgramModule[]
  programId: string
  appBrandColor: string
}

// ---------------------------------------------------------------------------
// Constantes de localStorage
// ---------------------------------------------------------------------------

const LS_START_DATE = 'reto30_start_date'
const LS_COMPLETED = 'reto30_completed_tasks'
const LS_WELCOME_SEEN = 'reto30_welcome_lastseen'

// ---------------------------------------------------------------------------
// Helpers: bloqueo diario (fiel al original progress.ts)
// ---------------------------------------------------------------------------

function getTodayMidnight(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function getUnlockedDay(startDateStr: string | null): number {
  if (!startDateStr) return 1
  const start = new Date(startDateStr)
  start.setHours(0, 0, 0, 0)
  const today = getTodayMidnight()
  const diffDays = Math.floor(
    (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  )
  // El día se desbloquea progresivamente: día 1 el primer día,
  // día 2 al siguiente, etc. Máximo 31 (completado).
  // NO se capa en modo demo — la navegación es libre;
  // el paywall es solo un aviso visual para días > 2.
  return Math.min(diffDays + 1, 31)
}

// ---------------------------------------------------------------------------
// Helpers: confetti con canvas
// ---------------------------------------------------------------------------

function hexToRgb(hex: string) {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

function launchConfetti(
  canvas: HTMLCanvasElement | null,
  brandColor: string,
): void {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  canvas.width = window.innerWidth
  canvas.height = window.innerHeight

  const rgb = hexToRgb(brandColor)
  const colors = [
    brandColor,
    `rgba(${rgb.r},${rgb.g},${rgb.b},0.7)`,
    '#7c3aed',
    '#ec4899',
    '#fbbf24',
    '#f472b6',
    '#a78bfa',
    '#f8fafc',
  ]

  interface Particle {
    x: number; y: number; vx: number; vy: number
    size: number; color: string; rotation: number; rotationSpeed: number; life: number
  }

  const particles: Particle[] = []
  for (let i = 0; i < 80; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 100,
      vx: (Math.random() - 0.5) * 8,
      vy: Math.random() * 3 + 2,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
      life: 1,
    })
  }

  let frame = 0
  let animId = 0

  function animate(): void {
    if (frame >= 90) {
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        canvas.width = 0; canvas.height = 0
      }
      cancelAnimationFrame(animId)
      return
    }
    frame++
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const p of particles) {
        p.x += p.vx; p.vy += 0.1; p.y += p.vy
        p.rotation += p.rotationSpeed; p.life -= 0.008
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.globalAlpha = Math.max(0, p.life)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
        ctx.restore()
      }
    }
    animId = requestAnimationFrame(animate)
  }
  animId = requestAnimationFrame(animate)
}

// ---------------------------------------------------------------------------
// Constantes de pilares
// ---------------------------------------------------------------------------

const PILLAR_NAMES = ['Reflexión', 'Actividad', 'Relaciones'] as const
const PILLAR_EMOJI = ['🧠', '☀️', '❤️'] as const
const PILLAR_CSS = [
  'pillar-thoughts',
  'pillar-activities',
  'pillar-relationships',
] as const

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function Reto30ProgramClient({
  modules,
  appBrandColor,
}: Reto30ProgramClientProps) {
  // ── Armar los 30 días ordenados con sus 3 lecciones ──
  const days: Reto30Day[] = modules
    .sort((a, b) => a.numero - b.numero)
    .map((mod) => ({
      module: mod,
      lessons: mod.lessons.sort((a, b) => a.orden - b.orden).slice(0, 3),
    }))

  // ── Estado ──
  const [hydrated, setHydrated] = useState(false)
  const [startDate, setStartDate] = useState<string | null>(null)
  const [completed, setCompleted] = useState<Record<string, boolean>>({})
  const [currentDay, setCurrentDay] = useState(1)
  const [showWelcome, setShowWelcome] = useState(false)
  const confettiRef = useRef<HTMLCanvasElement>(null)

  const IS_DEMO = true
  const FREE_DAYS = 2
  const unlockedDay = getUnlockedDay(startDate)
  const isLocked = currentDay > unlockedDay
  const isPaywalled = IS_DEMO && currentDay > FREE_DAYS
  const totalDays = days.length

  // ── Hidratación desde localStorage (una vez al montar) ──
  useEffect(() => {
    const savedStart = localStorage.getItem(LS_START_DATE)
    const savedCompleted = localStorage.getItem(LS_COMPLETED)
    const savedWelcome = localStorage.getItem(LS_WELCOME_SEEN)

    // Fecha de inicio
    if (savedStart) {
      setStartDate(savedStart)
    } else {
      const today = getTodayMidnight().toISOString()
      localStorage.setItem(LS_START_DATE, today)
      setStartDate(today)
    }

    // Tareas completadas
    if (savedCompleted) {
      try { setCompleted(JSON.parse(savedCompleted)) } catch { /* ignore */ }
    }

    // Welcome modal: mostrar si última visita fue en otro día
    const todayStr = getTodayMidnight().toISOString().slice(0, 10)
    if (savedWelcome !== todayStr) {
      setShowWelcome(true)
    }

    setHydrated(true)
  }, [])

  // ── Persistir tareas completadas ──
  const persistCompleted = useCallback((next: Record<string, boolean>) => {
    localStorage.setItem(LS_COMPLETED, JSON.stringify(next))
  }, [])

  // ── Verificar si todas las tareas de un día están completas ──
  const isDayFullyComplete = useCallback(
    (dayIndex: number): boolean => {
      const day = days[dayIndex]
      if (!day) return false
      return day.lessons.length > 0 && day.lessons.every((l) => completed[l.id])
    },
    [days, completed],
  )

  // ── Marcar/desmarcar tarea individual ──
  const toggleTask = useCallback(
    (lessonId: string) => {
      setCompleted((prev) => {
        const wasCompleted = prev[lessonId]
        const next = { ...prev, [lessonId]: !wasCompleted }
        persistCompleted(next)
        if (!wasCompleted) {
          setTimeout(() => launchConfetti(confettiRef.current, appBrandColor), 50)
        }
        return next
      })
    },
    [appBrandColor, persistCompleted],
  )

  // ── Cerrar welcome modal ──
  const closeWelcome = useCallback(() => {
    setShowWelcome(false)
    localStorage.setItem(LS_WELCOME_SEEN, getTodayMidnight().toISOString().slice(0, 10))
  }, [])

  // ── Navegación entre días ──
  const goToDay = useCallback(
    (day: number) => {
      if (day >= 1 && day <= totalDays && day <= unlockedDay) {
        setCurrentDay(day)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    },
    [totalDays, unlockedDay],
  )

  // ── Completar el día y avanzar ──
  const handleCompleteDay = useCallback(() => {
    if (!isDayFullyComplete(currentDay - 1)) return
    if (currentDay === totalDays) {
      setCurrentDay(31) // Día 31 = celebración
      return
    }
    const next = currentDay + 1
    if (next <= unlockedDay) {
      setCurrentDay(next)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [currentDay, isDayFullyComplete, totalDays, unlockedDay])

  // ── Reiniciar progreso (para debug) ──
  const resetProgress = useCallback(() => {
    localStorage.removeItem(LS_START_DATE)
    localStorage.removeItem(LS_COMPLETED)
    localStorage.removeItem(LS_WELCOME_SEEN)
    setCompleted({})
    const today = getTodayMidnight().toISOString()
    localStorage.setItem(LS_START_DATE, today)
    setStartDate(today)
    setCurrentDay(1)
    setShowWelcome(true)
  }, [])

  // ── Tareas completadas totales ──
  const completedTasks = Object.values(completed).filter(Boolean).length
  const totalTasks = totalDays * 3
  const progressPercent =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // ── Quotes ──
  const quote = DAILY_QUOTES[currentDay] || 'Un día más. Un paso más.'

  // ── Loading pre-hydratación ──
  if (!hydrated) {
    return (
      <div className="reto30 min-h-screen bg-[#0f172a] flex items-center justify-center">
        <div className="text-[#94a3b8] text-sm animate-pulse">Cargando Reto30…</div>
      </div>
    )
  }

  // Día actual (1-indexed → 0-indexed array)
  const dayData = days[currentDay - 1]
  const tasks = dayData?.lessons || []

  return (
    <div className="reto30 min-h-screen bg-[var(--r30-bg)] text-[var(--r30-text)] font-sans selection:bg-[var(--r30-primary)] selection:text-white">
      <canvas ref={confettiRef} className="confetti-canvas" aria-hidden="true" />

      {/* ════════════════════════════════════════════════════════════
          MODAL DE BIENVENIDA — quote del día
          ════════════════════════════════════════════════════════════ */}
      {showWelcome && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-6"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.92)' }}
        >
          <div className="glass-card max-w-md w-full p-8 text-center animate-reto30-in">
            <div className="text-4xl mb-4">🌅</div>
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-[var(--r30-primary)] mb-3">
              Día {currentDay} · Bienvenida
            </p>
            <blockquote className="text-lg italic text-[var(--r30-text)] mb-6 leading-relaxed">
              &ldquo;{quote}&rdquo;
            </blockquote>
            <p className="text-sm text-[var(--r30-muted)] mb-6">
              Hoy tienes 3 micro-tareas. Pequeños gestos que transforman tu
              día. ¿Empezamos?
            </p>
            <button
              onClick={closeWelcome}
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition-all hover:scale-105"
              style={{
                background: `linear-gradient(135deg, ${appBrandColor}, ${appBrandColor}dd)`,
              }}
            >
              Comenzar el día →
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
        {/* ════════════════════════════════════════════════════════════
            HEADER — progreso + barra
            ════════════════════════════════════════════════════════════ */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-[.2em] text-[var(--r30-muted)]">
              Reto30
            </p>
            <span className="text-xs text-[var(--r30-muted)] tabular-nums">
              {currentDay <= 30 ? `${completedTasks}/${totalTasks} tareas` : 'Completado'}
            </span>
          </div>
          <div className="progress-track mb-1">
            <div
              className="progress-fill"
              style={{
                width: `${currentDay > 30 ? 100 : (currentDay / 30) * 100}%`,
                background: `linear-gradient(90deg, ${appBrandColor}, ${appBrandColor}dd)`,
              }}
            />
          </div>
          <p className="text-xs text-[var(--r30-muted)]">
            {currentDay > 30
              ? '¡Reto completado!'
              : `Día ${currentDay} de ${totalDays}`}
          </p>
        </div>

        {/* ════════════════════════════════════════════════════════════
            DÍA 31 — CELEBRACIÓN
            ════════════════════════════════════════════════════════════ */}
        {currentDay === 31 && (
          <div className="glass-card p-10 text-center animate-reto30-in">
            <div className="animate-reto30-pulse inline-flex items-center justify-center h-20 w-20 rounded-full bg-[var(--r30-primary)]/20 mb-6">
              <span className="text-4xl">👑</span>
            </div>
            <h2 className="text-3xl font-bold text-[var(--r30-text)] mb-3">
              ¡Lo has conseguido!
            </h2>
            <p className="text-[var(--r30-muted)] mb-6 max-w-sm mx-auto leading-relaxed">
              30 días. 90 micro-tareas. Has construido hábitos que duran toda
              la vida. Esto no es un final: es el comienzo de tu nueva forma de
              relacionarte contigo mismo/a.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <button
                onClick={() => setCurrentDay(30)}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition-all hover:scale-105"
                style={{
                  backgroundColor: `${appBrandColor}20`,
                  color: appBrandColor,
                }}
              >
                ← Repasar día 30
              </button>
              <button
                onClick={resetProgress}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-[var(--r30-muted)] hover:text-[var(--r30-text)] transition-all border border-white/10 hover:border-white/20"
              >
                🔄 Empezar de nuevo
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            PAYWALL NUDGE — demo mode más allá del día 2
            ════════════════════════════════════════════════════════════ */}
        {currentDay <= 30 && isPaywalled && (
          <div className="glass-card p-6 mb-6 text-center animate-reto30-in">
            <div className="text-3xl mb-3">🔓</div>
            <p className="text-sm font-semibold text-[var(--r30-text)] mb-2">
              Modo demo — Día {currentDay}
            </p>
            <p className="text-xs text-[var(--r30-muted)] mb-4 max-w-sm mx-auto">
              Estás viendo el contenido completo del Reto30. Para desbloquear
              los días automáticamente y guardar tu progreso, regístrate en el
              portal de tu municipio.
            </p>
            <a
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all hover:scale-105"
              style={{
                background: `linear-gradient(135deg, ${appBrandColor}, ${appBrandColor}dd)`,
              }}
            >
              Registrarse gratis →
            </a>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            DÍA CENTRAL FOCAL — navegación + 3 tarjetas de tareas
            ════════════════════════════════════════════════════════════ */}
        {currentDay <= 30 && (
          <>
            {/* ── Navegación día central focal ── */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <button
                onClick={() => goToDay(currentDay - 1)}
                disabled={currentDay === 1}
                className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-[var(--r30-muted)] hover:text-[var(--r30-text)] hover:border-white/20 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                aria-label="Día anterior"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
                </svg>
              </button>

              {/* Número del día central */}
              <div className="text-center min-w-[80px]">
                <span
                  className="text-5xl font-bold tabular-nums"
                  style={{ color: appBrandColor }}
                >
                  {currentDay}
                </span>
                <p className="text-xs text-[var(--r30-muted)] mt-1">/ {totalDays}</p>
              </div>

              {/* Botón siguiente o candado */}
              {currentDay < unlockedDay ? (
                <button
                  onClick={() => goToDay(currentDay + 1)}
                  className="grid h-10 w-10 place-items-center rounded-full border border-white/10 text-[var(--r30-muted)] hover:text-[var(--r30-text)] hover:border-white/20 transition-all"
                  aria-label="Día siguiente"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              ) : currentDay === unlockedDay && currentDay < 30 ? (
                <div className="grid h-10 w-10 place-items-center rounded-full border border-white/5 text-[var(--r30-muted)]/40">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                </div>
              ) : null}
            </div>

            {/* ── Título del día ── */}
            <h1 className="text-xl font-bold text-center text-[var(--r30-text)] mb-6">
              {dayData?.module.nombre || `Día ${currentDay}`}
            </h1>

            {/* ── 3 tarjetas de micro-tareas ── */}
            <div className="space-y-4 mb-8">
              {tasks.map((task, i) => {
                const isCompleted = completed[task.id] || false
                return (
                  <button
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    className={`glass-card w-full text-left p-5 sm:p-6 group ${PILLAR_CSS[i]} ${isCompleted ? 'completed' : ''}`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Icono del pilar */}
                      <div
                        className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-xl transition-all ${
                          isCompleted
                            ? 'bg-[var(--r30-primary)]/20 ring-1 ring-[var(--r30-primary)]/30'
                            : 'bg-white/5 group-hover:bg-white/10'
                        }`}
                      >
                        {isCompleted ? '✅' : PILLAR_EMOJI[i]}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span
                            className="text-xs font-semibold uppercase tracking-wider"
                            style={{
                              color: isCompleted ? 'var(--r30-primary)' : 'var(--pillar-color)',
                            }}
                          >
                            {PILLAR_NAMES[i]}
                          </span>
                          {isCompleted && (
                            <span className="inline-flex items-center rounded-full bg-[var(--r30-primary)]/15 px-2 py-0.5 text-[10px] font-bold text-[var(--r30-primary)]">
                              HECHO
                            </span>
                          )}
                        </div>
                        <h3
                          className={`text-sm font-semibold mb-1 transition-colors ${
                            isCompleted
                              ? 'text-[var(--r30-muted)] line-through decoration-[var(--r30-primary)]/40'
                              : 'text-[var(--r30-text)]'
                          }`}
                        >
                          {task.titulo.replace(/^[🧠☀️❤️]\s*/, '')}
                        </h3>
                        {task.contenido_texto && (
                          <p
                            className={`text-xs leading-relaxed line-clamp-3 ${
                              isCompleted ? 'text-[var(--r30-muted)]/40' : 'text-[var(--r30-muted)]'
                            }`}
                          >
                            {task.contenido_texto}
                          </p>
                        )}
                        <div className="mt-2 text-[10px] text-[var(--r30-muted)]/40">
                          {task.duracion_minutos} min
                        </div>
                      </div>

                      {/* Círculo de completado */}
                      <div
                        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-all ${
                          isCompleted
                            ? 'border-[var(--r30-primary)] bg-[var(--r30-primary)]'
                            : 'border-white/15 group-hover:border-[var(--r30-primary)]/40'
                        }`}
                      >
                        {isCompleted && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* ── Botón "Día completado" ── */}
            {isDayFullyComplete(currentDay - 1) && currentDay < 30 && (
              <div className="text-center mb-8 animate-reto30-in">
                <button
                  onClick={handleCompleteDay}
                  className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition-all hover:scale-105"
                  style={{
                    background: `linear-gradient(135deg, ${appBrandColor}, ${appBrandColor}dd)`,
                    boxShadow: `0 8px 24px ${appBrandColor}40`,
                  }}
                >
                  ✨ Día completado — siguiente →
                </button>
              </div>
            )}

            {/* ── Día 30 completado → Día 31 ── */}
            {isDayFullyComplete(currentDay - 1) && currentDay === 30 && (
              <div className="text-center mb-8 animate-reto30-in">
                <button
                  onClick={handleCompleteDay}
                  className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white transition-all hover:scale-105"
                  style={{
                    background: `linear-gradient(135deg, ${appBrandColor}, ${appBrandColor}dd)`,
                    boxShadow: `0 8px 24px ${appBrandColor}40`,
                  }}
                >
                  🎉 Ver celebración →
                </button>
              </div>
            )}

            {/* ── Footer: reset ── */}
            <div className="mt-8 pt-6 border-t border-white/5">
              <div className="text-center">
                <button
                  onClick={resetProgress}
                  className="text-[10px] text-[var(--r30-muted)]/30 hover:text-[var(--r30-muted)]/60 transition-colors"
                >
                  Reiniciar progreso
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
