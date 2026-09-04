/**
 * Entrada pública canónica de una aplicación: /apps/<slug-o-id>.
 *
 * Cada app tiene su propia identidad visual:
 *   - Hero con su thumbnail, color de marca y tipografía propia
 *   - Programas: ModuleAccordion + LessonViewer interactivos
 *   - Herramientas/Recursos/Encuestas: landing con acceso directo
 *
 * Server Component que usa el mismo resolvedor que layout y manifest,
 * admitiendo tanto slug como UUID.
 *
 * Los subdominios existentes siguen funcionando como alias compatibles.
 */

import { notFound } from 'next/navigation'
import { getAppProgramBundle } from '@/lib/tenant/app-program-cache'
import { getPublicApplication } from '@/lib/applications/public-application'
import {
  getApplicationLaunchPath,
  getApplicationProviderLabel,
  shouldEmbedApplication,
} from '@/lib/application-runtime'
import GenericAppLanding from '@/components/landing/generic-app-landing'
import type { Program, ProgramModule, Lesson } from '@/types'
import AppProgramClient from './program-client'
import Reto30ProgramClient from '../reto30-program-client'
import FamilyGamificationClient from '../family-gamification-client'
import { challenges as reto30Challenges } from '../reto30-data'
import { resources as reto30Resources } from '../reto30-resources'
import { challenges as caregiverChallenges } from '../mindful30-caregivers-data'

// Forzar render dinámico en cada request. Sin esto, Next.js podría cachear
// la respuesta del `fetch` interno de supabase-js en el Data Cache y servir
// la página PWA de la app desactualizada tras un PUT admin. `headers()` ya
// opta a dynamic, pero el flag es defensa explícita ante cambios futuros.
export const dynamic = 'force-dynamic'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface Props {
  params: { appSlug: string }
}

// ---------------------------------------------------------------------------
// Colores por defecto según tipo
// ---------------------------------------------------------------------------

const TYPE_COLORS: Record<string, string> = {
  programa: '#4f46e5',
  herramienta: '#2563eb',
  encuesta: '#d97706',
  recurso: '#059669',
}

const TYPE_LABELS: Record<string, string> = {
  programa: 'Programa',
  herramienta: 'Herramienta',
  encuesta: 'Encuesta',
  recurso: 'Recurso',
}

const TYPE_CTAS: Record<string, { label: string; icon: string }> = {
  programa: { label: 'Ver módulos', icon: '📋' },
  herramienta: { label: 'Abrir aplicación', icon: '🚀' },
  encuesta: { label: 'Comenzar encuesta', icon: '📝' },
  recurso: { label: 'Explorar recurso', icon: '📖' },
}

// ---------------------------------------------------------------------------
// Subcomponente: Hero de la app (server)
// ---------------------------------------------------------------------------

