/**
 * Entrada pública canónica de una aplicación: /apps/<slug-o-id>.
 *
 * Cada app tiene su propia identidad visual:
 *   - Hero con su thumbnail, color de marca y tipografía propia
 *   - Programas: ModuleAccordion + LessonViewer interactivos
 *   - Herramientas/Recursos/Encuestas: landing con acceso directo
 *
 * Server Component que:
 *   1. Lee x-app-* headers inyectados por el middleware para subdominios antiguos
 *   2. Si no hay headers, busca por slug o UUID en la base de datos
 *   3. Renderiza el hero de la app + el contenido según tipo
 *
 * Los subdominios existentes siguen funcionando como alias compatibles.
 */

import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { createAdminClient } from '@/lib/supabase/server'
import { getAppProgramBundle } from '@/lib/tenant/app-program-cache'
import { isApplicationId } from '@/lib/application-links'
import { normalizeExternalUrl } from '@/lib/urls'
import GenericAppLanding from '@/components/landing/generic-app-landing'
import type { Program, ProgramModule, Lesson } from '@/types'
import AppProgramClient from './program-client'
import Reto30ProgramClient from '../reto30-program-client'

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

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------

export default async function ApplicationEntryPage({ params }: Props) {
  const headerList = headers()
  let appId = headerList.get('x-app-id')
  let appName = headerList.get('x-app-name')
  let appType = headerList.get('x-app-type')
  let appUrl = headerList.get('x-app-url')
  let appBrandColor = headerList.get('x-app-brand-color')
  let appThumbnail = headerList.get('x-app-thumbnail')
  let appDescription = headerList.get('x-app-description')
  let appCategory = headerList.get('x-app-category')

  // El middleware ya entrega la app resuelta al entrar por un subdominio.
  // En la URL canónica la resolvemos por slug o, para apps antiguas, por UUID.
  if (!appId) {
    const adminClient = createAdminClient()
    const query = adminClient
      .from('applications')
      .select('id, nombre, tipo, descripcion, thumbnail_url, brand_color, instrucciones, url_acceso, categoria:categories(nombre)')
      .eq('activa', true)

    const { data } = isApplicationId(params.appSlug)
      ? await query.eq('id', params.appSlug).maybeSingle()
      : await query.eq('app_slug', params.appSlug).maybeSingle()

    if (!data) notFound()

    appId = data.id as string
    appName = data.nombre as string
    appType = (data.tipo as string) || 'herramienta'
    appUrl = (data.url_acceso as string) || null
    appBrandColor = (data.brand_color as string) || null
    appThumbnail = (data.thumbnail_url as string) || null
    appDescription = (data.descripcion as string) || null
    appCategory = (data.categoria as unknown as { nombre: string } | null)?.nombre ?? null
  }

  if (!appId) notFound()

  // App resuelta por middleware
  const tipo = appType || 'programa'
  const brandColor = appBrandColor || TYPE_COLORS[tipo] || '#4f46e5'
  const nombre = appName || 'Aplicación'
  const descripcion = appDescription || null
  const thumbnailUrl = appThumbnail || null
  const catNombre = appCategory || null

  // ── No-programa: hero + landing genérica ──
  if (tipo !== 'programa') {
    const adminClient = createAdminClient()
    const { data } = await adminClient
      .from('applications')
      .select('descripcion, instrucciones, url_acceso, categoria:categories(nombre)')
      .eq('id', appId)
      .single()

    const cta = TYPE_CTAS[tipo] || TYPE_CTAS.herramienta
    const urlAcceso = normalizeExternalUrl(
      appUrl ?? (data?.url_acceso as string) ?? null,
    )
    const resolvedCategory =
      catNombre ??
      (data?.categoria as unknown as { nombre: string } | null)?.nombre ??
      null

    return (
      <>
        <AppHero
          nombre={nombre}
          descripcion={descripcion ?? (data?.descripcion as string) ?? null}
          tipo={tipo}
          brandColor={brandColor}
          thumbnailUrl={thumbnailUrl}
          categoriaNombre={resolvedCategory}
          ctaLabel={cta.label}
          ctaHref={urlAcceso || '#contenido'}
        />
        <div id="contenido">
          <GenericAppLanding
            nombre={nombre}
            descripcion={data?.descripcion ? (data.descripcion as string) : descripcion}
            tipo={tipo}
            instrucciones={(data?.instrucciones as string) || null}
            url_acceso={urlAcceso}
            categoria_nombre={resolvedCategory}
          />
        </div>
      </>
    )
  }

  // ── Programa: hero + datos completos (program, modules, lessons) ──
  const isReto30 = params.appSlug === 'reto30'

  const adminClient = createAdminClient()

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

    // Necesitamos los datos del app (instrucciones, url_acceso, categoría) para
    // pintar la landing genérica con la misma coherencia que la rama no-programa.
    const { data: appRow } = await adminClient
      .from('applications')
      .select('descripcion, instrucciones, url_acceso, categoria:categories(nombre)')
      .eq('id', appId)
      .maybeSingle()

    const cta = TYPE_CTAS[tipo] || TYPE_CTAS.herramienta
    const urlAcceso = normalizeExternalUrl(
      appUrl ?? (appRow?.url_acceso as string) ?? null,
    )
    const resolvedCategory =
      catNombre ??
      (appRow?.categoria as unknown as { nombre: string } | null)?.nombre ??
      null
    const fallbackDescripcion =
      (appRow?.descripcion as string | null | undefined) ?? descripcion ?? null

    return (
      <>
        <AppHero
          nombre={nombre}
          descripcion={fallbackDescripcion}
          tipo={tipo}
          brandColor={brandColor}
          thumbnailUrl={thumbnailUrl}
          categoriaNombre={resolvedCategory}
          ctaLabel={cta.label}
          ctaHref={urlAcceso || '#contenido'}
        />
        <div id="contenido">
          <GenericAppLanding
            nombre={nombre}
            descripcion={fallbackDescripcion}
            tipo={tipo}
            instrucciones={(appRow?.instrucciones as string) || null}
            url_acceso={urlAcceso}
            categoria_nombre={resolvedCategory}
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
          {isReto30 ? (
            <Reto30ProgramClient
              modules={modules}
              programId={program.id}
              appBrandColor={brandColor}
            />
          ) : (
            <AppProgramClient
              modules={modules}
              programId={program.id}
              appBrandColor={brandColor}
            />
          )}
        </div>
      </div>
    </>
  )
}