function AppHero({
  nombre,
  descripcion,
  tipo,
  brandColor,
  thumbnailUrl,
  categoriaNombre,
  ctaLabel,
  ctaHref,
}: {
  nombre: string
  descripcion: string | null
  tipo: string
  brandColor: string
  thumbnailUrl: string | null
  categoriaNombre: string | null
  ctaLabel: string
  ctaHref: string
}) {
  const inicial = nombre.charAt(0).toUpperCase()
  const patternId = `app-hero-pattern-${nombre.replace(/\s+/g, '-').toLowerCase()}`

  return (
    <section className="relative isolate flex min-h-[55vh] items-end overflow-hidden text-white">
      {/* Capa 1: foto de fondo o color sólido */}
      <div
        aria-hidden="true"
        className="animate-fade-in absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: thumbnailUrl ? `url(${thumbnailUrl})` : undefined,
          backgroundColor: brandColor,
        }}
      />

      {/* Capa 2: overlay degradado para legibilidad */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background: thumbnailUrl
            ? `linear-gradient(180deg, rgba(0,0,0,.35) 0%, rgba(0,0,0,.55) 50%, rgba(0,0,0,.9) 100%)`
            : `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}dd 50%, ${brandColor}66 100%)`,
        }}
      />

      {/* Capa 3: pattern SVG diagonal sutil */}
      <svg
        aria-hidden="true"
        focusable="false"
        className="absolute -right-40 top-1/2 h-[160%] w-[55%] -translate-y-1/2 opacity-[0.12] mix-blend-screen"
        viewBox="0 0 200 800"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern
            id={patternId}
            patternUnits="userSpaceOnUse"
            width="44"
            height="44"
            patternTransform="rotate(20)"
          >
            <line x1="0" y1="0" x2="0" y2="44" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.7" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>

      {/* Contenido */}
      <div className="relative z-10 mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8 pb-12 pt-24 sm:pt-32">
        <div className="animate-fade-in-up">
          {/* Sello + pills */}
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <div
              aria-hidden="true"
              className="grid h-[52px] w-[52px] place-items-center rounded-full border-2 border-white/40 shadow-[inset_0_0_0_3px_rgba(255,255,255,.12),0_0_0_5px_rgba(255,255,255,.06)] backdrop-blur-md"
              style={{ background: 'rgba(0,0,0,.3)' }}
            >
              <span className="font-extrabold text-[22px] leading-none text-white/90">
                {inicial}
              </span>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-[.18em] backdrop-blur-md">
              <span
                className="block h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: brandColor }}
              />
              {TYPE_LABELS[tipo] || tipo}
            </span>
            {categoriaNombre && (
              <span className="text-xs text-white/60 font-medium">
                {categoriaNombre}
              </span>
            )}
          </div>

          {/* Título */}
          <h1 className="mb-4 max-w-2xl text-balance font-bold text-[clamp(40px,7vw,72px)] leading-[.95]">
            {nombre}
          </h1>

          {/* Descripción */}
          <p className="mb-8 max-w-lg text-base sm:text-lg text-white/85 leading-relaxed">
            {descripcion || 'Aplicación de bienestar disponible en tu municipio.'}
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap gap-3">
            <a
              href={ctaHref}
              className="inline-flex items-center gap-2.5 min-h-[48px] px-6 rounded-xl no-underline font-extrabold text-white shadow-lg hover:-translate-y-0.5 transition-transform"
              style={{
                background: `linear-gradient(135deg, ${brandColor}, ${brandColor}dd)`,
                boxShadow: `0 12px 28px ${brandColor}40`,
              }}
            >
              {ctaLabel} →
            </a>
          </div>
        </div>
      </div>

      {/* Máscara diagonal inferior */}
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 100 10"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-[-1px] h-8 w-full text-[#fafafa]"
      >
        <path d="M0,10 L0,3 L100,0 L100,10 Z" fill="currentColor" />
      </svg>
    </section>
  )
}

function EmbeddedApplicationFrame({
  title,
  src,
  providerLabel,
}: {
  title: string
  src: string
  providerLabel: string
}) {
  return (
    <section id="contenido" className="bg-[#fafafa]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{title}</h2>
            <p className="text-xs font-medium text-gray-500">
              Ejecutada desde {providerLabel} dentro del gateway TE CUIDA.
            </p>
          </div>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            Abrir en pestaña nueva
          </a>
        </div>
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <iframe
            title={title}
            src={src}
            className="h-[calc(100vh-140px)] min-h-[620px] w-full"
            sandbox="allow-downloads allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
            allow="camera; microphone; geolocation; clipboard-write; fullscreen"
          />
        </div>
      </div>
    </section>
  )
}

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------

export default async function ApplicationEntryPage({ params }: Props) {
  const app = await getPublicApplication(params.appSlug)
  if (!app) notFound()

  const appId = app.id
  const tipo = app.tipo
  const brandColor = app.brand_color || TYPE_COLORS[tipo] || '#4f46e5'
  const nombre = app.nombre
  const descripcion = app.descripcion
  const thumbnailUrl = app.thumbnail_url
  const catNombre = app.categoria_nombre
  const launchHref = app.url_acceso ? getApplicationLaunchPath(app) : '#contenido'
  const embedApp = shouldEmbedApplication(app)
  const canonicalSlug = app.app_slug || params.appSlug

  if (canonicalSlug === 'family-gamification') {
    return <FamilyGamificationClient />
  }

  // ── No-programa: hero + landing genérica ──
  if (tipo !== 'programa') {
    const cta = TYPE_CTAS[tipo] || TYPE_CTAS.herramienta

    return (
      <>
        <AppHero
          nombre={nombre}
          descripcion={descripcion}
          tipo={tipo}
          brandColor={brandColor}
          thumbnailUrl={thumbnailUrl}
          categoriaNombre={catNombre}
          ctaLabel={cta.label}
          ctaHref={embedApp ? '#contenido' : launchHref}
        />
        {embedApp && app.url_acceso && (
          <EmbeddedApplicationFrame
            title={nombre}
            src={app.url_acceso}
            providerLabel={getApplicationProviderLabel(app)}
          />
        )}
        <div id={embedApp ? undefined : 'contenido'}>
          <GenericAppLanding
            nombre={nombre}
            descripcion={descripcion}
            tipo={tipo}
            instrucciones={app.instrucciones}
            url_acceso={embedApp ? null : app.url_acceso ? launchHref : null}
            categoria_nombre={catNombre}
          />
        </div>
      </>
    )
  }

  // ── Programa: hero + datos completos (program, modules, lessons) ──
  const isReto30 = canonicalSlug === 'reto30'
  const isMindful30 = canonicalSlug === 'mindful30'
  const isCaregivers = canonicalSlug === 'mindful30-cuidadores'
  const isAdolescents = canonicalSlug === 'mindful30-adolescentes'

  if (isReto30 || isMindful30) {
    const reto30Modules: ProgramModule[] = reto30Challenges.map((challenge) => {
      const moduleId = `${canonicalSlug}-dia-${challenge.day}`
      const areaOrder = ['thoughts', 'activities', 'relationships'] as const
      const lessons: Lesson[] = areaOrder.map((area, index) => {
        const task = challenge.tasks[area]
        const resource = task.resourceId ? reto30Resources[task.resourceId] : undefined
        return {
          id: `${canonicalSlug}-${area}-${challenge.day}`,
          module_id: moduleId,
          titulo: task.title,
          tipo: 'ejercicio',
          contenido_texto: task.description,
          ejercicio: {
            tipo: area === 'activities' ? 'respiracion' : 'reflexion',
            instrucciones: task.actionItem,
          },
          duracion_minutos: 10,
          orden: index + 1,
          reto30Resource: resource,
        } as Lesson & { reto30Resource?: unknown }
      })

      return {
        id: moduleId,
        program_id: appId,
        numero: challenge.day,
        nombre: `Dia ${challenge.day} - ${challenge.tasks.thoughts.title}`,
        descripcion: challenge.tasks.thoughts.description,
        lessons,
      }
    })

    return (
      <Reto30ProgramClient
        modules={reto30Modules}
        programId={appId}
        appBrandColor={brandColor}
        variant={isMindful30 ? 'mindful30' : 'reto30'}
      />
    )
  }

  if (isCaregivers) {
    const caregiverModules: ProgramModule[] = caregiverChallenges.map((challenge) => {
      const moduleId = `mindful30-cuidadores-dia-${challenge.day}`
      const areaOrder = ['thoughts', 'activities', 'relationships'] as const
      const lessons: Lesson[] = areaOrder.map((area, index) => {
        const task = challenge.tasks[area]
        return {
          id: `mindful30-cuidadores-${area}-${challenge.day}`,
          module_id: moduleId,
          titulo: task.title,
          tipo: 'ejercicio',
          contenido_texto: task.description,
          duracion_minutos: 10,
          orden: index + 1,
        }
      })

      return {
        id: moduleId,
        program_id: appId,
        numero: challenge.day,
        nombre: `Dia ${challenge.day} - ${challenge.tasks.thoughts.title}`,
        descripcion: challenge.tasks.thoughts.description,
        lessons,
      }
    })

    return (
      <Reto30ProgramClient
        modules={caregiverModules}
        programId={appId}
        appBrandColor={brandColor}
        variant="caregivers"
      />
    )
  }

  if (isAdolescents) {
    const bundle = await getAppProgramBundle(appId)
    const programData = bundle.program

    if (programData && bundle.modules.length > 0) {
      const lessonsByModule = new Map<string, Lesson[]>()
      ;(bundle.lessons || []).forEach((l) => {
        const lesson: Lesson = {
          id: l.id,
          module_id: l.module_id,
          titulo: l.titulo,
          tipo: l.tipo as Lesson['tipo'],
          contenido_texto: l.contenido_texto || undefined,
          audio_url: l.audio_url || undefined,
          video_url: l.video_url || undefined,
          ejercicio: l.ejercicio
            ? (l.ejercicio as unknown as Lesson['ejercicio'])
            : undefined,
          duracion_minutos: l.duracion_minutos ?? 0,
          orden: l.orden,
        }
        const arr = lessonsByModule.get(l.module_id) || []
        arr.push(lesson)
        lessonsByModule.set(l.module_id, arr)
      })

      const modules: ProgramModule[] = bundle.modules.map((m) => ({
        id: m.id,
        program_id: m.program_id,
        numero: m.numero,
        nombre: m.nombre,
        descripcion: (m.descripcion as string) || '',
        lessons: lessonsByModule.get(m.id) || [],
      }))

      return (
        <Reto30ProgramClient
          modules={modules}
          programId={programData.id}
          appBrandColor={brandColor}
          variant="adolescents"
        />
      )
    }
  }

  // Bundle cacheado con tag `app-program-<appId>` (invalidación POR APP).
  // El helper `getAppProgramBundle` envuelve las 3 queries
  // (programs / program_modules / lessons) en `unstable_cache` con un
  // tag único por app; cualquier mutación admin sobre el contenido del
  // programa ejecuta `revalidateTag(getAppProgramTag(appId))` y purga
  // SOLO la entrada de esta app (las demás no se invalidan).
  // Contrato completo en `src/lib/tenant/app-program-cache.ts`.
  const bundle = await getAppProgramBundle(appId)
  const programData = bundle.program

  // Si la app es tipo='programa' pero aún no tiene programa asociado
  // (caso típico: no se le subió ZIP), caemos a landing genérica en
  // lugar de devolver un 404 confuso para el ciudadano.
  if (!programData) {
    console.warn(
      `[ApplicationEntryPage] App "${nombre}" (${tipo}) no tiene programa asociado. Renderizando landing genérica.`,
    )

    const cta = TYPE_CTAS[tipo] || TYPE_CTAS.herramienta

    return (
      <>
        <AppHero
          nombre={nombre}
          descripcion={descripcion}
          tipo={tipo}
          brandColor={brandColor}
          thumbnailUrl={thumbnailUrl}
          categoriaNombre={catNombre}
          ctaLabel={cta.label}
          ctaHref={embedApp ? '#contenido' : launchHref}
        />
        {embedApp && app.url_acceso && (
          <EmbeddedApplicationFrame
            title={nombre}
            src={app.url_acceso}
            providerLabel={getApplicationProviderLabel(app)}
          />
        )}
        <div id={embedApp ? undefined : 'contenido'}>
          <GenericAppLanding
            nombre={nombre}
            descripcion={descripcion}
            tipo={tipo}
            instrucciones={app.instrucciones}
            url_acceso={embedApp ? null : app.url_acceso ? launchHref : null}
            categoria_nombre={catNombre}
          />
        </div>
      </>
    )
  }

  // Datos ya cacheados: módulos ordenados y lecciones por módulo ya
  // vienen del helper — solo queda mapearlos a los tipos de UI.
  const modulesData = bundle.modules
  const lessonsData = bundle.lessons

  // Construir estructura anidada
  const lessonsByModule = new Map<string, Lesson[]>()
  ;(lessonsData || []).forEach((l) => {
    const lesson: Lesson = {
      id: l.id,
      module_id: l.module_id,
      titulo: l.titulo,
      tipo: l.tipo as Lesson['tipo'],
      contenido_texto: l.contenido_texto || undefined,
      audio_url: l.audio_url || undefined,
      video_url: l.video_url || undefined,
      ejercicio: l.ejercicio
        ? (l.ejercicio as unknown as Lesson['ejercicio'])
        : undefined,
      duracion_minutos: l.duracion_minutos ?? 0,
      orden: l.orden,
    }
    const arr = lessonsByModule.get(l.module_id) || []
    arr.push(lesson)
    lessonsByModule.set(l.module_id, arr)
  })

  const modules: ProgramModule[] = (modulesData || []).map((m) => ({
    id: m.id,
    program_id: m.program_id,
    numero: m.numero,
    nombre: m.nombre,
    descripcion: (m.descripcion as string) || '',
    lessons: lessonsByModule.get(m.id) || [],
  }))

  const program: Program = {
    id: programData.id,
    application_id: programData.application_id,
    nombre: programData.nombre,
    descripcion: (programData.descripcion as string) || '',
    total_sesiones: programData.total_sesiones ?? 0,
    modules,
  }

  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0)
  const cta = TYPE_CTAS.programa

  return (
    <>
      <AppHero
        nombre={nombre}
        descripcion={descripcion ?? program.descripcion}
        tipo={tipo}
        brandColor={brandColor}
        thumbnailUrl={thumbnailUrl}
        categoriaNombre={catNombre}
        ctaLabel={cta.label}
        ctaHref="#modulos"
      />

      {/* ── Programa: acordeón de módulos + visor de lecciones ── */}
      <div id="modulos" className="bg-[#fafafa]">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
          {/* Resumen del programa */}
          <div className="mb-10">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {program.nombre}
            </h2>
            <p className="text-sm text-gray-500">
              {program.descripcion || 'Programa de bienestar'}
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 8.25h-2.25A2.25 2.25 0 0 1 13.5 6V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
                </svg>
                {modules.length} módulos
              </span>
              <span className="inline-flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                {totalLessons} lecciones
              </span>
            </div>
          </div>

          {/* Visor interactivo (Client Component) */}
          <AppProgramClient
            modules={modules}
            programId={program.id}
            appBrandColor={brandColor}
          />
        </div>
      </div>
    </>
  )
}
